"""Canonical full-checker producer and semantic validator for Python surfaces."""
from __future__ import annotations

import math
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Any

from .contracts import CONTRACT_VERSION, SCHEMA_VERSION, ContractError, validate
from .cycle5_model import ARTEFACT_SHA256, EXPECTED_CONTRACTS, EXPECTED_RULE, MODEL_IDENTITY, REGISTRY_IDENTITY, ScoredDocument
from .cycle5_segments import count_words
from .deterministic import inspect, sha256

SCORE_SCALE = "zero_to_one_pattern_similarity"
HONESTY_LINE = "No AI checker can prove who wrote a text — this is a pattern reading."
SUPPORT_DESTINATION = "https://opace.agency/tools/ai/content-verification-integrity/"
METHOD_STATUSES = {"pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"}
CONTENT_KEYS = {"content", "text", "passage", "excerpt", "source_uri", "candidate", "route_path", "evidence"}
LEVELS = {
    "signal-strongly-ai": "This draft very strongly matches AI writing — the kind of match we rarely see in human work.",
    "signal-likely-ai": "Much of this draft reads like AI writing.",
    "signal-potentially-ai": "Parts of this draft resemble AI writing, but the match is not strong enough to be sure.",
    "signal-unclear": "We can't call this one either way. Some passages read slightly machine-like, but people write that way too.",
    "signal-likely-human": "This reads like human writing. Nothing here matches the AI patterns we test for — though a heavily disguised AI draft can slip past any checker, ours included.",
}


def _level(score: float, band: str, secondary: float | None) -> str:
    if not math.isfinite(score) or not 0 <= score <= 1:
        raise ValueError("invalid_checker_score")
    levels = {
        "very_likely_ai": "signal-strongly-ai",
        "uncertain": "signal-potentially-ai",
        "likely_human": "signal-unclear",
        "very_likely_human": "signal-likely-human",
    }
    try:
        level = levels[band]
    except KeyError as error:
        raise ValueError("invalid_cycle5_band") from error
    if band == "uncertain" and secondary is not None and score >= secondary:
        return "signal-likely-ai"
    return level


def _to_fixed(value: float, decimals: int) -> str:
    """ECMAScript toFixed rounding for a finite non-negative binary float."""
    return format(Decimal.from_float(value).quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP), f".{decimals}f")


def format_checker_score_texts(entries: list[tuple[float, str]], start_decimals: int = 2, max_decimals: int = 6) -> list[str]:
    if not 0 <= start_decimals <= max_decimals:
        raise ValueError("invalid_score_precision")
    decimals = [start_decimals] * len(entries)
    for _pass in range(start_decimals, max_decimals):
        groups: dict[str, list[int]] = {}
        for index, (score, _level_id) in enumerate(entries):
            if not math.isfinite(score) or not 0 <= score <= 1:
                raise ValueError("invalid_checker_score")
            groups.setdefault(_to_fixed(score, decimals[index]), []).append(index)
        changed = False
        for indexes in groups.values():
            if len({entries[index][1] for index in indexes}) > 1:
                for index in indexes:
                    decimals[index] += 1
                changed = True
        if not changed:
            break
    return [_to_fixed(score, decimals[index]) for index, (score, _level_id) in enumerate(entries)]


def _assert_content_free(value: Any, path: str = "share") -> None:
    if isinstance(value, list):
        for index, item in enumerate(value):
            _assert_content_free(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in CONTENT_KEYS:
                raise ContractError("invalid_request", f"{path}.{key} is content-bearing.")
            _assert_content_free(item, f"{path}.{key}")


def _assert_cycle5_model(model: dict[str, Any]) -> None:
    if (
        model.get("identity") != MODEL_IDENTITY
        or model.get("segmentation_contract") != EXPECTED_CONTRACTS["segmentation"]
        or model.get("input_contract") != EXPECTED_CONTRACTS["input"]
        or model.get("features_contract") != EXPECTED_CONTRACTS["features"]
        or model.get("scoring_contract") != EXPECTED_CONTRACTS["scoring"]
        or model.get("flag_rule") != EXPECTED_RULE
    ):
        raise ContractError("invalid_request", "The assessed result does not identify the current Cycle-5 contracts.")
    if model.get("precision") not in {"int8", "fp32"} or model.get("registry_identity") != REGISTRY_IDENTITY:
        raise ContractError("invalid_request", "The local route has the wrong precision or registry identity.")


def assert_checker_result_invariants(result: dict[str, Any]) -> None:
    validate("checker-result.schema.json", result)
    for method in result["methods"]:
        if method["status"] not in METHOD_STATUSES:
            raise ContractError("invalid_request", "Unknown method status.")
    if result["exports"]["receipt"]["contains_content"] is not False or result["exports"]["share"]["contains_content"] is not False:
        raise ContractError("invalid_request", "Receipt and share defaults must be content-free.")
    if result["exports"]["share"]["payload"] is not None:
        _assert_content_free(result["exports"]["share"]["payload"])
    safe = result["provenance"]["safe_fixes"]
    if safe != {"preview_first": True, "explicit_approval_required": True, "automatic_homoglyph_replacement": False, "c2pa_wrapper_protected": True}:
        raise ContractError("invalid_request", "Safe-fix invariants were weakened.")
    for watermark in result["provenance"]["watermarks"]:
        if watermark["method_id"] == "watermark.anthropic" and (watermark["method_status"] != "unsupported" or watermark["outcome"] not in {"not_available", "not_supported"}):
            raise ContractError("invalid_request", "Anthropic watermark detection must remain unsupported.")
    ai, sections, model = result["axes"]["ai_pattern"], result["sections"], result["route"]["model"]
    if ai["assessment_status"] == "assessed":
        if model is None:
            raise ContractError("invalid_request", "Only a trained model may set the AI-pattern reading.")
        _assert_cycle5_model(model)
        if not sections:
            raise ContractError("invalid_request", "An assessed result needs sections.")
        for index, section in enumerate(sections):
            if section["index"] != index:
                raise ContractError("invalid_request", "Sections must be zero-based and in source order.")
            expected_level = _level(section["raw_score"], section["band_id"], ai["secondary_display_threshold"])
            if section["band_id"] == "uncertain" and ai["secondary_display_threshold"] is None:
                expected_levels = {"signal-potentially-ai", "signal-likely-ai"}
            else:
                expected_levels = {expected_level}
            if section["level"] not in expected_levels:
                raise ContractError("invalid_request", "A section level contradicts its score and band.")
            if index and section["start_utf16"] < sections[index - 1]["end_utf16"]:
                raise ContractError("invalid_request", "Sections overlap or move backwards.")
            locator = section.get("locator")
            if locator and locator != {"content_hash": result["source"]["content_hash"], "start_utf16": section["start_utf16"], "end_utf16": section["end_utf16"]}:
                raise ContractError("invalid_request", "Section locator mismatch.")
        strongest = max(sections, key=lambda section: section["raw_score"])
        if (ai["strongest_section_index"], ai["raw_score"], ai["raw_margin"], ai["level"]) != (strongest["index"], strongest["raw_score"], strongest["raw_margin"], strongest["level"]):
            raise ContractError("invalid_request", "Run-wide score does not match the strongest section.")
        if ai["source"] != model["identity"] or result["source"]["section_count"] != len(sections):
            raise ContractError("invalid_request", "Model source or section count mismatch.")
        margins = sorted((section["raw_margin"] for section in sections), reverse=True)
        primary = margins[0] >= EXPECTED_RULE["primary_margin"]
        secondary = len(margins) > 1 and margins[1] + EXPECTED_RULE["secondary_gap"] >= EXPECTED_RULE["primary_margin"]
        expected_reason = "primary" if primary else "secondary" if secondary else None
        if ai["flagged"] != (primary or secondary) or ai["flag_reason"] != expected_reason or ai["method_status"] != ("attention" if ai["flagged"] else "pass"):
            raise ContractError("invalid_request", "AI flag state contradicts the raw margin rule.")
        formatted = format_checker_score_texts([(ai["raw_score"], ai["level"]), *[(section["raw_score"], section["level"]) for section in sections]])
        if ai["display_score"] != formatted[0] or any(section["display_score"] != formatted[index + 1] for index, section in enumerate(sections)):
            raise ContractError("invalid_request", "Scores were not produced by the run-wide formatter.")
        if result["profile"] == "full_checker" and (not result["exports"]["report"]["available"] or not result["exports"]["report"]["complete_evidence"]):
            raise ContractError("invalid_request", "An assessed full checker needs a complete report.")
    else:
        if any(ai[key] is not None for key in ("raw_score", "raw_margin", "display_score", "level", "flagged", "flag_reason", "strongest_section_index")) or sections:
            raise ContractError("invalid_request", "An unassessed result cannot publish model scores or sections.")
    route, controls = result["route"], result["abuse_controls"]
    if route["kind"] == "loopback_engine" and (route["content_transfer"] != "loopback" or route["privacy_route"] != "local_service" or controls["channel_authentication"] != "loopback_bearer"):
        raise ContractError("invalid_request", "Loopback route metadata is inconsistent.")
    if route["kind"] == "eu_server" and (route["content_transfer"] != "eu_server" or route["consent"] != "explicit" or model is None or model["precision"] != "fp32" or controls["channel_authentication"] not in {"browser_pow_token", "wordpress_challenge_token", "chrome_extension_challenge_token"}):
        raise ContractError("invalid_request", "EU server route metadata is inconsistent.")
    if route["kind"] == "browser_model" and (route["content_transfer"] != "none" or route["privacy_route"] != "browser" or model is None or model["precision"] != "int8"):
        raise ContractError("invalid_request", "Browser route metadata is inconsistent.")
    if route["kind"] == "wordpress_same_site" and (route["content_transfer"] != "same_site" or route["privacy_route"] != "wordpress_local" or controls["channel_authentication"] != "same_site_nonce"):
        raise ContractError("invalid_request", "WordPress same-site route metadata is inconsistent.")
    if route["kind"] == "deterministic_only" and (route["content_transfer"] != "none" or model is not None or ai["assessment_status"] == "assessed"):
        raise ContractError("invalid_request", "Deterministic-only route cannot carry a model result.")
    if controls["request_body_logging"] not in {"excluded", "not_applicable"}:
        raise ContractError("invalid_request", "Request-body logging is not safely configured.")


def compose_checker_result(request: dict[str, Any], scored: ScoredDocument, generated_at: str | None = None) -> dict[str, Any]:
    deterministic = inspect(request, clock=(lambda: generated_at) if generated_at else None) if generated_at else inspect(request)
    generated_at = generated_at or deterministic["completed_at"]
    content = request["source"]["content"]
    utf16_length = len(content.encode("utf-16-le")) // 2
    if not scored.sections or scored.sections[0].start_utf16 != 0 or scored.sections[-1].end_utf16 != utf16_length or any(
        section.end_utf16 <= section.start_utf16 or (index and section.start_utf16 != scored.sections[index - 1].end_utf16)
        for index, section in enumerate(scored.sections)
    ):
        raise ContractError("invalid_request", "Scored sections must cover the source's UTF-16 range exactly.")
    levels = [_level(section.raw_score, section.band_id, scored.secondary_display_threshold) for section in scored.sections]
    strongest = max(range(len(scored.sections)), key=lambda index: scored.sections[index].raw_score)
    display = format_checker_score_texts([(scored.raw_score, levels[strongest]), *[(section.raw_score, levels[index]) for index, section in enumerate(scored.sections)]])
    sections = [{
        "index": section.index,
        "start_utf16": section.start_utf16,
        "end_utf16": section.end_utf16,
        "word_count": section.word_count,
        "raw_score": section.raw_score,
        "raw_margin": section.raw_margin,
        "display_score": display[index + 1],
        "level": levels[index],
        "band_id": section.band_id,
        "passage": section.passage,
        "evidence": [{"id": f"section-{section.index}-model", "kind": "trained_model", "summary": "This section received the named Cycle-5 pattern reading.", "basis": "tier3-cycle5-v1, segments-v3, raw-v1, features-v1, margin-v1"}],
    } for index, section in enumerate(scored.sections)]
    ai_level = levels[strongest]
    unicode_methods = [method for method in deterministic["methods"] if method["category"] == "unicode"]
    pattern_methods = [method for method in deterministic["methods"] if method["id"] == "style.patterns"]
    unicode_findings = [item for method in unicode_methods for item in method["evidence"]]
    pattern_findings = deterministic["pattern_findings"]
    result_id = "result_" + deterministic["source"]["content_hash"][7:23]
    date = datetime.fromisoformat(generated_at.replace("Z", "+00:00")).date().isoformat()
    model = {
        "identity": MODEL_IDENTITY, "registry_identity": scored.registry_identity, "precision": scored.precision,
        "artefact_hash": scored.artefact_hash, "segmentation_contract": EXPECTED_CONTRACTS["segmentation"],
        "input_contract": EXPECTED_CONTRACTS["input"], "features_contract": EXPECTED_CONTRACTS["features"],
        "scoring_contract": EXPECTED_CONTRACTS["scoring"], "flag_rule": dict(EXPECTED_RULE),
    }
    detector = {
        "id": "detector.cycle5", "category": "detector", "provider_or_method": "Opace Cycle-5 AI-pattern model",
        "version": MODEL_IDENTITY, "status": "attention" if scored.flagged else "pass", "score": scored.raw_score,
        "score_scale": {"id": SCORE_SCALE}, "threshold": {"scoring_contract": "margin-v1", "primary_margin": EXPECTED_RULE["primary_margin"], "secondary_gap": EXPECTED_RULE["secondary_gap"]},
        "segments": [{"index": section.index} for section in scored.sections], "evidence": [{"type": "strongest_section", "index": scored.sections[strongest].index}],
        "limitations": ["The model provides a pattern reading, not proof of authorship."], "started_at": deterministic["started_at"], "completed_at": deterministic["completed_at"], "privacy_route": "local_service",
    }
    categories = sorted({span["kind"] for span in deterministic["protected_spans"]})
    watermarks = [{
        "method_id": "watermark.anthropic", "method_status": "unsupported", "key_scope": "provider_private", "outcome": "not_available",
        "limitations": ["No official Anthropic detector interface is available."],
    }]
    result = {
        "schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "result_id": result_id,
        "profile": "full_checker", "generated_at": generated_at, "contains_content": True,
        "source": {**deterministic["source"], "normalised_hash": sha256(content), "word_count": count_words(content), "character_count": utf16_length, "section_count": len(sections)},
        "route": {
            "kind": "loopback_engine", "location": "This device, authenticated loopback service", "content_transfer": "loopback", "privacy_route": "local_service",
            "retention": {"source": "request_only", "result": "none", "statement": "The text was processed for this request and was not retained by the service."},
            "consent": "explicit", "model": model,
            "transport": {"endpoint_class": "authenticated_loopback", "region": None, "requests": 1, "words_sent": count_words(content), "processed": "once", "retained": "not retained"},
        },
        "axes": {
            "ai_pattern": {
                "assessment_status": "assessed", "method_status": "attention" if scored.flagged else "pass", "source": MODEL_IDENTITY,
                "raw_score": scored.raw_score, "raw_margin": scored.raw_margin, "display_score": display[0], "score_scale": SCORE_SCALE,
                "level": ai_level, "primary_display_threshold": scored.primary_display_threshold, "secondary_display_threshold": scored.secondary_display_threshold,
                "flagged": scored.flagged, "flag_reason": scored.flag_reason, "strongest_section_index": scored.sections[strongest].index,
                "reason": LEVELS[ai_level], "limitations": ["The score is a zero-to-one pattern-similarity reading, not a percentage of the text written by AI.", "This result does not prove authorship, and edited or out-of-register writing may be missed."],
            },
            "text_integrity": {
                "method_status": "attention" if unicode_findings else "pass", "reading": "attention" if unicode_findings else "clean",
                "reason": f"{len(unicode_findings)} text-integrity finding(s) need review." if unicode_findings else "No reportable text-integrity manipulation was found.",
                "findings": unicode_findings, "limitations": ["Absence of hidden characters is not evidence of human authorship."],
            },
            "editorial": {
                "method_status": "attention" if pattern_findings else "pass", "reading": "many" if len(pattern_findings) >= 5 else "some" if pattern_findings else "none",
                "reason": f"{len(pattern_findings)} editorial suggestion(s) were found." if pattern_findings else "No named editorial pattern rule fired.",
                "findings": pattern_findings, "limitations": ["Writing suggestions are editorial feedback, not authorship evidence."],
            },
        },
        "sections": sections, "methods": [detector, *deterministic["methods"]],
        "provenance": {
            "protected_facts": {"count": len(deterministic["protected_spans"]), "categories": categories},
            "c2pa_text": {"status": "not_run", "wrapper_protected": True, "limitations": ["This text route did not receive a C2PA wrapper to validate."]},
            "c2pa_files": [], "watermarks": watermarks,
            "safe_fixes": {"preview_first": True, "explicit_approval_required": True, "automatic_homoglyph_replacement": False, "c2pa_wrapper_protected": True},
        },
        "exports": {
            "receipt": {"available": True, "contains_content": False, "canonicalisation": "RFC8785", "payload_hash": None},
            "share": {"available": True, "contains_content": False, "payload": {"version": 1, "result_id": result_id, "level": ai_level, "display_score": display[0], "sections": [{"index": section["index"], "raw_score": section["raw_score"], "display_score": section["display_score"], "level": section["level"]} for section in sections], "word_count": count_words(content), "date": date, "model_version": MODEL_IDENTITY, "honesty_line": HONESTY_LINE, "contains_content": False}},
            "report": {"available": True, "format": "json", "contains_content": True, "explicit_user_action": True, "complete_evidence": True, "product_identity": "Opace AI Content Integrity", "support_destination": SUPPORT_DESTINATION},
        },
        "abuse_controls": {
            "max_words": 8000, "max_characters": 100000, "max_request_bytes": 250000, "explicit_capture": "enforced", "consent_before_transfer": "enforced",
            "refuse_not_truncate": "enforced", "cancellation": "not_configured", "channel_authentication": "loopback_bearer", "proof_of_work": "not_applicable",
            "origin_validation": "enforced", "per_ip_limit": "not_applicable", "per_site_limit": "not_applicable", "per_connection_limit": "enforced",
            "global_inference_limit": "not_applicable", "request_body_logging": "excluded", "unexpected_network_requests": "blocked", "fallback": "not_configured", "kill_switch": "not_applicable",
        },
        "limitations": ["The result describes measured patterns and integrity evidence; it does not prove authorship.", "The complete JSON result contains checked passages and is returned only to the authenticated loopback client."],
    }
    assert_checker_result_invariants(result)
    return result

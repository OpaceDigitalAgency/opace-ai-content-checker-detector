from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from . import __version__
from .contracts import CONTRACT_VERSION, SCHEMA_VERSION

PATTERNS = ("in today's rapidly evolving landscape", "game-changer", "in conclusion", "it is important to note", "delve into")
UNICODE_RULES = {0xFEFF:("BYTE ORDER MARK","low","remove","A byte-order mark is present."),0x200B:("ZERO WIDTH SPACE","medium","remove","An invisible zero-width space is present."),0x2060:("WORD JOINER","medium","remove","An invisible word joiner is present."),0x00AD:("SOFT HYPHEN","low","remove","A discretionary soft hyphen is present."),0x00A0:("NO-BREAK SPACE","note","space","A non-breaking space is present."),0x2009:("THIN SPACE","note","space","A thin space is present."),0xFFFD:("REPLACEMENT CHARACTER","high","review","A replacement character may indicate damaged text.")}
BIDI = {0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069}
CONFUSABLE = {0x0430:"CYRILLIC SMALL LETTER A",0x0435:"CYRILLIC SMALL LETTER IE",0x043E:"CYRILLIC SMALL LETTER O",0x0440:"CYRILLIC SMALL LETTER ER",0x0441:"CYRILLIC SMALL LETTER ES",0x0445:"CYRILLIC SMALL LETTER HA",0x0443:"CYRILLIC SMALL LETTER U"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def sha256(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8", errors="strict")).hexdigest()


def utf16_offset(value: str, codepoint: int) -> int:
    return len(value[:codepoint].encode("utf-16-le")) // 2


def reject_invalid_unicode(value: str) -> None:
    for character in value:
        if 0xD800 <= ord(character) <= 0xDFFF:
            raise ValueError("invalid_unicode_unpaired_surrogate")
    value.encode("utf-8", errors="strict")


def _method(method_id: str, category: str, provider: str, version: str, status: str, evidence: list[dict[str, Any]], limitations: list[str], started: str, completed: str) -> dict[str, Any]:
    return {"id": method_id, "category": category, "provider_or_method": provider, "version": version, "status": status, "score": None, "threshold": None, "segments": [], "evidence": evidence, "limitations": limitations, "started_at": started, "completed_at": completed, "privacy_route": "local_service"}


def project_visible_text(source: str, content_type: str) -> tuple[str, list[str]]:
    if content_type == "plain_text":
        return source, []
    if content_type == "markdown":
        text = re.sub(r"!?\[([^\]]*)\]\([^)]+\)", lambda match: match.group(1), source)
        text = re.sub(r"(^|\s)[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1\2", text)
        return text, ["Markdown mapping is projection-level; protected extractors retain exact source ranges."]
    safe = re.sub(r"<(script|style|template|noscript)\b[^>]*>[\s\S]*?</\1\s*>|<!--[\s\S]*?-->", lambda match: " " * utf16_offset(match.group(0), len(match.group(0))), source, flags=re.I)
    parts, cursor = [], 0
    token = re.compile(r"<[^>]*>|&(?:#x?[0-9a-f]+|[a-z]+);", re.I)
    for match in token.finditer(safe):
        parts.append(safe[cursor:match.start()])
        raw = match.group(0)
        if re.match(r"<(br|/?(?:p|div|section|article|li|h[1-6]|blockquote|tr))\b", raw, re.I):
            parts.append("\n")
        elif raw.startswith("&"):
            try:
                names = {"amp":"&","lt":"<","gt":">","quot":"\"","apos":"'","nbsp":"\u00a0"}
                if raw.startswith(("&#x", "&#X")):
                    value = int(raw[3:-1], 16);decoded = chr(value) if 0 <= value <= 0x10FFFF and not 0xD800 <= value <= 0xDFFF else raw
                elif raw.startswith("&#"):
                    value = int(raw[2:-1], 10);decoded = chr(value) if 0 <= value <= 0x10FFFF and not 0xD800 <= value <= 0xDFFF else raw
                else:
                    decoded = names.get(raw[1:-1], raw)
            except (ValueError, OverflowError):
                decoded = raw
            parts.append(decoded)
        cursor = match.end()
    parts.append(safe[cursor:])
    return "".join(parts), ["HTML projection is deterministic text extraction, not sanitisation."]


PROTECTED_RULES = (
    ("code", re.compile(r"```[\s\S]*?```|`[^`\n]+`")),
    ("url", re.compile(r"https?://[^\s<>)\]]+")),
    ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("citation", re.compile(r"\[[0-9]+\]|\([A-Z][A-Za-z-]+,?\s+\d{4}[a-z]?\)")),
    ("quote", re.compile(r'[“"][^”"\n]+[”"]')),
    ("currency", re.compile(r"(?:£|\$|€)\s?\d[\d,]*(?:\.\d+)?")),
    ("date", re.compile(r"\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b")),
    ("time", re.compile(r"\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b", re.I)),
    ("unit", re.compile(r"\b\d+(?:\.\d+)?\s?(?:kg|g|km|m|cm|mm|GB|MB|%|°C)\b")),
    ("number", re.compile(r"\b\d[\d,]*(?:\.\d+)?%?\b")),
)


def extract_protected_spans(content: str, content_hash: str) -> list[dict[str, Any]]:
    spans = {}
    for kind, rule in PROTECTED_RULES:
        for match in rule.finditer(content):
            text, start_cp, end_cp = match.group(0), match.start(), match.end()
            start_u16, end_u16 = utf16_offset(content, start_cp), utf16_offset(content, end_cp)
            item = {"id": f"ps_{kind}_{start_u16}_{sha256(text)[7:15]}", "kind": kind, "text": text, "start_utf16": start_u16, "end_utf16": end_u16, "start_codepoint": start_cp, "end_codepoint": end_cp, "normalised_value": text, "policy": "equivalent_format" if kind in {"date", "number"} else "exact", "source": "deterministic", "confidence": None, "content_hash": content_hash}
            spans[(start_u16, end_u16, kind, item["policy"])] = item
    return sorted(spans.values(), key=lambda item: (item["start_utf16"], -(item["end_utf16"] - item["start_utf16"]), item["id"]))


def validate_candidate(source: str, candidate: str, spans: list[dict[str, Any]], expected_source_hash: str | None = None, max_length_ratio: float = 2) -> list[dict[str, Any]]:
    failures=[]
    for span in spans:
        count=candidate.count(span["text"])
        if count==0: failures.append({"protected_span_id":span["id"],"expected_hash":span["content_hash"],"observed":"missing"})
        elif count>source.count(span["text"]): failures.append({"protected_span_id":span["id"],"expected_hash":span["content_hash"],"observed":"duplicated"})
    gates=[{"id":"protected_spans.exact","version":"1.0.0","status":"fail" if failures else "pass","hard":True,"summary":f"{len(failures)} protected item(s) changed" if failures else "Protected items remain present","failures":failures,"limitations":[]}]
    reference=re.compile(r'https?://[^\s<>)\]]+|```[\s\S]*?```|`[^`\n]+`|\[[0-9]+\]|[“\"][^”\"\n]+[”\"]')
    original=set(reference.findall(source));added=[value for value in reference.findall(candidate) if value not in original]
    gates.append({"id":"unsupported_additions","version":"1.0.0","status":"fail" if added else "pass","hard":True,"summary":f"{len(added)} unsupported reference(s) added" if added else "No unsupported URLs, citations, quotations or code added","failures":[{"observed":value} for value in added],"limitations":[]})
    current=sha256(source);expected=expected_source_hash or current;matches=current==expected
    gates.append({"id":"source_version","version":"1.0.0","status":"pass" if matches else "fail","hard":True,"summary":"Source hash matches" if matches else "Source changed since protection","failures":[] if matches else [{"expected_hash":expected,"observed":current}],"limitations":[]})
    executable=bool(re.search(r'<\s*(?:script|iframe|object|embed|form)\b|\son\w+\s*=|javascript:',candidate,re.I))
    gates.append({"id":"html_safety","version":"1.0.0","status":"fail" if executable else "pass","hard":True,"summary":"Executable or unsafe HTML found" if executable else "No executable HTML found","failures":[{"observed":"executable_markup"}] if executable else [],"limitations":["This deterministic gate is not a complete HTML sanitiser."]})
    ratio=len(candidate)/len(source) if source else 1;too_long=ratio>max_length_ratio
    gates.append({"id":"language_length","version":"1.0.0","status":"fail" if too_long else "pass","hard":True,"summary":"Candidate exceeds the configured length bound" if too_long else "Candidate is within the configured length bound","failures":[{"observed_ratio":ratio,"max_ratio":max_length_ratio}] if too_long else [],"limitations":["CORE-10 does not infer language; it preserves the requested language as a host-reviewed constraint."]})
    leakage=bool(re.search(r'\b(?:protected_span_id|system prompt|<\|(?:system|assistant|user)\|>)\b',candidate,re.I))
    gates.append({"id":"output_safety","version":"1.0.0","status":"fail" if leakage else "pass","hard":True,"summary":"Prompt or protected-ID leakage found" if leakage else "No prompt/control-token leakage found","failures":[{"observed":"control_or_prompt_marker"}] if leakage else [],"limitations":[]})
    gates.append({"id":"semantic_entailment","version":"unconfigured/1","status":"not_configured","hard":True,"summary":"Semantic entailment is not configured in the deterministic core","failures":[],"limitations":["Strict policy must treat this required semantic gate as blocking when generation depends on semantic fidelity."]})
    return gates


def content_diff(source: str, candidate: str) -> dict[str, Any]:
    def length(value): return len(value.encode("utf-16-le"))//2
    if length(source)+length(candidate)>80_000:
        segments=[]
        if source==candidate and source: segments=[{"type":"equal","text":source,"source_start":0,"source_end":length(source),"candidate_start":0,"candidate_end":length(candidate)}]
        elif source!=candidate:
            if source:segments.append({"type":"delete","text":source,"source_start":0,"source_end":length(source),"candidate_start":0,"candidate_end":0})
            if candidate:segments.append({"type":"insert","text":candidate,"source_start":length(source),"source_end":length(source),"candidate_start":0,"candidate_end":length(candidate)})
        return {"version":"lcs-token/1.0.0","source_hash":sha256(source),"candidate_hash":sha256(candidate),"change_count":sum(item["type"]!="equal" for item in segments),"segments":segments,"fallback":True}
    a=re.findall(r'\s+|[^\s]+',source);b=re.findall(r'\s+|[^\s]+',candidate)
    if len(a)*len(b)>2_000_000:return _fallback_diff(source,candidate)
    rows=[[0]*(len(b)+1) for _ in range(len(a)+1)]
    for i in range(len(a)-1,-1,-1):
        for j in range(len(b)-1,-1,-1):rows[i][j]=1+rows[i+1][j+1] if a[i]==b[j] else max(rows[i+1][j],rows[i][j+1])
    matches=[];i=j=0
    while i<len(a) and j<len(b):
        if a[i]==b[j]:matches.append((i,j));i+=1;j+=1
        elif rows[i][j+1]>rows[i+1][j]:j+=1
        else:i+=1
    i=j=sp=cp=mi=0;segments=[]
    def push(kind,text,ss,se,cs,ce):
        if segments and segments[-1]["type"]==kind and segments[-1]["source_end"]==ss and segments[-1]["candidate_end"]==cs:segments[-1]["text"]+=text;segments[-1]["source_end"]=se;segments[-1]["candidate_end"]=ce
        else:segments.append({"type":kind,"text":text,"source_start":ss,"source_end":se,"candidate_start":cs,"candidate_end":ce})
    while i<len(a) or j<len(b):
        match=matches[mi] if mi<len(matches) else None
        if match and i==match[0] and j==match[1]:t=a[i];width=length(t);push("equal",t,sp,sp+width,cp,cp+width);sp+=width;cp+=width;i+=1;j+=1;mi+=1
        elif j<len(b) and (not match or j<match[1]):t=b[j];width=length(t);push("insert",t,sp,sp,cp,cp+width);cp+=width;j+=1
        else:t=a[i];width=length(t);push("delete",t,sp,sp+width,cp,cp);sp+=width;i+=1
    return {"version":"lcs-token/1.0.0","source_hash":sha256(source),"candidate_hash":sha256(candidate),"change_count":sum(item["type"]!="equal" for item in segments),"segments":segments,"fallback":False}


def _fallback_diff(source: str, candidate: str) -> dict[str, Any]:
    width=lambda value:len(value.encode("utf-16-le"))//2;segments=[]
    if source==candidate and source:segments.append({"type":"equal","text":source,"source_start":0,"source_end":width(source),"candidate_start":0,"candidate_end":width(candidate)})
    elif source!=candidate:
        if source:segments.append({"type":"delete","text":source,"source_start":0,"source_end":width(source),"candidate_start":0,"candidate_end":0})
        if candidate:segments.append({"type":"insert","text":candidate,"source_start":width(source),"source_end":width(source),"candidate_start":0,"candidate_end":width(candidate)})
    return {"version":"lcs-token/1.0.0","source_hash":sha256(source),"candidate_hash":sha256(candidate),"change_count":sum(item["type"]!="equal" for item in segments),"segments":segments,"fallback":True}


def inspect_patterns(text: str) -> list[dict[str, Any]]:
    findings, lowered = [], text.lower()
    def finding(start, rule, severity, message, suggestion, evidence):
        matched=evidence.get("matched", text[start:start+1]);end=start+len(matched)
        return {"rule_id":rule,"rule_version":"en-gb:2026.08.1","severity":severity,"message":message,"suggestion":suggestion,"span":{"start_utf16":utf16_offset(text,start),"end_utf16":utf16_offset(text,end),"start_codepoint":start,"end_codepoint":end},"matched_text_hash":sha256(matched),"evidence":evidence}
    for phrase in PATTERNS:
        count, start = lowered.count(phrase), lowered.find(phrase)
        if count:
            matched = text[start:start + len(phrase)]
            findings.append(finding(start,"style.overused_phrase","medium" if count>1 else "low","A stock phrase may make the passage feel generic.","Review whether a more specific statement would be clearer.",{"matched":matched,"count":count,"threshold":1}))
    sentences=[item for item in re.split(r"(?<=[.!?])\s+",text) if item]
    openings={};cursor=0
    for sentence in sentences:
        start=text.find(sentence,cursor);cursor=start+len(sentence);opening=" ".join(sentence.strip().split()[:3]).lower()
        if len(opening.split(" "))>=2: openings.setdefault(opening,[]).append(start)
    for opening,starts in openings.items():
        if len(starts)>=3:
            start=starts[0];matched=text[start:start+len(opening)]
            findings.append(finding(start,"style.repeated_opening","medium","Several sentences begin the same way.","Vary only the openings that genuinely benefit from it.",{"matched":matched,"count":len(starts),"threshold":3}))
    transitions=list(re.finditer(r"\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b",lowered));word_count=len(text.strip().split()) if text.strip() else 0
    if word_count>=40 and len(transitions)/word_count>0.04:
        match=re.search(r"\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b",text,re.I);matched=match.group(0)
        findings.append(finding(match.start(),"style.transition_density","low","Transition words are unusually dense.","Remove transitions that do not clarify the relationship between sentences.",{"matched":matched,"count":len(transitions),"word_count":word_count,"threshold_ratio":0.04}))
    return sorted(findings, key=lambda item: (item["span"]["start_utf16"], item["rule_id"]))


def inspect(request: dict[str, Any], clock=now_iso) -> dict[str, Any]:
    content = request["source"]["content"]
    reject_invalid_unicode(content)
    if len(content.encode("utf-8")) > 250_000:
        raise ValueError("request_too_large")
    started = clock()
    source_hash = sha256(content)
    visible_text, projection_limitations = project_visible_text(content, request["source"]["content_type"])
    unicode_findings = []
    for index, character in enumerate(content):
        codepoint, start_u16, end_u16 = ord(character), utf16_offset(content, index), utf16_offset(content, index + 1)
        rule = UNICODE_RULES.get(codepoint) or (("BIDIRECTIONAL CONTROL","medium","review","A bidirectional formatting control is present.") if codepoint in BIDI else None)
        if rule:
            name,severity,fix,message=rule
            unicode_findings.append({"id":f"unicode_{start_u16}_{codepoint:x}","code_point":f"U+{codepoint:04X}","name":name,"severity":severity,"message":message,"suggestion":"Review the surrounding script and direction before editing." if fix=="review" else "Preview the deterministic change before approval.","span":{"start_utf16":start_u16,"end_utf16":end_u16,"start_codepoint":index,"end_codepoint":index+1},"matched_text_hash":sha256(character),"fix":fix,"limitations":["Unicode controls can be legitimate in multilingual text; this finding is not evidence of authorship."]})
    for token in re.finditer(r"[\w-]+", content, re.UNICODE):
        value=token.group(0);names=[unicodedata.name(character,"") for character in value]
        if not any("LATIN" in name for name in names) or not any("CYRILLIC" in name or "GREEK" in name for name in names): continue
        for local,character in enumerate(value):
            codepoint=ord(character);name=CONFUSABLE.get(codepoint)
            if name:
                start_cp=token.start()+local;start_u16=utf16_offset(content,start_cp);end_u16=utf16_offset(content,start_cp+1)
                unicode_findings.append({"id":f"unicode_{start_u16}_homoglyph_{codepoint:x}","code_point":f"U+{codepoint:04X}","name":name,"severity":"medium","message":"A mixed-script token contains a character visually confusable with Latin text.","suggestion":"Verify the intended spelling; homoglyphs are never replaced automatically.","span":{"start_utf16":start_u16,"end_utf16":end_u16,"start_codepoint":start_cp,"end_codepoint":start_cp+1},"matched_text_hash":sha256(character),"fix":"review","limitations":["Mixed scripts can be legitimate in names and multilingual text; this is contextual evidence only."]})
    pattern_findings = inspect_patterns(visible_text)
    protected_spans = extract_protected_spans(content, source_hash)
    methods = []
    for method_id in request["checks"]:
        method_started = clock()
        if method_id.startswith("unicode."):
            methods.append(_method(method_id, "unicode", "Opace deterministic Unicode inspection", "unicode:2026.08.1", "attention" if unicode_findings else "pass", [{"type":"unicode_finding",**item} for item in unicode_findings], ["Unicode controls can be legitimate in multilingual text.", "Authorship cannot be proved from this check."], method_started, clock()))
        elif method_id == "style.patterns":
            methods.append(_method(method_id, "pattern", "Opace writing-pattern rules", "en-gb:2026.08.1", "attention" if pattern_findings else "pass", [{"type": "pattern_finding", "rule_id": item["rule_id"], "span": item["span"]} for item in pattern_findings], ["Writing patterns are editorial prompts, not detector or watermark evidence.", "Authorship cannot be proved from this check."], method_started, clock()))
        elif method_id == "watermark.anthropic":
            item = _method(method_id, "watermark", "Anthropic official text-watermark detector", "unavailable-2026-08-26", "unsupported", [], ["No official detector call was available. Local style or public SynthID tests are not substitutes."], method_started, clock())
            item.update({"availability": "not_available", "native_outcome": "not_available"})
            methods.append(item)
        else:
            methods.append(_method(method_id, "detector", method_id, "unsupported/1", "unsupported", [], ["This requested method is not implemented in the deterministic core."], method_started, clock()))
    summary = {key: 0 for key in ("pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error")}
    for method in methods:
        summary[method["status"]] += 1
    completed = clock()
    return {"schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "request_id": request["request_id"], "analysis_id": "analysis_" + source_hash[7:23], "source": {"content_hash": source_hash, "normalised_hash": sha256(unicodedata.normalize("NFC", visible_text)), "content_type": request["source"]["content_type"], "language": request["source"]["language"], "word_count": len(re.findall(r"\S+", visible_text))}, "protected_spans": protected_spans, "pattern_findings": pattern_findings, "methods": methods, "summary": summary, "limitations": ["Authorship cannot be proved from these checks.", *projection_limitations], "started_at": started, "completed_at": completed}


def capabilities() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "product": "Opace AI Content Integrity local engine", "version": __version__, "contract_version": CONTRACT_VERSION, "schema_versions": [SCHEMA_VERSION], "limits": {"max_request_bytes": 250000, "max_candidates": 5, "max_concurrent_jobs": 1}, "methods": [{"id": "unicode.invisible", "category": "unicode", "version": "unicode:2026.08.1", "state": "available", "privacy_routes": ["local_service"]}, {"id": "unicode.homoglyph", "category": "unicode", "version": "unicode:2026.08.1", "state": "available", "privacy_routes": ["local_service"]}, {"id": "style.patterns", "category": "pattern", "version": "en-gb:2026.08.1", "state": "available", "languages": ["en-GB"], "privacy_routes": ["local_service"]}, {"id": "watermark.anthropic", "category": "watermark", "version": "adapter-placeholder/1", "state": "unsupported", "reason": "official_detector_unavailable", "privacy_routes": ["local_service"]}, {"id": "rewrite.local", "category": "fidelity", "version": "not-configured/1", "state": "not_configured", "reason": "no_approved_model"}]}

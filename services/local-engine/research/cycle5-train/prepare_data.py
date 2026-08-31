"""Cycle-5 training-set assembly.

Base: cycle4-fiction/dataset.jsonl — rows and splits preserved VERBATIM (that
file embeds cycle3-shortform/dataset.jsonl which embeds cycle2-train rows, so
the topic-grouped leakage fix, the battery test-only pinning and the cycle-3/4
measurement guard all carry forward). On top of it, three owner-authorised
additions, each group-aware:

  1. cycle4-humaniser-pairs corpus-train.jsonl OUTPUT texts (owner-approved
     for training). Included as side=ai: ai_original_neural_rewrite (all
     intensities) and human_original_ai_edited at HEAVY intensity only — a
     heavy rewrite is a full machine restatement; light/medium rewrites of
     human text are excluded from training entirely because their words are
     part-human and training them under either label would be wrong. Source
     texts are NOT added (they live in other corpora or are measurement sets).
     Group = lineage_id. Rows whose source carries measurement_overlap=True
     are recorded in eval-exclusions.json so the long-form evaluation can drop
     those documents.

  2. human-structured-corpus-2026-08-31 GREEN bucket only (AMBER excluded,
     licence caution), side=human. Topics whose slug falls in the
     matched-generation held-out bucket (sha256(slug) % 100 < 15) are
     EXCLUDED from training and written to matched-eval-humans.jsonl.
     Group = slug(brief.topic).

  3. matched-generation matched.jsonl AI rows with eval_only=false,
     side=ai, group = slug(brief.topic) — the same group key as their human
     partners so a topic never straddles train and eval. eval_only rows are
     never trained on (gemini family + topic bucket) and are written to
     matched-eval-ai.jsonl. The eval-only boundary is re-derived here from
     the generator's own slug/hash rule, not trusted from the field alone.

FORBIDDEN in training, enforced by normalised-hash guard (abort on excess):
tests/battery/human-corpus-v1/v2 (train_forbidden in base, pinned test),
the 5,558-doc long-form corpus (lf-hu/lf-ai), ai-shortform,
human-shortform-widened, the owner's nine.

Writes: dataset.jsonl, dataset-manifest.json, eval-exclusions.json,
matched-eval-ai.jsonl, matched-eval-humans.jsonl
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
BASE = os.path.join(RESEARCH, "cycle4-fiction", "dataset.jsonl")
PAIRS = os.path.join(RESEARCH, "cycle4-humaniser-pairs", "corpus-train.jsonl")
STRUCT = os.path.join(RESEARCH, "human-structured-corpus-2026-08-31", "corpus.jsonl")
# TRAINING reads the frozen snapshot (generation was still running at the
# freeze; SHA-256 in the manifest). The eval-only slice is refreshed from the
# live file at scoring time — eval rows are never trained on, so a later,
# larger eval slice stays clean.
MATCHED = os.environ.get("C5_MATCHED") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "frozen-matched.snapshot.jsonl")
C3SETS = os.path.join(HERE, "c3sets")
BATTERY = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..",
                                       "tests", "battery"))
OUT = os.path.join(HERE, "dataset.jsonl")

_WS = re.compile(r"\s+")
_NONWORD = re.compile(r"[^a-z0-9 ]+")

HELDOUT_TOPIC_BUCKET = 15  # % — must match generate_matched.py


def slug(topic: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")[:60]


def is_heldout_topic(topic: str) -> bool:
    h = int(hashlib.sha256(slug(topic).encode()).hexdigest(), 16)
    return (h % 100) < HELDOUT_TOPIC_BUCKET


def norm_sha(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).lower()
    t = _NONWORD.sub(" ", t)
    return hashlib.sha256(_WS.sub(" ", t).strip().encode()).hexdigest()


def sha(text: str) -> str:
    return hashlib.sha256(" ".join(text.split()).lower().encode()).hexdigest()


def file_sha(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def bucket(group: str, tr=85) -> str:
    h = int(hashlib.sha256(group.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < tr else "cal"


# register maps into the corpus taxonomy
STRUCT_REG = {
    "business-blog": "marketing", "seo-marketing-blog": "marketing",
    "gov-guidance": "reference", "gov-news": "article", "news": "article",
    "tech-docs": "reference", "style-guide": "reference",
    "service-manual": "reference", "qa": "social", "faq": "marketing",
}
PAIR_REG = {"academic": "academic", "article": "article", "marketing": "marketing",
            "report": "report", "reference": "reference", "creative": "creative",
            "social": "social", "technical-explainer": "reference"}


def load_guard():
    """Normalised hashes of everything the bars are measured on, per set."""
    by_set = {}
    n_by = {}
    for name in ("lf-hu", "lf-ai", "ai-shortform", "human-shortform-widened", "nine"):
        p = os.path.join(C3SETS, f"{name}.jsonl")
        hs = {}
        for line in open(p, errors="replace"):
            r = json.loads(line)
            # The two short-form sets carry their own splits and their train
            # slices WERE trained on in cycles 3-4; only their held-out slices
            # are measurement material, so only those enter the guard.
            if name in ("ai-shortform", "human-shortform-widened") and \
                    r.get("split") not in ("test", "never-trained"):
                continue
            if r.get("text"):
                hs[norm_sha(r["text"])] = r.get("id")
        by_set[name] = hs
        n_by[name] = len(hs)
    for fn in ("human-corpus-v2.json", "human-corpus-v1.json"):
        p = os.path.join(BATTERY, fn)
        if os.path.exists(p):
            docs = json.load(open(p))
            hs = {}
            for d in docs:
                t = d.get("text") or d.get("body") or ""
                if t:
                    hs[norm_sha(t)] = d.get("id")
            by_set[fn] = hs
            n_by[fn] = len(docs)
    return by_set, n_by


def main() -> None:
    require_matched = os.environ.get("C5_REQUIRE_MATCHED", "1") == "1"
    guard_sets, guard_counts = load_guard()
    guard_hashes = set().union(*[set(h) for h in guard_sets.values()])
    # long-form overlap is a documented corpus property (PER-MODEL-DETECTION
    # correction, 30 Aug 2026): base cycle-2/3/4 training rows legitimately
    # predate the long-form corpus, which reused some of the same source
    # documents. Those docs are EXCLUDED FROM THE MEASUREMENT, not from
    # training. Every other measurement set aborts on a train/cal collision.
    lf_hashes = set(guard_sets["lf-hu"]) | set(guard_sets["lf-ai"])
    hard_hashes = guard_hashes - lf_hashes
    print(f"guard: {len(guard_hashes)} normalised hashes from {guard_counts}", flush=True)

    rows = [json.loads(l) for l in open(BASE)]
    n_base = len(rows)
    seen = {r["sha256"] for r in rows}
    seen_norm = {r.get("norm_sha256") for r in rows if r.get("norm_sha256")}
    blocked = collections.Counter()
    new = []
    eval_exclusions = {"longform_source_row_ids": [], "longform_norm_hashes": []}

    def add(text, **kw):
        s, ns = sha(text), norm_sha(text)
        if s in seen or ns in seen_norm:
            blocked["duplicate"] += 1
            return False
        if ns in guard_hashes:
            blocked["measurement-text"] += 1
            return False
        seen.add(s)
        seen_norm.add(ns)
        words = len(text.split())
        new.append({
            "id": kw.pop("id"), "side": kw.pop("side"),
            "register": kw.pop("register"), "provider": kw.pop("provider"),
            "model": kw.pop("model"), "era": kw.pop("era"),
            "genre": kw.pop("genre"), "edit_level": kw.pop("edit_level", None),
            "split": kw.pop("split"), "source": kw.pop("source"),
            "licence": kw.pop("licence"), "words": words, "sha256": s,
            "norm_sha256": ns, "note": kw.pop("note", "cycle5"),
            "text": text, "prompt_style": kw.pop("prompt_style", None),
            "model_tier": kw.pop("model_tier", None),
            "hard_negative": kw.pop("hard_negative", False),
            "confusable": kw.pop("confusable", False),
            "longform": words > 800, "axis": "longform" if words > 800 else "shortform",
            "group": kw.pop("group"),
        })
        return True

    # ---- 1. humaniser pairs (train file only) ------------------------------
    n_pair = collections.Counter()
    for line in open(PAIRS):
        r = json.loads(line)
        cls, inten = r["class_label"], r["edit_intensity"]
        take = (cls == "ai_original_neural_rewrite") or \
               (cls == "human_original_ai_edited" and inten == "heavy")
        if not take:
            n_pair[f"skip:{cls}:{inten}"] += 1
            continue
        text = r["output_text"]
        ok = add(text,
                 id="c5p-" + r["variant_id"], side="ai",
                 register=PAIR_REG.get(r["register"], "article"),
                 provider=r["rewriting_model_family"], model=r["rewriting_model"],
                 era="2026-ai", genre=f"llm-rewrite-{cls}",
                 edit_level=f"rewrite-{inten}",
                 split=bucket("c5p-" + r["lineage_id"]),
                 source="cycle4-humaniser-pairs",
                 licence="derived; owner-approved for training",
                 prompt_style="rewrite", model_tier="standard",
                 hard_negative=True, group="c5p-" + r["lineage_id"],
                 note=f"cycle5 pairs {cls}/{inten}")
        if ok:
            n_pair[f"kept:{cls}:{inten}"] += 1
            if r.get("measurement_overlap"):
                eval_exclusions["longform_source_row_ids"].append(r.get("source_row_id"))
                eval_exclusions["longform_norm_hashes"].append(norm_sha(r["source_text"]))
    print(f"humaniser pairs: {dict(n_pair)}", flush=True)

    # ---- 2. structured human corpus, GREEN only ----------------------------
    n_struct = collections.Counter()
    matched_eval_humans = []
    for line in open(STRUCT):
        r = json.loads(line)
        if r.get("legal_bucket") != "GREEN":
            n_struct["skip:non-green"] += 1
            continue
        topic = (r.get("brief") or {}).get("topic") or r.get("title") or r["id"]
        g = "c5h-" + slug(topic)
        if is_heldout_topic(topic):
            n_struct["heldout-topic-bucket"] += 1
            matched_eval_humans.append(r)
            continue
        reg = STRUCT_REG.get(r.get("register"), "article")
        ok = add(r["text"],
                 id="c5h-" + r["id"], side="human", register=reg,
                 provider="human", model="human", era="pre-2022-human",
                 genre="structured-" + (r.get("register") or "unknown"),
                 split=bucket(g), source="human-structured-" + r["source"],
                 licence=r.get("licence") or "see corpus manifest",
                 hard_negative=reg in ("marketing",), confusable=True,
                 group=g, note=f"cycle5 structured GREEN {r.get('human_confidence')}")
        if ok:
            n_struct["kept"] += 1
    print(f"structured humans: {dict(n_struct)}", flush=True)

    # ---- 3. matched AI generations -----------------------------------------
    n_match = collections.Counter()
    matched_eval_ai = []
    if os.path.exists(MATCHED):
        for line in open(MATCHED):
            r = json.loads(line)
            topic = (r.get("brief") or {}).get("topic") or ""
            heldout = (r.get("model_family") == "google") or is_heldout_topic(topic)
            if bool(r.get("eval_only")) != heldout:
                raise RuntimeError(f"eval_only mismatch on {r['id']}: field says "
                                   f"{r.get('eval_only')}, re-derivation says {heldout}")
            if heldout:
                n_match["eval-only"] += 1
                matched_eval_ai.append(r)
                continue
            g = "c5h-" + slug(topic)   # SAME group key as the human partner
            ok = add(r["text"],
                     id="c5m-" + r["id"], side="ai",
                     register=STRUCT_REG.get(r.get("register"), "article"),
                     provider=r["model_family"], model=r["model"],
                     era="2026-frontier", genre="matched-" + (r.get("register") or "unknown"),
                     edit_level="full-generation",
                     split=bucket(g), source="matched-generation-2026-08-31",
                     licence="Owner-generated (Opace)",
                     prompt_style="matched-brief",
                     model_tier="pro-flagship" if r.get("model_role") == "flagship" else "standard",
                     hard_negative=r.get("model_role") == "evader-priority",
                     group=g, note="cycle5 matched pair")
            if ok:
                n_match["kept"] += 1
        print(f"matched AI: {dict(n_match)}", flush=True)
    elif require_matched:
        raise RuntimeError("matched.jsonl absent and C5_REQUIRE_MATCHED=1")
    else:
        print("matched.jsonl NOT INCLUDED (C5_REQUIRE_MATCHED=0)", flush=True)

    # ---- guards ------------------------------------------------------------
    n_guarded = blocked["measurement-text"]
    print(f"blocked: {dict(blocked)}", flush=True)
    # Sweep every train/cal row. Battery / short-form / nine collisions abort;
    # long-form-corpus collisions become measurement exclusions (documented
    # corpus property — see load_guard comment) and are counted per source.
    lf_overlap = collections.Counter()
    battery_hashes = set(guard_sets.get("human-corpus-v2.json", {})) | \
        set(guard_sets.get("human-corpus-v1.json", {}))
    dropped_battery = []
    kept = []
    for r in rows + new:
        if r["split"] in ("train", "cal"):
            if r.get("train_forbidden"):
                raise RuntimeError(f"train_forbidden row outside test: {r['id']}")
            ns = r.get("norm_sha256") or norm_sha(r["text"])
            if ns in battery_hashes:
                # cross-harvest near-duplicates the exact-hash quarantine of
                # cycle 2 could not see (both sides sampled C4-2019). Dropped
                # from training; a large number would mean a broken guard.
                dropped_battery.append(r["id"])
                continue
            if ns in hard_hashes:
                raise RuntimeError(f"QUARANTINE VIOLATION: {r['id']} ({r.get('source')}) "
                                   f"matches a held-out measurement text")
            if ns in lf_hashes:
                eval_exclusions["longform_norm_hashes"].append(ns)
                lf_overlap[r.get("source")] += 1
        kept.append(r)
    assert len(dropped_battery) <= 25, \
        f"{len(dropped_battery)} battery collisions — too many to be coincidence"
    rows_out_all = kept
    print(f"quarantine sweep over ALL train/cal rows: 0 held-out collisions — PASS; "
          f"dropped {len(dropped_battery)} battery near-duplicates {dropped_battery}; "
          f"long-form-corpus overlap (excluded from that measurement, by source): "
          f"{dict(lf_overlap)}", flush=True)

    rows_out = rows_out_all
    with open(OUT, "w") as fh:
        for r in rows_out:
            fh.write(json.dumps(r) + "\n")
    with open(os.path.join(HERE, "matched-eval-ai.jsonl"), "w") as fh:
        for r in matched_eval_ai:
            fh.write(json.dumps(r) + "\n")
    with open(os.path.join(HERE, "matched-eval-humans.jsonl"), "w") as fh:
        for r in matched_eval_humans:
            fh.write(json.dumps(r) + "\n")
    json.dump(eval_exclusions, open(os.path.join(HERE, "eval-exclusions.json"), "w"),
              indent=1)

    def ct(sel, key):
        return dict(sorted(collections.Counter(
            str(r.get(key)) for r in rows_out if sel(r)).items(), key=lambda x: -x[1]))

    man = {
        "built": "2026-08-31", "version": "v5-structural-features",
        "base": "cycle4-fiction/dataset.jsonl (rows and splits preserved verbatim)",
        "base_rows": n_base, "new_rows": len(new), "rows": len(rows_out),
        "inputs_sha256": {os.path.relpath(p, RESEARCH): file_sha(p)
                          for p in (BASE, PAIRS, STRUCT) + ((MATCHED,) if os.path.exists(MATCHED) else ())},
        "new_by_source_split": {f"{k[0]}/{k[1]}": v for k, v in sorted(collections.Counter(
            (r["source"], r["split"]) for r in new).items())},
        "new_by_side": dict(collections.Counter(r["side"] for r in new)),
        "pairs_detail": dict(n_pair), "struct_detail": dict(n_struct),
        "matched_detail": dict(n_match),
        "matched_included": os.path.exists(MATCHED),
        "matched_eval_ai_rows": len(matched_eval_ai),
        "matched_eval_human_rows": len(matched_eval_humans),
        "eval_exclusions_longform_docs": len(set(eval_exclusions["longform_norm_hashes"])),
        "by_split": ct(lambda r: True, "split"),
        "train_by_side": ct(lambda r: r["split"] == "train", "side"),
        "blocked": dict(blocked),
        "guard": {"hashes": len(guard_hashes), "sources": guard_counts,
                  "rule": "normalised-text SHA-256 against every measurement set; "
                          "abort if any survives into train/cal"},
        "heldout_rules": {
            "matched_family": "google (entire gemini family eval-only)",
            "topic_bucket": "sha256(slug(topic)) % 100 < 15 eval-only, re-derived here",
        },
        "label_policy_pairs": ("ai_original_neural_rewrite -> ai (all intensities); "
                               "human_original_ai_edited -> ai at heavy only; "
                               "light/medium human rewrites excluded from training"),
    }
    json.dump(man, open(os.path.join(HERE, "dataset-manifest.json"), "w"), indent=2)
    print(json.dumps({k: v for k, v in man.items() if k not in ("inputs_sha256",)},
                     indent=2), flush=True)


if __name__ == "__main__":
    main()

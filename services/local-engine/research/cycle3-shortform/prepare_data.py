"""Build the cycle-3 two-axis dataset: cycle-2 rows plus short-form rows
balanced on LENGTH and LEXICAL REPETITION (type-token ratio).

Two measured defects drive this (docs/measurements/SHORT-FORM-RETRAIN.md):
  * length - 22.6% detected at 100 words against 93.7% at 600;
  * repetition - flat at 86-88% down to TTR 0.55, then 79.5% / 57.6% / 16-20%.

Corpus-side rules that this file enforces, and why:

  1. The human short-form side is the OPACE BLOG ONLY. The widened 4,368-passage
     set is cut from the same 4,636 documents the false-positive bar is measured
     on, so training on it would contaminate that bar. It is held entirely out
     and used as a test set.
  2. Group key is the POST SLUG for both sides. Every AI topic was derived from
     a blog post title, so all 221 AI groups map exactly onto human post slugs;
     using the slug for both means a subject can never straddle train and test.
  3. The owner's six team samples are excluded by slug on both sides.
  4. Hard-negative boost goes to the two measured evasion cases: short (<=300
     target words) and repetitive (TTR < 0.55).

Writes dataset.jsonl (cycle-2 rows verbatim + new short-form rows) and
dataset-manifest.json.
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
CYCLE2 = os.path.join(RESEARCH, "cycle2-train", "dataset.jsonl")
SF = os.environ.get("SHORTFORM_DIR")
OUT = os.path.join(HERE, "dataset.jsonl")

AI_FILES = ("pilot-ai-samples.jsonl", "seo-heavy.jsonl", "seo-moderate.jsonl",
            "seo-probe.jsonl", "seo-probe-mod.jsonl")
HUMAN_FILE = "human-shortform.jsonl"

# The owner's own sanity check. Never trained on, never split into cal.
HELD_OUT_SLUGS = {
    "post-panda-seo-checklist-part-1", "social-media-campaign-objectives",
    "emerging-online-trends-esports", "social-media-future",
    "mobile-friendly-seo", "seo-ranking-guidelines",
}

_WORD = re.compile(r"[a-z']+")


def ttr(text: str) -> float:
    w = _WORD.findall(text.lower())
    return len(set(w)) / len(w) if w else 0.0


def slug_of(row: str) -> str:
    return row.replace("aitopic__", "")


def bucket(group: str) -> str:
    """Deterministic group-aware split. 60 / 15 / 25 by SHA-256 of the slug."""
    h = int(hashlib.sha256(group.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < 60 else ("cal" if h < 75 else "test")


def main() -> None:
    assert SF, "set SHORTFORM_DIR to the directory holding the short-form jsonl files"
    rows_out = []
    n_cycle2 = 0
    with open(CYCLE2) as fh:
        for line in fh:
            rows_out.append(json.loads(line))
            n_cycle2 += 1

    seen = set()
    new = []
    for f in AI_FILES:
        path = os.path.join(SF, f)
        if not os.path.exists(path):
            continue
        for line in open(path):
            r = json.loads(line)
            slug = slug_of(r["group"])
            if slug in HELD_OUT_SLUGS:
                continue
            sha = hashlib.sha256(" ".join(r["text"].split()).lower().encode()).hexdigest()
            if sha in seen:
                continue
            seen.add(sha)
            t = ttr(r["text"])
            new.append({
                "id": "c3-" + r["id"],
                "side": "ai",
                "register": "marketing",
                "provider": r.get("provider", "openai"),
                "model": r.get("model"),
                "era": "2026-ai",
                "genre": "shortform-" + r.get("style", "plain"),
                "edit_level": None,
                "split": bucket(slug),
                "source": r.get("source", "openrouter-shortform"),
                "licence": "generated for this project",
                "words": r["word_count"],
                "sha256": sha,
                "note": f"shortform axis; target_len={r['target_len']} ttr={t:.3f}",
                "text": r["text"],
                "prompt_style": r.get("style"),
                "model_tier": "standard",
                "hard_negative": bool(r["target_len"] <= 300 or t < 0.55),
                "confusable": False,
                "longform": False,
                "group": slug,
                "target_len": r["target_len"],
                "ttr": round(t, 4),
                "axis": "shortform",
            })

    for line in open(os.path.join(SF, HUMAN_FILE)):
        r = json.loads(line)
        slug = r["group"]
        if slug in HELD_OUT_SLUGS:
            continue
        sha = hashlib.sha256(" ".join(r["text"].split()).lower().encode()).hexdigest()
        if sha in seen:
            continue
        seen.add(sha)
        t = ttr(r["text"])
        new.append({
            "id": "c3-" + r["id"],
            "side": "human",
            "register": "marketing",
            "provider": "human",
            "model": "human",
            "era": "pre-2022-human",
            "genre": "shortform-blog",
            "edit_level": None,
            "split": bucket(slug),
            "source": "opace-blog (pre-2022, migration-snapshot gated)",
            "licence": "Opace's own content",
            "words": r["word_count"],
            "sha256": sha,
            "note": f"shortform axis; target_len={r['target_len']} ttr={t:.3f}",
            "text": r["text"],
            "prompt_style": None,
            "model_tier": None,
            "hard_negative": bool(r["target_len"] <= 300 or t < 0.55),
            "confusable": True,
            "longform": False,
            "group": slug,
            "target_len": r["target_len"],
            "ttr": round(t, 4),
            "axis": "shortform",
        })

    # collision guard against the cycle-2 corpus
    c2 = {r.get("sha256") for r in rows_out}
    collisions = [r for r in new if r["sha256"] in c2]
    assert not collisions, f"{len(collisions)} short-form rows collide with cycle-2 text"

    rows_out.extend(new)
    with open(OUT, "w") as fh:
        for r in rows_out:
            fh.write(json.dumps(r) + "\n")

    def tbin(t):
        for lo, hi, name in ((0, .42, "<0.42"), (.42, .46, "0.42-0.46"),
                             (.46, .50, "0.46-0.50"), (.50, .55, "0.50-0.55"),
                             (.55, .60, "0.55-0.60"), (.60, 2, ">=0.60")):
            if lo <= t < hi:
                return name
        return ">=0.60"

    man = {
        "built": "2026-08-30",
        "version": "v3-two-axis",
        "base": "cycle2-train/dataset.jsonl (rows and splits preserved verbatim)",
        "cycle2_rows": n_cycle2,
        "shortform_rows": len(new),
        "rows": len(rows_out),
        "shortform_by_side": dict(collections.Counter(r["side"] for r in new)),
        "shortform_by_split": dict(collections.Counter(r["split"] for r in new)),
        "shortform_groups": len({r["group"] for r in new}),
        "shortform_by_length": {
            side: dict(sorted(collections.Counter(
                r["target_len"] for r in new if r["side"] == side).items()))
            for side in ("ai", "human")},
        "shortform_by_ttr_bin": {
            side: dict(collections.Counter(tbin(r["ttr"]) for r in new if r["side"] == side))
            for side in ("ai", "human")},
        "held_out_slugs": sorted(HELD_OUT_SLUGS),
        "excluded_from_training": (
            "human-shortform-widened.jsonl (4,368 passages) is cut from the same "
            "4,636 human documents the false-positive bar is measured on, so it is "
            "held entirely out of training and used only as a test set"),
        "group_rule": "post slug, shared by AI topic and human passage; 60/15/25 by SHA-256",
    }
    json.dump(man, open(os.path.join(HERE, "dataset-manifest.json"), "w"), indent=2)
    print(json.dumps(man, indent=2))


if __name__ == "__main__":
    main()

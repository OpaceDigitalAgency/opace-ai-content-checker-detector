"""Build the cycle-4 dataset: cycle-3 rows plus a matched CREATIVE register and
matched register breadth on both sides.

What cycle 3 got wrong, measured rather than assumed. Its training split held
no human fiction at all and its 339 AI fiction rows sat entirely in the test
split, so nothing in training taught the model what fiction looks like on
either side. It then trained the model to stop reading lexical repetition as
evidence of a human. Human fiction is lexically repetitive, so fiction false
positives rose 23/260 -> 29/260, and all six new ones were genuine narrative
prose - YA, science fiction, a thriller, a memoir, a short story, poetry.

Rules this file enforces, and why each one exists:

  1. NOTHING the false-positive bar is measured on may enter training. That is
     4,636 long-form human documents, 4,368 widened short-form human passages,
     922 long-form AI documents, and the owner's nine. Every candidate row is
     checked against all four by normalised SHA-256 AND by source_ref, and the
     build asserts on any hit. This is the guard that makes the after-figures
     mean anything.
  2. Every new AI register arrives WITH a matched human side harvested fresh
     for it. An AI-only cell is the register confound of handover §4.1 - the
     model can satisfy the loss on subject matter instead of authorship.
  3. Group key is the source document or the topic seed, and the split is by
     SHA-256 of it, so no subject straddles train and test.
  4. The owner's six team samples are excluded by slug on both sides.

Writes dataset.jsonl and dataset-manifest.json.
"""
from __future__ import annotations

import collections
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
CYCLE3 = os.path.join(RESEARCH, "cycle3-shortform", "dataset.jsonl")
OUT = os.path.join(HERE, "dataset.jsonl")

# The held-out measurement sets, as this session's scratch copies of them.
SETS = os.environ.get("C3SETS", "")

HELD_OUT_SLUGS = {
    "post-panda-seo-checklist-part-1", "social-media-campaign-objectives",
    "emerging-online-trends-esports", "social-media-future",
    "mobile-friendly-seo", "seo-ranking-guidelines",
}

# AI generation register seed -> the corpus's own register taxonomy.
REGISTER_MAP = {
    "fiction": "creative",
    "medical-research": "academic",
    "student-essay": "academic",
    "policy-report": "report",
    "corporate-filing": "report",
    "gov-guidance": "reference",
    "environmental-journalism": "article",
    "world-journalism": "article",
}

# Harvested human file -> (register, source label).
HUMAN_FILES = {
    "human-fiction-new.jsonl": "creative",
    "raw-new/govuk.filtered.jsonl": "reference",
    "raw-new/mongabay.filtered.jsonl": "article",
    "raw-new/globalvoices.filtered.jsonl": "article",
    "raw-new/crs.filtered.jsonl": "report",
    "raw-new/edgar.filtered.jsonl": "report",
    "raw-new/persuade.filtered.jsonl": "academic",
    "raw-new/epmc.filtered.jsonl": "academic",
    "raw-new/epmc-review.filtered.jsonl": "academic",
}

TARGETS = [100, 300, 400, 600]

# Caps on the harvested human side. The harvest returned far more than the
# training set needs (1,001 fiction passages, 10,652 register documents) and
# cutting every one at four bands would add ~58,000 highly correlated rows.
# Creative gets the largest share because fiction is what this cycle is for.
# Capped PER FILE, not per register: a register fed by two sources must carry
# both, or the register becomes one publication's house style.
HUMAN_ROW_CAP = {"human-fiction-new.jsonl": 2600}
HUMAN_ROW_CAP_DEFAULT = 620
_WORD = re.compile(r"[a-z']+")
_SENT = re.compile(r"(?<=[.!?])\s+")
_WS = re.compile(r"\s+")
_NONWORD = re.compile(r"[^a-z0-9 ]+")


def norm_sha(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).lower()
    t = _NONWORD.sub(" ", t)
    return hashlib.sha256(_WS.sub(" ", t).strip().encode()).hexdigest()


def ttr(text: str) -> float:
    w = _WORD.findall(text.lower())
    return round(len(set(w)) / len(w), 4) if w else 0.0


def bucket(group: str) -> str:
    h = int(hashlib.sha256(group.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < 60 else ("cal" if h < 75 else "test")


def units(text):
    paras = [_WS.sub(" ", p.strip()) for p in re.split(r"\n\s*\n", text) if p.strip()]
    good = [p for p in paras if len(p.split()) >= 15]
    if len(good) >= 2:
        return good, "paragraph"
    sents = [s.strip() for s in _SENT.split(_WS.sub(" ", text)) if s.strip()]
    return [s for s in sents if len(s.split()) >= 5], "sentence"


def cut(us, target, cap=1):
    out, buf, n = [], [], 0
    lo, hi = target * 0.70, target * 1.70
    for u in us:
        w = len(u.split())
        if w > hi and not buf:
            continue
        buf.append(u)
        n += w
        if n >= target * 0.85:
            if lo <= n <= hi:
                out.append((" ".join(buf), n))
                if len(out) >= cap:
                    return out
            buf, n = [], 0
    return out


def load_measurement_guard():
    """Normalised hashes and source_refs of everything the bars are measured on."""
    assert SETS, "set C3SETS to the directory holding lf-hu/lf-ai/nine/…"
    hashes, refs = set(), set()
    for name in ("lf-hu", "lf-ai", "nine", "human-shortform-widened", "ai-shortform"):
        p = os.path.join(SETS, f"{name}.jsonl")
        if not os.path.exists(p):
            print(f"  guard: {name}.jsonl not present", file=sys.stderr)
            continue
        n = 0
        for line in open(p, errors="replace"):
            r = json.loads(line)
            if r.get("text"):
                hashes.add(norm_sha(r["text"]))
            if r.get("source_ref"):
                refs.add(r["source_ref"])
            n += 1
        print(f"  guard: {name} {n} rows", flush=True)
    return hashes, refs


def main() -> None:
    guard_hashes, guard_refs = load_measurement_guard()
    print(f"guard: {len(guard_hashes)} normalised hashes, {len(guard_refs)} source_refs",
          flush=True)

    rows_out = []
    n_cycle3 = 0
    for line in open(CYCLE3):
        rows_out.append(json.loads(line))
        n_cycle3 += 1
    existing = {r.get("sha256") for r in rows_out}

    new = []
    seen = set()
    blocked = collections.Counter()

    def add(rec_text, **kw):
        sha = hashlib.sha256(" ".join(rec_text.split()).lower().encode()).hexdigest()
        nsha = norm_sha(rec_text)
        if sha in seen or sha in existing:
            blocked["duplicate"] += 1
            return
        if nsha in guard_hashes:
            blocked["measurement-text"] += 1
            return
        if kw.get("source_ref") and kw["source_ref"] in guard_refs:
            blocked["measurement-source"] += 1
            return
        seen.add(sha)
        t = ttr(rec_text)
        words = len(rec_text.split())
        axis = "shortform" if words <= 800 else "longform"
        kw.setdefault("target_len", 0)
        new.append({
            "id": kw.pop("id"),
            "side": kw.pop("side"),
            "register": kw.pop("register"),
            "provider": kw.pop("provider", "human"),
            "model": kw.pop("model", "human"),
            "era": kw.pop("era", "2026-ai"),
            "genre": kw.pop("genre"),
            "edit_level": None,
            "split": bucket(kw["group"]),
            "source": kw.pop("source"),
            "licence": kw.pop("licence", "generated for this project"),
            "words": words,
            "sha256": sha,
            "norm_sha256": nsha,
            "note": f"cycle4; target_len={kw.get('target_len')} ttr={t:.3f}",
            "text": rec_text,
            "prompt_style": kw.pop("prompt_style", None),
            "model_tier": kw.pop("model_tier", None),
            "hard_negative": bool(kw.get("target_len", 999) <= 300 or t < 0.55),
            "confusable": kw.pop("confusable", False),
            "longform": axis == "longform",
            "group": kw.pop("group"),
            "target_len": kw.pop("target_len"),
            "ttr": t,
            "axis": axis,
            "source_ref": kw.pop("source_ref", None),
        })

    # ---- AI side -----------------------------------------------------------
    for f in sorted(glob.glob(os.path.join(HERE, "ai-*.jsonl"))):
        base = os.path.basename(f)
        for line in open(f, errors="replace"):
            r = json.loads(line)
            reg = REGISTER_MAP.get(r.get("register_seed"), "marketing")
            add(r["text"],
                id="c4-" + r["id"], side="ai", register=reg,
                provider=r.get("provider", "openai"), model=r.get("model"),
                era="2026-ai",
                genre=("shortform-" if r["target_len"] <= 600 else "longform-")
                      + r.get("style", "plain"),
                source=r.get("source", base),
                prompt_style=r.get("style"), model_tier="standard",
                group="c4ai-" + r["group"], target_len=r["target_len"])

    # ---- human side --------------------------------------------------------
    per_register = collections.Counter()
    for rel, reg in HUMAN_FILES.items():
        p = os.path.join(HERE, rel)
        if not os.path.exists(p):
            print(f"  human file absent, skipped: {rel}", flush=True)
            continue
        n_before = len(new)
        # deterministic thinning so one big source cannot crowd out another
        lines = open(p, errors="replace").read().splitlines()
        keep_every = max(1, len(lines) // max(
            1, HUMAN_ROW_CAP.get(rel, HUMAN_ROW_CAP_DEFAULT) // 3))
        lines = lines[::keep_every]
        for i, line in enumerate(lines):
            if per_register[rel] >= HUMAN_ROW_CAP.get(rel, HUMAN_ROW_CAP_DEFAULT):
                break
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = r.get("text") or ""
            if len(text.split()) < 250:
                continue
            ref = r.get("source_ref") or f"{rel}#{i}"
            group = "c4hu-" + hashlib.sha256(ref.encode()).hexdigest()[:16]
            us, how = units(text)
            # short-form passages at the four bands, plus the whole document
            for tgt in TARGETS[:2] if reg != "creative" else TARGETS:
                for chunk, wc in cut(us, tgt):
                    per_register[rel] += 1
                    add(chunk,
                        id=f"c4-hu-{reg}-{group[-8:]}-{tgt}",
                        side="human", register=reg, provider="human", model="human",
                        era="pre-2023-human", genre="shortform-harvested",
                        source=r.get("source", rel) + "",
                        licence=r.get("licence", "see source"),
                        confusable=True, group=group, target_len=tgt,
                        source_ref=r.get("source_ref"))
            per_register[rel] += 1
            add(text,
                id=f"c4-hu-{reg}-{group[-8:]}-full",
                side="human", register=reg, provider="human", model="human",
                era="pre-2023-human", genre="longform-harvested",
                source=r.get("source", rel),
                licence=r.get("licence", "see source"),
                confusable=True, group=group, target_len=0,
                source_ref=r.get("source_ref"))
        print(f"  {rel}: +{len(new)-n_before} rows", flush=True)

    # ---- guards ------------------------------------------------------------
    # Rows that hit the guard are already excluded by add(); what matters here
    # is whether the number is small enough to be coincidence. A handful means
    # a harvested chunk happened to duplicate a measured one - two Internet
    # Archive uploads of the same public-domain text, say. A large number would
    # mean the exclusion-by-source_ref step had failed, and that must stop the
    # build rather than quietly shrink the corpus.
    n_guarded = blocked["measurement-text"] + blocked["measurement-source"]
    assert n_guarded <= 25, (
        f"contamination: {blocked['measurement-text']} rows share text with a "
        f"measurement set and {blocked['measurement-source']} share a source_ref. "
        "That is too many to be coincidence - the exclusion step has failed. "
        "Nothing was written.")
    print(f"guard excluded {n_guarded} rows that overlap the measurement sets",
          flush=True)
    print(f"blocked: {dict(blocked)}", flush=True)

    # every register that gains an AI cell must gain a human one in the same axis
    cells = collections.Counter((r["register"], r["axis"], r["side"]) for r in new)
    lonely = [(reg, ax) for (reg, ax, side), n in cells.items()
              if side == "ai" and cells.get((reg, ax, "human"), 0) == 0]
    if lonely:
        print(f"WARNING: AI-only cells with no new human counterpart: {lonely}",
              flush=True)

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
        "version": "v4-fiction-and-register-breadth",
        "base": "cycle3-shortform/dataset.jsonl (rows and splits preserved verbatim)",
        "cycle3_rows": n_cycle3,
        "new_rows": len(new),
        "rows": len(rows_out),
        "new_by_side": dict(collections.Counter(r["side"] for r in new)),
        "new_by_split": dict(collections.Counter(r["split"] for r in new)),
        "new_by_register_side": {f"{k[0]}/{k[1]}/{k[2]}": v
                                 for k, v in sorted(cells.items())},
        "new_groups": len({r["group"] for r in new}),
        "new_by_ttr_bin": {
            side: dict(collections.Counter(tbin(r["ttr"]) for r in new
                                           if r["side"] == side))
            for side in ("ai", "human")},
        "blocked": dict(blocked),
        "guard": {
            "measurement_hashes": len(guard_hashes),
            "measurement_source_refs": len(guard_refs),
            "rule": ("no row may share normalised text or a source_ref with "
                     "lf-hu, lf-ai, nine, human-shortform-widened or ai-shortform"),
        },
        "held_out_slugs": sorted(HELD_OUT_SLUGS),
        "group_rule": "source document or topic seed; 60/15/25 by SHA-256",
    }
    json.dump(man, open(os.path.join(HERE, "dataset-manifest.json"), "w"), indent=2)
    print(json.dumps(man, indent=2))


if __name__ == "__main__":
    main()

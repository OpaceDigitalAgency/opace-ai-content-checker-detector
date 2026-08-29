"""Build the cycle-3 training set: cycle-2's data, the FULL HAT-Bench ladder, and a
synthetic human-edit ladder over AI drafts.

Targets are soft: `ai_ratio` in [0,1], the share of the document's words that are
AI-authored. Fully generated = 1.0, pure human = 0.0, HAT-Bench = its own
AI_token_ratio, synthetic rows = measured.

Splits: cycle-2's splits are honoured exactly. Synthetic rows are derived only
from train/cal source documents, and inherit the source document's split, so no
test document is ever seen in any form during training.
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import random
import sys

import common3 as C
import editor
import hat_full

OUT = os.path.join(C.HERE, "dataset3.jsonl")
SEED = 20260829
HAT_PER_VERSION_TRAIN = 1100
HAT_PER_VERSION_CAL = 260
MIN_WORDS = 150


def _rec(text, ai_ratio, split, kind, register, source, **kw):
    d = dict(text=text, ai_ratio=float(max(0.0, min(1.0, ai_ratio))), split=split,
             kind=kind, register=register, source=source,
             side="ai" if ai_ratio >= 0.5 else "human",
             words=len(text.split()),
             id=hashlib.sha256((source + text[:600]).encode()).hexdigest()[:20])
    d.update(kw)
    return d


def paragraphs_pool(rows, min_words=25, max_words=140):
    pool = collections.defaultdict(list)
    for r in rows:
        for p in editor.split_paras(r["text"]):
            n = len(p.split())
            if min_words <= n <= max_words:
                pool[r["register"]].append(p)
    return pool


def main():
    rng = random.Random(SEED)
    c2 = [r for r in C.jsonl(C.DATASET2)]
    out = []

    # ---- 1. cycle-2 rows, minus its thin HAT sample (replaced below in full) ----
    n_drop = 0
    for r in c2:
        if "hatbench" in (r.get("source") or ""):
            n_drop += 1
            continue
        if r["split"] == "test":
            continue
        if r.get("eval_only"):
            continue
        out.append(_rec(r["text"], 1.0 if r["side"] == "ai" else 0.0, r["split"],
                        "cycle2", r["register"], r.get("source") or "cycle2",
                        hard_negative=bool(r.get("hard_negative")),
                        edit_level=r.get("edit_level"), genre=r.get("genre")))
    print(f"cycle-2 rows kept {len(out)} (dropped {n_drop} thin HAT rows)")

    # ---- 2. FULL HAT-Bench ladder, group-aware, cycle-2 test still held out ----
    hat = hat_full.load()
    bybucket = collections.defaultdict(list)
    for r in hat:
        if r["split"] == "test" or r["words"] < MIN_WORDS:
            continue
        bybucket[(r["split"], r["version"])].append(r)
    n_hat = 0
    for (split, ver), rows in sorted(bybucket.items()):
        cap = HAT_PER_VERSION_TRAIN if split == "train" else HAT_PER_VERSION_CAL
        rng.shuffle(rows)
        # spread across the four editor models and four domains
        rows.sort(key=lambda r: (hashlib.sha256((r["generator"] + r["domain"] + r["sha"]).encode()).hexdigest()))
        for r in rows[:cap]:
            out.append(_rec(r["text"], r["ai_ratio"], split, "hat", r["register"],
                            f"hat-{r['domain']}-{r['generator']}",
                            edit_level=ver, genre=r["genre"], group=r["group"]))
            n_hat += 1
    print(f"HAT-Bench full ladder rows {n_hat}")

    # ---- 3. synthetic ladder: AI draft, human tidies ----
    src_ai = collections.defaultdict(list)
    src_hu = collections.defaultdict(list)
    for r in c2:
        if r["split"] == "test" or r.get("eval_only") or "hatbench" in (r.get("source") or ""):
            continue
        if r["words"] < 250:
            continue
        (src_ai if r["side"] == "ai" else src_hu)[r["split"]].append(r)
    print("synthetic sources:", {k: len(v) for k, v in src_ai.items()},
          {k: len(v) for k, v in src_hu.items()})

    hpool = {sp: paragraphs_pool(v) for sp, v in src_hu.items()}
    apool = {sp: paragraphs_pool(v) for sp, v in src_ai.items()}

    LIGHT = [0.04, 0.08, 0.12, 0.18, 0.25, 0.35]
    MIXH = [0.15, 0.3, 0.45, 0.6, 0.8]
    counts = collections.Counter()
    for split in ("train", "cal"):
        ai_rows = src_ai[split][:]
        hu_rows = src_hu[split][:]
        rng.shuffle(ai_rows)
        rng.shuffle(hu_rows)
        n_ai = min(len(ai_rows), 2600 if split == "train" else 600)
        n_hu = min(len(hu_rows), 2600 if split == "train" else 600)

        # 3a. AI draft, human light edit -> still overwhelmingly AI
        for i, r in enumerate(ai_rows[:n_ai]):
            tgt = LIGHT[i % len(LIGHT)]
            txt, frac = editor.edit(r["text"], tgt, seed=SEED + i)
            if frac < 0.005:
                continue
            out.append(_rec(txt, 1.0 - frac, split, "synth-ai-edited", r["register"],
                            "synth-edit", edit_level=f"edited-{tgt:.2f}", genre=r.get("genre")))
            counts["ai-edited"] += 1

        # 3b. the control: the SAME editor on human documents, still human
        for i, r in enumerate(hu_rows[:n_hu]):
            tgt = LIGHT[i % len(LIGHT)]
            txt, frac = editor.edit(r["text"], tgt, seed=SEED + 7919 + i)
            if frac < 0.005:
                continue
            out.append(_rec(txt, 0.0, split, "synth-human-edited", r["register"],
                            "synth-edit-control", edit_level=f"edited-{tgt:.2f}",
                            genre=r.get("genre"), hard_negative=True))
            counts["human-edited-control"] += 1

        # 3c. AI draft with human paragraphs pasted in, graded
        for i, r in enumerate(ai_rows[:n_ai]):
            share = MIXH[i % len(MIXH)]
            pool = hpool[split].get(r["register"]) or sum(hpool[split].values(), [])
            txt, ai_ratio = editor.mix_paragraphs(r["text"], pool, share, seed=SEED + 104729 + i)
            if abs(ai_ratio - 1.0) < 0.02:
                continue
            out.append(_rec(txt, ai_ratio, split, "synth-mix-ai-base", r["register"],
                            "synth-mix", edit_level=f"mix-h{share:.2f}", genre=r.get("genre")))
            counts["mix-ai-base"] += 1

        # 3d. human draft with AI paragraphs pasted in, graded (the other direction)
        for i, r in enumerate(hu_rows[:n_hu]):
            share = MIXH[i % len(MIXH)]
            pool = apool[split].get(r["register"]) or sum(apool[split].values(), [])
            txt, hum_ratio = editor.mix_paragraphs(r["text"], pool, share, seed=SEED + 15486 + i)
            ai_ratio = 1.0 - hum_ratio
            if ai_ratio < 0.02:
                continue
            out.append(_rec(txt, ai_ratio, split, "synth-mix-human-base", r["register"],
                            "synth-mix", edit_level=f"mix-a{share:.2f}", genre=r.get("genre")))
            counts["mix-human-base"] += 1
        print(f"  {split}: {dict(counts)}", flush=True)

    with open(OUT, "w") as fh:
        for r in out:
            fh.write(json.dumps(r) + "\n")
    summ = collections.Counter((r["split"], r["kind"]) for r in out)
    print("\nWROTE", OUT, len(out), "rows")
    for k in sorted(summ):
        print(" ", k, summ[k])


if __name__ == "__main__":
    main()

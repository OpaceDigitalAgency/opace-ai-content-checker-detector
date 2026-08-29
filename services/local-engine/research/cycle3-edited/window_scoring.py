"""Approach 3: does scoring overlapping windows and aggregating beat one
document-level score? A lightly-edited document is mostly untouched AI with a few
human sentences; a windowed maximum should find the untouched stretches.

Windows are ~120 words with 50% overlap. Aggregates tested: max, mean, and the
90th percentile. Evaluated on the same held-out sets at matched false positives.
"""
from __future__ import annotations

import collections, json, os, sys
import numpy as np
import common3 as C

W, STRIDE = 120, 60


def windows(text):
    w = text.split()
    if len(w) <= W:
        return [text]
    return [" ".join(w[i:i + W]) for i in range(0, max(1, len(w) - W // 2), STRIDE)][:12]


def main(ckpt, out):
    rows = [r for r in C.jsonl(os.path.join(C.HERE, "evalsets.jsonl"))
            if r["set"] in ("hat-test", "fresh", "fresh-edited", "fresh-mixed")]
    # subsample the big sets for tractability, keeping all fresh humans needed for FP
    keep = []
    for r in rows:
        if r["set"] == "fresh" and r["side"] == "human":
            keep.append(r)
        elif r["set"] == "fresh":
            keep.append(r)
        elif r["set"] == "hat-test" and r["band"] in ("v0", "v5", "v6", "v7", "v8"):
            keep.append(r)
        elif r["set"] in ("fresh-edited", "fresh-mixed"):
            keep.append(r)
    rows = keep
    texts, owner = [], []
    for i, r in enumerate(rows):
        for w in windows(r["text"]):
            texts.append(w)
            owner.append(i)
    print("docs", len(rows), "windows", len(texts), flush=True)
    sc = C.Scorer(ckpt, temperature=1.0)
    m = sc.margins(texts, bs=128, progress="win")
    agg = collections.defaultdict(list)
    for o, v in zip(owner, m):
        agg[o].append(float(v))
    res = {}
    for name, fn in (("max", np.max), ("mean", np.mean), ("p90", lambda a: np.percentile(a, 90))):
        s = np.array([fn(agg[i]) for i in range(len(rows))])
        hum = np.array([v for r, v in zip(rows, s) if r["set"] == "fresh" and r["side"] == "human"])
        h = np.sort(hum)
        thr = float(h[min(int(np.ceil(len(h) * (1 - 0.0122))), len(h) - 1)])
        g = collections.defaultdict(list)
        for r, v in zip(rows, s):
            key = ("hat-" + r["band"]) if r["set"] == "hat-test" else (
                r["set"] + "-" + ("ai" if r["side"] == "ai" else "human"))
            g[key].append(v > thr)
        res[name] = {"realised_fpr": round(float((hum > thr).mean()), 4),
                     "groups": {k: [round(float(np.mean(v)), 4), len(v)] for k, v in sorted(g.items())}}
    json.dump(res, open(os.path.join(C.HERE, out), "w"), indent=1)
    for k, v in res.items():
        print(k, v["realised_fpr"], v["groups"])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

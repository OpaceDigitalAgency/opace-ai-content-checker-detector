"""Does cycle-2 plus a cycle-3 edit specialist beat cycle 3 alone?

Each model's margin is first mapped to its own false-positive percentile against
the 4,636 fresh human long-form documents, so the two are on a common scale.
They are then combined by max (either model may raise the alarm) and by mean.
Everything is evaluated at a matched realised false-positive rate.
"""
from __future__ import annotations

import collections
import json
import os
import sys

import numpy as np

import common3 as C

SETS = os.path.join(C.HERE, "evalsets.jsonl")
BUDGETS = (0.005, 0.0122, 0.02, 0.03)


def load_margins(path):
    return json.load(open(os.path.join(C.HERE, path)))


def fp_percentile(margins, human_margins):
    """Fraction of fresh humans scoring at or below this margin."""
    h = np.sort(human_margins)
    return np.searchsorted(h, margins, side="right") / len(h)


def main(a_path, b_path):
    rows = list(C.jsonl(SETS))
    A, B = load_margins(a_path), load_margins(b_path)
    keys = [r["set"] + "|" + r["id"] for r in rows]
    ma = np.array([A[k] for k in keys])
    mb = np.array([B[k] for k in keys])
    is_fresh_human = np.array([r["set"] == "fresh" and r["side"] == "human" for r in rows])
    pa = fp_percentile(ma, ma[is_fresh_human])
    pb = fp_percentile(mb, mb[is_fresh_human])
    variants = {"cycle2": pa, "cycle3": pb, "max": np.maximum(pa, pb), "mean": (pa + pb) / 2}

    out = {}
    for name, s in variants.items():
        hum = s[is_fresh_human]
        v = {}
        for b in BUDGETS:
            h = np.sort(hum)
            k = min(int(np.ceil(len(h) * (1 - b))), len(h) - 1)
            thr = float(h[k])
            row = {"realised_fpr": round(float((hum > thr).mean()), 4)}
            groups = collections.defaultdict(list)
            for r, sv in zip(rows, s):
                if r["set"] == "hat-test":
                    groups["hat-" + r["band"]].append(sv > thr)
                elif r["set"] == "fresh":
                    groups["fresh-" + ("ai" if r["side"] == "ai" else "human")].append(sv > thr)
                elif r["set"] == "fresh-edited":
                    groups["fresh-edited-" + ("ai" if r["side"] == "ai" else "control")].append(sv > thr)
                elif r["set"] == "fresh-mixed":
                    groups["fresh-mixed"].append(sv > thr)
                elif r["set"] == "cycle2-test":
                    groups["c2-" + r["band"]].append(sv > thr)
            row["groups"] = {k2: [round(float(np.mean(v2)), 4), len(v2)]
                             for k2, v2 in sorted(groups.items())}
            v[f"{b:.4f}"] = row
        out[name] = v
    json.dump(out, open(os.path.join(C.HERE, "ensemble-report.json"), "w"), indent=1)
    for name in variants:
        r = out[name]["0.0122"]
        g = r["groups"]
        print(f"{name:8s} fpr={r['realised_fpr']:.4f} freshAI={g['fresh-ai'][0]:.3f} "
              f"v6={g['hat-v6'][0]:.3f} v7={g['hat-v7'][0]:.3f} v8={g['hat-v8'][0]:.3f} "
              f"v0fp={g['hat-v0'][0]:.4f} edited={g['fresh-edited-ai'][0]:.3f} "
              f"mixed={g['fresh-mixed'][0]:.3f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

"""Score every held-out evaluation set with a checkpoint and write the report JSON.

The operating point is always set by the realised false-positive rate on the 4,636
fresh human long-form documents, so cycle 2 and cycle 3 are compared like for like
regardless of their different temperatures.

usage: eval3.py <ckpt-dir> <out.json> [temperature]
"""
from __future__ import annotations

import collections
import json
import os
import sys

import numpy as np
from sklearn.metrics import roc_auc_score
from scipy.stats import spearmanr

import common3 as C

SETS = os.path.join(C.HERE, "evalsets.jsonl")
BUDGETS = (0.005, 0.0122, 0.02, 0.03, 0.05)


def bands(rows, scores, thr):
    d = collections.defaultdict(list)
    for r, s in zip(rows, scores):
        d[r["band"]].append(s > thr)
    return {k: [round(float(np.mean(v)), 4), len(v)] for k, v in sorted(d.items())}


def ratio_bands(rows, scores, thr):
    """Recall grouped by true AI word share — the product-meaningful axis."""
    edges = [(0.0, 0.001, "0% (human)"), (0.001, 0.2, "1-20% AI"), (0.2, 0.4, "20-40% AI"),
             (0.4, 0.6, "40-60% AI"), (0.6, 0.8, "60-80% AI"), (0.8, 0.95, "80-95% AI"),
             (0.95, 1.0001, "95-100% AI")]
    out = {}
    for lo, hi, name in edges:
        v = [s > thr for r, s in zip(rows, scores) if lo <= r["ai_ratio"] < hi]
        if v:
            out[name] = [round(float(np.mean(v)), 4), len(v)]
    return out


def main():
    ckpt = sys.argv[1]
    out_path = sys.argv[2]
    rows = list(C.jsonl(SETS))
    sc = C.Scorer(ckpt, temperature=1.0)
    m = sc.margins([r["text"] for r in rows], progress="eval")
    for r, v in zip(rows, m):
        r["_m"] = float(v)
    bysets = collections.defaultdict(list)
    for r in rows:
        bysets[r["set"]].append(r)

    fresh = bysets["fresh"]
    hum_fresh = np.array([r["_m"] for r in fresh if r["side"] == "human"])
    rep = {"ckpt": ckpt, "n_fresh_human": int(len(hum_fresh)),
           "set_sizes": {k: len(v) for k, v in bysets.items()}}

    y = np.array([1 if r["side"] == "ai" else 0 for r in fresh])
    rep["fresh_longform_auroc"] = round(float(roc_auc_score(y, [r["_m"] for r in fresh])), 4)
    hat = bysets["hat-test"]
    rep["hat_spearman_margin_vs_ai_ratio"] = round(
        float(spearmanr([r["_m"] for r in hat], [r["ai_ratio"] for r in hat]).statistic), 4)

    curve = {}
    for b in BUDGETS:
        h = np.sort(hum_fresh)
        k = min(int(np.ceil(len(h) * (1 - b))), len(h) - 1)
        thr = float(h[k])
        row = {"threshold_margin": round(thr, 4),
               "realised_fpr_fresh_human": round(float((hum_fresh > thr).mean()), 4)}
        for name, rs in bysets.items():
            ai = [r for r in rs if r["side"] == "ai"]
            hu = [r for r in rs if r["side"] == "human"]
            if ai:
                row[f"{name}_recall"] = [round(float(np.mean([r['_m'] > thr for r in ai])), 4), len(ai)]
            if hu:
                row[f"{name}_fpr"] = [round(float(np.mean([r['_m'] > thr for r in hu])), 4), len(hu)]
            row[f"{name}_bands"] = bands(rs, [r["_m"] for r in rs], thr)
        allrows = [r for r in rows if r["set"] in ("hat-test", "fresh", "fresh-edited", "fresh-mixed")]
        row["by_true_ai_share"] = ratio_bands(allrows, [r["_m"] for r in allrows], thr)
        # per-register on fresh long-form
        row["fresh_register_recall"] = bands(
            [dict(r, band=r["register"]) for r in fresh if r["side"] == "ai"],
            [r["_m"] for r in fresh if r["side"] == "ai"], thr)
        row["fresh_register_fpr"] = bands(
            [dict(r, band=r["register"]) for r in fresh if r["side"] == "human"],
            [r["_m"] for r in fresh if r["side"] == "human"], thr)
        curve[f"{b:.4f}"] = row
    rep["curve"] = curve

    # median predicted share per band, uncalibrated (T=1) probability
    p = 1 / (1 + np.exp(-np.array([r["_m"] for r in rows])))
    med = collections.defaultdict(list)
    for r, pv in zip(rows, p):
        med[(r["set"], r["band"])].append(pv)
    rep["median_p_by_band"] = {f"{a}|{b}": [round(float(np.median(v)), 3), len(v)]
                               for (a, b), v in sorted(med.items())}
    pf = np.array([r["_m"] for r in fresh])
    pf = 1 / (1 + np.exp(-pf))
    rep["spread_fresh"] = {
        "ai_p10_p50_p90": [round(float(np.percentile(pf[y == 1], q)), 3) for q in (10, 50, 90)],
        "human_p10_p50_p90": [round(float(np.percentile(pf[y == 0], q)), 3) for q in (10, 50, 90)],
        "sd": round(float(np.std(pf)), 3),
        "frac_0.80_0.90": round(float(np.mean((pf >= .8) & (pf <= .9))), 4)}
    json.dump(rep, open(os.path.join(C.HERE, out_path), "w"), indent=1)
    with open(os.path.join(C.HERE, out_path.replace(".json", "-margins.json")), "w") as fh:
        json.dump({r["set"] + "|" + r["id"]: r["_m"] for r in rows}, fh)
    print("wrote", out_path)


if __name__ == "__main__":
    main()

"""Report the operating curve, per-edit-band recall and spread for a scores file.

Operating point is defined by realised false-positive rate on the FRESH human
long-form set (4,636 docs the cycle-2 model never saw), so two models with
different temperatures are compared at like for like.
"""
from __future__ import annotations

import collections
import json
import os
import sys

import numpy as np
from sklearn.metrics import roc_auc_score

import common3 as C
import score_sets as S

FP_BUDGETS = (0.005, 0.0122, 0.02, 0.03, 0.05)


def load(path):
    d = json.load(open(os.path.join(C.HERE, path)))
    return d["margins"], d["temperature"]


def thr_for_fpr(hum_margins, budget):
    h = np.sort(np.asarray(hum_margins))
    k = min(int(np.ceil(len(h) * (1 - budget))), len(h) - 1)
    return float(h[k])


def report(path, label):
    marg, T = load(path)
    test = S.cycle2_test()
    lf = S.longform()
    mt = marg["cycle2-test"]
    ml = marg["longform-fresh"]

    hum_fresh = np.array([ml[r["id"]] for r in lf if r["side"] == "human"])
    ai_fresh = [r for r in lf if r["side"] == "ai"]
    out = {"label": label, "temperature": T,
           "n_fresh_human": len(hum_fresh), "n_fresh_ai": len(ai_fresh)}

    y = np.array([1 if r["side"] == "ai" else 0 for r in lf])
    s = np.array([ml[r["id"]] for r in lf])
    out["fresh_longform_auroc"] = round(float(roc_auc_score(y, s)), 4)

    ytest = np.array([1 if r["side"] == "ai" else 0 for r in test])
    stest = np.array([mt[r["id"]] for r in test])
    out["cycle2_test_auroc"] = round(float(roc_auc_score(ytest, stest)), 4)

    curve = {}
    for b in FP_BUDGETS:
        thr = thr_for_fpr(hum_fresh, b)
        row = {"threshold_margin": round(thr, 4),
               "prob_at_T": round(float(1 / (1 + np.exp(-thr / T))), 4),
               "realised_fpr_fresh_human": round(float((hum_fresh > thr).mean()), 4),
               "fresh_ai_recall": round(float(np.mean([ml[r["id"]] > thr for r in ai_fresh])), 4)}
        # per-edit-band recall on the cycle-2 test split
        bands = collections.defaultdict(list)
        for r in test:
            if r["side"] == "ai" and r.get("edit_level"):
                bands[r["edit_level"]].append(mt[r["id"]] > thr)
        row["edit_bands"] = {k: [round(float(np.mean(v)), 4), len(v)]
                             for k, v in sorted(bands.items())}
        # per-register recall on fresh AI
        regs = collections.defaultdict(list)
        for r in ai_fresh:
            regs[r["register"]].append(ml[r["id"]] > thr)
        row["fresh_registers"] = {k: [round(float(np.mean(v)), 4), len(v)]
                                  for k, v in sorted(regs.items())}
        # human FP by register
        hfp = collections.defaultdict(list)
        for r in lf:
            if r["side"] == "human":
                hfp[r["register"]].append(ml[r["id"]] > thr)
        row["fresh_human_fp_by_register"] = {k: [round(float(np.mean(v)), 4), len(v)]
                                             for k, v in sorted(hfp.items())}
        curve[f"{b:.4f}"] = row
    out["curve"] = curve

    p_ai = 1 / (1 + np.exp(-np.array([ml[r["id"]] for r in ai_fresh]) / T))
    p_hu = 1 / (1 + np.exp(-hum_fresh / T))
    out["spread"] = {
        "ai_p10_p50_p90": [round(float(np.percentile(p_ai, q)), 3) for q in (10, 50, 90)],
        "human_p10_p50_p90": [round(float(np.percentile(p_hu, q)), 3) for q in (10, 50, 90)],
        "sd_all": round(float(np.std(np.concatenate([p_ai, p_hu]))), 3),
        "frac_0.80_0.90": round(float(np.mean((np.concatenate([p_ai, p_hu]) >= .8) &
                                              (np.concatenate([p_ai, p_hu]) <= .9))), 3),
    }
    # median probability per edit band (the "0.304" style figure)
    bandp = collections.defaultdict(list)
    for r in test:
        if r["side"] == "ai" and r.get("edit_level"):
            bandp[r["edit_level"]].append(1 / (1 + np.exp(-mt[r["id"]] / T)))
    out["edit_band_median_prob"] = {k: [round(float(np.median(v)), 3), len(v)]
                                    for k, v in sorted(bandp.items())}
    return out


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "scores-cycle2-baseline.json"
    label = sys.argv[2] if len(sys.argv) > 2 else "cycle-2"
    print(json.dumps(report(path, label), indent=1))

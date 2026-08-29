"""Workstream REAL - the zero-false-positive ceiling on stripped prose.

The programme's binding constraint is human FPR, so the question is not
"what AUROC can we get" but "how much AI can we catch before we accuse a
single human". This script answers that HONESTLY, which means:

  * Nested 5-fold cross-validation, stratified by side and (for AI) by
    provider x era. The combiner is fitted on the training folds ONLY and the
    operating threshold is chosen on the training folds' humans ONLY. TPR and
    FP are then read off the untouched test fold. Repeated over 20 shuffles.
  * The alternative - fit and threshold on all 169 humans - is also reported,
    labelled in-sample, because that is the number a careless run produces and
    the gap between the two is the overfitting the plan warns about
    (CLEAN-PROSE-DETECTION-PLAN sec 2.3: an apparent 23/23 that collapsed to
    2/4 human FPs under leave-one-out).
  * Three feature sets, so the contribution of each tier is separable and the
    register-confounded structure features cannot hide inside a headline.

Every number printed is on STRIPPED text.
"""

from __future__ import annotations

import json
import math
import os
import random
import statistics as st
from collections import defaultdict

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
PE = os.path.join(HERE, "..", "provider-eval")
random.seed(20260828)
np.random.seed(20260828)


def load(p):
    return {json.loads(ln)["id"]: json.loads(ln) for ln in open(p) if ln.strip()}


import sys

VARIANT = sys.argv[1] if len(sys.argv) > 1 else "stripped"
rules = load(os.path.join(HERE, f"rules-{VARIANT}.jsonl"))
t3 = load(os.path.join(HERE, f"tier3-{VARIANT}.jsonl"))
t2 = load(os.path.join(HERE, f"tier2-{VARIANT}.jsonl"))

T2F = [k for k in (t2[next(iter(t2))].get("feats") or {})]
V4 = ["registerFuncL1", "registerLongWordDelta", "punchlineRate", "contrastPer1000",
      "ratioAbstractShare", "spectralFlatness", "compressionGain"]
STY = ["emDashPer1000", "sentMean", "sentSd", "sentCv", "shortSentShare",
       "fragmentShare", "paraMean", "paraCv", "paraCount", "linesPerPara"]
# Block-structure features. These are REGISTER artefacts of this corpus: the
# human side is long-form encyclopaedic/QA prose, the AI side is chat answers,
# so "many short blocks" separates the two corpora without being an AI signal.
# Excluded from set E to expose how much of set C's headline they carry.
STRUCTURE = {"paraMean", "paraCv", "paraCount", "linesPerPara"}
STY_NOSTRUCT = [k for k in STY if k not in STRUCTURE]

SETS = {
    # A: the shipped classifier alone
    "A tier3 only": lambda i: [t3[i]["tier3_int8pc"]],
    # B: model tiers only - classifier + the 22 surprisal features
    "B tier3 + tier2 surprisal": lambda i: [t3[i]["tier3_int8pc"]] + _t2(i),
    # C: everything, incl. register-confounded structure - upper bound only
    "C all signals": lambda i: [t3[i]["tier3_int8pc"]] + _t2(i) + _v4(i) + _sty(i)
    + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
    # D: no-model baseline - what survives stripping without any download
    "D rules + stylometry only": lambda i: _v4(i) + _sty(i)
    + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
    # E: set C with the register-confounded block-structure features removed
    "E all minus block structure": lambda i: [t3[i]["tier3_int8pc"]] + _t2(i) + _v4(i)
    + _sty(i, no_struct=True)
    + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
}


def _t2(i):
    f = t2[i].get("feats")
    return [f[k] for k in T2F] if f else [0.0] * len(T2F)


def _v4(i):
    v = rules[i]["v4"] or {}
    return [float(v.get(k) or 0.0) for k in V4]


def _sty(i, no_struct=False):
    s = rules[i]["stylo"]
    keys = STY_NOSTRUCT if no_struct else STY
    return [float(s.get(k) or 0.0) for k in keys]


IDS = list(rules)
SIDE = {i: rules[i]["side"] for i in IDS}
SLICE = {i: f"{rules[i]['provider']} {rules[i]['era']}" if SIDE[i] == "ai"
         else (t3[i].get("genre") or "human") for i in IDS}
AI = [i for i in IDS if SIDE[i] == "ai"]
HU = [i for i in IDS if SIDE[i] == "human"]
BIZ = [i for i in HU if t3[i].get("genre") == "business-marketing"]


def stratified_folds(ids, k, rng):
    """k folds, balanced within each slice so every fold sees every provider."""
    groups = defaultdict(list)
    for i in ids:
        groups[SLICE[i]].append(i)
    folds = [[] for _ in range(k)]
    for g in groups.values():
        g = list(g)
        rng.shuffle(g)
        for n, i in enumerate(g):
            folds[n % k].append(i)
    return folds


def zero_fp_threshold(scores_h):
    """Smallest threshold that flags none of these humans."""
    return max(scores_h) if scores_h else 0.0


def run(name, feat, k=5, repeats=20):
    X = {i: feat(i) for i in IDS}
    dim = len(X[IDS[0]])
    cv_tpr, cv_fp, cv_fpr, cv_bizfp, cv_auroc = [], [], [], [], []
    genre_n, genre_fp = defaultdict(int), defaultdict(int)
    rng = random.Random(20260828)
    for _ in range(repeats):
        fa = stratified_folds(AI, k, rng)
        fh = stratified_folds(HU, k, rng)
        for f in range(k):
            te = set(fa[f]) | set(fh[f])
            tr = [i for i in IDS if i not in te]
            Xtr = np.array([X[i] for i in tr])
            ytr = np.array([1 if SIDE[i] == "ai" else 0 for i in tr])
            sc = StandardScaler().fit(Xtr)
            clf = LogisticRegression(max_iter=2000, C=1.0)
            clf.fit(sc.transform(Xtr), ytr)
            # threshold from TRAINING humans only
            htr = [i for i in tr if SIDE[i] == "human"]
            str_ = clf.predict_proba(sc.transform(np.array([X[i] for i in htr])))[:, 1]
            thr = zero_fp_threshold(list(str_))
            ai_te = [i for i in fa[f]]
            hu_te = [i for i in fh[f]]
            sa = clf.predict_proba(sc.transform(np.array([X[i] for i in ai_te])))[:, 1]
            sh = clf.predict_proba(sc.transform(np.array([X[i] for i in hu_te])))[:, 1]
            cv_tpr.append(float((sa > thr).mean()))
            cv_fp.append(int((sh > thr).sum()))
            cv_fpr.append(float((sh > thr).mean()))
            bz = [i for i in hu_te if i in set(BIZ)]
            if bz:
                sb = clf.predict_proba(sc.transform(np.array([X[i] for i in bz])))[:, 1]
                cv_bizfp.append(int((sb > thr).sum()))
            for i, s_ in zip(hu_te, sh):
                g = t3[i].get("genre") or "unknown"
                genre_n[g] += 1
                genre_fp[g] += int(s_ > thr)
            cv_auroc.append(_auroc(list(sa), list(sh)))

    # in-sample (the careless number)
    Xa = np.array([X[i] for i in IDS])
    ya = np.array([1 if SIDE[i] == "ai" else 0 for i in IDS])
    sc = StandardScaler().fit(Xa)
    clf = LogisticRegression(max_iter=2000, C=1.0).fit(sc.transform(Xa), ya)
    p = clf.predict_proba(sc.transform(Xa))[:, 1]
    pi = dict(zip(IDS, p))
    thr_in = max(pi[i] for i in HU)
    tpr_in = sum(1 for i in AI if pi[i] > thr_in) / len(AI)

    n = len(cv_tpr)
    mean_tpr = st.mean(cv_tpr)
    sd_tpr = st.stdev(cv_tpr) if n > 1 else 0.0
    ci = 1.96 * sd_tpr / math.sqrt(n)
    return {
        "features": name, "dim": dim,
        "cv_tpr_at_train_zero_fp": 100 * mean_tpr,
        "cv_tpr_ci95": 100 * ci,
        "cv_tpr_fold_sd": 100 * sd_tpr,
        "cv_holdout_fpr": 100 * st.mean(cv_fpr),
        "cv_holdout_fp_per_fold": st.mean(cv_fp),
        "cv_biz_fp_per_fold": st.mean(cv_bizfp) if cv_bizfp else None,
        "cv_auroc": st.mean(cv_auroc),
        "in_sample_tpr_at_zero_fp": 100 * tpr_in,
        "optimism_gap_pts": 100 * (tpr_in - mean_tpr),
        "holdout_fpr_by_human_genre": {g: round(100 * genre_fp[g] / genre_n[g], 2)
                                       for g in sorted(genre_n)},
        "holdout_n_by_human_genre": dict(sorted(genre_n.items())),
    }


def _auroc(pos, neg):
    allv = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    vals = [v for v, _ in allv]
    n1, n0 = len(pos), len(neg)
    s = 0.0
    i = 0
    while i < len(allv):
        j = i
        while j < len(allv) and vals[j] == vals[i]:
            j += 1
        avg = (i + 1 + j) / 2
        for kk in range(i, j):
            if allv[kk][1] == 1:
                s += avg
        i = j
    return (s - n1 * (n1 + 1) / 2) / (n1 * n0)


results = [run(n, f) for n, f in SETS.items()]
json.dump(results, open(os.path.join(HERE, "ceiling.json"), "w"), indent=1)

print("ZERO-FP CEILING ON STRIPPED PROSE (5-fold x 20 repeats, threshold from training humans)")
print(f"{'feature set':<28}{'dim':>5}{'CV AUROC':>10}{'CV TPR@0FP':>13}{'+/-95%':>9}"
      f"{'holdout FPR':>13}{'in-sample':>11}{'optimism':>10}")
for r in results:
    print(f"{r['features']:<28}{r['dim']:>5}{r['cv_auroc']:>10.4f}"
          f"{r['cv_tpr_at_train_zero_fp']:>12.1f}%{r['cv_tpr_ci95']:>8.1f}"
          f"{r['cv_holdout_fpr']:>12.2f}%{r['in_sample_tpr_at_zero_fp']:>10.1f}%"
          f"{r['optimism_gap_pts']:>9.1f}")
print("\nholdout FPR is the price actually paid on unseen humans for a threshold")
print("that was zero-FP on the humans it was chosen from - the plan's LOOCV trap,")
print("measured. With n=169 humans a measured 0/169 bounds true FPR at 1.8% (95%).")

"""Workstream REAL - two questions the 9% FP budget raises.

Q1  Where do the false positives land? A global FP budget is only meaningful
    if the errors are spread across genres. This computes, for Tier 3 on
    stripped prose, the trade-off between overall FPR and the FPR borne by
    the business-marketing humans specifically (the owner's audience) and by
    the non-native writers (the fairness risk).

Q2  Under a 3/5/9% budget rather than zero-FP, does the Tier 2 surprisal
    engine earn its 194 MB? Cross-validated combiner, threshold chosen on the
    training folds at the target budget, TPR and realised FPR read off the
    untouched test fold.
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
random.seed(20260828)
np.random.seed(20260828)


def load(p):
    return {json.loads(ln)["id"]: json.loads(ln) for ln in open(p) if ln.strip()}


rules = load(os.path.join(HERE, "rules-stripped.jsonl"))
t3 = load(os.path.join(HERE, "tier3-stripped.jsonl"))
t2 = load(os.path.join(HERE, "tier2-stripped.jsonl"))

IDS = list(rules)
SIDE = {i: rules[i]["side"] for i in IDS}
GENRE = {i: (t3[i].get("genre") or "unknown") for i in IDS}
SLICE = {i: f"{rules[i]['provider']} {rules[i]['era']}" if SIDE[i] == "ai" else GENRE[i]
         for i in IDS}
AI = [i for i in IDS if SIDE[i] == "ai"]
HU = [i for i in IDS if SIDE[i] == "human"]
BIZ = [i for i in HU if GENRE[i] == "business-marketing"]
NN = [i for i in HU if GENRE[i] == "non-native"]
OUT = {}

# ---------------------------------------------------------------- Q1
print("=" * 92)
print("Q1  TIER 3 ON STRIPPED PROSE - where the false positives land")
print("    Threshold swept over every distinct human score; the cost is shown per genre.")
p = {i: t3[i]["tier3_int8pc"] for i in IDS}
hs = sorted({p[i] for i in HU}, reverse=True)
rows = []
for thr in hs:
    fp = [i for i in HU if p[i] > thr]
    rows.append({
        "threshold": thr,
        "tpr": 100 * sum(1 for i in AI if p[i] > thr) / len(AI),
        "fp": len(fp), "fpr": 100 * len(fp) / len(HU),
        "biz_fp": sum(1 for i in BIZ if p[i] > thr),
        "biz_fpr": 100 * sum(1 for i in BIZ if p[i] > thr) / len(BIZ),
        "nn_fp": sum(1 for i in NN if p[i] > thr),
        "other_fp": len(fp) - sum(1 for i in BIZ if p[i] > thr),
        "biz_share_of_fp": 100 * sum(1 for i in BIZ if p[i] > thr) / len(fp) if fp else 0.0,
    })
OUT["tier3_threshold_sweep"] = rows
print(f"{'thr':>9}{'TPR':>8}{'FP':>5}{'FPR':>7}{'bizFP':>7}{'bizFPR':>8}"
      f"{'nonnatFP':>10}{'otherFP':>9}{'biz share of all FP':>21}")
for r in rows[:22]:
    print(f"{r['threshold']:>9.4f}{r['tpr']:>7.1f}%{r['fp']:>5}{r['fpr']:>6.1f}%"
          f"{r['biz_fp']:>7}{r['biz_fpr']:>7.0f}%{r['nn_fp']:>10}{r['other_fp']:>9}"
          f"{r['biz_share_of_fp']:>20.0f}%")

print("\n  Detection available if business-marketing FPR is itself capped:")
for cap in (0, 1, 2, 3, 4, 5):
    ok = [r for r in rows if r["biz_fp"] <= cap]
    best = max(ok, key=lambda r: r["tpr"]) if ok else None
    if best:
        print(f"    biz FP <= {cap}/10 ({10*cap:3d}%): best TPR {best['tpr']:5.1f}%  "
              f"at thr {best['threshold']:.4f}, overall FPR {best['fpr']:.1f}% "
              f"({best['fp']}/169)")

# ---------------------------------------------------------------- Q2
T2F = list(t2[next(iter(t2))].get("feats") or {})
V4 = ["registerFuncL1", "registerLongWordDelta", "punchlineRate", "contrastPer1000",
      "ratioAbstractShare", "spectralFlatness", "compressionGain"]
STY = ["emDashPer1000", "sentMean", "sentSd", "sentCv", "shortSentShare", "fragmentShare"]


def _t2(i):
    f = t2[i].get("feats")
    return [f[k] for k in T2F] if f else [0.0] * len(T2F)


def _v4(i):
    v = rules[i]["v4"] or {}
    return [float(v.get(k) or 0.0) for k in V4]


def _sty(i):
    s = rules[i]["stylo"]
    return [float(s.get(k) or 0.0) for k in STY]


SETS = {
    "A tier3 only (34 MB)": lambda i: [t3[i]["tier3_int8pc"]],
    "B tier3 + tier2 (228 MB)": lambda i: [t3[i]["tier3_int8pc"]] + _t2(i),
    "C tier3 + rules/stylo (34 MB)": lambda i: [t3[i]["tier3_int8pc"]] + _v4(i) + _sty(i)
    + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
    "D all three tiers (228 MB)": lambda i: [t3[i]["tier3_int8pc"]] + _t2(i) + _v4(i)
    + _sty(i) + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
    "E rules/stylo only (0 MB)": lambda i: _v4(i) + _sty(i)
    + [rules[i]["rules"]["score"], rules[i]["rules"]["findingCount"]],
    "F tier2 only (194 MB)": lambda i: _t2(i),
}


def folds(ids, k, rng):
    g = defaultdict(list)
    for i in ids:
        g[SLICE[i]].append(i)
    out = [[] for _ in range(k)]
    for v in g.values():
        v = list(v)
        rng.shuffle(v)
        for n, i in enumerate(v):
            out[n % k].append(i)
    return out


def thr_for_budget(scores, budget):
    n = len(scores)
    allowed = int(math.floor(budget * n))
    s = sorted(scores, reverse=True)
    return s[allowed] if allowed < n else -math.inf


def cv(feat, budget, k=5, repeats=10):
    X = {i: feat(i) for i in IDS}
    rng = random.Random(20260828)
    tprs, fprs, bizfprs = [], [], []
    for _ in range(repeats):
        fa, fh = folds(AI, k, rng), folds(HU, k, rng)
        for f in range(k):
            te = set(fa[f]) | set(fh[f])
            tr = [i for i in IDS if i not in te]
            Xtr = np.array([X[i] for i in tr])
            ytr = np.array([1 if SIDE[i] == "ai" else 0 for i in tr])
            sc = StandardScaler().fit(Xtr)
            clf = LogisticRegression(max_iter=3000).fit(sc.transform(Xtr), ytr)
            htr = [i for i in tr if SIDE[i] == "human"]
            thr = thr_for_budget(
                list(clf.predict_proba(sc.transform(np.array([X[i] for i in htr])))[:, 1]), budget)
            sa = clf.predict_proba(sc.transform(np.array([X[i] for i in fa[f]])))[:, 1]
            sh = clf.predict_proba(sc.transform(np.array([X[i] for i in fh[f]])))[:, 1]
            tprs.append(100 * float((sa > thr).mean()))
            fprs.append(100 * float((sh > thr).mean()))
            bz = [j for j, i in enumerate(fh[f]) if i in set(BIZ)]
            if bz:
                bizfprs.append(100 * float((sh[bz] > thr).mean()))
    return (st.mean(tprs), 1.96 * st.stdev(tprs) / math.sqrt(len(tprs)),
            st.mean(fprs), st.mean(bizfprs) if bizfprs else float("nan"))


print("\n" + "=" * 92)
print("Q2  DOES TIER 2 EARN ITS 194 MB UNDER A REAL FP BUDGET?")
print("    5-fold x 10 repeats, threshold chosen on training humans at the target budget.")
print(f"{'feature set':<32}{'budget':>8}{'CV TPR':>11}{'+/-95%':>8}"
      f"{'realised FPR':>14}{'biz FPR':>10}")
q2 = {}
for name, f in SETS.items():
    q2[name] = []
    for b in (0.03, 0.05, 0.09):
        t, c, fp, bz = cv(f, b)
        q2[name].append({"budget_pct": 100 * b, "cv_tpr": t, "ci95": c,
                         "realised_fpr": fp, "biz_fpr": bz})
        print(f"{name:<32}{100*b:>7.0f}%{t:>10.1f}%{c:>8.1f}{fp:>13.1f}%{bz:>9.1f}%")
    print()
OUT["tier2_value_under_budget"] = q2

json.dump(OUT, open(os.path.join(HERE, "budget-analysis.json"), "w"), indent=1)
print("wrote budget-analysis.json")

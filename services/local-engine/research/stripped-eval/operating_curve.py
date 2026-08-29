"""Workstream REAL - the full operating curve on STRIPPED published prose.

The owner has lifted the zero-FP rule: up to ~9% false positives on verified
human text is acceptable provided detection is genuinely strong and the rate
is measured on a varied, realistic human corpus.

This script therefore reports, for FP budgets of 1/2/3/5/7/9% on the 169
held-out humans:
  * detection rate overall and per provider x era,
  * the realised human FP count and its breakdown BY GENRE,
for every tier, on stripped text (raw shown for contrast).

Two numbers are given for every budget, and the difference matters:
  in-sample   threshold picked on all 169 humans, FPR read off the same 169.
              This is what a naive calibration reports and it is optimistic.
  held-out    threshold picked on a random half of the humans, TPR and the
              REALISED FPR measured on the other half, averaged over 400
              splits with a 95% CI. This is the number that will survive
              contact with real users.

n=169 humans means a 9% budget is ~15 documents; business-marketing is only
10 documents, so a per-genre FPR there carries a very wide interval. Wilson
95% intervals are printed for every genre rate.
"""

from __future__ import annotations

import json
import math
import os
import random
import statistics as st
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
random.seed(20260828)

BUDGETS = [0.01, 0.02, 0.03, 0.05, 0.07, 0.09]


def load(p):
    return {json.loads(ln)["id"]: json.loads(ln) for ln in open(p) if ln.strip()}


rules_s = load(os.path.join(HERE, "rules-stripped.jsonl"))
rules_r = load(os.path.join(HERE, "rules-raw.jsonl"))
t3_s = load(os.path.join(HERE, "tier3-stripped.jsonl"))
t3_r = load(os.path.join(HERE, "tier3-raw.jsonl"))
t2_s = load(os.path.join(HERE, "tier2-stripped.jsonl"))
t2_r = load(os.path.join(os.path.join(HERE, ".."), "provider-eval", "tier2-scores.jsonl"))

IDS = list(rules_s)
SIDE = {i: rules_s[i]["side"] for i in IDS}
PROV = {i: rules_s[i]["provider"] for i in IDS}
ERA = {i: rules_s[i]["era"] for i in IDS}
GENRE = {i: (t3_s[i].get("genre") or "unknown") for i in IDS}
AI = [i for i in IDS if SIDE[i] == "ai"]
HU = [i for i in IDS if SIDE[i] == "human"]
SLICES = sorted({(PROV[i], ERA[i]) for i in AI})

SCORERS = {
    "rules score (stripped)": lambda i: rules_s[i]["rules"]["score"],
    "rules score (raw)": lambda i: rules_r[i]["rules"]["score"],
    "tier2 p (stripped)": lambda i: t2_s[i]["p"],
    "tier2 p (raw)": lambda i: t2_r[i]["p"],
    "tier3 p (stripped)": lambda i: t3_s[i]["tier3_int8pc"],
    "tier3 p (raw)": lambda i: t3_r[i]["tier3_int8pc"],
}


def wilson(k, n, z=1.96):
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def threshold_for_budget(hscores, budget):
    """Lowest threshold whose FP count on `hscores` is <= floor(budget*n).

    Ties are handled by scanning actual observed scores, so the realised FP
    count never exceeds the budget even when scores are saturated/degenerate.
    """
    n = len(hscores)
    allowed = int(math.floor(budget * n))
    s = sorted(hscores, reverse=True)
    # threshold must exceed the (allowed+1)-th highest human score
    if allowed >= n:
        return -math.inf
    return s[allowed]


def evaluate(scorer, budget):
    h = [scorer(i) for i in HU]
    thr = threshold_for_budget(h, budget)
    fp_ids = [i for i in HU if scorer(i) > thr]
    tpr = 100 * sum(1 for i in AI if scorer(i) > thr) / len(AI)
    per_slice = {}
    for prov, era in SLICES:
        ids = [i for i in AI if PROV[i] == prov and ERA[i] == era]
        per_slice[f"{prov} {era}"] = 100 * sum(1 for i in ids if scorer(i) > thr) / len(ids)
    gfp = defaultdict(int)
    gn = defaultdict(int)
    for i in HU:
        gn[GENRE[i]] += 1
        if scorer(i) > thr:
            gfp[GENRE[i]] += 1
    return {
        "budget_pct": 100 * budget, "threshold": thr,
        "realised_fp": len(fp_ids), "realised_fpr": 100 * len(fp_ids) / len(HU),
        "tpr": tpr, "per_slice": per_slice,
        "fp_by_genre": {g: {"fp": gfp[g], "n": gn[g], "pct": 100 * gfp[g] / gn[g],
                            "wilson95": wilson(gfp[g], gn[g])} for g in sorted(gn)},
        "fp_ids": fp_ids,
    }


def held_out(scorer, budget, iters=400):
    """Threshold on half the humans, realised TPR/FPR on the other half."""
    hs = [(i, scorer(i)) for i in HU]
    tprs, fprs = [], []
    ai_scores = [scorer(i) for i in AI]
    idx = list(range(len(hs)))
    for _ in range(iters):
        random.shuffle(idx)
        half = len(idx) // 2
        sel = [hs[i][1] for i in idx[:half]]
        hold = [hs[i][1] for i in idx[half:]]
        thr = threshold_for_budget(sel, budget)
        tprs.append(100 * sum(1 for v in ai_scores if v > thr) / len(ai_scores))
        fprs.append(100 * sum(1 for v in hold if v > thr) / len(hold))
    m_t, m_f = st.mean(tprs), st.mean(fprs)
    ci_t = 1.96 * st.stdev(tprs) / math.sqrt(iters)
    ci_f = 1.96 * st.stdev(fprs) / math.sqrt(iters)
    return m_t, ci_t, m_f, ci_f


OUT = {}
for name, sc in SCORERS.items():
    OUT[name] = []
    for b in BUDGETS:
        r = evaluate(sc, b)
        ht, hct, hf, hcf = held_out(sc, b)
        r["heldout_tpr"] = ht
        r["heldout_tpr_ci95"] = hct
        r["heldout_fpr"] = hf
        r["heldout_fpr_ci95"] = hcf
        OUT[name].append(r)

json.dump(OUT, open(os.path.join(HERE, "operating-curve.json"), "w"), indent=1)

print("=" * 96)
print("OPERATING CURVE - FP budget vs detection, 1,727 AI / 169 humans")
print(f"{'scorer':<24}{'budget':>8}{'thr':>10}{'FP':>5}{'FPR':>7}{'TPR':>8}"
      f"{'held-out TPR':>16}{'held-out FPR':>16}")
for name, rows in OUT.items():
    for r in rows:
        print(f"{name:<24}{r['budget_pct']:>7.0f}%{r['threshold']:>10.4f}{r['realised_fp']:>5}"
              f"{r['realised_fpr']:>6.1f}%{r['tpr']:>7.1f}%"
              f"{r['heldout_tpr']:>11.1f}+-{r['heldout_tpr_ci95']:<4.1f}"
              f"{r['heldout_fpr']:>11.1f}+-{r['heldout_fpr_ci95']:<4.1f}")
    print()

print("=" * 96)
print("PER PROVIDER x ERA at each budget - TIER 3 ON STRIPPED PROSE (the shippable tier)")
rows = OUT["tier3 p (stripped)"]
hdr = f"{'slice':<22}" + "".join(f"{int(r['budget_pct'])}%".rjust(8) for r in rows)
print(hdr)
for s in rows[0]["per_slice"]:
    print(f"{s:<22}" + "".join(f"{r['per_slice'][s]:7.1f}%" for r in rows))

print("\n" + "=" * 96)
print("HUMAN FP BY GENRE - TIER 3 ON STRIPPED PROSE")
genres = list(rows[0]["fp_by_genre"])
print(f"{'genre':<22}{'n':>4}" + "".join(f"{int(r['budget_pct'])}%".rjust(9) for r in rows))
for g in genres:
    n = rows[0]["fp_by_genre"][g]["n"]
    print(f"{g:<22}{n:>4}" + "".join(f"{r['fp_by_genre'][g]['fp']:>4}/{n:<4}" for r in rows))
print("\n  (as a rate, with Wilson 95% CI, at the 9% budget)")
last = rows[-1]
for g in genres:
    d = last["fp_by_genre"][g]
    print(f"    {g:<22} {d['fp']}/{d['n']} = {d['pct']:5.1f}%  "
          f"[{d['wilson95'][0]:.1f}, {d['wilson95'][1]:.1f}]")
print("\nwrote operating-curve.json")

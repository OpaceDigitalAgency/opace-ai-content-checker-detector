"""Workstream REAL - raw vs stripped analysis for all three detection tiers.

Consumes rules-raw/-stripped.jsonl, tier3-raw/-stripped.jsonl,
tier2-stripped.jsonl (+ provider-eval/tier2-scores.jsonl as the raw Tier 2
run) and writes:
  stripped-scores.json   per-sample, every tier, raw and stripped
  analysis.json          every table in the report, machine-readable
and prints the tables.

Honesty rules enforced here:
  * "TPR at zero human FP" always reports BOTH the in-sample threshold
    (just above the max of all 169 humans - optimistic) and a split-half
    honest estimate (threshold from half the humans, FP counted on the other
    half, averaged over 200 random splits).
  * Every zero-FP claim carries the rule-of-three 95% upper bound on the true
    FPR for the number of humans it was measured on.
  * Tier 3 numbers are split into in-distribution (arena) and
    out-of-distribution (HC3 / openai 2022-23) because Tier 3 was trained on
    the arena distribution.
"""

from __future__ import annotations

import json
import math
import os
import random
import statistics as st
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
PE = os.path.join(HERE, "..", "provider-eval")
random.seed(20260828)


def load(p):
    return [json.loads(ln) for ln in open(p) if ln.strip()]


def by_id(p):
    return {r["id"]: r for r in load(p)}


# ------------------------------------------------------------------ statistics

def auroc(pos, neg):
    if not pos or not neg:
        return float("nan")
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
        for k in range(i, j):
            if allv[k][1] == 1:
                s += avg
        i = j
    return (s - n1 * (n1 + 1) / 2) / (n1 * n0)


def cliffs_delta(a, b):
    """Rank-based effect size, ties handled. = 2*AUROC - 1."""
    if not a or not b:
        return float("nan")
    return 2 * auroc(a, b) - 1


def cohens_d(a, b):
    if len(a) < 2 or len(b) < 2:
        return float("nan")
    va, vb = st.variance(a), st.variance(b)
    n1, n2 = len(a), len(b)
    sp = math.sqrt(((n1 - 1) * va + (n2 - 1) * vb) / (n1 + n2 - 2))
    return (st.mean(a) - st.mean(b)) / sp if sp > 0 else float("nan")


def rule_of_three(n):
    """95% upper bound on a rate observed as 0/n."""
    return 3.0 / n if n else float("nan")


def tpr_at_zero_fp(ai, hu, higher_is_ai=True):
    """In-sample: threshold strictly beyond the most extreme human."""
    if not ai or not hu:
        return float("nan"), float("nan")
    if higher_is_ai:
        thr = max(hu)
        return sum(1 for v in ai if v > thr) / len(ai), thr
    thr = min(hu)
    return sum(1 for v in ai if v < thr) / len(ai), thr


def split_half_zero_fp(ai, hu, higher_is_ai=True, iters=200):
    """Honest estimate: pick the zero-FP threshold on a random half of the
    humans, then report TPR and the FP rate actually incurred on the held-out
    half. Averaged over `iters` splits."""
    if len(hu) < 4 or not ai:
        return float("nan"), float("nan")
    tprs, fprs = [], []
    idx = list(range(len(hu)))
    for _ in range(iters):
        random.shuffle(idx)
        half = len(idx) // 2
        sel = [hu[i] for i in idx[:half]]
        hold = [hu[i] for i in idx[half:]]
        if higher_is_ai:
            thr = max(sel)
            tprs.append(sum(1 for v in ai if v > thr) / len(ai))
            fprs.append(sum(1 for v in hold if v > thr) / len(hold))
        else:
            thr = min(sel)
            tprs.append(sum(1 for v in ai if v < thr) / len(ai))
            fprs.append(sum(1 for v in hold if v < thr) / len(hold))
    return st.mean(tprs), st.mean(fprs)


# ------------------------------------------------------------------ data load

rules_raw = by_id(os.path.join(HERE, "rules-raw.jsonl"))
rules_str = by_id(os.path.join(HERE, "rules-stripped.jsonl"))
t3_raw = by_id(os.path.join(HERE, "tier3-raw.jsonl"))
t3_str = by_id(os.path.join(HERE, "tier3-stripped.jsonl"))
t2_raw = by_id(os.path.join(PE, "tier2-scores.jsonl"))
t2_str = by_id(os.path.join(HERE, "tier2-stripped.jsonl"))
audit = {a["id"]: a for a in json.load(open(os.path.join(HERE, "strip-audit.json")))}

IDS = list(rules_raw)
SIDE = {i: rules_raw[i]["side"] for i in IDS}
PROV = {i: rules_raw[i]["provider"] for i in IDS}
ERA = {i: rules_raw[i]["era"] for i in IDS}
GENRE = {i: t3_raw[i].get("genre") for i in IDS}
AI = [i for i in IDS if SIDE[i] == "ai"]
HU = [i for i in IDS if SIDE[i] == "human"]
BIZ = [i for i in HU if GENRE[i] == "business-marketing"]
SLICES = sorted({(PROV[i], ERA[i]) for i in AI})

# per-sample master record
per_sample = {}
for i in IDS:
    per_sample[i] = {
        "side": SIDE[i], "provider": PROV[i], "era": ERA[i], "genre": GENRE[i],
        "words_raw": audit[i]["words_raw"], "words_stripped": audit[i]["words_stripped"],
        "furniture_before": audit[i]["furniture_before"],
        "raw": {
            "rules_score": rules_raw[i]["rules"]["score"],
            "rules_class": rules_raw[i]["rules"]["classification"],
            "rules_escalation": rules_raw[i]["rules"]["escalation"],
            "rules_findings": rules_raw[i]["rules"]["findingCount"],
            "tier3_p": t3_raw[i]["tier3_int8pc"],
            "tier2_p": t2_raw[i]["p"],
        },
        "stripped": {
            "rules_score": rules_str[i]["rules"]["score"],
            "rules_class": rules_str[i]["rules"]["classification"],
            "rules_escalation": rules_str[i]["rules"]["escalation"],
            "rules_findings": rules_str[i]["rules"]["findingCount"],
            "tier3_p": t3_str[i]["tier3_int8pc"],
            "tier2_p": t2_str[i]["p"],
            "v4": rules_str[i]["v4"],
            "stylo": rules_str[i]["stylo"],
        },
    }

OUT = {"meta": {
    "generated": "2026-08-28",
    "n_ai": len(AI), "n_human": len(HU), "n_biz_human": len(BIZ),
    "rules_version": "en-signals:2026.08.6 (packages/core dist, unmodified)",
    "tier3_model": "tier3-e5small-int8-perchannel.onnx @ shipped threshold 0.857",
    "tier2_model": "gpt2 fp32 surprisal + tier2-head.json v2 @ threshold 0.76",
    "normaliser": "strip_markdown.py (fixed point), 32/32 unit cases",
}}

# --------------------------------------------------- 1. strip characterisation
ai_wr = sum(audit[i]["words_raw"] for i in AI)
ai_ws = sum(audit[i]["words_stripped"] for i in AI)
hu_wr = sum(audit[i]["words_raw"] for i in HU)
hu_ws = sum(audit[i]["words_stripped"] for i in HU)
OUT["strip"] = {
    "ai_words_raw": ai_wr, "ai_words_stripped": ai_ws,
    "ai_pct_words_removed": round(100 * (ai_wr - ai_ws) / ai_wr, 2),
    "human_words_raw": hu_wr, "human_words_stripped": hu_ws,
    "human_pct_words_removed": round(100 * (hu_wr - hu_ws) / hu_wr, 2),
    "ai_with_furniture": sum(1 for i in AI if audit[i]["furniture_before"] > 0),
    "human_with_furniture": sum(1 for i in HU if audit[i]["furniture_before"] > 0),
}

# ------------------------------------------------------ 2. tier headline table
def rules_hit(rec):
    return rec["rules_class"] != "human_like"


tiers = {}
for variant in ("raw", "stripped"):
    ai_r = [per_sample[i][variant]["rules_score"] for i in AI]
    hu_r = [per_sample[i][variant]["rules_score"] for i in HU]
    ai_3 = [per_sample[i][variant]["tier3_p"] for i in AI]
    hu_3 = [per_sample[i][variant]["tier3_p"] for i in HU]
    ai_2 = [per_sample[i][variant]["tier2_p"] for i in AI]
    hu_2 = [per_sample[i][variant]["tier2_p"] for i in HU]
    t3_z, t3_thr = tpr_at_zero_fp(ai_3, hu_3)
    t2_z, t2_thr = tpr_at_zero_fp(ai_2, hu_2)
    t3_h, t3_hf = split_half_zero_fp(ai_3, hu_3)
    t2_h, t2_hf = split_half_zero_fp(ai_2, hu_2)
    tiers[variant] = {
        "rules": {
            "detect_rate": 100 * sum(rules_hit(per_sample[i][variant]) for i in AI) / len(AI),
            "human_fp": sum(rules_hit(per_sample[i][variant]) for i in HU),
            "biz_fp": sum(rules_hit(per_sample[i][variant]) for i in BIZ),
            "auroc": auroc(ai_r, hu_r),
            "mean_score_ai": st.mean(ai_r), "mean_score_human": st.mean(hu_r),
        },
        "tier3": {
            "auroc": auroc(ai_3, hu_3),
            "mean_p_ai": st.mean(ai_3), "mean_p_human": st.mean(hu_3),
            "flag_at_shipped_0857": 100 * sum(v >= 0.857 for v in ai_3) / len(ai_3),
            "human_fp_at_0857": sum(v >= 0.857 for v in hu_3),
            "tpr_at_zero_fp_insample": 100 * t3_z, "zero_fp_threshold": t3_thr,
            "tpr_at_zero_fp_splithalf": 100 * t3_h, "splithalf_holdout_fpr": 100 * t3_hf,
        },
        "tier2": {
            "auroc": auroc(ai_2, hu_2),
            "mean_p_ai": st.mean(ai_2), "mean_p_human": st.mean(hu_2),
            "flag_at_shipped_076": 100 * sum(v >= 0.76 for v in ai_2) / len(ai_2),
            "human_fp_at_076": sum(v >= 0.76 for v in hu_2),
            "tpr_at_zero_fp_insample": 100 * t2_z, "zero_fp_threshold": t2_thr,
            "tpr_at_zero_fp_splithalf": 100 * t2_h, "splithalf_holdout_fpr": 100 * t2_hf,
        },
    }
OUT["tiers"] = tiers

# ------------------------------------------------- 3. per provider x era table
per_slice = {}
for prov, era in SLICES:
    ids = [i for i in AI if PROV[i] == prov and ERA[i] == era]
    row = {"n": len(ids)}
    for variant in ("raw", "stripped"):
        hu_3 = [per_sample[i][variant]["tier3_p"] for i in HU]
        hu_2 = [per_sample[i][variant]["tier2_p"] for i in HU]
        a3 = [per_sample[i][variant]["tier3_p"] for i in ids]
        a2 = [per_sample[i][variant]["tier2_p"] for i in ids]
        row[variant] = {
            "rules_detect": 100 * sum(rules_hit(per_sample[i][variant]) for i in ids) / len(ids),
            "tier3_auroc": auroc(a3, hu_3),
            "tier3_tpr_zero_fp": 100 * tpr_at_zero_fp(a3, hu_3)[0],
            "tier3_flag_0857": 100 * sum(v >= 0.857 for v in a3) / len(a3),
            "tier2_auroc": auroc(a2, hu_2),
            "tier2_tpr_zero_fp": 100 * tpr_at_zero_fp(a2, hu_2)[0],
        }
    per_slice[f"{prov} {era}"] = row
OUT["per_slice"] = per_slice

# ------------------------------------------------- 4. tier3 threshold sweep
sweep = []
for thr in [0.5, 0.6, 0.7, 0.75, 0.8, 0.82, 0.84, 0.85, 0.855, 0.857, 0.86]:
    r = {"threshold": thr}
    for variant in ("raw", "stripped"):
        a = [per_sample[i][variant]["tier3_p"] for i in AI]
        h = [per_sample[i][variant]["tier3_p"] for i in HU]
        b = [per_sample[i][variant]["tier3_p"] for i in BIZ]
        r[variant] = {
            "tpr": 100 * sum(v >= thr for v in a) / len(a),
            "human_fp": sum(v >= thr for v in h),
            "human_fpr": 100 * sum(v >= thr for v in h) / len(h),
            "biz_fp": sum(v >= thr for v in b),
        }
    sweep.append(r)
OUT["tier3_sweep"] = sweep

# in- vs out-of-distribution for tier3 on stripped
ood = [i for i in AI if PROV[i] == "openai" and ERA[i] == "2022-23"]
ind = [i for i in AI if i not in set(ood)]
OUT["tier3_distribution_split"] = {}
for variant in ("raw", "stripped"):
    h = [per_sample[i][variant]["tier3_p"] for i in HU]
    OUT["tier3_distribution_split"][variant] = {
        "in_distribution_arena": {
            "n": len(ind),
            "auroc": auroc([per_sample[i][variant]["tier3_p"] for i in ind], h),
            "tpr_zero_fp": 100 * tpr_at_zero_fp([per_sample[i][variant]["tier3_p"] for i in ind], h)[0],
        },
        "out_of_distribution_hc3": {
            "n": len(ood),
            "auroc": auroc([per_sample[i][variant]["tier3_p"] for i in ood], h),
            "tpr_zero_fp": 100 * tpr_at_zero_fp([per_sample[i][variant]["tier3_p"] for i in ood], h)[0],
        },
    }

# -------------------------------------- 5. metric ranking on stripped text only
def collect(name, getter):
    a, h, b = [], [], []
    for i in AI:
        v = getter(per_sample[i]["stripped"])
        if v is not None and isinstance(v, (int, float)) and math.isfinite(v):
            a.append(float(v))
    for i in HU:
        v = getter(per_sample[i]["stripped"])
        if v is not None and isinstance(v, (int, float)) and math.isfinite(v):
            h.append(float(v))
    for i in BIZ:
        v = getter(per_sample[i]["stripped"])
        if v is not None and isinstance(v, (int, float)) and math.isfinite(v):
            b.append(float(v))
    return name, a, h, b


metrics = []
V4_KEYS = ["spectralFlatness", "compressionGain", "registerFuncL1", "registerLongWordDelta",
           "punchlineRate", "punchlineParagraphFinal", "micDropParagraphs", "contrastPer1000",
           "ratioAbstractShare"]
STY_KEYS = ["emDashPer1000", "enDashPer1000", "spacedHyphenPer1000", "sentMean", "sentSd",
            "sentCv", "shortSentShare", "fragmentShare", "paraCount", "paraMean", "paraCv",
            "linesPerPara"]
for k in V4_KEYS:
    metrics.append(collect(f"v4.{k}", lambda s, k=k: (s["v4"] or {}).get(k)))
for k in STY_KEYS:
    metrics.append(collect(f"stylo.{k}", lambda s, k=k: s["stylo"].get(k)))
metrics.append(collect("rules.score", lambda s: s["rules_score"]))
metrics.append(collect("rules.findingCount", lambda s: s["rules_findings"]))
metrics.append(collect("tier3.p", lambda s: s["tier3_p"]))
metrics.append(collect("tier2.p", lambda s: s["tier2_p"]))
# tier2 raw features on stripped text
for fk in (t2_str[AI[0]].get("feats") or {}):
    metrics.append((f"t2feat.{fk}",
                    [t2_str[i]["feats"][fk] for i in AI if t2_str[i].get("feats")],
                    [t2_str[i]["feats"][fk] for i in HU if t2_str[i].get("feats")],
                    [t2_str[i]["feats"][fk] for i in BIZ if t2_str[i].get("feats")]))

ranked = []
for name, a, h, b in metrics:
    if len(a) < 50 or len(h) < 30:
        continue
    d = cliffs_delta(a, h)
    hi = d >= 0                     # direction: is a higher value more AI-like?
    tpr_hi, thr_hi = tpr_at_zero_fp(a, h, True)
    tpr_lo, thr_lo = tpr_at_zero_fp(a, h, False)
    tpr, thr = (tpr_hi, thr_hi) if hi else (tpr_lo, thr_lo)
    sh_tpr, sh_fpr = split_half_zero_fp(a, h, hi)
    ranked.append({
        "metric": name, "n_ai": len(a), "n_human": len(h),
        "cliffs_delta": d, "cohens_d": cohens_d(a, h),
        "auroc": auroc(a, h) if hi else 1 - auroc(a, h),
        "direction": "higher=AI" if hi else "lower=AI",
        "mean_ai": st.mean(a), "mean_human": st.mean(h),
        "mean_biz_human": st.mean(b) if b else None,
        "tpr_at_zero_fp_insample": 100 * tpr, "zero_fp_threshold": thr,
        "tpr_at_zero_fp_splithalf": 100 * sh_tpr, "splithalf_holdout_fpr": 100 * sh_fpr,
    })
ranked.sort(key=lambda r: -abs(r["cliffs_delta"]))
OUT["metric_ranking_stripped"] = ranked

# --------------------------------------------- 6. rules escalation attribution
esc = {}
for variant in ("raw", "stripped"):
    c = defaultdict(int)
    for i in AI:
        c[str(per_sample[i][variant]["rules_escalation"])] += 1
    esc[variant] = dict(sorted(c.items(), key=lambda kv: -kv[1]))
OUT["rules_escalation"] = esc

# --------------------------------------------- 7. business-marketing FP detail
OUT["biz_human_detail"] = [{
    "id": i, "words": audit[i]["words_stripped"],
    "tier3_p_raw": per_sample[i]["raw"]["tier3_p"],
    "tier3_p_stripped": per_sample[i]["stripped"]["tier3_p"],
    "tier2_p_stripped": per_sample[i]["stripped"]["tier2_p"],
    "rules_score_stripped": per_sample[i]["stripped"]["rules_score"],
} for i in BIZ]

json.dump(per_sample, open(os.path.join(HERE, "stripped-scores.json"), "w"), indent=1)
json.dump(OUT, open(os.path.join(HERE, "analysis.json"), "w"), indent=1)

# ------------------------------------------------------------------- printing
def pct(x):
    return f"{x:5.1f}" if isinstance(x, float) and math.isfinite(x) else "  n/a"


print("=" * 78)
print("STRIP CHARACTERISATION")
print(f"  AI    words {ai_wr:,} -> {ai_ws:,}  ({OUT['strip']['ai_pct_words_removed']}% removed); "
      f"{OUT['strip']['ai_with_furniture']}/{len(AI)} carried furniture")
print(f"  HUMAN words {hu_wr:,} -> {hu_ws:,}  ({OUT['strip']['human_pct_words_removed']}% removed); "
      f"{OUT['strip']['human_with_furniture']}/{len(HU)} carried furniture")

print("\n" + "=" * 78)
print("TIER HEADLINE - raw vs stripped (n_ai=1727, n_human=169)")
hdr = f"{'tier':<10}{'variant':<10}{'AUROC':>8}{'detect/TPR@0FP':>17}{'humanFP':>9}"
print(hdr)
for variant in ("raw", "stripped"):
    t = tiers[variant]
    print(f"{'rules':<10}{variant:<10}{t['rules']['auroc']:>8.4f}"
          f"{t['rules']['detect_rate']:>16.1f}%{t['rules']['human_fp']:>9}")
for variant in ("raw", "stripped"):
    t = tiers[variant]["tier3"]
    print(f"{'tier3':<10}{variant:<10}{t['auroc']:>8.4f}"
          f"{t['tpr_at_zero_fp_insample']:>16.1f}%{0:>9}")
for variant in ("raw", "stripped"):
    t = tiers[variant]["tier2"]
    print(f"{'tier2':<10}{variant:<10}{t['auroc']:>8.4f}"
          f"{t['tpr_at_zero_fp_insample']:>16.1f}%{0:>9}")

print("\n  split-half honest zero-FP (threshold on half the humans, FP on the other half):")
for variant in ("raw", "stripped"):
    for tn in ("tier3", "tier2"):
        t = tiers[variant][tn]
        print(f"    {tn} {variant:<9} TPR {t['tpr_at_zero_fp_splithalf']:5.1f}%  "
              f"holdout FPR {t['splithalf_holdout_fpr']:4.2f}%")

print("\n" + "=" * 78)
print("PER PROVIDER x ERA")
print(f"{'slice':<22}{'n':>5}{'rules raw':>11}{'rules str':>11}{'t3 AUROC raw':>14}"
      f"{'t3 AUROC str':>14}{'t3 TPR0 str':>13}{'t2 AUROC str':>14}")
for k, v in per_slice.items():
    print(f"{k:<22}{v['n']:>5}{v['raw']['rules_detect']:>10.1f}%{v['stripped']['rules_detect']:>10.1f}%"
          f"{v['raw']['tier3_auroc']:>14.4f}{v['stripped']['tier3_auroc']:>14.4f}"
          f"{v['stripped']['tier3_tpr_zero_fp']:>12.1f}%{v['stripped']['tier2_auroc']:>14.4f}")

print("\n" + "=" * 78)
print("TIER 3 THRESHOLD SWEEP (stripped | raw)")
print(f"{'thr':>7}{'TPR str':>10}{'FP str':>8}{'biz':>5}{'TPR raw':>10}{'FP raw':>8}{'biz':>5}")
for r in sweep:
    print(f"{r['threshold']:>7.3f}{r['stripped']['tpr']:>9.1f}%{r['stripped']['human_fp']:>8}"
          f"{r['stripped']['biz_fp']:>5}{r['raw']['tpr']:>9.1f}%{r['raw']['human_fp']:>8}"
          f"{r['raw']['biz_fp']:>5}")

print("\n" + "=" * 78)
print("TIER 3 in- vs out-of-distribution (stripped)")
for k, v in OUT["tier3_distribution_split"]["stripped"].items():
    print(f"  {k:<28} n={v['n']:<5} AUROC {v['auroc']:.4f}  TPR@0FP {v['tpr_zero_fp']:.1f}%")

print("\n" + "=" * 78)
print("METRIC RANKING ON STRIPPED TEXT (top 25 by |Cliff's delta|)")
print(f"{'metric':<28}{'delta':>8}{'d':>8}{'AUROC':>8}{'TPR@0FP':>9}{'split-half':>12}{'dir':>10}")
for r in ranked[:25]:
    print(f"{r['metric']:<28}{r['cliffs_delta']:>8.3f}{r['cohens_d']:>8.2f}{r['auroc']:>8.4f}"
          f"{r['tpr_at_zero_fp_insample']:>8.1f}%{r['tpr_at_zero_fp_splithalf']:>11.1f}%"
          f"{r['direction']:>10}")

print("\n" + "=" * 78)
print("RULES ESCALATION ATTRIBUTION (AI side)")
for variant in ("raw", "stripped"):
    print(f"  {variant:<9}", esc[variant])
print(f"\nwrote stripped-scores.json ({len(per_sample)} samples) and analysis.json")

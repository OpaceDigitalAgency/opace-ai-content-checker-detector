"""Workstream PP - aggregate rules-scores.jsonl + tier3-scores.jsonl into
analysis.json (per provider x era tables, hypothesis stats, zero-FP threshold
sweeps) and provider-scores.json (per-sample merged record).
"""

from __future__ import annotations

import json
import os
from collections import Counter, defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

rules = {r["id"]: r for r in map(json.loads, open(os.path.join(HERE, "rules-scores.jsonl")))}
tier3 = {r["id"]: r for r in map(json.loads, open(os.path.join(HERE, "tier3-scores.jsonl")))}

rows = []
for rid, r in rules.items():
    t = tier3.get(rid, {})
    r = dict(r)
    r["tier3"] = t.get("tier3_int8pc")
    r["flagged"] = t.get("flagged_0857")
    rows.append(r)

humans = [r for r in rows if r["side"] == "human"]
ais = [r for r in rows if r["side"] == "ai"]
biz_humans = [r for r in humans if (r.get("genre") or "").startswith("business")]


def slice_key(r):
    return (r["provider"], r["era"])


def cliffs_delta(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    if len(a) == 0 or len(b) == 0:
        return None
    # efficient via ranking
    m, n = len(a), len(b)
    allv = np.concatenate([a, b])
    order = allv.argsort(kind="mergesort")
    ranks = np.empty(len(allv))
    ranks[order] = np.arange(1, len(allv) + 1)
    # handle ties via average ranks
    import scipy.stats as st
    ranks = st.rankdata(allv)
    ra = ranks[:m].sum()
    u = ra - m * (m + 1) / 2.0
    return round(float(2 * u / (m * n) - 1), 3)


METRICS = [
    ("emDashPer1000", "stylo", "higher"),
    ("enDashPer1000", "stylo", "higher"),
    ("sentMean", "stylo", None),
    ("sentCv", "stylo", "lower"),
    ("shortSentShare", "stylo", "higher"),
    ("fragmentShare", "stylo", "higher"),
    ("bulletsPer1000", "stylo", "higher"),
    ("headingsPer1000", "stylo", "higher"),
    ("boldPer1000", "stylo", "higher"),
    ("contrastPer1000", "v4", "higher"),
    ("punchlineRate", "v4", "higher"),
    ("micDropParagraphs", "v4", "higher"),
    ("spectralFlatness", "v4", None),
    ("compressionGain", "v4", None),
    ("registerFuncL1", "v4", None),
    ("ratioAbstractShare", "v4", "higher"),
]


def get_metric(r, name, group):
    g = r.get(group) or {}
    v = g.get(name)
    return float(v) if v is not None else None


def vals(rs, name, group):
    return [get_metric(r, name, group) for r in rs if get_metric(r, name, group) is not None]


def summ(v):
    if not v:
        return None
    a = np.asarray(v, float)
    return {"n": len(a), "mean": round(float(a.mean()), 3), "median": round(float(np.median(a)), 3),
            "p90": round(float(np.percentile(a, 90)), 3), "max": round(float(a.max()), 3)}


out = {"n_total": len(rows), "n_human": len(humans), "n_ai": len(ais),
       "n_biz_human": len(biz_humans)}

# ---- Task 1: shipped-stack measurement per provider x era ----
slices = defaultdict(list)
for r in ais:
    slices[slice_key(r)].append(r)
slices[("human", "all")] = humans
slices[("human", "business-marketing")] = biz_humans

meas = {}
for k in sorted(slices):
    rs = slices[k]
    n = len(rs)
    cls = Counter(r["rules"]["classification"] for r in rs)
    esc = Counter(r["rules"]["escalation"] for r in rs if r["rules"]["escalation"])
    scores = [r["rules"]["score"] for r in rs]
    cats = Counter()
    for r in rs:
        for c in r["rules"]["categoriesHit"]:
            cats[c] += 1
    t3 = [r["tier3"] for r in rs if r["tier3"] is not None]
    flags = sum(1 for r in rs if r.get("flagged"))
    meas["|".join(k)] = {
        "n": n,
        "rules_score": summ(scores),
        "classification": {c: cls.get(c, 0) for c in ("human_like", "mixed_signals", "ai_like")},
        "pct_mixed_or_above": round(100 * (cls.get("mixed_signals", 0) + cls.get("ai_like", 0)) / n, 1),
        "pct_ai_like": round(100 * cls.get("ai_like", 0) / n, 1),
        "pct_score_ge_10": round(100 * sum(s >= 10 for s in scores) / n, 1),
        "pct_score_ge_25": round(100 * sum(s >= 25 for s in scores) / n, 1),
        "escalations": dict(esc.most_common()),
        "pct_any_escalation": round(100 * sum(1 for r in rs if r["rules"]["escalation"]) / n, 1),
        "top_categories": [(c, round(100 * v / n, 1)) for c, v in cats.most_common(8)],
        "tier3_mean": round(float(np.mean(t3)), 3) if t3 else None,
        "tier3_flag_rate_0857": round(100 * flags / n, 1) if t3 else None,
        "mean_findings": round(float(np.mean([r["rules"]["findingCount"] for r in rs])), 2),
    }
out["measurement"] = meas

# ---- Task 2: hypothesis metrics per provider (all eras) and per slice ----
hyp = {}
groups = defaultdict(list)
for r in ais:
    groups[r["provider"]].append(r)
    groups[f'{r["provider"]}|{r["era"]}'].append(r)
for gname in sorted(groups):
    rs = groups[gname]
    hyp[gname] = {}
    for name, grp, direction in METRICS:
        va = vals(rs, name, grp)
        vh = vals(humans, name, grp)
        if not va:
            continue
        hyp[gname][name] = {
            "ai": summ(va), "delta_vs_human": cliffs_delta(va, vh),
        }
hyp["HUMAN_REFERENCE"] = {name: summ(vals(humans, name, grp)) for name, grp, _ in METRICS}
hyp["HUMAN_BIZ_REFERENCE"] = {name: summ(vals(biz_humans, name, grp)) for name, grp, _ in METRICS}
out["hypotheses"] = hyp

# ---- Task 3: zero-FP threshold sweeps ----
# For each metric with a direction, find the tightest threshold with 0 FPs on
# ALL humans (and separately with 0 biz FPs but allowing others), then report
# per provider x era TPR at that threshold.
sweeps = {}
for name, grp, direction in METRICS:
    if direction is None:
        continue
    vh = vals(humans, name, grp)
    if not vh:
        continue
    hi = max(vh)
    lo = min(vh)
    entry = {"direction": direction, "human_max": round(hi, 3), "human_min": round(lo, 3)}
    per = {}
    for k in sorted(slices):
        if k[0] == "human":
            continue
        rs = slices[k]
        va = vals(rs, name, grp)
        if not va:
            continue
        if direction == "higher":
            thr = np.nextafter(hi, np.inf)
            tpr = sum(v > hi for v in va) / len(va)
        else:
            thr = np.nextafter(lo, -np.inf)
            tpr = sum(v < lo for v in va) / len(va)
        per["|".join(k)] = round(100 * tpr, 1)
    entry["zero_fp_threshold"] = round(float(hi if direction == "higher" else lo), 3)
    entry["tpr_at_zero_fp_pct"] = per
    # risk-tier: threshold at human p99 / p95 with measured FP counts
    for pct in (99, 95):
        q = np.percentile(vh, pct if direction == "higher" else 100 - pct)
        fps = sum(v > q for v in vh) if direction == "higher" else sum(v < q for v in vh)
        biz = vals(biz_humans, name, grp)
        bfps = sum(v > q for v in biz) if direction == "higher" else sum(v < q for v in biz)
        pert = {}
        for k in sorted(slices):
            if k[0] == "human":
                continue
            va = vals(slices[k], name, grp)
            if not va:
                continue
            t = (sum(v > q for v in va) if direction == "higher" else sum(v < q for v in va)) / len(va)
            pert["|".join(k)] = round(100 * t, 1)
        entry[f"p{pct}_threshold"] = {"threshold": round(float(q), 3), "human_fp": fps,
                                      "human_fp_pct": round(100 * fps / len(vh), 1),
                                      "biz_fp": bfps, "tpr_pct": pert}
    sweeps[name] = entry
out["sweeps"] = sweeps

# rule-id fire rates per slice (for calibration mapping)
rule_fire = {}
for k in sorted(slices):
    rs = slices[k]
    c = Counter()
    for r in rs:
        for rid in (r["rules"].get("ruleCounts") or {}):
            c[rid] += 1
    rule_fire["|".join(k)] = {rid: round(100 * v / len(rs), 1) for rid, v in c.most_common(12)}
out["rule_fire_pct"] = rule_fire

inspect_errors = sum(1 for r in rows if r["rules"].get("inspectError"))
out["inspect_errors"] = inspect_errors

with open(os.path.join(HERE, "analysis.json"), "w") as f:
    json.dump(out, f, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))

# per-sample provider-scores.json (text excluded; ids allow joining back)
ps = []
for r in rows:
    ps.append({
        "id": r["id"], "provider": r["provider"], "era": r["era"], "model": r["model"],
        "side": r["side"], "genre": r.get("genre"), "words": r["words"],
        "corpus_split": r.get("corpus_split"),
        "in_tier3_selection": r.get("in_tier3_selection", False),
        "rules_score": r["rules"]["score"], "classification": r["rules"]["classification"],
        "escalation": r["rules"]["escalation"], "findings": r["rules"]["findingCount"],
        "categories": r["rules"]["categoriesHit"],
        "tier3_int8pc": r["tier3"], "tier3_flag_0857": r.get("flagged"),
        "stylo": r["stylo"], "v4": r["v4"],
    })
with open(os.path.join(HERE, "provider-scores.json"), "w") as f:
    json.dump(ps, f)
print(f"analysis.json + provider-scores.json written; {len(ps)} samples, "
      f"{inspect_errors} inspect errors")

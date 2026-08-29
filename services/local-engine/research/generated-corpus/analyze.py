"""Analyse the 2026-generated corpus against the shipped rules stack and Tier 3.

Emits analysis.json (machine-readable) and the tables that go into
GENERATED-CORPUS-EVAL.md. Compares against provider-eval/analysis.json for the
2024-25 and 2025-26 eras.
"""

from __future__ import annotations

import collections
import json
import os
import statistics as st

from split_samples import FAMILY

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = json.load(open(os.path.join(HERE, "..", "provider-eval", "analysis.json")))

THRESH = [("t_8533", 0.8533), ("t_8397", 0.8397), ("t_6256", 0.6256), ("t_857", 0.857)]


def load(name):
    return [json.loads(l) for l in open(os.path.join(HERE, name))]


def pct(k, n):
    return round(100.0 * k / n, 1) if n else 0.0


def dist(vals):
    if not vals:
        return {}
    s = sorted(vals)
    return {
        "mean": round(st.mean(s), 2),
        "median": s[len(s) // 2],
        "p90": s[int(0.9 * (len(s) - 1))],
        "max": s[-1],
    }


def slice_stats(rules, t3):
    n = len(rules)
    scores = [r["rules"]["score"] for r in rules]
    cls = collections.Counter(r["rules"]["classification"] for r in rules)
    cats = collections.Counter()
    rule_ids = collections.Counter()
    for r in rules:
        for c in r["rules"]["catWeights"]:
            cats[c] += 1
        for rid in r["rules"]["ruleCounts"]:
            rule_ids[rid] += 1
    out = {
        "n": n,
        "rules_score": dist(scores),
        "classification": {k: pct(v, n) for k, v in cls.items()},
        "pct_mixed_or_above": pct(
            sum(1 for r in rules if r["rules"]["classification"] != "human_like"), n),
        "pct_ai_like": pct(
            sum(1 for r in rules if r["rules"]["classification"] == "ai_like"), n),
        "pct_score_ge_10": pct(sum(1 for s in scores if s >= 10), n),
        "pct_score_ge_25": pct(sum(1 for s in scores if s >= 25), n),
        "pct_any_escalation": pct(sum(1 for r in rules if r["rules"]["escalation"]), n),
        "mean_findings": round(st.mean([r["rules"]["findingCount"] for r in rules]), 2) if n else 0,
        "category_fire_pct": {k: pct(v, n) for k, v in cats.most_common()},
        "rule_fire_pct": {k: pct(v, n) for k, v in rule_ids.most_common(20)},
        "mean_words": round(st.mean([r["words"] for r in rules])) if n else 0,
        "vocab_tier1_pct": pct(sum(1 for r in rules if "tier1" in r["rules"]["catWeights"]), n),
        "vocab_tier2_pct": pct(sum(1 for r in rules if "tier2" in r["rules"]["catWeights"]), n),
        "vocab_tier3_pct": pct(sum(1 for r in rules if "tier3" in r["rules"]["catWeights"]), n),
        "vocab_any_pct": pct(sum(1 for r in rules if any(
            c in r["rules"]["catWeights"] for c in ("tier1", "tier2", "tier3"))), n),
        "vocab_n_tier1": sum(1 for r in rules if "tier1" in r["rules"]["catWeights"]),
        "vocab_n_tier2": sum(1 for r in rules if "tier2" in r["rules"]["catWeights"]),
        "vocab_n_tier3": sum(1 for r in rules if "tier3" in r["rules"]["catWeights"]),
        "vocab_n_any": sum(1 for r in rules if any(
            c in r["rules"]["catWeights"] for c in ("tier1", "tier2", "tier3"))),
        "em_dash_per_1000": round(st.mean([r["stylo"]["emDashPer1000"] for r in rules]), 2) if n else 0,
        "sent_cv": round(st.mean([r["stylo"]["sentCv"] for r in rules]), 3) if n else 0,
    }
    if t3:
        ps = [r["tier3_int8pc"] for r in t3]
        out["n_tier3"] = len(t3)
        out["tier3_mean"] = round(st.mean(ps), 3)
        out["tier3_median"] = round(sorted(ps)[len(ps) // 2], 3)
        for name, thr in THRESH:
            out[f"tier3_flag_rate_{name}"] = pct(sum(1 for p in ps if p >= thr), len(ps))
            out[f"tier3_flag_n_{name}"] = sum(1 for p in ps if p >= thr)
    return out


def main():
    rules = load("rules-scores.jsonl")
    t3 = load("tier3-scores.jsonl")
    t3_by_id = {r["id"]: r for r in t3}

    def group(key):
        g = collections.defaultdict(list)
        for r in rules:
            g[key(r)].append(r)
        return {k: slice_stats(v, [t3_by_id[x["id"]] for x in v if x["id"] in t3_by_id])
                for k, v in sorted(g.items())}

    result = {
        "corpus": {
            "n": len(rules),
            "n_tier3": len(t3),
            "era": "2026-generated",
            "words": dist([r["words"] for r in rules]),
        },
        "overall": slice_stats(rules, t3),
        "by_model": group(lambda r: r["model"]),
        "by_provider": group(lambda r: r["provider"]),
        "by_prompt_style": group(lambda r: r["prompt_style"]),
        "by_register": group(lambda r: r["register"]),
        "by_temperature": group(lambda r: str(r["temperature"])),
        "by_provider_style": group(lambda r: f"{r['provider']}|{r['prompt_style']}"),
        "by_tier": group(lambda r: r["tier"]),
        "by_register_family": group(lambda r: FAMILY.get(r["register"], "other-shared")),
        "by_length_band": group(lambda r: r["length_band"]),
        "by_model_style": group(lambda r: f"{r['model']}|{r['prompt_style']}"),
        "by_family_style": group(
            lambda r: f"{FAMILY.get(r['register'],'other-shared')}|{r['prompt_style']}"),
        "baseline_provider_eval": {
            k: {
                "n": v["n"],
                "rules_score": v["rules_score"],
                "pct_mixed_or_above": v["pct_mixed_or_above"],
                "pct_ai_like": v["pct_ai_like"],
                "pct_score_ge_10": v["pct_score_ge_10"],
                "pct_score_ge_25": v["pct_score_ge_25"],
                "pct_any_escalation": v["pct_any_escalation"],
                "mean_findings": v["mean_findings"],
                "tier3_mean": v["tier3_mean"],
                "tier3_flag_rate_0857": v["tier3_flag_rate_0857"],
            }
            for k, v in BASE["measurement"].items()
        },
        "baseline_rule_fire_pct": BASE["rule_fire_pct"],
    }

    with open(os.path.join(HERE, "analysis.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps({k: result[k] for k in ("corpus",)}, indent=1))
    print("wrote analysis.json")


if __name__ == "__main__":
    main()

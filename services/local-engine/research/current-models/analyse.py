"""Measurement: current-model detection vs the 2024-25 / 2025-26 baselines.

Baselines are re-derived from the existing read-only score files
(provider-eval/tier3-scores.jsonl, stripped-eval/tier3-stripped.jsonl,
provider-eval/rules-scores.jsonl, stripped-eval/rules-stripped.jsonl) so the
old and new numbers are computed by ONE piece of code at the same thresholds.
provider-eval/analysis.json only records the 0.857 flag rate, so its figures
are quoted separately in the write-up rather than mixed in here.
"""
from __future__ import annotations
import json, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PE = os.path.join(HERE, "..", "provider-eval")
SE = os.path.join(HERE, "..", "stripped-eval")
TH = [0.8533, 0.8397, 0.6256]


def load(p):
    return [json.loads(l) for l in open(p)]


def pct(n, d):
    return round(100.0 * n / d, 1) if d else None


def t3_block(rows):
    n = len(rows)
    v = sorted(r["tier3_int8pc"] for r in rows)
    out = {"n": n,
           "tier3_mean": round(sum(v) / n, 4) if n else None,
           "tier3_median": round(v[n // 2], 4) if n else None}
    for t in TH:
        out[f"flag_{t}"] = pct(sum(1 for x in v if x >= t), n)
    return out


def rules_block(rows):
    n = len(rows)
    cls = collections.Counter(r["rules"]["classification"] for r in rows)
    return {"n": n,
            "pct_ai_like": pct(cls.get("ai_like", 0), n),
            "pct_mixed_or_above": pct(cls.get("ai_like", 0) + cls.get("mixed_signals", 0), n),
            "mean_rules_score": round(sum(r["rules"]["score"] for r in rows) / n, 2) if n else None,
            "mean_findings": round(sum(r["rules"]["findingCount"] for r in rows) / n, 2) if n else None}


def group(rows, key):
    g = collections.defaultdict(list)
    for r in rows:
        g[key(r)].append(r)
    return g


def main():
    res = {"thresholds": TH}

    # ---------- baselines (existing eras, AI only) ----------
    base_raw = [r for r in load(os.path.join(PE, "tier3-scores.jsonl")) if r["side"] == "ai"]
    base_str = [r for r in load(os.path.join(SE, "tier3-stripped.jsonl")) if r["side"] == "ai"]
    base_rr = [r for r in load(os.path.join(PE, "rules-scores.jsonl")) if r["side"] == "ai"]
    base_rs = [r for r in load(os.path.join(SE, "rules-stripped.jsonl")) if r["side"] == "ai"]
    base_hum_raw = [r for r in load(os.path.join(PE, "tier3-scores.jsonl")) if r["side"] == "human"]
    base_hum_str = [r for r in load(os.path.join(SE, "tier3-stripped.jsonl")) if r["side"] == "human"]
    res["human_reference"] = {
        "raw": t3_block(base_hum_raw), "stripped": t3_block(base_hum_str)}

    res["baseline"] = {}
    for era in ("2022-23", "2024-25", "2025-26"):
        res["baseline"][era] = {
            "tier3_raw": t3_block([r for r in base_raw if r["era"] == era]),
            "tier3_stripped": t3_block([r for r in base_str if r["era"] == era]),
            "rules_raw": rules_block([r for r in base_rr if r["era"] == era]),
            "rules_stripped": rules_block([r for r in base_rs if r["era"] == era]),
            "by_provider": {},
        }
        for p, rs in sorted(group([r for r in base_raw if r["era"] == era], lambda r: r["provider"]).items()):
            ids = {r["id"] for r in rs}
            res["baseline"][era]["by_provider"][p] = {
                "tier3_raw": t3_block(rs),
                "tier3_stripped": t3_block([r for r in base_str if r["id"] in ids]),
                "rules_raw": rules_block([r for r in base_rr if r["id"] in ids]),
            }

    # ---------- current corpus ----------
    cur_raw = load(os.path.join(HERE, "tier3-raw.jsonl"))
    cur_str = load(os.path.join(HERE, "tier3-stripped.jsonl"))
    cur_rr = load(os.path.join(HERE, "rules-raw.jsonl"))
    cur_rs = load(os.path.join(HERE, "rules-stripped.jsonl"))
    str_by_id = {r["id"]: r for r in cur_str}
    rr_by_id = {r["id"]: r for r in cur_rr}
    rs_by_id = {r["id"]: r for r in cur_rs}

    def bundle(rows):
        ids = [r["id"] for r in rows]
        return {"tier3_raw": t3_block(rows),
                "tier3_stripped": t3_block([str_by_id[i] for i in ids]),
                "rules_raw": rules_block([rr_by_id[i] for i in ids]),
                "rules_stripped": rules_block([rs_by_id[i] for i in ids])}

    res["current_overall"] = bundle(cur_raw)
    res["current_by_era"] = {k: bundle(v) for k, v in sorted(group(cur_raw, lambda r: r["era"]).items())}
    res["current_by_register"] = {k: bundle(v) for k, v in sorted(group(cur_raw, lambda r: r["register"]).items())}
    res["current_by_source"] = {k: bundle(v) for k, v in sorted(group(cur_raw, lambda r: r["source"]).items())}
    res["current_by_provider"] = {k: bundle(v) for k, v in sorted(group(cur_raw, lambda r: r["provider"]).items())}
    res["current_by_provider_era"] = {
        f"{k[0]}|{k[1]}": bundle(v)
        for k, v in sorted(group(cur_raw, lambda r: (r["provider"], r["era"])).items())}
    res["current_by_provider_register"] = {
        f"{k[0]}|{k[1]}": bundle(v)
        for k, v in sorted(group(cur_raw, lambda r: (r["provider"], r["register"])).items())}
    res["current_by_model"] = {
        k: bundle(v) for k, v in sorted(group(cur_raw, lambda r: r["model"]).items()) if len(v) >= 10}

    # ---------- register control (GRADTEX, older generators) ----------
    cf = os.path.join(HERE, "tier3-control.jsonl")
    if os.path.exists(cf):
        ctl = load(cf)
        crr = {r["id"]: r for r in load(os.path.join(HERE, "rules-control.jsonl"))}
        res["control_by_model"] = {}
        for k, v in sorted(group(ctl, lambda r: r["model"]).items()):
            res["control_by_model"][k] = {"tier3_raw": t3_block(v),
                                          "rules_raw": rules_block([crr[r["id"]] for r in v])}
        res["control_overall"] = {"tier3_raw": t3_block(ctl),
                                  "rules_raw": rules_block([crr[r["id"]] for r in ctl])}

    # ---------- prose probe (EQ-Bench, unlicensed - scores only) ----------
    probe = os.environ.get("PROBE_DIR", "/tmp/eqbench-probe")
    pf = os.path.join(probe, "tier3-probe-raw.jsonl")
    if os.path.exists(pf):
        pr = load(pf)
        res["probe_overall"] = t3_block(pr)
        res["probe_by_provider"] = {k: t3_block(v) for k, v in sorted(group(pr, lambda r: r["provider"]).items())}
        res["probe_by_era"] = {k: t3_block(v) for k, v in sorted(group(pr, lambda r: r["era"]).items())}
        res["probe_by_model"] = {k: t3_block(v) for k, v in sorted(group(pr, lambda r: r["model"]).items())}

    json.dump(res, open(os.path.join(HERE, "analysis.json"), "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("human_reference", "current_overall")}, indent=1))
    print("\n== baseline vs current, tier3 flag rates (AI recall %) ==")
    hdr = f"{'slice':34s} {'n':>5s} " + " ".join(f"{'r@'+str(t):>9s}" for t in TH) + "  " + " ".join(f"{'s@'+str(t):>9s}" for t in TH)
    print(hdr)
    def line(name, b):
        r, s = b["tier3_raw"], b["tier3_stripped"]
        print(f"{name:34s} {r['n']:5d} " + " ".join(f"{r['flag_'+str(t)]:9.1f}" for t in TH)
              + "  " + " ".join(f"{s['flag_'+str(t)]:9.1f}" for t in TH))
    for era in ("2022-23", "2024-25", "2025-26"):
        b = res["baseline"][era]
        line(f"BASE {era}", {"tier3_raw": b["tier3_raw"], "tier3_stripped": b["tier3_stripped"]})
    for k, b in res["current_by_era"].items():
        line(f"NEW  {k}", b)
    print()
    for k, b in res["current_by_register"].items():
        line(f"NEW  register {k}", b)
    print()
    for k, b in res["current_by_provider"].items():
        line(f"NEW  provider {k}", b)
    print(f"\nwrote analysis.json")


if __name__ == "__main__":
    main()

"""Escalation arm, priced like SYNTHETIC-CADENCE.md section 5.1.

Flag a document when the shipped pair does NOT flag it, its max segment
probability sits in a band below the primary threshold, and N of the three
strong shape tells fire:
  t_wpp   wpp_cv <= 0.2          (16x lift measured)
  t_sec15 sec_within15 >= 0.9    (13.8x)
  t_comp  composite scaffold flag (6.6x)

Sides:
  AI    generated corpus usable docs: shipped fp32 scores
        (cycle2-rescore-2026-08-31/generated-fp32.jsonl) + structural
        metrics (new-human-per-doc.jsonl AI rows). Membership split from
        cycle2-membership.json (train/cal/test vs None = hash-independent).
  HUMAN structured human corpus: human-fp32.jsonl + metrics rows.

Pair verdict: max seg_p >= 0.9855 OR second-max >= 0.9763.
Usage: python3 analyze_escalation.py
Output: escalation-pricing.json + printed tables.
"""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH, "document-tells-2026-08-31"))
sys.path.insert(0, HERE)
from measure_scaffold_v2 import flag as scaffold_flag  # noqa: E402

PRIMARY, SECONDARY = 0.9855, 0.9763
BANDS = [0.80, 0.90, 0.95]


def pair_flag(seg_p):
    if not seg_p:
        return False
    s = sorted(seg_p, reverse=True)
    return s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY)


def tells(m):
    return [
        m.get("wpp_cv") is not None and m["wpp_cv"] <= 0.2,
        m.get("sec_within15") is not None and m["sec_within15"] >= 0.9,
        bool(scaffold_flag(m)),
    ]


def load():
    metrics = {}
    for line in open(os.path.join(HERE, "new-human-per-doc.jsonl")):
        r = json.loads(line)
        metrics[r["id"]] = r
    membership = json.load(open(os.path.join(
        RESEARCH, "generated-corpus", "cycle2-rescore-2026-08-31",
        "cycle2-membership.json")))
    ai = []
    for line in open(os.path.join(RESEARCH, "generated-corpus",
                                  "cycle2-rescore-2026-08-31",
                                  "generated-fp32.jsonl")):
        r = json.loads(line)
        if not r.get("usable"):
            continue
        m = metrics.get(r["id"])
        if not m:
            continue
        ai.append({"id": r["id"], "seg_p": r["seg_p"],
                   "max_p": max(r["seg_p"]) if r["seg_p"] else 0.0,
                   "flag": pair_flag(r["seg_p"]),
                   "tells": tells(m), "model": r.get("model"),
                   "member": membership.get(r["id"])})
    hu = []
    for line in open(os.path.join(HERE, "human-fp32.jsonl")):
        r = json.loads(line)
        m = metrics.get(r["id"])
        if not m:
            continue
        hu.append({"id": r["id"], "seg_p": r["seg_p"],
                   "max_p": max(r["seg_p"]) if r["seg_p"] else 0.0,
                   "flag": pair_flag(r["seg_p"]),
                   "tells": tells(m), "register": r["register"],
                   "bucket": r["legal_bucket"],
                   "confidence": r["human_confidence"],
                   "source": r["source"]})
    return ai, hu


def escalates(d, band_lo, n_tells):
    return (not d["flag"] and band_lo <= d["max_p"] < PRIMARY
            and sum(d["tells"]) >= n_tells)


def price(ai, hu):
    base_ai = sum(1 for d in ai if d["flag"])
    base_hu = sum(1 for d in hu if d["flag"])
    rows = []
    for band in BANDS:
        for n in (1, 2, 3):
            a = sum(1 for d in ai if escalates(d, band, n))
            h = sum(1 for d in hu if escalates(d, band, n))
            rows.append({
                "band": f"{band}-{PRIMARY}", "tells": f">={n}",
                "ai_added": a, "human_fp_added": h,
                "detection": f"{(base_ai + a) / len(ai):.2%} "
                             f"({base_ai + a}/{len(ai)})",
                "human_fp": f"{(base_hu + h) / len(hu):.2%} "
                            f"({base_hu + h}/{len(hu)})",
            })
    return {"shipped_ai": f"{base_ai}/{len(ai)} = {base_ai/len(ai):.2%}",
            "shipped_human_fp": f"{base_hu}/{len(hu)} = {base_hu/len(hu):.2%}",
            "grid": rows}


def split_half(ai, hu, n_splits=200, seed=20260831):
    """Choose the operating point on the train half (max AI gain subject to
    human FP added <= 0.25pp), price it on the held-out half."""
    rng = random.Random(seed)
    gains, costs, chosen = [], [], []
    combos = [(b, n) for b in BANDS for n in (1, 2, 3)]
    for _ in range(n_splits):
        ai_idx = list(range(len(ai)))
        hu_idx = list(range(len(hu)))
        rng.shuffle(ai_idx)
        rng.shuffle(hu_idx)
        a_tr = [ai[i] for i in ai_idx[:len(ai) // 2]]
        a_te = [ai[i] for i in ai_idx[len(ai) // 2:]]
        h_tr = [hu[i] for i in hu_idx[:len(hu) // 2]]
        h_te = [hu[i] for i in hu_idx[len(hu) // 2:]]
        best, best_gain = None, -1
        for b, n in combos:
            g = sum(1 for d in a_tr if escalates(d, b, n)) / len(a_tr)
            c = sum(1 for d in h_tr if escalates(d, b, n)) / len(h_tr)
            if c <= 0.0025 and g > best_gain:
                best, best_gain = (b, n), g
        if best is None:
            best = (0.95, 3)
        b, n = best
        chosen.append(best)
        gains.append(sum(1 for d in a_te if escalates(d, b, n)) / len(a_te))
        costs.append(sum(1 for d in h_te if escalates(d, b, n)) / len(h_te))
    import statistics
    from collections import Counter
    return {
        "held_out_detection_gained_pp": {
            "mean": round(100 * statistics.mean(gains), 3),
            "sd": round(100 * statistics.stdev(gains), 3)},
        "held_out_fp_added_pp": {
            "mean": round(100 * statistics.mean(costs), 3),
            "sd": round(100 * statistics.stdev(costs), 3)},
        "chosen_operating_points": Counter(
            f"band{b}/tells>={n}" for b, n in chosen).most_common(4),
    }


def main():
    ai, hu = load()
    print(f"AI usable with scores+metrics: {len(ai)}; human: {len(hu)}")
    out = {"pricing": price(ai, hu)}

    # hash-independent AI subset (never in cycle2 training/cal/test)
    ai_ind = [d for d in ai if d["member"] is None]
    out["pricing_hash_independent_ai"] = price(ai_ind, hu)

    # per-register / bucket / confidence human cost at the headline point
    def hcost(sub, b, n):
        e = sum(1 for d in sub if escalates(d, b, n))
        f = sum(1 for d in sub if d["flag"])
        return {"n": len(sub), "shipped_fp": f, "escalation_added": e}
    for b, n in [(0.80, 2), (0.95, 1), (0.95, 2)]:
        key = f"human_cost_band{b}_ge{n}"
        out[key] = {
            "by_register": {r: hcost([d for d in hu if d["register"] == r], b, n)
                            for r in sorted({d["register"] for d in hu})},
            "by_bucket": {k: hcost([d for d in hu if d["bucket"] == k], b, n)
                          for k in ("GREEN", "AMBER")},
            "by_confidence": {k: hcost([d for d in hu if d["confidence"] == k], b, n)
                              for k in ("H1", "H2", "H3")},
        }
    out["split_half"] = split_half(ai, hu)
    out["split_half_hash_independent"] = split_half(ai_ind, hu)

    with open(os.path.join(HERE, "escalation-pricing.json"), "w") as f:
        json.dump(out, f, indent=1)

    p = out["pricing"]
    print("shipped:", p["shipped_ai"], "| human FP:", p["shipped_human_fp"])
    print(f"{'band':<14}{'tells':<7}{'AI+':>5}{'huFP+':>7}  detection -> human FP")
    for r in p["grid"]:
        print(f"{r['band']:<14}{r['tells']:<7}{r['ai_added']:>5}"
              f"{r['human_fp_added']:>7}  {r['detection']} -> {r['human_fp']}")
    print("\nhash-independent AI subset:")
    pi = out["pricing_hash_independent_ai"]
    print("shipped:", pi["shipped_ai"])
    for r in pi["grid"]:
        print(f"{r['band']:<14}{r['tells']:<7}{r['ai_added']:>5}"
              f"{r['human_fp_added']:>7}  {r['detection']}")
    print("\nsplit-half:", json.dumps(out["split_half"]))
    print("split-half (independent AI):", json.dumps(out["split_half_hash_independent"]))


if __name__ == "__main__":
    main()

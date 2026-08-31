"""Shape-tell escalation arm, priced like SYNTHETIC-CADENCE.md section 5.1.

Measurement and pricing ONLY: nothing here moves a threshold, deploys
anything, or changes policy.

Candidate rule: flag a document when the shipped pair (max seg_p >= 0.9855
OR second-highest >= 0.9763, segments-v3, fp32 route — asserted in
model-shrink/reference-server/app.py:287-288 and the website checkout
thresholds.json) does NOT flag it, its max segment probability sits in a
band below the primary, and N of the three strong shape tells fire:

  t_wpp   wpp_cv <= 0.2          16x lift   (DOCUMENT-TELLS-2026-08-31 addendum)
  t_sec15 sec_within15 >= 0.9    13.8x
  t_comp  composite scaffold     6.6x       (>=4 sections, mode >= 0.8, spp_cv <= 0.35)

Sides:
  AI    generated corpus, usable docs, shipped fp32 scores
        (generated-corpus/cycle2-rescore-2026-08-31/generated-fp32.jsonl,
        read-only) + structural metrics (human-structured-corpus-2026-08-31/
        new-human-per-doc.jsonl AI rows, read-only). Hash-independent subset
        from cycle2-membership.json (member is None = never in any cycle-2
        split).
  HUMAN structured human corpus 3,529 docs, scored through the identical
        shipped fp32 harness (snapshot inputs/human-fp32.jsonl in this
        directory; produced by human-structured-corpus-2026-08-31/
        score_fp32.py, which mirrors cycle2-rescore score.py — spot-verified
        here by re-scoring a sample through the harness, see verify_sample()).

Split-half cross-validation refits the TELL GATES as well as the (band, N)
choice on each training half — wpp_cv in {0.15,0.2,0.25,0.3}, sec15 in
{0.8,0.85,0.9,0.95} — then prices the chosen point on the held-out half.
The composite-scaffold definition is held fixed (its three parameters come
from DOCUMENT-TELLS; refitting them too would give the search 3 more free
axes than the precedent had).

Usage: python3 price_escalation.py            (full run)
       python3 price_escalation.py verify     (harness spot-check only)
Output: escalation-pricing.json + printed tables.
"""
import json
import os
import random
import statistics
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
HSC = os.path.join(RESEARCH, "human-structured-corpus-2026-08-31")
C2R = os.path.join(RESEARCH, "generated-corpus", "cycle2-rescore-2026-08-31")
sys.path.insert(0, os.path.join(RESEARCH, "document-tells-2026-08-31"))
from measure_scaffold_v2 import flag as scaffold_flag  # noqa: E402

PRIMARY, SECONDARY = 0.9855, 0.9763
BANDS = [0.80, 0.90, 0.95]
WPP_GATES = [0.15, 0.20, 0.25, 0.30]
SEC_GATES = [0.80, 0.85, 0.90, 0.95]
HUMAN_FP32 = os.path.join(HERE, "inputs", "human-fp32.jsonl")


def pair_flag(seg_p):
    if not seg_p:
        return False
    s = sorted(seg_p, reverse=True)
    return s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY)


def tells(m, wpp_gate=0.20, sec_gate=0.90):
    return [
        m.get("wpp_cv") is not None and m["wpp_cv"] <= wpp_gate,
        m.get("sec_within15") is not None and m["sec_within15"] >= sec_gate,
        bool(scaffold_flag(m)),
    ]


def load(surface="raw"):
    """surface='raw': scores from the corpora as banked (markdown intact).
    surface='stripped': scores from the markdown-stripped rescore (the
    plain-text paste surface); tells still come from the captured structure."""
    metrics = {}
    for line in open(os.path.join(HSC, "new-human-per-doc.jsonl")):
        r = json.loads(line)
        metrics[r["id"]] = r
    override = {}
    if surface == "stripped":
        for name in ("human-fp32-stripped.jsonl", "generated-fp32-stripped.jsonl"):
            for line in open(os.path.join(HERE, "inputs", name)):
                r = json.loads(line)
                override[r["id"]] = r["seg_p"]
    membership = json.load(open(os.path.join(C2R, "cycle2-membership.json")))
    ai = []
    for line in open(os.path.join(C2R, "generated-fp32.jsonl")):
        r = json.loads(line)
        if not r.get("usable"):
            continue
        m = metrics.get(r["id"])
        if not m:
            continue
        if surface == "stripped":
            r["seg_p"] = override[r["id"]]
        ai.append({"id": r["id"], "max_p": max(r["seg_p"]) if r["seg_p"] else 0.0,
                   "flag": pair_flag(r["seg_p"]), "metrics": m,
                   "tells": tells(m), "model": r.get("model"),
                   "register": r.get("register"),
                   "prompt_style": r.get("prompt_style"),
                   "member": membership.get(r["id"])})
    hu = []
    for line in open(HUMAN_FP32):
        r = json.loads(line)
        if surface == "stripped":
            r["seg_p"] = override[r["id"]]
        m = metrics.get(r["id"])
        if not m:
            continue
        hu.append({"id": r["id"], "max_p": max(r["seg_p"]) if r["seg_p"] else 0.0,
                   "flag": pair_flag(r["seg_p"]), "metrics": m,
                   "tells": tells(m), "register": r["register"],
                   "bucket": r["legal_bucket"],
                   "confidence": r["human_confidence"],
                   "n_headings": m.get("n_headings", 0),
                   "source": r["source"]})
    return ai, hu


def escalates(d, band_lo, n_tells, wpp_gate=None, sec_gate=None):
    if d["flag"] or not (band_lo <= d["max_p"] < PRIMARY):
        return False
    t = (d["tells"] if wpp_gate is None
         else tells(d["metrics"], wpp_gate, sec_gate))
    return sum(t) >= n_tells


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
                "detection": f"{(base_ai + a) / len(ai):.2%} ({base_ai + a}/{len(ai)})",
                "human_fp": f"{(base_hu + h) / len(hu):.2%} ({base_hu + h}/{len(hu)})",
            })
    return {"shipped_ai": f"{base_ai}/{len(ai)} = {base_ai / len(ai):.2%}",
            "shipped_human_fp": f"{base_hu}/{len(hu)} = {base_hu / len(hu):.2%}",
            "grid": rows}


def split_half(ai, hu, fp_budget_pp=0.25, n_splits=200, seed=20260831,
               refit_gates=True):
    """Choose band, N and (optionally) the wpp/sec15 gates on the train half
    — max AI gain subject to human FP added <= fp_budget_pp — then price the
    choice on the held-out half."""
    rng = random.Random(seed)
    gate_combos = ([(w, s) for w in WPP_GATES for s in SEC_GATES]
                   if refit_gates else [(0.20, 0.90)])
    # Precompute tell counts per doc per gate combo (scaffold is gate-free).
    for pop in (ai, hu):
        for d in pop:
            d["tc"] = {}
            in_band = (not d["flag"]) and d["max_p"] < PRIMARY
            d["band_ok"] = in_band
            for g in gate_combos:
                d["tc"][g] = sum(tells(d["metrics"], *g)) if in_band else -1
    combos = [(b, n, g) for b in BANDS for n in (1, 2, 3) for g in gate_combos]

    def esc(d, b, n, g):
        return d["band_ok"] and d["max_p"] >= b and d["tc"][g] >= n

    gains, costs, chosen = [], [], []
    budget = fp_budget_pp / 100.0
    for _ in range(n_splits):
        ai_idx = list(range(len(ai)))
        hu_idx = list(range(len(hu)))
        rng.shuffle(ai_idx)
        rng.shuffle(hu_idx)
        a_tr = [ai[i] for i in ai_idx[:len(ai) // 2]]
        a_te = [ai[i] for i in ai_idx[len(ai) // 2:]]
        h_tr = [hu[i] for i in hu_idx[:len(hu) // 2]]
        h_te = [hu[i] for i in hu_idx[len(hu) // 2:]]
        best, best_gain = None, -1.0
        for b, n, g in combos:
            c = sum(1 for d in h_tr if esc(d, b, n, g)) / len(h_tr)
            if c > budget:
                continue
            gn = sum(1 for d in a_tr if esc(d, b, n, g)) / len(a_tr)
            if gn > best_gain:
                best, best_gain = (b, n, g), gn
        if best is None:
            best = (0.95, 3, gate_combos[0])
        b, n, g = best
        chosen.append(f"band{b}/tells>={n}/wpp{g[0]}/sec{g[1]}")
        gains.append(sum(1 for d in a_te if esc(d, b, n, g)) / len(a_te))
        costs.append(sum(1 for d in h_te if esc(d, b, n, g)) / len(h_te))

    def pct(vals, q):
        v = sorted(vals)
        return v[min(len(v) - 1, int(q * len(v)))]
    return {
        "fp_budget_pp_train": fp_budget_pp,
        "gates_refit": refit_gates,
        "held_out_detection_gained_pp": {
            "mean": round(100 * statistics.mean(gains), 3),
            "sd": round(100 * statistics.stdev(gains), 3),
            "p2.5": round(100 * pct(gains, 0.025), 3),
            "p97.5": round(100 * pct(gains, 0.975), 3)},
        "held_out_fp_added_pp": {
            "mean": round(100 * statistics.mean(costs), 3),
            "sd": round(100 * statistics.stdev(costs), 3),
            "p2.5": round(100 * pct(costs, 0.025), 3),
            "p97.5": round(100 * pct(costs, 0.975), 3)},
        "chosen_operating_points": Counter(chosen).most_common(5),
    }


def hcost(sub, b, n):
    e = sum(1 for d in sub if escalates(d, b, n))
    f = sum(1 for d in sub if d["flag"])
    return {"n": len(sub), "shipped_fp": f, "escalation_added": e,
            "total_rate": f"{(f + e) / len(sub):.2%}" if sub else None}


def verify_sample(k=6, seed=7):
    """Re-score a random sample of the human corpus through the harness and
    compare against the snapshot, so the reused scores are trusted on
    evidence rather than provenance."""
    _cwd = os.getcwd()
    sys.path.insert(0, os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
    os.chdir(os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
    import harness
    os.chdir(_cwd)
    snap = {}
    for line in open(HUMAN_FP32):
        r = json.loads(line)
        snap[r["id"]] = r["seg_p"]
    texts = {}
    for line in open(os.path.join(HSC, "corpus.jsonl")):
        r = json.loads(line)
        if r["id"] in snap:
            texts[r["id"]] = r["text"]
    ids = sorted(snap)
    random.Random(seed).shuffle(ids)
    worst = 0.0
    for i in ids[:k]:
        parts = harness.segment_text(texts[i], harness.count_tokens)
        probs = []
        for j in range(0, len(parts), 16):
            probs.extend(harness.score_batch([p.text for p in parts[j:j + 16]]))
        assert len(probs) == len(snap[i]), (i, len(probs), len(snap[i]))
        for a, b in zip(probs, snap[i]):
            worst = max(worst, abs(a - b))
    print(f"verify_sample: {k} docs re-scored, max |delta seg_p| = {worst:.2e}")
    assert worst < 1e-6, "snapshot does not match the shipped harness"
    return worst


def main(surface="raw"):
    ai, hu = load(surface)
    print(f"surface={surface}; AI usable with scores+metrics: {len(ai)}; human: {len(hu)}")
    out = {"surface": surface,
           "populations": {"ai": len(ai), "human": len(hu)},
           "pricing": price(ai, hu)}

    ai_ind = [d for d in ai if d["member"] is None]
    out["populations"]["ai_hash_independent"] = len(ai_ind)
    out["pricing_hash_independent_ai"] = price(ai_ind, hu)

    hardneg = [d for d in hu if "faq" in d["register"] or d["n_headings"] >= 5]
    for b, n in [(0.80, 2), (0.90, 2), (0.95, 1), (0.95, 2), (0.80, 3)]:
        key = f"human_cost_band{b}_ge{n}"
        out[key] = {
            "by_register": {r: hcost([d for d in hu if d["register"] == r], b, n)
                            for r in sorted({d["register"] for d in hu})},
            "hard_negatives_faq_or_5plus_headings": hcost(hardneg, b, n),
            "by_bucket": {k: hcost([d for d in hu if d["bucket"] == k], b, n)
                          for k in ("GREEN", "AMBER")},
            "by_confidence": {k: hcost([d for d in hu if d["confidence"] == k], b, n)
                              for k in ("H1", "H2", "H3")},
        }
        # who are the escalated AI docs / human FPs at this point
        out[key]["ai_gained_by_model"] = Counter(
            d["model"] for d in ai if escalates(d, b, n)).most_common()
        out[key]["ai_gained_by_prompt_style"] = Counter(
            d["prompt_style"] for d in ai if escalates(d, b, n)).most_common()
        out[key]["human_fp_ids"] = [d["id"] for d in hu if escalates(d, b, n)]

    out["split_half_budget0.25pp"] = split_half(ai, hu, 0.25)
    out["split_half_budget0.10pp"] = split_half(ai, hu, 0.10)
    out["split_half_fixed_gates_budget0.25pp"] = split_half(
        ai, hu, 0.25, refit_gates=False)
    out["split_half_hash_independent_budget0.25pp"] = split_half(ai_ind, hu, 0.25)

    suffix = "" if surface == "raw" else f"-{surface}"
    with open(os.path.join(HERE, f"escalation-pricing{suffix}.json"), "w") as f:
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
    for k in ("split_half_budget0.25pp", "split_half_budget0.10pp",
              "split_half_fixed_gates_budget0.25pp",
              "split_half_hash_independent_budget0.25pp"):
        print(f"\n{k}:", json.dumps(out[k]))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        verify_sample()
    elif len(sys.argv) > 1 and sys.argv[1] == "stripped":
        main("stripped")
    else:
        main()

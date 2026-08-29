"""Per-rule validation of all 113 en-signals categories.

Stage 2. Consumes data/fire-{raw,stripped}.jsonl (produced by extract.mjs
against the shipped packages/core dist) and data/engine-config.json, and
writes rule-stats.json plus the tables used in RULE-VALIDATION.md.

Nothing here modifies the engine. All numbers are measured on the
provider-eval set: 1,727 AI samples (39 models, 12 provider-era slices) and
169 verified human samples. The human side is small; every human-side
statistic carries a confidence interval for that reason.
"""
import json, math, pathlib, collections, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from stats import fisher_exact_two_sided, wilson, risk_ratio_ci, benjamini_hochberg
from verify_reconstruction import score_from_counts

HERE = pathlib.Path(__file__).resolve().parent.parent
CFG = json.load(open(HERE / "data" / "engine-config.json"))
W = CFG["weights"]
CATS = sorted(W)
STYLO = set(CFG["stylometric"]) | set(CFG["v4Rhythm"])
CORROB = set(CFG["corroboration"]) | set(CFG["v4Rhythm"])
ERA = CFG["era"]

def load(name):
    return [json.loads(l) for l in open(HERE / "data" / name)]

VIEWS = {"raw": load("fire-raw.jsonl"), "stripped": load("fire-stripped.jsonl")}
AI = {v: [r for r in rows if r["side"] == "ai"] for v, rows in VIEWS.items()}
HU = {v: [r for r in rows if r["side"] == "human"] for v, rows in VIEWS.items()}
N_AI = len(AI["raw"]); N_HU = len(HU["raw"])
BASE = N_AI / (N_AI + N_HU)

# ── 1-2. Firing, precision, lift, significance ───────────────────────────
def fired(r, cat):
    return r["catCounts"].get(cat, 0) > 0

per_rule = {c: {} for c in CATS}
for view in VIEWS:
    pv = []
    rows = []
    for c in CATS:
        a = sum(fired(r, c) for r in AI[view])
        h = sum(fired(r, c) for r in HU[view])
        tot = a + h
        prec = a / tot if tot else None
        p = fisher_exact_two_sided(a, N_AI - a, h, N_HU - h)
        pv.append(p)
        rows.append((c, a, h, tot, prec, p))
    qs = benjamini_hochberg(pv)
    for (c, a, h, tot, prec, p), q in zip(rows, qs):
        lr, lr_lo, lr_hi = risk_ratio_ci(a, N_AI, h, N_HU)
        pl, ph = wilson(a, tot) if tot else (None, None)
        ai_lo, ai_hi = wilson(a, N_AI)
        hu_lo, hu_hi = wilson(h, N_HU)
        per_rule[c][view] = {
            "ai_fired": a, "ai_n": N_AI, "ai_rate": a / N_AI,
            "ai_rate_ci95": [ai_lo, ai_hi],
            "human_fired": h, "human_n": N_HU, "human_rate": h / N_HU,
            "human_rate_ci95": [hu_lo, hu_hi],
            "fired_total": tot,
            "precision": prec, "precision_ci95": [pl, ph],
            "lift_over_base": (prec / BASE) if prec is not None else None,
            "likelihood_ratio": lr, "lr_ci95": [lr_lo, lr_hi],
            "fisher_p": p, "bh_q": q,
            "significant_bh05": bool(q < 0.05),
            "dead": tot == 0,
            "harmful": (h / N_HU) > (a / N_AI) and tot > 0,
        }

# ── 4. Per-provider / per-era firing (AI side) ───────────────────────────
providers = sorted({r["provider"] for r in AI["raw"]})
eras = sorted({r["era"] for r in AI["raw"]})
slices_ = sorted({(r["provider"], r["era"]) for r in AI["raw"]})
prov_n = collections.Counter(r["provider"] for r in AI["raw"])
era_n = collections.Counter(r["era"] for r in AI["raw"])
slice_n = collections.Counter((r["provider"], r["era"]) for r in AI["raw"])

for c in CATS:
    for view in VIEWS:
        pr = {p: 0 for p in providers}
        er = {e: 0 for e in eras}
        sl = collections.Counter()
        for r in AI[view]:
            if fired(r, c):
                pr[r["provider"]] += 1
                er[r["era"]] += 1
                sl[(r["provider"], r["era"])] += 1
        per_rule[c][view]["by_provider"] = {
            p: {"fired": pr[p], "n": prov_n[p], "rate": pr[p] / prov_n[p]} for p in providers}
        per_rule[c][view]["by_era"] = {
            e: {"fired": er[e], "n": era_n[e], "rate": er[e] / era_n[e]} for e in eras}
        per_rule[c][view]["by_slice"] = {
            f"{p}|{e}": {"fired": sl[(p, e)], "n": slice_n[(p, e)], "rate": sl[(p, e)] / slice_n[(p, e)]}
            for (p, e) in slices_}
        # vendor concentration: share of all AI firings from the single top provider,
        # normalised for slice size (rate-based Herfindahl-style concentration)
        rates = [pr[p] / prov_n[p] for p in providers]
        s = sum(rates)
        per_rule[c][view]["provider_concentration"] = (max(rates) / s) if s else None

# ── 5. Human-genre firing ────────────────────────────────────────────────
genres = sorted({r["genre"] or "unlabelled" for r in HU["raw"]})
genre_n = collections.Counter((r["genre"] or "unlabelled") for r in HU["raw"])
for c in CATS:
    for view in VIEWS:
        g = collections.Counter()
        for r in HU[view]:
            if fired(r, c):
                g[r["genre"] or "unlabelled"] += 1
        per_rule[c][view]["by_human_genre"] = {
            gn: {"fired": g[gn], "n": genre_n[gn], "rate": g[gn] / genre_n[gn]} for gn in genres}

# ── 3. Redundancy: pairwise conditional overlap ──────────────────────────
redundancy = {}
for view in VIEWS:
    rows = VIEWS[view]
    fire_sets = {c: {r["id"] for r in rows if fired(r, c)} for c in CATS}
    out = {}
    for c in CATS:
        A = fire_sets[c]
        if len(A) < 20:
            out[c] = {"note": "too few firings (<20) to assess redundancy", "partners": []}
            continue
        partners = []
        for d in CATS:
            if d == c:
                continue
            B = fire_sets[d]
            if not B:
                continue
            cond = len(A & B) / len(A)      # P(D fires | C fires)
            if cond >= 0.8:
                jac = len(A & B) / len(A | B)
                marg = len(B) / len(rows)    # P(D fires) over all samples
                partners.append({"partner": d, "p_partner_given_rule": cond,
                                 "jaccard": jac, "partner_firings": len(B),
                                 "p_partner_marginal": marg,
                                 # a rule that fires on 80% of everything is a
                                 # "partner" of every rule; the lift separates
                                 # genuine redundancy from that base-rate trap
                                 "overlap_lift": (cond / marg) if marg else None})
        partners.sort(key=lambda x: -x["p_partner_given_rule"])
        out[c] = {"partners": partners}
    redundancy[view] = out

# ── 6. Leave-one-out ablation at a fixed false-positive point ────────────
def scores(view, drop=None, weights=W):
    ai = [score_from_counts(r["catCounts"], r["wordCount"], weights, drop) for r in AI[view]]
    hu = [score_from_counts(r["catCounts"], r["wordCount"], weights, drop) for r in HU[view]]
    return ai, hu

def tpr_at_fp(ai, hu, fp_budget):
    """Lowest integer threshold whose human FPR <= fp_budget; returns (thr, tpr, fpr)."""
    allowed = math.floor(fp_budget * len(hu) + 1e-9)
    hus = sorted(hu, reverse=True)
    # threshold t: flag if score >= t
    best = None
    for t in range(0, 102):
        fp = sum(1 for s in hus if s >= t)
        if fp <= allowed:
            best = t
            break
    tp = sum(1 for s in ai if s >= best)
    fp = sum(1 for s in hu if s >= best)
    return best, tp / len(ai), fp / len(hu)

FP_POINTS = [0.01, 0.05, 0.10]
ablation = {}
fixed_thr = {}
baseline = {}
for view in VIEWS:
    ai0, hu0 = scores(view)
    baseline[view] = {f"fp{int(fp*100)}": dict(zip(("threshold", "tpr", "fpr"), tpr_at_fp(ai0, hu0, fp)))
                      for fp in FP_POINTS}
    ablation[view] = {}
    for c in CATS:
        ai1, hu1 = scores(view, drop=c)
        entry = {}
        for fp in FP_POINTS:
            t, tpr, fpr = tpr_at_fp(ai1, hu1, fp)
            b = baseline[view][f"fp{int(fp*100)}"]
            entry[f"fp{int(fp*100)}"] = {
                "threshold": t, "tpr": tpr, "fpr": fpr,
                "delta_tpr_pp": (tpr - b["tpr"]) * 100,
            }
            # Same measurement with the THRESHOLD HELD FIXED at the baseline
            # value. Re-tuning the threshold after a removal makes the delta
            # jump in integer steps and can even show a "harmful" rule as
            # contributing; the fixed-threshold delta isolates the rule's own
            # effect and is reported alongside.
            tf = b["threshold"]
            tpr_f = sum(1 for s_ in ai1 if s_ >= tf) / len(ai1)
            fpr_f = sum(1 for s_ in hu1 if s_ >= tf) / len(hu1)
            entry[f"fp{int(fp*100)}"]["fixed_threshold"] = {
                "threshold": tf, "tpr": tpr_f, "fpr": fpr_f,
                "delta_tpr_pp": (tpr_f - b["tpr"]) * 100,
                "delta_fpr_pp": (fpr_f - b["fpr"]) * 100,
            }
        ablation[view][c] = entry

for c in CATS:
    for view in VIEWS:
        per_rule[c][view]["ablation"] = ablation[view][c]
        per_rule[c][view]["redundancy"] = redundancy[view][c]

# ── Derived risk flags: vendor skew and human-genre concentration ────────
for c in CATS:
    for view in VIEWS:
        d_ = per_rule[c][view]
        rates = {p_: v["rate"] for p_, v in d_["by_provider"].items()}
        mx, mn = max(rates.values()), min(rates.values())
        d_["vendor_skew"] = {
            "top_provider": max(rates, key=rates.get), "top_rate": mx,
            "bottom_provider": min(rates, key=rates.get), "bottom_rate": mn,
            "ratio": (mx / mn) if mn > 0 else None,
            "single_vendor_risk": bool(d_["ai_rate"] >= 0.03 and (mn == 0 or mx / mn >= 3)),
        }
        g = d_["by_human_genre"]
        hits = {k: v for k, v in g.items() if v["fired"] > 0}
        worst = max(hits, key=lambda k: hits[k]["rate"]) if hits else None
        d_["genre_risk"] = {
            "human_firings": sum(v["fired"] for v in g.values()),
            "worst_genre": worst,
            "worst_genre_rate": g[worst]["rate"] if worst else 0.0,
            "worst_genre_fired": g[worst]["fired"] if worst else 0,
            "worst_genre_n": g[worst]["n"] if worst else 0,
            "business_marketing_fired": g["business-marketing"]["fired"],
            "business_marketing_n": g["business-marketing"]["n"],
            # 10 business-marketing humans total. One extra hit moves this by
            # 10 percentage points, so treat it as a flag, never as a rate.
            "flag": bool(g["business-marketing"]["fired"] >= 2
                         or (worst is not None and g[worst]["rate"] >= 0.25 and g[worst]["fired"] >= 2)),
        }

# ── Liveness probes for zero-firing rules ────────────────────────────────
LIVE = json.load(open(HERE / "data" / "liveness.json"))
HEAD = json.load(open(HERE / "data" / "v4-headroom.json"))
for c in CATS:
    per_rule[c]["liveness"] = LIVE.get(c)

# ── 7. Weight audit ──────────────────────────────────────────────────────
# Evidence-based weight proposal. The shipped weights were inherited from the
# upstream avoid-ai-writing project and from editorial judgement; they were
# never fitted to this corpus. We map the CONSERVATIVE (lower 95% bound)
# measured likelihood ratio to a weight on the shipped 1-15 scale:
#     proposed = clamp(round(k * log2(max(LR_lo, 1))), 0, 15)
# k is fitted by least squares against the shipped weights of the rules that
# ARE statistically supported, so the overall score scale is preserved.
sup = [c for c in CATS if per_rule[c]["raw"]["significant_bh05"]
       and per_rule[c]["raw"]["lr_ci95"][0] > 1]
num = sum(W[c] * math.log2(per_rule[c]["raw"]["lr_ci95"][0]) for c in sup)
den = sum(math.log2(per_rule[c]["raw"]["lr_ci95"][0]) ** 2 for c in sup)
K = num / den if den else 1.0

for c in CATS:
    r = per_rule[c]["raw"]
    lr_lo = r["lr_ci95"][0]
    central = None
    if r["dead"]:
        proposed, basis = None, "dead — never fires; weight is untestable"
    elif r["harmful"]:
        proposed, basis = 0, "fires more on humans than AI in this corpus"
    elif r["human_fired"] == 0:
        # With zero human firings the lower bound on the likelihood ratio is set
        # by the Haldane smoothing and by n=169, not by the rule. Proposing a
        # number here would be inventing one. These rules keep their shipped
        # weight until a larger human corpus can price them.
        proposed = None
        basis = ("0 human firings: this corpus cannot bound the weight — the 95% "
                 "ceiling on the human rate is ~1.8% whatever the rule does. Keep as shipped.")
    elif not r["significant_bh05"]:
        proposed, basis = None, "not statistically distinguishable from chance at n=169 humans"
    else:
        proposed = max(1, min(15, round(K * math.log2(max(lr_lo, 1.0)))))
        central = max(1, min(15, round(K * math.log2(max(r["likelihood_ratio"], 1.0)))))
        basis = "fitted from the measured likelihood ratio (conservative = lower 95% bound)"
    per_rule[c]["weight_audit"] = {
        "shipped_weight": W[c],
        "proposed_weight": proposed,
        "proposed_weight_central": central,
        "delta": (proposed - W[c]) if proposed is not None else None,
        "basis": basis,
        "lr_lower95": lr_lo,
        "k_scale": K,
        "human_side_ceiling_note": (
            "0 human firings: the likelihood ratio is a lower bound only — "
            "with 169 humans this corpus cannot separate a weight of 6 from 15"
            if r["human_fired"] == 0 else None),
    }

# ── Action classification (deterministic, from the measurements above) ───
ART = set(CFG["artefactCore"]) | set(CFG["artefactSupport"])
UNREACHABLE = {"mic-drop-paragraph", "contrast-density", "punchline-fragment-density"}
for c in CATS:
    r, sv = per_rule[c]["raw"], per_rule[c]["stripped"]
    dead_both = r["dead"] and sv["dead"]
    live = (per_rule[c]["liveness"] or {}).get("fired")
    red = r["redundancy"].get("partners") or []
    contrib = r["ablation"]["fp5"]["fixed_threshold"]["delta_tpr_pp"]
    # A redundant PAIR only justifies demoting the weaker member. Demoting the
    # stronger one throws away the evidence the pair shares.
    def _contrib(x):
        return per_rule[x]["raw"]["ablation"]["fp5"]["fixed_threshold"]["delta_tpr_pp"]
    # For the ACTION we require true near-duplication (Jaccard >= 0.6), not just
    # conditional overlap: a rule that fires on two thirds of all samples is a
    # >=0.8 "partner" of almost every other rule without being redundant with it.
    # The full conditional-overlap list is still reported, as commissioned.
    red_dominant = [x for x in red
                    if _contrib(x["partner"]) < contrib and x["jaccard"] >= 0.6]
    if dead_both and c in ART:
        action, why = "KEEP (forensic insurance)", "artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved."
    elif dead_both and c in UNREACHABLE:
        action, why = "FIX OR REMOVE", "threshold is unreachable: the corpus maximum never reaches the gate."
    elif dead_both and live is True:
        action, why = "DEMOTE (dormant)", "the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns."
    elif dead_both:
        action, why = "REVIEW", "never fired and no probe was built; reachability unproven."
    elif r["harmful"] or sv["harmful"]:
        action, why = "REMOVE OR DEMOTE (harmful)", "fires at a higher rate on the human corpus than on the AI corpus in at least one view."
    elif red_dominant and not r["significant_bh05"]:
        action, why = "DEMOTE (redundant + unsupported)", "almost always co-fires with another rule and is not significant after multiple-comparison correction."
    elif red_dominant:
        action, why = ("DEMOTE (redundant)",
                       "fires almost only when %s also fires, and %s contributes more; the shared evidence is counted twice."
                       % (red_dominant[0]["partner"], red_dominant[0]["partner"]))
    elif not r["significant_bh05"]:
        action, why = "DEMOTE (unsupported)", "not distinguishable from chance at this human sample size after Benjamini-Hochberg correction."
    elif contrib <= -0.5:
        action, why = "KEEP", "statistically supported and measurably contributes to detection."
    else:
        action, why = "KEEP (low contribution)", "statistically supported but removing it barely moves detection."
    wa = per_rule[c]["weight_audit"]
    if action.startswith("KEEP") and wa["proposed_weight"] is not None and abs(wa["delta"] or 0) >= 2:
        action = "REWEIGHT"
        why += f" Measured evidence supports {wa['proposed_weight']} rather than the shipped {wa['shipped_weight']}."
    per_rule[c]["action"] = {"action": action, "rationale": why,
                             "redundant_with_stronger": [x["partner"] for x in red_dominant],
                             "contribution_pp_fp5_raw_fixed": contrib,
                             "corroboration_only_today": c in CORROB}

# ── assemble ─────────────────────────────────────────────────────────────
out = {
    "meta": {
        "generated_from": "packages/core dist (shipped), provider-eval/eval-set.jsonl + stripped-eval/stripped-set.jsonl",
        "n_ai": N_AI, "n_human": N_HU, "base_rate_ai": BASE,
        "n_categories": len(CATS),
        "human_corpus_caveat": (
            "The human side is 169 texts: 97 HC3 question answers, 32 Wikipedia "
            "articles and only 40 fresh published prose samples, of which 10 are "
            "business-marketing. Every genre-level statistic here rests on "
            "single-digit or low-double-digit counts and must be read as "
            "indicative, not conclusive."),
        "weights_provenance": (
            "Shipped weights were inherited from the upstream avoid-ai-writing "
            "project and from editorial judgement. They were NOT fitted to this "
            "corpus. Proposed weights below are the first data-driven estimate."),
        "fp_points": FP_POINTS,
        "baseline": baseline,
        "genre_counts": dict(genre_n),
        "provider_counts": dict(prov_n),
        "era_counts": dict(era_n),
        "weight_scale_k": K,
        "v4_threshold_headroom": HEAD,
    },
    "rules": per_rule,
}
json.dump(out, open(HERE / "rule-stats.json", "w"), indent=1)
print(f"wrote rule-stats.json — {len(CATS)} rules")
print("baseline:", json.dumps(baseline, indent=1))

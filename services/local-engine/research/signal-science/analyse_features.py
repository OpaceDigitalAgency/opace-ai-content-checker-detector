"""Part 1: what separates AI from human writing, measured.

For every feature in the battery:
  * Cliff's delta          — non-parametric effect size, the honest one here
                             because almost none of these distributions are
                             normal and several are zero-inflated
  * Cohen's d              — reported for comparability with the literature
  * Mann-Whitney U p       — two-sided, with Benjamini-Hochberg FDR at q=0.05
                             across the whole battery
  * AUROC                  — single-feature ranking power
  * TPR@1% FPR, TPR@5% FPR — single-feature detection at a fixed false-positive
                             budget, which is the number that matters for a
                             tool that must not smear human writers

Then the same, broken down by register family, provider, era, model tier and
prompt style, so a signal that only works on one vendor or dies under
"write like a human" prompting is visible as such.

A length-matched replication is run as well: many of these features covary with
document length, and the AI and human halves of the corpus do not have the same
length distribution. Any signal whose effect collapses under length matching was
measuring length.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
from collections import defaultdict

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
FEATS = os.path.join(HERE, "corpus", "features.jsonl")
RESULTS = os.path.join(HERE, "results")
TABLES = os.path.join(HERE, "tables")


def load(exclude_background=True):
    rows = []
    for line in open(FEATS, encoding="utf-8"):
        r = json.loads(line)
        if exclude_background and r.get("background"):
            continue
        rows.append(r)
    return rows


# --- statistics ------------------------------------------------------------

def cliffs_delta(a, b):
    """P(a > b) - P(a < b), computed by rank sum rather than the O(nm) pairwise
    loop. Bounded [-1, 1]; 0.11/0.28/0.43 are the conventional small/medium/
    large cuts (Romano et al. 2006)."""
    na, nb = len(a), len(b)
    if na == 0 or nb == 0:
        return float("nan")
    allv = np.concatenate([a, b])
    r = stats.rankdata(allv)
    ra = r[:na].sum()
    u = ra - na * (na + 1) / 2.0          # Mann-Whitney U for a
    return 2.0 * u / (na * nb) - 1.0


def cohens_d(a, b):
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return float("nan")
    va, vb = a.var(ddof=1), b.var(ddof=1)
    s = math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2))
    return (a.mean() - b.mean()) / s if s > 0 else 0.0


def auroc(ai, hu):
    na, nb = len(ai), len(hu)
    if na == 0 or nb == 0:
        return float("nan")
    r = stats.rankdata(np.concatenate([ai, hu]))
    return (r[:na].sum() - na * (na + 1) / 2.0) / (na * nb)


def tpr_at_fpr(ai, hu, budget):
    """Single-feature detection at a fixed human false-positive budget.
    The threshold is set on the human distribution alone — the discipline the
    project's own operating point uses — and the direction is whichever way
    round makes the feature a detector."""
    if len(ai) == 0 or len(hu) == 0:
        return float("nan"), float("nan")
    hi = np.quantile(hu, 1 - budget)
    lo = np.quantile(hu, budget)
    up = float((ai > hi).mean())
    dn = float((ai < lo).mean())
    return (up, "high") if up >= dn else (dn, "low")


def bh_fdr(pvals, q=0.05):
    p = np.asarray(pvals, dtype=float)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order]
    crit = q * (np.arange(1, n + 1) / n)
    passed = ranked <= crit
    kmax = np.max(np.nonzero(passed)[0]) + 1 if passed.any() else 0
    sig = np.zeros(n, dtype=bool)
    if kmax:
        sig[order[:kmax]] = True
    # BH-adjusted p-values (step-up monotone)
    adj = np.empty(n)
    running = 1.0
    for i in range(n - 1, -1, -1):
        running = min(running, ranked[i] * n / (i + 1))
        adj[order[i]] = running
    return sig, adj


def matrix(rows, keys):
    return {k: np.array([r["f"].get(k, np.nan) for r in rows], dtype=float) for k in keys}


def compare(rows_ai, rows_hu, keys, min_n=40):
    out = {}
    for k in keys:
        a = np.array([r["f"].get(k) for r in rows_ai], dtype=float)
        h = np.array([r["f"].get(k) for r in rows_hu], dtype=float)
        a = a[np.isfinite(a)]
        h = h[np.isfinite(h)]
        if len(a) < min_n or len(h) < min_n:
            continue
        if np.allclose(a.std(), 0) and np.allclose(h.std(), 0):
            continue
        try:
            u = stats.mannwhitneyu(a, h, alternative="two-sided")
            p = float(u.pvalue)
        except ValueError:
            p = 1.0
        au = auroc(a, h)
        # Orient by the overall ordering, not by whichever tail happens to be
        # fatter at the 1% cut: with a near-zero-inflated feature both tails can
        # read ~0 and the tail rule then flips the label.
        direction = "high" if au >= 0.5 else "low"
        t = float((a > np.quantile(h, 0.99)).mean()) if au >= 0.5 \
            else float((a < np.quantile(h, 0.01)).mean())
        t5 = float((a > np.quantile(h, 0.95)).mean()) if au >= 0.5 \
            else float((a < np.quantile(h, 0.05)).mean())
        out[k] = {
            "n_ai": int(len(a)), "n_human": int(len(h)),
            "median_ai": float(np.median(a)), "median_human": float(np.median(h)),
            "mean_ai": float(a.mean()), "mean_human": float(h.mean()),
            "cliffs_delta": float(cliffs_delta(a, h)),
            "cohens_d": float(cohens_d(a, h)),
            "auroc": float(au),
            "p_raw": p,
            "tpr_at_1pc_fpr": float(t), "tpr_at_5pc_fpr": float(t5),
            "direction": direction,
        }
    if out:
        ks = list(out)
        sig, adj = bh_fdr([out[k]["p_raw"] for k in ks])
        for k, s, ap in zip(ks, sig, adj):
            out[k]["p_bh_adjusted"] = float(ap)
            out[k]["significant_bh_q05"] = bool(s)
    return out


def length_matched(rows_ai, rows_hu, seed=7):
    """Match on log word count in 0.1-dex bins, 1:1, so the two halves have
    near-identical length distributions."""
    rng = random.Random(seed)
    bins_a, bins_h = defaultdict(list), defaultdict(list)
    for r in rows_ai:
        bins_a[round(math.log10(max(r["words"], 1)), 1)].append(r)
    for r in rows_hu:
        bins_h[round(math.log10(max(r["words"], 1)), 1)].append(r)
    A, H = [], []
    for b in set(bins_a) & set(bins_h):
        k = min(len(bins_a[b]), len(bins_h[b]))
        A += rng.sample(bins_a[b], k)
        H += rng.sample(bins_h[b], k)
    return A, H


def register_matched(rows_ai, rows_hu, seed=11):
    """1:1 match on register family AND log-length bin.

    The pooled AI and human halves do not share a register mix — the AI side
    carries 2,132 social posts, the human side does not. Any pooled statistic
    is therefore partly measuring register. This matching removes that, and it
    is the comparison every headline figure in SIGNAL-SCIENCE.md uses."""
    rng = random.Random(seed)
    ba, bh = defaultdict(list), defaultdict(list)
    for r in rows_ai:
        ba[(r["register_family"], round(math.log10(max(r["words"], 1)), 1))].append(r)
    for r in rows_hu:
        bh[(r["register_family"], round(math.log10(max(r["words"], 1)), 1))].append(r)
    A, H = [], []
    for b in set(ba) & set(bh):
        k = min(len(ba[b]), len(bh[b]))
        A += rng.sample(ba[b], k)
        H += rng.sample(bh[b], k)
    return A, H


def main() -> None:
    os.makedirs(RESULTS, exist_ok=True)
    os.makedirs(TABLES, exist_ok=True)
    rows = load()
    keys = sorted({k for r in rows[:200] for k in r["f"]})
    keys = [k for k in keys if k != "n_words"]
    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    print(f"{len(rows)} docs analysed ({len(ai)} AI / {len(hu)} human), "
          f"{len(keys)} features", flush=True)

    res = {"n_ai": len(ai), "n_human": len(hu), "n_features": len(keys)}
    res["overall"] = compare(ai, hu, keys)

    # never-seen-in-training subset: the honest headline
    ai_ns = [r for r in ai if not r.get("seen_in_training")]
    hu_ns = [r for r in hu if not r.get("seen_in_training")]
    res["never_seen_in_training"] = compare(ai_ns, hu_ns, keys)
    res["n_ai_never_seen"], res["n_human_never_seen"] = len(ai_ns), len(hu_ns)

    # length-matched replication
    A, H = length_matched(ai, hu)
    res["length_matched"] = compare(A, H, keys)
    res["n_length_matched_pairs"] = len(A)
    print(f"length-matched: {len(A)} AI / {len(H)} human", flush=True)

    # register + length matched: the headline comparison
    RA, RH = register_matched(ai, hu)
    res["register_and_length_matched"] = compare(RA, RH, keys)
    res["n_register_matched_pairs"] = len(RA)
    print(f"register+length matched: {len(RA)} AI / {len(RH)} human", flush=True)

    # fresh long-form only: never seen by any model, the registers that matter
    fa = [r for r in ai if r["pool"] == "ai-longform"]
    fh = [r for r in hu if r["pool"] == "human-longform"]
    res["fresh_longform"] = compare(fa, fh, keys)
    res["n_fresh_ai"], res["n_fresh_human"] = len(fa), len(fh)
    FA, FH = register_matched(fa, fh, seed=13)
    res["fresh_longform_register_matched"] = compare(FA, FH, keys)
    res["n_fresh_matched_pairs"] = len(FA)
    print(f"fresh long-form: {len(fa)} AI / {len(fh)} human; "
          f"matched {len(FA)} pairs", flush=True)

    # --- breakdowns --------------------------------------------------------
    top = sorted(res["register_and_length_matched"],
                 key=lambda k: -abs(res["register_and_length_matched"][k]["cliffs_delta"]))[:30]
    res["top30_by_effect"] = top

    def breakdown(field, side_filter=None, human_pool=None):
        """Split the AI side by `field`, always against the same human pool, so
        the comparison across levels is like-for-like."""
        h = human_pool if human_pool is not None else hu
        groups = defaultdict(list)
        for r in ai:
            v = r.get(field)
            if v:
                groups[str(v)].append(r)
        out = {}
        for g, rs in sorted(groups.items()):
            if len(rs) < 40:
                continue
            out[g] = {"n": len(rs), "features": compare(rs, h, top)}
        return out

    res["by_register_family"] = {}
    fams = defaultdict(lambda: {"ai": [], "human": []})
    for r in rows:
        fams[r["register_family"]][r["side"]].append(r)
    for fam, d in sorted(fams.items()):
        if len(d["ai"]) >= 40 and len(d["human"]) >= 40:
            res["by_register_family"][fam] = {
                "n_ai": len(d["ai"]), "n_human": len(d["human"]),
                "features": compare(d["ai"], d["human"], top)}

    res["by_provider"] = breakdown("provider")
    res["by_prompt_style"] = breakdown("prompt_style")
    res["by_model_tier"] = breakdown("model_tier")
    res["by_era"] = breakdown("era")

    # --- redundancy: are the top signals one signal or many? ---------------
    M = matrix(rows, top)
    good = [k for k in top if np.isfinite(M[k]).mean() > 0.98]
    X = np.vstack([np.nan_to_num(M[k], nan=float(np.nanmedian(M[k]))) for k in good])
    C = np.corrcoef(X)
    res["top_feature_correlation"] = {
        "features": good,
        "spearman_abs_mean": float(np.abs(C[np.triu_indices(len(good), 1)]).mean()),
        "matrix": np.round(C, 3).tolist(),
    }

    json.dump(res, open(os.path.join(RESULTS, "feature-analysis.json"), "w"), indent=1)
    print("wrote results/feature-analysis.json", flush=True)

    # console summary
    for label in ("overall", "register_and_length_matched", "fresh_longform_register_matched"):
        ov = res[label]
        ranked = sorted(ov, key=lambda k: -ov[k]["tpr_at_1pc_fpr"])
        print(f"\n=== {label} ===")
        print(f"{'feature':38s} {'TPR@1%':>7s} {'AUROC':>6s} {'delta':>7s} {'dir':>5s}")
        for k in ranked[:18]:
            d = ov[k]
            print(f"{k:38s} {d['tpr_at_1pc_fpr']*100:6.1f}% {d['auroc']:6.3f} "
                  f"{d['cliffs_delta']:+7.3f} {d['direction']:>5s}")
    ov = res["overall"]
    ranked = sorted(ov, key=lambda k: -ov[k]["tpr_at_1pc_fpr"])
    if False:
        print("")
    print(f"{'feature':38s} {'TPR@1%':>7s} {'AUROC':>6s} {'delta':>7s} {'dir':>5s}")
    for k in ranked[:20]:
        d = ov[k]
        print(f"{k:38s} {d['tpr_at_1pc_fpr']*100:6.1f}% {d['auroc']:6.3f} "
              f"{d['cliffs_delta']:+7.3f} {d['direction']:>5s}")
    nsig = sum(1 for k in ov if ov[k]["significant_bh_q05"])
    print(f"\n{nsig}/{len(ov)} features significant at BH q=0.05")


if __name__ == "__main__":
    sys.exit(main())

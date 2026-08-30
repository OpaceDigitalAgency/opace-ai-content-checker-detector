"""Rank surviving phrases by smoothed AI:human document-frequency ratio, then test them.

Ranking uses the MINING half only. Everything reported as evidence is computed
on the TEST half, which no phrase was selected on.

The ratio is of document RATES, not raw counts, because the two halves are
different sizes (461 AI against 2,318 human at the default split). Add-0.5
smoothing on both counts, which matters little once the minimum-count guard has
already removed the zero cells but keeps the arithmetic defined.

A ratio is reported with a Katz confidence interval. A point estimate of "23x"
from five documents is not a measurement, and this project has retracted
figures for less.
"""
import json, math, os, sys
from collections import Counter

CORPUS = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      "..", "longform-corpus"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emit_ngrams import half  # noqa

K = 0.5


def totals():
    n = Counter()
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for line in open(os.path.join(CORPUS, name)):
            r = json.loads(line)
            n[(side, half(r["id"]))] += 1
    return n


def ratio_ci(a, na, b, nb):
    """Smoothed rate ratio with a 95% Katz log interval."""
    pa = (a + K) / (na + 2 * K)
    pb = (b + K) / (nb + 2 * K)
    rr = pa / pb
    se = math.sqrt(max(0.0, 1 / (a + K) - 1 / (na + 2 * K) + 1 / (b + K) - 1 / (nb + 2 * K)))
    return rr, rr * math.exp(-1.96 * se), rr * math.exp(1.96 * se)


def main(df_path, n_label, top=25):
    N = totals()
    nam, nhm = N[("ai", "mine")], N[("human", "mine")]
    nat, nht = N[("ai", "test")], N[("human", "test")]
    rows = []
    for line in open(df_path):
        d = json.loads(line)
        rr, lo, hi = ratio_ci(d["ai_mine"], nam, d["hu_mine"], nhm)
        tr, tlo, thi = ratio_ci(d["ai_test"], nat, d["hu_test"], nht)
        rows.append({**d, "ratio_mine": rr, "lo": lo, "hi": hi,
                     "ratio_test": tr, "test_lo": tlo, "test_hi": thi,
                     "n_regs_ai": len(d["regs_ai"])})
    rows.sort(key=lambda r: -r["ratio_mine"])
    out = {
        "ngram_size": n_label,
        "split": {"ai_mine": nam, "human_mine": nhm, "ai_test": nat, "human_test": nht},
        "candidates_surviving_min_count": len(rows),
        "top": [],
    }
    for r in rows[:top]:
        out["top"].append({
            "phrase": r["g"],
            "ratio_mining_half": f"{r['ratio_mine']:.1f}x [{r['lo']:.1f} to {r['hi']:.1f}]",
            "ratio_held_out": f"{r['ratio_test']:.1f}x [{r['test_lo']:.1f} to {r['test_hi']:.1f}]",
            "ai_docs_mine": f"{r['ai_mine']}/{nam}", "human_docs_mine": f"{r['hu_mine']}/{nhm}",
            "ai_registers": r["n_regs_ai"], "registers": r["regs_ai"],
        })
    # How well does the mining-half ratio predict the held-out ratio?
    if len(rows) >= 30:
        import statistics
        xs = [math.log(r["ratio_mine"]) for r in rows]
        ys = [math.log(r["ratio_test"]) for r in rows]
        mx, my = statistics.mean(xs), statistics.mean(ys)
        cov = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
        vx = sum((a - mx) ** 2 for a in xs); vy = sum((b - my) ** 2 for b in ys)
        out["mining_vs_heldout_log_ratio_correlation"] = round(cov / math.sqrt(vx * vy), 4) if vx and vy else None
        top_rows = rows[:50]
        held = [r["ratio_test"] for r in top_rows]
        out["top50_held_out_ratio"] = {
            "median": round(statistics.median(held), 2),
            "below_1x": f"{sum(1 for h in held if h < 1)}/{len(held)}",
            "note": "a phrase ranked most AI-typical on the mining half whose held-out ratio is "
                    "below 1x occurs MORE often in human writing than machine writing on data it "
                    "was not chosen from",
        }
        out["single_register_share_top50"] = \
            f"{sum(1 for r in top_rows if r['n_regs_ai']<=1)}/{len(top_rows)}"
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 25)

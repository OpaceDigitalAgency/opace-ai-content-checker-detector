"""Is the headline signal real, or is it one corpus talking?

The strongest interpretable signals all describe the same thing — how much a
document repeats itself. The obvious objection is that our human long-form is
drawn from term-repeating technical sources (Europe PMC, GOV.UK, SEC filings),
so 'humans repeat more' could be 'our humans happen to be scientists'.

This script tests each signal against every human source independently, and
against every AI provider independently. A signal that is an artefact of one
pool will collapse towards AUROC 0.5 on the others.
"""
from __future__ import annotations

import json
import os
import sys
from collections import defaultdict

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
SIGNALS = ["lex_mattr_100", "dis_adjacent_sent_cohesion", "lex_repeat_trigram_rate",
           "lex_distinct3", "lex_top_content_share", "lex_yule_k",
           "pun_emdash_per1kw", "fmt_any_markdown", "lex_cliche_word_rate",
           "rhy_burstiness"]
MIN_N = 60


def auroc(a, h):
    r = stats.rankdata(np.concatenate([a, h]))
    return float((r[:len(a)].sum() - len(a) * (len(a) + 1) / 2.0) / (len(a) * len(h)))


def oriented(a, h):
    v = auroc(a, h)
    return max(v, 1 - v)


def main() -> None:
    rows = [json.loads(l) for l in open(os.path.join(HERE, "corpus", "features.jsonl"),
                                        encoding="utf-8")]
    rows = [r for r in rows if not r.get("background")]
    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    res = {"signals": SIGNALS, "min_n": MIN_N}

    def group(rs, field):
        g = defaultdict(list)
        for r in rs:
            g[str(r.get(field))].append(r)
        return {k: v for k, v in g.items() if len(v) >= MIN_N and k != "None"}

    # every human source against the AI documents that share its registers
    block = {}
    for src, rs in group(hu, "source").items():
        fams = {r["register_family"] for r in rs}
        comp = [r for r in ai if r["register_family"] in fams]
        if len(comp) < MIN_N:
            continue
        d = {"n_human": len(rs), "n_ai_compared": len(comp),
             "registers": sorted(fams), "auroc": {}}
        for k in SIGNALS:
            A = np.array([r["f"].get(k, np.nan) for r in comp], dtype=float)
            H = np.array([r["f"].get(k, np.nan) for r in rs], dtype=float)
            A, H = A[np.isfinite(A)], H[np.isfinite(H)]
            if len(A) >= MIN_N and len(H) >= MIN_N:
                d["auroc"][k] = oriented(A, H)
        block[src] = d
    res["by_human_source"] = block

    # every AI provider against the human documents that share its registers
    block = {}
    for prov, rs in group(ai, "provider").items():
        fams = {r["register_family"] for r in rs}
        comp = [r for r in hu if r["register_family"] in fams]
        if len(comp) < MIN_N:
            continue
        d = {"n_ai": len(rs), "n_human_compared": len(comp), "auroc": {}}
        for k in SIGNALS:
            A = np.array([r["f"].get(k, np.nan) for r in rs], dtype=float)
            H = np.array([r["f"].get(k, np.nan) for r in comp], dtype=float)
            A, H = A[np.isfinite(A)], H[np.isfinite(H)]
            if len(A) >= MIN_N and len(H) >= MIN_N:
                d["auroc"][k] = oriented(A, H)
        block[prov] = d
    res["by_ai_provider"] = block

    # worst case per signal: the single pairing on which it does least well
    worst = {}
    for k in SIGNALS:
        vals = [(s, d["auroc"][k]) for s, d in res["by_human_source"].items()
                if k in d["auroc"]]
        vals += [(p, d["auroc"][k]) for p, d in res["by_ai_provider"].items()
                 if k in d["auroc"]]
        if vals:
            lo = min(vals, key=lambda x: x[1])
            worst[k] = {"min_auroc": lo[1], "on": lo[0],
                        "median_auroc": float(np.median([v for _, v in vals])),
                        "n_pairings": len(vals),
                        "pairings_above_0_65": sum(1 for _, v in vals if v > 0.65)}
    res["worst_case_per_signal"] = worst
    json.dump(res, open(os.path.join(HERE, "results", "robustness.json"), "w"), indent=1)

    lines = ["# Robustness: does the signal survive every source?", "",
             "Each human source is compared against only the AI documents sharing "
             "its register families, and vice versa. Oriented AUROC, so 0.5 is "
             f"useless. Sources with fewer than {MIN_N} documents are omitted.", "",
             "## Per signal, across all pairings", "",
             "| signal | median AUROC | worst AUROC | worst pairing | pairings above 0.65 |",
             "|---|---:|---:|---|---:|"]
    from make_tables import name
    for k in sorted(worst, key=lambda k: -worst[k]["median_auroc"]):
        d = worst[k]
        lines.append(f"| {name(k)} `{k}` | {d['median_auroc']:.3f} | "
                     f"{d['min_auroc']:.3f} | {d['on']} | "
                     f"{d['pairings_above_0_65']}/{d['n_pairings']} |")
    for title, key, ncol in (("Per human source", "by_human_source", "n_human"),
                             ("Per AI provider", "by_ai_provider", "n_ai")):
        lines += ["", f"## {title}", "",
                  "| source | n | " + " | ".join(name(k) for k in SIGNALS) + " |",
                  "|---|---:|" + "---:|" * len(SIGNALS)]
        for s, d in sorted(res[key].items(), key=lambda x: -x[1][ncol]):
            cells = " | ".join(f"{d['auroc'][k]:.3f}" if k in d["auroc"] else "–"
                               for k in SIGNALS)
            lines.append(f"| {s} | {d[ncol]:,} | {cells} |")
    open(os.path.join(HERE, "tables", "robustness.md"), "w",
         encoding="utf-8").write("\n".join(lines) + "\n")
    print("wrote tables/robustness.md")
    for k in sorted(worst, key=lambda k: -worst[k]["median_auroc"]):
        d = worst[k]
        print(f"  {k:32s} median {d['median_auroc']:.3f}  worst {d['min_auroc']:.3f} "
              f"({d['on'][:28]})  {d['pairings_above_0_65']}/{d['n_pairings']} > 0.65")


if __name__ == "__main__":
    sys.exit(main())

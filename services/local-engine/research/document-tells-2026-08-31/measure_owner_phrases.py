"""Owner-supplied phrase candidates, measured under the exact known-phrases
gate: register-balanced cycle-2 ratio AND generated-2026/human-v2 ratio, ship
only when both reach 2x. Same normaliser, same corpora, same arithmetic as
measure_known_phrases.py — the candidates are the only difference.

Candidates from live reading, 31 August 2026: in short / in essence /
simply put / the bottom line / put simply / at its core / the key takeaway.

Usage: python3 measure_owner_phrases.py -> owner-phrases.json + table
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import measure_known_phrases as harness
from tells_lib import iter_jsonl

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
REPO = harness.REPO

CANDIDATES = [
    "in short", "in essence", "simply put", "the bottom line",
    "put simply", "at its core", "the key takeaway",
]


def main():
    pats = {p: harness.pnorm(p) for p in CANDIDATES}
    registers = ["marketing", "academic", "article", "social", "reference", "report"]
    ridx = {r: i for i, r in enumerate(registers)}
    c2 = {p: [0] * 12 for p in CANDIDATES}
    n12 = [0] * 12
    for d in iter_jsonl(os.path.join(RESEARCH, "cycle2-corpus", "corpus.jsonl")):
        col = ridx[d["register"]] + (0 if d["side"] == "ai" else 6)
        n12[col] += 1
        t = harness.norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                c2[p][col] += 1

    gen = {p: 0 for p in CANDIDATES}
    n_gen = 0
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        n_gen += 1
        t = harness.norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                gen[p] += 1

    hv2 = json.load(open(os.path.join(REPO, "implementation", "tests", "battery",
                                      "human-corpus-v2.json")))
    hu2 = {p: 0 for p in CANDIDATES}
    for d in hv2:
        t = harness.norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                hu2[p] += 1

    ai_n, hu_n = n12[:6], n12[6:]
    rows = []
    for p in CANDIDATES:
        c = c2[p]
        ai_df, hu_df = sum(c[:6]), sum(c[6:])
        bal_ai = sum((c[i] + 0.5) / (ai_n[i] + 1) for i in range(6)) / 6
        bal_hu = sum((c[6 + i] + 0.5) / (hu_n[i] + 1) for i in range(6)) / 6
        r_c2 = bal_ai / bal_hu
        r_gen = (gen[p] + 0.5) / n_gen / ((hu2[p] + 0.5) / len(hv2))
        rows.append({
            "phrase": p,
            "c2_ai_per_1000": round(1000 * ai_df / sum(ai_n), 2),
            "c2_hu_per_1000": round(1000 * hu_df / sum(hu_n), 2),
            "c2_ratio_balanced": round(r_c2, 1),
            "gen_per_1000": round(1000 * gen[p] / n_gen, 2),
            "hv2_per_1000": round(1000 * hu2[p] / len(hv2), 2),
            "gen_ratio": round(r_gen, 1),
            "c2_ai_docs": ai_df, "c2_hu_docs": hu_df,
            "gen_docs": gen[p], "hv2_docs": hu2[p],
            "both_elevated_2x": (r_c2 >= 2 and r_gen >= 2),
        })
    rows.sort(key=lambda r: -min(r["c2_ratio_balanced"], r["gen_ratio"]))
    with open(os.path.join(HERE, "owner-phrases.json"), "w") as f:
        json.dump({"meta": {"cycle2_ai": sum(ai_n), "cycle2_human": sum(hu_n),
                            "generated": n_gen, "human_v2": len(hv2),
                            "measured": "2026-08-31"},
                   "rows": rows}, f, indent=1)
    for r in rows:
        print(f"{'SHIP' if r['both_elevated_2x'] else 'fail':>4} | c2 {r['c2_ratio_balanced']:>6}x | gen {r['gen_ratio']:>6}x | "
              f"gen/1k={r['gen_per_1000']:>6} hv2/1k={r['hv2_per_1000']:>6} | "
              f"docs {r['gen_docs']}/{r['hv2_docs']} | {r['phrase']}")


if __name__ == "__main__":
    main()

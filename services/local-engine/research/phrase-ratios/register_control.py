"""The register control: does a phrase's AI lean survive inside a single register?

The concern this answers. Our AI half and our human half do not have the same
register mix, and they were written to different briefs. A phrase can therefore
look machine-typical corpus-wide purely because it belongs to the kind of
writing the AI half happens to contain more of. That is the mistake visible in
the competitor's own panel, where domain vocabulary from the user's document is
ranked at 307x and presented as evidence of machine authorship.

The test. For every register present on both sides, compute the phrase's
document-frequency ratio inside THAT register alone. A real machine tell should
lean the same way in most registers it appears in. A register artefact leans
hard in one and vanishes elsewhere.

Reported per phrase:
  registers_tested        registers with enough documents on both sides
  registers_above_1x      how many of those lean AI at all
  min_ratio / median      the weakest and typical within-register lean

`registers_above_1x` is the field that decides whether a phrase is publishable.
A phrase that leans AI corpus-wide but in only one register out of six is a
register artefact wearing a ratio.
"""
import json, math, os, sys
from collections import Counter

CORPUS = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      "..", "longform-corpus"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emit_ngrams import half  # noqa

K = 0.5
MIN_REG_DOCS = 40          # per side, inside a register, for that register to be tested
MIN_REG_PHRASE_DOCS = 3    # AI documents in that register carrying the phrase


def register_totals():
    n = Counter()
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for line in open(os.path.join(CORPUS, name)):
            r = json.loads(line)
            if half(r["id"]) == "mine":
                n[(side, r["register"])] += 1
    return n


def main(df_path, top=40):
    N = registers = register_totals()
    regs = sorted({r for (s, r) in N if N[("ai", r)] >= MIN_REG_DOCS
                   and N[("human", r)] >= MIN_REG_DOCS} & {r for (s, r) in N if s == "ai"})
    nam = sum(v for (s, r), v in N.items() if s == "ai")
    nhm = sum(v for (s, r), v in N.items() if s == "human")

    rows = []
    for line in open(df_path):
        d = json.loads(line)
        rr = ((d["ai_mine"] + K) / (nam + 2 * K)) / ((d["hu_mine"] + K) / (nhm + 2 * K))
        d["ratio_mine"] = rr
        rows.append(d)
    rows.sort(key=lambda r: -r["ratio_mine"])

    out = {"registers_available": regs, "min_docs_per_side_in_register": MIN_REG_DOCS,
           "phrases": [], "summary": {}}
    kept = 0
    for d in rows[:top]:
        per = d.get("per_reg", {})
        tested, ratios = [], []
        for reg in regs:
            a, h = per.get(reg, [0, 0])
            na, nh = N[("ai", reg)], N[("human", reg)]
            if a < MIN_REG_PHRASE_DOCS:
                continue
            r = ((a + K) / (na + 2 * K)) / ((h + K) / (nh + 2 * K))
            tested.append(reg); ratios.append(r)
        above = sum(1 for r in ratios if r > 1.0)
        rec = {
            "phrase": d["g"],
            "corpus_ratio": round(d["ratio_mine"], 1),
            "registers_tested": len(tested),
            "registers_above_1x": above,
            "min_within_register_ratio": round(min(ratios), 2) if ratios else None,
            "median_within_register_ratio": round(sorted(ratios)[len(ratios) // 2], 2) if ratios else None,
        }
        if len(tested) >= 3 and above == len(tested):
            rec["verdict"] = "holds in every register tested"
            kept += 1
        elif len(tested) >= 3 and above >= len(tested) - 1:
            rec["verdict"] = "holds in all but one register tested"
        elif len(tested) < 3:
            rec["verdict"] = "too few registers to test — not publishable"
        else:
            rec["verdict"] = "register-dependent — not publishable"
        out["phrases"].append(rec)
    out["summary"] = {
        "examined": min(top, len(rows)),
        "holds_in_every_register_tested": kept,
        "note": "Only phrases holding in every register tested are candidates for display. "
                "The rest lean AI corpus-wide because of what our AI half was asked to write "
                "about, not because machines favour the phrase.",
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 40)

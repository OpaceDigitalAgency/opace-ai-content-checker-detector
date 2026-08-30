"""Build the shipped phrase table: selected on the mining half, reported held out.

Selection uses ONLY the mining half — the smoothed document-frequency ratio and
the register control. The held-out ratio is then reported for each survivor and
is never used to rank, because selecting on the numbers you then publish is how
a table ends up describing its own noise.

Every row carries its counts. A ratio without its denominator is exactly what
this project keeps correcting, and at this corpus size the denominators are
small enough that a reader needs to see them: a "23x" resting on nine documents
is a different object from one resting on nine hundred.

Rows are emitted with an interval, not a point estimate. The intervals here are
wide — commonly a factor of five end to end — and the display must show them.
"""
import json, math, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.abspath(os.path.join(HERE, "..", "longform-corpus"))
sys.path.insert(0, HERE)
from emit_ngrams import half  # noqa

K = 0.5
MIN_REG_DOCS = 40

# Phrases excluded from the SHIPPED table by judgement, with the reason, after
# they passed every automatic filter. Each one is recorded in
# `docs/measurements/AI-PHRASE-RATIOS.md` rather than quietly dropped, because a
# hand exclusion with no stated reason is indistinguishable from tuning the
# table until it looks good.
#
# The register control compares a phrase's lean ACROSS registers. It cannot
# catch a phrase that is topical in the same direction in all of them, which is
# what happens when our AI half writes about a subject across every register it
# was asked for. "the bank of" is that case: 9 AI and 7 human documents, and a
# reader pasting a banking article would see their own subject matter marked as
# a machine tell — correctly concluding, on that row, that the tool is not
# thinking. That judgement would then travel to the 17 rows that do replicate.
EXCLUDED = {
    "the bank of": "topical residue: our AI half writes about banking across several registers, "
                   "so the within-register control does not separate subject from style",
}
MIN_REG_DOCS = MIN_REG_DOCS
MIN_REG_PHRASE_DOCS = 3
MIN_REGISTERS = 3


def ratio_ci(a, na, b, nb):
    pa = (a + K) / (na + 2 * K); pb = (b + K) / (nb + 2 * K)
    rr = pa / pb
    se = math.sqrt(max(0.0, 1 / (a + K) - 1 / (na + 2 * K) + 1 / (b + K) - 1 / (nb + 2 * K)))
    return rr, rr * math.exp(-1.96 * se), rr * math.exp(1.96 * se)


def main(df_path, out_path, want=18):
    n = Counter(); reg_n = Counter()
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for line in open(os.path.join(CORPUS, name)):
            r = json.loads(line)
            n[(side, half(r["id"]))] += 1
            if half(r["id"]) == "mine":
                reg_n[(side, r["register"])] += 1
    nam, nhm = n[("ai", "mine")], n[("human", "mine")]
    nat, nht = n[("ai", "test")], n[("human", "test")]
    regs = sorted({r for (s, r) in reg_n if reg_n[("ai", r)] >= MIN_REG_DOCS
                   and reg_n[("human", r)] >= MIN_REG_DOCS})

    rows = []
    for line in open(df_path):
        d = json.loads(line)
        rr, lo, hi = ratio_ci(d["ai_mine"], nam, d["hu_mine"], nhm)
        d["ratio_mine"] = rr
        rows.append(d)
    rows.sort(key=lambda r: -r["ratio_mine"])

    kept = []
    for d in rows:
        per = d.get("per_reg", {})
        ratios = []
        for reg in regs:
            a, h = per.get(reg, [0, 0])
            if a < MIN_REG_PHRASE_DOCS:
                continue
            ratios.append(((a + K) / (reg_n[("ai", reg)] + 2 * K))
                          / ((h + K) / (reg_n[("human", reg)] + 2 * K)))
        if len(ratios) < MIN_REGISTERS or any(r <= 1.0 for r in ratios):
            continue
        if d["g"] in EXCLUDED:
            continue
        # Overlapping windows of the same phrase are one tendency, not two.
        # "the gap between" and "gap between the" slide across the same words
        # and would pad the panel with what looks like independent evidence.
        # Keep the higher-ranked window and drop the shifted one.
        tokens = d["g"].split()
        if any(tokens[:-1] == prev[1:] or tokens[1:] == prev[:-1]
               for prev in (row["phrase"].split() for row in kept)):
            continue
        tr, tlo, thi = ratio_ci(d["ai_test"], nat, d["hu_test"], nht)
        # The held-out interval must EXCLUDE 1.0. A phrase whose interval spans
        # 1 is not distinguishable from "occurs equally often in both", and
        # printing it beside a ratio would dress up an absence of evidence as
        # evidence. This is the filter that removed "body of evidence"
        # (0.9-8.4x held out) from an earlier draft of this table.
        if tlo <= 1.0:
            continue
        kept.append({
            "phrase": d["g"],
            "held_out_ratio_low": round(tlo, 1),
            "held_out_ratio_high": round(thi, 1),
            "held_out_ratio": round(tr, 1),
            "ai_documents": d["ai_test"], "human_documents": d["hu_test"],
            "registers_tested": len(ratios),
            "weakest_register_ratio": round(min(ratios), 1),
        })
        if len(kept) >= want:
            break

    out = {
        "version": "phrase-ratios-v1",
        "measured": "2026-08-30",
        "corpus": {
            "ai_documents": nam + nat, "human_documents": nhm + nht,
            "mining_half": {"ai": nam, "human": nhm},
            "held_out_half": {"ai": nat, "human": nht},
            "source": "the 5,558-document long-form corpus of 28 August 2026",
        },
        "method": (
            "Document frequency, not raw frequency. Phrases are three-word sequences appearing in "
            "at least 5 documents on BOTH sides of the mining half, ranked there by smoothed "
            "document-rate ratio, required to lean AI inside every register with enough documents "
            "to test (at least 3 such registers), and then REPORTED on a held-out half they were "
            "never selected on. Spelling is normalised to one convention on both sides first."),
        "limitations": [
            "Ratios are reported as intervals because at this corpus size the point estimate is not "
            "meaningful on its own. The intervals are wide.",
            "922 AI documents is small for phrase statistics. A commercial panel of this kind is "
            "built on millions; ours is built on hundreds, and the minimum-count floor that keeps "
            "the arithmetic honest is what limits the table to three-word phrases.",
            "Only 251 four-word phrases and 21 five-word phrases in the whole corpus met the "
            "minimum count in both halves, so longer phrases are not published at all.",
            "A phrase appearing in your draft is not evidence that your draft is machine-written. "
            "These are tendencies across thousands of documents, not marks against a sentence.",
            "Measured on long-form prose. Short marketing, SEO and social copy are not represented.",
        ],
        "excluded_by_judgement": EXCLUDED,
        "phrases": kept,
    }
    json.dump(out, open(out_path, "w"), indent=1)
    print(f"wrote {out_path}: {len(kept)} phrases")
    for row in kept:
        print(f"  {row['held_out_ratio_low']:6.1f}–{row['held_out_ratio_high']:<7.1f}x  "
              f"regs {row['registers_tested']}  ai {row['ai_documents']:3} hu {row['human_documents']:3}  {row['phrase']!r}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

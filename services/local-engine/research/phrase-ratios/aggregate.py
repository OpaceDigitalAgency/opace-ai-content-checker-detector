"""Aggregate sorted `side/half/register/ngram` lines into document-frequency records.

Input must be sorted by the ngram field, so all lines for one phrase arrive
together and peak memory is one phrase's worth.

The minimum-count guard is applied HERE and is the whole reason this file is
careful. A 4-gram seen in three AI documents and none of the human ones has an
undefined ratio, and smoothing it produces a large finite number that looks
like evidence and is not. The guard is a floor on the count in BOTH halves of
the mining split, so every surviving ratio is a comparison of two rates that
were each actually observed.

Emitted per surviving phrase:
  df_ai_mine / df_hu_mine   the counts the ratio is computed from
  df_ai_test / df_hu_test   held out, never used for ranking, only for scoring
  registers                 the AI-side registers it appears in, so a phrase
                            that lives in one register can be told apart from
                            one that spans several. This is the control for the
                            failure the competitor's own panel shows: domain
                            vocabulary ranked as a machine tell.
"""
import json, os, sys
from collections import defaultdict

MIN_DF = int(os.environ.get("MIN_DF", "5"))


def main(path, out_path):
    fh_out = open(out_path, "w")
    cur = None
    ai_mine = hu_mine = ai_test = hu_test = 0
    regs_ai = set(); regs_hu = set()
    per_reg = defaultdict(lambda: [0, 0])   # register -> [ai_docs, human_docs], mining half only

    def flush():
        if cur is None:
            return
        if ai_mine >= MIN_DF and hu_mine >= MIN_DF:
            fh_out.write(json.dumps({
                "g": cur, "ai_mine": ai_mine, "hu_mine": hu_mine,
                "ai_test": ai_test, "hu_test": hu_test,
                "regs_ai": sorted(regs_ai), "regs_hu": sorted(regs_hu),
                "per_reg": {k: v for k, v in per_reg.items()},
            }) + "\n")

    for line in open(path):
        side, half, reg, g = line.rstrip("\n").split("\t", 3)
        if g != cur:
            flush()
            cur = g; ai_mine = hu_mine = ai_test = hu_test = 0
            regs_ai = set(); regs_hu = set(); per_reg = defaultdict(lambda: [0, 0])
        if side == "ai":
            regs_ai.add(reg)
            if half == "mine": per_reg[reg][0] += 1
            if half == "mine": ai_mine += 1
            else: ai_test += 1
        else:
            regs_hu.add(reg)
            if half == "mine": per_reg[reg][1] += 1
            if half == "mine": hu_mine += 1
            else: hu_test += 1
    flush()
    fh_out.close()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

"""Prove the Python score reconstruction is byte-identical to the shipped
engine's `score` on every eval sample, in both the raw and stripped views.
If this fails, no ablation number below can be trusted."""
import json, math, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent.parent
CFG = json.load(open(HERE / "data" / "engine-config.json"))
W = CFG["weights"]
STYLO = set(CFG["stylometric"]) | set(CFG["v4Rhythm"])

def score_from_counts(counts, word_count, weights=W, drop=None):
    stylo = other = 0
    for c, n in counts.items():
        if drop is not None and c == drop:
            continue
        w = weights.get(c, 2)
        if c in STYLO:
            stylo += n * w
        else:
            other += n * w
    raw = other + min(stylo, max(other, 12))
    lf = max(1.0, math.log2(word_count / 50))
    # JS Math.round: half away from zero for positives -> floor(x+0.5)
    return min(100, math.floor(raw / lf + 0.5))

if __name__ == "__main__":
    bad = 0; n = 0
    for name in ("fire-raw.jsonl", "fire-stripped.jsonl"):
        for line in open(HERE / "data" / name):
            r = json.loads(line)
            if r["status"] != "scored":
                continue
            n += 1
            s = score_from_counts(r["catCounts"], r["wordCount"])
            if s != r["score"]:
                bad += 1
                if bad < 6:
                    print("MISMATCH", name, r["id"], s, r["score"])
    print(f"reconstruction checked {n} scored samples, {bad} mismatches")
    sys.exit(1 if bad else 0)

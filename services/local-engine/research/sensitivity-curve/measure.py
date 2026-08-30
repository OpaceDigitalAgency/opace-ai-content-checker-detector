"""What each notch of a strictness control would actually cost.

Both competitors expose strictness as a user control — an "AI Allowance" of
0/5/15/25/40%, a "Sensitivity Level 2/3". Neither says what a setting costs in
wrongly-accused human writing. A control that does not is worse than no control,
because it lets a reader turn the tool up until it agrees with them and gives
them no way to know what they have done.

This measures the full curve at full precision, so every notch can carry its own
measured false-positive rate.

IMPORTANT, AND THE REASON THIS IS NOT A THRESHOLD CHANGE
--------------------------------------------------------
Nothing here moves the shipped operating point. The shipped pair stays 0.9855 /
0.9763 and remains the default. This file measures what OTHER points would do on
the corpus, so a control can be built that tells the truth about each one. A
retrain is awaiting its flag-point refit and the pair will move; when it does,
this is re-run and the numbers move with it. No value from this file may be
hard-coded anywhere.

Full precision matters here: the 4 dp segment store rounds 884/922 where the
truth is 883/922 at the shipped pair, and a curve built on it would be wrong by
a document at every notch.
"""
import json, os, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, ".."))
HARNESS = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29")
CORPUS = os.path.join(RESEARCH, "longform-corpus")
sys.path.insert(0, HARNESS)
_cwd = os.getcwd(); os.chdir(HARNESS)
import harness  # noqa
os.chdir(_cwd)

# The gap between the two arms is held at the shipped 0.0092, so every notch is
# the same RULE at a different strictness rather than a different rule.
SHIPPED = (0.9855, 0.9763)
GAP = SHIPPED[0] - SHIPPED[1]
GRID = [0.9985, 0.997, 0.995, 0.992, 0.9895, 0.9855, 0.982, 0.978, 0.973, 0.967,
        0.96, 0.95, 0.94, 0.92, 0.90, 0.87, 0.84, 0.80]


def score_doc(text):
    parts = harness.segment_text(text, harness.count_tokens)
    probs = []
    for i in range(0, len(parts), 16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
    return probs


def main(out_path):
    rows = []
    t0 = time.time()
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        n = 0
        for line in open(os.path.join(CORPUS, name)):
            r = json.loads(line)
            rows.append({"side": side, "register": r["register"], "seg": score_doc(r["text"])})
            n += 1
            if n % 250 == 0:
                print(f"{side} {n} in {time.time()-t0:.0f}s", flush=True)
        print(f"DONE {side} {n}", flush=True)

    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]

    def flagged(seg, primary, secondary):
        s = sorted(seg, reverse=True)
        if not s:
            return False
        return s[0] >= primary or (len(s) > 1 and s[1] >= secondary)

    out = {
        "measured": "2026-08-30",
        "model": "tier3-cycle2-e5small-fp32.onnx",
        "model_sha256": harness.MODEL_SHA,
        "runtime": "python onnxruntime 1.29.0, CPU, fp32 — the EU server's scoring path",
        "segmentation": harness.SEGMENTATION_CONTRACT,
        "corpus": {"ai_documents": len(ai), "human_documents": len(hu),
                   "source": "the 5,558-document long-form corpus of 28 August 2026"},
        "shipped_operating_point": {"primary": SHIPPED[0], "secondary": SHIPPED[1]},
        "rule": "flag when the strongest section reaches `primary`, OR the second-strongest reaches "
                "`secondary`. The gap between the arms is held at the shipped 0.0092 at every notch.",
        "warning": "These are alternative operating points measured on one corpus of long-form prose. "
                   "None of them is a shipped default, and none may be hard-coded. The shipped pair is "
                   "0.9855/0.9763 and a retrain will move it.",
        "curve": [],
    }
    for primary in GRID:
        secondary = round(primary - GAP, 6)
        a = sum(1 for r in ai if flagged(r["seg"], primary, secondary))
        h = sum(1 for r in hu if flagged(r["seg"], primary, secondary))
        out["curve"].append({
            "primary": primary, "secondary": secondary,
            "ai_detected": f"{a}/{len(ai)} ({100*a/len(ai):.1f}%)",
            "human_false_positives": f"{h}/{len(hu)} ({100*h/len(hu):.2f}%)",
            "ai_detected_rate": round(a / len(ai), 4),
            "human_false_positive_rate": round(h / len(hu), 4),
            "is_shipped_default": primary == SHIPPED[0],
        })
    # Per-register false positives at each notch: the cost is not evenly spread,
    # and fiction carries most of it.
    out["human_false_positives_by_register"] = {}
    registers = sorted({r["register"] for r in hu})
    for primary in GRID:
        secondary = round(primary - GAP, 6)
        out["human_false_positives_by_register"][f"{primary}"] = {
            reg: (lambda sel: f"{sum(1 for r in sel if flagged(r['seg'], primary, secondary))}/{len(sel)}")(
                [r for r in hu if r["register"] == reg])
            for reg in registers}
    json.dump(out, open(out_path, "w"), indent=1)
    print(f"wrote {out_path}")
    for row in out["curve"]:
        mark = "  <= SHIPPED DEFAULT" if row["is_shipped_default"] else ""
        print(f"  {row['primary']:.4f}/{row['secondary']:.4f}  AI {row['ai_detected']:>18}  "
              f"human FP {row['human_false_positives']:>20}{mark}")


if __name__ == "__main__":
    main(sys.argv[1])

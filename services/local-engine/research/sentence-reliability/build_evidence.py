"""Emit the shipped sentence-evidence floor, with the denominators that justify it.

The floor is DATA, for the same reason the document threshold is data: a value
that exists in two places with no test asserting they agree has produced
repeated defects in this project, and a recalibration should land without a code
change.

It is NOT the document flag point and must never be compared with one. The
document verdict's operating point is 0.9855/0.9763 and is untouched by anything
here; this is a separate, higher bar that a single sentence must clear before it
is worth marking at all.

The floor was chosen on one criterion, fixed before the numbers were inspected:
the share of HUMAN documents in which any sentence clears it must be at or below
roughly 2% in every register measured, so that the layer stays quiet on human
writing without needing to know what register it is looking at.
"""
import json, os, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
FLOOR = 0.95


def fmt(n, d):
    return f"{n:,}/{d:,} ({100*n/d:.3f}%)" if d else "0/0"


def main(out_path):
    ai_s = []; hu_s = []
    doc_hit = defaultdict(lambda: [0, 0])   # (side, register) -> [docs with a hit, docs]
    for line in open(os.path.join(HERE, "sentence-scores.jsonl")):
        d = json.loads(line)
        ps = [s["p"] for s in d["sentences"] if s["p"] is not None]
        (ai_s if d["side"] == "ai" else hu_s).extend(ps)
        key = (d["side"], d["register"])
        doc_hit[key][1] += 1
        if any(p >= FLOOR for p in ps):
            doc_hit[key][0] += 1

    a = sum(1 for p in ai_s if p >= FLOOR)
    h = sum(1 for p in hu_s if p >= FLOOR)
    rate_a = a / len(ai_s); rate_h = h / len(hu_s)
    out = {
        "version": "sentence-evidence-v1",
        "measured": "2026-08-30",
        "model": "tier3-cycle2-e5small-fp32.onnx",
        "corpus": "the 5,558-document long-form corpus of 28 August 2026",
        "what_this_is_not": (
            "This is NOT the document flag point and must never be compared with it. The document "
            "verdict is the maximum SECTION score under segments-v3 at 0.9855/0.9763 and is "
            "unaffected by anything in this file. This is a separate, much higher bar that a single "
            "sentence must clear before it is worth marking."),
        "why_a_floor_at_all": (
            "Ranking alone was not safe. Within-document ranking of sentences runs from 0.868 AUROC "
            "on white papers to 0.707 on fiction and 0.698 on journalism, and comes out below chance "
            "on 13.5% of individual fiction drafts. A purely relative layer always marks something, "
            "so on those drafts it would point confidently at the wrong passages. An absolute floor "
            "makes the failure mode 'no highlight' rather than 'wrong highlight'."),
        # PER RUNTIME. One value cannot serve both routes: measured on 850
        # paired sentences, 19.3% of those at or above 0.95 on fp32 fall below
        # it on the browser runtime, and the browser marks 13% fewer passages at
        # the same nominal floor. This is the same reason thresholds.json fits
        # the document flag point separately per runtime, and the same failure
        # that caused a retrain to be rejected on 30 August 2026 after its flag
        # point was fitted on fp32 and checked on the browser afterwards.
        "floors": {
            "server_fp32": {
                "value": FLOOR,
                "runtime": "fp32 onnxruntime, CPU — the EU server's scoring path",
                "status": "fitted",
                "ai_sentences_at_or_above": fmt(a, len(ai_s)),
                "human_sentences_at_or_above": fmt(h, len(hu_s)),
                "enrichment": f"{rate_a/rate_h:.0f}x" if rate_h else "no human sentence reached it",
                "population": "every scorable sentence in the 5,558-document long-form corpus",
                "corpus": "the 5,558-document long-form corpus of 28 August 2026",
                "measured": "2026-08-30",
            },
            "browser_int8_wasm": {
                "value": 0.945,
                "runtime": "onnxruntime-web, int8 per-channel, WASM execution provider",
                "status": "fitted",
                "fitted_to": "the human false-mark RATE, not the marked count — see why_the_rate_not_the_count",
                "ai_sentences_at_or_above": "1,292/68,916 (1.875%)",
                "human_sentences_at_or_above": "25/200,890 (0.012%)",
                "enrichment": "151x",
                "human_documents_with_any_mark": "24/4,636 (0.518%)",
                "ai_documents_with_any_mark": "372/922 (40.347%)",
                "population": "every scorable sentence in the 5,558-document long-form corpus, counted",
                "corpus": "the 5,558-document long-form corpus of 28 August 2026",
                "measured": "2026-08-30",
                "provider_attribution": "verified by construction: single execution provider, no "
                                        "fallback list. Harness parity proved against the browser "
                                        "before use (57 of 300 crossing, 1,136 marked, floor 0.945, "
                                        "median difference from fp32 0.00926 against 0.0093).",
            },
            "browser_int8_webgpu": {
                "value": 0.944,
                "runtime": "onnxruntime-web, int8 per-channel, WebGPU execution provider",
                "status": "PROVISIONAL — the marked COUNT is quantile-matched on 850 sentences; the "
                          "human false-mark RATE has not been counted on this provider, and that is "
                          "the number that decides whether the layer is safe",
                "marked_at_the_server_floor_0_95": "1,142 estimated — 14% fewer than fp32's 1,329",
                "measured": "2026-08-30",
                "why_not_counted": "A WebGPU count needs a real browser: onnxruntime-web's WebGPU "
                                   "provider does not run under Node, and 200,890 sentences at the "
                                   "measured 71.5 ms is about four hours in a tab that hot-reloads "
                                   "and throttles. The WASM figure must not be reused: the two "
                                   "providers disagree on the marking decision for 16 sentences in "
                                   "850, which is immaterial to a count and is the entire quantity "
                                   "when the rate itself is 25 in 200,890.",
            },
        },
        "why_the_rate_not_the_count": (
            "The browser floors were first fitted to reproduce the NUMBER of passages the server "
            "floor marks. That objective is dominated by the AI side, which is most of the marked "
            "mass and is not what can hurt anybody. The false-mark RATE is the safety property: it "
            "is how often someone who wrote their own words gets a mark under one of their "
            "sentences. Fitting to the rate is also the principle the document flag point already "
            "follows — 0.9855 was set high deliberately to hold human false positives near 1%, at "
            "the owner's request — and a layer fitted on a different principle from the verdict "
            "above it would be incoherent. On this corpus the two objectives happen to land on the "
            "same value, 0.945, so nothing was traded away; that is a fact about this corpus and "
            "not a reason to stop distinguishing them."),
        "route_gate": (
            "A route may paint this layer ONLY with a floor whose status is 'fitted' for the runtime "
            "it is running. At the time of writing that is the server fp32 route alone. The browser "
            "route must not fall back to the server floor."),
        "documents_containing_at_least_one_qualifying_sentence": {
            side: {reg: fmt(v[0], v[1]) for (s, reg), v in sorted(doc_hit.items()) if s == side}
            for side in ("ai", "human")},
        "limitation": (
            "Measured on long-form prose only. Short marketing, SEO and social copy cannot be "
            "measured: every sample this programme owns of those registers sits inside the cycle-2 "
            "training set. See thresholds.json, registers_unmeasured."),
    }
    json.dump(out, open(out_path, "w"), indent=1)
    print(f"wrote {out_path}")
    print(json.dumps({k: out[k] for k in ("floors", "route_gate")}, indent=1))
    for side in ("ai", "human"):
        print(f"  --- {side} documents with a qualifying sentence ---")
        for reg, v in out["documents_containing_at_least_one_qualifying_sentence"][side].items():
            print(f"    {reg:24} {v}")


if __name__ == "__main__":
    main(sys.argv[1])

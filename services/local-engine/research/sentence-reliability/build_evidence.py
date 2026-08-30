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
            "browser_int8_webgpu": {
                "value": 0.944,
                "runtime": "onnxruntime-web, int8 per-channel, WebGPU execution provider",
                "status": "PROVISIONAL — fitted by quantile matching on a stratified paired sample "
                          "of 850 sentences, not on the whole corpus",
                "fitted_to": "reproduce the number of passages the fp32 floor marks (1,329 corpus-wide)",
                "ai_sentences_at_or_above": "estimated 1,322 of 68,916 by reweighting the sample",
                "human_sentences_at_or_above": "NOT RELIABLY ESTIMATED — the sample reproduces 9 of "
                          "the 24 human sentences known to clear the fp32 floor, because only 24 "
                          "exist in 200,816 and a stratified sample cannot resolve that rate. A "
                          "dedicated browser run over the human half is required before this route "
                          "ships.",
                "measured": "2026-08-30",
            },
            "browser_int8_wasm": {
                "value": None,
                "runtime": "onnxruntime-web, int8 per-channel, WASM execution provider",
                "status": "NOT FITTED. WEBGPU-PARITY.md establishes WASM/WebGPU agreement to five "
                          "decimals only ABOVE 0.97, with the widest divergence at 0.50 to 0.90. A "
                          "floor near 0.95 sits in territory that document does not characterise, "
                          "so the WebGPU value must not be reused here.",
            },
        },
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

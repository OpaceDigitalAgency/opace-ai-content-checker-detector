#!/usr/bin/env python3
"""Baseline the CURRENTLY DEPLOYED cycle-2 model on the new human short-form
passages, using the deployed segmentation + calibration + aggregation exactly.

Runtime: fp32 ONNX (the server runtime). Figures must be quoted as such.
"""
import os, sys, json, collections, statistics

RS = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
SERVER = os.path.join(RS, "model-shrink/reference-server")
sys.path.insert(0, SERVER)

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
import segments as seg

FP32 = os.path.join(RS, "models/tier3-cycle2-e5small-fp32.onnx")
TOK = os.path.join(RS, "cycle2-train/cycle2-checkpoint")

TEMPERATURE = 0.8324
PRIMARY = 0.9845
SECONDARY = 0.9765

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    inp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "human-shortform.jsonl")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "baseline-scores.jsonl")
    rows = [json.loads(l) for l in open(inp)]

    tok = AutoTokenizer.from_pretrained(TOK)
    so = ort.SessionOptions()
    so.intra_op_num_threads = max(4, (os.cpu_count() or 4) // 2)
    sess = ort.InferenceSession(FP32, so, providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]

    def count_tokens(texts):
        """Batched token counter, as segments.py expects."""
        enc = tok(list(texts), add_special_tokens=False)["input_ids"]
        return [len(ids) for ids in enc]

    def score_texts(texts):
        ps = []
        for i in range(0, len(texts), 16):
            enc = tok(texts[i:i + 16], truncation=True, max_length=512,
                      padding=True, return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in names if n in enc}
            lg = sess.run(None, feed)[0]
            m = lg[:, 1] - lg[:, 0]
            ps.extend((1.0 / (1.0 + np.exp(-m / TEMPERATURE))).tolist())
        return ps

    results = []
    for k, r in enumerate(rows):
        segs = seg.segment_text(r["text"], count_tokens)
        texts = [s.text for s in segs]
        ps = score_texts(texts)
        ps_sorted = sorted(ps, reverse=True)
        top = ps_sorted[0]
        runner = ps_sorted[1] if len(ps_sorted) > 1 else 0.0
        flagged = bool(top >= PRIMARY or (runner >= SECONDARY and top >= PRIMARY))
        # deployed rule: primary fires, OR top>=primary and second>=secondary.
        # The second clause cannot fire without the first, so primary governs.
        results.append({**{k2: r[k2] for k2 in
                           ("id", "group", "target_len", "word_count", "published",
                            "modified", "source_url", "categories")},
                        "n_segments": len(segs),
                        "probability_ai": top,
                        "runner_up": runner,
                        "flagged": flagged})
        if k % 200 == 0:
            print(f"  {k}/{len(rows)}", flush=True)

    with open(out, "w") as fh:
        for r in results:
            fh.write(json.dumps(r) + "\n")

    print(f"\nfp32 server runtime, deployed segmentation + calibration, "
          f"primary threshold {PRIMARY}")
    print(f"n = {len(results)} human short-form passages from "
          f"{len(set(r['group'] for r in results))} pre-2021 Opace blog posts\n")
    tot_f = sum(r["flagged"] for r in results)
    print(f"OVERALL false positives: {tot_f}/{len(results)} "
          f"({100*tot_f/len(results):.2f}%)\n")
    print(f"{'band':>6} {'n':>5} {'FP':>4} {'FP rate':>9} {'median p':>9} {'p90':>7} {'max p':>7}")
    for t in (100, 300, 400, 600):
        sub = [r for r in results if r["target_len"] == t]
        if not sub:
            continue
        f = sum(r["flagged"] for r in sub)
        ps = sorted(r["probability_ai"] for r in sub)
        p90 = ps[int(0.9 * (len(ps) - 1))]
        print(f"{t:>6} {len(sub):>5} {f:>4} {100*f/len(sub):>8.2f}% "
              f"{statistics.median(ps):>9.4f} {p90:>7.4f} {max(ps):>7.4f}")

    band = collections.Counter()
    for r in results:
        p = r["probability_ai"]
        band["0.75-0.9845 (grey)" if 0.75 <= p < PRIMARY else
             ">=0.9845 (flagged)" if p >= PRIMARY else "<0.75 (clear)"] += 1
    print("\nscore distribution:", dict(band))


if __name__ == "__main__":
    main()

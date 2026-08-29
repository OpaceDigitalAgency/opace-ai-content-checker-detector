#!/usr/bin/env python3
"""Score the pilot AI short-form samples with the CURRENTLY DEPLOYED model and
report detection by length band x prompt style.

Runtime: fp32 ONNX (server runtime), deployed segmentation, deployed
calibration p = sigmoid(margin / 0.8324), primary threshold 0.9845, max
aggregation. No retraining, no threshold change.
"""
import os, sys, json, collections, statistics

RS = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
      "ai-watermark-and-content-authenticity/implementation/services/local-engine/research")
sys.path.insert(0, os.path.join(RS, "model-shrink/reference-server"))

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
import segments as seg

FP32 = os.path.join(RS, "models/tier3-cycle2-e5small-fp32.onnx")
TOK = os.path.join(RS, "cycle2-train/cycle2-checkpoint")
TEMPERATURE, PRIMARY = 0.8324, 0.9845
HERE = os.path.dirname(os.path.abspath(__file__))


def wilson(k, n):
    if n == 0:
        return (0.0, 0.0)
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def main():
    inp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "pilot-ai-samples.jsonl")
    rows = [json.loads(l) for l in open(inp)]
    tok = AutoTokenizer.from_pretrained(TOK)
    so = ort.SessionOptions()
    so.intra_op_num_threads = max(4, (os.cpu_count() or 4) // 2)
    sess = ort.InferenceSession(FP32, so, providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]

    def count_tokens(texts):
        return [len(x) for x in tok(list(texts), add_special_tokens=False)["input_ids"]]

    def score(texts):
        ps = []
        for i in range(0, len(texts), 16):
            enc = tok(texts[i:i+16], truncation=True, max_length=512,
                      padding=True, return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in names if n in enc}
            lg = sess.run(None, feed)[0]
            m = lg[:, 1] - lg[:, 0]
            ps.extend((1.0 / (1.0 + np.exp(-m / TEMPERATURE))).tolist())
        return ps

    out = []
    for k, r in enumerate(rows):
        segs = seg.segment_text(r["text"], count_tokens)
        p = max(score([s.text for s in segs]))
        out.append({**{x: r[x] for x in ("id", "style", "target_len", "word_count",
                                         "model_label", "topic", "group",
                                         "discourse_per_1k")},
                    "n_segments": len(segs), "probability_ai": p,
                    "detected": bool(p >= PRIMARY)})
        if k % 200 == 0:
            print(f"  {k}/{len(rows)}", flush=True)

    with open(os.path.join(HERE, "pilot-scores.jsonl"), "w") as fh:
        for r in out:
            fh.write(json.dumps(r) + "\n")

    print("\nfp32 server runtime, deployed segmentation + calibration, "
          f"primary threshold {PRIMARY}, aggregation max")
    print(f"n = {len(out)} AI short-form samples\n")

    styles = ["plain", "house", "humanise"]
    print("DETECTION BY LENGTH BAND x PROMPT STYLE  (detected / n)")
    print(f"{'length':>8} | " + " | ".join(f"{s:^22}" for s in styles) + " |    row total")
    print("-" * 100)
    for L in (100, 300, 400, 600):
        cells = []
        for s in styles:
            sub = [r for r in out if r["target_len"] == L and r["style"] == s]
            d = sum(r["detected"] for r in sub)
            cells.append(f"{d:3d}/{len(sub):<3d} {100*d/max(1,len(sub)):5.1f}%")
        sub = [r for r in out if r["target_len"] == L]
        d = sum(r["detected"] for r in sub)
        print(f"{L:>8} | " + " | ".join(f"{c:^22}" for c in cells) +
              f" | {d:3d}/{len(sub):<3d} {100*d/max(1,len(sub)):5.1f}%")
    print("-" * 100)
    cells = []
    for s in styles:
        sub = [r for r in out if r["style"] == s]
        d = sum(r["detected"] for r in sub)
        lo, hi = wilson(d, len(sub))
        cells.append(f"{d:3d}/{len(sub):<3d} {100*d/max(1,len(sub)):5.1f}%")
    print(f"{'ALL':>8} | " + " | ".join(f"{c:^22}" for c in cells) + " |")

    print("\nstyle totals with 95% Wilson CI:")
    for s in styles:
        sub = [r for r in out if r["style"] == s]
        d = sum(r["detected"] for r in sub)
        lo, hi = wilson(d, len(sub))
        md = statistics.median(r["probability_ai"] for r in sub)
        mdisc = statistics.median(r["discourse_per_1k"] for r in sub)
        print(f"  {s:9s} {d:3d}/{len(sub):<3d} {100*d/len(sub):5.1f}%  "
              f"CI [{lo:.1f}, {hi:.1f}]  median p={md:.4f}  median discourse/1k={mdisc:.2f}")

    print("\nlength totals with 95% Wilson CI:")
    for L in (100, 300, 400, 600):
        sub = [r for r in out if r["target_len"] == L]
        d = sum(r["detected"] for r in sub)
        lo, hi = wilson(d, len(sub))
        md = statistics.median(r["probability_ai"] for r in sub)
        print(f"  {L:>3}w {d:3d}/{len(sub):<3d} {100*d/len(sub):5.1f}%  "
              f"CI [{lo:.1f}, {hi:.1f}]  median p={md:.4f}")

    print("\nby model (sanity: model is balanced inside every cell):")
    for m in sorted(set(r["model_label"] for r in out)):
        sub = [r for r in out if r["model_label"] == m]
        d = sum(r["detected"] for r in sub)
        print(f"  {m:14s} {d:3d}/{len(sub):<3d} {100*d/len(sub):5.1f}%")

    print("\nhumanise style broken out by model and length:")
    for m in sorted(set(r["model_label"] for r in out)):
        for L in (100, 300, 400, 600):
            sub = [r for r in out if r["model_label"] == m and r["style"] == "humanise"
                   and r["target_len"] == L]
            if sub:
                d = sum(r["detected"] for r in sub)
                print(f"  {m:14s} {L:>3}w  {d:3d}/{len(sub):<3d} {100*d/len(sub):5.1f}%")


if __name__ == "__main__":
    main()

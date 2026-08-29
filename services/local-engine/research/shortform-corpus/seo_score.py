#!/usr/bin/env python3
"""Score the SEO-repetition samples and compare against the matched-length
baseline cells from the pilot. Length is held constant; repetition is the only
thing that changes.

Runtime: fp32 ONNX (server), deployed segmentation + calibration, threshold 0.9845.
"""
import os, sys, json, statistics, collections
RS = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
      "ai-watermark-and-content-authenticity/implementation/services/local-engine/research")
sys.path.insert(0, os.path.join(RS, "model-shrink/reference-server"))
import numpy as np, onnxruntime as ort
from transformers import AutoTokenizer
import segments as seg

FP32 = os.path.join(RS, "models/tier3-cycle2-e5small-fp32.onnx")
TOK = os.path.join(RS, "cycle2-train/cycle2-checkpoint")
TEMPERATURE, PRIMARY = 0.8324, 0.9845
HERE = os.path.dirname(os.path.abspath(__file__))


def wilson(k, n):
    if n == 0:
        return (0., 0.)
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** .5) / d
    return (max(0., c - h) * 100, min(1., c + h) * 100)


def ttr(t):
    w = [x.lower().strip('.,;:!?"\'()') for x in t.split()]
    return len(set(w)) / max(1, len(w))


def main():
    tok = AutoTokenizer.from_pretrained(TOK)
    so = ort.SessionOptions(); so.intra_op_num_threads = max(4, (os.cpu_count() or 4) // 2)
    sess = ort.InferenceSession(FP32, so, providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]
    ct = lambda ts: [len(x) for x in tok(list(ts), add_special_tokens=False)["input_ids"]]

    def score_one(text):
        segs = seg.segment_text(text, ct)
        ts = [s.text for s in segs]
        ps = []
        for i in range(0, len(ts), 16):
            enc = tok(ts[i:i+16], truncation=True, max_length=512, padding=True,
                      return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in names if n in enc}
            lg = sess.run(None, feed)[0]; m = lg[:, 1] - lg[:, 0]
            ps.extend((1.0 / (1.0 + np.exp(-m / TEMPERATURE))).tolist())
        return max(ps)

    rows = []
    for fn, cond in (("seo-moderate.jsonl", "seo-moderate"),
                     ("seo-heavy.jsonl", "seo-heavy")):
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            print(f"!! missing {fn}"); continue
        for l in open(p):
            r = json.loads(l); r["cond"] = cond; rows.append(r)
    # baseline: the pilot's three styles, pooled, same lengths
    for l in open(os.path.join(HERE, "pilot-ai-samples.jsonl")):
        r = json.loads(l); r["cond"] = "baseline (pilot, 3 styles)"
        r["ttr"] = ttr(r["text"]); rows.append(r)

    print(f"scoring {len(rows)} samples ...", flush=True)
    for k, r in enumerate(rows):
        r["probability_ai"] = score_one(r["text"])
        r["detected"] = bool(r["probability_ai"] >= PRIMARY)
        if k % 300 == 0:
            print(f"  {k}/{len(rows)}", flush=True)

    with open(os.path.join(HERE, "seo-scores.jsonl"), "w") as fh:
        for r in rows:
            fh.write(json.dumps({x: r.get(x) for x in
                     ("id", "cond", "style", "target_len", "word_count", "ttr",
                      "model_label", "topic", "keyword", "group",
                      "probability_ai", "detected")}) + "\n")

    CONDS = ["baseline (pilot, 3 styles)", "seo-moderate", "seo-heavy"]
    print(f"\nfp32 server runtime, deployed segmentation + calibration, "
          f"threshold {PRIMARY}, aggregation max")
    print("Length held constant; repetition is the only variable.\n")

    print("ACHIEVED TYPE-TOKEN RATIO (median) — did the instruction move it?")
    print(f"{'band':>6} | " + " | ".join(f"{c:^26}" for c in CONDS))
    for L in (100, 300, 400, 600):
        cells = []
        for c in CONDS:
            sub = [r for r in rows if r["cond"] == c and r["target_len"] == L]
            cells.append(f"{statistics.median(r['ttr'] for r in sub):.3f} (n={len(sub)})"
                         if sub else "-")
        print(f"{L:>6} | " + " | ".join(f"{x:^26}" for x in cells))

    print("\nDETECTION BY LENGTH x REPETITION  (detected / n)")
    print(f"{'band':>6} | " + " | ".join(f"{c:^26}" for c in CONDS))
    print("-" * 96)
    for L in (100, 300, 400, 600):
        cells = []
        for c in CONDS:
            sub = [r for r in rows if r["cond"] == c and r["target_len"] == L]
            if not sub:
                cells.append("-"); continue
            d = sum(r["detected"] for r in sub)
            cells.append(f"{d:3d}/{len(sub):<3d} {100*d/len(sub):5.1f}%")
        print(f"{L:>6} | " + " | ".join(f"{x:^26}" for x in cells))
    print("-" * 96)
    cells = []
    for c in CONDS:
        sub = [r for r in rows if r["cond"] == c]
        d = sum(r["detected"] for r in sub)
        lo, hi = wilson(d, len(sub))
        cells.append(f"{d:3d}/{len(sub):<4d} {100*d/len(sub):5.1f}%")
    print(f"{'ALL':>6} | " + " | ".join(f"{x:^26}" for x in cells))

    print("\nper condition, 95% Wilson CI:")
    for c in CONDS:
        sub = [r for r in rows if r["cond"] == c]
        d = sum(r["detected"] for r in sub)
        lo, hi = wilson(d, len(sub))
        print(f"  {c:28s} {d:4d}/{len(sub):<5d} {100*d/len(sub):5.1f}%  "
              f"CI [{lo:.1f}, {hi:.1f}]  median TTR {statistics.median(r['ttr'] for r in sub):.3f}")

    print("\nDROP vs matched-length baseline (percentage points):")
    for L in (100, 300, 400, 600):
        b = [r for r in rows if r["cond"] == CONDS[0] and r["target_len"] == L]
        br = 100 * sum(r["detected"] for r in b) / max(1, len(b))
        line = f"  {L:>3}w baseline {br:5.1f}% (n={len(b)})"
        for c in CONDS[1:]:
            s = [r for r in rows if r["cond"] == c and r["target_len"] == L]
            if s:
                sr = 100 * sum(r["detected"] for r in s) / len(s)
                line += f" | {c.split('-')[1]:8s} {sr:5.1f}% (n={len(s)}) {sr-br:+6.1f}pp"
        print(line)

    print("\nAt the owner's article TTR (0.48-0.55), 400w and 600w pooled:")
    sub = [r for r in rows if r["target_len"] in (400, 600) and 0.48 <= r["ttr"] <= 0.55]
    d = sum(r["detected"] for r in sub)
    lo, hi = wilson(d, len(sub))
    print(f"  {d}/{len(sub)} = {100*d/max(1,len(sub)):.1f}%  CI [{lo:.1f}, {hi:.1f}]")
    b = [r for r in rows if r["cond"] == CONDS[0] and r["target_len"] in (400, 600)]
    print(f"  matched-length baseline: {sum(r['detected'] for r in b)}/{len(b)} = "
          f"{100*sum(r['detected'] for r in b)/len(b):.1f}%")


if __name__ == "__main__":
    main()

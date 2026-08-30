"""Verdict-flip rate between the fp32 and int8 exports AT THE OPERATING POINT
the model would actually ship on, not only at the calibration FPR budgets.

The export gate measures flips at five cal thresholds. Those are useful, but
the number that matters for a shipped model is the flip rate at the pair the
front end would use, on documents rather than on single passages - the
minimum-evidence rule reads two sections, so a flip in one segment does not
necessarily flip a verdict.
"""
from __future__ import annotations

import argparse
import json
import os

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

RESEARCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RESEARCH, "model-shrink", "reference-server")
import sys
sys.path.insert(0, REF)
from segments import segment_text  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fp32", required=True)
    ap.add_argument("--int8", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--temperature", type=float, required=True)
    ap.add_argument("--primary", type=float, required=True)
    ap.add_argument("--secondary", type=float, required=True)
    ap.add_argument("--sets", nargs="+", required=True)
    ap.add_argument("--limit", type=int, default=1200)
    a = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(a.tokenizer)
    so = ort.SessionOptions()
    so.log_severity_level = 3
    s32 = ort.InferenceSession(a.fp32, so, providers=["CPUExecutionProvider"])
    s8 = ort.InferenceSession(a.int8, so, providers=["CPUExecutionProvider"])
    names = [i.name for i in s32.get_inputs()]

    def count_tokens(strings):
        strings = list(strings)
        if not strings:
            return []
        return [len(i) for i in tok(strings, add_special_tokens=False,
                                    truncation=False)["input_ids"]]

    def score(sess, texts):
        out = []
        for i in range(0, len(texts), 16):
            e = tok(texts[i:i + 16], truncation=True, max_length=512,
                    padding="max_length", return_tensors="np")
            lg = sess.run(None, {n: e[n].astype(np.int64) for n in names if n in e})[0]
            m = lg[:, 1] - lg[:, 0]
            out.extend((1 / (1 + np.exp(-m / a.temperature))).tolist())
        return out

    def flag(ps):
        p = sorted(ps, reverse=True)
        return bool(p and (p[0] >= a.primary
                           or (len(p) > 1 and p[1] >= a.secondary)))

    n = flips = segs = seg_flips = 0
    dmax = 0.0
    dsum = 0.0
    for path in a.sets:
        rows = [json.loads(l) for l in open(path)][:a.limit]
        for r in rows:
            parts = [p.text for p in segment_text(r["text"], count_tokens)]
            p32, p8 = score(s32, parts), score(s8, parts)
            d = [abs(x - y) for x, y in zip(p32, p8)]
            dsum += sum(d)
            segs += len(d)
            dmax = max(dmax, max(d) if d else 0.0)
            seg_flips += sum(1 for x, y in zip(p32, p8)
                             if (x >= a.primary) != (y >= a.primary))
            n += 1
            if flag(p32) != flag(p8):
                flips += 1
        print(f"  {os.path.basename(path)}: {n} docs, {flips} verdict flips",
              flush=True)

    print(json.dumps({
        "documents": n,
        "segments": segs,
        "operating_point": [a.primary, a.secondary],
        "document_verdict_flips": flips,
        "document_flip_rate": round(flips / n, 5) if n else None,
        "segment_flips_at_primary": seg_flips,
        "segment_flip_rate": round(seg_flips / segs, 5) if segs else None,
        "mean_abs_prob_drift": round(dsum / segs, 5) if segs else None,
        "max_abs_prob_drift": round(dmax, 5),
    }, indent=2))


if __name__ == "__main__":
    main()

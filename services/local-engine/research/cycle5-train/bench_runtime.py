"""Browser-representative runtime check for the cycle-5 int8 export.

Honest scope: this is onnxruntime's CPU provider on this Mac, NOT the wasm
runtime in a browser tab. It is quoted as a proxy with threads=1 (closest to
single-threaded wasm) and threads=8, per segment, including tokenisation and
the structural-feature extraction the cycle-5 head needs. The browser
runtime's own curve remains unmeasured, exactly as it is for the shipped
model (TEST-EVIDENCE.md notes ~5 h to measure it).

Usage: bench_runtime.py <int8.onnx> <ckpt-dir> [n_docs]
"""
from __future__ import annotations

import json
import os
import statistics
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(RESEARCH, "model-shrink", "reference-server"))

from segments import segment_text  # noqa: E402
from struct_features import extract as feat_extract  # noqa: E402
from model_lib import apply_norm  # noqa: E402


def bench(onnx_path, ckpt, docs, threads):
    import onnxruntime as ort
    from transformers import AutoTokenizer
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    opts.log_severity_level = 3
    sess = ort.InferenceSession(onnx_path, opts, providers=["CPUExecutionProvider"])
    tok = AutoTokenizer.from_pretrained(ckpt)
    norm = json.load(open(os.path.join(ckpt, "feat-norm.json")))

    def count_tokens(ss):
        ss = list(ss)
        return [len(i) for i in tok(ss, add_special_tokens=False,
                                    truncation=False)["input_ids"]] if ss else []

    per_seg, per_doc, feat_ms = [], [], []
    for text in docs:
        t0 = time.perf_counter()
        parts = segment_text(text, count_tokens)
        for p in parts:
            tf = time.perf_counter()
            z = apply_norm(feat_extract(p.text), norm).astype(np.float32)
            feat_ms.append((time.perf_counter() - tf) * 1000)
            ts = time.perf_counter()
            enc = tok([p.text], truncation=True, max_length=512,
                      padding="max_length", return_tensors="np")
            sess.run(None, {"input_ids": enc["input_ids"].astype(np.int64),
                            "attention_mask": enc["attention_mask"].astype(np.int64),
                            "feats": z[None, :]})
            per_seg.append((time.perf_counter() - ts) * 1000)
        per_doc.append((time.perf_counter() - t0) * 1000)
    med = statistics.median
    return {"threads": threads, "docs": len(docs), "segments": len(per_seg),
            "ms_per_segment_median": round(med(per_seg), 1),
            "ms_per_segment_p95": round(sorted(per_seg)[int(.95 * len(per_seg))], 1),
            "ms_feature_extraction_median": round(med(feat_ms), 2),
            "ms_per_doc_median": round(med(per_doc), 1),
            "ms_per_doc_p95": round(sorted(per_doc)[int(.95 * len(per_doc))], 1)}


def main():
    onnx_path, ckpt = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    docs = []
    for line in open(os.path.join(HERE, "c3sets", "lf-ai.jsonl")):
        docs.append(json.loads(line)["text"])
        if len(docs) >= n:
            break
    out = {"model": os.path.basename(onnx_path),
           "size_mb": round(os.path.getsize(onnx_path) / 1e6, 1),
           "note": "onnxruntime CPU on this Mac; proxy for the browser, not the "
                   "browser. threads=1 approximates single-threaded wasm.",
           "runs": [bench(onnx_path, ckpt, docs, t) for t in (1, 8)]}
    json.dump(out, open(os.path.join(HERE, "runtime-bench.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

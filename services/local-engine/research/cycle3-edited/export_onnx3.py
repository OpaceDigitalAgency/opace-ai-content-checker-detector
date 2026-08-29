"""Export the cycle-3 checkpoint to ONNX, per-channel int8, under NEW filenames.

Never opens tier3-e5small-* or tier3-cycle2-* for writing. Same input/output
signature as the cycle-2 export, so the browser runtime needs no code change:
two logits, margin = logits[1] - logits[0].
"""
from __future__ import annotations

import json
import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

import common3 as C

CKPT = os.path.join(C.HERE, os.environ.get("CKPT_NAME","cycle3b-checkpoint"))
FP32 = os.path.join(C.MODELS, "tier3-cycle3-e5small-fp32.onnx")
INT8 = os.path.join(C.MODELS, "tier3-cycle3-e5small-int8-perchannel.onnx")
FORBIDDEN = ("tier3-e5small", "tier3-cycle2")
MAX_LEN = 512


def main():
    for p in (FP32, INT8):
        assert not any(f in os.path.basename(p) for f in FORBIDDEN), p
        assert not os.path.exists(p) or os.environ.get("ALLOW_OVERWRITE"), f"{p} exists"
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).eval()
    enc = tok("example text for tracing", return_tensors="pt",
              padding="max_length", truncation=True, max_length=MAX_LEN)
    torch.onnx.export(
        model, (enc.input_ids, enc.attention_mask), FP32,
        input_names=["input_ids", "attention_mask"], output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "seq"},
                      "attention_mask": {0: "batch", 1: "seq"},
                      "logits": {0: "batch"}},
        opset_version=14)
    from onnxruntime.quantization import QuantType, quantize_dynamic
    quantize_dynamic(FP32, INT8, weight_type=QuantType.QInt8, per_channel=True)

    # drift gate on the cal split, same bar as cycle 2
    import onnxruntime as ort
    cal = [r for r in C.jsonl(os.path.join(C.HERE, "dataset3.jsonl")) if r["split"] == "cal"][:1200]
    sess = ort.InferenceSession(INT8, providers=["CPUExecutionProvider"])
    p_onnx, p_torch = [], []
    with torch.no_grad():
        for i in range(0, len(cal), 16):
            chunk = [r["text"] for r in cal[i:i + 16]]
            e = tok(chunk, truncation=True, max_length=MAX_LEN, padding="max_length",
                    return_tensors="pt")
            lt = model(input_ids=e.input_ids, attention_mask=e.attention_mask).logits.numpy()
            lo = sess.run(None, {"input_ids": e.input_ids.numpy().astype(np.int64),
                                 "attention_mask": e.attention_mask.numpy().astype(np.int64)})[0]
            p_torch.append(1 / (1 + np.exp(-(lt[:, 1] - lt[:, 0]))))
            p_onnx.append(1 / (1 + np.exp(-(lo[:, 1] - lo[:, 0]))))
    a, b = np.concatenate(p_torch), np.concatenate(p_onnx)
    d = np.abs(a - b)
    from scipy.stats import spearmanr
    rep = {"fp32_onnx": os.path.basename(FP32), "int8_onnx": os.path.basename(INT8),
           "quantisation": "dynamic, QInt8, per_channel=True",
           "size_mb": {os.path.basename(p): round(os.path.getsize(p) / 1e6, 1) for p in (FP32, INT8)},
           "cal_rows_checked": len(a),
           "drift_vs_torch_fp32": {"mean": round(float(d.mean()), 4),
                                   "p95": round(float(np.percentile(d, 95)), 4),
                                   "max": round(float(d.max()), 4)},
           "rank_correlation_spearman": round(float(spearmanr(a, b).statistic), 5),
           "limits": {"mean": 0.05, "max": 0.25},
           "pass": bool(d.mean() <= 0.05 and d.max() <= 0.25)}
    json.dump(rep, open(os.path.join(C.HERE, "onnx-export3.json"), "w"), indent=2)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()

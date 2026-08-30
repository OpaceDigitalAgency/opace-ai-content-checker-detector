"""Export the cycle-3 checkpoint to ONNX: fp32 for the server, int8 per-channel
for the browser. Same process as cycle2-train/export_onnx.py.

Per-channel is mandatory on this project: per-tensor int8 was measured on cycle
1 to shift the mean probability by 0.22 and flip 23 verdicts. This script
re-measures the fp32 -> int8 drift on the CAL split and reports it against the
same gate cycle 2 passed (mean drift < 0.05, verdict flip rate < 0.01).

Writes NEW filenames only. The shipped pair
(tier3-e5small-int8-perchannel.onnx / tier3-config.json) is never opened for
writing, and neither are the cycle-2 files.
"""
from __future__ import annotations

import json
import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
MODELS = os.path.join(RESEARCH, "models")
CKPT = os.path.join(HERE, "cycle3-checkpoint")
FP32 = os.path.join(MODELS, "tier3-cycle3-e5small-fp32.onnx")
INT8 = os.path.join(MODELS, "tier3-cycle3-e5small-int8-perchannel.onnx")
PROTECTED = {os.path.join(MODELS, "tier3-e5small-int8-perchannel.onnx"),
             os.path.join(MODELS, "tier3-cycle2-e5small-fp32.onnx"),
             os.path.join(MODELS, "tier3-cycle2-e5small-int8-perchannel.onnx")}
MAX_LEN = 512
DRIFT_MEAN_LIMIT = 0.05
FLIP_RATE_LIMIT = 0.01


def main() -> None:
    for p in (FP32, INT8):
        assert os.path.abspath(p) not in {os.path.abspath(q) for q in PROTECTED}, \
            f"refusing to overwrite a shipped or cycle-2 model: {p}"
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
        opset_version=14, dynamo=False,
    )
    from onnxruntime.quantization import QuantType, quantize_dynamic
    quantize_dynamic(FP32, INT8, weight_type=QuantType.QInt8, per_channel=True)

    # drift gate on the CAL split, against the torch fp32 the export came from
    import onnxruntime as ort
    rep = json.load(open(os.path.join(HERE, "train-report.json")))
    T = rep["temperature"]
    cal = [json.loads(l) for l in open(os.path.join(HERE, "dataset.jsonl"))
           if json.loads(l)["split"] == "cal"]
    texts = [r["text"] for r in cal]

    def onnx_probs(path):
        so = ort.SessionOptions()
        so.log_severity_level = 3
        s = ort.InferenceSession(path, so, providers=["CPUExecutionProvider"])
        names = [i.name for i in s.get_inputs()]
        out = []
        for i in range(0, len(texts), 16):
            e = tok(texts[i:i + 16], truncation=True, max_length=MAX_LEN,
                    padding="max_length", return_tensors="np")
            lg = s.run(None, {n: e[n].astype(np.int64) for n in names if n in e})[0]
            m = lg[:, 1] - lg[:, 0]
            out.append(m)
        return np.concatenate(out)

    m32, m8 = onnx_probs(FP32), onnx_probs(INT8)
    p32, p8 = 1/(1+np.exp(-m32/T)), 1/(1+np.exp(-m8/T))
    d = np.abs(p32 - p8)
    flips = {}
    for name, thr in rep["thresholds_cal"].items():
        t = thr["threshold_margin"]
        n = int(((m32 > t) != (m8 > t)).sum())
        flips[name] = {"threshold_margin": t, "verdict_flips": n,
                       "flip_rate": round(n / len(cal), 5)}
    from scipy.stats import spearmanr
    out = {
        "fp32_onnx": os.path.basename(FP32),
        "int8_onnx": os.path.basename(INT8),
        "quantisation": "dynamic, QInt8, per_channel=True",
        "size_mb": {os.path.basename(p): round(os.path.getsize(p) / 1e6, 1)
                    for p in (FP32, INT8)},
        "cal_rows_checked": len(cal),
        "prob_drift_fp32_vs_int8": {
            "mean": round(float(d.mean()), 4),
            "p95": round(float(np.percentile(d, 95)), 4),
            "max": round(float(d.max()), 4)},
        "spearman": round(float(spearmanr(m32, m8).statistic), 5),
        "verdict_flips_at_operating_thresholds": flips,
        "gate": {"mean_drift_limit": DRIFT_MEAN_LIMIT,
                 "flip_rate_limit": FLIP_RATE_LIMIT},
        "pass": bool(d.mean() < DRIFT_MEAN_LIMIT and
                     max(f["flip_rate"] for f in flips.values()) < FLIP_RATE_LIMIT),
    }
    json.dump(out, open(os.path.join(HERE, "onnx-export-report.json"), "w"), indent=2)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()

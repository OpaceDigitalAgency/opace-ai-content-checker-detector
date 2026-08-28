"""Export the fine-tuned Tier 3 classifier to ONNX with int8 dynamic quantisation."""

from __future__ import annotations

import json
import os

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
CKPT = os.path.join(HERE, "checkpoint")
MODELS = os.path.join(HERE, "..", "models")
FP32 = os.path.join(MODELS, "tier3-e5small.onnx")
INT8 = os.path.join(MODELS, "tier3-e5small-int8.onnx")


def main() -> None:
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).eval()
    enc = tok("example text for tracing", return_tensors="pt",
              padding="max_length", truncation=True, max_length=512)
    os.makedirs(MODELS, exist_ok=True)
    torch.onnx.export(
        model,
        (enc.input_ids, enc.attention_mask),
        FP32,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq"},
            "attention_mask": {0: "batch", 1: "seq"},
            "logits": {0: "batch"},
        },
        opset_version=14,
    )
    from onnxruntime.quantization import QuantType, quantize_dynamic

    # per_channel is REQUIRED: per-tensor int8 degrades this model badly
    # (max |fp32-int8| prob delta 0.68, 23/74 verdict flips at 0.405 vs
    # 0.12 / 1 with per-channel — see eval/onnx-reconciliation.json).
    quantize_dynamic(FP32, INT8, weight_type=QuantType.QInt8, per_channel=True)

    # parity check: int8 vs torch on a handful of texts
    import numpy as np
    import onnxruntime as ort

    sess = ort.InferenceSession(INT8, providers=["CPUExecutionProvider"])
    texts = [
        "The committee reviewed the proposal and asked for further evidence before approving the budget.",
        "In conclusion, leveraging these synergies unlocks a robust framework for seamless integration.",
    ]
    for t in texts:
        e = tok(t, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            pt = torch.softmax(model(**{k: v for k, v in e.items()}).logits.float(), -1)[0, 1].item()
        logits = sess.run(None, {"input_ids": e.input_ids.numpy(),
                                 "attention_mask": e.attention_mask.numpy()})[0]
        ex = np.exp(logits[0] - logits[0].max())
        ox = float((ex / ex.sum())[1])
        print(f"torch={pt:.4f} onnx-int8={ox:.4f} delta={abs(pt-ox):.4f} :: {t[:50]}")

    sizes = {p: round(os.path.getsize(p) / 1e6, 1) for p in (FP32, INT8)}
    print(json.dumps(sizes, indent=2))
    with open(os.path.join(MODELS, "tier3-sizes.json"), "w") as f:
        json.dump(sizes, f, indent=2)


if __name__ == "__main__":
    main()

"""Job 1 - reconcile int8 ONNX against the fp32 torch checkpoint, definitively.

Scores the FULL quarantined eval set (34) and all 40 fresh corpus humans
(implementation/tests/battery/human-corpus-v1.json) with:
  (a) torch fp32 checkpoint (the eval-report reference),
  (b) the shipped int8 ONNX (per-tensor dynamic quantisation),
  (c) a per-channel int8 re-quantisation,
  (d) an fp16 conversion,
all using IDENTICAL preprocessing: tokenizer loaded from tier3/checkpoint
(same vocab as intfloat/e5-small), truncation max_length=512, no padding,
no e5 "query:" prefix (the model was fine-tuned without one), softmax over
the 2 logits.

Output: per-sample table + max/mean |fp32 - variant| per variant, written to
eval/onnx-reconciliation.json. This tells us whether the orchestrator's lower
numbers are quantisation degradation or preprocessing drift.
"""

from __future__ import annotations

import json
import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
MODELS = os.path.join(HERE, "..", "models")
FP32_ONNX = os.path.join(MODELS, "tier3-e5small.onnx")
INT8_ONNX = os.path.join(MODELS, "tier3-e5small-int8.onnx")
INT8PC_ONNX = os.path.join(MODELS, "tier3-e5small-int8-perchannel.onnx")
FP16_ONNX = os.path.join(MODELS, "tier3-e5small-fp16.onnx")

EVAL_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)
FRESH_PATH = os.path.join(
    HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v1.json"
)


SKIP_FP16 = os.environ.get("SKIP_FP16", "0") == "1"


def build_variants() -> None:
    from onnxruntime.quantization import QuantType, quantize_dynamic

    if not os.path.exists(INT8PC_ONNX):
        quantize_dynamic(FP32_ONNX, INT8PC_ONNX, weight_type=QuantType.QInt8,
                         per_channel=True)
    if SKIP_FP16:
        return
    if not os.path.exists(FP16_ONNX):
        import onnx
        from onnxconverter_common import float16

        m = onnx.load(FP32_ONNX)
        m16 = float16.convert_float_to_float16(
            m, keep_io_types=True,
            op_block_list=float16.DEFAULT_OP_BLOCK_LIST + ["Cast"],
        )
        onnx.save(m16, FP16_ONNX)


def main() -> None:
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).eval()
    build_variants()

    import onnxruntime as ort

    sessions = {
        "onnx_fp32": ort.InferenceSession(FP32_ONNX, providers=["CPUExecutionProvider"]),
        "int8": ort.InferenceSession(INT8_ONNX, providers=["CPUExecutionProvider"]),
        "int8_pc": ort.InferenceSession(INT8PC_ONNX, providers=["CPUExecutionProvider"]),
    }
    if not SKIP_FP16:
        sessions["fp16"] = ort.InferenceSession(FP16_ONNX, providers=["CPUExecutionProvider"])

    texts = []
    for s in json.load(open(EVAL_PATH)):
        texts.append(("eval", s["id"], s["label"], s["text"]))
    for s in json.load(open(FRESH_PATH)):
        texts.append(("fresh-human", s["id"], "human", s["text"]))

    rows = []
    for group, sid, label, text in texts:
        enc = tok(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            p_t = torch.softmax(model(**enc).logits.float(), -1)[0, 1].item()
        feeds = {
            "input_ids": enc.input_ids.numpy(),
            "attention_mask": enc.attention_mask.numpy(),
        }
        row = {"group": group, "id": sid, "label": label, "torch_fp32": round(p_t, 4)}
        for name, sess in sessions.items():
            logits = sess.run(None, feeds)[0][0].astype(np.float64)
            e = np.exp(logits - logits.max())
            row[name] = round(float((e / e.sum())[1]), 4)
        rows.append(row)
        extra = "" if "fp16" not in row else f" fp16={row['fp16']:.3f}"
        print(f"{sid:44s} {label:10s} torch={row['torch_fp32']:.3f} "
              f"onnx32={row['onnx_fp32']:.3f} int8={row['int8']:.3f} "
              f"int8pc={row['int8_pc']:.3f}{extra}", flush=True)

    summary = {}
    for name in sessions:
        d = np.array([abs(r[name] - r["torch_fp32"]) for r in rows])
        summary[name] = {
            "max_abs_delta": round(float(d.max()), 4),
            "mean_abs_delta": round(float(d.mean()), 4),
            "n_crossing_0.405": int(sum(
                (r["torch_fp32"] >= 0.405) != (r[name] >= 0.405) for r in rows
            )),
        }
    sizes = {n: round(os.path.getsize(p) / 1e6, 1) for n, p in
             [("int8", INT8_ONNX), ("int8_pc", INT8PC_ONNX), ("fp16", FP16_ONNX)]
             if os.path.exists(p)}
    out = {"preprocessing": "tokenizer=tier3/checkpoint (== intfloat/e5-small vocab), "
                            "truncation=512, no padding, no prefix, softmax over 2 logits",
           "summary_vs_torch_fp32": summary, "sizes_mb": sizes, "per_sample": rows}
    path = os.path.join(HERE, "onnx-reconciliation.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print("\nsummary vs torch fp32:", json.dumps(summary, indent=2))
    print("sizes MB:", sizes)
    print(f"-> {path}")


if __name__ == "__main__":
    main()

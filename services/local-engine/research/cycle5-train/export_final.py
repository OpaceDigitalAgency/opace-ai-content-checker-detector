"""Export the selected cycle-5 checkpoint to ../models/ under NEW names.

Writes tier3-cycle5-<arm>-e5small-fp32.onnx and
tier3-cycle5-<arm>-e5small-int8-perchannel.onnx plus
tier3-cycle5-<arm>-config.json (temperature, feature norm, candidate operating
pair when analyse.py has produced one). Never opens any shipped file for
writing. Usage: export_final.py <arm>
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

import torch
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
MODELS = os.path.join(RESEARCH, "models")
sys.path.insert(0, HERE)
from model_lib import E5Struct, N_FEATS, load_ckpt  # noqa: E402

MAX_LEN = 512


def main():
    arm = sys.argv[1] if len(sys.argv) > 1 else "full"
    ckpt = os.path.join(HERE, f"ckpt-{arm}")
    fp32 = os.path.join(MODELS, f"tier3-cycle5-{arm}-e5small-fp32.onnx")
    int8 = os.path.join(MODELS, f"tier3-cycle5-{arm}-e5small-int8-perchannel.onnx")
    for p in (fp32, int8):
        assert "cycle5" in os.path.basename(p), "refusing to touch a shipped filename"

    model, norm = load_ckpt(ckpt, device="cpu")
    tok = AutoTokenizer.from_pretrained(ckpt)
    enc = tok("example text for tracing", return_tensors="pt",
              padding="max_length", truncation=True, max_length=MAX_LEN)
    torch.onnx.export(
        model, (enc.input_ids, enc.attention_mask, torch.zeros(1, N_FEATS)), fp32,
        input_names=["input_ids", "attention_mask", "feats"],
        output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "seq"},
                      "attention_mask": {0: "batch", 1: "seq"},
                      "feats": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=14)
    from onnxruntime.quantization import QuantType, quantize_dynamic
    quantize_dynamic(fp32, int8, weight_type=QuantType.QInt8, per_channel=True)

    rep = json.load(open(os.path.join(HERE, f"train-report-{arm}.json")))
    cfg = {
        "version": f"tier3-cycle5-{arm}",
        "status": "CANDIDATE — not deployed, no threshold change authorised",
        "base_model": rep["base_model"],
        "architecture": rep["architecture"],
        "temperature": rep["temperature"],
        "selected_epoch": rep["selected_epoch"],
        "gates_pass_at_selection": rep["selected_gates_pass"],
        "feature_names": ["wpp_cv", "sec_within15", "pps_var", "body_mode_share",
                          "spp_cv", "adj_overlap", "cadence_rate", "has_structure"],
        "feature_norm": norm,
        "inputs": "input_ids, attention_mask, feats[8] (z-normed, NaN->0)",
        "onnx": {os.path.basename(p): {
            "size_mb": round(os.path.getsize(p) / 1e6, 1),
            "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
            for p in (fp32, int8)},
    }
    out = os.path.join(MODELS, f"tier3-cycle5-{arm}-config.json")
    json.dump(cfg, open(out, "w"), indent=2)
    print(json.dumps(cfg, indent=2))


if __name__ == "__main__":
    main()

"""Export GPT-2-small (124M) to ONNX int8 (dynamic, PER-CHANNEL) for the
browser Tier 2 runtime, and verify the quantised surprisal features against
models/golden-vectors.json.

Per-channel is mandatory: the Tier 3 reconciliation (SPEC §8.1) showed
per-tensor dynamic int8 destroying calibration on e5-small; the same rule is
applied here and verified, not assumed.

Graph: input_ids [batch, seq] (int64) -> logits [batch, seq, 50257].
No attention_mask input (single full-context window, no padding), no
past-key-values (one forward per window).

Acceptance (SPEC §6, quantised): identical flag/no-flag decisions on all 5
golden texts at the CURRENT head threshold, head probability within 0.05.

Measured ablation (2026-08-28), which fixed the shipping recipe:
  - full int8 per-channel (164.7MB): FAIL, golden-2 delta 0.19;
  - int8 with attention or MLP kept fp32: still FAIL (deltas ~0.15);
  - int8 with lm_head kept fp32 (280MB): PASS, max delta 0.0071;
  - int8 with lm_head weight-only int8 per-column (164.6MB): FAIL, delta 0.092;
  - SHIPPING: int8 per-channel everywhere EXCEPT the lm_head projection,
    whose weight is stored fp16 + Cast (203.0MB): PASS, max delta 0.0072.
The damage is the dynamic (per-tensor) activation quantisation of the final
hidden state feeding lm_head - GPT-2's residual-stream outliers - so no int8
variant of that single matmul survives the surprisal features' sensitivity.
"""

from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
MODELS = os.path.join(HERE, "..", "models")
FP32_PATH = os.path.join(MODELS, "gpt2-fp32.onnx")  # intermediate, not for git
SHIP_PATH = os.path.join(MODELS, "gpt2-int8-lmfp16.onnx")
PROB_TOL = 0.05

from surprisal_features import extract, MAX_TOKENS  # noqa: E402


def export_fp32() -> None:
    from transformers import GPT2LMHeadModel

    model = GPT2LMHeadModel.from_pretrained("gpt2").eval()
    dummy = torch.randint(0, 50257, (1, 8), dtype=torch.int64)
    torch.onnx.export(
        model, (dummy,), FP32_PATH,
        input_names=["input_ids"], output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "seq"},
                      "logits": {0: "batch", 1: "seq"}},
        opset_version=17, do_constant_folding=True,
    )
    print(f"fp32 export -> {FP32_PATH} "
          f"({os.path.getsize(FP32_PATH)/1e6:.1f} MB)")


def quantise_ship(out_path: str) -> None:
    """int8 per-channel everywhere except lm_head, whose weight goes fp16."""
    import onnx
    from onnx import helper, numpy_helper
    from onnxruntime.quantization import QuantType, quantize_dynamic

    # NOTE: Gemm nodes are renamed <name>_MatMul during the quantiser's
    # Gemm->MatMul rewrite, so exclusion lists must carry both spellings.
    lm_names = ["/lm_head/MatMul", "/lm_head/MatMul_MatMul"]
    tmp = out_path + ".tmp"
    quantize_dynamic(
        FP32_PATH, tmp, per_channel=True, weight_type=QuantType.QInt8,
        nodes_to_exclude=lm_names,
        extra_options={"MatMulConstBOnly": True},
    )
    m = onnx.load(tmp)
    g = m.graph
    lm = next(n for n in g.node if n.name == "/lm_head/MatMul")
    wname = lm.input[1]
    init = {i.name: i for i in g.initializer}
    W = numpy_helper.to_array(init[wname])
    g.initializer.remove(init[wname])
    g.initializer.append(numpy_helper.from_array(W.astype(np.float16), wname + "_f16"))
    cast = helper.make_node("Cast", [wname + "_f16"], [wname + "_f32"],
                            name="/lm_head/weight_cast", to=onnx.TensorProto.FLOAT)
    g.node.insert(list(g.node).index(lm), cast)
    lm.input[1] = wname + "_f32"
    onnx.save(m, out_path)
    os.remove(tmp)
    print(f"int8 per-channel + fp16 lm_head -> {out_path} "
          f"({os.path.getsize(out_path)/1e6:.1f} MB)")


def onnx_scorer(path: str):
    import onnxruntime as ort
    from transformers import GPT2TokenizerFast

    tok = GPT2TokenizerFast.from_pretrained("gpt2")
    sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])

    def score(text: str):
        ids = tok(text, truncation=True, max_length=MAX_TOKENS)["input_ids"]
        logits = sess.run(None, {"input_ids": np.array([ids], dtype=np.int64)})[0][0]
        logits = logits.astype(np.float64)
        lp = logits[:-1] - np.log(np.exp(logits[:-1] - logits[:-1].max(-1, keepdims=True))
                                  .sum(-1, keepdims=True)) - logits[:-1].max(-1, keepdims=True)
        targets = np.array(ids[1:])
        tok_lp = lp[np.arange(len(targets)), targets]
        surprisal = -tok_lp / math.log(2)
        ranks = (lp > tok_lp[:, None]).sum(-1) + 1
        return surprisal, ranks.astype(np.int64)

    return score


def verify(path: str) -> bool:
    head = json.load(open(os.path.join(MODELS, "tier2-head.json")))
    golden = json.load(open(os.path.join(MODELS, "golden-vectors.json")))
    mu = np.array(head["standardise"]["mean"])
    sd = np.array(head["standardise"]["std"])
    w = np.array(head["logistic"]["coef"])
    b = head["logistic"]["intercept"]
    thr = head["threshold"]
    score = onnx_scorer(path)
    ok = True
    for name, v in golden["vectors"].items():
        s, r = score(v["text"])
        feats = extract(s, r)
        z = (np.array(feats) - mu) / sd
        p = float(1 / (1 + np.exp(-(z @ w + b))))
        ref = v["head_probability"]
        flag, ref_flag = p >= thr, ref >= thr
        line_ok = abs(p - ref) <= PROB_TOL and flag == ref_flag
        ok &= line_ok
        print(f"{'PASS' if line_ok else 'FAIL'} {name}: p={p:.6f} "
              f"ref={ref:.6f} delta={abs(p-ref):.4f} flag={flag} ref_flag={ref_flag}")
    return ok


def main() -> None:
    if not os.path.exists(FP32_PATH):
        export_fp32()
    quantise_ship(SHIP_PATH)
    if not verify(SHIP_PATH):
        raise SystemExit("shipping variant failed golden tolerance; do not ship")
    print("int8 per-channel + fp16 lm_head PASSES golden tolerance; shipping.")
    sizes = {"gpt2-int8-lmfp16.onnx": os.path.getsize(SHIP_PATH),
             "gpt2-fp32.onnx (not shipped)": os.path.getsize(FP32_PATH)}
    with open(os.path.join(MODELS, "gpt2-sizes.json"), "w") as f:
        json.dump(sizes, f, indent=2)


if __name__ == "__main__":
    main()

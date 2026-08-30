"""Candidate int8 exports for cycle 4a, each re-run through the project's OWN
quantisation gate, unchanged.

The gate is `cycle4-fiction/export_onnx.py`'s: mean fp32->int8 probability
drift under 0.05 and verdict-flip rate under 0.01 at every one of the five
calibration thresholds, measured on the cal split. **Neither limit is touched
here.** The only thing that varies is how the int8 file is produced.

Variants:

  perchannel        what cycle 4a shipped: dynamic, QInt8, per_channel=True.
                    Reproduced so the comparison is against a number this
                    script itself computed, not a number copied from a report.
  reduce_range      per-channel plus reduce_range=True - 7-bit weights. The
                    standard remedy for int8 saturation, and the obvious first
                    thing to try when the drift is small but the flips are not.
  exclude_head      per-channel, with the classification head's MatMul left in
                    fp32. The head is two small matrices; leaving them out
                    costs almost nothing in file size and removes the last
                    quantisation step before the margin is read.

Writes NEW filenames only, into the research models directory. The shipped
files and every previous cycle's files are refused by name.
"""
from __future__ import annotations

import argparse
import json
import os

import numpy as np
import onnx
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoTokenizer

MAX_LEN = 512
DRIFT_MEAN_LIMIT = 0.05
FLIP_RATE_LIMIT = 0.01


def head_matmuls(fp32_path):
    """MatMul/Gemm nodes downstream of the pooler - the classification head."""
    m = onnx.load(fp32_path, load_external_data=False)
    names = [n.name for n in m.graph.node
             if n.op_type in ("MatMul", "Gemm")
             and any(k in (n.name or "").lower()
                     for k in ("classifier", "pooler", "score", "head"))]
    return names


def gate(fp32, int8, tok, texts, T, thresholds, m32_cache=""):
    def margins(path):
        so = ort.SessionOptions()
        so.log_severity_level = 3
        so.intra_op_num_threads = 2
        s = ort.InferenceSession(path, so, providers=["CPUExecutionProvider"])
        names = [i.name for i in s.get_inputs()]
        out = []
        for i in range(0, len(texts), 16):
            e = tok(texts[i:i + 16], truncation=True, max_length=MAX_LEN,
                    padding="max_length", return_tensors="np")
            lg = s.run(None, {n: e[n].astype(np.int64) for n in names if n in e})[0]
            out.append(lg[:, 1] - lg[:, 0])
        return np.concatenate(out)

    import numpy as _np
    m32 = _np.load(m32_cache) if m32_cache and os.path.exists(m32_cache) else margins(fp32)
    m8 = margins(int8)
    p32, p8 = 1 / (1 + np.exp(-m32 / T)), 1 / (1 + np.exp(-m8 / T))
    d = np.abs(p32 - p8)
    from scipy.stats import spearmanr
    flips = {k: {"threshold_margin": t,
                 "verdict_flips": int(((m32 > t) != (m8 > t)).sum()),
                 "flip_rate": round(float(((m32 > t) != (m8 > t)).mean()), 5)}
             for k, t in thresholds.items()}
    worst = max(f["flip_rate"] for f in flips.values())
    return {
        "int8_onnx": os.path.basename(int8),
        "size_mb": round(os.path.getsize(int8) / 1e6, 1),
        "cal_rows_checked": len(texts),
        "prob_drift_fp32_vs_int8": {"mean": round(float(d.mean()), 4),
                                    "p95": round(float(np.percentile(d, 95)), 4),
                                    "max": round(float(d.max()), 4)},
        "spearman": round(float(spearmanr(m32, m8).statistic), 5),
        "verdict_flips_at_operating_thresholds": flips,
        "worst_flip_rate": worst,
        "gate": {"mean_drift_limit": DRIFT_MEAN_LIMIT,
                 "flip_rate_limit": FLIP_RATE_LIMIT},
        "pass": bool(d.mean() < DRIFT_MEAN_LIMIT and worst < FLIP_RATE_LIMIT),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--research", required=True)
    ap.add_argument("--ckpt", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--m32-cache", default="")
    ap.add_argument("--cal-from", default="", help="jsonl of the exact cal rows to use")
    a = ap.parse_args()

    M = os.path.join(a.research, "models")
    FP32 = os.path.join(M, "tier3-cycle4-cycle4-e5small-fp32.onnx")
    PROTECTED = {"tier3-e5small-int8-perchannel.onnx",
                 "tier3-cycle2-e5small-fp32.onnx",
                 "tier3-cycle2-e5small-int8-perchannel.onnx",
                 "tier3-cycle3-e5small-fp32.onnx",
                 "tier3-cycle3-e5small-int8-perchannel.onnx",
                 "tier3-cycle4-cycle4-e5small-fp32.onnx",
                 "tier3-cycle4-cycle4-e5small-int8-perchannel.onnx",
                 "tier3-cycle4-cycle4b-e5small-fp32.onnx",
                 "tier3-cycle4-cycle4b-e5small-int8-perchannel.onnx"}

    rep = json.load(open(a.report))
    T = rep["temperature"]
    thresholds = {k: v["threshold_margin"] for k, v in rep["thresholds_cal"].items()}
    tok = AutoTokenizer.from_pretrained(a.ckpt)
    if a.cal_from:
        texts = [json.loads(l)["text"] for l in open(a.cal_from)]
    else:
        cal = [json.loads(l) for l in open(a.data)]
        cal = [r for r in cal if r["split"] == "cal"]
        texts = [r["text"] for r in cal]
    print(f"cal rows {len(texts)}", flush=True)

    head = head_matmuls(FP32)
    print(f"head MatMul/Gemm nodes: {head}", flush=True)

    variants = {
        "perchannel": dict(per_channel=True),
        "reduce_range": dict(per_channel=True, reduce_range=True),
    }
    if head:
        variants["exclude_head"] = dict(per_channel=True, nodes_to_exclude=head)

    results = {"fp32_onnx": os.path.basename(FP32),
               "temperature": T, "variants": {}}
    for name, kw in variants.items():
        out = os.path.join(M, f"tier3-cycle4-cycle4-e5small-int8-{name.replace('_','-')}-probe.onnx")
        assert os.path.basename(out) not in PROTECTED
        print(f"\nexporting {name} -> {os.path.basename(out)}", flush=True)
        quantize_dynamic(FP32, out, weight_type=QuantType.QInt8, **kw)
        r = gate(FP32, out, tok, texts, T, thresholds, a.m32_cache)
        r["quantize_dynamic_kwargs"] = {k: (v if not isinstance(v, list) else v)
                                        for k, v in kw.items()}
        results["variants"][name] = r
        print(f"  {name:<14} mean drift {r['prob_drift_fp32_vs_int8']['mean']:.4f} "
              f"worst flip rate {r['worst_flip_rate']:.5f}  "
              f"{'PASS' if r['pass'] else 'FAIL'}  {r['size_mb']} MB", flush=True)

    json.dump(results, open(a.out, "w"), indent=2)
    print(f"\nwrote {a.out}")


if __name__ == "__main__":
    main()

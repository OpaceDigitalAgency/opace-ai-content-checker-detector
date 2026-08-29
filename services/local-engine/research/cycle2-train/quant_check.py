"""int8 quantisation gate for the cycle-2 model.

The bar that matters is not the largest single probability delta, it is whether
int8 changes VERDICTS at the operating threshold. Cycle 1 measured per-tensor
int8 at mean drift 0.22 with 23 verdict flips and per-channel at 1 flip; this
re-measures the same quantity for the cycle-2 weights on the calibration split.
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
INT8 = os.path.join(MODELS, "tier3-cycle2-e5small-int8-perchannel.onnx")
CKPT = os.path.join(HERE, "cycle2-checkpoint")
MAX_LEN = 512

MEAN_LIMIT = 0.05     # per-tensor measured 0.22 on cycle 1
FLIP_LIMIT = 0.01     # <=1% of rows may change verdict


def main():
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).eval()
    import onnxruntime as ort
    o = ort.SessionOptions()
    o.intra_op_num_threads = max(2, (os.cpu_count() or 4) // 3)
    sess = ort.InferenceSession(INT8, o, providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]

    rows = [json.loads(l) for l in open(os.path.join(HERE, "dataset.jsonl"))]
    cal = [r for r in rows if r["split"] == "cal"]
    pt_all, ox_all = [], []
    for i in range(0, len(cal), 16):
        ch = cal[i:i + 16]
        e = tok([c["text"] for c in ch], truncation=True, max_length=MAX_LEN,
                padding=True, return_tensors="pt")
        with torch.no_grad():
            lg = model(input_ids=e.input_ids, attention_mask=e.attention_mask).logits.float().numpy()
        pt_all.append(lg[:, 1] - lg[:, 0])
        f = {n: e[n].numpy().astype(np.int64) for n in names if n in e}
        q = sess.run(None, f)[0]
        ox_all.append(q[:, 1] - q[:, 0])
    m_pt, m_ox = np.concatenate(pt_all), np.concatenate(ox_all)
    p_pt, p_ox = 1/(1+np.exp(-m_pt)), 1/(1+np.exp(-m_ox))
    d = np.abs(p_pt - p_ox)

    T = json.load(open(os.path.join(HERE, "train-report.json")))
    flips = {}
    for k, v in T["thresholds_cal"].items():
        thr = v["threshold_margin"]
        n = int(((m_pt >= thr) != (m_ox >= thr)).sum())
        flips[f"{float(k):.0%} FPR budget"] = {"threshold_margin": round(thr, 4),
                                               "verdict_flips": n,
                                               "flip_rate": round(n / len(m_pt), 5)}
    from scipy.stats import spearmanr
    rep = {
        "int8_onnx": os.path.basename(INT8),
        "quantisation": "dynamic, QInt8, per_channel=True",
        "size_mb": round(os.path.getsize(INT8) / 1e6, 1),
        "cal_rows_checked": len(m_pt),
        "prob_drift_vs_torch_fp32": {"mean": round(float(d.mean()), 4),
                                     "p95": round(float(np.percentile(d, 95)), 4),
                                     "max": round(float(d.max()), 4)},
        "spearman": round(float(spearmanr(m_pt, m_ox).statistic), 5),
        "verdict_flips_at_operating_thresholds": flips,
        "gate": {"mean_drift_limit": MEAN_LIMIT, "flip_rate_limit": FLIP_LIMIT},
        "cycle1_reference": {"per_tensor": "mean drift 0.22, 23 verdict flips",
                             "per_channel": "max delta 0.12, 1 verdict flip"},
    }
    worst_flip = max(v["flip_rate"] for v in flips.values())
    rep["pass"] = bool(d.mean() <= MEAN_LIMIT and worst_flip <= FLIP_LIMIT)
    json.dump(rep, open(os.path.join(HERE, "onnx-export-report.json"), "w"), indent=2)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()

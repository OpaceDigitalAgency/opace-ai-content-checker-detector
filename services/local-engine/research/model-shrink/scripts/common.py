"""Shared evaluation code for the model-shrink workstream.

Every candidate is measured through exactly one code path against exactly one
held-out corpus (longform-corpus: 922 AI / 4,636 human, fresh data the deployed
cycle-2 model never saw), so a difference in the numbers is a difference in the
model and nothing else.
"""
from __future__ import annotations

import json
import os
import time

os.environ.setdefault("OMP_NUM_THREADS", "4")

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
SHRINK = os.path.dirname(HERE)
RESEARCH = os.path.dirname(SHRINK)
MODELS = os.path.join(RESEARCH, "models")
CKPT = os.path.join(RESEARCH, "cycle2-train", "cycle2-checkpoint")
LONGFORM = os.path.join(RESEARCH, "longform-corpus")
RESULTS = os.path.join(SHRINK, "results")
MAX_LEN = 512

DEPLOYED_INT8 = os.path.join(MODELS, "tier3-cycle2-e5small-int8-perchannel.onnx")
DEPLOYED_FP32 = os.path.join(MODELS, "tier3-cycle2-e5small-fp32.onnx")


def load_longform():
    """The held-out evaluation corpus. Returns (texts, sides, registers, ids)."""
    rows = []
    for fn in ("ai-longform.jsonl", "human-longform.jsonl"):
        with open(os.path.join(LONGFORM, fn)) as f:
            rows += [json.loads(l) for l in f if l.strip()]
    return rows


def load_train_rows(splits=("train", "cal")):
    """cycle-2 training corpus rows, for distillation only. Never evaluated on."""
    path = os.path.join(RESEARCH, "cycle2-train", "dataset.jsonl")
    out = []
    with open(path) as f:
        for l in f:
            if not l.strip():
                continue
            d = json.loads(l)
            if d.get("split") in splits:
                out.append(d)
    return out


class OnnxScorer:
    def __init__(self, model_path, tokenizer_dir=CKPT, label="model", threads=4):
        self.label = label
        self.path = model_path
        self.tok = AutoTokenizer.from_pretrained(tokenizer_dir)
        o = ort.SessionOptions()
        o.intra_op_num_threads = threads
        self.sess = ort.InferenceSession(model_path, o, providers=["CPUExecutionProvider"])
        self.names = [i.name for i in self.sess.get_inputs()]

    def logits(self, texts, batch=16, progress=True, max_len=MAX_LEN):
        out, t0 = [], time.time()
        for i in range(0, len(texts), batch):
            enc = self.tok(texts[i:i + batch], truncation=True, max_length=max_len,
                           padding="max_length", return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in self.names if n in enc}
            out.append(self.sess.run(None, feed)[0])
            if progress and (i // batch) % 50 == 0 and i:
                r = i / max(time.time() - t0, 1e-9)
                print(f"  [{self.label}] {i}/{len(texts)} eta {(len(texts)-i)/max(r,1e-9):.0f}s", flush=True)
        return np.concatenate(out)


def probs(lg):
    lg = np.asarray(lg, dtype=np.float64)
    e = np.exp(lg - lg.max(axis=1, keepdims=True))
    return e[:, 1] / e.sum(axis=1)


def auroc(scores, labels):
    s = np.asarray(scores, dtype=np.float64)
    y = np.asarray(labels).astype(int)
    order = np.argsort(s)
    ranks = np.empty(len(s), dtype=np.float64)
    sorted_s = s[order]
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and sorted_s[j + 1] == sorted_s[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    n1 = y.sum()
    n0 = len(y) - n1
    if n1 == 0 or n0 == 0:
        return float("nan")
    return float((ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def thr_for_fpr(human_scores, budget):
    """Lowest threshold whose realised FPR on these humans is <= budget."""
    h = np.sort(np.asarray(human_scores, dtype=np.float64))
    if len(h) == 0:
        return float("inf")
    k = int(np.ceil(len(h) * (1 - budget))) - 1
    k = min(max(k, 0), len(h) - 1)
    return float(np.nextafter(h[k], np.inf))


def evaluate(scores, rows, budgets=(0.01, 0.0122, 0.02)):
    """Full report for one candidate on the held-out corpus."""
    scores = np.asarray(scores, dtype=np.float64)
    side = np.array([r["side"] for r in rows])
    reg = np.array([r["register"] for r in rows])
    ai_m, hu_m = side == "ai", side == "human"
    y = ai_m.astype(int)
    out = {
        "n_ai": int(ai_m.sum()),
        "n_human": int(hu_m.sum()),
        "auroc": round(auroc(scores, y), 4),
        "median_ai": round(float(np.median(scores[ai_m])), 4),
        "median_human": round(float(np.median(scores[hu_m])), 4),
        "operating_points": {},
    }
    for b in budgets:
        t = thr_for_fpr(scores[hu_m], b)
        flag = scores >= t
        det = float(flag[ai_m].mean())
        fpr = float(flag[hu_m].mean())
        per_reg = {}
        for r in sorted(set(reg[ai_m])):
            m = ai_m & (reg == r)
            per_reg[r] = {"detected": round(float(flag[m].mean()), 4),
                          "hits": int(flag[m].sum()), "n": int(m.sum())}
        per_reg_h = {}
        for r in sorted(set(reg[hu_m])):
            m = hu_m & (reg == r)
            per_reg_h[r] = {"fp_rate": round(float(flag[m].mean()), 4),
                            "fps": int(flag[m].sum()), "n": int(m.sum())}
        out["operating_points"][f"{b:.4f}"] = {
            "fpr_budget": b,
            "threshold_margin": round(t, 6),
            "detection_overall": round(det, 4),
            "detection_hits": int(flag[ai_m].sum()),
            "fpr_realised": round(fpr, 4),
            "fps": int(flag[hu_m].sum()),
            "ai_by_register": per_reg,
            "human_fp_by_register": per_reg_h,
        }
    return out


def save(name, obj):
    os.makedirs(RESULTS, exist_ok=True)
    p = os.path.join(RESULTS, name)
    with open(p, "w") as f:
        json.dump(obj, f, indent=2)
    print(f"wrote {p}", flush=True)
    return p


def size_mb(path):
    return round(os.path.getsize(path) / 1e6, 2)

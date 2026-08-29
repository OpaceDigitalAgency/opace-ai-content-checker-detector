"""Shared scoring for cycle-2 evaluation: one code path for the shipped model
and the cycle-2 model, so a difference in the numbers is a difference in the
weights and nothing else."""
from __future__ import annotations

import os
import time

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

MAX_LEN = 512


class OnnxScorer:
    def __init__(self, model_path: str, tokenizer_dir: str, label: str):
        self.label = label
        self.tok = AutoTokenizer.from_pretrained(tokenizer_dir)
        o = ort.SessionOptions()
        o.intra_op_num_threads = max(4, (os.cpu_count() or 4) // 2)
        self.sess = ort.InferenceSession(model_path, o, providers=["CPUExecutionProvider"])
        self.names = [i.name for i in self.sess.get_inputs()]

    def logits(self, texts, batch=16, progress=True):
        out, t0 = [], time.time()
        for i in range(0, len(texts), batch):
            enc = self.tok(texts[i:i + batch], truncation=True, max_length=MAX_LEN,
                           padding=True, return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in self.names if n in enc}
            out.append(self.sess.run(None, feed)[0])
            if progress and (i // batch) % 40 == 0 and i:
                r = i / max(time.time() - t0, 1e-9)
                print(f"  [{self.label}] {i}/{len(texts)} eta {(len(texts)-i)/max(r,1e-9):.0f}s", flush=True)
        return np.concatenate(out)


def probs(lg):
    e = np.exp(lg - lg.max(axis=1, keepdims=True))
    return e[:, 1] / e.sum(axis=1)


def margins(lg):
    return lg[:, 1] - lg[:, 0]


def thr_for_fpr(human_scores, budget):
    """Lowest threshold whose realised FPR on these humans is <= budget."""
    h = np.sort(np.asarray(human_scores))
    if len(h) == 0:
        return float("inf")
    k = int(np.ceil(len(h) * (1 - budget))) - 1
    k = min(max(k, 0), len(h) - 1)
    return float(np.nextafter(h[k], np.inf))

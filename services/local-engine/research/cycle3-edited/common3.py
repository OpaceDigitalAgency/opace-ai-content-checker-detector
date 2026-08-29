"""Shared helpers for cycle 3 (lightly-edited AI detection).

Paths, model loading, scoring. Never writes outside cycle3-edited/ except for
new model files under ../models/ with cycle3-* names.
"""
from __future__ import annotations

import hashlib
import json
import os

import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
CYCLE2 = os.path.join(RESEARCH, "cycle2-train")
CYCLE2_CKPT = os.path.join(CYCLE2, "cycle2-checkpoint")
DATASET2 = os.path.join(CYCLE2, "dataset.jsonl")
CORPUS2 = os.path.join(RESEARCH, "cycle2-corpus", "corpus.jsonl")
LONGFORM = os.path.join(RESEARCH, "longform-corpus")
MODELS = os.path.join(RESEARCH, "models")
CYCLE2_TEMPERATURE = 0.8324
MAX_LEN = 512


def device():
    return "mps" if torch.backends.mps.is_available() else "cpu"


def jsonl(path):
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def norm_key(text: str) -> str:
    """Whitespace-normalised hash, for cross-corpus overlap checks."""
    return hashlib.sha256(" ".join(text.split()).lower().encode("utf-8")).hexdigest()


class Scorer:
    """Binary AI-probability scorer over a HF sequence-classification checkpoint."""

    def __init__(self, ckpt=CYCLE2_CKPT, temperature=CYCLE2_TEMPERATURE, tok_dir=None):
        self.dev = device()
        self.tok = AutoTokenizer.from_pretrained(tok_dir or ckpt)
        self.model = AutoModelForSequenceClassification.from_pretrained(ckpt).to(self.dev).eval()
        self.T = temperature

    @torch.no_grad()
    def margins(self, texts, bs=64, progress=None):
        out = []
        for i in range(0, len(texts), bs):
            chunk = texts[i:i + bs]
            enc = self.tok(chunk, truncation=True, max_length=MAX_LEN,
                           padding=True, return_tensors="pt")
            lg = self.model(input_ids=enc.input_ids.to(self.dev),
                            attention_mask=enc.attention_mask.to(self.dev)).logits.float().cpu().numpy()
            out.append(lg[:, 1] - lg[:, 0])
            if progress and (i // bs) % 20 == 0:
                print(f"  {progress}: {i}/{len(texts)}", flush=True)
        return np.concatenate(out) if out else np.zeros(0)

    def probs(self, texts, **kw):
        m = self.margins(texts, **kw)
        return 1.0 / (1.0 + np.exp(-m / self.T))


def tpr_at_fpr(scores, y, budget):
    hum = np.sort(scores[y == 0])
    if len(hum) == 0:
        return 0.0, float("inf")
    k = min(int(np.ceil(len(hum) * (1 - budget))), len(hum) - 1)
    thr = float(hum[k])
    return float((scores[y == 1] > thr).mean()), thr

"""Cycle-5 model: e5-small encoder + structural features into the head.

Architecture (documented per the cycle brief): the encoder's pooled output
(BERT pooler over [CLS], exactly what AutoModelForSequenceClassification used
in cycles 1-4) is concatenated with the 8 z-normalised structural features and
passed through a single linear head to 2 logits. The ablation arm feeds a
zero vector in place of the features with the SAME parameter count, so the
features' contribution is measured against an identical architecture.
"""
from __future__ import annotations

import json
import os

import numpy as np
import torch
import torch.nn as nn
from transformers import AutoModel

N_FEATS = 8


class E5Struct(nn.Module):
    def __init__(self, base="intfloat/e5-small", n_feats=N_FEATS, dropout=0.1):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(base)
        hid = self.encoder.config.hidden_size
        self.dropout = nn.Dropout(dropout)
        self.head = nn.Linear(hid + n_feats, 2)
        self.n_feats = n_feats

    def forward(self, input_ids, attention_mask, feats):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        pooled = out.pooler_output if out.pooler_output is not None \
            else out.last_hidden_state[:, 0]
        x = torch.cat([self.dropout(pooled), feats], dim=-1)
        return self.head(x)


def save_ckpt(model, tok, norm, path):
    os.makedirs(path, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(path, "model.pt"))
    tok.save_pretrained(path)
    json.dump(norm, open(os.path.join(path, "feat-norm.json"), "w"), indent=1)


def load_ckpt(path, base="intfloat/e5-small", device="cpu"):
    model = E5Struct(base)
    model.load_state_dict(torch.load(os.path.join(path, "model.pt"),
                                     map_location="cpu"))
    model.to(device).eval()
    norm = json.load(open(os.path.join(path, "feat-norm.json")))
    return model, norm


def fit_norm(feat_rows):
    """Per-feature mean/sd over the finite train values. NaN -> 0 after z."""
    arr = np.array(feat_rows, dtype=np.float64)
    mean, sd = [], []
    for j in range(arr.shape[1]):
        col = arr[:, j]
        col = col[np.isfinite(col)]
        m = float(col.mean()) if len(col) else 0.0
        s = float(col.std()) if len(col) > 1 else 1.0
        mean.append(m)
        sd.append(s if s > 1e-9 else 1.0)
    return {"mean": mean, "sd": sd, "clip": 4.0}


def apply_norm(feats, norm):
    arr = np.array(feats, dtype=np.float32)
    single = arr.ndim == 1
    if single:
        arr = arr[None, :]
    m = np.array(norm["mean"], dtype=np.float32)
    s = np.array(norm["sd"], dtype=np.float32)
    z = (arr - m) / s
    z = np.clip(z, -norm["clip"], norm["clip"])
    z[~np.isfinite(z)] = 0.0
    return z[0] if single else z

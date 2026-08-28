"""Tier 3 - first fresh-corpus classifier cycle.

Fine-tunes intfloat/e5-small (33M params, MIT licence) for human/ai sequence
classification on the corpus TRAIN split, selects a threshold FPR-first
(<= 2% on CAL humans), reports on the corpus TEST split, and saves the
fine-tuned checkpoint for ONNX export.

The quarantined eval set is never touched here (it is scored only by
eval/run_eval.py, after all weights and thresholds are frozen).
"""

from __future__ import annotations

import json
import os

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
CKPT = os.path.join(HERE, "checkpoint")
MODELS = os.path.join(HERE, "..", "models")
BASE_MODEL = "intfloat/e5-small"
MAX_LEN = 512
EPOCHS = 3
LR = 2e-5
BATCH = 16
MAX_FPR = 0.02
SEED = 20260828


class Docs(Dataset):
    def __init__(self, rows, tok):
        self.rows = rows
        self.tok = tok

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        d = self.rows[i]
        enc = self.tok(
            d["text"], truncation=True, max_length=MAX_LEN,
            padding="max_length", return_tensors="pt",
        )
        return {
            "input_ids": enc.input_ids[0],
            "attention_mask": enc.attention_mask[0],
            "labels": torch.tensor(1 if d["side"] == "ai" else 0),
        }


def load_split(split):
    rows = []
    with open(CORPUS) as f:
        for ln in f:
            d = json.loads(ln)
            if d["split"] == split:
                rows.append(d)
    return rows


@torch.no_grad()
def predict(model, loader, device):
    model.eval()
    ps, ys = [], []
    for batch in loader:
        logits = model(
            input_ids=batch["input_ids"].to(device),
            attention_mask=batch["attention_mask"].to(device),
        ).logits
        ps.extend(torch.softmax(logits.float(), -1)[:, 1].cpu().tolist())
        ys.extend(batch["labels"].tolist())
    return np.array(ps), np.array(ys)


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL, num_labels=2
    ).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"{BASE_MODEL}: {n_params/1e6:.1f}M params, device={device}")

    tr = Docs(load_split("train"), tok)
    cal = Docs(load_split("cal"), tok)
    te = Docs(load_split("test"), tok)
    print(f"train {len(tr)}, cal {len(cal)}, test {len(te)}")

    opt = torch.optim.AdamW(model.parameters(), lr=LR)
    loader = DataLoader(tr, batch_size=BATCH, shuffle=True)
    steps = 0
    for ep in range(EPOCHS):
        model.train()
        for batch in loader:
            opt.zero_grad()
            out = model(
                input_ids=batch["input_ids"].to(device),
                attention_mask=batch["attention_mask"].to(device),
                labels=batch["labels"].to(device),
            )
            out.loss.backward()
            opt.step()
            steps += 1
            if steps % 10 == 0:
                print(f"ep{ep} step{steps} loss={out.loss.item():.4f}", flush=True)

    cal_loader = DataLoader(cal, batch_size=BATCH)
    te_loader = DataLoader(te, batch_size=BATCH)
    p_cal, y_cal = predict(model, cal_loader, device)
    qs = np.sort(p_cal[y_cal == 0])
    k = min(int(np.floor(len(qs) * (1 - MAX_FPR))), len(qs) - 1)
    thr = min(float(qs[k]) + 1e-9, 1 - 1e-9)

    from sklearn.metrics import roc_auc_score

    p_te, y_te = predict(model, te_loader, device)
    auc = roc_auc_score(y_te, p_te)
    tpr = float((p_te[y_te == 1] >= thr).mean())
    fpr = float((p_te[y_te == 0] >= thr).mean())
    print(f"threshold={thr:.4f}; corpus TEST AUROC={auc:.4f} TPR={tpr:.3f} FPR={fpr:.3f}")

    os.makedirs(CKPT, exist_ok=True)
    model.save_pretrained(CKPT)
    tok.save_pretrained(CKPT)
    os.makedirs(MODELS, exist_ok=True)
    with open(os.path.join(MODELS, "tier3-config.json"), "w") as f:
        json.dump(
            {
                "version": "tier3-cycle1-v1",
                "trained": "2026-08-28",
                "base_model": BASE_MODEL,
                "params_millions": round(n_params / 1e6, 1),
                "max_len": MAX_LEN,
                "epochs": EPOCHS,
                "lr": LR,
                "threshold": thr,
                "operating_point": f"<= {MAX_FPR:.0%} FPR on calibration humans",
                "corpus_test_metrics": {"auroc": float(auc), "tpr": tpr, "fpr": fpr},
            },
            f,
            indent=2,
        )
    print(f"checkpoint -> {CKPT}")


if __name__ == "__main__":
    main()

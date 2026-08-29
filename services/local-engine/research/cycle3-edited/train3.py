"""CYCLE-3: teach the detector the AI *share* of a document, not just the class.

Cycle 2 was trained on a hard 0/1 label, so every mixed-authorship document was
either a full-strength AI example or absent. It ended up detecting 90.6% of fully
generated long-form and 20-30% of documents that are 80-100% AI but built on a
human original.

Cycle 3 keeps the same architecture, tokenizer and 2-logit head — so the exported
model is a drop-in replacement — but trains the margin against a SOFT target: the
document's AI word share. Fully generated stays 1.0, pure human 0.0, HAT-Bench
uses its own measured AI_token_ratio, synthetic rows use the measured edit
fraction. sigmoid(margin) therefore reads as "roughly what share of this is AI".

Initialised from the cycle-2 checkpoint rather than from scratch, at a lower
learning rate, so cycle-2's fully-generated performance is a starting point
rather than something to rediscover.
"""
from __future__ import annotations

import collections
import json
import os
import time

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

import common3 as C

DATA = os.path.join(C.HERE, "dataset3.jsonl")
CKPT = os.path.join(C.HERE, os.environ.get("CKPT_NAME", "cycle3-checkpoint"))
# A document that is 85% AI is, for a reader, an AI document. Scaling the soft
# target by 1/SATURATE clamps everything at or above that share to a full 1.0,
# so the ordinal signal is kept below the knee but confidence is not thrown away
# above it. SATURATE=1.0 reproduces the pure proportion target.
SATURATE = float(os.environ.get("SATURATE", "1.0"))
MAX_LEN = 512
EPOCHS = 3
LR = 1e-5
BATCH = 16
HARD_BOOST = 1.6
REGISTER_PRIORITY = {"academic": 1.35, "report": 1.20, "article": 1.10,
                     "marketing": 1.00, "reference": 0.80,
                     "social": 0.50, "chat": 0.40, "creative": 1.10}
SEED = 20260829


class Docs(Dataset):
    def __init__(self, rows, tok):
        self.rows, self.tok = rows, tok

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        d = self.rows[i]
        enc = self.tok(d["text"], truncation=True, max_length=MAX_LEN,
                       padding="max_length", return_tensors="pt")
        return {"input_ids": enc.input_ids[0],
                "attention_mask": enc.attention_mask[0],
                "target": torch.tensor(min(1.0, float(d["ai_ratio"]) / SATURATE)),
                "weight": torch.tensor(float(d["_w"]))}


def load(split):
    return [r for r in C.jsonl(DATA) if r["split"] == split]


def assign_weights(rows):
    cells = collections.Counter((r["register"], r["side"]) for r in rows)
    for r in rows:
        reg, side = r["register"], r["side"]
        n_self = cells[(reg, side)]
        n_reg = cells.get((reg, "ai"), 0) + cells.get((reg, "human"), 0)
        w = (n_reg / (2.0 * n_self)) if n_self else 0.0
        w *= REGISTER_PRIORITY.get(reg, 1.0)
        if r.get("hard_negative"):
            w *= HARD_BOOST
        r["_w"] = w
    m = float(np.mean([r["_w"] for r in rows])) or 1.0
    for r in rows:
        r["_w"] /= m
    return {"mean_w_by_kind": {k: round(float(np.mean([r["_w"] for r in rows if r["kind"] == k])), 3)
                               for k in sorted({r["kind"] for r in rows})}}


@torch.no_grad()
def margins_for(model, rows, tok, device, bs=64):
    model.eval()
    out = []
    for i in range(0, len(rows), bs):
        chunk = rows[i:i + bs]
        enc = tok([r["text"] for r in chunk], truncation=True, max_length=MAX_LEN,
                  padding=True, return_tensors="pt")
        lg = model(input_ids=enc.input_ids.to(device),
                   attention_mask=enc.attention_mask.to(device)).logits.float().cpu().numpy()
        out.append(lg[:, 1] - lg[:, 0])
    return np.concatenate(out)


def thr_at_fpr(scores, is_human, budget):
    h = np.sort(scores[is_human])
    k = min(int(np.ceil(len(h) * (1 - budget))), len(h) - 1)
    return float(h[k])


def fit_temperature(m, t):
    m = torch.tensor(m, dtype=torch.float64)
    t = torch.tensor(np.asarray(t, dtype=np.float64))
    logT = torch.zeros(1, dtype=torch.float64, requires_grad=True)
    opt = torch.optim.LBFGS([logT], lr=0.1, max_iter=200)
    lossf = torch.nn.BCEWithLogitsLoss()

    def closure():
        opt.zero_grad()
        loss = lossf(m / torch.exp(logT), t)
        loss.backward()
        return loss
    opt.step(closure)
    return float(torch.exp(logT).item())


def main():
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    dev = C.device()
    tok = AutoTokenizer.from_pretrained(C.CYCLE2_CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(C.CYCLE2_CKPT).to(dev)

    tr, cal = load("train"), load("cal")
    winfo = assign_weights(tr)
    print(f"train {len(tr)}  cal {len(cal)}  device={dev}  weights={winfo}", flush=True)
    print("train by kind:", collections.Counter(r["kind"] for r in tr), flush=True)

    loader = DataLoader(Docs(tr, tok), batch_size=BATCH, shuffle=True)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total = EPOCHS * len(loader)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=total,
                                                pct_start=0.1, anneal_strategy="linear")
    lossf = torch.nn.BCEWithLogitsLoss(reduction="none")

    cal_t = np.array([r["ai_ratio"] for r in cal])
    is_hum = cal_t <= 0.02
    full_gen = cal_t >= 0.995
    high_ai = (cal_t >= 0.80) & (cal_t < 0.995)
    mid_ai = (cal_t >= 0.4) & (cal_t < 0.80)
    history, best = [], None
    step, t0 = 0, time.time()
    for ep in range(EPOCHS):
        model.train()
        for b in loader:
            opt.zero_grad()
            lg = model(input_ids=b["input_ids"].to(dev),
                       attention_mask=b["attention_mask"].to(dev)).logits
            m = lg[:, 1] - lg[:, 0]
            per = lossf(m, b["target"].to(dev))
            loss = (per * b["weight"].to(dev)).mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            step += 1
            if step % 100 == 0:
                print(f"  ep{ep} {step}/{total} loss={loss.item():.4f} "
                      f"{(time.time()-t0)/step:.2f}s/step", flush=True)
        s = margins_for(model, cal, tok, dev)
        thr = thr_at_fpr(s, is_hum, 0.02)
        row = {"epoch": ep, "thr@2fpr": round(thr, 3),
               "cal_full_gen_tpr": round(float((s[full_gen] > thr).mean()), 4),
               "cal_high_ai_tpr": round(float((s[high_ai] > thr).mean()), 4),
               "cal_mid_ai_tpr": round(float((s[mid_ai] > thr).mean()), 4),
               "n": [int(full_gen.sum()), int(high_ai.sum()), int(mid_ai.sum()), int(is_hum.sum())]}
        row["selection"] = round(0.5 * row["cal_full_gen_tpr"] + 0.5 * row["cal_high_ai_tpr"], 4)
        history.append(row)
        print("  EPOCH", row, flush=True)
        if best is None or row["selection"] > best["selection"]:
            os.makedirs(CKPT, exist_ok=True)
            model.save_pretrained(CKPT)
            tok.save_pretrained(CKPT)
            best = row
            print("  -> checkpoint saved", flush=True)

    model = AutoModelForSequenceClassification.from_pretrained(CKPT).to(dev)
    s = margins_for(model, cal, tok, dev)
    T_prop = fit_temperature(s, cal_t)                       # calibrates p to AI share
    T_bin = fit_temperature(s, (cal_t >= 0.5).astype(float))  # calibrates p to class
    rep = {"version": "tier3-cycle3-v1", "trained": time.strftime("%Y-%m-%d"),
           "init_from": "cycle2-checkpoint", "base_model": "intfloat/e5-small",
           "epochs": EPOCHS, "lr": LR, "batch": BATCH, "seed": SEED,
           "train_rows": len(tr), "cal_rows": len(cal), "weighting": winfo,
           "train_by_kind": dict(collections.Counter(r["kind"] for r in tr)),
           "epoch_history": history, "selected_epoch": best["epoch"],
           "temperature_proportion": round(T_prop, 4),
           "temperature_binary": round(T_bin, 4),
           "objective": "soft binary cross-entropy on the AI word share",
           "saturate": SATURATE}
    json.dump(rep, open(os.path.join(C.HERE, os.environ.get("REPORT_NAME", "train3-report.json")), "w"), indent=2)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()

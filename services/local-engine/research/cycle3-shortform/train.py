"""CYCLE-3 two-axis fine-tune: continue from the cycle-2 checkpoint.

Cycle 2 fixed REGISTER. It left two measured defects, both on AI text and
neither on human text:

  * LENGTH - 22.6% detected at 100 words against 93.7% at 600 (816 documents);
  * REPETITION - flat at 86-88% down to type-token ratio 0.55, then 79.5%,
    57.6%, and 16-20% below 0.46 (1,248 documents).

This continues training from cycle2-checkpoint rather than starting over, at a
lower learning rate, on the cycle-2 rows plus 2,408 short-form rows split
group-aware by post slug.

Three things differ from cycle2-train/train.py and each is deliberate:

  * loss cells are keyed on (register, axis) so the 2,408 short-form rows get
    their own equalised AI/human cell instead of being diluted inside a
    5,419-row marketing register;
  * epoch selection uses the MEAN of long-form and short-form cal TPR at a 2%
    FPR budget, with a hard guard that rejects any epoch whose long-form TPR
    falls more than one point below the starting checkpoint's;
  * the starting checkpoint is scored on CAL first and recorded as epoch -1, so
    "did fine-tuning help" is answerable from this file alone.
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

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
DATA = os.path.join(HERE, "dataset.jsonl")
START = os.path.join(RESEARCH, "cycle2-train", "cycle2-checkpoint")
CKPT = os.path.join(HERE, "cycle3-checkpoint")
MAX_LEN = 512
EPOCHS = 3
LR = 1e-5
BATCH = 16
MAX_FPR = 0.02
HARD_BOOST = 1.6
LONGFORM_GUARD_PP = 0.01
REGISTER_PRIORITY = {"academic": 1.35, "report": 1.20, "article": 1.10,
                     "marketing": 1.00, "reference": 0.80,
                     "social": 0.50, "chat": 0.40}
LONGFORM = ("academic", "article", "marketing", "report", "reference")
SEED = 20260830


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
                "labels": torch.tensor(1 if d["side"] == "ai" else 0),
                "weight": torch.tensor(float(d.get("_w", 1.0)))}


def axis_of(r):
    return r.get("axis", "longform")


def load(split):
    rows = [json.loads(l) for l in open(DATA) if json.loads(l)["split"] == split]
    if split in ("train", "cal"):
        rows = [r for r in rows if not r.get("eval_only")]
    return rows


def assign_weights(rows):
    cells = collections.Counter((r["register"], axis_of(r), r["side"]) for r in rows)
    for r in rows:
        key = (r["register"], axis_of(r))
        n_self = cells[(key[0], key[1], r["side"])]
        n_cell = cells.get((key[0], key[1], "ai"), 0) + cells.get((key[0], key[1], "human"), 0)
        r["_w"] = (n_cell / (2.0 * n_self)) if n_self else 0.0
        r["_w"] *= REGISTER_PRIORITY.get(r["register"], 1.0)
        if r.get("hard_negative"):
            r["_w"] *= HARD_BOOST
    m = float(np.mean([r["_w"] for r in rows])) or 1.0
    for r in rows:
        r["_w"] /= m
    return {"cells": len({(r["register"], axis_of(r)) for r in rows}),
            "mean_weight_shortform": round(float(np.mean(
                [r["_w"] for r in rows if axis_of(r) == "shortform"])), 3),
            "mean_weight_longform": round(float(np.mean(
                [r["_w"] for r in rows if axis_of(r) == "longform"])), 3),
            "mass_share_shortform": round(float(sum(
                r["_w"] for r in rows if axis_of(r) == "shortform") / sum(
                r["_w"] for r in rows)), 3)}


@torch.no_grad()
def logits_for(model, rows, tok, device, bs=32):
    model.eval()
    out = []
    for i in range(0, len(rows), bs):
        chunk = rows[i:i + bs]
        enc = tok([r["text"] for r in chunk], truncation=True, max_length=MAX_LEN,
                  padding=True, return_tensors="pt")
        lg = model(input_ids=enc.input_ids.to(device),
                   attention_mask=enc.attention_mask.to(device)).logits.float().cpu().numpy()
        out.append(lg)
    return np.concatenate(out)


def margin(lg):
    return lg[:, 1] - lg[:, 0]


def tpr_at_fpr(scores, y, budget):
    hum = np.sort(scores[y == 0])
    if len(hum) == 0:
        return 0.0, float("inf")
    k = min(int(np.ceil(len(hum) * (1 - budget))), len(hum) - 1)
    thr = float(hum[k])
    return float((scores[y == 1] > thr).mean()), thr


def fit_temperature(lg, y):
    m = torch.tensor(margin(lg), dtype=torch.float64)
    t = torch.tensor(np.array(y, dtype=np.float64))
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


def cal_row(model, cal_rows, tok, device, epoch, y_cal):
    lg = logits_for(model, cal_rows, tok, device)
    s = margin(lg)
    from sklearn.metrics import roc_auc_score
    row = {"epoch": epoch, "cal_auroc": round(float(roc_auc_score(y_cal, s)), 4)}
    lf = np.array([r["register"] in LONGFORM and axis_of(r) == "longform" for r in cal_rows])
    sf = np.array([axis_of(r) == "shortform" for r in cal_rows])
    short = np.array([axis_of(r) == "shortform" and r.get("target_len", 999) <= 300
                      for r in cal_rows])
    rep = np.array([axis_of(r) == "shortform" and r.get("ttr", 1.0) < 0.55
                    for r in cal_rows])
    for b_ in (0.01, 0.02, 0.05):
        _, thr = tpr_at_fpr(s, y_cal, b_)
        tag = f"@{int(b_*100)}fpr"
        row["cal_tpr" + tag] = round(float((s[y_cal == 1] > thr).mean()), 4)
        row["cal_longform_tpr" + tag] = round(float((s[(y_cal == 1) & lf] > thr).mean()), 4)
        row["cal_shortform_tpr" + tag] = round(float((s[(y_cal == 1) & sf] > thr).mean()), 4)
    _, thr2 = tpr_at_fpr(s, y_cal, 0.02)
    row["cal_short100_300_tpr@2fpr"] = round(float((s[(y_cal == 1) & short] > thr2).mean()), 4)
    row["cal_lowttr_tpr@2fpr"] = round(float((s[(y_cal == 1) & rep] > thr2).mean()), 4)
    worst, worstreg = 1.0, None
    for reg in LONGFORM:
        i = np.array([r["register"] == reg and axis_of(r) == "longform"
                      for r in cal_rows]) & (y_cal == 1)
        if i.sum() >= 20:
            v = float((s[i] > thr2).mean())
            if v < worst:
                worst, worstreg = v, reg
    row["cal_worst_longform_register@2fpr"] = [worstreg, round(worst, 4)]
    return row, lg


def main():
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(START)
    model = AutoModelForSequenceClassification.from_pretrained(START).to(device)
    n_params = sum(p.numel() for p in model.parameters())

    tr_rows, cal_rows = load("train"), load("cal")
    winfo = assign_weights(tr_rows)
    print(f"continuing from {START}: {n_params/1e6:.1f}M params, device={device}")
    print(f"train {len(tr_rows)}  cal {len(cal_rows)}   weights: {winfo}", flush=True)

    y_cal = np.array([1 if r["side"] == "ai" else 0 for r in cal_rows])
    base_row, _ = cal_row(model, cal_rows, tok, device, -1, y_cal)
    print(f"  START (epoch -1): {base_row}", flush=True)
    base_lf = base_row["cal_longform_tpr@2fpr"]

    loader = DataLoader(Docs(tr_rows, tok), batch_size=BATCH, shuffle=True)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total = EPOCHS * len(loader)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=total,
                                                pct_start=0.1, anneal_strategy="linear")
    lossf = torch.nn.CrossEntropyLoss(reduction="none")

    history, best = [base_row], None
    step, t0 = 0, time.time()
    for ep in range(EPOCHS):
        model.train()
        for b in loader:
            opt.zero_grad()
            lg = model(input_ids=b["input_ids"].to(device),
                       attention_mask=b["attention_mask"].to(device)).logits
            per = lossf(lg, b["labels"].to(device))
            loss = (per * b["weight"].to(device)).mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            step += 1
            if step % 100 == 0:
                print(f"  ep{ep} step {step}/{total} loss={loss.item():.4f} "
                      f"{(time.time()-t0)/step:.2f}s/step", flush=True)
        row, _ = cal_row(model, cal_rows, tok, device, ep, y_cal)
        sel = 0.5 * (row["cal_longform_tpr@2fpr"] + row["cal_shortform_tpr@2fpr"])
        row["selection_score"] = round(sel, 4)
        row["longform_guard_ok"] = bool(row["cal_longform_tpr@2fpr"] >= base_lf - LONGFORM_GUARD_PP)
        history.append(row)
        print(f"  EPOCH {ep}: {row}", flush=True)
        if row["longform_guard_ok"] and (best is None or sel > best[1]):
            os.makedirs(CKPT, exist_ok=True)
            model.save_pretrained(CKPT)
            tok.save_pretrained(CKPT)
            best = (ep, sel, row)
            print("  -> saved checkpoint (best so far)", flush=True)
        elif not row["longform_guard_ok"]:
            print(f"  -> REJECTED: long-form TPR {row['cal_longform_tpr@2fpr']} "
                  f"below guard {base_lf - LONGFORM_GUARD_PP:.4f}", flush=True)

    assert best is not None, "no epoch passed the long-form guard; nothing saved"

    model = AutoModelForSequenceClassification.from_pretrained(CKPT).to(device)
    lg_cal = logits_for(model, cal_rows, tok, device)
    T = fit_temperature(lg_cal, y_cal)
    s_cal = margin(lg_cal)
    p_cal = 1.0 / (1.0 + np.exp(-s_cal / T))

    thresholds = {}
    for b_ in (0.01, 0.02, 0.03, 0.05, 0.09):
        tpr, thr_m = tpr_at_fpr(s_cal, y_cal, b_)
        thresholds[f"{b_:.2f}"] = {
            "fpr_budget": b_,
            "threshold_prob_calibrated": round(float(1/(1+np.exp(-thr_m/T))), 6),
            "threshold_margin": round(float(thr_m), 6),
            "cal_tpr": round(tpr, 4)}

    def spread(p):
        return {"p10": round(float(np.percentile(p, 10)), 3),
                "p50": round(float(np.percentile(p, 50)), 3),
                "p90": round(float(np.percentile(p, 90)), 3),
                "sd": round(float(np.std(p)), 3)}

    rep = {
        "version": "tier3-cycle3-two-axis",
        "trained": time.strftime("%Y-%m-%d"),
        "continued_from": "cycle2-train/cycle2-checkpoint",
        "params_millions": round(n_params / 1e6, 2),
        "max_len": MAX_LEN, "epochs": EPOCHS, "lr": LR, "batch": BATCH,
        "seed": SEED, "weighting": winfo, "hard_boost": HARD_BOOST,
        "longform_guard_pp": LONGFORM_GUARD_PP,
        "train_rows": len(tr_rows), "cal_rows": len(cal_rows),
        "epoch_history": history, "selected_epoch": best[0],
        "temperature": round(T, 4),
        "thresholds_cal": thresholds,
        "cal_spread_ai_calibrated": spread(p_cal[y_cal == 1]),
        "cal_spread_human_calibrated": spread(p_cal[y_cal == 0]),
        "register_priority": REGISTER_PRIORITY,
    }
    json.dump(rep, open(os.path.join(HERE, "train-report.json"), "w"), indent=2)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()

"""CYCLE-2 Tier 3 classifier.

Cycle 1 learned REGISTER, not authorship: 84% on SEO service pages, 0% on
academic essays. The fixes here are corpus-side (register-balanced 1:1 on both
sides, published prose not chat) and objective-side:

  * per-(register, side) loss weighting, so no register carries a class prior
    the model can exploit as a shortcut;
  * hard negatives upweighted - human business-marketing and academic prose,
    plus AI written under the `human-voice` prompt style and by pro-flagship
    models, which are the cases that currently evade;
  * epoch selection on CAL TPR at a 2% FPR budget, not on accuracy;
  * temperature scaling fitted on CAL, so the reported probability spreads
    instead of bunching at 0.85.

Writes cycle2-checkpoint/ (fp32) + cycle2-train/train-report.json.
Never touches the test split until eval.py.
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
DATA = os.path.join(HERE, "dataset.jsonl")
CKPT = os.path.join(HERE, "cycle2-checkpoint")
BASE_MODEL = "intfloat/e5-small"
MAX_LEN = 512
EPOCHS = 4
LR = 2e-5
BATCH = 16
MAX_FPR = 0.02
HARD_BOOST = 1.6
# OBJECTIVE.md priority order: long-form highest, short-form social lowest.
REGISTER_PRIORITY = {"academic": 1.35, "report": 1.20, "article": 1.10,
                     "marketing": 1.00, "reference": 0.80,
                     "social": 0.50, "chat": 0.40}
LONGFORM = ("academic", "article", "marketing", "report", "reference")
SEED = 20260828


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


def load(split):
    rows = [json.loads(l) for l in open(DATA) if json.loads(l)["split"] == split]
    if split in ("train", "cal"):
        rows = [r for r in rows if not r.get("eval_only")]
    return rows


def assign_weights(rows):
    """Equalise (register, side) mass within each register, then boost hard
    negatives. Mean weight is normalised to 1 so the learning rate still means
    what it meant."""
    cells = collections.Counter((r["register"], r["side"]) for r in rows)
    regs = {k[0] for k in cells}
    for r in rows:
        reg = r["register"]
        n_self = cells[(reg, r["side"])]
        n_reg = cells.get((reg, "ai"), 0) + cells.get((reg, "human"), 0)
        r["_w"] = (n_reg / (2.0 * n_self)) if n_self else 0.0
        r["_w"] *= REGISTER_PRIORITY.get(reg, 1.0)
        if r.get("hard_negative"):
            r["_w"] *= HARD_BOOST
    m = float(np.mean([r["_w"] for r in rows])) or 1.0
    for r in rows:
        r["_w"] /= m
    return {"registers": len(regs),
            "mean_weight_hard": round(float(np.mean([r["_w"] for r in rows if r["hard_negative"]])), 3),
            "mean_weight_easy": round(float(np.mean([r["_w"] for r in rows if not r["hard_negative"]])), 3)}


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
    """Threshold = the (1-budget) quantile of human scores; returns (tpr, thr)."""
    hum = np.sort(scores[y == 0])
    if len(hum) == 0:
        return 0.0, float("inf")
    k = min(int(np.ceil(len(hum) * (1 - budget))), len(hum) - 1)
    thr = float(hum[k])
    return float((scores[y == 1] > thr).mean()), thr


def fit_temperature(lg, y):
    """NLL-minimising temperature on the 2-logit margin. T > 1 softens."""
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


def main():
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL, num_labels=2).to(device)
    n_params = sum(p.numel() for p in model.parameters())

    tr_rows, cal_rows = load("train"), load("cal")
    winfo = assign_weights(tr_rows)
    print(f"{BASE_MODEL}: {n_params/1e6:.1f}M params, device={device}")
    print(f"train {len(tr_rows)}  cal {len(cal_rows)}   weights: {winfo}")

    loader = DataLoader(Docs(tr_rows, tok), batch_size=BATCH, shuffle=True)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total = EPOCHS * len(loader)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=total,
                                                pct_start=0.1, anneal_strategy="linear")
    lossf = torch.nn.CrossEntropyLoss(reduction="none")

    y_cal = np.array([1 if r["side"] == "ai" else 0 for r in cal_rows])
    history, best = [], None
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
            if step % 50 == 0:
                print(f"  ep{ep} step {step}/{total} loss={loss.item():.4f} "
                      f"{(time.time()-t0)/step:.2f}s/step", flush=True)

        lg_cal = logits_for(model, cal_rows, tok, device)
        s = margin(lg_cal)
        from sklearn.metrics import roc_auc_score
        auc = float(roc_auc_score(y_cal, s))
        row = {"epoch": ep, "cal_auroc": round(auc, 4)}
        lf = np.array([r["register"] in LONGFORM for r in cal_rows])
        for b_ in (0.01, 0.02, 0.05):
            # threshold from ALL cal humans (false positives matter everywhere),
            # detection scored on LONG-FORM AI only (the objective's priority)
            _, thr_ = tpr_at_fpr(s, y_cal, b_)
            row[f"cal_tpr@{int(b_*100)}fpr"] = round(
                float((s[(y_cal == 1)] > thr_).mean()), 4)
            row[f"cal_longform_tpr@{int(b_*100)}fpr"] = round(
                float((s[(y_cal == 1) & lf] > thr_).mean()), 4)
        # worst long-form register, so a strong average cannot hide a dead category
        worst, worstreg = 1.0, None
        _, thr2 = tpr_at_fpr(s, y_cal, 0.02)
        for reg in LONGFORM:
            i = np.array([r["register"] == reg for r in cal_rows]) & (y_cal == 1)
            if i.sum() >= 20:
                v = float((s[i] > thr2).mean())
                if v < worst:
                    worst, worstreg = v, reg
        row["cal_worst_longform_register@2fpr"] = [worstreg, round(worst, 4)]
        history.append(row)
        print(f"  EPOCH {ep}: {row}", flush=True)
        sel = row["cal_longform_tpr@2fpr"]
        if best is None or sel > best[1]["cal_longform_tpr@2fpr"]:
            os.makedirs(CKPT, exist_ok=True)
            model.save_pretrained(CKPT)
            tok.save_pretrained(CKPT)
            best = (ep, row)
            print(f"  -> saved checkpoint (best so far)", flush=True)

    # reload best, fit temperature + thresholds on CAL only
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).to(device)
    lg_cal = logits_for(model, cal_rows, tok, device)
    T = fit_temperature(lg_cal, y_cal)
    s_cal = margin(lg_cal)
    p_cal = 1.0 / (1.0 + np.exp(-s_cal / T))
    p_raw = 1.0 / (1.0 + np.exp(-s_cal))

    budgets = [0.01, 0.02, 0.03, 0.05, 0.09]
    thresholds = {}
    for b_ in budgets:
        tpr, thr_m = tpr_at_fpr(s_cal, y_cal, b_)
        thresholds[f"{b_:.2f}"] = {
            "fpr_budget": b_,
            "threshold_prob_calibrated": round(float(1/(1+np.exp(-thr_m/T))), 6),
            "threshold_margin": round(float(thr_m), 6),
            "cal_tpr": round(tpr, 4),
        }

    def spread(p):
        return {"p10": round(float(np.percentile(p, 10)), 3),
                "p50": round(float(np.percentile(p, 50)), 3),
                "p90": round(float(np.percentile(p, 90)), 3),
                "sd": round(float(np.std(p)), 3),
                "frac_in_0.80_0.90": round(float(((p >= .8) & (p <= .9)).mean()), 3)}

    y_is_ai = y_cal == 1
    rep = {
        "version": "tier3-cycle2-v2",
        "trained": time.strftime("%Y-%m-%d"),
        "base_model": BASE_MODEL,
        "params_millions": round(n_params / 1e6, 2),
        "max_len": MAX_LEN, "epochs": EPOCHS, "lr": LR, "batch": BATCH,
        "seed": SEED, "weighting": winfo, "hard_boost": HARD_BOOST,
        "train_rows": len(tr_rows), "cal_rows": len(cal_rows),
        "epoch_history": history, "selected_epoch": best[0],
        "temperature": round(T, 4),
        "thresholds_cal": thresholds,
        "cal_prob_spread_calibrated": spread(p_cal),
        "cal_prob_spread_uncalibrated": spread(p_raw),
        "cal_spread_ai_calibrated": spread(p_cal[y_is_ai]),
        "cal_spread_human_calibrated": spread(p_cal[~y_is_ai]),
        "register_priority": REGISTER_PRIORITY,
    }
    json.dump(rep, open(os.path.join(HERE, "train-report.json"), "w"), indent=2)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()

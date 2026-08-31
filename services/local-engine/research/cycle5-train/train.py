"""Cycle-5 training. Two arms from one file (C5_ARM=full | ablation).

The two cycle-4 lessons are built in as objectives, not afterthoughts:

  * CALIBRATION SPREAD IS A TRAINING OBJECTIVE. Label smoothing (0.05) keeps
    the margins from over-sharpening; every epoch records the NLL-fitted
    temperature and the calibrated score spread on CAL, and an epoch whose
    fitted temperature exceeds 1.30 or whose calibrated sd falls below 0.25
    FAILS the spread gate and cannot be selected. Cycle 4 died with T=1.7137;
    cycle 2 (accepted) fitted T=0.8324.
  * THE QUANTISATION GATE RUNS AT EVERY EPOCH, not at the end. After each
    epoch the model is exported to per-channel int8 ONNX and scored on a
    stratified CAL subsample; verdict flips at the 2%-budget threshold above
    1% or a TPR@2% drop above 2 points fails the epoch. Cycle 3 died at the
    end on a 5.2-point int8 recall loss nobody had looked for earlier.

Selection: among epochs passing BOTH gates, maximise
mean(long-form TPR@2%FPR, short-form TPR@2%FPR) on CAL. If no epoch passes,
the best-scoring epoch is still saved and the failure is recorded — the
report then declines the cycle rather than hiding it.

Arms: 'full' feeds the 8 structural features; 'ablation' feeds zeros
(identical parameter count). Both write train-report-<arm>.json and
ckpt-<arm>/ (+ per-epoch int8 onnx under onnx-<arm>/).
"""
from __future__ import annotations

import collections
import json
import os
import time

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "dataset.jsonl")
FEATS = os.path.join(HERE, "features.jsonl")
BASE_MODEL = "intfloat/e5-small"
MAX_LEN = 512
EPOCHS = 3
LR = 2e-5
BATCH = 16
LABEL_SMOOTH = 0.05
HARD_BOOST = 1.6
SEED = 20260831
ARM = os.environ.get("C5_ARM", "full")
CKPT = os.path.join(HERE, f"ckpt-{ARM}")
ONNXDIR = os.path.join(HERE, f"onnx-{ARM}")
REGISTER_PRIORITY = {"academic": 1.35, "report": 1.20, "article": 1.10,
                     "marketing": 1.00, "creative": 1.00, "reference": 0.80,
                     "social": 0.50, "chat": 0.40}
LONGFORM = ("academic", "article", "marketing", "report", "reference", "creative")
# gates
SPREAD_T_MAX = 1.30
SPREAD_SD_MIN = 0.25
SPREAD_BAND_MAX = 0.25       # frac of cal probs in 0.80-0.90
INT8_FLIP_MAX = 0.01
INT8_TPR_DROP_MAX = 0.02
INT8_SUBSAMPLE = 1200

import sys
sys.path.insert(0, HERE)
from model_lib import E5Struct, N_FEATS, fit_norm, apply_norm, save_ckpt  # noqa: E402
from struct_features import norm_key  # noqa: E402


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
                "feats": torch.tensor(d["_z"], dtype=torch.float32),
                "labels": torch.tensor(1 if d["side"] == "ai" else 0),
                "weight": torch.tensor(float(d.get("_w", 1.0)))}


def axis_of(r):
    return r.get("axis", "longform")


def load(split, featmap):
    rows = []
    missing = 0
    for l in open(DATA):
        r = json.loads(l)
        if r["split"] != split or r.get("eval_only"):
            continue
        f = featmap.get(norm_key(r["text"]))
        if f is None:
            missing += 1
            f = [float("nan")] * N_FEATS
        r["_feats"] = f
        rows.append(r)
    if missing:
        print(f"  {split}: {missing} rows without cached features (NaN-imputed)",
              flush=True)
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
            "mean_w_hard": round(float(np.mean([r["_w"] for r in rows if r.get("hard_negative")])), 3),
            "mean_w_easy": round(float(np.mean([r["_w"] for r in rows if not r.get("hard_negative")])), 3)}


@torch.no_grad()
def logits_for(model, rows, tok, device, bs=32):
    model.eval()
    out = []
    for i in range(0, len(rows), bs):
        chunk = rows[i:i + bs]
        enc = tok([r["text"] for r in chunk], truncation=True, max_length=MAX_LEN,
                  padding=True, return_tensors="pt")
        fz = torch.tensor(np.stack([r["_z"] for r in chunk]), dtype=torch.float32)
        lg = model(enc.input_ids.to(device), enc.attention_mask.to(device),
                   fz.to(device)).float().cpu().numpy()
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


def export_int8(model, tok, tag):
    """Export the current weights to fp32 + per-channel int8 ONNX. CPU-side."""
    os.makedirs(ONNXDIR, exist_ok=True)
    fp32 = os.path.join(ONNXDIR, f"{tag}-fp32.onnx")
    int8 = os.path.join(ONNXDIR, f"{tag}-int8.onnx")
    m = E5Struct(BASE_MODEL)
    m.load_state_dict({k: v.cpu() for k, v in model.state_dict().items()})
    m.eval()
    enc = tok("example text for tracing", return_tensors="pt",
              padding="max_length", truncation=True, max_length=MAX_LEN)
    fz = torch.zeros(1, N_FEATS)
    torch.onnx.export(
        m, (enc.input_ids, enc.attention_mask, fz), fp32,
        input_names=["input_ids", "attention_mask", "feats"],
        output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "seq"},
                      "attention_mask": {0: "batch", 1: "seq"},
                      "feats": {0: "batch"},
                      "logits": {0: "batch"}},
        opset_version=14)
    from onnxruntime.quantization import QuantType, quantize_dynamic
    quantize_dynamic(fp32, int8, weight_type=QuantType.QInt8, per_channel=True)
    return fp32, int8


def onnx_margins(path, rows, tok, bs=32):
    import onnxruntime as ort
    opts = ort.SessionOptions()
    opts.log_severity_level = 3
    sess = ort.InferenceSession(path, opts, providers=["CPUExecutionProvider"])
    out = []
    for i in range(0, len(rows), bs):
        chunk = rows[i:i + bs]
        enc = tok([r["text"] for r in chunk], truncation=True, max_length=MAX_LEN,
                  padding="max_length", return_tensors="np")
        feed = {"input_ids": enc["input_ids"].astype(np.int64),
                "attention_mask": enc["attention_mask"].astype(np.int64),
                "feats": np.stack([r["_z"] for r in chunk]).astype(np.float32)}
        lg = sess.run(None, feed)[0]
        out.append(lg[:, 1] - lg[:, 0])
    return np.concatenate(out)


def spread_stats(p):
    return {"p10": round(float(np.percentile(p, 10)), 3),
            "p50": round(float(np.percentile(p, 50)), 3),
            "p90": round(float(np.percentile(p, 90)), 3),
            "sd": round(float(np.std(p)), 4),
            "frac_in_0.80_0.90": round(float(((p >= .8) & (p <= .9)).mean()), 4)}


def main():
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cpu"

    featmap = {}
    for l in open(FEATS):
        r = json.loads(l)
        featmap[r["sha_norm"]] = r["feats"]
    print(f"feature cache: {len(featmap)} texts", flush=True)

    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    tr_rows, cal_rows = load("train", featmap), load("cal", featmap)
    smoke = os.environ.get("C5_SMOKE")
    if smoke:
        global EPOCHS
        EPOCHS = 1
        rng0 = np.random.RandomState(0)
        tr_rows = [tr_rows[i] for i in rng0.choice(len(tr_rows), int(smoke), replace=False)]
        cal_rows = [cal_rows[i] for i in rng0.choice(len(cal_rows), int(smoke) // 2, replace=False)]
        print(f"SMOKE MODE: {len(tr_rows)} train / {len(cal_rows)} cal, 1 epoch", flush=True)
    winfo = assign_weights(tr_rows)

    # feature normalisation fitted on TRAIN only; ablation arm zeroes features
    norm = fit_norm([r["_feats"] for r in tr_rows])
    for r in tr_rows + cal_rows:
        z = apply_norm(r["_feats"], norm)
        r["_z"] = (z * 0.0) if ARM == "ablation" else z
    nz = float(np.mean([np.abs(r["_z"]).sum() > 0 for r in tr_rows]))
    print(f"ARM={ARM}  train {len(tr_rows)}  cal {len(cal_rows)}  weights {winfo}  "
          f"rows with non-zero features: {nz:.1%}", flush=True)

    model = E5Struct(BASE_MODEL).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"{BASE_MODEL}+struct: {n_params/1e6:.2f}M params, device={device}", flush=True)

    y_cal = np.array([1 if r["side"] == "ai" else 0 for r in cal_rows])
    lf = np.array([r["register"] in LONGFORM and axis_of(r) == "longform" for r in cal_rows])
    sf = np.array([axis_of(r) == "shortform" for r in cal_rows])
    short100 = np.array([axis_of(r) == "shortform" and r.get("target_len", 999) <= 300
                         for r in cal_rows])

    # stratified int8 gate subsample: every (side, axis) cell represented
    rng = np.random.RandomState(SEED)
    idx_by_cell = collections.defaultdict(list)
    for i, r in enumerate(cal_rows):
        idx_by_cell[(r["side"], axis_of(r))].append(i)
    sub_idx = []
    per_cell = max(1, INT8_SUBSAMPLE // max(1, len(idx_by_cell)))
    for cell, idxs in idx_by_cell.items():
        take = min(len(idxs), per_cell)
        sub_idx.extend(rng.choice(idxs, size=take, replace=False))
    sub_idx = sorted(sub_idx)
    sub_rows = [cal_rows[i] for i in sub_idx]
    y_sub = y_cal[sub_idx]
    print(f"int8 gate subsample: {len(sub_rows)} cal rows "
          f"({dict(collections.Counter((r['side'], axis_of(r)) for r in sub_rows))})",
          flush=True)

    loader = DataLoader(Docs(tr_rows, tok), batch_size=BATCH, shuffle=True)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total = EPOCHS * len(loader)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=total,
                                                pct_start=0.1, anneal_strategy="linear")
    lossf = torch.nn.CrossEntropyLoss(reduction="none", label_smoothing=LABEL_SMOOTH)

    from sklearn.metrics import roc_auc_score
    history, best = [], None
    step, t0 = 0, time.time()
    for ep in range(EPOCHS):
        model.train()
        for b in loader:
            opt.zero_grad()
            lg = model(b["input_ids"].to(device), b["attention_mask"].to(device),
                       b["feats"].to(device))
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

        # ---- cal metrics
        lg_cal = logits_for(model, cal_rows, tok, device)
        s = margin(lg_cal)
        T = fit_temperature(lg_cal, y_cal)
        p_calib = 1.0 / (1.0 + np.exp(-s / T))
        row = {"epoch": ep,
               "cal_auroc": round(float(roc_auc_score(y_cal, s)), 4),
               "fitted_temperature": round(T, 4),
               "cal_spread_calibrated": spread_stats(p_calib),
               "cal_spread_ai": spread_stats(p_calib[y_cal == 1]),
               "cal_spread_human": spread_stats(p_calib[y_cal == 0])}
        for b_ in (0.01, 0.02, 0.05):
            tpr, thr = tpr_at_fpr(s, y_cal, b_)
            tag = f"@{int(b_*100)}fpr"
            row["cal_tpr" + tag] = round(tpr, 4)
            row["cal_longform_tpr" + tag] = round(float((s[(y_cal == 1) & lf] > thr).mean()), 4)
            row["cal_shortform_tpr" + tag] = round(float((s[(y_cal == 1) & sf] > thr).mean()), 4)
        _, thr2 = tpr_at_fpr(s, y_cal, 0.02)
        row["cal_short100_300_tpr@2fpr"] = round(float((s[(y_cal == 1) & short100] > thr2).mean()), 4)
        worst, worstreg = 1.0, None
        for reg in LONGFORM:
            i = np.array([r["register"] == reg and axis_of(r) == "longform"
                          for r in cal_rows]) & (y_cal == 1)
            if i.sum() >= 20:
                v = float((s[i] > thr2).mean())
                if v < worst:
                    worst, worstreg = v, reg
        row["cal_worst_longform_register@2fpr"] = [worstreg, round(worst, 4)]

        # ---- spread gate (cycle-4 lesson)
        sp = row["cal_spread_calibrated"]
        row["spread_gate"] = {
            "T_max": SPREAD_T_MAX, "sd_min": SPREAD_SD_MIN, "band_max": SPREAD_BAND_MAX,
            "pass": bool(T <= SPREAD_T_MAX and sp["sd"] >= SPREAD_SD_MIN
                         and sp["frac_in_0.80_0.90"] <= SPREAD_BAND_MAX)}

        # ---- int8 gate at EVERY epoch (cycle-3 lesson)
        tq0 = time.time()
        fp32_path, int8_path = export_int8(model, tok, f"ep{ep}")
        s_sub_fp32 = s[sub_idx]
        s_sub_int8 = onnx_margins(int8_path, sub_rows, tok)
        _, thr_sub = tpr_at_fpr(s_sub_fp32, y_sub, 0.02)
        v_fp32 = s_sub_fp32 > thr_sub
        # int8 threshold refitted the same way on its own scores — the shipped
        # pipeline refits the operating point per export, so the gate compares
        # like with like; verdict flips are measured at the SHARED fp32 point.
        v_int8_same = s_sub_int8 > thr_sub
        flips = int((v_fp32 != v_int8_same).sum())
        tpr_fp32 = float(v_fp32[y_sub == 1].mean())
        _, thr_sub_i = tpr_at_fpr(s_sub_int8, y_sub, 0.02)
        tpr_int8 = float((s_sub_int8[y_sub == 1] > thr_sub_i).mean())
        drift = np.abs(1/(1+np.exp(-s_sub_int8/T)) - 1/(1+np.exp(-s_sub_fp32/T)))
        row["int8_gate"] = {
            "subsample": len(sub_rows),
            "flip_rate_at_2fpr_thr": round(flips / len(sub_rows), 4),
            "tpr2_fp32": round(tpr_fp32, 4), "tpr2_int8_refit": round(tpr_int8, 4),
            "tpr2_delta": round(tpr_int8 - tpr_fp32, 4),
            "prob_drift_mean": round(float(drift.mean()), 4),
            "prob_drift_p95": round(float(np.percentile(drift, 95)), 4),
            "seconds": round(time.time() - tq0, 1),
            "pass": bool(flips / len(sub_rows) <= INT8_FLIP_MAX
                         and (tpr_int8 - tpr_fp32) >= -INT8_TPR_DROP_MAX)}

        sel = 0.5 * (row["cal_longform_tpr@2fpr"] + row["cal_shortform_tpr@2fpr"])
        row["selection_score"] = round(sel, 4)
        row["gates_pass"] = bool(row["spread_gate"]["pass"] and row["int8_gate"]["pass"])
        history.append(row)
        print(f"  EPOCH {ep}: {json.dumps(row)}", flush=True)

        better = best is None or (
            (row["gates_pass"], sel) > (best[1]["gates_pass"], best[1]["selection_score"]))
        if better:
            save_ckpt(model, tok, norm, CKPT)
            best = (ep, row)
            print("  -> saved checkpoint (best so far)", flush=True)

    # final: reload best, fit T + thresholds on CAL
    from model_lib import load_ckpt
    model, _ = load_ckpt(CKPT, device=device)
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

    rep = {
        "version": f"tier3-cycle5-{ARM}",
        "arm": ARM,
        "trained": time.strftime("%Y-%m-%d"),
        "base_model": BASE_MODEL,
        "architecture": "pooler_output (+8 z-normed structural feats, zeroed in "
                        "ablation arm) -> dropout -> linear(392,2)",
        "params_millions": round(n_params / 1e6, 2),
        "max_len": MAX_LEN, "epochs": EPOCHS, "lr": LR, "batch": BATCH,
        "label_smoothing": LABEL_SMOOTH,
        "seed": SEED, "weighting": winfo, "hard_boost": HARD_BOOST,
        "train_rows": len(tr_rows), "cal_rows": len(cal_rows),
        "feature_norm": fit_norm([r["_feats"] for r in tr_rows]),
        "epoch_history": history,
        "selected_epoch": best[0],
        "selected_gates_pass": best[1]["gates_pass"],
        "temperature": round(T, 4),
        "thresholds_cal": thresholds,
        "cal_spread_calibrated": spread_stats(p_cal),
        "cal_spread_ai": spread_stats(p_cal[y_cal == 1]),
        "cal_spread_human": spread_stats(p_cal[y_cal == 0]),
        "register_priority": REGISTER_PRIORITY,
        "gate_definitions": {
            "spread": f"fitted T <= {SPREAD_T_MAX}, calibrated cal sd >= {SPREAD_SD_MIN}, "
                      f"frac in 0.80-0.90 <= {SPREAD_BAND_MAX}",
            "int8": f"verdict flips at shared 2%-budget threshold <= {INT8_FLIP_MAX:.0%} "
                    f"of subsample, int8 TPR@2%(refit) drop <= {INT8_TPR_DROP_MAX:.0%}"},
    }
    json.dump(rep, open(os.path.join(HERE, f"train-report-{ARM}.json"), "w"), indent=2)
    print(json.dumps({k: v for k, v in rep.items() if k != "epoch_history"}, indent=2))


if __name__ == "__main__":
    main()

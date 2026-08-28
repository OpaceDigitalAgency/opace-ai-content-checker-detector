"""Train the Tier 2 logistic head and export weights + calibrated threshold.

Protocol (CLEAN-PROSE-DETECTION-PLAN.md section 5):
  - fit standardiser + logistic regression on the TRAIN split only;
  - choose the operating threshold FPR-FIRST on the CAL split: the highest
    threshold whose false-positive rate on cal humans is <= 2%;
  - report TPR/FPR on the corpus TEST split (still not the quarantined eval set);
  - export everything the browser runtime needs as JSON:
    feature names, means, stds, LR coefficients, intercept, threshold.
"""

from __future__ import annotations

import json
import os

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "..", "models")
MAX_FPR = 0.02


def load(split=None):
    X, y, meta = [], [], []
    with open(os.path.join(HERE, "features.jsonl")) as f:
        for ln in f:
            d = json.loads(ln)
            if split and d["split"] != split:
                continue
            X.append(d["feats"])
            y.append(1 if d["side"] == "ai" else 0)
            meta.append(d)
    return np.array(X), np.array(y), meta


def threshold_at_fpr(scores_h: np.ndarray, max_fpr: float) -> float:
    """Highest score threshold keeping FPR on humans <= max_fpr."""
    qs = np.sort(scores_h)
    k = int(np.floor(len(qs) * (1 - max_fpr)))
    k = min(k, len(qs) - 1)
    t = float(qs[k]) + 1e-9
    return min(t, 1.0 - 1e-9)


def main() -> None:
    from surprisal_features import FEATURE_NAMES

    Xtr, ytr, _ = load("train")
    Xcal, ycal, _ = load("cal")
    Xte, yte, mte = load("test")
    print(f"train {Xtr.shape}, cal {Xcal.shape}, test {Xte.shape}")

    mu, sd = Xtr.mean(0), Xtr.std(0)
    sd[sd == 0] = 1.0
    Z = lambda X: (X - mu) / sd

    clf = LogisticRegression(max_iter=2000, C=1.0)
    clf.fit(Z(Xtr), ytr)

    p_cal = clf.predict_proba(Z(Xcal))[:, 1]
    thr = threshold_at_fpr(p_cal[ycal == 0], MAX_FPR)

    p_te = clf.predict_proba(Z(Xte))[:, 1]
    auc = roc_auc_score(yte, p_te)
    tpr = float((p_te[yte == 1] >= thr).mean())
    fpr = float((p_te[yte == 0] >= thr).mean())
    cal_fpr = float((p_cal[ycal == 0] >= thr).mean())
    print(f"threshold={thr:.4f} (cal-human FPR {cal_fpr:.3f})")
    print(f"corpus TEST: AUROC={auc:.4f}  TPR={tpr:.3f}  FPR={fpr:.3f}  "
          f"(n_ai={int(yte.sum())}, n_human={int((1 - yte).sum())})")

    os.makedirs(MODELS, exist_ok=True)
    out = {
        "version": "tier2-head-v1",
        "trained": "2026-08-28",
        "model": "gpt2 (124M) surprisal, log2",
        "features": FEATURE_NAMES,
        "standardise": {"mean": mu.tolist(), "std": sd.tolist()},
        "logistic": {"coef": clf.coef_[0].tolist(), "intercept": float(clf.intercept_[0])},
        "threshold": thr,
        "operating_point": f"<= {MAX_FPR:.0%} FPR on calibration humans",
        "corpus_test_metrics": {"auroc": auc, "tpr": tpr, "fpr": fpr},
        "min_tokens": 50,
    }
    path = os.path.join(MODELS, "tier2-head.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"exported -> {path}")

    # per-source test-split breakdown for the report
    by = {}
    for d, p in zip(mte, p_te):
        by.setdefault(d["source"], []).append(p >= thr)
    for s, flags in sorted(by.items()):
        print(f"  test {s}: flagged {sum(flags)}/{len(flags)}")


if __name__ == "__main__":
    main()

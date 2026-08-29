"""Calibrate cycle-3b twice, for the two things the product shows.

A single temperature cannot do both jobs: the model's margins are trained against
a soft target, so a temperature fitted to the class label leaves pure-human
documents sitting near 0.5. Instead:

  * `share`  — isotonic regression margin -> AI word share, fitted on CAL.
  * `verdict` — Platt (single temperature + bias) margin -> P(document is AI),
    fitted on CAL against the binary label.

Both are monotone in the margin, so the flag threshold is unaffected; only the
number shown to the user changes.
"""
import json, os
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
import common3 as C

def main():
    cal = [r for r in C.jsonl(os.path.join(C.HERE, "dataset3.jsonl")) if r["split"] == "cal"]
    sc = C.Scorer(os.path.join(C.HERE, "cycle3b-checkpoint"), temperature=1.0)
    m = sc.margins([r["text"] for r in cal], progress="cal")
    t = np.array([r["ai_ratio"] for r in cal])
    iso = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip").fit(m, t)
    lr = LogisticRegression().fit(m.reshape(-1, 1), (t >= 0.5).astype(int))

    rows = [r for r in C.jsonl(os.path.join(C.HERE, "evalsets.jsonl"))]
    mar = json.load(open(os.path.join(C.HERE, "eval-cycle3b-margins.json")))
    hat = [(r, mar[r["set"] + "|" + r["id"]]) for r in rows if r["set"] == "hat-test"]
    mh = np.array([v for _, v in hat]); th = np.array([r["ai_ratio"] for r, _ in hat])
    est = iso.predict(mh)
    fresh = [(r, mar[r["set"] + "|" + r["id"]]) for r in rows if r["set"] == "fresh"]
    mf = np.array([v for _, v in fresh]); yf = np.array([r["side"] == "ai" for r, _ in fresh])
    pv = lr.predict_proba(mf.reshape(-1, 1))[:, 1]
    import collections
    d = collections.defaultdict(list)
    for (r, _), e in zip(hat, est):
        d[r["band"]].append(e)
    out = {
        "isotonic_knots": {"x": [round(float(x), 4) for x in iso.f_.x],
                            "y": [round(float(y), 4) for y in iso.f_.y]},
        "platt": {"coef": round(float(lr.coef_[0][0]), 6), "intercept": round(float(lr.intercept_[0]), 6)},
        "share_MAE_hat_test": round(float(np.abs(est - th).mean()), 4),
        "share_median_by_band": {k: [round(float(np.median(v)), 3), len(v)] for k, v in sorted(d.items())},
        "verdict_spread_fresh": {
            "ai_p10_p50_p90": [round(float(np.percentile(pv[yf], q)), 3) for q in (10, 50, 90)],
            "human_p10_p50_p90": [round(float(np.percentile(pv[~yf], q)), 3) for q in (10, 50, 90)],
            "sd": round(float(pv.std()), 3),
            "frac_0.80_0.90": round(float(((pv >= .8) & (pv <= .9)).mean()), 4)},
        "verdict_prob_at_operating_margins": {
            str(t_): round(float(lr.predict_proba(np.array([[t_]]))[0, 1]), 4)
            for t_ in (4.2209, 4.0611, 3.8969, 3.724)},
    }
    json.dump(out, open(os.path.join(C.HERE, "calibration3.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "isotonic_knots"}, indent=1))

if __name__ == "__main__":
    main()

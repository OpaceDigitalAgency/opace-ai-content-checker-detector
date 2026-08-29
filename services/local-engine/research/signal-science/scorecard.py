"""The transparent classifier, and the price of transparency.

Three models are fitted on exactly the data the cycle-2 neural model was
trained on, and evaluated on exactly the data it was validated on:

  scorecard   sparse L1 logistic regression over the interpretable battery,
              cut to a readable number of features. Every contribution to
              every score can be written down: feature, standardised value,
              weight, product.
  lr_full     L2 logistic regression over the whole battery — the ceiling for
              a purely additive model.
  gbt         histogram gradient boosting over the same features — the ceiling
              for the features themselves, whatever the model class. Not
              additive, so not the publishable scorecard, but it says whether
              the scorecard's shortfall is the features or the linearity.

Preprocessing is deliberately the simplest thing that works and can be
reproduced by hand: winsorise each feature at the training 1st/99th percentile,
then z-score against the training mean and SD. A reader can then read a
contribution as "this document's paragraph-length variation is 1.9 SD below the
human norm, which adds 0.41 to its log-odds of being machine-written".

Splits
  train    cycle-2 training rows (c2_split == "train")
  fresh    longform-corpus, both sides — never seen by either model, and the
           set the deployed 0.984 operating point was fitted on
  battery  human-corpus-v1/v2 — human only, evaluation-licence, never trained on
"""
from __future__ import annotations

import json
import math
import os
import sys
from collections import defaultdict

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression, Ridge

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results")
FEATS = os.path.join(HERE, "corpus", "features.jsonl")
NEURAL = os.path.join(HERE, "corpus", "neural-scores.jsonl")
BUDGETS = (0.01, 0.02, 0.03, 0.05, 0.09)
TARGET_FEATURES = 24

# Formatting is not authorship. The project has established three times over that
# markdown detects where text was copied from, not who wrote it: paste the same
# article out of a chat window and out of a CMS and only one carries hashes and
# asterisks. A scorecard that leans on it will look strong here and fail on the
# pasted prose users actually submit, so a formatting-free variant is fitted
# alongside and reported as the honest one for that case.
FORMATTING = ("fmt_", "pun_hash_per1kc", "pun_asterisk_per1kc")


def is_formatting(k):
    return any(k.startswith(p) if p.endswith("_") else k == p for p in FORMATTING)


def load():
    rows = [json.loads(l) for l in open(FEATS, encoding="utf-8")]
    return [r for r in rows if not r.get("background")]


def split_of(r):
    if r.get("c2_split") == "train":
        return "train"
    if r["pool"] in ("ai-longform", "human-longform"):
        return "fresh"
    if r["pool"].startswith("human-battery"):
        return "battery"
    if r.get("c2_split") in ("val", "test", "calib"):
        return "c2_heldout"
    return "other_heldout"


def design(rows, keys):
    X = np.empty((len(rows), len(keys)), dtype=np.float64)
    for j, k in enumerate(keys):
        col = np.array([r["f"].get(k, np.nan) for r in rows], dtype=np.float64)
        X[:, j] = col
    return X


def fit_scaler(X):
    lo = np.nanpercentile(X, 1, axis=0)
    hi = np.nanpercentile(X, 99, axis=0)
    med = np.nanmedian(X, axis=0)
    Xc = np.clip(np.where(np.isnan(X), med, X), lo, hi)
    mu, sd = Xc.mean(axis=0), Xc.std(axis=0)
    sd[sd < 1e-9] = 1.0
    return {"lo": lo, "hi": hi, "med": med, "mu": mu, "sd": sd}


def apply_scaler(X, s):
    Xc = np.clip(np.where(np.isnan(X), s["med"], X), s["lo"], s["hi"])
    return (Xc - s["mu"]) / s["sd"]


def thr_for_fpr(human_scores, budget):
    h = np.sort(np.asarray(human_scores))
    if len(h) == 0:
        return float("inf")
    k = min(max(int(np.ceil(len(h) * (1 - budget))) - 1, 0), len(h) - 1)
    return float(np.nextafter(h[k], np.inf))


def auroc(ai, hu):
    from scipy import stats as st
    if len(ai) == 0 or len(hu) == 0:
        return float("nan")
    r = st.rankdata(np.concatenate([ai, hu]))
    return float((r[:len(ai)].sum() - len(ai) * (len(ai) + 1) / 2.0) / (len(ai) * len(hu)))


def operating_curve(scores, sides, human_ref=None):
    s = np.asarray(scores, dtype=float)
    y = np.asarray([1 if x == "ai" else 0 for x in sides])
    ai, hu = s[y == 1], s[y == 0]
    ref = hu if human_ref is None else np.asarray(human_ref, dtype=float)
    out = {"n_ai": int(len(ai)), "n_human": int(len(hu)),
           "auroc": auroc(ai, hu), "thresholds": {}}
    for b in BUDGETS:
        t = thr_for_fpr(ref, b)
        out["thresholds"]["%d%%" % round(b * 100)] = {
            "threshold": t,
            "tpr": float((ai >= t).mean()) if len(ai) else float("nan"),
            "fpr_realised": float((hu >= t).mean()) if len(hu) else float("nan"),
        }
    return out


def main() -> None:
    os.makedirs(RESULTS, exist_ok=True)
    rows = load()
    keys = sorted({k for r in rows[:300] for k in r["f"]})
    keys = [k for k in keys if k != "n_words"]

    for r in rows:
        r["split"] = split_of(r)
    by = defaultdict(list)
    for r in rows:
        by[r["split"]].append(r)
    print({k: len(v) for k, v in by.items()}, flush=True)

    train = by["train"]
    fresh = by["fresh"]
    battery = by["battery"]
    other = by["other_heldout"] + by["c2_heldout"]

    ytr = np.array([1 if r["side"] == "ai" else 0 for r in train])
    Xtr_raw = design(train, keys)
    sc = fit_scaler(Xtr_raw)
    Xtr = apply_scaler(Xtr_raw, sc)
    print(f"train: {len(train)} ({ytr.sum()} AI / {len(ytr)-ytr.sum()} human)", flush=True)

    res = {"n_features_available": len(keys), "splits": {k: len(v) for k, v in by.items()}}

    # --- 1. sparse scorecard ----------------------------------------------
    chosen, best_C = None, None
    for C in (0.004, 0.006, 0.008, 0.012, 0.02, 0.03, 0.05, 0.08, 0.15, 0.3):
        m = LogisticRegression(penalty="l1", C=C, solver="liblinear",
                               max_iter=4000, class_weight="balanced")
        m.fit(Xtr, ytr)
        nz = int((np.abs(m.coef_[0]) > 1e-8).sum())
        print(f"  L1 C={C}: {nz} non-zero", flush=True)
        if nz >= TARGET_FEATURES:
            chosen, best_C = m, C
            break
        chosen, best_C = m, C
    nz_idx = np.argsort(-np.abs(chosen.coef_[0]))[:TARGET_FEATURES]
    nz_idx = [int(i) for i in nz_idx if abs(chosen.coef_[0][i]) > 1e-8]
    sub_keys = [keys[i] for i in nz_idx]
    # refit unpenalised on the selected features so the published weights are
    # the honest maximum-likelihood ones rather than L1-shrunk
    card = LogisticRegression(penalty="l2", C=1e4, max_iter=8000,
                              class_weight="balanced")
    card.fit(Xtr[:, nz_idx], ytr)
    fa_path = os.path.join(RESULTS, "feature-analysis.json")
    univ = {}
    if os.path.exists(fa_path):
        _fa = json.load(open(fa_path))
        for k, v in _fa.get("fresh_longform_register_matched", {}).items():
            univ[k] = max(v["auroc"], 1 - v["auroc"])
    res["univariate_auroc_fresh_matched"] = univ
    res["scorecard"] = {"l1_C": best_C, "n_features": len(sub_keys),
                        "features": sub_keys,
                        "weights": [float(w) for w in card.coef_[0]],
                        "intercept": float(card.intercept_[0])}

    # --- 1b. the same, with every formatting feature withheld --------------
    prose_cols = [i for i, k in enumerate(keys) if not is_formatting(k)]
    Xtr_p = Xtr[:, prose_cols]
    chosen_p = None
    for C in (0.004, 0.006, 0.008, 0.012, 0.02, 0.03, 0.05, 0.08, 0.15, 0.3):
        m = LogisticRegression(penalty="l1", C=C, solver="liblinear",
                               max_iter=4000, class_weight="balanced")
        m.fit(Xtr_p, ytr)
        chosen_p = m
        if int((np.abs(m.coef_[0]) > 1e-8).sum()) >= TARGET_FEATURES:
            break
    pz = np.argsort(-np.abs(chosen_p.coef_[0]))[:TARGET_FEATURES]
    pz = [int(i) for i in pz if abs(chosen_p.coef_[0][i]) > 1e-8]
    prose_idx = [prose_cols[i] for i in pz]
    prose_keys = [keys[i] for i in prose_idx]
    card_p = LogisticRegression(penalty="l2", C=1e4, max_iter=8000,
                                class_weight="balanced")
    card_p.fit(Xtr[:, prose_idx], ytr)
    res["scorecard_prose_only"] = {
        "n_features": len(prose_keys), "features": prose_keys,
        "weights": [float(w) for w in card_p.coef_[0]],
        "intercept": float(card_p.intercept_[0]),
        "note": "no formatting feature may enter; this is the variant to trust "
                "for prose pasted out of a CMS or a document"}

    # --- 2. full additive and tree ceilings --------------------------------
    lr_full = LogisticRegression(penalty="l2", C=1.0, max_iter=8000,
                                 class_weight="balanced")
    lr_full.fit(Xtr, ytr)
    gbt = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.08,
                                         max_leaf_nodes=31, random_state=0)
    gbt.fit(Xtr, ytr)

    def score(model, rs, idx=None):
        X = apply_scaler(design(rs, keys), sc)
        if idx is not None:
            X = X[:, idx]
        return model.predict_proba(X)[:, 1]

    models = {"scorecard": (card, nz_idx), "scorecard_prose_only": (card_p, prose_idx),
              "lr_full": (lr_full, None), "gbt": (gbt, None)}

    # --- 3. neural scores for the same rows --------------------------------
    neural = {}
    if os.path.exists(NEURAL):
        for line in open(NEURAL):
            d = json.loads(line)
            neural[d["id"]] = d
    res["neural_scored"] = len(neural)

    # --- 4. evaluation -----------------------------------------------------
    evals = {}
    for name, rs in (("fresh_longform", fresh), ("other_heldout", other)):
        if not rs:
            continue
        sides = [r["side"] for r in rs]
        block = {}
        for mname, (m, idx) in models.items():
            block[mname] = operating_curve(score(m, rs, idx), sides)
        if neural:
            have = [r for r in rs if r["id"] in neural]
            block["neural_cycle2"] = operating_curve(
                [neural[r["id"]]["prob_cal"] for r in have],
                [r["side"] for r in have])
            block["neural_cycle2"]["deployed_threshold_0984"] = {
                "tpr": float(np.mean([neural[r["id"]]["prob_cal"] >= 0.984
                                      for r in have if r["side"] == "ai"])),
                "fpr": float(np.mean([neural[r["id"]]["prob_cal"] >= 0.984
                                      for r in have if r["side"] == "human"])),
            }
        evals[name] = block
    # human-only battery: false positives at the fresh-set thresholds
    if battery:
        fb = {}
        for mname, (m, idx) in models.items():
            sf = score(m, fresh, idx)
            ref = sf[[r["side"] == "human" for r in fresh]]
            sb = score(m, battery, idx)
            fb[mname] = {"n_human": len(battery), "fpr_at_budget": {
                "%d%%" % round(b * 100): float((sb >= thr_for_fpr(ref, b)).mean())
                for b in BUDGETS}}
        if neural:
            have = [r for r in battery if r["id"] in neural]
            fb["neural_cycle2"] = {"n_human": len(have), "fpr_at_deployed_0984": float(
                np.mean([neural[r["id"]]["prob_cal"] >= 0.984 for r in have]))}
        evals["human_battery_fpr"] = fb
    res["evaluation"] = evals

    # --- 5. breakdowns on the fresh set ------------------------------------
    def breakdown(rs, field):
        sf_h = None
        out = {}
        groups = defaultdict(list)
        for r in rs:
            if r["side"] == "ai" and r.get(field):
                groups[str(r[field])].append(r)
        humans = [r for r in rs if r["side"] == "human"]
        for mname, (m, idx) in models.items():
            sf_h = score(m, humans, idx)
            for g, grs in groups.items():
                if len(grs) < 25:
                    continue
                sg = score(m, grs, idx)
                d = out.setdefault(g, {"n": len(grs)})
                d[mname] = {"%d%%" % round(b * 100):
                            float((sg >= thr_for_fpr(sf_h, b)).mean())
                            for b in BUDGETS}
        if neural:
            nh = [neural[r["id"]]["prob_cal"] for r in humans if r["id"] in neural]
            for g, grs in groups.items():
                if len(grs) < 25 or g not in out:
                    continue
                sg = [neural[r["id"]]["prob_cal"] for r in grs if r["id"] in neural]
                if sg:
                    out[g]["neural_cycle2"] = {
                        "%d%%" % round(b * 100):
                        float(np.mean(np.array(sg) >= thr_for_fpr(nh, b)))
                        for b in BUDGETS}
        return out

    allheld = fresh + other
    res["breakdowns_fresh"] = {f: breakdown(fresh, f)
                               for f in ("register_family", "provider",
                                         "prompt_style", "model_tier")}
    res["breakdowns_all_heldout"] = {f: breakdown(allheld, f)
                                     for f in ("register_family", "provider",
                                               "prompt_style", "model_tier", "era")}

    # --- 6. how much of the black box do the features explain? -------------
    if neural:
        def nm(rs):
            have = [r for r in rs if r["id"] in neural]
            return have, np.array([neural[r["id"]]["margin"] for r in have])
        tr_h, tr_y = nm(train)
        te_h, te_y = nm(fresh)
        Xa = apply_scaler(design(tr_h, keys), sc)
        Xb = apply_scaler(design(te_h, keys), sc)
        expl = {"n_train": len(tr_y), "n_fresh": len(te_y)}

        # How much of the black box is explainable IN PRINCIPLE. Fitting on the
        # training split and testing on fresh data answers a different and
        # harsher question — whether the explanation transfers across a
        # distribution shift — and returns a negative R^2 because the model's
        # margins are saturated on data it was trained on and are on a different
        # scale on data it was not. Both numbers are reported: the 5-fold
        # within-fresh figure is the explainability result, the transfer figure
        # is the caveat.
        def cv_r2(X, y, model_fn, folds=5):
            n = len(y)
            rs = np.random.RandomState(0)
            idx = rs.permutation(n)
            pred = np.empty(n)
            for f in range(folds):
                te = idx[f::folds]
                tr = np.setdiff1d(idx, te)
                pred[te] = model_fn().fit(X[tr], y[tr]).predict(X[te])
            return (float(1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()),
                    float(np.corrcoef(pred, y)[0, 1]))

        from sklearn.ensemble import HistGradientBoostingRegressor as HGBR
        for label, cols in (("all_features", list(range(len(keys)))),
                            ("scorecard_features", nz_idx),
                            ("prose_only_features", prose_idx)):
            B = Xb[:, cols]
            r2l, rl = cv_r2(B, te_y, lambda: Ridge(alpha=10.0))
            expl.setdefault("within_fresh_5fold", {})[label] = {
                "linear_r2": r2l, "linear_pearson": rl, "n": int(len(te_y))}
            if label == "all_features":
                r2g, rg = cv_r2(B, te_y, lambda: HGBR(max_iter=250, random_state=0))
                expl["within_fresh_5fold"][label]["gbt_r2"] = r2g
                expl["within_fresh_5fold"][label]["gbt_pearson"] = rg
                # and against the calibrated probability the interface shows
                pe = np.array([neural[r["id"]]["prob_cal"] for r in te_h])
                expl["within_fresh_5fold"]["all_features_prob_cal"] = dict(
                    zip(("linear_r2", "linear_pearson"), cv_r2(B, pe, lambda: Ridge(alpha=10.0))))
            # within one side only: strips the part that is just "both track the label"
            for side in ("ai", "human"):
                k = np.array([r["side"] == side for r in te_h])
                if k.sum() > 150:
                    r2s, rs_ = cv_r2(B[k], te_y[k], lambda: Ridge(alpha=10.0))
                    expl.setdefault("within_fresh_" + side, {})[label] = {
                        "linear_r2": r2s, "linear_pearson": rs_, "n": int(k.sum())}
        for label, idx in (("all_features", None), ("scorecard_features", nz_idx)):
            # the transfer caveat, kept for honesty
            A = Xa if idx is None else Xa[:, idx]
            B = Xb if idx is None else Xb[:, idx]
            rg = Ridge(alpha=10.0).fit(A, tr_y)
            for split, Z, yy in (("train", A, tr_y), ("fresh_heldout", B, te_y)):
                pred = rg.predict(Z)
                ss = 1 - ((yy - pred) ** 2).sum() / ((yy - yy.mean()) ** 2).sum()
                expl.setdefault(label, {})[split] = {
                    "r2": float(ss), "n": int(len(yy)),
                    "pearson_r": float(np.corrcoef(pred, yy)[0, 1])}
            # also against the calibrated probability the interface shows
            pt = np.array([neural[r["id"]]["prob_cal"] for r in tr_h])
            pe = np.array([neural[r["id"]]["prob_cal"] for r in te_h])
            rg2 = Ridge(alpha=10.0).fit(A, pt)
            pr = rg2.predict(B)
            expl[label]["fresh_heldout_prob_cal"] = {
                "r2": float(1 - ((pe - pr) ** 2).sum() / ((pe - pe.mean()) ** 2).sum()),
                "pearson_r": float(np.corrcoef(pr, pe)[0, 1]), "n": int(len(pe))}
        g = HGBR(max_iter=300, random_state=0).fit(Xa, tr_y)
        pg = g.predict(Xb)
        expl["all_features"]["gbt_r2_fresh"] = float(
            1 - ((te_y - pg) ** 2).sum() / ((te_y - te_y.mean()) ** 2).sum())
        # rank agreement between the transparent score and the neural verdict
        from scipy import stats as st
        sc_fresh = score(card, te_h, nz_idx)
        expl["scorecard_vs_neural_spearman_fresh"] = float(
            st.spearmanr(sc_fresh, te_y).statistic)
        expl["agreement_at_own_1pc_thresholds"] = None
        res["explainability"] = expl

    # --- 7. save the shippable artefact -----------------------------------
    def artefact(idx, ks, model, note):
        return {
            "features": ks,
            "winsor_lo": [float(sc["lo"][i]) for i in idx],
            "winsor_hi": [float(sc["hi"][i]) for i in idx],
            "median": [float(sc["med"][i]) for i in idx],
            "mean": [float(sc["mu"][i]) for i in idx],
            "sd": [float(sc["sd"][i]) for i in idx],
            "weights": [float(w) for w in model.coef_[0]],
            "intercept": float(model.intercept_[0]),
            "note": note,
        }

    art = {
        "version": "signal-science-scorecard-v1",
        "recommended": "prose_only",
        "recipe": ("clip each raw feature to [winsor_lo, winsor_hi]; z = (x - mean)/sd; "
                   "log_odds = intercept + sum(weight_i * z_i); p = 1/(1+exp(-log_odds))"),
        "feature_definitions": "features.py in this directory; extract() returns them all",
        "trained_on": "cycle-2 training split, %d docs" % len(train),
        "prose_only": artefact(
            prose_idx, prose_keys, card_p,
            "No formatting feature may enter. This is the recommended variant: it "
            "beats the unrestricted card on unseen prose and generalises far better "
            "to an independent human corpus."),
        "unrestricted": artefact(
            nz_idx, sub_keys, card,
            "Formatting features allowed in. Kept for comparison only."),
    }
    json.dump(art, open(os.path.join(RESULTS, "scorecard-model.json"), "w"), indent=1)
    json.dump(res, open(os.path.join(RESULTS, "scorecard-eval.json"), "w"), indent=1)

    # console
    print("\n--- fresh held-out long-form (%d AI / %d human) ---"
          % (sum(1 for r in fresh if r["side"] == "ai"),
             sum(1 for r in fresh if r["side"] == "human")))
    print(f"{'model':22s} {'AUROC':>6s}" + "".join(f"{'@'+b:>8s}" for b in
          ("1%", "2%", "3%", "5%", "9%")))
    for mname in ("scorecard", "lr_full", "gbt", "neural_cycle2"):
        d = evals["fresh_longform"].get(mname)
        if not d:
            continue
        print(f"{mname:22s} {d['auroc']:6.3f}" + "".join(
            f"{d['thresholds'][b]['tpr']*100:7.1f}%" for b in
            ("1%", "2%", "3%", "5%", "9%")))
    print("\nscorecard weights (log-odds per SD, + = more machine-like):")
    order = np.argsort(-np.abs(card.coef_[0]))
    for i in order:
        print(f"  {sub_keys[i]:36s} {card.coef_[0][i]:+7.3f}")
    if "explainability" in res:
        e = res["explainability"]
        wf = e["within_fresh_5fold"]
        print("\nR^2 reconstructing the neural margin (5-fold within fresh held-out):")
        print(f"  all {len(keys)} features, linear:          {wf['all_features']['linear_r2']:.3f}")
        print(f"  all features, gradient boosted:  {wf['all_features']['gbt_r2']:.3f}")
        print(f"  {len(sub_keys)} scorecard features, linear:   "
              f"{wf['scorecard_features']['linear_r2']:.3f}")
        print(f"  {len(prose_keys)} prose-only features, linear:  "
              f"{wf['prose_only_features']['linear_r2']:.3f}")
        print(f"  within AI only:  {e['within_fresh_ai']['all_features']['linear_r2']:.3f}"
              f"   within human only: {e['within_fresh_human']['all_features']['linear_r2']:.3f}")
        print(f"  transfer (fit on train, test on fresh): "
              f"{e['all_features']['fresh_heldout']['r2']:.3f}  <- the caveat")


if __name__ == "__main__":
    sys.exit(main())

"""Tier 2 threshold recalibration + Tier 2/Tier 3 ensemble policy (2026-08-28).

Why: the v1 threshold (0.6788) was calibrated on the small cal split and
drifted to 6.9% FPR on the reserved corpus-test humans, against a 2% target.

Protocol (mirrors eval/final_operating_point.py for Tier 3):
  - Head WEIGHTS are frozen (tier2-head-v1). Only the threshold moves.
    A bias-only refit is a monotone shift of the logit, so it is exactly
    equivalent to a threshold change and is therefore not performed; this is
    recorded in the exported head file.
  - Selection set = 72 corpus-test humans (features already in
    features.jsonl; never trained on) + 20 fresh-cal humans from
    human-corpus-v1.json (same deterministic genre-stratified 20/20 split as
    the Tier 3 workstream: sorted ids, alternating within genre).
  - Rule: lowest threshold with ZERO business-marketing false positives in
    the selection set and selection FPR <= 2% (business-marketing weighted
    hardest, per the audience).
  - Held out and only ever reported: 20 fresh-test humans + 4 quarantined
    eval human controls + the 30 quarantined eval AI samples.
  - Ensemble policy for the Named local signals row: flag if
    tier2_p >= tier2 threshold OR tier3_p >= 0.857 (the shipped Tier 3
    per-channel int8 operating point). Tier 3 per-sample int8 scores are
    reused from eval/final-operating-point.json (same texts, same model).
  - Tier 2 eval-sample probabilities are reused from eval/eval-report.json:
    the head weights are unchanged, so those frozen probabilities remain
    valid; only the flag line moves.

Outputs: models/tier2-head.json (v2), models/ensemble.json,
tier2/fresh-human-scores.json (tier2 probabilities for the 40 fresh humans).
"""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
MODELS = os.path.join(HERE, "..", "models")
EVAL = os.path.join(HERE, "..", "eval")
FRESH_PATH = os.path.join(
    HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v1.json")
EVAL_SAMPLES_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)
MAX_FPR = 0.02
TIER3_THRESHOLD = 0.857
# Guard band above the boundary selection score. Rationale: the browser runs
# the quantised GPT-2 (gpt2-int8-lmfp16.onnx); corpus-int8-delta.json showed
# the first calibration pass flipped exactly the threshold-defining human
# (fp32 0.7463 -> int8 0.7493), and Tier 3 reconciliation measured <=7e-3
# kernel variance between Python onnxruntime and onnxruntime-web WASM on the
# same int8 file. So: select on int8 scores where they exist (corpus test)
# and add 0.01 headroom, rounded to 2 dp.
GUARD_BAND = 0.01


def head_prob(head, feats):
    z = (np.array(feats) - np.array(head["standardise"]["mean"])) / np.array(
        head["standardise"]["std"])
    return float(1.0 / (1.0 + np.exp(-(z @ np.array(head["logistic"]["coef"])
                                       + head["logistic"]["intercept"]))))


def split_fresh(rows):
    by_genre = defaultdict(list)
    for r in sorted(rows, key=lambda r: r["id"]):
        by_genre[r["genre"]].append(r)
    cal, test = [], []
    for genre in sorted(by_genre):
        for i, r in enumerate(by_genre[genre]):
            (cal if i % 2 == 0 else test).append(r)
    return cal, test


def main() -> None:
    head = json.load(open(os.path.join(MODELS, "tier2-head.json")))
    # Idempotent: v2 carries v1's weights unchanged, so either input is fine.
    assert head["version"] in ("tier2-head-v1", "tier2-head-v2"), head["version"]

    # --- corpus test split (features precomputed; humans = selection pool A)
    # Prefer the browser-truth int8 GPT-2 scores for the corpus test split
    # when corpus_int8_check.py has produced them; fp32 features otherwise.
    int8_path = os.path.join(HERE, "corpus-int8-delta.json")
    int8_p = {}
    if os.path.exists(int8_path):
        int8_p = {r["id"]: r["p_int8"]
                  for r in json.load(open(int8_path))["per_sample"]
                  if r["p_int8"] is not None}
        print(f"using int8 GPT-2 scores for {len(int8_p)} corpus-test samples")
    corpus_test_h, corpus_test_ai = [], []
    with open(os.path.join(HERE, "features.jsonl")) as f:
        for ln in f:
            d = json.loads(ln)
            if d["split"] != "test":
                continue
            p = int8_p.get(d["id"], head_prob(head, d["feats"]))
            (corpus_test_ai if d["side"] == "ai" else corpus_test_h).append((d, p))
    assert len(corpus_test_h) == 72, len(corpus_test_h)

    # --- fresh 40 humans: score with GPT-2 (cached if a previous run exists)
    fresh = json.load(open(FRESH_PATH))
    cache_path = os.path.join(HERE, "fresh-human-scores.json")
    if os.path.exists(cache_path):
        cached = json.load(open(cache_path))["scores"]
    else:
        from surprisal_features import SurprisalScorer, extract
        sc = SurprisalScorer()
        cached = {}
        for r in fresh:
            s, rk = sc.score(r["text"])
            feats = extract(s, rk)
            cached[r["id"]] = {
                "p": None if feats is None else head_prob(head, feats),
                "n_scored_tokens": int(s.size),
                "genre": r["genre"],
            }
            print(f"fresh {r['id']} ({r['genre']}): "
                  f"p={cached[r['id']]['p']}", flush=True)
        with open(cache_path, "w") as f:
            json.dump({"head": head["version"], "scores": cached}, f, indent=2)
    fresh_cal, fresh_test = split_fresh(fresh)
    p_fresh_cal = [(r, cached[r["id"]]["p"]) for r in fresh_cal]
    p_fresh_test = [(r, cached[r["id"]]["p"]) for r in fresh_test]
    # inconclusive (<50 tokens) never flags; treat as p=0 for FPR purposes
    val = lambda p: 0.0 if p is None else p

    # --- eval set: frozen tier2 probabilities + tier3 int8 probabilities
    report = json.load(open(os.path.join(EVAL, "eval-report.json")))
    fop = json.load(open(os.path.join(EVAL, "final-operating-point.json")))
    eval_meta = {s["id"]: s for s in json.load(open(EVAL_SAMPLES_PATH))}
    t3p = {r["id"]: r["p_int8"] for r in fop["per_sample_eval"]}
    t3p_fresh = {r["id"]: r["p_int8"] for r in fop["per_sample_fresh"]}
    rows = [
        {
            "id": r["id"], "label": r["label"], "clean": r["clean"],
            "category": eval_meta[r["id"]]["category"],
            "tier2_p": r["tier2_p"], "tier3_p": t3p[r["id"]],
        }
        for r in report["per_sample"]
    ]
    eval_ai = [r for r in rows if r["label"] != "human"]
    eval_clean = [r for r in eval_ai if r["clean"]]
    eval_h = [r for r in rows if r["label"] == "human"]

    # --- threshold sweep, FPR-first, biz weighted hardest
    sel = [p for _, p in corpus_test_h] + [val(p) for _, p in p_fresh_cal]
    sel_biz = [val(p) for r, p in p_fresh_cal if r["genre"] == "business-marketing"]

    def sel_stats(thr):
        fp = sum(p >= thr for p in sel)
        return {
            "threshold": float(round(thr, 6)),
            "sel_fpr_92": round(fp / len(sel), 4),
            "sel_biz_fp": int(sum(p >= thr for p in sel_biz)),
            "fresh_test_fp_20": int(sum(val(p) >= thr for _, p in p_fresh_test)),
            "eval_human_fp_4": int(sum((r["tier2_p"] or 0) >= thr for r in eval_h)),
            "corpus_ai_tpr_54": round(
                sum(p >= thr for _, p in corpus_test_ai) / len(corpus_test_ai), 3),
            "eval_clean_tpr_23": f"{sum((r['tier2_p'] or 0) >= thr for r in eval_clean)}/23",
            "eval_ai_tpr_30": f"{sum((r['tier2_p'] or 0) >= thr for r in eval_ai)}/30",
        }

    candidates = sorted(set(round(p + 1e-6, 6) for p in sel if p > 0))
    base = None
    for t in candidates:
        r = sel_stats(t)
        if r["sel_biz_fp"] == 0 and r["sel_fpr_92"] <= MAX_FPR:
            base = t
            break
    assert base is not None
    chosen = round(base + GUARD_BAND, 2)
    final = sel_stats(chosen)
    assert final["sel_biz_fp"] == 0 and final["sel_fpr_92"] <= MAX_FPR
    print(f"base candidate {base}, guard band {GUARD_BAND} -> threshold {chosen}")
    print("\nTier 2 recalibrated:", final)

    # --- ensemble: tier2 >= chosen OR tier3 >= 0.857
    def ens_flag(p2, p3):
        return (p2 is not None and p2 >= chosen) or p3 >= TIER3_THRESHOLD

    ens_eval = [
        {**r, "tier2_flag": bool((r["tier2_p"] or 0) >= chosen),
         "tier3_flag": bool(r["tier3_p"] >= TIER3_THRESHOLD),
         "ensemble_flag": bool(ens_flag(r["tier2_p"], r["tier3_p"]))}
        for r in rows
    ]
    per_model = defaultdict(lambda: [0, 0])
    for r in ens_eval:
        if r["label"] == "human":
            continue
        per_model[r["label"]][1] += 1
        per_model[r["label"]][0] += r["ensemble_flag"]
    per_model_out = {k: f"{v[0]}/{v[1]}" for k, v in sorted(per_model.items())}

    heldout_h = (
        [("fresh-test", r["id"], val(p), t3p_fresh[r["id"]]) for r, p in p_fresh_test]
        + [("eval", r["id"], r["tier2_p"] or 0, r["tier3_p"]) for r in eval_h]
    )
    heldout_fp = [(pool, i) for pool, i, p2, p3 in heldout_h if ens_flag(p2, p3)]
    ens_clean = sum(r["ensemble_flag"] for r in ens_eval if r["clean"])
    ens_ai = sum(r["ensemble_flag"] for r in ens_eval if r["label"] != "human")
    ens_eval_h_fp = sum(r["ensemble_flag"] for r in ens_eval if r["label"] == "human")
    fresh_test_fp = sum(1 for pool, _ in heldout_fp if pool == "fresh-test")
    # selection-set ensemble FPR (tier3 flags 0 of these humans at 0.857 per
    # final-operating-point.json chosen row; tier2 adds `final` counts)
    sel_ens_fpr = final["sel_fpr_92"]

    summary = {
        "tier2_threshold": chosen,
        "tier3_threshold": TIER3_THRESHOLD,
        "policy": "flag if tier2_p >= tier2_threshold OR tier3_p >= tier3_threshold",
        "eval_clean_tpr": f"{ens_clean}/23",
        "eval_ai_tpr": f"{ens_ai}/30",
        "per_model_eval": per_model_out,
        "heldout_human_fp": {
            "fresh_test_20": fresh_test_fp,
            "eval_controls_4": int(ens_eval_h_fp),
            "combined_24": len(heldout_fp),
            "combined_fpr_24": round(len(heldout_fp) / 24, 4),
            "flagged_ids": [i for _, i in heldout_fp],
        },
        "selection_set_ensemble_fpr_92": sel_ens_fpr,
        "combined_human_fpr_116": round(
            (final["sel_fpr_92"] * 92 + len(heldout_fp)) / 116, 4),
    }
    print("\nENSEMBLE:", json.dumps(summary, indent=2))

    # --- export tier2-head v2
    head_v2 = dict(head)
    head_v2.update({
        "version": "tier2-head-v2",
        "recalibrated": "2026-08-28",
        "recalibration_note": (
            "Weights frozen from tier2-head-v1; threshold recalibrated on 92 "
            "non-quarantined humans (72 corpus-test + 20 fresh-cal, "
            "genre-stratified), lowest threshold with 0 business-marketing FPs "
            "and <=2% selection FPR, selected on the shipping int8 GPT-2 "
            "scores for the corpus split plus a 0.01 guard band for "
            "cross-runtime int8 kernel variance. A bias-only refit is a "
            "monotone logit shift, equivalent to the threshold move, so it "
            "was not applied. Held-out humans (20 fresh-test + 4 eval "
            "controls) reported only."),
        "threshold": chosen,
        "operating_point": "<= 2% FPR on 92 selection humans, 0 business-marketing FPs",
        "corpus_test_metrics": {
            "auroc": head["corpus_test_metrics"]["auroc"],
            "tpr": final["corpus_ai_tpr_54"],
            "fpr": final["sel_fpr_92"],
        },
        "measured": {
            "eval_clean_tpr": final["eval_clean_tpr_23"],
            "eval_ai_tpr": final["eval_ai_tpr_30"],
            "fresh_test_human_fp_20": final["fresh_test_fp_20"],
            "eval_human_fp_4": final["eval_human_fp_4"],
        },
    })
    with open(os.path.join(MODELS, "tier2-head.json"), "w") as f:
        json.dump(head_v2, f, indent=2)

    ensemble = {
        "version": "ensemble-v1",
        "created": "2026-08-28",
        "policy": summary["policy"],
        "tier2": {"file": "tier2-head.json", "version": "tier2-head-v2",
                  "threshold": chosen},
        "tier3": {"file": "tier3-e5small-int8-perchannel.onnx",
                  "config": "tier3-config.json", "threshold": TIER3_THRESHOLD},
        "measured": summary,
        "per_sample_eval": ens_eval,
    }
    with open(os.path.join(MODELS, "ensemble.json"), "w") as f:
        json.dump(ensemble, f, indent=2)
    print("\nwrote models/tier2-head.json (v2) and models/ensemble.json")


if __name__ == "__main__":
    main()

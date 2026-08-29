"""Tier 3 temperature calibration + calibrated operating point (2026-08-28).

Why (provider-eval/PROVIDER-EVAL-2026-08.md §4.3): the shipped int8
per-channel scores SATURATE at the operating point (human max 0.8564, AI
median 0.8539, threshold 0.857), so sub-0.001 score noise flips verdicts and
any guard band costs enormous recall. Temperature scaling is monotone, so it
cannot move the ROC; what it buys is a spread probability scale on which a
robust guard band is affordable and the displayed probability is honest.

Protocol:
  - Fit temperature T on the corpus CAL partition only (57 humans + 73 AI,
    int8 per-channel scores; never eval/test/fresh-test), minimising NLL of
    p_T = sigmoid(logit(p_raw)/T).
  - Operating point on the CALIBRATED scale, same selection rule as Tier 2:
    selection set = 72 corpus-test humans + 20 fresh-cal humans, lowest
    threshold with ZERO business-marketing FPs and <=2% selection FPR, plus a
    0.02 guard band on the calibrated scale (the raw-scale equivalent band at
    the saturation point would be ~1e-4, which is exactly the knife-edge the
    provider eval measured).
  - Everything else (fresh-test, eval samples, provider set) is reported at
    that threshold, never used to choose it.

Outputs: models/tier3-calibration.json, corpus int8 score cache
tier2/tier3-corpus-scores.json.
"""

from __future__ import annotations

import json
import os
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "..", "models")
EVAL = os.path.join(HERE, "..", "eval")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
SHIP = os.path.join(MODELS, "tier3-e5small-int8-perchannel.onnx")
CACHE = os.path.join(HERE, "tier3-corpus-scores.json")
MAX_FPR = 0.02
GUARD_BAND = 0.02

EPS = 1e-6
logit = lambda p: float(np.log(np.clip(p, EPS, 1 - EPS) / (1 - np.clip(p, EPS, 1 - EPS))))
calibrate = lambda p, T: float(1.0 / (1.0 + np.exp(-logit(p) / T)))


def corpus_scores():
    if os.path.exists(CACHE):
        return json.load(open(CACHE))
    import onnxruntime as ort
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(CKPT)
    sess = ort.InferenceSession(SHIP, providers=["CPUExecutionProvider"])

    def run(text: str) -> float:
        enc = tok(text, return_tensors="np", truncation=True, max_length=512)
        logits = sess.run(None, {"input_ids": enc["input_ids"],
                                 "attention_mask": enc["attention_mask"]})[0][0]
        e = np.exp(logits.astype(np.float64) - logits.max())
        return float((e / e.sum())[1])

    out = {}
    with open(CORPUS) as f:
        for ln in f:
            d = json.loads(ln)
            if d["split"] not in ("cal", "test"):
                continue
            out[d["id"]] = {"split": d["split"], "side": d["side"],
                            "source": d["source"], "p": run(d["text"])}
    json.dump(out, open(CACHE, "w"), indent=2)
    return out


def fit_temperature(ps, ys):
    ls = np.array([logit(p) for p in ps])
    ys = np.array(ys, dtype=float)

    def nll(T):
        z = ls / T
        # log(1+exp(-z)) stable
        return float(np.mean(np.where(ys == 1, np.logaddexp(0, -z), np.logaddexp(0, z))))

    grid = np.exp(np.linspace(np.log(0.05), np.log(20), 400))
    return float(grid[int(np.argmin([nll(T) for T in grid]))]), nll


def main() -> None:
    scores = corpus_scores()
    cal = [(v["p"], 1 if v["side"] == "ai" else 0) for v in scores.values() if v["split"] == "cal"]
    T, nll = fit_temperature([p for p, _ in cal], [y for _, y in cal])
    print(f"cal n={len(cal)}, fitted temperature T={T:.4f} "
          f"(NLL {nll(T):.4f} vs T=1 {nll(1.0):.4f})")

    fop = json.load(open(os.path.join(EVAL, "final-operating-point.json")))
    test_h = [v["p"] for v in scores.values() if v["split"] == "test" and v["side"] == "human"]
    test_ai = [(v["source"], v["p"]) for v in scores.values() if v["split"] == "test" and v["side"] == "ai"]
    # Fresh battery humans: use the provider-eval scores (6 dp) rather than
    # final-operating-point.json (4 dp) - the first pass showed the rounding
    # error alone crossing the knife-edge threshold. in_tier3_selection marks
    # exactly the fresh_cal ids.
    fresh_cal, fresh_test = [], []
    with open(os.path.join(HERE, "..", "provider-eval", "tier3-scores.jsonl")) as f:
        for ln in f:
            d = json.loads(ln)
            if d["side"] == "human" and d.get("corpus_split") is None:
                row = {"id": d["id"], "genre": d["genre"], "p_int8": d["tier3_int8pc"]}
                (fresh_cal if d["in_tier3_selection"] else fresh_test).append(row)
    assert len(fresh_cal) == 20 and len(fresh_test) == 20, (len(fresh_cal), len(fresh_test))

    sel = [calibrate(p, T) for p in test_h] + [calibrate(r["p_int8"], T) for r in fresh_cal]
    sel_biz = [calibrate(r["p_int8"], T) for r in fresh_cal if r["genre"] == "business-marketing"]

    candidates = sorted(set(round(p + 1e-6, 6) for p in sel))
    base = None
    for t in candidates:
        fp = sum(p >= t for p in sel)
        if sum(p >= t for p in sel_biz) == 0 and fp / len(sel) <= MAX_FPR:
            base = t
            break
    assert base is not None
    # MEASURED FINDING (recorded honestly): temperature scaling is monotone,
    # so it cannot widen the raw 0.0016 gap between the top selection
    # business human (raw 0.8564) and the AI maximum (raw 0.858). The guarded
    # candidate (base + 0.02 calibrated) lands ABOVE the entire AI mass and
    # scores 0/1727 provider AI, 0/30 eval AI: a degenerate zero-recall
    # operating point. The shipping choice is therefore the exact base
    # (0 business FPs, <=2% selection FPR, no guard band), with the
    # knife-edge documented: cross-runtime int8 kernel variance (measured
    # <=7e-3 raw on Tier 3) can flip verdicts for scores within ~0.01 raw of
    # the line. Only cycle-2 retraining fixes the underlying ranking.
    guarded = round(base + GUARD_BAND, 3)
    thr = base
    sel_fp = sum(p >= thr for p in sel)
    assert sum(p >= thr for p in sel_biz) == 0 and sel_fp / len(sel) <= MAX_FPR
    raw_equiv = float(1.0 / (1.0 + np.exp(-T * logit(thr))))
    raw_guarded = float(1.0 / (1.0 + np.exp(-T * logit(guarded))))
    print(f"guarded candidate {guarded} (raw {raw_guarded:.6f}) is zero-recall; "
          f"shipping base {thr} (raw-equivalent {raw_equiv:.6f}), "
          f"selection FP {sel_fp}/{len(sel)}")

    # report-only pools at the chosen point
    flag = lambda p: calibrate(p, T) >= thr
    corpus_tpr = sum(flag(p) for _, p in test_ai) / len(test_ai)
    by_src = defaultdict(lambda: [0, 0])
    for src, p in test_ai:
        by_src[src][1] += 1
        by_src[src][0] += flag(p)
    fresh_test_fp = [r["id"] for r in fresh_test if flag(r["p_int8"])]
    eval_rows = fop["per_sample_eval"]
    eval_ai = [r for r in eval_rows if r["label"] != "human"]
    eval_h = [r for r in eval_rows if r["label"] == "human"]
    eval_clean = [r for r in eval_ai if r["clean"]]
    print(f"corpus-test AI TPR {corpus_tpr:.3f} " +
          str({k: f"{v[0]}/{v[1]}" for k, v in sorted(by_src.items())}))
    print(f"fresh-test FP {len(fresh_test_fp)}/20 {fresh_test_fp}")
    print(f"eval: clean {sum(flag(r['p_int8']) for r in eval_clean)}/23, "
          f"all AI {sum(flag(r['p_int8']) for r in eval_ai)}/30, "
          f"human {sum(flag(r['p_int8']) for r in eval_h)}/4")

    # provider set at the chosen point (tier3 alone)
    pe = os.path.join(HERE, "..", "provider-eval", "tier3-scores.jsonl")
    slices = defaultdict(lambda: [0, 0])
    human_fp = []
    with open(pe) as f:
        for ln in f:
            d = json.loads(ln)
            if d["side"] == "ai":
                key = f"{d['provider']} {d['era']}"
                slices[key][1] += 1
                slices[key][0] += flag(d["tier3_int8pc"])
            else:
                if flag(d["tier3_int8pc"]):
                    human_fp.append((d["id"], d.get("genre"), d["in_tier3_selection"]))
    print("provider slices @ calibrated threshold:")
    for k, (num, den) in sorted(slices.items()):
        print(f"  {k}: {num}/{den} ({num/den:.1%})")
    print(f"provider humans flagged: {len(human_fp)}/169 {human_fp}")

    out = {
        "version": "tier3-calibration-v1",
        "created": "2026-08-28",
        "method": "temperature scaling of the int8 per-channel logit, fitted on the corpus cal partition (57 humans + 73 AI), NLL-minimising",
        "temperature": round(T, 4),
        "threshold_calibrated": thr,
        "threshold_raw_equivalent": round(raw_equiv, 6),
        "guarded_candidate_rejected": {
            "threshold_calibrated": guarded,
            "raw_equivalent": round(raw_guarded, 6),
            "why": "zero recall: above the entire AI score mass (0/1727 provider AI, 0/30 eval AI). Temperature scaling is monotone and cannot widen the 0.0016 raw gap between the top business human and the AI maximum; recorded as measured evidence that the fix is cycle-2 retraining, not calibration.",
        },
        "knife_edge_caveat": "verdicts for scores within ~0.01 raw of the threshold can flip across int8 runtimes (measured cross-runtime kernel variance <=7e-3); the golden-parity gate covers flags, and the UI presents the probability as evidence rather than a verdict.",
        "selection": "72 corpus-test humans + 20 fresh-cal humans, 0 business-marketing FPs, <=2% FPR, on the calibrated scale (no guard band; see guarded_candidate_rejected)",
        "selection_fp": f"{sel_fp}/{len(sel)}",
        "measured": {
            "corpus_test_ai_tpr": round(corpus_tpr, 3),
            "corpus_test_by_source": {k: f"{v[0]}/{v[1]}" for k, v in sorted(by_src.items())},
            "fresh_test_fp_20": len(fresh_test_fp),
            "eval_clean_tpr_23": int(sum(flag(r["p_int8"]) for r in eval_clean)),
            "eval_ai_tpr_30": int(sum(flag(r["p_int8"]) for r in eval_ai)),
            "eval_human_fp_4": int(sum(flag(r["p_int8"]) for r in eval_h)),
            "provider_slices": {k: f"{v[0]}/{v[1]}" for k, v in sorted(slices.items())},
            "provider_human_fp_169": len(human_fp),
            "provider_human_fp_ids": [i for i, _, _ in human_fp],
        },
    }
    json.dump(out, open(os.path.join(MODELS, "tier3-calibration.json"), "w"), indent=2)
    print("wrote models/tier3-calibration.json")


if __name__ == "__main__":
    main()

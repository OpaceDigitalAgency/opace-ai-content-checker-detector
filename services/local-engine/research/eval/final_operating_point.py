"""Job 2 - final Tier 3 operating point for the website ship, on the int8
numbers the browser will actually run.

Human pools (n=116 total):
  A. 72 corpus test-split humans (reserved; never trained on)
  B. 40 fresh humans (human-corpus-v1.json), split 20 cal / 20 test,
     stratified by genre, deterministic (sorted ids, alternating)
  C. 4 eval-set human controls - QUARANTINED. The plan's rule ("thresholds
     fitted only on disjoint training data") is absolute, so C is NEVER used
     for threshold selection here; it is reported at the chosen threshold
     only. The combined-116 FPR is also reported (reporting is fine, fitting
     is not). This is a deliberate deviation from the instruction to select
     over all 116.

Selection set = A + B_cal (92 humans), FPR-first:
  candidate thresholds are swept; we require zero false positives on the
  business-marketing rows in the selection set (our audience, weighted
  hardest) and combined selection FPR <= 2%, then take the LOWEST such
  threshold (maximising TPR subject to the FPR constraints).

Outputs: candidate table (printed + eval/final-operating-point.json),
updated models/tier3-config.json, models/tier3-golden.json regenerated from
the SHIPPING int8 model.
"""

from __future__ import annotations

import json
import os
from collections import defaultdict

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "..", "models")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
FRESH_PATH = os.path.join(HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v1.json")
EVAL_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)
# set after reconciliation: the variant that ships
SHIP_ONNX = os.environ.get("SHIP_ONNX", os.path.join(MODELS, "tier3-e5small-int8.onnx"))
MAX_FPR = 0.02

from run_eval import CLEAN_IDS  # noqa: E402  (same directory)

GOLDEN_TEXTS_PATH = os.path.join(MODELS, "golden-vectors.json")


def scorer():
    tok = AutoTokenizer.from_pretrained(CKPT)
    sess = ort.InferenceSession(SHIP_ONNX, providers=["CPUExecutionProvider"])

    def run(text: str) -> float:
        enc = tok(text, return_tensors="np", truncation=True, max_length=512)
        logits = sess.run(None, {"input_ids": enc["input_ids"],
                                 "attention_mask": enc["attention_mask"]})[0][0]
        e = np.exp(logits.astype(np.float64) - logits.max())
        return float((e / e.sum())[1])

    return run


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
    run = scorer()

    corpus_test_h, corpus_test_ai = [], []
    with open(CORPUS) as f:
        for ln in f:
            d = json.loads(ln)
            if d["split"] == "test":
                (corpus_test_h if d["side"] == "human" else corpus_test_ai).append(d)
    fresh = json.load(open(FRESH_PATH))
    fresh_cal, fresh_test = split_fresh(fresh)
    evals = json.load(open(EVAL_PATH))

    print("scoring with", os.path.basename(SHIP_ONNX), flush=True)
    p_corpus_h = [run(d["text"]) for d in corpus_test_h]
    p_corpus_ai = [run(d["text"]) for d in corpus_test_ai]
    p_fresh_cal = [run(d["text"]) for d in fresh_cal]
    p_fresh_test = [run(d["text"]) for d in fresh_test]
    p_eval = [(s, run(s["text"])) for s in evals]

    sel_ps = p_corpus_h + p_fresh_cal
    sel_biz = [p for d, p in zip(fresh_cal, p_fresh_cal) if d["genre"] == "business-marketing"]

    eval_ai = [(s, p) for s, p in p_eval if s["label"] != "human"]
    eval_clean = [(s, p) for s, p in eval_ai if s["id"] in CLEAN_IDS]
    eval_h = [(s, p) for s, p in p_eval if s["label"] == "human"]

    def row(thr):
        sel_fp = int(sum(p >= thr for p in sel_ps))
        return {
            "threshold": float(round(thr, 3)),
            "sel_fpr_92": float(round(sel_fp / len(sel_ps), 4)),
            "sel_biz_fp": int(sum(p >= thr for p in sel_biz)),
            "fresh_test_fp_20": int(sum(p >= thr for p in p_fresh_test)),
            "eval_human_fp_4": int(sum(p >= thr for _, p in eval_h)),
            "combined_fpr_116": float(round(
                (sel_fp + sum(p >= thr for p in p_fresh_test)
                 + sum(p >= thr for _, p in eval_h))
                / (len(sel_ps) + len(p_fresh_test) + len(eval_h)), 4)),
            "corpus_ai_tpr_54": float(round(sum(p >= thr for p in p_corpus_ai) / len(p_corpus_ai), 3)),
            "eval_clean_tpr_23": f"{sum(p >= thr for _, p in eval_clean)}/23",
            "eval_ai_tpr_30": f"{sum(p >= thr for _, p in eval_ai)}/30",
        }

    grid = [float(round(t, 3)) for t in np.arange(0.20, 0.96, 0.05)] + [
        0.855, 0.857, 0.86, 0.87, 0.88]
    grid = sorted(set(grid))
    table = [row(t) for t in grid]
    for r in table:
        print(r, flush=True)

    chosen = None
    for t in sorted(grid):
        r = row(t)
        if r["sel_biz_fp"] == 0 and r["sel_fpr_92"] <= MAX_FPR:
            chosen = t
            break
    assert chosen is not None, "no threshold satisfies the FPR constraints"
    final = row(chosen)
    print("\nCHOSEN:", final)

    # persist
    out = {
        "shipping_model": os.path.basename(SHIP_ONNX),
        "selection_set": "72 corpus-test humans + 20 fresh cal humans (genre-stratified); "
                         "eval controls EXCLUDED from selection (quarantine), reported only",
        "rule": "lowest threshold with 0 business-marketing FPs and <=2% FPR on selection set",
        "candidate_table": table,
        "chosen": final,
        "fresh_split": {"cal": [d["id"] for d in fresh_cal], "test": [d["id"] for d in fresh_test]},
        "per_sample_eval": [
            {"id": s["id"], "label": s["label"], "clean": s["id"] in CLEAN_IDS,
             "p_int8": round(p, 4), "flag": p >= chosen} for s, p in p_eval
        ],
        "per_sample_fresh": [
            {"id": d["id"], "genre": d["genre"], "split": sp, "p_int8": round(p, 4),
             "flag": p >= chosen}
            for d, p, sp in
            [(d, p, "cal") for d, p in zip(fresh_cal, p_fresh_cal)]
            + [(d, p, "test") for d, p in zip(fresh_test, p_fresh_test)]
        ],
    }
    with open(os.path.join(HERE, "final-operating-point.json"), "w") as f:
        json.dump(out, f, indent=2)

    cfg_path = os.path.join(MODELS, "tier3-config.json")
    cfg = json.load(open(cfg_path))
    cfg["shipping"] = {
        "model_file": os.path.basename(SHIP_ONNX),
        "threshold": chosen,
        "calibrated": "2026-08-28, int8 scores, 92-human selection set "
                      "(72 corpus-test + 20 fresh cal), 0 biz FPs, <=2% FPR; "
                      "eval controls excluded from selection",
        "shipping_numbers": {
            "eval_clean_tpr": final["eval_clean_tpr_23"],
            "eval_ai_tpr": final["eval_ai_tpr_30"],
            "combined_human_fpr_116": final["combined_fpr_116"],
        },
    }
    with open(cfg_path, "w") as f:
        json.dump(cfg, f, indent=2)

    # tier3 golden vectors from the shipping int8 model
    gtexts = json.load(open(GOLDEN_TEXTS_PATH))["vectors"]
    golden = {
        "model_file": os.path.basename(SHIP_ONNX),
        "preprocessing": "tokenizer=tier3/checkpoint (intfloat/e5-small vocab), "
                         "truncation=512, no padding, no prefix, softmax over 2 logits",
        "threshold": chosen,
        "vectors": {},
    }
    for name, v in gtexts.items():
        p = run(v["text"])
        golden["vectors"][name] = {
            "text": v["text"],
            "p_ai_int8": round(p, 6),
            "flagged": p >= chosen,
        }
        print(f"golden {name}: int8 p={p:.4f}")
    with open(os.path.join(MODELS, "tier3-golden.json"), "w") as f:
        json.dump(golden, f, indent=2)
    print("wrote models/tier3-golden.json, updated models/tier3-config.json")


if __name__ == "__main__":
    main()

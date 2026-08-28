"""THE HONEST MOMENT - evaluate both tiers on the quarantined eval set.

This is the only script permitted to read eval-samples.json, and it only ever
READS it: all weights and thresholds are frozen before this runs (asserted by
checking the exported model files predate no retraining flag - practically, by
the pipeline ordering in the Makefile). Every number is reported; nothing is
cherry-picked.

Reported:
  - TPR on the 23 clean-prose AI samples (the rule engine's 0/23 gap);
  - overall AI detection on all 30 AI samples;
  - FPR on the 4 eval humans AND on the corpus test-split humans (reserved,
    never used in training or calibration);
  - per-sample table.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tier2"))
from surprisal_features import SurprisalScorer, extract  # noqa: E402

EVAL_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)
MODELS = os.path.join(HERE, "..", "models")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")

CLEAN_IDS = {
    "opace-openai-001", "opace-openai-002", "opace-openai-003", "opace-openai-007",
    "opace-openai-009", "claude-explains-debug-2025", "claude-explains-csv-2025",
    "claude3-opus-lesswrong-samin-2024", "claude3-opus-shanahan-transcript-2024",
    "gemini-cerebralfaith-cumulative-case-2025", "gemini-user934-savefamily-2025",
    "grok-share-42", "deepseek-share-pilot-hole", "deepseek-share-kandora-citations",
    "wikipedia-action-for-humanity", "chatgpt-share-ai-democracy",
    "wiki-flagged-wellness-guru", "wiki-flagged-hunterian-professorship",
    "wiki-flagged-torghut-migration", "wiki-flagged-smartphone-free-childhood",
    "wiki-flagged-belarusian-scientists-appeal", "wiki-flagged-amalgamation-house",
    "wiki-flagged-agentive-logic",
}


def tier2_scorer():
    head = json.load(open(os.path.join(MODELS, "tier2-head.json")))
    mu = np.array(head["standardise"]["mean"])
    sd = np.array(head["standardise"]["std"])
    w = np.array(head["logistic"]["coef"])
    b = head["logistic"]["intercept"]
    thr = head["threshold"]
    sc = SurprisalScorer()

    def run(text):
        s, r = sc.score(text)
        feats = extract(s, r)
        if feats is None:
            return None
        z = (np.array(feats) - mu) / sd
        p = 1.0 / (1.0 + np.exp(-(z @ w + b)))
        return float(p)

    return run, thr


def tier3_scorer():
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    cfg = json.load(open(os.path.join(MODELS, "tier3-config.json")))
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).to(device).eval()

    @torch.no_grad()
    def run(text):
        e = tok(text, return_tensors="pt", truncation=True, max_length=cfg["max_len"]).to(device)
        p = torch.softmax(model(**e).logits.float(), -1)[0, 1].item()
        return float(p)

    return run, cfg["threshold"]


def main() -> None:
    samples = json.load(open(EVAL_PATH))
    t2, thr2 = tier2_scorer()
    t3, thr3 = tier3_scorer()

    rows = []
    for s in samples:
        p2 = t2(s["text"])
        p3 = t3(s["text"])
        rows.append(
            {
                "id": s["id"],
                "label": s["label"],
                "clean": s["id"] in CLEAN_IDS,
                "tier2_p": p2,
                "tier2_flag": (p2 is not None and p2 >= thr2),
                "tier3_p": p3,
                "tier3_flag": p3 >= thr3,
            }
        )

    def rates(rows, key):
        ai = [r for r in rows if r["label"] != "human"]
        hum = [r for r in rows if r["label"] == "human"]
        clean = [r for r in ai if r["clean"]]
        return {
            "clean_tpr": f"{sum(r[key] for r in clean)}/{len(clean)}",
            "ai_tpr": f"{sum(r[key] for r in ai)}/{len(ai)}",
            "human_fp": f"{sum(r[key] for r in hum)}/{len(hum)}",
        }

    # reserved corpus-test humans (never trained/calibrated on)
    test_humans = []
    with open(CORPUS) as f:
        for ln in f:
            d = json.loads(ln)
            if d["split"] == "test" and d["side"] == "human":
                test_humans.append(d)
    th2 = [t2(d["text"]) for d in test_humans]
    th3 = [t3(d["text"]) for d in test_humans]
    fp2 = sum(1 for p in th2 if p is not None and p >= thr2)
    fp3 = sum(1 for p in th3 if p >= thr3)

    out = {
        "eval_file": EVAL_PATH,
        "n_samples": len(samples),
        "thresholds": {"tier2": thr2, "tier3": thr3},
        "tier2": rates(rows, "tier2_flag"),
        "tier3": rates(rows, "tier3_flag"),
        "reserved_corpus_test_humans": {
            "n": len(test_humans),
            "tier2_fp": fp2,
            "tier2_fpr": round(fp2 / len(test_humans), 4),
            "tier3_fp": fp3,
            "tier3_fpr": round(fp3 / len(test_humans), 4),
        },
        "rule_engine_baseline": "0/23 clean-prose (REAL-WORLD-EVAL-2026-08.md)",
        "per_sample": rows,
    }
    path = os.path.join(HERE, "eval-report.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)

    print(f"{'id':44s} {'label':12s} clean  t2_p    t2  t3_p    t3")
    for r in rows:
        p2 = "  -  " if r["tier2_p"] is None else f"{r['tier2_p']:.3f}"
        print(f"{r['id']:44s} {r['label']:12s} {str(r['clean']):5s} {p2}  "
              f"{'X' if r['tier2_flag'] else '.'}  {r['tier3_p']:.3f}  "
              f"{'X' if r['tier3_flag'] else '.'}")
    print()
    for k in ("tier2", "tier3"):
        print(k, out[k])
    print("reserved corpus-test humans:", out["reserved_corpus_test_humans"])
    print(f"report -> {path}")


if __name__ == "__main__":
    main()

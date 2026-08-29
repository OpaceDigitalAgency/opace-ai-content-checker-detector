"""Workstream REAL - Tier 2 surprisal head over an arbitrary sample file.

Identical model, features and frozen head weights as
tier2/score_tier2_provider.py (fp32 GPT-2 124M, models/tier2-head.json v2,
threshold 0.76). Only the input/output paths are parameterised, so the raw and
stripped runs are the same code path.

  python score_tier2.py stripped-set.jsonl tier2-stripped.jsonl

Resumable: already-scored ids are skipped.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tier2"))

from surprisal_features import FEATURE_NAMES, SurprisalScorer, extract  # noqa: E402


def main() -> None:
    src = os.path.join(HERE, sys.argv[1])
    dst = os.path.join(HERE, sys.argv[2])
    head = json.load(open(os.path.join(HERE, "..", "models", "tier2-head.json")))
    mu = np.array(head["standardise"]["mean"])
    sd = np.array(head["standardise"]["std"])
    w = np.array(head["logistic"]["coef"])
    b = head["logistic"]["intercept"]

    done = set()
    if os.path.exists(dst):
        with open(dst) as f:
            done = {json.loads(ln)["id"] for ln in f if ln.strip()}

    sc = SurprisalScorer()
    n = 0
    with open(src) as f, open(dst, "a") as out:
        for ln in f:
            d = json.loads(ln)
            if d["id"] in done:
                continue
            s, r = sc.score(d["text"])
            feats = extract(s, r)
            p = None
            if feats is not None:
                z = (np.array(feats) - mu) / sd
                p = float(1.0 / (1.0 + np.exp(-(z @ w + b))))
            out.write(json.dumps({
                "id": d["id"], "provider": d.get("provider"), "era": d.get("era"),
                "side": d["side"], "genre": d.get("genre"),
                "corpus_split": d.get("corpus_split"),
                "in_tier3_selection": d.get("in_tier3_selection", False),
                "p": p, "n_scored": int(s.size),
                "feats": dict(zip(FEATURE_NAMES, feats)) if feats else None,
            }) + "\n")
            n += 1
            if n % 100 == 0:
                out.flush()
                print(f"{n} scored", flush=True)
    print(f"done, {n} new rows -> {dst}")


if __name__ == "__main__":
    main()

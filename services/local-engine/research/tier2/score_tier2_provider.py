"""Score the provider-eval measurement set (provider-eval/eval-set.jsonl,
1,896 samples) with the Tier 2 surprisal head (fp32 GPT-2, frozen v1 weights).
Writes provider-eval/tier2-scores.jsonl: {id, slice, label, p, n_scored}.
Resumable: already-scored ids are skipped on rerun.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
PE = os.path.join(HERE, "..", "provider-eval")
OUT = os.path.join(PE, "tier2-scores.jsonl")

from surprisal_features import SurprisalScorer, extract  # noqa: E402


def main() -> None:
    head = json.load(open(os.path.join(HERE, "..", "models", "tier2-head.json")))
    mu = np.array(head["standardise"]["mean"])
    sd = np.array(head["standardise"]["std"])
    w = np.array(head["logistic"]["coef"])
    b = head["logistic"]["intercept"]
    done = set()
    if os.path.exists(OUT):
        with open(OUT) as f:
            done = {json.loads(ln)["id"] for ln in f if ln.strip()}
    sc = SurprisalScorer()
    n = 0
    with open(os.path.join(PE, "eval-set.jsonl")) as f, open(OUT, "a") as out:
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
            out.write(json.dumps({"id": d["id"], "provider": d.get("provider"),
                                  "era": d.get("era"), "side": d["side"],
                                  "corpus_split": d.get("corpus_split"), "p": p,
                                  "n_scored": int(s.size)}) + "\n")
            n += 1
            if n % 100 == 0:
                out.flush()
                print(f"{n} scored", flush=True)
    print(f"done, {n} new rows -> {OUT}")


if __name__ == "__main__":
    main()

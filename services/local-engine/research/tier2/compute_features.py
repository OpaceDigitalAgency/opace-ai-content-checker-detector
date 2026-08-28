"""Compute Tier 2 surprisal-rhythm features for every corpus document.

Output: tier2/features.jsonl - {id, side, split, source, feats: [22]}.
Eval-set texts are NEVER processed here; they are scored only by eval/run_eval.py.
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from surprisal_features import FEATURE_NAMES, SurprisalScorer, extract  # noqa: E402

CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
OUT = os.path.join(HERE, "features.jsonl")


def main() -> None:
    scorer = SurprisalScorer()
    n_ok = n_skip = 0
    with open(CORPUS) as f, open(OUT, "w") as out:
        for i, ln in enumerate(f):
            d = json.loads(ln)
            s, r = scorer.score(d["text"])
            feats = extract(s, r)
            if feats is None:
                n_skip += 1
                continue
            out.write(
                json.dumps(
                    {
                        "id": d["id"],
                        "side": d["side"],
                        "split": d["split"],
                        "source": d["source"],
                        "feats": feats,
                    }
                )
                + "\n"
            )
            n_ok += 1
            if (i + 1) % 100 == 0:
                print(f"{i + 1} done", flush=True)
    print(f"features for {n_ok} docs ({n_skip} skipped as too short); {len(FEATURE_NAMES)} dims -> {OUT}")


if __name__ == "__main__":
    main()

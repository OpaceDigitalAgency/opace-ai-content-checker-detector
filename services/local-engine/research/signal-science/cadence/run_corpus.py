"""Compute the cadence signals over the 5,558-document fresh long-form corpus
and join them to the shipped fp32 cycle-2 document scores.

Score provenance is checked, not assumed: `corpus-reconciliation-2026-08-29/raw/`
came from the shipped `tier3-cycle2-e5small-fp32.onnx` under segments-v2 at
threshold 0.984, and must reproduce 877/922 detection and 56/4,636 false
positives. `longform-corpus/tier3-scores.jsonl` is the RETIRED cycle-1 model and
is never read here.
"""

from __future__ import annotations

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cadence  # noqa: E402

R = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
     "ai-watermark-and-content-authenticity/implementation/services/local-engine/research")
CORPUS = os.path.join(R, "longform-corpus")
SCORES = os.path.join(R, "corpus-reconciliation-2026-08-29", "raw")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cadence-features.jsonl")
THRESHOLD = 0.984

KEEP = ("id", "side", "register", "provider", "model", "prompt_style",
        "word_count", "source")


def load_scores(path):
    return {r["id"]: r for r in map(json.loads, open(path))}


def main():
    t0 = time.time()
    scores = {}
    scores.update(load_scores(os.path.join(SCORES, "lf-ai.jsonl")))
    scores.update(load_scores(os.path.join(SCORES, "lf-hu.jsonl")))

    det = sum(1 for r in scores.values()
              if r["side"] == "ai" and r["p_max"] >= THRESHOLD)
    fp = sum(1 for r in scores.values()
             if r["side"] == "human" and r["p_max"] >= THRESHOLD)
    n_ai = sum(1 for r in scores.values() if r["side"] == "ai")
    n_hu = sum(1 for r in scores.values() if r["side"] == "human")
    print(f"score provenance check: detection {det}/{n_ai}, "
          f"human false positives {fp}/{n_hu}", flush=True)
    assert (det, n_ai, fp, n_hu) == (877, 922, 56, 4636), \
        "reused scores do not reproduce the published cycle-2 figures"

    n = 0
    with open(OUT, "w") as fo:
        for name in ("ai-longform.jsonl", "human-longform.jsonl"):
            for line in open(os.path.join(CORPUS, name)):
                r = json.loads(line)
                s = scores.get(r["id"])
                if s is None:
                    continue
                f = cadence.compute(r["text"])
                f.pop("roles", None)
                f.pop("shapes", None)
                rec = {k: r[k] for k in KEEP if k in r}
                rec["p_max"] = s["p_max"]
                rec["n_seg"] = s["n_seg"]
                rec.update(f)
                fo.write(json.dumps(rec) + "\n")
                n += 1
                if n % 1000 == 0:
                    print(f"{n} docs {time.time() - t0:.0f}s", flush=True)
    print(f"DONE {n} documents {time.time() - t0:.0f}s -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

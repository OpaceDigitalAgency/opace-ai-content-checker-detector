"""Refresh matched-eval-ai.jsonl from the LIVE matched.jsonl after training.

Training froze frozen-matched.snapshot.jsonl; rows generated after the freeze
are usable for evaluation IF AND ONLY IF they are eval_only (gemini family or
held-out topic bucket) — those were never trainable, so a later, larger eval
slice stays clean. Non-eval rows generated after the freeze are NOT trained
on and NOT evaluated (they are same-topic siblings of trained rows: neither
clean nor used).

Safety: re-derives the held-out rule per row, and asserts no eval row's text
appears in the cycle-5 train/cal splits.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
LIVE = os.path.join(RESEARCH, "human-structured-corpus-2026-08-31",
                    "matched-generation", "matched.jsonl")
sys.path.insert(0, HERE)
from prepare_data import slug, is_heldout_topic  # noqa: E402


def main():
    train_sha = set()
    for l in open(os.path.join(HERE, "dataset.jsonl")):
        r = json.loads(l)
        if r["split"] in ("train", "cal"):
            train_sha.add(hashlib.sha256(
                " ".join(r["text"].split()).lower().encode()).hexdigest())
    out, n_all, n_skip = [], 0, 0
    for l in open(LIVE):
        r = json.loads(l)
        n_all += 1
        topic = (r.get("brief") or {}).get("topic") or ""
        heldout = (r.get("model_family") == "google") or is_heldout_topic(topic)
        if bool(r.get("eval_only")) != heldout:
            raise RuntimeError(f"eval_only mismatch on {r['id']}")
        if not heldout:
            n_skip += 1
            continue
        h = hashlib.sha256(" ".join(r["text"].split()).lower().encode()).hexdigest()
        assert h not in train_sha, f"eval row {r['id']} text found in train/cal!"
        r["heldout_reason"] = ("model-family" if r.get("model_family") == "google"
                               else "topic-bucket")
        if r.get("model_family") == "google" and is_heldout_topic(topic):
            r["heldout_reason"] = "family+topic-bucket"
        out.append(r)
    with open(os.path.join(HERE, "matched-eval-ai.jsonl"), "w") as fh:
        for r in out:
            fh.write(json.dumps(r) + "\n")
    print(f"live rows {n_all}; eval slice {len(out)} "
          f"(non-eval skipped {n_skip}); no train/cal text collision")
    import collections
    print(dict(collections.Counter(r["heldout_reason"] for r in out)))
    print(dict(collections.Counter(r["model_family"] for r in out)))


if __name__ == "__main__":
    main()

"""Baseline: score the whole cycle-2 corpus with the SHIPPED Tier 3 model.

Adapted from ../provider-eval/score_tier3.py (read-only there; nothing in the
engine or the models directory is written by this script). Same artefact, same
tokeniser, same max_len, same shipping threshold 0.857 from
models/tier3-config.json - so the numbers are directly comparable with the
provider evaluation, and this is the "before" picture the cycle-2 retrain will
be measured against.
"""

from __future__ import annotations

import json
import os
import time

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
MODEL = os.path.join(RESEARCH, "models", "tier3-e5small-int8-perchannel.onnx")
CKPT = os.path.join(RESEARCH, "tier3", "checkpoint")
THRESHOLD = 0.857

tok = AutoTokenizer.from_pretrained(CKPT)
opts = ort.SessionOptions()
opts.intra_op_num_threads = max(4, os.cpu_count() or 4)
sess = ort.InferenceSession(MODEL, opts, providers=["CPUExecutionProvider"])
in_names = [i.name for i in sess.get_inputs()]


def score_batch(texts: list[str]) -> list[float]:
    enc = tok(texts, truncation=True, max_length=512, padding=True, return_tensors="np")
    feed = {n: enc[n].astype(np.int64) for n in in_names if n in enc}
    logits = sess.run(None, feed)[0]
    e = np.exp(logits - logits.max(axis=1, keepdims=True))
    return (e[:, 1] / e.sum(axis=1)).tolist()


def main() -> None:
    """Appends as it goes and resumes on restart.

    The first attempt at this ran for 48 minutes on a box at load average 100,
    was killed near the end, and lost everything. Scores are now flushed per
    batch and already-scored ids are skipped, so a kill costs one batch.
    """
    out_path = os.path.join(HERE, "tier3-baseline.jsonl")
    done: set[str] = set()
    if os.path.exists(out_path):
        with open(out_path) as f:
            for line in f:
                try:
                    done.add(json.loads(line)["id"])
                except (json.JSONDecodeError, KeyError):
                    pass  # truncated final line from an earlier kill
        print(f"resuming: {len(done)} already scored", flush=True)

    rows = [json.loads(l) for l in open(os.path.join(HERE, "corpus.jsonl"))]
    todo = [d for d in rows if d["id"] not in done]
    print(f"{len(todo)} of {len(rows)} to score", flush=True)

    t0, B, n = time.time(), 16, 0
    with open(out_path, "a") as out:
        for i in range(0, len(todo), B):
            chunk = todo[i : i + B]
            for d, p in zip(chunk, score_batch([d["text"] for d in chunk])):
                out.write(json.dumps({
                    "id": d["id"], "side": d["side"], "register": d["register"],
                    "provider": d["provider"], "model": d["model"], "era": d["era"],
                    "genre": d["genre"], "edit_level": d.get("edit_level"),
                    "split": d["split"], "source": d["source"], "words": d["words"],
                    "tier3_int8pc": round(p, 6), "flagged_0857": p >= THRESHOLD,
                }) + "\n")
                n += 1
            out.flush()
            os.fsync(out.fileno())
            if (i // B) % 25 == 0:
                rate = n / max(time.time() - t0, 1e-6)
                print(f"tier3 {n}/{len(todo)}  {time.time()-t0:.0f}s  "
                      f"eta {(len(todo)-n)/max(rate,1e-6):.0f}s", flush=True)
    print(f"done {n} newly scored in {time.time()-t0:.0f}s "
          f"({len(done)+n}/{len(rows)} total)", flush=True)


if __name__ == "__main__":
    main()

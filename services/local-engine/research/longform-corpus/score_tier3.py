"""Baseline pass: score human-longform.jsonl and ai-longform.jsonl with the
SHIPPED Tier 3 model. Adapted from ../provider-eval/score_tier3.py, which is
read-only from here; same model file, same tokenizer, same 512-token window,
same 0.857 shipping threshold.
"""

from __future__ import annotations

import json
import os
import time

# ORT and OpenMP both default to one thread per core, which on a loaded machine
# collides badly: an unbounded run took 48 minutes to score 250 documents and
# four threads scores 50 in 1.9 seconds. Cap both.
os.environ.setdefault("OMP_NUM_THREADS", "4")

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "..", "models", "tier3-e5small-int8-perchannel.onnx")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
THRESHOLD = 0.857
OUT = os.path.join(HERE, "tier3-scores.jsonl")

tok = AutoTokenizer.from_pretrained(CKPT)
opts = ort.SessionOptions()
opts.intra_op_num_threads = 4
sess = ort.InferenceSession(MODEL, opts, providers=["CPUExecutionProvider"])
in_names = [i.name for i in sess.get_inputs()]


def score(text: str) -> float:
    enc = tok(text, truncation=True, max_length=512, return_tensors="np")
    feed = {n: enc[n].astype(np.int64) for n in in_names if n in enc}
    logits = sess.run(None, feed)[0][0]
    e = np.exp(logits - logits.max())
    return float((e / e.sum())[1])


def main():
    rows = []
    for fn in ("human-longform.jsonl", "ai-longform.jsonl"):
        p = os.path.join(HERE, fn)
        if os.path.exists(p):
            rows += [json.loads(l) for l in open(p) if l.strip()]
    print(f"{len(rows)} documents to score", flush=True)
    out, t0 = [], time.time()
    for i, d in enumerate(rows, 1):
        p = score(d["text"])
        out.append({
            "id": d["id"], "side": d["side"], "register": d["register"],
            "provider": d["provider"], "model": d["model"], "tier": d["tier"],
            "prompt_style": d.get("prompt_style"), "source": d["source"],
            "word_count": d["word_count"], "era_year": d.get("era_year"),
            "tier3_int8pc": round(p, 6), "flagged_0857": p >= THRESHOLD,
        })
        if i % 250 == 0:
            print(f"  {i}/{len(rows)}  {time.time()-t0:.0f}s", flush=True)
    with open(OUT, "w") as f:
        for r in out:
            f.write(json.dumps(r) + "\n")
    print(f"done {len(out)} in {time.time()-t0:.0f}s -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

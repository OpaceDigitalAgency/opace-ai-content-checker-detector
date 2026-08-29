"""Workstream REAL - Tier 3 classifier over an arbitrary sample file.

Identical model and settings to provider-eval/score_tier3.py: the SHIPPED
tier3-e5small.onnx, tokenizer from tier3/checkpoint,
max_len 512, softmax over 2 logits, shipped flag threshold 0.857. Only the
paths are parameterised, so the raw and stripped runs share one code path.

  python score_tier3.py stripped-set.jsonl tier3-stripped.jsonl
"""

from __future__ import annotations

import json
import os
import sys
import time

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "..", "models", "tier3-e5small.onnx")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")
THRESHOLD = 0.857

tok = AutoTokenizer.from_pretrained(CKPT)
opts = ort.SessionOptions()
opts.intra_op_num_threads = max(4, os.cpu_count() or 4)
sess = ort.InferenceSession(MODEL, opts, providers=["CPUExecutionProvider"])
in_names = [i.name for i in sess.get_inputs()]


def score(text: str) -> float:
    enc = tok(text, truncation=True, max_length=512, return_tensors="np")
    feed = {n: enc[n].astype(np.int64) for n in in_names if n in enc}
    logits = sess.run(None, feed)[0][0]
    e = np.exp(logits - logits.max())
    return float((e / e.sum())[1])


def main() -> None:
    src = os.path.join(HERE, sys.argv[1])
    dst = os.path.join(HERE, sys.argv[2])
    rows = [json.loads(ln) for ln in open(src)]
    out = []
    t0 = time.time()
    for i, d in enumerate(rows, 1):
        p = score(d["text"])
        out.append({"id": d["id"], "provider": d.get("provider"), "era": d.get("era"),
                    "model": d.get("model"), "side": d["side"],
                    "corpus_split": d.get("corpus_split"),
                    "in_tier3_selection": d.get("in_tier3_selection", False),
                    "genre": d.get("genre"),
                    "tier3_fp32": round(p, 8), "flagged_0857": p >= THRESHOLD})
        if i % 200 == 0:
            print(f"tier3 {i}/{len(rows)}  {time.time()-t0:.0f}s", flush=True)
    with open(dst, "w") as f:
        for r in out:
            f.write(json.dumps(r) + "\n")
    print(f"done {len(out)} in {time.time()-t0:.0f}s -> {dst}", flush=True)


if __name__ == "__main__":
    main()

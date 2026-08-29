"""Score generated.jsonl with the SHIPPED Tier 3 model.

Adapted from provider-eval/score_tier3.py (read-only use of the model and
tokenizer): tier3-e5small-int8-perchannel.onnx, tokenizer from tier3/checkpoint,
max_len 512, no prefix, softmax over 2 logits.

Reported at the three brief thresholds (0.8533 / 0.8397 / 0.6256) plus the
shipped 0.857 so the numbers stay comparable with provider-eval/analysis.json.
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
MODEL = os.path.join(HERE, "..", "models", "tier3-e5small-int8-perchannel.onnx")
CKPT = os.path.join(HERE, "..", "tier3", "checkpoint")

THRESHOLDS = {"t_8533": 0.8533, "t_8397": 0.8397, "t_6256": 0.6256, "t_857": 0.857}

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


in_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "generated.jsonl")
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "tier3-scores.jsonl")

rows = []
for line in open(in_path):
    d = json.loads(line)
    if d.get("__error__") or not d.get("text") or d.get("usable") is False:
        continue
    rows.append(d)

out = []
t0 = time.time()
for i, d in enumerate(rows, 1):
    p = score(d["text"])
    rec = {
        "id": d["id"],
        "provider": d["provider"],
        "era": d["era"],
        "model": d.get("model_requested") or d["model"],
        "model_tier": d.get("model_tier"),
        "tier": d.get("tier"),
        "register_family": d.get("register_family"),
        "length_band": d.get("length_band"),
        "side": d["side"],
        "genre": d.get("genre"),
        "register": d.get("register"),
        "prompt_style": d.get("prompt_style"),
        "temperature": d.get("temperature"),
        "words": d.get("words"),
        "tier3_int8pc": round(p, 6),
    }
    for name, thr in THRESHOLDS.items():
        rec[f"flagged_{name}"] = p >= thr
    out.append(rec)
    if i % 200 == 0:
        print(f"tier3 {i}/{len(rows)}  {time.time()-t0:.0f}s", flush=True)

with open(out_path, "w") as f:
    for r in out:
        f.write(json.dumps(r) + "\n")
print(f"done {len(out)} in {time.time()-t0:.0f}s -> {out_path}", flush=True)

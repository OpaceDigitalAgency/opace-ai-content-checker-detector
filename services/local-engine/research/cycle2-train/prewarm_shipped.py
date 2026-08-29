"""Pre-compute the shipped model's scores into eval.py's cache.

Pure critical-path work: the shipped baseline does not depend on the cycle-2
checkpoint, so it can be scored while training is still running on the GPU.
eval.py reads the same cache file and skips anything already present.
"""
from __future__ import annotations
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from score_lib import OnnxScorer

CACHE = os.path.join(HERE, "scores-cache.json")
ONNX = os.path.join(RESEARCH, "models", "tier3-e5small-int8-perchannel.onnx")
TOK = os.path.join(RESEARCH, "tier3", "checkpoint")

rows = [json.loads(l) for l in open(os.path.join(HERE, "dataset.jsonl"))]
groups = {
    "shipped:test": [r for r in rows if r["split"] == "test" and not r.get("eval_only")],
    "shipped:cal": [r for r in rows if r["split"] == "cal"],
    "shipped:creative": [r for r in rows if r["split"] == "test" and r.get("eval_only")],
}
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
sc = OnnxScorer(ONNX, TOK, "shipped-prewarm")
for name, rs in groups.items():
    if name in cache and len(cache[name]) == len(rs):
        print(f"{name}: cached"); continue
    print(f"{name}: scoring {len(rs)}", flush=True)
    cache[name] = sc.logits([r["text"] for r in rs]).tolist()
    json.dump(cache, open(CACHE, "w"))
print("prewarm done")

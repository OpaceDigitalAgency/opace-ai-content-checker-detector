"""Release-note check (SPEC section 6): score the full corpus TEST split with
the shipping quantised GPT-2 (gpt2-int8-lmfp16.onnx) and compare Tier 2 head
probabilities and flags against the fp32 features in features.jsonl, at the
tier2-head-v2 threshold. Writes corpus-int8-delta.json."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import export_gpt2_onnx as e
from surprisal_features import extract

head = json.load(open("../models/tier2-head.json"))
mu = np.array(head["standardise"]["mean"]); sd = np.array(head["standardise"]["std"])
w = np.array(head["logistic"]["coef"]); b = head["logistic"]["intercept"]
thr = head["threshold"]
prob = lambda f: float(1/(1+np.exp(-(((np.array(f)-mu)/sd) @ w + b))))
corpus = {json.loads(ln)["id"]: json.loads(ln) for ln in open("../corpus/corpus.jsonl")}
score = e.onnx_scorer(e.SHIP_PATH)
rows, deltas, flips = [], [], 0
for ln in open("features.jsonl"):
    d = json.loads(ln)
    if d["split"] != "test": continue
    p32 = prob(d["feats"])
    s, r = score(corpus[d["id"]]["text"])
    feats = extract(s, r)
    p8 = prob(feats) if feats is not None else None
    delta = abs(p8-p32) if p8 is not None else None
    flip = (p8 is not None) and ((p8 >= thr) != (p32 >= thr))
    flips += flip; deltas.append(delta)
    rows.append({"id": d["id"], "side": d["side"], "p_fp32": round(p32,4),
                 "p_int8": None if p8 is None else round(p8,4),
                 "delta": None if delta is None else round(delta,4), "flip": bool(flip)})
    print(d["id"], rows[-1]["p_fp32"], rows[-1]["p_int8"], "FLIP" if flip else "", flush=True)
out = {"model": "gpt2-int8-lmfp16.onnx", "threshold": thr, "n": len(rows),
       "max_abs_delta": round(max(x for x in deltas if x is not None),4),
       "mean_abs_delta": round(float(np.mean([x for x in deltas if x is not None])),4),
       "verdict_flips": flips, "per_sample": rows}
json.dump(out, open("corpus-int8-delta.json","w"), indent=2)
print("SUMMARY", {k:v for k,v in out.items() if k!="per_sample"})

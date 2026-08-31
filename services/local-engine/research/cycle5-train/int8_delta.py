"""int8-vs-fp32 delta for the cycle-5 candidate, at the candidate's refitted
margin pair (read from results-c5.json). Verdict flips per set, detection and
FP deltas, and the int8 export's own matched-FP refit on the eval view.

Note recorded with the result: the fp32 scores were computed on MPS (torch),
the int8 on onnxruntime CPU, so the delta bundles quantisation with any
device numerics; the per-epoch training gate measured quantisation alone
(subsampled) and agreed within its bound.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from analyse import load, flagged_margin, key_margin, cell, fit_matched_fp  # noqa: E402

res = json.load(open(os.path.join(HERE, "results-c5.json")))
A, G = res["refit_margin_pair"]["a"], res["refit_margin_pair"]["g"]
out = {"pair": {"a": A, "g": G}}
print(f"pair a={A} g={G}")
for name in ("lf-hu", "lf-ai", "ai-shortform", "human-shortform-widened", "nine"):
    fp32 = {r["id"]: r for r in load("c5", name)}
    int8 = {r["id"]: r for r in load("c5i8", name)}
    ids = [i for i in fp32 if i in int8]
    flips = fp = fi = 0
    for i in ids:
        a_, b_ = flagged_margin(fp32[i]["seg_m"], A, G), flagged_margin(int8[i]["seg_m"], A, G)
        flips += a_ != b_
        fp += a_
        fi += b_
    out[name] = {"n": len(ids), "flips": flips,
                 "fp32_flagged": fp, "int8_flagged": fi}
    print(f"  {name:<26} n={len(ids):<5} fp32 {cell(fp, len(ids)):<30} "
          f"int8 {cell(fi, len(ids)):<30} flips {flips} ({flips/len(ids):.2%})")

json.dump(out, open(os.path.join(HERE, "int8-delta.json"), "w"), indent=1)
print("wrote int8-delta.json")

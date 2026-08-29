"""Generate the browser-runtime Tier 2 golden file: GPT-2 BPE input_ids,
fp32 reference features (from models/golden-vectors.json), and int8 reference
probabilities from the SHIPPING gpt2-int8-lmfp16.onnx. Also exports the GPT-2
tokenizer files (vocab.json, merges.txt)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import export_gpt2_onnx as e
from surprisal_features import extract, MAX_TOKENS
from transformers import GPT2TokenizerFast

head = json.load(open("../models/tier2-head.json"))
golden = json.load(open("../models/golden-vectors.json"))
mu = np.array(head["standardise"]["mean"]); sd = np.array(head["standardise"]["std"])
w = np.array(head["logistic"]["coef"]); b = head["logistic"]["intercept"]
tok = GPT2TokenizerFast.from_pretrained("gpt2")
os.makedirs("../models/gpt2-tokenizer", exist_ok=True)
tok.save_vocabulary("../models/gpt2-tokenizer")
score = e.onnx_scorer(e.SHIP_PATH)
out = {"model_file": "gpt2-int8-lmfp16.onnx", "threshold": head["threshold"],
       "head_version": head["version"], "feature_names": golden["feature_names"],
       "texts": {}}
for name, v in golden["vectors"].items():
    ids = tok(v["text"], truncation=True, max_length=MAX_TOKENS)["input_ids"]
    s, r = score(v["text"])
    feats = extract(s, r)
    z = (np.array(feats)-mu)/sd
    p8 = float(1/(1+np.exp(-(z@w+b))))
    out["texts"][name] = {
        "text": v["text"], "input_ids": ids,
        "features_fp32": v["features"],
        "head_probability_fp32": v["head_probability"],
        "features_int8": {k: round(float(x),6) for k,x in zip(golden["feature_names"], feats)},
        "surprisal_first10_int8": [round(float(x),6) for x in s[:10]],
        "p_int8": round(p8,6),
        "flagged": bool(p8 >= head["threshold"]),
    }
    print(name, "p_int8", round(p8,6))
json.dump(out, open("../models/tier2-golden-browser.json","w"), indent=2)
print("wrote ../models/tier2-golden-browser.json and gpt2-tokenizer/")

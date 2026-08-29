"""The decision-relevant quantisation gate: does int8 change the VERDICT?

Mean absolute probability drift is the wrong bar for a model whose scores are
spread across the middle by design. What matters is whether a document's verdict
flips at the operating threshold. Measured on held-out fresh long-form.
"""
import json, os
import numpy as np, torch, onnxruntime as ort
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import spearmanr
import common3 as C

CKPT = os.path.join(C.HERE, "cycle3b-checkpoint")
INT8 = os.path.join(C.MODELS, "tier3-cycle3-e5small-int8-perchannel.onnx")
N_H, N_A = 1500, 922

def main():
    rows = [r for r in C.jsonl(os.path.join(C.HERE, "evalsets.jsonl")) if r["set"] == "fresh"]
    hu = [r for r in rows if r["side"] == "human"][:N_H]
    ai = [r for r in rows if r["side"] == "ai"][:N_A]
    rows = hu + ai
    tok = AutoTokenizer.from_pretrained(CKPT)
    model = AutoModelForSequenceClassification.from_pretrained(CKPT).eval()
    sess = ort.InferenceSession(INT8, providers=["CPUExecutionProvider"])
    mt, mo = [], []
    with torch.no_grad():
        for i in range(0, len(rows), 16):
            ch = [r["text"] for r in rows[i:i+16]]
            e = tok(ch, truncation=True, max_length=512, padding="max_length", return_tensors="pt")
            lt = model(input_ids=e.input_ids, attention_mask=e.attention_mask).logits.numpy()
            lo = sess.run(None, {"input_ids": e.input_ids.numpy().astype(np.int64),
                                 "attention_mask": e.attention_mask.numpy().astype(np.int64)})[0]
            mt.append(lt[:,1]-lt[:,0]); mo.append(lo[:,1]-lo[:,0])
            if i % 320 == 0: print(i, flush=True)
    mt, mo = np.concatenate(mt), np.concatenate(mo)
    is_h = np.array([r["side"] == "human" for r in rows])
    out = {"n": len(rows), "n_human": int(is_h.sum()),
           "spearman_margin": round(float(spearmanr(mt, mo).statistic), 5)}
    for b in (0.0122, 0.02):
        def thr(m):
            h = np.sort(m[is_h]); return float(h[min(int(np.ceil(len(h)*(1-b))), len(h)-1)])
        tt, to = thr(mt), thr(mo)
        vt, vo = mt > tt, mo > to
        out[f"budget_{b}"] = {
            "verdict_flips_at_own_threshold": int((vt != vo).sum()),
            "flip_rate": round(float((vt != vo).mean()), 4),
            "ai_recall_fp32": round(float(vt[~is_h].mean()), 4),
            "ai_recall_int8": round(float(vo[~is_h].mean()), 4),
            "human_fpr_fp32": round(float(vt[is_h].mean()), 4),
            "human_fpr_int8": round(float(vo[is_h].mean()), 4)}
    json.dump(out, open(os.path.join(C.HERE, "quant-check3.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Score the WIDENED human short-form corpus with the currently deployed model.
Reports false positives by source and by length band.

Runtime: fp32 ONNX (server), deployed segmentation + calibration, threshold 0.9845.
"""
import os, sys, json, collections, statistics
RS = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
      "ai-watermark-and-content-authenticity/implementation/services/local-engine/research")
sys.path.insert(0, os.path.join(RS, "model-shrink/reference-server"))
import numpy as np, onnxruntime as ort
from transformers import AutoTokenizer
import segments as seg

FP32 = os.path.join(RS, "models/tier3-cycle2-e5small-fp32.onnx")
TOK = os.path.join(RS, "cycle2-train/cycle2-checkpoint")
TEMPERATURE, PRIMARY = 0.8324, 0.9845
HERE = os.path.dirname(os.path.abspath(__file__))

def wilson(k,n):
    if n==0: return (0.,0.)
    p,z=k/n,1.96; d=1+z*z/n
    c=(p+z*z/(2*n))/d; h=z*((p*(1-p)/n+z*z/(4*n*n))**.5)/d
    return (max(0.,c-h)*100, min(1.,c+h)*100)

def main():
    rows=[json.loads(l) for l in open(os.path.join(HERE,"human-shortform-widened.jsonl"))]
    tok=AutoTokenizer.from_pretrained(TOK)
    so=ort.SessionOptions(); so.intra_op_num_threads=max(4,(os.cpu_count() or 4)//2)
    sess=ort.InferenceSession(FP32,so,providers=["CPUExecutionProvider"])
    names=[i.name for i in sess.get_inputs()]
    ct=lambda ts:[len(x) for x in tok(list(ts),add_special_tokens=False)["input_ids"]]
    def score(ts):
        ps=[]
        for i in range(0,len(ts),16):
            enc=tok(ts[i:i+16],truncation=True,max_length=512,padding=True,return_tensors="np")
            feed={n:enc[n].astype(np.int64) for n in names if n in enc}
            lg=sess.run(None,feed)[0]; m=lg[:,1]-lg[:,0]
            ps.extend((1.0/(1.0+np.exp(-m/TEMPERATURE))).tolist())
        return ps
    out=[]
    for k,r in enumerate(rows):
        segs=seg.segment_text(r["text"],ct)
        p=max(score([s.text for s in segs]))
        out.append({**{x:r.get(x) for x in ("id","source","register","target_len",
                    "word_count","group","cut_on","era_year")},
                    "probability_ai":p,"flagged":bool(p>=PRIMARY)})
        if k%400==0: print(f"  {k}/{len(rows)}",flush=True)
    with open(os.path.join(HERE,"widened-scores.jsonl"),"w") as fh:
        for r in out: fh.write(json.dumps(r)+"\n")
    n=len(out); f=sum(r["flagged"] for r in out); lo,hi=wilson(f,n)
    print(f"\nfp32 server runtime, deployed segmentation + calibration, threshold {PRIMARY}")
    print(f"WIDENED human short-form: {f}/{n} flagged = {100*f/n:.2f}%  CI [{lo:.2f}, {hi:.2f}]\n")
    print(f"{'source':28s} {'n':>5} {'FP':>4} {'rate':>7} {'95% CI':>16} {'med p':>8}")
    for s,c in collections.Counter(r["source"] for r in out).most_common():
        sub=[r for r in out if r["source"]==s]; d=sum(r["flagged"] for r in sub)
        a,b=wilson(d,len(sub))
        print(f"{s:28s} {len(sub):5d} {d:4d} {100*d/len(sub):6.2f}% "
              f"[{a:5.2f},{b:6.2f}] {statistics.median(x['probability_ai'] for x in sub):8.4f}")
    print(f"\n{'band':>6} {'n':>5} {'FP':>4} {'rate':>7} {'95% CI':>16}")
    for t in (100,300,400,600):
        sub=[r for r in out if r["target_len"]==t]; d=sum(r["flagged"] for r in sub)
        a,b=wilson(d,len(sub))
        print(f"{t:>6} {len(sub):5d} {d:4d} {100*d/len(sub):6.2f}% [{a:5.2f},{b:6.2f}]")
    print("\nsource x band false positives:")
    for s,_ in collections.Counter(r["source"] for r in out).most_common():
        cells=[]
        for t in (100,300,400,600):
            sub=[r for r in out if r["source"]==s and r["target_len"]==t]
            d=sum(r["flagged"] for r in sub)
            cells.append(f"{d}/{len(sub)}")
        print(f"  {s:28s} " + "  ".join(f"{c:>9s}" for c in cells))
    print("\nworst registers:")
    for rg,_ in collections.Counter(r.get("register") for r in out).most_common():
        sub=[r for r in out if r.get("register")==rg]; d=sum(r["flagged"] for r in sub)
        if len(sub)>=40:
            print(f"  {str(rg):26s} {d:3d}/{len(sub):<5d} {100*d/len(sub):5.2f}%")

if __name__=="__main__": main()

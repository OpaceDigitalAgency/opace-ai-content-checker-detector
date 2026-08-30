import json,sys,os,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from harness import score_document
sel=json.load(open("sel-ai.json"))          # 654 independent AI long-form
out=[]
for i,r in enumerate(sel):
    rec={"id":r["id"],"register":r["register"],"model":r["model"],
         "prompt_style":r["prompt_style"],"words":r["words"]}
    for n in (512,):
        d=score_document(" ".join(r["text"].split()[:n]))
        rec[f"p{n}"]=d["probability_ai"]; rec[f"seg{n}"]=[s["probability_ai"] for s in d["segments"]]
    out.append(rec)
    if (i+1)%100==0: print(i+1,flush=True)
json.dump(out,open("trunc-scores.json","w")); print("done",len(out))

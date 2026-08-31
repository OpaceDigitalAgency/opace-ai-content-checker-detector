"""Three-way per-path comparison on the identical sampled documents:
raw (markdown paste / .md upload) vs stripped (plain-text paste) vs
raw-HTML (.html upload). Full-corpus raw+stripped rates as context.
Output: surface-comparison.json + printed table."""
import json, os
HERE=os.path.dirname(os.path.abspath(__file__)); RESEARCH=os.path.dirname(HERE)
PRIMARY,SECONDARY=0.9855,0.9763
def pf(sp):
    s=sorted(sp,reverse=True)
    return bool(s) and (s[0]>=PRIMARY or (len(s)>1 and s[1]>=SECONDARY))
html={}; sides={}
for l in open(os.path.join(HERE,"inputs","html-sample.jsonl")):
    r=json.loads(l); html[r["id"]]=r["seg_p"]; sides[r["id"]]=r["side"]
strip={}
for n in ("human-fp32-stripped.jsonl","generated-fp32-stripped.jsonl"):
    for l in open(os.path.join(HERE,"inputs",n)):
        r=json.loads(l); strip[r["id"]]=r["seg_p"]
raw={}
for l in open(os.path.join(HERE,"inputs","human-fp32.jsonl")):
    r=json.loads(l); raw[r["id"]]=r["seg_p"]
for l in open(os.path.join(RESEARCH,"generated-corpus","cycle2-rescore-2026-08-31","generated-fp32.jsonl")):
    r=json.loads(l); raw[r["id"]]=r["seg_p"]
out={}
for side in ("human","ai"):
    ids=[i for i in html if sides[i]==side and i in raw and i in strip]
    n=len(ids)
    row={s:sum(1 for i in ids if pf(d[i])) for s,d in
         [("raw_markdown",raw),("stripped_plain",strip),("raw_html",html)]}
    out[side]={"n":n, **{k:f"{v}/{n} = {v/n:.1%}" for k,v in row.items()}}
    print(side, out[side])
json.dump(out, open(os.path.join(HERE,"surface-comparison.json"),"w"), indent=1)

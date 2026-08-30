import json, math, statistics, sys, collections
SRC = sys.argv[1]
PRIMARY, SECONDARY, FLOOR = 0.9855, 0.9763, 30
BANDS = [(0,99,"under 100"),(100,199,"100–199"),(200,299,"200–299"),
         (300,399,"300–399"),(400,599,"400–599"),(600,849,"600–849")]
rows=[json.loads(l) for l in open(SRC)]
for r in rows:
    s=sorted(r["seg_p"],reverse=True); r["p_max"]=s[0]
    r["flag"]=s[0]>=PRIMARY or (len(s)>1 and s[1]>=SECONDARY)
    r["p_0984"]=s[0]
def wilson(k,n,z=1.96):
    p=k/n;d=1+z*z/n;c=(p+z*z/(2*n))/d
    h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return(100*(c-h),100*(c+h))
def comma(n): return f"{n:,}"
def cell(sel):
    n=len(sel)
    if n==0: return {"note":"no documents"}
    k=sum(r["flag"] for r in sel)
    c={"count":f"{comma(k)}/{comma(n)}",
       "mean":f"{100*statistics.mean(r['p_max'] for r in sel):.1f}%",
       "median":f"{100*statistics.median(r['p_max'] for r in sel):.1f}%"}
    if n<FLOOR: c["note"]=f"n below {FLOOR} — no rate quoted"
    else:
        lo,hi=wilson(k,n); c["figure"]=f"{comma(k)}/{comma(n)} ({100*k/n:.1f}%)"; c["interval"]=f"{lo:.1f} to {hi:.1f}%"
    return c

pilot=[r for r in rows if r["arm"]=="pilot"]
kw=[r for r in rows if r["arm"]=="keyword-repetition"]
print("PILOT ARM n",len(pilot),"KEYWORD ARM n",len(kw))
# reproduction gate: the published 0.9845 max-only pilot bands, by TARGET length
print("\nGATE — pilot by TARGET length at the older 0.9845 maximum-only threshold (expect 44/195, 175/206, 169/208, 194/207)")
for t in [100,300,400,600]:
    sel=[r for r in pilot if r["target_len"]==t]
    k=sum(1 for r in sel if r["p_0984"]>=0.9845)
    print(f"  target {t}: {k}/{len(sel)}")

out={}
for arm,name,sel in [("pilot","length_shortform",pilot),("keyword-repetition","length_keyword_repetition",kw)]:
    band_rows=[]
    for lo,hi,label in BANDS:
        s=[r for r in sel if lo<=r["word_count"]<=hi]
        band_rows.append({"words":label,"ai":cell(s)})
    band_rows.append({"words":"all lengths","ai":cell(sel),"total":True})
    out[name]=band_rows
    print(f"\n## {name}")
    for br in band_rows:
        c=br["ai"]; print(f"  {br['words']:14} {c.get('figure') or (c.get('count','')+' '+c.get('note',''))}  mean {c.get('mean','—')} med {c.get('median','—')}")

for arm,name,sel in [("pilot","shortform_model",pilot),("keyword-repetition","shortform_keyword_model",kw)]:
    mrows=[]
    for m,_ in collections.Counter(r["model"] for r in sel).most_common():
        s=[r for r in sel if r["model"]==m]
        mrows.append({"model":m,"ai":cell(s),"_r":sum(r["flag"] for r in s)/len(s)})
    mrows.sort(key=lambda r:-r["_r"])
    for r in mrows: r.pop("_r")
    mrows.append({"model":"all models","ai":cell(sel),"total":True})
    out[name]=mrows
    print(f"\n## {name}")
    for br in mrows:
        c=br["ai"]; print(f"  {br['model']:28} {c.get('figure') or (c.get('count','')+' '+c.get('note',''))}  mean {c.get('mean','—')} med {c.get('median','—')}")

json.dump(out,open(sys.argv[2],"w"),indent=1)

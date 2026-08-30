import json,glob,collections,math,itertools
R="/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
side={};reg={}
for f,s in [("ai-longform.jsonl","ai"),("human-longform.jsonl","human")]:
    for l in open(f"{R}/longform-corpus/{f}"):
        r=json.loads(l); side[r["id"]]=s; reg[r["id"]]=r["register"]
br={}
for f in glob.glob("b2ai-*.json")+glob.glob("b2hu-*.json")+glob.glob("b3ai-*.json")+glob.glob("b3hu-*.json")+glob.glob("b4out-*.json"):
    for r in json.load(open(f)):
        br[r["id"]]=sorted((x["probability_ai"] for x in r["segments"]),reverse=True)
fp={}
for f in ["lf-ai.jsonl","lf-hu.jsonl"]:
    for l in open(f):
        r=json.loads(l); fp[r["id"]]=sorted(r["seg_p"],reverse=True)
ids=[i for i in br if i in fp]
A=[i for i in ids if side[i]=="ai"]; H=[i for i in ids if side[i]=="human"]
print(f"FULL CORPUS on BOTH runtimes: {len(ids)} documents ({len(A)} AI, {len(H)} human)")
def t2(s): return s[0],(s[1] if len(s)>1 else -1)
def flag(s,t1,t2v):
    a,b=t2(s); return a>=t1 or b>=t2v
def ev(src,t1,t2v):
    d=sum(1 for i in A if flag(src[i],t1,t2v)); f=sum(1 for i in H if flag(src[i],t1,t2v))
    return d,f
print("\n== 1. Baseline single-threshold rule (segments-v2), max >= 0.984")
for nm,src in [("fp32",fp),("browser int8",br)]:
    d,f=ev(src,0.984,2.0)
    print(f"  {nm:12} AI {d}/{len(A)} = {100*d/len(A):.2f}%   human FP {f}/{len(H)} = {100*f/len(H):.3f}%")
print("\n== 2. The proposed segments-v3 pair (0.9845 primary / 0.9765 secondary), as fitted on fp32")
for nm,src in [("fp32",fp),("browser int8",br)]:
    d,f=ev(src,0.9845,0.9765)
    print(f"  {nm:12} AI {d}/{len(A)} = {100*d/len(A):.2f}%   human FP {f}/{len(H)} = {100*f/len(H):.3f}%")
print("\n== 3. Documents the SECOND parameter alone decides (max<0.9845, second>=0.9765)")
for nm,src in [("fp32",fp),("browser int8",br)]:
    da=[i for i in A if t2(src[i])[0]<0.9845 and t2(src[i])[1]>=0.9765]
    dh=[i for i in H if t2(src[i])[0]<0.9845 and t2(src[i])[1]>=0.9765]
    print(f"  {nm:12} AI {len(da)}/{len(A)}   human {len(dh)}/{len(H)}  human registers {dict(collections.Counter(reg[i] for i in dh))}")
print("\n== 4. Route disagreement on the v3 verdict, same document, same pair")
dis=[i for i in ids if flag(fp[i],0.9845,0.9765)!=flag(br[i],0.9845,0.9765)]
dis2=[i for i in ids if (fp[i][0]>=0.984)!=(br[i][0]>=0.984)]
print(f"  segments-v2 (single 0.984):  {len(dis2)}/{len(ids)} = {100*len(dis2)/len(ids):.2f}%")
print(f"  segments-v3 (0.9845/0.9765): {len(dis)}/{len(ids)} = {100*len(dis)/len(ids):.2f}%")
bo=sum(1 for i in dis if flag(br[i],0.9845,0.9765)); print(f"    of which browser-only flag {bo}, server-only {len(dis)-bo}")
print("\n== 5. Runtime divergence on SECOND-highest section scores vs highest")
import statistics
d1=[abs(fp[i][0]-br[i][0]) for i in ids]
d2=[abs(t2(fp[i])[1]-t2(br[i])[1]) for i in ids if len(fp[i])>1 and len(br[i])>1]
print(f"  |Δ| highest section : median {statistics.median(d1):.4f}  p90 {sorted(d1)[int(.9*len(d1))]:.4f}")
print(f"  |Δ| second-highest  : median {statistics.median(d2):.4f}  p90 {sorted(d2)[int(.9*len(d2))]:.4f}  (n={len(d2)})")
for lo,hi in [(0.97,1.01),(0.9,0.97),(0.5,0.9)]:
    s=[abs(t2(fp[i])[1]-t2(br[i])[1]) for i in ids if len(br[i])>1 and lo<=t2(br[i])[1]<hi]
    if s: print(f"    second-highest in browser {lo}-{hi}: n={len(s)} median {statistics.median(s):.4f} max {max(s):.4f}")
print("\n== 6. Browser refit: pairs at a matched human false-positive budget")
def budget_fit(src,budget_n):
    best=None
    for t1 in [x/10000 for x in range(9800,9900)]:
        # for each t1, find lowest t2 keeping FP <= budget
        for t2v in [x/10000 for x in range(9600,9900)]:
            d,f=ev(src,t1,t2v)
            if f<=budget_n and (best is None or d>best[0]): best=(d,f,t1,t2v)
    return best
for nm,src,bn in [("fp32",fp,53),("browser int8",br,53)]:
    d,f,t1,t2v=budget_fit(src,bn)
    print(f"  {nm:12} budget<= {bn} FP: best pair ({t1:.4f} / {t2v:.4f})  AI {d}/{len(A)} = {100*d/len(A):.2f}%  FP {f}/{len(H)} = {100*f/len(H):.3f}%")
print("\n== 7. Per-register, browser runtime, v2 -> v3")
for nm,rows in [("AI",A),("human",H)]:
    print(f"  {nm}")
    for rg,_ in collections.Counter(reg[i] for i in rows).most_common():
        s=[i for i in rows if reg[i]==rg]
        a=sum(1 for i in s if br[i][0]>=0.984); b=sum(1 for i in s if flag(br[i],0.9845,0.9765))
        print(f"    {rg:24} {a}/{len(s)} = {100*a/len(s):5.2f}%  ->  {b}/{len(s)} = {100*b/len(s):5.2f}%")
print("\n== 8. Two-segment AI documents (the weakness the owner hit)")
for nm,src in [("fp32",fp),("browser int8",br)]:
    s=[i for i in A if len(src[i])==2]
    a=sum(1 for i in s if src[i][0]>=0.984); b=sum(1 for i in s if flag(src[i],0.9845,0.9765))
    print(f"  {nm:12} n={len(s)}  v2 {a} = {100*a/len(s):.2f}%  ->  v3 {b} = {100*b/len(s):.2f}%")

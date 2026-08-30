import json,collections,math,statistics,glob
br={}
for f in glob.glob("b2ai-*.json")+glob.glob("b2hu-*.json")+glob.glob("b3ai-*.json")+glob.glob("b3hu-*.json"):
    for r in json.load(open(f)): br[r["id"]]=r
fp={}
for f in ["lf-ai.jsonl","lf-hu.jsonl"]:
    for l in open(f):
        r=json.loads(l); fp[r["id"]]=r
meta={}
for f in ["sel-ai.json","sel-hu.json"]:
    for r in json.load(open(f)): meta[r["id"]]=r
rows=[]
for i,b in br.items():
    m=meta[i]; f=fp[i]
    rows.append({"id":i,"side":m["side"],"register":m["register"],"style":m.get("prompt_style"),
                 "model":m.get("model"),"words":m["words"],
                 "pb":b["probability_ai"],"pf":f["p_max"],"nseg":b["segment_count"]})
ai=[r for r in rows if r["side"]=="ai"]; hu=[r for r in rows if r["side"]=="human"]
print(f"BROWSER RUNTIME (onnxruntime-web WASM, int8, headless Node), segments-v2, max aggregation")
print(f"sample: {len(ai)} independent AI long-form + {len(hu)} human long-form\n")

def wilson(k,n,z=1.96):
    if n==0: return (0,0)
    p=k/n; d=1+z*z/n
    c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
    return (100*(c-h),100*(c+h))
def cell(rows,key,t):
    k=sum(1 for r in rows if r[key]>=t); n=len(rows)
    lo,hi=wilson(k,n)
    return f"{k}/{n} = {100*k/max(1,n):.1f}% [{lo:.1f}-{hi:.1f}]"
TH=[0.984,0.98,0.97,0.95,0.90,0.85,0.8082]
print("== A. Operating curve, both runtimes, same documents")
print(f"{'thr':>8} | {'AI detected (browser)':>30} {'AI detected (fp32)':>30} | {'human FP (browser)':>30} {'human FP (fp32)':>30}")
for t in TH:
    print(f"{t:>8} | {cell(ai,'pb',t):>30} {cell(ai,'pf',t):>30} | {cell(hu,'pb',t):>30} {cell(hu,'pf',t):>30}")

print("\n== B. Route disagreement — verdicts that differ by runtime, same text, same threshold")
print(f"{'thr':>8} {'disagree /2424':>16} {'browser-only flag':>18} {'server-only flag':>18}")
for t in TH:
    bo=sum(1 for r in rows if r["pb"]>=t and r["pf"]<t)
    so=sum(1 for r in rows if r["pf"]>=t and r["pb"]<t)
    print(f"{t:>8} {f'{bo+so} ({100*(bo+so)/len(rows):.2f}%)':>16} {bo:>18} {so:>18}")

print("\n== C. |browser - fp32| by browser probability region (this sample)")
for lo,hi in [(0,0.5),(0.5,0.9),(0.9,0.97),(0.97,1.01)]:
    sel=[abs(r["pb"]-r["pf"]) for r in rows if lo<=r["pb"]<hi]
    if sel: print(f"  {lo}-{hi}: n={len(sel)} median {statistics.median(sel):.4f} p90 {sorted(sel)[int(.9*len(sel))]:.4f} max {max(sel):.4f}")

print("\n== D. Prompt style, INDEPENDENT AI, browser runtime")
for t in [0.984,0.98,0.95]:
    print(f"  threshold {t}")
    for st in ["plain","house-brief","human-voice"]:
        s=[r for r in ai if r["style"]==st]
        print(f"    {st:12} browser {cell(s,'pb',t):>26}   fp32 {cell(s,'pf',t):>26}")

print("\n== E. Human false positives per register, browser runtime")
regs=sorted({r['register'] for r in hu},key=lambda x:-sum(1 for r in hu if r['register']==x))
print("register".ljust(24)+"".join(f"{t:>26}" for t in TH[:5]))
for reg in regs:
    s=[r for r in hu if r["register"]==reg]
    print(reg.ljust(24)+"".join(f"{cell(s,'pb',t):>26}" for t in TH[:5]))
print("ALL(sample)".ljust(24)+"".join(f"{cell(hu,'pb',t):>26}" for t in TH[:5]))

print("\n== F. Fiction/stories: the contested figure, both runtimes")
st=[r for r in hu if r["register"]=="story"]
for t in [0.98,0.984,0.9845]:
    print(f"  @{t}: browser {cell(st,'pb',t)}   fp32 {cell(st,'pf',t)}")

print("\n== G. AI detection per register, browser, @0.984")
for reg,_ in collections.Counter(r["register"] for r in ai).most_common():
    s=[r for r in ai if r["register"]==reg]
    print(f"  {reg:24} browser {cell(s,'pb',0.984):>26}  fp32 {cell(s,'pf',0.984):>26}")

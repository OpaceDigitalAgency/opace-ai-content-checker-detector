import json,collections,hashlib,statistics
R="/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
train={}
for line in open(R+"/cycle2-train/dataset.jsonl"):
    r=json.loads(line)
    train[hashlib.sha256(" ".join(r["text"].split()).lower().encode()).hexdigest()]=r.get("split")
ai=[json.loads(l) for l in open("lf-ai.jsonl")]
hu=[json.loads(l) for l in open("lf-hu.jsonl")]
for r in ai+hu: r["split"]=train.get(r["norm_sha"],"unseen")
TH=[0.984,0.980,0.97,0.95,0.90,0.8533,0.8082,0.75]
def line(rows,t): 
    n=sum(1 for r in rows if r["p_max"]>=t); return f"{n}/{len(rows)} = {100*n/max(1,len(rows)):.2f}%"
print("== 1. AI detection / human FP by threshold, fp32 segmented, full 5,558 corpus")
print(f"{'thr':>8} {'AI detected':>20} {'human FP':>20}")
for t in TH: print(f"{t:>8} {line(ai,t):>20} {line(hu,t):>20}")

print("\n== 2. Training contamination of the 'held-out' AI corpus")
byc=collections.Counter(r["split"] for r in ai)
print("AI splits:",dict(byc))
indep=[r for r in ai if r["split"]=="unseen"]
seen=[r for r in ai if r["split"]!="unseen"]
intrain=[r for r in ai if r["split"]=="train"]
for t in [0.984,0.980,0.95,0.90]:
    print(f" t={t}: independent {line(indep,t)} | seen-in-cycle2-dataset {line(seen,t)} | of which train-split {line(intrain,t)}")
print("human splits:",dict(collections.Counter(r['split'] for r in hu)))

print("\n== 3. Prompt style on INDEPENDENT AI documents (never in the cycle-2 dataset), fp32 @0.984")
for t in [0.984,0.980,0.95,0.90]:
    print(f" threshold {t}")
    for st in ["plain","house-brief","human-voice"]:
        rows=[r for r in indep if r.get("prompt_style")==st]
        print(f"   {st:12} {line(rows,t)}")
print("\n  same split on the CONTAMINATED subset (in cycle-2 dataset), @0.984")
for st in ["plain","house-brief","human-voice"]:
    rows=[r for r in seen if r.get("prompt_style")==st]
    print(f"   {st:12} {line(rows,0.984)}")

print("\n== 4. Prompt style x model, independent only, @0.984")
models=collections.Counter(r["model"] for r in indep)
print(f"{'model':32} {'plain':>14} {'house-brief':>14} {'human-voice':>14}")
for m,_ in models.most_common():
    cells=[]
    for st in ["plain","house-brief","human-voice"]:
        rows=[r for r in indep if r["model"]==m and r.get("prompt_style")==st]
        cells.append(line(rows,0.984) if rows else "-")
    print(f"{m:32} {cells[0]:>14} {cells[1]:>14} {cells[2]:>14}")

print("\n== 5. Human false positives per register at candidate thresholds (fp32 segmented, full corpus)")
regs=sorted({r["register"] for r in hu}, key=lambda x:-sum(1 for r in hu if r["register"]==x))
hdr="register".ljust(26)+"".join(f"{t:>13}" for t in TH)
print(hdr)
for reg in regs:
    rows=[r for r in hu if r["register"]==reg]
    print(reg.ljust(26)+"".join(f"{line(rows,t):>13}" for t in TH))
print("ALL".ljust(26)+"".join(f"{line(hu,t):>13}" for t in TH))

print("\n== 6. AI detection per register at candidate thresholds (independent subset only)")
regs=sorted({r["register"] for r in indep})
print("register".ljust(26)+"".join(f"{t:>13}" for t in TH))
for reg in regs:
    rows=[r for r in indep if r["register"]==reg]
    print(reg.ljust(26)+"".join(f"{line(rows,t):>13}" for t in TH))
print("ALL-indep".ljust(26)+"".join(f"{line(indep,t):>13}" for t in TH))

print("\n== 7. Length: independent AI documents by word count band, @0.984")
bands=[(0,600),(600,1000),(1000,1500),(1500,2500),(2500,100000)]
for lo,hi in bands:
    rows=[r for r in indep if lo<=r["n_words"]<hi]
    if rows: print(f" {lo}-{hi}: {line(rows,0.984)}  median segments {statistics.median(r['n_seg'] for r in rows)}")
print(" human by band @0.984")
for lo,hi in bands:
    rows=[r for r in hu if lo<=r["n_words"]<hi]
    if rows: print(f" {lo}-{hi}: {line(rows,0.984)}")

print("\n== 8. Fiction / stories, the contested figure")
st=[r for r in hu if r["register"]=="story"]
print(" n =",len(st))
for t in [0.980,0.984,0.9845,0.99]:
    print(f"  fp32 segmented @{t}: {line(st,t)}")
print("  first-segment-only (pre-segmentation proxy) @0.984:",
      f"{sum(1 for r in st if r['p_first']>=0.984)}/{len(st)}")

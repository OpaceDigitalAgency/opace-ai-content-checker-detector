"""Does markdown syntax inflate the model score? Re-score a sample of
flagged human docs with heading markers / bullets / inline md stripped."""
import json, os, random, re, sys
HERE=os.path.dirname(os.path.abspath(__file__)); RESEARCH=os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
_c=os.getcwd(); os.chdir(os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
import harness; os.chdir(_c)
PRIMARY,SECONDARY=0.9855,0.9763
def flag(sp):
    s=sorted(sp,reverse=True)
    return bool(s) and (s[0]>=PRIMARY or (len(s)>1 and s[1]>=SECONDARY))
def score(text):
    parts=harness.segment_text(text,harness.count_tokens)
    probs=[]
    for i in range(0,len(parts),16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i+16]]))
    return probs
def strip_md(t):
    t=re.sub(r"^#{1,6}\s*","",t,flags=re.M)
    t=re.sub(r"^\s*[-*+]\s+","",t,flags=re.M)
    t=re.sub(r"^\s*\d+\.\s+","",t,flags=re.M)
    t=re.sub(r"\*\*([^*]+)\*\*",r"\1",t); t=re.sub(r"\*([^*]+)\*",r"\1",t)
    t=re.sub(r"`([^`]*)`",r"\1",t)
    t=re.sub(r"\[([^\]]*)\]\([^)]*\)",r"\1",t)
    return t
flagged=set()
for l in open(os.path.join(HERE,"inputs","human-fp32.jsonl")):
    r=json.loads(l)
    if flag(r["seg_p"]): flagged.add(r["id"])
texts={}
for l in open(os.path.join(RESEARCH,"human-structured-corpus-2026-08-31","corpus.jsonl")):
    r=json.loads(l)
    if r["id"] in flagged: texts[r["id"]]=r["text"]
ids=sorted(texts); random.Random(3).shuffle(ids); ids=ids[:60]
still=0
for i in ids:
    still+=flag(score(strip_md(texts[i])))
print(f"{len(ids)} flagged human docs, markdown stripped: {still} still flagged ({still/len(ids):.0%})")

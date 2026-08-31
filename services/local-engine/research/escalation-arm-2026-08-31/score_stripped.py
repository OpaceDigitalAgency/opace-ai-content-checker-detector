"""Re-score BOTH corpora with markdown syntax stripped (headings, bullet
markers, numbered-list markers, bold/italic/code/link syntax removed; text
and paragraph breaks kept). This is the plain-text paste surface: the model
sees prose, the shape tells still read the captured structure.

Motivated by strip_test.py: 59 of 60 human docs flagged on the raw-markdown
surface un-flag when the syntax is stripped, so the raw surface's 22.5%
human flag rate is a scoring-surface artefact, not a property of the prose.

Outputs: inputs/human-fp32-stripped.jsonl, inputs/generated-fp32-stripped.jsonl
Resumable. Usage: python3 score_stripped.py
"""
import json, os, re, sys, time
HERE=os.path.dirname(os.path.abspath(__file__)); RESEARCH=os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
_c=os.getcwd(); os.chdir(os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
import harness; os.chdir(_c)

def strip_md(t):
    t=re.sub(r"^#{1,6}\s*","",t,flags=re.M)
    t=re.sub(r"^\s*[-*+]\s+","",t,flags=re.M)
    t=re.sub(r"^\s*\d+\.\s+","",t,flags=re.M)
    t=re.sub(r"\*\*([^*]+)\*\*",r"\1",t); t=re.sub(r"\*([^*]+)\*",r"\1",t)
    t=re.sub(r"`([^`]*)`",r"\1",t)
    t=re.sub(r"\[([^\]]*)\]\([^)]*\)",r"\1",t)
    return t

def score(text):
    parts=harness.segment_text(text,harness.count_tokens)
    probs=[]
    for i in range(0,len(parts),16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i+16]]))
    return probs

def run(src_path, out_path, keep):
    done=set()
    if os.path.exists(out_path):
        for l in open(out_path):
            if l.strip(): done.add(json.loads(l)["id"])
    recs=[json.loads(l) for l in open(src_path)]
    recs=[r for r in recs if r["id"] not in done and keep(r)]
    print(f"{os.path.basename(out_path)}: {len(done)} done, {len(recs)} to go",flush=True)
    t0=time.time()
    with open(out_path,"a") as fh:
        for n,r in enumerate(recs,1):
            fh.write(json.dumps({"id":r["id"],
                                 "seg_p":score(strip_md(r["text"]))})+"\n")
            if n%200==0:
                print(f"{n}/{len(recs)} in {time.time()-t0:.0f}s",flush=True); fh.flush()
    print(f"DONE {os.path.basename(out_path)} {len(recs)} in {time.time()-t0:.0f}s",flush=True)

if __name__=="__main__":
    run(os.path.join(RESEARCH,"human-structured-corpus-2026-08-31","corpus.jsonl"),
        os.path.join(HERE,"inputs","human-fp32-stripped.jsonl"), lambda r: True)
    run(os.path.join(RESEARCH,"generated-corpus","generated.jsonl"),
        os.path.join(HERE,"inputs","generated-fp32-stripped.jsonl"),
        lambda r: True)
    print("ALL_DONE",flush=True)

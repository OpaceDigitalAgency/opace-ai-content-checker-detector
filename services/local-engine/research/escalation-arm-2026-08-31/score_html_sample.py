"""Score a stratified sample of both corpora rendered as raw HTML — the
.html file-upload path, where integrity-controller.ts:850 puts the file's
raw text (tags included) into the textarea and the model scores it verbatim.

Markdown -> minimal HTML: # lines to <h2>/<h3>, bullet blocks to <ul><li>,
other blocks to <p>, ** stripped to <strong>. 600 docs per side, seeded.
Output: inputs/html-sample.jsonl (id, side, seg_p)
"""
import json, os, random, re, sys, time
HERE=os.path.dirname(os.path.abspath(__file__)); RESEARCH=os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
_c=os.getcwd(); os.chdir(os.path.join(RESEARCH,"corpus-reconciliation-2026-08-29"))
import harness; os.chdir(_c)

def md_to_html(t):
    out=[]
    for block in re.split(r"\n\s*\n", t):
        lines=[l for l in block.split("\n") if l.strip()]
        if not lines: continue
        if all(re.match(r"^\s*[-*+]\s+", l) for l in lines):
            stripped=[re.sub(r"^\s*[-*+]\s+","",l) for l in lines]
            items="".join("<li>"+s+"</li>" for s in stripped)
            out.append("<ul>"+items+"</ul>"); continue
        html=[]
        for l in lines:
            m=re.match(r"^(#{1,6})\s*(.*)$", l)
            if m:
                lvl=min(len(m.group(1))+1,6)
                html.append(f"<h{lvl}>{m.group(2)}</h{lvl}>")
            else:
                html.append(f"<p>{l}</p>")
        out.append("".join(html))
    h="\n\n".join(out)
    h=re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", h)
    return h

def score(text):
    parts=harness.segment_text(text,harness.count_tokens)
    probs=[]
    for i in range(0,len(parts),16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i+16]]))
    return probs

def sample(path, n, seed):
    rows=[json.loads(l) for l in open(path)]
    random.Random(seed).shuffle(rows)
    return rows[:n]

out=open(os.path.join(HERE,"inputs","html-sample.jsonl"),"w")
t0=time.time()
for side,path in [("human", os.path.join(RESEARCH,"human-structured-corpus-2026-08-31","corpus.jsonl")),
                  ("ai", os.path.join(RESEARCH,"generated-corpus","generated.jsonl"))]:
    for i,r in enumerate(sample(path,600,42),1):
        out.write(json.dumps({"id":r["id"],"side":side,
                              "seg_p":score(md_to_html(r["text"]))})+"\n")
        if i%200==0: print(f"{side} {i}/600 in {time.time()-t0:.0f}s",flush=True)
out.close(); print("HTML_SAMPLE_DONE",flush=True)

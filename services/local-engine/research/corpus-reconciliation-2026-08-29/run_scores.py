import json, sys, time, hashlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import score_document

R = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
KEEP = ("id","side","register","genre","provider","model","prompt_style","model_tier",
        "domain","length_band","word_count","words","era","source","tier","prompt_id","topic_id")

def norm(t): return hashlib.sha256(" ".join(t.split()).lower().encode()).hexdigest()

src, out = sys.argv[1], sys.argv[2]
t0 = time.time(); n = 0; seg = 0
with open(out, "w") as fo:
    for line in open(src):
        r = json.loads(line)
        o = score_document(r["text"])
        rec = {k: r[k] for k in KEEP if k in r}
        rec["norm_sha"] = norm(r["text"])
        rec["n_words"] = len(r["text"].split())
        rec["p_max"] = o["probability_ai"]
        rec["p_first"] = o["segments"][0]["probability_ai"] if o["segments"] else None
        rec["p_mean"] = round(sum(s["probability_ai"] for s in o["segments"])/max(1,len(o["segments"])), 6)
        rec["n_seg"] = len(o["segments"])
        rec["seg_p"] = [s["probability_ai"] for s in o["segments"]]
        fo.write(json.dumps(rec) + "\n")
        n += 1; seg += len(o["segments"])
        if n % 250 == 0:
            print(f"{n} docs {seg} seg {time.time()-t0:.0f}s", flush=True)
print(f"DONE {src} {n} docs {seg} segments {time.time()-t0:.0f}s", flush=True)

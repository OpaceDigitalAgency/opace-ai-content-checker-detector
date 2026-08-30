import json, sys, hashlib, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import score_document, THRESHOLD
R="/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
def norm(t): return hashlib.sha256(" ".join(t.split()).lower().encode()).hexdigest()
train={}
for line in open(R+"/cycle2-train/dataset.jsonl"):
    r=json.loads(line); train[norm(r["text"])]=r.get("split")

SEO={"seo-service-page","company-blog","landing-page","category-page","product-description",
     "howto-explainer","faq-page","thought-leadership","case-study","press-release","newsletter"}
rows=[]
for line in open(R+"/generated-corpus/generated.jsonl"):
    r=json.loads(line)
    if r.get("register") not in SEO: continue
    rows.append(r)
print("marketing/SEO-register docs:",len(rows))

def first_words(text,n):
    parts=text.split()
    return " ".join(parts[:n])

out=[]
for i,r in enumerate(rows):
    full=score_document(r["text"])
    tr=score_document(first_words(r["text"],512))
    out.append({"id":r["id"],"model":r["model"],"register":r["register"],
                "prompt_style":r["prompt_style"],"words":r["words"],
                "split":train.get(norm(r["text"]),"unseen"),
                "full_p":full["probability_ai"],"full_seg":[s["probability_ai"] for s in full["segments"]],
                "t512_p":tr["probability_ai"],"t512_seg":[s["probability_ai"] for s in tr["segments"]]})
    if (i+1)%100==0: print(i+1,flush=True)
json.dump(out,open("miss-scores.json","w"))
print("wrote",len(out))

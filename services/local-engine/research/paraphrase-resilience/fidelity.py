"""Independent semantic-fidelity judgement for every rewrite.

Uses intfloat/e5-small, a sentence-embedding model with no knowledge of the
watermark, the keys or the scores. Cosine similarity between the original and
the rewrite, plus two purely lexical overlap measures so a reader can separate
"kept the meaning" from "kept the words".
"""
import json, sys, glob, re, torch, torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

REPO = "intfloat/e5-small"
MAXLEN = 512

def embed(model, tok, texts, device):
    # e5 requires the "query: " prefix for symmetric similarity.
    batch = tok(["query: " + t for t in texts], max_length=MAXLEN,
                padding=True, truncation=True, return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**batch)
    mask = batch["attention_mask"].unsqueeze(-1).float()
    pooled = (out.last_hidden_state * mask).sum(1) / mask.sum(1)
    return F.normalize(pooled, p=2, dim=1)

WORD = re.compile(r"[A-Za-z']+")
STOP = set("a an the and or but if of to in on at for with as is are was were be been "
           "it its this that these those i you he she they we not no so do does did "
           "have has had will would can could there their his her our your my".split())

def lexical(a, b):
    wa = [w.lower() for w in WORD.findall(a)]
    wb = [w.lower() for w in WORD.findall(b)]
    ca, cb = set(w for w in wa if w not in STOP), set(w for w in wb if w not in STOP)
    jac = len(ca & cb) / len(ca | cb) if (ca | cb) else 0.0
    # 4-gram overlap on the full word sequence (leaked n-grams are what keeps a
    # statistical watermark alive through a rewrite)
    ga = set(tuple(wa[i:i+4]) for i in range(max(0, len(wa)-3)))
    gb = set(tuple(wb[i:i+4]) for i in range(max(0, len(wb)-3)))
    ng = len(ga & gb) / len(ga) if ga else 0.0
    return round(jac, 4), round(ng, 4)

def main():
    corpus = {c["id"]: c for c in json.load(open("corpus.json"))}
    rows = []
    for f in sys.argv[1:]:
        rows += json.load(open(f))
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(REPO)
    model = AutoModel.from_pretrained(REPO).to(device).eval()

    out = []
    for r in rows:
        orig = corpus[r["id"]]["text"]
        e = embed(model, tok, [orig, r["text"]], device)
        cos = float((e[0] * e[1]).sum())
        jac, ng4 = lexical(orig, r["text"])
        out.append({"id": r["id"], "variant": r["variant"],
                    "e5_cosine": round(cos, 4),
                    "content_word_jaccard": jac, "ngram4_retained": ng4})
        print(f"{r['id']:<22}{r['variant']:<20}cos={cos:.4f} jac={jac:.3f} 4gram={ng4:.3f}", flush=True)
    json.dump(out, open("fidelity.json", "w"), indent=1)

    # Fidelity floor: unrelated fixtures scored against each other, to show what
    # "different text" looks like on this metric rather than asserting a threshold.
    ids = list(corpus)
    pairs = [(ids[i], ids[(i + 5) % len(ids)]) for i in range(len(ids))]
    floor = []
    for a, b in pairs:
        e = embed(model, tok, [corpus[a]["text"], corpus[b]["text"]], device)
        floor.append(float((e[0] * e[1]).sum()))
    print("UNRELATED-PAIR FLOOR n=%d mean=%.4f min=%.4f max=%.4f"
          % (len(floor), sum(floor)/len(floor), min(floor), max(floor)))
    json.dump({"n": len(floor), "mean": round(sum(floor)/len(floor), 4),
               "min": round(min(floor), 4), "max": round(max(floor), 4),
               "model": REPO},
              open("fidelity-floor.json", "w"), indent=1)

main()

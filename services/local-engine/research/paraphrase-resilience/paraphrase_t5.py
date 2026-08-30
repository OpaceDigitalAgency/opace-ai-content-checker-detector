"""Paraphrase arm B: a dedicated seq2seq paraphrase model, sentence by sentence.

Deterministic (beam search, no sampling), so the arm reproduces exactly.
Writes after every passage so a killed run resumes rather than restarting.
"""
import json, os, re, time, torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

REPO = "humarin/chatgpt_paraphraser_on_T5_base"
GEN = dict(num_beams=5, do_sample=False, early_stopping=True,
           repetition_penalty=1.2, no_repeat_ngram_size=2, max_length=160)
MIN_CHARS = 3   # segments shorter than this are passed through unchanged

SPLIT = re.compile(r"[^.!?]+[.!?]*\s*")
OUT = "variants-t5.json"

def main():
    corpus = json.load(open("corpus.json"))
    rows = json.load(open(OUT)) if os.path.exists(OUT) else []
    done = {r["id"] for r in rows}
    tok = AutoTokenizer.from_pretrained(REPO)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = AutoModelForSeq2SeqLM.from_pretrained(REPO).to(device).eval()
    tot = sum(r.get("seconds", 0) for r in rows)
    for c in corpus:
        if c["id"] in done:
            continue
        sents = [s for s in SPLIT.findall(c["text"]) if s.strip()]
        outs, passed = [], 0
        t = time.time()
        for s in sents:
            body = s.strip()
            if len(body) < MIN_CHARS:
                outs.append(body); passed += 1; continue
            ids = tok(f'paraphrase: {body}', return_tensors="pt",
                      truncation=True, max_length=160).to(device)
            with torch.no_grad():
                o = model.generate(**ids, num_return_sequences=1, **GEN)
            outs.append(tok.decode(o[0], skip_special_tokens=True).strip())
        dt = time.time() - t; tot += dt
        rows.append({"id": c["id"], "variant": "t5-paraphraser",
                     "sentences": len(sents), "passed_through": passed,
                     "seconds": round(dt, 1), "text": " ".join(outs)})
        json.dump(rows, open(OUT, "w"), indent=1)
        print(f"{c['id']} {len(sents)} sentences ({passed} passed through) {dt:.1f}s", flush=True)
    json.dump({"paraphraser": REPO, "decoding": GEN, "unit": "sentence",
               "min_chars_paraphrased": MIN_CHARS, "deterministic": True,
               "device": device, "torch": torch.__version__,
               "transformers": __import__("transformers").__version__,
               "generation_seconds_total": round(tot, 1)},
              open("manifest-t5.json", "w"), indent=1)
    print("DONE", round(tot, 1), "s")

main()

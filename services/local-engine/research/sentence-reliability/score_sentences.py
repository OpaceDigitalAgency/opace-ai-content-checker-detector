"""Score every scorable sentence in the long-form corpus, through the shipped path.

Same model file, tokeniser and temperature as the document scorer
(corpus-reconciliation-2026-08-29/harness.py) — the point of the exercise is to
find out what THIS detector does on sentence-length input, so nothing about the
scoring path may differ from the one that ships. What differs is only the unit
of text handed to it.

Padding: sentences are batched by token length and padded to the batch's
longest, not to 512. Verified equivalent to max_length=512 padding to 6e-08
(float noise) before this run, because a measurement that changed the numbers
to go faster would be worthless.

Output: one JSON line per document, carrying every sentence's offsets, word
count and full-precision probability. Full precision because the questions
asked of this file are about distribution tails and rank stability, and 4 dp
rounding destroys both.
"""
import json, os, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, ".."))
HARNESS_DIR = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29")
CORPUS = os.path.join(RESEARCH, "longform-corpus")
sys.path.insert(0, HERE)
sys.path.insert(0, HARNESS_DIR)
_cwd = os.getcwd()
os.chdir(HARNESS_DIR)
import harness  # noqa: E402
os.chdir(_cwd)
from sentences import split_sentences  # noqa: E402

TOK, SESS, IN, T = harness.TOKENIZER, harness.SESSION, harness.INPUT_NAMES, harness.TEMPERATURE
MAX_BATCH_TOKENS = 8192


def score_texts(texts):
    """Calibrated AI probability per text, length-bucketed dynamic padding."""
    if not texts:
        return []
    lens = [len(ids) for ids in TOK(texts, add_special_tokens=True, truncation=True,
                                    max_length=512)["input_ids"]]
    order = sorted(range(len(texts)), key=lambda i: lens[i])
    out = [0.0] * len(texts)
    batch, batch_max = [], 0
    def flush(batch):
        if not batch:
            return
        enc = TOK([texts[i] for i in batch], truncation=True, max_length=512,
                  padding="longest", return_tensors="np")
        feed = {n: enc[n].astype(np.int64) for n in IN if n in enc}
        lg = SESS.run(None, feed)[0]
        m = lg[:, 1] - lg[:, 0]
        p = 1.0 / (1.0 + np.exp(-m / T))
        for i, v in zip(batch, p):
            out[i] = float(v)
    for i in order:
        cand = max(batch_max, lens[i])
        if batch and cand * (len(batch) + 1) > MAX_BATCH_TOKENS:
            flush(batch); batch, batch_max = [], 0
            cand = lens[i]
        batch.append(i); batch_max = cand
    flush(batch)
    return out


def run(path, side, fh):
    n = t0 = 0
    t0 = time.time()
    for line in open(path):
        r = json.loads(line)
        sents = split_sentences(r["text"])
        scorable = [s for s in sents if s.scorable]
        probs = score_texts([s.text for s in scorable])
        pmap = {s.index: p for s, p in zip(scorable, probs)}
        fh.write(json.dumps({
            "id": r["id"], "side": side, "register": r["register"],
            "genre": r.get("genre"), "model": r.get("model"),
            "word_count": len(r["text"].split()),
            "sentences": [
                {"i": s.index, "s": s.start, "e": s.end, "w": s.words,
                 "p": pmap.get(s.index)}
                for s in sents],
        }) + "\n")
        n += 1
        if n % 100 == 0:
            fh.flush()
            el = time.time() - t0
            print(f"{side} {n} docs in {el:.0f}s ({n/el:.1f} doc/s)", flush=True)
    print(f"DONE {side} {n} in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    out = sys.argv[1]
    print("model sha", harness.MODEL_SHA, flush=True)
    with open(out, "w") as fh:
        run(os.path.join(CORPUS, "ai-longform.jsonl"), "ai", fh)
        run(os.path.join(CORPUS, "human-longform.jsonl"), "human", fh)

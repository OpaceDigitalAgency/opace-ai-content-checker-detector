"""Score the structured human corpus on the SHIPPED fp32 path.

Copy of human-structured-corpus-2026-08-31/score_fp32.py (itself mirroring
generated-corpus/cycle2-rescore-2026-08-31/score.py): tier3-cycle2 fp32
model, shipped tokeniser, temperature 0.8324, segments-v3 cut, through the
corpus-reconciliation harness. Writes to THIS directory
(inputs/human-fp32.jsonl); the corpus directory belongs to another lane and
is treated as read-only. Resumable; seeded from the 1,031 rows the corpus
lane's own run produced before its process was killed (rows spot-verified
against the harness by price_escalation.py verify).

Usage: python3 score_human_fp32.py
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
HSC = os.path.join(RESEARCH, "human-structured-corpus-2026-08-31")
sys.path.insert(0, os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
_cwd = os.getcwd()
os.chdir(os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
import harness  # noqa: E402
os.chdir(_cwd)


def segment_probs(text):
    parts = harness.segment_text(text, harness.count_tokens)
    probs = []
    for i in range(0, len(parts), 16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
    return probs, [p.words for p in parts]


def main():
    out_path = os.path.join(HERE, "inputs", "human-fp32.jsonl")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            if line.strip():
                done.add(json.loads(line)["id"])
    recs = []
    for line in open(os.path.join(HSC, "corpus.jsonl")):
        r = json.loads(line)
        if r["id"] not in done:
            recs.append(r)
    print(f"{len(done)} scored, {len(recs)} to go "
          f"(model sha {harness.MODEL_SHA[:16]}, contract "
          f"{harness.SEGMENTATION_CONTRACT})", flush=True)
    t0 = time.time()
    with open(out_path, "a") as fh:
        for n, r in enumerate(recs, 1):
            probs, words = segment_probs(r["text"])
            fh.write(json.dumps({
                "id": r["id"], "source": r["source"],
                "register": r["register"],
                "legal_bucket": r["legal_bucket"],
                "human_confidence": r["human_confidence"],
                "words": len(r["text"].split()),
                "seg_p": probs, "seg_words": words}) + "\n")
            if n % 200 == 0:
                print(f"{n}/{len(recs)} in {time.time()-t0:.0f}s", flush=True)
                fh.flush()
    print(f"DONE {len(recs)} in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()

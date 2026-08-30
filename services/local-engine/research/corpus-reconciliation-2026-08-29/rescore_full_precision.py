"""Full-precision re-score of the 5,558-document long-form corpus, grouped by register.

Reuses corpus-reconciliation-2026-08-29/harness.py (fp32 reference-server path).
Keeps EVERY segment probability at full precision, because the shipped rule's
second arm (0.9763) is decided by single-digit numbers of documents and the
4 dp lf-*.jsonl store rounds 884/922 where the truth is 883/922.
"""
import sys, os, json, time

HARNESS_DIR = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
               "ai-watermark-and-content-authenticity/implementation/services/local-engine/"
               "research/corpus-reconciliation-2026-08-29")
CORPUS_DIR = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
              "ai-watermark-and-content-authenticity/implementation/services/local-engine/"
              "research/longform-corpus")
sys.path.insert(0, HARNESS_DIR)
os.chdir(HARNESS_DIR)

import harness  # noqa: E402

OUT = sys.argv[1]

def run(path, out_fh):
    n = 0
    t0 = time.time()
    for line in open(path):
        r = json.loads(line)
        parts = harness.segment_text(r["text"], harness.count_tokens)
        probs = []
        for i in range(0, len(parts), 16):
            probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
        out_fh.write(json.dumps({
            "id": r["id"], "side": r["side"], "register": r["register"],
            "genre": r.get("genre"), "provider": r.get("provider"),
            "model": r.get("model"), "source": r.get("source"),
            "word_count": len(r["text"].split()),
            "seg_p": probs,           # FULL precision, no rounding
        }) + "\n")
        n += 1
        if n % 200 == 0:
            out_fh.flush()
            print(f"{os.path.basename(path)} {n} in {time.time()-t0:.0f}s", flush=True)
    print(f"DONE {os.path.basename(path)} {n} in {time.time()-t0:.0f}s", flush=True)

print("model sha", harness.MODEL_SHA, flush=True)
print("contract", harness.SEGMENTATION_CONTRACT, flush=True)
with open(OUT, "w") as fh:
    run(os.path.join(CORPUS_DIR, "ai-longform.jsonl"), fh)
    run(os.path.join(CORPUS_DIR, "human-longform.jsonl"), fh)

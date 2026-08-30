"""Full-precision re-score of the two short-form AI arms, 816 + 432 documents.

Same harness, same model file, same shipped operating point. The human short-form
side is a CUT of the long-form corpus (paragraph and sentence boundaries, per-source
quotas) and is not stored as a file, so it cannot be re-derived here; that is stated
wherever its cells are used.
"""
import sys, os, json, time
HARNESS_DIR = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
               "ai-watermark-and-content-authenticity/implementation/services/local-engine/"
               "research/corpus-reconciliation-2026-08-29")
DATASET = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
           "ai-watermark-and-content-authenticity/implementation/services/local-engine/"
           "research/cycle3-shortform/dataset.jsonl")
sys.path.insert(0, HARNESS_DIR); os.chdir(HARNESS_DIR)
import harness  # noqa: E402

ARMS = {"openrouter-shortform-pilot-2026-08-29": "pilot",
        "openrouter-seo-repetition-2026-08-29": "keyword-repetition"}
print("model sha", harness.MODEL_SHA, flush=True)
n = 0; t0 = time.time()
with open(sys.argv[1], "w") as out:
    for line in open(DATASET):
        r = json.loads(line)
        arm = ARMS.get(r.get("source"))
        if not arm:
            continue
        parts = harness.segment_text(r["text"], harness.count_tokens)
        probs = []
        for i in range(0, len(parts), 16):
            probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
        out.write(json.dumps({"id": r["id"], "side": "ai", "arm": arm,
                              "model": r["model"], "provider": r["provider"],
                              "prompt_style": r.get("prompt_style"),
                              "target_len": r.get("target_len"),
                              "word_count": len(r["text"].split()),
                              "seg_p": probs}) + "\n")
        n += 1
        if n % 200 == 0:
            out.flush(); print(n, f"{time.time()-t0:.0f}s", flush=True)
print("DONE", n, f"{time.time()-t0:.0f}s", flush=True)

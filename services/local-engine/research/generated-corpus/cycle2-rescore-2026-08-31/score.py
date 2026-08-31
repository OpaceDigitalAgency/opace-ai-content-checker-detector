"""Re-score the 28 August generated corpus on the SHIPPED fp32 server path.

Model: tier3-cycle2-e5small-fp32.onnx (the exact file under
reference-server/model), shipped tokeniser, temperature 0.8324, segmentation
contract segments-v3 (cut identical to v2; the v3 change is the verdict rule).
Verdict: flag when the highest section reaches 0.9855 OR the second-highest
reaches 0.9763. Nothing here moves a threshold or deploys anything.

Two jobs:
  gate  re-score a deterministic 40-document sample of the long-form corpus
        and compare segment-by-segment against the canonical fp32 store
        (corpus-reconciliation-2026-08-29/raw). If any segment differs by
        more than the store's 4 dp rounding, nothing else here is valid.
  run   score all rows of generated-corpus/generated.jsonl (usable and
        quarantined alike; the analysis filters on `usable`). Resumable.

Segment probabilities are written UNROUNDED, as score_fp32.py warns: the 4 dp
store rounds 884/922 where the truth is 883/922.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
_cwd = os.getcwd()
os.chdir(os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
import harness  # noqa: E402
os.chdir(_cwd)

GENERATED = os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")
STORE = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29", "raw")
LONGFORM = os.path.join(RESEARCH, "longform-corpus")
PRIMARY, SECONDARY = 0.9855, 0.9763


def segment_probs(text):
    parts = harness.segment_text(text, harness.count_tokens)
    probs = []
    for i in range(0, len(parts), 16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
    return probs, [p.words for p in parts]


def gate():
    store = {}
    for fn in ("lf-ai.jsonl", "lf-hu.jsonl"):
        for line in open(os.path.join(STORE, fn)):
            r = json.loads(line)
            store[r["id"]] = r["seg_p"]
    texts = {}
    for fn in ("ai-longform.jsonl", "human-longform.jsonl"):
        for line in open(os.path.join(LONGFORM, fn)):
            r = json.loads(line)
            texts[r["id"]] = r["text"]
    ids = sorted(store)
    sample = ids[:: max(1, len(ids) // 40)][:40]
    worst = 0.0
    seg_mismatch = 0
    for i in sample:
        probs, _ = segment_probs(texts[i])
        if len(probs) != len(store[i]):
            seg_mismatch += 1
            continue
        for a, b in zip(probs, store[i]):
            worst = max(worst, abs(round(a, 4) - b))
    print(f"gate: {len(sample)} documents, model sha {harness.MODEL_SHA[:16]}, "
          f"contract {harness.SEGMENTATION_CONTRACT}")
    print(f"gate: segment-count mismatches {seg_mismatch}, "
          f"worst |delta| vs 4dp store {worst:.6f}")
    assert seg_mismatch == 0 and worst <= 5e-5, "GATE FAILED"
    print("gate: PASSED")


def run():
    out_path = os.path.join(HERE, "generated-fp32.jsonl")
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            if line.strip():
                done.add(json.loads(line)["id"])
    recs = []
    for line in open(GENERATED):
        r = json.loads(line)
        if r["id"] in done:
            continue
        recs.append((r, r["text"]))
    print(f"run: {len(done)} already scored, {len(recs)} to go", flush=True)
    t0 = time.time()
    keep = ("id", "provider", "model", "model_tier", "register",
            "register_family", "prompt_style", "temperature", "length_band",
            "words", "usable", "quality_flag")
    with open(out_path, "a") as fh:
        for n, (r, text) in enumerate(recs, 1):
            probs, words = segment_probs(text)
            row = {k: r.get(k) for k in keep}
            row["seg_p"] = probs
            row["seg_words"] = words
            fh.write(json.dumps(row) + "\n")
            if n % 200 == 0:
                print(f"run {n}/{len(recs)} in {time.time()-t0:.0f}s", flush=True)
                fh.flush()
    print(f"DONE {len(recs)} in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    {"gate": gate, "run": run}[sys.argv[1]]()

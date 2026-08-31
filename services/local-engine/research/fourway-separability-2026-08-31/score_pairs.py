"""Score every row of cycle4-humaniser-pairs through the SHIPPED runtime.

Shipped configuration throughout: tier3-cycle2-e5small-fp32.onnx, segments-v3,
temperature 0.8324, pair 0.9855/0.9763. Nothing here changes a threshold.

Records per segment BOTH the calibrated probability (what the product shows)
and the raw logit margin (what the probability saturates away). The margin is
the same model output before the sigmoid; it is kept because calibrated
probabilities pin at 1.0 and would destroy the resolution a separability
question needs.
"""
import json, os, sys, time
import numpy as np

RESEARCH = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
HARNESS = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29")
PAIRS = os.path.join(RESEARCH, "cycle4-humaniser-pairs")
sys.path.insert(0, HARNESS)
_cwd = os.getcwd(); os.chdir(HARNESS)
import harness  # noqa
os.chdir(_cwd)

TEMP = harness.TEMPERATURE
KEEP = ("variant_id", "source_id", "lineage_id", "split", "class_label",
        "edit_intensity", "source_side", "register", "length_band",
        "rewriting_model", "rewriting_model_family", "generating_model",
        "generating_provider", "source_corpus", "output_word_count",
        "commercial_humaniser", "transformation_family",
        "lexical_cosine_tfidf", "four_gram_retention", "word_levenshtein_ratio")


def score_doc(text):
    parts = harness.segment_text(text, harness.count_tokens)
    margins, probs = [], []
    for i in range(0, len(parts), 16):
        chunk = [p.text for p in parts[i:i + 16]]
        enc = harness.TOKENIZER(chunk, truncation=True, max_length=512,
                                padding="max_length", return_tensors="np")
        feed = {n: enc[n].astype(np.int64) for n in harness.INPUT_NAMES if n in enc}
        logits = harness.SESSION.run(None, feed)[0]
        m = (logits[:, 1] - logits[:, 0]).astype(float)
        margins.extend(m.tolist())
        probs.extend((1.0 / (1.0 + np.exp(-m / TEMP))).tolist())
    return parts, margins, probs


def main(out_path):
    print("model sha ", harness.MODEL_SHA)
    print("segments  ", harness.SEGMENTATION_CONTRACT)
    print("temperature", TEMP, flush=True)
    seen = set()
    t0 = time.time()
    with open(out_path, "w") as out:
        n = 0
        for fname in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
                      "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
            for line in open(os.path.join(PAIRS, fname)):
                r = json.loads(line)
                assert r["variant_id"] not in seen, r["variant_id"]
                seen.add(r["variant_id"])
                assert r["commercial_humaniser"] is False
                assert r["class_label"] != "ai_original_human_edited"
                text = r["output_text"]
                parts, margins, probs = score_doc(text)
                rec = {k: r.get(k) for k in KEEP}
                rec["n_segments"] = len(parts)
                rec["segment_tokens"] = [p.tokens for p in parts]
                rec["margins"] = margins
                rec["probs"] = probs
                out.write(json.dumps(rec) + "\n")
                n += 1
                if n % 250 == 0:
                    print(f"  {n} in {time.time()-t0:.0f}s", flush=True)
        print(f"DONE {n} rows in {time.time()-t0:.0f}s")
    print("wrote", out_path)


if __name__ == "__main__":
    main(sys.argv[1])

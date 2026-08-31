"""Score corpora on the SHIPPED fp32 server route, full precision, segments-v3.

Two jobs, in one file so they cannot drift apart:

  probe    re-score the 5,558-document long-form corpus and check the four
           published shipped-point figures come out EXACTLY. If they do not,
           nothing else in this directory may be believed.
  pairs    score the cycle4-humaniser-pairs corpus (sources and variants).

Nothing here moves a threshold, writes to thresholds.json, or deploys. The
shipped pair 0.9855/0.9763 is read-only input.

Segment probabilities are kept UNROUNDED. The 4 dp segment store rounds
884/922 where the truth is 883/922; a figure built on it is wrong by a
document.
"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "corpus-reconciliation-2026-08-29"))
_here = os.getcwd()
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "corpus-reconciliation-2026-08-29"))
import harness  # noqa: E402
os.chdir(_here)

RESEARCH = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LONGFORM = os.path.join(RESEARCH, "longform-corpus")
PAIRS = os.path.join(RESEARCH, "cycle4-humaniser-pairs")
PRIMARY, SECONDARY = 0.9855, 0.9763


def segment_probs(text):
    parts = harness.segment_text(text, harness.count_tokens)
    probs = []
    for i in range(0, len(parts), 16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
    return probs, [p.words for p in parts]


def flagged(probs, primary=PRIMARY, secondary=SECONDARY):
    s = sorted(probs, reverse=True)
    if not s:
        return False
    return s[0] >= primary or (len(s) > 1 and s[1] >= secondary)


def run(records, out_path, label):
    """Resumable: rows already in `out_path` are skipped and the file is
    appended to. The machine this runs on is shared with other scoring jobs,
    and a run that cannot resume loses everything to any interruption."""
    t0 = time.time()
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            if line.strip():
                r = json.loads(line)
                done.add(r.get("id") or r.get("variant_id"))
        records = [(k, t) for k, t in records
                   if (k.get("id") or k.get("variant_id")) not in done]
        print(f"  {label}: resuming, {len(done)} already scored, {len(records)} to go", flush=True)
    n = 0
    with open(out_path, "a") as fh:
        for n, (key, text) in enumerate(records, 1):
            probs, words = segment_probs(text)
            fh.write(json.dumps({**key, "seg_p": probs, "seg_words": words}) + "\n")
            if n % 200 == 0:
                print(f"  {label} {n} in {time.time()-t0:.0f}s", flush=True)
                fh.flush()
    print(f"DONE {label} {n} in {time.time()-t0:.0f}s", flush=True)


def probe():
    recs = []
    for fn, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for line in open(os.path.join(LONGFORM, fn)):
            r = json.loads(line)
            recs.append(({"id": r["id"], "side": side, "register": r["register"],
                          "words": r["word_count"]}, r["text"]))
    run(recs, "probe-fp32.jsonl", "probe")


def pairs():
    recs = []
    seen = set()
    for fn in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
               "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
        for line in open(os.path.join(PAIRS, fn)):
            r = json.loads(line)
            vid = r["variant_id"]
            if vid in seen:
                continue
            seen.add(vid)
            # `output_text` holds the text for BOTH source rows (edit_intensity
            # "none", where `source_text` is null) and rewritten variants.
            text = r["output_text"]
            recs.append(({
                "variant_id": vid, "source_id": r["source_id"], "lineage_id": r["lineage_id"],
                "split": r["split"], "class_label": r["class_label"],
                "edit_intensity": r["edit_intensity"], "source_side": r["source_side"],
                "rewriting_model": r["rewriting_model"],
                "rewriting_model_family": r["rewriting_model_family"],
                "generating_model": r["generating_model"],
                "register": r["register"], "length_band": r["length_band"],
                "words": len(text.split()),
                "lexical_cosine_tfidf": r.get("lexical_cosine_tfidf"),
            }, text))
    run(recs, "pairs-fp32.jsonl", "pairs")


if __name__ == "__main__":
    {"probe": probe, "pairs": pairs}[sys.argv[1]]()

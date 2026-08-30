"""What per-sentence scores from the shipped classifier actually support.

Four questions, in the order the display decision depends on them:

  1. DISTRIBUTION  — how do sentence scores fall inside known-AI and known-human
     documents? If the two populations sit on top of each other, no number can
     be printed beside a sentence.
  2. SEPARATION    — sentence-level AUC, against the document-level 0.9695 the
     same detector achieves. This is the number that decides "print a
     percentage" versus "print relative intensity only".
  3. CONTRADICTION — how often does a sentence's score point the opposite way
     to its own document's label? This is the reader-harm number: it is the
     rate at which a highlight would accuse a sentence inside a document we
     called human, or exonerate one inside a document we called AI.
  4. LOCALISATION  — the one that actually licenses a highlight. Splice AI
     sentences into a human document and ask whether the highlight lands on
     them. A gradient that cannot find known-inserted machine text is
     decoration, whatever its AUC.

Nothing here re-derives a document verdict. The document verdict is the maximum
SECTION score under segments-v3 and is untouched by any of this.
"""
import json, os, sys, math, random
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCORES = os.path.join(HERE, "sentence-scores.jsonl")


def load():
    docs = []
    for line in open(SCORES):
        docs.append(json.loads(line))
    return docs


def auc(pos, neg):
    """Mann-Whitney AUC, ties counted at half."""
    pos = np.asarray(pos, dtype=float); neg = np.asarray(neg, dtype=float)
    if not len(pos) or not len(neg):
        return float("nan")
    allv = np.concatenate([pos, neg])
    order = allv.argsort()
    ranks = np.empty(len(allv), dtype=float)
    ranks[order] = np.arange(1, len(allv) + 1)
    # average ranks for ties
    _, inv, cnt = np.unique(allv, return_inverse=True, return_counts=True)
    sums = np.zeros(len(cnt)); np.add.at(sums, inv, ranks)
    ranks = (sums / cnt)[inv]
    rp = ranks[:len(pos)].sum()
    return (rp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def q(a, qs=(1, 5, 25, 50, 75, 95, 99)):
    a = np.asarray(a, dtype=float)
    return {f"p{x}": round(float(np.percentile(a, x)), 4) for x in qs}


def main():
    docs = load()
    ai = [d for d in docs if d["side"] == "ai"]
    hu = [d for d in docs if d["side"] == "human"]
    sp = lambda ds: [s["p"] for d in ds for s in d["sentences"] if s["p"] is not None]
    ai_s, hu_s = sp(ai), sp(hu)
    out = {}
    out["corpus"] = {
        "ai_documents": len(ai), "human_documents": len(hu),
        "ai_sentences_scored": len(ai_s), "human_sentences_scored": len(hu_s),
        "unscorable_short_sentences": sum(
            1 for d in docs for s in d["sentences"] if s["p"] is None),
    }
    out["distribution"] = {
        "ai_document_sentences": {"mean": round(float(np.mean(ai_s)), 4), **q(ai_s)},
        "human_document_sentences": {"mean": round(float(np.mean(hu_s)), 4), **q(hu_s)},
    }
    # 2. separation, on a balanced subsample for tractability
    rng = random.Random(20260830)
    a_s = rng.sample(ai_s, min(60000, len(ai_s)))
    h_s = rng.sample(hu_s, min(60000, len(hu_s)))
    out["separation"] = {
        "sentence_auc": round(auc(a_s, h_s), 4),
        "sentence_auc_n": [len(a_s), len(h_s)],
        "document_auc_published": 0.9695,
        "note": "AUC of a single sentence's score separating sentences drawn from AI documents "
                "from sentences drawn from human documents. Compare against the published "
                "document-level corpus_test_auroc of 0.9695 for the same detector.",
    }
    # score thresholds: what a sentence-level cut would cost
    grid = [0.5, 0.8, 0.9, 0.95, 0.98, 0.9855]
    out["separation"]["at_cut"] = {
        str(t): {
            "ai_document_sentences_at_or_above": f"{sum(1 for v in ai_s if v>=t):,}/{len(ai_s):,} ({100*sum(1 for v in ai_s if v>=t)/len(ai_s):.1f}%)",
            "human_document_sentences_at_or_above": f"{sum(1 for v in hu_s if v>=t):,}/{len(hu_s):,} ({100*sum(1 for v in hu_s if v>=t)/len(hu_s):.1f}%)",
        } for t in grid}
    # 3. contradiction
    out["contradiction"] = {
        "ai_doc_sentences_below_half": f"{sum(1 for v in ai_s if v<0.5):,}/{len(ai_s):,} ({100*sum(1 for v in ai_s if v<0.5)/len(ai_s):.1f}%)",
        "human_doc_sentences_above_flag": f"{sum(1 for v in hu_s if v>=0.9855):,}/{len(hu_s):,} ({100*sum(1 for v in hu_s if v>=0.9855)/len(hu_s):.2f}%)",
        "human_docs_with_at_least_one_sentence_above_flag": None,
        "note": "0.9855 is quoted here only as the CURRENT shipped document flag point, to show what "
                "a naive reuse of it at sentence level would do. Nothing in the shipped interface "
                "applies a document threshold to a sentence.",
    }
    n_hu_hit = sum(1 for d in hu if any(
        s["p"] is not None and s["p"] >= 0.9855 for s in d["sentences"]))
    out["contradiction"]["human_docs_with_at_least_one_sentence_above_flag"] = \
        f"{n_hu_hit:,}/{len(hu):,} ({100*n_hu_hit/len(hu):.1f}%)"
    n_ai_clean = sum(1 for d in ai if not any(
        s["p"] is not None and s["p"] >= 0.9855 for s in d["sentences"]))
    out["contradiction"]["ai_docs_with_no_sentence_above_flag"] = \
        f"{n_ai_clean:,}/{len(ai):,} ({100*n_ai_clean/len(ai):.1f}%)"
    # within-document spread — is there anything for a gradient to show?
    spreads = []
    for d in docs:
        v = [s["p"] for s in d["sentences"] if s["p"] is not None]
        if len(v) >= 10:
            spreads.append(max(v) - min(v))
    out["within_document_spread"] = {
        "documents": len(spreads), "median_max_minus_min": round(float(np.median(spreads)), 4),
        **q(spreads)}
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()

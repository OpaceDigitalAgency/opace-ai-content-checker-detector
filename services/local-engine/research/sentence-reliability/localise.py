"""Does a per-sentence highlight land on machine text that is actually there?

The construction. A sentence's score does not depend on its neighbours — each
one is its own forward pass — so a mixed document can be assembled from
sentences already scored, with no new inference and no possibility that the
splice itself moved a score.

For each trial: take a human document, take an AI document of the SAME
register, and replace a contiguous run of the human document's sentences with
the same number of AI sentences. Same register on both sides so the result
measures machine-versus-human writing rather than topic drift, which is the
mistake that makes a phrase-ratio panel print domain vocabulary.

Then ask the only question a highlight has to answer:

    if the interface highlights the k most machine-like sentences, how many of
    them are the inserted machine ones?

precision@k, where k is the number of sentences actually inserted. A random
highlight scores the AI share of the document (0.25 at the default mix). A
useful one scores far above it. This is reported beside the within-document
AUC, because AUC over a whole ranking flatters a display that only ever shows
the top of it.
"""
import json, os, random, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCORES = os.path.join(HERE, "sentence-scores.jsonl")
AI_SHARE = 0.25
TRIALS = 2000
MIN_SENTENCES = 24


def auc(pos, neg):
    pos = np.asarray(pos, float); neg = np.asarray(neg, float)
    if not len(pos) or not len(neg):
        return float("nan")
    allv = np.concatenate([pos, neg]); order = allv.argsort()
    ranks = np.empty(len(allv), float); ranks[order] = np.arange(1, len(allv) + 1)
    _, inv, cnt = np.unique(allv, return_inverse=True, return_counts=True)
    sums = np.zeros(len(cnt)); np.add.at(sums, inv, ranks); ranks = (sums / cnt)[inv]
    return (ranks[:len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def main():
    by_side_reg = {}
    for line in open(SCORES):
        d = json.loads(line)
        v = [s["p"] for s in d["sentences"] if s["p"] is not None]
        if len(v) < MIN_SENTENCES:
            continue
        by_side_reg.setdefault((d["side"], d["register"]), []).append(v)

    regs = sorted({r for (side, r) in by_side_reg
                   if ("ai", r) in by_side_reg and ("human", r) in by_side_reg})
    rng = random.Random(20260830)
    rows = []
    for _ in range(TRIALS):
        reg = rng.choice(regs)
        hu = rng.choice(by_side_reg[("human", reg)])
        ai = rng.choice(by_side_reg[("ai", reg)])
        k = max(1, int(round(len(hu) * AI_SHARE)))
        if k > len(ai):
            continue
        at = rng.randrange(0, len(hu) - k + 1)
        ai_run = ai[rng.randrange(0, len(ai) - k + 1):][:k]
        mixed = hu[:at] + ai_run + hu[at + k:]
        label = [0] * at + [1] * k + [0] * (len(hu) - at - k)
        order = sorted(range(len(mixed)), key=lambda i: -mixed[i])
        topk = order[:k]
        rows.append({
            "register": reg,
            "precision_at_k": sum(label[i] for i in topk) / k,
            "auc": auc([mixed[i] for i in range(len(mixed)) if label[i]],
                       [mixed[i] for i in range(len(mixed)) if not label[i]]),
            "top1_is_ai": label[order[0]],
            "ai_share": k / len(mixed),
        })

    p = np.array([r["precision_at_k"] for r in rows])
    a = np.array([r["auc"] for r in rows])
    t1 = np.array([r["top1_is_ai"] for r in rows], float)
    base = np.array([r["ai_share"] for r in rows])
    out = {
        "trials": len(rows),
        "construction": f"human document with a contiguous {int(AI_SHARE*100)}% run of its sentences "
                        f"replaced by AI sentences of the same register",
        "chance_precision_at_k": round(float(base.mean()), 4),
        "precision_at_k": {"mean": round(float(p.mean()), 4),
                           "median": round(float(np.median(p)), 4),
                           "p10": round(float(np.percentile(p, 10)), 4),
                           "p90": round(float(np.percentile(p, 90)), 4)},
        "within_document_auc": {"mean": round(float(np.nanmean(a)), 4),
                                "median": round(float(np.nanmedian(a)), 4),
                                "p10": round(float(np.nanpercentile(a, 10)), 4)},
        "top_ranked_sentence_is_inserted_ai": f"{int(t1.sum())}/{len(t1)} ({100*t1.mean():.1f}%)",
        "by_register": {},
    }
    for reg in regs:
        sel = [r for r in rows if r["register"] == reg]
        if len(sel) < 30:
            out["by_register"][reg] = f"n below 30 ({len(sel)}) — no rate quoted"
            continue
        pp = np.array([r["precision_at_k"] for r in sel])
        bb = np.array([r["ai_share"] for r in sel])
        out["by_register"][reg] = {
            "trials": len(sel),
            "precision_at_k": round(float(pp.mean()), 4),
            "chance": round(float(bb.mean()), 4),
        }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()

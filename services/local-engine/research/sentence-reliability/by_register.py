"""Per-register separation at SENTENCE level and at SECTION level, with intervals.

Written to answer a specific challenge: whether the per-sentence signal is
INVERTED in journalism and fiction. The figures that prompted it were
precision@k against a 0.25 chance baseline, not AUROC against 0.5, so this file
computes the AUROC explicitly, per register, with a bootstrap interval and its
n, so the question is settled by the statistic it was asked about.

Three cuts:
  sentence_auc_within_register  one sentence, AI-document sentences against
                                human-document sentences of the SAME register
  within_document_auc           the ranking a highlight actually uses: inside one
                                spliced document, inserted AI sentences against
                                the human sentences around them
  section_auc_within_register   the same question at SECTION level, from the
                                existing full-corpus document re-score, because
                                if the section signal inverted anywhere that is
                                a far bigger finding than any highlight layer
"""
import json, os, random, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.abspath(os.path.join(HERE, "..", "corpus-reconciliation-2026-08-29", "raw"))
SCORES = os.environ.get("SENTENCE_SCORES", os.path.join(HERE, "sentence-scores.jsonl"))


def auc(pos, neg):
    pos = np.asarray(pos, float); neg = np.asarray(neg, float)
    if len(pos) < 2 or len(neg) < 2:
        return float("nan")
    allv = np.concatenate([pos, neg]); order = allv.argsort()
    ranks = np.empty(len(allv), float); ranks[order] = np.arange(1, len(allv) + 1)
    _, inv, cnt = np.unique(allv, return_inverse=True, return_counts=True)
    sums = np.zeros(len(cnt)); np.add.at(sums, inv, ranks); ranks = (sums / cnt)[inv]
    return (ranks[:len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def boot_ci(pos, neg, n=300, seed=7):
    rng = np.random.default_rng(seed)
    pos = np.asarray(pos, float); neg = np.asarray(neg, float)
    vals = []
    for _ in range(n):
        vals.append(auc(rng.choice(pos, len(pos)), rng.choice(neg, len(neg))))
    return float(np.nanpercentile(vals, 2.5)), float(np.nanpercentile(vals, 97.5))


def main():
    # ---- sentence level, per register
    per = {}
    for line in open(SCORES):
        d = json.loads(line)
        v = [s["p"] for s in d["sentences"] if s["p"] is not None]
        if not v:
            continue
        per.setdefault(d["register"], {"ai": [], "human": [], "ai_docs": [], "human_docs": []})
        per[d["register"]][d["side"]].extend(v)
        per[d["register"]][f"{d['side']}_docs"].append(v)

    rng = random.Random(20260830)
    out = {"sentence_level_by_register": {}, "within_document_by_register": {},
           "section_level_by_register": {}}
    CAP = 25000
    for reg, v in sorted(per.items()):
        if len(v["ai"]) < 200 or len(v["human"]) < 200:
            out["sentence_level_by_register"][reg] = f"n too small (ai {len(v['ai'])}, human {len(v['human'])})"
            continue
        a = rng.sample(v["ai"], min(CAP, len(v["ai"])))
        h = rng.sample(v["human"], min(CAP, len(v["human"])))
        lo, hi = boot_ci(a, h)
        out["sentence_level_by_register"][reg] = {
            "auc": round(auc(a, h), 4), "ci95": [round(lo, 4), round(hi, 4)],
            "n_ai_sentences": len(v["ai"]), "n_human_sentences": len(v["human"]),
            "reading": "above 0.5 = higher-scoring sentences are more likely machine",
        }
        # ---- within-document, spliced
        aucs, precs = [], []
        ad, hd = v["ai_docs"], v["human_docs"]
        if len(ad) >= 5 and len(hd) >= 5:
            for _ in range(600):
                hu = rng.choice(hd); ai = rng.choice(ad)
                if len(hu) < 24 or len(ai) < 8:
                    continue
                k = max(1, int(round(len(hu) * 0.25)))
                if k > len(ai):
                    continue
                at = rng.randrange(0, len(hu) - k + 1)
                run = ai[rng.randrange(0, len(ai) - k + 1):][:k]
                mixed = hu[:at] + run + hu[at + k:]
                lab = [0] * at + [1] * k + [0] * (len(hu) - at - k)
                aucs.append(auc([mixed[i] for i in range(len(mixed)) if lab[i]],
                                [mixed[i] for i in range(len(mixed)) if not lab[i]]))
                order = sorted(range(len(mixed)), key=lambda i: -mixed[i])[:k]
                precs.append(sum(lab[i] for i in order) / k)
        if len(aucs) >= 30:
            arr = np.array(aucs, float)
            out["within_document_by_register"][reg] = {
                "trials": len(aucs),
                "mean_auc": round(float(np.nanmean(arr)), 4),
                "auc_ci95_of_mean": [round(float(np.nanpercentile(arr, 2.5)), 4),
                                     round(float(np.nanpercentile(arr, 97.5)), 4)],
                "share_of_trials_below_0.5": round(float(np.mean(arr < 0.5)), 4),
                "mean_precision_at_k": round(float(np.mean(precs)), 4),
                "chance_precision_at_k": 0.25,
            }

    # ---- section level, from the existing full-corpus re-score
    sec = {}
    for name, side in (("lf-ai.jsonl", "ai"), ("lf-hu.jsonl", "human")):
        p = os.path.join(RAW, name)
        if not os.path.exists(p):
            continue
        for line in open(p):
            d = json.loads(line)
            if not d.get("seg_p"):
                continue
            sec.setdefault(d["register"], {"ai": [], "human": []})[side].extend(d["seg_p"])
    for reg, v in sorted(sec.items()):
        if len(v["ai"]) < 100 or len(v["human"]) < 100:
            out["section_level_by_register"][reg] = f"n too small (ai {len(v['ai'])}, human {len(v['human'])})"
            continue
        lo, hi = boot_ci(v["ai"], v["human"])
        out["section_level_by_register"][reg] = {
            "auc": round(auc(v["ai"], v["human"]), 4), "ci95": [round(lo, 4), round(hi, 4)],
            "n_ai_sections": len(v["ai"]), "n_human_sections": len(v["human"]),
        }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()

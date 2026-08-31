"""What a four-way verdict would cost in false labels.

The shipped tool operates at 45/4,636 = 1.0% human false positives. A verdict
that says "but AI edited" about a document is an accusation of the same kind, so
it has to be judged at the same discipline: hold the rate at which PURE HUMAN
writing is wrongly told it was AI-edited, and read off how much genuinely
AI-edited writing is caught there.
"""
import json, os, sys, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyse import (features, softmax_fit, softmax_pred, auroc,
                     doc_scalar_margin, wilson, PAIRS)

rows = [json.loads(l) for l in open(sys.argv[1])]
extra = {}
for f in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
          "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
    for line in open(os.path.join(PAIRS, f)):
        r = json.loads(line)
        extra[r["variant_id"]] = r

OUT = {}


def budget_table(name, pos_rows, neg_rows, score):
    """neg = the class that must not be wrongly labelled; pos = the class we
    want to catch."""
    neg = np.array(sorted(score(r) for r in neg_rows))
    print(f"\n  {name}   (n pure-human {len(neg)}, n edited {len(pos_rows)})")
    print(f"    {'false-label budget':>20s} {'threshold':>11s} {'caught':>18s} {'rate':>8s}")
    rec = {}
    for b in (0.01, 0.02, 0.05, 0.10, 0.20):
        k = int(np.ceil((1 - b) * len(neg))) - 1
        k = min(max(k, 0), len(neg) - 1)
        t = neg[k]
        hit = sum(1 for r in pos_rows if score(r) > t)
        lo, hi = wilson(hit, len(pos_rows))
        print(f"    {100*b:17.0f}%  {t:11.3f} {hit:8d}/{len(pos_rows):<8d} "
              f"{100*hit/len(pos_rows):6.1f}%  [{100*lo:.1f}-{100*hi:.1f}]")
        rec[f"{b}"] = {"threshold": float(t), "caught": hit,
                       "n": len(pos_rows), "rate": hit / len(pos_rows),
                       "ci95": [lo, hi]}
    return rec


by = collections.defaultdict(list)
for r in rows:
    by[r["class_label"]].append(r)

print("=" * 78)
print("A. On the SHIPPED document score, all splits (the scalar the product has)")
print("=" * 78)
OUT["shipped_scalar_all"] = budget_table(
    "human vs human+AIedit, all intensities",
    by["human_original_ai_edited"], by["human_original"], doc_scalar_margin)
for it in ("light", "medium", "heavy"):
    OUT[f"shipped_scalar_{it}"] = budget_table(
        f"human vs human+AIedit, {it} only",
        [r for r in by["human_original_ai_edited"] if r["edit_intensity"] == it],
        by["human_original"], doc_scalar_margin)

print("\n" + "=" * 78)
print("B. On a PROBE trained on the pairs, evaluated on the three HELD-OUT")
print("   splits only (group-aware: no source appears in both sides)")
print("=" * 78)
for arm, use_extra in (("A: shipped model outputs + length", False),
                       ("B: A + document-only surface features", True)):
    order = ["human_original", "human_original_ai_edited"]
    idx = {c: i for i, c in enumerate(order)}
    sel = [r for r in rows if r["class_label"] in order]
    X, y, sp = [], [], []
    for r in sel:
        f, _ = features(r, extra[r["variant_id"]] if use_extra else None)
        X.append(f); y.append(idx[r["class_label"]]); sp.append(r["split"])
    X = np.asarray(X, float); y = np.asarray(y); sp = np.asarray(sp)
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Xs = (X - mu) / sd
    tr = sp == "train"
    W, b = softmax_fit(Xs[tr], y[tr], 2)
    ho = ~tr
    P = softmax_pred(Xs[ho], W, b)[:, 1]
    hor = [r for r, m in zip(sel, ho) if m]
    yh = y[ho]
    print(f"\n  arm {arm}")
    print(f"    held-out AUROC {auroc(P[yh == 1], P[yh == 0]):.3f} "
          f"(n human {int((yh==0).sum())}, n edited {int((yh==1).sum())})")
    sc = {id(r): float(p) for r, p in zip(hor, P)}
    OUT[f"probe_{arm[0]}_all"] = budget_table(
        "human vs human+AIedit, held-out, all intensities",
        [r for r, t in zip(hor, yh) if t == 1], [r for r, t in zip(hor, yh) if t == 0],
        lambda r: sc[id(r)])
    for it in ("light", "medium", "heavy"):
        OUT[f"probe_{arm[0]}_{it}"] = budget_table(
            f"human vs human+AIedit, held-out, {it} only",
            [r for r, t in zip(hor, yh) if t == 1 and r["edit_intensity"] == it],
            [r for r, t in zip(hor, yh) if t == 0],
            lambda r: sc[id(r)])

print("\n" + "=" * 78)
print("C. The other label: separating AI+rewrite from pure AI")
print("=" * 78)
OUT["ai_side_shipped"] = budget_table(
    "pure AI wrongly called 'AI, rewritten' vs AI+rewrite caught",
    by["ai_original_neural_rewrite"], by["ai_original"], doc_scalar_margin)

json.dump(OUT, open(sys.argv[2], "w"), indent=1)
print("\nwrote", sys.argv[2])

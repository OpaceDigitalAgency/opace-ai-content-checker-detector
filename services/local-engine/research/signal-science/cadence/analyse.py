"""Measure whether the cadence signals earn a place beside the trained model.

The question is never "does this fire on AI". It is "does it fire on the AI the
model MISSES while staying quiet on the human text the model correctly clears".
Everything below reports that conditional ratio alongside the unconditional one.

Gates are set at the 95th percentile of the HUMAN distribution of each signal,
computed on the same population the signal is evaluated on. That is an in-sample
gate and it is stated as such; it is chosen so that no signal can ship with a
threshold no real text reaches, which is the failure mode this project has hit
three times.
"""

from __future__ import annotations

import json
import math
import os
import random
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cadence import SIGNAL_NAMES  # noqa: E402

THRESHOLD = 0.984
FEATS = os.path.join(HERE, "cadence-features.jsonl")

PARA_SIGNALS = {"template_repetition_z", "micro_compression",
                "instructional_closing", "artificial_closure",
                "low_opening_diversity"}


def load():
    return [json.loads(l) for l in open(FEATS)]


def finite(rows, key):
    return [r for r in rows
            if isinstance(r.get(key), (int, float)) and not math.isnan(r[key])]


def auroc(pos, neg):
    if not pos or not neg:
        return float("nan")
    xs = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    ranks, i = {}, 0
    vals = [v for v, _ in xs]
    r = [0.0] * len(xs)
    while i < len(xs):
        j = i
        while j + 1 < len(xs) and vals[j + 1] == vals[i]:
            j += 1
        avg = (i + j) / 2.0 + 1
        for k in range(i, j + 1):
            r[k] = avg
        i = j + 1
    s = sum(r[k] for k in range(len(xs)) if xs[k][1] == 1)
    n1, n0 = len(pos), len(neg)
    return (s - n1 * (n1 + 1) / 2) / (n1 * n0)


def wilson(k, n):
    if n == 0:
        return (float("nan"), float("nan"))
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (100 * (c - h), 100 * (c + h))


def pct(vals, q):
    v = sorted(vals)
    if not v:
        return float("nan")
    i = min(len(v) - 1, max(0, int(round(q * (len(v) - 1)))))
    return v[i]


def table_fire(rows, keys, label):
    print(f"\n### {label}")
    print(f"{'signal':28s} {'gate':>9s} {'AI fires':>16s} {'human fires':>18s} {'LR':>7s}")
    gates = {}
    for k in keys:
        rs = finite(rows, k)
        ai = [r[k] for r in rs if r["side"] == "ai"]
        hu = [r[k] for r in rs if r["side"] == "human"]
        if not ai or not hu:
            continue
        g = pct(hu, 0.95)
        gates[k] = g
        a = sum(1 for v in ai if v >= g)
        h = sum(1 for v in hu if v >= g)
        ra, rh = a / len(ai), h / len(hu)
        lr = ra / rh if rh else float("inf")
        print(f"{k:28s} {g:9.3f} {a:5d}/{len(ai):<5d}={ra*100:5.2f}% "
              f"{h:5d}/{len(hu):<5d}={rh*100:5.2f}% {lr:7.2f}")
    return gates


def table_conditional(rows, keys, gates, label):
    miss = [r for r in rows if r["side"] == "ai" and r["p_max"] < THRESHOLD]
    clear = [r for r in rows if r["side"] == "human" and r["p_max"] < THRESHOLD]
    print(f"\n### {label}  (misses n={len(miss)}, cleared humans n={len(clear)})")
    print(f"{'signal':28s} {'on misses':>16s} {'on cleared humans':>20s} {'ratio':>7s} "
          f"{'AUROC':>7s}")
    for k in keys:
        if k not in gates:
            continue
        m = finite(miss, k)
        c = finite(clear, k)
        if not m or not c:
            continue
        g = gates[k]
        a = sum(1 for r in m if r[k] >= g)
        h = sum(1 for r in c if r[k] >= g)
        ra, rh = a / len(m), h / len(c)
        lr = ra / rh if rh else float("inf")
        au = auroc([r[k] for r in m], [r[k] for r in c])
        print(f"{k:28s} {a:3d}/{len(m):<4d}={ra*100:6.2f}% "
              f"{h:5d}/{len(c):<5d}={rh*100:5.2f}% {lr:7.2f} {au:7.3f}")


def logistic_fit(X, y, iters=4000, lr=0.5, l2=1e-3):
    X = np.asarray(X, dtype=float)
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Xs = np.hstack([(X - mu) / sd, np.ones((len(X), 1))])
    w = np.zeros(Xs.shape[1])
    y = np.asarray(y, dtype=float)
    for _ in range(iters):
        p = 1 / (1 + np.exp(-np.clip(Xs @ w, -30, 30)))
        g = Xs.T @ (p - y) / len(y) + l2 * np.r_[w[:-1], 0.0]
        w -= lr * g
    return w, mu, sd


def logistic_apply(X, w, mu, sd):
    X = np.asarray(X, dtype=float)
    Xs = np.hstack([(X - mu) / sd, np.ones((len(X), 1))])
    return 1 / (1 + np.exp(-np.clip(Xs @ w, -30, 30)))


def matrix(rows, keys, medians):
    return [[r[k] if isinstance(r.get(k), (int, float)) and not math.isnan(r[k])
             else medians[k] for k in keys] for r in rows]


def main():
    rows = load()
    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    print(f"corpus: {len(rows)} documents, {len(ai)} AI, {len(hu)} human")
    print(f"paragraph markup present: AI {sum(r['has_paragraph_markup'] for r in ai)}"
          f"/{len(ai)}, human {sum(r['has_paragraph_markup'] for r in hu)}/{len(hu)}")

    keys = [k for k in SIGNAL_NAMES]
    sentence_keys = [k for k in keys if k not in PARA_SIGNALS]

    # ---- Track A: every document, signals that need no paragraph markup ----
    g_all = table_fire(rows, sentence_keys,
                       "Track A — all 5,558 documents, paragraph-free signals")
    table_conditional(rows, sentence_keys, g_all, "Track A conditional")

    # ---- Track B: paragraph-bearing documents only, all signals ----
    pb = [r for r in rows if r["has_paragraph_markup"]]
    print(f"\nparagraph-bearing subset: {len(pb)} documents, "
          f"{sum(1 for r in pb if r['side']=='ai')} AI, "
          f"{sum(1 for r in pb if r['side']=='human')} human")
    g_pb = table_fire(pb, keys, "Track B — paragraph-bearing documents, all signals")
    table_conditional(pb, keys, g_pb, "Track B conditional")

    # ---- positional weighting ----
    print("\n### Does weighting introductions and the final 20% help?")
    print(f"{'signal':34s} {'AUROC whole':>12s} {'intro':>8s} {'tail':>8s} "
          f"{'AUROC cond whole':>17s} {'cond intro':>11s} {'cond tail':>10s}")
    miss = [r for r in pb if r["side"] == "ai" and r["p_max"] < THRESHOLD]
    clear = [r for r in pb if r["side"] == "human" and r["p_max"] < THRESHOLD]
    for base in ("instructional_closing", "assertive_utility", "low_messiness",
                 "enumeration_density", "micro_compression"):
        cells = []
        for pre in ("", "intro__", "tail__"):
            k = pre + base
            a = [r[k] for r in finite(pb, k) if r["side"] == "ai"]
            h = [r[k] for r in finite(pb, k) if r["side"] == "human"]
            cells.append(auroc(a, h))
        for pre in ("", "intro__", "tail__"):
            k = pre + base
            cells.append(auroc([r[k] for r in finite(miss, k)],
                               [r[k] for r in finite(clear, k)]))
        print(f"{base:34s} " + " ".join(f"{c:11.3f}" for c in cells))

    # ---- combined score ----
    print("\n### Combined score")
    medians = {}
    for k in keys:
        v = [r[k] for r in finite(rows, k)]
        medians[k] = sorted(v)[len(v) // 2] if v else 0.0

    for label, pop, kk in (("Track A (all docs, paragraph-free signals)", rows, sentence_keys),
                           ("Track B (paragraph-bearing, all signals)", pb, keys)):
        X = matrix(pop, kk, medians)
        y = [1 if r["side"] == "ai" else 0 for r in pop]
        # split-half cross-validation, 50 splits
        rng = random.Random(11)
        idx = list(range(len(pop)))
        au_full, au_cond = [], []
        for _ in range(50):
            rng.shuffle(idx)
            half = len(idx) // 2
            tr, te = idx[:half], idx[half:]
            w, mu, sd = logistic_fit([X[i] for i in tr], [y[i] for i in tr])
            s = logistic_apply([X[i] for i in te], w, mu, sd)
            pos = [s[j] for j, i in enumerate(te) if y[i] == 1]
            neg = [s[j] for j, i in enumerate(te) if y[i] == 0]
            au_full.append(auroc(pos, neg))
            mpos = [s[j] for j, i in enumerate(te)
                    if y[i] == 1 and pop[i]["p_max"] < THRESHOLD]
            mneg = [s[j] for j, i in enumerate(te)
                    if y[i] == 0 and pop[i]["p_max"] < THRESHOLD]
            au_cond.append(auroc(mpos, mneg))
        print(f"{label}: held-out AUROC AI vs human "
              f"{np.mean(au_full):.3f} (sd {np.std(au_full):.3f}); "
              f"held-out AUROC misses vs cleared humans "
              f"{np.nanmean(au_cond):.3f} (sd {np.nanstd(au_cond):.3f})")

    # in-sample full fit for the escalation experiment (stated as in-sample)
    X = matrix(rows, sentence_keys, medians)
    y = [1 if r["side"] == "ai" else 0 for r in rows]
    w, mu, sd = logistic_fit(X, y)
    score = logistic_apply(X, w, mu, sd)
    for r, s in zip(rows, score):
        r["cadence"] = float(s)

    Xb = matrix(pb, keys, medians)
    yb = [1 if r["side"] == "ai" else 0 for r in pb]
    wb, mub, sdb = logistic_fit(Xb, yb)
    sb = logistic_apply(Xb, wb, mub, sdb)
    for r, s in zip(pb, sb):
        r["cadence_b"] = float(s)

    print("\n### Narrow escalation: flag when p_max is in the band AND cadence >= gate")
    print("(cadence gate at the 95th and 99th percentile of cleared human documents)")
    clearedh = [r for r in rows if r["side"] == "human" and r["p_max"] < THRESHOLD]
    for q in (0.95, 0.99):
        g = pct([r["cadence"] for r in clearedh], q)
        for lo in (0.80, 0.90, 0.95, 0.97):
            gained = [r for r in rows if r["side"] == "ai"
                      and lo <= r["p_max"] < THRESHOLD and r["cadence"] >= g]
            costed = [r for r in rows if r["side"] == "human"
                      and lo <= r["p_max"] < THRESHOLD and r["cadence"] >= g]
            print(f"  gate q={q:.2f} band {lo:.2f}-0.984: "
                  f"+{len(gained)} AI, +{len(costed)} human false positives "
                  f"-> {(877+len(gained))}/922 = {(877+len(gained))/922*100:.2f}%, "
                  f"{(56+len(costed))}/4636 = {(56+len(costed))/4636*100:.2f}%")

    print("\n### Per-register cost of the widest escalation (band 0.80, gate q=0.99)")
    g = pct([r["cadence"] for r in clearedh], 0.99)
    regs = sorted(set(r["register"] for r in hu))
    print(f"{'register':26s} {'shipped':>14s} {'escalated':>14s}")
    for reg in regs:
        rr = [r for r in hu if r["register"] == reg]
        base = sum(1 for r in rr if r["p_max"] >= THRESHOLD)
        extra = sum(1 for r in rr if 0.80 <= r["p_max"] < THRESHOLD and r["cadence"] >= g)
        print(f"{reg:26s} {base:4d}/{len(rr):<5d}={base/len(rr)*100:5.2f}% "
              f"{base+extra:4d}/{len(rr):<5d}={(base+extra)/len(rr)*100:5.2f}%")

    with open(os.path.join(HERE, "cadence-scored.jsonl"), "w") as fo:
        for r in rows:
            fo.write(json.dumps({k: r[k] for k in
                                 ("id", "side", "register", "p_max", "cadence",
                                  "has_paragraph_markup")}) + "\n")

    # ---- prompt-style breakdown: is anti-AI-instructed AI different? ----
    print("\n### AI by prompt style (house-brief and human-voice are the corpus's"
          " anti-AI-instruction analogues)")
    for style in ("plain", "house-brief", "human-voice"):
        ss = [r for r in ai if r.get("prompt_style") == style]
        mm = [r for r in ss if r["p_max"] < THRESHOLD]
        print(f"  {style:12s} n={len(ss):3d} missed={len(mm):2d} "
              f"median cadence={np.nanmedian([r['cadence'] for r in ss]):.3f} "
              f"median low_banned_markers="
              f"{np.nanmedian([r['low_banned_markers'] for r in ss]):.3f}")
    print(f"  {'human':12s} n={len(hu):4d} "
          f"median cadence={np.nanmedian([r['cadence'] for r in hu]):.3f} "
          f"median low_banned_markers="
          f"{np.nanmedian([r['low_banned_markers'] for r in hu]):.3f}")

    json.dump({"sentence_keys": sentence_keys, "keys": keys,
               "gates_all": g_all, "gates_pb": g_pb,
               "w": list(w), "mu": list(mu), "sd": list(sd),
               "medians": medians},
              open(os.path.join(HERE, "cadence-model.json"), "w"), indent=1)


if __name__ == "__main__":
    main()

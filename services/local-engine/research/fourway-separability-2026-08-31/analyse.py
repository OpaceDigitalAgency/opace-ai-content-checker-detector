"""Can the four-way verdict be supported? Separability of three (four) classes.

Reads pair-scores.jsonl (shipped runtime, segments-v3, temperature 0.8324,
pair 0.9855/0.9763) and answers:

  1. pairwise AUROC with n and cluster-bootstrap intervals, clustered on
     lineage_id, because 1,702 variants come from only 600 sources and an
     unclustered interval on 2,302 rows would be a lie about the sample size;
  2. whether the PAIRED shift is consistent — does a specific document's score
     move in a consistent direction and magnitude when rewritten;
  3. the confusion the best achievable boundary on the shipped scalar gives;
  4. whether a probe trained on the pairs, with group-aware splits, does better.

Everything measured here describes an LLM asked to reword a text. No commercial
humaniser was used.
"""
import json, os, sys, math, collections
import numpy as np

RESEARCH = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
PAIRS = os.path.join(RESEARCH, "cycle4-humaniser-pairs")
RNG = np.random.default_rng(20260831)
NBOOT = 2000
PRIMARY, SECONDARY = 0.9855, 0.9763

CLASSES = ["human_original", "human_original_ai_edited",
           "ai_original_neural_rewrite", "ai_original"]
SHORT = {"human_original": "human", "human_original_ai_edited": "human+AIedit",
         "ai_original_neural_rewrite": "AI+rewrite", "ai_original": "AI"}


# ---------------------------------------------------------------- statistics
def auroc(pos, neg):
    """Mann-Whitney AUROC, ties at 0.5."""
    pos = np.asarray(pos, float); neg = np.asarray(neg, float)
    if len(pos) == 0 or len(neg) == 0:
        return float("nan")
    allv = np.concatenate([pos, neg])
    order = allv.argsort(kind="mergesort")
    ranks = np.empty(len(allv), float)
    sortv = allv[order]
    i = 0
    while i < len(sortv):
        j = i
        while j + 1 < len(sortv) and sortv[j + 1] == sortv[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    rp = ranks[:len(pos)].sum()
    return (rp - len(pos) * (len(pos) + 1) / 2.0) / (len(pos) * len(neg))


def cluster_boot_auroc(rows, key_pos, key_neg, scorefn, nboot=NBOOT):
    """Bootstrap AUROC resampling LINEAGES, not rows."""
    by_lin = collections.defaultdict(list)
    for r in rows:
        by_lin[r["lineage_id"]].append(r)
    lins = list(by_lin)
    out = []
    for _ in range(nboot):
        pick = RNG.choice(len(lins), len(lins), replace=True)
        pos, neg = [], []
        for idx in pick:
            for r in by_lin[lins[idx]]:
                if r["class_label"] == key_pos:
                    pos.append(scorefn(r))
                elif r["class_label"] == key_neg:
                    neg.append(scorefn(r))
        if pos and neg:
            out.append(auroc(pos, neg))
    if not out:
        return (float("nan"), float("nan"))
    return (float(np.percentile(out, 2.5)), float(np.percentile(out, 97.5)))


def boot_median_ci(vals, groups, nboot=NBOOT):
    by = collections.defaultdict(list)
    for v, g in zip(vals, groups):
        by[g].append(v)
    ks = list(by)
    med = []
    for _ in range(nboot):
        pick = RNG.choice(len(ks), len(ks), replace=True)
        s = [x for i in pick for x in by[ks[i]]]
        med.append(np.median(s))
    return float(np.percentile(med, 2.5)), float(np.percentile(med, 97.5))


def wilson(k, n):
    if n == 0:
        return (float("nan"), float("nan"))
    p, z = k / n, 1.959964
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


# ---------------------------------------------------------------- features
def doc_scalar_prob(r):
    """The score the product uses: highest section's calibrated probability."""
    return max(r["probs"]) if r["probs"] else 0.0


def doc_scalar_margin(r):
    """Same quantity before the sigmoid. Monotone with the above, but the
    calibrated probability saturates at 1.0 and destroys resolution."""
    return max(r["margins"]) if r["margins"] else -50.0


def flagged(r):
    s = sorted(r["probs"], reverse=True)
    if not s:
        return False
    return s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY)


def features(r, extra):
    m = np.asarray(r["margins"], float)
    if len(m) == 0:
        m = np.array([-50.0])
    s = np.sort(m)[::-1]
    second = s[1] if len(s) > 1 else s[0]
    thr_p = math.log(PRIMARY / (1 - PRIMARY)) * 0.8324
    thr_s = math.log(SECONDARY / (1 - SECONDARY)) * 0.8324
    f = [s[0], second, float(m.mean()), float(m.min()), float(m.std()),
         float(np.median(m)), s[0] - float(m.mean()), s[0] - float(m.min()),
         float((m >= thr_p).mean()), float((m >= thr_s).mean()),
         float(len(m)), math.log(max(r["output_word_count"], 1))]
    names = ["max", "second", "mean", "min", "std", "median", "max-mean",
             "range", "frac>=primary", "frac>=secondary", "n_segments", "log_words"]
    if extra is not None:
        e = extra
        f += [e.get("ttr_output") or 0.0, e.get("mattr_output") or 0.0,
              e.get("adjacent_cohesion_output") or 0.0,
              float(e.get("sentence_count_output") or 0),
              (r["output_word_count"] / max(e.get("sentence_count_output") or 1, 1))]
        names += ["ttr", "mattr", "cohesion", "n_sentences", "words_per_sentence"]
    return f, names


# ---------------------------------------------------------------- probe
def softmax_fit(X, y, ncls, l2=1.0, iters=600, lr=0.5):
    n, d = X.shape
    W = np.zeros((d, ncls)); b = np.zeros(ncls)
    Y = np.zeros((n, ncls)); Y[np.arange(n), y] = 1.0
    # class weights so an unbalanced class count cannot fake accuracy
    cnt = Y.sum(0); w = (n / (ncls * np.maximum(cnt, 1)))[y][:, None]
    for _ in range(iters):
        Z = X @ W + b
        Z -= Z.max(1, keepdims=True)
        P = np.exp(Z); P /= P.sum(1, keepdims=True)
        G = (P - Y) * w
        W -= lr * (X.T @ G / n + l2 * W / n)
        b -= lr * G.mean(0)
    return W, b


def softmax_pred(X, W, b):
    Z = X @ W + b
    Z -= Z.max(1, keepdims=True)
    P = np.exp(Z)
    return P / P.sum(1, keepdims=True)


def balanced_acc(ytrue, ypred, ncls):
    accs = []
    for c in range(ncls):
        m = ytrue == c
        if m.sum():
            accs.append(float((ypred[m] == c).mean()))
    return float(np.mean(accs)), accs


def confusion(ytrue, ypred, ncls):
    M = np.zeros((ncls, ncls), int)
    for t, p in zip(ytrue, ypred):
        M[t, p] += 1
    return M


# ---------------------------------------------------------------- best cuts
def best_ordered_cuts(scores, labels, order):
    """Best achievable ordered boundary on ONE scalar, maximising balanced
    accuracy — solved exactly, not on a grid.

    Cutting a sorted axis into k contiguous bins and assigning bin i to class
    order[i] is a 1-D partition problem. Balanced accuracy decomposes as
    sum_i (class-i items landing in bin i) / n_i, so with prefix counts the
    best cut for each bin boundary is a running prefix maximum and the whole
    optimum falls out in O(k*m). A grid search over triples would be both
    slower and only approximate.
    """
    order = list(order)
    k = len(order)
    idx = {c: i for i, c in enumerate(order)}
    y = np.array([idx[l] for l in labels])
    s = np.asarray(scores, float)
    o = np.argsort(s, kind="mergesort")
    ys = y[o]
    m = len(s)
    # prefix counts C[j][a] = number of class-j items among the first a sorted
    C = np.zeros((k, m + 1), float)
    for j in range(k):
        C[j, 1:] = np.cumsum(ys == j)
    n = np.array([max((y == j).sum(), 1) for j in range(k)], float)

    NEG = -1e18
    best = np.full((k + 1, m + 1), NEG)
    arg = np.zeros((k + 1, m + 1), int)
    best[0, 0] = 0.0
    for j in range(k):
        run, runa = NEG, 0
        for b in range(m + 1):
            cand = best[j, b] - C[j, b] / n[j]
            if cand > run:
                run, runa = cand, b
            if run > NEG / 2:
                best[j + 1, b] = run + C[j, b] / n[j]
                arg[j + 1, b] = runa
    ba = best[k, m] / k
    # backtrack the cut positions in sorted-index space
    cutsi = [m]
    b = m
    for j in range(k, 0, -1):
        b = arg[j, b]
        cutsi.append(b)
    cutsi = cutsi[::-1]
    pred_sorted = np.zeros(m, int)
    for j in range(k):
        pred_sorted[cutsi[j]:cutsi[j + 1]] = j
    pred = np.zeros(m, int)
    pred[o] = pred_sorted
    ss = np.sort(s)
    cuts = tuple(float(ss[c]) if 0 < c < m else (float("-inf") if c == 0 else float("inf"))
                 for c in cutsi[1:k])
    return float(ba), cuts, confusion(y, pred, k), y, pred



# ---------------------------------------------------------------- main
def main(scores_path, out_json):
    rows = [json.loads(l) for l in open(scores_path)]
    extra = {}
    for f in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
              "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
        for line in open(os.path.join(PAIRS, f)):
            r = json.loads(line)
            extra[r["variant_id"]] = r
    for r in rows:
        assert r["commercial_humaniser"] is False
        assert r["transformation_family"] == "generic_llm_rewrite"
        assert r["class_label"] in CLASSES
    R = {"note": "Every figure describes an LLM asked to reword a text "
                 "(transformation_family=generic_llm_rewrite, commercial_humaniser=false "
                 "on all %d rows). No commercial humaniser output was measured." % len(rows),
         "runtime": {"model": "tier3-cycle2-e5small-fp32.onnx",
                     "segmentation": "segments-v3", "temperature": 0.8324,
                     "pair": [PRIMARY, SECONDARY]},
         "n_rows": len(rows), "n_lineages": len({r["lineage_id"] for r in rows})}

    by_cls = collections.defaultdict(list)
    for r in rows:
        by_cls[r["class_label"]].append(r)

    # ---- 0. what the shipped verdict already does to each class
    print("\n=== 0. SHIPPED VERDICT, per class (pair %.4f/%.4f) ===" % (PRIMARY, SECONDARY))
    R["shipped_flag_rate"] = {}
    for c in CLASSES:
        rs = by_cls[c]
        k = sum(1 for r in rs if flagged(r))
        lo, hi = wilson(k, len(rs))
        p = [doc_scalar_prob(r) for r in rs]
        print(f"  {SHORT[c]:14s} n={len(rs):4d}  flagged {k:4d} = {100*k/len(rs):5.1f}% "
              f"[{100*lo:.1f}–{100*hi:.1f}]   median score {np.median(p):.4f}")
        R["shipped_flag_rate"][c] = {"n": len(rs), "flagged": k,
                                     "rate": k / len(rs), "ci95": [lo, hi],
                                     "median_score": float(np.median(p))}

    R["shipped_flag_rate_by_intensity"] = {}
    print("\n  by edit intensity:")
    for c in ("ai_original_neural_rewrite", "human_original_ai_edited"):
        for it in ("light", "medium", "heavy"):
            rs = [r for r in by_cls[c] if r["edit_intensity"] == it]
            k = sum(1 for r in rs if flagged(r))
            lo, hi = wilson(k, len(rs))
            print(f"    {SHORT[c]:14s} {it:7s} n={len(rs):4d}  flagged {k:4d} = "
                  f"{100*k/len(rs):5.1f}% [{100*lo:.1f}–{100*hi:.1f}]")
            R["shipped_flag_rate_by_intensity"][f"{c}/{it}"] = {
                "n": len(rs), "flagged": k, "rate": k / len(rs), "ci95": [lo, hi]}

    # ---- 1. pairwise AUROC on the shipped scalar
    print("\n=== 1. PAIRWISE AUROC on the shipped document score ===")
    print("    (highest-section score; cluster-bootstrap 95%% CI over %d lineages)" % R["n_lineages"])
    R["pairwise_auroc"] = {}
    contrasts = [(a, b) for i, a in enumerate(CLASSES) for b in CLASSES[i + 1:]]
    for a, b in contrasts:
        pos = [doc_scalar_margin(r) for r in by_cls[b]]
        neg = [doc_scalar_margin(r) for r in by_cls[a]]
        A = auroc(pos, neg)
        lo, hi = cluster_boot_auroc(rows, b, a, doc_scalar_margin)
        print(f"  {SHORT[a]:>14s} vs {SHORT[b]:<14s} n={len(neg):4d}/{len(pos):<4d} "
              f"AUROC {A:.3f} [{lo:.3f}–{hi:.3f}]")
        R["pairwise_auroc"][f"{a}|{b}"] = {"n_a": len(neg), "n_b": len(pos),
                                           "auroc": float(A), "ci95": [lo, hi]}

    print("\n  the contrast the four-way verdict actually needs, by intensity:")
    R["pairwise_auroc_by_intensity"] = {}
    for a, b, lab in (("ai_original_neural_rewrite", "ai_original", "AI+rewrite vs pure AI"),
                      ("human_original", "human_original_ai_edited", "human vs human+AIedit")):
        for it in ("light", "medium", "heavy"):
            ra = [r for r in by_cls[a] if r["edit_intensity"] in (it, "none")]
            rb = [r for r in by_cls[b] if r["edit_intensity"] in (it, "none")]
            A = auroc([doc_scalar_margin(r) for r in rb], [doc_scalar_margin(r) for r in ra])
            sub = ra + rb
            lo, hi = cluster_boot_auroc(sub, b, a, doc_scalar_margin, nboot=800)
            print(f"    {lab:26s} {it:7s} n={len(ra):4d}/{len(rb):<4d} "
                  f"AUROC {A:.3f} [{lo:.3f}–{hi:.3f}]")
            R["pairwise_auroc_by_intensity"][f"{a}|{b}|{it}"] = {
                "n_a": len(ra), "n_b": len(rb), "auroc": float(A), "ci95": [lo, hi]}
    return R, rows, by_cls, extra


def part2(R, rows, by_cls, extra):
    # ---- 2. THE PAIRING: does a specific document move consistently?
    print("\n=== 2. PAIRED SHIFT — does a SPECIFIC document move consistently? ===")
    orig = {}
    for r in rows:
        if r["edit_intensity"] == "none":
            orig[r["lineage_id"]] = r
    R["paired_shift"] = {}
    for side, cls in (("ai", "ai_original_neural_rewrite"),
                      ("human", "human_original_ai_edited")):
        for it in ("light", "medium", "heavy"):
            d_marg, d_prob, groups, flips = [], [], [], []
            for r in by_cls[cls]:
                if r["edit_intensity"] != it:
                    continue
                o = orig.get(r["lineage_id"])
                if o is None:
                    continue
                d_marg.append(doc_scalar_margin(r) - doc_scalar_margin(o))
                d_prob.append(doc_scalar_prob(r) - doc_scalar_prob(o))
                groups.append(r["lineage_id"])
                flips.append((flagged(o), flagged(r)))
            if not d_marg:
                continue
            d = np.array(d_marg)
            med = float(np.median(d))
            direction = "down" if med < 0 else "up"
            same = float((d < 0).mean() if med < 0 else (d > 0).mean())
            lo, hi = boot_median_ci(d_marg, groups, nboot=1000)
            q1, q3 = np.percentile(d, [25, 75])
            fl = sum(1 for a, b in flips if a and not b)
            fg = sum(1 for a, b in flips if not a and b)
            was = sum(1 for a, b in flips if a)
            print(f"  {side:6s} {it:7s} n={len(d):4d}  median Δmargin {med:+7.3f} "
                  f"[{lo:+.3f},{hi:+.3f}]  IQR [{q1:+.2f},{q3:+.2f}]  "
                  f"moves {direction} in {100*same:.1f}% of pairs   "
                  f"flag lost {fl}/{was}, gained {fg}")
            R["paired_shift"][f"{side}/{it}"] = {
                "n_pairs": len(d), "median_delta_margin": med,
                "median_ci95": [lo, hi], "iqr": [float(q1), float(q3)],
                "direction": direction, "sign_consistency": same,
                "median_delta_prob": float(np.median(d_prob)),
                "flag_lost": fl, "flag_was_set": was, "flag_gained": fg}

    print("\n  A shift is a usable signal only if it is both large and consistent.")
    print("  Sign consistency at 50% is a coin toss; the scale of Δmargin is the")
    print("  same logit scale on which the flag point sits at %.3f."
          % (math.log(PRIMARY / (1 - PRIMARY)) * 0.8324))

    # ---- 3. best achievable boundary on the shipped scalar
    print("\n=== 3. BEST ACHIEVABLE BOUNDARY on the shipped scalar ===")
    print("    (an oracle: cuts fitted on the SAME data they are scored on — an")
    print("     upper bound no shippable rule could beat)")
    R["best_boundary"] = {}
    for name, order in (
        ("three-class (the task's question)",
         ["human_original", "ai_original_neural_rewrite", "ai_original"]),
        ("four-way (the owner's ask)",
         ["human_original", "human_original_ai_edited",
          "ai_original_neural_rewrite", "ai_original"]),
    ):
        sel = [r for r in rows if r["class_label"] in order]
        s = [doc_scalar_margin(r) for r in sel]
        lab = [r["class_label"] for r in sel]
        ba, cuts, M, ytrue, ypred = best_ordered_cuts(s, lab, order)
        chance = 1.0 / len(order)
        print(f"\n  {name}: best balanced accuracy {100*ba:.1f}%  (chance {100*chance:.1f}%)")
        print("    confusion (rows = truth, cols = predicted), order "
              + " < ".join(SHORT[c] for c in order))
        hdr = "".join(f"{SHORT[c]:>14s}" for c in order)
        print("      " + " " * 14 + hdr)
        for i, c in enumerate(order):
            print(f"      {SHORT[c]:>14s}" + "".join(f"{M[i][j]:14d}" for j in range(len(order))))
        per = [float((ypred[ytrue == i] == i).mean()) for i in range(len(order))]
        for i, c in enumerate(order):
            print(f"      recall {SHORT[c]:>14s} {100*per[i]:5.1f}%  (n={int(M[i].sum())})")
        # Permutation null: the SAME oracle procedure on shuffled labels. An
        # oracle that fits its cuts on the data it scores beats chance even on
        # noise, so chance is the wrong reference and this is the right one.
        nulls = []
        for _ in range(200):
            perm = list(lab)
            RNG.shuffle(perm)
            nb, _, _, _, _ = best_ordered_cuts(s, perm, order)
            nulls.append(nb)
        n95 = float(np.percentile(nulls, 95))
        print(f"    permutation null for this procedure and these class sizes: "
              f"median {100*float(np.median(nulls)):.1f}%, 95th pct {100*n95:.1f}%")
        print(f"    -> the oracle beats its own null by "
              f"{100*(ba - float(np.median(nulls))):+.1f} points")
        R["best_boundary"][name] = {
            "order": order, "balanced_accuracy": float(ba), "chance": chance,
            "cuts_margin": [float(x) for x in cuts],
            "confusion": M.tolist(), "per_class_recall": per,
            "permutation_null_median": float(np.median(nulls)),
            "permutation_null_p95": n95,
            "caveat": "oracle cuts fitted on the same data they are scored on"}
    return R


def part3(R, rows, by_cls, extra):
    # ---- 4. a probe trained on the pairs, group-aware
    print("\n=== 4. PROBE trained on the pairs (group-aware splits) ===")
    print("    Not a shippable model. The question is only whether a classifier")
    print("    on top of existing features could do what one scalar cannot.")
    R["probe"] = {}

    for arm_name, use_extra in (("A: shipped model outputs + length", False),
                                ("B: A + document-only surface features", True)):
        print(f"\n  --- arm {arm_name} ---")
        for task_name, order in (
            ("three-class", ["human_original", "ai_original_neural_rewrite", "ai_original"]),
            ("four-way", ["human_original", "human_original_ai_edited",
                          "ai_original_neural_rewrite", "ai_original"]),
            ("the load-bearing binary: AI+rewrite vs pure AI",
             ["ai_original_neural_rewrite", "ai_original"]),
            ("the other load-bearing binary: human vs human+AIedit",
             ["human_original", "human_original_ai_edited"]),
        ):
            idx = {c: i for i, c in enumerate(order)}
            sel = [r for r in rows if r["class_label"] in order]
            X, y, g, sp, names = [], [], [], [], None
            for r in sel:
                f, names = features(r, extra[r["variant_id"]] if use_extra else None)
                X.append(f); y.append(idx[r["class_label"]])
                g.append(r["lineage_id"]); sp.append(r["split"])
            X = np.asarray(X, float); y = np.asarray(y); sp = np.asarray(sp)
            mu, sd = X.mean(0), X.std(0) + 1e-9
            tr = sp == "train"
            Xs = (X - mu) / sd
            W, b = softmax_fit(Xs[tr], y[tr], len(order))
            res = {}
            for split in ("train", "heldout_source", "heldout_rewriter", "heldout_register"):
                m = sp == split
                P = softmax_pred(Xs[m], W, b)
                pred = P.argmax(1)
                ba, per = balanced_acc(y[m], pred, len(order))
                M = confusion(y[m], pred, len(order))
                res[split] = {"n": int(m.sum()), "balanced_accuracy": ba,
                              "per_class_recall": per, "confusion": M.tolist()}
                if len(order) == 2:
                    A = auroc(P[y[m] == 1, 1], P[y[m] == 0, 1])
                    res[split]["auroc"] = float(A)
            chance = 1.0 / len(order)
            line = "  ".join(f"{s.replace('heldout_','ho-'):>10s} {100*res[s]['balanced_accuracy']:5.1f}%"
                             for s in ("train", "heldout_source", "heldout_rewriter", "heldout_register"))
            print(f"    {task_name:48s} chance {100*chance:4.1f}%")
            print(f"      balanced accuracy:  {line}")
            if len(order) == 2:
                al = "  ".join(f"{s.replace('heldout_','ho-'):>10s} {res[s]['auroc']:.3f}"
                               for s in ("train", "heldout_source", "heldout_rewriter", "heldout_register"))
                print(f"      AUROC:              {al}")
            R["probe"][f"{arm_name}|{task_name}"] = {
                "order": order, "chance": chance, "features": names, "splits": res}

    # held-out totals pooled, for the headline
    print("\n  Pooled across the three held-out splits (n unseen by the probe):")
    R["probe_pooled_heldout"] = {}
    for arm_name, use_extra in (("A", False), ("B", True)):
        for task_name, order in (
            ("three-class", ["human_original", "ai_original_neural_rewrite", "ai_original"]),
            ("four-way", ["human_original", "human_original_ai_edited",
                          "ai_original_neural_rewrite", "ai_original"]),
            ("AI+rewrite vs pure AI", ["ai_original_neural_rewrite", "ai_original"]),
            ("human vs human+AIedit", ["human_original", "human_original_ai_edited"]),
        ):
            k = f"{arm_name}: shipped outputs + length|{task_name}" if arm_name == "A" else None
            key = [kk for kk in R["probe"] if kk.endswith("|" + task_name)
                   and kk.startswith(arm_name + ":")][0]
            sp = R["probe"][key]["splits"]
            M = np.zeros((len(order), len(order)), int)
            for s in ("heldout_source", "heldout_rewriter", "heldout_register"):
                M += np.array(sp[s]["confusion"])
            per = [float(M[i, i] / M[i].sum()) if M[i].sum() else float("nan")
                   for i in range(len(order))]
            ba = float(np.nanmean(per))
            n = int(M.sum())
            print(f"    arm {arm_name}  {task_name:24s} n={n:4d}  balanced accuracy "
                  f"{100*ba:5.1f}%  (chance {100/len(order):4.1f}%)   recalls "
                  + ", ".join(f"{SHORT[c]} {100*per[i]:.0f}%" for i, c in enumerate(order)))
            R["probe_pooled_heldout"][f"{arm_name}|{task_name}"] = {
                "n": n, "balanced_accuracy": ba, "per_class_recall": per,
                "confusion": M.tolist(), "order": order}
    return R


if __name__ == "__main__":
    R, rows, by_cls, extra = main(sys.argv[1], sys.argv[2])
    R = part2(R, rows, by_cls, extra)
    R = part3(R, rows, by_cls, extra)
    json.dump(R, open(sys.argv[2], "w"), indent=1)
    print("\nwrote", sys.argv[2])

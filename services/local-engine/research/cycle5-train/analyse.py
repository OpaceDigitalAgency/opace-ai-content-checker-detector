"""Cycle-5 evaluation battery analysis. Reads scores/ and writes results-<tag>.json
plus a printed report. Every figure carries its denominator.

Verdict rule, margin space (cycle-4 lesson: the secondary is fitted in MARGIN
space, never pinned to a probability ratio):

    flag  <=>  max(m1, m2 + g) >= a

For the shipped model the shipped probability pair (0.9855/0.9763) is applied
as deployed. For a candidate, two pairs are reported:
  * matched-FP pair: g swept, a solved exactly so long-form human false
    positives on the EVAL VIEW equal the shipped model's count on the same
    view; g chosen to maximise long-form detection (ties: larger g, lower a).
  * shipped-prob pair: the deployed 0.9855/0.9763 applied to the candidate's
    calibrated probabilities — answers "swap the model, change nothing else".

EVAL VIEW: long-form docs whose text entered cycle-5 train/cal (directly or
as the source of a trained rewrite) are excluded via eval-exclusions.json.
Both full-corpus and eval-view figures are printed; the eval view is the
honest headline.
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCORES = os.path.join(HERE, "scores")
PRIMARY, SECONDARY = 0.9855, 0.9763
LOGIT = lambda p: math.log(p / (1 - p))


def load(tag, name):
    p = os.path.join(SCORES, f"{tag}-{name}.jsonl")
    return [json.loads(l) for l in open(p)] if os.path.exists(p) else []


def flagged_prob(seg_p, pri=PRIMARY, sec=SECONDARY):
    s = sorted(seg_p, reverse=True)
    if not s:
        return False
    return s[0] >= pri or (len(s) > 1 and s[1] >= sec)


def key_margin(seg_m, g):
    s = sorted(seg_m, reverse=True)
    if not s:
        return -1e9
    k = s[0]
    if len(s) > 1:
        k = max(k, s[1] + g)
    return k


def flagged_margin(seg_m, a, g):
    return key_margin(seg_m, g) >= a


def wilson(k, n):
    if n == 0:
        return (0.0, 0.0)
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def cell(k, n):
    if not n:
        return "-"
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100*k/n:5.1f}% [{lo:.1f}, {hi:.1f}]"


def _fit_once(new_hu_m, target_fp, new_ai_m, grid):
    best = None
    for g in grid:
        keys = sorted((key_margin(m, g) for m in new_hu_m), reverse=True)
        if target_fp >= len(keys):
            a = keys[-1] - 1e-6
        else:
            a = keys[target_fp] + 1e-9
        fp = sum(1 for k in keys if k >= a)
        det = sum(1 for m in new_ai_m if flagged_margin(m, a, g))
        cand = (det, g, -a, fp)
        if best is None or cand > best:
            best = cand
    det, g, neg_a, fp = best
    return {"a": round(-neg_a, 6), "g": round(g, 3), "fp": fp, "det": det}


def fit_matched_fp(new_hu_m, target_fp, new_ai_m):
    """Sweep the margin gap over the cycle-4 grid (0..2.0 step 0.02 — an
    unbounded gap degenerates into 'any two segments' and prices
    single-segment documents out entirely); solve the primary exactly per
    gap; maximise AI detection subject to FP count <= target on the same
    human rows. A split-half stability check reports whether the fitted gap
    is data or noise, as cycle 4's fit did."""
    grid = [x / 100 for x in range(0, 201, 2)]
    fit = _fit_once(new_hu_m, target_fp, new_ai_m, grid)
    import random
    rng = random.Random(20260831)
    idx = list(range(len(new_hu_m)))
    rng.shuffle(idx)
    half = len(idx) // 2
    gaps = []
    for sel in (idx[:half], idx[half:]):
        hu = [new_hu_m[i] for i in sel]
        gaps.append(_fit_once(hu, max(1, target_fp // 2), new_ai_m, grid)["g"])
    fit["split_half_gaps"] = gaps
    return fit


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", required=True, help="score tag of the candidate")
    ap.add_argument("--old", default="old")
    ap.add_argument("--label", default=None)
    a = ap.parse_args()
    NEW = a.new
    label = a.label or NEW

    excl = json.load(open(os.path.join(HERE, "eval-exclusions.json")))
    ex_hashes = set(excl["longform_norm_hashes"])
    ex_ids = set(x for x in excl["longform_source_row_ids"] if x)

    res = {"candidate": label, "exclusions": {"hashes": len(ex_hashes), "ids": len(ex_ids)}}

    # The stored norm_sha256 on the measurement sets uses a DIFFERENT
    # normalisation than eval-exclusions.json (whitespace-lower vs NFKC
    # nonword-strip), so the exclusion hash is recomputed from the text with
    # the same function that wrote the exclusion file. A silent mismatch here
    # would un-exclude every contaminated document and flatter the result.
    import sys as _sys
    _sys.path.insert(0, HERE)
    from prepare_data import norm_sha as _norm_sha

    def eval_view(rows, meta):
        keep, dropped = [], 0
        meta_by = {m["id"]: m for m in meta}
        for r in rows:
            mm = meta_by.get(r["id"], {})
            h = _norm_sha(mm["text"]) if mm.get("text") else None
            if r["id"] in ex_ids or (h and h in ex_hashes):
                dropped += 1
                continue
            r = dict(r)
            r.setdefault("genre", mm.get("genre"))
            r.setdefault("register", mm.get("register"))
            keep.append(r)
        return keep, dropped

    lf_meta_hu = [json.loads(l) for l in open(os.path.join(HERE, "c3sets", "lf-hu.jsonl"))]
    lf_meta_ai = [json.loads(l) for l in open(os.path.join(HERE, "c3sets", "lf-ai.jsonl"))]

    old_hu, old_ai = load(a.old, "lf-hu"), load(a.old, "lf-ai")
    new_hu, new_ai = load(NEW, "lf-hu"), load(NEW, "lf-ai")
    assert len(old_hu) == 4636 and len(old_ai) == 922, \
        f"old scores incomplete: {len(old_hu)}/{len(old_ai)}"
    assert len(new_hu) == 4636 and len(new_ai) == 922, \
        f"new scores incomplete: {len(new_hu)}/{len(new_ai)}"

    # ---- harness proof: shipped scores must reproduce the published pair
    o_det = sum(flagged_prob(r["seg_p"]) for r in old_ai)
    o_fp = sum(flagged_prob(r["seg_p"]) for r in old_hu)
    print(f"HARNESS PROOF  shipped pair on full corpus: AI {o_det}/922 "
          f"(published 883), human {o_fp}/4636 (published 45)")
    res["harness_proof"] = {"ai": o_det, "human_fp": o_fp,
                            "published": {"ai": 883, "human_fp": 45},
                            "pass": bool(o_det == 883 and o_fp == 45)}

    # ---- eval views
    ev_old_hu, d1 = eval_view(old_hu, lf_meta_hu)
    ev_old_ai, d2 = eval_view(old_ai, lf_meta_ai)
    ev_new_hu, _ = eval_view(new_hu, lf_meta_hu)
    ev_new_ai, _ = eval_view(new_ai, lf_meta_ai)
    print(f"eval view: human {len(ev_old_hu)}/4636 (dropped {d1}), "
          f"AI {len(ev_old_ai)}/922 (dropped {d2})")
    res["eval_view"] = {"human": len(ev_old_hu), "ai": len(ev_old_ai),
                        "dropped_human": d1, "dropped_ai": d2}

    # ---- operating points for the candidate
    target = sum(flagged_prob(r["seg_p"]) for r in ev_old_hu)
    fit = fit_matched_fp([r["seg_m"] for r in ev_new_hu], target,
                         [r["seg_m"] for r in ev_new_ai])
    A, G = fit["a"], fit["g"]
    res["refit_margin_pair"] = {**fit, "target_fp": target,
                                "rule": "flag iff max(m1, m2+g) >= a"}
    print(f"\nrefitted margin pair on eval view: a={A} g={G} "
          f"(FP {fit['fp']} vs shipped {target}); shipped-prob pair also reported")

    def f_old(r):
        return flagged_prob(r["seg_p"])

    def f_new(r):
        return flagged_margin(r["seg_m"], A, G)

    def f_new_shipped(r):
        return flagged_prob(r["seg_p"])

    def table(title, olds, news, keyfn, res_key):
        rows_out = {}
        print(f"\n{title}")
        o_by, n_by = collections.defaultdict(list), collections.defaultdict(list)
        for r in olds:
            o_by[keyfn(r)].append(r)
        for r in news:
            n_by[keyfn(r)].append(r)
        print(f"  {'group':<26} {'shipped model':<30} {'cycle5 refit':<30} {'cycle5 @shipped-pair':<30}")
        for k in sorted(o_by, key=lambda x: -len(o_by[x])):
            o, nn = o_by[k], n_by.get(k, [])
            row = {"n": len(o), "old": sum(map(f_old, o)),
                   "new_refit": sum(map(f_new, nn)),
                   "new_shipped_pair": sum(map(f_new_shipped, nn))}
            rows_out[str(k)] = row
            print(f"  {str(k):<26} {cell(row['old'], len(o)):<30} "
                  f"{cell(row['new_refit'], len(nn)):<30} "
                  f"{cell(row['new_shipped_pair'], len(nn)):<30}")
        res[res_key] = rows_out
        return rows_out

    # ---- GATE 1: long-form
    print("\n" + "=" * 100)
    print("GATE 1  LONG-FORM (5,558 corpus, eval view; shipped pair vs refitted margin pair)")
    n = len(ev_old_ai)
    r1 = {"old": sum(map(f_old, ev_old_ai)), "new": sum(map(f_new, ev_new_ai)),
          "new_shipped_pair": sum(map(f_new_shipped, ev_new_ai)), "n": n}
    print(f"  AI detection : old {cell(r1['old'], n)}  new(refit) {cell(r1['new'], n)}  "
          f"new(shipped pair) {cell(r1['new_shipped_pair'], n)}")
    nh = len(ev_old_hu)
    r1h = {"old": sum(map(f_old, ev_old_hu)), "new": sum(map(f_new, ev_new_hu)),
           "new_shipped_pair": sum(map(f_new_shipped, ev_new_hu)), "n": nh}
    print(f"  human FP     : old {cell(r1h['old'], nh)}  new(refit) {cell(r1h['new'], nh)}  "
          f"new(shipped pair) {cell(r1h['new_shipped_pair'], nh)}")
    res["gate1_longform"] = {"ai": r1, "human": r1h}
    table("  AI detection by register:", ev_old_ai, ev_new_ai,
          lambda r: r.get("register"), "gate1_by_register")
    table("  human FP by genre:", ev_old_hu, ev_new_hu,
          lambda r: r.get("genre"), "gate1_fp_by_genre")

    def lband(r):
        w = r.get("n_words") or 0
        for lo, hi, nm in ((0, 600, "<600"), (600, 850, "600-849"),
                           (850, 1200, "850-1199"), (1200, 2000, "1200-1999")):
            if lo <= w < hi:
                return nm
        return ">=2000"
    table("  AI detection by length band:", ev_old_ai, ev_new_ai, lband,
          "gate1_by_length")

    # ---- GATE 2: matched-pairs held-out slice
    m_ai, m_hu = load(NEW, "matched-eval-ai"), load(NEW, "matched-eval-humans")
    mo_ai, mo_hu = load(a.old, "matched-eval-ai"), load(a.old, "matched-eval-humans")
    print("\n" + "=" * 100)
    print(f"GATE 2  MATCHED PAIRS HELD-OUT SLICE (first independent evasion "
          f"measurement): {len(m_ai)} AI, {len(m_hu)} human")
    if m_ai:
        table("  AI detection by held-out reason:", mo_ai, m_ai,
              lambda r: r.get("heldout_reason"), "gate2_by_reason")
        table("  AI detection by model family:", mo_ai, m_ai,
              lambda r: r.get("model_family"), "gate2_by_family")
        table("  human partners FP (topic-bucket docs):", mo_hu, m_hu,
              lambda r: "heldout-topic-humans", "gate2_humans")

    # ---- GATE 3: short-form curve
    sf_o, sf_n = load(a.old, "ai-shortform"), load(NEW, "ai-shortform")
    hs_o, hs_n = load(a.old, "human-shortform-widened"), load(NEW, "human-shortform-widened")
    # a handful of trained rewrites cite short-form human sources; drop those
    # passages from the FP measurement the same way the long-form docs are
    n_hs0 = len(hs_n)
    hs_o = [r for r in hs_o if r["id"] not in ex_ids]
    hs_n = [r for r in hs_n if r["id"] not in ex_ids]
    if len(hs_n) != n_hs0:
        print(f"  (short-form human FP set: {n_hs0 - len(hs_n)} contaminated "
              f"passages excluded)")
    print("\n" + "=" * 100)
    print("GATE 3  SHORT-FORM (cycle-4 killer: must not collapse)")
    held = lambda rows: [r for r in rows if r.get("split") == "test"]
    table("  AI by target length, HELD-OUT test split:", held(sf_o), held(sf_n),
          lambda r: r.get("target_len"), "gate3_ai_by_len_test")
    table("  AI by target length, ALL:", sf_o, sf_n,
          lambda r: r.get("target_len"), "gate3_ai_by_len_all")
    hs_held = lambda rows: [r for r in rows if r.get("split") in ("test", "never-trained")]
    table("  human short-form FP (held-out sources):", hs_held(hs_o), hs_held(hs_n),
          lambda r: r.get("target_len"), "gate3_hu_by_len")

    # ---- GATE 4: score spread (criterion 2) on long-form doc scores
    def doc_p(r):
        return max(r["seg_p"]) if r["seg_p"] else 0.0
    p_all = np.array([doc_p(r) for r in ev_new_ai + ev_new_hu])
    p_ai = np.array([doc_p(r) for r in ev_new_ai])
    p_hu = np.array([doc_p(r) for r in ev_new_hu])
    p_all_old = np.array([doc_p(r) for r in ev_old_ai + ev_old_hu])
    sp = {"sd_all": round(float(p_all.std()), 4),
          "sd_all_shipped": round(float(p_all_old.std()), 4),
          "ai_median": round(float(np.median(p_ai)), 4),
          "human_median": round(float(np.median(p_hu)), 4),
          "frac_in_0.80_0.90": round(float(((p_all >= .8) & (p_all <= .9)).mean()), 4),
          "decile_ai": [int(x) for x in np.histogram(p_ai, 10, (0, 1))[0]],
          "decile_human": [int(x) for x in np.histogram(p_hu, 10, (0, 1))[0]],
          "pass": bool(p_all.std() >= 0.20 and ((p_all >= .8) & (p_all <= .9)).mean() < 0.25)}
    res["gate4_spread"] = sp
    print("\n" + "=" * 100)
    print(f"GATE 4  SCORE SPREAD (doc = max segment prob, eval view): {json.dumps(sp)}")

    # ---- GATE 5: fiction + academic FP
    print("\n" + "=" * 100)
    print("GATE 5  SENSITIVE HUMAN GENRES")
    fic_o = [r for r in ev_old_hu if r.get("genre") == "story"]
    fic_n = [r for r in ev_new_hu if r.get("genre") == "story"]
    acad_g = ("academic-discussion", "academic-introduction", "academic-conclusion",
              "academic-lit-review", "student-essay", "research-summary")
    ac_o = [r for r in ev_old_hu if r.get("genre") in acad_g]
    ac_n = [r for r in ev_new_hu if r.get("genre") in acad_g]
    res["gate5"] = {
        "fiction_fp": {"n": len(fic_n), "old": sum(map(f_old, fic_o)),
                       "new": sum(map(f_new, fic_n))},
        "academic_fp": {"n": len(ac_n), "old": sum(map(f_old, ac_o)),
                        "new": sum(map(f_new, ac_n))}}
    print(f"  human fiction FP : old {cell(sum(map(f_old, fic_o)), len(fic_o))}  "
          f"new {cell(sum(map(f_new, fic_n)), len(fic_n))}")
    print(f"  human academic FP: old {cell(sum(map(f_old, ac_o)), len(ac_o))}  "
          f"new {cell(sum(map(f_new, ac_n)), len(ac_n))}")

    # ---- pairs held-out (humaniser robustness, held-out rewriter/register/source)
    ph_o, ph_n = load(a.old, "pairs-heldout"), load(NEW, "pairs-heldout")
    if ph_n:
        print("\n" + "=" * 100)
        print("HUMANISER PAIRS HELD-OUT (source/rewriter/register axes)")
        table("  by class/intensity:", ph_o, ph_n,
              lambda r: f"{r.get('class_label')}/{r.get('edit_intensity')}",
              "pairs_by_class")
        rw = [r for r in ph_n if r.get("class_label") == "ai_original_neural_rewrite"]
        rw_o = [r for r in ph_o if r.get("class_label") == "ai_original_neural_rewrite"]
        table("  AI rewrites by held-out axis:", rw_o, rw,
              lambda r: r.get("heldout_axis"), "pairs_rewrites_by_axis")

    # ---- the nine
    n9o, n9n = load(a.old, "nine"), load(NEW, "nine")
    if n9n:
        print("\nTHE NINE (owner samples):")
        for o, r in zip(sorted(n9o, key=lambda x: x["id"]),
                        sorted(n9n, key=lambda x: x["id"])):
            print(f"  {r['id']:<36} {r['side']:<6} old={'FLAG' if f_old(o) else '  - '} "
                  f"new={'FLAG' if f_new(r) else '  - '} maxp={max(r['seg_p']):.3f}")
        res["nine"] = {r["id"]: {"side": r["side"], "flag_new": f_new(r),
                                 "max_p": round(max(r["seg_p"]), 4)} for r in n9n}

    out = os.path.join(HERE, f"results-{label}.json")
    json.dump(res, open(out, "w"), indent=1)
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()

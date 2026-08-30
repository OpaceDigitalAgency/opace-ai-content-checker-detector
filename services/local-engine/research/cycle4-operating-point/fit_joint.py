"""Fit ONE operating point that serves BOTH runtimes, and report what it costs
on each of them.

Why this exists
---------------
HANDOVER §4.4 and §12 make a shared flag point binding: a tool that reaches a
different verdict depending on which route happened to run is worse than one
slightly miscalibrated. The shipped pair was fitted that way. Cycle 4a's pair
was not - it was fitted on the fp32 server route alone, and the browser int8
runtime has never had an operating point fitted for any model in this
programme.

The fit
-------
The minimum-evidence rule flags a document when its highest section reaches the
primary OR its second-highest reaches the secondary. With the secondary pinned
to the shipped RATIO of the primary (0.9763 / 0.9855 = 0.9906646...), that rule
is exactly

    flag  <=>  max(p_1, p_2 / ratio) >= primary

so each document reduces to a single scalar KEY and the operating point is a
quantile of the key distribution rather than a search. That is the same
identity `cycle4-fiction/measure.py` uses; it is restated here because the
joint fit needs it per runtime.

The constraint is the one thresholds.json records for the shipped pair:
**neither route may end with more human false positives than its own baseline**
(the shipped model at the shipped pair, on that runtime). Take the lowest
primary satisfying the constraint on each route, then take the MAXIMUM of the
two - the binding route sets the pair, and the other route is carried, because
a single pair is the requirement and per-route parameters are forbidden.

No figure here is quoted without its denominator and its runtime.
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import os

SHIPPED_PRIMARY, SHIPPED_SECONDARY = 0.9855, 0.9763
RATIO = SHIPPED_SECONDARY / SHIPPED_PRIMARY


def load(path):
    return [json.loads(l) for l in open(path)]


def key(seg_p, ratio=RATIO):
    """The scalar the minimum-evidence rule actually thresholds."""
    ps = sorted(seg_p, reverse=True)
    if not ps:
        return 0.0
    k = ps[0]
    if len(ps) > 1:
        k = max(k, ps[1] / ratio)
    return k


def flagged(seg_p, primary, secondary=None):
    ps = sorted(seg_p, reverse=True)
    if not ps:
        return False
    if secondary is None:
        return key(seg_p) >= primary
    return ps[0] >= primary or (len(ps) > 1 and ps[1] >= secondary)


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def cell(k, n):
    if not n:
        return "-"
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100*k/n:5.2f}% [{lo:.1f}, {hi:.1f}]"


def mcnemar(a, b):
    b01 = sum(1 for x, y in zip(a, b) if x and not y)
    b10 = sum(1 for x, y in zip(a, b) if y and not x)
    n = b01 + b10
    if n == 0:
        return b01, b10, 1.0
    k = min(b01, b10)
    p = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n) * 2
    return b01, b10, min(1.0, p)


def lowest_primary_for(human_rows, target_fp):
    """Lowest primary, ratio preserved, whose false-positive count is <= target.

    Reported per route for context. It is NOT the joint answer: it is the
    unrounded quantile, and both members of the shipped pair are quoted to six
    decimals, so the pair that actually ships has to be checked AFTER rounding.
    """
    keys = sorted((key(r["seg_p"]) for r in human_rows), reverse=True)
    if target_fp >= len(keys):
        return 0.0
    return keys[target_fp] + 1e-9


def joint_pair(human_by_route, targets):
    """Lowest SIX-DECIMAL primary, ratio preserved, meeting every route's target.

    Rounding matters and is not a detail. Rounding the primary down moves the
    secondary down with it, and at these densities that is worth a document:
    the unrounded fit lands one false positive over the browser's budget. The
    pair that ships is the rounded one, so the constraint is checked on the
    rounded pair.

    Flag count is monotone non-increasing in the primary, so this is a binary
    search over the observed keys rather than a sweep.
    """
    cands = sorted({round(key(r["seg_p"]), 6)
                    for rows in human_by_route.values() for r in rows})
    cands.append(round(max(cands) + 1e-6, 6))

    def ok(p):
        s = round(p * RATIO, 6)
        return all(sum(flagged(r["seg_p"], p, s) for r in rows) <= targets[rt]
                   for rt, rows in human_by_route.items())

    lo, hi = 0, len(cands) - 1
    if not ok(cands[hi]):
        return None
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(cands[mid]):
            hi = mid
        else:
            lo = mid + 1
    p = cands[lo]
    return p, round(p * RATIO, 6)


def lband(w):
    for lo, hi, nm in ((0, 600, "<600"), (600, 850, "600-849"),
                       (850, 1200, "850-1199"), (1200, 2000, "1200-1999"),
                       (2000, 10 ** 9, ">=2000")):
        if lo <= (w or 0) < hi:
            return nm
    return ">=2000"


def index(rows):
    return {r["id"]: r for r in rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fp32-dir", required=True)
    ap.add_argument("--web-dir", required=True)
    ap.add_argument("--old-fp32", default="proof")
    ap.add_argument("--old-web", default="old-web")
    ap.add_argument("--new-fp32", default="c4a")
    ap.add_argument("--new-web", default="c4a-web")
    ap.add_argument("--sets", default="")
    a = ap.parse_args()

    def L(d, prefix, name):
        return load(os.path.join(d, f"{prefix}-{name}.jsonl"))

    R = {}   # R[(model, runtime)][set] -> rows
    for mdl, runtime, d, pre in (("old", "fp32", a.fp32_dir, a.old_fp32),
                                 ("old", "web", a.web_dir, a.old_web),
                                 ("new", "fp32", a.fp32_dir, a.new_fp32),
                                 ("new", "web", a.web_dir, a.new_web)):
        R[(mdl, runtime)] = {}
        for name in ("lf-hu", "lf-ai", "nine", "ai-shortform",
                     "human-shortform-widened"):
            p = os.path.join(d, f"{pre}-{name}.jsonl")
            if os.path.exists(p):
                R[(mdl, runtime)][name] = load(p)

    # split labels live with the source sets
    splits = {}
    if a.sets:
        for name in ("ai-shortform", "human-shortform-widened"):
            p = os.path.join(a.sets, f"{name}.jsonl")
            if os.path.exists(p):
                splits[name] = {r["id"]: r.get("split") for r in load(p)}

    def tag_splits(rows, name):
        s = splits.get(name, {})
        for r in rows:
            if r["id"] in s:
                r["split"] = s[r["id"]]
        return rows

    for kk in R:
        for name in ("ai-shortform", "human-shortform-widened"):
            if name in R[kk]:
                tag_splits(R[kk][name], name)

    line = "=" * 112
    print(line)
    print("CYCLE-4a OPERATING POINT, FITTED ON BOTH RUNTIMES AT ONCE")
    print(line)

    # ---------------------------------------------------------------- baseline
    print("\n1. BASELINE - the shipped model at the shipped pair "
          f"{SHIPPED_PRIMARY}/{SHIPPED_SECONDARY}, per runtime")
    base_fp = {}
    for rt in ("fp32", "web"):
        hu = R[("old", rt)]["lf-hu"]
        ai = R[("old", rt)]["lf-ai"]
        fp = sum(flagged(r["seg_p"], SHIPPED_PRIMARY, SHIPPED_SECONDARY) for r in hu)
        det = sum(flagged(r["seg_p"], SHIPPED_PRIMARY, SHIPPED_SECONDARY) for r in ai)
        base_fp[rt] = fp
        print(f"   {rt:>5}   AI detected {cell(det, len(ai))}    "
              f"human false positives {cell(fp, len(hu))}")

    # -------------------------------------------------------------------- fit
    print("\n2. THE JOINT FIT")
    print("   constraint: neither runtime may exceed its own baseline "
          "false-positive count")
    need = {}
    for rt in ("fp32", "web"):
        need[rt] = lowest_primary_for(R[("new", rt)]["lf-hu"], base_fp[rt])
        print(f"   {rt:>5}   lowest primary meeting <= {base_fp[rt]:>3d} "
              f"false positives: {need[rt]:.6f}")
    fit = joint_pair({rt: R[("new", rt)]["lf-hu"] for rt in ("fp32", "web")},
                     base_fp)
    assert fit, "no ratio-locked pair satisfies both routes"
    primary, secondary = fit
    binding = max(need, key=need.get)
    print(f"   lowest six-decimal primary meeting BOTH: {primary}")
    print(f"\n   BINDING ROUTE: {binding}")
    print(f"   JOINT PAIR:    {primary} / {secondary}")
    print(f"   (cycle-4a's fp32-only pair was 0.959674 / 0.950715)")

    POINTS = [("fp32-only pair", 0.959674, 0.950715),
              ("joint pair", primary, secondary)]

    # ------------------------------------------------------- headline per pair
    for label, pri, sec in POINTS:
        print(f"\n{'-'*112}\n3. AT THE {label.upper()}  {pri} / {sec}")
        for rt in ("fp32", "web"):
            hu, ai = R[("new", rt)]["lf-hu"], R[("new", rt)]["lf-ai"]
            fp = sum(flagged(r["seg_p"], pri, sec) for r in hu)
            det = sum(flagged(r["seg_p"], pri, sec) for r in ai)
            print(f"   {rt:>5}   AI detected {cell(det, len(ai))}    "
                  f"human false positives {cell(fp, len(hu))}")
        # route disagreement
        fpi = index(R[("new", "fp32")]["lf-hu"]) | index(R[("new", "fp32")]["lf-ai"])
        wbi = index(R[("new", "web")]["lf-hu"]) | index(R[("new", "web")]["lf-ai"])
        ids = [i for i in fpi if i in wbi]
        dis = [i for i in ids
               if flagged(fpi[i]["seg_p"], pri, sec) != flagged(wbi[i]["seg_p"], pri, sec)]
        dh = [i for i in dis if fpi[i].get("side") == "human"]
        print(f"   route disagreement {len(dis)}/{len(ids)} = "
              f"{100*len(dis)/len(ids):.2f}%   ({len(dh)} human, {len(dis)-len(dh)} AI)")

    print(f"\n{'-'*112}\n   for reference, the shipped model's own route disagreement "
          "at the shipped pair:")
    fpi = index(R[("old", "fp32")]["lf-hu"]) | index(R[("old", "fp32")]["lf-ai"])
    wbi = index(R[("old", "web")]["lf-hu"]) | index(R[("old", "web")]["lf-ai"])
    ids = [i for i in fpi if i in wbi]
    dis = [i for i in ids if flagged(fpi[i]["seg_p"], SHIPPED_PRIMARY, SHIPPED_SECONDARY)
           != flagged(wbi[i]["seg_p"], SHIPPED_PRIMARY, SHIPPED_SECONDARY)]
    print(f"   {len(dis)}/{len(ids)} = {100*len(dis)/len(ids):.2f}%")

    # ------------------------------------------------------------ length bands
    print(f"\n{'-'*112}\n4. LONG-FORM AI DETECTION BY DOCUMENT LENGTH BAND")
    order = ["<600", "600-849", "850-1199", "1200-1999", ">=2000"]
    hdr = f"   {'band':<12}"
    cols = [("old", "fp32", SHIPPED_PRIMARY, SHIPPED_SECONDARY, "shipped fp32"),
            ("old", "web", SHIPPED_PRIMARY, SHIPPED_SECONDARY, "shipped web"),
            ("new", "fp32", primary, secondary, "cycle4a fp32"),
            ("new", "web", primary, secondary, "cycle4a web")]
    print(hdr + "".join(f"{c[4]:<27}" for c in cols))
    words = {r["id"]: r.get("n_words") for r in R[("new", "fp32")]["lf-ai"]}
    for b in order:
        row = f"   {b:<12}"
        for mdl, rt, pri, sec, _ in cols:
            sub = [r for r in R[(mdl, rt)]["lf-ai"] if lband(words.get(r["id"])) == b]
            k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
            row += f"{cell(k, len(sub)):<27}"
        print(row)

    # ---------------------------------------------------------------- registers
    print(f"\n{'-'*112}\n5. HUMAN FALSE POSITIVES BY REGISTER, long-form")
    print(hdr + "".join(f"{c[4]:<27}" for c in cols))
    genres = sorted({r.get("genre") for r in R[("new", "fp32")]["lf-hu"]})
    gmap = {r["id"]: r.get("genre") for r in R[("new", "fp32")]["lf-hu"]}
    for g in genres:
        row = f"   {str(g):<12}" if len(str(g)) <= 12 else f"   {str(g):<12}"
        row = f"   {str(g):<21}"
        for mdl, rt, pri, sec, _ in cols:
            sub = [r for r in R[(mdl, rt)]["lf-hu"] if gmap.get(r["id"]) == g]
            k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
            row += f"{cell(k, len(sub)):<27}"
        print(row)

    print(f"\n{'-'*112}\n6. AI DETECTION BY REGISTER, long-form")
    aig = {r["id"]: r.get("genre") for r in R[("new", "fp32")]["lf-ai"]}
    for g in sorted({v for v in aig.values()}):
        row = f"   {str(g):<21}"
        for mdl, rt, pri, sec, _ in cols:
            sub = [r for r in R[(mdl, rt)]["lf-ai"] if aig.get(r["id"]) == g]
            k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
            row += f"{cell(k, len(sub)):<27}"
        print(row)

    # ---------------------------------------------------------------- shortform
    if "ai-shortform" in R[("new", "fp32")]:
        print(f"\n{'-'*112}\n7. SHORT-FORM AI DETECTION BY LENGTH BAND, "
              "held-out test split only")
        print(hdr + "".join(f"{c[4]:<27}" for c in cols))
        for tl in (100, 300, 400, 600):
            row = f"   {tl:<12}"
            for mdl, rt, pri, sec, _ in cols:
                sub = [r for r in R[(mdl, rt)]["ai-shortform"]
                       if r.get("target_len") == tl and r.get("split") == "test"]
                k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
                row += f"{cell(k, len(sub)):<27}"
            print(row)
        print("\n   ALL short-form samples:")
        for tl in (100, 300, 400, 600):
            row = f"   {tl:<12}"
            for mdl, rt, pri, sec, _ in cols:
                sub = [r for r in R[(mdl, rt)]["ai-shortform"]
                       if r.get("target_len") == tl]
                k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
                row += f"{cell(k, len(sub)):<27}"
            print(row)

    if "human-shortform-widened" in R[("new", "fp32")]:
        print(f"\n{'-'*112}\n8. SHORT-FORM HUMAN FALSE POSITIVES, held-out passages only")
        print(hdr + "".join(f"{c[4]:<27}" for c in cols))
        srcs = sorted({r["source"] for r in R[("new", "fp32")]["human-shortform-widened"]})
        smap = {r["id"]: r["source"]
                for r in R[("new", "fp32")]["human-shortform-widened"]}
        def held(rows):
            return [r for r in rows if r.get("split") in ("never-trained", "test")]
        row = f"   {'TOTAL':<12}"
        for mdl, rt, pri, sec, _ in cols:
            sub = held(R[(mdl, rt)]["human-shortform-widened"])
            k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
            row += f"{cell(k, len(sub)):<27}"
        print(row)
        for s in srcs:
            row = f"   {s:<12}"
            for mdl, rt, pri, sec, _ in cols:
                sub = [r for r in held(R[(mdl, rt)]["human-shortform-widened"])
                       if smap.get(r["id"]) == s]
                k = sum(flagged(r["seg_p"], pri, sec) for r in sub)
                row += f"{cell(k, len(sub)):<27}"
            print(row)

    # -------------------------------------------------------------- the nine
    print(f"\n{'-'*112}\n9. THE OWNER'S NINE DOCUMENTS, both runtimes, at the joint pair")
    print(f"   {'document':<34} {'side':>6} "
          f"{'ship fp32':>18} {'ship web':>18} {'c4a fp32':>18} {'c4a web':>18}")
    nine = {(m, rt): index(R[(m, rt)]["nine"]) for m in ("old", "new")
            for rt in ("fp32", "web")}
    for r in R[("new", "fp32")]["nine"]:
        i = r["id"]
        out = f"   {i:<34} {str(r.get('side')):>6} "
        for mdl, rt, pri, sec, _ in cols:
            row = nine[(mdl, rt)][i]
            pm = max(row["seg_p"])
            v = "FLAG" if flagged(row["seg_p"], pri, sec) else "clear"
            out += f"{pm:>11.4f} {v:>6}"
        print(out)

    # ------------------------------------------------------------ the curve
    print(f"\n{'-'*112}\n10. THE CURVE - both runtimes, cycle 4a, ratio-locked pairs")
    print(f"   {'primary':>9} {'secondary':>10} | {'fp32 FP':>12} {'fp32 det':>11} | "
          f"{'web FP':>12} {'web det':>11} | {'disagree':>9}")
    grid = sorted({round(x, 6) for x in
                   [0.90, 0.92, 0.94, 0.95, 0.955, 0.959674, primary, 0.965, 0.97,
                    0.975, 0.98, 0.9855]})
    for p in grid:
        s = round(p * RATIO, 6)
        cells = []
        for rt in ("fp32", "web"):
            hu, ai = R[("new", rt)]["lf-hu"], R[("new", rt)]["lf-ai"]
            cells.append(sum(flagged(r["seg_p"], p, s) for r in hu))
            cells.append(sum(flagged(r["seg_p"], p, s) for r in ai))
        f2 = index(R[("new", "fp32")]["lf-hu"]) | index(R[("new", "fp32")]["lf-ai"])
        w2 = index(R[("new", "web")]["lf-hu"]) | index(R[("new", "web")]["lf-ai"])
        common = [i for i in f2 if i in w2]
        dis = sum(1 for i in common
                  if flagged(f2[i]["seg_p"], p, s) != flagged(w2[i]["seg_p"], p, s))
        mark = "  <== joint" if abs(p - primary) < 1e-9 else (
            "  <== fp32-only" if abs(p - 0.959674) < 1e-9 else "")
        print(f"   {p:9.6f} {s:10.6f} | {cells[0]:5d}/4636 {100*cells[0]/4636:5.2f}% "
              f"{cells[1]:4d}/922 {100*cells[1]/922:5.1f}% | "
              f"{cells[2]:5d}/4636 {100*cells[2]/4636:5.2f}% "
              f"{cells[3]:4d}/922 {100*cells[3]/922:5.1f}% | {dis:4d}{mark}")

    print(f"\n{'-'*112}\n11. WHERE THE PAIR SITS RELATIVE TO THE WASM/WebGPU AGREEMENT RANGE")
    print("   WEBGPU-PARITY.md: WASM and WebGPU agree to five decimals above 0.97 "
          "(median 0.000075)")
    print("   and diverge most at 0.50-0.90 (median 0.0175).")
    print(f"   joint primary {primary} / secondary {secondary}: "
          f"{'INSIDE' if secondary >= 0.97 else 'BELOW'} the measured-agreement range.")


if __name__ == "__main__":
    main()

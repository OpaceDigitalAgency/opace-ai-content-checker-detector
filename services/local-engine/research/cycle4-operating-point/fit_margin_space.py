"""The operating point fitted in MARGIN space, where temperature cannot reach.

Why this exists
---------------
`temperature_refit.py` shows that re-fitting cycle 4a's calibration temperature
does move the joint fit - but not for the reason the proposal assumed, and the
direction is the opposite of the one expected. Temperature is strictly monotone
in the margin, so it cannot change which segments outrank which. The only thing
it changes is the shipped rule's SECOND condition, because that condition pins
the secondary to a fixed RATIO of the primary in PROBABILITY space, and a
probability ratio is not scale-free: the same 0.9906646 buys the second section
a margin gap of 0.409 at the shipped model's temperature, 0.380 at cycle 4a's
1.7298, and 0.288 at 2.0325.

So "re-fit the temperature" is really "change the margin gap, indirectly and
without saying so". This file does it directly instead, which makes the choice
explicit, removes temperature from the question entirely, and lets the gap be
fitted under the same constraint as the primary rather than inherited from a
model with a different score scale.

The rule, in margin space
-------------------------
Flag when the highest section's margin reaches `a`, OR the second-highest
reaches `a - g`. That is exactly the shipped minimum-evidence rule; only the
parameterisation differs. It is equivalent to

    flag  <=>  max(m_1, m_2 + g) >= a

so for any fixed gap `g` the operating point is again a quantile of a single
per-document key, and the whole two-parameter fit is a sweep over `g` with an
exact solve inside it.

THE CONSTRAINT AND THE OBJECTIVE, STATED BEFORE FITTING
-------------------------------------------------------
Constraint, unchanged from §18 and from the shipped pair:
    one pair for both routes; fp32 false positives <= 45/4,636 AND browser
    false positives <= 90/4,636, each route's own baseline under the shipped
    model at the shipped pair.

Objective, chosen before any result was seen, and the direct generalisation of
"lowest primary" - which maximises detection when there is only one parameter:
    maximise long-form AI documents detected on the BROWSER route, because the
    browser is the binding route; ties broken by long-form detection on fp32,
    then by the LARGEST gap, then by the lowest primary.

Short-form detection is deliberately NOT in the objective. It is the capability
under discussion, and fitting to it would make the resulting figure a
restatement of the fit rather than a measurement of it. It is reported as an
outcome.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random

T_FITTED = float(os.environ.get("C4_T", "1.7298"))
SHIPPED_PRIMARY, SHIPPED_SECONDARY = 0.9855, 0.9763
RATIO = SHIPPED_SECONDARY / SHIPPED_PRIMARY
EPS = 1e-12
TARGETS = {"fp32": 45, "web": 90}


def load(p):
    return [json.loads(l) for l in open(p)]


def logit(p):
    p = min(1 - EPS, max(EPS, p))
    return math.log(p / (1 - p))


def to_margins(seg_p, t=T_FITTED):
    return [t * logit(p) for p in seg_p]


def prob(m, t=T_FITTED):
    return 1.0 / (1.0 + math.exp(-m / t))


def dkey(margins, g):
    q = sorted(margins, reverse=True)
    if not q:
        return -1e9
    return max(q[0], q[1] + g) if len(q) > 1 else q[0]


def solve_a(hu_keys_by_route):
    """Lowest `a` meeting every route's false-positive budget, exactly."""
    need = []
    for rt, keys in hu_keys_by_route.items():
        k = sorted(keys, reverse=True)
        t = TARGETS[rt]
        need.append(-1e9 if t >= len(k) else k[t] + 1e-9)
    return max(need)


def wilson(k, n, z=1.96):
    if not n:
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fp32-dir", required=True)
    ap.add_argument("--web-dir", required=True)
    ap.add_argument("--sets", required=True)
    ap.add_argument("--prefix-fp32", default="c4a")
    ap.add_argument("--prefix-web", default="c4a-web")
    ap.add_argument("--out", default="")
    a = ap.parse_args()

    M = {}
    for rt, d, pre in (("fp32", a.fp32_dir, a.prefix_fp32),
                       ("web", a.web_dir, a.prefix_web)):
        M[rt] = {}
        for n in ("lf-hu", "lf-ai", "ai-shortform", "human-shortform-widened", "nine"):
            p = os.path.join(d, f"{pre}-{n}.jsonl")
            if os.path.exists(p):
                M[rt][n] = [{**r, "m": to_margins(r["seg_p"])} for r in load(p)]
    split = {r["id"]: r.get("split")
             for r in load(os.path.join(a.sets, "ai-shortform.jsonl"))}

    print("=" * 104)
    print("CYCLE 4a - OPERATING POINT FITTED IN MARGIN SPACE, BOTH RUNTIMES, "
          "GAP FITTED NOT INHERITED")
    print("=" * 104)
    print("\nconstraint : fp32 FP <= 45/4636 AND browser FP <= 90/4636, one pair "
          "for both routes")
    print("objective  : maximise browser long-form detection; ties -> fp32 "
          "detection, larger gap, lower primary")
    print("short-form is NOT in the objective and is reported as an outcome\n")

    inherited_gap = T_FITTED * (logit(0.961692) - logit(0.952714))
    print(f"for reference, the inherited probability-ratio rule at cycle 4a's "
          f"temperature is a margin gap of {inherited_gap:.4f}")
    print(f"and at the shipped model's temperature it was "
          f"{0.8324*(logit(SHIPPED_PRIMARY)-logit(SHIPPED_SECONDARY)):.4f}\n")

    grid = [round(g, 3) for g in [x / 100 for x in range(0, 201, 2)]]
    best = None
    rows = []
    for g in grid:
        hu_keys = {rt: [dkey(r["m"], g) for r in M[rt]["lf-hu"]]
                   for rt in ("fp32", "web")}
        aa = solve_a(hu_keys)
        det = {rt: sum(1 for r in M[rt]["lf-ai"] if dkey(r["m"], g) >= aa)
               for rt in ("fp32", "web")}
        fp = {rt: sum(1 for k in hu_keys[rt] if k >= aa) for rt in ("fp32", "web")}
        sf = [r for r in M["fp32"]["ai-shortform"]
              if r.get("target_len") == 100 and split.get(r["id"]) == "test"]
        s100 = sum(1 for r in sf if dkey(r["m"], g) >= aa)
        rows.append((g, aa, fp, det, s100))
        cand = (det["web"], det["fp32"], g, -aa)
        if best is None or cand > best[0]:
            best = (cand, g, aa)

    print(f"{'gap':>6} {'primary m':>10} {'primary p':>10} {'secondary p':>12} | "
          f"{'fp32 FP':>8} {'fp32 det':>9} | {'web FP':>8} {'web det':>9} | {'100w':>8}")
    print("-" * 104)
    for g, aa, fp, det, s100 in rows:
        if g % 0.1 > 1e-9 and abs(g - best[1]) > 1e-9 and abs(g - 0.38) > 1e-9:
            continue
        mark = "  <== fitted" if abs(g - best[1]) < 1e-9 else (
            "  <== inherited" if abs(g - 0.38) < 1e-9 else "")
        print(f"{g:6.2f} {aa:10.4f} {prob(aa):10.6f} {prob(aa-g):12.6f} | "
              f"{fp['fp32']:4d}/4636 {det['fp32']:4d}/922 | "
              f"{fp['web']:4d}/4636 {det['web']:4d}/922 | {s100:4d}/57{mark}")

    g, aa = best[1], best[2]
    pri, sec = prob(aa), prob(aa - g)
    print(f"\nFITTED PAIR  margin {aa:.4f} / {aa-g:.4f}   "
          f"gap {g:.2f}   probability {pri:.6f} / {sec:.6f}  (at T = {T_FITTED})")

    print("\n" + "-" * 104)
    print("AT THE FITTED PAIR")
    for rt in ("fp32", "web"):
        hu = sum(1 for r in M[rt]["lf-hu"] if dkey(r["m"], g) >= aa)
        det = sum(1 for r in M[rt]["lf-ai"] if dkey(r["m"], g) >= aa)
        print(f"  {rt:>5}  AI detected {cell(det, len(M[rt]['lf-ai']))}   "
              f"human false positives {cell(hu, len(M[rt]['lf-hu']))}")
    f2 = {r["id"]: r for r in M["fp32"]["lf-hu"] + M["fp32"]["lf-ai"]}
    w2 = {r["id"]: r for r in M["web"]["lf-hu"] + M["web"]["lf-ai"]}
    dis = [i for i in f2 if i in w2
           and (dkey(f2[i]["m"], g) >= aa) != (dkey(w2[i]["m"], g) >= aa)]
    print(f"  route disagreement {len(dis)}/{len(f2)} = {100*len(dis)/len(f2):.2f}%")

    print("\n  short-form AI detection, held-out test split:")
    for tl in (100, 300, 400, 600):
        line = f"    {tl:>4}w "
        for rt in ("fp32", "web"):
            s = [r for r in M[rt]["ai-shortform"]
                 if r.get("target_len") == tl and split.get(r["id"]) == "test"]
            k = sum(1 for r in s if dkey(r["m"], g) >= aa)
            line += f"  {rt} {cell(k, len(s)):<26}"
        print(line)

    print("\n  long-form AI detection by length band:")
    for lo, hi, nm in ((0, 600, "<600"), (600, 850, "600-849"), (850, 1200, "850-1199"),
                       (1200, 2000, "1200-1999"), (2000, 10**9, ">=2000")):
        line = f"    {nm:<10}"
        for rt in ("fp32", "web"):
            s = [r for r in M[rt]["lf-ai"] if lo <= (r.get("n_words") or 0) < hi]
            k = sum(1 for r in s if dkey(r["m"], g) >= aa)
            line += f"  {rt} {cell(k, len(s)):<26}"
        print(line)

    print("\n  human false positives by register:")
    gm = {r["id"]: r.get("genre") for r in M["fp32"]["lf-hu"]}
    for gen in sorted({v for v in gm.values()}):
        line = f"    {str(gen):<22}"
        for rt in ("fp32", "web"):
            s = [r for r in M[rt]["lf-hu"] if gm.get(r["id"]) == gen]
            k = sum(1 for r in s if dkey(r["m"], g) >= aa)
            line += f"  {rt} {cell(k, len(s)):<26}"
        print(line)

    if "human-shortform-widened" in M["fp32"]:
        print("\n  short-form human false positives, held-out passages:")
        for rt in ("fp32", "web"):
            if "human-shortform-widened" not in M[rt]:
                print(f"    {rt:>5} not scored on this runtime")
                continue
            s = [r for r in M[rt]["human-shortform-widened"]
                 if r.get("split") in ("never-trained", "test")] or \
                M[rt]["human-shortform-widened"]
            k = sum(1 for r in s if dkey(r["m"], g) >= aa)
            print(f"    {rt:>5} {cell(k, len(s))}")

    print("\n  the owner's nine documents:")
    for r in M["fp32"]["nine"]:
        w = {x["id"]: x for x in M["web"]["nine"]}[r["id"]]
        vf = "FLAG" if dkey(r["m"], g) >= aa else "clear"
        vw = "FLAG" if dkey(w["m"], g) >= aa else "clear"
        print(f"    {r['id']:<34} {str(r.get('side')):>6}  fp32 {max(r['seg_p']):.4f} "
              f"{vf:>5}   web {max(w['seg_p']):.4f} {vw:>5}")

    # ---- split-half validation of the two-parameter fit --------------------
    print("\n" + "-" * 104)
    print("SPLIT-HALF VALIDATION - is the two-parameter fit stable, or is the "
          "gap being fitted to noise?")
    rnd = random.Random(20260830)
    holds = 0
    gaps = []
    for _ in range(200):
        idx = list(range(len(M["fp32"]["lf-hu"])))
        rnd.shuffle(idx)
        half = set(idx[:len(idx) // 2])
        sub = {rt: [r for i, r in enumerate(M[rt]["lf-hu"]) if i in half]
               for rt in ("fp32", "web")}
        bg, bs = None, None
        for gg in grid:
            hk = {rt: [dkey(r["m"], gg) for r in sub[rt]] for rt in ("fp32", "web")}
            need = []
            for rt in ("fp32", "web"):
                k = sorted(hk[rt], reverse=True)
                t = TARGETS[rt] // 2
                need.append(-1e9 if t >= len(k) else k[t] + 1e-9)
            av = max(need)
            d = sum(1 for r in M["web"]["lf-ai"] if dkey(r["m"], gg) >= av)
            if bg is None or (d, gg) > bg:
                bg, bs = (d, gg), gg
        gaps.append(bs)
        if abs(bs - g) <= 0.2:
            holds += 1
    gaps.sort()
    print(f"  200 random halves of the human corpus, gap refitted on each:")
    print(f"  median gap {gaps[100]:.2f}  p10 {gaps[20]:.2f}  p90 {gaps[180]:.2f}  "
          f"full-corpus gap {g:.2f}")
    print(f"  within 0.2 of the full-corpus gap on {holds}/200 halves")

    if a.out:
        json.dump({"gap": g, "primary_margin": aa, "secondary_margin": aa - g,
                   "primary_prob": pri, "secondary_prob": sec,
                   "temperature": T_FITTED,
                   "split_half_median_gap": gaps[100],
                   "split_half_within_0.2": holds}, open(a.out, "w"), indent=2)


if __name__ == "__main__":
    main()

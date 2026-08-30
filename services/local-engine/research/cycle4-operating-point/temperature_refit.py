"""Does re-fitting the calibration temperature change anything that matters?

The proposal on the table was to re-fit cycle 4a's temperature - 1.7298, which
caps its calibrated probability at 0.9630 - so the flag point is no longer
pressed against the model's own ceiling. This script tests that proposal
before any retraining is attempted, and it can do so exactly and for free,
because temperature is a reversible relabelling of a number already measured.

The scored files hold p = sigmoid(m / T) at T = 1.7298. Inverting gives the
margin m the network actually produced, and any candidate temperature T' is
then p' = sigmoid(m / T'). No inference is repeated and nothing is
approximated: this is the same forward pass read off a different scale.

What is invariant under a change of temperature, and what is not
----------------------------------------------------------------
Temperature is strictly monotone in the margin, so the RANKING of every
segment is untouched. A single-threshold rule would therefore be exactly
invariant: same documents, same detection, same false positives, at the
relabelled point.

The shipped rule is not single-threshold. It flags when the highest section
reaches the primary OR the second-highest reaches a secondary pinned to a
fixed RATIO of the primary IN PROBABILITY SPACE. That ratio is not
monotone-invariant - at a different temperature, the same ratio buys the
second section a different amount of margin - so a temperature change does
move the rule slightly. This script measures how much, rather than assuming
either that it is zero or that it is enough.

Reported per candidate temperature: the joint pair refitted from scratch under
the same both-routes false-positive constraint, detection and false positives
on each runtime, the 100-word held-out band, the probability ceiling, and the
gap between primary and secondary expressed in MARGIN, which is the space the
two runtimes actually differ in.
"""
from __future__ import annotations

import argparse
import json
import math
import os

T_FITTED = 1.7298
SHIPPED_PRIMARY, SHIPPED_SECONDARY = 0.9855, 0.9763
RATIO = SHIPPED_SECONDARY / SHIPPED_PRIMARY
EPS = 1e-12


def load(p):
    return [json.loads(l) for l in open(p)]


def logit(p):
    p = min(1 - EPS, max(EPS, p))
    return math.log(p / (1 - p))


def rescale(seg_p, t_from, t_to):
    return [1.0 / (1.0 + math.exp(-(t_from * logit(p)) / t_to)) for p in seg_p]


def key(seg_p, ratio=RATIO):
    q = sorted(seg_p, reverse=True)
    if not q:
        return 0.0
    return max(q[0], q[1] / ratio) if len(q) > 1 else q[0]


def flagged(seg_p, pri, sec):
    q = sorted(seg_p, reverse=True)
    return bool(q) and (q[0] >= pri or (len(q) > 1 and q[1] >= sec))


def joint_pair(hu_by_route, targets):
    cands = sorted({round(key(r["seg_p"]), 6)
                    for rows in hu_by_route.values() for r in rows})
    cands.append(round(max(cands) + 1e-6, 6))

    def ok(p):
        s = round(p * RATIO, 6)
        return all(sum(flagged(r["seg_p"], p, s) for r in rows) <= targets[rt]
                   for rt, rows in hu_by_route.items())

    lo, hi = 0, len(cands) - 1
    if not ok(cands[hi]):
        return None
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(cands[mid]):
            hi = mid
        else:
            lo = mid + 1
    return cands[lo], round(cands[lo] * RATIO, 6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fp32-dir", required=True)
    ap.add_argument("--web-dir", required=True)
    ap.add_argument("--sets", required=True)
    ap.add_argument("--temperatures", default="0.6,0.8324,1.0,1.2095,1.7298,2.0325,2.5")
    a = ap.parse_args()

    base = {}
    for rt, d, pre in (("fp32", a.fp32_dir, "c4a"), ("web", a.web_dir, "c4a-web")):
        base[rt] = {n: load(os.path.join(d, f"{pre}-{n}.jsonl"))
                    for n in ("lf-hu", "lf-ai", "ai-shortform")}
    split = {r["id"]: r.get("split")
             for r in load(os.path.join(a.sets, "ai-shortform.jsonl"))}
    targets = {"fp32": 45, "web": 90}

    print("=" * 108)
    print("DOES RE-FITTING THE TEMPERATURE HELP? cycle 4a, both runtimes, "
          "joint fit repeated at each temperature")
    print("=" * 108)
    print(f"\nconstraint, stated before fitting and identical at every temperature:")
    print(f"  one pair for both routes, secondary = {RATIO:.7f} x primary,")
    print(f"  lowest primary such that fp32 false positives <= {targets['fp32']}/4636")
    print(f"  AND browser false positives <= {targets['web']}/4636.\n")
    hdr = (f"{'T':>8} {'ceiling':>9} {'primary':>10} {'secondary':>10} "
           f"{'margin gap':>11} | {'fp32 FP':>8} {'fp32 det':>9} | "
           f"{'web FP':>8} {'web det':>9} | {'100w test':>10} {'disagree':>9}")
    print(hdr)
    print("-" * len(hdr))

    for t in [float(x) for x in a.temperatures.split(",")]:
        cur = {}
        for rt in ("fp32", "web"):
            cur[rt] = {}
            for n, rows in base[rt].items():
                cur[rt][n] = [{**r, "seg_p": rescale(r["seg_p"], T_FITTED, t)}
                              for r in rows]
        fit = joint_pair({rt: cur[rt]["lf-hu"] for rt in ("fp32", "web")}, targets)
        if not fit:
            print(f"{t:8.4f}   no pair satisfies both routes")
            continue
        pri, sec = fit
        ceiling = max(p for r in cur["fp32"]["lf-ai"] for p in r["seg_p"])
        gap = t * (logit(pri) - logit(sec))
        row = f"{t:8.4f} {ceiling:9.6f} {pri:10.6f} {sec:10.6f} {gap:11.4f} |"
        cells = {}
        for rt in ("fp32", "web"):
            fp = sum(flagged(r["seg_p"], pri, sec) for r in cur[rt]["lf-hu"])
            det = sum(flagged(r["seg_p"], pri, sec) for r in cur[rt]["lf-ai"])
            cells[rt] = (fp, det)
            row += f" {fp:4d}/4636 {det:4d}/922 |"
        sf = [r for r in cur["fp32"]["ai-shortform"]
              if r.get("target_len") == 100 and split.get(r["id"]) == "test"]
        s100 = sum(flagged(r["seg_p"], pri, sec) for r in sf)
        f2 = {r["id"]: r for r in cur["fp32"]["lf-hu"] + cur["fp32"]["lf-ai"]}
        w2 = {r["id"]: r for r in cur["web"]["lf-hu"] + cur["web"]["lf-ai"]}
        dis = sum(1 for i in f2 if i in w2
                  and flagged(f2[i]["seg_p"], pri, sec)
                  != flagged(w2[i]["seg_p"], pri, sec))
        print(row + f" {s100:5d}/{len(sf):<4d} {dis:9d}")

    print("\nThe margin gap column is the primary-to-secondary distance expressed in "
          "the network's own\nmargin units. It is the only thing a temperature change "
          "can move, and it is what decides\nwhether the second-section rule reaches "
          "a different set of documents.")


if __name__ == "__main__":
    main()

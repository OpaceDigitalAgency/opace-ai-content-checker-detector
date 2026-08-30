"""Compact before/after for one arm on the four sets that decide the bars.

Reports at the arm's own REFITTED operating point - the lowest primary, with
the shipped primary-to-secondary ratio preserved, whose long-form human false
positives are at most the shipped model's. Comparing at the shipped pair
instead measures the calibration temperature, not the model.
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import os

PRIMARY, SECONDARY = 0.9855, 0.9763
RATIO = SECONDARY / PRIMARY


def load(p):
    return [json.loads(l) for l in open(p)]


def flag(ps, pri=PRIMARY, sec=SECONDARY):
    s = sorted(ps, reverse=True)
    return bool(s and (s[0] >= pri or (len(s) > 1 and s[1] >= sec)))


def wilson(k, n):
    if not n:
        return (0.0, 0.0)
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def cell(k, n):
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100*k/n:5.2f}% [{lo:.1f}, {hi:.1f}]" if n else "-"


def mcnemar(a, b):
    b01 = sum(1 for x, y in zip(a, b) if x and not y)
    b10 = sum(1 for x, y in zip(a, b) if y and not x)
    n = b01 + b10
    if n == 0:
        return b01, b10, 1.0
    k = min(b01, b10)
    return b01, b10, min(1.0, sum(math.comb(n, i) for i in range(k + 1)) / 2 ** n * 2)


def refit(rows, target):
    keys = []
    for r in rows:
        ps = sorted(r["seg_p"], reverse=True)
        k = ps[0] if ps else 0.0
        if len(ps) > 1:
            k = max(k, ps[1] / RATIO)
        keys.append(k)
    keys.sort(reverse=True)
    if target >= len(keys):
        return 0.0, 0.0
    p = min(keys[target] + 1e-9, 1.0)
    return round(p, 6), round(p * RATIO, 6)


def lband(w):
    for lo, hi, nm in ((0, 300, "<300"), (300, 600, "300-599"), (600, 850, "600-849"),
                       (850, 1200, "850-1199"), (1200, 2000, "1200-1999"),
                       (2000, 10 ** 9, ">=2000")):
        if lo <= w < hi:
            return nm
    return ">=2000"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--label", default="")
    ap.add_argument("--sets", default=os.environ.get("C3SETS", ""))
    a = ap.parse_args()

    def L(tag, name):
        p = os.path.join(a.dir, f"{tag}-{name}.jsonl")
        return load(p) if os.path.exists(p) else None

    o_hu, n_hu = L("old", "lf-hu"), L(a.new, "lf-hu")
    o_ai, n_ai = L("old", "lf-ai"), L(a.new, "lf-ai")
    target = sum(flag(r["seg_p"]) for r in o_hu)
    pri, sec = refit(n_hu, target)
    print("=" * 96)
    print(f"ARM: {a.label or a.new}   fp32 server runtime, segments-v3, "
          f"minimum-evidence rule")
    print(f"shipped pair {PRIMARY}/{SECONDARY}; refitted pair {pri}/{sec} "
          f"(matches the shipped model's {target}/{len(o_hu)} long-form human "
          f"false positives)")
    print("=" * 96)

    idx = {r["id"]: r for r in o_hu}
    pairs = [(idx[r["id"]], r) for r in n_hu if r["id"] in idx]
    fo = [flag(x["seg_p"]) for x, y in pairs]
    fr = [flag(y["seg_p"], pri, sec) for x, y in pairs]
    print(f"\nLONG-FORM HUMAN FALSE POSITIVES (the bar: must not exceed 45/4636)")
    print(f"  shipped  {cell(sum(fo), len(pairs))}")
    print(f"  {a.new:8} {cell(sum(fr), len(pairs))}   McNemar {mcnemar(fo, fr)}")
    go, gn, gt = collections.Counter(), collections.Counter(), collections.Counter()
    for (x, y), f1, f2 in zip(pairs, fo, fr):
        g = x.get("genre")
        gt[g] += 1
        go[g] += f1
        gn[g] += f2
    print(f"\n  {'register':<24} {'shipped':<26} {a.new:<26}")
    for g in sorted(gt):
        mark = ""
        if gn[g] > go[g]:
            mark = "  WORSE"
        elif gn[g] < go[g]:
            mark = "  better"
        print(f"  {g:<24} {cell(go[g], gt[g]):<26} {cell(gn[g], gt[g]):<26}{mark}")

    idx = {r["id"]: r for r in o_ai}
    pairs = [(idx[r["id"]], r) for r in n_ai if r["id"] in idx]
    fo = [flag(x["seg_p"]) for x, y in pairs]
    fr = [flag(y["seg_p"], pri, sec) for x, y in pairs]
    print(f"\nLONG-FORM AI DETECTION (the bar: must not fall below 883/922)")
    print(f"  shipped  {cell(sum(fo), len(pairs))}")
    print(f"  {a.new:8} {cell(sum(fr), len(pairs))}   McNemar {mcnemar(fo, fr)}")
    bo, bn, bt = collections.Counter(), collections.Counter(), collections.Counter()
    for (x, y), f1, f2 in zip(pairs, fo, fr):
        b = lband(x.get("n_words") or 0)
        bt[b] += 1
        bo[b] += f1
        bn[b] += f2
    print("\n  by document length band - the aggregate can hide a sag:")
    print(f"  {'band':<12} {'shipped':<26} {a.new:<26}")
    for b in ["<300", "300-599", "600-849", "850-1199", "1200-1999", ">=2000"]:
        if bt[b]:
            print(f"  {b:<12} {cell(bo[b], bt[b]):<26} {cell(bn[b], bt[b]):<26}")

    o_sf, n_sf = L("old", "ai-shortform"), L(a.new, "ai-shortform")
    if n_sf:
        splits = {}
        if a.sets:
            p = os.path.join(a.sets, "ai-shortform.jsonl")
            if os.path.exists(p):
                splits = {r["id"]: r.get("split") for r in load(p)}
        idx = {r["id"]: r for r in o_sf}
        pairs = [(idx[r["id"]], r) for r in n_sf if r["id"] in idx]
        print("\nSHORT-FORM AI DETECTION by target length (held-out test split)")
        print(f"  {'words':<12} {'shipped':<26} {a.new:<26}")
        for tl in (100, 300, 400, 600):
            sub = [(x, y) for x, y in pairs
                   if y["target_len"] == tl and splits.get(y["id"]) == "test"]
            if sub:
                print(f"  {tl:<12} "
                      f"{cell(sum(flag(x['seg_p']) for x, y in sub), len(sub)):<26} "
                      f"{cell(sum(flag(y['seg_p'], pri, sec) for x, y in sub), len(sub)):<26}")

    o_9, n_9 = L("old", "nine"), L(a.new, "nine")
    if n_9:
        print("\nTHE OWNER'S NINE DOCUMENTS")
        o = {r["id"]: r for r in o_9}
        for r in n_9:
            x = o[r["id"]]
            print(f"  {r['id']:<34} {max(x['seg_p']):.4f} "
                  f"{'FLAG' if flag(x['seg_p']) else 'clear':<6} -> "
                  f"{max(r['seg_p']):.4f} "
                  f"{'FLAG' if flag(r['seg_p'], pri, sec) else 'clear'}")


if __name__ == "__main__":
    main()

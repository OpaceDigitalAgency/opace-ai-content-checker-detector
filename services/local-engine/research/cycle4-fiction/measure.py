"""Before/after tables for the cycle-4 retrain, generalised over arms.

Two things differ from the cycle-3 version:

  * `--new` names the score prefix, so the free rebalance control and the
    new-data arm are measured by the same code on the same documents;
  * long-form detection is reported BY DOCUMENT LENGTH BAND as well as in
    aggregate. The 95.77% floor is a long-document figure - the corpus median
    AI document is 1,612 words and the rate runs 88.5% at 600-849 words, 90.7%
    at 850-1,199 and 97.8% above 1,200 - so a model that holds the aggregate
    while dropping in the 600-1,200 band would be worse for real users and the
    aggregate would hide it.

Original cycle-3 docstring follows.

Before/after tables for the cycle-3 two-axis retrain.

Every figure here is fp32 ONNX under onnxruntime's CPU provider - the server
runtime - with the deployed segments-v3 segmentation and each model's own
calibration temperature. No browser figure is produced or implied.

The verdict rule is the shipped minimum-evidence rule: flag when the highest
section clears the primary, or the second-highest clears the secondary.

Two operating points are reported for the new model and both matter:
  * the SHIPPED pair 0.9855 / 0.9763, which answers "what happens if the model
    is swapped and nothing else changes";
  * a REFITTED pair chosen to match the old model's false-positive count on the
    long-form human corpus, which is the only comparison at which a detection
    difference means anything.
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import os

PRIMARY, SECONDARY = 0.9855, 0.9763


def load(p):
    return [json.loads(l) for l in open(p)]


def flagged(seg_p, pri=PRIMARY, sec=SECONDARY):
    ps = sorted(seg_p, reverse=True)
    if not ps:
        return False
    return ps[0] >= pri or (len(ps) > 1 and ps[1] >= sec)


def wilson(k, n):
    if n == 0:
        return (0.0, 0.0)
    p, z = k / n, 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h) * 100, min(1.0, c + h) * 100)


def cell(k, n):
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100*k/n:5.1f}% [{lo:.1f}, {hi:.1f}]" if n else "-"


def mcnemar(a, b):
    """a, b: equal-length boolean lists. Returns (b01, b10, two-sided p)."""
    b01 = sum(1 for x, y in zip(a, b) if x and not y)
    b10 = sum(1 for x, y in zip(a, b) if y and not x)
    n = b01 + b10
    if n == 0:
        return b01, b10, 1.0
    k = min(b01, b10)
    p = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n) * 2
    return b01, b10, min(1.0, p)


def tbin(t):
    for lo, hi, name in ((0, .42, "<0.42"), (.42, .46, "0.42-0.46"),
                         (.46, .50, "0.46-0.50"), (.50, .55, "0.50-0.55"),
                         (.55, .60, "0.55-0.60"), (.60, 2, ">=0.60")):
        if lo <= t < hi:
            return name
    return ">=0.60"


TBINS = ["<0.42", "0.42-0.46", "0.46-0.50", "0.50-0.55", "0.55-0.60", ">=0.60"]


def pair(old_rows, new_rows):
    o = {r["id"]: r for r in old_rows}
    return [(o[r["id"]], r) for r in new_rows if r["id"] in o]


def table(title, rows, keyfn, order, pri_new, sec_new):
    print(f"\n{title}")
    print(f"  {'group':<16} {'old (0.9855/0.9763)':<28} {'new (shipped pair)':<28} "
          f"{'new (refitted pair)':<28}")
    for k in order:
        sub = [(a, b) for a, b in rows if keyfn(a, b) == k]
        if not sub:
            continue
        n = len(sub)
        fo = sum(flagged(a["seg_p"]) for a, b in sub)
        fn = sum(flagged(b["seg_p"]) for a, b in sub)
        fr = sum(flagged(b["seg_p"], pri_new, sec_new) for a, b in sub)
        print(f"  {str(k):<16} {cell(fo,n):<28} {cell(fn,n):<28} {cell(fr,n):<28}")


def refit(new_hu, target_fp):
    """Lowest primary - with the shipped primary/secondary RATIO preserved - whose
    false-positive count on the long-form human corpus is at most target_fp.

    Exact rather than swept. Under the minimum-evidence rule with secondary =
    ratio x primary, a document is flagged iff max(p1, p2 / ratio) >= primary,
    so the operating point is a quantile of that per-document key, not a search.
    """
    ratio = SECONDARY / PRIMARY
    keys = []
    for r in new_hu:
        ps = sorted(r["seg_p"], reverse=True)
        k = ps[0]
        if len(ps) > 1:
            k = max(k, ps[1] / ratio)
        keys.append(k)
    keys.sort(reverse=True)
    if target_fp >= len(keys):
        return (0.0, 0.0, len(keys))
    # flag count is #{key >= primary}; take primary just above the target_fp-th key
    p = keys[target_fp] + 1e-9 if target_fp < len(keys) else 1.0
    p = min(p, 1.0)
    fp = sum(1 for k in keys if k >= p)
    return (round(p, 6), round(p * ratio, 6), fp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="directory holding old-*/<new>-* scored jsonl")
    ap.add_argument("--new", default="new", help="score-file prefix for the candidate")
    a = ap.parse_args()
    D = a.dir

    SETS = os.environ.get("C3SETS", "")

    def splits(name):
        """split labels live with the source sets, not the scores"""
        f = os.path.join(SETS, f"{name}.jsonl")
        if not SETS or not os.path.exists(f):
            return {}
        return {r["id"]: r.get("split") for r in load(f)}

    def L(tag, name):
        rows = load(os.path.join(D, f"{tag}-{name}.jsonl"))
        sp = splits(name)
        for r in rows:
            if r["id"] in sp:
                r["split"] = sp[r["id"]]
        return rows

    NEW = a.new
    old_hu, new_hu = L("old", "lf-hu"), L(NEW, "lf-hu")
    old_ai, new_ai = L("old", "lf-ai"), L(NEW, "lf-ai")
    target = sum(flagged(r["seg_p"]) for r in old_hu)
    pri_new, sec_new, got = refit(new_hu, target)
    print("=" * 110)
    print("CYCLE-3 TWO-AXIS RETRAIN - before / after, fp32 server runtime, segments-v3")
    print("=" * 110)
    print(f"\nOld model: cycle-2 fp32, temperature 0.8324, shipped pair {PRIMARY}/{SECONDARY}")
    print(f"New model: cycle-3 fp32, own temperature, same pair; refitted pair "
          f"{pri_new}/{sec_new} chosen to match the old model's long-form human "
          f"false positives ({target} -> {got} of {len(old_hu)})")

    # 4. long-form regression
    print("\n" + "-" * 110)
    print("BAR 4  LONG-FORM DETECTION (must not regress from 883/922 = 95.77%)")
    p_ai = pair(old_ai, new_ai)
    n = len(p_ai)
    fo = [flagged(x["seg_p"]) for x, y in p_ai]
    fn = [flagged(y["seg_p"]) for x, y in p_ai]
    fr = [flagged(y["seg_p"], pri_new, sec_new) for x, y in p_ai]
    print(f"  old              {cell(sum(fo), n)}")
    print(f"  new shipped pair {cell(sum(fn), n)}   McNemar {mcnemar(fo, fn)}")
    print(f"  new refitted     {cell(sum(fr), n)}   McNemar {mcnemar(fo, fr)}")

    print("\n  by document length band - the floor must hold in every band, "
          "not only in aggregate:")
    def lband(x, y):
        w = x.get("n_words") or 0
        for lo, hi, nm in ((0, 600, "<600"), (600, 850, "600-849"),
                           (850, 1200, "850-1199"), (1200, 2000, "1200-1999"),
                           (2000, 10 ** 9, ">=2000")):
            if lo <= w < hi:
                return nm
        return ">=2000"
    table("", p_ai, lband,
          ["<600", "600-849", "850-1199", "1200-1999", ">=2000"], pri_new, sec_new)

    print("\n" + "-" * 110)
    print("BAR 3  FALSE POSITIVES BY REGISTER, long-form human corpus")
    p_hu = pair(old_hu, new_hu)
    n = len(p_hu)
    fo = [flagged(x["seg_p"]) for x, y in p_hu]
    fn = [flagged(y["seg_p"]) for x, y in p_hu]
    fr = [flagged(y["seg_p"], pri_new, sec_new) for x, y in p_hu]
    print(f"  old              {cell(sum(fo), n)}")
    print(f"  new shipped pair {cell(sum(fn), n)}   McNemar {mcnemar(fo, fn)}")
    print(f"  new refitted     {cell(sum(fr), n)}   McNemar {mcnemar(fo, fr)}")
    genres = sorted({x.get("genre") for x, y in p_hu})
    table("  by genre:", p_hu, lambda x, y: x.get("genre"), genres, pri_new, sec_new)

    # 1 + 2. short form
    old_sf, new_sf = L("old", "ai-shortform"), L(NEW, "ai-shortform")
    p_sf = pair(old_sf, new_sf)
    print("\n" + "-" * 110)
    print(f"BAR 1  AI DETECTION BY LENGTH BAND, short-form ({len(p_sf)} documents)")
    table("  ALL short-form samples (834 train / 150 cal / 264 test groups):",
          p_sf, lambda x, y: y["target_len"], [100, 300, 400, 600], pri_new, sec_new)
    held = [(x, y) for x, y in p_sf if y.get("split") == "test"]
    table("  HELD-OUT TEST SPLIT ONLY (group-aware by post slug) - the honest figure:",
          held, lambda x, y: y["target_len"], [100, 300, 400, 600], pri_new, sec_new)
    print("\n  long-form band, for the same table:")
    n = len(p_ai)
    print(f"  {'long-form':<16} {cell(sum(flagged(x['seg_p']) for x,y in p_ai),n):<28} "
          f"{cell(sum(flagged(y['seg_p']) for x,y in p_ai),n):<28} "
          f"{cell(sum(flagged(y['seg_p'],pri_new,sec_new) for x,y in p_ai),n):<28}")

    print("\n" + "-" * 110)
    print("BAR 2  AI DETECTION BY TYPE-TOKEN RATIO BAND, short-form at 300w and above")
    long_sf = [(x, y) for x, y in p_sf if y["target_len"] >= 300]
    table("  ALL:", long_sf, lambda x, y: tbin(y["ttr"]), TBINS, pri_new, sec_new)
    held_l = [(x, y) for x, y in long_sf if y.get("split") == "test"]
    table("  HELD-OUT TEST SPLIT ONLY:", held_l, lambda x, y: tbin(y["ttr"]), TBINS,
          pri_new, sec_new)

    # short-form human false positives
    old_hs, new_hs = L("old", "human-shortform-widened"), L(NEW, "human-shortform-widened")
    p_hs = pair(old_hs, new_hs)
    print("\n" + "-" * 110)
    print(f"SHORT-FORM HUMAN FALSE POSITIVES ({len(p_hs)} passages, 9 sources)")
    never = [(x, y) for x, y in p_hs if y.get("split") in ("never-trained", "test")]
    n = len(never)
    fo = [flagged(x["seg_p"]) for x, y in never]
    fn = [flagged(y["seg_p"]) for x, y in never]
    fr = [flagged(y["seg_p"], pri_new, sec_new) for x, y in never]
    print(f"  held-out only ({n} passages: 3,200 from sources never trained on, "
          f"plus the opace test split)")
    print(f"  old              {cell(sum(fo), n)}")
    print(f"  new shipped pair {cell(sum(fn), n)}   McNemar {mcnemar(fo, fn)}")
    print(f"  new refitted     {cell(sum(fr), n)}   McNemar {mcnemar(fo, fr)}")
    srcs = sorted({y["source"] for x, y in never})
    table("  by source (held-out passages only):", never,
          lambda x, y: y["source"], srcs, pri_new, sec_new)
    table("  by length band (held-out passages only):", never,
          lambda x, y: y["target_len"], [100, 300, 400, 600], pri_new, sec_new)

    # the nine
    old_9, new_9 = L("old", "nine"), L(NEW, "nine")
    print("\n" + "-" * 110)
    print("BAR 5  THE OWNER'S NINE DOCUMENTS  (none was trained on)")
    print(f"  {'document':<34} {'old p_max':>10} {'old':>6} {'new p_max':>10} {'new':>6} "
          f"{'new refit':>10}")
    o = {r["id"]: r for r in old_9}
    for r in new_9:
        x = o[r["id"]]
        po, pn = max(x["seg_p"]), max(r["seg_p"])
        print(f"  {r['id']:<34} {po:10.4f} {'FLAG' if flagged(x['seg_p']) else 'clear':>6} "
              f"{pn:10.4f} {'FLAG' if flagged(r['seg_p']) else 'clear':>6} "
              f"{'FLAG' if flagged(r['seg_p'],pri_new,sec_new) else 'clear':>10}")

    # 6. does the flag point move
    print("\n" + "-" * 110)
    print("BAR 6  WHERE THE OPERATING POINT WOULD SIT")
    print(f"  {'primary':>9} {'secondary':>10} {'lf human FP':>14} {'lf AI det':>12} "
          f"{'shortform AI det (test)':>24}")
    heldsf = [y for x, y in held]
    for p in (0.9700, 0.9763, 0.9800, 0.9845, 0.9855, 0.9900, 0.9950):
        s = round(p * SECONDARY / PRIMARY, 5)
        fp = sum(flagged(r["seg_p"], p, s) for r in new_hu)
        det = sum(flagged(r["seg_p"], p, s) for r in new_ai)
        sd = sum(flagged(r["seg_p"], p, s) for r in heldsf)
        print(f"  {p:9.4f} {s:10.4f} {fp:6d}/{len(new_hu):<7d} {det:5d}/{len(new_ai):<6d} "
              f"{sd:9d}/{len(heldsf):<12d}")


if __name__ == "__main__":
    main()

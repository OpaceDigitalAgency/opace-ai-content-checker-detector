"""Slice the cycle-2 fp32 re-score of the generated corpus at the shipped pair.

Usable rows only (usable == true, 4,016 of 4,050). Every figure prints its
numerator and denominator. Verdict: highest section >= 0.9855 OR
second-highest >= 0.9763, segments-v3, fp32 reference runtime.
"""
import json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
PRIMARY, SECONDARY = 0.9855, 0.9763


def flagged(seg_p):
    s = sorted(seg_p, reverse=True)
    return bool(s) and (s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY))


rows = [json.loads(l) for l in open(os.path.join(HERE, "generated-fp32.jsonl"))]
membership = json.load(open(os.path.join(HERE, "cycle2-membership.json")))
for r in rows:
    r["c2_split"] = membership.get(r["id"])
usable = [r for r in rows if r.get("usable")]
print(f"scored rows {len(rows)}, usable {len(usable)}")


def table(name, key):
    agg = defaultdict(lambda: [0, 0])
    for r in usable:
        k = key(r)
        agg[k][0] += flagged(r["seg_p"])
        agg[k][1] += 1
    print(f"\n== by {name}")
    for k in sorted(agg, key=lambda k: -agg[k][0] / agg[k][1]):
        a, b = agg[k]
        print(f"   {str(k):42s} {a}/{b} = {100*a/b:.1f}%")


n = len(usable)
f = sum(flagged(r["seg_p"]) for r in usable)
print(f"\nOVERALL flagged {f}/{n} = {100*f/n:.1f}%")

table("register_family", lambda r: r["register_family"])
table("register", lambda r: r["register"])
table("prompt_style", lambda r: r["prompt_style"])
table("model_tier", lambda r: r["model_tier"])
table("provider", lambda r: r["provider"])
table("model", lambda r: r["model"])
table("length_band", lambda r: r["length_band"])

# style x family cross
agg = defaultdict(lambda: [0, 0])
for r in usable:
    k = (r["register_family"], r["prompt_style"])
    agg[k][0] += flagged(r["seg_p"])
    agg[k][1] += 1
print("\n== register_family x prompt_style")
for k in sorted(agg):
    a, b = agg[k]
    print(f"   {k[0]:16s} {k[1]:12s} {a}/{b} = {100*a/b:.1f}%")

# style x model for grok and the extremes
agg = defaultdict(lambda: [0, 0])
for r in usable:
    k = (r["model"], r["prompt_style"])
    agg[k][0] += flagged(r["seg_p"])
    agg[k][1] += 1
print("\n== model x prompt_style (grok)")
for k in sorted(agg):
    if "grok" in k[0]:
        a, b = agg[k]
        print(f"   {k[0]:32s} {k[1]:12s} {a}/{b} = {100*a/b:.1f}%")

table("cycle2 membership (None = independent of every cycle-2 split)",
      lambda r: r["c2_split"] or "independent")

# independent-only slices — the rows cycle 2 never saw in any split
indep = [r for r in usable if r["c2_split"] is None]
print(f"\n#### INDEPENDENT-ONLY subset, n={len(indep)} ####")


def itable(name, key):
    agg = defaultdict(lambda: [0, 0])
    for r in indep:
        k = key(r)
        agg[k][0] += flagged(r["seg_p"])
        agg[k][1] += 1
    print(f"\n== independent, by {name}")
    for k in sorted(agg, key=lambda k: -agg[k][0] / agg[k][1]):
        a, b = agg[k]
        print(f"   {str(k):42s} {a}/{b} = {100*a/b:.1f}%")


itable("register_family", lambda r: r["register_family"])
itable("prompt_style", lambda r: r["prompt_style"])
agg = defaultdict(lambda: [0, 0])
for r in indep:
    k = (r["register_family"], r["prompt_style"])
    agg[k][0] += flagged(r["seg_p"])
    agg[k][1] += 1
print("\n== independent, register_family x prompt_style")
for k in sorted(agg):
    a, b = agg[k]
    print(f"   {k[0]:16s} {k[1]:12s} {a}/{b} = {100*a/b:.1f}%")

a = sum(flagged(r["seg_p"]) for r in indep if r["words"] >= 600 and r["register_family"] != "social-post")
b = sum(1 for r in indep if r["words"] >= 600 and r["register_family"] != "social-post")
print(f"\nindependent long-form-comparable (>=600 words, non-social): {a}/{b} = {100*a/b:.1f}%")

# long-form-comparable subset: docs >= 600 words, non-social
sub = [r for r in usable if r["words"] >= 600 and r["register_family"] != "social-post"]
a = sum(flagged(r["seg_p"]) for r in sub)
print(f"\nlong-form-comparable subset (>=600 words, non-social): "
      f"{a}/{len(sub)} = {100*a/len(sub):.1f}%")

"""Held-out long-form corpus at the shipped pair, from the canonical 4dp store."""
import json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(HERE, "..", "..", "corpus-reconciliation-2026-08-29", "raw")
PRIMARY, SECONDARY = 0.9855, 0.9763


def flagged(seg_p):
    s = sorted(seg_p, reverse=True)
    return bool(s) and (s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY))


def pct(a, b):
    return f"{a}/{b} = {100*a/b:.1f}%"


for fn, side in (("lf-ai.jsonl", "ai"), ("lf-hu.jsonl", "human")):
    total = defaultdict(lambda: [0, 0])
    style = defaultdict(lambda: [0, 0])
    n = f = 0
    for line in open(os.path.join(STORE, fn)):
        r = json.loads(line)
        hit = flagged(r["seg_p"])
        n += 1
        f += hit
        total[r["register"]][0] += hit
        total[r["register"]][1] += 1
        style[r.get("prompt_style") or "-"][0] += hit
        style[r.get("prompt_style") or "-"][1] += 1
    print(f"== {side}: {pct(f, n)}")
    for k in sorted(total, key=lambda k: -total[k][0] / total[k][1]):
        print(f"   {k:28s} {pct(*reversed(total[k]))}" if False else
              f"   {k:28s} {pct(total[k][0], total[k][1])}")
    print(f"   -- by prompt_style")
    for k in sorted(style):
        print(f"   {k:28s} {pct(style[k][0], style[k][1])}")

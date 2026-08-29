"""Merge all generation passes into generated.jsonl.

- backfills `tier` (pro-flagship / standard / flash-or-mini) on every row
- backfills length_band / target_words on pass-1 rows
- quarantines exact duplicates by text sha256
"""
import collections, json, os
from generate import TIER

HERE = os.path.dirname(os.path.abspath(__file__))
PASSES = [("generated-pass1-raw.jsonl", "pass1"), ("generated-pass2.jsonl", "pass2"),
          ("generated-pass3a.jsonl", "pass3"), ("generated-pass3b.jsonl", "pass3"),
          ("generated-pass3c.jsonl", "pass3")]

rows, errors, seen = [], [], {}
dupes = collections.Counter()
for fn, tag in PASSES:
    p = os.path.join(HERE, fn)
    if not os.path.exists(p):
        print("missing", fn); continue
    for line in open(p):
        d = json.loads(line)
        if d.get("__error__"):
            d["pass"] = tag; errors.append(d); continue
        d["pass"] = tag
        d["tier"] = d["model_tier"] = TIER.get(d["model_requested"], "unknown")
        d.setdefault("length_band", "long")
        d.setdefault("target_words", [600, 1000])
        h = d["sha256"]
        if h in seen:
            dupes[d["model_requested"]] += 1
            continue
        seen[h] = True
        rows.append(d)

with open(os.path.join(HERE, "generated.jsonl"), "w") as f:
    for r in rows:
        f.write(json.dumps(r) + "\n")
with open(os.path.join(HERE, "generation-errors.jsonl"), "w") as f:
    for r in errors:
        f.write(json.dumps(r) + "\n")

print(f"kept {len(rows)}  duplicates dropped {sum(dupes.values())}  errors {len(errors)}")
if dupes: print("dupes by model:", dict(dupes))
print("by model:", json.dumps(dict(sorted(collections.Counter(r['model_requested'] for r in rows).items())), indent=1))
print("by tier:", dict(collections.Counter(r['tier'] for r in rows)))
print("by style:", dict(collections.Counter(r['prompt_style'] for r in rows)))
print("words:", min(r['words'] for r in rows), max(r['words'] for r in rows))

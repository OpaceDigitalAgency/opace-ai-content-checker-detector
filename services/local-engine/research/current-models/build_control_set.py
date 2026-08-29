"""REGISTER CONTROL.

The current corpus mixes two things at once: newer models AND a different
register (article prose / forum narrative rather than chat reply). GRADTEX
contains OLD generators in the SAME register, same domains, same pipeline
as its 2026 generators. Scoring those isolates the era effect from the
register effect inside one source.

Generators used as controls: gpt-3.5-turbo (Nov 2022), davinci-003 (Nov 2022),
davinci-002 (2021 base), mistral-small-3.2-24b-instruct (Jun 2025 - i.e. the
last release BEFORE our mid-2025 cutoff).
"""
from __future__ import annotations
import hashlib, json, os, random, re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "control-eval-set.jsonl")
CONTROLS = {
    "gpt-3.5-turbo": ("openai", "control-2022-23", "2022-11"),
    "davinci-003": ("openai", "control-2022-23", "2022-11"),
    "davinci-002": ("openai", "control-2021", "2021-06"),
    "mistral-small-3.2-24b-instruct": ("mistral", "control-2025-mid", "2025-06"),
}


def main() -> None:
    rng = random.Random(20260828)
    g = pd.read_parquet(os.path.join(HERE, "raw", "gradtex-test.parquet"))
    g = g[g["multiclass_label"].astype(str) == "MGT"]
    rows, seen = [], set()
    pools: dict[str, list] = {}
    for _, r in g.iterrows():
        gm = str(r["generator_model"])
        if gm in CONTROLS:
            pools.setdefault(gm, []).append((r["text"], str(r["domain"])))
    for gm, pool in sorted(pools.items()):
        prov, era, rel = CONTROLS[gm]
        rng.shuffle(pool)
        kept = 0
        for t, domain in pool:
            if kept >= 150:
                break
            w = len(t.split())
            if w < 120 or w > 1200 or not t:
                continue
            if sum(1 for c in t if ord(c) < 128) / len(t) < 0.97:
                continue
            h = hashlib.sha256(t.encode()).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            rows.append({"id": f"ctl-{prov}-{h[:10]}", "provider": prov, "era": era,
                         "model": gm, "side": "ai", "genre": domain,
                         "register": "article-prose", "model_release": rel,
                         "source": "elisabeth-pl-pl/GRADTEX", "licence": "cc-by-4.0",
                         "words": w, "sha256": h, "text": t})
            kept += 1
        print(f"control {gm:34s} pool={len(pool):5d} kept={kept}", flush=True)
    with open(OUT, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"wrote {len(rows)} -> {OUT}")


if __name__ == "__main__":
    main()

"""Does the score track HOW MUCH of a document is AI, or only whether it is?

HAT-Bench supplies the same source document at nine levels of AI involvement
(v0 human original through v8 near-total rewrite). A binary detector that only
fires on wholesale generation is of little use to a teacher or an editor, whose
actual question is 'how much of this was written by a machine'. This measures
whether the cycle-2 probability rises monotonically along that trajectory, and
reports Spearman correlation against the edit level.
"""
from __future__ import annotations
import json, os
import numpy as np
from scipy.stats import spearmanr

HERE = os.path.dirname(os.path.abspath(__file__))
rows = [json.loads(l) for l in open(os.path.join(HERE, "dataset.jsonl"))]
test = [r for r in rows if r["split"] == "test" and not r.get("eval_only")]
cache = json.load(open(os.path.join(HERE, "scores-cache.json")))

out = {}
for name in ("shipped", "cycle2"):
    lg = np.array(cache[f"{name}:test"])
    e = np.exp(lg - lg.max(1, keepdims=True))
    p = e[:, 1] / e.sum(1)
    # HAT-Bench ordinal ladder: human original, then v1..v8
    ladder, xs, ys = {}, [], []
    for r, pp in zip(test, p):
        lvl = r.get("edit_level")
        if r["side"] == "human" and str(r.get("source", "")).startswith("hatbench"):
            lvl = "v0-human"
        if lvl is None or not (lvl == "v0-human" or (isinstance(lvl, str) and lvl.startswith("v"))):
            continue
        ladder.setdefault(lvl, []).append(float(pp))
        xs.append(0 if lvl == "v0-human" else int(lvl[1:]))
        ys.append(float(pp))
    rungs = {k: {"n": len(v), "median": round(float(np.median(v)), 4),
                 "mean": round(float(np.mean(v)), 4)}
             for k, v in sorted(ladder.items())}
    rho = float(spearmanr(xs, ys).statistic) if len(set(xs)) > 1 else float("nan")
    # the other, non-HAT edit families
    fam = {}
    for r, pp in zip(test, p):
        lvl = r.get("edit_level")
        if lvl in ("full-generation", "light-edit", "paraphrase",
                   "partial-completion", "style-rewrite"):
            fam.setdefault(lvl, []).append(float(pp))
    fams = {k: {"n": len(v), "median": round(float(np.median(v)), 4)}
            for k, v in sorted(fam.items())}
    out[name] = {"hatbench_ladder": rungs, "spearman_vs_edit_level": round(rho, 4),
                 "edit_families": fams}

json.dump(out, open(os.path.join(HERE, "edit-trajectory.json"), "w"), indent=2)
for n, v in out.items():
    print(f"== {n}: Spearman(score, edit level) = {v['spearman_vs_edit_level']}")
    for k, d in v["hatbench_ladder"].items():
        print(f"   {k:10s} n={d['n']:3d} median {d['median']:.3f}")
    for k, d in v["edit_families"].items():
        print(f"   [{k:19s}] n={d['n']:4d} median {d['median']:.3f}")

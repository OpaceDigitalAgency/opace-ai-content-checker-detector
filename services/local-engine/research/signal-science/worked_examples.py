"""Show the scorecard's arithmetic on three real documents, line by line.

One clearly machine-written, one clearly human, one that both models find hard.
Every document used here is either owner-generated (unrestricted) or carries an
open licence that permits the short excerpt shown; the evaluation-only battery
corpora are never quoted.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "results")

QUOTABLE_LICENCES = ("cc by", "cc0", "ogl", "public domain", "owner-generated",
                     "openrouter", "unrestricted")


def quotable(d):
    lic = (d.get("licence") or "").lower()
    return any(x in lic for x in QUOTABLE_LICENCES)


def main() -> None:
    full = json.load(open(os.path.join(R, "scorecard-model.json")))
    art = full["prose_only"]          # the recommended variant
    keys = art["features"]
    wts = np.array(art["weights"])
    lo, hi = np.array(art["winsor_lo"]), np.array(art["winsor_hi"])
    mu, sd = np.array(art["mean"]), np.array(art["sd"])
    med = np.array(art["median"])
    b0 = art["intercept"]

    docs = {json.loads(l)["id"]: json.loads(l)
            for l in open(os.path.join(HERE, "corpus", "docs.jsonl"), encoding="utf-8")}
    feats = {}
    for line in open(os.path.join(HERE, "corpus", "features.jsonl"), encoding="utf-8"):
        r = json.loads(line)
        feats[r["id"]] = r
    neural = {}
    for line in open(os.path.join(HERE, "corpus", "neural-scores.jsonl"), encoding="utf-8"):
        d = json.loads(line)
        neural[d["id"]] = d

    def score(fid):
        f = feats[fid]["f"]
        x = np.array([f.get(k, np.nan) for k in keys], dtype=float)
        x = np.where(np.isnan(x), med, x)
        xc = np.clip(x, lo, hi)
        z = (xc - mu) / sd
        contrib = wts * z
        lodds = b0 + contrib.sum()
        return x, xc, z, contrib, lodds, 1 / (1 + np.exp(-lodds))

    # candidates: fresh long-form, quotable licence, scored by both models
    cand = [d for d in docs.values()
            if d["pool"] in ("ai-longform", "human-longform")
            and d["id"] in feats and d["id"] in neural and quotable(d)
            and 400 <= d["words"] <= 1600]
    scored = []
    for d in cand:
        *_, p = score(d["id"])
        scored.append((d, p, neural[d["id"]]["prob_cal"]))

    ai = [x for x in scored if x[0]["side"] == "ai"]
    hu = [x for x in scored if x[0]["side"] == "human"]
    picks = []
    if ai:
        picks.append(("clearly machine-written", max(ai, key=lambda x: x[1])))
    if hu:
        picks.append(("clearly human-written", min(hu, key=lambda x: x[1])))
    # borderline: closest to the scorecard's own 1%-FP operating point
    ev = json.load(open(os.path.join(R, "scorecard-eval.json")))
    thr = ev["evaluation"]["fresh_longform"]["scorecard_prose_only"]["thresholds"]["1%"]["threshold"]
    if scored:
        picks.append(("borderline", min(scored, key=lambda x: abs(x[1] - thr))))

    from make_tables import name
    out = ["# Worked examples: the scorecard's arithmetic, line by line", "",
           "Three real documents from the fresh long-form corpus, none of which "
           "either model was trained on. The **prose-only** scorecard is used "
           "throughout, because that is the variant recommended for shipping. "
           "Its operating threshold on "
           f"this split, at a 1% human false-positive budget, is **{thr:.4f}**.", "",
           "Only openly licensed or owner-generated documents are quoted; the "
           "evaluation-licence human battery is never excerpted.", ""]

    for label, (d, p, npr) in picks:
        x, xc, z, contrib, lodds, _ = score(d["id"])
        order = np.argsort(-np.abs(contrib))
        out += [f"## {label}", "",
                f"- id `{d['id']}` — **truly {d['side']}**",
                f"- register: {d.get('register')} ({d['register_family']}), "
                f"{d['words']:,} words",
                f"- source: {d.get('source')}; licence: {d.get('licence')}",
                f"- **scorecard score {p:.4f}** "
                f"({'flagged' if p >= thr else 'not flagged'} at the 1% operating point)",
                f"- deployed neural score {npr:.4f} "
                f"({'flagged' if npr >= 0.984 else 'not flagged'} at the shipped 0.984)",
                "", "Opening of the document:", "",
                "> " + " ".join(d["text"].split())[:320].replace("\n", " ") + " …", "",
                "| signal | this document | training mean | SD | z | weight | contribution |",
                "|---|---:|---:|---:|---:|---:|---:|"]
        for i in order:
            out.append(
                f"| {name(keys[i])} | {x[i]:.4g} | {mu[i]:.4g} | {sd[i]:.4g} | "
                f"{z[i]:+.2f} | {wts[i]:+.3f} | **{contrib[i]:+.3f}** |")
        out += [f"| _intercept_ | | | | | | **{b0:+.3f}** |",
                f"| **total log-odds** | | | | | | **{lodds:+.3f}** |",
                "", f"score = 1 / (1 + exp(−{lodds:.3f})) = **{p:.4f}**", ""]
        pos = contrib[contrib > 0].sum()
        neg = contrib[contrib < 0].sum()
        out += [f"Machine-leaning evidence totals {pos:+.3f}; human-leaning "
                f"evidence totals {neg:+.3f}. The three largest single "
                "contributions are "
                + ", ".join(f"{name(keys[i])} ({contrib[i]:+.3f})" for i in order[:3])
                + ".", ""]

    open(os.path.join(HERE, "tables", "worked-examples.md"), "w",
         encoding="utf-8").write("\n".join(out) + "\n")
    print("wrote tables/worked-examples.md")
    for label, (d, p, npr) in picks:
        print(f"  {label:26s} {d['side']:6s} scorecard {p:.4f}  neural {npr:.4f}")


if __name__ == "__main__":
    sys.exit(main())

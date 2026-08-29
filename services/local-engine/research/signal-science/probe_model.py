"""Part 2: open the black box.

Three independent lines of evidence about what the deployed cycle-2 model keys
on, because no single one of them proves anything on its own:

  ablation    Change one property of a document, hold the rest constant, and
              measure the shift in the model's margin. This is the only line
              here that supports a causal reading, and only for the property
              actually manipulated.
  occlusion   Delete each sentence in turn and measure the shift. Gives a
              per-sentence attribution, which is then correlated with the
              interpretable features of the deleted sentence to ask *what kind*
              of sentence carries the evidence.
  correlation Rank-correlate the model's margin with each interpretable feature
              across a large held-out sample. Says what the score co-varies
              with; says nothing about mechanism.

Honest limits are stated in SIGNAL-SCIENCE.md rather than implied here: an
ablation that changes the score proves the model is sensitive to what was
changed, not that the change is the model's reason; occlusion attributions are
unstable for near-duplicate sentences; and correlation over a corpus in which
AI and human writing differ on many correlated axes cannot separate them.
"""
from __future__ import annotations

import json
import os
import random
import re
import sys

import numpy as np
from scipy import stats

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import features as F                                     # noqa: E402
from score_neural import Scorer, prob_cal                # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results")
DOCS = os.path.join(HERE, "corpus", "docs.jsonl")
FEATS = os.path.join(HERE, "corpus", "features.jsonl")
NEURAL = os.path.join(HERE, "corpus", "neural-scores.jsonl")

N_ABLATE = 400          # per side
N_OCCLUDE = 120         # total


# --- ablations -------------------------------------------------------------

def strip_markdown(t):
    t = re.sub(r"^\s{0,3}#{1,6}\s*", "", t, flags=re.M)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", t)
    t = re.sub(r"^\s*[-*•]\s+", "", t, flags=re.M)
    t = re.sub(r"^\s*\d+[.)]\s+", "", t, flags=re.M)
    t = re.sub(r"^\s*>+\s*", "", t, flags=re.M)
    t = re.sub(r"`+", "", t)
    return t


def normalise_punctuation(t):
    for a, b in (("—", "-"), ("–", "-"), ("’", "'"), ("‘", "'"),
                 ("“", '"'), ("”", '"'), ("…", "..."), (" ", " ")):
        t = t.replace(a, b)
    return t


def shuffle_sentences(t, rng):
    s = F._sentences(t)
    rng.shuffle(s)
    return " ".join(s)


def shuffle_paragraphs(t, rng):
    p = [x for x in t.split("\n\n") if x.strip()] or [x for x in t.split("\n") if x.strip()]
    rng.shuffle(p)
    return "\n\n".join(p)


def truncate_words(t, n):
    w = t.split()
    return " ".join(w[:n])


def drop_first_paragraph(t):
    p = [x for x in t.split("\n\n") if x.strip()] or [x for x in t.split("\n") if x.strip()]
    return "\n\n".join(p[1:]) if len(p) > 1 else t


def strip_cliche(t):
    """Delete the 2023-24 'AI vocabulary' outright. If the model were running a
    keyword list this would gut it."""
    def sub(m):
        return "" if m.group(0).lower() in F.CLICHE else m.group(0)
    t = F.WORD_RE.sub(sub, t)
    for p in F.CLICHE_PHRASES:
        t = re.sub(re.escape(p), "", t, flags=re.I)
    return re.sub(r"\s{2,}", " ", t)


def increase_repetition(t, rng, rate=0.25):
    """The direct causal test of the under-repetition finding: make the text
    repeat itself more, changing nothing else. Each content word is replaced,
    with probability `rate`, by the document's most frequent content word of a
    similar length, so length and function-word structure are preserved and only
    lexical variety falls."""
    words = F.WORD_RE.findall(t)
    content = [w.lower() for w in words if w.lower() not in F.STOPWORDS and len(w) > 3]
    if len(set(content)) < 10:
        return t
    from collections import Counter
    common = [w for w, _ in Counter(content).most_common(8)]
    out, i = [], 0

    def repl(m):
        w = m.group(0)
        if w.lower() in F.STOPWORDS or len(w) <= 3 or rng.random() > rate:
            return w
        cand = min(common, key=lambda c: abs(len(c) - len(w)))
        return cand.capitalize() if w[0].isupper() else cand
    return F.WORD_RE.sub(repl, t)


def decrease_repetition(t, rng, rate=0.35):
    """The mirror: break up repeated content words by suffixing a distinguishing
    marker, raising lexical variety without changing sentence structure. Crude
    on purpose — the point is the direction of the score shift, not fluency."""
    from collections import Counter
    words = F.WORD_RE.findall(t)
    c = Counter(w.lower() for w in words if w.lower() not in F.STOPWORDS)
    repeated = {w for w, n in c.items() if n >= 3}
    seen = {}
    suffixes = ["ing", "al", "ive", "ary", "ic", "ous", "ent", "ial"]

    def repl(m):
        w = m.group(0)
        lw = w.lower()
        if lw not in repeated or rng.random() > rate:
            return w
        k = seen.get(lw, 0)
        seen[lw] = k + 1
        return w + suffixes[k % len(suffixes)]
    return F.WORD_RE.sub(repl, t)


def flatten_rhythm(t):
    """Split every sentence at its commas, producing uniformly short sentences.
    If the model reads rhythm, this should move it a long way."""
    out = []
    for s in F._sentences(t):
        parts = [p.strip(" ,;") for p in s.split(",") if p.strip(" ,;")]
        for p in parts:
            out.append(p[0].upper() + p[1:] if p else p)
    return ". ".join(out) + "."


ABLATIONS = {
    "strip_markdown": lambda t, r: strip_markdown(t),
    "normalise_punctuation": lambda t, r: normalise_punctuation(t),
    "strip_markdown_and_punctuation": lambda t, r: normalise_punctuation(strip_markdown(t)),
    "shuffle_sentences": shuffle_sentences,
    "shuffle_paragraphs": shuffle_paragraphs,
    "lowercase": lambda t, r: t.lower(),
    "drop_first_paragraph": lambda t, r: drop_first_paragraph(t),
    "strip_cliche_vocabulary": lambda t, r: strip_cliche(t),
    "increase_repetition": increase_repetition,
    "decrease_repetition": decrease_repetition,
    "flatten_rhythm": lambda t, r: flatten_rhythm(t),
    "truncate_400w": lambda t, r: truncate_words(t, 400),
    "truncate_200w": lambda t, r: truncate_words(t, 200),
    "truncate_100w": lambda t, r: truncate_words(t, 100),
}


def main() -> None:
    os.makedirs(RESULTS, exist_ok=True)
    docs = {json.loads(l)["id"]: json.loads(l) for l in open(DOCS, encoding="utf-8")}
    feats = {}
    for line in open(FEATS, encoding="utf-8"):
        r = json.loads(line)
        feats[r["id"]] = r
    neural = {}
    if os.path.exists(NEURAL):
        for line in open(NEURAL):
            d = json.loads(line)
            neural[d["id"]] = d

    rng = random.Random(4242)
    scorer = Scorer()
    res = {}

    # --- ablation study ----------------------------------------------------
    # Fresh long-form only: the registers the tool is aimed at, and text
    # neither the model nor the scorecard has ever seen.
    pool_ai = [d for d in docs.values() if d["pool"] == "ai-longform"]
    pool_hu = [d for d in docs.values() if d["pool"] == "human-longform"]
    samp = rng.sample(pool_ai, min(N_ABLATE, len(pool_ai))) + \
        rng.sample(pool_hu, min(N_ABLATE, len(pool_hu)))
    base = scorer.margins([d["text"] for d in samp])
    print(f"ablation base: {len(samp)} docs "
          f"({sum(1 for d in samp if d['side']=='ai')} AI)", flush=True)

    ab = {}
    for name, fn in ABLATIONS.items():
        r2 = random.Random(99)
        texts = [fn(d["text"], r2) for d in samp]
        m = scorer.margins(texts)
        d_all = m - base
        rec = {}
        for side in ("ai", "human"):
            k = np.array([d["side"] == side for d in samp])
            b, a = base[k], m[k]
            rec[side] = {
                "n": int(k.sum()),
                "mean_margin_before": float(b.mean()),
                "mean_margin_after": float(a.mean()),
                "mean_delta_margin": float((a - b).mean()),
                "median_delta_margin": float(np.median(a - b)),
                "mean_prob_before": float(prob_cal(b).mean()),
                "mean_prob_after": float(prob_cal(a).mean()),
                "flag_rate_before": float((prob_cal(b) >= 0.984).mean()),
                "flag_rate_after": float((prob_cal(a) >= 0.984).mean()),
            }
        rec["ai_detection_change_pp"] = round(
            (rec["ai"]["flag_rate_after"] - rec["ai"]["flag_rate_before"]) * 100, 2)
        rec["human_fp_change_pp"] = round(
            (rec["human"]["flag_rate_after"] - rec["human"]["flag_rate_before"]) * 100, 2)
        ab[name] = rec
        print(f"  {name:32s} AI flag {rec['ai']['flag_rate_before']*100:5.1f}% -> "
              f"{rec['ai']['flag_rate_after']*100:5.1f}%   "
              f"human FP {rec['human']['flag_rate_before']*100:4.1f}% -> "
              f"{rec['human']['flag_rate_after']*100:4.1f}%", flush=True)
    res["ablations"] = ab
    res["ablation_n"] = {"ai": sum(1 for d in samp if d["side"] == "ai"),
                         "human": sum(1 for d in samp if d["side"] == "human")}

    # --- sentence occlusion ------------------------------------------------
    occ_pool = rng.sample(samp, min(N_OCCLUDE, len(samp)))
    sent_rows = []
    for di, d in enumerate(occ_pool):
        sents = F._sentences(d["text"])
        if not (5 <= len(sents) <= 60):
            continue
        variants = [" ".join(sents[:i] + sents[i + 1:]) for i in range(len(sents))]
        full = scorer.margins([d["text"]])[0]
        mv = scorer.margins(variants)
        for i, (s, m) in enumerate(zip(sents, mv)):
            # positive attribution = removing this sentence LOWERS the AI score,
            # i.e. the sentence was pushing the document towards "machine"
            sent_rows.append({"doc": d["id"], "side": d["side"], "pos": i / len(sents),
                              "attr": float(full - m), "sent": s})
        if di % 20 == 0:
            print(f"  occlusion {di}/{len(occ_pool)}", flush=True)
    print(f"occlusion: {len(sent_rows)} sentences from "
          f"{len({r['doc'] for r in sent_rows})} documents", flush=True)

    # what kind of sentence carries the evidence?
    sf = []
    for r in sent_rows:
        try:
            sf.append(F.extract(r["sent"]))
        except Exception:                                # noqa: BLE001
            sf.append({})
    attr = np.array([r["attr"] for r in sent_rows])
    keys = sorted({k for x in sf for k in x})
    corr = {}
    for k in keys:
        v = np.array([x.get(k, np.nan) for x in sf], dtype=float)
        ok = np.isfinite(v) & np.isfinite(attr)
        if ok.sum() < 200 or v[ok].std() < 1e-9:
            continue
        rho = stats.spearmanr(v[ok], attr[ok])
        corr[k] = {"spearman": float(rho.statistic), "p": float(rho.pvalue),
                   "n": int(ok.sum())}
    res["occlusion"] = {
        "n_sentences": len(sent_rows),
        "n_docs": len({r["doc"] for r in sent_rows}),
        "attr_mean": float(attr.mean()), "attr_sd": float(attr.std()),
        "share_positive": float((attr > 0).mean()),
        "position_spearman": float(stats.spearmanr(
            [r["pos"] for r in sent_rows], attr).statistic),
        "sentence_feature_correlation": corr,
        "top_positive_examples": sorted(
            sent_rows, key=lambda r: -r["attr"])[:15],
        "top_negative_examples": sorted(sent_rows, key=lambda r: r["attr"])[:15],
    }
    # concentration: is the evidence spread or in a few sentences?
    per_doc = {}
    for r in sent_rows:
        per_doc.setdefault(r["doc"], []).append(abs(r["attr"]))
    conc = []
    for v in per_doc.values():
        v = np.sort(np.array(v))[::-1]
        if v.sum() > 0:
            conc.append(float(v[:max(1, len(v) // 5)].sum() / v.sum()))
    res["occlusion"]["top_quintile_share_of_absolute_attribution"] = float(np.mean(conc))

    # --- correlation of the deployed score with the feature battery --------
    if neural:
        rowsf = [r for r in feats.values()
                 if r["id"] in neural and not r.get("background")]
        fresh = [r for r in rowsf if r["pool"] in ("ai-longform", "human-longform")]
        for label, rs in (("all_scored", rowsf), ("fresh_longform", fresh)):
            if len(rs) < 200:
                continue
            y = np.array([neural[r["id"]]["margin"] for r in rs])
            block = {}
            for k in sorted({k for r in rs[:200] for k in r["f"]}):
                v = np.array([r["f"].get(k, np.nan) for r in rs], dtype=float)
                ok = np.isfinite(v)
                if ok.sum() < 200 or v[ok].std() < 1e-9:
                    continue
                block[k] = float(stats.spearmanr(v[ok], y[ok]).statistic)
            res.setdefault("score_feature_correlation", {})[label] = {
                "n": len(rs), "spearman": block}
        # within-side correlation: strips the trivial "both track the label"
        for side in ("ai", "human"):
            rs = [r for r in fresh if r["side"] == side]
            if len(rs) < 200:
                continue
            y = np.array([neural[r["id"]]["margin"] for r in rs])
            block = {}
            for k in sorted({k for r in rs[:200] for k in r["f"]}):
                v = np.array([r["f"].get(k, np.nan) for r in rs], dtype=float)
                ok = np.isfinite(v)
                if ok.sum() < 150 or v[ok].std() < 1e-9:
                    continue
                block[k] = float(stats.spearmanr(v[ok], y[ok]).statistic)
            res["score_feature_correlation"]["fresh_within_" + side] = {
                "n": len(rs), "spearman": block}

    json.dump(res, open(os.path.join(RESULTS, "model-probe.json"), "w"), indent=1)
    print("\nwrote results/model-probe.json")
    if "score_feature_correlation" in res:
        b = res["score_feature_correlation"]["fresh_longform"]["spearman"]
        print("\nstrongest correlates of the deployed score (fresh long-form):")
        for k in sorted(b, key=lambda k: -abs(b[k]))[:15]:
            print(f"  {k:36s} {b[k]:+.3f}")
    c = res["occlusion"]["sentence_feature_correlation"]
    print("\nsentence-level attribution correlates:")
    for k in sorted(c, key=lambda k: -abs(c[k]["spearman"]))[:12]:
        print(f"  {k:36s} {c[k]['spearman']:+.3f}")


if __name__ == "__main__":
    sys.exit(main())

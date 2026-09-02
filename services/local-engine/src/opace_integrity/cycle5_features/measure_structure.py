"""Tells 1 (keyphrase echo) and 2 (template scaffold): per-doc metrics + threshold sweeps.

Corpora:
  AI    : generated-corpus/generated.jsonl (usable only)   -- markdown preserved
  HUMAN : ../../../../tests/battery/human-corpus-v2.json    -- paragraph structure preserved
  Secondary: longform-corpus ai-longform / human-longform

Usage: python3 measure_structure.py
Outputs (this directory): structure-per-doc.jsonl, structure-summary.json
"""
import json
import os
import sys
import statistics
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from .tells_lib import (parse_doc, norm_tokens, stems, STOPWORDS, CLOSER_RE,
                       sentences, title_case_share, cv, iter_jsonl)

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", ".."))

OPEN_WINDOW = 15   # tokens of a block opening searched for the keyphrase
MIN_BLOCKS = 4     # eligibility for keyphrase echo


def dominant_keyphrase(title, blocks):
    """Best 2-4-gram from the title that recurs in the body. Returns (phrase_tokens, body_count) or None."""
    ttoks = stems(norm_tokens(title))[:25]
    body_stems = [stems(norm_tokens(b)) for b in blocks]
    best = None
    for n in (4, 3, 2):
        for i in range(len(ttoks) - n + 1):
            gram = tuple(ttoks[i:i + n])
            content = sum(1 for t in gram if t not in STOPWORDS)
            if content < 2:
                continue
            count = 0
            for bs in body_stems:
                for j in range(len(bs) - n + 1):
                    if tuple(bs[j:j + n]) == gram:
                        count += 1
            if count >= 2:
                score = (count, n)
                if best is None or score > (best[1], len(best[0])):
                    best = (gram, count)
        if best:
            return best
    return None


def echo_score(doc):
    p = parse_doc(doc)
    blocks = p["blocks"]
    if len(blocks) < MIN_BLOCKS or not p["title"]:
        return None
    kp = dominant_keyphrase(p["title"], blocks)
    # section openings: first paragraph of each section with content; fall back to all blocks
    openings = []
    for sec in p["sections"]:
        if sec:
            openings.append(sec[0])
    if len(openings) < 3:
        openings = blocks
    n = 0
    if kp:
        gram = kp[0]
        L = len(gram)
        for b in openings:
            w = stems(norm_tokens(b))[:OPEN_WINDOW]
            if any(tuple(w[j:j + L]) == gram for j in range(max(0, len(w) - L + 1))):
                n += 1
    return {
        "keyphrase": " ".join(kp[0]) if kp else None,
        "kp_body_count": kp[1] if kp else 0,
        "openings": len(openings),
        "echo_hits": n,
        "echo_share": n / len(openings) if openings else 0.0,
    }


def scaffold(doc):
    p = parse_doc(doc)
    heads = p["headings"]
    secs = [s for s in p["sections"][1:]] if len(p["sections"]) > 1 else []
    # drop trailing empty sections
    paras_per_sec = [len(s) for s in secs if len(s) > 0]
    out = {
        "n_headings": len(heads),
        "n_md_headings": sum(1 for _, md in heads if md),
        "n_blocks": len(p["blocks"]),
    }
    # paragraphs-per-section uniformity (needs >=3 non-empty sections)
    if len(paras_per_sec) >= 3:
        out["pps_cv"] = cv(paras_per_sec)
        out["pps_all_equal"] = len(set(paras_per_sec)) == 1
        out["pps_mode_share"] = Counter(paras_per_sec).most_common(1)[0][1] / len(paras_per_sec)
    # sentences-per-paragraph uniformity (needs >=5 paragraphs)
    spp = [len(sentences(b)) for b in p["blocks"]]
    spp = [s for s in spp if s > 0]
    if len(spp) >= 5:
        out["spp_cv"] = cv(spp)
        out["spp_mean"] = statistics.mean(spp)
    # Title Case share over headings (needs >=3 headings, excluding the doc title)
    body_heads = heads[1:] if heads else []
    tcs = [title_case_share(h) for h, _ in body_heads]
    tcs = [t for t in tcs if t is not None]
    if len(tcs) >= 3:
        out["title_case_share"] = statistics.mean(1.0 if t >= 0.99 else 0.0 for t in tcs)
    # formulaic closer: any heading, or the opening of the last two blocks
    closer = any(CLOSER_RE.match(h.strip()) for h, _ in heads)
    for b in p["blocks"][-2:]:
        if CLOSER_RE.match(b.strip()):
            closer = True
    out["closer"] = closer
    return out


def load_docs():
    docs = []
    gen = os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")
    for d in iter_jsonl(gen):
        if d.get("usable"):
            docs.append(("ai", "generated", d.get("register"), d["id"], d["text"]))
    hum = os.path.join(REPO, "implementation", "tests", "battery", "human-corpus-v2.json")
    for d in json.load(open(hum)):
        docs.append(("human", "human-v2", d.get("genre"), d["id"], d["text"]))
    for d in iter_jsonl(os.path.join(RESEARCH, "longform-corpus", "ai-longform.jsonl")):
        docs.append(("ai", "longform-ai", d.get("register"), d["id"], d["text"]))
    for d in iter_jsonl(os.path.join(RESEARCH, "longform-corpus", "human-longform.jsonl")):
        docs.append(("human", "longform-human", d.get("register"), d["id"], d["text"]))
    return docs


def sweep(rows, key, thresholds, direction="ge", require=None):
    """Detection (AI) / FP (human) rates at each threshold, over rows where key is present."""
    out = []
    for th in thresholds:
        res = {}
        for side in ("ai", "human"):
            elig = [r for r in rows if r["side"] == side and r.get(key) is not None
                    and (require is None or require(r))]
            if direction == "ge":
                hits = sum(1 for r in elig if r[key] >= th)
            else:
                hits = sum(1 for r in elig if r[key] <= th)
            res[side] = {"n": len(elig), "hits": hits,
                         "rate": round(hits / len(elig), 4) if elig else None}
        out.append({"threshold": th, **res})
    return out


def dist(rows, key, side, corpus=None):
    vals = [r[key] for r in rows if r["side"] == side and r.get(key) is not None
            and (corpus is None or r["corpus"] == corpus)]
    if not vals:
        return None
    vals.sort()
    q = lambda p: vals[min(len(vals) - 1, int(p * len(vals)))]
    return {"n": len(vals), "mean": round(statistics.mean(vals), 4),
            "p50": round(q(0.5), 4), "p75": round(q(0.75), 4),
            "p90": round(q(0.9), 4), "p95": round(q(0.95), 4), "max": round(max(vals), 4)}


def main():
    docs = load_docs()
    rows = []
    for side, corpus, register, did, text in docs:
        row = {"side": side, "corpus": corpus, "register": register, "id": did}
        e = echo_score(text)
        if e:
            row.update({"echo_share": e["echo_share"], "echo_hits": e["echo_hits"],
                        "openings": e["openings"], "keyphrase": e["keyphrase"]})
        row.update(scaffold(text))
        rows.append(row)

    with open(os.path.join(HERE, "structure-per-doc.jsonl"), "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")

    primary = [r for r in rows if r["corpus"] in ("generated", "human-v2")]
    longform = [r for r in rows if r["corpus"] in ("longform-ai", "longform-human")]

    def echo_hits_ge2(r):
        return True

    summary = {
        "corpora": {c: sum(1 for r in rows if r["corpus"] == c)
                    for c in ("generated", "human-v2", "longform-ai", "longform-human")},
        "tell1_keyphrase_echo": {
            "eligible": {c: sum(1 for r in rows if r["corpus"] == c and r.get("echo_share") is not None)
                         for c in ("generated", "human-v2", "longform-ai", "longform-human")},
            "dist_primary_ai": dist(primary, "echo_share", "ai"),
            "dist_primary_human": dist(primary, "echo_share", "human"),
            "dist_longform_ai": dist(longform, "echo_share", "ai"),
            "dist_longform_human": dist(longform, "echo_share", "human"),
            "sweep_share_primary": sweep(primary, "echo_share",
                                         [0.2, 0.25, 0.3, 0.4, 0.5, 0.6]),
            "sweep_hits_primary": sweep(primary, "echo_hits", [2, 3, 4, 5]),
            "sweep_hits_longform": sweep(longform, "echo_hits", [2, 3, 4, 5]),
        },
        "tell2_scaffold": {
            "heading_detection": {
                c: {"docs": sum(1 for r in rows if r["corpus"] == c),
                    "with_3plus_headings": sum(1 for r in rows if r["corpus"] == c and r["n_headings"] >= 3),
                    "with_md_headings": sum(1 for r in rows if r["corpus"] == c and r["n_md_headings"] > 0)}
                for c in ("generated", "human-v2", "longform-ai", "longform-human")},
            "pps_cv_dist_ai": dist(primary, "pps_cv", "ai"),
            "pps_cv_dist_human": dist(primary, "pps_cv", "human"),
            "pps_all_equal_sweep": sweep(primary, "pps_all_equal", [True]),
            "pps_mode_share_sweep": sweep(primary, "pps_mode_share", [0.6, 0.75, 0.9, 1.0]),
            "spp_cv_dist_ai": dist(primary, "spp_cv", "ai"),
            "spp_cv_dist_human": dist(primary, "spp_cv", "human"),
            "spp_cv_sweep_le": sweep(primary, "spp_cv", [0.2, 0.3, 0.4, 0.5], direction="le"),
            "title_case_dist_ai": dist(primary, "title_case_share", "ai"),
            "title_case_dist_human": dist(primary, "title_case_share", "human"),
            "title_case_sweep": sweep(primary, "title_case_share", [0.8, 0.99]),
            "closer_sweep_primary": sweep(primary, "closer", [True]),
            "closer_sweep_longform": sweep(longform, "closer", [True]),
        },
    }
    with open(os.path.join(HERE, "structure-summary.json"), "w") as f:
        json.dump(summary, f, indent=2)
    print(json.dumps(summary, indent=2)[:6000])


if __name__ == "__main__":
    main()


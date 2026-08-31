"""Tell 3: AI-vs-human 2-4-gram document-frequency ratios with register balancing.

Primary corpus: cycle2-corpus/corpus.jsonl (5,655 AI / 9,859 human docs; the six
registers -- marketing, academic, article, social, reference, report -- exist on
BOTH sides, so we can macro-average presence rates per register with equal
weight. A phrase that only reflects register mix then gets no advantage.)

Out-of-corpus corroboration: presence rates of the shortlisted phrases in
generated-corpus/generated.jsonl (usable, 4,016 AI) and
implementation/tests/battery/human-corpus-v2.json (4,144 human).

Method:
  - presence-based document frequency (a phrase counts once per doc)
  - pass 1: hashed df over AI docs (2^24 slots) to shortlist ngrams with
    approximate AI df >= AI_DF_MIN (collisions only ever ADD candidates)
  - pass 2: exact per-(side, register) df for shortlisted ngrams
  - balanced rate per side = mean over the 6 registers of (df_r + 0.5)/(n_r + 1)
  - ratio = balanced_ai / balanced_human
  - register-artefact flag: phrase is 'register-skewed' if >70% of its AI hits
    sit in one register, or its ratio is >=2 in fewer than 3 registers.

Outputs: phrase-table.json (top rows + metadata), phrase-table.csv
Usage: python3 measure_phrases.py
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tells_lib import iter_jsonl, STOPWORDS

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", ".."))
CYCLE2 = os.path.join(RESEARCH, "cycle2-corpus", "corpus.jsonl")

AI_DF_MIN = 25          # min AI docs (raw) for a phrase to be considered
TOP_N = 200
HASH_BITS = 24
MASK = (1 << HASH_BITS) - 1

WORD_RE = re.compile(r"[a-z][a-z']*")


def tokens(text):
    t = text.lower().replace("’", "'").replace("‘", "'")
    return WORD_RE.findall(t)


def doc_ngrams(text):
    toks = tokens(text)
    seen = set()
    for n in (2, 3, 4):
        for i in range(len(toks) - n + 1):
            g = toks[i:i + n]
            if all(w in STOPWORDS for w in g):
                continue
            seen.add(" ".join(g))
    return seen


def load_cycle2():
    for d in iter_jsonl(CYCLE2):
        yield d["side"], d["register"], d["text"]


def main():
    # ---- pass 1: hashed AI df ----
    ai_hash = np.zeros(1 << HASH_BITS, dtype=np.uint32)
    n_ai = 0
    for side, reg, text in load_cycle2():
        if side != "ai":
            continue
        n_ai += 1
        idx = np.fromiter((hash(g) & MASK for g in doc_ngrams(text)),
                          dtype=np.int64)
        if len(idx):
            ai_hash[idx] += 1
    print(f"pass1 done: {n_ai} AI docs", file=sys.stderr)

    # ---- pass 2: exact per-register df for shortlisted ngrams ----
    registers = ["marketing", "academic", "article", "social", "reference", "report"]
    ridx = {r: i for i, r in enumerate(registers)}
    counts = {}          # phrase -> [ai per reg (6), human per reg (6)]
    n_docs = np.zeros(12, dtype=np.int64)
    for side, reg, text in load_cycle2():
        col = ridx[reg] + (0 if side == "ai" else 6)
        n_docs[col] += 1
        for g in doc_ngrams(text):
            if side == "ai":
                if ai_hash[hash(g) & MASK] < AI_DF_MIN:
                    continue
                row = counts.get(g)
                if row is None:
                    row = counts[g] = [0] * 12
                row[col] += 1
            else:
                row = counts.get(g)
                if row is not None:
                    row[col] += 1
    print(f"pass2 done: {len(counts)} candidate phrases", file=sys.stderr)

    ai_n = n_docs[:6]
    hu_n = n_docs[6:]
    rows = []
    for g, c in counts.items():
        ai_df = sum(c[:6])
        if ai_df < AI_DF_MIN:
            continue
        hu_df = sum(c[6:])
        ai_rates = [(c[i] + 0.5) / (ai_n[i] + 1) for i in range(6)]
        hu_rates = [(c[6 + i] + 0.5) / (hu_n[i] + 1) for i in range(6)]
        bal_ai = sum(ai_rates) / 6
        bal_hu = sum(hu_rates) / 6
        ratio = bal_ai / bal_hu
        per_reg_ratio = [ai_rates[i] / hu_rates[i] for i in range(6)]
        regs_ge2 = sum(1 for r in per_reg_ratio if r >= 2)
        top_reg_share = max(c[:6]) / ai_df if ai_df else 0
        skewed = (top_reg_share > 0.7) or (regs_ge2 < 3)
        rows.append({
            "phrase": g,
            "ratio_balanced": round(ratio, 2),
            "ai_docs": int(ai_df),
            "human_docs": int(hu_df),
            "ai_per_1000": round(1000 * ai_df / int(ai_n.sum()), 2),
            "human_per_1000": round(1000 * hu_df / int(hu_n.sum()), 2),
            "regs_ratio_ge2": regs_ge2,
            "top_reg_share": round(top_reg_share, 2),
            "register_skewed": skewed,
            "per_reg_ratio": [round(r, 1) for r in per_reg_ratio],
        })
    rows.sort(key=lambda r: -r["ratio_balanced"])
    top = rows[:TOP_N]

    # ---- out-of-corpus corroboration on the top phrases ----
    phrases = set(r["phrase"] for r in top)
    gen_hits = defaultdict(int)
    n_gen = 0
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        n_gen += 1
        grams = doc_ngrams(d["text"])
        for p in phrases:
            if p in grams:
                gen_hits[p] += 1
    hv2 = json.load(open(os.path.join(REPO, "implementation", "tests", "battery",
                                      "human-corpus-v2.json")))
    hv2_hits = defaultdict(int)
    for d in hv2:
        grams = doc_ngrams(d["text"])
        for p in phrases:
            if p in grams:
                hv2_hits[p] += 1
    for r in top:
        r["gen2026_per_1000"] = round(1000 * gen_hits[r["phrase"]] / n_gen, 2)
        r["humanv2_per_1000"] = round(1000 * hv2_hits[r["phrase"]] / len(hv2), 2)
        r["generalises"] = (gen_hits[r["phrase"]] / n_gen) > 2 * (hv2_hits[r["phrase"]] + 0.5) / len(hv2)

    meta = {
        "corpus": "cycle2-corpus/corpus.jsonl",
        "ai_docs_total": int(ai_n.sum()), "human_docs_total": int(hu_n.sum()),
        "registers": registers,
        "ai_docs_per_register": [int(x) for x in ai_n],
        "human_docs_per_register": [int(x) for x in hu_n],
        "ai_df_min": AI_DF_MIN,
        "corroboration": {"generated_usable": n_gen, "human_v2": len(hv2)},
        "candidate_phrases_after_df_filter": len(rows),
    }
    with open(os.path.join(HERE, "phrase-table.json"), "w") as f:
        json.dump({"meta": meta, "top": top}, f, indent=1)
    with open(os.path.join(HERE, "phrase-table.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[k for k in top[0] if k != "per_reg_ratio"],
                           extrasaction="ignore")
        w.writeheader()
        w.writerows(top)
    print(json.dumps(meta, indent=2))
    for r in top[:40]:
        print(f"{r['ratio_balanced']:>8.1f}x  ai/1k={r['ai_per_1000']:>6} hu/1k={r['human_per_1000']:>6} "
              f"skew={'Y' if r['register_skewed'] else 'n'} gen={r['gen2026_per_1000']:>6} "
              f"hv2={r['humanv2_per_1000']:>6}  {r['phrase']}")


if __name__ == "__main__":
    main()

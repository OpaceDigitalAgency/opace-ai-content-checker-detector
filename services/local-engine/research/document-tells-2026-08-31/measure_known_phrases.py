"""Curated AI-phrase lexicon measured honestly across four corpora.

For each phrase: per-1,000-doc presence rates in
  cycle2 AI (5,655) / cycle2 human (9,859)  + register-balanced ratio
  generated-2026 AI (4,016) / human-corpus-v2 (4,144) + plain ratio
A phrase is 'shippable evidence copy' only if it is elevated on BOTH
independent AI/human pairings.

Usage: python3 measure_known_phrases.py -> known-phrases.json / printed table
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tells_lib import iter_jsonl

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", ".."))

PHRASES = [
    # openers / connectors
    "in today's fast-paced", "in today's digital", "in today's world", "in an era",
    "moreover", "furthermore", "additionally", "in conclusion", "in summary",
    "when it comes to", "at the end of the day", "first and foremost",
    # the classic vocabulary
    "delve into", "delves into", "delving into", "dive into", "let's dive",
    "a testament to", "stands as a testament", "tapestry", "rich tapestry",
    "navigate the landscape", "navigating the landscape", "the landscape of",
    "ever-evolving", "ever-changing", "fast-paced world", "digital landscape",
    "game-changer", "game changer", "unlock the", "unlocking the", "unleash",
    "elevate your", "empower", "empowers", "harness the", "harnessing the",
    "leverage", "leveraging", "seamless", "seamlessly", "robust", "streamline",
    "streamlining", "holistic", "pivotal", "crucial role", "plays a crucial role",
    "vital role", "underscores", "underscore the", "highlights the importance",
    "sheds light on", "shed light on", "paves the way", "paving the way",
    "a beacon of", "at the forefront of", "in the realm of", "the realm of",
    # constructions
    "it's not just", "is not just about", "it's not about", "not only",
    "but also", "whether you're", "whether you are", "look no further",
    "it's important to note", "it is important to note", "it's worth noting",
    "it is worth noting", "keep in mind that", "here's the thing",
    "the truth is", "let's be honest", "the bottom line",
    # closers
    "final thoughts", "wrapping up", "to sum up", "key takeaways",
    "in a nutshell", "the key is to", "remember that",
    # hedging / summing
    "can be a great way", "is a great way to", "there are several",
    "a variety of", "a wide range of", "a plethora of", "myriad",
    "comprehensive guide", "in this article we", "in this article",
    "this article explores", "as we've seen", "as mentioned above",
]

WORD_RE = re.compile(r"[a-z][a-z'-]*")


def norm(text):
    t = text.lower().replace("’", "'").replace("‘", "'")
    t = t.replace("–", "-").replace("—", "-")
    return " " + " ".join(WORD_RE.findall(t.replace("-", " - "))) + " "


def pnorm(p):
    return " " + " ".join(WORD_RE.findall(p.lower().replace("-", " - "))) + " "


def main():
    pats = {p: pnorm(p) for p in PHRASES}
    registers = ["marketing", "academic", "article", "social", "reference", "report"]
    ridx = {r: i for i, r in enumerate(registers)}
    c2 = {p: [0] * 12 for p in PHRASES}
    n12 = [0] * 12
    for d in iter_jsonl(os.path.join(RESEARCH, "cycle2-corpus", "corpus.jsonl")):
        col = ridx[d["register"]] + (0 if d["side"] == "ai" else 6)
        n12[col] += 1
        t = norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                c2[p][col] += 1

    gen = {p: 0 for p in PHRASES}
    n_gen = 0
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        n_gen += 1
        t = norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                gen[p] += 1

    hv2 = json.load(open(os.path.join(REPO, "implementation", "tests", "battery",
                                      "human-corpus-v2.json")))
    hu2 = {p: 0 for p in PHRASES}
    for d in hv2:
        t = norm(d["text"])
        for p, pat in pats.items():
            if pat in t:
                hu2[p] += 1

    ai_n = n12[:6]
    hu_n = n12[6:]
    rows = []
    for p in PHRASES:
        c = c2[p]
        ai_df, hu_df = sum(c[:6]), sum(c[6:])
        bal_ai = sum((c[i] + 0.5) / (ai_n[i] + 1) for i in range(6)) / 6
        bal_hu = sum((c[6 + i] + 0.5) / (hu_n[i] + 1) for i in range(6)) / 6
        r_c2 = bal_ai / bal_hu
        g_rate = gen[p] / n_gen
        h_rate = hu2[p] / len(hv2)
        r_gen = (gen[p] + 0.5) / n_gen / ((hu2[p] + 0.5) / len(hv2))
        rows.append({
            "phrase": p,
            "c2_ai_per_1000": round(1000 * ai_df / sum(ai_n), 2),
            "c2_hu_per_1000": round(1000 * hu_df / sum(hu_n), 2),
            "c2_ratio_balanced": round(r_c2, 1),
            "gen_per_1000": round(1000 * g_rate, 2),
            "hv2_per_1000": round(1000 * h_rate, 2),
            "gen_ratio": round(r_gen, 1),
            "c2_ai_docs": ai_df, "c2_hu_docs": hu_df,
            "gen_docs": gen[p], "hv2_docs": hu2[p],
            "both_elevated_2x": (r_c2 >= 2 and r_gen >= 2),
            "both_elevated_5x": (r_c2 >= 5 and r_gen >= 5),
        })
    rows.sort(key=lambda r: -min(r["c2_ratio_balanced"], r["gen_ratio"]))
    with open(os.path.join(HERE, "known-phrases.json"), "w") as f:
        json.dump({"meta": {"cycle2_ai": sum(ai_n), "cycle2_human": sum(hu_n),
                            "generated": n_gen, "human_v2": len(hv2)},
                   "rows": rows}, f, indent=1)
    for r in rows:
        print(f"{r['c2_ratio_balanced']:>7}x c2 | {r['gen_ratio']:>7}x gen | "
              f"c2ai/1k={r['c2_ai_per_1000']:>7} c2hu/1k={r['c2_hu_per_1000']:>6} | "
              f"gen/1k={r['gen_per_1000']:>7} hv2/1k={r['hv2_per_1000']:>6} | {r['phrase']}")


if __name__ == "__main__":
    main()

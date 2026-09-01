"""Structural fingerprint per document -- owner-specified side-by-side table.

Floor: docs >= 500 words enter the comparison at all; section-level rows
additionally require >= 4 sections. Denominators reported.

Rows (per corpus column):
  - sections per article (mean, median)                     [>=4-section docs]
  - heading depth usage: H2-only / H2+H3 / deeper           [structured docs]
  - paragraphs per section (mean + within-doc variance)     [>=4-section docs]
  - words per paragraph (mean)                              [>=500w docs]
  - sequential paragraph-length variation: mean |delta| between consecutive
    paragraphs, and share of consecutive pairs within +/-20% of each other
  - lists per section; share of sections containing a list  [>=4-section docs]
  - items per list (mean, p50/p90)
  - sentence-length CV (spp_cv)                             [>=5-para docs]

Usage:
  python3 measure_fingerprint.py --stage1   # AI + old human-v2 (thin baseline)
  python3 measure_fingerprint.py --final    # AI + new corpus (per register/model)
"""
import argparse
import json
import os
import re
import statistics
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
# Vendored copy: dependencies live in THIS directory (see struct_features.py).
TELLS = HERE
REPO = HERE
sys.path.insert(0, TELLS)

from tells_lib import BULLET_RE, sentences, cv, iter_jsonl  # noqa: E402
from measure_scaffold_v2 import classify_blocks  # noqa: E402

MD_H_RE = re.compile(r"^(#{1,6})\s")


def fingerprint(text):
    """Per-doc structural fingerprint."""
    words_total = len(text.split())
    blocks = classify_blocks(text)
    # heading depth usage from raw markdown lines (explicit md only)
    depths = set()
    for line in text.split("\n"):
        m = MD_H_RE.match(line.strip())
        if m:
            depths.add(len(m.group(1)))
    body_depths = {d for d in depths if d >= 2}
    if body_depths == {2}:
        depth_class = "h2-only"
    elif body_depths == {2, 3}:
        depth_class = "h2+h3"
    elif len(body_depths) >= 2 or any(d >= 4 for d in body_depths):
        depth_class = "deeper"
    elif body_depths:
        depth_class = "single-other"
    else:
        depth_class = "none"

    sections, cur = [], []
    for k, c in blocks:
        if k == "heading":
            sections.append(cur)
            cur = []
        else:
            cur.append((k, c))
    sections.append(cur)
    nonempty = [s for s in sections[1:] if s] if len(sections) > 1 else []

    paras = [c for k, c in blocks if k == "para"]
    wpp = [len(c.split()) for c in paras if c.split()]
    deltas = [abs(wpp[i + 1] - wpp[i]) for i in range(len(wpp) - 1)]
    pairs20 = [1 if abs(wpp[i + 1] - wpp[i]) <= 0.2 * max(wpp[i], wpp[i + 1], 1)
               else 0 for i in range(len(wpp) - 1)]

    lists = [c for k, c in blocks if k == "bullets"]
    items_per_list = [sum(1 for l in c.split("\n") if BULLET_RE.match(l))
                      for c in lists]

    spp = [len(sentences(p)) for p in paras]
    spp = [s for s in spp if s > 0]

    fp = {
        "words": words_total,
        "n_sections": len(nonempty),
        "depth_class": depth_class,
        "wpp_mean": statistics.mean(wpp) if wpp else None,
        "seq_delta_mean": statistics.mean(deltas) if deltas else None,
        "seq_pairs_within20": (sum(pairs20) / len(pairs20)) if pairs20 else None,
        "n_lists": len(lists),
        "items_per_list": items_per_list,
        "spp_cv": cv(spp) if len(spp) >= 5 else None,
    }
    if len(nonempty) >= 4:
        pps = [sum(1 for k, _ in s if k != "heading") for s in nonempty]
        fp["pps_mean"] = statistics.mean(pps)
        fp["pps_var"] = statistics.pvariance(pps)
        fp["lists_per_section"] = len(lists) / len(nonempty)
        fp["sections_with_list"] = sum(
            1 for s in nonempty if any(k == "bullets" for k, _ in s)) / len(nonempty)
    return fp


def col(rows):
    """Aggregate one corpus column. rows = list of fingerprints (>=500w)."""
    sec_rows = [r for r in rows if r.get("pps_mean") is not None]
    structured = [r for r in rows if r["depth_class"] != "none"]

    def m(key, sub=None, med=False):
        vals = [r[key] for r in (sub if sub is not None else rows)
                if r.get(key) is not None]
        if not vals:
            return None
        return round(statistics.median(vals) if med else statistics.mean(vals), 3)

    items_all = [i for r in rows for i in r["items_per_list"]]
    depth_n = len(structured)
    dc = Counter(r["depth_class"] for r in structured)
    return {
        "docs_ge500w": len(rows),
        "docs_ge500w_and_4sections": len(sec_rows),
        "docs_with_md_headings": depth_n,
        "sections_per_article_mean": m("n_sections", sec_rows),
        "sections_per_article_median": m("n_sections", sec_rows, med=True),
        "heading_depth": {k: (round(dc.get(k, 0) / depth_n, 3) if depth_n else None)
                          for k in ("h2-only", "h2+h3", "deeper", "single-other")},
        "paras_per_section_mean": m("pps_mean", sec_rows),
        "paras_per_section_within_doc_var": m("pps_var", sec_rows),
        "words_per_paragraph_mean": m("wpp_mean"),
        "seq_paragraph_delta_mean_words": m("seq_delta_mean"),
        "seq_pairs_within_pm20pct": m("seq_pairs_within20"),
        "lists_per_section": m("lists_per_section", sec_rows),
        "share_sections_with_list": m("sections_with_list", sec_rows),
        "items_per_list_mean": round(statistics.mean(items_all), 2) if items_all else None,
        "items_per_list_p50": statistics.median(items_all) if items_all else None,
        "items_per_list_p90": (sorted(items_all)[int(0.9 * len(items_all))]
                               if items_all else None),
        "sentence_length_cv_spp": m("spp_cv"),
    }


def md_table(cols):
    """cols = ordered dict name -> col()"""
    names = list(cols)
    rows = [
        ("docs >= 500 words (denominator)", "docs_ge500w"),
        ("docs >= 500w AND >= 4 sections", "docs_ge500w_and_4sections"),
        ("sections per article (mean)", "sections_per_article_mean"),
        ("sections per article (median)", "sections_per_article_median"),
        ("heading depth: H2 only", ("heading_depth", "h2-only")),
        ("heading depth: H2+H3", ("heading_depth", "h2+h3")),
        ("heading depth: deeper", ("heading_depth", "deeper")),
        ("paragraphs per section (mean)", "paras_per_section_mean"),
        ("paras/section within-doc variance", "paras_per_section_within_doc_var"),
        ("words per paragraph (mean)", "words_per_paragraph_mean"),
        ("sequential para delta (mean words)", "seq_paragraph_delta_mean_words"),
        ("consecutive paras within +/-20%", "seq_pairs_within_pm20pct"),
        ("lists per section", "lists_per_section"),
        ("share of sections with a list", "share_sections_with_list"),
        ("items per list (mean)", "items_per_list_mean"),
        ("items per list (p50 / p90)", None),
        ("sentence-length CV (spp_cv)", "sentence_length_cv_spp"),
    ]
    out = ["| Metric | " + " | ".join(names) + " |",
           "|---|" + "---|" * len(names)]
    for label, key in rows:
        cells = []
        for n in names:
            c = cols[n]
            if key is None:
                cells.append(f"{c['items_per_list_p50']} / {c['items_per_list_p90']}")
            elif isinstance(key, tuple):
                v = c[key[0]].get(key[1])
                cells.append("-" if v is None else f"{v:.1%}" if isinstance(v, float) else str(v))
            else:
                v = c.get(key)
                if v is None:
                    cells.append("-")
                elif key in ("seq_pairs_within_pm20pct", "share_sections_with_list"):
                    cells.append(f"{v:.1%}")
                else:
                    cells.append(str(v))
        out.append(f"| {label} | " + " | ".join(cells) + " |")
    return "\n".join(out)


def load_ai():
    out = []
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if d.get("usable"):
            fp = fingerprint(d["text"])
            fp["model"] = d["model"]
            fp["register"] = d["register"]
            out.append(fp)
    return [r for r in out if r["words"] >= 500]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage1", action="store_true")
    ap.add_argument("--final", action="store_true")
    a = ap.parse_args()

    ai = load_ai()
    if a.stage1:
        hv2 = []
        for d in json.load(open(os.path.join(REPO, "implementation", "tests",
                                             "battery", "human-corpus-v2.json"))):
            fp = fingerprint(d["text"])
            hv2.append(fp)
        hv2 = [r for r in hv2 if r["words"] >= 500]
        cols = {"HUMAN (human-v2, thin baseline -- indicative only)": col(hv2),
                "AI (generated corpus, 21 models)": col(ai)}
        print(md_table(cols))
        json.dump({k: v for k, v in cols.items()},
                  open(os.path.join(HERE, "fingerprint-stage1.json"), "w"), indent=1)
    if a.final:
        hu = []
        for d in iter_jsonl(os.path.join(HERE, "corpus.jsonl")):
            fp = fingerprint(d["text"])
            fp["register"] = d["register"]
            fp["source"] = d["source"]
            fp["bucket"] = d["legal_bucket"]
            hu.append(fp)
        hu = [r for r in hu if r["words"] >= 500]
        cols = {"HUMAN (new structured corpus)": col(hu),
                "AI (generated corpus, 21 models)": col(ai)}
        print(md_table(cols))
        # appendices
        by_reg = {f"human:{r}": col([x for x in hu if x["register"] == r])
                  for r in sorted({x["register"] for x in hu})}
        hard = col([x for x in hu if x["register"] in ("faq", "faq-qa")])
        by_model = {m: col([x for x in ai if x["model"] == m])
                    for m in sorted({x["model"] for x in ai})}
        json.dump({"headline": cols, "human_by_register": by_reg,
                   "human_hard_negatives_faq": hard,
                   "human_by_bucket": {
                       b: col([x for x in hu if x["bucket"] == b])
                       for b in ("GREEN", "AMBER")},
                   "ai_by_model": by_model},
                  open(os.path.join(HERE, "fingerprint-final.json"), "w"), indent=1)
        print("\n[per-register/per-model appendices -> fingerprint-final.json]")


if __name__ == "__main__":
    main()

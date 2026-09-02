"""Tell 2 v2 -- section-shape uniformity as the primary tell, plus per-model
structural signatures.

Per doc:
  - blocks classified heading / bullet-list / paragraph (symmetric heuristics,
    markdown stripped first, identical for AI and human text)
  - sections = runs of blocks under each heading
  - body sections = all sections between the first and last when the doc has
    >=5 sections (intro/outro allowed to differ, per the owner's GPT-5
    example), else all non-empty sections
  - shape signature per section = (n paragraph blocks, n bullet blocks)
  - body_mode_share = share of body sections carrying the modal signature
  - constant_body_shape = body_mode_share == 1.0 with >= 3 body sections
  - bullet_section_share; bullet_rhythm = share >= 0.8 with >= 4 sections
  - pps_cv (blocks per section), spp_cv (sentences per paragraph, >=5 paras)
  - closer (formulaic closing heading/para) and title_restated_in_close
    (a >=2-content-word 2-4-gram of the title reappears in the final
    paragraph block)

Splits: per model / length_band / prompt_style on generated.jsonl;
human subsets: human-v2 overall + per genre + listicle-like (>=5 headings);
longform-human and cycle2-human structured subsets as secondary baselines.

Usage: python3 measure_scaffold_v2.py
Outputs: scaffold-v2-per-doc.jsonl, scaffold-v2-summary.json
"""
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from .tells_lib import (MD_HEADING_RE, BOLD_ONLY_RE, BULLET_RE, CLOSER_RE,
                       STOPWORDS, is_heading_like, strip_md_inline, norm_tokens,
                       stems, sentences, cv, iter_jsonl)

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", ".."))


def classify_blocks(text):
    """Return list of (kind, content): kind in heading|bullets|para."""
    out = []
    for raw in re.split(r"\n\s*\n", text):
        raw = raw.strip("\n")
        if not raw.strip():
            continue
        lines = [l for l in raw.split("\n") if l.strip()]
        bullet_lines = sum(1 for l in lines if BULLET_RE.match(l))
        # a block may open with a heading line then continue: split those
        while lines:
            first = lines[0].strip()
            m = MD_HEADING_RE.match(first)
            mb = BOLD_ONLY_RE.match(first)
            if m:
                out.append(("heading", strip_md_inline(m.group(1) and m.group(2))))
                lines = lines[1:]
                continue
            if mb and is_heading_like(strip_md_inline(mb.group(1))):
                out.append(("heading", strip_md_inline(mb.group(1))))
                lines = lines[1:]
                continue
            break
        if not lines:
            continue
        bullet_lines = sum(1 for l in lines if BULLET_RE.match(l))
        body = "\n".join(lines)
        if bullet_lines >= 2 and bullet_lines >= 0.5 * len(lines):
            out.append(("bullets", body))
        elif len(lines) == 1 and is_heading_like(strip_md_inline(lines[0])) \
                and not BULLET_RE.match(lines[0]):
            out.append(("heading", strip_md_inline(lines[0])))
        else:
            out.append(("para", strip_md_inline(body) if len(lines) == 1 else body))
    return out


def doc_metrics(text):
    blocks = classify_blocks(text)
    headings = [c for k, c in blocks if k == "heading"]
    paras = [c for k, c in blocks if k == "para"]
    # sections
    sections = []  # list of list[(kind,content)]
    cur = []
    for k, c in blocks:
        if k == "heading":
            sections.append(cur)
            cur = []
        else:
            cur.append((k, c))
    sections.append(cur)
    nonempty = [s for s in sections[1:] if s] if len(sections) > 1 else []
    m = {
        "n_headings": len(headings),
        "n_sections": len(nonempty),
        "n_paras": len(paras),
        "n_bullet_blocks": sum(1 for k, _ in blocks if k == "bullets"),
    }
    if len(nonempty) >= 3:
        body = nonempty[1:-1] if len(nonempty) >= 5 else nonempty
        sigs = [(sum(1 for k, _ in s if k == "para"),
                 sum(1 for k, _ in s if k == "bullets")) for s in body]
        mode, mode_n = Counter(sigs).most_common(1)[0]
        m["body_sections"] = len(sigs)
        m["body_mode_share"] = mode_n / len(sigs)
        m["body_mode_sig"] = list(mode)
        m["constant_body_shape"] = (mode_n == len(sigs) and len(sigs) >= 3)
        m["pps_cv"] = cv([len(s) for s in nonempty])
        bshare = sum(1 for s in nonempty if any(k == "bullets" for k, _ in s)) / len(nonempty)
        m["bullet_section_share"] = round(bshare, 3)
        m["bullet_rhythm"] = (len(nonempty) >= 4 and bshare >= 0.8)
    spp = [len(sentences(p)) for p in paras]
    spp = [s for s in spp if s > 0]
    if len(spp) >= 5:
        m["spp_cv"] = cv(spp)
    # closers
    closer = any(CLOSER_RE.match(h.strip()) for h in headings)
    for k, c in blocks[-2:]:
        if k != "heading" and CLOSER_RE.match(c.strip()):
            closer = True
    m["closer"] = closer
    # title restated in final paragraph
    title = headings[0] if headings and blocks and blocks[0][0] == "heading" else (
        paras[0] if paras else "")
    m["title_restated_in_close"] = False
    if title and paras:
        t = stems(norm_tokens(title))[:25]
        last = set()
        ls = stems(norm_tokens(paras[-1]))
        for n in (2, 3, 4):
            for i in range(len(ls) - n + 1):
                last.add(tuple(ls[i:i + n]))
        for n in (4, 3, 2):
            for i in range(len(t) - n + 1):
                g = tuple(t[i:i + n])
                if sum(1 for w in g if w not in STOPWORDS) >= 2 and g in last:
                    m["title_restated_in_close"] = True
                    break
            if m["title_restated_in_close"]:
                break
    return m


UNIFORM_FLAG = ("body_mode_share", 0.8)  # + >=4 sections; see flag()


def flag(m):
    """Headline uniformity flag: >=4 sections, >=80% of body sections share
    one shape signature, and sentence lengths uniform (spp_cv <= 0.35)."""
    return (m.get("n_sections", 0) >= 4
            and m.get("body_mode_share") is not None
            and m["body_mode_share"] >= 0.8
            and m.get("spp_cv") is not None and m["spp_cv"] <= 0.35)


def strict_flag(m):
    return (m.get("constant_body_shape") and m.get("n_sections", 0) >= 4)


def agg(rows, structured_only=True):
    def r(key, pred=None, base=None):
        e = [x for x in rows if (base(x) if base else x.get(key) is not None)]
        if not e:
            return None
        if pred:
            return {"n": len(e), "hits": sum(1 for x in e if pred(x)),
                    "rate": round(sum(1 for x in e if pred(x)) / len(e), 4)}
        vals = [x[key] for x in e]
        return {"n": len(e), "mean": round(statistics.mean(vals), 3),
                "p50": round(statistics.median(vals), 3)}
    s = [x for x in rows if x.get("body_mode_share") is not None]
    out = {
        "docs": len(rows),
        "structured_3plus_sections": len(s),
        "body_mode_share": r("body_mode_share"),
        "mode_share_ge_0.8": {"n": len(s),
                              "hits": sum(1 for x in s if x["body_mode_share"] >= 0.8),
                              "rate": round(sum(1 for x in s if x["body_mode_share"] >= 0.8) / len(s), 4) if s else None},
        "constant_body_shape": r("constant_body_shape", pred=lambda x: x.get("constant_body_shape"),
                                 base=lambda x: x.get("constant_body_shape") is not None),
        "pps_cv": r("pps_cv"),
        "spp_cv": r("spp_cv"),
        "bullet_section_share": r("bullet_section_share"),
        "bullet_rhythm": r("bullet_rhythm", pred=lambda x: x.get("bullet_rhythm"),
                           base=lambda x: x.get("bullet_rhythm") is not None),
        "closer": {"n": len(rows), "hits": sum(1 for x in rows if x.get("closer")),
                   "rate": round(sum(1 for x in rows if x.get("closer")) / len(rows), 4) if rows else None},
        "title_restated": {"n": len(rows),
                           "hits": sum(1 for x in rows if x.get("title_restated_in_close")),
                           "rate": round(sum(1 for x in rows if x.get("title_restated_in_close")) / len(rows), 4) if rows else None},
        "uniform_flag_of_all": {"n": len(rows), "hits": sum(1 for x in rows if flag(x)),
                                "rate": round(sum(1 for x in rows if flag(x)) / len(rows), 4) if rows else None},
        "uniform_flag_of_structured": {"n": len(s), "hits": sum(1 for x in s if flag(x)),
                                       "rate": round(sum(1 for x in s if flag(x)) / len(s), 4) if s else None},
        "strict_flag_of_structured": {"n": len(s), "hits": sum(1 for x in s if strict_flag(x)),
                                      "rate": round(sum(1 for x in s if strict_flag(x)) / len(s), 4) if s else None},
    }
    return out


def main():
    rows = []
    # AI: generated
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        m = doc_metrics(d["text"])
        m.update({"side": "ai", "corpus": "generated", "model": d["model"],
                  "length_band": d["length_band"], "prompt_style": d["prompt_style"],
                  "register": d["register"], "id": d["id"]})
        rows.append(m)
    # Human: human-v2
    for d in json.load(open(os.path.join(REPO, "implementation", "tests", "battery",
                                         "human-corpus-v2.json"))):
        m = doc_metrics(d["text"])
        m.update({"side": "human", "corpus": "human-v2", "genre": d["genre"],
                  "difficulty": d["difficulty"], "id": d["id"]})
        rows.append(m)
    # Secondary baselines
    for d in iter_jsonl(os.path.join(RESEARCH, "longform-corpus", "human-longform.jsonl")):
        m = doc_metrics(d["text"])
        m.update({"side": "human", "corpus": "longform-human",
                  "register": d.get("register"), "id": d["id"]})
        rows.append(m)
    for d in iter_jsonl(os.path.join(RESEARCH, "cycle2-corpus", "corpus.jsonl")):
        if d["side"] != "human":
            continue
        m = doc_metrics(d["text"])
        m.update({"side": "human", "corpus": "cycle2-human",
                  "register": d.get("register"), "id": d["id"]})
        rows.append(m)

    with open(os.path.join(HERE, "scaffold-v2-per-doc.jsonl"), "w") as f:
        for x in rows:
            f.write(json.dumps(x) + "\n")

    gen = [x for x in rows if x["corpus"] == "generated"]
    hv2 = [x for x in rows if x["corpus"] == "human-v2"]
    summary = {
        "headline": {
            "ai_generated": agg(gen),
            "human_v2": agg(hv2),
            "human_v2_confusable": agg([x for x in hv2 if x["difficulty"] == "plausibly-confusable"]),
            "human_v2_listicle_like_5plus_headings": agg([x for x in hv2 if x["n_headings"] >= 5]),
            "longform_human": agg([x for x in rows if x["corpus"] == "longform-human"]),
            "cycle2_human": agg([x for x in rows if x["corpus"] == "cycle2-human"]),
        },
        "human_v2_by_genre": {g: agg([x for x in hv2 if x.get("genre") == g])
                              for g in sorted({x.get("genre") for x in hv2})},
        "ai_by_model": {mo: agg([x for x in gen if x["model"] == mo])
                        for mo in sorted({x["model"] for x in gen})},
        "ai_by_length_band": {lb: agg([x for x in gen if x["length_band"] == lb])
                              for lb in sorted({x["length_band"] for x in gen})},
        "ai_by_prompt_style": {ps: agg([x for x in gen if x["prompt_style"] == ps])
                               for ps in sorted({x["prompt_style"] for x in gen})},
        "ai_modal_signatures_by_model": {
            mo: Counter(tuple(x["body_mode_sig"]) for x in gen
                        if x["model"] == mo and x.get("body_mode_sig")).most_common(3)
            for mo in sorted({x["model"] for x in gen})},
    }
    # make signature counters json-safe
    summary["ai_modal_signatures_by_model"] = {
        mo: [[list(sig), n] for sig, n in v]
        for mo, v in summary["ai_modal_signatures_by_model"].items()}
    with open(os.path.join(HERE, "scaffold-v2-summary.json"), "w") as f:
        json.dump(summary, f, indent=1)

    # printed per-model table
    print(f"{'model':<36}{'n':>4}{'strct':>6}{'modeSh':>8}{'const':>7}{'flag':>7}"
          f"{'bullets':>8}{'closer':>7}{'restate':>8}{'sppcv':>7}")
    for mo, a in summary["ai_by_model"].items():
        print(f"{mo:<36}{a['docs']:>4}{a['structured_3plus_sections']:>6}"
              f"{(a['body_mode_share'] or {}).get('mean', 0):>8}"
              f"{(a['constant_body_shape'] or {}).get('rate', 0):>7}"
              f"{(a['uniform_flag_of_structured'] or {}).get('rate', 0):>7}"
              f"{(a['bullet_section_share'] or {}).get('mean', 0):>8}"
              f"{a['closer']['rate']:>7}{a['title_restated']['rate']:>8}"
              f"{(a['spp_cv'] or {}).get('mean', 0):>7}")
    for k in ("ai_generated", "human_v2", "human_v2_confusable",
              "human_v2_listicle_like_5plus_headings", "longform_human", "cycle2_human"):
        a = summary["headline"][k]
        print(k, "docs", a["docs"], "structured", a["structured_3plus_sections"],
              "modeShare>=0.8", a["mode_share_ge_0.8"],
              "flag(struct)", a["uniform_flag_of_structured"],
              "flag(all)", a["uniform_flag_of_all"],
              "strict", a["strict_flag_of_structured"])


if __name__ == "__main__":
    main()


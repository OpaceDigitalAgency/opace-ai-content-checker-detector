"""Re-run the document-tells-2026-08-31 shape measurements against the new
structure-preserved human corpus, plus the owner-requested WORD-COUNT
REGULARITY metrics.

Metrics per doc (identical code paths for AI and human sides):
  - everything from measure_scaffold_v2.doc_metrics (section shapes, mode
    share, constant shape, bullet rhythm -- now measurable, spp_cv, closer,
    title restated)
  - keyphrase echo from measure_structure.echo_score
  - NEW word-count regularity:
      wps_cv        CV of words per section (>=3 non-empty sections)
      wpp_cv        CV of words per paragraph block (>=5 paragraphs)
      sec_within15  share of body sections within +/-15% of the median
                    body-section word count (>=4 sections)

Sides:
  AI    : generated-corpus/generated.jsonl (usable)
  HUMAN : human-structured-corpus-2026-08-31/corpus.jsonl (this corpus)
  REF   : human-corpus-v2 (the old structure-stripped baseline, for
          before/after deltas on the word metrics)

Outputs: new-human-per-doc.jsonl, new-human-summary.json
Usage: python3 measure_new_human.py
"""
import json
import os
import statistics
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
TELLS = os.path.join(RESEARCH, "document-tells-2026-08-31")
REPO = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", ".."))
sys.path.insert(0, TELLS)

from tells_lib import iter_jsonl, cv  # noqa: E402
from measure_scaffold_v2 import doc_metrics, classify_blocks, flag, strict_flag, agg  # noqa: E402
from measure_structure import echo_score  # noqa: E402


def word_metrics(text):
    """Word-count regularity: wps_cv, wpp_cv, sec_within15."""
    blocks = classify_blocks(text)
    sections, cur = [], []
    for k, c in blocks:
        if k == "heading":
            sections.append(cur)
            cur = []
        else:
            cur.append((k, c))
    sections.append(cur)
    nonempty = [s for s in sections[1:] if s] if len(sections) > 1 else []
    out = {}
    wps = [sum(len(c.split()) for _, c in s) for s in nonempty]
    if len(wps) >= 3:
        out["wps_cv"] = cv(wps)
        body = wps[1:-1] if len(wps) >= 5 else wps
        if len(body) >= 4 or (len(wps) >= 4 and len(body) >= 2):
            med = statistics.median(body)
            if med > 0 and len(wps) >= 4:
                out["sec_within15"] = sum(1 for w in body
                                          if abs(w - med) <= 0.15 * med) / len(body)
    paras = [c for k, c in blocks if k == "para"]
    wpp = [len(c.split()) for c in paras if c.split()]
    if len(wpp) >= 5:
        out["wpp_cv"] = cv(wpp)
    return out


def full_metrics(text):
    m = doc_metrics(text)
    m.update(word_metrics(text))
    e = echo_score(text)
    if e:
        m["echo_share"] = e["echo_share"]
        m["echo_hits"] = e["echo_hits"]
    return m


def dist(rows, key):
    vals = sorted(r[key] for r in rows if r.get(key) is not None)
    if not vals:
        return None
    q = lambda p: round(vals[min(len(vals) - 1, int(p * len(vals)))], 4)
    return {"n": len(vals), "mean": round(statistics.mean(vals), 4),
            "p10": q(0.10), "p25": q(0.25), "p50": q(0.5),
            "p75": q(0.75), "p90": q(0.9)}


def sweep(ai, hu, key, thresholds, direction="le", extra=None):
    out = []
    for th in thresholds:
        row = {"threshold": th}
        groups = {"ai": ai, "new_human": hu}
        if extra:
            groups.update(extra)
        for name, rows in groups.items():
            elig = [r for r in rows if r.get(key) is not None]
            if direction == "le":
                hits = sum(1 for r in elig if r[key] <= th)
            else:
                hits = sum(1 for r in elig if r[key] >= th)
            row[name] = {"n": len(elig), "hits": hits,
                         "rate": round(hits / len(elig), 4) if elig else None}
        out.append(row)
    return out


def word_agg(rows):
    return {"wps_cv": dist(rows, "wps_cv"), "wpp_cv": dist(rows, "wpp_cv"),
            "sec_within15": dist(rows, "sec_within15")}


def main():
    ai, hu, ref = [], [], []
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        m = full_metrics(d["text"])
        m.update({"side": "ai", "id": d["id"], "model": d["model"],
                  "register": d["register"], "prompt_style": d["prompt_style"]})
        ai.append(m)
    for d in iter_jsonl(os.path.join(HERE, "corpus.jsonl")):
        m = full_metrics(d["text"])
        m.update({"side": "human", "id": d["id"], "source": d["source"],
                  "register": d["register"],
                  "human_confidence": d["human_confidence"]})
        hu.append(m)
    for d in json.load(open(os.path.join(REPO, "implementation", "tests",
                                         "battery", "human-corpus-v2.json"))):
        m = full_metrics(d["text"])
        m.update({"side": "human-v2", "id": d["id"], "genre": d.get("genre")})
        ref.append(m)

    with open(os.path.join(HERE, "new-human-per-doc.jsonl"), "w") as f:
        for x in hu + ai:
            f.write(json.dumps(x) + "\n")

    regs = sorted({x["register"] for x in hu})
    hard = [x for x in hu if x["register"] in ("faq", "faq-qa")
            or x.get("n_headings", 0) >= 5]
    listicle_like = [x for x in hu if x.get("n_headings", 0) >= 5]
    ai_s = [x for x in ai if x.get("body_mode_share") is not None]
    hu_s = [x for x in hu if x.get("body_mode_share") is not None]

    summary = {
        "denominators": {
            "ai_docs": len(ai), "ai_structured": len(ai_s),
            "new_human_docs": len(hu), "new_human_structured": len(hu_s),
            "new_human_by_register": dict(Counter(x["register"] for x in hu)),
            "human_v2_docs": len(ref),
        },
        "scaffold": {
            "ai": agg(ai),
            "new_human": agg(hu),
            "new_human_by_register": {r: agg([x for x in hu if x["register"] == r])
                                      for r in regs},
            "new_human_listicle_like_5plus_headings": agg(listicle_like),
            "new_human_hard_negatives_faq_or_listicle": agg(hard),
            "human_v2_ref": agg(ref),
        },
        "word_regularity": {
            "ai": word_agg(ai),
            "ai_by_prompt_style": {ps: word_agg([x for x in ai if x.get("prompt_style") == ps])
                                   for ps in ("plain", "house-brief", "human-voice")},
            "new_human": word_agg(hu),
            "new_human_by_register": {r: word_agg([x for x in hu if x["register"] == r])
                                      for r in regs},
            "new_human_listicle_like": word_agg(listicle_like),
            "human_v2_ref": word_agg(ref),
            "sweep_wps_cv_le": sweep(ai, hu, "wps_cv", [0.2, 0.3, 0.4, 0.5],
                                     extra={"new_human_hard_neg": hard,
                                            "human_v2": ref}),
            "sweep_wpp_cv_le": sweep(ai, hu, "wpp_cv", [0.2, 0.3, 0.4, 0.5],
                                     extra={"new_human_hard_neg": hard,
                                            "human_v2": ref}),
            "sweep_sec_within15_ge": sweep(ai, hu, "sec_within15",
                                           [0.5, 0.6, 0.75, 0.9, 1.0],
                                           direction="ge",
                                           extra={"new_human_hard_neg": hard,
                                                  "human_v2": ref}),
        },
        "spp_cv_sweep_le": sweep(ai, hu, "spp_cv", [0.2, 0.3, 0.35, 0.4],
                                 extra={"new_human_hard_neg": hard, "human_v2": ref}),
        "echo_share_sweep_ge": sweep(ai, hu, "echo_share", [0.3, 0.4, 0.5],
                                     direction="ge",
                                     extra={"new_human_hard_neg": hard,
                                            "human_v2": ref}),
        "bullet_rhythm": {
            "ai_bullet_section_share_dist": dist(ai_s, "bullet_section_share"),
            "new_human_bullet_section_share_dist": dist(hu_s, "bullet_section_share"),
            "sweep_bullet_share_ge": sweep(ai_s, hu_s, "bullet_section_share",
                                           [0.4, 0.6, 0.8, 1.0], direction="ge",
                                           extra={"new_human_hard_neg":
                                                  [x for x in hard if x.get("bullet_section_share") is not None]}),
        },
    }
    with open(os.path.join(HERE, "new-human-summary.json"), "w") as f:
        json.dump(summary, f, indent=1)

    # console digest
    def line(name, a):
        print(f"{name:<42} docs {a['docs']:>5} struct {a['structured_3plus_sections']:>5} "
              f"modeSh>=.8 {a['mode_share_ge_0.8']['rate']} "
              f"const {(a['constant_body_shape'] or {}).get('rate')} "
              f"flag(struct) {(a['uniform_flag_of_structured'] or {}).get('rate')} "
              f"bullets {(a['bullet_section_share'] or {}).get('mean')} "
              f"rhythm {(a['bullet_rhythm'] or {}).get('rate')} "
              f"closer {a['closer']['rate']}")
    line("AI generated", summary["scaffold"]["ai"])
    line("NEW human (all)", summary["scaffold"]["new_human"])
    for r in regs:
        line(f"  new human: {r}", summary["scaffold"]["new_human_by_register"][r])
    line("  new human: listicle-like >=5 headings", summary["scaffold"]["new_human_listicle_like_5plus_headings"])
    line("human-v2 (old baseline)", summary["scaffold"]["human_v2_ref"])
    print(json.dumps(summary["word_regularity"]["ai"], indent=None))
    print(json.dumps(summary["word_regularity"]["new_human"], indent=None))


if __name__ == "__main__":
    main()

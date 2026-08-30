#!/usr/bin/env python3
"""Measure every pair, then validate the corpus.

Similarity here is LEXICAL, not embedding-based, and is named accordingly. No
sentence-embedding model was available offline in this environment: the
research venv has transformers without torch, and the only ONNX encoder in the
tree (tier3 e5-small) exports logits rather than pooled hidden states. Calling
a hosted embedding API would have spent corpus budget on measurement. So the
rows carry `lexical_cosine_tfidf`, `four_gram_retention` and friends, and no
field in this corpus is called semantic similarity.

Protected spans follow the project's own definition - names, numbers,
quotations, URLs and citations. A rewrite that changes one of those has damaged
the content whatever its similarity score says, so each is counted separately
and rolled up into `protected_span_changed`.
"""
import argparse
import collections
import json
import math
import os
import re
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

STOP = set("""a an the and or but if while of to in on at by for with from as is are was
were be been being it its this that these those he she they them his her their we our you
your i me my not no nor so than then there here which who whom whose what when where why
how all any both each few more most other some such only own same too very can will just
should now do does did done have has had having would could may might must shall about
into over under again further once""".split())

_W = re.compile(r"[a-z0-9']+")
_SENT = re.compile(r"(?<=[.!?])\s+")
_URL = re.compile(r"https?://\S+|www\.\S+")
_NUM = re.compile(r"(?<![\w/])[£$€]?\d[\d,.]*\s?%?")
_QUOTE = re.compile(r"[“\"]([^”\"]{6,240})[”\"]")
# (Author, 2019) / (Author et al., 2019) / [12] / Smith (2020)
_CITE = re.compile(r"\([A-Z][A-Za-z.\-]+(?:\s+(?:et al\.?|and|&)\s*[A-Za-z.\-]*)?,?\s*\d{4}[a-z]?\)"
                   r"|\[\d{1,3}(?:[,–-]\s*\d{1,3})*\]")
# capitalised runs that are not sentence-initial: a cheap proper-name proxy
_NAME = re.compile(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})\b")


def words(t):
    return _W.findall((t or "").lower())


def content(t):
    return [w for w in words(t) if w not in STOP and len(w) > 2]


def shingles(seq, n):
    return collections.Counter(tuple(seq[i:i + n]) for i in range(len(seq) - n + 1))


def tfidf_cosine(a, b):
    """Cosine over sublinear term frequency. Two texts, so idf is degenerate;
    this is a term-overlap cosine and is named lexical for that reason."""
    ca, cb = collections.Counter(content(a)), collections.Counter(content(b))
    if not ca or not cb:
        return 0.0
    va = {k: 1 + math.log(v) for k, v in ca.items()}
    vb = {k: 1 + math.log(v) for k, v in cb.items()}
    na = math.sqrt(sum(v * v for v in va.values()))
    nb = math.sqrt(sum(v * v for v in vb.values()))
    dot = sum(va[k] * vb.get(k, 0.0) for k in va)
    return dot / (na * nb) if na and nb else 0.0


def retention(a, b, n):
    """Fraction of source n-word shingles that survive into the output."""
    sa, sb = shingles(words(a), n), shingles(words(b), n)
    tot = sum(sa.values())
    if not tot:
        return 0.0
    kept = sum(min(c, sb.get(k, 0)) for k, c in sa.items())
    return kept / tot


def jaccard(a, b):
    sa, sb = set(content(a)), set(content(b))
    return len(sa & sb) / len(sa | sb) if (sa or sb) else 0.0


def levenshtein_ratio(a, b, cap=4000):
    """Word-level normalised edit distance, 1.0 = identical."""
    x, y = words(a)[:cap], words(b)[:cap]
    if not x and not y:
        return 1.0
    prev = list(range(len(y) + 1))
    for i, xi in enumerate(x, 1):
        cur = [i]
        for j, yj in enumerate(y, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1,
                           prev[j - 1] + (xi != yj)))
        prev = cur
    return 1 - prev[-1] / max(len(x), len(y))


def sentences(t):
    return [s for s in _SENT.split(re.sub(r"\s+", " ", t or "").strip()) if s]


def order_preservation(a, b):
    """Do the output's sentences track the source's order?

    Greedy best-match of each output sentence to a source sentence by content
    overlap, then Kendall-tau-like concordance of the matched indices. High for
    a copy-edit, lower once sentences are reordered.
    """
    sa, sb = sentences(a), sentences(b)
    if len(sa) < 3 or len(sb) < 3:
        return None
    setsa = [set(content(s)) for s in sa]
    idx = []
    for s in sb:
        cs = set(content(s))
        if not cs:
            continue
        best, bi = 0.0, None
        for i, t in enumerate(setsa):
            if not t:
                continue
            ov = len(cs & t) / len(cs | t)
            if ov > best:
                best, bi = ov, i
        if bi is not None and best >= 0.15:
            idx.append(bi)
    if len(idx) < 3:
        return 0.0
    con = dis = 0
    for i in range(len(idx)):
        for j in range(i + 1, len(idx)):
            if idx[j] > idx[i]:
                con += 1
            elif idx[j] < idx[i]:
                dis += 1
    return (con - dis) / (con + dis) if (con + dis) else 0.0


def ttr(t):
    w = words(t)
    return len(set(w)) / len(w) if w else 0.0


def mattr(t, win=100):
    w = words(t)
    if len(w) < win:
        return ttr(t)
    vals = [len(set(w[i:i + win])) / win for i in range(0, len(w) - win + 1, 10)]
    return statistics.mean(vals) if vals else ttr(t)


def adjacent_cohesion(t):
    """Content-word overlap between neighbouring sentences. The project's
    strongest measured axis: AI 2.1%, human 6.3% (HANDOVER.md 4.5)."""
    ss = [set(content(s)) for s in sentences(t)]
    ss = [s for s in ss if s]
    if len(ss) < 2:
        return None
    vals = []
    for i in range(len(ss) - 1):
        u = ss[i] | ss[i + 1]
        vals.append(len(ss[i] & ss[i + 1]) / len(u) if u else 0.0)
    return statistics.mean(vals)


# Capitalised words that routinely open a sentence and are not proper names.
# Without this the name proxy fires on ordinary reworded prose.
_NOT_A_NAME = set("""The This That These Those There Here When While Where Which What Who
And But For Not With Without After Before Since Because However Although Though Many Most
Some Both Each Every Other Another Such More Less Only Just Now Then Also Yet Still Even
One Two Three Four Five First Second Third Next Last They Their There It Its We Our You
Your He She His Her Him Them Are Was Were Been Being Have Has Had Will Would Can Could
May Might Must Should Shall Does Did Done Instead Rather Similarly Meanwhile Overall
Finally Together Given Using Under Over Between Among Across Within Through During Despite
Following According Based Once Around Above Below Against Toward Towards Whether Unlike""".split())


def _names(t):
    out = set()
    for m in _NAME.finditer(t or ""):
        s = m.group(1)
        head = s.split()[0]
        if " " not in s and head in _NOT_A_NAME:
            continue
        out.add(s)
    return out


def spans(t):
    t = t or ""
    # Presence, not repetition count. Dropping the third occurrence of a name is
    # normal editing; dropping the name entirely is damage. Only the second is
    # counted, otherwise almost every paraphrase reads as a protected-span
    # change and the field stops meaning anything.
    return {
        "numbers": {m.group(0).strip() for m in _NUM.finditer(t)},
        "urls": set(_URL.findall(t)),
        "quotations": {m.group(1).strip() for m in _QUOTE.finditer(t)},
        "citations": set(_CITE.findall(t)),
        "names": _names(t),
    }


def _fuzzy_present(needle, hay_l):
    """A quotation counts as preserved if it survives verbatim or as a
    substring after whitespace and quote-mark normalisation."""
    n = re.sub(r"\s+", " ", needle).strip().lower()
    return bool(n) and n in hay_l


def span_delta(a, b):
    sa, sb = spans(a), spans(b)
    bl = re.sub(r"\s+", " ", (b or "")).lower()
    out = {}
    for k in sa:
        if k == "quotations":
            lost_set = {x for x in sa[k] if not _fuzzy_present(x, bl)}
        else:
            lost_set = sa[k] - sb[k]
        added_set = sb[k] - sa[k]
        out[k] = {"in_source": len(sa[k]),
                  "lost": len(lost_set), "added": len(added_set),
                  "lost_examples": sorted(lost_set)[:5],
                  "added_examples": sorted(added_set)[:5],
                  "changed": bool(lost_set or added_set)}
    return out


def enrich(row):
    a, b = row["source_text"], row["output_text"]
    d = span_delta(a, b)
    m = {
        "lexical_cosine_tfidf": round(tfidf_cosine(a, b), 4),
        "content_word_jaccard": round(jaccard(a, b), 4),
        "unigram_retention": round(retention(a, b, 1), 4),
        "four_gram_retention": round(retention(a, b, 4), 4),
        "eight_gram_retention": round(retention(a, b, 8), 4),
        "word_levenshtein_ratio": round(levenshtein_ratio(a, b), 4),
        "sentence_count_source": len(sentences(a)),
        "sentence_count_output": len(sentences(b)),
        "sentence_order_preservation": order_preservation(a, b),
        "ttr_source": round(ttr(a), 4), "ttr_output": round(ttr(b), 4),
        "mattr_source": round(mattr(a), 4), "mattr_output": round(mattr(b), 4),
        "adjacent_cohesion_source": adjacent_cohesion(a),
        "adjacent_cohesion_output": adjacent_cohesion(b),
        "protected_spans": d,
        "protected_span_changed": any(v["changed"] for v in d.values()),
        "protected_span_kinds_changed": sorted(k for k, v in d.items()
                                               if v["changed"]),
    }
    for k in ("sentence_order_preservation", "adjacent_cohesion_source",
              "adjacent_cohesion_output"):
        if m[k] is not None:
            m[k] = round(m[k], 4)
    row.update(m)
    return row


# ------------------------------------------------------------------- reporting
def q(vals, p):
    vals = sorted(v for v in vals if v is not None)
    if not vals:
        return None
    k = (len(vals) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(vals) - 1)
    return round(vals[lo] + (vals[hi] - vals[lo]) * (k - lo), 4)


def intensity_report(rows):
    print("\n--- intensity separation "
          "(median [p25, p75]; n) ---------------------------")
    keys = ["four_gram_retention", "word_levenshtein_ratio",
            "lexical_cosine_tfidf", "sentence_order_preservation",
            "unigram_retention"]
    by = collections.defaultdict(list)
    for r in rows:
        by[r["edit_intensity"]].append(r)
    print(f"{'metric':<30}" + "".join(f"{i:>26}" for i in
                                      ("light", "medium", "heavy")))
    for k in keys:
        line = f"{k:<30}"
        for i in ("light", "medium", "heavy"):
            v = [r.get(k) for r in by.get(i, [])]
            line += f"{str(q(v,.5)) + ' [' + str(q(v,.25)) + ',' + str(q(v,.75)) + ']':>26}"
        print(line)
    for i in ("light", "medium", "heavy"):
        print(f"  n({i}) = {len(by.get(i, []))}")

    # ---- separation test.
    #
    # The three intensities are defined on two different axes, so one metric
    # cannot police both boundaries:
    #   light -> medium is a WORDING change, read on four_gram_retention;
    #   medium -> heavy is a STRUCTURE change, read on sentence order.
    # The first pilot run failed precisely because it was judged on wording
    # alone, where heavy scored ABOVE medium. Both boundaries are checked.
    print("\n  separation checks")

    def band(metric, i, p):
        return q([r.get(metric) for r in by.get(i, [])], p)

    l_med = band("four_gram_retention", "light", .5)
    m_med = band("four_gram_retention", "medium", .5)
    h_med = band("four_gram_retention", "heavy", .5)
    ok_wording = (l_med or 0) > (m_med or 0)
    lo_light = band("four_gram_retention", "light", .25)
    hi_med = band("four_gram_retention", "medium", .75)
    print(f"    wording   light>medium four-gram retention: "
          f"{l_med} > {m_med}  -> {ok_wording}")
    print(f"              light p25 {lo_light} vs medium p75 {hi_med} -> "
          f"{'DISJOINT' if (lo_light or 0) > (hi_med or 0) else 'OVERLAP'}")
    print(f"              (heavy median {h_med}, on the same axis)")

    m_ord = band("sentence_order_preservation", "medium", .5)
    h_ord = band("sentence_order_preservation", "heavy", .5)
    ok_struct = (m_ord or 0) > (h_ord or 0)
    lo_m = band("sentence_order_preservation", "medium", .25)
    hi_h = band("sentence_order_preservation", "heavy", .75)
    print(f"    structure medium>heavy sentence-order preservation: "
          f"{m_ord} > {h_ord}  -> {ok_struct}")
    print(f"              medium p25 {lo_m} vs heavy p75 {hi_h} -> "
          f"{'DISJOINT' if (lo_m or 0) > (hi_h or 0) else 'OVERLAP'}")

    l_ord = band("sentence_order_preservation", "light", .5)
    print(f"    (light sentence-order preservation median {l_ord})")
    ok = ok_wording and ok_struct
    print(f"    BOTH BOUNDARIES SEPARATE: {ok}")
    return ok


def validate(rows, sources):
    print("\n--- validation ------------------------------------------------")
    errs = []
    src = {s["source_id"]: s for s in sources}

    required = ["variant_id", "source_id", "lineage_id", "split", "class_label",
                "edit_intensity", "source_text", "output_text", "source_side",
                "generating_model", "rewriting_model", "rewriting_model_family",
                "rewriting_prompt", "rewriting_settings", "register",
                "source_word_count", "output_word_count", "cost_usd",
                "source_date", "rewritten_at", "lexical_cosine_tfidf",
                "protected_span_changed"]
    for r in rows:
        miss = [k for k in required if k not in r or r[k] is None
                and k not in ("generating_prompt_style",)]
        if miss:
            errs.append(f"{r.get('variant_id')}: missing {miss}")

    # label correctness
    for r in rows:
        want = ("ai_original_neural_rewrite" if r["source_side"] == "ai"
                else "human_original_ai_edited")
        if r["class_label"] != want:
            errs.append(f"{r['variant_id']}: label {r['class_label']} != {want}")
        if r["class_label"] in ("ai_original_human_edited",):
            errs.append(f"{r['variant_id']}: forbidden label")
        if r.get("commercial_humaniser"):
            errs.append(f"{r['variant_id']}: claims a commercial humaniser")
        if r["edit_intensity"] in r["class_label"]:
            errs.append(f"{r['variant_id']}: intensity folded into class label")

    # lineage integrity: every variant's split matches its source's split
    for r in rows:
        s = src.get(r["source_id"])
        if not s:
            errs.append(f"{r['variant_id']}: unknown source_id")
            continue
        if r["split"] != s["split"]:
            errs.append(f"{r['variant_id']}: split {r['split']} != source "
                        f"{s['split']}")
        if r["lineage_id"] != s["lineage_id"]:
            errs.append(f"{r['variant_id']}: lineage mismatch")
        if r["rewriting_model"] != s["rewriter_model"]:
            errs.append(f"{r['variant_id']}: rewriter mismatch")

    # split leakage: a lineage may never appear in two splits
    lin = collections.defaultdict(set)
    for r in rows:
        lin[r["lineage_id"]].add(r["split"])
    for k, v in lin.items():
        if len(v) > 1:
            errs.append(f"lineage {k} spans splits {sorted(v)}")

    # family holdout: the reserved family must appear in no training split
    fam_split = collections.defaultdict(set)
    for r in rows:
        fam_split[r["rewriting_model_family"]].add(r["split"])
    if "train" in fam_split.get("mistral", set()):
        errs.append("held-out rewriting family 'mistral' appears in train")
    # register holdout
    reg_split = collections.defaultdict(set)
    for r in rows:
        reg_split[r["register"]].add(r["split"])
    if "train" in reg_split.get("technical-explainer", set()):
        errs.append("held-out register 'technical-explainer' appears in train")

    # deduplication across outputs
    seen = {}
    for r in rows:
        h = re.sub(r"\s+", " ", r["output_text"].lower()).strip()
        if h in seen:
            errs.append(f"{r['variant_id']}: duplicate output of {seen[h]}")
        seen[h] = r["variant_id"]

    # a variant identical to its source is not a transformation
    for r in rows:
        if r.get("word_levenshtein_ratio") == 1.0:
            errs.append(f"{r['variant_id']}: output identical to source")

    print(f"rows: {len(rows)}   errors: {len(errs)}")
    for e in errs[:40]:
        print("  ERR", e)
    if len(errs) > 40:
        print(f"  ... and {len(errs)-40} more")
    return errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", default=os.path.join(HERE, "pairs.jsonl"))
    ap.add_argument("--sources", default=os.path.join(HERE, "sources.jsonl"))
    ap.add_argument("--write", action="store_true",
                    help="write the enriched rows back to --pairs")
    ap.add_argument("--no-validate", action="store_true")
    args = ap.parse_args()

    rows = [json.loads(l) for l in open(args.pairs, encoding="utf-8") if l.strip()]
    sources = [json.loads(l) for l in open(args.sources, encoding="utf-8")
               if l.strip()]
    rows = [enrich(r) for r in rows]

    if args.write:
        with open(args.pairs, "w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"enriched {len(rows)} rows -> {args.pairs}")

    ok = intensity_report(rows)

    print("\n--- protected spans -------------------------------------------")
    by = collections.defaultdict(lambda: collections.Counter())
    for r in rows:
        i = r["edit_intensity"]
        by[i]["n"] += 1
        if r["protected_span_changed"]:
            by[i]["any"] += 1
        for k in r["protected_span_kinds_changed"]:
            by[i][k] += 1
    print(f"{'intensity':<10}{'n':>6}{'any changed':>14}"
          + "".join(f"{k:>12}" for k in
                    ("numbers", "names", "quotations", "urls", "citations")))
    for i in ("light", "medium", "heavy"):
        c = by.get(i, collections.Counter())
        n = c["n"] or 1
        cell = "%d (%.1f%%)" % (c["any"], 100.0 * c["any"] / n)
        print(f"{i:<10}{c['n']:>6}{cell:>14}"
              + "".join(f"{c[k]:>12}" for k in
                        ("numbers", "names", "quotations", "urls", "citations")))

    errs = [] if args.no_validate else validate(rows, sources)
    return 1 if (errs or not ok) else 0


if __name__ == "__main__":
    sys.exit(main())

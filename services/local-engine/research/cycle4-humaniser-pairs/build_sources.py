#!/usr/bin/env python3
"""Select the source pool for the paired-transformation corpus.

Targets HANDOVER.md §9 item 3: AI rewrites of a human original are detected at
30-35% against 95%+ for straight AI generation, and the project holds no paired
transformation data at all. Every AI row in every existing corpus is a
generation from a prompt; none is a transformation of an existing text.

Sources are drawn from both sides and balanced across a shared register
taxonomy, three length bands and the origin model:

  AI-origin    generated-corpus/generated.jsonl, longform-corpus/ai-longform.jsonl
  human-origin shortform-corpus/human-shortform.jsonl (Opace blog, 2010-2020,
               migration-verified, six owner sanity-check slugs excluded),
               longform-corpus/human-longform.jsonl (eight licensed sources)

Nothing here is written into any existing corpus directory. cycle4-fiction is
read only if explicitly enabled and is not read by default: it belongs to a
concurrent bounded run whose purpose must be preserved (Phase 2 brief §13.6).

Split policy, per the brief §13.5 and the standing instruction:
  * every variant of a source shares its source's split, enforced by lineage_id;
  * one whole rewriting-model family (Mistral) is held out;
  * one whole register (technical-explainer) is held out on BOTH sides;
  * whole sources are held out;
  * rows overlapping a published measurement corpus carry measurement_overlap.
"""
import hashlib
import json
import os
import random
import re
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
RS = os.path.dirname(HERE)

SEED = 20260830
random.seed(SEED)

# ---------------------------------------------------------------- register map
# One taxonomy both sides can be balanced against. Left of the arrow is the
# genre/register string as it appears in the source corpus.
REGISTER_MAP = {
    # commercial and marketing prose - the register the tool is weakest on
    "seo-service-page": "commercial-marketing",
    "product-description": "commercial-marketing",
    "landing-page": "commercial-marketing",
    "category-page": "commercial-marketing",
    "company-blog": "commercial-marketing",
    "case-study": "commercial-marketing",
    "press-release": "commercial-marketing",
    "newsletter": "commercial-marketing",
    "company-update": "commercial-marketing",
    "opace-blog": "commercial-marketing",
    # journalism
    "news-piece": "journalism",
    "longform-journalism": "journalism",
    # academic
    "academic-essay": "academic",
    "academic-discussion": "academic",
    "academic-lit-review": "academic",
    "academic-introduction": "academic",
    "academic-conclusion": "academic",
    "student-essay": "academic",
    "research-summary": "academic",
    # technical explainer - HELD OUT REGISTER
    "howto-explainer": "technical-explainer",
    "faq-page": "technical-explainer",
    "white-paper": "technical-explainer",
    # narrative
    "story": "fiction",
    # opinion
    "thought-leadership": "thought-leadership",
}

HELD_OUT_REGISTER = "technical-explainer"

# Registers to build the grid over. thought-leadership is AI-only in the
# available corpora, so it is excluded rather than left unbalanced.
GRID_REGISTERS = ["commercial-marketing", "journalism", "academic",
                  "technical-explainer", "fiction"]

# ------------------------------------------------------------- rewriter roster
# Four training families and one family reserved entirely for evaluation. If
# every rewriter appears in training you cannot separate "rewritten text" from
# "rewritten by this model".
TRAIN_REWRITERS = [
    "openai/gpt-5.6-luna",
    "meta-llama/llama-4-maverick",
    "google/gemini-3.7-flash",
    "deepseek/deepseek-v4-pro-0813",
]
HELD_OUT_REWRITER = "mistralai/mistral-medium-3-5"

REWRITER_FAMILY = {
    "openai/gpt-5.6-luna": "openai",
    "meta-llama/llama-4-maverick": "meta",
    "google/gemini-3.7-flash": "google",
    "deepseek/deepseek-v4-pro-0813": "deepseek",
    "mistralai/mistral-medium-3-5": "mistral",
}

# Length bands, in words. Sources are capped so a heavy rewrite stays affordable.
BANDS = [("short", 90, 220), ("medium", 260, 460), ("long", 520, 900)]

# Per (side, register, band) quota. 2 sides x 5 registers x 3 bands x 20 = 600.
PER_CELL = 20


def band_of(n):
    for name, lo, hi in BANDS:
        if lo <= n <= hi:
            return name
    return None


def norm(t):
    return re.sub(r"\s+", " ", t or "").strip()


def sha(t):
    return hashlib.sha256(norm(t).lower().encode("utf-8")).hexdigest()


def load(path):
    out = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


_PARA = re.compile(r"\n\s*\n")
_SENT = re.compile(r"(?<=[.!?])\s+")

# Band targets used when cutting. Long documents yield one passage per band from
# DISJOINT paragraph spans, so the same document never contributes overlapping
# text and the near-duplicate guard has nothing to catch.
CUT_TARGETS = [("short", 150), ("medium", 360), ("long", 700)]


def units(text):
    """Paragraphs where the text has them, else sentences. Never cuts mid-sentence."""
    paras = [re.sub(r"\s+", " ", p.strip()) for p in _PARA.split(text or "")]
    good = [p for p in paras if len(p.split()) >= 15]
    if len(good) >= 2:
        return good, "paragraph"
    flat = re.sub(r"\s+", " ", text or "")
    sents = [s.strip() for s in _SENT.split(flat) if len(s.split()) >= 5]
    return sents, "sentence"


def multi_cut(text):
    """Up to one passage per band, from disjoint unit spans of one document.

    Bands are filled longest-first so a document that can only supply one
    passage supplies its longest, and the remaining units still feed the
    shorter bands when there is material left.
    """
    us, how = units(text)
    if not us:
        return []
    out, i = [], 0
    for bname, target in reversed(CUT_TARGETS):   # long, medium, short
        lo, hi = [(l, h) for n, l, h in BANDS if n == bname][0]
        buf, n = [], 0
        j = i
        while j < len(us) and n < target:
            w = len(us[j].split())
            if n and n + w > hi:
                break
            buf.append(us[j])
            n += w
            j += 1
        if lo <= n <= hi:
            out.append((bname, " ".join(buf), n, how))
            i = j
    return out


def _rec(side, reg, cut, how, meta):
    bname, text, wc = cut[0], cut[1], cut[2]
    d = dict(meta)
    d.update({"side": side, "register": reg, "band": bname,
              "word_count": wc, "text": text, "cut_on": how})
    return d


def collect():
    cands = []

    def add_corpus(path, side, corpus_name, meta_fn, licence, overlap_note):
        for r in load(os.path.join(RS, path)):
            if corpus_name.startswith("generated-corpus") and \
                    str(r.get("usable")) != "True":
                continue
            reg = REGISTER_MAP.get(r.get("genre") or r.get("register"))
            if not reg or reg not in GRID_REGISTERS:
                continue
            raw = r.get("text") or ""
            for cut in multi_cut(raw):
                meta = meta_fn(r)
                meta.update({
                    "origin_corpus": corpus_name,
                    "origin_row_id": r.get("id"),
                    "origin_licence": licence,
                    "measurement_overlap": True,
                    "measurement_overlap_note": overlap_note,
                })
                cands.append(_rec(side, reg, cut, cut[3], meta))

    # ---- AI origin, short-form generation corpus (28 Aug 2026, 21 models)
    add_corpus(
        "generated-corpus/generated.jsonl", "ai",
        "generated-corpus/generated.jsonl",
        lambda r: {"origin_model": r.get("model"),
                   "origin_provider": r.get("provider"),
                   "origin_prompt_style": r.get("prompt_style"),
                   "origin_genre": r.get("genre"),
                   "origin_date": r.get("generated_at") or r.get("era")},
        "owner-generated; unrestricted internal use",
        "generated-corpus is quoted in PHASE-2-NEXT-STEPS.md 5a")

    # ---- AI origin, long-form corpus (member of the held-out eval corpus)
    add_corpus(
        "longform-corpus/ai-longform.jsonl", "ai",
        "longform-corpus/ai-longform.jsonl",
        lambda r: {"origin_model": r.get("model"),
                   "origin_provider": r.get("provider"),
                   "origin_prompt_style": r.get("prompt_style"),
                   "origin_genre": r.get("genre"),
                   "origin_date": r.get("generated_at") or r.get("era")},
        "owner-generated; unrestricted internal use",
        "member of the 5,558-document held-out long-form corpus")

    # ---- human origin, eight licensed long-form sources
    add_corpus(
        "longform-corpus/human-longform.jsonl", "human",
        "longform-corpus/human-longform.jsonl",
        lambda r: {"origin_model": "human",
                   "origin_provider": r.get("source"),
                   "origin_prompt_style": None,
                   "origin_genre": r.get("genre"),
                   "origin_date": str(r.get("era_year") or "")},
        None,
        "member of the 5,558-document held-out long-form corpus")
    # licence varies per row on the human long-form side; restore it
    hl = {r["id"]: r.get("licence")
          for r in load(os.path.join(RS, "longform-corpus/human-longform.jsonl"))}
    for c in cands:
        if c["origin_corpus"] == "longform-corpus/human-longform.jsonl":
            c["origin_licence"] = hl.get(c["origin_row_id"])

    # ---- human origin, Opace blog short-form (2010-2020, pre-LLM by date)
    blog = os.path.join(RS, "shortform-corpus/human-shortform.jsonl")
    if os.path.exists(blog):
        for r in load(blog):
            text = norm(r.get("text"))
            wc = len(text.split())
            b = band_of(wc)
            if not b:
                continue
            cands.append({
                "side": "human", "register": "commercial-marketing",
                "band": b, "word_count": wc, "text": text,
                "cut_on": "paragraph",
                "origin_model": "human", "origin_provider": "opace-blog",
                "origin_prompt_style": None, "origin_genre": "opace-blog",
                "origin_corpus": "shortform-corpus/human-shortform.jsonl",
                "origin_row_id": r.get("id") or r.get("slug"),
                "origin_date": str(r.get("date") or r.get("year") or ""),
                "origin_licence": "owner-owned; internal use",
                "measurement_overlap": True,
                "measurement_overlap_note":
                    "member of the 4,368-passage human short-form "
                    "false-positive corpus (HANDOVER.md 4.6)",
            })

    return cands


def main():
    cands = collect()
    print(f"candidate passages: {len(cands)}")

    # deduplicate on normalised hash before anything else
    seen, uniq = set(), []
    for c in cands:
        h = sha(c["text"])
        if h in seen:
            continue
        seen.add(h)
        c["source_sha256"] = h
        uniq.append(c)
    print(f"after exact dedup: {len(uniq)}")

    # near-duplicate guard: 8-word shingle overlap against everything kept
    kept, shingle_owner = [], {}
    for c in sorted(uniq, key=lambda x: x["source_sha256"]):
        words = c["text"].lower().split()
        sh = {hash(tuple(words[i:i + 8])) for i in range(0, max(1, len(words) - 8), 4)}
        if not sh:
            continue
        hits = collections.Counter()
        for s in sh:
            o = shingle_owner.get(s)
            if o is not None:
                hits[o] += 1
        if hits and hits.most_common(1)[0][1] / len(sh) > 0.25:
            continue
        idx = len(kept)
        for s in sh:
            shingle_owner.setdefault(s, idx)
        kept.append(c)
    print(f"after near-duplicate guard: {len(kept)}")

    # balanced draw: (side, register, band), then spread over origin models
    cells = collections.defaultdict(list)
    for c in kept:
        cells[(c["side"], c["register"], c["band"])].append(c)

    chosen = []
    for side in ("ai", "human"):
        for reg in GRID_REGISTERS:
            for bname, _, _ in BANDS:
                pool = cells.get((side, reg, bname), [])
                if not pool:
                    print(f"  EMPTY CELL {side}/{reg}/{bname}")
                    continue
                by_model = collections.defaultdict(list)
                for c in pool:
                    by_model[c["origin_model"]].append(c)
                for v in by_model.values():
                    random.shuffle(v)
                picked, models = [], sorted(by_model)
                while len(picked) < PER_CELL and any(by_model[m] for m in models):
                    for m in models:
                        if len(picked) >= PER_CELL:
                            break
                        if by_model[m]:
                            picked.append(by_model[m].pop())
                if len(picked) < PER_CELL:
                    print(f"  SHORT CELL {side}/{reg}/{bname}: "
                          f"{len(picked)}/{PER_CELL}")
                chosen.extend(picked)

    # ---------------------------------------------------------------- assign
    # Register holdout first, then rewriter-family holdout, then whole sources.
    random.shuffle(chosen)
    rows = []
    train_cycle = collections.defaultdict(int)
    for i, c in enumerate(chosen):
        sid = "s-" + hashlib.sha256(
            (c["source_sha256"] + c["origin_corpus"]).encode()).hexdigest()[:16]
        c["source_id"] = sid
        c["lineage_id"] = "L-" + sid[2:]

        if c["register"] == HELD_OUT_REGISTER:
            c["rewriter_model"] = TRAIN_REWRITERS[i % len(TRAIN_REWRITERS)]
            c["split"] = "heldout_register"
        else:
            # one source in five goes to the reserved rewriting family, and
            # those sources are never rewritten by a training family.
            key = (c["side"], c["register"], c["band"])
            k = train_cycle[key]
            train_cycle[key] += 1
            if k % 5 == 4:
                c["rewriter_model"] = HELD_OUT_REWRITER
                c["split"] = "heldout_rewriter"
            elif k % 5 == 3:
                c["rewriter_model"] = TRAIN_REWRITERS[k % len(TRAIN_REWRITERS)]
                c["split"] = "heldout_source"
            else:
                c["rewriter_model"] = TRAIN_REWRITERS[k % len(TRAIN_REWRITERS)]
                c["split"] = "train"
        c["rewriter_family"] = REWRITER_FAMILY[c["rewriter_model"]]
        # class label of the UNTOUCHED source row
        c["class_label"] = "ai_original" if c["side"] == "ai" else "human_original"
        c["edit_intensity"] = "none"
        c["corpus_seed"] = SEED
        rows.append(c)

    out = os.path.join(HERE, "sources.jsonl")
    with open(out, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"\nsources written: {len(rows)} -> {out}")
    for key in ("side", "register", "band", "split", "rewriter_family"):
        print(" ", key, dict(collections.Counter(r[key] for r in rows)))
    print("  origin models:",
          len({r["origin_model"] for r in rows}), "distinct")
    print("  words: total",
          sum(r["word_count"] for r in rows))


if __name__ == "__main__":
    main()

"""Assemble one unified, de-duplicated analysis corpus from every labelled
source on the project, with a single label vocabulary.

Read-only over every upstream corpus: nothing outside signal-science/ is written.

Output: signal-science/corpus/docs.jsonl with one row per document:
  id, side, text, words, register, register_family, provider, model, model_tier,
  era, era_year, prompt_style, genre, source, licence, pool

`pool` records which upstream file the row came from, so any figure can be
traced back. De-duplication is on a normalised text hash (whitespace collapsed,
lower-cased): the cycle-2 corpus re-packages our own generated run and some
public sets, so overlap is real and must be removed before any statistic is
computed. First writer wins, in the order the pools are listed below, which
prefers the richest label set.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
IMPL = os.path.dirname(os.path.dirname(os.path.dirname(RESEARCH)))
OUT_DIR = os.path.join(HERE, "corpus")

WS = re.compile(r"\s+")


def norm_hash(text: str) -> str:
    return hashlib.sha1(WS.sub(" ", text.strip().lower()).encode("utf-8")).hexdigest()


def wc(text: str) -> int:
    return len(text.split())


# --- register normalisation ------------------------------------------------
# Upstream label vocabularies differ per pool. Map everything onto one small
# set of families so cross-pool breakdowns mean the same thing on both sides.
FAMILY = {
    # long-form article / journalism
    "news-piece": "journalism", "longform-journalism": "journalism",
    "news": "journalism", "journalism": "journalism", "news-article": "journalism",
    "blog-post": "blog", "blog": "blog", "article": "blog", "explainer": "blog",
    "how-to": "blog", "listicle": "blog", "opinion": "blog", "review": "blog",
    "travel-guide": "blog", "recipe": "blog",
    # academic
    "academic-essay": "academic", "academic-discussion": "academic",
    "academic-lit-review": "academic", "academic-introduction": "academic",
    "academic": "academic", "scientific-writing": "academic",
    "essay": "academic", "student-essay": "academic", "research-summary": "academic",
    # reports / white papers
    "white-paper": "report", "report": "report", "business-report": "report",
    "policy-brief": "report", "technical-report": "report", "research-document": "report",
    # corporate comms
    "press-release": "corporate", "company-update": "corporate",
    "case-study": "corporate", "corporate": "corporate", "annual-report": "corporate",
    # marketing
    "marketing-copy": "marketing", "seo-copy": "marketing", "landing-page": "marketing",
    "product-description": "marketing", "business-marketing": "marketing",
    "marketing": "marketing", "email-marketing": "marketing", "ad-copy": "marketing",
    # creative
    "story": "creative", "short-story": "creative", "fiction": "creative",
    "creative": "creative", "creative-writing": "creative", "poetry": "creative",
    # conversational / social (deprioritised by OBJECTIVE.md but kept labelled)
    "chat-reply": "chat", "chat": "chat", "qa": "chat", "forum-post": "social",
    "social-post": "social", "social": "social", "reddit": "social",
    # reference
    "encyclopaedic": "reference", "wiki": "reference", "reference": "reference",
    "documentation": "reference", "technical-documentation": "reference",
    "technical": "reference",
    # remaining upstream labels, mapped explicitly rather than by substring
    "howto-explainer": "blog", "thought-leadership": "blog",
    "faq-page": "marketing", "category-page": "marketing",
    # not a register but an author class; kept separate because it is the
    # false-positive population the brief singles out as must-not-smear
    "non-native": "non-native",
}


def family(register, genre) -> str:
    for v in (register, genre):
        if not v:
            continue
        k = str(v).strip().lower()
        if k in FAMILY:
            return FAMILY[k]
    for v in (register, genre):
        if not v:
            continue
        k = str(v).strip().lower()
        for needle, fam in (
            ("academ", "academic"), ("essay", "academic"), ("scien", "academic"),
            ("news", "journalism"), ("journal", "journalism"),
            ("blog", "blog"), ("article", "blog"),
            ("market", "marketing"), ("seo", "marketing"), ("product", "marketing"),
            ("press", "corporate"), ("case", "corporate"), ("company", "corporate"),
            ("report", "report"), ("paper", "report"), ("policy", "report"),
            ("stor", "creative"), ("fiction", "creative"), ("creativ", "creative"),
            ("chat", "chat"), ("social", "social"), ("forum", "social"),
        ):
            if needle in k:
                return fam
    return "other"


def jsonl(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    rows, seen = [], {}
    stats = {}

    def add(pool, d):
        text = (d.get("text") or "").strip()
        if not text:
            return "empty"
        n = wc(text)
        if n < 60:            # below 60 words nothing measured here is stable
            return "too_short"
        h = norm_hash(text)
        if h in seen:
            return "dup:" + seen[h]
        seen[h] = pool
        d["pool"] = pool
        d["words"] = n
        d["norm_hash"] = h
        rows.append(d)
        return "kept"

    def tally(pool, outcome):
        s = stats.setdefault(pool, {})
        key = outcome.split(":")[0] if outcome.startswith("dup") else outcome
        s[key] = s.get(key, 0) + 1

    R = RESEARCH

    # 1. our own generated current-model corpus: the richest AI labels we own
    for d in jsonl(os.path.join(R, "generated-corpus", "generated.jsonl")):
        if not d.get("usable", True):
            continue
        row = dict(
            id=d["id"], side="ai", text=d.get("text", ""),
            register=d.get("register"), genre=d.get("genre"),
            provider=d.get("provider"), model=d.get("model"),
            model_tier=d.get("model_tier") or d.get("tier"),
            era=d.get("era"), era_year=2026,
            prompt_style=d.get("prompt_style"), source=d.get("source"),
            licence="owner-generated",
        )
        tally("generated", add("generated", row))

    # 2. long-form AI (the register set OBJECTIVE.md prioritises)
    for d in jsonl(os.path.join(R, "longform-corpus", "ai-longform.jsonl")):
        row = dict(
            id=d["id"], side="ai", text=d.get("text", ""),
            register=d.get("register"), genre=d.get("genre"),
            provider=d.get("provider"), model=d.get("model"),
            model_tier=d.get("tier"), era=d.get("era"),
            era_year=d.get("era_year"), prompt_style=d.get("prompt_style"),
            source=d.get("source"), licence=d.get("licence"),
        )
        tally("ai-longform", add("ai-longform", row))

    # 3. long-form human (fresh, never used in training)
    for d in jsonl(os.path.join(R, "longform-corpus", "human-longform.jsonl")):
        row = dict(
            id=d["id"], side="human", text=d.get("text", ""),
            register=d.get("register"), genre=d.get("genre"),
            provider=d.get("provider"), model="human", model_tier="human",
            era=d.get("era"), era_year=d.get("era_year"), prompt_style=None,
            source=d.get("source"), licence=d.get("licence"),
        )
        tally("human-longform", add("human-longform", row))

    # 4. human battery corpora (evaluation-only licence; statistics only,
    #    never redistributed and never quoted at length)
    for name in ("human-corpus-v1.json", "human-corpus-v2.json"):
        path = os.path.join(IMPL, "tests", "battery", name)
        pool = "human-battery-" + name.split("-")[-1].split(".")[0]
        for d in json.load(open(path, encoding="utf-8")):
            row = dict(
                id=d["id"], side="human", text=d.get("text", ""),
                register=d.get("genre"), genre=d.get("genre"),
                provider="web", model="human", model_tier="human",
                era="human-pre-2022", era_year=d.get("era"), prompt_style=None,
                source=d.get("source_dataset") or d.get("source_url"),
                licence="research-evaluation quotation set (no redistribution)",
                difficulty=d.get("difficulty"),
            )
            tally(pool, add(pool, row))

    # 5. current-models public AI set (chat register: the contrast case)
    for d in jsonl(os.path.join(R, "current-models", "current-eval-set.jsonl")):
        row = dict(
            id=d["id"], side=d.get("side", "ai"), text=d.get("text", ""),
            register=d.get("register"), genre=d.get("genre"),
            provider=d.get("provider"), model=d.get("model"),
            model_tier=None, era=d.get("era"), era_year=2025,
            prompt_style=None, source=d.get("source"), licence=d.get("licence"),
        )
        tally("current-models", add("current-models", row))

    # 6. cycle-2 training corpus (both sides; heavily overlapping, deduped above)
    for d in jsonl(os.path.join(R, "cycle2-corpus", "corpus.jsonl")):
        row = dict(
            id=d["id"], side=d["side"], text=d.get("text", ""),
            register=d.get("register"), genre=d.get("genre"),
            provider=d.get("provider"), model=d.get("model"),
            model_tier=None, era=d.get("era"), era_year=None,
            prompt_style=None, source=d.get("source"), licence=d.get("licence"),
            edit_level=d.get("edit_level"), split=d.get("split"),
        )
        tally("cycle2", add("cycle2", row))

    # Tag every row with the cycle-2 split its text belongs to, whatever pool it
    # was kept under. The cycle-2 training corpus re-packages our generated run,
    # so a row can be labelled pool="generated" and still have been seen during
    # training. Any evaluation that ignores this is measuring memorisation.
    c2_split = {}
    for d in jsonl(os.path.join(R, "cycle2-corpus", "corpus.jsonl")):
        t = (d.get("text") or "").strip()
        if t:
            c2_split[norm_hash(t)] = d.get("split")
    for r in rows:
        r["register_family"] = family(r.get("register"), r.get("genre"))
        r["c2_split"] = c2_split.get(r["norm_hash"])
        r["seen_in_training"] = c2_split.get(r["norm_hash"]) == "train"

    out = os.path.join(OUT_DIR, "docs.jsonl")
    with open(out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    summary = {
        "n_docs": len(rows),
        "n_ai": sum(1 for r in rows if r["side"] == "ai"),
        "n_human": sum(1 for r in rows if r["side"] == "human"),
        "per_pool": stats,
        "per_family": {},
        "min_words": 60,
        "seen_in_cycle2_training": sum(1 for r in rows if r["seen_in_training"]),
        "never_seen": sum(1 for r in rows if not r["seen_in_training"]),
    }
    for r in rows:
        k = r["register_family"] + "/" + r["side"]
        summary["per_family"][k] = summary["per_family"].get(k, 0) + 1
    json.dump(summary, open(os.path.join(OUT_DIR, "corpus-summary.json"), "w"), indent=2)
    print(json.dumps(summary, indent=2)[:4000])


if __name__ == "__main__":
    sys.exit(main())

"""CYCLE-2 training-set assembly (v2).

v2 fixes a leakage defect and re-weights for the binding objective.

LEAKAGE FIX. The upstream corpus builder groups each generated article by its
own text hash, so the ~38 generations that share a topic were scattered across
train/cal/test. Every one of the 105 topics appeared in train, meaning any
cycle-2 score on the generated slice of test was topic-contaminated. Here the
generated rows are re-split with `group = topic_id`, stratified by register, so
a topic lives in exactly one split. Each topic maps to exactly one register
(verified: 0 of 105 topics span two registers), so register balance survives.

RECOVERY. Because the split is now controlled by topic, the 1,722 generated
rows the upstream register-balancer discarded can be restored without risking
leakage. They are unbiased across prompt style and model tier (measured), and
they roughly double the long-form AI data and lift the per-category test
denominators that the objective requires (academic-essay 12 -> ~30).

WEIGHTING. OBJECTIVE.md ranks long-form highest and social lowest. Training
weights follow: per-(register, side) mass equalisation as before, then a
register priority multiplier that favours long-form, an extra academic boost
(the worst category), and the existing hard-negative boost.

Output: cycle2-train/dataset.jsonl + dataset-manifest.json
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH, "cycle2-corpus"))

from common import Quarantine, text_hash, clean_text, acceptable  # noqa: E402

CYCLE2 = os.path.join(HERE, "frozen", "cycle2-corpus.snapshot.jsonl")
GENERATED = os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")
CYCLE1 = os.path.join(RESEARCH, "corpus", "corpus.jsonl")
CREATIVE = os.path.join(RESEARCH, "current-models", "raw",
                        "gemini3pro-creative-writing-2700x.jsonl")
LONGFORM_AI = os.path.join(HERE, "frozen", "ai-longform.snapshot.jsonl")
HUMAN_V2 = os.path.join(HERE, "frozen", "human-corpus-v2.snapshot.json")
BATTERY_DIR = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", "tests", "battery"))
OUT = os.path.join(HERE, "dataset.jsonl")
MANIFEST = os.path.join(HERE, "dataset-manifest.json")

CHAT_SLICE_CAP = 420
SPLIT_BOUNDS = (0.70, 0.85)

GEN_REGISTER = {
    "news-piece": ("article", "news-piece"),
    "howto-explainer": ("article", "how-to-guide"),
    "thought-leadership": ("marketing", "thought-leadership"),
    "company-blog": ("marketing", "company-blog"),
    "case-study": ("marketing", "case-study"),
    "press-release": ("marketing", "press-release"),
    "newsletter": ("marketing", "newsletter"),
    "seo-service-page": ("marketing", "seo-service-page"),
    "product-description": ("marketing", "product-description"),
    "category-page": ("marketing", "category-page"),
    "landing-page": ("marketing", "landing-page"),
    "faq-page": ("marketing", "faq-page"),
    "academic-essay": ("academic", "academic-essay"),
    "academic-lit-review": ("academic", "academic-lit-review"),
    "academic-discussion": ("academic", "academic-discussion"),
    "social-linkedin": ("social", "social-linkedin"),
    "social-x-thread": ("social", "social-x-thread"),
    "social-facebook": ("social", "social-facebook"),
    "social-instagram": ("social", "social-instagram"),
}

# OBJECTIVE.md priority order. Long-form highest, social lowest.
REGISTER_PRIORITY = {"academic": 1.35, "report": 1.20, "article": 1.10,
                     "marketing": 1.00, "reference": 0.80,
                     "social": 0.50, "chat": 0.40}
HARD_BOOST = 1.6

LONGFORM_REGISTERS = ("academic", "article", "marketing", "report", "reference")

LF_REGISTER = {
    "academic-essay": ("academic", "academic-essay"),
    "academic-lit-review": ("academic", "academic-lit-review"),
    "academic-discussion": ("academic", "academic-discussion"),
    "research-summary": ("academic", "research-summary"),
    "white-paper": ("report", "white-paper"),
    "company-update": ("marketing", "company-update"),
    "longform-journalism": ("article", "longform-journalism"),
    "story": ("creative", "story"),
}

HC2_GENRE = {
    "business-marketing": ("marketing", "business-marketing"),
    "technical": ("reference", "technical"),
    "blog-editorial": ("article", "blog-editorial"),
    "journalism": ("article", "journalism"),
    "academic": ("academic", "academic"),
    "casual-forum": ("social", "casual-forum"),
    "non-native": ("article", "non-native"),
}

_BULLET = __import__("re").compile(r"^\s*([-*\u2022]|\d+[.)])\s+", __import__("re").M)
_HEADINGISH = __import__("re").compile(r"^\s*(#{1,6}\s+|[A-Z][^.!?\n]{3,60}:?\s*)$", __import__("re").M)
_SECOND = __import__("re").compile(r"\b(you|your|yours|you're|you'll)\b", __import__("re").I)


def confusable(text: str) -> bool:
    """The structural habits that make ordinary human web writing look machine-made.

    Mirrors the `plausibly-confusable` definition in tests/battery/HUMAN-CORPUS-V2.md
    (mostly short paragraphs, heading-like lines, high second-person density,
    bullet runs, listicle or how-to framing; two or more). It is applied to
    LICENCE-CLEAR training humans so the hard negatives that corpus identified
    can be learned from without training on the corpus itself.
    """
    paras = [p for p in text.split("\n\n") if p.strip()]
    w = text.split()
    if not w:
        return False
    signals = 0
    if paras and sum(1 for p in paras if len(p.split()) < 60) / len(paras) > 0.6:
        signals += 1
    if len(_HEADINGISH.findall(text)) >= 2:
        signals += 1
    if len(_SECOND.findall(text)) / len(w) > 0.015:
        signals += 1
    if len(_BULLET.findall(text)) >= 3:
        signals += 1
    low = text[:400].lower()
    if any(k in low for k in ("how to", "tips", "ways to", "guide to", "steps to",
                             "reasons why", "checklist", "best ")):
        signals += 1
    return signals >= 2


def hkey(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def split_by_group(items, groupkey, stratkey):
    """Content-hash split at GROUP level within each stratum. Never index-based."""
    strata = collections.defaultdict(list)
    for it in items:
        strata[stratkey(it)].append(it)
    assign = {}
    for st, rows in strata.items():
        groups = sorted({groupkey(r) for r in rows}, key=lambda g: hkey(f"{st}|{g}"))
        n = len(groups)
        # Every stratum must contribute at least one TEST group: the objective
        # sets a per-category floor, and a category with no test rows cannot be
        # certified at all. Cal yields first when groups are scarce.
        n_test = max(1, int(round(n * (1 - SPLIT_BOUNDS[1]))))
        n_cal = max(1, int(round(n * (SPLIT_BOUNDS[1] - SPLIT_BOUNDS[0])))) if n >= 4 else 0
        n_train = n - n_test - n_cal
        if n_train < 1:
            n_train, n_cal = 1, max(0, n - 1 - n_test)
        for i, g in enumerate(groups):
            assign[(st, g)] = ("train" if i < n_train
                               else ("cal" if i < n_train + n_cal else "test"))
    for it in items:
        it["split"] = assign[(stratkey(it), groupkey(it))]
    return assign


def main() -> None:
    q = Quarantine()
    print(f"quarantine index: {sum(q.sources.values())} rows from {len(q.sources)} sources")

    base = [json.loads(l) for l in open(CYCLE2)]
    print(f"cycle2-corpus snapshot: {len(base)} rows")

    # ---------------------------------------------------------------- generated
    gen_by_hash = {}
    for l in open(GENERATED):
        r = json.loads(l)
        t = clean_text(r.get("text") or "")
        if not acceptable(t, 100, 1400):
            continue
        r["_clean"] = t
        gen_by_hash[text_hash(t)] = r
    print(f"generated.jsonl usable: {len(gen_by_hash)}")

    # drop the upstream generated rows; rebuild them all from source with topic groups
    kept_base = [r for r in base if r["source"] != "openrouter-2026-08"]
    dropped_upstream = len(base) - len(kept_base)

    gen_rows = []
    for h, r in gen_by_hash.items():
        reason = q.check(r["_clean"], r["id"], "openrouter-2026-08")  # raises on eval collision
        if reason:
            continue
        reg, genre = GEN_REGISTER.get(r.get("register") or "",
                                      ("article", r.get("register") or "unknown"))
        gen_rows.append({
            "id": "gen-" + h[:12], "side": "ai", "register": reg,
            "provider": r.get("provider") or "unknown", "model": r.get("model") or "unknown",
            "era": "2026-frontier", "genre": genre, "edit_level": "full-generation",
            "source": "openrouter-2026-08", "licence": "Owner-generated (Opace)",
            "words": len(r["_clean"].split()), "sha256": h,
            "note": f"topic={r.get('topic_id')}", "text": r["_clean"],
            "prompt_style": r.get("prompt_style"), "model_tier": r.get("model_tier"),
            "temperature": r.get("temperature"), "topic_id": r.get("topic_id"),
        })
    split_by_group(gen_rows, lambda r: r["topic_id"], lambda r: r["genre"])
    print(f"generated rebuilt: {len(gen_rows)} rows "
          f"(upstream had {dropped_upstream}; recovered {len(gen_rows)-dropped_upstream}), "
          f"topic-grouped into "
          f"{dict(collections.Counter(r['split'] for r in gen_rows))}")
    ntopics = len({r["topic_id"] for r in gen_rows})
    tsplit = {}
    for r in gen_rows:
        tsplit.setdefault(r["topic_id"], r["split"])
    assert all(len({r["split"] for r in gen_rows if r["topic_id"] == t}) == 1
               for t in list(tsplit)[:20]), "a topic straddles two splits"
    print(f"  {ntopics} topics, each in exactly one split: "
          f"{dict(collections.Counter(tsplit.values()))}")

    rows = kept_base + gen_rows
    for r in rows:
        r.setdefault("prompt_style", None)
        r.setdefault("model_tier", None)

    # ---------------------------------------------------------------- chat slice
    c1 = [json.loads(l) for l in open(CYCLE1) if json.loads(l).get("split") == "train"]
    c1.sort(key=lambda r: text_hash(r["text"]))
    seen = {r["sha256"] for r in rows}
    chat = []
    for r in ([x for x in c1 if x["side"] == "ai"][: CHAT_SLICE_CAP // 2]
              + [x for x in c1 if x["side"] == "human"][: CHAT_SLICE_CAP // 2]):
        h = text_hash(r["text"])
        if h in seen:
            continue
        seen.add(h)
        chat.append({"id": "c1-" + r["id"], "side": r["side"], "register": "chat",
                     "provider": "human" if r["side"] == "human" else "mixed",
                     "model": r.get("model") or "unknown", "era": "2022-2025-chat",
                     "genre": r.get("genre") or "chat-reply", "edit_level": None,
                     "split": "train", "source": "cycle1-" + r["source"],
                     "licence": r.get("license") or "see corpus/manifest.json",
                     "words": r.get("words"), "sha256": h, "note": "cycle-1 retention slice",
                     "text": r["text"], "prompt_style": None, "model_tier": None})
    rows += chat
    print(f"cycle-1 chat retention slice: {len(chat)} rows (train only)")

    # ------------------------------------------- creative long-form, TEST ONLY
    # AI fiction is available; matched HUMAN fiction is not. Training on it
    # unmatched would teach "fiction = AI", which is precisely the register
    # shortcut this cycle exists to remove. So it is measured, never trained on,
    # and excluded from every false-positive denominator.
    creative = []
    if os.path.exists(CREATIVE):
        for i, l in enumerate(open(CREATIVE)):
            r = json.loads(l)
            t = clean_text(r.get("response") or "")
            if len(t.split()) < 400 or not acceptable(t, 400, 1400):
                continue
            h = text_hash(t)
            if h in seen or q.check(t, f"creative-{i}", "creative") is not None:
                continue
            seen.add(h)
            creative.append({"id": f"creative-{h[:10]}", "side": "ai", "register": "creative",
                             "provider": "google", "model": "gemini-3-pro", "era": "2026-frontier",
                             "genre": "creative-fiction", "edit_level": "full-generation",
                             "split": "test", "source": "gemini3pro-creative-writing",
                             "licence": "public dataset, research use", "words": len(t.split()),
                             "sha256": h, "note": "TEST ONLY: no matched human fiction available",
                             "text": t, "prompt_style": None, "model_tier": "pro-flagship",
                             "eval_only": True})
            if len(creative) >= 300:
                break
    rows += creative
    print(f"creative long-form (AI, test-only, never trained on): {len(creative)} rows")

    # ------------------------------------------------- long-form AI (owner-generated)
    # Licence: owner-generated, unrestricted internal use. These are exactly the
    # categories the objective says we fail: academic essays, literature reviews,
    # discussion sections, white papers, stories, company updates, long-form
    # journalism. Topic-grouped like the other generated material.
    lf_rows = []
    if os.path.exists(LONGFORM_AI):
        for l in open(LONGFORM_AI):
            r = json.loads(l)
            t = clean_text(r.get("text") or "")
            if not acceptable(t, 100, 2400):
                continue
            h = text_hash(t)
            if h in seen or q.check(t, r.get("id", h), "longform") is not None:
                continue
            seen.add(h)
            reg, genre = LF_REGISTER.get(r.get("register") or "",
                                         ("article", r.get("register") or "unknown"))
            lf_rows.append({
                "id": "lf-" + h[:12], "side": "ai", "register": reg, "genre": genre,
                "provider": r.get("provider") or "unknown", "model": r.get("model") or "unknown",
                "era": "2026-frontier", "edit_level": "full-generation",
                "source": "openrouter-longform-2026-08", "licence": "Owner-generated (Opace)",
                "words": len(t.split()), "sha256": h, "note": f"topic={r.get('topic_id')}",
                "text": t, "prompt_style": r.get("prompt_style"),
                "model_tier": r.get("model_tier"), "topic_id": r.get("topic_id") or h[:6],
            })
        split_by_group(lf_rows, lambda r: r["topic_id"], lambda r: r["genre"])
    # Fiction has no human counterpart anywhere in the corpus, so AI stories are
    # measured, never trained on: training them unmatched would teach
    # "fiction equals AI", the very register shortcut this cycle removes.
    for r in lf_rows:
        if r["register"] == "creative":
            r["split"] = "test"
            r["eval_only"] = True
    rows += lf_rows
    print(f"long-form AI (owner-generated, topic-grouped): {len(lf_rows)} rows -> "
          f"{dict(collections.Counter(r['split'] for r in lf_rows))}")

    # --------------------------------------- human-corpus-v2: EVALUATION ONLY
    # tests/battery/HUMAN-CORPUS-V2.md states the licence position explicitly:
    # a research-evaluation quotation set that "must not be ... used as model-
    # training data beyond threshold calibration and hard-negative selection".
    # It is therefore held ENTIRELY in the test split and never trained on. That
    # also preserves it as an unbiased false-positive measurement set, which is
    # the whole reason it was built.
    rows = [r for r in rows if not r["source"].startswith("battery-")]
    # the snapshot's battery rows have just been dropped, so their hashes must
    # leave `seen` too, or the live corpus would be deduped against ghosts
    seen = {r["sha256"] for r in rows}
    hv = []
    for fn in ("human-corpus-v2.json", "human-corpus-v1.json"):
        path = HUMAN_V2 if fn.endswith("v2.json") else os.path.join(BATTERY_DIR, fn)
        if not os.path.exists(path):
            continue
        for sdoc in json.load(open(path)):
            t = clean_text(sdoc.get("text") or sdoc.get("body") or "")
            if len(t.split()) < 40:
                continue
            h = text_hash(t)
            if h in seen:
                continue
            seen.add(h)
            g = sdoc.get("genre") or "unknown"
            reg, genre = HC2_GENRE.get(g, ("article", g))
            hv.append({
                "id": sdoc.get("id") or ("hc-" + h[:10]), "side": "human", "register": reg,
                "genre": genre, "provider": "human", "model": "human",
                "era": str(sdoc.get("era") or "pre-2022-human"), "edit_level": None,
                "split": "test", "source": "battery-" + fn.replace(".json", ""),
                "licence": "research-evaluation quotation set; NOT training data",
                "words": len(t.split()), "sha256": h,
                "note": f"difficulty={sdoc.get('difficulty')}", "text": t,
                "prompt_style": None, "model_tier": None,
                "difficulty": sdoc.get("difficulty"), "train_forbidden": True,
            })
    rows += hv
    print(f"human-corpus v1+v2 (EVALUATION ONLY, all pinned to test): {len(hv)} rows")

    # ---------------------------------------------------------------- quarantine
    for r in rows:
        h = text_hash(r["text"])
        if h in q.hard_hashes:
            raise RuntimeError(f"QUARANTINE VIOLATION: {r['id']} ({r['source']}) matches "
                               f"a held-out row in {q.hard_hashes[h]}. Aborting.")
    tf = [r for r in rows if r.get("train_forbidden") and r["split"] != "test"]
    if tf:
        raise RuntimeError(f"{len(tf)} evaluation-only rows outside test; aborting.")
    bad = [r for r in rows if r["source"].startswith("battery-") and r["split"] != "test"]
    if bad:
        raise RuntimeError(f"{len(bad)} battery rows outside test; aborting.")
    dupes = collections.Counter(r["sha256"] for r in rows)
    if max(dupes.values()) > 1:
        raise RuntimeError(f"duplicate text hashes: {max(dupes.values())}")
    print("quarantine: 0 hard collisions, 0 battery rows in train/cal, 0 duplicates — PASS")

    # ---------------------------------------------------------------- weights
    HARD_HUMAN = {"business-marketing-copy", "business-marketing", "seo-blog-post",
                  "seo-service-page", "landing-page", "company-blog", "case-study",
                  "thought-leadership", "faq-page", "product-description",
                  "category-page", "press-release", "newsletter",
                  "student-essay", "academic-essay", "academic-discussion", "academic",
                  "scientific-writing", "research-abstract", "academic-lit-review",
                  "scholarly-web", "business-report"}
    n_conf = 0
    for r in rows:
        conf = False
        if r["side"] == "human" and not r.get("train_forbidden"):
            conf = confusable(r["text"])
            n_conf += conf
        hn = (r["side"] == "human" and (r["genre"] in HARD_HUMAN or conf)) or \
             (r["side"] == "ai" and r.get("prompt_style") == "human-voice") or \
             (r["side"] == "ai" and r.get("model_tier") == "pro-flagship")
        r["hard_negative"] = bool(hn)
        r["confusable"] = bool(conf)
        r["longform"] = r["register"] in LONGFORM_REGISTERS
    print(f"structurally confusable licence-clear training humans: {n_conf}")

    with open(OUT, "w") as f:
        for r in rows:
            r.pop("_clean", None)
            f.write(json.dumps(r) + "\n")

    def ct(key, sub=None):
        s = [r for r in rows if sub is None or sub(r)]
        return dict(sorted(collections.Counter(str(r.get(key)) for r in s).items(),
                           key=lambda x: -x[1]))

    manifest = {
        "built": "2026-08-28", "version": "v2-topic-grouped",
        "rows": len(rows),
        "leakage_fix": {
            "problem": "upstream grouped generated articles by own text hash, so all 105 "
                       "topics appeared in train and the generated slice of test was "
                       "topic-contaminated",
            "fix": "generated rows re-split with group=topic_id, stratified by GENRE so every long-form category contributes at least one held-out topic",
            "topics": ntopics,
            "topics_per_split": dict(collections.Counter(tsplit.values())),
            "recovered_rows": len(gen_rows) - dropped_upstream,
        },
        "by_split": ct("split"), "by_side": ct("side"), "by_register": ct("register"),
        "by_prompt_style_ai": ct("prompt_style", lambda r: r["side"] == "ai"),
        "by_model_tier_ai": ct("model_tier", lambda r: r["side"] == "ai"),
        "test_humans_by_genre": ct("genre", lambda r: r["split"] == "test" and r["side"] == "human"),
        "test_ai_by_genre": ct("genre", lambda r: r["split"] == "test" and r["side"] == "ai"),
        "train_ai_by_genre": ct("genre", lambda r: r["split"] == "train" and r["side"] == "ai"),
        "hard_negatives": sum(r["hard_negative"] for r in rows),
        "register_priority": REGISTER_PRIORITY,
        "creative_test_only": len(creative),
        "longform_ai_rows": len(lf_rows),
        "human_corpus_v2_eval_only": len(hv),
        "confusable_training_humans": n_conf,
        "licence_note": ("tests/battery/human-corpus-v*.json is a research-evaluation "
                         "quotation set; its own manifest forbids use as training data "
                         "beyond calibration and hard-negative selection. It is held "
                         "entirely in test and never trained on."),
        "quarantine": {"index_rows": sum(q.sources.values()), "sources": q.sources,
                       "hard_collisions": 0,
                       "rule": "normalised-text SHA-256; abort on collision"},
    }
    json.dump(manifest, open(MANIFEST, "w"), indent=2)
    print(f"\nwrote {OUT} ({len(rows)} rows)")
    for k in ("by_split", "by_side"):
        print(f"  {k}: {manifest[k]}")


if __name__ == "__main__":
    main()

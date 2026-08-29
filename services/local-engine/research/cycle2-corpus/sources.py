"""Per-source extractors for the cycle-2 published-register corpus.

Every extractor yields dicts with the corpus schema minus `split`, plus a
`group` key used to keep related documents (an essay and its edited versions,
a human source and its AI derivatives) inside one split.

Licence for each source is attached here, at the point of extraction, so a row
can never end up in corpus.jsonl without one.
"""

from __future__ import annotations

import io
import json
import os
import re
import collections

import hfio
from common import clean_text, acceptable, text_hash, words

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)

LICENCES = {
    "gradtex": "CC BY 4.0 (elisabeth-pl-pl/GRADTEX); human + some MGT rows inherited from yaful/MAGE, Apache-2.0",
    "aita": "Apache-2.0 (mild-rgb/aita-human-vs-ai) - AI half only; human half is redacted upstream",
    "teichai": "Apache-2.0 (TeichAI/Claude-*-4.6-Reasoning-*)",
    "hatbench": "Apache-2.0 (HAT-Baselines/HAT-Bench)",
    "maga": "MIT (anyangsong/MAGA)",
    "c4": "ODC-BY 1.0 (allenai/c4, en split); underlying pages remain their authors'",
    "persuade": "MIT (realbenpope/PERSUADE_manageable mirror); upstream PERSUADE 2.0, The Learning Agency Lab, CC BY 4.0",
    "openrouter": "Owner-generated (Opace), unrestricted internal use",
    "battery": "Owner-curated (Opace) human regression battery",
}

# ============================================================ GRADTEX

GRADTEX_DOMAIN = {
    "news": ("article", "news"),
    "tech_news": ("article", "tech-news"),
    "science": ("academic", "scientific-writing"),
    "knowledge": ("reference", "encyclopaedic"),
    "reviews": ("marketing", "consumer-review"),
    "social_media": ("social", "forum-post"),
}
GRADTEX_EDIT = {
    "MGT": "full-generation",
    "paraphrase": "paraphrase",
    "completion": "partial-completion",
    "polish": "light-edit",
    "rewrite_style": "style-rewrite",
}
GRADTEX_PROVIDER = {
    "claude-sonnet-4.6": ("anthropic", "2026-frontier"),
    "gpt-5.4-mini": ("openai", "2026-frontier"),
    "gemini-3.5-flash": ("google", "2026-frontier"),
    "qwen3.5-27b": ("alibaba", "2026-frontier"),
    "gemma-4-31b-it": ("google", "2026-frontier"),
    "gemma-4-e4b-it": ("google", "2026-frontier"),
    "mistral-small-3.2-24b-instruct": ("mistral", "2026-frontier"),
    "gpt-3.5-turbo": ("openai", "2022-2023"),
    "davinci-003": ("openai", "2022-2023"),
    "davinci-002": ("openai", "2022-2023"),
}


def _first_str(*vals) -> str:
    """First value that is a non-empty string. Guards against pandas NA, which
    raises on truth-testing."""
    for v in vals:
        if isinstance(v, str) and v.strip():
            return v
    return ""


def gradtex(ai_cap: int, human_cap: int):
    import pandas as pd

    frames = []
    for split in ("train", "validation", "test"):
        b = hfio.fetch_whole("elisabeth-pl-pl/GRADTEX", f"{split}.parquet", cache=f"gradtex_{split}.parquet")
        frames.append(pd.read_parquet(io.BytesIO(b)))
    df = pd.concat(frames, ignore_index=True)

    ai_rows, human_rows = [], []
    for r in df.itertuples(index=False):
        dom = GRADTEX_DOMAIN.get(getattr(r, "domain", None))
        if dom is None:                       # fiction, conversations -> out of register
            continue
        register, genre = dom
        t = clean_text(r.text)
        if not acceptable(t, 60 if register == "social" else 100, 900):
            continue
        anchor = _first_str(getattr(r, "original_name_in_MAGE", None),
                            getattr(r, "human_source_text", None), t)
        group = "gradtex:" + text_hash(anchor[:400])[:16]
        if r.multiclass_label == "HWT":
            human_rows.append(dict(
                side="human", register=register, provider="human", model="human",
                era="pre-2022-human", genre=genre, edit_level=None,
                source="gradtex-human (MAGE)", licence=LICENCES["gradtex"],
                text=t, group=group,
                note=f"MAGE sub_source={r.sub_source}",
            ))
        else:
            prov, era = GRADTEX_PROVIDER.get(r.generator_model, ("unknown", "unknown"))
            ai_rows.append(dict(
                side="ai", register=register, provider=prov, model=r.generator_model,
                era=era, genre=genre,
                edit_level=GRADTEX_EDIT.get(r.scenario_family, r.scenario_family),
                source="gradtex-ai", licence=LICENCES["gradtex"],
                text=t, group=group,
                note=f"scenario={r.scenario}; domain={r.domain}",
            ))
    yield from _balanced(ai_rows, ai_cap, lambda r: (r["model"], r["register"], r["edit_level"]))
    yield from _balanced(human_rows, human_cap, lambda r: (r["register"], r["genre"]))


# ============================================================ AITA (AI half)

def aita(cap: int):
    rows = list(hfio.jsonl_rows(hfio.fetch_whole("mild-rgb/aita-human-vs-ai", "dataset.jsonl", cache="aita.jsonl")))
    out = []
    for r in rows:
        if r.get("label") != "ai":
            continue
        t = clean_text(r.get("text") or "")
        if not acceptable(t, 80, 900):
            continue
        prov = (r.get("generator") or "/").split("/")[0]
        out.append(dict(
            side="ai", register="social", provider=prov, model=r["generator"],
            era="2026-frontier", genre="personal-narrative", edit_level="full-generation",
            source="aita-human-vs-ai", licence=LICENCES["aita"],
            text=t, group="aita:" + str(r.get("q_id")),
            note="first-person judgement narrative; upstream human half redacted",
        ))
    yield from _balanced(out, cap, lambda r: (r["model"],))


# ============================================================ TeichAI

_CHATTY = re.compile(
    r"(^|\n)\s*(great question|good question|sure[,!]|certainly[,!]|happy to help|let me|i'?ll |here'?s (a|the|what)|"
    r"i can help|absolutely[,!]|of course[,!]|thanks for)", re.I)
_MARKUP = re.compile(r"(^|\n)\s*(#{1,6} |[-*+] |\d+\. |\|)")
TEICHAI_YIELD: dict[str, dict] = {}

_META = re.compile(r"\b(you asked|your question|as an ai|i'?m an ai|hope (this|that) helps|feel free to)\b", re.I)


def _is_prose(t: str) -> bool:
    """Keep only continuous published-style prose: no chat opener, no list or
    heading scaffolding, no direct address to a questioner."""
    if _CHATTY.search(t[:400]) or _META.search(t):
        return False
    if len(_MARKUP.findall(t)) > 0:
        return False
    paras = [p for p in t.split("\n\n") if p.strip()]
    if len(paras) < 2:
        return False
    if t.count("**") > 2:
        return False
    ws = words(t)
    if ws.count("you") + ws.count("your") > 0.012 * len(ws):
        return False
    return True


def teichai(cap: int):
    specs = [
        ("TeichAI/Claude-Sonnet-4.6-Reasoning-1100x", "sonnet_4.6_reasoning_1100x.jsonl", "claude-sonnet-4.6", "teich_sonnet.jsonl"),
        ("TeichAI/Claude-Opus-4.6-Reasoning-887x", "opus_4.6_reasoning_887x.jsonl", "claude-opus-4.6", "teich_opus.jsonl"),
    ]
    out, seen_total = [], 0
    TEICHAI_YIELD.clear()
    for repo, path, model, cache in specs:
        seen_model = kept_model = 0
        for r in hfio.jsonl_rows(hfio.fetch_whole(repo, path, cache=cache)):
            msgs = r.get("messages") or []
            asst = [m for m in msgs if m.get("role") == "assistant"]
            if not asst:
                continue
            seen_total += 1
            seen_model += 1
            t = clean_text(asst[-1].get("content") or "")
            if not acceptable(t, 150, 900) or not _is_prose(t):
                continue
            kept_model += 1
            out.append(dict(
                side="ai", register="article", provider="anthropic", model=model,
                era="2026-frontier", genre="analytical-essay", edit_level="full-generation",
                source="teichai-reasoning", licence=LICENCES["teichai"],
                text=t, group="teich:" + text_hash(t)[:16],
                note="single-turn assistant reply, filtered to continuous prose (no lists, headings or reader address)",
            ))
        TEICHAI_YIELD[model] = {"assistant_replies": seen_model, "published_register_prose": kept_model}
    print(f"  teichai: {len(out)} prose rows kept from {seen_total} assistant replies "
          f"({100*len(out)/max(seen_total,1):.1f}%)", flush=True)
    if not cap:
        print("  teichai: cap is 0 - source measured and REJECTED on register grounds, "
              "see MANIFEST.md", flush=True)
        return
    yield from _balanced(out, cap, lambda r: (r["model"],))


# ============================================================ HAT-Bench

HAT_DOMAIN = {
    "essays": ("academic", "student-essay"),
    "abstracts": ("academic", "research-abstract"),
    "news": ("article", "news"),
    "reports": ("report", "business-report"),
}
HAT_CELLS = [
    (d, g) for d in ("essays", "abstracts", "news", "reports")
    for g in ("gpt-5.4", "gpt-5.4-nano", "gemini-2.5-flash", "qwen3-8b")
]
HAT_PROVIDER = {"gpt-5.4": ("openai", "2026-frontier"), "gpt-5.4-nano": ("openai", "2026-frontier"),
                "gemini-2.5-flash": ("google", "2025-2026"), "qwen3-8b": ("alibaba", "2025-2026")}
HAT_BYTES = int(os.environ.get("HAT_BYTES", 55_000_000))


def hatbench(ai_cap: int, human_cap: int):
    ai_rows, human_rows = [], []
    for domain, gen in HAT_CELLS:
        register, genre = HAT_DOMAIN[domain]
        prov, era = HAT_PROVIDER[gen]
        blob = hfio.fetch_range("HAT-Baselines/HAT-Bench", f"{domain}_{gen}.csv", HAT_BYTES,
                                cache=f"hat_{domain}_{gen}.csv")
        n = 0
        for r in hfio.csv_rows(blob):
            t = clean_text(r.get("text_clean") or "")
            ver = r.get("version") or ""
            if not acceptable(t, 100, 900):
                continue
            group = f"hat:{domain}:{r.get('essay_id')}"
            n += 1
            if ver == "v0":
                # Only the essay cells have datable provenance (the US student
                # argumentative-essay pool, collected 2010-2020). The abstract,
                # news and report cells are human by dataset construction but
                # the card gives no collection dates, so they are labelled as
                # such rather than claimed to be pre-2022.
                v0_era = "pre-2022-human" if domain == "essays" else "human-labelled-undated"
                human_rows.append(dict(
                    side="human", register=register, provider="human", model="human",
                    era=v0_era, genre=genre, edit_level="v0",
                    source=f"hatbench-{domain}-v0", licence=LICENCES["hatbench"],
                    text=t, group=group,
                    note="HAT-Bench v0 = pure human-written baseline",
                ))
            else:
                try:
                    frac = float(r.get("AI_token_ratio") or 0.0)
                except ValueError:
                    frac = 0.0
                ai_rows.append(dict(
                    side="ai", register=register, provider=prov,
                    model=r.get("model_used") or gen, era=era, genre=genre,
                    edit_level=ver,
                    source=f"hatbench-{domain}-{gen}", licence=LICENCES["hatbench"],
                    text=t, group=group,
                    note=f"AI_token_ratio={frac:.3f}; operation={r.get('operation')}",
                    ai_token_ratio=round(frac, 4),
                ))
        print(f"  hatbench {domain}_{gen}: {n} usable rows from {HAT_BYTES//1_000_000}MB", flush=True)
    yield from _balanced(ai_rows, ai_cap, lambda r: (r["register"], r["model"], r["edit_level"]))
    yield from _balanced(human_rows, human_cap, lambda r: (r["register"], r["genre"]))


# ============================================================ MAGA

MAGA_DOMAIN = {
    "wikipedia": ("reference", "encyclopaedic"), "Wikipedia": ("reference", "encyclopaedic"),
    "news": ("article", "news"), "News": ("article", "news"), "CNN": ("article", "news"),
    "bbc": ("article", "news"), "BBC": ("article", "news"), "XSum": ("article", "news"),
    "arxiv": ("academic", "research-abstract"), "Arxiv": ("academic", "research-abstract"),
    "pubmed": ("academic", "research-abstract"), "PubMed": ("academic", "research-abstract"),
    "wikihow": ("marketing", "how-to-guide"), "WikiHow": ("marketing", "how-to-guide"),
    "Yelp": ("marketing", "consumer-review"), "yelp": ("marketing", "consumer-review"),
    "IMDb": ("marketing", "consumer-review"), "imdb": ("marketing", "consumer-review"),
    "Reddit": ("social", "forum-post"), "reddit": ("social", "forum-post"),
    "Blog": ("article", "blog"), "blog": ("article", "blog"),
    "Essay": ("academic", "student-essay"), "essay": ("academic", "student-essay"),
    "Review": ("marketing", "consumer-review"),
    "Speech": ("article", "speech"), "Paper": ("academic", "scientific-writing"),
    "Abstract": ("academic", "research-abstract"),
    "Question answering": None, "QA": None, "Dialogue": None, "Chat": None,
}


def maga(ai_cap: int, human_cap: int, report_domains=None):
    ai_rows, human_rows = [], []
    doms = collections.Counter()
    for path, cache in (("val/MGB_val.jsonl", "maga_mgb_val.jsonl"), ("val/MAGA_val.jsonl", "maga_maga_val.jsonl")):
        for r in hfio.jsonl_rows(hfio.fetch_whole("anyangsong/MAGA", path, cache=cache)):
            dom = r.get("domain")
            doms[dom] += 1
            mapped = MAGA_DOMAIN.get(dom)
            if not mapped:
                continue
            register, genre = mapped
            model_field = r.get("model") or "unknown"
            if register == "social" and model_field != "human":
                # MAGA's Reddit generations carry a "Here is the body of the
                # post:" preamble; cycle 2 takes its 2026 social AI from AITA
                # instead. The human Reddit posts are kept - they are the
                # register-matched human side for those.
                continue
            t = clean_text(r.get("text") or "")
            if not acceptable(t, 100, 900):
                continue
            model = r.get("model") or "unknown"
            group = "maga:" + str(r.get("human_source_id") or text_hash(t)[:16])
            if model == "human":
                human_rows.append(dict(
                    side="human", register=register, provider="human", model="human",
                    era="human-labelled-undated", genre=genre, edit_level=None,
                    source="maga-human", licence=LICENCES["maga"], text=t, group=group,
                    note=f"MAGA domain={dom}; human by dataset label, collection date not published",
                ))
            else:
                ai_rows.append(dict(
                    side="ai", register=register, provider=_maga_provider(model), model=model,
                    era="2024-2025-older", genre=genre, edit_level="full-generation",
                    source="maga-ai", licence=LICENCES["maga"], text=t, group=group,
                    note=f"MAGA domain={dom}; older-generation coverage",
                ))
    if report_domains is not None:
        report_domains.update(doms)
    yield from _balanced(ai_rows, ai_cap, lambda r: (r["model"], r["register"]))
    yield from _balanced(human_rows, human_cap, lambda r: (r["register"], r["genre"]))


def _maga_provider(m: str) -> str:
    m = m.lower()
    for k, v in (("gpt", "openai"), ("claude", "anthropic"), ("gemini", "google"), ("llama", "meta"),
                 ("qwen", "alibaba"), ("deepseek", "deepseek"), ("mistral", "mistral"),
                 ("glm", "zhipu"), ("yi", "01ai"), ("baichuan", "baichuan"), ("moonshot", "moonshot")):
        if k in m:
            return v
    return "other"


# ============================================================ C4 (human web copy)

MARKETING = re.compile(
    r"\b(our (team|company|services|clients|customers|products|mission|expertise)|we (offer|provide|specialise|"
    r"specialize|deliver|help|work with|pride ourselves)|contact us|get in touch|free (quote|consultation|trial)|"
    r"book (now|a call)|our clients|why choose us|request a quote|call us today|about us)\b", re.I)
SEO_BLOG = re.compile(
    r"\b(in this (post|article|guide)|this (guide|article|post) (will|explains|covers)|step[- ]by[- ]step|"
    r"top \d+|best \d+|how to |ultimate guide|beginner'?s guide|here'?s (how|why)|tips (for|to)|checklist)\b", re.I)
ACADEMICISH = re.compile(r"\b(we (present|propose|investigate|conclude)|this (paper|study) (presents|examines)|"
                         r"the results (show|suggest)|methodology|literature review)\b", re.I)
NEWSISH = re.compile(r"\b(said (on|in|that)|according to|reuters|associated press|told reporters|"
                     r"the (council|government|department|minister|mayor) (said|announced))\b", re.I)
FORUMISH = re.compile(r"\b(posted by|joined:|quote:|re:|thread|reply #|discussion in ')", re.I)

C4_SHARDS = int(os.environ.get("C4_SHARDS", 10))
C4_BYTES = int(os.environ.get("C4_BYTES", 12_000_000))


def _c4_genre(text: str, url: str) -> tuple[str, str] | None:
    u = (url or "").lower()
    if FORUMISH.search(text[:600]) or "/forum" in u or "/thread" in u or "/showthread" in u:
        return None
    mk = len(MARKETING.findall(text))
    sb = len(SEO_BLOG.findall(text))
    if mk >= 2 or (mk >= 1 and re.search(r"/(services?|solutions?|about|company|products?)(/|$)", u)):
        return ("marketing", "business-marketing-copy")
    if sb >= 2 or re.search(r"/(blog|guide|how-to|tips|resources)(/|$)", u):
        return ("marketing", "seo-blog-post")
    if ACADEMICISH.search(text):
        return ("academic", "scholarly-web")
    if NEWSISH.search(text) or re.search(r"/(news|press|20\d\d/\d\d)/", u):
        return ("article", "journalism")
    return None


def c4(caps: dict[str, int]):
    """caps: {genre: n}. Streams the head of several C4 shards (April 2019
    Common Crawl, so every document predates ChatGPT by construction)."""
    buckets: dict[str, list] = {k: [] for k in caps}
    for shard in range(C4_SHARDS):
        path = f"en/c4-train.{shard:05d}-of-01024.json.gz"
        got = 0
        for r in hfio.gzip_stream_rows("allenai/c4", path, C4_BYTES, cache=f"c4_s{shard}.json.gz"):
            t = clean_text(r.get("text") or "")
            if not acceptable(t, 120, 900):
                continue
            g = _c4_genre(t, r.get("url") or "")
            if not g or g[1] not in buckets:
                continue
            register, genre = g
            buckets[genre].append(dict(
                side="human", register=register, provider="human", model="human",
                era="pre-2022-human", genre=genre, edit_level=None,
                source="c4-en-2019", licence=LICENCES["c4"],
                text=t, group="c4:" + text_hash(t)[:16],
                note=f"crawled {r.get('timestamp')}; {r.get('url')}",
            ))
            got += 1
        print(f"  c4 shard {shard}: +{got} candidates "
              f"({ {k: len(v) for k, v in buckets.items()} })", flush=True)
        if all(len(buckets[k]) >= caps[k] for k in caps):
            break
    for genre, cap in caps.items():
        yield from _balanced(buckets[genre], cap, lambda r: (r["genre"],))


# ============================================================ PERSUADE

def persuade(cap: int):
    import pandas as pd
    b = hfio.fetch_whole("realbenpope/PERSUADE_manageable", "persuade_full_text.csv", cache="persuade.csv")
    df = pd.read_csv(io.BytesIO(b))
    out = []
    for r in df.itertuples(index=False):
        t = clean_text(r.full_text)
        if not acceptable(t, 120, 900):
            continue
        out.append(dict(
            side="human", register="academic", provider="human", model="human",
            era="pre-2022-human", genre="student-essay", edit_level=None,
            source="persuade-2.0", licence=LICENCES["persuade"],
            text=t, group="persuade:" + str(r.essay_id_comp),
            note="US grade 6-12 argumentative essay, collected 2010-2020",
        ))
    yield from _balanced(out, cap, lambda r: ("persuade",))


# ============================================================ owner-generated

GEN_REGISTER = {
    # marketing / SEO
    "seo-service-page": ("marketing", "seo-service-page"),
    "product-description": ("marketing", "product-description"),
    "case-study": ("marketing", "case-study"),
    "company-blog": ("marketing", "company-blog"),
    "faq-page": ("marketing", "faq-page"),
    "landing-page": ("marketing", "landing-page"),
    "category-page": ("marketing", "category-page"),
    "press-release": ("marketing", "press-release"),
    "newsletter": ("marketing", "newsletter"),
    # article
    "thought-leadership": ("article", "thought-leadership"),
    "howto-explainer": ("article", "how-to-guide"),
    "news-piece": ("article", "news"),
    # social
    "social-linkedin": ("social", "linkedin-post"),
    "social-x-thread": ("social", "x-thread"),
    "social-facebook": ("social", "facebook-post"),
    "social-instagram": ("social", "instagram-caption"),
    # academic
    "academic-essay": ("academic", "academic-essay"),
    "academic-lit-review": ("academic", "literature-review"),
    "academic-discussion": ("academic", "discussion-section"),
}

UNMAPPED_GEN_REGISTERS: collections.Counter = collections.Counter()


def openrouter():
    p = os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")
    if not os.path.exists(p):
        print("  openrouter: generated.jsonl ABSENT", flush=True)
        return
    n = 0
    for line in open(p):
        r = json.loads(line)
        t = clean_text(r.get("text") or "")
        if not acceptable(t, 100, 1400):
            continue
        raw_reg = r.get("register") or "unknown"
        mapped = GEN_REGISTER.get(raw_reg)
        if mapped is None:
            # Never silently file an unknown register as an article: that is how
            # social posts ended up labelled as articles on the first pass.
            UNMAPPED_GEN_REGISTERS[raw_reg] += 1
            continue
        reg, genre = mapped
        n += 1
        yield dict(
            side="ai", register=reg, provider=r.get("provider") or "unknown",
            model=r.get("model") or "unknown", era="2026-frontier", genre=genre,
            edit_level="full-generation", source="openrouter-2026-08",
            licence=LICENCES["openrouter"], text=t,
            group="gen:" + text_hash(t)[:16],
            note=f"owner OpenRouter run; prompt_style={r.get('prompt_style')}",
        )
    print(f"  openrouter: {n} rows", flush=True)
    if UNMAPPED_GEN_REGISTERS:
        print(f"  openrouter: SKIPPED unmapped registers {dict(UNMAPPED_GEN_REGISTERS)} "
              f"- add them to GEN_REGISTER", flush=True)


# ============================================================ battery humans

def battery(q):
    """Reads the SNAPSHOT the quarantine index was built from, not the files on
    disk: another workstream is still extending human-corpus-v2.json, and a row
    that appeared after the index was built would be wrongly rejected."""
    by_file: dict[str, list] = {}
    for fn, s in q.battery_rows:
        by_file.setdefault(fn, []).append(s)
    for fn, rows in sorted(by_file.items()):
        n = 0
        for i, s in enumerate(rows):
            t = clean_text(s.get("text") or s.get("body") or "")
            if len(words(t)) < 40:
                continue
            genre = s.get("genre") or s.get("category") or "unspecified"
            reg = {"business-marketing": "marketing", "academic": "academic",
                   "journalism": "article", "blog-editorial": "article",
                   "casual-forum": "social", "technical": "report"}.get(genre, "article")
            n += 1
            yield dict(
                side="human", register=reg, provider="human", model="human",
                era="verified-authorship", genre=genre, edit_level=None,
                source=f"battery-{fn[:-5]}", licence=LICENCES["battery"],
                text=t, group=f"battery:{fn}:{s.get('id', i)}",
                note="shipped regression battery; PINNED to the test split, never train or cal",
                split_pin="test",
            )
        print(f"  battery {fn}: {n} rows (pinned to test)", flush=True)


# ============================================================ helpers

def _balanced(rows: list[dict], cap: int, keyfn):
    """Take up to `cap` rows, spread as evenly as possible across keyfn strata,
    choosing within a stratum by content-hash order (deterministic, not by
    input position)."""
    if cap is None or len(rows) <= cap:
        yield from rows
        return
    buckets: dict[tuple, list] = {}
    for r in rows:
        buckets.setdefault(keyfn(r), []).append(r)
    for b in buckets.values():
        b.sort(key=lambda r: text_hash(r["text"]))
    taken, i = 0, 0
    keys = sorted(buckets, key=str)
    while taken < cap:
        progressed = False
        for k in keys:
            if i < len(buckets[k]):
                yield buckets[k][i]
                taken += 1
                progressed = True
                if taken >= cap:
                    return
        if not progressed:
            return
        i += 1


# ============================================================ provider hygiene

_PROVIDER_ALIASES = {
    "z-ai": "zhipu", "zai": "zhipu", "glm": "zhipu",
    "x-ai": "xai", "grok": "xai",
    "qwen": "alibaba", "qwen3": "alibaba",
    "moonshotai": "moonshot",
    "meta-llama": "meta",
    "mistralai": "mistral",
    "google-deepmind": "google", "gemini": "google",
}


def normalise_provider(p: str) -> str:
    p = (p or "unknown").strip().lower()
    return _PROVIDER_ALIASES.get(p, p)

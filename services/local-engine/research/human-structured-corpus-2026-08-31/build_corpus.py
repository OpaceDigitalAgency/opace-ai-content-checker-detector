"""Merge per-source raw jsonl into corpus.jsonl + manifest.json.

Schema per doc: id, text (markdown), source, url, licence, legal_bucket
(GREEN = CC0/OGL/CC BY; AMBER = CC BY-SA, banked separately pending legal
view), published_date, register, human_confidence (H1 = provenance human:
named author + pre-2022 git commit or editorial publication; H2 = high
confidence: pre-2022 capture/date from an editorial or platform source;
H3 = historical likely-human: generic pre-2022 web -- never "proven"),
fetched_at, title, brief (extracted generation brief: topic, type, length,
structure outline, tone, audience -- so matched AI generation can start the
moment it is authorised, without the model ever seeing the human text).

Dedupes by id, drops docs under 120 words, records per-source/register/
bucket/confidence counts and SHA-256 of corpus.jsonl.

Usage: python3 build_corpus.py
"""
import hashlib
import json
import os
import re
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")

# legacy fetcher outputs -> (bucket, confidence-mapper)
LEGACY = {
    "govuk.jsonl": ("GREEN", lambda d: "H2" if d.get("human_confidence") == "high" else "H3"),
    "stackexchange.jsonl": ("AMBER", lambda d: "H2" if d.get("human_confidence") == "high" else "H3"),
    "wikinews.jsonl": ("GREEN", lambda d: "H2"),
    "globalvoices.jsonl": ("GREEN", lambda d: "H1"),  # named authors + editorial + dated URL
}

TONE = {
    "howto-guide": "plain, instructional, second person",
    "faq": "plain, factual, second person",
    "faq-qa": "conversational, practical, first/second person",
    "business-news": "formal announcement, third person",
    "business-blog": "professional but personable blog voice",
    "business-guide": "direct, plain-English internal guidance",
    "journalism": "neutral reported news voice",
    "seo-marketing-blog": "professional developer-marketing blog voice",
    "developer-docs": "technical, instructional, second person",
}
AUDIENCE = {
    "howto-guide": "general public / small business owners",
    "faq": "general public",
    "faq-qa": "hobbyists and consumers seeking practical answers",
    "business-news": "press and general public",
    "business-blog": "civil servants and digital professionals",
    "business-guide": "professional colleagues",
    "journalism": "general news readers",
    "seo-marketing-blog": "webmasters, SEOs and site owners",
    "developer-docs": "software developers and web learners",
}


def outline(text):
    """Structure outline: per-section heading + block composition."""
    secs = []
    cur = None
    n_paras = n_bullets = 0
    blocks = [b for b in re.split(r"\n\s*\n", text) if b.strip()]
    for b in blocks:
        first = b.strip().split("\n")[0]
        if re.match(r"^#{1,6}\s+", first):
            if cur is not None:
                secs.append(cur)
            cur = {"heading": re.sub(r"^#+\s+", "", first)[:80], "paras": 0, "bullets": 0}
        else:
            is_bullet = bool(re.match(r"^\s*([-*+]|\d+[.)])\s+", b.strip()))
            if cur is None:
                cur = {"heading": None, "paras": 0, "bullets": 0}
            cur["bullets" if is_bullet else "paras"] += 1
    if cur is not None:
        secs.append(cur)
    return secs[:40]


def brief(d):
    words = len(d["text"].split())
    return {
        "topic": d.get("title") or d["text"].split("\n")[0].lstrip("# ")[:120],
        "type": d["register"],
        "length_words": words,
        "structure_outline": outline(d["text"]),
        "tone": TONE.get(d["register"], "neutral professional"),
        "audience": AUDIENCE.get(d["register"], "general readers"),
    }


def main():
    rows, seen = [], set()
    files = sorted(os.listdir(RAW))
    for fn in files:
        if not fn.endswith(".jsonl"):
            continue
        p = os.path.join(RAW, fn)
        n = 0
        with open(p) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                d = json.loads(line)
                if d["id"] in seen or len(d["text"].split()) < 120:
                    continue
                if fn in LEGACY:
                    bucket, conf = LEGACY[fn]
                    d["legal_bucket"] = bucket
                    d["human_confidence"] = conf(d)
                d.setdefault("legal_bucket", "GREEN")
                if d["human_confidence"] not in ("H1", "H2", "H3"):
                    d["human_confidence"] = "H3"
                d["brief"] = brief(d)
                seen.add(d["id"])
                rows.append(d)
                n += 1
        print(f"{fn}: {n}")

    out = os.path.join(HERE, "corpus.jsonl")
    with open(out, "w") as f:
        for d in rows:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    sha = hashlib.sha256(open(out, "rb").read()).hexdigest()
    wc = [len(d["text"].split()) for d in rows]
    manifest = {
        "built_at": time.strftime("%Y-%m-%d %H:%M"),
        "docs": len(rows),
        "corpus_sha256": sha,
        "total_words": sum(wc),
        "median_words": sorted(wc)[len(wc) // 2] if wc else 0,
        "by_source": dict(Counter(d["source"] for d in rows)),
        "by_register": dict(Counter(d["register"] for d in rows)),
        "by_licence": dict(Counter(d["licence"].split(" (")[0] for d in rows)),
        "by_legal_bucket": dict(Counter(d["legal_bucket"] for d in rows)),
        "by_human_confidence": dict(Counter(d["human_confidence"] for d in rows)),
        "bucket_x_confidence": dict(Counter(
            f"{d['legal_bucket']}/{d['human_confidence']}" for d in rows)),
        "pre_2022_published": sum(1 for d in rows
                                  if (d.get("published_date") or "9999") < "2022"),
        "structure": {
            "docs_with_md_headings": sum(1 for d in rows
                                         if re.search(r"(?m)^#{1,6}\s", d["text"])),
            "docs_with_bullets": sum(1 for d in rows
                                     if re.search(r"(?m)^\s*(-|\d+\.)\s+", d["text"])),
        },
        "raw_files_sha256": {
            fn: hashlib.sha256(open(os.path.join(RAW, fn), "rb").read()).hexdigest()
            for fn in files if fn.endswith(".jsonl")},
        "sources_rejected": {
            "wikihow": "robots.txt blocks anthropic-ai UA and ToS prohibit AI/ML "
                       "use; not fetched despite CC BY-NC-SA licence",
            "mongabay": "no on-page CC licence statement on article pages; "
                        "licence not verifiable at source, skipped (RED)",
            "business.govt.nz": "CC BY-NC per owner directive (RED, non-commercial)",
            "wayback-business-blogs": "per-blog licences unverifiable at scale (RED)",
            "project-gutenberg": "wrong register",
            "wikipedia": "wrong register (encyclopaedia)",
        },
        "notes": [
            "AMBER bucket (CC BY-SA: Stack Exchange, GitLab handbook, MDN) is "
            "banked separately from GREEN; redistribution obligations pending "
            "legal view -- measurement use only for now.",
            "H3 docs are historical likely-human, never proven: GPT-3 and "
            "commercial copy tools existed from 2020.",
            "brief field per doc drives the authorised-but-not-yet-run matched "
            "AI generation; the model must only ever see the brief, not text.",
            "raw HTML captures stored in raw/html/ for Common Crawl sources; "
            "git sources ARE native markdown at the pinned commit; live-API "
            "sources (govuk/stackexchange/wikinews/globalvoices) store no "
            "separate raw copy -- their fetch scripts + URLs are the provenance.",
        ],
    }
    with open(os.path.join(HERE, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps({k: manifest[k] for k in
                      ("docs", "by_source", "by_register", "by_legal_bucket",
                       "by_human_confidence", "structure")}, indent=1))


if __name__ == "__main__":
    main()

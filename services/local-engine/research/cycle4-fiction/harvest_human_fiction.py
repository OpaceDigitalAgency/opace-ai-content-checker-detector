"""Harvest NEW human fiction from the Internet Archive Creative-Commons pool.

Why new material is unavoidable. The 260 long-form `story` documents and the
400 short-form fiction passages are the corpus the fiction false-positive bar is
measured on, so training on either contaminates the bar. The raw pool they were
cut from (`longform-corpus/raw/ia-fiction.jsonl`, 281 passages from 95 items)
is fully consumed by them. There is no spare human fiction anywhere in the
programme.

That matters more than it sounds. Adding AI fiction with no matched human
fiction in TRAINING teaches the model "fiction is AI" and drives fiction false
positives the wrong way. Both sides are needed.

This reuses `longform-corpus/fetch_fiction.py`'s query, filters and per-uploader
cap, and excludes every archive.org identifier already used by the measurement
corpus. Free: archive.org, no API cost.

  python3 harvest_human_fiction.py --want 900
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
LF = os.path.join(RESEARCH, "longform-corpus")
sys.path.insert(0, LF)
import common  # noqa: E402
from fetch_fiction import ENGLISH, JUNK, SEARCH, QUERY, is_english  # noqa: E402

OUT = os.path.join(HERE, "human-fiction-new.jsonl")
MEASURED = os.path.join(LF, "human-longform.jsonl")

# Widen beyond the original query's first pages: same subjects, but paged
# further and with the year window opened a little, because the first 1,200
# results are already spoken for.
QUERY2 = ('mediatype:texts AND licenseurl:(*creativecommons*) AND year:[2008 TO 2022] '
          'AND (subject:(fiction) OR subject:(novel) OR subject:("short stories") '
          'OR subject:(literature) OR subject:(storytelling) OR subject:(memoir) '
          'OR subject:("creative writing") OR subject:(poetry) OR subject:(drama) '
          'OR subject:("science fiction") OR subject:(fantasy) OR subject:(romance) '
          'OR subject:(thriller) OR subject:("young adult"))')


def used_identifiers() -> set[str]:
    used = set()
    for line in open(MEASURED, encoding="utf-8", errors="replace"):
        d = json.loads(line)
        ref = d.get("source_ref") or ""
        if "/details/" in ref:
            used.add(ref.rsplit("/details/", 1)[1])
    return used


def search(rows: int, query: str) -> list[dict]:
    out, page = [], 1
    while len(out) < rows and page <= 40:
        u = SEARCH + "?" + urllib.parse.urlencode({
            "q": query, "rows": 100, "page": page, "output": "json",
        }) + "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&fl%5B%5D=licenseurl" \
             "&fl%5B%5D=creator&fl%5B%5D=subject"
        try:
            d = common.get_json(u, timeout=120)
        except Exception as exc:  # noqa: BLE001
            print(f"  search page {page} failed: {exc}", file=sys.stderr)
            break
        docs = d.get("response", {}).get("docs", [])
        if not docs:
            break
        out += docs
        page += 1
    return out[:rows]


def one(doc: dict) -> list[dict]:
    ident = doc["identifier"]
    try:
        meta = common.get_json(f"https://archive.org/metadata/{ident}", timeout=90)
    except Exception:  # noqa: BLE001
        return []
    txts = [f["name"] for f in meta.get("files", [])
            if f["name"].endswith("_djvu.txt") or f["name"].lower().endswith(".txt")]
    if not txts:
        return []
    try:
        blob = common.get(f"https://archive.org/download/{ident}/"
                          + urllib.parse.quote(txts[0]), timeout=180)
        try:
            raw = blob.decode("utf-8")
        except UnicodeDecodeError:
            raw = blob.decode("cp1252", "replace")
    except Exception:  # noqa: BLE001
        return []
    text = common.tidy(raw)
    if not is_english(text) or JUNK.search(text[:3000]):
        return []
    lic = str(doc.get("licenseurl") or "")
    year = doc.get("year")
    creator = str(doc.get("creator") or "unknown")[:80]
    subj = " ".join(doc.get("subject") or []) if isinstance(doc.get("subject"), list) \
        else str(doc.get("subject") or "")
    ws = text.split()
    start = min(len(ws) // 6, 1500)
    rows = []
    for i in range(start, len(ws), 1200):
        chunk = " ".join(ws[i:i + 1200])
        if common.words(chunk) < 600:
            break
        chunk = chunk[:chunk.rfind(".") + 1] or chunk
        ok, _ = common.looks_like_prose(chunk, 600)
        if not ok:
            continue
        bad = sum(chunk.count(c) for c in ("�", "ï¿½"))
        if bad > 0.001 * len(chunk):
            continue
        rows.append({
            "side": "human",
            "register": "story",
            "genre": "story",
            "text": chunk,
            "word_count": common.words(chunk),
            "licence": lic or "creative-commons (unspecified variant)",
            "source": "internet-archive-cc-texts-new",
            "source_ref": f"https://archive.org/details/{ident}",
            "identifier": ident,
            "era_year": int(year) if str(year).isdigit() else None,
            "discipline": subj[:80],
            "publisher": creator,
            "section_title": str(doc.get("title") or "")[:120],
        })
        if len(rows) >= 4:
            break
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--want", type=int, default=900)
    ap.add_argument("--per-uploader", type=int, default=3)
    a = ap.parse_args()

    used = used_identifiers()
    print(f"{len(used)} archive.org identifiers already used by the measurement corpus",
          flush=True)
    docs = search(3500, QUERY2)
    print(f"{len(docs)} candidate items", flush=True)
    seen, picked = set(), []
    per_creator = collections.Counter()
    for d in docs:
        ident = d["identifier"]
        if ident in used or ident in seen:
            continue
        seen.add(ident)
        c = str(d.get("creator") or "unknown")[:80]
        if per_creator[c] >= a.per_uploader:
            continue
        per_creator[c] += 1
        picked.append(d)
    print(f"{len(picked)} after excluding measured items and the per-uploader cap",
          flush=True)

    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=8) as ex:
        for i, rows in enumerate(ex.map(one, picked), 1):
            for r in rows:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 50 == 0:
                print(f"  {i}/{len(picked)} -> {n} passages", flush=True)
            if n >= a.want:
                break
    print(f"DONE {n} passages -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

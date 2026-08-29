"""Internet Archive Creative-Commons texts -> story / creative long-form.

This is the thinnest category in the corpus and the honest reason is in
MANIFEST.md: modern short fiction under an open licence barely exists at
scale. Strange Horizons ("all material ... copyrighted to the original
authors and may not be reproduced without permission") and the commercial
genre magazines are all rights-reserved, so the only open pool left is the
Internet Archive's Creative-Commons text collection, which is uneven.

Filters applied, because that pool is uneven: an English-word test, the shared
prose test, at most three passages per item and at most four items per
uploader so one prolific self-publisher cannot become the register.
"""

from __future__ import annotations

import collections
import json
import os
import re
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import common

SEARCH = "https://archive.org/advancedsearch.php"
OUT = os.path.join(common.RAW, "ia-fiction.jsonl")

QUERY = ('mediatype:texts AND licenseurl:(*creativecommons*) AND year:[2010 TO 2022] '
         'AND (subject:(fiction) OR subject:(novel) OR subject:("short stories") '
         'OR subject:(literature) OR subject:(storytelling) OR subject:(memoir) '
         'OR subject:("creative writing") OR subject:(essays))')

# crude English test: these must all appear at a plausible rate
ENGLISH = re.compile(r"(?i)\b(the|and|of|to|that|with|was|were|had|which)\b")
JUNK = re.compile(r"(?i)(invoice|medical record|purchase order|spreadsheet|"
                  r"table of contents only|scanned by|this page intentionally)")


def search(rows: int) -> list[dict]:
    out, page = [], 1
    while len(out) < rows and page <= 20:
        u = SEARCH + "?" + urllib.parse.urlencode({
            "q": QUERY, "rows": 100, "page": page, "output": "json",
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


def is_english(text: str) -> bool:
    sample = text[:4000]
    hits = len(ENGLISH.findall(sample))
    return hits >= 30


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
    register = "story"
    ws = text.split()
    # skip the front matter, then take passages from the middle of the work
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
        # OCR mojibake and replacement characters: a scanned page that came
        # through badly is not usable prose, whatever its word count says
        bad = sum(chunk.count(c) for c in ("\ufffd", "\u00ef\u00bf\u00bd"))
        if bad > 0.001 * len(chunk):
            continue
        rows.append({
            "side": "human",
            "register": register,
            "genre": register,
            "text": chunk,
            "word_count": common.words(chunk),
            "licence": lic or "creative-commons (unspecified variant)",
            "source": "internet-archive-cc-texts",
            "source_ref": f"https://archive.org/details/{ident}",
            "era_year": int(year) if str(year).isdigit() else None,
            "discipline": subj[:80],
            "publisher": creator,
            "section_title": str(doc.get("title") or "")[:120],
        })
        if len(rows) >= 3:
            break
    return rows


def main():
    want = int(sys.argv[1]) if len(sys.argv) > 1 else 250
    docs = search(1200)
    print(f"{len(docs)} candidate items", flush=True)
    per_creator = collections.Counter()
    picked = []
    for d in docs:
        c = str(d.get("creator") or "unknown")[:80]
        if per_creator[c] >= 4:
            continue
        per_creator[c] += 1
        picked.append(d)
    print(f"{len(picked)} after per-uploader cap of 4", flush=True)
    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=6) as ex:
        for i, rows in enumerate(ex.map(one, picked), 1):
            for r in rows:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 50 == 0:
                print(f"  {i}/{len(picked)} -> {n} passages", flush=True)
            if n >= want:
                break
    print(f"DONE {n} passages -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

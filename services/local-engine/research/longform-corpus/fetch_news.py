"""Global Voices -> long-form journalism (human side).

Global Voices publishes under CC BY 3.0 with no AI-use carve-out, which is why
it is here and The Conversation is not: The Conversation's own republishing
guidelines state that its Creative Commons licence prohibits using its content
as training data for AI systems, so it is excluded from this corpus.

Fetched month by month through the WordPress REST API so pagination stays
inside the API's page limit.
"""

from __future__ import annotations

import calendar
import json
import os
import re
import sys

import common

API = "https://globalvoices.org/wp-json/wp/v2/posts"
OUT = os.path.join(common.RAW, "globalvoices.jsonl")

TAIL = re.compile(
    r"(?is)(written by [^\n]{0,80}\n.*$|translated by [^\n]{0,80}\n.*$|"
    r"this post is part of[^\n]*$|subscribe to[^\n]*$)")


def month_posts(year: int, month: int, per_page: int = 100) -> list[dict]:
    last = calendar.monthrange(year, month)[1]
    out = []
    for page in range(1, 4):
        url = common.qs(API, {
            "per_page": per_page, "page": page,
            "after": f"{year}-{month:02d}-01T00:00:00",
            "before": f"{year}-{month:02d}-{last}T23:59:59",
            "orderby": "date", "order": "desc",
            "_fields": "id,date,link,title,content,categories",
        })
        try:
            rows = common.get_json(url, timeout=120)
        except Exception:  # noqa: BLE001
            break
        if not rows:
            break
        out += rows
        if len(rows) < per_page:
            break
    return out


def to_row(r: dict) -> dict | None:
    html = (r.get("content") or {}).get("rendered") or ""
    text = common.strip_html(html)
    text = TAIL.sub("", text).strip()
    ok, _ = common.looks_like_prose(text, 500)
    if not ok:
        return None
    title = common.strip_html((r.get("title") or {}).get("rendered") or "")
    year = int(r["date"][:4])
    return {
        "side": "human",
        "register": "longform-journalism",
        "genre": "longform-journalism",
        "text": (title + "\n\n" + text) if title else text,
        "word_count": common.words(text),
        "licence": "CC BY 3.0",
        "source": "globalvoices",
        "source_ref": r.get("link", ""),
        "era_year": year,
        "discipline": "international-reporting",
        "publisher": "Global Voices",
        "section_title": title[:120],
    }


def main():
    want = int(sys.argv[1]) if len(sys.argv) > 1 else 600
    years = list(range(2021, 2012, -1))
    per_year = max(1, want // len(years))
    n = 0
    seen = set()
    with open(OUT, "w") as f:
        for year in years:
            got = 0
            for month in range(12, 0, -1):
                if got >= per_year:
                    break
                for r in month_posts(year, month):
                    if r["id"] in seen or got >= per_year:
                        continue
                    seen.add(r["id"])
                    row = to_row(r)
                    if row:
                        f.write(json.dumps(row) + "\n")
                        n += 1
                        got += 1
            print(f"  {year}: {got} articles (total {n})", flush=True)
    print(f"DONE {n} -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

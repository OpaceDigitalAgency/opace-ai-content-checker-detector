"""English Wikinews fetcher -- CC BY 2.5 (site-wide licence,
https://en.wikinews.org/wiki/Wikinews:Copyright). Verified 2026-08-31.
MediaWiki API used (API access is the supported bulk route; low rate kept).

Register: journalism (news articles; bulleted "Sources"/"Related" lists are
genuine human list structure). Dating: articles fetched from pre-2022 date
categories (Category:<Month> <D>, <YYYY>), so human_confidence high; the
wiki is human-edited but pre-2022 revisions are requested explicitly via
the date category membership and page creation.

Usage: python3 fetch_wikinews.py [target]
"""
import calendar
import os
import sys
import time
import urllib.parse

from fetch_lib import (get_json, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)

OUT = os.path.join(RAW, "wikinews.jsonl")
API = "https://en.wikinews.org/w/api.php"
DELAY = 0.6
MONTHS = [(2021, m) for m in (1, 3, 5, 7, 9, 11)] + \
         [(2020, m) for m in (2, 4, 6, 8, 10)] + \
         [(2019, m) for m in (1, 5, 9)]


def month_members(year, month, limit=60):
    """Article titles from the per-day categories (Category:March 15, 2021)."""
    titles = []
    for day in range(1, 29):
        if len(titles) >= limit:
            break
        cat = f"Category:{calendar.month_name[month]} {day}, {year}"
        url = (f"{API}?action=query&list=categorymembers&cmtitle="
               f"{urllib.parse.quote(cat)}&cmnamespace=0&cmlimit=50&format=json")
        j = get_json(url, delay=DELAY)
        if not j:
            continue
        titles.extend(m["title"] for m in j.get("query", {}).get("categorymembers", []))
    return titles[:limit]


import re as _re
from bs4 import BeautifulSoup as _BS

_WN_DROP = _re.compile(r"(infobox|related|sister|navbox|metadata|toc|catlinks|"
                       r"printfooter|collapsible|haudio|thumb|hidden|refresh|"
                       r"ambox|mainpage)", _re.I)


def fetch_article(title):
    url = (f"{API}?action=parse&page={urllib.parse.quote(title)}"
           f"&prop=text&format=json&disableeditsection=1")
    j = get_json(url, delay=DELAY)
    if not j or "parse" not in j:
        return None
    html = j["parse"]["text"]["*"]
    soup = _BS(html, "html.parser")
    for t in soup.find_all(["table", "div", "span", "ul"], class_=_WN_DROP):
        t.decompose()
    for t in soup.find_all(["table", "div"], id=_WN_DROP):
        t.decompose()
    return str(soup)


def main():
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 240
    done = load_done(OUT)
    kept = len(done)
    for year, month in MONTHS:
        if kept >= target:
            break
        titles = month_members(year, month)
        print(f"[wikinews:{year}-{month:02d}] {len(titles)} members (kept {kept})")
        for t in titles:
            if kept >= target:
                break
            page_url = "https://en.wikinews.org/wiki/" + urllib.parse.quote(t.replace(" ", "_"))
            if page_url in done:
                continue
            html = fetch_article(t)
            if not html:
                continue
            md = html_to_markdown(html)
            # drop the trailing category/nav junk lines
            if not quality_ok(md, min_words=180):
                continue
            text = f"# {t}\n\n{md}"
            append_jsonl(OUT, {
                "id": doc_id("wikinews", page_url),
                "text": text,
                "source": "wikinews",
                "url": page_url,
                "licence": "CC BY 2.5 (Wikinews site licence)",
                "published_date": f"{year}-{month:02d}",
                "register": "journalism",
                "human_confidence": "high",
                "fetched_at": time.strftime("%Y-%m-%d"),
                "title": t,
            })
            done.add(page_url)
            kept += 1
    print(f"[wikinews] kept {kept}")


if __name__ == "__main__":
    main()

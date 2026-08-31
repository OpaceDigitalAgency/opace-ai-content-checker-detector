"""Global Voices fetcher -- CC BY 3.0 (site-wide: "This site is licensed as
Creative Commons Attribution 3.0" per https://globalvoices.org/about;
verified on-page 2026-08-31 in fetch run). robots.txt: Crawl-delay 10 --
honoured (10s between page hits), which caps volume by design.

Register: journalism (citizen-media long-form news).
Dating: URL carries /YYYY/MM/DD/ -- all fetched from pre-2022 monthly
archives, so human_confidence high.

Usage: python3 fetch_globalvoices.py [target]
"""
import os
import re
import sys
import time

from fetch_lib import (get, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)

OUT = os.path.join(RAW, "globalvoices.jsonl")
DELAY = 10.0  # robots.txt Crawl-delay
MONTHS = ["2021/03", "2021/06", "2021/09", "2020/03", "2020/09", "2019/06",
          "2021/01", "2020/06"]


def archive_links(month):
    links = []
    for page in ("", "page/2/"):
        b = get(f"https://globalvoices.org/{month}/{page}", delay=DELAY)
        if not b:
            continue
        html = b.decode("utf-8", "replace")
        links.extend(re.findall(
            r'https://globalvoices\.org/%s/\d\d/[a-z0-9-]+/' % month, html))
    seen, out = set(), []
    for l in links:
        if l not in seen:
            seen.add(l)
            out.append(l)
    return out


def main():
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 110
    done = load_done(OUT)
    kept = len(done)
    licence_verified = False
    for month in MONTHS:
        if kept >= target:
            break
        links = archive_links(month)
        print(f"[globalvoices:{month}] {len(links)} links (kept so far {kept})")
        for url in links:
            if kept >= target:
                break
            if url in done:
                continue
            b = get(url, delay=DELAY)
            if not b:
                continue
            html = b.decode("utf-8", "replace")
            if not licence_verified:
                if re.search(r"creativecommons\.org/licenses/by/3\.0|Creative Commons Attribution", html, re.I):
                    licence_verified = True
                    print("  licence statement verified on page")
                else:
                    print("  WARNING: no CC statement found on first page")
            m = re.search(r"<title>([^<]+)</title>", html)
            title = ""
            if m:
                import html as _h
                title = _h.unescape(m.group(1))
                title = re.sub(r"\s*(?:[-·–]|&middot;)\s*Global Voices.*$", "",
                               title).strip()
            md = html_to_markdown(html, root_selector=".entry, #post, article")
            if not md:
                md = html_to_markdown(html, root_selector=None)
            if not quality_ok(md, min_words=250):
                continue
            date = "-".join(url.split("/")[3:6])
            text = (f"# {title}\n\n{md}") if title else md
            append_jsonl(OUT, {
                "id": doc_id("globalvoices", url),
                "text": text,
                "source": "globalvoices",
                "url": url,
                "licence": "CC BY 3.0 (Global Voices site licence)",
                "published_date": date,
                "register": "journalism",
                "human_confidence": "high",
                "fetched_at": time.strftime("%Y-%m-%d"),
                "title": title,
            })
            done.add(url)
            kept += 1
    print(f"[globalvoices] kept {kept}")


if __name__ == "__main__":
    main()

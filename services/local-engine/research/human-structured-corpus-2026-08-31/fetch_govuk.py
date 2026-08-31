"""GOV.UK fetcher -- Open Government Licence v3.0 (Crown copyright).

Licence basis: https://www.gov.uk/help/reuse-govuk-content -- "content
available on GOV.UK is subject to Crown copyright ... licensed under the
Open Government Licence v3.0" unless otherwise stated. Verified 2026-08-31.
robots.txt allows article and /api/content paths.

Document types and register labels:
  guide, detailed_guide -> howto-guide  (heavily structured, bullets)
  answer               -> faq          (short structured Q-style pages)
  press_release, news_story -> business-news (comms/business copy)

Dating: content API gives first_published_at and public_updated_at.
  pre-2022 first published AND last updated pre-2022  -> human_confidence high
  pre-2022 first published, updated 2022+             -> medium (may contain
                                                         post-2022 edits)
  first published 2022+                               -> skipped

Usage: python3 fetch_govuk.py [target_per_register]
Resumable (skips URLs already in raw/govuk.jsonl).
"""
import re
import sys
import time

from fetch_lib import (get_json, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)
import os

OUT = os.path.join(RAW, "govuk.jsonl")
API = "https://www.gov.uk/api"
DELAY = 0.4

PLAN = [
    # (search document_type, register, target)
    ("guide", "howto-guide", 260),
    ("detailed_guide", "howto-guide", 300),
    ("answer", "faq", 260),
    ("press_release", "business-news", 150),
    ("news_story", "business-news", 150),
]


def search_links(doc_type, n_pages=8, page_size=300):
    links = []
    for p in range(n_pages):
        j = get_json(f"{API}/search.json?filter_content_store_document_type="
                     f"{doc_type}&count={page_size}&start={p * page_size}"
                     f"&order=-popularity", delay=DELAY)
        if not j or not j.get("results"):
            break
        links.extend(r["link"] for r in j["results"] if r.get("link", "").startswith("/"))
        if len(j["results"]) < page_size:
            break
    return links


def body_from_content(j):
    """Extract HTML body/bodies from a content-API response."""
    d = j.get("details", {})
    parts = d.get("parts")
    chunks = []
    if parts:
        for p in parts:
            t = p.get("title", "").strip()
            b = p.get("body", "")
            if isinstance(b, list):  # multiple content types
                b = next((x["content"] for x in b if x.get("content_type") == "text/html"), "")
            if b:
                chunks.append((t, b))
    else:
        b = d.get("body", "")
        if isinstance(b, list):
            b = next((x["content"] for x in b if x.get("content_type") == "text/html"), "")
        if b:
            chunks.append((None, b))
    return chunks


def main():
    scale = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    done = load_done(OUT)
    kept_total = 0
    for doc_type, register, target in PLAN:
        target = int(target * scale)
        kept = 0
        links = search_links(doc_type)
        print(f"[govuk:{doc_type}] {len(links)} candidate links, target {target}")
        for link in links:
            if kept >= target:
                break
            url = "https://www.gov.uk" + link
            if url in done:
                kept += 1  # already counted in a previous run
                continue
            j = get_json(f"{API}/content{link}", delay=DELAY)
            if not j:
                continue
            fp = (j.get("first_published_at") or "")[:10]
            up = (j.get("public_updated_at") or "")[:10]
            if not fp or fp >= "2022-01-01":
                continue
            conf = "high" if (up and up < "2022-01-01") else "medium"
            chunks = body_from_content(j)
            if not chunks:
                continue
            md_parts = []
            title = j.get("title", "").strip()
            if title:
                md_parts.append("# " + title)
            desc = (j.get("description") or "").strip()
            if desc:
                md_parts.append(desc)
            for part_title, html in chunks:
                if part_title:
                    md_parts.append("## " + part_title)
                md = html_to_markdown(html, base_heading=2 if not part_title else 3)
                if md:
                    md_parts.append(md)
            text = "\n\n".join(md_parts)
            if not quality_ok(text):
                continue
            append_jsonl(OUT, {
                "id": doc_id("govuk", url),
                "text": text,
                "source": "govuk",
                "url": url,
                "licence": "OGL-3.0 (Open Government Licence v3.0, Crown copyright)",
                "published_date": fp,
                "last_updated": up or None,
                "register": register,
                "human_confidence": conf,
                "fetched_at": time.strftime("%Y-%m-%d"),
                "title": title,
            })
            done.add(url)
            kept += 1
        print(f"[govuk:{doc_type}] kept {kept}")
        kept_total += kept
    print(f"[govuk] total kept this run-plan: {kept_total}")


if __name__ == "__main__":
    main()

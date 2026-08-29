"""GOV.UK research reports, policy papers and impact assessments -> white-paper
and research-summary long-form.

Route: search API -> content API -> the publication's HTML attachment
(`html_publication` schema), which carries the full report body as HTML.
PDF-only publications are skipped rather than OCR-guessed.

Licence: Open Government Licence v3.0 unless a document says otherwise; the
few that assert third-party copyright are dropped by the exclusion below.
"""

from __future__ import annotations

import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import common

SEARCH = "https://www.gov.uk/api/search.json"
CONTENT = "https://www.gov.uk/api/content"
OUT = os.path.join(common.RAW, "govuk.jsonl")

# document type -> register
DOC_TYPES = {
    "research": "research-summary",
    "independent_report": "white-paper",
    "policy_paper": "white-paper",
    "corporate_report": "company-update",
    "impact_assessment": "white-paper",
    "consultation_outcome": "white-paper",
    "statistics": "research-summary",
    "national_statistics": "research-summary",
}

NOT_OGL = re.compile(r"(?i)(third[- ]party copyright|not covered by the open government|"
                     r"©\s*(?!crown)[A-Z])")

HEAD = re.compile(r"(?i)<h2[^>]*>(.*?)</h2>")


def listing(doc_type: str, want: int) -> list[dict]:
    out, start = [], 0
    while len(out) < want and start < 1000:
        d = common.get_json(common.qs(SEARCH, {
            "filter_content_store_document_type": doc_type,
            "filter_public_timestamp": "from:2018-01-01,to:2022-12-31",
            "fields": "title,link,public_timestamp,organisations",
            "count": 100, "start": start, "order": "-public_timestamp",
        }))
        res = d.get("results", [])
        if not res:
            break
        out += res
        start += 100
    return out[:want]


def chunks_from_html(body: str) -> list[tuple[str, str]]:
    """Split an HTML report body at h2 boundaries into (heading, prose) chunks."""
    parts = re.split(r"(?i)(<h2[^>]*>.*?</h2>)", body)
    out, head = [], ""
    buf = []
    for p in parts:
        if re.match(r"(?i)^<h2", p):
            if buf:
                out.append((head, "".join(buf)))
            head = common.strip_html(p)
            buf = []
        else:
            buf.append(p)
    if buf:
        out.append((head, "".join(buf)))
    return out


SKIP_HEAD = re.compile(r"(?i)^(contents|annex|appendix|references|bibliography|glossary|"
                       r"list of (tables|figures)|about (this|the)|acknowledgements|"
                       r"notes|abbreviations|tables?|figures?)\b")


def one(item: tuple[str, str]) -> list[dict]:
    link, register = item
    try:
        c = common.get_json(CONTENT + link, timeout=90)
    except Exception:  # noqa: BLE001
        return []
    det = c.get("details", {}) or {}
    orgs = [o.get("title", "") for o in
            ((c.get("links", {}) or {}).get("organisations") or [])]
    date = (c.get("first_published_at") or c.get("public_updated_at") or "")[:10]
    year = int(date[:4]) if date[:4].isdigit() else None
    bodies: list[str] = []
    for a in (det.get("attachments") or []):
        if a.get("attachment_type") != "html":
            continue
        path = (a.get("url") or "").replace("https://www.gov.uk", "")
        if not path.startswith("/"):
            continue
        try:
            h = common.get_json(CONTENT + path, timeout=90)
        except Exception:  # noqa: BLE001
            continue
        b = (h.get("details", {}) or {}).get("body")
        if isinstance(b, str) and b.strip():
            bodies.append(b)
    if not bodies:
        b = det.get("body")
        if isinstance(b, str):
            bodies.append(b)
    rows = []
    for body in bodies:
        if NOT_OGL.search(common.strip_html(body)[:4000]):
            continue
        for head, chunk_html in chunks_from_html(body):
            if head and SKIP_HEAD.match(head.strip()):
                continue
            text = common.strip_html(chunk_html)
            if head:
                text = head + "\n\n" + text
            if common.words(text) > 2500:
                # keep reports readable: take the first 2,200 words on a
                # sentence boundary rather than a mid-word truncation
                ws = text.split()
                text = " ".join(ws[:2200])
                text = text[:text.rfind(".") + 1] or text
            ok, _ = common.looks_like_prose(text, 400)
            if not ok:
                continue
            rows.append({
                "side": "human",
                "register": register,
                "genre": register,
                "text": text,
                "word_count": common.words(text),
                "licence": "OGL v3.0 (Crown copyright)",
                "source": "gov.uk",
                "source_ref": "https://www.gov.uk" + link,
                "era_year": year,
                "discipline": "uk-government",
                "publisher": "; ".join(orgs)[:160],
                "section_title": head[:120],
            })
    return rows


def main():
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 90
    items = []
    for dt, register in DOC_TYPES.items():
        got = listing(dt, per)
        print(f"  {dt}: {len(got)} publications", flush=True)
        items += [(r["link"], register) for r in got]
    seen, uniq = set(), []
    for link, reg in items:
        if link in seen:
            continue
        seen.add(link)
        uniq.append((link, reg))
    print(f"{len(uniq)} unique publications", flush=True)
    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=6) as ex:
        for i, rows in enumerate(ex.map(one, uniq), 1):
            for r in rows:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 100 == 0:
                print(f"  {i}/{len(uniq)} -> {n} chunks", flush=True)
    print(f"DONE {n} chunks -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

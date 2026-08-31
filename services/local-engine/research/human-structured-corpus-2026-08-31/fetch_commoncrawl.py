"""Common Crawl fetcher (CC-MAIN-2021-49, Nov/Dec 2021) -- pre-AI-era frozen
captures of licence-whitelisted domains, fetched by WARC offset (no bulk
download).

Configured sources:
  google-search-central  developers.google.com/search/blog/YYYY/MM/slug
      Licence: CC BY 4.0 (Google developer site content licence,
      https://developers.google.com/terms/site-policies; the devsite footer
      licence line is checked on the first captured page). Named authors,
      editorial blog, capture pre-2022  -> H1, GREEN.
  govuk-service-manual   www.gov.uk/service-manual/*
      OGL v3.0 (Crown copyright). Editorial org, capture pre-2022 -> H2, GREEN.
  gds-blog               gds.blog.gov.uk/YYYY/MM/DD/slug
      OGL v3.0. Named authors + editorial -> H1, GREEN.

Raw HTML stored gzipped in raw/html/<id>.html.gz.
Usage: python3 fetch_commoncrawl.py [source ...]
"""
import gzip
import io
import json
import os
import re
import sys
import time

from fetch_lib import (get, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)

INDEX = "https://index.commoncrawl.org/CC-MAIN-2021-49-index"
DATA = "https://data.commoncrawl.org/"
HTMLDIR = os.path.join(RAW, "html")
os.makedirs(HTMLDIR, exist_ok=True)
IDX_DELAY = 1.5
WARC_DELAY = 0.15

SOURCES = {
    "google-search-central": {
        "query": "developers.google.com/search/blog/*",
        "url_re": re.compile(r"/search/blog/(\d{4})/(\d{2})/[a-z0-9_-]+$"),
        "root": "div.devsite-article-body, article",
        "licence": "CC BY 4.0 (Google developer site content licence)",
        "register": "seo-marketing-blog",
        "confidence": "H1",
        "bucket": "GREEN",
        "target": 550,
        "licence_re": re.compile(r"Creative Commons Attribution 4\.0", re.I),
    },
    "google-webmasters-blogspot": {
        # same Search Central articles, pre-2022 blogspot mirror -- the
        # devsite captures are mostly JS stubs; the canonical re-publication
        # on developers.google.com carries the CC BY 4.0 site licence
        "query": "webmasters.googleblog.com/2*",
        "url_re": re.compile(r"/(\d{4})/(\d{2})/[a-z0-9_-]+\.html$"),
        "root": "div.post-body, div.post, article",
        "licence": "CC BY 4.0 (Google Search Central content, as republished "
                   "on developers.google.com; text from pre-2022 blogspot capture)",
        "register": "seo-marketing-blog",
        "confidence": "H1",
        "bucket": "GREEN",
        "target": 400,
        "licence_re": re.compile(r"googleblog|Google", re.I),
    },
    "govuk-service-manual": {
        "query": "www.gov.uk/service-manual/*",
        "url_re": re.compile(r"/service-manual/[a-z0-9-]+/[a-z0-9-]+$"),
        "root": "main",
        "licence": "OGL-3.0 (Open Government Licence v3.0, Crown copyright)",
        "register": "howto-guide",
        "confidence": "H2",
        "bucket": "GREEN",
        "target": 250,
        "licence_re": re.compile(r"Open Government Licence", re.I),
    },
    "gds-blog": {
        "query": "gds.blog.gov.uk/*",
        "url_re": re.compile(r"gds\.blog\.gov\.uk/(\d{4})/(\d{2})/(\d{2})/[a-z0-9-]+/?$"),
        "root": ".entry-content, article",
        "licence": "OGL-3.0 (Open Government Licence v3.0, Crown copyright)",
        "register": "business-blog",
        "confidence": "H1",
        "bucket": "GREEN",
        "target": 300,
        "licence_re": re.compile(r"Open Government Licence", re.I),
    },
}


def index_records(query):
    """All 200/html captures for the query, deduped by urlkey."""
    b = get(f"{INDEX}?url={query.replace('/', '%2F')}&output=json&showNumPages=true",
            delay=IDX_DELAY, timeout=90, retries=3)
    if not b:
        return []
    pages = json.loads(b).get("pages", 1)
    seen, out = set(), []
    for p in range(pages):
        b = get(f"{INDEX}?url={query.replace('/', '%2F')}&output=json&page={p}",
                delay=IDX_DELAY, timeout=120, retries=3)
        if not b:
            continue
        for line in b.decode("utf-8", "replace").splitlines():
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get("status") != "200" or "html" not in (r.get("mime") or ""):
                continue
            if r["urlkey"] in seen:
                continue
            seen.add(r["urlkey"])
            out.append(r)
    return out


def warc_html(rec):
    """Range-fetch one WARC record and return the HTML payload string."""
    url = DATA + rec["filename"]
    offset, length = int(rec["offset"]), int(rec["length"])
    import urllib.request
    from fetch_lib import UA, _last_hit
    host = "data.commoncrawl.org"
    wait = WARC_DELAY - (time.time() - _last_hit.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Range": f"bytes={offset}-{offset + length - 1}"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read()
            _last_hit[host] = time.time()
            break
        except Exception as e:
            _last_hit[host] = time.time()
            if attempt == 2:
                print(f"  WARCFAIL {rec['url']}: {e}")
                return None
            time.sleep(3 * (attempt + 1))
    try:
        body = gzip.decompress(raw)
    except Exception:
        body = raw
    # WARC record: warc headers \r\n\r\n http headers \r\n\r\n payload
    parts = body.split(b"\r\n\r\n", 2)
    if len(parts) < 3:
        return None
    http_headers, payload = parts[1], parts[2]
    if b"chunked" in http_headers.lower():
        dec = _dechunk(payload)
        # CC usually stores the de-chunked payload even when the header says
        # chunked; only trust the dechunker when it yields something real
        if len(dec) >= min(1000, len(payload) // 2):
            payload = dec
    for enc in ("utf-8", "latin-1"):
        try:
            return payload.decode(enc)
        except Exception:
            continue
    return payload.decode("utf-8", "replace")


def _dechunk(b):
    out = io.BytesIO()
    i = 0
    while i < len(b):
        j = b.find(b"\r\n", i)
        if j < 0:
            break
        try:
            n = int(b[i:j].split(b";")[0], 16)
        except ValueError:
            break
        if n == 0:
            break
        out.write(b[j + 2:j + 2 + n])
        i = j + 2 + n + 2
    return out.getvalue()


def run_source(name, cfg, workers=5):
    from concurrent.futures import ThreadPoolExecutor
    outp = os.path.join(RAW, f"cc-{name}.jsonl")
    done = load_done(outp)
    kept = len(done)
    recs = index_records(cfg["query"])
    arts = [r for r in recs if cfg["url_re"].search(r["url"].rstrip("/"))
            or cfg["url_re"].search(r["url"])]
    # prefer older timestamps first for determinism; all are pre-2022 by crawl
    arts.sort(key=lambda r: r["url"])
    print(f"[cc:{name}] {len(recs)} captures, {len(arts)} article-shaped, target {cfg['target']}")
    licence_seen = False
    todo = [r for r in arts if r["url"].rstrip("/") not in done]
    pool = ThreadPoolExecutor(max_workers=workers)
    fetched = pool.map(lambda r: (r, warc_html(r)), todo)
    for rec, html in fetched:
        if kept >= cfg["target"]:
            break
        url = rec["url"].rstrip("/")
        if not html:
            continue
        if not licence_seen and cfg["licence_re"].search(html):
            licence_seen = True
            print(f"  licence statement verified in capture ({cfg['licence']})")
        md = None
        for sel in cfg["root"].split(","):
            md = html_to_markdown(html, root_selector=sel.strip())
            if md and len(md.split()) > 100:
                break
        if not md or not quality_ok(md, min_words=150):
            continue
        m = re.search(r"<title>([^<]*)</title>", html)
        import html as _h
        title = _h.unescape(m.group(1)).strip() if m else ""
        title = re.sub(r"\s*[|\-–]\s*(Google Search Central Blog.*|Google Developers.*|"
                       r"GOV\.UK.*|Government Digital Service.*)$", "", title).strip()
        dm = re.search(r"/(\d{4})/(\d{2})(?:/(\d{2}))?/", url + "/")
        pub = None
        if dm:
            pub = dm.group(1) + "-" + dm.group(2) + ("-" + dm.group(3) if dm.group(3) else "")
        did = doc_id(name, url)
        with gzip.open(os.path.join(HTMLDIR, did + ".html.gz"), "wt",
                       encoding="utf-8") as f:
            f.write(html)
        text = (f"# {title}\n\n{md}") if title and not md.startswith("# ") else md
        append_jsonl(outp, {
            "id": did, "text": text, "source": name, "url": url,
            "licence": cfg["licence"],
            "published_date": pub,
            "capture": "CC-MAIN-2021-49 " + rec["timestamp"],
            "register": cfg["register"],
            "human_confidence": cfg["confidence"],
            "legal_bucket": cfg["bucket"],
            "fetched_at": time.strftime("%Y-%m-%d"),
            "title": title,
            "raw_html": f"raw/html/{did}.html.gz",
        })
        done.add(url)
        kept += 1
    pool.shutdown(wait=False, cancel_futures=True)
    print(f"[cc:{name}] kept {kept}; licence_seen={licence_seen}")


def main():
    names = sys.argv[1:] or list(SOURCES)
    for n in names:
        run_source(n, SOURCES[n])


if __name__ == "__main__":
    main()

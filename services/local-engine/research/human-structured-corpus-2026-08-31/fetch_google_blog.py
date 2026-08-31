"""Google Search Central (Webmaster Central) blog via Common Crawl blogspot
captures -- the owner's priority SEO/marketing register.

The blogspot template hides the post body inside <script type='text/template'>
with a <noscript> fallback, so the generic converter sees nothing; this
fetcher extracts the noscript/template fragment directly, turns <br><br>
runs into paragraph breaks and converts the fragment.

Indexes queried (all pre-2022): CC-MAIN-2017-13, CC-MAIN-2019-35,
CC-MAIN-2021-49. Dedupe by URL path. Licence: CC BY 4.0 -- the same articles
are republished on developers.google.com under the Google developer site
content licence; text is taken from the pre-2022 capture. H1 (named editorial
blog), GREEN.

Usage: python3 fetch_google_blog.py [target]
"""
import html as htmllib
import os
import re
import sys
import time

from fetch_lib import (get, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)
import fetch_commoncrawl as fc

OUT = os.path.join(RAW, "google-searchcentral-blog.jsonl")
INDEXES = ["CC-MAIN-2017-13", "CC-MAIN-2019-35", "CC-MAIN-2021-49"]
URL_RE = re.compile(r"webmasters\.googleblog\.com/(\d{4})/(\d{2})/[a-z0-9_-]+\.html$")
NOSCRIPT_RE = re.compile(r"<div class='post-body'>.*?<noscript>(.*?)</noscript>", re.S)
TEMPLATE_RE = re.compile(r"<div class='post-content' itemprop='articleBody'>\s*"
                         r"<script type='text/template'>(.*?)</script>", re.S)
TITLE_RE = re.compile(r"property='og:title'[^>]*content='([^']*)'|"
                      r"content='([^']*)' property='og:title'")
AUTHOR_RE = re.compile(r"[Pp]osted by ([A-Z][A-Za-z .'-]{2,60})")


def index_arts(index_name):
    old = fc.INDEX
    fc.INDEX = f"https://index.commoncrawl.org/{index_name}-index"
    try:
        recs = fc.index_records("webmasters.googleblog.com/2*")
    finally:
        fc.INDEX = old
    return [(index_name, r) for r in recs if URL_RE.search(r["url"])]


def frag_to_md(frag):
    """Dedicated converter: blogspot fragments mix loose text, <br><br>
    paragraph breaks and real <ul>/<ol> lists (sometimes nested inside a
    single implicit paragraph), which the generic converter flattens."""
    from bs4 import BeautifulSoup, NavigableString, Tag
    frag = re.sub(r"(?:<br\s*/?>\s*){2,}", " \u00b6\u00b6 ", frag)
    frag = re.sub(r"<br\s*/?>", " ", frag)
    soup = BeautifulSoup(frag, "html.parser")
    out, buf = [], []

    def flush():
        txt = re.sub(r"\s+", " ", " ".join(buf)).strip()
        buf.clear()
        if txt:
            out.append(txt)
            out.append("")

    def render_list(el, ordered, depth=0):
        from bs4 import Tag as _Tag
        i = 0
        for ch in el.children:
            if not isinstance(ch, _Tag):
                continue
            if ch.name == "li":
                i += 1
                nested = [s.extract() for s in ch.find_all(["ul", "ol"], recursive=False)]
                txt = re.sub(r"\s+", " ", ch.get_text(" ", strip=True)).strip()
                txt = txt.replace("\u00b6", " ").strip()
                if txt:
                    out.append("  " * depth + (f"{i}. " if ordered else "- ") + re.sub(r"\s+", " ", txt))
                for s in nested:
                    render_list(s, s.name == "ol", depth + 1)
            elif ch.name in ("ul", "ol"):
                # parser hoisted a nested list to sibling level
                render_list(ch, ch.name == "ol", depth + 1)
        if depth == 0:
            out.append("")

    def walk(el):
        for ch in el.children:
            if isinstance(ch, NavigableString):
                buf.append(str(ch))
            elif isinstance(ch, Tag):
                if ch.name in ("script", "style", "img", "iframe", "table"):
                    continue
                if ch.name in ("ul", "ol"):
                    flush()
                    render_list(ch, ch.name == "ol")
                elif ch.name in ("h1", "h2", "h3", "h4", "h5"):
                    flush()
                    t = ch.get_text(" ", strip=True)
                    if t:
                        out.append("## " + re.sub(r"\s+", " ", t))
                        out.append("")
                elif ch.name in ("p", "blockquote", "div"):
                    flush()
                    walk(ch)
                    flush()
                else:
                    buf.append(ch.get_text(" ", strip=True))

    walk(soup)
    flush()
    md = "\n".join(out)
    md = re.sub(r"[ \t]*\u00b6\u00b6[ \t]*(?:\u00b6\u00b6[ \t]*)*", "\n\n", md)
    md = re.sub(r"(?m)[ \t]+$", "", md)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


def extract_md(h):
    m = NOSCRIPT_RE.search(h) or TEMPLATE_RE.search(h)
    if not m:
        return None
    return frag_to_md(m.group(1))


def main():
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 450
    done = load_done(OUT)
    kept = len(done)
    seen_paths = {u.split("googleblog.com")[-1] for u in done}
    from concurrent.futures import ThreadPoolExecutor
    for idx in INDEXES:
        if kept >= target:
            break
        arts = index_arts(idx)
        arts = [a for a in arts
                if a[1]["url"].split("googleblog.com")[-1] not in seen_paths]
        print(f"[{idx}] {len(arts)} new article captures")
        pool = ThreadPoolExecutor(max_workers=5)
        for iname, rec in pool.map(lambda a: a, arts):
            pass  # placeholder to keep structure simple
        pool.shutdown()
        pool = ThreadPoolExecutor(max_workers=5)
        fetched = pool.map(lambda a: (a[1], fc.warc_html(a[1])), arts)
        for rec, h in fetched:
            if kept >= target:
                break
            url = rec["url"]
            path = url.split("googleblog.com")[-1]
            if path in seen_paths or not h:
                continue
            md = extract_md(h)
            if not md or not quality_ok(md, min_words=150):
                continue
            tm = TITLE_RE.search(h)
            title = htmllib.unescape((tm.group(1) or tm.group(2)) if tm else "").strip()
            am = AUTHOR_RE.search(md[:400] + " " + md[-600:])
            dm = URL_RE.search(url)
            text = (f"# {title}\n\n{md}") if title else md
            did = doc_id("google-searchcentral", url)
            import gzip
            with gzip.open(os.path.join(fc.HTMLDIR, did + ".html.gz"), "wt",
                           encoding="utf-8") as f:
                f.write(h)
            append_jsonl(OUT, {
                "id": did, "text": text,
                "source": "google-searchcentral-blog", "url": url,
                "licence": "CC BY 4.0 (Google Search Central content, "
                           "republished on developers.google.com under the "
                           "developer-site content licence; text from "
                           "pre-2022 capture)",
                "published_date": f"{dm.group(1)}-{dm.group(2)}" if dm else None,
                "capture": f"{idx} {rec['timestamp']}",
                "register": "seo-marketing-blog",
                "human_confidence": "H1",
                "legal_bucket": "GREEN",
                "author": am.group(1).strip() if am else None,
                "fetched_at": time.strftime("%Y-%m-%d"),
                "title": title,
                "raw_html": f"raw/html/{did}.html.gz",
            })
            seen_paths.add(path)
            done.add(url)
            kept += 1
        pool.shutdown(wait=False)
        print(f"[{idx}] cumulative kept {kept}")
    print(f"[google-searchcentral-blog] kept {kept}")


if __name__ == "__main__":
    main()

"""Shared fetch/convert utilities for the structure-preserved human corpus
(2026-08-31).

Purpose: gather genuinely human-written, licence-recorded articles with
headings, paragraph breaks and bullet lists PRESERVED as markdown, to give
the document-shape tells (document-tells-2026-08-31) a fair human baseline.

Licence discipline: every doc records source, url, licence, published_date
(where verifiable) and a human_confidence field:
  high   = verifiably published pre-2022 (before mainstream LLM text)
  medium = first published pre-2022 but revised after, or date only
           approximately verifiable
  low    = no reliable pre-2022 dating (kept only if the source itself is
           strongly human, and stated honestly)

Fetching is polite: identified UA, per-host delay, robots.txt respected by
construction (only paths verified allowed; wikiHow and Mongabay were
rejected -- see README.md).
"""
import hashlib
import json
import os
import re
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
UA = "OpaceCorpusResearch/1.0 (+mailto:david.bryan@opace.co.uk; one-off research fetch, low rate)"

os.makedirs(RAW, exist_ok=True)

_last_hit = {}


def get(url, delay=0.5, timeout=40, retries=2):
    """Polite GET with per-host delay. Returns bytes or None."""
    host = re.sub(r"^https?://([^/]+).*", r"\1", url)
    wait = delay - (time.time() - _last_hit.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                _last_hit[host] = time.time()
                return r.read()
        except Exception as e:
            _last_hit[host] = time.time()
            if attempt == retries:
                print(f"  FAIL {url}: {e}")
                return None
            time.sleep(2 * (attempt + 1))


def get_json(url, delay=0.5, **kw):
    b = get(url, delay=delay, **kw)
    if b is None:
        return None
    try:
        return json.loads(b.decode("utf-8", "replace"))
    except Exception as e:
        print(f"  BADJSON {url}: {e}")
        return None


# ---------------------------------------------------------------- HTML -> MD
from bs4 import BeautifulSoup, NavigableString, Tag  # noqa: E402

_DROP_TAGS = {"script", "style", "nav", "aside", "form", "iframe", "figure",
              "figcaption", "footer", "header", "noscript", "svg", "button"}
_DROP_CLASS_RE = re.compile(
    r"(share|social|related|newsletter|advert|caption|credit|meta|byline|"
    r"breadcrumb|sidebar|comment|translation|donate|print-link|gem-c-)", re.I)


def _inline_text(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()


def _list_to_md(el, ordered, depth=0):
    out = []
    i = 0
    for li in el.find_all("li", recursive=False):
        i += 1
        # split out nested lists first
        nested = []
        for sub in li.find_all(["ul", "ol"], recursive=False):
            nested.append(sub.extract())
        txt = _inline_text(li)
        if txt:
            marker = f"{i}." if ordered else "-"
            out.append("  " * depth + f"{marker} {txt}")
        for sub in nested:
            out.extend(_list_to_md(sub, sub.name == "ol", depth + 1))
    return out


def html_to_markdown(html, root_selector=None, base_heading=2):
    """Convert article HTML to structure-preserving markdown.

    Keeps h1-h5 (mapped so the top level becomes ##), p, ul/ol (as - / 1.),
    blockquote (as paragraph). Drops boilerplate, figures, tables, scripts.
    Returns markdown string.
    """
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(root_selector) if root_selector else (soup.body or soup)
    if root is None:
        return ""
    for t in root.find_all(_DROP_TAGS):
        t.decompose()
    for t in root.find_all(True, class_=_DROP_CLASS_RE):
        t.decompose()
    for t in root.find_all(True, id=_DROP_CLASS_RE):
        t.decompose()

    lines = []

    def walk(el):
        for child in el.children:
            if isinstance(child, NavigableString):
                continue
            if not isinstance(child, Tag):
                continue
            name = child.name
            if name in ("h1", "h2", "h3", "h4", "h5"):
                txt = _inline_text(child)
                if txt:
                    level = min(6, max(2, int(name[1]) - 1 + base_heading - 1))
                    lines.append("#" * level + " " + txt)
                    lines.append("")
            elif name == "p":
                txt = _inline_text(child)
                if txt:
                    lines.append(txt)
                    lines.append("")
            elif name in ("ul", "ol"):
                md = _list_to_md(child, name == "ol")
                if md:
                    lines.extend(md)
                    lines.append("")
            elif name == "blockquote":
                txt = _inline_text(child)
                if txt:
                    lines.append(txt)
                    lines.append("")
            elif name in ("table", "pre", "code"):
                continue  # structural noise for this study
            else:
                walk(child)

    walk(root)
    md = "\n".join(lines)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


def quality_ok(md, min_words=150, min_blocks=3):
    """Basic keep/drop: enough prose and at least some block structure."""
    if not md:
        return False
    words = len(md.split())
    blocks = [b for b in re.split(r"\n\s*\n", md) if b.strip()]
    return words >= min_words and len(blocks) >= min_blocks


def doc_id(source, url):
    return source + "-" + hashlib.sha256(url.encode()).hexdigest()[:12]


def write_jsonl(path, rows):
    with open(path, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {len(rows)} -> {path}")


def load_done(path):
    done = set()
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        done.add(json.loads(line)["url"])
                    except Exception:
                        pass
    return done


def append_jsonl(path, row):
    with open(path, "a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

"""Shared helpers for the long-form corpus build: HTTP, text cleaning,
normalised hashing and the quarantine set.

Nothing here writes outside this directory.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
LOGS = os.path.join(HERE, "logs")
os.makedirs(RAW, exist_ok=True)
os.makedirs(LOGS, exist_ok=True)

UA = "opace-longform-corpus/1.0 (research; contact david.bryan@opace.co.uk)"

# Held-out material this corpus must never overlap with.
QUARANTINE_SOURCES = [
    ("eval-samples.json",
     "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins"
     "/1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json"),
    ("provider-eval/eval-set.jsonl",
     os.path.join(HERE, "..", "provider-eval", "eval-set.jsonl")),
    ("tests/battery/human-corpus-v1.json",
     os.path.join(HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v1.json")),
    ("tests/battery/human-corpus-v2.json",
     os.path.join(HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v2.json")),
]

_WS = re.compile(r"\s+")
_NONWORD = re.compile(r"[^a-z0-9 ]+")


def norm_hash(text: str) -> str:
    """Normalised text hash: NFKC, lowercase, punctuation stripped, whitespace
    collapsed. Catches reformatting and markdown differences, not paraphrase."""
    t = unicodedata.normalize("NFKC", text).lower()
    t = _NONWORD.sub(" ", t)
    t = _WS.sub(" ", t).strip()
    return hashlib.sha256(t.encode()).hexdigest()


def shingles(text: str, n: int = 12) -> set[str]:
    """Word n-gram fingerprints, for near-duplicate detection against held-out
    material where a hash alone would miss a trimmed copy."""
    t = unicodedata.normalize("NFKC", text).lower()
    words = _NONWORD.sub(" ", t).split()
    if len(words) < n:
        return set()
    return {hashlib.blake2b(" ".join(words[i:i + n]).encode(), digest_size=8).hexdigest()
            for i in range(0, len(words) - n + 1, 4)}


def _texts_from(path: str) -> list[str]:
    out = []
    if not os.path.exists(path):
        print(f"  WARNING quarantine source missing: {path}", file=sys.stderr)
        return out
    if path.endswith(".jsonl"):
        rows = [json.loads(l) for l in open(path) if l.strip()]
    else:
        rows = json.load(open(path))
        if isinstance(rows, dict):
            rows = rows.get("samples") or rows.get("rows") or list(rows.values())
    for r in rows:
        if isinstance(r, dict):
            for k in ("text", "content", "sample", "body"):
                if isinstance(r.get(k), str) and r[k].strip():
                    out.append(r[k])
                    break
        elif isinstance(r, str):
            out.append(r)
    return out


def build_quarantine() -> tuple[set[str], set[str], dict]:
    hashes: set[str] = set()
    shing: set[str] = set()
    counts = {}
    for label, path in QUARANTINE_SOURCES:
        texts = _texts_from(os.path.abspath(path))
        counts[label] = len(texts)
        for t in texts:
            hashes.add(norm_hash(t))
            shing |= shingles(t)
    return hashes, shing, counts


def get(url: str, headers: dict | None = None, attempts: int = 4,
        timeout: int = 90) -> bytes:
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            code = getattr(exc, "code", None)
            if code in (400, 401, 403, 404, 410):
                raise
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"GET failed after {attempts}: {url}") from last


def get_json(url: str, headers: dict | None = None, **kw) -> dict:
    return json.loads(get(url, headers, **kw).decode("utf-8", "replace"))


def qs(base: str, params: dict) -> str:
    return base + "?" + urllib.parse.urlencode(params)


# --- text cleaning -------------------------------------------------------

_TAG = re.compile(r"<[^>]+>")
_ENTITY = re.compile(r"&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);")


def strip_html(html: str) -> str:
    import html as _html
    s = re.sub(r"(?is)<(script|style|figure|figcaption|aside|nav|form|noscript)[^>]*>.*?</\1>",
               " ", html)
    s = re.sub(r"(?i)<br\s*/?>", "\n", s)
    s = re.sub(r"(?i)</(p|div|h[1-6]|li|blockquote|tr)>", "\n\n", s)
    s = _TAG.sub(" ", s)
    s = _html.unescape(s)
    return tidy(s)


def tidy(text: str) -> str:
    text = text.replace(" ", " ").replace("​", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def words(text: str) -> int:
    return len(text.split())


BOILER = re.compile(
    r"(?i)(subscribe to our newsletter|cookie policy|all rights reserved|"
    r"sign up for|follow us on|creative commons licen[cs]e|republish this article|"
    r"this article is republished|share this article|read more:)")


def looks_like_prose(text: str, min_words: int = 400) -> tuple[bool, str]:
    w = words(text)
    if w < min_words:
        return False, f"too short ({w})"
    lines = [l for l in text.split("\n") if l.strip()]
    if not lines:
        return False, "empty"
    bullets = sum(1 for l in lines if re.match(r"^\s*([-*•]|\d+[.)])\s", l))
    if bullets > 0.4 * len(lines):
        return False, "mostly a list"
    sentences = re.split(r"(?<=[.!?])\s+", text)
    long_sents = [s for s in sentences if len(s.split()) >= 5]
    if len(long_sents) < 8:
        return False, "too few sentences"
    # Fragment test: navigation lists, contents pages and table dumps survive
    # the sentence test because their entries are long, but their lines are
    # short and mostly unterminated. Found by spot-reading GOV.UK rows.
    stripped = [l.strip() for l in lines]
    unterminated = sum(1 for l in stripped
                       if not re.search(r"[.!?:;\u201d\"')\]]$", l))
    if len(stripped) and unterminated / len(stripped) > 0.7 and w / len(stripped) < 10:
        return False, "fragment list, not prose"
    letters = sum(c.isalpha() for c in text)
    if letters < 0.6 * max(1, len(text.replace(" ", ""))):
        return False, "low alphabetic ratio"
    return True, "ok"

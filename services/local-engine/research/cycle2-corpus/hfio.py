"""Shared HTTP helpers for pulling bounded slices out of very large Hugging Face
dataset files without downloading them whole.

Every fetch here is a plain HTTPS GET against the public `resolve/main` endpoint.
Nothing is written outside this directory's `raw/`.
"""

from __future__ import annotations

import csv
import gzip
import io
import json
import os
import sys
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)

UA = {"User-Agent": "opace-cycle2-corpus/1.0 (research; contact david.bryan@opace.co.uk)"}
csv.field_size_limit(1 << 30)


def url_for(repo: str, path: str) -> str:
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{path}"


def _get(url: str, headers: dict, attempts: int = 5) -> bytes:
    """GET with backoff. The HF CDN returns 5xx on large range requests often
    enough that a single failure must not lose a whole build."""
    import time
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={**UA, **headers})
            with urllib.request.urlopen(req, timeout=600) as r:
                return r.read()
        except Exception as exc:  # noqa: BLE001 - retried below
            last = exc
            wait = 5 * (i + 1)
            print(f"    retry {i+1}/{attempts} after {type(exc).__name__}: {exc} (sleep {wait}s)",
                  file=sys.stderr, flush=True)
            time.sleep(wait)
    raise RuntimeError(f"GET failed after {attempts} attempts: {url}") from last


def fetch_range(repo: str, path: str, nbytes: int, cache: str | None = None) -> bytes:
    """First `nbytes` of a remote file, cached under raw/."""
    cache_path = os.path.join(RAW, cache or (repo.replace("/", "__") + "__" + path.replace("/", "__")))
    if os.path.exists(cache_path) and os.path.getsize(cache_path) >= nbytes:
        with open(cache_path, "rb") as f:
            return f.read(nbytes)
    print(f"  GET {repo}/{path} [0-{nbytes-1}]", flush=True)
    blob = _get(url_for(repo, path), {"Range": f"bytes=0-{nbytes-1}"})
    with open(cache_path, "wb") as f:
        f.write(blob)
    return blob


def jsonl_rows(blob: bytes, limit: int | None = None):
    """Parse whole JSON lines from a byte slice; the trailing partial line is dropped."""
    text = blob.decode("utf-8", "replace")
    lines = text.split("\n")
    if lines and not text.endswith("\n"):
        lines = lines[:-1]
    n = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        yield row
        n += 1
        if limit and n >= limit:
            return


def csv_rows(blob: bytes, limit: int | None = None):
    """Parse a byte slice of a CSV with quoted, newline-containing fields.

    The final record is almost always truncated by the byte cut, so it is
    dropped: we buffer one row and only yield the previous one.
    """
    text = blob.decode("utf-8", "replace")
    rdr = csv.DictReader(io.StringIO(text))
    prev = None
    n = 0
    try:
        for row in rdr:
            if prev is not None:
                yield prev
                n += 1
                if limit and n >= limit:
                    return
            prev = row
    except Exception as exc:  # truncated tail
        print(f"    (csv tail truncated: {type(exc).__name__})", file=sys.stderr)
    # `prev` is deliberately discarded: it is the possibly-truncated last record.


def gzip_stream_rows(repo: str, path: str, nbytes: int, cache: str | None = None, limit: int | None = None):
    """Stream-decompress the first `nbytes` of a remote .json.gz and yield rows."""
    blob = fetch_range(repo, path, nbytes, cache=cache)
    dec = zlib.decompressobj(zlib.MAX_WBITS | 16)
    try:
        raw = dec.decompress(blob)
    except zlib.error as exc:
        print(f"    gzip error: {exc}", file=sys.stderr)
        return
    yield from jsonl_rows(raw, limit=limit)


def fetch_whole(repo: str, path: str, cache: str | None = None) -> bytes:
    cache_path = os.path.join(RAW, cache or (repo.replace("/", "__") + "__" + path.replace("/", "__")))
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            return f.read()
    print(f"  GET {repo}/{path} (whole)", flush=True)
    blob = _get(url_for(repo, path), {})
    with open(cache_path, "wb") as f:
        f.write(blob)
    return blob


def maybe_gunzip(blob: bytes) -> bytes:
    if blob[:2] == b"\x1f\x8b":
        return gzip.decompress(blob)
    return blob

"""Congressional Research Service reports -> white-paper / research-summary.

CRS reports are works of the United States government and are not subject to
copyright protection in the US (17 U.S.C. 105). EveryCRSReport.com publishes
them with an HTML rendering, which is what is read here.

A second report publisher matters: with GOV.UK alone the register would be one
government's house style, and a classifier could learn the style rather than
the authorship.
"""

from __future__ import annotations

import csv
import io
import json
import os
import random
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import common

BASE = "https://www.everycrsreport.com/"
OUT = os.path.join(common.RAW, "crs.jsonl")

HEAD = re.compile(r"(?i)<h[23][^>]*>(.*?)</h[23]>")
SKIP_HEAD = re.compile(r"(?i)^(footnotes|author contact|references|appendix|"
                       r"table of contents|contents|acknowledg)")


def chunks(body: str) -> list[tuple[str, str]]:
    parts = re.split(r"(?i)(<h[23][^>]*>.*?</h[23]>)", body)
    out, head, buf = [], "", []
    for p in parts:
        if re.match(r"(?i)^<h[23]", p):
            if buf:
                out.append((head, "".join(buf)))
            head = common.strip_html(p)
            buf = []
        else:
            buf.append(p)
    if buf:
        out.append((head, "".join(buf)))
    return out


def one(item: tuple[str, str, str]) -> list[dict]:
    num, title, date = item
    try:
        meta = common.get_json(BASE + f"reports/{num}.json", timeout=90)
    except Exception:  # noqa: BLE001
        return []
    versions = meta.get("versions") or []
    html_path = None
    for v in versions:
        for fmt in (v.get("formats") or []):
            if fmt.get("format") == "HTML":
                html_path = fmt.get("filename")
                break
        if html_path:
            break
    if not html_path:
        return []
    try:
        html = common.get(BASE + html_path, timeout=120).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return []
    html = re.sub(r"(?is)<table[^>]*>.*?</table>", " ", html)
    year = int(date[:4]) if date[:4].isdigit() else None
    parts = chunks(html)
    if len(parts) <= 1:
        # no h2/h3 markup: fall back to fixed-width passages
        full = common.strip_html(html)
        ws = full.split()
        parts = [("", " ".join(ws[i:i + 1400])) for i in range(0, len(ws), 1400)]
    rows = []
    for head, chunk_html in parts:
        if head and SKIP_HEAD.match(head.strip()):
            continue
        text = common.strip_html(chunk_html)
        if head:
            text = head + "\n\n" + text
        if common.words(text) > 2400:
            ws = text.split()
            text = " ".join(ws[:2200])
            text = text[:text.rfind(".") + 1] or text
        ok, _ = common.looks_like_prose(text, 500)
        if not ok:
            continue
        rows.append({
            "side": "human",
            "register": "white-paper",
            "genre": "white-paper",
            "text": text,
            "word_count": common.words(text),
            "licence": "US government work, no copyright (17 U.S.C. 105); via EveryCRSReport.com",
            "source": "crs-report",
            "source_ref": f"https://www.everycrsreport.com/reports/{num}.html",
            "era_year": year,
            "discipline": "us-policy-analysis",
            "publisher": "Congressional Research Service",
            "section_title": (head or title)[:120],
        })
        if len(rows) >= 3:
            break
    return rows


def main():
    want = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    raw = common.get(BASE + "reports.csv", timeout=180).decode("utf-8", "replace")
    rows = list(csv.DictReader(io.StringIO(raw)))
    picked = [(r["number"], r["title"], r["latestPubDate"]) for r in rows
              if "2018" <= r["latestPubDate"][:4] <= "2022" and r.get("latestHTML")]
    random.Random(20260828).shuffle(picked)
    picked = picked[:900]
    print(f"{len(picked)} CRS reports 2018-2022 with HTML", flush=True)
    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=6) as ex:
        for i, out in enumerate(ex.map(one, picked), 1):
            for r in out:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 50 == 0:
                print(f"  {i}/{len(picked)} -> {n} chunks", flush=True)
            if n >= want:
                break
    print(f"DONE {n} chunks -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

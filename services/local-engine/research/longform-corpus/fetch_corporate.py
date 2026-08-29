"""SEC EDGAR 10-K narrative -> company-update long-form (human side).

The narrative taken is Item 7, Management's Discussion and Analysis: the part
of an annual report a person writes in prose. Financial tables are stripped
before the prose is chunked, and any chunk that is still mostly figures is
rejected by the prose test.

Licence position, stated plainly: EDGAR filings are mandatory public
disclosure documents published by the SEC and freely redistributable from
EDGAR. The SEC asserts no copyright over them; the filers may hold copyright
in the underlying text. Use here is research use of a public record, and each
row carries its accession number so the original is verifiable.
"""

from __future__ import annotations

import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import common

FTS = "https://efts.sec.gov/LATEST/search-index"
OUT = os.path.join(common.RAW, "edgar.jsonl")
HDR = {"User-Agent": common.UA}

START = re.compile(r"(?is)management.{0,5}s\s+discussion\s+and\s+analysis"
                   r"(?:\s+of\s+financial\s+condition[^\n]{0,80})?")
END = re.compile(r"(?is)quantitative\s+and\s+qualitative\s+disclosures?\s+about\s+market\s+risk|"
                 r"financial\s+statements\s+and\s+supplementary\s+data|"
                 r"report\s+of\s+independent\s+registered\s+public\s+accounting\s+firm")


def strip_tables(html: str) -> str:
    return re.sub(r"(?is)<table[^>]*>.*?</table>", "\n\n", html)


def search(year: int, want: int) -> list[tuple[str, str, str]]:
    out = []
    for frm in range(0, 1000, 100):
        if len(out) >= want:
            break
        url = common.qs(FTS, {
            "q": '"Management\'s Discussion and Analysis"',
            "forms": "10-K",
            "dateRange": "custom",
            "startdt": f"{year}-01-01", "enddt": f"{year}-12-31",
            "from": frm,
        })
        try:
            d = common.get_json(url, headers=HDR, timeout=90)
        except Exception as exc:  # noqa: BLE001
            print(f"    search {year} from={frm} failed: {exc}", file=sys.stderr)
            break
        hits = d.get("hits", {}).get("hits", [])
        if not hits:
            break
        for h in hits:
            acc, fn = h["_id"].split(":", 1)
            src = h["_source"]
            names = src.get("display_names") or [""]
            cik = src.get("ciks", [""])[0]
            out.append((f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/"
                        f"{acc.replace('-', '')}/{fn}", names[0], src.get("file_date", "")))
    return out[:want]


def one(item: tuple[str, str, str]) -> list[dict]:
    url, name, date = item
    try:
        html = common.get(url, headers=HDR, timeout=120).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return []
    text = common.strip_html(strip_tables(html))
    starts = [m.end() for m in START.finditer(text)]
    if not starts:
        return []
    body = ""
    for s in starts:
        rest = text[s:]
        e = END.search(rest)
        cand = rest[:e.start()] if e else rest[:60000]
        if common.words(cand) > common.words(body):
            body = cand
    if common.words(body) < 400:
        return []
    year = int(date[:4]) if date[:4].isdigit() else None
    company = re.sub(r"\s*\(.*", "", name).strip().title()
    rows, ws = [], body.split()
    for i in range(0, len(ws), 1400):
        chunk = " ".join(ws[i:i + 1400])
        if common.words(chunk) < 500:
            break
        chunk = chunk[:chunk.rfind(".") + 1] or chunk
        ok, _ = common.looks_like_prose(chunk, 500)
        if not ok:
            continue
        rows.append({
            "side": "human",
            "register": "company-update",
            "genre": "company-update",
            "text": chunk,
            "word_count": common.words(chunk),
            "licence": "US SEC EDGAR public filing (public disclosure record; SEC asserts no copyright)",
            "source": "sec-edgar-10k-mdna",
            "source_ref": url,
            "era_year": year,
            "discipline": "corporate-reporting",
            "publisher": company,
            "section_title": "Item 7 Management's Discussion and Analysis",
        })
        if len(rows) >= 3:   # cap per filing so one issuer cannot dominate
            break
    return rows


def main():
    per_year = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    items = []
    for year in range(2018, 2023):
        got = search(year, per_year)
        print(f"  {year}: {len(got)} filings", flush=True)
        items += got
    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=4) as ex:
        for i, rows in enumerate(ex.map(one, items), 1):
            for r in rows:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 50 == 0:
                print(f"  {i}/{len(items)} -> {n} chunks", flush=True)
    print(f"DONE {n} chunks -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

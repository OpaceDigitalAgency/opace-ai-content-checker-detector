"""Europe PMC open-access full text -> academic long-form sections.

Abstracts are excluded deliberately: they are formulaic and are the thing the
shipped model already sees. What goes in is introduction, literature review,
discussion and conclusion prose, which is where the failure is.

Licence: only articles Europe PMC records as CC BY / CC BY-NC / CC BY-NC-ND /
CC BY-SA / CC0 are kept, and the exact licence string is carried per row.
"""

from __future__ import annotations

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

import common

SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
FT = "https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
OUT = os.path.join(common.RAW, os.environ.get("EPMC_OUT", "epmc.jsonl"))

OK_LICENCES = {"cc by", "cc by-nc", "cc by-nc-nd", "cc by-nc-sa", "cc by-sa", "cc0",
               "cc by 4.0", "cc-by"}

# Deliberately spread beyond biomedicine. Europe PMC indexes a fair amount of
# education, social science, economics and humanities-adjacent work; it is not
# a humanities archive, and that shortfall is recorded in MANIFEST.md.
QUERIES: list[tuple[str, str]] = [
    ("education", 'SUBJECT:"education"'),
    ("education-pedagogy", '(TITLE:"teaching" OR TITLE:"curriculum" OR TITLE:"pedagog*" OR TITLE:"assessment")'),
    ("sociology", '(TITLE:"social capital" OR TITLE:"inequality" OR TITLE:"ethnograph*" OR TITLE:"social class")'),
    ("psychology", 'SUBJECT:"psychology"'),
    ("economics", '(TITLE:"labour market" OR TITLE:"labor market" OR TITLE:"economic growth" OR TITLE:"cost-effectiveness")'),
    ("public-health", 'SUBJECT:"public health"'),
    ("nursing", 'SUBJECT:"nursing"'),
    ("ethics-philosophy", '(SUBJECT:"ethics" OR TITLE:"bioethics" OR TITLE:"moral" OR TITLE:"normative")'),
    ("linguistics", '(TITLE:"linguistic" OR TITLE:"discourse" OR TITLE:"second language" OR TITLE:"bilingual")'),
    ("history", '(TITLE:"historical" OR TITLE:"history of" OR TITLE:"archival" OR TITLE:"nineteenth-century")'),
    ("geography-environment", '(TITLE:"land use" OR TITLE:"climate adaptation" OR TITLE:"urban" OR TITLE:"rural livelihood")'),
    ("computer-science", '(TITLE:"machine learning" OR TITLE:"deep learning" OR TITLE:"algorithm")'),
    ("business-management", '(TITLE:"organisational" OR TITLE:"organizational" OR TITLE:"firm performance" OR TITLE:"supply chain")'),
    ("policy-law", '(TITLE:"policy" OR TITLE:"regulation" OR TITLE:"governance" OR TITLE:"legislation")'),
    ("anthropology", '(TITLE:"indigenous" OR TITLE:"qualitative study" OR TITLE:"lived experience")'),
    ("biology", 'SUBJECT:"biology"'),
    ("medicine-clinical", '(TITLE:"randomised controlled trial" OR TITLE:"randomized controlled trial")'),
    ("chemistry-materials", '(TITLE:"catalys*" OR TITLE:"materials" OR TITLE:"synthesis of")'),
    ("physics-engineering", '(TITLE:"finite element" OR TITLE:"mechanical propert*" OR TITLE:"simulation of")'),
    ("epidemiology", '(TITLE:"cohort study" OR TITLE:"cross-sectional")'),
    ("sport-nutrition", '(TITLE:"physical activity" OR TITLE:"dietary" OR TITLE:"athletes")'),
    ("communication-media", '(TITLE:"media" OR TITLE:"communication" OR TITLE:"social media")'),
]

DATE = os.environ.get("EPMC_DATE", "FIRST_PDATE:[2018-01-01 TO 2022-12-31]")

SECTION_MAP = [
    (re.compile(r"(?i)^\s*(literature review|review of (the )?literature|theoretical "
                r"(background|framework)|conceptual framework|related work|prior work|"
                r"background and related|state of the art|previous (research|studies))"),
     "academic-lit-review"),
    (re.compile(r"(?i)^\s*(discussion|discussion of findings|discussion and (conclusion|implication)|general discussion)"),
     "academic-discussion"),
    (re.compile(r"(?i)^\s*(conclusion|conclusions|concluding remarks|implications)"),
     "academic-conclusion"),
    (re.compile(r"(?i)^\s*(introduction|background|1\.?\s*introduction)"),
     "academic-introduction"),
]

DROP_TAGS = {"table-wrap", "fig", "disp-formula", "inline-formula", "supplementary-material",
             "table", "graphic", "media", "ref-list", "fn-group", "app-group"}


def sec_text(sec: ET.Element) -> str:
    parts = []
    for p in sec.iter("p"):
        # skip paragraphs that live inside dropped containers
        buf = []
        for node in p.iter():
            if node.tag in DROP_TAGS:
                continue
            if node.text:
                buf.append(node.text)
            if node.tail and node is not p:
                buf.append(node.tail)
        parts.append(common.tidy(" ".join(buf)))
    return common.tidy("\n\n".join(x for x in parts if x))


def search(label: str, query: str, want: int) -> list[dict]:
    out, cursor = [], "*"
    while len(out) < want:
        url = common.qs(SEARCH, {
            "query": f"(OPEN_ACCESS:Y AND HAS_FT:Y AND LANG:eng AND {DATE} AND {query})",
            "format": "json", "pageSize": 100, "cursorMark": cursor,
            "resultType": "core",
        })
        try:
            d = common.get_json(url, timeout=120)
        except Exception as exc:  # noqa: BLE001
            print(f"  {label}: search failed {exc}", file=sys.stderr)
            break
        res = d.get("resultList", {}).get("result", [])
        if not res:
            break
        for r in res:
            lic = (r.get("license") or "").strip().lower()
            if not r.get("pmcid") or lic not in OK_LICENCES:
                continue
            out.append({
                "pmcid": r["pmcid"],
                "licence": lic,
                "date": r.get("firstPublicationDate", ""),
                "journal": ((r.get("journalInfo") or {}).get("journal") or {}).get("title", ""),
                "title": r.get("title", ""),
                "discipline": label,
                "doi": r.get("doi", ""),
            })
            if len(out) >= want:
                break
        nxt = d.get("nextCursorMark")
        if not nxt or nxt == cursor:
            break
        cursor = nxt
    return out


def article(meta: dict) -> list[dict]:
    try:
        xml = common.get(FT.format(pmcid=meta["pmcid"]), timeout=120)
    except Exception:  # noqa: BLE001
        return []
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []
    body = root.find(".//body")
    if body is None:
        return []
    rows = []
    for sec in body.findall("./sec"):
        ti = sec.find("title")
        title = (ti.text or "").strip() if ti is not None and ti.text else ""
        register = None
        for rx, reg in SECTION_MAP:
            if rx.match(title):
                register = reg
                break
        if register is None:
            continue
        text = sec_text(sec)
        ok, why = common.looks_like_prose(text, 400)
        if not ok:
            continue
        year = int(meta["date"][:4]) if meta["date"][:4].isdigit() else None
        rows.append({
            "side": "human",
            "register": register,
            "genre": register,
            "text": text,
            "word_count": common.words(text),
            "licence": meta["licence"].upper().replace("CC BY", "CC BY"),
            "source": "europepmc-oa",
            "source_ref": f"https://europepmc.org/article/PMC/{meta['pmcid']}",
            "era_year": year,
            "discipline": meta["discipline"],
            "journal": meta["journal"],
            "doi": meta["doi"],
            "section_title": title,
        })
    return rows


def main():
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    only = {x for x in os.environ.get("EPMC_ONLY", "").split(",") if x}
    queries = [(l, q) for l, q in QUERIES if not only or l in only]
    metas, seen = [], set()
    for label, q in queries:
        got = search(label, q, per)
        fresh = [m for m in got if m["pmcid"] not in seen]
        for m in fresh:
            seen.add(m["pmcid"])
        metas += fresh
        print(f"  {label}: {len(fresh)} articles", flush=True)
    print(f"{len(metas)} unique OA articles to fetch", flush=True)

    n = 0
    with open(OUT, "w") as f, ThreadPoolExecutor(max_workers=6) as ex:
        for i, rows in enumerate(ex.map(article, metas), 1):
            for r in rows:
                f.write(json.dumps(r) + "\n")
                n += 1
            if i % 100 == 0:
                print(f"  fetched {i}/{len(metas)} -> {n} sections", flush=True)
    print(f"DONE {n} sections from {len(metas)} articles -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

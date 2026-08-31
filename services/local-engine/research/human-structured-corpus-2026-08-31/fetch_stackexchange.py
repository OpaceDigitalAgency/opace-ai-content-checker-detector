"""StackExchange fetcher -- CC BY-SA (3.0 for pre-2018-05 contributions,
4.0 after; recorded as "CC BY-SA 3.0/4.0" per StackExchange ToS
https://stackoverflow.com/help/licensing). Verified 2026-08-31.

Register: faq-qa (question + top-voted answer, the FAQ hard-negative shape).
Bodies are HTML with genuine human bullet lists -- the thing every C4-style
corpus stripped.

Dating: todate=2021-12-31 on questions AND answers (activity may be later;
creation_date used, human_confidence high only when both Q and A created
pre-2022).

Uses the public API anonymously (well inside the 300 req/day quota).
Usage: python3 fetch_stackexchange.py
"""
import os
import time

from fetch_lib import (get_json, html_to_markdown, quality_ok, doc_id,
                       load_done, append_jsonl, RAW)

OUT = os.path.join(RAW, "stackexchange.jsonl")
API = "https://api.stackexchange.com/2.3"
DELAY = 1.0
CUTOFF = 1640995200  # 2022-01-01 UTC

SITES = [  # prose-heavy, non-code sites
    ("cooking", 80), ("diy", 80), ("travel", 80), ("money", 80),
    ("workplace", 80), ("gardening", 60), ("pets", 40),
]


def fetch_site(site, target, done):
    kept = 0
    page = 1
    while kept < target and page <= 4:
        j = get_json(f"{API}/questions?site={site}&sort=votes&order=desc"
                     f"&pagesize=100&page={page}&todate={CUTOFF}&filter=withbody",
                     delay=DELAY)
        if not j or not j.get("items"):
            break
        qs = [q for q in j["items"]
              if q.get("creation_date", 0) < CUTOFF and q.get("body")
              and q.get("accepted_answer_id")]
        ids = ";".join(str(q["question_id"]) for q in qs[:100])
        answers = {}
        if ids:
            for chunk_start in range(0, len(qs), 90):
                chunk = qs[chunk_start:chunk_start + 90]
                ids = ";".join(str(q["question_id"]) for q in chunk)
                aj = get_json(f"{API}/questions/{ids}/answers?site={site}"
                              f"&sort=votes&order=desc&pagesize=100&filter=withbody",
                              delay=DELAY)
                if aj:
                    for a in aj.get("items", []):
                        qid = a["question_id"]
                        if qid not in answers or a["score"] > answers[qid]["score"]:
                            answers[qid] = a
        for q in qs:
            if kept >= target:
                break
            a = answers.get(q["question_id"])
            if not a or not a.get("body"):
                continue
            url = q.get("link", f"https://{site}.stackexchange.com/q/{q['question_id']}")
            if url in done:
                kept += 1
                continue
            q_md = html_to_markdown(q["body"])
            a_md = html_to_markdown(a["body"])
            if not q_md or not a_md:
                continue
            title = BeautifulTitle(q.get("title", ""))
            text = f"# {title}\n\n{q_md}\n\n## Answer\n\n{a_md}"
            if not quality_ok(text, min_words=150):
                continue
            a_pre2022 = a.get("creation_date", 0) < CUTOFF
            append_jsonl(OUT, {
                "id": doc_id("stackexchange", url),
                "text": text,
                "source": f"stackexchange-{site}",
                "url": url,
                "licence": "CC BY-SA 3.0/4.0 (Stack Exchange user contributions)",
                "published_date": time.strftime("%Y-%m-%d", time.gmtime(q["creation_date"])),
                "register": "faq-qa",
                "human_confidence": "high" if a_pre2022 else "medium",
                "fetched_at": time.strftime("%Y-%m-%d"),
                "title": title,
                "notes": "question + top-voted answer concatenated; answer date "
                         + time.strftime("%Y-%m-%d", time.gmtime(a["creation_date"])),
            })
            done.add(url)
            kept += 1
        if j.get("quota_remaining", 999) < 20:
            print("quota low, stopping")
            break
        page += 1
    return kept


def BeautifulTitle(t):
    import html
    return html.unescape(t).strip()


def main():
    done = load_done(OUT)
    total = 0
    for site, target in SITES:
        k = fetch_site(site, target, done)
        print(f"[stackexchange:{site}] kept {k}")
        total += k
    print(f"[stackexchange] total {total}")


if __name__ == "__main__":
    main()

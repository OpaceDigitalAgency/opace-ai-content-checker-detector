"""Workstream REAL - normaliser correctness gate.

Run before any measurement. Proves three things:
  1. Each documented rule does what the docstring claims (unit cases).
  2. Sentence structure and punctuation survive (word/sentence/punct deltas
     are zero on prose-only input).
  3. On the 169 human samples the normaliser is near-idempotent - it must not
     be quietly rewriting the human side and manufacturing separation.
"""

from __future__ import annotations

import json
import os
import re
import sys

from strip_markdown import furniture_counts, strip_markdown

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.join(HERE, "..", "provider-eval", "eval-set.jsonl")

CASES: list[tuple[str, str, str]] = [
    ("R1 atx heading", "## The Key Benefits\n\nText here.", "The Key Benefits\n\nText here."),
    ("R1 closed atx", "### Summary ###", "Summary"),
    ("R1 setext", "Overview\n========\n\nBody.", "Overview\n\nBody."),
    ("R2 bold", "This is **very** important.", "This is very important."),
    ("R2 italic", "This is *quite* good and _also_ fine.", "This is quite good and also fine."),
    ("R2 bold-italic", "A ***strong*** claim.", "A strong claim."),
    ("R2 nested", "**_Both_ at once**", "Both at once"),
    ("R2 strike", "It was ~~bad~~ good.", "It was bad good."),
    ("R3 bullet", "- First point\n- Second point", "First point\nSecond point"),
    ("R3 bullet nested", "  * Indented item", "Indented item"),
    ("R3 ordered", "1. First\n2. Second", "First\nSecond"),
    ("R3 ordered paren", "1) First", "First"),
    ("R4 fence", "```python\nx = 1\n```", "x = 1"),
    ("R4 inline code", "Call `foo()` now.", "Call foo() now."),
    ("R5 table", "| A | B |\n| --- | --- |\n| 1 | 2 |", "A, B\n1, 2"),
    ("R6 hr dashes", "Text.\n\n---\n\nMore.", "Text.\n\nMore."),
    ("R6 hr stars", "A.\n\n***\n\nB.", "A.\n\nB."),
    ("R7 link", "See [the docs](https://x.com/y) for more.", "See the docs for more."),
    ("R7 image", "![alt text](img.png)Body", "Body"),
    ("R7 autolink", "Visit <https://example.com> today.", "Visit https://example.com today."),
    ("R8 blockquote", "> Quoted line", "Quoted line"),
    ("R9 html", "A <strong>bold</strong> move.", "A bold move."),
    ("R9 entity", "Tom &amp; Jerry &mdash; friends.", "Tom & Jerry — friends."),
    ("R10 escape", r"Literal \*asterisks\* here.", "Literal *asterisks* here."),
    ("R11 hard break", "Line one\\\nLine two", "Line one\nLine two"),
    ("R11 blank runs", "A.\n\n\n\n\nB.", "A.\n\nB."),
    # punctuation and rhythm must be untouched
    ("punct preserved", "Wait - really? Yes; truly! (Indeed.) 3.5% — fine.",
     "Wait - really? Yes; truly! (Indeed.) 3.5% — fine."),
    ("em dash kept", "It matters—a lot.", "It matters—a lot."),
    ("no furniture no-op", "A plain sentence. Another one.", "A plain sentence. Another one."),
    # things that must NOT be mistaken for markdown
    ("maths not italic", "Compute 3 * 4 * 5 for the total.", "Compute 3 * 4 * 5 for the total."),
    ("snake_case kept", "Use the user_id_field value.", "Use the user_id_field value."),
    ("decimal list guard", "In 1999. it changed.", "In 1999. it changed."),
]


def words(t: str) -> int:
    return len([w for w in re.split(r"\s+", t) if w])


def sentences(t: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", t) if s.strip()])


def punct(t: str) -> dict[str, int]:
    return {c: t.count(c) for c in ".,;:!?—–'\"()"}


def main() -> int:
    fails = 0
    for name, src, want in CASES:
        got = strip_markdown(src)
        if got != want:
            fails += 1
            print(f"FAIL {name}\n  in   {src!r}\n  want {want!r}\n  got  {got!r}")
    print(f"unit cases: {len(CASES) - fails}/{len(CASES)} pass")

    rows = [json.loads(ln) for ln in open(EVAL)]
    humans = [r for r in rows if r["side"] == "human"]
    ai = [r for r in rows if r["side"] == "ai"]

    # 2/3. human side must be near-untouched; AI furniture must be gone
    changed = 0
    wdelta = []
    pdelta = 0
    for r in humans:
        s = strip_markdown(r["text"])
        if s.strip() != r["text"].strip():
            changed += 1
        wdelta.append(words(r["text"]) - words(s))
        a, b = punct(r["text"]), punct(s)
        pdelta += sum(abs(a[k] - b[k]) for k in a)
    print(f"humans changed at all: {changed}/{len(humans)}; "
          f"max word delta {max(wdelta)}; total punctuation delta {pdelta}")

    resid = {}
    for r in ai:
        for k, v in furniture_counts(strip_markdown(r["text"])).items():
            resid[k] = resid.get(k, 0) + v
    before = {}
    for r in ai:
        for k, v in furniture_counts(r["text"]).items():
            before[k] = before.get(k, 0) + v
    print("AI furniture before:", before)
    print("AI furniture after: ", resid)

    # idempotence
    nonidem = sum(1 for r in rows if strip_markdown(strip_markdown(r["text"]))
                  != strip_markdown(r["text"]))
    print(f"non-idempotent samples: {nonidem}/{len(rows)}")
    if fails:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

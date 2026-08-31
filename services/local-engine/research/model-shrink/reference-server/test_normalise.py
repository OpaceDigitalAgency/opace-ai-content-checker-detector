"""Tests for the md-strip-v1 input normalisation contract.

Run:  python -m pytest test_normalise.py -q
  or: python test_normalise.py

The rules are the seven substitutions of
`research/escalation-arm-2026-08-31/strip_test.py::strip_md`, in the same
order. These tests mirror that function's behaviour fixture by fixture and
additionally prove the properties the contract advertises: words kept,
paragraph breaks kept, plain prose untouched — and that the golden
segmentation cases are byte-identical either side of normalisation, which is
why SEGMENTATION_CONTRACT stays "segments-v3".
"""
from __future__ import annotations

import os
import re

from segments import (INPUT_NORMALISATION, count_words, normalise_input,
                      segment_text)


def _reference_strip(t: str) -> str:
    """strip_test.py::strip_md, copied verbatim as the oracle."""
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    t = re.sub(r"^\s*[-*+]\s+", "", t, flags=re.M)
    t = re.sub(r"^\s*\d+\.\s+", "", t, flags=re.M)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"`([^`]*)`", r"\1", t)
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    return t


FIXTURES = [
    # headings, all levels, with and without trailing space
    "# Title\nBody text here.",
    "###### Deep heading\nprose",
    "##Heading glued\nprose",
    # bullets: -, *, +, indented
    "- first item\n- second item\n",
    "* star bullet\n  + plus bullet, indented\n",
    # numbered lists, indented
    "1. one\n2. two\n   10. ten, indented\n",
    # bold before italic (order matters: **x** must become x, not *x*)
    "This is **bold** and *italic* and ***both***.",
    # inline code, empty code span
    "Run `deploy.sh` now. An empty span `` too.",
    # links: label kept, URL dropped; empty label
    "See [the docs](https://example.com/a?b=c) and [](https://x.example).",
    # mixture, the ChatGPT-copy shape
    "## Summary\n\n- **Point one** with `code`\n- Point two, see [ref](http://r)\n\n### Next\n1. step\n",
    # things that must NOT change
    "Plain prose with no syntax at all, over several words.",
    # accepted contract cost: paired asterisks in prose read as italics,
    # so "3 * 4 * 5" loses its asterisks; a lone one ("a*b") is kept
    "A sum like 3 * 4 * 5 and a lone a*b asterisk.",
    "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
    # unclosed / degenerate syntax
    "**unclosed bold and *unclosed italic",
    "`unclosed code span",
    "[label without url]",
]


def test_contract_identifier():
    assert INPUT_NORMALISATION == "md-strip-v1"


def test_matches_the_reference_strip_on_every_fixture():
    for f in FIXTURES:
        assert normalise_input(f) == _reference_strip(f), f


def test_headings_bullets_numbers_bold_code_links_stripped():
    assert normalise_input("# Title\nBody") == "Title\nBody"
    assert normalise_input("- item\n") == "item\n"
    assert normalise_input("2. two\n") == "two\n"
    assert normalise_input("**b** *i* `c` [l](u)") == "b i c l"


def test_words_are_kept():
    # Every /\S+/ word of the fixture's PROSE survives; only syntax characters
    # attached to markers go. Checked on the mixed fixture word by word.
    src = "## Summary\n\n- **Point one** with `code`\n- Point two, see [ref](http://r)\n"
    out = normalise_input(src)
    for word in ("Summary", "Point", "one", "with", "code", "two,", "see", "ref"):
        assert word in out, word


def test_paragraph_breaks_are_kept():
    src = "## H\n\nPara one.\n\nPara two."
    out = normalise_input(src)
    assert out == "H\n\nPara one.\n\nPara two."
    assert out.count("\n\n") == src.count("\n\n")


def test_plain_prose_is_untouched():
    for text in ("word " * 505, "Plain prose, no syntax.",
                 " ".join(f"w{i}" for i in range(1200))):
        assert normalise_input(text) == text


def test_idempotent_on_every_fixture():
    for f in FIXTURES:
        once = normalise_input(f)
        assert normalise_input(once) == once, f


def test_golden_segmentation_cases_are_unchanged_by_normalisation():
    """Why SEGMENTATION_CONTRACT stays segments-v3.

    The golden cases in test_segments.py carry no markdown, so normalising
    them is the identity and their boundaries cannot move. Verified against
    the real tokeniser for the 1,200-word dense golden case and the 1,020-word
    plain one, both ways, not asserted from inspection.
    """
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(
        os.environ.get("TOKENIZER_DIR", "./model/tokenizer"))

    def count_tokens(strings):
        strings = list(strings)
        if not strings:
            return []
        return [len(ids) for ids in tok(
            strings, add_special_tokens=False, truncation=False)["input_ids"]]

    for text, expected in (
            (" ".join(f"w{i}" for i in range(1200)),
             [178, 155, 155, 154, 141, 142, 143, 132]),
            (("word " * 1020).rstrip(), [510, 510])):
        assert normalise_input(text) == text
        raw = segment_text(text, count_tokens)
        norm = segment_text(normalise_input(text), count_tokens)
        assert [s.words for s in raw] == expected
        assert [(s.start, s.end, s.words, s.text) for s in raw] == \
               [(s.start, s.end, s.words, s.text) for s in norm]


def test_word_count_of_normalised_markdown_drops_only_syntax_words():
    # "- item" is two /\S+/ words raw, one normalised: the limiter and the
    # word cap therefore price the normalised (scored) text, not the raw one.
    src = "- item\n- item\n"
    assert count_words(src) == 4
    assert count_words(normalise_input(src)) == 2


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all input-normalisation tests passed")

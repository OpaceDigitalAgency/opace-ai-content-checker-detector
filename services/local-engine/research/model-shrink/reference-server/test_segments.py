"""Parity tests for segments.py against the golden cases published by
`src/lib/local-signals/segments.ts`.

Run:  python -m pytest test_segments.py -q
  or: python test_segments.py

These are not decoration. If the two implementations disagree, the same
document scores differently depending on whether the visitor used the server
or the browser, which is worse than the truncation bug segmentation replaced.

Since segments-v2 the rule is expressed in MEASURED WordPiece tokens, so these
tests need the real tokeniser — the same one app.py loads. A test that used a
stand-in counter would be testing the arithmetic and not the contract.
"""
from __future__ import annotations

import os

from transformers import AutoTokenizer

from segments import (MODEL_MAX_TOKENS, SEGMENTATION_CONTRACT,
                      SEGMENT_TOKEN_BUDGET, count_words, segment_count,
                      segment_text, scoring_order)

TOKENIZER = AutoTokenizer.from_pretrained(
    os.environ.get("TOKENIZER_DIR", "./model/tokenizer"))


def count_tokens(strings):
    strings = list(strings)
    if not strings:
        return []
    return [len(ids) for ids in TOKENIZER(
        strings, add_special_tokens=False, truncation=False)["input_ids"]]


def _doc(words: int) -> str:
    return " ".join(f"w{i}" for i in range(words))


def _segments(text: str):
    return segment_text(text, count_tokens)


# "w0 w1 w2 ..." tokenises to about 2.9 tokens a word, which is what makes it a
# useful fixture: under the v1 word rule a 3,000-word document of it was cut
# into nine 340-word segments of roughly 880 tokens each, and the tokeniser
# then threw away about 40% of every one of them. Word counts alone therefore
# no longer predict the split, and these expectations are token-driven.
GOLDEN_DOC = {
    170: [170],
    171: [171],
    200: [112, 88],
    340: [182, 158],
    341: [183, 158],
    400: [149, 126, 125],
    459: [169, 145, 145],
    460: [169, 146, 145],
    700: [161, 137, 137, 137, 128],
    1200: [178, 155, 155, 154, 141, 142, 143, 132],
}

# Plain "word word word ..." is one token a word, the other end of the range.
GOLDEN_WORD = {
    340: [340],
    505: [505],
    511: [256, 255],
    520: [260, 260],
    1020: [510, 510],
    1021: [341, 340, 340],
    3000: [500] * 6,
}


def test_contract_version():
    assert SEGMENTATION_CONTRACT == "segments-v2"


def test_golden_dense_document():
    for total, expected in GOLDEN_DOC.items():
        segs = _segments(_doc(total))
        assert [s.words for s in segs] == expected, total
        assert sum(s.words for s in segs) == total
        assert segment_count(_doc(total), count_tokens) == len(expected), total


def test_golden_plain_document():
    for total, expected in GOLDEN_WORD.items():
        text = ("word " * total).rstrip()
        segs = _segments(text)
        assert [s.words for s in segs] == expected, total
        assert sum(s.words for s in segs) == total


def test_a_document_that_fits_is_one_segment_verbatim():
    text = "  " + ("word " * 505).rstrip() + "  \n"
    segs = _segments(text)
    assert len(segs) == 1
    assert segs[0].text == text
    assert segs[0].start == 0 and segs[0].end == len(text)
    assert segs[0].tokens <= MODEL_MAX_TOKENS


def test_segments_are_contiguous_and_complete():
    for text in (_doc(3000), ("word " * 3000).rstrip(), _doc(200)):
        segs = _segments(text)
        assert segs[0].start == 0
        assert segs[-1].end == len(text)
        assert "".join(s.text for s in segs) == text
        for a, b in zip(segs, segs[1:]):
            assert a.end == b.start
            assert a.word_end == b.word_start
        assert segs[-1].word_end == count_words(text)


def test_no_segment_can_exceed_the_window():
    """The whole point of v2. Checked against the tokeniser, not against a proxy.

    v1's premise was that 340 words always fits 512 tokens. Measured over the
    5,558-document fresh long-form corpus it failed on 1,348 of 23,318 segments
    (5.78%) in 684 documents (12.31%). Under v2, 0 of 21,093.
    """
    texts = [_doc(n) for n in (170, 171, 200, 341, 460, 700, 1200, 3000)]
    texts += [("word " * n).rstrip() for n in (505, 511, 1020, 1021, 3000)]
    texts += [("hippopotomonstrosesquippedaliophobia " * 400).rstrip()]
    for text in texts:
        for seg in _segments(text):
            assert seg.tokens <= MODEL_MAX_TOKENS, (len(text), seg.tokens)
            # And the claimed count is the real one.
            assert seg.tokens == count_tokens([seg.text])[0] + 2


def test_a_word_too_big_for_the_window_is_isolated_and_split():
    """One 987-character ':;:;...' run in the corpus tokenises to 987 tokens.

    Basic tokenisation splits punctuation out before WordPiece runs, so a
    single /\\S+/ word can exceed the window on its own. It is sliced at
    SEGMENT_TOKEN_BUDGET code units and each slice gets a segment to itself.
    """
    text = ":" * 900
    segs = _segments(text)
    assert [s.tokens for s in segs] == [512, 392]
    assert [s.words for s in segs] == [1, 0]
    assert "".join(s.text for s in segs) == text
    assert all(s.tokens <= MODEL_MAX_TOKENS for s in segs)

    mixed = ":" * 900 + " " + ("word " * 200).rstrip()
    segs = _segments(mixed)
    assert all(s.tokens <= MODEL_MAX_TOKENS for s in segs)
    assert "".join(s.text for s in segs) == mixed
    assert sum(s.words for s in segs) == count_words(mixed)


def test_no_short_trailing_fragment():
    """v1 needed a rebalance rule for this; v2 gets it from equal-token splits.

    Plain merging was the original bug: it left a final segment of up to
    459 words that no longer fitted the window.
    """
    for total in range(500, 1600, 37):
        segs = _segments(("word " * total).rstrip())
        if len(segs) == 1:
            continue
        shortest, longest = min(s.tokens for s in segs), max(s.tokens for s in segs)
        assert longest - shortest <= 2, (total, [s.tokens for s in segs])


def test_word_counting_matches_the_reference_regex():
    assert count_words("  one\ttwo\n\nthree  ") == 3
    assert count_words("") == 0
    assert count_words("   ") == 0


def test_utf16_offsets_match_javascript_indices():
    """An astral character is two UTF-16 code units but one Python character."""
    text = "\U0001F600 " + _doc(700)
    segs = _segments(text)
    assert segs[0].start == 0
    assert segs[-1].end == len(text) + 1


def test_scoring_order_covers_every_segment_once():
    for count in range(0, 12):
        order = scoring_order(count)
        assert sorted(order) == list(range(count))
    assert scoring_order(9)[:3] == [4, 8, 0]


def test_budget_is_the_window_less_the_two_special_tokens():
    assert SEGMENT_TOKEN_BUDGET == MODEL_MAX_TOKENS - 2


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all segmentation parity tests passed")

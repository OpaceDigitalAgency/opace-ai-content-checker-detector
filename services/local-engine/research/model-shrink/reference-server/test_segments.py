"""Parity tests for segments.py against the golden cases published by
`src/lib/local-signals/segments.ts`.

Run:  python -m pytest test_segments.py -q
  or: python test_segments.py

These are not decoration. If the two implementations disagree, the same
document scores differently depending on whether the visitor used the server
or the browser, which is worse than the truncation bug segmentation replaced.
"""
from __future__ import annotations

from segments import (MIN_TAIL_WORDS, SEGMENT_WORDS, count_words,
                      segment_count, segment_text, scoring_order)

# word count -> segment word counts, copied verbatim from the reference file.
GOLDEN = {
    340: [340],
    341: [171, 170],
    400: [200, 200],
    459: [230, 229],
    460: [340, 120],
    700: [340, 180, 180],
    1200: [340, 340, 340, 180],
    3000: [340] * 8 + [280],
}


def _doc(words: int) -> str:
    return " ".join(f"w{i}" for i in range(words))


def test_golden_word_counts():
    for total, expected in GOLDEN.items():
        segs = segment_text(_doc(total))
        assert [s.words for s in segs] == expected, total
        assert sum(s.words for s in segs) == total
        assert segment_count(_doc(total)) == len(expected), total


def test_single_segment_is_the_input_verbatim():
    text = "  " + _doc(SEGMENT_WORDS) + "  \n"
    segs = segment_text(text)
    assert len(segs) == 1
    assert segs[0].text == text
    assert segs[0].start == 0 and segs[0].end == len(text)


def test_segments_are_contiguous_and_complete():
    text = _doc(3000)
    segs = segment_text(text)
    assert segs[0].start == 0
    assert segs[-1].end == len(text)
    assert "".join(s.text for s in segs) == text
    for a, b in zip(segs, segs[1:]):
        assert a.end == b.start
    for a, b in zip(segs, segs[1:]):
        assert a.word_end == b.word_start


def test_no_segment_can_be_truncated_by_the_tokeniser():
    """Every segment stays inside the window, including rebalanced tails."""
    for total in list(GOLDEN) + [341, 342, 458, 459, 461, 679, 681, 1019, 1021]:
        for seg in segment_text(_doc(total)):
            assert seg.words <= SEGMENT_WORDS, (total, seg.words)
            if total > SEGMENT_WORDS:
                # The floor is MIN_TAIL_WORDS: a tail of exactly 120 is kept as
                # it stands (460 -> [340, 120]), and a shorter one triggers the
                # rebalance, which cannot produce a half below SEGMENT_WORDS/2.
                assert seg.words >= MIN_TAIL_WORDS, (total, seg.words)


def test_tail_is_never_left_short_on_its_own():
    for total in range(SEGMENT_WORDS + 1, SEGMENT_WORDS * 3, 7):
        segs = segment_text(_doc(total))
        assert segs[-1].words >= MIN_TAIL_WORDS
        assert all(s.words <= SEGMENT_WORDS for s in segs)


def test_word_counting_matches_the_reference_regex():
    assert count_words("  one\ttwo\n\nthree  ") == 3
    assert count_words("") == 0
    assert count_words("   ") == 0


def test_utf16_offsets_match_javascript_indices():
    """An astral character is two UTF-16 code units but one Python character."""
    text = "\U0001F600 " + _doc(700)
    segs = segment_text(text)
    assert segs[0].start == 0
    # The document is 701 words once the emoji is counted; the final offset must
    # be the UTF-16 length, which is one greater than the Python length.
    assert segs[-1].end == len(text) + 1


def test_scoring_order_covers_every_segment_once():
    for count in range(0, 12):
        order = scoring_order(count)
        assert sorted(order) == list(range(count))
    assert scoring_order(9)[:3] == [4, 8, 0]


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all segmentation parity tests passed")

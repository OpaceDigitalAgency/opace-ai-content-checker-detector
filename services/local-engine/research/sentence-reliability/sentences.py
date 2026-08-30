"""Sentence segmentation for the per-sentence evidence layer.

REFERENCE IMPLEMENTATION NOTE
-----------------------------
Unlike `segments.py`, whose reference implementation is the TypeScript in the
website repo, this file is written first and the TypeScript is ported from it.
Whichever way the port runs, the two must agree exactly: a sentence highlight
computed in the browser and a sentence score computed on the EU server have to
land on the same characters, or the highlight sits on the wrong words.

The rules, deliberately dull:

  - A sentence ends at `.`, `!`, `?`, `…` or their doubled forms, optionally
    followed by closing quotes/brackets, and is then followed by whitespace and
    something that can open a sentence (capital, digit, opening quote/bracket).
  - Abbreviations, initials, decimals and ellipses do not end a sentence. The
    guard list is explicit rather than clever; a missed abbreviation splits one
    sentence into two, which is a cosmetic fault in a highlight layer, not a
    scoring fault.
  - Offsets are character offsets into the ORIGINAL string. Nothing is
    normalised, trimmed out of the span, or re-joined. `text[start:end]` is
    exactly the sentence.
  - Sentences shorter than MIN_SENTENCE_WORDS are still returned, with their
    offsets, but are marked `scorable=False`. A three-word sentence carries no
    measurable signal and must never be given a score of its own.

Nothing here decides what is DISPLAYED. That is settled by the measurement in
`docs/measurements/PER-SENTENCE-RELIABILITY.md`, not by this splitter.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Below this, a sentence is carried for offsets only and never scored.
# Chosen before any score was looked at, from the segmentation work's own
# observation that the model's signal is a length gradient: a fragment this
# short is not a sample of prose style, it is a label or a heading.
MIN_SENTENCE_WORDS = 5

# Tokens that end in a full stop without ending a sentence. Lower-cased compare.
_ABBREV = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "rev", "hon", "gen",
    "col", "lt", "sgt", "capt", "cmdr", "adm", "maj", "supt", "insp",
    "no", "nos", "vol", "vols", "ed", "eds", "op", "cit", "et", "al",
    "etc", "eg", "ie", "cf", "viz", "vs", "approx", "est", "fig", "figs",
    "inc", "ltd", "plc", "co", "corp", "dept", "univ", "assn", "bros",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct",
    "nov", "dec", "mon", "tue", "tues", "wed", "thu", "thur", "thurs",
    "fri", "sat", "sun",
    "am", "pm", "ca", "circa", "pp", "p", "ch", "chap", "sec", "para",
    "u.s", "u.k", "e.g", "i.e", "a.m", "p.m", "ph.d", "d.c",
}

# JavaScript's \s is a FIXED list that is not the same set as Python's
# Unicode-aware \s: Python treats U+001C to U+001F and U+0085 as whitespace and
# JavaScript does not; JavaScript treats U+FEFF as whitespace and Python does
# not. The class is spelled out so the two ports cannot disagree on a boundary,
# for exactly the reason segments.py spells its own out.
_WS = (r"[\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a"
       r"\u2028\u2029\u202f\u205f\u3000\ufeff]")

_END = r"[.!?…]"
_CLOSERS = r"[\"'”’)\]\}»]*"
_OPENERS = r"[\"'“‘(\[\{«]*"

# A candidate boundary: terminator(s), optional closers, whitespace, then an
# opener that can start a sentence.
_BOUNDARY = re.compile(
    rf"(?P<end>{_END}+){_CLOSERS}(?P<gap>{_WS}+)(?={_OPENERS}[A-Z0-9“\"'(\[])"
)

# Word counting and trimming use the SAME spelled-out class, so a word count
# and a span boundary cannot drift between the two ports either.
_WORD = re.compile(_WS.replace("[", "[^", 1) + "+")
_LEAD = re.compile(rf"^{_WS}+")
_TRAIL = re.compile(rf"{_WS}+$")
_LAST_TOKEN = re.compile(r"([A-Za-z][A-Za-z.]*)\.$")


@dataclass(frozen=True)
class Sentence:
    index: int
    start: int
    end: int
    text: str
    words: int
    scorable: bool


def _is_abbreviation(text: str, end_pos: int) -> bool:
    """True when the full stop at end_pos-1 belongs to an abbreviation."""
    head = text[:end_pos]
    m = _LAST_TOKEN.search(head)
    if not m:
        return False
    token = m.group(1).lower().rstrip(".")
    if token in _ABBREV:
        return True
    # Single initial: "J." in "J. R. R. Tolkien"
    if len(token) == 1 and token.isalpha():
        return True
    # Dotted acronym: "U.S.A."
    if "." in m.group(1):
        return True
    return False


def _is_decimal(text: str, end_pos: int) -> bool:
    """True for the stop inside 3.5 — digit, stop, digit."""
    if end_pos - 2 < 0 or end_pos >= len(text):
        return False
    return text[end_pos - 2].isdigit() and text[end_pos].isdigit()


def split_sentences(text: str) -> list[Sentence]:
    """Sentences with exact character offsets into `text`."""
    if not text:
        return []
    cuts: list[int] = []
    for m in _BOUNDARY.finditer(text):
        end_pos = m.end("end")
        if m.group("end") == "." and _is_abbreviation(text, end_pos):
            continue
        if _is_decimal(text, end_pos):
            continue
        cuts.append(m.end("gap"))

    out: list[Sentence] = []
    prev = 0
    for cut in cuts + [len(text)]:
        raw = text[prev:cut]
        if _TRAIL.sub("", _LEAD.sub("", raw)):
            # Trim trailing whitespace OUT of the span so a highlight does not
            # paint the gap between sentences, but keep leading offset exact.
            lead = len(_LEAD.match(raw).group(0)) if _LEAD.match(raw) else 0
            trail = len(_TRAIL.search(raw).group(0)) if _TRAIL.search(raw) else 0
            s, e = prev + lead, cut - trail
            body = text[s:e]
            n = len(_WORD.findall(body))
            out.append(Sentence(len(out), s, e, body, n, n >= MIN_SENTENCE_WORDS))
        prev = cut
    return out

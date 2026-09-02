"""Whole-document segmentation — the server half of the parity contract.

This is a line-for-line port of `src/lib/local-signals/segments.ts` in the
website repository, which is the reference implementation for every route. The
same document has to score the same however it was checked, so the rules below
are copied from that file's SERVER PARITY CONTRACT (v2) rather than
reinterpreted, and `test_segments.py` asserts the golden cases that file
publishes.

Why any of this exists: the classifier reads at most 512 WordPiece tokens.
Before segmentation a 3,000-word draft was judged entirely on its opening.
Measured through the browser runtime on 45 AI and 45 human long-form documents
at the shipped 0.984 flag point:

    opening only ....................... 88.9% AI detected (40/45)
    every segment, take the highest .... 93.3% AI detected (42/45)
    every segment, averaged ............ 57.8% AI detected (26/45)

so the aggregation is the MAXIMUM, never the mean. Averaging washes one AI
section out against the human sections around it.

WHY v2 REPLACED THE WORD-COUNT RULE (measured 29 August 2026)
-------------------------------------------------------------
v1 cut every 340 words on the premise that 340 words always fits inside 512
WordPiece tokens. It does not. Measured over the whole 5,558-document fresh
long-form corpus, tokenising each v1 segment without truncation:

    segments at or over the 512-token window ... 1,348 of 23,318 (5.78%)
    documents with at least one such segment ...   684 of  5,558 (12.31%)
    worst single segment ....................... 3,406 tokens (2,894 dropped)
    tokens silently dropped, corpus-wide ....... 276,466 of 9,287,413 (2.98%)

Word-to-token expansion ran from 1.04 to 3.89 tokens per word across that
corpus. The proxy fails exactly where the tool is weakest anyway: AI academic
literature reviews (26.2% of documents affected) and white papers (25.2%).

v2 therefore bounds segments by MEASURED TOKENS, not by words, so the defect
that segmentation exists to remove cannot recur. The tail-rebalancing special
case of v1 disappears into the general rule: segments are as near equal in
tokens as word boundaries allow, so a short trailing fragment can no longer
occur.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Sequence

# Bump in lockstep with the TypeScript constant when any rule changes. Both
# routes record it beside the score so a disagreement is diagnosable.
#
# v3 (2026-08-29) does NOT change how text is cut. The boundaries, the token
# budget and the character offsets are all byte-identical to v2. What changed
# is how the section scores combine into a verdict: minimum evidence, flag on
# the highest section OR the second-highest at a lower point. The contract
# covers verdict derivation as well as segmentation, because the front end
# re-derives the verdict from the sections and would otherwise silently accept
# a server applying a different rule. Bumping it makes a partial deploy refuse
# loudly instead. Deploy the server first, then the site.
SEGMENTATION_CONTRACT = "segments-v3"

# Cycle 5 was trained and evaluated on raw input; any stripping would change
# both the encoder input and the structural features.
INPUT_NORMALISATION = "raw-v1"


def normalise_input(text: str) -> str:
    """raw-v1 is deliberately the identity transform."""
    return text

# The classifier's context window, and the two special tokens every pass
# spends on [CLS] and [SEP]. SEGMENT_TOKEN_BUDGET is what is left for text.
MODEL_MAX_TOKENS = 512
SPECIAL_TOKENS = 2
SEGMENT_TOKEN_BUDGET = MODEL_MAX_TOKENS - SPECIAL_TOKENS       # 510

# Typical segment length in words at the shipped budget, for interface copy
# only. Measured median over the 5,558-document corpus; nothing branches on it.
TYPICAL_SEGMENT_WORDS = 380

# The TypeScript side uses /\S+/gu, and JavaScript's \s is a FIXED list that
# is not the same set as Python's Unicode-aware \s. Python treats U+001C to
# U+001F and U+0085 as whitespace and JavaScript does not; JavaScript treats
# U+FEFF as whitespace and Python does not. Measured over the 5,558-document
# fresh long-form corpus, `r"\S+"` disagreed with the browser on the word
# counts of 6 documents (0.11%) — enough for the front end's drift guard to
# refuse the server's answer on those documents. The class is therefore spelled
# out to be exactly JavaScript's, because segments.ts is the reference
# implementation and the browser is what ships.
_WORD = re.compile("[^\t\n\v\f\r \u00a0\u1680\u2000-\u200a"
                   "\u2028\u2029\u202f\u205f\u3000\ufeff]+")

# A WordPiece token never consumes fewer than one code point of the text it
# came from, so a slice of at most SEGMENT_TOKEN_BUDGET code points can never
# tokenise to more than SEGMENT_TOKEN_BUDGET tokens. That is the guarantee the
# oversized-word fallback below rests on.
_MAX_ATOM_CHARS = SEGMENT_TOKEN_BUDGET

TokenCounter = Callable[[Sequence[str]], Sequence[int]]


@dataclass(frozen=True)
class Segment:
    index: int
    start: int          # UTF-16 code unit offset, to match the browser
    end: int            # UTF-16 code unit offset, exclusive
    words: int
    word_start: int     # word index, inclusive
    word_end: int       # word index, exclusive
    text: str
    tokens: int         # measured WordPiece tokens INCLUDING [CLS] and [SEP]


def count_words(text: str) -> int:
    """Words as the reference implementation counts them: matches of /\\S+/."""
    return sum(1 for _ in _WORD.finditer(text))


def _utf16_offsets(text: str, offsets: list[int]) -> list[int]:
    """Convert Python code-point offsets to UTF-16 code unit offsets.

    JavaScript string indices count UTF-16 code units, so a document containing
    an emoji or any other astral character would otherwise produce boundaries
    that the browser and the server disagree about by one per such character.
    The common case is pure BMP text, where the two are identical and this
    costs a single scan.
    """
    if all(ord(ch) < 0x10000 for ch in text):
        return list(offsets)
    return [len(text[:off].encode("utf-16-le")) // 2 for off in offsets]


def _atoms(text: str, count_tokens: TokenCounter):
    """The indivisible units segmentation packs: one per word, normally.

    A word is a match of /\\S+/. Whole-document tokenisation decomposes exactly
    across those boundaries — verified token-for-token on all 5,558 documents
    of the fresh long-form corpus and on the eight golden texts — so a
    segment's token count is the sum of its words' token counts.

    A single word can nonetheless blow the window on its own, because BERT
    basic tokenisation splits punctuation out of a word before WordPiece runs:
    one 987-character `:;:;:;...` run in the corpus tokenises to 987 tokens.
    Such a word is cut into consecutive slices of at most SEGMENT_TOKEN_BUDGET
    code points, each of which is forced into a segment by itself. That fires
    on 1 word in 6,916,005 measured, and exists so the guarantee is a proof
    rather than an observation.

    Returns (spans, token_counts, word_flags, forced) where `forced[i]` is True
    when atom i must not share a segment with its neighbours.
    """
    words = [(m.start(), m.end(), m.group(0)) for m in _WORD.finditer(text)]
    counts = list(count_tokens([w[2] for w in words]))
    spans: list[tuple[int, int]] = []
    tokens: list[int] = []
    is_word_start: list[bool] = []
    forced: list[bool] = []
    oversized: list[tuple[int, int]] = []
    for (start, end, _word), n in zip(words, counts):
        if n <= SEGMENT_TOKEN_BUDGET:
            spans.append((start, end))
            tokens.append(n)
            is_word_start.append(True)
            forced.append(False)
            continue
        first = True
        at = start
        while at < end:
            stop = min(at + _MAX_ATOM_CHARS, end)
            spans.append((at, stop))
            oversized.append((len(spans) - 1, at, stop))
            is_word_start.append(first)
            forced.append(True)
            tokens.append(0)                 # filled in below, in one batch
            first = False
            at = stop
    if oversized:
        measured = list(count_tokens([text[a:b] for _i, a, b in oversized]))
        for (i, _a, _b), n in zip(oversized, measured):
            tokens[i] = n
    return spans, tokens, is_word_start, forced


def _cuts_for(cum: list[int], total_tokens: int, parts: int,
              forced_cuts: list[int], atom_count: int) -> list[int]:
    """Atom indices to cut after, for a `parts`-way near-equal split by tokens.

    Cut j falls at the first atom whose running token total reaches
    j / parts of the document's total. Integer arithmetic only, so the two
    implementations cannot drift on a rounding rule. Cuts are forced strictly
    increasing, and unioned with the boundaries an oversized word demands.
    """
    cuts: list[int] = []
    previous = 0
    for j in range(1, parts):
        target = j * total_tokens
        at = previous + 1
        while at < atom_count and cum[at] * parts < target:
            at += 1
        # Leave room for the cuts still to come, so a `parts`-way split always
        # yields exactly `parts` segments. At parts == atom_count this pins
        # cut j to atom j, giving one atom per segment — which is what makes
        # the widening loop in segment_text provably terminate.
        ceiling = atom_count - (parts - j)
        if at > ceiling:
            at = ceiling
        cuts.append(at)
        previous = at
    merged = sorted(set(cuts) | set(forced_cuts))
    return [c for c in merged if 0 < c < atom_count]


def segment_text(text: str, count_tokens: TokenCounter) -> list[Segment]:
    """Consecutive, non-overlapping segments covering the whole text.

    The rule, in full:

      1. Words are the matches of /\\S+/ over the raw text. Nothing is
         normalised, lower-cased or stripped first.
      2. Every word is tokenised and its token count measured. A word too big
         for the window on its own is cut into slices (see `_atoms`); every
         other word is one atom.
      3. If the whole document fits — measured tokens plus [CLS] and [SEP] at
         or under MODEL_MAX_TOKENS — there is exactly ONE segment: start 0,
         end len(text), text identical to the input byte for byte. Short
         drafts therefore score exactly as they did before segmentation
         existed, and v2 keeps whole documents that v1 would have split.
      4. Otherwise the document is cut into the FEWEST segments that all fit:
         start at ceil(total / budget) parts, cut at near-equal token shares
         (see `_cuts_for`), MEASURE each resulting segment, and if any exceeds
         the budget add one more part and repeat. This terminates because at
         `atom_count` parts every segment is a single atom, and every atom is
         at or under the budget by construction.
      5. Character boundaries: the first segment starts at 0; a segment ends at
         the end offset of its last atom, except the final segment which ends
         at len(text); each segment starts where the previous one ended.
         Segments are contiguous and cover every character exactly once,
         whitespace included, which is what lets the interface highlight the
         passage a score came from.
      6. The document verdict is the MAXIMUM segment probability, never the
         mean. Scoring order is free — see `scoring_order`.
    """
    spans, tokens, is_word_start, forced = _atoms(text, count_tokens)
    atom_count = len(spans)
    cum = [0]
    for n in tokens:
        cum.append(cum[-1] + n)
    total = cum[-1]

    if total + SPECIAL_TOKENS <= MODEL_MAX_TOKENS and not any(forced):
        end16 = _utf16_offsets(text, [len(text)])[0]
        words = sum(1 for f in is_word_start if f)
        return [Segment(0, 0, end16, words, 0, words, text,
                        total + SPECIAL_TOKENS)]

    # An oversized word must be alone in its segment: cut before and after it.
    forced_cuts = sorted({i for i, f in enumerate(forced) if f}
                         | {i + 1 for i, f in enumerate(forced) if f})

    parts = max(1, -(-total // SEGMENT_TOKEN_BUDGET))
    while True:
        cuts = _cuts_for(cum, total, parts, forced_cuts, atom_count)
        edges = cuts + [atom_count]
        starts_cp = [0] + [spans[c - 1][1] for c in cuts]
        ends_cp = [spans[c - 1][1] for c in cuts] + [len(text)]
        pieces = [text[a:b] for a, b in zip(starts_cp, ends_cp)]
        measured = [n + SPECIAL_TOKENS for n in count_tokens(pieces)]
        if all(n <= MODEL_MAX_TOKENS for n in measured) or parts >= atom_count:
            break
        parts += 1

    all16 = _utf16_offsets(text, starts_cp + ends_cp)
    starts16 = all16[:len(starts_cp)]
    ends16 = all16[len(starts_cp):]

    segments: list[Segment] = []
    first_atom = 0
    first_word = 0
    for i, last_atom in enumerate(edges):
        words = sum(1 for f in is_word_start[first_atom:last_atom] if f)
        segments.append(Segment(
            index=i,
            start=starts16[i],
            end=ends16[i],
            words=words,
            word_start=first_word,
            word_end=first_word + words,
            text=pieces[i],
            tokens=measured[i],
        ))
        first_atom = last_atom
        first_word += words
    return segments


def scoring_order(count: int) -> list[int]:
    """The order segments are scored in, which is not the order they are shown.

    The verdict is the maximum, so order cannot change the answer. On the
    server it matters less than in the browser — there is no progressive
    rendering — but keeping the same order means a timeout under load truncates
    the work at the same place both routes would, and the middle and the end
    carry the signal in the case this whole change exists for: a hand-polished
    human opening in front of an AI body.
    """
    if count <= 1:
        return [0] if count == 1 else []
    order: list[int] = []
    seen: set[int] = set()
    for index in ((count - 1) // 2, count - 1, 0):
        if 0 <= index < count and index not in seen:
            seen.add(index)
            order.append(index)
    for index in range(count):
        if index not in seen:
            seen.add(index)
            order.append(index)
    return order


def segment_count(text: str, count_tokens: TokenCounter) -> int:
    """How many inferences a document will cost.

    The rate limiter needs the price before it decides whether to sell. Under
    v1 this could be answered from a word count alone; under v2 the price
    depends on measured tokens, so it costs one tokenisation of the document.
    That is microseconds beside the forward passes it is pricing.
    """
    return len(segment_text(text, count_tokens))


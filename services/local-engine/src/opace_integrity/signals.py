"""The measured passage signals drawn by "What the model measured".

A hand-kept port of `measurePassageOverlap`, `measurePassageSignals` and `explainSectionSignals`
in `shared/presentation/checker-result-presentation.mjs` (Lane D3 section 4). That module is the
source of truth; this file is the Python engine's mirror of it, in the same way `report.py` mirrors
`CHECKER_REPORT_CSS`. Lane D2/D3 announce any change to the references in `shared/STATUS.md`.

Every median, AUROC figure and basis sentence below is quoted verbatim from
`PASSAGE_SIGNAL_REFERENCES` in that module, which in turn quotes
`docs/research-drafts/burstiness-does-not-work.md`, which quotes `SIGNAL-SCIENCE.md` section 2 and
`tables/famous-heuristics.md`. Nothing here is estimated, rounded to taste or carried over from
another product.

Sentence-length evenness is deliberately drawn with **no** typical-AI and no typical-human marker:
this project measured the most famous signal in the category and found it at chance, so there is no
separation to mark and inventing a pair would be worse than saying so.

None of these numbers sets or moves a level. The level came from the trained model, which reads the
passage whole; these are what stand out when the same passage is measured.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

MATTR_WINDOW = 100


@dataclass(frozen=True)
class SignalReference:
    """One signal's reference points, exactly as the shared module holds them."""

    label: str
    ai_median: float | None
    human_median: float | None
    auroc: float
    basis: str


PASSAGE_SIGNAL_REFERENCES: dict[str, SignalReference] = {
    "adjacent_overlap": SignalReference(
        label="Word re-use between neighbouring sentences",
        ai_median=2.1,
        human_median=6.3,
        auroc=0.912,
        basis="medians over 670 matched pairs of long-form documents; this is the signal that separates the two populations best",
    ),
    "vocabulary_variety": SignalReference(
        label="Vocabulary variety across the passage",
        ai_median=0.776,
        human_median=0.694,
        auroc=0.911,
        basis="moving-average type-token ratio over 100-word windows; medians over the same 670 matched pairs",
    ),
    "sentence_length_cv": SignalReference(
        label="Sentence-length evenness",
        ai_median=None,
        human_median=None,
        auroc=0.521,
        basis="measured on 5,935 matched pairs: AUROC 0.521 against 0.500 for chance, catching 2.5% of machine documents at a 1% false-positive budget",
    ),
}

METER_NOTES = {
    "adjacent_overlap": "How much of each sentence's vocabulary carries over into the next one. Human writing tends to keep a thread of repeated terms; a model reaches for a fresh word more often.",
    "vocabulary_variety": "How many different words the passage uses for its length. A model tends to reach for a synonym where a person repeats the term they started with.",
    "sentence_length_cv": "The best-known way to spot machine writing, and the one we measured at chance: machine prose varies its sentence lengths very slightly more than human prose, not less. It is drawn here because it is worth seeing, and it is drawn with no typical-AI or typical-human marker because there is no separation to mark.",
}


@dataclass(frozen=True)
class SignalMeter:
    """One drawn meter: a measured value, its scale and the two reference points beside it."""

    id: str
    label: str
    unit: str
    value: float
    scale_min: float
    scale_max: float
    ai_median: float | None
    human_median: float | None
    auroc: float
    basis: str
    note: str
    informative: bool = True
    marks: tuple = field(default=(), repr=False)


# ------------------------------------------- word re-use between neighbours

MEASURE_STOPWORDS = frozenset(
    "the and that this with from have has had for are was were will would could should can may "
    "might been being but not you your our their they them its his her she him who what when "
    "where which while than then there here these those into onto over under about after before "
    "between through also more most some such only just very each other any all one two how why "
    "out off own same too did does doing because against during without within upon among".split()
)

_MEASURE_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+")
_MEASURE_WORD_RE = re.compile(r"[^\W_](?:[^\W_]|['’-])*", re.UNICODE)


def _measure_sentences(text: str) -> list[str]:
    parts = [part.strip() for part in _MEASURE_SENTENCE_SPLIT.split(str(text or ""))]
    return [part for part in parts if len(part.split()) >= 3]


def _measure_content_words(sentence: str) -> set[str]:
    words = _MEASURE_WORD_RE.findall(sentence.lower())
    return {word for word in words if len(word) >= 4 and word not in MEASURE_STOPWORDS}


def measure_passage_overlap(passage) -> float | None:
    """The share of content words repeated between neighbouring sentences, as a percentage.

    A passage of fewer than three usable sentences returns ``None`` and the meter is not drawn,
    rather than being estimated from too little text.
    """
    sentences = _measure_sentences(passage if isinstance(passage, str) else "")
    if len(sentences) < 3:
        return None
    sets = [_measure_content_words(sentence) for sentence in sentences]
    shared = 0.0
    pairs = 0
    for first, second in zip(sets, sets[1:]):
        if not first or not second:
            continue
        common = len(first & second)
        shared += common / ((len(first) + len(second)) / 2)
        pairs += 1
    if not pairs:
        return None
    return round((shared / pairs) * 100, 1)


# ------------------------- vocabulary variety and sentence-length evenness

# The study's own word and sentence rules, so the engine computes what was measured.
_SIGNAL_WORD_RE = re.compile(r"[A-Za-zÀ-ɏ']+")
_SIGNAL_SENTENCE_SPLIT = re.compile(
    r"(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)"
    r"(?<=[.!?])[\"'”’)\]]*\s+(?=[\"'“‘(\[]*[A-Z0-9])"
)


def _signal_sentences(text) -> list[str]:
    """Split on bare newlines first, then within each line.

    Ported from `features.py::_sentences` by way of
    `packages/cycle5-browser/src/reference/document-tells.ts`: a hard line-wrap with no terminal
    punctuation is always a boundary, which is the training-time behaviour.
    """
    out: list[str] = []
    for line in str(text or "").split("\n"):
        trimmed_line = line.strip()
        if not trimmed_line:
            continue
        for sentence in _SIGNAL_SENTENCE_SPLIT.split(trimmed_line):
            trimmed = sentence.strip()
            if trimmed:
                out.append(trimmed)
    return out


def _signal_words(text) -> list[str]:
    return [word.lower() for word in _SIGNAL_WORD_RE.findall(str(text or ""))]


def _population_cv(values: list[int]) -> float | None:
    """Population coefficient of variation, the measurement's own cv() (pstdev/mean)."""
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    if not mean:
        return None
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    return math.sqrt(variance) / mean


def _mattr(words: list[str]) -> float | None:
    """Moving-average type-token ratio: the mean unique-word share over 100-word windows."""
    if len(words) < MATTR_WINDOW:
        return None
    counts: dict[str, int] = {}
    distinct = 0
    total = 0.0
    windows = 0
    for index, entering in enumerate(words):
        seen = counts.get(entering, 0)
        counts[entering] = seen + 1
        if seen == 0:
            distinct += 1
        if index >= MATTR_WINDOW:
            leaving = words[index - MATTR_WINDOW]
            left = counts[leaving] - 1
            counts[leaving] = left
            if left == 0:
                distinct -= 1
        if index >= MATTR_WINDOW - 1:
            total += distinct / MATTR_WINDOW
            windows += 1
    return total / windows if windows else None


def _round(value: float, places: int) -> float:
    """Round half away from zero, the way JavaScript's Math.round does, so the two agree."""
    factor = 10**places
    scaled = value * factor
    return math.floor(scaled + 0.5) / factor


def measure_section_signals(passage) -> list[SignalMeter]:
    """Every signal that can be measured on one passage, in the order the shared renderer draws them.

    A signal whose passage is too short for an honest reading is left out rather than estimated:
    word re-use needs three usable sentences, vocabulary variety needs 100 words and sentence-length
    evenness needs four sentences. A short passage therefore shows fewer meters, never an invented
    one.
    """
    text = passage if isinstance(passage, str) else ""
    meters: list[SignalMeter] = []

    overlap = measure_passage_overlap(text)
    if overlap is not None:
        reference = PASSAGE_SIGNAL_REFERENCES["adjacent_overlap"]
        meters.append(
            SignalMeter(
                id="adjacent_overlap",
                label=reference.label,
                unit="%",
                value=overlap,
                scale_min=0,
                scale_max=10,
                ai_median=reference.ai_median,
                human_median=reference.human_median,
                auroc=reference.auroc,
                basis=reference.basis,
                note=METER_NOTES["adjacent_overlap"],
            )
        )

    variety = _mattr(_signal_words(text))
    if variety is not None:
        reference = PASSAGE_SIGNAL_REFERENCES["vocabulary_variety"]
        meters.append(
            SignalMeter(
                id="vocabulary_variety",
                label=reference.label,
                unit="",
                value=_round(variety, 3),
                scale_min=0.6,
                scale_max=0.95,
                ai_median=reference.ai_median,
                human_median=reference.human_median,
                auroc=reference.auroc,
                basis=reference.basis,
                note=METER_NOTES["vocabulary_variety"],
            )
        )

    lengths = [
        len(_SIGNAL_WORD_RE.findall(sentence))
        for sentence in _signal_sentences(text)
    ]
    lengths = [count for count in lengths if count > 0]
    cv = _population_cv(lengths) if len(lengths) >= 4 else None
    if cv is not None:
        reference = PASSAGE_SIGNAL_REFERENCES["sentence_length_cv"]
        meters.append(
            SignalMeter(
                id="sentence_length_cv",
                label=reference.label,
                unit="",
                value=_round(cv, 2),
                scale_min=0,
                scale_max=1,
                ai_median=None,
                human_median=None,
                auroc=reference.auroc,
                basis=reference.basis,
                note=METER_NOTES["sentence_length_cv"],
                informative=False,
            )
        )

    return meters


# ------------------------------------------------- why it reads this way

_AI_SIDE_LEVELS = ("signal-strongly-ai", "signal-likely-ai", "signal-potentially-ai")

LEAN_PHRASES = {
    "adjacent_overlap": {
        "ai": "it re-uses fewer words between neighbouring sentences than people typically do",
        "human": "it re-uses words between neighbouring sentences the way people typically do",
    },
    "vocabulary_variety": {
        "ai": "its vocabulary is more varied for its length than people typically write",
        "human": "its vocabulary is about as varied for its length as people typically write",
    },
}


def signal_lean(meter: SignalMeter) -> tuple[str, float] | None:
    """Which way a meter leans and by how far.

    1 is exactly at the typical-AI median, 0 at the typical-human one. A signal with no measured
    separation has no lean and is never named as a reason.
    """
    if not meter.informative or meter.ai_median is None or meter.human_median is None:
        return None
    span = meter.ai_median - meter.human_median
    if not span:
        return None
    position = (meter.value - meter.human_median) / span
    return ("ai" if position >= 0.5 else "human", abs(position - 0.5))


def _join_phrases(parts: list[str]) -> str:
    if len(parts) == 1:
        return parts[0]
    return f"{', '.join(parts[:-1])} and {parts[-1]}"


def explain_section_signals(meters: list[SignalMeter], level, level_label: str) -> str:
    """The two or three measured signals that lean the way the reading went, named and ranked.

    It never claims a signal produced the reading. The trained model produced it; these are what
    stand out when the same passage is measured. Where nothing leans that way the paragraph says so
    rather than reaching for "other patterns".
    """
    ai_side = str(level) in _AI_SIDE_LEVELS
    human_side = str(level) == "signal-likely-human"
    leaning = [(meter, lean) for meter, lean in ((meter, signal_lean(meter)) for meter in meters) if lean]
    leaning.sort(key=lambda entry: entry[1][1], reverse=True)
    if not leaning:
        return (
            "None of the signals we can measure on a passage this length has a reference to compare"
            " against, so there is nothing here to name. The reading above is the model's, taken"
            " from the passage as a whole."
        )
    if not ai_side and not human_side:
        towards_ai = sum(1 for _, lean in leaning if lean[0] == "ai")
        split = (
            f" {towards_ai} of the {len(leaning)} lean towards AI writing and the rest towards human writing."
            if towards_ai and towards_ai < len(leaning)
            else ""
        )
        return (
            "The measured signals here do not agree with each other, which is one reason the model"
            f" could not commit either way.{split} They did not set the reading; the model did."
        )
    wanted = "ai" if ai_side else "human"
    agreeing = [entry for entry in leaning if entry[1][0] == wanted][:3]
    if not agreeing:
        return (
            f"None of the signals we can measure on this passage leans towards {level_label}. The"
            " reading above rests on patterns across the whole passage: the mix of sentence shapes"
            " and word choices the model was trained to recognise, which are too diffuse to point"
            " at one line. Nothing on this list set the reading; the model did."
        )
    phrases = [
        LEAN_PHRASES.get(meter.id, {}).get(wanted, f"its {meter.label.lower()} leans that way")
        for meter, _ in agreeing
    ]
    if len(agreeing) == 1:
        return (
            f"One measured signal leans the way this reading went: {phrases[0]}. It did not set the"
            " reading. The model reads the passage whole, and this is what stands out when the same"
            " passage is measured."
        )
    count = ["", "One", "Two", "Three"][len(agreeing)]
    return (
        f"{count} measured signals lean the way this reading went: {_join_phrases(phrases)}. The"
        f" clearest is {agreeing[0][0].label.lower()}. They did not set the reading. The model reads"
        " the passage whole, and these are what stand out when the same passage is measured."
    )

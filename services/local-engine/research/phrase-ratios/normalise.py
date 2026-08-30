"""Spelling normalisation applied to BOTH corpora before any phrase is counted.

Why this exists. The first ranking run put "per cent of", "per cent in" and
"cent of the" at the top of the table, at 30x, 28x and 28x. They are not
machine tells. Measured over the two corpora:

    "per cent" appears in 29.9% of our AI documents and 1.4% of the human ones
    "-our" spellings in 47.2% against 11.6%

Our AI half was generated in British English; the human half is largely
American or mixed. A phrase table built on the raw text ranks a spelling
convention as the strongest evidence of machine authorship, which is precisely
the failure this panel was supposed to avoid: it would look authoritative, it
would be quotable, and it would be wrong.

Normalising to one convention on both sides removes the artefact from the
counts. It does NOT remove every corpus artefact, and nothing here should be
read as making the table safe on its own — the register control in rank.py is
the other half, and the limitation still has to be printed beside anything that
ships.
"""
import re

_PAIRS = [
    (r"\bper cent\b", "percent"),
    (r"\bpercentage\b", "percentage"),
]
_SUFFIX = [
    (re.compile(r"\b(\w+?)isation\b"), r"\1ization"),
    (re.compile(r"\b(\w+?)ise\b"), r"\1ize"),
    (re.compile(r"\b(\w+?)ised\b"), r"\1ized"),
    (re.compile(r"\b(\w+?)ising\b"), r"\1izing"),
    (re.compile(r"\b(\w+?)iser\b"), r"\1izer"),
]
_WORDS = {
    "colour": "color", "colours": "colors", "coloured": "colored",
    "behaviour": "behavior", "behaviours": "behaviors", "behavioural": "behavioral",
    "favour": "favor", "favours": "favors", "favoured": "favored", "favourable": "favorable",
    "labour": "labor", "honour": "honor", "neighbour": "neighbor", "neighbours": "neighbors",
    "centre": "center", "centres": "centers", "theatre": "theater", "metre": "meter",
    "metres": "meters", "fibre": "fiber", "litre": "liter",
    "defence": "defense", "offence": "offense", "licence": "license", "practise": "practice",
    "programme": "program", "programmes": "programs",
    "analyse": "analyze", "analysed": "analyzed", "analysing": "analyzing",
    "catalogue": "catalog", "dialogue": "dialog",
    "travelled": "traveled", "travelling": "traveling", "modelled": "modeled",
    "modelling": "modeling", "labelled": "labeled", "labelling": "labeling",
    "whilst": "while", "amongst": "among", "towards": "toward",
    "learnt": "learned", "spelt": "spelled", "burnt": "burned",
    "sceptical": "skeptical", "sceptic": "skeptic",
    "grey": "gray", "storey": "story", "kerb": "curb",
}
_WORD_RE = re.compile(r"\b(" + "|".join(sorted(_WORDS, key=len, reverse=True)) + r")\b")


def normalise(text: str) -> str:
    out = text
    for pat, rep in _PAIRS:
        out = re.sub(pat, rep, out, flags=re.I)
    out = _WORD_RE.sub(lambda m: _WORDS[m.group(1)], out)
    for rx, rep in _SUFFIX:
        out = rx.sub(rep, out)
    return out

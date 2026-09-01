"""Synthetic-cadence signals: deterministic, local, no model and no network.

The claim under test is the owner's: that humanised AI writing has a paragraph-level
rhythm — compact self-contained sentences arranged into the same small set of
rhetorical shapes, closing on instructions, with the conversational mess removed.

Everything here is computed from lexicons, punctuation, sentence-initial shape and
approximated part of speech. There is no dependency beyond the standard library
(numpy is used only by the analysis scripts, not by this module), so the whole
module is portable to TypeScript if it ever earns a place in the product.

Sentence roles are APPROXIMATED. They are not a discourse parse and must not be
described as one. The approximation is deliberately crude and deliberately fixed:
a rule the reader can check by eye against the text is worth more here than an
accurate one nobody can audit.
"""

from __future__ import annotations

import math
import re
import random
from collections import Counter
from dataclasses import dataclass, field

# --------------------------------------------------------------------------
# Lexicons
# --------------------------------------------------------------------------

# Verbs common enough to open an imperative in published prose. A sentence that
# starts with one of these, with no subject in front of it, is read as an
# instruction. Base forms only.
IMPERATIVE_VERBS = {
    "write", "separate", "check", "decide", "ask", "compare", "choose", "use",
    "avoid", "consider", "start", "keep", "make", "ensure", "focus", "set",
    "review", "plan", "list", "add", "remove", "treat", "look", "note", "take",
    "put", "get", "define", "identify", "measure", "test", "build", "map",
    "record", "confirm", "agree", "include", "prioritise", "prioritize", "read",
    "think", "remember", "imagine", "consult", "contact", "call", "visit", "try",
    "begin", "stop", "watch", "find", "give", "send", "bring", "leave", "let",
    "pick", "select", "apply", "assess", "evaluate", "explain", "describe",
    "state", "name", "show", "tell", "expect", "allow", "aim", "work", "run",
    "draft", "publish", "share", "track", "monitor", "verify", "document",
    "budget", "quote", "price", "specify", "request", "require", "reduce",
    "improve", "increase", "protect", "secure", "update", "replace", "revisit",
    "weigh", "balance", "match", "align", "clarify", "confirm", "capture",
}

# Present-tense verbs that carry the "this thing does something useful" voice.
UTILITY_VERBS = {
    "affects", "affect", "changes", "change", "reduces", "reduce", "improves",
    "improve", "helps", "help", "ensures", "ensure", "determines", "determine",
    "drives", "drive", "covers", "cover", "includes", "include", "requires",
    "require", "depends", "depend", "means", "mean", "matters", "matter",
    "supports", "support", "enables", "enable", "prevents", "prevent",
    "increases", "increase", "lowers", "lower", "shapes", "shape", "delivers",
    "deliver", "provides", "provide", "creates", "create", "allows", "allow",
    "offers", "offer", "adds", "add", "brings", "bring", "makes", "make",
    "gives", "give", "saves", "save", "costs", "cost", "takes", "take",
    "needs", "need", "sets", "set", "builds", "build", "leads", "lead",
    "informs", "inform", "guides", "guide", "reflects", "reflect", "signals",
    "signal", "indicates", "indicate", "boosts", "boost", "strengthens",
    "strengthen", "limits", "limit", "avoids", "avoid", "protects", "protect",
    "streamlines", "streamline", "influences", "influence", "reveals", "reveal",
    "explains", "explain", "shows", "show", "raises", "raise", "cuts", "cut",
    "speeds", "speed", "clarifies", "clarify", "removes", "remove",
}

# Auxiliaries and copulas — used to find the first finite verb of a sentence.
AUX_VERBS = {
    "is", "are", "was", "were", "be", "been", "being", "am",
    "has", "have", "had", "do", "does", "did",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must",
}

MODAL_DEONTIC = {"should", "must", "need", "needs", "ought"}

# Connectives whose absence is the fingerprint of an anti-AI style instruction.
# BANNED is the owner's own house-prompt ban list plus its close relatives.
DISCOURSE_BANNED = [
    "furthermore", "moreover", "nonetheless", "nevertheless", "notably", "thus",
    "ultimately", "on the other hand", "consequently", "accordingly", "hence",
    "indeed", "in conclusion", "additionally", "crucially", "importantly",
    "arguably", "that said", "in essence", "delve", "it is worth noting",
    "it's worth noting", "in today's", "overall,",
]

# The wider inventory of discourse markers a normal writer reaches for.
DISCOURSE_ALL = DISCOURSE_BANNED + [
    "however", "therefore", "meanwhile", "similarly", "likewise", "conversely",
    "besides", "instead", "in addition", "in contrast", "by contrast",
    "in fact", "for instance", "for example", "in short", "in practice",
    "in particular", "as a result", "to sum up", "finally", "lastly",
    "subsequently", "alternatively", "equally", "admittedly", "granted",
    "of course", "naturally", "clearly", "evidently", "presumably",
    "incidentally", "otherwise", "first of all", "secondly", "thirdly",
    "at the same time", "even so", "after all", "on balance", "in other words",
]

CONTRAST_MARKERS = [
    " but ", " however", " though", " although", " yet ", " whereas ",
    " while ", " rather than ", " not always", " does not always",
    " is not a ", " is not the ", " instead of ", " unlike ", " despite ",
    " even so", " on the other hand",
]

EXAMPLE_MARKERS = [
    "for example", "for instance", "such as", "e.g.", "including ",
    "say, ", "like a ", "take the ", "consider the ",
]

CONSEQUENCE_OPENERS = [
    "otherwise", "so ", "as a result", "that means", "this means",
    "the result is", "therefore", "then ", "consequently", "in short",
    "the effect is", "which is why", "that is why",
]

HEDGES = [
    "perhaps", "maybe", "sort of", "kind of", "arguably", "obviously",
    "of course", "i think", "we think", "in my experience", "honestly",
    "frankly", "actually", "pretty much", "more or less", "admittedly",
    "oddly", "curiously", "strangely", "funnily", "i suspect", "i'd say",
    "to be fair", "if anything", "not entirely", "i suppose", "somewhat",
    "roughly", "broadly", "loosely", "in a sense",
]

FIRST_SECOND_PERSON = {
    "i", "me", "my", "mine", "we", "us", "our", "ours", "you", "your", "yours",
    "i'm", "i've", "i'd", "i'll", "we're", "we've", "you're", "you've",
}

# Head-noun endings that read as abstract.
ABSTRACT_SUFFIXES = (
    "tion", "sion", "ment", "ity", "ance", "ence", "ness", "ship", "ology",
    "ism", "age", "ure", "cy", "ing",
)

ABSTRACT_NOUNS = {
    "cost", "costs", "count", "effort", "work", "price", "prices", "quality",
    "scope", "budget", "process", "model", "platform", "approach", "strategy",
    "structure", "content", "design", "page", "pages", "site", "sites", "data",
    "research", "evidence", "team", "business", "value", "risk", "time",
    "result", "results", "outcome", "outcomes", "choice", "decision", "factor",
    "feature", "features", "work", "detail", "details", "brief", "spec",
    "policy", "practice", "method", "system", "tool", "tools", "rate", "rates",
    "level", "levels", "scale", "range", "share", "growth", "demand", "supply",
    "market", "sector", "product", "service", "services", "support", "success",
    "failure", "impact", "effect", "change", "role", "aim", "goal", "target",
}

CLAUSE_MARKERS = [
    " because ", " which ", " that ", " when ", " if ", " where ", " after ",
    " before ", " since ", " unless ", " until ", " so that ", " whether ",
    " while ", " although ", " though ", " whereas ", " as ",
]

SENT_SPLIT = re.compile(r"(?<=[.!?])[\"')\]]*\s+")
ABBREV = re.compile(r"\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof|Fig|No|St|Jr|Sr|approx|cf|al)\.$",
                    re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’\-]*")

# --------------------------------------------------------------------------
# Segmentation
# --------------------------------------------------------------------------


def split_sentences(text: str) -> list[str]:
    """Regex sentence split with a short abbreviation guard."""
    raw = SENT_SPLIT.split(text.strip())
    out: list[str] = []
    for piece in raw:
        piece = piece.strip()
        if not piece:
            continue
        if out and ABBREV.search(out[-1]):
            out[-1] = out[-1] + " " + piece
        else:
            out.append(piece)
    return [s for s in out if WORD_RE.search(s)]


def _is_heading(block: str) -> bool:
    """A short line with no terminal punctuation is a heading, not a paragraph.

    Left in, it merges into the first sentence of the section below it and
    corrupts the role of the sentence the reader actually hears. Both sides of
    the corpus are treated identically.
    """
    ws = words(block)
    return 0 < len(ws) <= 12 and block.rstrip()[-1:] not in ".!?:;\"')]"


def split_paragraphs(text: str) -> list[str]:
    """Paragraphs as the author wrote them, headings removed. Blank-line
    separated, or single newlines where the text uses those as breaks."""
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    if len(blocks) <= 1:
        blocks = [b.strip() for b in text.split("\n") if b.strip()]
    kept = []
    for b in blocks:
        lines = [ln.strip() for ln in b.split("\n") if ln.strip()]
        lines = [ln for ln in lines if not _is_heading(ln)]
        if lines:
            kept.append(" ".join(lines))
    return kept or blocks


def words(s: str) -> list[str]:
    return WORD_RE.findall(s)


def has_paragraph_markup(text: str) -> bool:
    """True when the source preserved paragraph boundaries at all.

    Several human sources in the corpus (PDF-extracted CRS reports, SEC EDGAR
    filings, Internet Archive texts) arrive as one unbroken block. Any
    paragraph-level signal is meaningless on those, and treating their absence
    of paragraphs as evidence of humanness would be measuring the scraper.
    """
    return len(split_paragraphs(text)) >= 3


# --------------------------------------------------------------------------
# Sentence analysis
# --------------------------------------------------------------------------


@dataclass
class Sentence:
    text: str
    words: list[str] = field(default_factory=list)
    role: str = "C"
    n_words: int = 0
    clauses: int = 1
    imperative: bool = False
    utility: bool = False
    messy: bool = False
    enumeration: bool = False
    balanced: bool = False
    plain_declarative: bool = False


def _starts_imperative(ws: list[str], low: str) -> bool:
    if not ws:
        return False
    first = ws[0].lower()
    if first in ("do", "don't", "never", "always") and len(ws) > 1:
        return ws[1].lower().strip("'t") in IMPERATIVE_VERBS or first in ("never", "always")
    if first in IMPERATIVE_VERBS:
        # "Write the brief" yes; "Cost is the issue" no — reject when the second
        # token is a finite verb, which makes the first token the subject.
        if len(ws) > 1 and ws[1].lower() in AUX_VERBS:
            return False
        return True
    return False


def _first_finite_index(ws: list[str]) -> int:
    for i, w in enumerate(ws):
        lw = w.lower()
        if lw in AUX_VERBS or lw in UTILITY_VERBS:
            return i
    return -1


def _is_abstract_subject(sub: list[str]) -> bool:
    if not sub or len(sub) > 5:
        return False
    if any(w.lower() in FIRST_SECOND_PERSON for w in sub):
        return False
    # A capitalised token that is not the sentence opener reads as a name.
    if any(w[0].isupper() for w in sub[1:]):
        return False
    head = sub[-1].lower()
    return head in ABSTRACT_NOUNS or head.endswith(ABSTRACT_SUFFIXES)


def _count_enumeration(s: str) -> bool:
    """Three or more coordinated items: 'a, b, c and d' / 'a, b or c'."""
    return bool(re.search(r"\w+\s*,\s*[^,;.]{2,40},\s*[^,;.]{2,40}\s+(?:and|or)\s+", s))


def _is_balanced(s: str) -> bool:
    """'X covers A, B, C; Y covers D, E, F' and its relatives."""
    parts = re.split(r";|\s+while\s+|\s+whereas\s+", s)
    if len(parts) < 2:
        return False
    heads = []
    for p in parts:
        ws = words(p)
        if len(ws) < 4:
            return False
        idx = _first_finite_index(ws)
        heads.append(ws[idx].lower() if idx >= 0 else None)
    real = [h for h in heads if h]
    return len(real) >= 2 and len(set(real)) == 1


def analyse_sentence(s: str) -> Sentence:
    ws = words(s)
    low = " " + s.lower() + " "
    sent = Sentence(text=s, words=ws, n_words=len(ws))

    sent.clauses = 1 + sum(low.count(m) for m in CLAUSE_MARKERS) \
        + s.count(";") + s.count(":")
    sent.enumeration = _count_enumeration(s)
    sent.balanced = _is_balanced(s)

    sent.messy = bool(
        "(" in s or "—" in s or "–" in s or " - " in s or "..." in s or "…" in s
        or "!" in s
        or any(w.lower() in FIRST_SECOND_PERSON for w in ws)
        or any(h in low for h in HEDGES)
        or (ws and ws[0].lower() in ("and", "but", "so", "or", "still", "anyway"))
    )

    idx = _first_finite_index(ws)
    if idx > 0:
        sent.utility = (ws[idx].lower() in UTILITY_VERBS
                        and _is_abstract_subject(ws[:idx]))

    sent.imperative = _starts_imperative(ws, low)
    sent.plain_declarative = (
        not sent.messy and not sent.imperative and s.rstrip().endswith(".")
        and sent.clauses <= 1
    )

    # --- role, in fixed precedence order ---
    if s.rstrip().endswith("?"):
        sent.role = "Q"
    elif sent.imperative:
        sent.role = "I"
    elif any(low.lstrip().startswith(" " + o) or low.startswith(" " + o)
             for o in CONSEQUENCE_OPENERS):
        sent.role = "S"
    elif any(m in low for m in (" should ", " must ", " need to ", " ought to ")):
        sent.role = "R"
    elif any(m in low for m in EXAMPLE_MARKERS):
        sent.role = "E"
    elif any(m in low for m in CONTRAST_MARKERS):
        sent.role = "X"
    elif sent.messy:
        sent.role = "A"
    else:
        sent.role = "C"
    return sent


# --------------------------------------------------------------------------
# Document signals
# --------------------------------------------------------------------------

# Higher value = more synthetic, for every signal in this list. Signals whose
# natural direction is the other way round are stored already negated and
# named accordingly.
SIGNAL_NAMES = [
    "paragraph_cadence_max",
    "paragraph_cadence_rate",
    "tri_compression_flat",
    "template_repetition_z",
    "micro_compression",
    "instructional_closing",
    "artificial_closure",
    "balanced_construction",
    "assertive_utility",
    "low_messiness",
    "low_discourse_markers",
    "low_banned_markers",
    "enumeration_density",
    "declarative_uniformity",
    "low_opening_diversity",
]


def _template_repetition(shapes: list[str], para_lens: list[int],
                         roles_pool: list[str], seed: int = 7,
                         trials: int = 200) -> tuple[float, float]:
    """Observed shape repetition, and its z-score against a within-document null.

    The null keeps the document's own role mix and its own paragraph lengths and
    shuffles which role lands in which paragraph. A document that repeats shapes
    only because it is made of three-sentence paragraphs drawn from three roles
    scores zero; a document that arranges the same roles in the same ORDER
    scores high. Without this the signal is a paragraph-length measurement.
    """
    p = len(shapes)
    if p < 4:
        return float("nan"), float("nan")
    obs = (p - len(set(shapes))) / (p - 1)
    rng = random.Random(seed)
    null = []
    for _ in range(trials):
        pool = roles_pool[:]
        rng.shuffle(pool)
        i = 0
        sh = []
        for L in para_lens:
            sh.append("".join(pool[i:i + L]))
            i += L
        null.append((p - len(set(sh))) / (p - 1))
    mu = sum(null) / len(null)
    sd = math.sqrt(sum((x - mu) ** 2 for x in null) / len(null)) or 1e-9
    return obs, (obs - mu) / sd


def compute(text: str, seed: int = 7) -> dict:
    paras_raw = split_paragraphs(text)
    paragraphs = [split_sentences(p) for p in paras_raw]
    paragraphs = [p for p in paragraphs if p]

    sents: list[Sentence] = []
    para_sents: list[list[Sentence]] = []
    for p in paragraphs:
        ss = [analyse_sentence(s) for s in p]
        para_sents.append(ss)
        sents.extend(ss)

    n_words = sum(s.n_words for s in sents)
    n_sents = len(sents)
    out: dict = {
        "n_words": n_words,
        "n_sentences": n_sents,
        "n_paragraphs": len(paragraphs),
        "has_paragraph_markup": has_paragraph_markup(text),
    }
    if n_words < 50 or n_sents < 4:
        for k in SIGNAL_NAMES:
            out[k] = float("nan")
        return out

    per_k = 1000.0 / n_words

    # --- paragraph-shape repetition ---
    eligible = [ss for ss in para_sents if len(ss) >= 2]
    shapes = ["".join(s.role for s in ss[:5]) for ss in eligible]
    lens = [min(len(ss), 5) for ss in eligible]
    pool = [s.role for ss in eligible for s in ss[:5]]
    if not out["has_paragraph_markup"]:
        eligible, shapes, lens, pool = [], [], [], []
    obs_rep, rep_z = _template_repetition(shapes, lens, pool, seed=seed)
    out["template_repetition_raw"] = obs_rep
    out["template_repetition_z"] = rep_z

    # --- micro-paragraph compression ---
    multi = [ss for ss in para_sents if len(ss) >= 3]
    if multi and out["has_paragraph_markup"]:
        comp = sum(1 for ss in multi if sum(s.n_words for s in ss) <= 55) / len(multi)
    else:
        comp = float("nan")
    out["micro_compression"] = comp
    # the continuous form, computed over the flat sentence stream so that it is
    # available on documents whose source lost the paragraph breaks: rate of
    # 3-sentence windows totalling 45 words or fewer, per 1,000 words
    tri = sum(1 for i in range(n_sents - 2)
              if sum(x.n_words for x in sents[i:i + 3]) <= 45)
    out["tri_compression_flat"] = tri * per_k

    # --- closings ---
    closers = ([ss[-1] for ss in para_sents if len(ss) >= 2]
               if out["has_paragraph_markup"] else [])
    if closers:
        out["instructional_closing"] = sum(
            1 for s in closers if s.role in ("I", "R")) / len(closers)
        out["artificial_closure"] = sum(
            1 for s in closers if s.role in ("I", "R", "S")) / len(closers)
    else:
        out["instructional_closing"] = float("nan")
        out["artificial_closure"] = float("nan")

    # --- sentence-level voice signals ---
    out["balanced_construction"] = sum(1 for s in sents if s.balanced) * per_k
    out["assertive_utility"] = sum(1 for s in sents if s.utility) / n_sents
    out["enumeration_density"] = sum(1 for s in sents if s.enumeration) * per_k
    out["declarative_uniformity"] = sum(
        1 for s in sents if s.plain_declarative) / n_sents

    messy_rate = sum(1 for s in sents if s.messy) / n_sents
    out["low_messiness"] = -messy_rate

    low = " " + " ".join(text.lower().split()) + " "
    dm_all = sum(low.count(" " + m) for m in DISCOURSE_ALL)
    dm_ban = sum(low.count(" " + m) for m in DISCOURSE_BANNED)
    out["low_discourse_markers"] = -dm_all * per_k
    out["low_banned_markers"] = -dm_ban * per_k

    openers = [ss[0] for ss in para_sents] if out["has_paragraph_markup"] else []
    if len(openers) >= 3:
        shape = [(" ".join(s.words[:2]).lower(), s.role) for s in openers]
        out["low_opening_diversity"] = -len(set(shape)) / len(shape)
    else:
        out["low_opening_diversity"] = float("nan")

    # --- positional variants: intro (first two paragraphs) and final 20% ---
    def slab(ss_list):
        flat = [s for ss in ss_list for s in ss]
        if not flat:
            return {}
        clos = [ss[-1] for ss in ss_list if len(ss) >= 2]
        w = sum(s.n_words for s in flat) or 1
        return {
            "instructional_closing": (sum(1 for s in clos if s.role in ("I", "R"))
                                      / len(clos)) if clos else 0.0,
            "assertive_utility": sum(1 for s in flat if s.utility) / len(flat),
            "low_messiness": -sum(1 for s in flat if s.messy) / len(flat),
            "enumeration_density": sum(1 for s in flat if s.enumeration) * 1000.0 / w,
            "micro_compression": (sum(1 for ss in ss_list
                                      if len(ss) >= 3
                                      and sum(x.n_words for x in ss) <= 55)
                                  / max(1, sum(1 for ss in ss_list if len(ss) >= 3))),
        }

    cum, cutoff = 0, 0.8 * n_words
    tail_start = len(para_sents)
    for i, ss in enumerate(para_sents):
        cum += sum(s.n_words for s in ss)
        if cum > cutoff:
            tail_start = i
            break
    for name, part in (("intro", para_sents[:2]), ("tail", para_sents[tail_start:])):
        for k, v in slab(part).items():
            out[f"{name}__{k}"] = v

    # --- the paragraph-level combination rule, aggregated to the document ---
    if out["has_paragraph_markup"]:
        scores = [_paragraph_cadence_from(ss) for ss in para_sents if len(ss) >= 2]
        out["paragraph_cadence_max"] = float(max(scores)) if scores else float("nan")
        out["paragraph_cadence_rate"] = (
            sum(1 for v in scores if v >= 4) * per_k if scores else float("nan"))
    else:
        out["paragraph_cadence_max"] = float("nan")
        out["paragraph_cadence_rate"] = float("nan")

    out["roles"] = "".join(s.role for s in sents)
    out["shapes"] = shapes
    return out


def role_annotate(text: str) -> list[tuple[str, str]]:
    """(role, sentence) for eyeballing. Used by the report and the tests."""
    return [(s.role, s.text)
            for p in split_paragraphs(text)
            for s in map(analyse_sentence, split_sentences(p))]


# --------------------------------------------------------------------------
# Paragraph-level score, used by the probe test
# --------------------------------------------------------------------------

def _paragraph_cadence_from(ss: list) -> int:
    if not ss:
        return 0
    total = sum(s.n_words for s in ss)
    roles = [s.role for s in ss]
    score = 0
    if len(ss) >= 3 and total <= 55:
        score += 3
    if roles[-1] in ("I", "R", "S"):
        score += 2
    if len(ss) >= 3 and roles[0] in ("C", "X") and roles[-1] in ("I", "R", "S"):
        score += 2
    if any(s.balanced for s in ss):
        score += 2
    score += min(2, sum(1 for s in ss if s.utility))
    if any(s.enumeration for s in ss):
        score += 1
    score -= 2 * sum(1 for s in ss if s.messy)
    return max(0, score)


def paragraph_cadence(paragraph: str) -> int:
    """A single paragraph's synthetic-cadence score, 0 upwards.

    This is the combination rule the analysis proposed, written out so that a
    reader can check it against a paragraph by eye. It exists to make the
    owner's own examples testable; it is NOT the corpus measurement, which
    works on document-level distributions in `compute`.
    """
    return _paragraph_cadence_from(
        [analyse_sentence(s) for s in split_sentences(paragraph)])

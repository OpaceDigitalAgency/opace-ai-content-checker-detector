"""A programmatic imitation of a human tidying a draft.

No API calls. Operations are the ones people actually perform when they take an
LLM draft and make it theirs: contract verbs, cut the transition words, break up
long sentences, drop a sentence, add a hedge or an aside, fix or introduce a
typo, swap spellings, reorder within a paragraph.

The same editor is applied to HUMAN documents as well as AI ones during training,
labelled by their true authorship. That is deliberate: if an operation left a
fingerprint the classifier could use, it would appear on both sides and carry no
label information. Any gain therefore has to come from authorship signal, not
from the editor's own artefacts.
"""
from __future__ import annotations

import difflib
import random
import re

CONTRACTIONS = [
    (r"\bit is\b", "it's"), (r"\bthat is\b", "that's"), (r"\bthere is\b", "there's"),
    (r"\bdo not\b", "don't"), (r"\bdoes not\b", "doesn't"), (r"\bdid not\b", "didn't"),
    (r"\bcannot\b", "can't"), (r"\bwill not\b", "won't"), (r"\bis not\b", "isn't"),
    (r"\bare not\b", "aren't"), (r"\bwas not\b", "wasn't"), (r"\bwere not\b", "weren't"),
    (r"\bhave not\b", "haven't"), (r"\bhas not\b", "hasn't"), (r"\bwould not\b", "wouldn't"),
    (r"\bshould not\b", "shouldn't"), (r"\bcould not\b", "couldn't"), (r"\bthey are\b", "they're"),
    (r"\bwe are\b", "we're"), (r"\byou are\b", "you're"), (r"\bwe will\b", "we'll"),
    (r"\bwe have\b", "we've"), (r"\byou will\b", "you'll"), (r"\blet us\b", "let's"),
]
EXPANSIONS = [(re.escape(b), a.replace("\\b", "").replace(r"\b", "")) for a, b in
              [(r"it is", "it's"), (r"do not", "don't"), (r"that is", "that's"),
               (r"cannot", "can't"), (r"they are", "they're"), (r"we are", "we're")]]
UK_US = [("organis", "organiz"), ("recognis", "recogniz"), ("analys", "analyz"),
         ("colour", "color"), ("behaviour", "behavior"), ("favour", "favor"),
         ("centre", "center"), ("licence", "license"), ("practise", "practice"),
         ("programme", "program"), ("travelled", "traveled"), ("labour", "labor"),
         ("optimis", "optimiz"), ("specialis", "specializ"), ("modelling", "modeling")]
OPENERS = [r"^Moreover,\s*", r"^Furthermore,\s*", r"^Additionally,\s*", r"^In conclusion,\s*",
           r"^Ultimately,\s*", r"^Importantly,\s*", r"^Notably,\s*", r"^Indeed,\s*",
           r"^In today's [a-z\- ]+,\s*", r"^Overall,\s*", r"^In summary,\s*",
           r"^That said,\s*", r"^Crucially,\s*", r"^Consequently,\s*"]
HEDGES = ["I think ", "honestly, ", "in my experience, ", "to be fair, ", "roughly speaking, ",
          "in practice, ", "for what it's worth, ", "as far as I can tell, "]
ASIDES = [" (at least in my experience)", " — or so it seems", " , which surprised me",
          " (your mileage may vary)", " — and that matters"]
SYNONYMS = [("utilise", "use"), ("utilize", "use"), ("leverage", "use"), ("robust", "solid"),
            ("seamless", "smooth"), ("delve into", "dig into"), ("crucial", "key"),
            ("significant", "big"), ("numerous", "many"), ("facilitate", "help"),
            ("demonstrate", "show"), ("subsequently", "later"), ("approximately", "about"),
            ("in order to", "to"), ("a myriad of", "many"), ("landscape", "field"),
            ("elevate", "lift"), ("empower", "let"), ("streamline", "simplify"),
            ("navigate", "handle"), ("comprehensive", "full"), ("innovative", "new")]

_SENT = re.compile(r"(?<=[.!?])\s+")


def para_sep(t: str) -> str:
    """Documents in the corpora use either blank-line or single-newline breaks.
    Preserve whichever the document actually uses."""
    return "\n\n" if re.search(r"\n\s*\n", t) else "\n"


def split_paras(t):
    sep = r"\n\s*\n" if re.search(r"\n\s*\n", t) else r"\n"
    return [p for p in re.split(sep, t) if p.strip()]


def sentences(p):
    return [s for s in _SENT.split(p.strip()) if s.strip()]


def _typo(s, rng):
    words = s.split()
    idx = [i for i, w in enumerate(words) if len(w) > 4 and w.isalpha()]
    if not idx:
        return s
    i = rng.choice(idx)
    w = words[i]
    k = rng.randrange(1, len(w) - 1)
    mode = rng.random()
    if mode < 0.4:
        w = w[:k] + w[k + 1] + w[k] + w[k + 2:]
    elif mode < 0.7:
        w = w[:k] + w[k] + w[k:]
    else:
        w = w[:k] + w[k + 1:]
    words[i] = w
    return " ".join(words)


def _op_sentence(s, rng):
    """One edit on one sentence. Returns the edited sentence."""
    r = rng.random()
    if r < 0.16:
        for pat, rep in rng.sample(CONTRACTIONS, len(CONTRACTIONS)):
            new = re.sub(pat, rep, s, count=1, flags=re.I)
            if new != s:
                return new
        return s
    if r < 0.24:
        for a, b in rng.sample(EXPANSIONS, len(EXPANSIONS)):
            new = re.sub(a, b, s, count=1, flags=re.I)
            if new != s:
                return new
        return s
    if r < 0.34:
        for uk, us in rng.sample(UK_US, len(UK_US)):
            src, dst = (uk, us) if rng.random() < 0.5 else (us, uk)
            if src in s.lower():
                return re.sub(src, dst, s, count=1, flags=re.I)
        return s
    if r < 0.46:
        for pat in OPENERS:
            new = re.sub(pat, "", s)
            if new != s:
                return new[0].upper() + new[1:] if new else s
        return s
    if r < 0.56:
        for a, b in rng.sample(SYNONYMS, len(SYNONYMS)):
            if re.search(r"\b" + a + r"\b", s, re.I):
                return re.sub(r"\b" + a + r"\b", b, s, count=1, flags=re.I)
        return s
    if r < 0.66:
        if "—" in s or " - " in s:
            return s.replace("—", ",", 1).replace(" - ", ", ", 1)
        return s
    if r < 0.76:
        return _typo(s, rng)
    if r < 0.88:
        h = rng.choice(HEDGES)
        return (h[0].upper() + h[1:] + s) if len(s) > 2 else s
    a = rng.choice(ASIDES)
    return s[:-1] + a + s[-1] if s and s[-1] in ".!?" else s + a


def _split_long(p, rng):
    ss = sentences(p)
    cand = [i for i, s in enumerate(ss) if len(s.split()) > 24 and re.search(r", (and|but|which|while) ", s)]
    if not cand:
        return p, False
    i = rng.choice(cand)
    ss[i] = re.sub(r", (and|but|which|while) ", lambda m: ". " + ("It " if m.group(1) == "which" else ""),
                   ss[i], count=1)
    return " ".join(ss), True


def _join_short(p, rng):
    ss = sentences(p)
    cand = [i for i in range(len(ss) - 1) if len(ss[i].split()) < 14 and len(ss[i + 1].split()) < 16]
    if not cand:
        return p, False
    i = rng.choice(cand)
    a = ss[i].rstrip(".")
    b = ss[i + 1]
    ss[i:i + 2] = [a + ", and " + b[0].lower() + b[1:]]
    return " ".join(ss), True


def _reorder(p, rng):
    ss = sentences(p)
    if len(ss) < 4:
        return p, False
    i = rng.randrange(1, len(ss) - 1)
    j = rng.randrange(1, len(ss) - 1)
    ss[i], ss[j] = ss[j], ss[i]
    return " ".join(ss), i != j


def _drop(p, rng):
    ss = sentences(p)
    if len(ss) < 4:
        return p, False
    del ss[rng.randrange(1, len(ss))]
    return " ".join(ss), True


PARA_OPS = [_split_long, _join_short, _reorder, _drop]


def token_change_fraction(a: str, b: str) -> float:
    wa, wb = a.split(), b.split()
    sm = difflib.SequenceMatcher(None, wa, wb)
    same = sum(bl.size for bl in sm.get_matching_blocks())
    return 1.0 - (same / max(len(wa), 1))


def edit(text: str, target: float, seed: int) -> tuple[str, float]:
    """Edit until roughly `target` of the original tokens have been touched.

    Returns (edited_text, measured_change_fraction).
    """
    rng = random.Random(seed)
    sep = para_sep(text)
    paras = split_paras(text)
    if not paras:
        return text, 0.0
    for _ in range(400):
        if token_change_fraction(text, sep.join(paras)) >= target:
            break
        pi = rng.randrange(len(paras))
        if rng.random() < 0.25:
            op = rng.choice(PARA_OPS)
            new, ok = op(paras[pi], rng)
            if ok:
                paras[pi] = new
                continue
        ss = sentences(paras[pi])
        if not ss:
            continue
        si = rng.randrange(len(ss))
        ss[si] = _op_sentence(ss[si], rng)
        paras[pi] = " ".join(ss)
    out = sep.join(paras)
    return out, token_change_fraction(text, out)


def mix_paragraphs(ai_text: str, human_paras: list[str], human_share: float,
                   seed: int) -> tuple[str, float]:
    """Replace paragraphs of an AI document with real human paragraphs until
    roughly `human_share` of the words are human. Returns (text, ai_word_ratio)."""
    rng = random.Random(seed)
    sep = para_sep(ai_text)
    paras = split_paras(ai_text)
    if len(paras) < 3 or not human_paras:
        return ai_text, 1.0
    total = sum(len(p.split()) for p in paras)
    order = list(range(1, len(paras)))
    rng.shuffle(order)
    hw = 0
    pool = list(human_paras)
    rng.shuffle(pool)
    for pi in order:
        if hw / max(total, 1) >= human_share or not pool:
            break
        rep = pool.pop()
        hw += len(rep.split())
        total = total - len(paras[pi].split()) + len(rep.split())
        paras[pi] = rep
    txt = sep.join(paras)
    tot = len(txt.split())
    return txt, max(0.0, 1.0 - hw / max(tot, 1))

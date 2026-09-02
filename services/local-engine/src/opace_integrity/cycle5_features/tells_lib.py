"""Shared parsing utilities for document-level tell measurement (2026-08-31).

All structure detection is applied IDENTICALLY to AI and human documents so
that a difference in measured rates cannot be an artefact of side-specific
parsing. Markdown syntax is stripped first; heading detection then runs on
the plain-text form both sides share.
"""
import json
import re
import statistics

STOPWORDS = set("""a an the and or but if then than so of to in on at for from by with about into over
after before between out against during without within along across behind beyond up down off above under
is are was were be been being am do does did have has had having will would can could may might must shall
should this that these those it its it's i you he she we they them his her their our your my me him us
as not no nor too very just also only more most other some such own same s t don now what which who whom
how when where why all any both each few once here there again further""".split())

CLOSER_RE = re.compile(
    r"^(final (thoughts|words|takeaways?)|conclusion|in conclusion|in summary|to sum(marise| up)?|"
    r"wrapping (it )?up|wrap[- ]?up|key takeaways?|the bottom line|closing thoughts|summing up|takeaways?)\b",
    re.I,
)

BULLET_RE = re.compile(r"^\s*([-*+•]|\d+[.)])\s+")


def norm_tokens(text):
    """Lowercase alpha-ish tokens; light plural stemming applied at match time."""
    return re.findall(r"[a-z][a-z''-]*", text.lower())


def stem(tok):
    if len(tok) > 4 and tok.endswith("s") and not tok.endswith("ss"):
        return tok[:-1]
    return tok


def stems(tokens):
    return [stem(t) for t in tokens]


MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
BOLD_ONLY_RE = re.compile(r"^\*\*(.+)\*\*:?\s*$")


def strip_md_inline(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = re.sub(r"`(.+?)`", r"\1", s)
    s = re.sub(r"\[(.+?)\]\([^)]*\)", r"\1", s)
    return s.strip()


def is_heading_like(line):
    """Symmetric heading test on a plain-text line (markdown markers removed).

    <= 12 words, <= 90 chars, no sentence-final punctuation, not a bullet,
    contains at least one letter, and not ending with a comma/semicolon.
    """
    s = line.strip()
    if not s or len(s) > 90:
        return False
    if BULLET_RE.match(s):
        return False
    if s[-1] in ".!?,;":
        return False
    words = s.split()
    if not (1 <= len(words) <= 12):
        return False
    if not re.search(r"[A-Za-z]", s):
        return False
    return True


def parse_doc(text):
    """Return dict with: title (str), headings (list of (text, was_markdown)),
    blocks (list of paragraph strings, headings excluded), sections
    (list of lists of paragraph blocks under each heading; sections[0] is
    pre-heading preamble)."""
    raw_blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    headings = []   # (clean_text, explicit_md)
    paras = []      # paragraph blocks (non-heading)
    seq = []        # ('h', idx) / ('p', idx) in order
    for b in raw_blocks:
        lines = b.split("\n")
        for line in lines:
            line = line.rstrip()
            if not line.strip():
                continue
            m = MD_HEADING_RE.match(line.strip())
            if m:
                headings.append((strip_md_inline(m.group(2)), True))
                seq.append(("h", len(headings) - 1))
                continue
            mb = BOLD_ONLY_RE.match(line.strip())
            if mb and is_heading_like(strip_md_inline(mb.group(1))):
                headings.append((strip_md_inline(mb.group(1)), True))
                seq.append(("h", len(headings) - 1))
                continue
            # heading-like plain line only counts when it stands as its own block
            if len(lines) == 1 and is_heading_like(strip_md_inline(line)):
                headings.append((strip_md_inline(line), False))
                seq.append(("h", len(headings) - 1))
            else:
                paras.append(strip_md_inline(line) if len(lines) == 1 else strip_md_inline(b))
                seq.append(("p", len(paras) - 1))
                break  # multi-line block handled as one paragraph
    # Build sections: consecutive paragraphs grouped under the latest heading
    sections = []
    cur = []
    started = False
    for kind, idx in seq:
        if kind == "h":
            if started or cur:
                sections.append(cur)
            cur = []
            started = True
        else:
            cur.append(paras[idx])
    sections.append(cur)
    title = headings[0][0] if headings and seq and seq[0][0] == "h" else (
        paras[0] if paras else (headings[0][0] if headings else ""))
    return {
        "title": title,
        "headings": headings,
        "blocks": paras,
        "sections": sections,
        "seq": seq,
    }


def sentences(par):
    parts = re.split(r"(?<=[.!?])\s+", par.strip())
    return [p for p in parts if len(p.split()) >= 2]


def title_case_share(heading_text):
    """Share of significant words (len>3, alpha) that are capitalised."""
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]*", heading_text) if len(w) > 3]
    if not words:
        return None
    return sum(1 for w in words if w[0].isupper()) / len(words)


def cv(values):
    if len(values) < 2:
        return None
    m = statistics.mean(values)
    if m == 0:
        return None
    return statistics.pstdev(values) / m


def iter_jsonl(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


"""Workstream REAL - markdown normaliser.

Simulates what reaches a detector when a real user pastes PUBLISHED PROSE:
text copied out of a CMS editor, a Word/Google document, or a rendered web
page. In every one of those paths the markdown *furniture* is gone - it was
either rendered into HTML and copied back as plain text, or never typed at
all - while the words, sentence boundaries and punctuation survive intact.

Design rules (each one is a claim about what a paste really looks like):

  R1  Headings      `## Foo`      -> `Foo`        heading text survives on a
                                                  rendered page; the hashes do not.
  R2  Emphasis      `**x**` `*x*` `_x_` `~~x~~` -> `x`   rendered as styled text;
                                                  the markers are invisible.
  R3  Bullets       `- item`      -> `item`       a rendered <li> copied out is
                    `1. item`     -> `item`       the item text. The LINE BREAK
                                                  is kept: a pasted list is still
                                                  a stack of short lines.
  R4  Code fences   ```lang ... ``` -> inner lines, fence markers removed.
                    Inline `code`  -> code
  R5  Tables        `| a | b |`   -> `a, b`       rendered cells, separator rows
                                                  dropped.
  R6  Rules         `---` `***`   -> dropped      an <hr> carries no text.
  R7  Links         `[t](u)`      -> `t`          rendered anchor text.
                    `![a](u)`     -> dropped      image, no prose.
                    `<https://u>` -> `https://u`
  R8  Blockquotes   `> x`         -> `x`
  R9  Raw HTML tags stripped, entities decoded.
  R10 Escapes       `\\*`          -> `*`
  R11 Whitespace collapsed: trailing spaces, hard-break backslashes, runs of
      >2 blank lines. Sentence-internal spacing and ALL punctuation untouched.

NOT done (deliberately): no sentence rewriting, no punctuation substitution,
no em-dash removal, no case changes, no list-to-prose joining. The normaliser
must remove FORMATTING and nothing else, otherwise it becomes an intervention
rather than a measurement. A stricter "prose-flattened" variant that also
joins list items into paragraphs is provided separately as `flatten_lists`
for sensitivity analysis only.

Verified by `test_strip.py` (round-trip cases + a zero-furniture idempotence
check on the 169 human samples).
"""

from __future__ import annotations

import html
import re

# ---------------------------------------------------------------- block level

_FENCE = re.compile(r"^\s*(?:```+|~~~+)\s*[\w+-]*\s*$")
_HEADING_ATX = re.compile(r"^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$")
_HEADING_SETEXT = re.compile(r"^\s{0,3}(?:=+|-{2,})\s*$")
_HR = re.compile(r"^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$")
_BULLET = re.compile(r"^(\s*)[-*+•‣◦⁃]\s+")
_ORDERED = re.compile(r"^(\s*)\d{1,3}[.)]\s+")
_BLOCKQUOTE = re.compile(r"^\s{0,3}(?:>\s?)+")
_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")
_TABLE_SEP = re.compile(r"^\s*\|?[\s:|-]*\|[\s:|-]*$")

# ---------------------------------------------------------------- inline level

_IMAGE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]*)\]\(\s*<?[^)\s]*>?(?:\s+\"[^\"]*\")?\s*\)")
_REF_LINK = re.compile(r"\[([^\]]*)\]\[[^\]]*\]")
_AUTOLINK = re.compile(r"<((?:https?|ftp|mailto):[^>\s]+)>")
_HTML_TAG = re.compile(r"</?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?/?>")
_INLINE_CODE = re.compile(r"`+([^`\n]+?)`+")
_BOLD_IT = re.compile(r"(\*{1,3})(?!\s)(.+?)(?<!\s)\1", re.S)
_UNDER = re.compile(r"(?<![A-Za-z0-9_])(_{1,3})(?!\s)(.+?)(?<!\s)\1(?![A-Za-z0-9_])", re.S)
_STRIKE = re.compile(r"~~(?!\s)(.+?)(?<!\s)~~", re.S)
_ESCAPE = re.compile(r"\\([\\`*_{}\[\]()#+\-.!~>|])")
_HARD_BREAK = re.compile(r"[ \t]*\\$")
_FOOTNOTE = re.compile(r"\[\^[^\]]*\]")


_SENTINEL = "\x00"


def _strip_inline(s: str) -> str:
    """Remove inline markdown from one line, preserving the visible text."""
    s = _FOOTNOTE.sub("", s)
    s = _IMAGE.sub("", s)          # R7: images carry no prose
    s = _LINK.sub(r"\1", s)        # R7: anchor text survives
    s = _REF_LINK.sub(r"\1", s)
    s = _AUTOLINK.sub(r"\1", s)
    s = _INLINE_CODE.sub(r"\1", s)  # R4
    s = _HTML_TAG.sub("", s)        # R9
    s = html.unescape(s)
    s = _STRIKE.sub(r"\1", s)       # R2
    prev = None
    while prev != s:                # nested **_x_** needs two passes
        prev = s
        s = _BOLD_IT.sub(r"\2", s)
        s = _UNDER.sub(r"\2", s)
    s = _HARD_BREAK.sub("", s)      # R11
    return s


def strip_markdown(text: str, _max_passes: int = 4) -> str:
    """Render-then-copy normalisation. See module docstring for the rules.

    Applied to a fixed point (R3b): removing emphasis can re-expose a block
    marker that the emphasis was hiding - `**1. Step one**` renders as a list
    item, not as the literal string "1. Step one" - so the block pass runs
    again until the text stops changing. Converges in <=3 passes in practice.

    R10 is handled here rather than per-pass: a backslash-escaped marker is
    literal text, so it is parked behind a sentinel for the whole fixed-point
    iteration and restored only at the end. Otherwise pass 2 would treat the
    just-unescaped `*asterisks*` as emphasis and eat it.
    """
    escaped: list[str] = []

    def _park(m: "re.Match[str]") -> str:
        escaped.append(m.group(1))
        return f"{_SENTINEL}{len(escaped) - 1}{_SENTINEL}"

    out = _ESCAPE.sub(_park, text)
    out = _strip_once(out)
    for _ in range(_max_passes - 1):
        nxt = _strip_once(out)
        if nxt == out:
            break
        out = nxt
    for i, ch in enumerate(escaped):
        out = out.replace(f"{_SENTINEL}{i}{_SENTINEL}", ch)
    return out


def _strip_once(text: str) -> str:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out: list[str] = []
    in_fence = False

    for i, raw in enumerate(lines):
        line = raw

        if _FENCE.match(line):      # R4: fence delimiters vanish, content stays
            in_fence = not in_fence
            continue
        if in_fence:
            out.append(line.rstrip())
            continue

        if _HR.match(line):         # R6
            continue

        # R8: blockquote markers, possibly nested
        if _BLOCKQUOTE.match(line):
            line = _BLOCKQUOTE.sub("", line)

        # R1: ATX headings
        m = _HEADING_ATX.match(line)
        if m:
            out.append(_strip_inline(m.group(1)).strip())
            continue

        # R1: setext underline - the text line above is already emitted
        if _HEADING_SETEXT.match(line) and out and out[-1].strip():
            continue

        # R5: tables
        if _TABLE_ROW.match(line):
            if _TABLE_SEP.match(line):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            cells = [_strip_inline(c).strip() for c in cells]
            cells = [c for c in cells if c]
            out.append(", ".join(cells))
            continue

        # R3: list markers, indentation flattened
        line = _BULLET.sub("", line)
        line = _ORDERED.sub("", line)

        out.append(_strip_inline(line).rstrip())

    # R11: whitespace tidy - collapse >2 consecutive blank lines, trim ends
    cleaned: list[str] = []
    blanks = 0
    for line in out:
        if not line.strip():
            blanks += 1
            if blanks > 1:
                continue
            cleaned.append("")
        else:
            blanks = 0
            cleaned.append(re.sub(r"[ \t]{2,}", " ", line).rstrip())
    return "\n".join(cleaned).strip()


def flatten_lists(text: str) -> str:
    """SENSITIVITY VARIANT ONLY - not the primary normaliser.

    On top of strip_markdown, joins every line inside a block into one flowing
    paragraph, terminating any line that lacks end punctuation. This models an
    author who WROTE prose rather than a reader who pasted a rendered list, and
    so removes the residual list *structure* (many short lines) that survives
    marker-stripping. Reported separately to separate genuine prose signals
    from list-shape residue; never mixed into the headline numbers.
    """
    blocks = re.split(r"\n\s*\n", strip_markdown(text))
    out = []
    for block in blocks:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if not lines:
            continue
        sents = []
        for ln in lines:
            if not re.search(r"[.!?]$", ln):
                ln = ln.rstrip(",;:") + "."
            sents.append(ln)
        out.append(" ".join(sents))
    return "\n\n".join(out).strip()


def furniture_counts(text: str) -> dict[str, int]:
    """Residual-furniture audit, used to prove the normaliser did its job."""
    return {
        "heading": len(re.findall(r"^\s{0,3}#{1,6}\s", text, re.M)),
        "bold": len(re.findall(r"\*\*[^*\n]+\*\*", text)),
        "italic_star": len(re.findall(r"(?<!\*)\*[^*\n]+\*(?!\*)", text)),
        "bullet": len(re.findall(r"^\s*[-*+•]\s+", text, re.M)),
        "ordered": len(re.findall(r"^\s*\d{1,3}[.)]\s+", text, re.M)),
        "fence": len(re.findall(r"^\s*(?:```|~~~)", text, re.M)),
        "table": len(re.findall(r"^\s*\|.*\|\s*$", text, re.M)),
        "hr": len(re.findall(r"^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$", text, re.M)),
        "link": len(re.findall(r"\[[^\]]*\]\([^)]*\)", text)),
        "inline_code": len(re.findall(r"`[^`\n]+`", text)),
        "blockquote": len(re.findall(r"^\s{0,3}>\s", text, re.M)),
        "html_tag": len(_HTML_TAG.findall(text)),
    }

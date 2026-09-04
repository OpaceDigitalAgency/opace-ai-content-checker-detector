"""Branded, self-contained printable HTML for canonical checker results.

The structure, tokens and wording match the Node CLI report in `packages/cli/src/report.ts`
and the shared presentation language recorded in
`.agent/docs/ai-content-integrity/orchestration-2026-09-02/PARITY-COMPLETION-PLAN.md` section 2.

The page loads no script, stylesheet, font or image and makes no request. The only outbound
references are the Opace product and support destinations required by
`CROSS-SURFACE-WEBSITE-PARITY-ACCEPTANCE.md` section 6.1.
"""
from __future__ import annotations

import html
import json
import math

from . import __version__
from .signals import SignalMeter, explain_section_signals, measure_section_signals

PRODUCT_HOME = "https://opace.agency/tools/ai/content-verification-integrity/"
PRODUCT_SUPPORT = "https://opace.agency/get-in-touch/"

LEVEL_NAMES = {
    "signal-strongly-ai": "Strongly AI",
    "signal-likely-ai": "Likely AI",
    "signal-potentially-ai": "Potentially AI",
    "signal-unclear": "Unclear",
    "signal-likely-human": "Likely human",
}

# Five bands, weakest AI reading first. Each band owns 36 degrees of the dial.
# Labels and colours mirror LEVEL_ORDER, LEVEL_LABELS and LEVEL_COLOURS in
# `shared/report/report-model.mjs`; Lane D2 announces any change to them in `shared/STATUS.md`.
BANDS = (
    ("signal-likely-human", "Likely human", "#1a7349"),
    ("signal-unclear", "Unclear", "#6d7877"),
    ("signal-potentially-ai", "Potentially AI", "#b06603"),
    ("signal-likely-ai", "Likely AI", "#bf4705"),
    ("signal-strongly-ai", "Strongly AI", "#a31f17"),
)

# The one plain sentence for each band, shared with the report and PDF builders.
LEVEL_MEANINGS = {
    "signal-likely-human": "This draft reads the way human writing usually reads. That is not proof of authorship, and a carefully edited AI draft can read this way too.",
    "signal-unclear": "The reading sits in the middle of the scale. The patterns in this draft do not lean clearly towards either human or AI writing.",
    "signal-potentially-ai": "Parts of this draft carry patterns that are common in AI writing. Treat it as a reason to read the marked sections closely, not as a verdict.",
    "signal-likely-ai": "This draft matches AI writing patterns closely. The marked sections are the ones worth a careful read.",
    "signal-strongly-ai": "This draft very strongly matches AI writing, the kind of match we rarely see in human work.",
}

HONESTY_LINE = "No AI checker can prove who wrote a text. This is a pattern reading, and it is evidence, not a guarantee."

MEANS = (
    "Parts of the writing match patterns that are common in AI text.",
    "The marked sections carry the strongest match and are worth a careful read.",
    "Every other check on this page reports separately and did not change that reading.",
)
MEANS_UNASSESSED = (
    "No trained model reading is available for this run.",
    "The deterministic checks below still report exactly what they found.",
)
DOES_NOT_MEAN = (
    "It does not prove who wrote the draft.",
    "It says nothing about whether the content is accurate or good.",
    "Human writing polished with an AI tool is deliberately not flagged.",
)
CORRECT_USE = (
    "The AI-pattern reading is statistical and can be wrong. Read the marked sections before you act on it.",
    "The score is a position on a zero-to-one pattern-similarity scale. It is not the percentage of the draft written by AI.",
    "Character checks and writing suggestions are separate readings. Neither can raise or lower the AI-pattern reading.",
    "Content Credentials describe how a file was made and edited. Their absence proves nothing about authorship.",
    "A public watermark-key check cannot clear or accuse a private provider key.",
)

METHOD_STATE_NAMES = {
    "pass": "No issue found",
    "attention": "Review evidence",
    "fail": "Failed",
    "inconclusive": "Inconclusive",
    "unsupported": "Unavailable",
    "not_configured": "Not configured",
    "not_run": "Not run",
    "error": "Error",
}

# One plain sentence per outcome, saying what the check means for this draft. A check that did not
# run says so in its own row and is never counted as a pass. Mirrors the closed status vocabulary in
# `shared/presentation/checker-result-presentation.mjs` (Lane D3 section 3).
METHOD_STATE_SENTENCES = {
    "pass": "This check ran on the draft and found nothing to raise.",
    "attention": "This check found something worth reading before you act on the result.",
    "fail": "This check ran and failed. Read its evidence before you act on the result.",
    "inconclusive": "This check ran but could not reach an answer on this draft.",
    "unsupported": "This check is not available on this route, so it contributed nothing.",
    "not_configured": "This check is not configured on this route, so it contributed nothing.",
    "not_run": "This check did not run. Nothing is inferred from its silence.",
    "error": "This check errored, so it contributed nothing to the readings above.",
}

# Checks are grouped by the reading they feed, by the first segment of the method id. An id outside
# the three families is filed under "Other named checks" rather than being dropped or filed under a
# reading it did not feed.
CHECK_GROUPS = (
    ("AI-pattern reading", ("detector", "watermark")),
    ("Text integrity", ("unicode", "provenance", "fidelity")),
    ("Editorial signals", ("pattern",)),
)
OTHER_CHECK_GROUP = "Other named checks"

ROUTE_NAMES = {
    "eu_server": "Opace EU server",
    "loopback_engine": "Local engine on this device",
    "deterministic_only": "On-device deterministic checks",
    "browser_local": "In your browser",
}

PRIVACY_ROUTE_NAMES = {
    "hub_provider": "Opace EU service",
    "local_service": "Local service on this device",
    "browser": "In your browser",
    "none": "No processing route",
}

READING_NAMES = {
    "clean": "Clean",
    "attention": "Worth a look",
    "manipulated": "Manipulation found",
    "inconclusive": "Inconclusive",
    "none": "No suggestions",
    "some": "Some suggestions",
    "many": "Many suggestions",
    "not_assessed": "Not assessed",
    "error": "Error",
}

# Mirrors `PRODUCT_MARK_SVG` in `shared/presentation/checker-result-presentation.mjs`.
PRODUCT_MARK = (
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">'
    '<g fill="none" stroke="#1ed3ee" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">'
    '<rect x="7" y="5" width="35" height="45" rx="5"/><rect x="12" y="12" width="8" height="8" rx="1"/>'
    '<path d="M25 15h11M25 19h9"/><rect x="12" y="26" width="8" height="8" rx="1"/>'
    '<path d="M25 29h11M25 33h9"/><rect x="12" y="40" width="8" height="8" rx="1"/>'
    '<path d="M25 43h8M42 16h6M42 30h6M42 44h6M51 9v39"/><circle cx="51" cy="16" r="4"/>'
    '<circle cx="51" cy="30" r="4"/><circle cx="51" cy="44" r="4"/></g>'
    '<g fill="none" stroke="#ff9f2f" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">'
    '<rect x="31" y="38" width="27" height="20" rx="4"/><path d="m39 48 4 4 8-9"/></g></svg>'
)

REPORT_CSS = """:root{color-scheme:light;--ink:#0f1115;--muted:#4d5761;--soft:#5a6470;--line:#ddd5c9;--paper:#f2ede6;--card:#fff;--orange:#fb700a;--blue:#0068b3}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 "Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
main{max-width:63rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1,h2,h3,h4{line-height:1.15;margin:0}
h2{font:700 1.35rem/1.15 Georgia,"Times New Roman",serif}
h3{font:700 1.1rem/1.15 Georgia,"Times New Roman",serif}
h4,.oaci-subhead{font:700 .78rem/1.15 "Inter",ui-sans-serif,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--soft);margin:.9rem 0 .35rem}
p{margin:.5rem 0}
.oaci-kicker{margin:0 0 .25rem;color:var(--soft);font-size:.68rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.oaci-quiet{color:var(--soft);font-size:.85rem}
.oaci-meta{color:var(--soft);font-size:.78rem;overflow-wrap:anywhere}
.oaci-panel{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:1.15rem;margin:1rem 0}
.oaci-mast{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start;background:var(--ink);color:#fff;border-radius:.9rem;border-bottom:5px solid var(--orange);padding:1.25rem;margin-top:.5rem}
.oaci-mast svg{display:block;width:52px;height:52px}
.oaci-mast h1{font:700 1.6rem/1.1 Georgia,"Times New Roman",serif}
.oaci-mast .oaci-kicker{color:#ffad7b}
.oaci-mast p{margin:.35rem 0 0;color:#cdd3d9;font-size:.9rem}
.oaci-mast>div:last-child{margin-left:auto;text-align:right;font-size:.8rem;color:#cdd3d9}
/* The five band names are their own full-width row beneath both the dial and the verdict copy.
   Inside the dial's column they sat on the same lines as the verdict sentences at every width
   between about 560 and 800 CSS px, and the two read as one collided row. Mirrors the hero grid in
   `shared/report/checker-report-html.mjs` (Lane D3 section 1). */
.oaci-verdict{display:grid;grid-template-columns:minmax(0,20rem) minmax(0,1fr);gap:1.25rem 1.5rem;align-items:center}
.oaci-gauge{grid-row:1;grid-column:1;min-width:0}
.oaci-verdict-body{grid-row:1;grid-column:2;min-width:0;max-width:46em}
.oaci-dial{display:block;width:100%;max-width:20rem;height:auto;margin:0 auto}
.oaci-bands{grid-row:2;grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.4rem .5rem;margin:0;padding:0;list-style:none}
.oaci-bands li{border-top:5px solid var(--band);padding:.35rem .15rem;font-size:.72rem;font-weight:700;text-align:center;color:var(--soft);overflow-wrap:anywhere}
.oaci-bands li[aria-current=true]{color:var(--ink);background:#00000008}
.oaci-level{display:inline-block;padding:.2rem .6rem;border-radius:999px;background:var(--band,#0f1115);color:#fff;font-size:.78rem;font-weight:800;letter-spacing:.02em}
.oaci-score{font:700 3rem/1 Georgia,"Times New Roman",serif;margin:.5rem 0 .2rem}
.oaci-lede{font-size:1.02rem}
.oaci-axes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem}
.oaci-axis{background:var(--card);border:1px solid var(--line);border-top:4px solid var(--blue);border-radius:.7rem;padding:.9rem;min-width:0}
.oaci-axis[data-axis=integrity]{border-top-color:var(--orange)}
.oaci-axis[data-axis=editorial]{border-top-color:#1a7349}
.oaci-axis[data-axis=means]{border-top-color:#1a7349}
.oaci-axis[data-axis=not]{border-top-color:var(--orange)}
.oaci-axis h3{margin:.15rem 0 .35rem}
.oaci-axis p{font-size:.86rem;color:var(--muted)}
.oaci-axis ul{margin:.4rem 0 0;padding-left:1rem;color:var(--soft);font-size:.76rem}
.oaci-bars{margin:.5rem 0;padding:0;list-style:none}
.oaci-bars li{display:grid;grid-template-columns:6.5rem minmax(0,1fr) 3.2rem 7.5rem;gap:.6rem;align-items:center;padding:.35rem 0;font-size:.82rem}
.oaci-bars li[data-strongest=true] .oaci-bar-name{font-weight:800}
.oaci-bar-track{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.2rem;min-width:0}
.oaci-bar-track i{height:.7rem;border-radius:.2rem;background:#e6ded2}
.oaci-bar-track i[data-on=true]{background:var(--band)}
.oaci-bar-score{font:700 1rem/1 Georgia,"Times New Roman",serif;text-align:right}
.oaci-bar-level{color:var(--muted);font-size:.78rem}
.oaci-section{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--band);border-radius:.7rem;padding:1rem;margin:.75rem 0}
.oaci-section header{display:flex;gap:1rem;align-items:baseline;justify-content:space-between}
.oaci-section header b{font:700 1.7rem/1 Georgia,"Times New Roman",serif;color:var(--band)}
.oaci-section[data-strongest=true]{box-shadow:inset 0 0 0 1px var(--ink)}
blockquote{margin:.7rem 0;padding:.65rem .85rem;border-left:3px solid var(--line);background:var(--paper);font:italic 1rem/1.55 Georgia,"Times New Roman",serif;overflow-wrap:anywhere}
.oaci-evidence{margin:0;padding:0;list-style:none}
.oaci-evidence li{padding:.3rem 0;font-size:.85rem;color:var(--muted)}
.oaci-evidence strong{display:block;color:var(--ink)}
.oaci-evidence span,.oaci-evidence small{display:block;color:var(--soft)}
.oaci-evidence small{font-size:.75rem;overflow-wrap:anywhere}
.oaci-checks{margin:0;padding:0;list-style:none}
.oaci-checks li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.2rem .8rem;padding:.65rem 0;border-top:1px solid var(--line)}
.oaci-checks li:first-child{border-top:0}
.oaci-checks strong{display:block}
.oaci-checks p{grid-column:1;margin:.15rem 0 0;color:var(--muted);font-size:.82rem}
.oaci-checks b{font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-align:right;color:#8a3a10}
.oaci-checks b[data-status=pass]{color:#1a7349}
.oaci-checks details{grid-column:1/-1;margin:.4rem 0 0;padding:0;border:0;border-radius:0;background:none}
.oaci-checks summary{font-size:.76rem;font-weight:700;color:#0a5d8f}
.oaci-checks details p,.oaci-checks details li{color:var(--soft);font-size:.76rem;overflow-wrap:anywhere}
.oaci-checks details ul{margin:.25rem 0 0;padding-left:1.1rem}
.oaci-check-group{margin:1rem 0 0}
.oaci-check-group:first-of-type{margin-top:.4rem}
/* "What the model measured": one scale per signal, with the two reference medians marked and this
   passage's own value marked. Mirrors `.oaci-measure*` in
   `shared/presentation/checker-result-presentation.mjs` (Lane D3 section 4). */
.oaci-measured{margin:.9rem 0 0;padding:.75rem .85rem;border:1px solid var(--line);border-radius:.6rem;background:var(--paper)}
.oaci-measured>p:first-of-type{margin-top:0;color:var(--muted);font-size:.8rem}
.oaci-measure{margin:.9rem 0 0}
.oaci-measure-label{display:block;font-size:.85rem;font-weight:700}
.oaci-measure-scale{position:relative;height:5.4rem;margin:.5rem 0 0;border-radius:.3rem;background:linear-gradient(90deg,#e6ded2,#d6cdbf)}
.oaci-measure-scale[data-direction=ai-low]{background:linear-gradient(90deg,#f0ded6,#dfe8e2)}
.oaci-measure-scale[data-direction=ai-high]{background:linear-gradient(90deg,#dfe8e2,#f0ded6)}
.oaci-measure-mark{position:absolute;top:0;transform:translateX(-50%)}
.oaci-measure-mark i{display:block;width:2px;height:1.1rem;margin:0 auto;background:#4a4a4a}
.oaci-measure-mark[data-kind=this] i{width:3px;height:1.5rem;background:var(--ink)}
.oaci-measure-mark small{position:absolute;top:1.2rem;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:.68rem;color:var(--ink)}
.oaci-measure-mark[data-anchor=start] small{left:0;transform:none}
.oaci-measure-mark[data-anchor=end] small{left:auto;right:0;transform:none}
/* Every mark's label gets its own line. Two values on one scale can land within a few thousandths
   of each other, and side by side the labels would print on top of one another at some width. */
.oaci-measure-mark[data-kind=human] small{top:2.6rem}
.oaci-measure-mark[data-kind=this] small{top:4rem;font-weight:800}
.oaci-measure-brief{display:none}
.oaci-measure-spoken,.oaci-measure-basis{margin:.35rem 0 0;color:var(--muted);font-size:.75rem}
.oaci-measure-note{margin:.3rem 0 0;font-size:.82rem}
.oaci-measured-why{margin:.8rem 0 0;padding-top:.6rem;border-top:1px solid var(--line);font-size:.84rem}
.oaci-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.7rem;margin:.5rem 0 0}
.oaci-facts dt{color:var(--soft);font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.oaci-facts dd{margin:.15rem 0 0;font-size:.87rem;overflow-wrap:anywhere}
.oaci-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0 0;padding:0;list-style:none}
.oaci-tags li{border:1px solid var(--line);border-radius:999px;padding:.15rem .55rem;font-size:.75rem;background:var(--paper);overflow-wrap:anywhere}
.oaci-list{margin:.4rem 0 0;padding-left:1.1rem;color:var(--muted);font-size:.88rem}
.oaci-list li{margin-top:.25rem}
details{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:.9rem 1.15rem;margin:1rem 0}
summary{font-weight:800;cursor:pointer}
pre{margin:.75rem 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted)}
footer{margin-top:1.5rem;color:var(--soft);font-size:.8rem}
a{color:#0a5d8f}
@media (max-width:60rem){.oaci-axes{grid-template-columns:1fr}.oaci-verdict{grid-template-columns:1fr}.oaci-gauge{grid-row:1;grid-column:1}.oaci-verdict-body{grid-row:2;grid-column:1;max-width:none}.oaci-bands{grid-row:3;grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:34rem){.oaci-measure-full{display:none}.oaci-measure-brief{display:block}.oaci-measure-scale{height:5.4rem}main{padding:1rem .75rem 2rem}.oaci-mast>div:last-child{margin-left:0;text-align:left}.oaci-bars li{grid-template-columns:minmax(0,1fr) 3.2rem;grid-template-areas:"name score" "track track" "level level";row-gap:.15rem}.oaci-bar-name{grid-area:name}.oaci-bar-score{grid-area:score}.oaci-bar-track{grid-area:track}.oaci-bar-level{grid-area:level}.oaci-bands li{font-size:.66rem}.oaci-score{font-size:2.4rem}}
@media print{body{background:#fff}main{max-width:none;padding:0}.oaci-panel,.oaci-section,.oaci-axis,.oaci-measured,details{break-inside:avoid;box-shadow:none}details{display:block}details>summary{list-style:none}.oaci-bands{grid-row:2;grid-column:1/-1;grid-template-columns:repeat(5,minmax(0,1fr))}}
@page{size:A4;margin:14mm}"""


def _margin(value) -> str:
    """Two decimals for a model-space margin; non-numbers pass through unchanged."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return "" if value is None else str(value)
    return f"{value:.2f}"


def _escape(value) -> str:
    return html.escape(str(value), quote=True)


def _text(value, fallback: str) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def _count(value) -> str:
    return f"{value:,}" if isinstance(value, int) else str(value if value is not None else "—")


def _finite(value) -> bool:
    """True only for a real, finite number. Booleans are not counts."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def pluralise(count, singular: str, plural: str | None = None) -> str:
    """Pick the singular or plural form for a count.

    Port of `pluralise` in `shared/report/report-model.mjs`. Only exactly one is singular, so 0
    and 1.5 both take the plural, which is what English does ("0 items", "1.5 items"). A value
    that is not a number takes the plural, because the sentence around it reads as a list.
    """
    if plural is None:
        plural = f"{singular}s"
    if not _finite(count):
        return plural
    return singular if abs(count) == 1 else plural


def count_phrase(count, singular: str, plural: str | None = None, fallback: str = "Not recorded") -> str:
    """"1 word", "120 words", "Not recorded".

    Port of `countPhrase` in `shared/report/report-model.mjs`. Every count this report prints goes
    through it, so a singular count can never end up next to a plural noun or a plural verb.
    """
    if not _finite(count):
        return fallback
    return f"{_count(count)} {pluralise(count, singular, plural)}"


def _band_index(level) -> int:
    for index, band in enumerate(BANDS):
        if band[0] == str(level):
            return index
    return 0


def _band_colour(level) -> str:
    return BANDS[_band_index(level)][2]


def _level_name(level) -> str:
    return LEVEL_NAMES.get(str(level), str(level))


def _route_name(kind) -> str:
    return ROUTE_NAMES.get(str(kind), str(kind if kind is not None else "not recorded").replace("_", " "))


def _privacy_route_name(route) -> str:
    return PRIVACY_ROUTE_NAMES.get(str(route), str(route if route is not None else "not recorded").replace("_", " "))


def _polar(cx: float, cy: float, radius: float, degrees: float) -> tuple[str, str]:
    radians = math.radians(degrees)
    return f"{cx + radius * math.cos(radians):.2f}", f"{cy - radius * math.sin(radians):.2f}"


def _dial_svg(level, assessed: bool) -> str:
    """Semicircular five-band dial with a needle at the band centre, computed here rather than styled."""
    cx, cy, outer, inner = 160.0, 158.0, 132.0, 86.0
    arcs = []
    for index, band in enumerate(BANDS):
        start, end = 180 - index * 36, 180 - (index + 1) * 36
        ox1, oy1 = _polar(cx, cy, outer, start)
        ox2, oy2 = _polar(cx, cy, outer, end)
        ix2, iy2 = _polar(cx, cy, inner, end)
        ix1, iy1 = _polar(cx, cy, inner, start)
        path = f"M{ox1} {oy1}A{outer:g} {outer:g} 0 0 1 {ox2} {oy2}L{ix2} {iy2}A{inner:g} {inner:g} 0 0 0 {ix1} {iy1}Z"
        opacity = "1" if assessed and band[0] == str(level) else "0.26"
        arcs.append(f'<path d="{path}" fill="{band[2]}" fill-opacity="{opacity}"></path>')
    if assessed:
        tip_x, tip_y = _polar(cx, cy, 116.0, 180 - (_band_index(level) * 36 + 18))
        needle = (
            f'<line x1="{cx:g}" y1="{cy:g}" x2="{tip_x}" y2="{tip_y}" stroke="#0f1115" stroke-width="4" stroke-linecap="round"></line>'
            f'<circle cx="{cx:g}" cy="{cy:g}" r="9" fill="#0f1115"></circle><circle cx="{cx:g}" cy="{cy:g}" r="3.5" fill="#ffffff"></circle>'
        )
        label = f"Five-band AI-pattern dial reading {_level_name(level)}"
    else:
        needle = f'<circle cx="{cx:g}" cy="{cy:g}" r="9" fill="#7b8794"></circle>'
        label = "Five-band AI-pattern dial, not assessed"
    return f'<svg class="oaci-dial" viewBox="0 0 320 172" role="img" aria-label="{_escape(label)}">{"".join(arcs)}{needle}</svg>'


CURRENT_BAND = ' aria-current="true"'
STRONGEST = ' data-strongest="true"'


def _band_legend(level, assessed: bool) -> str:
    """The five band names, as their own full-width row across the hero.

    A key to the scale, read in order, so it is a named list rather than a caption on the dial.
    Mirrors `renderGaugeLegend` in `shared/report/checker-report-html.mjs`.
    """
    items = "".join(
        "<li"
        + (CURRENT_BAND if assessed and band[0] == str(level) else "")
        + f' style="--band:{band[2]}">{_escape(band[1])}</li>'
        for band in BANDS
    )
    return (
        '<ul class="oaci-bands" aria-label="The five bands of the scale, from likely human to'
        f' strongly AI">{items}</ul>'
    )


def _band_cells(level) -> str:
    """Five discrete band cells; only the section's own band is filled, so the strip cannot read as a percentage."""
    return "".join(
        f'<i data-on="true" style="--band:{band[2]}"></i>' if band[0] == str(level) else "<i></i>"
        for band in BANDS
    )


def _measure_scale(meter: SignalMeter) -> str:
    """One meter: a scale with the two reference medians marked and this passage's value marked.

    Positions are clamped a little inside the ends of the scale, because a marker at exactly the
    end pushes its own label off the panel; the printed number is always the measured one. The
    scale itself is hidden from assistive technology and the same reading is given in words
    underneath, so nothing is carried by colour or position alone.
    """
    span = (meter.scale_max - meter.scale_min) or 1

    def place(value: float) -> float:
        return min(97.0, max(3.0, ((value - meter.scale_min) / span) * 100))

    def mark(kind: str, position: float, label: str, brief: str) -> str:
        """Each mark carries a full label and a short one.

        The short label is what a narrow page shows: an unlabelled scale with a dot on it says
        nothing, so the labels shorten rather than disappear.
        """
        left = place(position)
        anchor = "start" if left < 25 else "end" if left > 75 else "middle"
        return (
            f'<span class="oaci-measure-mark" data-kind="{kind}" data-anchor="{anchor}"'
            f' style="left:{left:.2f}%"><i></i>'
            f'<small class="oaci-measure-full">{_escape(label)}</small>'
            f'<small class="oaci-measure-brief">{_escape(brief)}</small></span>'
        )

    marks = []
    if meter.ai_median is not None:
        marks.append(mark("machine", meter.ai_median, f"typical AI ~{meter.ai_median}{meter.unit}", f"AI ~{meter.ai_median}{meter.unit}"))
    if meter.human_median is not None:
        marks.append(mark("human", meter.human_median, f"typical human ~{meter.human_median}{meter.unit}", f"human ~{meter.human_median}{meter.unit}"))
    marks.append(mark("this", meter.value, f"this passage {meter.value}{meter.unit}", f"this {meter.value}{meter.unit}"))
    if meter.ai_median is None or meter.human_median is None:
        direction = "none"
        spoken = (
            f"{meter.label}: this passage {meter.value}{meter.unit}, with no typical AI or typical"
            " human marker, because none was measured."
        )
    else:
        direction = "ai-high" if meter.ai_median > meter.human_median else "ai-low"
        spoken = (
            f"{meter.label}: this passage {meter.value}{meter.unit}, typical AI about"
            f" {meter.ai_median}{meter.unit}, typical human about {meter.human_median}{meter.unit}."
        )
    informative = "" if meter.informative else ' data-oaci-informative="false"'
    return (
        f'<div class="oaci-measure" data-oaci-signal="{_escape(meter.id)}"{informative}>'
        f'<b class="oaci-measure-label">{_escape(meter.label)}</b>'
        f'<div class="oaci-measure-scale" data-direction="{direction}" aria-hidden="true">{"".join(marks)}</div>'
        f'<p class="oaci-measure-spoken">{_escape(spoken)}</p>'
        f'<p class="oaci-measure-note">{_escape(meter.note)}</p>'
        # The evenness basis already quotes its own AUROC, so it is not stated twice.
        f'<p class="oaci-measure-basis">{_escape("Reference: " + meter.basis + "." + ("" if "AUROC" in meter.basis else f" AUROC {meter.auroc}."))}</p>'
        "</div>"
    )


def _measured_block(section) -> str:
    """"What the model measured" for one section, or nothing where the passage is too short.

    Every meter is a signal this project measured on its own corpus, computed here from the passage
    the contract supplied. A passage too short for an honest reading simply shows fewer meters. The
    block is descriptive: the level came from the trained model, which reads the passage whole.
    """
    meters = measure_section_signals(section.get("passage"))
    if not meters:
        return ""
    why = explain_section_signals(meters, section.get("level"), _level_name(section.get("level")))
    intro = (
        "Signals we can measure on this passage, each against the point where AI writing and human"
        " writing typically sit. Those reference points were measured over whole long-form"
        " documents, so read them as context for one passage rather than as a verdict on it."
    )
    return (
        f'<div class="oaci-measured" data-oaci-measured="{len(meters)}">'
        "<h4>What the model measured</h4>"
        f"<p>{_escape(intro)}</p>"
        + "".join(_measure_scale(meter) for meter in meters)
        + f'<p class="oaci-measured-why"><b>What stands out when this passage is measured</b><br>{_escape(why)}</p>'
        "</div>"
    )


def _axis_card(axis_id: str, label: str, value: str, reason: str, limitations) -> str:
    notes = [item for item in (limitations or []) if isinstance(item, str)][:2]
    listed = "<ul>" + "".join(f"<li>{_escape(note)}</li>" for note in notes) + "</ul>" if notes else ""
    return (
        f'<article class="oaci-axis" data-axis="{_escape(axis_id)}"><p class="oaci-kicker">{_escape(label)}</p>'
        f"<h3>{_escape(value)}</h3><p>{_escape(reason)}</p>{listed}</article>"
    )


def _finding_names(items) -> str:
    if not items:
        return '<p class="oaci-quiet">No finding was recorded.</p>'
    cells = "".join(
        f"<li>{_escape(item.get('rule_id') or item.get('kind') or item.get('category') or item.get('id') or 'Recorded finding')}</li>"
        for item in items
    )
    sentence = f"{count_phrase(len(items), 'finding')} {pluralise(len(items), 'was', 'were')} recorded."
    return f'<p class="oaci-quiet">{_escape(sentence)}</p><ul class="oaci-tags">{cells}</ul>'


def _section_bars(sections, strongest) -> str:
    if not sections:
        return ""
    rows = "".join(
        "<li"
        + (STRONGEST if section.get("index") == strongest else "")
        + ">"
        + f'<span class="oaci-bar-name">Section {section["index"] + 1}</span>'
        f'<span class="oaci-bar-track">{_band_cells(section.get("level"))}</span>'
        f'<span class="oaci-bar-score">{_escape(section.get("display_score"))}</span>'
        f'<span class="oaci-bar-level">{_escape(_level_name(section.get("level")))}</span></li>'
        for section in sections
    )
    return (
        f'<ol class="oaci-bars">{rows}</ol>'
        '<p class="oaci-quiet">Each strip marks which of the five bands the section falls in.'
        " It is not a percentage of the text.</p>"
    )


def _section_cards(sections, strongest) -> str:
    if not sections:
        return '<p class="oaci-quiet">No section was scored by a trained model in this run.</p>'
    cards = []
    for section in sections:
        evidence = "".join(
            f"<li><strong>{_escape(_text(item.get('summary'), 'Recorded evidence'))}</strong>"
            + (f"<span>{_escape(item['detail'])}</span>" if item.get("detail") else "")
            + (f"<small>{_escape(item['basis'])}</small>" if item.get("basis") else "")
            + "</li>"
            for item in section.get("evidence", [])
        )
        evidence_block = (
            f'<ul class="oaci-evidence">{evidence}</ul>' if evidence else '<p class="oaci-quiet">No section evidence was supplied.</p>'
        )
        passage = (
            f"<blockquote>{_escape(section['passage'])}</blockquote>"
            if section.get("passage")
            else f'<p class="oaci-quiet">Content-free locator recorded: UTF-16 {_escape(section.get("start_utf16"))}–{_escape(section.get("end_utf16"))}.</p>'
        )
        strongest_note = " · strongest passage in this draft" if section.get("index") == strongest else ""
        cards.append(
            f'<article class="oaci-section" style="--band:{_band_colour(section.get("level"))}"'
            + (STRONGEST if section.get("index") == strongest else "")
            + ">"
            + f'<header><div><p class="oaci-kicker">Section {section["index"] + 1} · {_escape(count_phrase(section.get("word_count"), "word", fallback="word count not recorded"))}</p>'
            f'<h3>{_escape(_level_name(section.get("level")))}</h3></div><b>{_escape(section.get("display_score"))}</b></header>'
            f"{passage}{_measured_block(section)}<h4>Why it reads this way</h4>{evidence_block}"
            f'<p class="oaci-meta">Raw margin {_escape(_margin(section.get("raw_margin")))} · UTF-16 {_escape(section.get("start_utf16"))}–{_escape(section.get("end_utf16"))}{strongest_note}</p>'
            "</article>"
        )
    return "".join(cards)


def _check_group(method_id: str) -> str:
    family = str(method_id).split(".", 1)[0]
    for label, families in CHECK_GROUPS:
        if family in families:
            return label
    return OTHER_CHECK_GROUP


def _method_row(method) -> str:
    """One check: its friendly name, the status chip, one plain sentence, and a Details disclosure.

    The method id, the version and the route are the identities another person needs to reproduce
    the run, not what a reader needs first, so they sit behind the disclosure with the check's own
    recorded limitations. Mirrors the row layout in
    `shared/presentation/checker-result-presentation.mjs` (Lane D3 section 3).
    """
    status = str(method.get("status"))
    status_name = METHOD_STATE_NAMES.get(status, status.replace("_", " "))
    meaning = METHOD_STATE_SENTENCES.get(status, "This check reported an outcome outside the recorded vocabulary.")
    route = method.get("privacy_route")
    identity = " · ".join(
        part
        for part in (
            str(method.get("id")),
            str(method["version"]) if method.get("version") else "",
            f"{str(route).replace('_', ' ')} route" if route else "",
        )
        if part
    )
    limitations = [item for item in (method.get("limitations") or []) if isinstance(item, str)]
    limits = (
        "<ul>" + "".join(f"<li>{_escape(item)}</li>" for item in limitations) + "</ul>"
        if limitations
        else "<p>No limitation was recorded for this check.</p>"
    )
    return (
        "<li>"
        f"<div><strong>{_escape(_text(method.get('provider_or_method'), str(method.get('id'))))}</strong></div>"
        f'<b data-status="{_escape(status)}">{_escape(status_name)}</b>'
        f"<p>{_escape(meaning)}</p>"
        f"<details><summary>Details</summary><p>{_escape(identity)}</p>{limits}</details>"
        "</li>"
    )


def _method_rows(methods) -> str:
    """Every named check, as one row each, grouped by the reading it feeds."""
    if not methods:
        return '<p class="oaci-quiet">No named check was recorded.</p>'
    grouped: dict[str, list] = {}
    for method in methods:
        grouped.setdefault(_check_group(method.get("id")), []).append(method)
    order = [label for label, _ in CHECK_GROUPS] + [OTHER_CHECK_GROUP]
    blocks = []
    for label in order:
        rows = grouped.get(label)
        if not rows:
            continue
        blocks.append(
            f'<div class="oaci-check-group"><h3 class="oaci-subhead">{_escape(label)}</h3>'
            f'<ul class="oaci-checks">{"".join(_method_row(method) for method in rows)}</ul></div>'
        )
    caption = (
        f"{count_phrase(len(methods), 'named check')} ran in this run."
        f" {pluralise(len(methods), 'It is', 'Each is')} recorded with its outcome, what that means"
        " for this draft, and a disclosure holding its id, its version and its limits."
    )
    return f'<p class="oaci-quiet">{_escape(caption)}</p>{"".join(blocks)}'


def _bullets(items) -> str:
    return '<ul class="oaci-list">' + "".join(f"<li>{_escape(item)}</li>" for item in items) + "</ul>"


def _facts(pairs) -> str:
    cells = "".join(f"<div><dt>{_escape(term)}</dt><dd>{_escape(description)}</dd></div>" for term, description in pairs)
    return f'<dl class="oaci-facts">{cells}</dl>'


def checker_html(result: dict, product_version: str = __version__) -> str:
    """Renders the complete branded printable report for a canonical checker result."""
    axes = result.get("axes") or {}
    ai = axes.get("ai_pattern") or {}
    integrity = axes.get("text_integrity") or {}
    editorial = axes.get("editorial") or {}
    route = result.get("route") or {}
    model = route.get("model") or {}
    source = result.get("source") or {}
    controls = result.get("abuse_controls") or {}
    provenance = result.get("provenance") or {}
    sections = result.get("sections") or []
    methods = result.get("methods") or []
    limitations = result.get("limitations") or []
    strongest = ai.get("strongest_section_index")
    assessed = ai.get("assessment_status") == "assessed" and bool(ai.get("level"))

    verdict_label = _level_name(ai.get("level")) if assessed else "Not assessed"
    verdict_meaning = (
        LEVEL_MEANINGS.get(str(ai.get("level")), "")
        if assessed
        else "No trained model ran on this text, so there is no AI-pattern reading."
        " Character and writing checks cannot supply one."
    )
    verdict_reason = _text(ai.get("reason"), verdict_meaning)
    section_count = source.get("section_count") if _finite(source.get("section_count")) else len(sections)
    strongest_section = next(
        (section for section in sections if section.get("index") == strongest), None
    )
    # Worded as `strongestSentence` in `shared/report/report-model.mjs`. The count is followed by a
    # comma rather than a verb, so a one-section draft cannot read as "1 of 1 is".
    strongest_line = (
        f"The strongest evidence is in section {sections.index(strongest_section) + 1}"
        f" of {len(sections)}, which scored {strongest_section.get('display_score')}"
        f" and sits in the {_level_name(strongest_section.get('level'))} band."
        if strongest_section is not None
        else "No model-scored passage was recorded in this run."
    )
    accepted_input = (
        f"60–{_count(controls.get('max_words'))} {pluralise(controls.get('max_words'), 'word')}"
        f" and up to {_count(controls.get('max_characters'))}"
        f" UTF-16 {pluralise(controls.get('max_characters'), 'character')};"
        f" request body up to {count_phrase(controls.get('max_request_bytes'), 'byte', fallback='an unrecorded size')}."
        " Longer input is refused, never shortened."
        if controls.get("max_words")
        else "Input limits were not recorded for this route."
    )
    route_facts = [
        ("Where it ran", _text(route.get("location"), "Not recorded")),
        ("Route", _route_name(route.get("kind"))),
        ("Privacy route", _privacy_route_name(route.get("privacy_route"))),
        ("Consent", _text(route.get("consent"), "not recorded").replace("_", " ")),
        ("What happens to the text", _text((route.get("retention") or {}).get("statement"), "No retention statement was recorded.")),
        (
            "Model",
            f"{model['identity']} · {_text(model.get('precision'), 'precision not recorded')}"
            if model.get("identity")
            else "No trained model ran",
        ),
        ("Model file hash", _text(model.get("artefact_hash"), "not applicable")),
        ("Decision rule", _text((model.get("flag_rule") or {}).get("expression"), "not applicable")),
        ("Draft hash", _text(source.get("content_hash"), "not recorded")),
        ("Normalised hash", _text(source.get("normalised_hash"), "not recorded")),
        (
            "Draft size",
            f"{count_phrase(source.get('word_count'), 'word')}"
            f" · {count_phrase(source.get('character_count'), 'character')}"
            f" · {count_phrase(section_count, 'section')}",
        ),
        ("Accepted input", accepted_input),
    ]
    protected = provenance.get("protected_facts") or {}
    protected_count = protected.get("count") if _finite(protected.get("count")) else 0
    categories = protected.get("categories") or []
    protected_sentence = (
        "No protected items were identified in this draft."
        if protected_count == 0
        else f"{count_phrase(protected_count, 'protected item')}"
        f" {pluralise(protected_count, 'was', 'were')} identified and left untouched."
    )
    categories_sentence = (
        f"{pluralise(len(categories), 'Category', 'Categories')}: {', '.join(str(item) for item in categories)}."
        if categories
        else "No categories were recorded."
    )
    c2pa_files = provenance.get("c2pa_files") or []
    provenance_facts = [
        ("Protected facts held", f"{protected_sentence} {categories_sentence}"),
        ("C2PA text wrapper", _text((provenance.get("c2pa_text") or {}).get("status"), "not checked").replace("_", " ")),
        ("C2PA files inspected", count_phrase(len(c2pa_files), "file")),
        (
            "Safe fixes",
            "Previewed first and applied only after explicit approval."
            if provenance.get("safe_fixes")
            else "No safe-fix record was supplied.",
        ),
    ]
    watermarks = provenance.get("watermarks") or []
    watermark_block = (
        '<ul class="oaci-list">'
        + "".join(
            f"<li><strong>{_escape(item.get('method_id'))}</strong> — {_escape(str(item.get('outcome')).replace('_', ' '))}"
            f" ({_escape(str(item.get('method_status')).replace('_', ' '))})"
            + (f" {_escape(' '.join(item.get('limitations') or []))}" if item.get("limitations") else "")
            + "</li>"
            for item in watermarks
        )
        + "</ul>"
        if watermarks
        else '<p class="oaci-quiet">No watermark method was recorded for this run.</p>'
    )
    limitation_block = (
        '<ul class="oaci-list">' + "".join(f"<li>{_escape(item)}</li>" for item in limitations) + "</ul>"
        if limitations
        else '<p class="oaci-quiet">No limitations were recorded with this result.</p>'
    )
    machine = _escape(json.dumps(result, ensure_ascii=False, indent=2))
    verdict_colour = _band_colour(ai.get("level")) if assessed else "#4d5761"

    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opace AI Content Checker &amp; Detector evidence report</title><style>{REPORT_CSS}</style></head><body><main>
<header class="oaci-mast">{PRODUCT_MARK}<div><p class="oaci-kicker">Opace AI Content Checker &amp; Detector</p><h1>Evidence report</h1><p>Evidence, not guarantees. No AI checker can prove who wrote a text; this is a pattern reading.</p></div><div><p>Report created<br>{_escape(_text(result.get("generated_at"), "not recorded"))}</p><p>Local engine {_escape(product_version)}</p></div></header>

<section class="oaci-panel oaci-verdict" aria-label="Overall AI-pattern reading">
  <div class="oaci-gauge">{_dial_svg(ai.get("level"), assessed)}</div>
  <div class="oaci-verdict-body">
    <p class="oaci-kicker">Your result</p>
    <span class="oaci-level" style="--band:{verdict_colour}">{_escape(verdict_label)}</span>
    <p class="oaci-score">{_escape(ai.get("display_score") if assessed else "—")}</p>
    <p class="oaci-quiet">A zero-to-one pattern reading. It is not a percentage of the text written by AI.</p>
    <p class="oaci-lede">{_escape(verdict_meaning)}</p>
    <p>{_escape(verdict_reason)}</p>
    <p><strong>Strongest section:</strong> {_escape(strongest_line)}</p>
    <p class="oaci-quiet">{_escape(HONESTY_LINE)}</p>
  </div>
  {_band_legend(ai.get("level"), assessed)}
</section>

<section class="oaci-panel" aria-label="Three independent readings">
  <p class="oaci-kicker">Three independent readings</p><h2>Each reading answers a different question</h2>
  <div class="oaci-axes">
    {_axis_card("ai", "AI-pattern reading", verdict_label, verdict_reason, ai.get("limitations"))}
    {_axis_card("integrity", "Text integrity", READING_NAMES.get(str(integrity.get("reading")), "Not assessed"), _text(integrity.get("reason"), "No text-integrity reading was recorded."), integrity.get("limitations"))}
    {_axis_card("editorial", "Editorial signals", READING_NAMES.get(str(editorial.get("reading")), "Not assessed"), _text(editorial.get("reason"), "No editorial reading was recorded."), editorial.get("limitations"))}
  </div>
  <h4>Text-integrity findings</h4>{_finding_names(integrity.get("findings"))}
  <h4>Editorial findings</h4>{_finding_names(editorial.get("findings"))}
</section>

<section class="oaci-panel" aria-label="Scored sections">
  <p class="oaci-kicker">Section evidence</p><h2>How each part of the draft scored</h2>
  {_section_bars(sections, strongest)}
  {_section_cards(sections, strongest)}
</section>

<section class="oaci-panel" aria-label="Route, model and privacy">
  <p class="oaci-kicker">Run record</p><h2>Where this ran, on what, and what was kept</h2>
  {_facts(route_facts)}
</section>

<section class="oaci-panel" aria-label="Protected facts, provenance and watermarks">
  <p class="oaci-kicker">Facts and provenance</p><h2>Protected details, file origin and watermarks</h2>
  {_facts(provenance_facts)}
  <h3 class="oaci-subhead">Watermark checks</h3>
  {watermark_block}
</section>

<section class="oaci-panel" aria-label="Named checks">
  <p class="oaci-kicker">Named checks</p><h2>Every check that ran, and what it cannot tell you</h2>
  {_method_rows(methods)}
</section>

<section class="oaci-panel" aria-label="What this means and does not mean">
  <p class="oaci-kicker">Reading the result</p><h2>What this means, and what it does not</h2>
  <div class="oaci-axes">
    <article class="oaci-axis" data-axis="means"><h3>What this means</h3>{_bullets(MEANS if assessed else MEANS_UNASSESSED)}</article>
    <article class="oaci-axis" data-axis="not"><h3>What this does not mean</h3>{_bullets(DOES_NOT_MEAN)}</article>
  </div>
</section>

<section class="oaci-panel" aria-label="Correct use and limitations">
  <p class="oaci-kicker">Correct use</p><h2>How to read this report</h2>
  <p>Treat the reading as evidence to review, not a decision. Read the strongest section yourself before acting on it, and never use one result on its own to accuse a person of anything.</p>
  {_bullets(CORRECT_USE)}
  <h3 class="oaci-subhead">Recorded limitations</h3>
  {limitation_block}
</section>

<details><summary>Complete machine record</summary><pre>{machine}</pre></details>

<footer><p>Result {_escape(_text(result.get("result_id"), "not recorded"))} · contract {_escape(_text(result.get("contract_version"), "not recorded"))} · profile {_escape(_text(result.get("profile"), "not recorded"))}</p><p><a href="{PRODUCT_HOME}">Opace AI Content Checker &amp; Detector</a> · <a href="{PRODUCT_SUPPORT}">Contact Opace</a></p></footer>
</main></body></html>
"""

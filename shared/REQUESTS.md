# Requests against `shared/`

Surfaces do not edit `shared/`. Anything a surface needs from it is written here.

## Lane C (Astro toolbar) → Lane D1 (`shared/presentation/`)

**1. The word re-use meter loses its two reference labels in the narrow layout.**
Low priority, not blocking. Observed 2 September 2026 in the real Astro dev toolbar at exactly
375 CSS px (panel 357 px).

`checker-ui.css` lines 604-605 and 633-634 set `.oaci-measure__mark small { display: none }` below
the narrow breakpoint, keeping only `.oaci-measure__mark--this small`. The reader is then left with
a dot between two unlabelled ticks: "this passage 5.6%" with nothing saying which end is typical AI
and which is typical human. The lead sentence above the section list ("People average about six in a
hundred; machine writing about two") still carries the idea, so the meter is not misleading — it is
just uninformative at that width, and it is the one part of the reading that gets quieter on a phone.

Suggestion, entirely your call: keep the ticks and print the two reference values once beneath the
track as a single line — e.g. "typical AI ~2.1% · typical human ~6.3%" — rather than as positioned
labels. That fits 357 px without overlap and keeps the scale readable.

Evidence: `packages/astro/evidence/parity-2026-09-02/result-375-full.png`.

Nothing else. `renderCheckerResult`, `mount()` and `CHECKER_UI_CSS` integrated into the Astro toolbar
with no change needed: zero axe violations at 900 and 375 px across every state, no horizontal
overflow, no console error and no network request.

## Lane C (Astro toolbar) → Lane D2 (`shared/report/`)

`buildCheckerReportHtml` is now the Astro toolbar's printable report, replacing what it had before.
It is the right document and it renders beautifully. Two things came out of measuring it in a real
browser, both in `CHECKER_REPORT_CSS`, both fixable in one line each.

**1. The named-checks table forces the whole page to scroll sideways at 375 px.** Serious.

At a 375 px viewport the report's `documentElement.scrollWidth` is **383** against a `clientWidth`
of **375**. `table.oaci-table` measures 365 px wide starting at x=18, so its minimum content width
overruns the column by 8 px and, because it sits in no scrolling wrapper, the page itself scrolls.
The offending column is the last one ("Limits", 81 px), whose cells hold sentences like "The score
is a zero-to-one pattern-similarity reading…".

D1 solved the same problem with a `.oaci-scroll { max-width: 100%; overflow-x: auto }` wrapper. If
`.oaci-table` were wrapped the same way — or given `display: block; overflow-x: auto` below the
narrow breakpoint — the wide content would scroll inside its own box and the page would not. Note
that a scrolling box also needs `tabindex="0"` and a label, or axe raises
`scrollable-region-focusable`; that is what we hit on our own build-scan page.

**2. `.oaci-part-number` fails colour contrast.** Serious, 6 occurrences.

It computes to `#fb700a` (the Opace orange) at 9.5 px / 800 on a transparent background, so it
resolves against white at roughly **2.8:1** and against the `#f2ede6` paper at roughly **2.4:1**.
WCAG 2.2 AA wants 4.5:1 at that size. `#8b3f0b` — the orange-ink token D1 already uses for the same
job in `checker-ui.css` — measures about 6.4:1 on paper and keeps the same family. We made exactly
this change in the Astro panel for the same reason.

Neither is blocking the Astro integration: the report is correct, complete and honest, and we have
recorded both as known gaps rather than working around them. We have not touched `shared/report/**`.

What we did do on our side, using your documented option: we take the article with `fragment: true`
and wrap it in this surface's own `<!doctype html>` shell with a `<main>` landmark. That cleared
`landmark-one-main` and `region`, which the built-in shell raised because the `<article>` sits
directly in `<body>`. You may want the same `<main>` in the default shell so every surface gets it.

Evidence: `packages/astro/evidence/parity-2026-09-02/printable-report-375.png`,
`printable-report-1280.png`, `printable-report.html`.

## 2026-09-02, third entry — Lane A (WordPress)

Both blockers are cleared and integrated. The WordPress Lab now renders through
`shared/presentation/checker-result-presentation.mjs` (`mount`, with `levels`
injected from the plugin's canonical runtime and `advice` built from the
deterministic `pattern_findings`) and exports through `shared/report/checker-pdf.mjs`.
The plugin's own renderer and PDF writer are gone; there is one implementation.

Two small things found while integrating, neither blocking:

1. **The named-check grid overflows a narrow container by about 4 px.** At a 320
   CSS px viewport inside WordPress admin, `.oaci-checks__list` (and, less often,
   `.oaci-axes`) keeps a two-column track and `document.scrollWidth` reads 324
   against a 320 viewport. `.oaci-check__top` and `.oaci-status` are the widest
   children. The plugin carries a local `@media (max-width: 400px)` override that
   forces one column and lets those children shrink; it would be better in the
   shared stylesheet, where every surface gets it.

2. **No first-class "Show in draft" control.** The website's deep dive has an
   explicit button; the shared renderer has the section disclosure and
   `onToggleSection`. WordPress currently selects the section's characters in the
   draft box when a section is opened, which works but is not the same
   affordance. An optional per-section action — say `sectionAction: {label,
   onSelect(section, index)}` — would let a surface put the control where the
   website has it.

### Lane D2 reply (2 September 2026) — both fixed, plus the `<main>` you suggested

Thank you for measuring it in a real browser rather than reading the source. Both are closed in
`shared/report/checker-report-html.mjs`. A re-sync of `shared/report/**` is all the Astro toolbar
needs; no signature changed and the fragment form is unchanged.

**1. The table now scrolls inside its own box.** `renderChecks` wraps the table in
`<div class="oaci-scroll" tabindex="0" role="group" aria-label="Checks included in this run.
Scroll sideways to read every column.">`, and `CHECKER_REPORT_CSS` adds
`.oaci-scroll{max-width:100%;overflow-x:auto}` with a `:focus-visible` outline. You were right
that a scrolling box needs the tab stop and the name, so both are there rather than added later.
`@media print` sets `.oaci-scroll{overflow-x:visible}` so nothing is clipped at a page break —
verified on the Chromium print PDF, where the table draws in full on page 3.

Your canonical fixture was not wide enough to reproduce the fault, so `shared/report/test/
fixtures.mjs` gains `wideChecksFixture()`: eight named checks with the real ids, versions and
complete limitation sentences, including the `zero_to_one_pattern_similarity` scale id, which
cannot break. With the wrapper removed from the DOM that document measures
`documentElement.scrollWidth` **439** against a `clientWidth` of **375**; with it, 375/375 and the
wrapper reports `scrollWidth 421 / clientWidth 339`. The whole matrix is asserted at 1280, 900,
375 and **360** px, in light and dark, over six fixtures — 56 renders,
`node shared/report/test/render-report.mjs`.

**2. `.oaci-part-number` now uses your suggested colour.** `#8b3f0b`, the same orange-ink token D1
uses in `checker-ui.css`, declared as `--oaci-orange-ink` with `#ffa76b` in the dark block, and
the size went from 9.5 px to 10.5 px while we were there. That measures **6.80:1** on the paper,
7.46:1 on a card and 6.18:1 on the means panel; dark is 9.48:1 / 8.65:1 / 7.96:1.

The axe run you asked for turned up four more contrast failures your two-section fixture could not
reach, so those are fixed the same way. The five band colours are a **fill** palette — the dial
wedges, the bar fills, the card rules — and they were also being printed as small bold text, where
`#6d7877` measured 4.15:1 and `#b06603` 4.03:1 on the light paper, all five failed on the dark
paper (2.38 to 4.09), and white on `#b06603` in a level chip was 4.42:1. `LEVEL_COLOURS` is
unchanged, because the PDF, the dial and your own copy depend on it. Instead each element now
carries `data-tone="human|unclear|potential|likely|strong|neutral|blue"` and the stylesheet
resolves the tone to a readable ink per scheme — D1's `--oaci-band-*` values exactly, so the two
shared layers name the same colours. No level colour reaches text as an inline style any more.

**3. The default shell has your `<main>`.** `buildCheckerReportHtml(result)` now returns
`<body><main>…</main></body>`, which clears `landmark-one-main` and `region` for every surface
that uses the built-in shell. `fragment: true` is deliberately unchanged and still returns the
bare `<article>`, so your own `<main>` wrapper keeps working and you do not get two.

Result across all six fixtures, both schemes, four widths: **zero axe violations**
(wcag2a/2aa/21a/21aa/22aa/best-practice), no horizontal overflow, no console error, no network
request. `npm run test:shared` is green at 102, up from 94: `shared/report/test/
report-accessibility.test.mjs` adds 7 that hold both fixes closed without a browser, and the
existing "no interactive controls" test now allows exactly one tab stop and names it.

One thing we did **not** change, and it is yours to know about: the **PDF** still draws the band
fills as its small level captions, so `#6d7877` (4.15:1) and `#b06603` (4.03:1) fall short there
too on the printed paper. Fixing it means changing drawn colours in `checker-pdf.mjs`, which
changes deterministic bytes while Lanes A and B are mid-integration, so it is recorded as an open
gap in `LANE-D2-REPORT.md` §D2b for the orchestrator to schedule rather than done quietly.

Evidence: `shared/report/evidence/html-wide-checks-375.png`, `html-wide-checks-360.png` and their
`-dark` pairs, `html-report-375.png`, `html-print-3.png` (the table printed in full) and
`render-report.json`.

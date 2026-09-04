# Changelog

All notable changes to `@opace/astro-content-integrity` are recorded here.

## 0.2.2 - 2026-09-04

- **Redrew the panel shell.** The chrome around the reading now speaks the same premium language as
  the WordPress Lab: a layered panel shadow with a hairline orange rule under the masthead, the
  colour logo tile, a recessed tab rail with one unmistakable active tab, raised cards on a 4-point
  spacing scale, and one dominant orange primary button that lifts under the pointer.
- Route choices are selectable tiles with a coloured left rail and status pills — Recommended and
  Private, no limit on the on-device route, No AI reading on the quick route — so what choosing a
  route means is legible before it is chosen.
- Every notice now carries a mark and a way out: the held-back reading offers to change how the page
  is read, and the no-rewriting panel opens the Check page.
- Empty panels are drawn rather than left blank: the reading, the patch preview and the receipts tab
  each say what will appear there and what to do first.
- The shell answers dark mode through the same token names the shared result stylesheet uses, so the
  chrome and the reading flip together instead of one going dark on its own. Reduced motion still
  collapses every transition, and forced colours keep every edge.
- **Fixed a false refusal.** Opening the printable report used `window.open(..., 'noopener')`, which
  always returns null, so the panel told every developer their browser had blocked a report that was
  sitting open in the next tab. The handle is taken and its `opener` severed instead: the same
  boundary, and a status line that says what actually happened.

## 0.2.1 - 2026-09-03

- **Removed the separate download tick box.** The primary button now says what pressing it will do,
  and pressing it is the consent: with no verified model on the machine it reads "Download model and
  check" and carries the 34.5 MB size and the published SHA-256 prefix beside it, with the data-file
  explanation kept as a note underneath; once the model is cached it reads "Check this page" and
  downloads nothing. Progress, cancellation and "Clear the 34.5 MB model file" are unchanged.
- A cached model that has gone, or that fails its pinned hash, is now a refusal rather than a silent
  34.5 MB download: the reading is held back, the button offers the download again, and the reason is
  written out.
- Named the product the way the website does, everywhere a person can read it: the Dev Toolbar entry
  is **Opace AI Content Integrity**, the tab rail and the build log line say the same, and no surface
  says a bare "Content Integrity".

## 0.2.0 - 2026-09-02

- Rebuilt the toolbar panel in the product's visual language: paper canvas, white panels, the Opace
  orange, the five named bands, the real logo, "Evidence, not guarantees", and the Outfit and Plus
  Jakarta Sans OFL subsets bundled as data URLs so the panel needs no network for its typography.
- Adopted the shared Opace result presentation, so the toolbar draws the same reading as the website
  checker: the five-band dial, the level and its meaning, the strongest section, section score bars,
  a deep dive per section with the passage, the measured word re-use and editing advice, the three
  independent result axes, the named checks, what the reading means and does not mean, the certainty
  disclosure and the run record. A score is always a zero-to-one pattern reading, never a percentage.
- Named the two routes plainly — "On this device" (recommended) and "Quick checks only" — and said
  where the consented EU server route actually lives, rather than implying the toolbar has one.
- Said plainly what the 34.5 MB download is: a data file of model weights, not a program, which
  cannot execute, is compared against the published SHA-256 before use, is stored in the browser
  cache like any other web asset, and is cleared with one click. The consent card and Settings both
  show the size and the first eight characters of that hash.
- Replaced the toolbar-rail icon with a single-colour line glyph, so it sits with Astro's own white
  rail icons instead of dropping a colour tile into their row. The full-colour product mark stays in
  the panel masthead.
- Gave every tab a one-line plain-English description of what it does, and an honest body where a
  feature is not in this release.
- Renamed "Protect & rewrite" to **Protect & fix** — removing invisible Unicode is the only fix that
  ships, and the tab now says so in its first line.
- **Removed the Index tab.** It only ever rendered "Planned, not built", and an empty placeholder
  reads as a broken feature.
- Added the too-short, offline, model-error and withheld states, a cancellable download with
  progress, and a plain-English status line that never depends on colour.
- Added three exports beside a complete reading: the shared branded printable report in a new tab —
  the same document the Node CLI and the WordPress plugin produce — a content-free JSON receipt
  covering the exact result, and a content-free share summary whose fragment the website checker
  can open.
- **Fixed:** the inspection Worker never started in an installed consumer project. It was fetched as
  a separate file, and a host dev server refuses a path outside the consumer's own directory — which
  is where an installed dependency always is. The worker is now bundled into the toolbar and started
  from a blob URL.
- Restyled the unattended build scan's printable page with the shared stylesheet, labelled it a
  deterministic build scan, and added the three-axis block with the AI-pattern reading honestly
  `not_assessed`.
- Raised the three bundled Opace packages to 0.2.0 — `@opace/content-integrity-contracts`,
  `@opace/content-integrity-core` and `@opace/content-integrity-browser` — so the integration closes
  over the same released bytes as the CLI and the client, and pinned each of them exactly.
- No change to the explicit run, the 50,000-character refuse-not-truncate rule, the ten-second worker
  timeout, the browser-storage boundary or the report path containment.

## 0.1.0 - 2026-08-26

- Added one development-only Astro Dev Toolbar app with six internal evidence and settings views.
- Added explicit Worker-based visible-page inspection with no initial scan or outbound request.
- Added deterministic, hash-only JSON and printable HTML build reports for approved prerendered routes.
- Added reviewed safe-fix patch previews without automatic source writes.
- Added strict option validation, output-path containment and production-toolbar isolation.
- Added Astro 5, 6 and 7 static/server/hybrid compatibility coverage.
- Added keyboard, reduced-motion, responsive and automated accessibility checks.
- Kept Anthropic official verification `unsupported`, the Index `Not configured`, and model/provider/local-service lanes disabled.

# Implementation plan — shipping the checker redesign to opace.agency

**Date:** 29 August 2026
**Agent:** IMP-0. Plan and test plan only. **No production code was written and nothing was deployed.**
**Repositories read (read-only, no build run):**
`opace-website/astro-latest/` and `other-plugins/ai-watermark-and-content-authenticity/`.

**Who this is for.** An implementation agent who has not read the design work. Everything needed to
build is either here or named by absolute path. Where I recommend an answer to an open question, the
recommendation is marked and the owner can overrule it without the plan collapsing.

**Sources read in full:** `UX-AUDIT-LIVE-2026-08-29.md`, `PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md`,
`REDESIGN-BUILD-NOTES-2026-08-29.md`, `WATERMARK-LAB-PLACEMENT-2026-08-29.md`,
`CHECKER-DEFECT-FIXES-2026-08-29.md`, `CORPUS-RECONCILIATION-2026-08-29.md`,
`DOC-RECONCILIATION-2026-08-29.md`, `REDESIGN.md`, `HANDOVER.md`, the mockups and their `_source/`.
**Not read:** `REFERENCE-TEARDOWN-2026-08-29.md` (patterns already summarised in the build notes),
the screenshots, `CLOUD-RUN-SAFETY-REVERIFICATION`, `DPIA-AND-LAWFUL-BASIS-REPORT`, `COST-CEILING-OPTIONS`.

---

## 0. Two corrections to the brief, established from the repositories

Both change the plan, so they come first.

### 0.1 The single-source refactor has already landed. Build on it; do not work around it.

The brief says another session is "mid-way through a single-source refactor of exactly those
constants" and warns against a collision. That refactor **shipped at 16:29 today** as commit
`78e8555c`, *"Checker: one home for every measured figure, so a recalibration cannot strand a copy"*.

```
HEAD                                     a840a198
origin/main                              a840a198   (identical)
git status --porcelain                   empty
```

The working tree is clean, `HEAD` equals `origin/main`, and no file in the website repository carries
uncommitted work from any session. The plan below therefore **extends** `78e8555c` rather than avoiding
it. Concretely, that commit already gives us:

- `public/models/local-signals-v1/thresholds.json` gains `measured.server_fp32_segmented.by_threshold`,
  keyed `"0.980"` / `"0.984"`, and `measured.pending_remeasurement` + `pending_remeasurement_note`.
- `local-signals-ui.ts` gains `published()`, `figure(value, where)` (which **throws** on a rate that has
  lost its denominator), `browserMeasured()`, `serverMeasured(threshold)`, `registersByRate()`,
  `measuredFor(route, threshold)`. A missing figure breaks the run rather than printing an empty string.
- `types.ts` gains `MeasuredPair` and the documented `measured` block.
- `checkerFaqs` now interpolates `CHECKER_MIN_PATTERN_CHARS` and no longer states the flag point.

**The residual hazard the refactor did not close** is `SEGMENTS_MEASURED` at
`local-signals-ui.ts:162` — a hard-coded object (`88.9%`, `93.3%`, `35.0%`, `97.5%`, `45 AI and 45
human…`) that is not in `thresholds.json` — plus the figure literals baked into the
`DISCLOSURE_BODY` and `KNOWN_LIMITS_TEXT` template strings (`"about 8 cases out of 10"`,
`"67% at 200 words, 50% at 150 and 19% at 100"`, `"0 of 400 human excerpts"`). Those are step 1 work.

### 0.2 The three-axis verdict is already computed on every run and is thrown away

`core-adapter.ts` imports only `inspect`, `previewSafeFixes` and `buildReceipt`, which reads as though
the website never touches `computeCombinedVerdict`. It does, transitively:

`node_modules/@opace/content-integrity-core/dist/inspect.js:58` calls
`computeCombinedVerdict({signals, unicodeFindings, text, watermark})` on every inspection and attaches
the result to the response as **`result.combined_verdict`**. `computeCombinedVerdict` calls
`assertAxisIndependence` internally (`dist/verdict/combine.js:398`), so **the axis-independence
assertion already runs on every live checker run today**.

`combined_verdict` is absent from the generated `AnalysisResult` type (the schema has an index
signature, so it type-checks as `unknown`), and **nothing in `src/` reads it**. That is the single most
useful discovery in this exercise: axis B (`text_integrity`) and axis C (`editorial`) — the two cards
the redesign needs — already exist, fully derived, with `status`, `findings[]`, tiered
`character_evidence`, `suggestion_level`, `categories_hit`, `finding_count` and per-axis `reason`
strings that are provably free of authorship vocabulary. The redesign does not have to derive them in
the UI, and must not.

One caveat that shapes step 3. `inspect()` calls the verdict **without a `model`**, so
`combined_verdict.ai_probability.reading` is always `"not_assessed"` and its `value` is always `null`.
Axis A must continue to come from the separate `LocalSignalsRun`. **Do not pass the model reading into
the core call to "complete" the object** — the local-signals run is asynchronous and route-dependent,
and a second `computeCombinedVerdict` call after it returns would be a new code path with a new failure
mode for no user-visible gain. Read `combined_verdict` for axes B and C; read `LocalSignalsRun` for
axis A; never let one write into the other.

---

## 1. What this plan depends on from other agents

| Dependency | Owner | What breaks without it | Contingency |
|---|---|---|---|
| The rebuilt mockups on real Opace tokens (`mockups/_source/shared.css`, `checker.tpl.html`) | **UI-3, in flight** — `_source/` files were last written at 17:09–17:11 today | Step 4 (visual layer) only. Structure, copy, engine wiring and behaviour do not depend on it | Build steps 1–3 against the structure in the current `checker.html`; hold step 4 until `_source/` settles, then port the token block wholesale |
| Signal Scale copy and level names | Settled — `PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md` §1.1, §5. The owner has chosen this scheme | — | — |
| Corrected corpus figures | Settled — `CORPUS-RECONCILIATION-2026-08-29.md` §1.1, §5 | Step 1 | — |
| Whether the Highlights panel is deleted | **Owner, unanswered.** Told it is his to overrule | §5 exists to make either answer cheap | Ship the deletion; §5.4 restores the panel in one file if he says keep |
| Threshold decision (0.984 stays or moves) | Owner. `CORPUS-RECONCILIATION` §6.3 recommends **hold** | Nothing. Portability is the point | — |

**The rule for step 4.** Take colour, radius, type and spacing from UI-3's rebuilt `_source/shared.css`.
Take *structure*, *state names* and *copy* from this plan. If the two disagree on structure, this plan
wins and UI-3 should be told; if they disagree on colour, UI-3 wins.

Note that `mockups/checker.html` already uses the live Opace palette
(`--sig-f3 #00456f`, `--sig-f2 #0068b3`, orange `#fb700a`, focus `#0b7285`) rather than the indigo ramp
in the scoring specification's contrast tables. **The contrast tables in
`PLAIN-LANGUAGE-AND-SCORING-SYSTEM` §4.5 and `REDESIGN-BUILD-NOTES` §4 were computed against the indigo
values and are therefore not valid for the shipped palette.** Every ratio must be recomputed against
whatever UI-3 lands. That is a test-plan item (§7.6), not an assumption.

---

## 2. File-by-file map

Every path is relative to `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/`.

**Totals: 42 files — 17 modified, 15 added, 10 deleted.**

### 2.1 Modified — the load-bearing five

| File | Now | After |
|---|---|---|
| `src/pages/tools/ai/content-verification-integrity/checker.astro` | 296 lines. Lines 1–15 frontmatter; **18–64 the whole tool markup**, including the input panel (18–34), the results container (35) and the `[data-evidence]` "Highlights in your draft" aside (36–64); 65–71 four content sections + FAQ + closing; 72 the single `<script>` entry; **73–296 a 224-line `<style is:global>` block carrying all checker CSS** | Markup rewritten to the mockup's block order (§3). The `[data-evidence]` aside is deleted (§5). The 415-code-point context paragraph, the 190-word privacy span, the two 101/64-word route labels and section 03's statistics dump all move into `<details>` disclosures below the tool. **The whole `<style is:global>` block moves out to a stylesheet** — a 224-line global style block on a page is the reason no other page can reuse the tool and the reason the token set cannot be shared with the Lab |
| `src/components/tools/content-integrity/integrity-controller.ts` | 551 lines, 56 KB, one guarded IIFE. Regions: constants 12–60; DOM/state 63–102; progress 103–148; **`buildGauge` 149 / `buildScoreHeader` 183**; **`renderDraft` 224**; cross-linking 297–331; **`buildGroup` 332 / `renderRail` 344**; `badgeRow` 405 / `buildWatermarkScanRow` 409; `setSignalSummary` 448; **`render` 473**; reset/lock 527–530; events 531–550 including the inline receipt build at 548 | Stays the runtime entry, drops to roughly half its size. **Deleted outright: `buildGauge`, `buildScoreHeader`, `renderRail`, `buildGroup`, `openRailItem`, `focusDraftMark`, `severityChip`, `jumpButton`, `setSignalSummary`, `BAND_COLOUR`, `GROUP_RULES`, `groupForCategory`, `SEVERITY_RANK`, `PROTECTED_GROUP_TITLE`, `PROTECTED_GROUP_HINT`, `MAX_PATTERN_MARKS`, `MAX_PROTECTED_MARKS`, `UNI_ABBREVIATION`, `framingLine`, `SUGGESTIONS_NOTE`.** **Rewritten: `renderDraft`** — section tinting only, no per-finding marks (§5.3); **`render`** — new block order, reads `combined_verdict`. **Kept unchanged: `isDocumentLevel` (98), `hasPassageSpan` (99)** — these are today's F6 fix and must survive verbatim. **Kept: `paintFrame` (141)** — the rAF race with a 100 ms timeout that stops a background-tab run hanging |
| `src/components/tools/content-integrity/local-signals/local-signals-ui.ts` | 685 lines, 49.9 KB. `published()` 67, `figure()` 75, `browserMeasured()` 99, `serverMeasured()` 116, `registersByRate()` 136, **`SEGMENTS_MEASURED` 162 (hard-coded)**, `measuredFor()` 204, `DISCLOSURE_BODY` 239, `setupLocalSignals` 276, `buildTransportPanel` 471, `buildRouteFallback` 497, **`buildSegmentBreakdown` 543**, `noAssessmentReason` 594, **`buildLocalSignalsRow` 613** | Keeps the whole figure layer and `setupLocalSignals` (route state, consent, download, run). **`buildSegmentBreakdown` is promoted to the document strip** and moves to `ui/DocumentStrip.ts`. **`buildLocalSignalsRow` is replaced by `ui/CheckCard.ts` + `ui/SignalCard.ts`**; its `noAssessmentReason` logic survives as the source of the error copy. `SEGMENTS_MEASURED` and the figure literals inside `DISCLOSURE_BODY` / `KNOWN_LIMITS_TEXT` move into `thresholds.json` (§9). **`SERVER_MEASURED` no longer exists** — the brief names it, but `78e8555c` already replaced it with `serverMeasured(threshold)` |
| `src/components/tools/content-integrity/IntegrityHero.astro` | 59 lines. Kicker/title/accent/lead, plus an `.integrity-evidence-card` with Source / Signals / a permanently `is-unavailable` "Watermark scan" cell, and an `accent==="checker"` branch that overrides the route chip to "EU server or browser" | Lead cut to the mockup's 31 words. **The evidence card is deleted** — it is three cells of tool self-description occupying the space above the paste box, and F1 costs 422 words before the box. The "Watermark scan: unavailable" cell in particular states a result before any run |
| `src/data/content-integrity.ts` | 106 lines. `suiteRoutes`, `ecosystemRoutes`, `checkerFaqs` (8), `readinessFaqs` (4), `parentFaqs`, `checkerExamples` (4 samples, 399–498 words) | `checkerFaqs` loses its remaining literals: `5,558`, `113 writing-signal rules`, `45.1%`, `24.8%`, `34.5 MB`, `512-token window`, `about 340 words`, `three public demo keys`, `europe-west1 in Belgium`. Each reads from `thresholds.json`, `TOTAL_SIZE_LABEL`, `MODEL_MAX_TOKENS`, `TYPICAL_SEGMENT_WORDS`, `DETECTOR_REGION`. The array is `as const`; changing strings to template literals widens the type, so **drop `as const` and give the array an explicit `Faq[]` type** rather than fighting the inference |

### 2.2 Modified — the other twelve

| File | Change |
|---|---|
| `src/components/tools/content-integrity/IntegrityToolShell.astro` | Import the new stylesheet. Add `data-tool-page` to `.content-integrity-tool` so the sticky CTA bar and the floating back-to-top can be suppressed on tool pages (F11). Keep the analytics cookie note |
| `src/components/tools/content-integrity/DetectorState.ts` | `statusLabel` currently returns `status.replaceAll("_"," ")`, which is where `NOT RUN` / `INCONCLUSIVE` reach the screen. Replace with an explicit map to the mockup's four tones — **Read · Found · Clean · Not run** — plus **Unavailable**. `canonicalStatusOrder` stays: it is the engine's order and the tests key off it |
| `src/components/tools/content-integrity/provenance/provenance-panel.ts` | 148 lines. `rowStateFor` / `summaryLine` re-point at the new check-card component and the §3.6 Content Credentials copy. Behaviour unchanged |
| `src/components/tools/content-integrity/MethodVersion.astro` | Section 02's three cards become the six live check cards, or the component is retired with section 02 (§3, block 6). If retired, delete instead |
| `src/lib/content-integrity/state.ts` | Add `CHECKER_MIN_WORDS_GOOD = 300` and `CHECKER_MIN_WORDS_ROUGH = 200` for the reading-weight rule (§8.3 of the scoring spec). Keep `WRITING_SIGNAL_RULES_RUN = 116` as the scope-note fallback |
| `src/lib/content-integrity/core-adapter.ts` | Line 9 hard-codes `content.length >= 50` where `CHECKER_MIN_PATTERN_CHARS` already exists in the sibling module. Import it. This is a second home for a figure inside the file that fixed second homes |
| `src/lib/local-signals/types.ts` | Declare `combined_verdict` on the inspection result rather than relying on the schema's index signature, and declare the five `measured` keys that exist in the JSON but not the type (`per_register_human_false_positives`, `python_reference`, `human_false_positives_by_genre`, `length_sensitivity`, `known_gaps`). Add the new `measured` keys from §9 |
| `src/lib/local-signals/server-route.ts` | No behaviour change. `SERVER_MIN_WORDS` (72) and `SERVER_MAX_WORDS` (74) are already the single source and are already interpolated |
| `src/styles/content-integrity-tools.css` | 164 lines. Receives the tool CSS lifted out of `checker.astro`'s `<style is:global>`, minus everything that dies with the evidence rail |
| `public/models/local-signals-v1/thresholds.json` | The figure refresh in §9. **Data change only — no user-facing copy is edited to make it land** |
| `src/pages/tools/ai/content-verification-integrity/claude-watermark-readiness-lab.astro` | Add the **Lab → Checker** handoff (`WATERMARK-LAB-PLACEMENT` §3.2). It does not exist in either direction from the Lab today and is the single missing link in the pair |
| `src/components/tools/content-integrity/watermark-lab/WatermarkLabSection.astro` | The two router cards at the top of the Lab, naming each page by the question its visitor arrived holding. Everything else about the Lab is out of scope for this plan |

### 2.3 Added — fifteen files

Nothing here is a framework. Each is a plain module exporting functions that return `HTMLElement`,
matching the controller's existing idiom.

| File | Contents |
|---|---|
| `src/lib/content-integrity/signal-scale.ts` | The scale as data. `SIGNAL_LEVELS` keyed by the stable ids `signal-strong / signal-some / signal-faint / signal-none / signal-withheld`; the band-id mapping (`very_likely_ai→signal-strong`, `uncertain→signal-some`, `likely_human→signal-faint`, `very_likely_human→signal-none`); `levelForBand(band)`; **`trackPosition(probability, floors, threshold)`** implementing the 0/25/50/75 geometry with the flag point pinned to 75 and linear interpolation within a band. This is the only place the display transform exists |
| `src/lib/content-integrity/measured-figures.ts` | Every published figure derived from `thresholds.json`. Absorbs `SEGMENTS_MEASURED` and the literals now inside `DISCLOSURE_BODY`. Re-exports `figure()` so the denominator guard applies to the new figures too. **Alternative: extend `local-signals-ui.ts` in place.** I recommend the separate module, because the accuracy plate is rendered by the results layer and importing the model-route controller to get a number is how figures end up in two places |
| `src/components/tools/content-integrity/ui/icons.ts` | Fourteen inline SVGs at 16 px, 1.5 px strokes: six check icons, five axis-A meter states, three axis-B shields, three axis-C pencils, two route icons. Every one legible without hue |
| `src/components/tools/content-integrity/ui/SignalMeter.ts` | The three-bar meter, five states. `aria-label` is the level only — `"AI signal: strong"`; the withheld state announces `"Not enough text to read"`, never "no result" and never "error" |
| `src/components/tools/content-integrity/ui/SignalTrack.ts` | The banded rail: 4 px rail, ticks at 0/25/50/75, filled triangle at `trackPosition()`, flag glyph at 75. Dropped below 16 px. No number rendered on it |
| `src/components/tools/content-integrity/ui/DocumentStrip.ts` | The promoted section list. One button per section, width proportional to word share, height from `trackPosition`, per-section peak label, dashed flag line at 75, rows in **document order** with the strongest marked rather than moved. Selecting one tints that passage in the draft view. Absorbs `buildSegmentBreakdown` and `wordRanges` |
| `src/components/tools/content-integrity/ui/SignalCard.ts` | Axis A card: meter, level name, support sentence, track, "strongest of N sections", the two anti-misreading sentences (§5.6), the detail line `model output 0.8082, flag point 0.9840, on our EU server` |
| `src/components/tools/content-integrity/ui/AxisCards.ts` | Axis B and axis C cards, built from `combined_verdict.text_integrity` and `.editorial`. Shield/pencil glyphs, the two fixed lines, axis C in neutral grey only |
| `src/components/tools/content-integrity/ui/CheckCard.ts` | One card per named check: icon, name, tone badge, where-it-ran tag (`this device` / `our EU server` / `did not run`), and a `<details>` "What it can say" |
| `src/components/tools/content-integrity/ui/AccuracyPlate.ts` | The measured plate: corpus line, proportion bar for AI detected, 100-cell waffle for human false positives, second waffle at the same scale for the fiction worst case, and the **Long-form only** / **Not measured** tags |
| `src/components/tools/content-integrity/ui/ProtectedFactsPanel.ts` | "Facts we will not touch". A count by kind, no highlighting, no severity, sited beside the rewrite tools and **not in the results** |
| `src/components/tools/content-integrity/ui/ResultAnnouncer.ts` | One `role="status"` element replacing the whole-panel `aria-live` on `[data-results]`. Emits one sentence: level, marks, notes, sections, "Results below" |
| `src/components/tools/content-integrity/ui/microcopy.ts` | Every string from `PLAIN-LANGUAGE-AND-SCORING-SYSTEM` §5, as functions of run data. No string in this file may contain a digit that was typed rather than interpolated — asserted in §6.3 |
| `src/styles/content-integrity-signal-scale.css` | The token block and the component CSS. Ported from UI-3's rebuilt `_source/shared.css` |
| `tests/` (+ `playwright.config.ts`, `package.json` script) | §7. **The repository has no tests at all today** — no runner, no config, no spec file anywhere outside `node_modules`. Playwright 1.60 is already a devDependency and is unused |

### 2.4 Deleted — ten files, all provably unreferenced

Confirmed by grep across `src/`: nothing imports any of these. Several duplicate live code, which is
worse than being dead — `PrivacyRoute.ts` is a second, divergent copy of `ROUTE_PRIVACY`, and
`ReceiptExport.ts` is byte-for-byte the download code the controller inlines at line 548.

`src/components/tools/content-integrity/PublicFixtureLab.ts` (77 B) ·
`FindingList.ts` (116 B) · `EvidenceRail.ts` (123 B) · `ProtectedSpanEditor.ts` (171 B) ·
`TextCapture.ts` (172 B) · `WatermarkState.ts` (243 B) · `ReceiptExport.ts` (300 B) ·
`PrivacyRoute.ts` (1,119 B) · `src/lib/content-integrity/fixtures.ts` (206 B) ·
`privacy.ts` (231 B) · `public-data.ts` (136 B).

Do this in its own commit, before anything else, so the redesign diff is not padded with deletions.
If any turns out to be imported by a page outside the checker, the deletion commit is the cheapest
possible thing to revert.

---

## 3. The new structure, block by block

Order taken from `mockups/_source/checker.tpl.html`. Ids are the mockup's, kept so the two can be
diffed.

| # | Block | Id | Renders |
|---|---|---|---|
| 1 | Hero | — | Kicker, H1, 31-word lede. No evidence card |
| 2 | **Input** | `#inspect` | Textarea, live counter (`0 words · needs 60 · best over 300`, from the first frame), route segmented control with the two route icons, **Check this text**, **Load an example**. Everything else behind disclosures |
| 3 | Running | `#running` | Named wait: "Checking 512 words on our EU server. Usually about 3 seconds." Browser route shows the running best. Progress bar honours `prefers-reduced-motion` |
| 4 | **Result strip** | `#stripcard` | Axis A: meter, level, track, **the document strip (section list) as the verdict**, smoke-alarm sentence, detail line, draft view of the selected section |
| 5 | Axis B + C | `#axes` | Two cards from `combined_verdict` |
| 6 | Accuracy plate | `#plate` | The measured figures, with denominators and the long-form tag |
| 7 | Six checks | `#checks` | Six `CheckCard`s. **This block replaces section 02** — "What the checker finds" was a static description of three methods; these are the run's own six results with where each ran |
| 8 | Watermark | `#wmcard` | One collapsed line. A `detected` result is never collapsed. Links to the Lab |
| 9 | Disclosures | `#discs` | Four `<details>`: "Why can't you point at the exact sentences?", "What was sent, and where" (the transport receipt, kept), "Where this check is weakest", "What an AI check can and cannot prove". **This block absorbs the 1,112 words of preamble and section 03** |
| 10 | FAQ, product links, closing | — | Unchanged in kind |

`#threshbox` in the mockup is a demonstration control, not product. Do not ship it.

---

## 4. Engine-output coverage

Every field the engine emits, and where it lands. **The last block is the defect list: outputs the new
design has no home for.**

### 4.1 The six named checks and their ids

The brief calls these "the six named checks". They are defined in three different places, which is
itself worth recording:

| # | User-facing | Check id | Defined at | Runs |
|---|---|---|---|---|
| 1 | AI patterns | `local.signals` | `local-signals-ui.ts:264` | EU server (default) or browser |
| 2 | Hidden characters | `unicode.invisible` | core | browser |
| 3 | Lookalike letters | `unicode.homoglyph` | core | browser |
| 4 | Writing notes | `style.patterns` | core | browser |
| 5 | Watermark | `watermark.known_keys` | `src/lib/watermark-scan/index.ts:19` | browser |
| 6 | Content Credentials | provenance | `src/lib/provenance/` | browser, files only |

Two more the UI must account for and the mockup's six-card grid does not name:

- **`protected`** — a seventh checkbox in `checker.astro` today, emitting `protected_spans[]` and a
  `protected_spans.exact` method. In the redesign it is not a check at all: it becomes the
  "Facts we will not touch" panel (§5.2). **The checkbox is removed**, because a tick box that
  produces no finding is a control with no outcome.
- **`watermark.anthropic`** — appended unconditionally by `core-adapter.ts:9`, always
  `status: "unsupported"`, `availability: "not_available"`. It carries the "no public verifier exists"
  boundary. It is a *claim*, not a result, and belongs in the watermark card's expanded state.

### 4.2 Core `AnalysisResult`

| Field | Values | Lands |
|---|---|---|
| `source.word_count` | int | Counter, reading-weight line, "we read N words" |
| `source.content_hash`, `normalised_hash`, `content_type`, `language` | | Receipt only |
| `protected_spans[]` | `id`, `kind` (13: name/organisation/number/date/time/currency/unit/url/email/quote/citation/code/user_selected), `text`, `start_utf16`, `end_utf16`, `start_codepoint`, `end_codepoint`, `normalised_value`, `policy` (4), `source` (4), `confidence`, `content_hash` | "Facts we will not touch": a count by `kind` ("4 numbers, 2 names, 1 quote"). Offsets to the receipt. **No highlighting** |
| `pattern_findings[]` | `rule_id`, `rule_version`, `severity` (note/low/medium/high), `message`, `suggestion`, `span{start_utf16,end_utf16,start_codepoint,end_codepoint}`, `matched_text_hash`, `evidence{matched,count,weight,category,detail,era,attribution,corroboration,document_level}` | Axis C card count; the list behind "Writing notes". `evidence.document_level === true` → described, never anchored |
| `methods[]` | `id`, `category` (detector/watermark/provenance/unicode/pattern/fidelity), `provider_or_method`, `version`, `status` (**8**), `availability` (3), `native_outcome`, `score`, `score_scale`, `threshold`, `segments[]`, `evidence[]`, `limitations[]`, `started_at`, `completed_at`, `privacy_route` (5) | One `CheckCard` each. `status` → the four tones (§4.5). `privacy_route` → the where-it-ran tag. `version` → the disclosure. `limitations[]` → "What it can say" |
| `summary{pass,attention,fail,inconclusive,unsupported,not_configured,not_run,error}` | 8 counters | The "N checked, N not run" line. **`not_run` and `unsupported` are never added to `pass`** |
| `limitations[]` | ≥1 string | "What an AI check can and cannot prove" |
| `started_at` / `completed_at` | ISO | `#runmeta` elapsed |
| **`combined_verdict.text_integrity`** | `status` (clean/attention/manipulated), `applied`, `reason`, `findings[]`, `character_evidence{deliberate[],supporting[],excluded[],interior_homoglyph_count,longest_carrier_run}`, `watermark{outcome,counted_as_evidence}`, `confidence` | **Axis B card.** `status` → marks-clean / marks-odd / marks-planted. The three evidence tiers → the three plain names Planted / Could be innocent / Normal typography. `longest_carrier_run` ≥3 and `interior_homoglyph_count` drive the payload-shape lines |
| **`combined_verdict.editorial`** | `suggestion_level` (none/some/many), `score`, `categories_hit[]`, `finding_count`, `confidence`, `reason`, `rule_probabilities` | **Axis C card.** "12 phrases across 5 kinds" is `finding_count` and `categories_hit.length` |
| `combined_verdict.ai_probability` | always `not_assessed` / `null` here | **Nowhere.** Deliberately. Axis A comes from `LocalSignalsRun` |
| `combined_verdict.inputs_considered[]` | which streams reached the verdict | The "What we checked" disclosure |

### 4.3 `LocalSignalsRun` — axis A

| Field | Lands |
|---|---|
| `status: "scored"` → `tier3{probability, threshold, flagged, band, scoredTokens, truncated}` | `band.id` → level via `levelForBand`; `probability`+`threshold` → `trackPosition` and the detail line; `flagged` → the flag glyph state; `truncated` → the single-section note |
| `segments[]: SegmentScore{probability, threshold, flagged, band, scoredTokens, truncated, index, start, end, words}` | The document strip. `start`/`end` are UTF-16 offsets into the submitted text and drive the section tint. `words` drives bar width |
| `tier2: Tier2Result` | `{status:"disabled"}` today (`TIER2_ENABLED = false`). Rendered nowhere while disabled; the shape must survive so enabling it is a UI change, not a type change |
| `version`, `provider` | Method disclosure. `provider` distinguishes WebGPU from WASM |
| `route: "browser" \| "server"` | The route tag on the axis A card and every figure's runtime label |
| `transport?: ServerTransport{endpoint, region, requests, wordCount, wordsSent, processed, retained, serverMs, roundTripMs, modelBuild, precision, contract}` | "What was sent, and where" disclosure, kept in full. This is keep-list item 5 |
| `status: "inconclusive"` + `reason`, `scoredTokens` | The **Not enough text** withheld state. Never an empty meter, never a number |
| `status: "error"` + `code` (9: unreachable, rate_limited, server_error, bad_response, too_long, contract_mismatch, token_failed, automation_blocked, engine), `reason`, `retryAfterSeconds` | The eleven error strings in §5.8 of the scoring spec, each with a real button. `retryAfterSeconds` → "about 40 seconds" |
| `SegmentPhase{index, count, done, best{probability, flagged, band}}` | Browser-route running copy: "Reading section 3 of 9. Strongest so far: some signal." |
| `DownloadProgress{receivedBytes, totalBytes, file, fileIndex, fileCount}` | Real progress bar with a percentage. **`file` is never shown** — F9 measured the raw ONNX filename on screen. The line is cleared on completion |

### 4.4 Watermark and provenance

| Field | Lands |
|---|---|
| `WatermarkScanResult.verdict` (`signal_found` / `no_signal` / `too_short`) | The three named outcomes. `no_signal` collapses; `signal_found` never collapses |
| `.rows[]{keyId, meanG, pValue, scoredPositions}` | Behind "Show the numbers" only, with the 0.5 no-mark value printed beside each reading |
| `.signalKeyId`, `.tokenCount`, `.scoredPositions`, `.engineVersion` | Expanded state and the method disclosure. `MIN_SCORED_POSITIONS = 40` drives "too short to check" |
| `ProvenanceResult.status` (`credentials_found` / `no_credentials` / `unsupported_type` / `error`) | The Content Credentials card's four states |
| `.manifestSummary{claimGenerator, signer, signedOn, assertionsCount, ingredientCount, validationState, validationStatus[]}` | "Signed by X, made with Y" plus the assertion and ingredient counts |
| `.rawIssues[]{code, explanation, success}` | Behind "What we could not verify" |
| Receipt (`buildReceipt(...)` at `integrity-controller.ts:548`) | Unchanged JSON download. `contains_content: false` stays false |

### 4.5 The eight statuses, mapped to four tones

`METHOD_STATUSES` has eight members; `statusLabel` currently just swaps underscores for spaces, which
is how `NOT RUN`, `INCONCLUSIVE`, `NOT CONFIGURED` and `UNSUPPORTED` reach a visitor's screen.

| Engine status | Tone | Word | Rule |
|---|---|---|---|
| `pass` | clean | **Clean** | |
| `attention`, `fail` | found | **Found** | |
| `inconclusive` | none | **Not run** | Never "inconclusive". The writing rules are not inconclusive; they are deliberately not a verdict |
| `not_run`, `not_configured` | none | **Not run** | Visible, never counted as a pass |
| `unsupported` | none | **Unavailable** | With the reason attached |
| `error` | found | **Could not run** | With the reason and a way out |

The classifier is the one check with a fifth tone, **Read**, because "clean" on axis A would read as a
human verdict.

### 4.6 Outputs the new design has nowhere to put — the defect list

Six. Four are fixable inside this plan; two need an owner decision.

1. **`Tier2Result` and the whole tier-2 surprisal head.** Shipped disabled (`TIER2_ENABLED = false`,
   `model-store.ts:63`), and the mockups contain no state for it. The `DISCLOSURE_BODY` and
   `KNOWN_LIMITS_TEXT` functions still branch on `TIER2_ENABLED` and carry a whole alternative copy set
   ("1,024 GPT-2 tokens, roughly 750 words") that nothing can currently reach. **Fix:** keep the type,
   keep the branch, and add a `notes-none`-style withheld card so enabling the tier is a data change.
   Do not delete the branch — deleting it is how the second implementation gets written later.
2. **`method.score_scale`, `method.native_outcome`, `method.segments[]` on non-classifier methods.**
   Emitted by the contract, rendered nowhere in the mockups. **Fix:** into the method disclosure inside
   each check card. Low cost, and `native_outcome` is the field that would carry a real C2PA trust-list
   verdict if the roadmap item in `WATERMARK-LAB-PLACEMENT` §4 ever lands.
3. **`character_evidence.excluded[]` — the "normal typography" tier.** The scoring spec §3.2 writes
   copy for it ("That is ordinary typesetting… It counts towards nothing"), the mockup's axis B card
   shows a single summary line, and there is no surface listing them. **Fix:** a third group inside the
   axis B card's expanded state. It matters more than it looks: listing what was found and explicitly
   not counted is the clearest demonstration in the tool that the instrument is not fishing.
4. **`combined_verdict.confidence` on each axis** (`low`/`medium`/`high`). No home anywhere in the
   redesign. **Fix, and this one I would leave homeless deliberately:** a confidence band beside a level
   name invites exactly the arithmetic the Signal Scale exists to prevent, and a reader who sees
   "Faint signal · high confidence" will read it as "confidently not AI". Record it in the receipt,
   render it nowhere. That is a deliberate non-render, not an oversight, and it should be written down
   as such.
5. **The `automation_blocked` and `token_failed` states have no route to recovery on the browser route.**
   Both error strings offer "run it on this device", which is right — but if the visitor is *already* on
   the browser route these codes cannot fire, and if they are on the server route the offer requires a
   34.5 MB download they have not consented to. The copy currently implies a one-click escape that is
   really a one-minute download. **Fix:** the button says what it costs. `"Run this on my device
   (35 MB, one-off)"`.
6. **Section boundaries are only meaningful against the text as submitted.** `SegmentScore.start/end`
   are UTF-16 offsets into the submitted string. The draft view renders the same string, so the tint is
   correct — but **if the user edits the textarea after a run, every offset is stale**. Today
   `invalidateActiveEvidence` (`integrity-controller.ts:530`) clears the whole result on input, which is
   why this has never bitten. The redesign makes the strip the verdict, so it must keep that behaviour
   exactly. **Fix:** an explicit test (§7.9). This is the same class of failure as the `p{index}` keying
   bug fixed today, and it is the one the project's offset-refusal rule exists to prevent.

---

## 5. Deleting "Highlights in your draft", reversibly

### 5.1 Why deletion rather than rewording

The project's own measurement: **only 35.9% of sentences push their document towards machine** (2,174
deletions across 57 documents). Two sentences in three that a reader would take as "the AI bit" are
not. A highlight is read as an accusation whatever the caption says, so the panel cannot be made to
mean what its readers will take from it. The owner's words were *"what is that section meant to be
showing me, I cant understand any of it?"*, and the panel today needs two disclaimers 200 px apart plus
a legend headed **AI-STYLE EVIDENCE** sitting above findings the page then disclaims.

### 5.2 Where the three contents go

| Was | Goes to | Named |
|---|---|---|
| Writing suggestions | Axis C card, and a plain list behind it | "Writing notes" |
| Protected facts | Its own panel, beside the rewrite tools, **not in the results** | "Facts we will not touch" |
| Anything implying "the AI sentences" | Nowhere | — |

The `[data-evidence]` aside (`checker.astro` lines 36–64) is deleted whole, along with the
`AI-STYLE EVIDENCE` legend, the `FACTS TO PRESERVE, NOT AI EVIDENCE` legend, the rule-match frequency
table, the `[data-phrase-panel]` block, and the disabled **"Protect these facts (planned)"** button.
Shipping the UI for an unbuilt feature costs a click and an explanation and buys nothing.

### 5.3 Section-level highlighting replaces it

`renderDraft` is rewritten to paint **one thing only**: a tint over the selected section's passage,
from `SegmentScore.start/end`. No per-finding marks, no severity colours, no `data-keys`. A section is
a unit the model actually scored, so pointing at one makes a true claim; a sentence is not.

Two rules survive from today's F6 fix and must be carried into the new function verbatim:

- `isDocumentLevel(finding)` — `finding.evidence.document_level === true`. Document-level findings are
  described, never anchored.
- **A highlight shorter than one whole word is never drawn.** Widen to the word boundary; if it still
  resolves to one character, drop the highlight and render the finding as a text-only row with
  *"We found this one but cannot point at it in your draft. The finding still counts."*

### 5.4 Keeping the panel, if the owner overrules

The work is structured so that "keep it" is a contained change, not a rebuild. Three properties make
that true:

1. **The panel is deleted, not dismantled.** `renderRail`, `buildGroup`, `openRailItem`,
   `focusDraftMark`, `severityChip` and `jumpButton` are removed in **one commit that touches nothing
   else**, tagged `checker/remove-evidence-rail`. Reverting that commit restores the panel intact.
2. **The new `renderDraft` keeps its decoration pipeline.** The rewrite narrows what it paints; it does
   not change how it paints. The `Deco[]` boundary-splitting stays. Restoring per-finding marks is
   re-enabling a code path, not writing one.
3. **The panel's slot in the layout stays addressable.** Block 9 (`#discs`) gains an empty
   `<div data-evidence-slot hidden>` immediately before it. Restoring the panel means mounting the
   reverted renderer into that slot.

The cost of the reversal is then one revert plus one mount call. **What must not be reversed even if
the panel returns:** the `document_level` rule, the sub-word highlight rule, and the removal of the
`AI-STYLE EVIDENCE` heading. Those are correctness, not design.

---

## 6. The invariants, and how each is proved

Every row has a mechanical check. A rule with no failing test is a comment.

| # | Invariant | Where it can break | How it is proved |
|---|---|---|---|
| 1 | An AI score is never presented as proof of authorship | Level names, icons, the strip, the announcer | `assertAxisIndependence` already runs on every inspection (`combine.js:398`). Extend its `AUTHORSHIP_VOCABULARY` regex — `/\b(?:ai[-\s]?(?:like\|generated\|written\|authored)\|likely\s+ai\|machine[-\s]written\|human[-\s]?(?:like\|written\|authored))\b/i` — to the strings in `ui/microcopy.ts`, as a unit test over the exported string table. Plus a rendered-DOM assertion: no axis B or axis C node's text may match it |
| 2 | The three axes stay separate; `assertAxisIndependence` throws on contamination | Reading `combined_verdict.ai_probability`; feeding the model into the core call | Already enforced in the engine. Add a source-level assertion: `grep` for `ai_probability` in `src/` must return nothing outside `types.ts`. Add a DOM assertion: exactly three axis cards, three different glyph families, and **no fourth number** anywhere in the result region |
| 3 | Writing signals are editorial feedback, never detection | Axis C colour, the word "signal" leaking into axis C | Axis C nodes must carry only `--note`; a test asserts no axis C node resolves to a `--sig-*`, `--mark-*`, red, amber or green token. A second test asserts the fixed line ("Human writers set them off all the time…") is present on every run that renders axis C |
| 4 | The watermark check says nothing about Claude, Gemini or ChatGPT | The watermark card's expanded copy | Assert the lead line is present verbatim, and that no watermark node's text contains a provider name except inside the sentence that says nobody outside those companies can check |
| 5 | The verdict is the strongest section, never the average | The document strip; any future "overall" figure | Assert `renderedLevel === levelForBand(max(segments).band)` for a fixture with sections `[0.4993, 0.8082]`. Assert no rendered figure equals the mean. The engine already enforces `aggregation: "max"` server-side and the browser refuses anything else |
| 6 | **No number is hard-coded into any label** | Everywhere. This is the one the owner will check | Three layers. (a) A unit test over `ui/microcopy.ts` and `signal-scale.ts`: no exported level label, tone word or card heading may match `/\d/`. (b) A build-output grep: `0.984`, `98.4`, `90.3`, `1.34`, `95.1`, `1.21`, `5,558`, `116`, `113` must not appear in any `_astro/*.js` string that is not sourced from JSON — the one permitted survivor today is the threshold-keyed `server_fp32_segmented` map, which is correct by design. (c) A threshold-portability test: render at 0.80, 0.93 and 0.984 and assert the flag glyph is at the 75 mark every time and that no copy string changed |
| 7 | Every figure renders with its denominator | The accuracy plate, the weakness line, the FAQ | `figure(value, where)` already **throws** on anything not matching `^\d[\d,]*\/\d[\d,]*\s*\(\s*[\d.]+\s*%\s*\)$`. Route every new figure through it. Test: delete `measured.ai_detected` from a fixture `thresholds.json` and assert the run ends in "Inspection could not complete" with nothing counted as a pass |
| 8 | Weakness disclosures survive the redesign | The move behind disclosures | Assert on every rendered result: the accuracy plate is present and **not** inside a closed `<details>`; the fiction worst case is present with its denominator; the long-form tag is present; the "not measured" tag for short web copy is present. The weakness line is the one thing the redesign may not demote |
| 9 | A check that did not run is never counted as a pass | The summary line | Assert `renderedPassCount === summary.pass`, and that `not_run + unsupported + not_configured` rows are visible and excluded |
| 10 | `bands.list[0].min === threshold` | `thresholds.json` drift | A load-time assertion in `signal-scale.ts`. They are two fields today and nothing stops them separating |

---

## 7. The test plan

**There is no test infrastructure in this repository.** No runner, no config, no spec, no test
dependency beyond an unused Playwright 1.60. Step 0 is therefore adding `playwright.config.ts`, a
`tests/` directory and `"test": "playwright test"`. Everything below assumes that exists.

The suite splits in three: **unit** (pure functions, no DOM), **component** (a rendered result from a
recorded fixture, no network), and **live** (the deployed page). Only the third needs the server, and
the third is the one that catches a bad deploy.

### 7.1 Fixtures to record first

Record these once, from real runs, and commit them as JSON. They are the whole test plan's substrate.

| Fixture | Source | Exercises |
|---|---|---|
| `scored-mid.json` | The 512-word GPT-5.6 Sol article, server route, `probability 0.8082`, sections `0.4993 / 0.8082`, threshold `0.984` | Faint signal, two sections, the portability demo, the reproduction case |
| `scored-flagged.json` | Any AI sample above 0.984 | Strong signal, flag glyph past 75 |
| `scored-clean.json` | The human editorial example | No signal, and the "not a human verdict" line |
| `doc-level.json` | The 230-word passive-voice "Wetlands…" passage | **The `"W"` regression.** Four document-level findings, `evidence.document_level = true`, spans `[0,1]` |
| `inconclusive.json` | 42 words, server route | Not enough text, withheld meter |
| `error-*.json` | One per `RunErrorCode` (9) | All eleven error strings |
| `unicode-planted.json` | The Unicode carrier example | Axis B `manipulated`, `longest_carrier_run ≥ 3` |
| `c2pa-*.json` | An image with credentials, one without, a PDF, a corrupt file | The four provenance states |

### 7.2 The six checks in every state

For each of the six checks × each reachable status (`pass`, `attention`, `fail`, `inconclusive`,
`unsupported`, `not_configured`, `not_run`, `error`), assert: the card renders; the tone word is the
§4.5 mapping and never the raw enum; the where-it-ran tag is correct; a non-pass is never counted in
the pass total. **`NOT RUN` and `INCONCLUSIVE` must not appear as literal strings anywhere in the
rendered DOM** — that is one assertion and it catches the whole class.

### 7.3 Input boundaries

Empty (keep-list item 1: the exact message, and focus moves to the box). One character. 49 characters
(writing rules suppressed, exact checks run). 50 characters. 42 words (server refusal, withheld state,
no number). 59 / 60 words. 140 words (the reading-weight middle band and its **mandatory** asymmetry
sentence). 300 words (no extra line). 4,000 / 4,001 words (413 → `too_long`, **nothing truncated**,
browser route offered with its download cost stated). 50,000 characters. 50,001 characters.
20 MB file. Non-text file on the text checks.

### 7.4 Both routes

Same document, both routes, asserting: the level name is identical or the difference is visible in the
strip; the route tag names the route that ran; the figures quoted come from that route's own
measurement block; the threshold printed is the one that route reported. **The mid-range route
divergence is real and must not be papered over** — F3 measured 0.9183 browser against 0.5866 server on
the page's own Mixed sample, and `CORPUS-RECONCILIATION` §6.2 puts route disagreement at 0.62% at
0.984 and 11.14% at 0.8082. The test asserts the copy never claims the routes agree.

### 7.5 Model download and consent

Cold cache: consent panel appears before any byte is fetched; selecting the private route starts the
download; a real progress bar with a percentage and an estimate; **the ONNX filename never appears**;
the progress line is cleared on completion and does not sit stale at "34.3 MB of 34.3 MB" beside "Model
ready"; the run button stays available and queues. Warm cache: no consent panel, run in 1.8–2.2 s.
Pressing run on the browser route with no model: **offers the download**, does not burn a run, does not
produce a thousand-word panel, and does not send the user back to the server route.

### 7.6 Accessibility

- **Keyboard only, end to end**: land, tab to the box, paste, choose a route, run, reach every section
  in the strip in **document order**, open every disclosure, download the receipt. No trap, visible
  3 px focus ring at 4 px offset on every control, 14-or-fewer logical stops through the tool.
- **Screen-reader announcement of the verdict**: a single `role="status"` element, not the whole result
  panel. It announces one sentence — *"Finished. AI signal: faint signal, from the strongest of two
  sections. Hidden characters: odd marks. Writing notes: a few. Results below."* Withheld:
  *"Not enough text to read…"*, never "no result" and never "error". The meter's own label is the level
  only. The paste box's accessible description is one short sentence, not the 190-word privacy
  paragraph. Route options get six-word names, not 101 and 64.
- **Contrast**: recompute every pair against UI-3's shipped palette, in the rendered page, not from the
  specification's indigo tables. 4.5:1 text, 3:1 large text, 3:1 non-text. Nothing below 12 px — the
  live 9.2 px `ZWSP` chip and 11.2 px legend titles die with the panel, so this is a check that they
  did not come back.
- **Greyscale**: screenshot the five axis A states and the three axis B states with the colour stripped.
  Any two identical is a failure.
- **Target size**: nothing interactive below 24 px at 375 px; aim for 44 px. The live page has fifteen
  failures including five 19 px check toggles and an 11×11 breadcrumb link.
- **Reflow**: 375 px, 768 px, desktop, and 640×512 (1440 at 200% zoom). `body.scrollWidth` must equal
  the viewport width at 375. Wide tables scroll inside their own container, never the page.
- **`prefers-reduced-motion`**: the progress bar stops animating; the meter never animates its fill.

### 7.7 The three defects fixed today, as permanent regressions

These are the highest-value tests in the plan, because all three were live this morning.

1. **The `"W"` document-level rendering bug.** Run `doc-level.json`. Assert: `highlights rendered = 0`;
   no node's text equals `"W"` or `“W”`; the rule-match frequency table does not render; every
   document-level finding shows its own `evidence.detail` statement; **no "Show in draft" control exists
   on any of them**. Four rules fire on this passage, not the two the audit recorded — `low_ttr` and
   `sentence_flatline` do it too, and any rule calling `pushEx(…, null, null, …)` will.
2. **The `p{index}` keying mismatch.** The rail keyed findings over the *full* list while `renderDraft`
   keyed over the *filtered* list, so any finding without a usable span shifted every key after it and
   "Show in draft" jumped to the wrong highlight. The rail is deleted, so the direct test dies with it.
   Replace it with the general assertion: **for every rendered finding that offers a location, the
   passage it scrolls to contains the text the finding claims to have matched.** That is the property
   the keying bug violated, and it survives the panel's deletion.
3. **Rule-count and threshold literals from one source.** Assert `113` does not appear in the checker
   bundle; assert the framing paragraph and the writing-notes count interpolate the same variable;
   assert `0.984` appears in the bundle exactly once, as the `server_fp32_segmented` key; assert the
   chip changes when a fixture `thresholds.json` moves the threshold, with no code edit.

### 7.8 Live verification, after deploy

Every check below runs against `https://opace.agency/tools/ai/content-verification-integrity/checker/`
in a real, **foregrounded** browser.

1. `transferSize > 0` on the HTML document, and the deployed bundle hash differs from the pre-deploy
   one. See §8.1 — this is not optional.
2. One full server run, one full browser run.
3. String presence: the new level names present; `AI-STYLE EVIDENCE`, `Protect these facts (planned)`,
   `INCONCLUSIVE`, `NOT RUN` and `113 named rules` all absent.
4. Console clean.
5. The `doc-level` passage pasted live, asserting the §7.7.1 properties on the deployed page.

### 7.9 Two extra tests this plan adds

- **Stale offsets.** Run, then type one character into the textarea. Assert the whole result is cleared
  (`invalidateActiveEvidence`) and no section tint survives against edited text.
- **Figure removal.** Serve a `thresholds.json` with `measured.ai_detected` deleted. Assert the run
  fails loudly, nothing is counted as a pass, and no empty string is printed where a figure belongs.

---

## 8. Sequencing, and the point of no return

Six steps. Each is independently shippable and leaves a working tool. Steps 1–2 are safe to ship the
day they are written; step 3 is where the page changes shape.

| Step | What | Ships alone? | Risk |
|---|---|---|---|
| **0** | Delete the ten dead files. Add the test harness and record the fixtures | Yes | None. Nothing imports them |
| **1** | **Figures.** Move `SEGMENTS_MEASURED` and the `DISCLOSURE_BODY` literals into `thresholds.json`; refresh the `measured` block to the corrected figures (§9 below); route everything through `figure()` | Yes — and it should, because it corrects live numbers | Low. Data plus one module |
| **2** | **Vocabulary.** `statusLabel` → the four tones. Level names from `signal-scale.ts`. No layout change | Yes | Low. Visible improvement on the current layout |
| **3** | **Structure.** The new block order, the promoted document strip, the axis B/C cards from `combined_verdict`, the check cards, the collapsed watermark row, the four disclosures. **The evidence panel is deleted here** | Yes, but this is the change the owner is reviewing | **Highest.** This is the point of no return |
| **4** | **Visual.** UI-3's tokens, icons, meter, track, the CSS lifted out of `checker.astro` | Yes | Medium, and entirely reversible |
| **5** | **Route and download.** The segmented control, the real progress bar, the recovery buttons on every error | Yes | Medium. Touches the consent path |
| **6** | **Neighbours.** Lab → Checker handoff, the two router cards, the suite index tidy-up (F13) | Yes | Low, and separate pages |

**The point of no return is step 3**, specifically the deletion of the `[data-evidence]` aside. Before
it, every change is additive or a copy edit and reverts cleanly. After it, the results region is a
different shape and the controller's render path has been rewritten. §5.4 keeps the *panel* cheap to
restore; it does not make the *layout* cheap to restore. So: step 3 lands as its own commit, on its own
deploy, with the live verification in §7.8 run immediately, and with the previous Netlify deploy
identified and ready to promote before the push.

**Deploy mechanics.** Netlify builds on push to `main`; the current working branch tracks
`origin/codex/preferred-sources-submission-status`, whose head is identical to `origin/main`. Start each
step from an up-to-date `main` on a named branch and merge forward. Deploys have been landing inside
90 seconds today.

**Coordination.** None of this touches the segmentation contract, so `HANDOVER` §14's "deploy the
server first, then the site" rule does not apply. If any step ever needs to bump
`SEGMENTATION_CONTRACT`, it becomes a two-repository deploy and this plan does not cover it.

### 8.1 The environment traps

Four have caught three agents today. They are not incidental.

1. **`astro build` fails in place under Dropbox** — a post-build `rmdir` race that fires *after* all 697
   pages generate, so `✓ Completed` prints before the error. **Build to a directory outside Dropbox.**
   Netlify is unaffected. The plan does not require a local build at all; `tsc --noEmit` is what the
   defect-fix session used and it is sufficient.
2. **Concurrent builds corrupt `dist/`.** Check for another build before starting one.
3. **`requestAnimationFrame` never fires in a hidden tab**, so an automated run appears to hang for ever
   with no error. Foreground the tab or shim rAF. `paintFrame` (`integrity-controller.ts:141`) races a
   100 ms timeout, which mitigates but does not remove this — keep that race in the rewrite.
4. **The server route refuses scripted clients with `automation_detected`** (`server-route.ts:249–252`,
   HTTP 401/403 with that body → `automation_blocked`). A browser-like `User-Agent` and
   `Origin: https://opace.agency` are both required, and the header is `x-opace-token`, not
   `Authorization: Bearer`. Drive a real browser; do not `curl` the check endpoint.
5. **A browser check can silently read a cached pre-deploy page.** `netlify.toml` sets
   `Cache-Control: public, max-age=300, stale-while-revalidate=600` plus the same `CDN-Cache-Control`
   for `/*`, so both the browser and Cloudflare will happily serve the old HTML for five minutes and a
   stale copy for ten more. **Check `transferSize` on the document request**; a cached read reports 0.
   Confirm the `_astro/checker.astro_astro_type_script_*.js` hash changed as well — the HTML can be
   fresh while the bundle reference is not.

---

## 9. The figures, and the `thresholds.json` refresh

### The corrected figures, verified against `CORPUS-RECONCILIATION-2026-08-29.md`

The one sentence Opace can publish and defend:

> **The trained classifier detects about 95% of AI-written long-form documents and wrongly flags about
> 1.2–1.5% of human-written long-form documents.**

| Runtime | AI detected | Human false positives |
|---|---|---|
| fp32 EU server, whole corpus | **877/922 = 95.1%** | **56/4,636 = 1.21%** |
| int8 browser, 2,424-document stratified sample | **621/654 = 95.0% [93.0–96.4]** | 43/1,770 = 2.4% raw; **1.54% register-reweighted** |
| Human fiction, worst case, shipped operating point | — | **fp32 29/260 = 11.2% [7.9–15.6]**, browser 28/260 = 10.8% |

Corpus conditions that travel with every one of them: 5,558 fresh long-form documents never trained on,
922 AI from 13 current models, 4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC
EDGAR and PERSUADE 2.0; threshold 0.984; segmentation `segments-v2`; aggregation maximum-over-segments;
runtimes reported separately and never mixed.

**Every figure carries "long-form".** Short marketing, SEO and social copy has **no independent
measurement at all** — every sample the programme owns for those registers sits inside the cycle-2
training set, so there is no independent accuracy figure for the register most visitors will paste.
That absence is published as an absence, tagged **Not measured**, not softened into a range.

### What must change in `thresholds.json`

**`measured.ai_detected` = `"833/922 (90.3%)"` and `measured.human_false_positives` = `"62/4,636 (1.34%)"`
are opening-only, pre-segmentation, segments-v1 figures.** `78e8555c` marked them
`pending_remeasurement: true` and carried them forward unchanged rather than laundering them, which was
right at the time. `CORPUS-RECONCILIATION` §8.2 now retires them outright, and §7 reports that the full
browser curve costs **under ninety minutes**, not the five hours `HANDOVER` §13 records.

**Recorded as a plan constraint: `thresholds.json`'s entire `measured` block is v1-derived and must not
generate user-facing copy until it is refreshed.** Two consequences for the build:

1. **Step 1 refreshes the block** from `CORPUS-RECONCILIATION`: `server_fp32_segmented` is already
   correct and stays; add `browser_int8_segmented` with the 621/654 and reweighted-1.54% pair and its
   confidence interval; add `human_fiction_worst_case` at 29/260 and 28/260 by runtime; add
   `registers_unmeasured` naming short marketing, SEO and social copy; add `SEGMENTS_MEASURED`'s seven
   values and the length-sensitivity figures now living in `DISCLOSURE_BODY`. Clear
   `pending_remeasurement` **only** for blocks that have actually been measured.
2. **Until step 1 lands, the redesign renders no detection rate at all.** The accuracy plate shows the
   corpus line and the "not measured" tag and nothing else. That is a worse plate for a few hours and it
   is the only version that is not making a claim from a retired number.

Three stale figures will still be on the site after step 1 unless they are chased, and all three are
outside `thresholds.json`: `checker.astro:66` (section 03's `113 rules / 45.1% / 24.8% / 5,558`),
`checkerFaqs` (the same set), and the scoring specification's own §5.5 weakness line, which quotes
`90.3% / 1.34% / 16 of 260 (6.15%)` and **must not be copied into the build**. The mockups' `FIGURES`
object already carries the corrected numbers; the specification document does not. Where they disagree,
`CORPUS-RECONCILIATION` wins.

---

## 10. Open questions, with a recommended answer to each

| # | Question | Recommendation |
|---|---|---|
| 1 | **Delete the Highlights panel, or reword it?** | **Delete.** 35.9% of sentences push their document towards machine; the panel cannot mean what readers take from it. §5.4 makes keeping it a one-revert change if the owner disagrees |
| 2 | **F15 says stop running the watermark scan on pasted text by default. `WATERMARK-LAB-PLACEMENT` (written later) says it stays, on by default, as one of six, collapsed.** These conflict | **Follow the later document: keep it on, collapsed to one line.** Turning it off would make the tool's own claim ("six named checks, none hidden") false to save one collapsed row, and the "not run" discipline is the project's core commitment. The audit's real objection was the per-key table on every run, and collapsing it answers that |
| 3 | **Does a headline number survive at all?** | **No.** Level name plus track. If the owner insists, the sanctioned fallback is the track position labelled as what it is — "42 out of 100 on our Signal Scale", with "not a percentage of your document, and not a probability" beside it. Never the raw probability as a headline |
| 4 | **Does the threshold move?** | **Hold 0.984.** `CORPUS-RECONCILIATION` §6.3: at 0.8082 the server would wrongly flag 1,023/4,636 = 22.07% of human documents; at 0.95, 7.68% for 41 extra AI documents. The design is portable either way, which is the point |
| 5 | **Should the `protected` checkbox go?** | **Yes.** It is a control whose outcome is a list of things the tool promises not to change during a rewrite that does not exist yet. The list survives as a panel; the tick box does not |
| 6 | **Should the suite index (F13) be in scope?** | **Yes, as step 6.** Six of eight cards do nothing and are badged with internal release vocabulary. It is the parent page of the thing the owner is reviewing, and the audit calls it a twenty-minute fix |
| 7 | **Should `combined_verdict.confidence` render?** | **No.** See §4.6 item 4. Record it in the receipt and write down that the non-render is deliberate |
| 8 | **Does the browser curve get measured before launch?** | **No, but say so.** Ninety minutes of compute is cheap, and it retires the v1 block permanently — but it is a measurement task, not a UI task, and blocking the redesign on it helps nobody. Ship with the browser figures tagged provisional in the plate, which is what the block already asserts |
| 9 | **`MethodVersion.astro` — keep or retire?** | **Retire it with section 02.** The six check cards say the same thing about the run that actually happened, rather than about the methods in the abstract |
| 10 | **Does the mockup's `#threshbox` demonstration ship?** | **No.** It is a mockup control. The portability it demonstrates is proved by the test in §6 row 6 instead |

---

## 11. What this plan does not cover

- The Lab rebuild itself. Only the router cards and the Checker handoff are in scope (step 6).
- The route divergence in F3. It is a measurement question, another agent owns it, and the copy already
  stops claiming the routes agree.
- Porting watermark generation, or the Lab spin-out.
- The C2PA trust-list upgrade named as a roadmap item in `WATERMARK-LAB-PLACEMENT` §4. Those claims come
  from an LLM transcript and are unverified.
- Re-measuring anything. Every figure here is quoted from `CORPUS-RECONCILIATION-2026-08-29.md`.
- Any change to `implementation/`, the engine, or the inference server.

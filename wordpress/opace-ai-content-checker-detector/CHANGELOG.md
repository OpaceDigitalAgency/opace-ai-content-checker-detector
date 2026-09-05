# WordPress changelog

## 1.1.10

* Human, uncertain and AI result explanations now agree across the checker, editor and reports without absolute authorship or whole-draft claims.
* Shared writing evidence quotes measured phrases and structures, with research comparisons and explicit limitations in the workbench and PDF.
* Character and selected-rule results no longer imply an authorship all-clear. Compact editor evidence and completed-route labels match the full report.
* Corrected word-reuse and vocabulary measurements to their research definitions, and aligned missing paragraph cadence with the trained model's feature preparation. Model weights and document thresholds are unchanged.
* Stale draft text is rejected by report exports. Current-model sentence classification remains unavailable pending independent calibration.
* Editor-to-report navigation uses single-use browser session storage instead of server draft copies. Edited drafts and replacement runs clear old hand-offs.
* PDF summaries size themselves to the full explanation without overlap or truncation; section measurements use readable decimal precision.

## 1.1.8

* Compact Classic and Block Editor panels use the approved checker mark, one result headline and two supporting readings, without repeating the native panel title.
* Privacy and score explanations remain available in a keyboard-accessible disclosure. Download and transmission consent stays visible before checking.
* Smaller report and check actions fit the sidebar; editor child modules inherit the plugin version to prevent stale cached layouts.
* Detection, scores, draft extraction and full-report handoff are unchanged.

## 1.1.7

* Search saved posts and pages from a compact, keyboard-accessible dropdown. Filter by content type, select an editable item, then explicitly load or replace the checker draft; saved originals are never changed.

* Compact checker header and always-visible processing action; ordinary page scrolling replaces independent columns.
* Spaced named-check cards with expandable metadata, centred checkbox ticks and improved expanded Methods layout.
* Related WordPress plugins, GitHub and support links on every plugin admin page.
* Current approved report mark, improved PDF pagination and readable evidence records. Stale no-model caveats are excluded from assessed reports; a completed model check is no longer labelled “No issue found”.
* Model, scores and thresholds are unchanged. Marketplace publication remains a separate step.

## 1.1.5

The editor panels do the work now instead of pointing at it.

* The Block Editor sidebar and the Classic Editor box run the plugin's full deterministic engine — every writing rule and every carrier rule — in a worker, so the editor does not stutter while they run. They used to call a WordPress route that ran three of the writing rules in PHP and then said the real check was on another screen.
* Both panels take the AI reading through whichever route the site has open: private EU analysis where an administrator has turned it on and the service is accepting runs, otherwise the same trained model on the editor's own device. Where neither is possible the panel says so plainly and shows the integrity checks alone. Every transfer and every download is named on the button before it is pressed, in the checker screen's own words.
* The reading is shown rather than counted: a dial, the level in its band colour, the score, the one plain sentence, the three readings and which section read strongest.
* "Open the full reading" opens the checker screen with that result already on it. The reading travels through a five-minute transient keyed to the post and the person, never through the link, and is handed over once.
* Both panels are drawn in the plugin's own design system — paper card, product mark, band colours, orange primary, eight-pixel rhythm — and follow the reader's admin colour scheme into dark.

## 1.1.4

Refine the five discovery tags and condense the directory readme below 10 KB, preserving features, privacy boundaries, limits and screenshot captions. The fuller GitHub guide is retained. Detection, permissions and stored data are unchanged.

## 1.1.3

Documentation enrichment, corrected links and clarified route privacy. Detection and permissions are unchanged.

## 1.1.2
* The checker screen is two columns on a wide desktop: your draft on the left, the result on the right, each scrolling on its own. It stays one column below that width.
* Choosing a section tints that exact passage in your draft and brings it into view, and section rows now open in place, one at a time, with a strip that steps between them.
* "Copy share summary" opens the same share sheet the website uses. What travels is the reading summary and a result link; your checked text never is.

## 1.1.1
* Replace the old lettered logo with the simplified Opace checker identity. Chrome uses the magnifier-and-tick mark; WordPress.org uses the stacked OPACE / AI CHECKER lock-up and full-name banner.

## 1.1.0
* Renamed to Opace AI Content Checker & Detector, so the name says what the plugin does. The menu now reads AI Content Checker, and the row action on Posts and Pages reads "Check with AI Content Checker".
* No setting, receipt, stored option or route changed. Existing receipts and settings are read exactly as before.

## 1.0.15
* Rebuild every screen on one design system, and make the checker a two-step flow in one column: add your draft, choose how it runs, then read the result at full width.
* Replace the agreement tick boxes with a button that says what pressing it will do, so nothing to agree to can be missed: "Send once to the EU server and check", or "Download model (34.5 MB) and check".
* Show one result card for an integrity-only run instead of two that said the same thing, and rewrite every refusal as one card: what happened, what to do, and one button that does it.

## 1.0.14
* Draw the checker straight away instead of waiting on the EU service, showing that route as being checked and correcting the card in place once it answers, with on-device ready to run throughout.

## 1.0.13
* Offer private EU analysis first where an administrator has turned it on and the service is accepting runs, with running on your own device one click away and never limited.
* Name which allowance was reached, and when it comes back, in plain words rather than a code.

## 1.0.12
* Open a post from the Posts or Pages row action as readable writing, through the site's own authenticated API, and say what each route does with your draft in that route's own words.

## 1.0.11
* Rebuild the checker and its result to match the free online checker, rewrite the settings and methods screens, and bundle both fonts so nothing loads a remote file.
* Explain the on-device download: what the file is, its size and hash, that it is data rather than a program, and that one click removes it.

## 1.0.10
* Add local Content Credentials inspection with the packaged C2PA web and WASM runtime, and on-device analysis with a hash-pinned model download, a character limit, cancellation and a versioned cache.
* Add the fixed, body-bound WordPress client for EU analysis, fail-closed until the live channel exists.

## 1.0.0
* Add deterministic inspection, editor surfaces and hash-only receipts.

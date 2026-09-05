# WordPress changelog

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

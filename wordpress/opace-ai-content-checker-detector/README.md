# Opace AI Content Checker & Detector for WordPress

Opace AI Content Checker & Detector gives WordPress editors explicit local, on-device and optional EU-server analysis routes. It protects facts and citations, supports Block and Classic Editor working copies, and can save a hash-only evidence receipt without storing the draft text.

Version 1.1.10 adds shared writing examples and research comparisons to the checker and PDF, with precise character/rule labels and compact editor evidence. It requires WordPress 6.5 or newer and PHP 7.4 or newer. Generated rewrites, commercial detector calls and an official Anthropic watermark verifier are not included; unavailable methods remain explicitly labelled rather than inferred.

![WordPress AI checker with on-device model download selected](.wordpress-org/screenshot-2.png)

_Choose the on-device route and review its download disclosure before checking a draft._

> Release state: local 1.1.10 candidate; WordPress.org publication remains pending. Expanded-screen and PDF verification does not replace final exact-archive testing or owner Safari/VoiceOver acceptance.

> Development state: the source tree consumes the shared Cycle-5 browser runtime and canonical checker-result contract, renders the five-band result with every evidence layer, and builds complete same-result exports. The on-device route downloads only hash-pinned model data after consent. The fixed EU challenge/token/check client requires administrator enablement, per-run consent and an accepting service capability response. Local JPEG, PNG, WebP and PDF Content Credentials inspection uses the official packaged C2PA web/WASM runtime; certificate trust lists and remote manifests are not fetched. See the [C2PA runtime record](docs/C2PA-RUNTIME.md) and [EU server-analysis guide](docs/SERVER-ANALYSIS.md).

[Explore the WordPress plugin](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/) · [Read the privacy notice](https://opace.agency/privacy-policy/) · [Get support](https://opace.agency/get-in-touch/)

## Free AI content checker for WordPress posts and pages

Review a blog post, contributor article or AI-assisted landing page before publication. This free AI content detector combines a trained model with highlighted section evidence, hidden-character checks and separate editorial suggestions. It can assess ChatGPT, Claude and Gemini-style writing, but cannot name the generator or establish authorship.

Run checks directly in the Block Editor or Classic Editor sidebar. Both use the full deterministic engine and the available model route, with download or transmission consent before running. Open the full report to inspect the same result in detail. No AI Scribe, Opace Hub or paid API key is required.

## New in 1.1.10

Quoted writing observations, research comparisons and report exports use the same evidence module. Character checks and selected writing rules state exactly what they found, without implying an authorship all-clear. Editor panels retain the completed processing route and expose compact evidence. Research measurements and missing paragraph cadence are corrected; model weights, permissions and document thresholds are unchanged. Individual-sentence AI classification remains unavailable until it passes current-model calibration.

## AI writing detection with section evidence and reports

Read each section's score and named level beside the passage it describes. Expand its measured signals, move to the next section and compare the highlighted text with the explanation. Review protected names, figures and citations before applying a suggested character-only fix.

Full PDF reports contain scored passages. Content-free JSON, receipts and shared result links omit draft text. Use a detailed report for an agreed editorial review and a receipt when only the check record is needed. The score is a zero-to-one pattern reading, never an AI-authorship percentage.

## WordPress AI detector screenshots

![WordPress AI content checker with a draft and its full reading](.wordpress-org/screenshot-3.png)

*Read the draft and result together in the desktop workbench.*

![Expanded section evidence with its score, passage and word re-use measurement](.wordpress-org/screenshot-4.png)

*Match the explanation to the exact scored passage before deciding what to edit.*

[All eight directory screenshots](.wordpress-org/) cover route choice, result evidence, report, settings, privacy and the editor quick check. Captions are in [the WordPress.org description](readme.txt).

## Questions about the free AI content detector

**Is it free?** Yes. There is no separate Opace login or provider API key. On-device checks have no run-count limit; optional EU analysis has fair-use allowances. Your normal WordPress permissions still apply.

**Can it check plagiarism?** No. AI-pattern assessment, Unicode inspection and Content Credentials do not compare your writing against the web or verify factual accuracy.

**Does it alter my post?** No. Checks read the working copy; reviewed character fixes apply only inside the checker. Saved receipts contain hashes and evidence, not saved post content.

**Can it detect AI images or extract PDF text?** Its JPEG/PNG/WebP/PDF path inspects C2PA provenance locally. It is not visual AI-image classification or a PDF text detector. A missing credential is inconclusive.

**Can a human-written article be flagged?** Yes. Review the [measured limitations](https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/), especially fiction, short writing and mixed-origin text. A flag is not an authorship decision.

## Related content, SEO and developer tools

[AI Scribe](https://wordpress.org/plugins/ai-scribe-the-chatgpt-powered-seo-content-creation-wizard/) supports drafting; [Essential SEO Toolkit](https://wordpress.org/plugins/opace-essential-seo-toolkit/) supports page audits. Use them separately alongside this checker; direct AI Scribe/Hub integration is not included.

Browse the [checker source on GitHub](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector), [Opace tool suites](https://opace.agency/tools/suite/), [SEO services](https://opace.agency/services/seo/) and [WordPress development](https://opace.agency/services/web-design/wordpress-development/). The [Chrome information page](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) will link to the store after publication.

## Install locally

Build the deterministic plugin ZIP from the implementation repository:

```bash
bash wordpress/opace-ai-content-checker-detector/bin/build-plugin.sh dist
```

Upload the resulting ZIP through Plugins > Add New > Upload Plugin, activate it per site, then open AI Content Checker > Checker.

## Five-minute start

1. Open **AI Content Checker > Checker** and choose on-device Cycle-5, the available EU route, or integrity checks only.
2. Paste text, or choose **Load a post or page**. Type to search, filter by content type and select an item. **Load** copies its saved text; **Replace draft** explicitly replaces an existing checker draft. Original posts and pages are never changed. The editor panels separately check unsaved working copies.
3. Run the local checks and review each method's status, evidence and limitations.
4. Preview any safe character fix before applying it to the Lab working copy.
5. Save a hash-only receipt only when an evidence record is useful.

## What ships

- browser-only deterministic inspection with no external request;
- on-device Cycle-5 for up to 100,000 UTF-16 characters, with a consented and hash-verified model download;
- a fixed Opace EU challenge/token/check client gated by administrator opt-in, live capability and per-run consent;
- protected numbers, dates, links, quotations, citations and code;
- opt-in safe character fixes in the Lab working copy;
- hash-only receipts stored on the same WordPress site;
- Block Editor and Classic Editor unsaved-copy checks;
- local JPEG, PNG, WebP and PDF Content Credentials inspection, with present, absent, invalid and untrusted kept distinct;
- per-site Multisite storage, Site Health diagnostics and explicit uninstall retention controls;
- honest unsupported, not configured and not run states.

The EU route is available only when administrator settings and the service capability response permit it. An unavailable route offers the on-device alternative.

TXT, Markdown and HTML open in the local text workspace. JPEG, PNG, WebP and PDF up to 20 MB run the separate local C2PA method. The C2PA runtime is lazy-loaded from this plugin only; file bytes, names, hashes, manifests and findings do not enter receipts, shares, URLs, analytics or logs. A completed file check can export a content-free provenance JSON/PDF; a valid full text result can export the complete checker PDF. Neither export re-scores content.

The plugin does not add public-page assets or credit links, save or publish posts, include telemetry or claim proof of authorship. External network use is limited to the route the editor explicitly chooses: pinned model assets for on-device analysis, or one confirmed draft transmission through the fixed EU service when that channel is enabled.

## Privacy and security

Opening a full report from an editor keeps the result and draft in this tab's session storage, valid for five minutes. It is removed when read, replaced, edited or the tab closes; no server copy is sent. If browser storage is unavailable or the record expires, the checker offers to load the saved post instead; unsaved edits are not silently reconstructed.

Deterministic and C2PA inspection stay in the browser. On-device Cycle-5 downloads model data but keeps the draft local. Saved-content search and loading use this site's authenticated REST API and require permission to edit each item. Saving a completed AI reading sends hashes and results to this site; an integrity-checks-only receipt sends the draft for hashing in memory. Neither receipt stores the draft. Mutations require WordPress permissions and nonces. Ownership, idempotency, hostile-storage and uninstall behaviour are covered by the G4 test plan.

The EU adapter requires an authenticated same-site REST request, administrator opt-in, explicit per-run confirmation, a valid idempotency key, conservative per-user pacing and bounded text/response sizes. Its destination is the fixed Opace EU service; an old or unavailable capability response keeps the route disabled. It never spoofs a browser Origin or user agent.

See the packaged `readme.txt`, `third-party-notices.txt`, `LICENSE` and `CITATION.cff` for directory copy, attribution and citation details. Security reports should follow the programme's [security policy](../../SECURITY.md); do not include draft content or credentials.

For non-sensitive help, use [Opace support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Accessibility and compatibility

The plugin supports WordPress 6.5 or newer, PHP 7.4 or newer, Block Editor, Classic Editor and per-site Multisite operation. Plugin-owned controls use semantic labels, visible focus and text status; candidate QA covers keyboard use, reduced motion, 320/375 px reflow and 400%-equivalent layouts. Owner-environment Safari and VoiceOver acceptance remains a separate release gate.

## Development checks

```bash
npm ci
npm run lint
npm test
npm run test:e2e
vendor/bin/phpunit
vendor/bin/phpcs
```

The release gate also requires deterministic ZIP hashes, exact installed-byte parity, PHP 7.4 lint, current/minimum WordPress, Multisite, Plugin Check, responsive browser and accessibility evidence.

## Troubleshooting

### The editor text is not available

Open a supported Block or Classic Editor screen and retry the unsaved working-copy check. The plugin does not read or alter unrelated admin screens.

### A method says unsupported or not configured

That is an evidence state, not a plugin error. Version 1.1.4 never substitutes a different detector or reports a pass for an unavailable method. For C2PA files, absent is inconclusive and untrusted means trust was not established without fetching a certificate trust list; neither is silently converted to pass.

### A receipt does not contain the draft

This is intentional. Receipts store hashes, versions, statuses and method evidence, not the original text or candidate rewrite.

## Links

- [Opace AI Content Checker & Detector for WordPress](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/)
- [Opace privacy notice](https://opace.agency/privacy-policy/)
- [Opace support](https://opace.agency/get-in-touch/)
- [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- [Opace](https://opace.agency/)
- [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)

## More AI checker tools by Opace

- [Browser-based Content Integrity Checker](https://opace.agency/tools/ai/content-verification-integrity/checker/)
- [Opace AI Content Checker & Detector for Chrome](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/)
- [Opace AI Content Checker & Detector for Astro](https://opace.agency/tools/ai/content-verification-integrity/astro-integration/)
- [Content Integrity CLI and local API](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/)

## Licence

GPL-2.0-or-later. Bundled dependencies retain their own compatible notices.

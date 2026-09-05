=== Opace AI Content Checker & Detector ===
Contributors: opacewebdesign
Tags: ai detector, ai content detector, ai content checker, chatgpt detector, ai watermark
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.11
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Free AI content checker and AI detector for WordPress posts and pages, with section scores, hidden watermark character checks and reports.

== Description ==

**Opace AI Content Checker & Detector is a free AI content checker for WordPress.** Review ChatGPT, Claude and Gemini drafts with section evidence, highlights and editing observations. No Opace account, subscription or API key needed.

[Try the online AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) | [WordPress plugin guide](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/) | [GitHub source and issues](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector)

= Free AI content detector with section evidence =

Features:

* Five-band levels, zero-to-one scores and explanations for the draft and each scored section.
* Expandable passage evidence, including word re-use and sentence-length variation, with matching draft highlights.
* Separate AI-pattern, text-integrity and editorial readings.
* Named checks, statuses, limitations, route and model records.

Scores are not authorship percentages. False positives and misses occur, especially with fiction, short or heavily edited text. No result proves authorship. [Detection measurements](https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/) disclose corpus, runtime, operating point, overlap and uncertainty.

= AI checker for WordPress editors and agencies =

Review posts, articles and landing pages against sources and revision history. Block/Classic Editor panels run the full rule set on unsaved drafts, take the AI reading through the site's open route, name any transfer or download on the button, flag stale results and open the workbench with it. Posts/Pages have a "Check with AI Content Checker" row action.

= Hidden watermark characters and protected facts =

Inspect invisible Unicode, unusual spaces and mixed-script lookalikes. Legitimate typography, emoji and multilingual text can contain these; findings do not establish AI use.

Preview fixes before applying them to the checker copy. Names, figures, dates, links, quotations, citations and code are protected; lookalikes are never auto-replaced. Editorial suggestions do not set the AI score.

Private Google and Anthropic text watermarks are unsupported. The separate [SynthID-Text lab](https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/) uses public demo keys, not provider verification.

= C2PA Content Credentials for images and PDF files =

Inspect JPEG, PNG, WebP or PDF up to 20 MB locally. Present, absent, invalid, untrusted, unsupported and error stay distinct. Absence proves nothing about authorship. No remote manifests, certificate status or trust lists are fetched; signer trust cannot be established. This is provenance inspection, not AI-image classification or PDF text detection.

= Reports, result links and hash-only receipts =

Print or download a PDF with section scores, scored passages and named evidence. Full reports contain draft passages: review before sharing.

Result links, summaries and JSON omit draft text. Completed AI readings save hashes and check results only. Integrity-only receipts send the draft to this site for hashing but never store it. File checks export separate content-free PDF/JSON; their bytes, names, hashes and manifests never enter text receipts or links.

= How to check AI content =

1. Open AI Content Checker > Checker.
2. Paste text, search saved posts/pages, import TXT, Markdown or HTML, or load an example.
3. Choose Private EU, on-device or integrity-only checks.
4. Confirm the named download or one-time transfer.
5. Review evidence, export a report or save a receipt.

Integrity-only checks never produce an AI reading.

= Privacy, permissions and external services =

**On-device:** consent downloads the model and vocabulary (about 34.5 MB) from `https://opace.agency/models/local-signals-v1/`. Model: `tier3-cycle5-full-e5small-int8-perchannel.onnx`, 34,301,767 bytes, SHA-256 prefix `9f57d6a8` (full hash in source). These are data files, not a program; runtime code is packaged. No executable code is fetched from anywhere else. Files are verified before loading, browser-cached and removable. Draft text is not uploaded; asset requests expose network information, including your IP, to the host.

**Private EU:** requires administrator enablement, an accepting service and your confirmation per check. Endpoints: `https://opace-detector-877422072168.europe-west1.run.app/v1/wordpress/challenge`, `/token`, `/check`. Challenge/token send a SHA-256 site identifier, random install/request identifiers and body hash; check adds the draft. Processing is once in memory in `europe-west1`, reporting `retained: nothing` for draft content. Network/abuse-control data is separate; see the privacy policy. Unavailable or limited runs offer on-device analysis.

**Local checks and receipts:** character, writing and file checks run in your browser. Editor-to-report hand-offs use this tab's session storage, expire after five minutes and are removed when read; no server copy. Receipt requests require login, capability and REST nonce. Multisite storage is per site. Review uninstall retention settings.

There is no Opace telemetry, advertising, remote font, analytics pixel or public credit link in the plugin. It loads no checker assets for ordinary site visitors. [Opace privacy policy](https://opace.agency/privacy-policy/).

= Usage limits and compatibility =

Requires WordPress 6.5+ and PHP 7.4+. Supports Block Editor, Classic Editor and per-site Multisite activation.

Up to 100,000 characters per run, or the administrator's lower limit; at least 60 words for an AI reading. Longer input is refused, never silently shortened. Shorter text can still use character and writing checks.

On-device analysis has no run-count limit. Private EU analysis allows 3 runs a minute and 20 an hour per person, within WordPress-reserved, shared and per-site hourly/daily allowances. Settings shows current service figures. Limit messages name the allowance, reset and on-device fallback.

= Related tools and support =

[AI Scribe](https://wordpress.org/plugins/ai-scribe-the-chatgpt-powered-seo-content-creation-wizard/) creates drafts; [Essential SEO Toolkit](https://wordpress.org/plugins/opace-essential-seo-toolkit/) audits pages. Neither is required.

[Chrome](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) and [Astro](https://opace.agency/tools/ai/content-verification-integrity/astro-integration/) guides. Store links follow verified publication.

Built by [Opace](https://opace.agency/), providing [AI services](https://opace.agency/services/artificial-intelligence/). Browse the [GitHub organisation](https://github.com/OpaceDigitalAgency) or [get support](https://opace.agency/get-in-touch/). Do not post private drafts or credentials.

== Installation ==

Upload and activate the ZIP via Plugins > Add New > Upload Plugin. Open AI Content Checker > Checker; enable optional EU analysis in Settings. Multisite: activate per site, not network-wide.

== Frequently Asked Questions ==

= Is this a ChatGPT detector or plagiarism checker? =

It assesses AI-writing patterns, not an individual generator's identity. It does not search for plagiarism or verify facts.

= Will it rewrite or publish my post? =

No. Confirmed character fixes affect only the checker copy; writing suggestions are optional.

= What does an untrusted credential mean? =

Signer trust was not established. It does not mean the signer is malicious.

= Why is an AI reading unavailable? =

Check input length, model download and selected route. Integrity checks remain available. Unsupported, not configured, not run, inconclusive and error never mean pass.

== Screenshots ==

1. WordPress AI checker before a run, with Private EU analysis recommended and the transfer named on the button.
2. On-device AI detection selected, with the model download disclosed before it starts.
3. Free AI content checker workbench: draft on the left and the reading, level and score on the right.
4. Expanded section evidence with its score, passage and word re-use measurement.
5. Downloaded AI-content report with the reading and its evidence.
6. Settings and the allowances last reported by the EU service.
7. Methods and privacy: where each check runs and what results can establish.
8. Compact editor reading with expandable privacy details and a full report button.

== Third-party notices ==

Licences ship in `third-party-notices.txt`: C2PA Web 0.14.3/WASM 0.11.3, ONNX Runtime Web 1.29.0, SIL OFL 1.1 fonts, Apache-2.0 Opis JSON Schema.

[Credits](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md) cover engine/research sources. C2PA sources, audited import rewrites and hashes: `assets/vendor/c2pa/SOURCE-BUILD-NOTICE.txt`. Full source/build scripts are on GitHub; tests and development archives are excluded.

== Changelog ==

= 1.1.11 =
Integrity findings quote their surrounding sentence and can highlight the exact phrase in the draft. Removes a misleading generic-word rule, redundant result notices and stray product-title focus. Model weights and thresholds are unchanged.

[Full changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/wordpress/opace-ai-content-checker-detector/CHANGELOG.md).

== Upgrade Notice ==

= 1.1.11 =
Clearer integrity evidence tied directly to the draft, with less visual clutter. Model weights and thresholds are unchanged.

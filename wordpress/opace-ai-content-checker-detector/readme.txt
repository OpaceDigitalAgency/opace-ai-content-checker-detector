=== Opace AI Content Checker & Detector ===
Contributors: opacewebdesign
Tags: ai detector, ai content detector, ai checker, chatgpt detector, ai watermark
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Free AI content checker and AI detector for WordPress posts and pages, with section scores, hidden watermark character checks and reports.

== Description ==

**Opace AI Content Checker & Detector is a free AI content checker for WordPress posts and pages.** Review ChatGPT, Claude, Gemini and other AI-assisted drafts with a trained AI writing detector, section-by-section evidence and practical editing observations. Choose on-device analysis or an optional private EU server route. No separate Opace account, paid subscription or provider API key is required.

[Try the free online AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) | [WordPress plugin guide](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/) | [Source code on GitHub](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector)

= New in 1.1.3 =

Expanded guides and FAQs, corrected links and privacy. The model and operating point are unchanged.

Version 1.1.2 added two desktop columns, passage highlights, expandable section evidence and result-link sharing.

= Free AI content detector with evidence for each section =

The full checker uses Opace's Cycle-5 trained model to assess AI writing patterns. Each result contains:

* A five-band level and a zero-to-one score, with a plain-language explanation.
* A score and level for every model-scored section, rather than an unsupported sentence-authorship claim.
* Expandable passages showing measured writing signals, such as word re-use and sentence-length variation.
* Matching highlights in your draft, so the evidence stays attached to the text you are reviewing.
* Separate AI-pattern, text-integrity and editorial readings.
* Named checks with statuses, limitations and a record of the route and model used.

Scores are not AI-authorship percentages. False positives and misses occur, especially with fiction, short or heavily edited text. [Detection measurements](https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/) disclose corpus, runtime, operating point, overlap and uncertainty. No result proves authorship.

= AI checker for WordPress editors and content teams =

Review blog posts, supplied articles, landing pages and AI-assisted drafts before publication. Editors can compare findings with sources and revision history. Writers can inspect individual passages; agencies can export client reports or keep content-free receipts.

Block and Classic Editor quick checks read the unsaved draft, mark changed results stale and link to the workbench. Posts and Pages have a "Check with AI Content Checker" row action. These editor checks use a smaller PHP subset; the full detector runs in the workbench.

= Hidden watermark characters, lookalike letters and protected facts =

Inspect invisible Unicode, unusual spaces and mixed-script lookalikes. These also occur in legitimate typography, emoji and multilingual text; a finding does not establish AI use.

Preview character fixes before applying them to the checker copy. Names, figures, dates, links, quotations, citations and code are protected. Lookalikes are never auto-replaced. Editorial suggestions never set the AI score.

Private Google and Anthropic production text watermarks are not supported. The separate [SynthID-Text lab](https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/) demonstrates public demo keys, not provider verification.

= C2PA Content Credentials for images and PDF files =

Check JPEG, PNG, WebP or PDF up to 20 MB locally with the packaged C2PA engine. Present, absent, invalid, untrusted, unsupported and error stay distinct. Absence is inconclusive, not proof a file is human-made. No remote manifests, certificate status or trust lists are fetched; signer trust cannot be established.

This is provenance inspection, not AI-image classification or PDF text detection. See the separate [online media checker](https://opace.agency/tools/ai/content-verification-integrity/media-checker/).

= PDF reports, result links and hash-only receipts =

Print the full text reading or download its PDF with section scores, scored passages and named evidence. These detailed reports contain passages from your draft: review them before sharing.

Share a result link by email or supported apps. Summaries, links and text-result JSON omit draft text and quoted passages. Saving a receipt sends the draft to your site's authenticated API for hashing; storage holds only hashes, versions, check states and limitations. File checks export separate content-free PDF/JSON: file bytes, names, hashes and raw manifests never enter text receipts or links.

= How to check AI content in WordPress =

1. Open AI Content Checker > Checker, or use the row action beside a post or page.
2. Paste a draft, import TXT, Markdown or HTML, or try an example.
3. Choose Private EU analysis, on-device analysis or integrity checks only.
4. Press the button that names the chosen action: download the model or send the draft once.
5. Review section evidence and editing suggestions. Export a report or save a receipt if needed.

Integrity checks only never produces an AI reading.

= Privacy, permissions and external services =

**On-device route:** after consent, the browser downloads the pinned model and vocabulary from `https://opace.agency/models/local-signals-v1/`. The model is `tier3-cycle5-full-e5small-int8-perchannel.onnx`, 34,301,767 bytes, SHA-256 beginning `9f57d6a8`; the full hash is in the source. Together with the vocabulary the download is about 34.5 MB. These are data files, not a program. Runtime code ships in the plugin; no executable code is fetched from anywhere else. Files are verified before loading, cached by the browser and removable from the checker. Draft text is not uploaded on this route. Ordinary asset requests still expose network information such as your IP address to the host.

**Private EU route:** an administrator must enable it, the service must accept WordPress runs, and you must select and confirm it for each check. Requests use `https://opace-detector-877422072168.europe-west1.run.app/v1/wordpress/challenge`, `/token` and `/check`. Challenge/token requests send a SHA-256 site identifier, random install/request identifiers and a body hash; the final request adds the draft. It is processed once in memory in `europe-west1` and reports `retained: nothing` for draft content. Network and abuse-control information is distinct from draft retention; see the privacy policy. If unavailable or limited, the plugin offers on-device analysis.

**Local checks and receipts:** character, writing and file checks run in your browser. Same-site receipt requests require login, capability and REST nonce, with ownership and idempotency checks. Multisite storage is per site. Review uninstall retention settings.

There is no Opace telemetry, advertising, remote font, analytics pixel or public credit link in the plugin. It loads no checker assets for ordinary site visitors. [Opace privacy policy](https://opace.agency/privacy-policy/).

= Usage limits and compatibility =

Requires WordPress 6.5+ and PHP 7.4+. Supports Block Editor, Classic Editor and per-site Multisite activation.

Up to 100,000 characters per run, or the administrator's lower limit; at least 60 words for an AI reading. Longer input is refused, never silently shortened. Shorter text can still use character and writing checks.

On-device analysis has no run-count limit. Private EU analysis allows 3 runs a minute and 20 an hour per person, within WordPress-reserved, shared and per-site hourly/daily allowances. Settings shows current service figures. Limit messages name the allowance, reset and on-device fallback.

= Related Opace tools, documentation and support =

* [AI Content Checker documentation](https://opace.agency/tools/ai/content-verification-integrity/) and [GitHub source, issues and development](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector).
* [AI Scribe content creator](https://wordpress.org/plugins/ai-scribe-the-chatgpt-powered-seo-content-creation-wizard/) for drafting. Use the checker separately; direct Scribe/Hub integration is not included.
* [Essential SEO Toolkit](https://wordpress.org/plugins/opace-essential-seo-toolkit/) for page audits, separate from AI detection.
* [Chrome extension information](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) and [Astro integration guide](https://opace.agency/tools/ai/content-verification-integrity/astro-integration/). Store links will be added after verified publication.
* [Opace tool suites](https://opace.agency/tools/suite/) and [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency).
* [Support](https://opace.agency/get-in-touch/), or the WordPress.org forum after release. Do not post private drafts or credentials.

Built by [Opace](https://opace.agency/), a UK agency providing [AI services](https://opace.agency/services/artificial-intelligence/), [SEO](https://opace.agency/services/seo/) and [WordPress development](https://opace.agency/services/web-design/wordpress-development/).

== Installation ==

1. Upload the plugin ZIP under Plugins > Add New > Upload Plugin.
2. Install and activate it for the current site.
3. Open AI Content Checker > Checker and choose how to analyse a draft.
4. Administrators can enable optional EU analysis and review limits in Settings.

On Multisite, activate separately for each site. Network activation is not supported. No AI Scribe, Hub or provider API key is required.

== Frequently Asked Questions ==

= Is this a free AI content checker with no subscription? =

Yes. The plugin is GPL licensed and needs no separate Opace account or paid provider key. On-device checks have no run-count limit; optional EU analysis has fair-use allowances.

= Can I use it as a ChatGPT detector or Claude AI checker? =

It assesses AI-writing patterns, including the model families described in the published research. It cannot identify the author or reliably name the generator. It can miss AI text and flag human writing.

= Is this an AI detector and plagiarism checker? =

It is an AI content detector with separate character and provenance checks. It does not search the web for copied material, compare sources for plagiarism or verify factual accuracy.

= Does the AI checker rewrite or publish my post? =

No. It reads the working copy. Suggested character fixes affect only the checker after confirmation. Writing suggestions are for you to consider.

= What does an untrusted Content Credential mean? =

A credential exists, but signer trust was not established without online trust-list checks. It does not mean the signer is malicious.

= Why is an AI reading unavailable? =

Check the word limit, model download and selected route. A blocked download or unavailable service is reported plainly; integrity checks can still run. Unsupported, not configured, not run, inconclusive and error never mean pass.

== Screenshots ==

1. WordPress AI checker before a run, with Private EU analysis recommended and the transfer named on the button.
2. On-device AI detection selected, with the model download disclosed before it starts.
3. Free AI content checker workbench: draft on the left and the reading, level and score on the right.
4. Section evidence with the selected passage highlighted in the draft.
5. Downloaded AI-content report with the reading and its evidence.
6. Settings and the allowances last reported by the EU service.
7. Methods and privacy: where each check runs and what results can establish.
8. Block Editor quick check beside the unsaved draft, with access to the full checker.

== Third-party notices ==

Runtime licences ship in `third-party-notices.txt` and with dependencies. C2PA uses `@contentauth/c2pa-web` 0.14.3 and `@contentauth/c2pa-wasm` 0.11.3; inference uses ONNX Runtime Web 1.29.0. Outfit and Plus Jakarta Sans fonts are SIL OFL 1.1. Opis JSON Schema packages are Apache-2.0.

[Third-party credits and source records](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md) cover the text engine and research foundations. Minified C2PA artefacts, audited import rewrites, source URLs and hashes are documented in `assets/vendor/c2pa/SOURCE-BUILD-NOTICE.txt`. Build scripts and full source are in GitHub. Tests and development archives are excluded from the plugin.

== Changelog ==

= 1.1.3 =
* Enrich documentation, feature guides and FAQs; correct source links and privacy wording.
* Detection, permissions, settings and stored receipts are unchanged.

= 1.1.2 =
* Add independently scrolling desktop columns, highlighted source passages, expandable section evidence and the shared result-link sheet.

Earlier changes: [full changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/wordpress/opace-ai-content-checker-detector/CHANGELOG.md).

== Upgrade Notice ==

= 1.1.3 =
Documentation update. The model, settings and saved receipts are unchanged.

=== Opace AI Content Integrity ===
Contributors: opace
Tags: content integrity, content analysis, editorial, content checker, ai content
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Inspect AI-content signals, protect facts and citations, and save an honest hash-only receipt inside WordPress.

== Description ==

Opace AI Content Integrity is a local AI content checker for WordPress editors. It finds invisible characters, mixed scripts and explainable writing patterns, then shows the exact method, result and limitation behind each finding.

The checker also identifies protected numbers, dates, links, quotations, citations and code. You can preview selected safe character fixes before changing the working copy. It never edits, saves or publishes a WordPress post automatically.

Results are evidence from named checks, not proof of human authorship. No official Anthropic text-watermark detector interface is available to this plugin, so the Anthropic method remains visibly unsupported and never becomes a pass.

= How it works =

1. Paste text into Content Integrity > Suite, or inspect an unsaved Block or Classic Editor working copy.
2. Review named findings and the protected content list.
3. Preview selected safe character fixes. Homoglyphs are never replaced automatically.
4. Re-inspect a changed working copy before relying on the result.
5. Optionally save a hash-only receipt to this WordPress site.

= Free local inspection =

The included deterministic checks run in the browser without a paid account, bundled model or external detector API. The plugin adds no assets, links or processing to public pages.

= Receipts and editor safeguards =

A saved receipt contains hashes, method states and limitations, not the source text. Requests require an authenticated WordPress user, permission and a REST nonce. Repeated requests are idempotent, and one user cannot read another user's job.

The Block Editor sidebar and Classic Editor meta box inspect the current unsaved working copy. They mark results stale when the draft changes and never save or publish the post.

= What detector results mean =

A pass applies only to the named method and disclosed rule. Unsupported, not configured, not run, inconclusive and error never mean pass. Different detectors can disagree because they use different models, data, thresholds and versions.

= Where this tool is weakest =

Every figure below is measured, with its denominator, and none of it is hidden behind a link.

This plugin ships the deterministic checks and the editorial writing rules. It does not yet
include the trained model that gives an AI reading; that runs in the free Opace browser checker.
Both sets of limits are listed because both matter to anyone deciding what to trust.

The writing rules in this plugin are editorial feedback, not detection. Measured on 922 machine
and 1,200 human long-form documents the engine had never seen, they detect 45.1 per cent of
machine writing while flagging 24.8 per cent of human writing. One human document in four. That
is why the score is presented as writing suggestions and is never counted toward an AI reading.

The trained model in the browser checker, measured on a fresh 5,558-document long-form corpus:

* Human fiction and stories are the worst case. 33 of 260 human stories were wrongly flagged, 12.69 per cent. A novelist checking their own writing has roughly a one in eight chance of being told it looks machine-written. The model was deliberately never trained on human fiction, because no matched human fiction corpus was available and training on unmatched machine fiction would have taught it that fiction equals AI.
* Short text defeats it. 67 per cent detected at 200 words, 50 per cent at 150, 19 per cent at 100. Short human text is not falsely flagged: 0 of 400 samples between 60 and 200 words.
* A machine rewrite of a human original is caught about one time in three, 30 to 35 per cent. Paragraph-mixed documents are the weakest case of all.
* Academic false positives, per register: academic discussion 16 of 420 (3.81 per cent), conclusions 10 of 360 (2.78 per cent), introductions 8 of 420 (1.90 per cent), literature reviews 0 of 225, student essays 0 of 420.
* Business reports are data-starved. 72 held-out rows and AUROC 0.69, against 0.93 to 0.99 everywhere else. Not settled, and not to be quoted as though it were.
* Human writing that a language model merely polished is deliberately not flagged. In that band a median 93.5 per cent of the words are the human author's.

Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if
you are about to make an academic misconduct decision about one student. A distribution-level
signal cannot carry that weight and this project will not pretend it can.

The complete list, with sources: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations

Every figure above is plotted as a chart, with the 50 per cent acceptance floor drawn in and the
worst case shown at full height rather than averaged away: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#what-it-measures-and-where-it-fails

The measurement reports themselves:

* Capability register: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/CAPABILITIES.md
* Evidence index, every test result and research artefact with paths: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/EVIDENCE-INDEX.md
* Test evidence, verbatim suite totals and per-register tables: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/TEST-EVIDENCE.md
* Route parity, browser against server, every disagreement written out: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/measurements/ROUTE-PARITY.md
* Watermark lab method and its boundary: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/WATERMARK-LAB.md

= Claude and SynthID limitation =

This plugin does not claim to detect or remove Claude's production watermark. Public watermark fixtures and writing-pattern checks are not substitutes for an official verifier.

= Rewrite routes and costs =

Generated editorial rewrites, commercial detector calls and provider routes are not included in version 1.0.4. The Suite labels those modules unavailable instead of simulating a result. The free local checker and hash-only receipts work without AI-Scribe or Opace AI Hub.

= External services =

The plugin does not contact Opace, Anthropic, an AI provider, a detector vendor or any other external service. The only external links are ordinary links that a user chooses to open. They are never fetched in the background and contain no tracking identifiers.

= Privacy =

Browser inspection remains in the browser. Saving a receipt sends the current text only to the same WordPress site's authenticated REST API. Source text is processed in memory; the stored job and receipt contain hashes, method evidence and limitations, not source or candidate text.

No Opace telemetry, advertising, remote font, analytics pixel or front-end credit link is included. See the [Content Integrity privacy notice](https://opace.agency/privacy-policy/).

== Installation ==

1. In WordPress, open Plugins > Add New > Upload Plugin.
2. Choose the Opace AI Content Integrity ZIP and select Install Now.
3. Activate the plugin for the current site.
4. Open Content Integrity > Suite and inspect a draft.

Network activation is intentionally unavailable in version 1.0.4. On Multisite, activate the plugin separately for each site that should own its own receipts and settings.

== Frequently Asked Questions ==

= Can this prove that content was written by a person? =

No. It records results from named checks and explains their limits.

= Does it remove Claude's SynthID watermark? =

No current claim is made. A supported official verifier is unavailable to this plugin.

= Why do detectors disagree? =

Methods use different models, data, thresholds and versions. This plugin keeps results separate.

= Is it free? =

Yes. The plugin and included deterministic checks have no per-scan fee and need no API key.

= Do I need AI-Scribe or Opace AI Hub? =

No. Standalone inspection and hash-only receipts work without either plugin.

= Where does my text go? =

Browser inspection is local. Saving a receipt sends text only to your own WordPress site and stores a hash-only receipt.

= Does it change or publish my post? =

No. Editor checks read the unsaved working copy. Safe fixes change only the Lab working copy after confirmation. WordPress Save and Publish remain separate actions.

= Where is this tool weakest? =

Fiction. On a 5,558-document test corpus, 33 of 260 human stories were wrongly flagged, 12.69 per
cent. Also short text: detection falls to 19 per cent at 100 words. The full list with every
denominator is in the description above and in the repository.

= Whose work is this built on? =

Chiefly avoid-ai-writing by Conor Bronsdon (MIT) and watermarks-remover by Guillaume Meyer (MIT),
plus Unicode Consortium data and around a dozen other open projects, all named under Third-party
notices below with links and licences.

= Will this improve rankings? =

No ranking guarantee is made.

= How do I get support? =

Use the WordPress.org support forum after release, or the [Content Integrity support page](https://opace.agency/get-in-touch/). Please do not include private draft text, credentials or personal data in a support request.

== Screenshots ==

1. The Checker shows a genuine populated inspection with named result states and the keyboard-focusable Evidence rail.
2. The safe-fix preview identifies removable invisible characters and requires explicit selection before changing the Lab working copy.
3. Hash-only receipts list the date, surface, receipt ID and evidence hash without storing source text.
4. Methods & privacy explains the local methods, unsupported Anthropic state and data destination.
5. The Block Editor sidebar inspects the current unsaved working copy and reports stale results after an edit.
6. The Classic Editor meta box provides the same local inspection safeguards without loading Gutenberg code.
7. Settings control editor surfaces, text limits and explicit data deletion on uninstall.
8. The real 375-pixel Checker flow stacks the text before evidence without horizontal page overflow.

== Third-party notices ==

This plugin was built on existing open-source work by deliberate choice, and the people whose
work it stands on are named. Runtime licence details are in `third-party-notices.txt` inside the
plugin package. The plugin is GPL-2.0-or-later and bundles only GPL-compatible runtime code.

Credited in the shipped engine:

* avoid-ai-writing by Conor Bronsdon and contributors, MIT: most of the writing-pattern rule categories, the stylometric methods, the weights and the classifier logic, adapted to TypeScript. https://github.com/conorbronsdon/avoid-ai-writing
* watermarks-remover by Guillaume Meyer, MIT: the invisible-character and lookalike-letter table data, and the explicit-carrier inspection model. https://github.com/guillaumemeyer/watermarks-remover
* Unicode Consortium character data: the 415-code-point carrier inventory and the 60-entry confusable set. https://www.unicode.org/Public/UCD/latest/
* antislop-sampler by Sam Paech, Apache-2.0: fiction phrase and over-represented name data. https://github.com/sam-paech/antislop-sampler
* slop-forensics by Sam Paech, MIT: per-model observations corroborating the fiction rules. https://github.com/sam-paech/slop-forensics
* SLOP_Detector by SicariusSicariiStuff, Apache-2.0: the graded penalty-class weighting approach. https://github.com/SicariusSicariiStuff/SLOP_Detector
* slop-gate by hwajongpark, MIT: promotional-register and buzz-phrase pattern data. https://github.com/hwajongpark/slop-gate
* anti-ai-writing by avectats7, MIT: buzz-phrase and weak-verb observation data. https://github.com/avectats7/anti-ai-writing
* anti-slop by kjmagnan1s, MIT: faux-insight phrase data and the protect-list design. https://github.com/kjmagnan1s/anti-slop
* claude-slop-detector by aplaceforallmystuff, MIT: staccato-fragment and tripled-negation observations. https://github.com/aplaceforallmystuff/claude-slop-detector
* Wikipedia, Signs of AI writing, CC BY-SA 4.0: editorial guidance independently re-expressed, credited as the licence requires. https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
* google-deepmind/synthid-text, Apache-2.0: the SynthID-Text detection mathematics, ported to TypeScript for the watermark lab. https://github.com/google-deepmind/synthid-text
* OpenAI GPT-2, MIT: the byte-level BPE tokeniser algorithm and vocabulary assets. https://github.com/openai/gpt-2
* Project Gutenberg public-domain texts, all published before 1929: the human-prose reference corpus behind the rhythm signals. https://www.gutenberg.org
* opis/json-schema with opis/string and opis/uri, Apache-2.0: Draft 2020-12 validation on PHP 7.4. https://github.com/opis/json-schema
* Published academic findings by Liang et al., Kobak et al., Juzek and Ward, Reinhart et al., Geng and Trotta, and Pew Research, used as rule thresholds and lexicon facts.

Behind the trained model in the browser checker: intfloat/e5-small (MIT) as the base encoder,
onnxruntime-web by Microsoft (MIT), the Pangram Labs published training recipe, and open corpora
including GRADTEX, HAT-Bench, PERSUADE 2.0, C4, Europe PMC, GOV.UK and Global Voices.

Cloned and read during research but never used, extended or derived from: fast-detect-gpt,
Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA and MarkLLM. Reading someone's work as
background is not building on it.

The complete record, with versions, snapshot commits and exactly what was taken from each:
https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md

== Source and builds ==

All shipped PHP and JavaScript is human-readable and unminified. Complete source, frozen contracts, build scripts and reproducible test instructions are public at [Opace AI Content Integrity on GitHub](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker).

== Changelog ==

= 1.0.4 =
* Associate source validation errors with the text field and move focus to the field for recovery.
* Move focus into the safe-fix preview and restore it to the changed working copy after Apply.

= 1.0.3 =
* Avoid nested visual header and footer landmarks inside the WordPress admin shell.
* Keep every user-facing and cache-bust version aligned at 1.0.3 while database schema remains 1.0.1.

= 1.0.2 =
* Make the scrollable evidence rail keyboard-focusable with a visible focus indicator.

= 1.0.1 =
* Harden receipt consent, idempotency, state transitions, deletion, Site Health and stale-result handling.

= 1.0.0 =
* Add deterministic inspection, protected evidence, editor surfaces and hash-only receipts.

== Upgrade Notice ==

= 1.0.4 =
Improves validation and safe-fix keyboard focus. No data migration is required.

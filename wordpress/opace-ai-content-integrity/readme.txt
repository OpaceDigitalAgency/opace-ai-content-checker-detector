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

= Claude and SynthID limitation =

This plugin does not claim to detect or remove Claude's production watermark. Public watermark fixtures and writing-pattern checks are not substitutes for an official verifier.

= Rewrite routes and costs =

Generated editorial rewrites, commercial detector calls and provider routes are not included in version 1.0.4. The Suite labels those modules unavailable instead of simulating a result. The free local checker and hash-only receipts work without AI-Scribe or Opace AI Hub.

= External services =

The plugin does not contact Opace, Anthropic, an AI provider, a detector vendor or any other external service. The only external links are ordinary links that a user chooses to open. They are never fetched in the background and contain no tracking identifiers.

= Privacy =

Browser inspection remains in the browser. Saving a receipt sends the current text only to the same WordPress site's authenticated REST API. Source text is processed in memory; the stored job and receipt contain hashes, method evidence and limitations, not source or candidate text.

No Opace telemetry, advertising, remote font, analytics pixel or front-end credit link is included. See the [Content Integrity privacy notice](https://opace.agency/tools/ai/content-integrity/privacy/).

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

= Will this improve rankings? =

No ranking guarantee is made.

= How do I get support? =

Use the WordPress.org support forum after release, or the [Content Integrity support page](https://opace.agency/tools/ai/content-integrity/support/). Please do not include private draft text, credentials or personal data in a support request.

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

Runtime licence and attribution details are in `third-party-notices.txt` in the plugin package. The plugin is GPL-2.0-or-later and bundles only GPL-compatible runtime code.

== Source and builds ==

All shipped PHP and JavaScript is human-readable and unminified. Complete source, frozen contracts, build scripts and reproducible test instructions are prepared at [Opace AI Content Integrity on GitHub](https://github.com/OpaceDigitalAgency/opace-content-integrity). The public repository will be published before this package is submitted to WordPress.org.

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

=== Opace AI Content Checker & Detector ===
Contributors: opacewebdesign
Tags: ai detector, ai content detector, ai checker, chatgpt detector, ai content
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Free AI content checker and AI detector for posts and pages. See the evidence behind every finding, with no rewriting.

== Description ==

Paste a draft, choose where it runs, and see what was found and why. The reading comes from a trained model that runs on our private EU server or on your own device. You get a five-band level, a score for every section, the passage the model read, one measured statistic about it, and editing advice that never counts towards the score.

Alongside that it looks for invisible characters, lookalike letters and writing patterns worth a second read. Every finding names the check, where it is, what it means and what it cannot prove. Numbers, dates, links, quotations, citations and code are protected. Character fixes are previewed first, and lookalike letters are never replaced for you.

For JPEG, PNG, WebP and PDF files up to 20 MB, the official Content Authenticity Initiative C2PA engine runs in the browser and keeps Content Credentials as present, absent, invalid or untrusted, never merged. It fetches no remote manifest, certificate status or trust list, so it will not tell you a signer is trusted.

No checker can prove who wrote a text. Results are evidence to read, not proof of authorship or AI use. Writing patterns are editorial feedback and never set the AI score. There is no official Anthropic watermark verifier we can call, so that check stays unsupported.

= How it works =

1. Open AI Content Checker > Checker.
2. Paste text, drop in a TXT, Markdown or HTML file, or try a built-in example.
3. Choose how it runs. Private EU analysis leads once an administrator turns it on and the service is accepting runs; otherwise on this device leads. Integrity checks only never scores.
4. Press Check my draft, then read the result section by section.
5. Print it, download a PDF or JSON receipt, copy a share summary, or save a hash-only receipt.

= Where your text goes =

Character, writing and file checks stay in your browser. On-device analysis downloads model weights; your draft does not go up. Saving a receipt sends the draft to this site to be hashed, and stores only hashes and check results. Private EU analysis sends the draft once, and only after an administrator turns the route on and you confirm it for that run. It is read there in memory and is not kept. Shared summaries, downloaded JSON and links never carry your text or the passages quoted back to you. A chosen file is read by the packaged C2PA engine here and nothing about it reaches a receipt, share, link, analytics or log. That engine and the ONNX Runtime are served from this site, so no CDN or remote code is used.

= Receipts and the editor sidebars =

A saved receipt holds hashes, check states and limitations, never your text. The request stays on this site and needs a signed-in user, permission and a REST nonce. Repeat requests are idempotent, and one user cannot read another's job.

The block editor sidebar and the Classic Editor box run a smaller quick check on the unsaved draft, mark it stale the moment the draft changes, and never save or publish the post. Both link to the full checker for that post, as does a "Check with AI Content Checker" link on every Posts and Pages row. The link carries the post id and a nonce; the text arrives through this site's authenticated API, which checks your permission for that post again.

= What a result means =

A pass applies only to the named check and its disclosed rule. Unsupported, not configured, not run, inconclusive and error never mean pass. No Content Credentials found is inconclusive: most files have none, and absence proves nothing about how a file was made.

The writing rules are not an authorship detector, and their published evaluation has real misses and false positives. Full denominators and intervals: https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/ . Do not make a high-impact decision on this tool alone. The plugin does not claim to detect or remove Claude's production watermark; public fixtures, Content Credentials and writing patterns are not substitutes for an official verifier.

= External services =

On-device analysis uses `https://opace.agency/models/local-signals-v1/` to download the model weights and vocabulary after you agree. What comes down is data, not a program: `tier3-cycle5-full-e5small-int8-perchannel.onnx`, 34,301,767 bytes, SHA-256 beginning `9f57d6a8`, plus a vocabulary text file. The browser fetches it the same way it fetches an image, and the plugin checks it against that hash, which is published in the plugin source, before anything reads it. The code that reads it is the inference engine bundled inside the plugin and served from your own site, so no executable code is fetched from anywhere. The request sends nothing but the file path: never the draft, the filename, the result or user details. The files stay in the browser cache until you clear them with the button on the checker screen or a version change invalidates them.

= Limits =

Up to 100,000 characters in one run, or fewer if an administrator lowers it; a longer draft is refused with a message and never quietly shortened. At least 60 words for an AI reading; shorter drafts still get the character and writing checks. Files up to 20 MB for a Content Credentials check. Private EU analysis allows 3 runs a minute and 20 an hour for each person here. The service adds its own: a share of each day kept for WordPress sites, a pool every Opace surface shares once that is spent, and an hourly and daily ceiling on each site. On-device analysis has no run limit, so it is the route that cannot run out. Reaching any limit says which one it was and when it comes back, and offers to run the same model on your device in one click, never an error code. Settings and Methods & privacy carry the service's current figures where it publishes them.

Private EU analysis uses `https://opace-detector-877422072168.europe-west1.run.app/v1/wordpress/challenge`, `/token` and `/check`. The challenge and token requests send a SHA-256 site identifier, random install and request identifiers and a body hash; the final request adds the draft text. It runs only after administrator opt-in, route selection, per-run confirmation and pressing the button. The service processes the draft once in memory in `europe-west1`, reports `retained: nothing`, and the plugin keeps it out of links, receipts, JSON shares and logs. It is the route the checker offers first whenever it is on and reachable. The client fails closed and offers the on-device route in one click when the service is off, refuses a run or cannot be reached.

Privacy: https://opace.agency/privacy-policy/ . The site's existing terms cover these tools; there is no separate product terms page. There is no Opace telemetry, advertising, remote font, analytics pixel or credit link.

== Installation ==

1. Open Plugins > Add New > Upload Plugin.
2. Choose the ZIP and select Install Now.
3. Activate it for the current site.
4. Open AI Content Checker > Checker.

On Multisite, activate it separately for each site that should own its receipts and settings.

== Screenshots ==

1. Before a run, with private EU analysis recommended and a button that names the transfer.
2. The on-device route chosen, with the button naming the 34.5 MB download before anything is fetched.
3. A finished reading: the dial, the level, one plain sentence and a score for every section.
4. Inside one section: the passage the model read, one measured statistic about it, and editing advice.
5. Page one of the report this build printed, downloaded from that finished reading.
6. Settings, with the allowance figures the EU service published when the page last asked.
7. Methods and privacy: what runs, where it runs, and what a result cannot tell you.
8. The quick check in the block editor, beside the draft.

== Frequently Asked Questions ==

= Can this prove a person wrote the content? =

No. It records named evidence and explains its limits. It also never changes or publishes your post: the editor checks read the unsaved draft, and safe fixes change only the checker's own copy, after you confirm them.

= What does an untrusted Content Credential mean? =

The file has credentials, but signer trust was not established, because the local check does not fetch a trust list or online certificate status. It is not a claim that the signer is malicious.

= Does it remove Claude's watermark? =

No. No supported official Anthropic verifier is available to this plugin.

= How do I get support? =

Use the WordPress.org forum after release, or https://opace.agency/get-in-touch/ . Please do not attach private source material.

== Third-party notices ==

Runtime licences are in `third-party-notices.txt` and beside each bundled dependency. C2PA uses `@contentauth/c2pa-web` 0.14.3 and `@contentauth/c2pa-wasm` 0.11.3; inference uses ONNX Runtime Web 1.29.0. The bundled Outfit and Plus Jakarta Sans subsets are SIL OFL 1.1 (`assets/fonts/OFL.txt`). Build tools, tests, declarations and source maps are excluded.

The text engine credits avoid-ai-writing, watermarks-remover, Unicode data and the other research sources in the project notice: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md . Opis JSON Schema packages are Apache-2.0.

== Source and builds ==

Opace PHP and JavaScript source, frozen contracts, build scripts and test instructions are public at https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker . The upstream C2PA distribution is minified; its artefacts, two audited import-path rewrites, versions, source URLs, licences and SHA-256 hashes are in `assets/vendor/c2pa/SOURCE-BUILD-NOTICE.txt`.

== Changelog ==

= 1.1.1 =
* Replace the old lettered logo with the simplified Opace checker identity. Chrome uses the magnifier-and-tick mark; WordPress.org uses the stacked OPACE / AI CHECKER lock-up and full-name banner.

= 1.1.0 =
* Renamed to Opace AI Content Checker & Detector, so the name says what the plugin does. The menu now reads AI Content Checker, and the row action on Posts and Pages reads "Check with AI Content Checker".
* No setting, receipt, stored option or route changed. Existing receipts and settings are read exactly as before.

= 1.0.15 =
* Rebuild every screen on one design system, and make the checker a two-step flow in one column: add your draft, choose how it runs, then read the result at full width.
* Replace the agreement tick boxes with a button that says what pressing it will do, so nothing to agree to can be missed: "Send once to the EU server and check", or "Download model (34.5 MB) and check".
* Show one result card for an integrity-only run instead of two that said the same thing, and rewrite every refusal as one card: what happened, what to do, and one button that does it.

= 1.0.14 =
* Draw the checker straight away instead of waiting on the EU service, showing that route as being checked and correcting the card in place once it answers, with on-device ready to run throughout.

= 1.0.13 =
* Offer private EU analysis first where an administrator has turned it on and the service is accepting runs, with running on your own device one click away and never limited.
* Name which allowance was reached, and when it comes back, in plain words rather than a code.

= 1.0.12 =
* Open a post from the Posts or Pages row action as readable writing, through the site's own authenticated API, and say what each route does with your draft in that route's own words.

= 1.0.11 =
* Rebuild the checker and its result to match the free online checker: input tabs, a word counter, a five-band dial, section score bars, a per-section deep dive, and a toolbar for print, PDF, JSON receipt, share summary, hash-only receipt, safe fixes and protected facts.
* Rewrite the settings and methods screens, bundle Outfit and Plus Jakarta Sans so nothing loads a remote font, and write every usage limit out in plain English.
* Explain the on-device download: what the file is, its size and hash, that it is data rather than a program, and that one click removes it.

= 1.0.10 =
* Add local Content Credentials inspection with the packaged C2PA web and WASM runtime, and on-device analysis with a hash-pinned model download, a character limit, cancellation and a versioned cache.
* Add the fixed, body-bound WordPress client for EU analysis, fail-closed until the live channel exists.

= 1.0.0 =
* Add deterministic inspection, editor surfaces and hash-only receipts.

== Upgrade Notice ==

= 1.1.1 =
The checker now uses simplified, store-specific branding designed to remain recognisable in browser and WordPress listings. No settings, receipts or routes change.

= 1.1.0 =
The plugin is now called Opace AI Content Checker & Detector, and the admin menu reads AI Content Checker. Nothing else changed: no setting, receipt or route moved, and no data migration is required.

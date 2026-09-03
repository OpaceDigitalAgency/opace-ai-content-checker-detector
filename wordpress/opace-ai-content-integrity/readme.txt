=== Opace AI Content Integrity ===
Contributors: opacewebdesign
Tags: content integrity, content analysis, editorial, content checker, ai content
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.14
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Read a draft for AI writing patterns, hidden characters and Content Credentials, then save a hash-only receipt.

== Description ==

Paste a draft, choose where it runs, and see what was found and why. The reading comes from a trained model that runs on our private EU server or on your own device. You get a five-band level, a score for every section, the passage the model read, one measured statistic about it, and editing advice that never counts towards the score.

Alongside that it looks for invisible characters, lookalike letters and writing patterns worth a second read. Every finding names the check, where it is, what it means and what it cannot prove. Numbers, dates, links, quotations, citations and code are protected. Character fixes are previewed first, and lookalike letters are never replaced for you.

For JPEG, PNG, WebP and PDF files up to 20 MB, the official Content Authenticity Initiative C2PA engine runs in the browser and keeps Content Credentials as present, absent, invalid or untrusted, never merged. It fetches no remote manifest, certificate status or trust list, so it will not tell you a signer is trusted.

No checker can prove who wrote a text. Results are evidence to read, not proof of authorship or AI use. Writing patterns are editorial feedback and never set the AI score. There is no official Anthropic watermark verifier we can call, so that check stays unsupported.

= How it works =

1. Open Content Integrity > Suite.
2. Paste text, drop in a TXT, Markdown or HTML file, or try a built-in example.
3. Choose how it runs. Private EU analysis leads once an administrator turns it on and the service is accepting runs; otherwise on this device leads. Integrity checks only never scores.
4. Press Check my draft, then read the result section by section.
5. Print it, download a PDF or JSON receipt, copy a share summary, or save a hash-only receipt.

= Where your text goes =

Character, writing and file checks stay in your browser. On-device analysis downloads model weights; your draft does not go up. Saving a receipt sends the draft to this site to be hashed, and stores only hashes and check results. Private EU analysis sends the draft once, and only after an administrator turns the route on and you confirm it for that run. It is read there in memory and is not kept. Shared summaries, downloaded JSON and links never carry your text or the passages quoted back to you. A chosen file is read by the packaged C2PA engine here and nothing about it reaches a receipt, share, link, analytics or log. That engine and the ONNX Runtime are served from this site, so no CDN or remote code is used.

= Receipts and the editor sidebars =

A saved receipt holds hashes, check states and limitations, never your text. The request stays on this site and needs a signed-in user, permission and a REST nonce. Repeat requests are idempotent, and one user cannot read another's job.

The block editor sidebar and the Classic Editor box run a smaller quick check on the unsaved draft, mark it stale the moment the draft changes, and never save or publish the post. Both link to the full checker for that post, as does a "Check with Content Integrity" link on every Posts and Pages row. The link carries the post id and a nonce; the text arrives through this site's authenticated API, which checks your permission for that post again.

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
4. Open Content Integrity > Suite.

On Multisite, activate it separately for each site that should own its receipts and settings.

== Screenshots ==

1. Before a run: the paste, upload and example tabs, the word counter and the three routes.
2. An example loaded, with the counter confirming there is enough text for an AI reading.
3. The on-device route selected, with the model download agreement.
4. A run in progress, with the phase, a progress bar and a cancel button.
5. A finished reading: the dial, the level, one plain sentence and the section bars.
6. Inside one section: the passage, word re-use against measured ranges and advice.
7. Methods and privacy: what runs, where, and what is not available.
8. The same screen at 375 CSS pixels wide, with no sideways scrolling.

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

= 1.0.14 =
* Draw the checker screen straight away instead of waiting on the EU service. The service sleeps when nobody is using it, and a page that waited for it to wake reported a healthy service as an absent one.
* Show private EU analysis as being checked, then correct the card in place once the service answers, with the outcome announced for screen readers.
* Keep on-device ready to run throughout, so there is always something to press.

= 1.0.13 =
* Offer private EU analysis first, whenever an administrator has turned it on and the service is accepting runs.
* Keep running on your own device as the private route with no limit, offered in one click whenever the EU route is unavailable, refuses a run or cannot be reached.
* Name which allowance was reached, and when it comes back, in plain words rather than a code.
* Carry the service's current allowance figures on Settings and Methods & privacy, and state the rule without a number wherever it publishes none.

= 1.0.12 =
* Open a post from the Posts or Pages row action as readable writing: block delimiters and HTML are removed by the site's own authenticated API, paragraphs stay as paragraphs, and the title leads the draft when it reads like one.
* Say what each route does with your draft in that route's own words, instead of one blanket claim.

= 1.0.11 =
* Rebuild the checker screen to match the free online checker: paste, upload and example tabs, a word counter, drag and drop, and a route chooser that shows only the agreement for the route you picked.
* Rebuild the result: a five-band dial, section score bars, a per-section deep dive with the passage and measured word re-use, editing advice that never counts towards the score, What this means and What this does not mean, a certainty disclosure, and a toolbar for print, PDF, JSON receipt, share summary, hash-only receipt, safe fixes and protected facts.
* Rewrite the settings and methods screens, bundle Outfit and Plus Jakarta Sans so nothing loads a remote font, and write every usage limit out in plain English on all three screens.
* Add a "Check with Content Integrity" link to every Posts and Pages row and to both editor panels, which loads that post through this site's authenticated API rather than through the link.
* Explain the on-device download properly: what the file is, its size and hash, that it is data rather than a program, and that one click removes it.

= 1.0.10 =
* Add local Content Credentials inspection with the packaged C2PA web and WASM runtime.
* Add on-device analysis with a consented, hash-pinned model download, a character limit, cancellation and a versioned cache.
* Add the fixed, body-bound WordPress client for EU analysis, fail-closed until the live channel exists.

= 1.0.9 =
* Add the packaged product mark, correct the Classic Editor counts and show check evidence.

= 1.0.0 =
* Add deterministic inspection, editor surfaces and hash-only receipts.

== Upgrade Notice ==

= 1.0.14 =
The checker screen no longer waits for the EU service before it draws. Where an administrator has enabled that route it is shown as being checked and the card is corrected once the service answers. No data migration is required.

= 1.0.13 =
Private EU analysis is offered first where an administrator has enabled it and the service is accepting runs. It stays off until they do, and running on your own device is unchanged and still has no limit. No data migration is required.


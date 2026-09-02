# Chrome Web Store listing copy

## Product identity

- Name: `AI Content Integrity Checker by Opace`
- Summary, 127 of 132 characters: `Check selected, visible or pasted text on-device or on Opace's EU server after you choose. Review evidence and export receipts.`
- Category: `Productivity`
- Language: `English (United Kingdom)`
- Version: `1.1.0`
- Pricing: `Free`
- Mature content: `No`

## Detailed description

Check selected AI-assisted writing on-device, or explicitly choose the Opace EU service.

AI Content Integrity Checker by Opace lets you inspect text you select, the visible article on the current page, or text you paste. Deterministic checks run in the packaged Chrome extension. The full Cycle-5 model can run on-device after an explicit verified asset download. A separately consented EU route requests access only to the exact Opace service origin, processes the chosen text once in Belgium and does not retain it. That service route is not live in the current development candidate.

WHAT YOU CAN DO

- Review explainable Unicode and writing-pattern findings without a human-authorship score.
- Run the trained Cycle-5 model on-device after explicit model-download consent, with collision-safe section scores and three separate evidence axes.
- Choose a separate EU-service route after a Chrome permission prompt, with an on-device fallback if it is unavailable or refused.
- Identify names, figures, dates, links, quotations, citations and code that should remain protected.
- Prepare an explainable character-only candidate when a safe treatment is available.
- Compare original and candidate text before copying.
- Save a branded PDF report or the complete HTML report, each carrying the gauge, every section score, the scored passages and every named check.
- Export two content-free JSON receipts: the exact result, and the check record. Neither contains your text or any web address.
- Copy a one-line share summary that carries the level, the score and the honesty line, and none of your draft.
- Inspect a JPEG, PNG, WebP or PDF for Content Credentials on this device, with present, absent, invalid, untrusted, unsupported and error states, and save a content-free file report as PDF or JSON.
- Clear extension settings, session markers, the EU route's pace record and the saved model files from the extension.

FAIR USE, IN PLAIN NUMBERS

- Every route accepts up to 50,000 characters a check. Longer text is refused with the exact count; nothing is silently cut.
- The check on your device has no usage limit at all, because nothing leaves your browser.
- The optional EU route is paced so one installation cannot crowd out everyone else: 3 checks a minute and 20 an hour from your installation, inside a service-wide ceiling of 12,000 section readings a day. If you reach a limit the extension tells you what happened, when you can try again, and that the on-device check is available immediately. Nothing is sent when a limit is reached.
- The EU service also verifies that a request came from this exact extension and asks your browser to complete a small piece of work first, so automated traffic cannot flood it.
- The pace record is kept in the extension's own settings storage and holds timestamps only: no text, no web address and nothing about what was checked.

HONEST LIMITS

This extension does not prove that text was written by a person. It does not claim to clear an Anthropic watermark or reproduce a proprietary detector result. The official Anthropic verifier and any unavailable model route remain visibly unavailable when they did not run. Local Content Credentials checks validate a signature on this device; they are not a certificate-trust claim, and a trust list is never fetched. Secure local-engine pairing is not included in version 1.1.0, so no loopback or broad website permission is requested.

WHERE IT IS WEAKEST, MEASURED

The source candidate includes deterministic checks and the explicitly downloaded int8 Cycle-5 model. Its separate fp32 EU route is implemented but held unavailable until deployment and Store-ID allowlisting. Both routes fail closed to **Not assessed** when the trained model does not run.

The writing rules are editorial feedback, not detection. Measured on 922 machine and 1,200 held-out human long-form documents, they detect 45.1% of machine writing while flagging 24.8% of human writing. One human document in four. That is why the score is shown as writing suggestions and never counted toward an AI reading.

The Cycle 5 model, measured on the full 5,558-document long-form evaluation corpus at the current operating point, flags 902 of 922 machine-written documents (97.8%) on the fp32 server route and 900 of 922 (97.6%) in the int8 browser route. It wrongly flags 46 of 4,636 human documents (0.99%) on the server and 39 of 4,636 (0.84%) in the browser. The corpus is not wholly independent: 654 of the 922 machine documents are independent of every Cycle 2 split and 268 are not; 11 of 4,636 human documents overlap. On the separate topic-matched held-out slice, the server route flags 153 of 176 machine documents and one of 418 structured human partners; browser int8 was not measured on that slice.

- Human fiction remains a higher-risk register than the overall human set: 7 of 227 stories are wrongly flagged on the server route (3.1%) and 5 of 227 in the browser (2.2%).
- Short-text performance is improved but the sample is small: 43 of 56 held-out 100-word machine passages are detected on the server evaluation route (76.8%). Do not generalise that cell without its denominator.
- Heavy AI edits of human originals are intentionally treated as machine-assisted and 39 of 137 are flagged (28.5%). This is a product boundary, not proof of authorship.
- Human academic false positives are 15 of 1,992 (0.8%) on the Cycle 5 server evaluation view.

Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if you are about to make an academic misconduct decision about a single student.

Full list with sources: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations

BUILT ON CREDITED OPEN-SOURCE WORK

Reusing existing open work was a deliberate choice, so the people it stands on are named. The rule tiers and character forensics come chiefly from avoid-ai-writing (MIT, Conor Bronsdon and contributors) and watermarks-remover (MIT, Guillaume Meyer), over Unicode Consortium character data. Phrase and structural rule data is adapted from antislop-sampler (Apache-2.0), slop-forensics (MIT), SLOP_Detector (Apache-2.0), slop-gate (MIT), anti-ai-writing (MIT), anti-slop (MIT), claude-slop-detector (MIT) and Wikipedia's Signs of AI writing (CC BY-SA 4.0, credited as its licence requires). The watermark mathematics is a TypeScript port of google-deepmind/synthid-text (Apache-2.0) with the OpenAI GPT-2 tokeniser (MIT). Several well-known detector repositories were cloned and read during research and are credited as read, not used: nothing here derives from fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA or MarkLLM.

Complete records: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md

LOCAL-FIRST PRIVACY

Selected, visible-article and pasted text is held in extension memory for the requested inspection. A selection or article capture also reads the current page hostname and title in memory solely to label the confirmed capture. The hostname and title are not stored, transmitted or included in the receipt. Deterministic checks remain local. On-device Cycle-5 scoring downloads pinned model assets after consent but does not upload draft text. Those assets are 34.5 MB of model weights and a word list: data files, not a program. The software that reads them already ships in the extension. They are fetched from opace.agency, their exact size and SHA-256 fingerprint are verified before use, they are cached after the first download, and one click removes them. The optional EU route transfers the chosen text to Opace only after a second consent and the exact-origin Chrome permission; it is processed once in server memory and not retained. No text is sent to a model provider, analytics or advertising service. Local storage contains settings and a random `cx_…` install identifier for EU-route abuse controls; session storage may contain a text-free interruption marker. Receipts and the share summary are generated on-device and omit source URLs, source text and candidate text. The PDF and HTML reports do carry the scored passages, because that is the evidence, and they are created only when you ask for them. A file chosen for a Content Credentials check is read inside the extension; neither its bytes nor its filename appear in any export.

WHY THE PERMISSIONS ARE NEEDED

Temporary active-tab and scripting access reads only the selection or visible article after you choose a toolbar or context-menu action. The side panel presents the workflow. The context menu provides the selected-text entry point. Storage keeps local settings and a text-free interruption marker. Clipboard write copies a candidate only when you press the copy button; the extension never reads the clipboard.

Learn more: https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/

Privacy: https://opace.agency/privacy-policy/

Support: https://opace.agency/get-in-touch/

Opace is not affiliated with Google, Anthropic or commercial detector providers. Third-party names appear only to describe unavailable methods or compatibility limits.

## Version notes

Development 1.1.0 listing draft. The result is now presented in the same visual language as the
Opace web checker: a five-band dial, the level in plain words, a score bar for every section, a
deep dive per section with its passage, one measured signal and editing advice, the three separate
readings, every named check, what the reading does and does not mean, a certainty disclosure and
the run record. Adds a branded PDF report, the complete HTML report, a content-free result
receipt, a content-free share summary and local JPEG, PNG, WebP and PDF Content Credentials
inspection with its own content-free report. Keeps explicit selection, visible-article and paste
capture; deterministic inspection; explicitly downloaded on-device Cycle-5 scoring; a held
exact-origin EU-service choice; protected-content review; explainable copy-only comparison;
restricted-page fallback; local clear-data controls; reduced-motion, forced-colour and keyboard
support. No telemetry, remote code, standing host permissions, page write-back, local-engine
pairing or provider calls. The EU service route remains unavailable until it is deployed and a
production Store ID is allowlisted, and says so plainly rather than failing silently.

## Single-purpose statement

Let users explicitly capture selected, visible-article or pasted text and inspect it through a chosen on-device or Opace EU route for content-integrity evidence, protected facts and content-free receipts.

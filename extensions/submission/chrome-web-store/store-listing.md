# Chrome Web Store listing copy

## Product identity

- Name: `Opace AI Content Checker & Detector`
- Summary, 127 of 132 characters: `Free AI content checker and AI detector for ChatGPT, Claude and Gemini text, with section evidence and hidden-character checks.`
- Category: `Productivity`
- Language: `English (United Kingdom)`
- Version: `1.2.1`
- Pricing: `Free`
- Mature content: `No`

## Detailed description

Opace AI Content Checker & Detector is a free AI content checker for Chrome. Review AI writing patterns in selected text, an article or a pasted draft, with section scores and the passages behind each reading. Use it to review ChatGPT, Claude, Gemini and other AI-assisted writing before deciding what needs closer attention.

Opace AI Content Checker & Detector lets you inspect text you select, the visible article on the current page, or text you paste. Deterministic checks run in the packaged Chrome extension. The full Cycle-5 model can run on-device after an explicit verified asset download. A separately consented EU route requests access only to the exact Opace service origin, processes the chosen text once in Belgium and does not retain it. That service route is not live in the current development candidate.

FREE AI CONTENT DETECTOR FOR ARTICLES AND DRAFTS

- Review AI-writing pattern evidence alongside separate Unicode and editorial findings. Scores are not authorship percentages.
- Run the trained Cycle-5 model on-device after explicit model-download consent, with collision-safe section scores and three separate evidence axes.
- Choose a separate EU-service route after a Chrome permission prompt, with an on-device fallback if it is unavailable or refused.
- Identify names, figures, dates, links, quotations, citations and code that should remain protected.
- Prepare an explainable character-only candidate when a safe treatment is available.
- Compare original and candidate text before copying.
- Save a branded PDF report or the complete HTML report, each carrying the gauge, every section score, the scored passages and every named check.
- Export two content-free JSON receipts: the exact result, and the check record. Neither contains your text or any web address.
- Copy a one-line share summary that carries the level, the score and the honesty line, and none of your draft.
- Inspect a JPEG, PNG, WebP or PDF for Content Credentials on this device, with present, absent, invalid, untrusted, unsupported and error states, and save a content-free file report as PDF or JSON.
- Read the open page after clicking the toolbar icon, and, if you would rather not click it again on every page, allow one named site permanently from a prompt that says which site it is.
- Clear extension settings, session markers, the EU route's pace record and the saved model files from the extension.

FAIR USE, IN PLAIN NUMBERS

- Every route accepts up to 50,000 characters a check. Longer text is refused with the exact count; nothing is silently cut.
- On-device checks have no run-count limit. The 50,000-character input limit still applies; downloading model assets makes network requests but does not upload your text.
- The optional EU route is paced so one installation cannot crowd out everyone else: 3 checks a minute and 20 an hour from your installation, inside a service-wide ceiling of 12,000 section readings a day. If you reach a limit the extension tells you what happened, when you can try again, and that the on-device check is available immediately. Nothing is sent when a limit is reached.
- The EU service also verifies that a request came from this exact extension and asks your browser to complete a small piece of work first, so automated traffic cannot flood it.
- The pace record is kept in the extension's own settings storage and holds timestamps only: no text, no web address and nothing about what was checked.

HONEST LIMITS

This extension does not prove that text was written by a person. It does not claim to clear an Anthropic watermark or reproduce a proprietary detector result. The official Anthropic verifier and any unavailable model route remain visibly unavailable when they did not run. Local Content Credentials checks validate a signature on this device; they are not a certificate-trust claim, and a trust list is never fetched. Secure local-engine pairing is not included in version 1.2.1, so no loopback permission is requested, and no website permission is granted at install.

WHERE IT IS WEAKEST, MEASURED

The source candidate includes deterministic checks and the explicitly downloaded int8 Cycle-5 model. Its separate fp32 EU route is implemented but held unavailable until Chrome service enablement and Store-ID allowlisting. Both routes fail closed to **Not assessed** when the trained model does not run.

The writing rules are editorial feedback, not detection. Measured on 922 machine and 1,200 held-out human long-form documents, they detect 45.1% of machine writing while flagging 24.8% of human writing. One human document in four. That is why the score is shown as writing suggestions and never counted toward an AI reading.

The Cycle 5 model, measured on the full 5,558-document long-form evaluation corpus at the current operating point, flags 902 of 922 machine-written documents (97.8%) on the fp32 server route and 900 of 922 (97.6%) in the int8 browser route. It wrongly flags 46 of 4,636 human documents (0.99%) on the server and 39 of 4,636 (0.84%) in the browser. The corpus is not wholly independent: 654 of the 922 machine documents are independent of every Cycle 2 split and 268 are not; 11 of 4,636 human documents overlap. On the separate topic-matched held-out slice, the server route flags 153 of 176 machine documents and one of 418 structured human partners; browser int8 was not measured on that slice.

- Human fiction remains a higher-risk register than the overall human set: 7 of 227 stories are wrongly flagged on the server route (3.1%) and 8 of 227 in the browser (3.5%).
- Short-text performance is improved but the sample is small: 43 of 56 held-out 100-word machine passages are detected on the server evaluation route (76.8%). Do not generalise that cell without its denominator.
- Heavy AI edits of human originals are intentionally treated as machine-assisted and 39 of 137 are flagged (28.5%). This is a product boundary, not proof of authorship.
- Human academic false positives are 15 of 1,992 (0.8%) on the Cycle 5 server evaluation view.

Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if you are about to make an academic misconduct decision about a single student.

Full list with sources: https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations

BUILT ON CREDITED OPEN-SOURCE WORK

Reusing existing open work was a deliberate choice, so the people it stands on are named. The rule tiers and character forensics come chiefly from avoid-ai-writing (MIT, Conor Bronsdon and contributors) and watermarks-remover (MIT, Guillaume Meyer), over Unicode Consortium character data. Phrase and structural rule data is adapted from antislop-sampler (Apache-2.0), slop-forensics (MIT), SLOP_Detector (Apache-2.0), slop-gate (MIT), anti-ai-writing (MIT), anti-slop (MIT), claude-slop-detector (MIT) and Wikipedia's Signs of AI writing (CC BY-SA 4.0, credited as its licence requires). The watermark mathematics is a TypeScript port of google-deepmind/synthid-text (Apache-2.0) with the OpenAI GPT-2 tokeniser (MIT). Several well-known detector repositories were cloned and read during research and are credited as read, not used: nothing here derives from fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA or MarkLLM.

Complete records: https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md

LOCAL-FIRST PRIVACY

Selected, visible-article and pasted text is held in extension memory for the requested inspection. A selection or article capture also reads the current page hostname and title in memory solely to label the confirmed capture. The hostname and title are not stored, transmitted or included in the receipt. Deterministic checks remain local. On-device Cycle-5 scoring downloads pinned model assets after consent but does not upload draft text. Those assets are 34.5 MB of model weights and a word list: data files, not a program. The software that reads them already ships in the extension. They are fetched from opace.agency, their exact size and SHA-256 fingerprint are verified before use, they are cached after the first download, and one click removes them. The optional EU route transfers the chosen text to Opace only after a second consent and the exact-origin Chrome permission; it is processed once in server memory and not retained. No text is sent to a model provider, analytics or advertising service. Local storage contains settings and a random `cx_…` install identifier for EU-route abuse controls; session storage may contain a text-free interruption marker. Receipts and the share summary are generated on-device and omit source URLs, source text and candidate text. The PDF and HTML reports do carry the scored passages, because that is the evidence, and they are created only when you ask for them. A file chosen for a Content Credentials check is read inside the extension; neither its bytes nor its filename appear in any export.

WHY THE PERMISSIONS ARE NEEDED

Temporary active-tab and scripting access reads only the selection or visible article after you choose a toolbar or context-menu action. Clicking the toolbar icon opens the side panel on the tab you are looking at, and that click is what gives the extension its one-time access to that page. No website permission is granted when you install it.

Chrome's temporary access ends the moment the tab moves to another page. When that happens, or when the panel was opened some other way, the panel names the one site it would need and offers Chrome's own prompt for that site alone. You can refuse, and the extension says so plainly and offers the paste route instead. Nothing wider than one site is ever requested, a granted site is listed in chrome://extensions, and you can take it back there at any time. Pages Chrome closes to every extension, such as chrome:// pages, the Chrome Web Store and the built-in PDF viewer, are named as unreadable rather than asked about.

The side panel presents the workflow. The context menu provides the selected-text entry point. Storage keeps local settings and a text-free interruption marker. Clipboard write copies a candidate only when you press the copy button; the extension never reads the clipboard.

Learn more: https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/

Privacy: https://opace.agency/privacy-policy/

Support: https://opace.agency/get-in-touch/

Opace is not affiliated with Google, Anthropic or commercial detector providers. Third-party names appear only to describe unavailable methods or compatibility limits.

FREE AI WRITING CHECKER: PRACTICAL USE CASES

Writers can check a draft before sending it to an editor. Content teams can review supplied articles and AI-assisted web copy, inspect the flagged sections and compare the reading with sources or revision history. Agencies can download a detailed report for a client, or share a content-free summary when the draft must stay private.

For an article, click the toolbar icon and choose This page. For an extract, select the passage and use the context menu. For private drafts or pages Chrome prevents extensions from reading, paste the text into the side panel. Choose your route, complete any model-download consent and run the check. Open a section to inspect its evidence and highlight the matching passage. Capture is user-initiated; this is not a background browsing monitor.

NEW IN 1.2.1

Expandable section evidence connects the AI reading to the text being reviewed. Previous and next controls keep navigation within the scored sections. Captured pages can show temporary passage highlights; pasted text has a separate text viewer. A shared result-link sheet provides content-free sharing. The model and operating point are unchanged.

AI CONTENT CHECKER QUESTIONS

Is it free?
Yes. There is no paid subscription, separate Opace account or provider API key. On-device analysis has no run-count limit. An optional EU route has fair-use allowances and remains unavailable until the extension is enabled by the service.

Can it detect ChatGPT or Claude text?
It assesses patterns associated with AI writing. It cannot prove who wrote a passage or reliably identify a particular generator. A low score is not a certificate that text is human-written.

Is it also a plagiarism checker?
No. It does not search the web for copied passages, verify facts or compare a draft against a plagiarism database. Use the section evidence as one part of a wider editorial review.

Does it remove AI watermarks?
It can identify and preview safe treatments for some hidden characters. Invisible characters also occur in ordinary text. It cannot verify or remove private Google or Anthropic production text watermarks, and it does not rewrite a draft to evade detection.

Can I check images or PDFs?
The local file workflow inspects C2PA Content Credentials in JPEG, PNG, WebP and PDF files. It does not classify image pixels as AI-generated or run the text detector over PDF contents. Missing credentials are inconclusive.

RELATED OPACE TOOLS AND SUPPORT

Try the free online checker:
https://opace.agency/tools/ai/content-verification-integrity/checker/

Use the checker in WordPress:
https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/

Use the Astro integration:
https://opace.agency/tools/ai/content-verification-integrity/astro-integration/

Source, documentation, issues, licence and contributing:
https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector

Opace's open-source tools:
https://github.com/OpaceDigitalAgency

Built by Opace, a UK digital agency:
https://opace.agency/

AI consultancy and development:
https://opace.agency/services/artificial-intelligence/

## Version notes

Development 1.2.1 listing draft. The result view gains the section-to-text link the owner asked for: a section score row expands in place into its own evidence, one at a time, pinned under a sticky **Section n of m · level · score** strip with previous and next; choosing a section tints that passage on the page you captured and scrolls to it, or in a collapsible **Your text** viewer when the text was pasted; and **Copy share summary** opens the same share sheet the website uses, with a content-free result link. No permission, route, limit or measured figure changed.

Development 1.2.0 listing draft. The product is renamed to **Opace AI Content Checker & Detector**, with **AI Content Checker** as the short name Chrome shows under the icon, so the extension is named for what people search for and matches the rest of the Opace suite. The summary is rewritten around the same wording. Nothing else moved: the same routes, the same permissions, the same limits, the same measured figures and the same honest states as 1.1.2.

Development 1.1.2 listing draft. A design pass on the side panel only: the shell now carries the same depth, spacing and typography as the Opace WordPress checker. Layered shadows and a lit top edge on every card, a masthead with the product mark on its own tile above a hairline of Opace orange, a step rail with a filled track and a lit current step, route tiles with a coloured edge and a status pill, a soft inset writing box with an orange focus ring, one dominant orange button per screen, notices as tinted cards with a glyph and a way out, and friendly empty states. The panel now follows the reader's light or dark setting, as the result block already did. No behaviour, permission, route, limit or claim changed.

Development 1.1.1 listing draft. Fixes the defect that made **This page** fail on ordinary pages:
the toolbar icon now opens the side panel itself, so the click carries Chrome's one-time page
access into the panel, and the retired popup that used to swallow that click is gone. When the
access is missing the panel names the one site and offers Chrome's own per-site prompt, and it
says honestly which pages Chrome closes to every extension. The on-device download tick box is
replaced by the button itself: with no model cached it reads **Download model and check**, with
the size and fingerprint beside it, and **Check this text** once the model is here.

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

Let users explicitly capture selected, visible-article or pasted text and check it through a chosen on-device or Opace EU route for AI-pattern evidence, protected facts and content-free receipts.

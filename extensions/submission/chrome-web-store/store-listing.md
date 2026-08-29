# Chrome Web Store listing copy

## Product identity

- Name: `AI Content Integrity Checker by Opace`
- Summary, 130 of 132 characters: `Check selected, visible or pasted AI-assisted text locally, protect facts and export hash-only evidence receipts. No Opace upload.`
- Category: `Productivity`
- Language: `English (United Kingdom)`
- Version: `1.0.0`
- Pricing: `Free`
- Mature content: `No`

## Detailed description

Check selected AI-assisted writing without sending it to Opace.

AI Content Integrity Checker by Opace lets you inspect text you select, the visible article on the current page, or text you paste. Analysis runs inside the packaged Chrome extension after an explicit action. It does not run continuously, change the source page or call a remote detector.

WHAT YOU CAN DO

- Review explainable Unicode and writing-pattern findings without a human-authorship score.
- Identify names, figures, dates, links, quotations, citations and code that should remain protected.
- Prepare an explainable character-only candidate when a safe treatment is available.
- Compare original and candidate text before copying.
- Export a hash-only JSON receipt showing what ran, what passed and what was unavailable.
- Clear extension settings and session markers from the extension.

HONEST LIMITS

This extension does not prove that text was written by a person. It does not claim to clear an Anthropic watermark or reproduce a proprietary detector result. The official Anthropic verifier and the local detector remain visibly unavailable when they did not run. Secure local-engine pairing is not included in version 1.0.0, so no loopback or broad website permission is requested.

WHERE IT IS WEAKEST, MEASURED

Version 1.0.0 ships the deterministic checks and the editorial writing rules. The trained model that gives an AI reading runs in the free Opace browser checker, not here. Both sets of limits are published because both matter.

The writing rules are editorial feedback, not detection. Measured on 922 machine and 1,200 human long-form documents the engine had never seen, they detect 45.1% of machine writing while flagging 24.8% of human writing. One human document in four. That is why the score is shown as writing suggestions and never counted toward an AI reading.

The trained model in the browser checker, measured on a fresh 5,558-document long-form corpus:

- Human fiction is the worst case: 33 of 260 human stories wrongly flagged, 12.69%. A novelist checking their own writing has roughly a one in eight chance of being told it looks machine-written. The model was deliberately never trained on human fiction, because no matched human fiction corpus existed and training on unmatched machine fiction would have taught it that fiction equals AI.
- Short text defeats it: 67% detected at 200 words, 50% at 150, 19% at 100. Short human text is not falsely flagged: 0 of 400 samples at 60 to 200 words.
- A machine rewrite of a human original is caught about one time in three, 30 to 35%.
- Human academic prose wrongly flagged: academic discussion 16 of 420 (3.81%), conclusions 10 of 360 (2.78%), introductions 8 of 420 (1.90%), literature reviews 0 of 225, student essays 0 of 420.
- Business reports are data-starved: 72 held-out rows, AUROC 0.69 against 0.93 to 0.99 elsewhere. Not settled.
- Human writing that a language model merely polished is deliberately not flagged; in that band a median 93.5% of the words are the human author's.

Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if you are about to make an academic misconduct decision about a single student.

Full list with sources: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations

BUILT ON CREDITED OPEN-SOURCE WORK

Reusing existing open work was a deliberate choice, so the people it stands on are named. The rule tiers and character forensics come chiefly from avoid-ai-writing (MIT, Conor Bronsdon and contributors) and watermarks-remover (MIT, Guillaume Meyer), over Unicode Consortium character data. Phrase and structural rule data is adapted from antislop-sampler (Apache-2.0), slop-forensics (MIT), SLOP_Detector (Apache-2.0), slop-gate (MIT), anti-ai-writing (MIT), anti-slop (MIT), claude-slop-detector (MIT) and Wikipedia's Signs of AI writing (CC BY-SA 4.0, credited as its licence requires). The watermark mathematics is a TypeScript port of google-deepmind/synthid-text (Apache-2.0) with the OpenAI GPT-2 tokeniser (MIT). Several well-known detector repositories were cloned and read during research and are credited as read, not used: nothing here derives from fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA or MarkLLM.

Complete records: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md

LOCAL-FIRST PRIVACY

Selected, visible-article and pasted text is processed in extension memory for the requested inspection. A selection or article capture also reads the current page hostname and title in memory solely to label the confirmed capture. The hostname and title are not stored, transmitted or included in the receipt. Nothing is uploaded to Opace, a model provider, an analytics service or an advertising service. Text and candidates are not stored by default. Local storage contains settings only; session storage may contain an interruption marker without source text. Receipts are generated on the device and omit source URLs, source text and candidate text.

WHY THE PERMISSIONS ARE NEEDED

Temporary active-tab and scripting access reads only the selection or visible article after you choose a toolbar or context-menu action. The side panel presents the workflow. The context menu provides the selected-text entry point. Storage keeps local settings and a text-free interruption marker. Clipboard write copies a candidate only when you press the copy button; the extension never reads the clipboard.

Learn more: https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/

Privacy: https://opace.agency/privacy-policy/

Support: https://opace.agency/get-in-touch/

Opace is not affiliated with Google, Anthropic or commercial detector providers. Third-party names appear only to describe unavailable methods or compatibility limits.

## Version notes

Initial public 1.0.0 release. Adds explicit selection, visible-article and paste capture; packaged local inspection; protected-content review; explainable copy-only comparison; hash-only receipts; restricted-page fallback; local clear-data controls; reduced-motion, forced-colour and keyboard support. No telemetry, remote code, host permissions, page write-back, local-engine pairing or provider calls.

## Single-purpose statement

Let users explicitly capture selected, visible-article or pasted text and inspect it locally for content-integrity signals, protected facts and hash-only evidence.

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

The writing rules are editorial feedback, not detection. Measured on 922 machine and 1,200 held-out human long-form documents, they detect 45.1% of machine writing while flagging 24.8% of human writing. One human document in four. That is why the score is shown as writing suggestions and never counted toward an AI reading.

The deployed Cycle 5 model in the browser checker, measured on the full 5,558-document long-form evaluation corpus at the operating point that ships today, flags 902 of 922 machine-written documents (97.8%) on the EU server route and 900 of 922 (97.6%) in the browser. It wrongly flags 46 of 4,636 human documents (0.99%) on the server and 73 of 4,636 (1.57%) in the browser. The corpus is not wholly independent: 654 of the 922 machine documents are independent of every Cycle 2 split and 268 are not; 11 of 4,636 human documents overlap. On the separate topic-matched held-out slice, the server route flags 153 of 176 machine documents and one of 418 structured human partners.

- Human fiction remains a higher-risk register than the overall human set: 7 of 227 stories are wrongly flagged on the server route (3.1%) and 8 of 227 in the browser (3.5%).
- Short-text performance is improved but the sample is small: 43 of 56 held-out 100-word machine passages are detected on the server evaluation route (76.8%). Do not generalise that cell without its denominator.
- Heavy AI edits of human originals are intentionally treated as machine-assisted and 39 of 137 are flagged (28.5%). This is a product boundary, not proof of authorship.
- Human academic false positives are 15 of 1,992 (0.8%) on the Cycle 5 server evaluation view.

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

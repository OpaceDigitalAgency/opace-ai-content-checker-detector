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

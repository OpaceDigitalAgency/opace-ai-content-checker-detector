# Chrome Web Store privacy-practices answers

## Data handled

Select **Website content**.

Explanation: after an explicit user action, the extension temporarily handles the selected text, projected visible-article text or text the user pasted. Reading the open page uses Chrome's temporary `activeTab` access, or, if the user chooses it from a named prompt, a per-site permission for that one site. A selection or article capture also reads the current page hostname and title in memory solely to label the confirmed capture. The hostname and title are not stored, transmitted or included in an exported receipt. Deterministic checks remain local. The on-device model downloads pinned assets after consent without uploading text. Only the separately selected EU route transmits the chosen text, after an exact-origin Chrome permission, for one in-memory check. Chrome policy treats local processing as data handling even when data is not transmitted. Do not select web history or user activity: the extension does not monitor visits, network traffic, clicks, keystrokes or browsing in the background.

## Data use

Select **Application functionality** only.

The website content is used only to provide the requested inspection, protected-content review, candidate comparison, the reports the user asks for and the content-free receipts and share summary. EU-route text is processed once for the requested Cycle-5 score and is not retained. The route is
paced in the extension (3 checks a minute, 20 an hour per installation) and on the service
(per-network, per-IP, per-install and per-connection limits inside a 12,000 section-reading daily
ceiling), with an exact-origin check, an extension-ID allowlist, proof of work and a one-use
body-bound token. None of those controls records what was checked. It is not used for analytics, personalisation, advertising, marketing, creditworthiness or lending.

## Transfer, sharing and retention

- Data sold to third parties: `No`
- Data transferred to third parties: **Owner/legal review required before submission.** The optional route sends chosen text to Opace's Google Cloud Run processor in `europe-west1`; the dashboard answer and public privacy wording must use Chrome's current service-provider definition.
- Data used for purposes unrelated to the extension's single purpose: `No`
- Data used to determine creditworthiness or for lending: `No`
- Humans allowed to read user data: `No`
- Opace telemetry or analytics: `None`
- Remote service or provider calls: pinned Opace model-asset download after consent; optional first-party Opace EU service after separate consent and exact-origin permission; no commercial model-provider call
- Source or candidate text retained by default: `No`
- Local settings retained: `highContrast`, fixed `receiptHistory: false`, and a random `cx_…` install identifier used only for EU-channel abuse controls
- Per-site page access: held by Chrome, not by the extension. `https://*/*` and `http://*/*` are
  declared as optional so Chrome's own per-site prompt can be offered; neither is granted at
  install and neither is ever requested. Only one concrete origin at a time is requested, built
  from the address of the tab the user is looking at, after a notice that names that site. A
  granted site is listed and revocable in `chrome://extensions`, and no record of it is kept in
  extension storage
- Session storage: text-free interruption marker only
- EU-route pace record: timestamps only, in `chrome.storage.local`, so one installation stays
  inside 3 checks a minute and 20 an hour. It contains no text, no web address and nothing about
  what was checked, and it is cleared with the rest of the extension's storage
- Files chosen for a Content Credentials check: read inside the extension only. Not sent to Opace
  or to any other recipient on this route, never stored, and neither the filename nor any file
  bytes appear in an exported record
- Reports: the PDF and HTML reports carry the scored passages because that is the evidence, and
  are produced only when the user asks for one. Both JSON receipts and the share summary carry
  `contains_content: false` and no draft text
- User deletion: **Clear everything stored** clears local and session storage and removes the cached model files. It does not remove a file the user has already downloaded, and says so

## Limited Use certification

Certify each dashboard Limited Use statement. The matching public privacy-page sentence must read:

> The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

The privacy policy must also state that Opace does not sell, transfer, advertise against, use for creditworthiness or permit human review of the selected, visible or pasted content.

## Privacy-policy URL

`https://opace.agency/privacy-policy/`

This URL is mandatory because the extension handles website content and has an optional transfer route. It must accurately describe route-specific processing and match the dashboard answers before submission. A product-specific Terms route is also still awaiting owner/legal review and local implementation; do not submit on the old absolute-no-transfer wording.

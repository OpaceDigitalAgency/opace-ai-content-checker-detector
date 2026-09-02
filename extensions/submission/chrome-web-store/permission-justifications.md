# Chrome permission justifications

The extension requests no standing host permissions, broad website access, tab-list permission or clipboard-read permission. One exact optional origin is declared for the separately chosen Opace EU-service route.

## Optional host permission: `https://opace-detector-877422072168.europe-west1.run.app/*`

Requested only after the user selects **Private EU analysis**, accepts the transfer and retention statement and presses **Check this text**. It permits the body-bound `/v1/chrome/challenge`, `/v1/chrome/token` and `/v1/chrome/check`
exchange at that exact origin. The extension paces its own use of that origin at 3 requests a
minute and 20 an hour per installation, checked before Chrome is asked for the permission, so a
runaway loop cannot reach the service at all. Deterministic and on-device Cycle-5 routes do not request or require it. The current source marks the service unavailable until the production Store ID is allowlisted and the channel is deployed.

## `activeTab`

Provides temporary access to the current tab only after the user chooses **Check what I have selected**, **Check this page**, one of the side panel's capture tabs, or the selection context menu. The permission is required for the user-requested extraction and is not used for passive or background browsing access.

## `scripting`

Runs one of two packaged extraction scripts in the temporarily authorised tab after the same explicit user action. One reads the current selection; the other projects visible article text while excluding hidden content, scripts, styles, templates and `noscript`. There is no persistent content script or remote code.

## `storage`

Uses `chrome.storage.local` for extension settings, a random `cx_…` EU-channel install identifier and the EU route's timestamp-only pace record, plus `chrome.storage.session` for a text-free interrupted-operation marker. Source text, candidate text, page URLs and receipt history are not stored at all. **Clear everything stored** clears both storage areas and removes the cached model files.

## `sidePanel`

Displays the extension's six-step capture, inspect, protect, improve, compare and export workflow in Chrome's side panel. This is the primary user interface for results and does not modify the source page.

## `contextMenus`

Adds one selection-only entry, **Check selection with Opace Content Integrity**, so a user can deliberately send the current selection to the side-panel preview. No analysis starts without that user gesture.

## No `downloads` permission

Reports, receipts and the Content Credentials records are saved through an ordinary in-page
download link, so no download permission is requested and no download history is read.

## No file or host permission for the Content Credentials check

A file chosen for the local Content Credentials check is read through the standard file input the
user operates. The packaged Content Authenticity Initiative runtime validates it inside the
extension. Remote manifest fetching, OCSP and trust-list fetching are all switched off, so the
check makes no network request of any kind.

## `clipboardWrite`

Copies the suggested text only after the user presses **Copy the suggested text**, or the content-free share summary only after the user presses **Copy share summary**. The extension never reads the clipboard. If writing is denied, it exposes an accessible read-only field for manual copying.

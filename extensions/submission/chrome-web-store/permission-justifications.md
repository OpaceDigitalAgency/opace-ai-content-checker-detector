# Chrome permission justifications

The extension requests no standing host permissions, no broad website access at install, no
tab-list permission and no clipboard-read permission. Three optional host patterns are declared.
None of them is granted at install, none produces an install-time warning, and each is requested
one exact site at a time, only after the user presses a button that says which site is about to
be asked about.

## Optional host permissions: `https://*/*` and `http://*/*`

Declared so that Chrome's own per-site prompt can be offered for the one site the user is looking
at. **Neither pattern is ever requested.** The extension only ever calls
`chrome.permissions.request({ origins: [<scheme>://<host>/*] })` with a single concrete origin
built from the address of the tab in front of the user, and `<all_urls>` is never requested at
all. The site-access flow is:

1. **This page** or **Selection** first uses the temporary `activeTab` access that the toolbar
   click or the context-menu choice carries. On an ordinary page that is all that happens, and no
   prompt appears.
2. If Chrome refuses for want of access, the panel shows a plain notice naming the one site —
   "Chrome will ask once to let this extension read text on `example.com`" — with what the
   permission covers and how to take it back. Chrome's own prompt appears only if the user then
   presses the button. If they decline, the panel says so honestly and offers the paste route;
   nothing is read and nothing is retried behind their back.
3. After a capture that worked, the panel offers the same per-site permission as a lasting one,
   because Chrome's temporary access ends the moment the tab navigates. Declining leaves the
   extension exactly as it was.

The permission is per site, requested on the user's action, and revocable at any time from
`chrome://extensions`. Pages Chrome closes to every extension — `chrome://` and other browser
pages, the Chrome Web Store, and the built-in PDF viewer — are named as unreadable instead of
being asked about, because no permission can open them.

## Optional host permission: `https://opace-detector-877422072168.europe-west1.run.app/*`

Requested only after the user selects **Private EU analysis**, accepts the transfer and retention statement and presses **Check this text**. It permits the body-bound `/v1/chrome/challenge`, `/v1/chrome/token` and `/v1/chrome/check`
exchange at that exact origin. The extension paces its own use of that origin at 3 requests a
minute and 20 an hour per installation, checked before Chrome is asked for the permission, so a
runaway loop cannot reach the service at all. Deterministic and on-device Cycle-5 routes do not request or require it. The current source marks the service unavailable until the production Store ID is allowlisted and the channel is deployed.

## `activeTab`

Provides temporary access to the current tab only after the user invokes the extension: clicking
the toolbar icon, which opens the side panel on that tab, or choosing the selection context-menu
entry. The permission is required for the user-requested extraction and is not used for passive or
background browsing access. Chrome ends this access the moment the tab navigates, which is why the
optional per-site permission above is offered as an alternative rather than assumed.

The toolbar action deliberately has **no** `default_popup`. A popup would consume the click, and
the side panel would then open without the `activeTab` grant that click carries, so **This page**
would fail on every ordinary page.

## `scripting`

Runs one of two packaged extraction scripts in the temporarily authorised tab after the same explicit user action. One reads the current selection; the other projects visible article text while excluding hidden content, scripts, styles, templates and `noscript`. There is no persistent content script or remote code.

## `storage`

Uses `chrome.storage.local` for extension settings, a random `cx_…` EU-channel install identifier and the EU route's timestamp-only pace record, plus `chrome.storage.session` for a text-free interrupted-operation marker. Source text, candidate text, page URLs and receipt history are not stored at all. **Clear everything stored** clears both storage areas and removes the cached model files.

## `sidePanel`

Displays the extension's six-step capture, inspect, protect, improve, compare and export workflow in Chrome's side panel. This is the primary user interface for results and does not modify the source page.

## `contextMenus`

Adds one selection-only entry, **Check selection with Opace AI Content Integrity**, so a user can deliberately send the current selection to the side-panel preview. No analysis starts without that user gesture.

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

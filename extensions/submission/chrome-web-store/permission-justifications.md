# Chrome permission justifications

The extension requests no host permissions, optional host permissions, broad website access, tab-list permission or clipboard-read permission.

## `activeTab`

Provides temporary access to the current tab only after the user chooses **Check selected text**, **Preview this article** or the selection context menu. The permission is required for the user-requested extraction and is not used for passive or background browsing access.

## `scripting`

Runs one of two packaged extraction scripts in the temporarily authorised tab after the same explicit user action. One reads the current selection; the other projects visible article text while excluding hidden content, scripts, styles, templates and `noscript`. There is no persistent content script or remote code.

## `storage`

Uses `chrome.storage.local` for extension settings only and `chrome.storage.session` for a text-free interrupted-operation marker. Source text, candidate text, page URLs and receipt history are not stored by default. **Clear extension data** clears both storage areas.

## `sidePanel`

Displays the extension's six-step capture, inspect, protect, improve, compare and export workflow in Chrome's side panel. This is the primary user interface for results and does not modify the source page.

## `contextMenus`

Adds one selection-only entry, **Check selection with Opace Content Integrity**, so a user can deliberately send the current selection to the side-panel preview. No analysis starts without that user gesture.

## `clipboardWrite`

Copies the selected candidate only after the user presses **Copy selected candidate**. The extension never reads the clipboard. If writing is denied, it exposes an accessible read-only field for manual copying.

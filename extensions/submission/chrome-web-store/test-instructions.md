# Chrome Web Store reviewer test instructions

No account, credential, subscription, model download or external service is required.

1. Install the uploaded 1.0.0 ZIP and pin **AI Content Integrity Checker by Opace** to the toolbar.
2. Open an ordinary HTTP or HTTPS page containing selectable article text.
3. Select at least one sentence, right-click and choose **Check selection with Opace Content Integrity**. Confirm that the side panel opens with a preview and that no analysis has run yet.
4. Press **Inspect text**. Review **Named checks** and confirm that unavailable methods remain labelled unsupported rather than pass.
5. Press **Protect facts**, then **Prepare local candidate** and **Compare candidate**. Confirm that the original page is unchanged.
6. Press **Export receipt**, then **Download JSON receipt**. The downloaded receipt must have `contains_content: false`, product version `1.0.0`, hashes and method states, but no page URL, source text or candidate text.
7. Press **Clear extension data** and confirm the status message reports the cleared local/session groups.
8. Click the toolbar icon and exercise **Preview this article** and **Paste text**. On a restricted `chrome://` page, capture must fail safely and offer paste rather than repeatedly requesting access.

Expected permissions are `activeTab`, `scripting`, `storage`, `sidePanel`, `contextMenus` and `clipboardWrite`. There are no host permissions or external network requests.

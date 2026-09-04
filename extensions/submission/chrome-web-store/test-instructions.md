# Chrome Web Store reviewer test instructions

No account, credential or subscription is required. Quick checks need no network. The on-device
model route requires explicit consent to a pinned 34.5 MB model and vocabulary download; the WASM
runtime that executes it is already inside the package. The EU route is expected to report
unavailable until the production Store ID and the service channel are enabled.

1. Install the uploaded 1.2.1 ZIP and pin **Opace AI Content Checker & Detector** to the
   toolbar.
2. Open an ordinary HTTP or HTTPS page containing selectable article text.
3. Select at least one sentence, right-click and choose **Check selection with Opace AI Content
   Checker & Detector**. Confirm that the side panel opens with the text shown and that nothing has run
   yet.
4. Choose **Quick checks only** and press **Check this text**. Confirm the AI reading is
   **Not assessed** rather than a pass, and that every named check still reports its own state.
5. Go back and choose **On this device**. With no model cached the primary button reads
   **Download model and check**, with `34.5 MB · SHA-256 9f57d6a8…` beside it; pressing it is the
   consent, and there is no separate tick box. Press it.
   Confirm the five-band dial, the level in plain words, a score bar for every section, a deep
   dive per section with its passage, the three separate readings, every named check, the
   "What this means / What this does not mean" panel, the certainty disclosure and the run
   record. **Known gate:** the fixed model host does not yet return a cross-origin header, so this
   route may fail with "You appear to be offline" until that deployment is complete. Reviewers who
   need to see it working should be given the recorded evidence rather than a changed package.
6. Go back, choose **Private EU analysis** and tick the transfer box. Confirm Chrome requests only
   `https://opace-detector-877422072168.europe-west1.run.app/*`. In this candidate the service
   must report that it is not available yet, without presenting any AI result, retain nothing and
   leave the on-device route available.
7. Press **Protect the facts**, then **See suggested changes** and **Compare the two**. Confirm
   the original page is unchanged.
8. Press **Save or share**. Confirm **Branded PDF report**, **Complete HTML report**,
   **Result receipt (JSON, content-free)** and **Check receipt (JSON, content-free)** all
   download. Both JSON files must carry `contains_content: false`, hashes and method states, and
   no page URL, source text or candidate text. The PDF and HTML reports do contain the scored
   passages: that is the evidence, and they are produced only on request.
9. Press **Copy share summary**. The summary must carry the level, the score and the honesty line
   and no part of the draft.
10. Under **Check a file's Content Credentials**, choose a JPEG, PNG, WebP or PDF. Confirm the
    result reports one of found, absent, did not check out, signer not recognised, not supported
    or could not finish, and that the saved PDF and JSON records contain the file hash, type and
    size but never the filename or any file bytes.
11. Optional pace check: choose **Private EU analysis** and press **Check this text** four times
    in under a minute. The fourth attempt must refuse locally, name the limit, say when to try
    again and point at the on-device route, and Chrome's network log must show no request to the
    service for that attempt.
12. Press **Clear everything stored** and confirm the message reports the cleared local and
    session groups, the removed model files, and that already-downloaded files stay on the
    computer.
13. Click the toolbar icon on an ordinary page. The side panel must open on that tab with no
    popup in between. Press **This page**: the visible article text must appear, labelled with
    that site's host, and no permission prompt should be needed, because the click carried
    Chrome's temporary access. The panel then offers to make that one site permanent; refusing
    must change nothing.
14. Move that tab to another page, which ends Chrome's temporary access, and press **This page**
    again. The panel must name that one site — "Chrome will ask once to let this extension read
    text on `<host>`" — before any prompt appears. Press the button and refuse Chrome's prompt:
    the panel must say nothing was read and offer the paste route. Press it again and allow:
    the text must be captured. `chrome://extensions` must then list that one site and nothing
    wider.
15. Open a `chrome://` page, the Chrome Web Store and a PDF in Chrome's own viewer, and press
    **This page** on each. The panel must say those pages cannot be read and must not ask for any
    permission, because none would help.

Expected standing permissions are `activeTab`, `scripting`, `storage`, `sidePanel`, `contextMenus`
and `clipboardWrite`. There are no standing host permissions and no website access is granted at
install. Three optional host patterns are declared: the exact Opace EU-service origin, requested
only when the EU route is chosen, and `https://*/*` and `http://*/*`, which exist only so Chrome's
per-site prompt can be offered. Neither wildcard is ever requested: every request carries one
concrete `<scheme>://<host>/*` built from the tab in front of the user, and `<all_urls>` is never
requested at all. On the
on-device route the only network activity is the separately consented, pinned model and vocabulary
download from `https://opace.agency/models/local-signals-v1/`; draft text is not sent to that host,
or to any other recipient, on this route.

# Chrome Web Store submission bundle

- Product: **Opace AI Content Checker & Detector**
- Release: **1.2.0**
- Prepared: **3 September 2026**
- State: **local development candidate**; not owner-accepted, uploaded, submitted, approved or
  public

## Upload files

- Extension package: `package/opace-ai-content-checker-detector-chrome-1.2.0.zip`,
  27 files, 6,979,634 bytes,
  SHA-256 `edb8311bbb4d2459d3d8e68e0d2ac4e1f1d595bf32973c09f7625d8257b69ffe`
- Store icon: `assets/icon-128.png`
- Small promotional image: `assets/small-promo-440x280.png`
- Marquee promotional image: `assets/marquee-promo-1400x560.png`
- Listing screenshots:
  - `screenshots/01-choose-the-text-and-route.png`
  - `screenshots/02-the-reading-and-section-scores.png`
  - `screenshots/03-inside-a-section.png`
  - `screenshots/04-checks-and-what-it-means.png`
  - `screenshots/05-reports-receipts-and-files.png`

Draft dashboard values are in `field-values.json`. Every image and the package hash are recorded in
`asset-manifest.json` and checked by `node validate-submission.mjs`.

## How the images were made

`extensions/chrome/scripts/store-assets.mjs` regenerates all eight images. The five screenshots are
real captures of the exact packaged `dist/` driven through the real workflow in Chrome 151, then
composited at the required 1280 x 800 with the product's own typography. The pinned model artefacts
are supplied to the packaged bytes by request interception, so the screenshots show a genuine
populated result without changing a single byte of the package. The icon and both promotional
images are derived from the owner-selected raster mark `docs/assets/opace-ai-checker-chrome-mark-v4.png`
(SHA-256 `042c37cdfd175cc6f529644f927fc6830e1589a6c29a84e2163cdd5f95b2e38d`). The retired 1-2-3
placeholder mark is no longer used anywhere in this bundle.

## Promotional asset descriptions

| Asset | Alt text | Caption |
| --- | --- | --- |
| small-promo-440x280.png | Opace AI Content Checker & Detector promotional tile on deep blue, with the product mark, the product name and the line AI detector for any page or selection. | The product identity, with no detector-score or authorship claim. |
| marquee-promo-1400x560.png | Wide Opace AI Content Checker & Detector marquee on deep blue, with the product mark, the name and the line Evidence, not guarantees. | Evidence-led identity for the extension, with the on-device and optional EU routes named. |

## Release boundary

The package is a Chrome-only Manifest V3 extension. Edge, Firefox, Safari, local-engine pairing,
commercial detectors and an official Anthropic verifier are not included or claimed. Historical
0.1.0 evidence remains in `../../EXT-30-EVIDENCE.md`.

### What changed in 1.2.0

The product is renamed to **Opace AI Content Checker & Detector**, with **AI Content Checker** as the
short name Chrome shows under the icon, and the store summary is rewritten around the same
wording. The manifest name, the side-panel masthead, the context-menu entry, the toolbar tooltip,
the share summary, the listing copy, the reviewer instructions, the eight listing images and the
package file name all carry the new name. The extension icons and the store icon are derived from
the owner-selected Chrome mark, `docs/assets/opace-ai-checker-chrome-mark-v4.png`, which replaced
the retired `opace-ai-content-integrity-logo-v2.png` on 4 September 2026.

Nothing else changed: the same routes, permissions, limits, measured figures, exports and honest
states as 1.1.2, and the same frozen `shared/presentation/**` and `shared/report/**` bytes.

### What changed in 1.1.2

A design pass on the side panel shell, and nothing else. Every card now carries layered depth and a
lit top edge on 14 to 16 px radii; the masthead sets the product mark on its own tile above a
hairline of Opace orange; the step rail has a filled track and a lit current step; each route is a
tile with a coloured edge and a status pill that names what choosing it costs; the writing box is a
soft inset field with an orange focus ring; one orange button carries the action on each screen and
lifts under the pointer; notices are tinted cards with a line-art glyph, and a refused EU run now
offers **Run on this device instead** in the same card; empty states carry a friendly glyph instead
of a blank box. The panel follows the reader's light or dark setting, which the result block inside
it already did.

No behaviour, permission, route, limit, claim or exported file changed. The bundle carries the same
frozen `shared/presentation/**` and `shared/report/**` bytes as before.

### What changed in 1.1.1

**This page** failed on ordinary pages in 1.1.0. The toolbar action had a `default_popup`, which
consumed the click and opened the side panel without the temporary page access that click carries.
The popup is gone; the icon opens the panel itself. When the access is missing the panel names the
one site and offers Chrome's own per-site prompt, and it says honestly which pages Chrome closes to
every extension. The on-device tick box is replaced by the primary button, which reads **Download
model and check** with the size and fingerprint beside it until the model is cached. The package
is four files smaller: the three retired popup files, and an orphaned `assets/report-logo.jpg`
that an earlier build had left in `dist/` and that nothing referenced. `build.mjs` now writes
`dist/` from empty, so no orphan can ship again.

Open gates before any upload:

- the fixed model host `https://opace.agency/models/local-signals-v1/` does not yet return a
  cross-origin header, so the on-device route cannot fetch its assets from a shipped install;
- the EU service channel is not deployed and there is no production Store ID to allowlist, so that
  route reports honestly that it is not available yet;
- there is no separate product Terms page by owner decision (3 September 2026); the site's
  existing terms and privacy policy cover the tools; and
- the homepage, support and privacy URLs must return route-specific copy.

Deployment and Chrome Web Store submission are separate owner-approved actions.

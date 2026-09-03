# Chrome Web Store submission bundle

- Product: **AI Content Integrity Checker by Opace**
- Release: **1.1.1**
- Prepared: **3 September 2026**
- State: **local development candidate**; not owner-accepted, uploaded, submitted, approved or
  public

## Upload files

- Extension package: `package/opace-ai-content-integrity-chrome-1.1.1.zip`,
  27 files, 6,984,184 bytes,
  SHA-256 `10928f44aff6d8e5bfa8afc981c821929cf64d27fe27086843d3cc8ccdd3c459`
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
images are derived from the canonical `docs/assets/opace-ai-content-integrity-logo-v2.png`
(SHA-256 `9117f9d4527b103f8d527b9edf297b0b32876c293a0ce27983dee4bc557c1f74`). The retired 1-2-3
placeholder mark is no longer used anywhere in this bundle.

## Promotional asset descriptions

| Asset | Alt text | Caption |
| --- | --- | --- |
| small-promo-440x280.png | Opace AI Content Integrity promotional tile on deep blue, with the product mark and the line Evidence, not guarantees. | The product identity, with no detector-score or authorship claim. |
| marquee-promo-1400x560.png | Wide Opace AI Content Integrity marquee on deep blue, with the product mark, the name and the line Evidence, not guarantees. | Evidence-led identity for the extension, with the on-device and optional EU routes named. |

## Release boundary

The package is a Chrome-only Manifest V3 extension. Edge, Firefox, Safari, local-engine pairing,
commercial detectors and an official Anthropic verifier are not included or claimed. Historical
0.1.0 evidence remains in `../../EXT-30-EVIDENCE.md`.

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

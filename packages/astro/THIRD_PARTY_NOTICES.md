# Third-party notices

Version 0.3.1 bundles the following exact runtime packages so the integration is dependency-closed. This notice does not imply endorsement by their authors.

| Package | Version | Licence | Purpose |
|---|---:|---|---|
| `@opacedev/ai-content-checker-contracts` | `0.3.1` | MIT | Frozen schema and status contract. |
| `@opacedev/ai-content-checker-core` | `0.3.1` | MIT | Deterministic inspection, hashes and reviewed diffs. |
| `@opacedev/ai-content-checker-browser` | `0.3.1` | MIT | Visible-text projection and Worker boundary. |
| `canonicalize` | `4.0.0` | Apache-2.0 | RFC 8785 canonical JSON used by the bundled core. |
| `entities` | `4.5.0` | BSD-2-Clause | Standards-correct HTML entity decoding for browser/server parity. |

## Bundled fonts

The development toolbar embeds two OFL font subsets as data URLs, so the panel matches the product's
typography without a single network request. Neither file is served to a site's visitors: the toolbar
exists only during `astro dev` and is absent from every production build.

| File | Bytes | SHA-256 | Family and licence |
|---|---:|---|---|
| `assets/fonts/outfit-variable.woff2` | 32,228 | `92684e4acde79ef07758cd09380b7e01e9824d8b061eddeda046f78c166d7b12` | Outfit, Copyright 2020 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts). SIL Open Font License 1.1. |
| `assets/fonts/plus-jakarta-sans-latin.woff2` | 27,348 | `153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79` | Plus Jakarta Sans, Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans). SIL Open Font License 1.1. |

Both are subsets of the upstream releases, unmodified in outline. The SIL Open Font License 1.1
permits embedding and redistribution; the fonts are not sold, and the reserved font names are not
used for any modified version. The full licence text is published with each upstream project.

## Build-time only

`onnxruntime-web` 1.29.0 (MIT, Microsoft) is a development dependency of the toolbar bundle and is
compiled into `dist/toolbar.js`. Its WebAssembly binary is not shipped in this package; the toolbar
downloads and hash-verifies it from the fixed model base only after explicit consent.

## Licence files

The complete upstream licences are shipped at `node_modules/canonicalize/LICENSE` and `node_modules/entities/LICENSE` in the packed archive. The Opace package licences are shipped with their bundled package metadata and are also covered by this repository's MIT licence. Opace has not modified either third-party package.

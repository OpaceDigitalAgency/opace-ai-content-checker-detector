# Browser-evidence fixtures

Test-only files. `scripts/package.mjs` archives `dist/` alone, so nothing here
is ever packaged or published.

## Content Credentials images

Copied without modification from the Content Authenticity Initiative
`c2pa-js` repository (MIT licensed), by way of
`wordpress/opace-ai-content-integrity/tests/fixtures/c2pa/`:

- `signed.jpg` — real Content Credentials whose signer is not established as
  trusted when no trust list is configured. SHA-256
  `fa0b257c863cb5b367135a017813ce0c1fbfc690a03e94acdd047c25c2d1ed46`.
- `plain.jpg` — the same image derivative without Content Credentials. SHA-256
  `c13676faf4036e8847f6bce61734376bf8c14fe5f1bc66ae85a2c3106e0fc300`.
- `malformed.jpg` — a malformed credential-algorithm fixture. SHA-256
  `7c91641416c18319b823c292ae603c5354892ac365c05543519154c48c6a1f8a`.
- `note.txt` — a plain text file, for the unsupported-file state.

Upstream source: <https://github.com/contentauth/c2pa-js>

## Text samples

`human-sample.txt` and `ai-sample.txt` are written for this test suite. They
exercise the multi-section scored path and the quick-checks-only path. Neither
is customer content.

# C2PA browser test fixtures

These three JPEG files are copied without modification from the Content
Authenticity Initiative `c2pa-js` repository at commit `9be486f`. That source
repository and its `@contentauth/c2pa-web` package are MIT licensed. The files
are test-only and the plugin packaging script excludes the whole `tests/`
directory.

Source paths:

- `packages/c2pa-web/test/assets/C_with_CAWG_data.jpg`: real Content
  Credentials with an untrusted signing credential when no trust list is
  configured. SHA-256
  `fa0b257c863cb5b367135a017813ce0c1fbfc690a03e94acdd047c25c2d1ed46`.
- `packages/c2pa-web/test/assets/C_with_CAWG_data_thumbnail.jpg`: derivative
  without Content Credentials. SHA-256
  `c13676faf4036e8847f6bce61734376bf8c14fe5f1bc66ae85a2c3106e0fc300`.
- `packages/c2pa-web/test/assets/no_alg.jpg`: malformed credential algorithm
  fixture. SHA-256
  `7c91641416c18319b823c292ae603c5354892ac365c05543519154c48c6a1f8a`.

Upstream source: <https://github.com/contentauth/c2pa-js>

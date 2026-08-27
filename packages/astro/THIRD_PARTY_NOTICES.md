# Third-party notices

Version 0.1.0 bundles the following exact runtime packages so the integration is dependency-closed. This notice does not imply endorsement by their authors.

| Package | Version | Licence | Purpose |
|---|---:|---|---|
| `@opace/content-integrity-contracts` | `0.1.0` | MIT | Frozen schema and status contract. |
| `@opace/content-integrity-core` | `0.1.0` | MIT | Deterministic inspection, hashes and reviewed diffs. |
| `@opace/content-integrity-browser` | `0.1.0` | MIT | Visible-text projection and Worker boundary. |
| `canonicalize` | `4.0.0` | Apache-2.0 | RFC 8785 canonical JSON used by the bundled core. |
| `entities` | `4.5.0` | BSD-2-Clause | Standards-correct HTML entity decoding for browser/server parity. |

The complete upstream licences are shipped at `node_modules/canonicalize/LICENSE` and `node_modules/entities/LICENSE` in the packed archive. The Opace package licences are shipped with their bundled package metadata and are also covered by this repository's MIT licence. Opace has not modified either third-party package.

# Changelog

All notable changes to `@opacedev/ai-content-checker-cli`.

## 0.3.0 — 3 September 2026

### Changed

- **Renamed.** The package is now `@opacedev/ai-content-checker-cli`; it was
  `@opace/content-integrity-cli`. Nothing was published under the old name, so there is no
  redirect and nothing to migrate.
- **The command is now `opace-ai-checker`.** `opace-integrity` is still installed as an alias for
  this one release, so existing scripts keep working. It will be removed in the next minor
  version. `--help` prints the new name.
- The product is named **Opace AI Content Checker & Detector** in the banner, the printable
  report, the terminal summary and the receipt `product_version` line. "Content integrity" is kept
  only where it describes the three-axis reading, not as the product name.
- Runtime identity moved from 0.2.0 to 0.3.0 (`--version`, the text banner and receipt
  `product_version`).
- The bundled copy of `shared/report/**` was re-synced, so the printable report carries the
  current shared document.

### Unchanged

Commands, options, exit codes, output shapes, the loopback-only `--local-engine` route, the
zero-network `--offline` assertion and the hash-only receipt format are all as they were in 0.2.0.

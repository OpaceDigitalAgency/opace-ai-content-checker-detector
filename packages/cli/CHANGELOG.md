# Changelog

All notable changes to `@opacedev/ai-content-checker-cli`.

## 0.3.1 — 4 September 2026

### Changed

- Re-synced the bundled copy of `shared/report/**`, so the printable report carries the Lane D3
  hero: the five band names are now their own full-width row beneath both the dial and the verdict
  copy, instead of a legend inside the dial's column that collided with the verdict sentences at
  every width between about 560 and 800 CSS px.
- Runtime identity moved from 0.3.0 to 0.3.1 (`--version`, the text banner and receipt
  `product_version`).

### Added

- **"What the model measured", per scored passage**, in both the printable report and the terminal
  summary. Word re-use between neighbouring sentences and vocabulary variety are drawn against this
  project's own typical-AI and typical-human medians; sentence-length evenness is drawn with no
  markers, because the project measured it at AUROC 0.521 against 0.500 for chance and there is no
  separation to mark. Every median, AUROC and caveat sentence is a mirror of
  `PASSAGE_SIGNAL_REFERENCES` in `shared/presentation/checker-result-presentation.mjs`. A passage
  too short for an honest reading shows fewer meters rather than an invented one, and nothing in
  the block sets or moves a level.

### Unchanged

Commands, options, exit codes, output shapes, the loopback-only `--local-engine` route and the
`opace-integrity` alias.

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

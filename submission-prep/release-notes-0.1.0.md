# Opace AI Content Checker & Detector for Astro 0.1.0

Package source tag: `packages-v0.1.0`. The existing repository tags `v0.1.0`–`v0.1.2` are historical public-repository snapshots and must not be moved or used to publish these renewed package bytes.

The first release adds a local, report-only content-integrity workbench to Astro's Dev Toolbar.

## Included

- Six views in one integration: Check page, Protect & rewrite, Claude readiness, Index, Receipts and Settings.
- Explicit browser inspection in a Worker, with no initial scan or outbound request.
- Deterministic hash-only JSON and printable HTML build reports.
- Reviewed safe-fix patch previews without automatic source writes.
- Astro 5, 6 and 7 static, server and hybrid support within the documented Node matrix.
- Keyboard navigation, reduced-motion handling, narrow-panel reflow and automated axe coverage.

## Deliberate limits

Version 0.1.0 does not determine human authorship, call a detector provider, connect to a local service, fail a production build, persist source text or apply a rewrite. Anthropic official verification is `unsupported`; the Index is `Not configured`. Dynamic SSR routes can be inspected in the development toolbar but are not added to the build report unless prerendered.

See the package README for installation, configuration, privacy and troubleshooting.

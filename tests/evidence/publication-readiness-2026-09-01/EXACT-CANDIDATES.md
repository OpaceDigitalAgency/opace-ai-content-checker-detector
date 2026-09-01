# Exact local publication candidates — 1 September 2026

This record covers local preparation only. Nothing was published, submitted, tagged, pushed or uploaded to a registry or store.

## Frozen candidates

| Surface | Candidate | SHA-256 |
| --- | --- | --- |
| npm contracts | `dist/public-0.1.0/npm/opace-content-integrity-contracts-0.1.0.tgz` | `1fe269f3ec6b8f9f88e96e896b67a48defdeb0533d588ac14f6e53b707e00341` |
| npm core | `dist/public-0.1.0/npm/opace-content-integrity-core-0.1.0.tgz` | `906b75fbcf78538b79d21aeb04f9f322bf2a0dcf7aaf1191a4fb2739cc7e13fa` |
| npm browser | `dist/public-0.1.0/npm/opace-content-integrity-browser-0.1.0.tgz` | `c2056d8a1c58c175f94bf5cd9253633863d1116906445410ad844431a5e14f0e` |
| npm client | `dist/public-0.1.0/npm/opace-content-integrity-client-0.1.0.tgz` | `23796745eedd958fe9f67873f164cd12c26910745d2ffc748ed0828594b990a2` |
| npm CLI | `dist/public-0.1.0/npm/opace-content-integrity-cli-0.1.0.tgz` | `4373b44b9be8784910a2ea823e85a912206379c6fd97f1d89f9449660407548b` |
| npm developer manifest | `dist/public-0.1.0/npm/manifest.json` | `09aa31d47f81510feaa25908ea17f1bb5e80770ddc41c3becd718c4632c062e7` |
| Astro/npm | `dist/public-0.1.0/astro/opace-astro-content-integrity-0.1.0.tgz` | `2deaf5d31dd74b8bca2910622ecfd27218850bd84209d40dc04ebaad65e0761a` |
| Python wheel | `services/local-engine/dist/public-0.1.0/opace_content_integrity-0.1.0-py3-none-any.whl` | `550dfdd9f3b39e272a857dc999e5fad05fdf7d27e9f462130cf5263e4aa948c5` |
| Python sdist | `services/local-engine/dist/public-0.1.0/opace_content_integrity-0.1.0.tar.gz` | `cc196d843a16b268acd88368f73b44635350ed73a3326832b0d17fa56948d2cf` |
| Chrome | `extensions/submission/chrome-web-store/package/opace-ai-content-integrity-chrome-1.0.0.zip` | `a52f0856a420a08ad31c9cf1388d7a7516b95759534ffd12054228122de30f0f` |
| WordPress | `dist/opace-ai-content-integrity-1.0.8.zip` | `b7b2c411862c6407ade38edbf95022f2f237c2dda63f80d9e1fae143ca63ce03` |

The canonical machine-readable record is `submission-prep/submission-manifest.json`. `node scripts/verify-submission-candidates.mjs` verified every hash above, archive path safety, absence of local-path/private-key/credential-like secret markers, public package metadata, the five-package dependency closure and each applicable C2PA safe-fix guard.

## Gate results

- Five developer npm archives: two independent builds were byte-identical; package tests, `npm publish --dry-run`, clean-consumer install/import/CLI checks, full dependency trees and audits passed. Core tests passed 140/140. Each public manifest is version `0.1.0`, non-private, public/provenance-enabled, free of `file:` dependencies and points to the canonical repository.
- Astro `0.1.0`: two independent builds were byte-identical; source tests passed 27/27; TypeScript check, audit, publish dry run and clean-consumer install/import/integration/analysis passed. The exact archive contains the C2PA safe-fix guard.
- Python `0.1.0`: wheel and sdist were each byte-identical across two independent builds; Twine, 31/31 tests, clean wheel and sdist consumers, dependency checks, imports, version/help and server-help checks passed. Repository and issue metadata use the canonical repository. The C2PA safe-fix guard is not applicable because this model-free control plane has no safe-fix removal API.
- Chrome `1.0.0`: source unit tests passed 5/5; typecheck, audit and store validator passed; two ZIP builds were byte-identical. The exact candidate has 15 files, five screenshots and eight store assets. A visible Chrome for Testing 151 run completed capture, inspect, protect, improve, compare and export at 375 CSS px with no axe violations, console errors or overflow; the C2PA credential survived the default safe fix.
- WordPress `1.0.8`: ten independent final builds were byte-identical. JavaScript passed 16/16, package contract 2/2, PHPUnit 14/14 with 82 assertions, PHPCS 33/33, npm and Composer audits, and 258/258 PHP files on both PHP 7.4.33 and PHP 8.3.33. The exact ZIP passed Plugin Check 2.1.0 and installed-byte parity on WordPress 6.5.5/PHP 7.4, WordPress 7.1/PHP 8.3 and per-site Multisite. Visible exact-install checks at 1280 and 375 CSS px had zero external inspection requests, zero plugin-owned axe violations, zero console errors and no overflow; the C2PA guard and hash-only receipt passed. Per-site Multisite activation remained active and network activation failed with the intended message.

The historical WordPress 1.0.6 evidence remains 8 of 9 matching builds with one unexplained overwritten mismatch. The 10 of 10 result proves the current 1.0.8 builder/candidate; it does not retrospectively explain or erase the 1.0.6 anomaly.

## Release set and held gates

The npm release set is six packages: the five developer archives above plus Astro. `@opace/watermark-lab` remains private/demo-only and is not a seventh publication candidate. The future package source tag is `packages-v0.1.0`; it has not been created. Historical `v0.1.0` to `v0.1.2` tags must not be reused.

Technical local gates are complete for the frozen candidates. Chrome was exercised in Chrome for Testing 151, which is newer than the declared minimum 145; an exact Chrome 145 binary was not locally available. Registry/store accounts, two-factor authentication, owner approval, source-tag creation, publishing/submission, moderation, downloaded-byte verification, live-listing checks and owner-environment Safari/VoiceOver acceptance remain held manual gates.

# Test evidence

The first section preserves the original Phase 0/G1 record. Later correction appendices are authoritative for current package and consumer-gate counts.

Observed 26 August 2026 in the local workspace:

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | pass |
| Ajv Draft 2020-12 compile | 13 schemas pass strict compilation |
| Valid fixtures | every instance schema has at least one fixture and all pass |
| Invalid fixtures | unknown status, Anthropic proxy score and contract major 2 all fail; an unknown additive field passes under same-major reader compatibility |
| OpenAPI | YAML parses; exact 11 route templates, loopback origin and external schema refs pass |
| RFC 8785 Node | Apache-2.0 `canonicalize` 4.0.0 passes all three vectors, including Unicode/control/numbers and astral/BMP UTF-16 key ordering |
| Python 3.9 | native Draft 2020-12 validation for every valid/invalid fixture plus all three RFC 8785 vectors pass |
| PHP 8.4 | 22 contract fixtures, 3 RFC 8785 vectors and 45 assertions pass |
| PHP 7.4 container | 22 fixtures, 3 shared RFC 8785/SHA-256 vectors, astral/BMP ordering, number boundaries, semantic offset/source-hash checks and DEC-21 facade fixture identity pass: 45 assertions in a read-only `wordpress:php7.4-apache` run |
| PHP syntax | every PHP contract/test file passes `php -l` in the PHP 7.4 container |
| Composer PHP | lock resolves only `opis/json-schema 2.6.0`, `opis/string 2.1.0` and `opis/uri 1.1.0`; disposable `composer:2.8.12 validate --strict --no-check-publish` passed and `composer:2.8.12 audit --locked --no-interaction` returned `No security vulnerability advisories found`; Apache-2.0 is recorded for all three |
| PHP network boundary | static scan of PHP contract runtime/composer metadata finds no cURL, WordPress HTTP, socket, RPC, transport or telemetry code; rejected tracing SDK is absent from lock and vendor |
| npm audit | 0 vulnerabilities |
| Independent `tests/gate/g1-contract-gate.mjs` | 14 passed, 0 failed after receipt, Anthropic, transition, semantic-offset, OpenAPI and facade fixes |

## Integration-lead G1 decision

The integration lead formally froze G1 on 26 August 2026 after reviewing the full suite and independent probe. The exact frozen state is:

- schema `1.0` and contract `1.0.0`;
- 13 Draft 2020-12 schemas, 22 valid/invalid contract fixtures and three cross-language RFC 8785 vectors;
- canonical statuses `pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`;
- privacy routes `browser`, `wordpress_local`, `local_service`, `hub_provider`, `commercial_byok`;
- `watermark.anthropic` forced to the current unsupported/not-available/null-score/null-threshold invariant;
- DEC-21 PHP facade identity and separate JavaScript mount metadata;
- exact Specification 04 OpenAPI resource/job routes, secured except loopback health, at `http://127.0.0.1:8741`;
- additive same-major reader compatibility and fail-closed wrong-major/unknown-status behaviour.

The Composer audit was verified in a disposable read-only container. Its only warning was Composer's benign default root-version notice; the vulnerability result was green. G1 freeze is a technical integration gate, not a commit, release, deployment or owner-acceptance claim.

## Historical next dependency at G1 freeze

G2 is next. The deterministic browser-safe core must consume the frozen public contract exports, preserve cross-language hashes and statuses, and pass offline/no-fetch, Unicode/offset, protected-span, pattern, diff, receipt, SSR/browser and performance tests. Any contract change requires compatibility review, version treatment and the complete G1 regression again.

## Integration-lead G2 decision

G2 was formally frozen on 26 August 2026 after the component suite, full G1 regression and strengthened independent gate passed. Final evidence:

- core package: 18 tests passed; 37.0 kB raw/11,782 bytes gzip; audit zero vulnerabilities; clean pack inventory;
- browser package: build and exact pack inventory passed; default module Worker asset resolved;
- independent `g2-core-gate.mjs`: 24 passed, 0 failed;
- Chromium 375×812 at 4× CPU: integration rerun cold 17.4 ms, warm p95 8.3 ms and zero long tasks;
- Firefox 153 and WebKit 26.5: matching DOM projection/import checks passed;
- network boundary: zero external requests and no fetch/transport/telemetry/install hooks;
- receipt boundary: 9,927-byte representative receipt verified; malformed rehashed receipts, tampering, wrong major and hash-only rewrite content leakage all failed closed.

G2 is a technical input freeze only. WEB-10 and WP-10/20 are now authorised for local candidate implementation; publication and owner acceptance remain separate gates.

## Current correction and consumer-gate appendix

The original 18-test G2 package was superseded after downstream QA exposed an exhausted-insert edge case and a TypeScript-only contracts runtime export. Corrected refreeze2 is the current frozen input: core 20/20, G1 14/14 and independent G2 24/24 across Chromium, Firefox and WebKit. Exact SHA-256 values are contracts `1a592e5c63d577f694fe78d4a8fe7dcb6724a4def10b906fab4ecda22e160977`, core `20820481fcf98a4c16dd8e239dd9d7e18f23754f682831de526d68e94012bd9d` and browser `0ac378a99d0eac455960b36b7ca8f63fda942f4950aef1e65b3854a535e95d0b`.

| Current boundary | Result and exact evidence |
|---|---|
| Website submission candidate | Independent local review on website base head `a017b516b2722a24eb539b5ef4de595cd201e8c3` passed 66/66 rendered route/browser/viewport runs, 22/22 axe audits, 320 px reflow, checker/keyboard/receipt/no-JavaScript journeys, sitemap 11/11 and 114/114 same-origin links. All 11 production routes remain 404 and undeployed. |
| G5-base model-free | Independent pass: TypeScript client 11/11, CLI 6/6, Python 30/30, G1 14/14 and G2 24/24. Exact dependency-closed packages, deterministic Python wheel/sdist, lifecycle/security/privacy and audits passed. Semantic/model/legal/Docker gates remain open. |
| BENCH-10 | Private synthetic/offline mechanics pass: package 18/18, independent 14/14 and unchanged G1/G2. Benchmark tarball `68b6c65c46fbe6c493bd1fa754f851417b2e79e048504c96be6628011612c49d`; package-set manifest `b2e9e5179c41d8867d9c5188b38046613e09635762d37be39f8d101f7d3661bc`. G7 is not claimed. |
| Chrome submission candidate | Independent automated exact-package pass. Chrome 1.0.0 ZIP `061f5306eb872653787ff9ee492e583c86c1ba427bef6ecb22477ccfba7a1a93`; validator, unit/type 5/5, audit 0, Chrome 151 and minimum 145 at 40/40 visible assertions per lane, seven-state axe and Worker parity green. Manual Stable Load unpacked/native actions, VoiceOver, live URLs and store/account/owner gates remain. |
| ASTRO-25 | Independent private report-only pass. Deterministic final-k/l tarball `170e3520fcca9768bdbe22235cd815c9d354ba21974208211a4bb33d66c26d81`; package 27/27, Astro static/server/hybrid 9/9, Node 7/7, true Worker/server parity, path containment, hidden/focus and three-browser checks plus G1/G2 green. Manual AT/public/owner gates remain. |
| WordPress | 1.0.4 is the sole current exact local ZIP: `dist/opace-ai-content-integrity-1.0.4.zip`, SHA-256 `084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec`. Its documentation-only refreeze changed only `README.md` and `readme.txt`; three-build parity, 301-file inventory, Plugin Check and official readme validation pass, while the unchanged executable bytes retain the minimum/current/Multisite, PHP 7.4, lifecycle/schema/companion/REST/editor/no-network/responsive/focus and plugin-scope axe evidence. Safari/VoiceOver owner consent, live URLs, account/slug/submission and public verification remain held. |
| QA-90 | Passed as the historical automated/private exact-candidate baseline: root/core/G1/G2, G5-base, BENCH, Chrome, Astro, archive safety, consolidation and cross-surface visual review remained green. The later WordPress 1.0.4 cascade has separate evidence. Full semantic G5, G7, manual assistive-technology checks and owner/public acceptance remain separate held gates. |

## Submission-preparation appendix — authoritative current boundary

- Root regression: contracts/core passed at 13 schemas and core 20/20; G1 passed 14/14; G2 passed 24/24 across Chromium, Firefox and WebKit; package gates passed; npm audits reported zero vulnerabilities; the exact-candidate verifier passed 8/8 hashes.
- Public 0.1.0 implementer and independent evidence is green for deterministic repeats, exact clean consumers/matrix, archive/public-tree hygiene, Twine, six npm dry-runs, workflow YAML and metadata. The 27 August README refreeze supersedes the earlier npm/Python hashes. Current hashes are npm manifest `f2e09e2e3894263544503c3d0d1c416104bdb7def33e9409ea4e15745193fe20`, unchanged Astro `4a45e4530acb82b514797b7424a4d4d71bff314cd5d48136b8aefef6d1e82da5`, Python wheel `ddd0b16009cdb3980a6a0a6f46a265312e49da7687d7c7ff87358adacb3b943d` and sdist `34c65f6efbfb8f3a4f014b9de49888bf3b7ffefb63ca3ab3754f1a40587f7d46`. Current refreeze evidence: `.agent/docs/ai-content-integrity/PUBLIC-PACKAGE-README-REFREEZE-2026-08-27.md`.
- npm requires each package to exist before trusted publishing can be configured. The six first `0.1.0` releases therefore require the owner to publish the exact accepted tarballs interactively with account 2FA and `--provenance=false`; no bypass-2FA token is permitted. Later releases use stage-only OIDC, provenance and maintainer 2FA approval. This first-release account boundary is not a package defect. PyPI remains held for GitHub trusted publishing after npm live verification.
- Full semantic G5, G7, model, corpus and provider validation are intentionally outside the 0.1.0 submission scope and must not be inferred from these results.

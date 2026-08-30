# QA-90 final automated/private regression evidence

Date: 26 August 2026
Result: **PASS for the selected automated/private exact-candidate baseline**

## Scope and boundary

QA-90 re-ran the selected private candidate portfolio and reviewed the available rendered surfaces. It did not authorise or prove a commit, publication, deployment, production state or owner acceptance. It also did not convert formal G4, full semantic G5, G7 or manual assistive-technology gates into passes.

At the time of this historical QA-90 run, WordPress 1.0.2 was the selected exact-ZIP candidate and 1.0.3 was provisional. Both are now superseded by the separately verified WordPress 1.0.4 FINAL1 ZIP `a69f0eac300d27a0106f7db768d92d51f1a235ef269d735c0c0d8db6eb9e3a4e`; this record preserves the earlier baseline and does not claim to test that later package.

## Automated regression result

| Component | QA-90 result |
|---|---|
| Root contracts and cross-runtime validation | PASS: 13 schemas; PHP 22 fixtures, three RFC 8785 vectors and 45 assertions |
| Deterministic core/browser | PASS: core 20/20; G1 14/14; G2 24/24; local package gate; npm audits zero |
| Client, CLI and loopback local engine | PASS: TypeScript client 11/11; TypeScript CLI 6/6; Python 30/30 |
| BENCH-10 private synthetic mechanics | PASS: package 18/18; independent gate 14/14; npm audit zero |
| Chrome EXT-30 private candidate | PASS: component suite 4/4; npm audit zero; prior exact-ZIP Chrome 151 and minimum Chrome 145 lanes retained at 34/34 visible assertions each |
| Astro ASTRO-25 private candidate | PASS: package 27/27; npm audit zero; Astro matrix 9/9; compatible Node matrix 7/7 |
| WordPress 1.0.2 | PASS as the historical QA-90 selected candidate on its recorded independent runtime/rendered evidence; now superseded |
| WordPress 1.0.3 | HISTORICAL PROVISIONAL only: non-Docker JavaScript 8/8, package e2e 2/2, PHPUnit 14 tests/82 assertions and PHPCS 33-file source check passed; now superseded |
| Archive and workspace safety | PASS: zero unsafe archive paths, local-path leakage, secrets or customer data; one-folder consolidation passed |

## Exact selected artefacts

- Contracts: `1a592e5c63d577f694fe78d4a8fe7dcb6724a4def10b906fab4ecda22e160977`
- Core: `20820481fcf98a4c16dd8e239dd9d7e18f23754f682831de526d68e94012bd9d`
- Browser: `0ac378a99d0eac455960b36b7ca8f63fda942f4950aef1e65b3854a535e95d0b`
- TypeScript client: `d8fdc64e0b09fe978783f46044e53233bfc82616c993064961ce2cdccd395dd4`
- TypeScript CLI: `2176463b3835b29133df7c14254eb3a6c5888adc3c4a7d9479d9d35ffb2825ef`
- Python wheel: `a0605c3e59ba024bba97f0b205cf08a9e16f3d86af65d9e9bf98ffe92b07a753`
- Python sdist: `1fb6ec801a7fa9050a36fbec71fef517ae5f555b6b0409ec8fd456f0377003d4`
- BENCH-10: `68b6c65c46fbe6c493bd1fa754f851417b2e79e048504c96be6628011612c49d`
- Chrome 0.1.0 ZIP, 15 files: `317ae8c029ea80b3f22acf0b8bc79610dabfac1d0914817db894bae7c183f7ca`
- Astro final-k/final-l: `170e3520fcca9768bdbe22235cd815c9d354ba21974208211a4bb33d66c26d81`
- WordPress 1.0.2 historical QA-90 ZIP: `ecb4335a27fac3339a97b5271f4e40a572176f4d1e1c6b07dc39d368c5fee950`
- WordPress 1.0.3 historical provisional ZIP: `ce24df1eea5d7e7cfdd20a885f408306da99165cd4d91cd856a2f370a096817d`

## Final visual review

The web, WordPress 1.0.2, Astro and Chrome evidence showed no blocking visual defect. The reviewed surfaces retained the Opace graphite/orange design direction, readable hierarchy and responsive behaviour. Automated accessibility evidence remained green within each recorded component boundary.

The historical WordPress 1.0.2 surface had moderate nested visual-landmark findings. The later 1.0.4 FINAL1 evidence closes those findings plus the subsequent validation/focus corrections; see the current submission-readiness record rather than using QA-90 as its package proof.

## Consolidation and incident safety

- All task-owned material under `other-plugins` remains inside the single `ai-watermark-and-content-authenticity/` folder.
- The implementation repository remains nested at `implementation/` with its `.git` directory intact.
- Archive inspection found no unsafe traversal entries, machine-local paths, secret material or customer data.
- The separate `google-preferred-sources/` programme and unrelated active website work were not moved or changed by QA-90.

## Gates still open

- WordPress 1.0.4 owner-controlled Safari/VoiceOver, live URLs, account/slug/submission and public-directory verification; its local automated/package matrix is recorded separately as passed.
- Full semantic G5 model/detector/corpus/legal selection and independent semantic QA.
- G7 real corpus/provider/human/statistical/legal work and any comparative claim.
- Manual assistive-technology journeys, including the held VoiceOver/Stable checks.
- Owner acceptance and every commit-for-release, registry/store, WordPress.org, deployment and production-verification action.

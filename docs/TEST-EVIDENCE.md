# Test evidence

**Current at 1 September 2026.** This file records the current source, model and deployment
baseline separately from historical package evidence. A source-suite pass does not renew evidence
for an archive with different bytes.

## Current source baseline

Renewed on 1 September 2026 from the implementation repository on branch
`codex/publication-readiness-2026-09-01`. The root/contract/link rows came from that day's
`npm test` run; the battery row came from a separate same-day `npm run test:battery` run after the
claim-debt ratchet was narrowed to match the corrected files. Component/gate totals are the
same-day orchestration baseline recorded before the candidate-specific release work below.

| Check | Current result | What it proves |
|---|---:|---|
| `npm test` | pass | typecheck; 13 schemas; valid/invalid contracts and OpenAPI; Python fixtures; PHP 22 fixtures, 3 RFC 8785 vectors and 45 assertions; research-index/link integrity |
| research discovery guard | 119/119 indexed, 556 relative links, 0 broken, 5/5 hubs | tracked public research is reachable and local Markdown links resolve |
| core suite | 140/140 | deterministic engine, three-axis verdict, rules, Unicode, fixes and receipts |
| G1 contract gate | 14/14 | frozen schema/contract and cross-language identities |
| G2 browser/core gate | 24/24 | Chromium, Firefox and WebKit parity and browser safety boundary |
| local-package gate | pass | local package boundary and imports |
| TypeScript client/CLI package gate | pass | dependency-closed client and command package boundary |
| fixture battery | 129/129 | shipped-claim guards, cross-surface invariants and calibrated fixture batteries |

These results apply to the current source tree. They do not, by themselves, prove that a
WordPress ZIP, Chrome ZIP, npm tarball, Astro archive, wheel or sdist was built from that tree.

## Current website result/PDF candidate

Renewed on 1 September 2026 in the separate canonical website checkout, branch
`codex/checker-result-evidence-readiness`. This is tested local-candidate evidence: the six website
changes are committed locally as `8994e990` (`fix checker report evidence consistency`) but were
not pushed or deployed.

| Check | Result | What it proves |
|---|---:|---|
| checker unit suite | 263/263 | current score/label, evidence and report logic |
| checker component suite | 79/79 | result-card and interaction behaviour |
| live responsive/keyboard/overflow | 6/6 | current result flow at the tested viewports and keyboard path |
| on-device toolbar PDF/share | 1/1 | local route report/share action |
| print-media evidence/PDF | 1/1 | printable evidence card, section labels and report-only visibility |
| final website build | 717 pages | candidate integrates into the complete website build |

The remaining PDF-only rounding collision was reproduced before correction: margins 0.9655 and
0.9685 carried different bands but both chart labels rendered as 0.97. The shared run-wide
formatter now prints 0.966 and 0.969. The regression extracts both exact values and the
`Why it reads this way` / `The strongest passage shaped the result.` text. A genuine branded
11-page A4 PDF (41,205 bytes) was visually inspected on every page; Chromium's print flow produced
a genuine 6-page A4 PDF with the evidence card and distinct section labels, while toolbar, share
and “Show in draft” controls stayed print-hidden. Diff and repository checks passed.

The live EU raw-AI route also returned two Cycle-5 sections and a visible Why card. That live-flow
observation does not make the locally committed PDF/formatting correction deployed.

## Cycle-5 model and service tests

| Suite | Current result | Boundary |
|---|---:|---|
| segmentation contract | 12 passed | `segments-v3` boundaries and refusal behaviour |
| input-normalisation contract | 9 passed | the model-selected raw/normalised input path |
| structural-feature parity | 3 passed | eight-feature order, full-vector goldens and normalisation semantics |
| aggregation/margin route | 12 passed | margin-space document rule and response contract |
| paced global allowance | 14 passed | flat default and optional 3,000-burst/375-per-hour accrual path |

The aggregation and pacing suites emit one dependency deprecation warning from the current
Starlette/httpx test stack; the assertions pass.

The Cycle-5 training record reports all eight selection gates passing at epoch 1. Epoch 2 was
rejected because int8 verdict flips reached 1.08%, above the 1% gate. The selected export measured
0.19% long-form verdict flips and 97.8% to 97.6% AI detection moving from fp32 to int8 on the full
long-form set. The detailed denominators and exclusions are in
[`CYCLE5-REPORT.md`](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md).

## Current production evidence

Revision `opace-detector-00010-4dt` passed the following deployment-specific checks on 1 September
2026:

- Cloud Run served 100% of traffic and advertised `tier3-cycle5-full`, build
  `45e00978b10d1df6`, fp32, `segments-v3`, `raw-v1`, `features-v1` and `margin-v1`;
- a real alert-policy trigger activated the kill switch in 31.80 seconds and the endpoint was
  restored to its byte-equivalent health response;
- ten fresh body markers sent through scoring, size, length, malformed, origin, automation,
  token and rate-limit paths produced zero log hits; a separate canary proved the search worked;
- 7,000 words scored and 8,500 words were refused at the advertised 8,000-word ceiling;
- an AI long-form sample reproduced its fitted margin exactly, a markdown-heavy human sample
  stayed clean on `raw-v1`, and a 160-word AI sample flagged on the deployed path.

This evidence is valid only for revision `opace-detector-00010-4dt`. Any redeploy requires the
kill-switch and body-marker drills to be repeated. A real billing-cap breach and a real sustained
flood were deliberately not exercised.

The owner field test of the live checker recorded 3/3 AI documents as Strongly AI and 0/4 human
documents falsely flagged; two health-authority documents returned Unclear. This seven-document
check is useful product evidence, not a population accuracy estimate.

## Current model measurements

| Measurement | Runtime and operating point | Result |
|---|---|---|
| full long-form corpus | server fp32, `segments-v3`, `raw-v1`, `features-v1`, margin 3.570935/gap 0.34 | 902/922 AI flagged; 46/4,636 human false positives |
| full long-form corpus | browser int8/WebAssembly, same contract and margin rule | 900/922 AI flagged; 73/4,636 human false positives |
| Cycle-5 evaluation view | server fp32, same operating point; 247 AI and 136 human documents excluded for documented Cycle-5 overlap | 658/675 AI flagged; 42/4,500 human false positives |
| independent matched topic bucket | server fp32 | 153/176 AI flagged; 1/418 structured human partners falsely flagged |
| short-form held-out test slice | server fp32 | 43/56 AI at 100 words; 61/63 at 300; 67/68 at 400; 74/77 at 600 |
| human fiction evaluation view | server fp32 | 7/227 false positives |

The full 5,558-document corpus is not wholly independent of Cycle-2 training: 268/922 AI and
11/4,636 human documents overlap a Cycle-2 split. The Cycle-5 evaluation view is held out from
Cycle-5 train/calibration but was used to fit the operating point. Neither view should be described
as an untouched post-fit benchmark.

## Three-axis and writing-rule evidence

The current engine enforces three independent outputs:

- `ai_probability`, set only by a trained model;
- `text_integrity`, set by deterministic character/provenance findings; and
- `editorial`, set by writing suggestions.

The writing tier contains 116 named rules across 113 weighted categories plus three en-gb rules.
On the 5,558-document long-form corpus it detected 45.1% of AI writing and flagged 24.8% of human
writing. It therefore remains editorial-only and cannot change an AI reading.

## Package evidence state

Historical G1/G2, WordPress, Chrome, Astro, npm and Python package passes remain valid records for
the exact hashes they name. They are not current publication evidence when source, version,
listing copy, bundled dependencies or candidate bytes have moved.

Current exact local technical gates are now green for:

- the five 0.1.0 shared npm tarballs and manifest;
- the Astro 0.1.0 tarball;
- the Python 0.1.0 wheel and sdist; and
- the Chrome 1.0.0 ZIP; and
- the WordPress 1.0.8 ZIP.

Their exact SHA-256 values are frozen in
[`RELEASE-STATE.md`](RELEASE-STATE.md#locally-verified-exact-candidates). Deterministic package,
extraction/content, clean-consumer/install, runtime/browser and surface-appropriate privacy and
accessibility gates passed for those named bytes. `@opace/watermark-lab` remains private/demo-only
and is not part of the npm publication set. The tracked cross-surface exact-candidate matrix is
`tests/evidence/publication-readiness-2026-09-01/EXACT-CANDIDATES.md`; WordPress's exact-final record
is `wordpress/opace-ai-content-integrity/tests/evidence/g4/1.0.8/RELEASE-GATE-SUMMARY.md`.

WordPress 1.0.8 adds this exact evidence: SHA-256
`b7b2c411862c6407ade38edbf95022f2f237c2dda63f80d9e1fae143ca63ce03`; 10/10 independent
builds byte-identical; installed-byte parity on WordPress 6.5.5/PHP 7.4, WordPress 7.1/PHP 8.3
and per-site Multisite; Plugin Check 2.1.0 with no errors minimum/current; network activation
refused and per-site activation passed; exact-final 1280/375 flows minimum/current with zero
requests, zero axe violations and zero console errors; C2PA UI guard and receipt checks passed.
Chrome's exact candidate ran in Chrome for Testing 151. An exact Chrome 145 binary was unavailable,
so the renewed evidence does not claim an exact-minimum-version 145 runtime pass.

For the publication-readiness pass, each surface must generate a fresh evidence bundle containing:

1. final candidate path, version and SHA-256;
2. repeat-build and extraction diff;
3. source-to-package inventory and unsafe-path/secret/local-path scan;
4. clean install or consumer test;
5. surface-specific runtime and compatibility matrix;
6. keyboard, responsive and accessibility results; and
7. proof that current Cycle-5 copy, overlap disclosure and the C2PA credential guard are in the
   exact candidate.

Until that bundle exists, its technical release-gate state is **open**, even if current source
tests pass. For every exact byte set named above the local technical bundle now exists;
registry/store/account/owner-acceptance gates remain separate and open.

## Open manual and external gates

- installed-extension native toolbar/context-menu and assistive-technology journeys;
- WordPress owner-environment Safari/VoiceOver journey;
- registry/store accounts, 2FA, submission and post-publication verification;
- real spend-cap enforcement and sustained-flood behaviour;
- controlled same-corpus competitor comparison, deliberately parked to the next phase.

The current release matrix is [RELEASE-STATE.md](RELEASE-STATE.md). Measurement sources are mapped
in [EVIDENCE-INDEX.md](EVIDENCE-INDEX.md).

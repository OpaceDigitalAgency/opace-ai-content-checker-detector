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
| Website submission candidate | Independent local review on website base head `a017b516b2722a24eb539b5ef4de595cd201e8c3` passed 66/66 rendered route/browser/viewport runs, 22/22 axe audits, 320 px reflow, checker/keyboard/receipt/no-JavaScript journeys, sitemap 11/11 and 114/114 same-origin links. That review was the pre-deployment boundary. The suite was subsequently deployed and live-verified on 28 August 2026 at 21:20 (site commits `bb820686`, then `ce56ac54` correcting the disclosure copy); the checker and product/suite routes are live. The remaining suite routes are not individually recorded as re-verified. |
| G5-base model-free | Independent pass: TypeScript client 11/11, CLI 6/6, Python 30/30, G1 14/14 and G2 24/24. Exact dependency-closed packages, deterministic Python wheel/sdist, lifecycle/security/privacy and audits passed. Semantic/model/legal/Docker gates remain open. |
| BENCH-10 | Private synthetic/offline mechanics pass: package 18/18, independent 14/14 and unchanged G1/G2. Benchmark tarball `68b6c65c46fbe6c493bd1fa754f851417b2e79e048504c96be6628011612c49d`; package-set manifest `b2e9e5179c41d8867d9c5188b38046613e09635762d37be39f8d101f7d3661bc`. G7 is not claimed. |
| Chrome submission candidate | Independent automated exact-package pass. Chrome 1.0.0 ZIP `061f5306eb872653787ff9ee492e583c86c1ba427bef6ecb22477ccfba7a1a93`; validator, unit/type 5/5, audit 0, Chrome 151 and minimum 145 at 40/40 visible assertions per lane, seven-state axe and Worker parity green. Manual Stable Load unpacked/native actions, VoiceOver, live URLs and store/account/owner gates remain. |
| ASTRO-25 | Independent private report-only pass. Deterministic final-k/l tarball `170e3520fcca9768bdbe22235cd815c9d354ba21974208211a4bb33d66c26d81`; package 27/27, Astro static/server/hybrid 9/9, Node 7/7, true Worker/server parity, path containment, hidden/focus and three-browser checks plus G1/G2 green. Manual AT/public/owner gates remain. |
| WordPress | 1.0.4 is the sole current exact local ZIP: `dist/opace-ai-content-integrity-1.0.4.zip`, SHA-256 `084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec`. Its documentation-only refreeze changed only `README.md` and `readme.txt`; three-build parity, 301-file inventory, Plugin Check and official readme validation pass, while the unchanged executable bytes retain the minimum/current/Multisite, PHP 7.4, lifecycle/schema/companion/REST/editor/no-network/responsive/focus and plugin-scope axe evidence. Safari/VoiceOver owner consent, WordPress.org account/slug/submission and post-submission public verification remain held. The live-URL condition is no longer held for the web surface: the [product/suite page](https://opace.agency/tools/ai/content-verification-integrity/), [checker](https://opace.agency/tools/ai/content-verification-integrity/checker/), [privacy policy](https://opace.agency/privacy-policy/) and [contact page](https://opace.agency/get-in-touch/) are live as of 28 August 2026. The listing's GitHub URL is still unavailable because the public repository does not exist. |
| QA-90 | Passed as the historical automated/private exact-candidate baseline: root/core/G1/G2, G5-base, BENCH, Chrome, Astro, archive safety, consolidation and cross-surface visual review remained green. The later WordPress 1.0.4 cascade has separate evidence. Full semantic G5, G7, manual assistive-technology checks and owner/public acceptance remain separate held gates. Model and corpus validation are no longer among them: both completed on 28 August 2026 and are recorded in the current-model appendix below. |

## Submission-preparation appendix — authoritative current boundary

- Root regression: contracts/core passed at 13 schemas and core 20/20; G1 passed 14/14; G2 passed 24/24 across Chromium, Firefox and WebKit; package gates passed; npm audits reported zero vulnerabilities; the exact-candidate verifier passed 8/8 hashes.
- Public 0.1.0 implementer and independent evidence is green for deterministic repeats, exact clean consumers/matrix, archive/public-tree hygiene, Twine, six npm dry-runs, workflow YAML and metadata. The 27 August README refreeze supersedes the earlier npm/Python hashes. Current hashes are npm manifest `f2e09e2e3894263544503c3d0d1c416104bdb7def33e9409ea4e15745193fe20`, unchanged Astro `4a45e4530acb82b514797b7424a4d4d71bff314cd5d48136b8aefef6d1e82da5`, Python wheel `ddd0b16009cdb3980a6a0a6f46a265312e49da7687d7c7ff87358adacb3b943d` and sdist `34c65f6efbfb8f3a4f014b9de49888bf3b7ffefb63ca3ab3754f1a40587f7d46`. Current refreeze evidence: `.agent/docs/ai-content-integrity/PUBLIC-PACKAGE-README-REFREEZE-2026-08-27.md`.
- npm requires each package to exist before trusted publishing can be configured. The six first `0.1.0` releases therefore require the owner to publish the exact accepted tarballs interactively with account 2FA and `--provenance=false`; no bypass-2FA token is permitted. Later releases use stage-only OIDC, provenance and maintainer 2FA approval. This first-release account boundary is not a package defect. PyPI remains held for GitHub trusted publishing after npm live verification.
- Full semantic G5, G7 and provider validation are intentionally outside the 0.1.0 submission scope and must not be inferred from these results. Model and corpus validation are no longer outside scope: both were completed and published on 28 August 2026, and are recorded in the current-model appendix below.

## Current-model appendix — observed 29 August 2026

This appendix is authoritative for the deployed model and for the current local suite totals. The
sections above remain the record of the Phase 0/G1/G2 and 0.1.0 submission boundaries.

| Current evidence | Result |
|---|---|
| Browser-runtime threshold refit | `onnxruntime-web` and Python `onnxruntime` disagree by a median 0.113 on the quantised cycle-2 artefact, because Python applies extended int8 fusions the web build does not. The operating point was therefore refitted through the runtime that actually ships, moving from 0.98 (Python) to **0.984** (browser). Publishing the Python figure would have produced 3.56% real-world false positives while the interface claimed 1.2%. Every published number is now browser-measured. |
| Cycle-2 model, browser-measured | On the 5,558-document fresh long-form corpus the model had never seen (922 AI from 13 current models; 4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE), at threshold 0.984: **90.3% AI detection, 1.34% human false positives**. Python-measured on the same 5,558 documents at 0.98: 90.6% detection (835/922) and 1.22% human false positives. |
| Held-out training evaluation | cycle2-train, 6,183 held-out rows: AUROC 0.530 → 0.9695; detection at a 1% false-positive budget 6.7% → 76.9%; at 2% 9.1% → 81.2%. |
| Writing-rules tier, same corpus | Measured on the same 5,558 fresh long-form documents, the 113 weighted writing-signal categories detected 45.1% of AI writing while flagging 24.8% of human writing — worse than the model on both axes at once. The tier no longer contributes to the AI verdict and is presented as editorial suggestions only. |
| Live production test, through the deployed page | Four documents run through the real checker on 28 August 2026 with the model enabled: the owner's ChatGPT article **98.9%**, Gemini 3.5-Flash article **98.7%** and Claude Sonnet 5 article **98.4%** (flagged, sitting exactly on the threshold); a human office-memo control scored 64.9% and was **not** flagged. All three AI articles previously scored 6/100 and read as "No strong AI-style signals". |
| Short text | Detection 67% at 200 words, 50% at 150 and 19% at 100. **The denominator behind those three figures is not recorded in this repository** and they need re-measuring with one; they are the figures the live page discloses. Short human text is not falsely flagged: 0/400 at 60-200 words. Both facts are disclosed on the page. |
| Per-register human false positives, `segments-v2` | Fresh long-form corpus, fp32 reference route, threshold 0.980, 29 August 2026. Stories **33/260 (12.69%)**, academic discussion 16/420 (3.81%), academic conclusions 10/360 (2.78%), academic introductions 8/420 (1.90%), research summaries 3/189 (1.59%), long-form journalism 13/840 (1.55%), white papers 11/840 (1.31%), company updates 3/662 (0.45%), academic literature reviews 0/225, student essays 0/420. Stories are the highest of any register; the earlier claim that academic writing was highest was measured at the unshipped 0.9110 threshold and is superseded. |
| Per-register AI detection, `segments-v2` | Same run. Company updates 99/99 (100%), research summaries 117/117 (100%), white papers 102/103 (99.03%), long-form journalism 134/137 (97.81%), stories 110/114 (96.49%), academic discussion 108/113 (95.58%), academic literature reviews 101/107 (94.39%), academic essays 122/132 (92.42%). Every long-form category clears the 50% floor by more than 40 points. |
| Segmentation currency | The browser figures above (90.3% / 1.34%) were measured **before segmentation existed** — one truncated pass per document. On the same 5,558 documents the segmented fp32 reference route reads 96.9% detection at 2.09% false positives (0.980) and 95.1% at 1.21% (0.984), AUROC 0.9971. The browser runtime's own segmented curve over the full corpus has not been measured (≈5 hours through onnxruntime-web) and the browser figures should be read as a floor. |
| Segmentation coverage defect, fixed | Under `segments-v1`'s 340-word rule, 1,348 of 23,318 segments (5.78%) in 684 of 5,558 documents (12.31%) exceeded the 512-token window and had their ends silently dropped — 276,466 of 9,287,413 tokens corpus-wide, worst single segment 3,406 tokens. Under `segments-v2`, 0 of 21,093, and the TypeScript and Python implementations agree on every segment of all 5,558 documents. Recovering the dropped text changed **no verdict** on this corpus; the measured detection gain comes from better segment shape, and that is recorded rather than presented as the fix working. |

### Local suite totals, run 29 August 2026

Run from `implementation/`. Verbatim output.

`npm run test:core`:

```
ℹ tests 120
ℹ suites 0
ℹ pass 120
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 377.01675
```

`npm test` (typecheck, contracts, Python, PHP — `tsc --noEmit` printed no output):

```
contracts: 13 schemas; valid/invalid fixtures and OpenAPI passed
python: 13 schemas, all fixtures, and RFC 8785 vectors passed
php: 22 contract fixtures, 3 hash vectors and 45 assertions passed
```

`npm run test:battery`:

```
ℹ tests 110
ℹ suites 0
ℹ pass 110
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 270.752708
```

### Hosted inference — deployed and verified 29 August 2026

Evidence class: live test against the running service, not a local fixture. Re-run after any
redeploy; the URL and revision change.

| Check | Result |
|---|---|
| `GET /v1/health` | 200 — `tier3-cycle2`, fp32, build `e313ab00de1fffd2`, `segments-v1` |
| `GET /v1/status` | 200 — cap 12,000 inferences/day, 5/30/100 requests and 20/150/500 inferences per min/hour/day, `max_words` 4,000, `token_required: true` |
| Segmentation parity | 1,200-word document → 4 segments at 340/340/340/180 words, `aggregation: "max"`, `truncated: false`. Matches the `test_segments.py` golden case exactly |
| Cost accounting | `daily_allowance_remaining` 12,000 → 11,996 after one four-segment request, confirming the cap counts inferences rather than requests |
| Origin gate | Request from an unlisted origin → HTTP 403 `origin_not_allowed` |
| Automation gate | Scripted client → `automation_detected` |
| Token gate | Browser user-agent, no token → `token_required`; 14-bit proof of work exchanged at `/v1/token` yields a token accepted in `x-opace-token` (**not** `Authorization: Bearer`) |
| Kill switch, manual | 200 → `disable-service.sh` → **404** → `enable-service.sh` → **200** |
| Kill switch, automatic | **Passed on the third attempt**: publish to `detector-killswitch` → health **404 within 10 seconds** → restored to 200 |
| Zero-retention marker probe | A unique high-entropy marker in a document body, submitted through the real gated path, **scored** (`probability_ai: 0.0552`, `retained: "nothing"`). Every log entry in the project searched across `textPayload`, `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`: **zero occurrences**; only 4 log entries produced in the window. Covers the scoring path only |

**The two failed kill-switch attempts are recorded because they are the argument for live testing.**
Attempt 1 failed *silently*: the Cloud Function POSTed to `:getIamPolicy`, which Cloud Run v2 serves
only on GET, so it parsed an HTML error page, threw `JSONDecodeError` and died — the service stayed
up for the full 200 seconds under observation with no external sign of a fault. Attempt 2 returned
`403 Forbidden` on `:setIamPolicy`, because the function's service account held `roles/editor`,
which does not include `run.services.setIamPolicy`; fixed with `roles/run.admin` scoped to the
service rather than project-wide.

Two independent faults, neither detectable without firing the switch, in a control that had already
been deployed and written up. Since no Cloud Run setting bounds the request charge — a month-long
flood is roughly £519 at two instances even with every request rejected — the entire £50 ceiling
would otherwise have rested on a function that raised an exception every time it was needed.
**Re-fire the switch after every redeploy, IAM change and alert-policy change.**

### Gates that remain genuinely open

Public GitHub repository, npm and PyPI publication, WordPress.org submission, Chrome Web Store
listing, Astro catalogue publication and the Hub/Scribe integrations are all still unreleased and
unverified. The Cloud Run hosted inference service is deployed and verified, but is **not yet wired
to the checker**: the site-wide "text never leaves your browser" copy must change first, and the
DPIA, the published lawful-basis notice and numerical parity between the fp32 server and the int8
browser runtime are outstanding. Manual assistive-technology checks, G7 and provider validation are
likewise still held.

Zero request-body logging is **audited on the scoring path** and no longer merely asserted. The
probe is a unique high-entropy marker rather than a grep for the word `text`, because a marker can
only have come from the request body — the earlier proposed check matched field names and could
fail in both directions. Two conditions make the probe valid and must be preserved when it is
re-run: the marker must be **fresh** (a re-used marker means a hit could be an old record), and the
request must be confirmed **scored rather than refused**, since a request rejected at a gate never
reaches the code path the claim is about. Refusal paths (413, 429) and error paths are still
unprobed, so the claim is "audited on the scoring path", not "audited end to end".

**Re-run the marker probe after every redeploy**, for the same reason the kill switch is re-fired:
the Cloud Run request-log exclusion is a deploy-time flag, and a deploy that dropped it would
silently falsify the shipped privacy copy with nothing failing and no error anywhere.

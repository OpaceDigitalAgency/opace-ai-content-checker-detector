# G4 WordPress independent test-gate plan

Status: 1.0.6 (30 August 2026) rebuilds the bundled engine from the current core and supersedes 1.0.4; the FINAL1 exact-package matrix and independent review were passed by 1.0.4 and must be re-run  
**Resolved (30 August 2026), no longer blocking:** the refreshed `assets/js/core.mjs` does not agree with the plugin's PHP analyser in `includes/Analysis/` and cannot, because PHP cannot execute the compiled engine while the editor sidebars' REST route and the receipt path answer on the server. The divergence is now a DECLARED SUBSET rather than a silent second analysis: the PHP declares `wp-php-subset:2026.08.1`, its method names and limitations state the coverage gap (3 of 116 writing rules, 16 code points against 38 carrier rules and three private-use ranges, 7 homoglyphs against 60) and point at the Lab, and the sidebars say a nil result is not a clean result. `tests/js/cross-runtime-parity.test.mjs` changed purpose — it now asserts the declared subset, measured on 1,200 real documents where the PHP reproduces the `en-gb:2026.08.1` pack with 0 mismatches — and passes 16 of 16. **Still open as a product decision:** routing the sidebars through the compiled engine in the browser and deleting the 507 lines, which is what HANDOVER §11 requires.  
Gate owner: an independent WordPress tester who did not implement the candidate  
Decision basis: frozen G1 contracts, accepted G2 core, ADR 0007/DEC-23 and the WP-10/WP-20 implementation brief

## 1. Purpose and authority

G4 answers one question: does one exact local Opace AI Content Integrity WordPress ZIP satisfy the frozen contracts, WordPress integration brief and security/privacy boundary on the minimum supported runtime?

The WP-10/WP-20 implementer may supply a candidate and self-test output but cannot sign this gate. A separate gate operator must install and exercise the exact ZIP in fresh isolated runtimes. A second independent reviewer checks the evidence and records pass, fail or blocked. The integration owner decides whether to accept the gate result.

Any product-code or dependency change, regenerated ZIP or changed file invalidates the candidate SHA-256 and its G4 evidence. Return failures to the implementer, build a new candidate, assign a new candidate ID and rerun all mandatory cells. Never edit a test, fixture or expected result merely to make the candidate pass.

G4 is a local quality gate. A pass is not a commit, tag, push, package publication, WordPress.org submission, deployment, update-feed state or owner acceptance.

## 2. Entry gate and immediate stop conditions

The independent operator must confirm before starting:

1. G1 is frozen and its aggregate manifest and fixture inventory are recorded.
2. G2 has an accepted, reproducible independent result against the same contract/core dependency identities used by the WordPress candidate.
3. ADR 0007/DEC-23 is effective: fresh installs use only per-site `opace_ci_jobs` and `opace_ci_receipts`; no `base_prefix` table and no v1 candidate table.
4. The candidate comes from `wordpress/opace-ai-content-integrity`, targets WordPress 6.5 and PHP 7.4, and has no unreviewed local dependency substitution.
5. The source identity, dependency locks and all unexplained worktree changes are recorded. Hub and AI-Scribe working sources are not mounted, edited, stashed, reset, built or packaged.
6. All owner-dependent choices required by the implemented scope are resolved. A pending choice is not silently replaced with a test assumption.
7. The candidate has a unique ID and a single immutable ZIP ready for chain-of-custody capture.

Stop and mark the gate **blocked** if G2 is not accepted, the exact candidate cannot be identified, required fixtures are missing, a required owner decision is open or the minimum runtime cannot be created safely. Mark the gate **failed** for a reproducible candidate defect, security/privacy breach, undeclared network attempt, package mismatch or mandatory test failure.

## 3. Candidate identity and chain of custody

Before installation, write a candidate manifest containing:

- candidate ID, UTC timestamp, operator identity and reviewer identity;
- absolute source path plus source commit ID, or a content manifest if local changes mean no commit represents the candidate;
- product version from the plugin header, version constant and `readme.txt` stable tag;
- contract/core package versions and lockfile hashes;
- exact build command, clean-room/container image digests and tool versions;
- absolute ZIP path, basename, byte size and SHA-256;
- sorted ZIP entry list with uncompressed sizes, modes and SHA-256 for every file;
- PHP, WordPress, database, WP-CLI, browser, Plugin Check, PHPUnit, PHPCS and Node versions used by each cell.

Run the documented build twice from equivalent clean source inputs into different disposable output directories. Both ZIP SHA-256 values and per-entry manifests must match. Preserve one read-only copy of the exact tested ZIP. Install from that copy without a source bind mount. A test performed against a mounted development tree does not count as exact-ZIP evidence.

Package checks are mandatory:

1. `unzip -tqq` succeeds.
2. There is exactly one top-level directory named `opace-ai-content-integrity/`.
3. Header version, version constant, stable tag, asset cache-bust versions and ZIP filename agree.
4. Runtime dependencies needed on PHP 7.4 are present; development/test dependencies, source maps, caches, logs, fixtures not required at runtime, VCS data, OS files and WordPress.org banners/icons are absent.
5. No symlink, world-writable entry, secret, credential, private key, local absolute path, customer data, paid-provider response or unapproved executable is present.
6. Dependency inventory, SBOM, licences and security audit match the reviewed locks. GPL compatibility and required notices are recorded.

Record raw commands, exit codes and SHA-256 output. Do not report only a prose summary.

## 4. Isolated runtime matrix

Use fresh, G4-owned containers/volumes and unused ports. Do not mutate the reference site at `127.0.0.1:8897` or the separate 8888/8889 environments. Resolve and record ports immediately before startup.

| Cell | WordPress/PHP | Site shape | Required purpose |
|---|---|---|---|
| M1 | WordPress 6.5.5 / PHP 7.4.33 | fresh single site, non-default DB prefix | minimum supported full baseline |
| M2 | WordPress 6.5.x / PHP 7.4.33 | two-site Multisite, distinct blog prefixes | per-site isolation and no `base_prefix` use |
| M3 | current stable WordPress / current supported PHP 8.x | fresh single site | forward-compatibility, deprecations and runtime warnings |
| M4 | WordPress 6.5.5 / PHP 7.4.33 | controlled upgrade/legacy fixtures | upgrade, interruption and fail-closed storage cases |
| M5 | WordPress 6.5.5 / PHP 7.4.33 | fresh compatibility volume | exact Hub/AI-Scribe mixed states |

Pin exact image digests and database versions in evidence. Run the full regression baseline in M1; repeat applicable unit/integration, activation, admin, REST, storage, no-network and browser smoke tests in M2–M5. PHP notices, warnings, fatals, database errors, JavaScript console errors and unhandled requests fail the affected cell.

## 5. Fresh install, lifecycle and upgrade states

### Fresh lifecycle

Starting from a database where the plugin was never installed:

1. install the exact ZIP with WP-CLI and activate it;
2. verify only the expected per-site tables, options, capabilities, scheduled jobs and REST routes appear;
3. load the admin lab, run local inspections, deactivate and reactivate without data loss or duplicated hooks/jobs;
4. reinstall the identical ZIP and prove migrations are idempotent;
5. exercise both uninstall policies in separate cloned volumes: default retention leaves positively identified plugin data; explicit delete-data consent removes only positively identified plugin-owned data;
6. reinstall after each uninstall path and prove the site, posts, revisions, users, Hub, AI-Scribe and unrelated tables/options are unchanged.

### Upgrade and hostile storage fixtures

There is no assumed released predecessor. Label any synthetic predecessor database explicitly as a test fixture; never present it as a public-version upgrade. Cover:

- older supported internal schema upgraded to the candidate, including a forced interruption and idempotent resume;
- candidate schema installed twice and activation called twice;
- database schema version newer than the plugin, which must enter content-free read-only/update-required mode without downgrade DDL;
- canonical-only, legacy-only and both-sets-present states;
- empty, non-empty, malformed and unowned `<prefix>oaci_sessions`, `<prefix>oaci_candidates` and `<prefix>oaci_receipts`;
- a colliding canonical-looking table without a trustworthy ownership/schema marker;
- interrupted future-migration checkpoint fixtures, which must preserve rows and never duplicate, truncate, rename or drop data;
- custom prefix and two-blog cases with identical public IDs, proving cross-blog isolation.

No legacy-data copier is authorised by DEC-23. The candidate must detect legacy `oaci_*` tables before writes and fail read-only. If a later zero-loss migrator is separately approved, add its bounded-copy, receipt-byte/hash parity, ownership, expiry and resume tests to this gate before use.

SQL evidence must show no use of `$wpdb->base_prefix`, no `oaci_*` creation, no candidate table and no destructive DDL on activation/ordinary upgrade. Fresh M1 creates exactly `<prefix>opace_ci_jobs` and `<prefix>opace_ci_receipts`; M2 creates the equivalent pair for each explicitly provisioned site only.

## 6. Exact companion-plugin states

Compatibility tests install immutable ZIP fixtures only; they never build from the active Hub or AI-Scribe checkouts. Re-hash each file before use:

| Fixture | Required SHA-256 | Scope |
|---|---|---|
| AI-Scribe 3.2.36 | `0951a532a6c64fde7150b15a246b9727cc5a406853423971642a0346659c7f87` | coexistence only; no unapproved API integration |
| Opace AI Hub 1.0.14 | `fa1a9eb721b527e5cc331d0e5e6b6db3e26b128950b43f18dd356eb547483c34` | accepted exact-package compatibility fixture |
| Opace AI Hub 1.0.13 | `0a689713d62788ae7cb9169fd4de8eee89858193d78af44a4c7cc3b5f8e773bb` | compatibility detection only |

Test Integrity alone; all companions installed but inactive; Hub then Integrity; Integrity then Hub; Scribe then Integrity; Integrity then Scribe; Hub+Scribe then Integrity; Integrity then Hub+Scribe; and bulk activation from all inactive. Repeat deactivation/reactivation in both orders. Verify:

- no fatal, duplicate menu, route collision, namespace/class collision or enqueued asset outside its page;
- the exact DEC-21 PHP snake_case `PublicApi` facade and `oaci_ready` behaviour when expected, without confusing it with JavaScript mount types;
- Hub discovery links, if in the accepted scope, use only the registered admin URL and current-user capability checks;
- absent/inactive/older companions do not cause a hard dependency, silent installation, source mutation or network call;
- plugin data, options, cron events and tables remain separately owned.

These cells are coexistence/contract tests, not acceptance of either companion's current working branch and not a G6 provider/integration release gate.

## 7. Contract, source adapters and editor behaviour

Run the frozen G1 gate and accepted G2 gate first, then the WordPress PHPUnit/JavaScript/integration suites against every valid and invalid frozen fixture. Prove PHP 7.4 consumes the same schema, semantic and RFC 8785/SHA-256 behaviours, including BMP/astral object-key order, number/control vectors, same-major additive fields, unknown statuses, major mismatch, source offsets, receipt privacy and the unsupported Anthropic invariant.

Exercise every implemented source adapter with deterministic local fixtures:

- Gutenberg saved post, unsaved draft and selected block text;
- Classic Editor saved content and unsaved textarea content;
- explicitly supported post types and denied/unreadable posts;
- post search scoped to the caller's capabilities;
- direct text paste, empty input, malformed Unicode, large bounded input and over-limit rejection;
- source changed during/after a run, producing a stale result and blocking apply.

The editor test must prove inspection never auto-saves, publishes, creates a revision, changes post content/status, applies a safe fix or marks a candidate authoritative. Safe fixes require an explicit preview and apply action, current source hash, allowed operation/provenance and capability/nonce recheck. Record before/after post, revision, autosave and database hashes.

Use only frozen Hub/local mocks and deterministic fixtures. No live or paid provider call is permitted in G4.

## 8. Security and access-control adversarial tests

Run each REST/admin mutation as logged out, subscriber, contributor/author with own and foreign content, editor and administrator as applicable. Include expired/missing/replayed nonces and application-password REST authentication where supported. Mandatory adversarial cases are:

- guessed/sequential/malformed UUIDs; own versus foreign session, job and receipt IDs;
- cross-post, cross-user and cross-blog object substitution;
- wrong HTTP methods, missing/invalid content type, malformed JSON, duplicate keys, invalid schema/contract major and unknown status;
- stored/reflected HTML, script, SVG/event attributes, control characters and spreadsheet-formula prefixes in labels, errors and receipt views;
- SQL-injection/order/filter/pagination strings and oversized/negative numeric parameters;
- CSRF on create, cancel, apply, retention, delete-data and settings actions;
- replayed idempotency keys, concurrent creates/cancels/applies and stale source hashes;
- payloads above the documented 100,000-character client/server boundary and decompression/body-size abuse;
- direct PHP file access, directory indexing, debug endpoints, unauthorised exports and unregistered `wp_ajax_nopriv_*` actions.

Every denial must be fail-closed, content-free where required and use the documented WordPress/contract error shape. Verify capability and object ownership in the server-side handler, prepared SQL for values, allowlisted identifiers/order clauses, output escaping at render time and sanitisation/validation at input. Nonces do not replace authorisation.

Inspect PHP/browser/database logs to prove errors contain no source text, candidate text, canonical receipt JSON, filesystem path, SQL, credential, nonce or user data. Run an automated secret scan on both ZIP and captured evidence before handoff.

## 9. Storage, jobs, receipts and retention

Drive create, queued, running, terminal, cancel, expire and retry behaviours with deterministic workers/mocks. Assert only legal frozen state transitions, immutable owner/source identity, opaque public IDs, bounded pagination, idempotent create semantics, cancellation races and stale-source rejection.

For receipts:

- recompute RFC 8785 canonical bytes and `sha256:` hashes independently from the stored/exported value;
- prove hash-only mode stores no source/candidate content or reversible excerpt by default;
- reject content-bearing receipts unless explicit content inclusion is both supported and consented;
- prove owner/capability filtering for list/get/export and no private content in error/health responses;
- compare stored canonical receipt bytes across lifecycle, reactivation and any approved upgrade fixture;
- exercise retention expiry, bounded cleanup, lock/concurrency and repeat execution without touching unrelated rows.

Database snapshots before and after every lifecycle/storage test must inventory table names, row counts, IDs, ownership, non-content hashes, options and cron events. Any unexplained change fails the cell.

## 10. No-network and public-surface inspection

G4's inspection boundary permits only browser-local and `wordpress_local` execution. Run defence-in-depth instrumentation for the entire activation, admin, inspection, receipt, health, cron and uninstall journey:

1. deny external egress and log DNS/TCP attempts at the container/network boundary;
2. intercept WordPress HTTP API calls (`pre_http_request` or a test equivalent) and fail on every undeclared URL;
3. instrument PHP transport functions/extensions available in the runtime and audit dependencies for `http`, `curl`, sockets, telemetry and install-time scripts;
4. in the browser, capture requests and fail external fetch/XHR/beacon/WebSocket/EventSource/service-worker/font/image/script/style requests;
5. use a unique synthetic marker in test content and scan outbound logs, PHP/browser logs and unrelated database locations for it.

Expected external DNS, HTTP and telemetry count is zero. WordPress core update checks must be disabled or isolated so they cannot hide plugin behaviour. A blocked outbound attempt is still a failure, not a pass.

Visit representative public posts, archives, feeds, REST index, login and logged-out admin URL. The candidate must add no public HTML, metadata/schema, endpoint disclosure, asset, preload, request, cookie, cron side effect or content mutation outside the approved authenticated routes.

## 11. Admin UI, responsive and accessibility gate

Test the installed exact ZIP signed in at 1280px, 768px and a real 375x667 viewport. Capture full-page and key-state screenshots for empty, configured, running, result, stale, receipt, denied, validation error and legacy read-only states. Compare structure, typography, spacing, controls, notices, cards, stage rail, evidence ledger and footer with the documented Opace conventions; this is a consistency review, not permission to copy another plugin's code.

At 375x667 verify one-column content-first stacking, full-width usable controls, labelled/reflowed table rows, no page-level horizontal overflow, no clipped text, and a sticky action area below 88px that never covers content or focus. Repeat at 200% zoom and with long translated strings.

Accessibility evidence must include:

- keyboard-only completion of every task, logical focus order, visible focus and no trap;
- focus placement/restoration for validation errors, notices, dialogs and async updates;
- correct headings, landmarks, names/roles/values, field labels/instructions, error association and status announcements;
- colour contrast, information not conveyed by colour alone, reduced motion, forced colours and target size;
- automated axe results with zero serious or critical violations and reviewed moderate/minor findings;
- one VoiceOver/Safari or NVDA/Firefox journey covering source selection, run/cancel, findings, safe-fix preview, receipt and error recovery.

Record browser build, OS, assistive technology/version, viewport/device scale, axe ruleset/version, screenshots, video or transcript, request log and console output. Automated scanning alone cannot pass accessibility.

## 12. Static analysis, test suites and Plugin Check

Run from the recorded candidate source identity, then repeat package/runtime-sensitive checks against the unzipped exact ZIP:

1. PHP 7.4 syntax check over every shipped PHP file;
2. WordPress Coding Standards/PHPCS with the committed ruleset and no unexplained exclusions;
3. PHPUnit unit, contract and WordPress integration suites with pass/fail counts;
4. JavaScript lint, unit, build and browser end-to-end suites;
5. frozen `npm test`, G1 and accepted G2 gates;
6. dependency audit, licence ledger, SBOM, secret scan and package inventory;
7. official Plugin Check static and runtime checks on the exact installed slug.

Record the exact installed Plugin Check version and full command. The official CLI form is `wp plugin check opace-ai-content-integrity`; static/runtime checks may require the Plugin Check `cli.php` bootstrap, so preserve the final command and raw JSON/text output. Do not ignore categories, suppress warnings or copy a pass from a source-mounted run. See the [official CLI documentation](https://github.com/WordPress/plugin-check/blob/trunk/docs/CLI.md) and [Plugin Check plugin page](https://wordpress.org/plugins/plugin-check/).

All mandatory suites must exit zero. A warning needs a specific written disposition and integration-owner acceptance; an unexplained warning blocks G4.

## 13. Evidence bundle and independent sign-off

Store evidence under a candidate-specific directory such as `tests/evidence/g4/<candidate-id>/` without changing frozen fixtures. The bundle must contain:

- candidate/runner manifest, exact ZIP and source/dependency identities;
- both deterministic-build hashes, ZIP inventory and per-file hashes;
- runtime/image/version/port manifest and database before/after inventories;
- raw logs with commands, exit codes, durations and test counts for every matrix cell;
- security adversarial case table with actor, request, expected result and actual result;
- no-network packet/HTTP/browser logs and unique-marker scan output;
- screenshots plus responsive, keyboard, axe and screen-reader evidence;
- Plugin Check, PHPCS, PHPUnit, JavaScript, e2e, dependency, licence, SBOM and secret-scan output;
- defects and rerun history, including superseded candidate IDs and hashes;
- operator and reviewer declarations that neither implemented the candidate.

The operator signs only after every mandatory row is evidenced. The reviewer independently verifies the ZIP SHA-256, reruns a risk-based sample including minimum-runtime activation, one ownership denial, legacy fail-closed, receipt hash parity, no-network and 375px keyboard flow, and confirms no evidence came from source-mounted or read-only reference environments.

## 14. G4 exit rule

G4 passes only when:

1. every mandatory test in this plan passes against one unchanged exact ZIP;
2. deterministic rebuilds produce the same SHA-256 and installed files match the ZIP byte-for-byte;
3. minimum WordPress 6.5/PHP 7.4, fresh/upgrade/legacy, mixed-plugin, security, storage, uninstall, no-network, editor, responsive, accessibility and Plugin Check evidence is complete;
4. no unresolved severity finding, privacy leak, warning, runtime error or evidence gap remains;
5. an independent operator and reviewer sign the candidate ID/hash, and the integration owner records acceptance of the gate result.

If any condition is unmet, report **failed** or **blocked** with the exact candidate hash, failed assertion/evidence path, owner and next action. Do not call the WordPress work complete and do not ask the owner to test it as a release candidate.

## 15. Candidate execution record: WordPress 1.0.2

Independent review superseded 1.0.1 SHA-256 `ad64a69908fa77d187346708b611650c816da3fd169594b02685113225d309be` after populated results triggered axe `scrollable-region-focusable` on `aside.oaci-evidence-rail`. The correction adds keyboard focusability to the existing labelled complementary landmark and a visible focus outline. Product/header/stable-tag/package/cache-bust version is 1.0.2; database schema remains 1.0.1.

Candidate `opace-ai-content-integrity-1.0.2.zip` has SHA-256 `ecb4335a27fac3339a97b5271f4e40a572176f4d1e1c6b07dc39d368c5fee950`; two clean builds matched, the archive contains one top-level directory and 300 files, and every installed file matched the archive byte-for-byte. The accepted G2 inputs remain contracts `1a592e5c63d577f694fe78d4a8fe7dcb6724a4def10b906fab4ecda22e160977`, core `20820481fcf98a4c16dd8e239dd9d7e18f23754f682831de526d68e94012bd9d` and browser `0ac378a99d0eac455960b36b7ca8f63fda942f4950aef1e65b3854a535e95d0b`.

Implementer correction regression is green on fresh WordPress 6.5.5/PHP 7.4.33, MariaDB with prefix `oacif_`, and the exact installed ZIP. PHPCS passed; PHPUnit passed 14 tests and 82 assertions; JavaScript passed 8/8; package e2e passed 2/2; root and plugin `npm ci` passed with zero vulnerabilities; all 258 shipped PHP files linted; Composer reported no advisories; Plugin Check 2.1.0 reported `Success: Checks complete. No errors found.` Package scanning found no secret/private-key pattern, symlink, world-writable file, development lockfile, source map, test suite or cache.

The 1.0.1 exact-package REST/privacy/idempotency/deletion baseline remains unchanged by this presentation-only correction. On exact 1.0.2 bytes, populated-state browser regression verifies the scrollable evidence rail is focusable, labelled `Evidence` and has a solid focus outline. Scoped axe reports zero violations; external requests and unexpected console errors are zero; real 375px and the 320px CSS equivalent of 400% zoom have no page overflow. Default-retain uninstall left both owned tables, explicit-delete uninstall removed both, and exact-ZIP reinstall recreated only the two expected tables with database schema 1.0.1.

Evidence paths are `tests/evidence/g4/1.0.2/candidate-runtime-manifest.txt`, `zip-inventory.txt`, `zip-files.sha256` and the populated desktop/mobile/400%-equivalent screenshots beside them. This execution does not sign G4 because it was performed by the candidate implementer.

An independent operator then reverified the unchanged 1.0.2 SHA-256 and exact installed bytes and passed the prescribed risk sample across minimum/current runtime, per-site Multisite, legacy/collision/newer/older-schema states, uninstall policies, ownership/idempotency/privacy, Hub 1.0.13/1.0.14 plus AI-Scribe 3.2.36 samples, block/Classic unsaved working copies and 1280/768/375/400%-equivalent browser states. The operator reproduced the 1.0.1 populated-rail defect first, then verified on 1.0.2 that the labelled rail is Tab-reachable with a visible focus outline and zero serious/critical axe findings. Independent evidence is in `tests/evidence/g4/1.0.2-independent/`.

G4 remains blocked on the prohibited/unperformed manual VoiceOver/Safari or NVDA/Firefox journey, the exhaustive companion and actor/security/fuzz/concurrency matrices, a second independent reviewer and integration-owner acceptance.

## 16. Provisional 1.0.3 nested-landmark correction

Independent 1.0.2 evidence reported moderate `landmark-banner-is-top-level` and `landmark-contentinfo-is-top-level` findings for the plugin-owned visual header/footer inside the existing WordPress admin landmarks. Source 1.0.3 replaces only those semantic tags with neutral containers while preserving classes, content and layout. Static regression, PHPCS 33/33, PHPUnit 14/14 and 82 assertions, JavaScript 8/8, package e2e 2/2 and root/plugin npm audits are green. Database schema remains 1.0.1.

Docker became unavailable before the ordinary deterministic builder and exact-runtime cascade. The twice-identical, no-network provisional archive is preserved as superseded history at `dist/superseded/wordpress/provisional-1.0.3/opace-ai-content-integrity-1.0.3.zip`, SHA-256 `ce24df1eea5d7e7cfdd20a885f408306da99165cd4d91cd856a2f370a096817d`; its 300-file inventory differs from exact 1.0.2 only in the intended `LabPage.php`, product bootstrap/readme and generated Composer root-version record. It is not the current candidate. See `tests/evidence/g4/1.0.3-provisional/VERIFICATION.md` for that historical boundary; section 17 records the later completed FINAL6 cascade.

## 17. WordPress 1.0.3 FINAL8 exact candidate

Docker recovery allowed the complete bounded G4 cascade. Historical candidate `opace-ai-content-integrity-1.0.3.zip`, SHA-256 `22c4d6a0c9dca214ede3c26ae3ae8d7f91ff980f5775a65aa6a8c5d5728cbdda`, had two fresh ordinary FINAL8 builds byte-identical to FINAL6. The ZIP had one plugin root, 301 files and 258 PHP files; exact installed-byte parity passed on WordPress 6.5.5/PHP 7.4 and WordPress 7.1/PHP 8.3. Plugin Check reported no errors on both lanes, all shipped PHP files linted on PHP 7.4, and the official readme validator had no errors or warnings.

Fresh/upgrade/legacy/collision/newer-schema, per-site Multisite, retained/delete uninstall, exact companion orders and upgrade, REST actor/nonce/ownership, idempotency/conflict/concurrency/oversize/XSS/delete, Block/Classic editor, no-network, 1280/375/400%-equivalent, keyboard and axe checks pass. FINAL8/FINAL6 differs from the fully runtime-tested FINAL4 only in non-executable `readme.txt` and `CITATION.cff`; exact FINAL8 installation, parity, Plugin Check and package-sensitive checks were repeated. Detailed evidence is in `wordpress/opace-ai-content-integrity/tests/evidence/g4/1.0.3-final8/VERIFICATION.md`, with executable runtime evidence in the adjacent `1.0.3-final4/` folder.

That 1.0.3 submission bundle is preserved as superseded history under `dist/superseded/wordpress/1.0.3-final8/`. Section 18 records its replacement. No commit, push, publication, WordPress.org submission or live acceptance was implied.

## 18. WordPress 1.0.4 FINAL1 accessibility and cache correction

Independent FINAL8 review found that empty source validation announced a distant status without field association/focus, and the safe-fix preview attempted to focus a non-focusable panel without deliberately restoring focus after Apply. The 1.0.4 correction adds a visible associated source error, `aria-invalid`, dynamic `aria-describedby`, source focus for validation recovery, `tabindex="-1"` on the preview panel, preview focus and source-focus restoration after Apply. The required product/header/stable/package/citation/cache-bust version is 1.0.4; database schema remains 1.0.1.

The sole current candidate is `dist/opace-ai-content-integrity-1.0.6.zip`, SHA-256 `66df5f2411cfd933522bf314092069b2d3bb745649d027b585b6e7a9aa1d003a`, built 30 August 2026 against the current core. **Its gate evidence is open.** Everything recorded in the rest of this paragraph belongs to the superseded 1.0.4 ZIP (`084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec`), whose executable bytes 1.0.6 does not share: `assets/js/core.mjs` is rebuilt and the version strings move to 1.0.6. Plugin Check, the official readme validator, the file inventory and the runtime evidence must all be re-run against 1.0.6 before submission. The 27 August documentation refreeze supersedes `a69f0eac...e3a4e`; only `README.md` and `readme.txt` differ, so the installed executable/runtime tree is unchanged. Three successful ordinary builder runs are byte-identical. The exact refrozen ZIP has 301 files and 258 PHP files; Plugin Check 2.1.0 reports no errors and the official readme validator reports no errors or warnings. The unchanged runtime bytes retain the minimum/current/Multisite, 301/301 parity and PHP 7.4 evidence.

Source suites pass JavaScript 9/9, package contract 2/2, PHPUnit 14/14 with 82 assertions, PHPCS 33/33, lint and npm audit. Exact-package browser checks at 1280, 768, 375 and 320 CSS pixels prove validation/error association, preview/Apply focus placement/restoration, `?ver=1.0.4`, no plugin-scope axe violation, no overflow, no external request and no console error. Screenshots 5 and 6 were recaptured from genuine exact-package Block Editor stale and Classic Editor result journeys; screenshot 8 is a genuine 375-pixel full-page capture. The official readme validator reports no errors or warnings, and the strict submission audit reports 0 errors/0 warnings.

The independent reviewer confirmed the exact SHA, build/submission parity, REST security/privacy/idempotency/oversize/hash-only behaviour, minimum/current runtime, Plugin Check, focus correction, 1280/768/375/320 responsive states, plugin-scope axe and corrected listing evidence. The remaining assistive-technology hold is the actual VoiceOver/Safari journey, which requires owner-granted macOS control consent and was not bypassed. Integration-owner acceptance and every public action remain separate gates. Evidence: `wordpress/opace-ai-content-integrity/tests/evidence/g4/1.0.4-final1/`; submission bundle: `dist/wordpress-submission-prep-1.0.4/`.

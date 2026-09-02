# WordPress EU server-analysis handoff

Status: WordPress client, canonical presentation, on-device model and local file-provenance components implemented; live EU service channel blocked.

The WordPress Lab has an administrator opt-in, editor route choice, explicit per-run transmission confirmation, same-site REST endpoint, bounded request handling and a fixed-host WordPress challenge/token/check client. It consumes the shared `checker-result.schema.json` and Cycle-5 browser runtime, slices validated section passages from the local source, renders the five-band result with three independent axes and every evidence section, and creates complete same-result exports. `WordPressServerAnalysisChannel::available()` performs a short-lived capability check only after administrator opt-in and requires an enabled `wordpress-v1` channel plus the current model contracts. An old, missing or failed status response keeps the EU route unavailable. No page load or local/on-device run contacts that service before opt-in.

## Blocking dependencies

1. Deploy and evidence the server-side `wordpress-v1` routes and status capability block at the already pinned service base. The current deployment does not advertise them. PHP must not spoof a browser Origin or user agent.
2. Deploy and legally review `https://opace.agency/tools/ai/content-verification-integrity/terms/`. The intended URL is recorded in directory copy, but it is not live and therefore blocks live EU-route enablement and WordPress.org submission.
3. Prove the deployed endpoint response against the WordPress-specific validators: exact source identity; UTF-16 length; ordered section bounds; strongest-section identity; six-decimal margins; current Cycle-5 contracts; bounded retention metadata; and collision-safe display strings.
4. Run exact-ZIP installation, network, keyboard, accessibility, 1280 px, exact 375 px, error/fallback, export, minimum/current WordPress and Plugin Check gates.

## Canonical result and report now implemented

- the established runtime sync copies all 14 schemas, including `checker-result.schema.json`, the valid assessed fixture, the invalid content-bearing share fixture and the shared core runtime;
- PHP applies the shared JSON Schema first, then fails closed on WordPress channel, model identity, source hash/length, section-bound, raw-margin, strongest-section, display-score and share contradictions;
- JavaScript receives the shared level labels and invariant assertion from `core.mjs`; the renderer defines no second score or level vocabulary;
- the five-band gauge includes text labels and an accessible overall reading, while the section score strip uses ordinary navigation buttons because all linked section panels remain visible;
- reader-facing section numbers start at 1, engine indices remain recorded as zero-based, and passage text is sliced from the already-local source using validated UTF-16 bounds;
- the report prints all nine evidence groups, every score/level string verbatim, every section explanation, methods, limitations, source text and run identity without recalculating a score;
- report layout paginates line by line. Its built-in WinAnsi font keeps Western European text, punctuation and the euro sign; unsupported characters are preserved as explicit `U+` code-point labels rather than ambiguous question marks. Adding a bundled wider-coverage font would need a separate source, licence, size and package review.

## Local C2PA component now implemented

The file chooser accepts JPEG, PNG, WebP and PDF up to 20 MB and uses the official `@contentauth/c2pa-web` 0.14.3 / `@contentauth/c2pa-wasm` 0.11.3 runtime locally. The smaller external-WASM build is pinned and deterministically synced with compatible MIT/ISC licences; the 10,925,526-byte inline build, npm metadata, tests, declarations and maps are excluded. Present, absent, invalid, untrusted, error and unsupported remain separate states. Trust lists, remote manifests and OCSP are disabled. File bytes never enter receipts, shares, URLs, events or logs; a completed check can export a content-free JSON/PDF containing the file hash, type, size, result and limitations but never the file or filename.

Visible Chromium on HTTP and HTTPS parsed real upstream credential, no-credential and invalid JPEG fixtures plus Opace PNG/WebP and generated PDF inputs. Both routes made zero external or body-bearing requests. The exact source/build, hash, MIME, privacy, screenshot and remaining installed-package evidence is recorded in [C2PA-RUNTIME.md](C2PA-RUNTIME.md).

## Current controls

- administrator opt-in is off initially;
- service base is pinned to `https://opace-detector-877422072168.europe-west1.run.app`; no ordinary setting can redirect drafts to another host;
- capability is cached briefly and requires `wordpress_channel.enabled=true`, credential class `wordpress-v1` and the current Cycle-5 model/contracts;
- editor consent is required in both the browser request and REST handler;
- REST access requires an authenticated user, `edit_posts` and a valid WordPress REST nonce;
- the browser calls only the same WordPress origin;
- PHP uses `wp_safe_remote_get`/`wp_safe_remote_post`, HTTPS validation, no redirects, a 15-second request timeout and a 16 KiB response ceiling;
- source input is valid UTF-8, 60–8,000 words and no more than the site's 100,000 UTF-16-code-unit ceiling; the declared server JSON request ceiling is 700,000 bytes;
- local pacing is three requests per minute and twenty per hour per user, storing timestamps only;
- no Origin or browser user-agent header is added, no automatic retry occurs and no source text is stored by the adapter;
- the raw server response validator requires the current Cycle-5 identities, six-decimal margins, matching four-decimal probability tolerance and ordered bounded code-point offsets; the browser composes it with the local deterministic result and source, then applies canonical invariants;
- content-free full-result receipts replace passages with local hash/UTF-16 locators, clear evidence objects and retain the exact route, model, axes, section scores and limitations for the owning user;
- report creation is a user-triggered, browser-local action and uses the currently validated canonical result plus the unchanged local source.

## Current live blocker evidence

On 2 September 2026, the current service health identified Cycle-5 fp32 build `45e00978b10d1df6`, while `/v1/status` exposed no `wordpress_channel` block. A legacy `/v1/challenge` probe using a WordPress user agent and no `Origin` header also returned HTTP 403 `origin_not_allowed`; no content was processed or retained. The plugin therefore keeps the fixed route unavailable rather than treating the host alone as readiness or spoofing browser headers.

The final WordPress channel remains a dependency, not permission to deploy, submit or publish. Local C2PA source proof does not replace an authorised exact-ZIP installation and owner acceptance.

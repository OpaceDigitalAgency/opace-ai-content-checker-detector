# Release-state register

**Cost-control correction — 29 August 2026.** The Cloud Run row below is superseded on cost
control and current revision: budget `3b89c8af-bd1c-434f-8cab-3e0d14491e71` is a configured £50
monthly enforced spend cap scoped to `opace-ai-detector` plus `Cloud Run`; the existing £10
kill-switch budget is unchanged. Live revision `opace-detector-00005-284` serves 100% of traffic
with service and revision maximums of 1, and `/v1/health` returned HTTP 200. Enforcement is not
instant and may overshoot. The daily 12,000-inference cap binds first on **cost** — one instance
burns the day's allowance in 30–40 minutes — but not on a **burst**, where concurrency binds:
roughly seven to eight simultaneous maximum-size documents now survive against about fifteen
before. At the observed 0.03 requests per second that has no effect on real users. **Both deploy-time drills were re-run and are proven on `00005-284`**, 29 August 2026: the kill
switch fired twice from real Cloud Monitoring alert policies through the production Pub/Sub
notification channel, and the ten-path zero-body-logging probe returned zero marker hits against a
search first proven able to find a canary. The evidence is the Cloud Run safety re-verification of
29 August 2026, section "Re-verification on `00005-284`". That document is **held privately** and
not published: it is a map of how the service is defended, including alert thresholds, kill-switch
mechanics, IAM policy and response timings. That proof is revision-specific. A `segments-v3` deploy is queued
by another session, meant to carry `MAX_INSTANCES=1` and `GLOBAL_BURST_INFERENCES`; any of those
creates a new revision and voids both drills, which must then be re-run.

**Current as of 29 August 2026, 17:00.** Reconciled against the live server, the live site, the
GitHub API, the package registries and the artefacts on disk. Evidence per changed row is in
[`programme/DOC-RECONCILIATION-2026-08-29.md`](programme/DOC-RECONCILIATION-2026-08-29.md).

Three surfaces are now public: the Opace web suite, deployed and live-verified 28 August 2026;
the Cloud Run inference service, live 29 August 2026 and now the checker's **default** route;
and this source repository, public and MIT licensed since 29 August 2026, tagged `v0.1.0`,
`v0.1.1` and `v0.1.2`. Every other row below is genuinely unreleased and its gates are open.

## Re-vendor, 30 August 2026 — four artefacts rebuilt and every recorded hash moved

The Chrome extension, the WordPress plugin, the Astro integration and the CLI each carried a
frozen copy of the engine packed on 26 August, byte-identical across all three of the first three
(`ac295522…9cb44ff6`). Those copies predate both fixes recorded in the next section **and** the
whole `en-signals` rule set: measured on 4,144 human documents they fired 2 rules and 570 pattern
findings against the current core's 73 rules and 8,346. All four have been rebuilt from the
current core by `npm run pack:vendor` into `dist/g3-revendor-2026-08-30`, and the WordPress
plugin moved to **1.0.5** because the plugin version is the cache-bust token on `core.mjs`.

**Every recorded hash below changed as a result, and none of the gate evidence attached to the
old hashes carries over.** The rebuilt artefacts have been proved on the two fixes and on rule
parity, and nothing else: each has been driven through a spec-encoded C2PA credential that still
parses after its own default fix selection, through the six repaired span anchors, and through
the 4,144-document corpus, where no rule that existed in the frozen copies changed its fire count
on any document. Plugin Check, the readme validator, the Chrome browser lanes, the axe passes,
the deterministic-repeat checks and the three-build parity runs were all recorded against the
superseded artefacts and are open again.

Bringing the current engine and leaving detection unchanged are not both possible here: the
frozen copies are 71 rules behind, so the four surfaces now report editorial writing signals they
did not report before. That is a product change, not plumbing, and it needs the owner's decision
and a listing-copy pass before any of them is submitted.

### The second analysis implementation is now a declared subset, not a silent parallel analysis

**Resolved 30 August 2026, as an interim. The end state in HANDOVER §11 is not reached and needs
an owner decision.**

`wordpress/opace-ai-content-integrity/includes/Analysis/` is 507 lines of PHP with its own Unicode
table, homoglyph list, three `en-gb:2026.08.1` pattern rules and protected-span extractor. It
serves the REST route the Block and Classic editor sidebars use and — less visibly — the receipt
`SessionService` writes, so a receipt saved from the Lab recorded the PHP's findings rather than
the ones the Lab had just shown the user.

**Why it exists.** The compiled engine is TypeScript and PHP cannot execute it, while those routes
must answer on the server. It is not vestigial and it is not a fast preview of the same analysis.
The spec that predates the engine (`specs/01`, line 69, "Browser/PHP rules run on-site"; line 498,
`DeterministicAnalyser.php # orchestrates browser/PHP-equivalent rules`) commissioned it as a
deliberate on-site PHP mirror. HANDOVER §11 supersedes that, but the constraint it was answering
is real.

**What was measured, rather than assumed.**

| | PHP subset | compiled engine |
|---|---|---|
| writing-pattern rules | 3 | 116 |
| invisible-character coverage | 16 code points | 38 carrier rules + 3 private-use ranges |
| homoglyph confusables | 7 | 60 |
| findings on 1,200 human-corpus documents | 104 | 2,156 |

On those 1,200 documents the PHP reproduces the engine's `en-gb:2026.08.1` pack **exactly** — same
rule ids, same spans, **0 mismatches**. The pattern side has not drifted; it is a faithful subset.
The Unicode side is a coverage gap rather than a version difference: of 15 probed carriers, **12
are reported by the engine and missed entirely by the PHP**, including `U+200C`, `U+200D` and the
`U+E00xx` tag block used to hide text inside a draft. A sidebar reporting "nothing found" was
therefore not telling the author their draft was clean.

**What changed.** The two are no longer presented as the same check:

- The subset declares `wp-php-subset:2026.08.1`, a namespace no receipt, sidebar or API consumer
  can mistake for the engine's `unicode:2026.08.2` / `en-signals:2026.08.6`.
- Its method names carry "subset", and its `limitations` state the coverage gap and point at the
  Lab. Findings keep their true `rule_version`, so a finding still names the pack it came from.
- The Block and Classic editor surfaces read "quick check", report that they ran 3 of the 116
  writing rules, and say explicitly that a nil result is **not** a clean result.
- Plugin moves to **1.0.6** (the version string is the cache-bust token on `core.mjs`).
- Plugin moves again to **1.0.7** on 30 August 2026 for the plain-English rewrite of the writing
  notes. Same cache-bust token, same reason: `lab-app.mjs` appends it to its `core.mjs` import, so
  an editor holding the old module gets the new one.

**`tests/js/cross-runtime-parity.test.mjs` changed purpose, and the file says so at the top.** It
no longer asserts equality — a property the plugin cannot have while PHP cannot run the engine —
and instead asserts the declared subset: exact reproduction of the mirrored pack measured on real
documents, a namespaced version, limitations that state the gap, the declared rule counts true on
both sides, and that the engine stays a strict superset so the divergence cannot be "closed" by
gutting the engine. 16 of 16 pass. It was verified to fail when the PHP is relabelled with the
engine's version — the fix that was rejected in the first place.

**Still open, and it is a product decision.** §11 requires the sidebars to run the compiled engine
in the browser as the Lab already does, with PHP orchestrating and persisting rather than
analysing. That means deleting the 507 lines and changing the REST contract to accept a
client-computed analysis for storage instead of recomputing it. Not taken here.

## Hash verification, 29 August 2026 — superseded by the re-vendor above

Every SHA-256 recorded in this register was re-checked against the file on disk with
`shasum -a 256`. **Nothing was rebuilt to produce a hash.** All eleven frozen artefacts matched:
the WordPress 1.0.4 ZIP (and its identical copy under `dist/wordpress-submission-prep-1.0.4/`),
the Chrome 1.0.0 Web Store ZIP, the Astro 0.1.0 tarball, the five-package npm manifest, the
Python 0.1.0 wheel and sdist, the local-engine `final5` wheel and sdist, the TypeScript client
and CLI tarballs, the BENCH-10 tarball and its `package-set.json`, and both ASTRO-25 `final-k`
and `final-l` packages. No mismatch and no missing artefact.

## Registry state, re-checked 29 August 2026

Checked rather than inherited from another document:

| Surface | Check | Result |
|---|---|---|
| GitHub | `GET api.github.com/repos/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` | `private: false`, `visibility: "public"`, MIT, `main`, pushed `2026-08-29T14:24:59Z`, tags `v0.1.0`/`v0.1.1`/`v0.1.2` |
| npm ×3 | `GET registry.npmjs.org/@opace%2f…` | 404 — not published |
| PyPI | `GET pypi.org/pypi/opace-content-integrity/json` | 404 — not published |
| WordPress.org | `GET wordpress.org/plugins/opace-ai-content-integrity/` | 301 to directory search — no listing |

## C2PA text credentials — a publication blocker, found and fixed 29 August 2026

The Chrome extension, the WordPress plugin and the Astro toolbar all select every removable
hidden-character finding by default, with no per-finding choice. Against the current engine
(`unicode:2026.08.2`, the first rules version to carry the variation-selector rules) that
selection deleted the low bytes of any C2PA 2.4 §A.8 text credential in the draft, including the
trailing `0x00` of the `C2PATXT\0` magic, after which the credential read back as absent rather
than as damaged. Measured on a spec-encoded credential of 51 carrier code points: 11 selected,
11 edits applied, `ok` before and `none` afterwards, visible text unchanged. No user was affected,
because none of the three surfaces is published.

Fixed in the engine rather than per surface: `packages/core/src/provenance/c2pa-text.ts` detects
the wrapper and `previewSafeFixes` holds every finding inside it back with the skip reason
`c2pa_text_credential`, unless the caller passes the default-off `allow_c2pa_credential_removal`.
Detection is unchanged. Re-measured through the same three default selections: 0 edits, credential
`ok` before and after. Five unit tests in `tests/core/unit/c2pa-text-credential.test.mjs`, each
checked against four deliberate mutations of the fix.

**Closed for all four surfaces on 30 August 2026.** The frozen Chrome, WordPress and Astro
artefacts pinned `unicode:2026.08.1`, which predates the variation-selector rules, so their
engines did not flag those code points at all — but they did remove a U+FEFF at index 0, which
destroyed a credential placed at the start of a draft (measured: `ok` → `none`, one edit; 1
finding where the fixed core produces 51). All four have now been rebuilt against the fixed core
and each was re-measured through **its own shipped bytes**, not through a rebuild of the source:
the Chrome Web Store ZIP's `worker.js` and `panel.js` driven through `renderImprove`'s own
selection, the Astro tarball's `worker.js` and `toolbar.js` driven through the toolbar's
select-everything patch action, the plugin ZIP's `assets/js/core.mjs`, and the packed CLI binary.
A spec-encoded 51-carrier credential parses identically before and after at both ends of the
draft, 0 edits applied, every removable finding held back with reason `c2pa_text_credential`. The
CLI has no safe-fix path at all — it never calls `previewSafeFixes` — so the defect never reached
it. Recorded hashes changed accordingly; see the re-vendor section above. Separately, the website carries its own fix (site commit `c841a658`)
in `src/lib/content-integrity/`; when the site's vendored core is refreshed, the two guards must
be reconciled rather than left to double up.

## Detection figures in this register

No row below states a single headline detection rate, because none is settled. Reconciliation
between the held-out long-form corpus and the 28 August generated corpus is open, and the 0.984
threshold is provisional pending an owner decision between lowering it and retraining. Any
figure that appears here carries its corpus, threshold, runtime and denominator.

| Artefact | Written | Reviewed | Automated tests | Committed | Published/deployed | Owner accepted | Evidence/next gate |
|---|---|---|---|---|---|---|---|
| Schema/contracts v1 | frozen technical input | independent G1 passed and integration lead froze | Node/Python/PHP full pass; G1 probe 14/14 | no | no | no | Compatibility review and full G1/G2 regression for any change |
| OpenAPI v1 | frozen technical input | independent G1 passed and integration lead froze | exact routes/security/success/error schemas pass | no | no | no | Semantic/local-service consumer gates remain separate |
| Golden fixtures | frozen technical input | independent G1 passed and integration lead froze | 3 cross-language RFC 8785 vectors pass | no | no | no | Preserve unchanged across every consumer gate |
| Public npm/Astro/Python 0.1.0 packages | exact local candidates prepared; README refreeze complete 27 August | independent local submission audit plus documentation-refreeze verification passed | deterministic repeat, clean consumers/matrix, archive/public-tree hygiene, Twine, five developer npm dry-runs, audits, root G1/G2 regression and eight-hash verifier green | no | no | no | Confirmed unpublished 29 August 2026: npm returns 404 for `@opace/content-integrity-core`, `@opace/astro-content-integrity` and `@opace/watermark-lab`; PyPI returns 404 for `opace-content-integrity`. Exact current hashes in `submission-prep/submission-manifest.json`. The Astro and npm candidates were repacked on 30 August 2026 against the current core, so both moved: Astro tarball `0fd6716e…15b86d7a` (was `4a45e453…1e82da5`), npm five-package manifest `ae143295…aa373f5f17` (was `f2e09e2e…5193fe20`), Python wheel `ddd0b160…d3b943d` and sdist `34c65f6e…40587f7d46`. Five of the seven npm packages are `0.0.0-private` with `"private": true`; publishing means removing that flag deliberately. The website consumes these as vendored tarballs from `vendor/content-integrity/`, so publishing changes how the site installs them and needs coordinating. Owner-interactive npm 0.1.0 publication with account 2FA and no provenance; later npm OIDC/provenance; PyPI trusted publishing after npm live verification |
| Public GitHub repository/listing | metadata/assets/workflow prepared locally, then created | moderation materials reviewed locally | local workflow/YAML, SBOM, licence and asset checks green | yes; `main`, tags `v0.1.0`/`v0.1.1`/`v0.1.2`, last push `2026-08-29T14:24:59Z` | **yes — public and MIT licensed since 29 August 2026** at <https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker>. GitHub API confirms `private: false`, `visibility: "public"`. Renamed 29 August from `opace-ai-content-integrity` for search visibility; GitHub redirects the old slug but new material must not rely on that. npm package names were deliberately not renamed | not recorded | Verify the public links from a signed-out client; `submission-prep/submission-manifest.json` still carries `public_action_authorised: false` and `state: local_submission_preparation` and needs updating for this row |
| Core/browser deterministic packages | re-vendored 30 August 2026 into `dist/g3-revendor-2026-08-30` | G2 evidence plus integration correction, recorded against the superseded 26 August pack | core 20/20; G1 14/14; G2 24/24 all browsers, all against the superseded pack | no | no | no | Exact `g3-revendor-2026-08-30` hashes in status. `npm run test:gates` was re-run on 30 August 2026 against the current sources and passed 24/24 across Chromium, Firefox and WebKit, together with the local-package and TS client/CLI package gates; consumer gates remain separate |
| Opace web suite, 11 routes | exact local candidate, with the deployed disclosure copy corrected after cycle-3 review | independent website submission review passed locally; live production retest through the real page on 28 August 2026 | 66/66 rendered runs; 22/22 axe; 320 px reflow; checker/keyboard/receipt/no-JS; sitemap 11/11; links 114/114; live production test of four documents through the deployed checker | yes; site commits `bb820686`, `ce56ac54`, then `88af6f6d` (EU server by default) and `3fd9ef00` (do not stall a run started in a background tab), all on `origin/main` | yes; deployed and live-verified 28 August 2026 at 21:20, with the server route added 29 August. The [checker route](https://opace.agency/tools/ai/content-verification-integrity/checker/) and the [product/suite page](https://opace.agency/tools/ai/content-verification-integrity/) are live; the remaining routes of the suite are not individually recorded as re-verified in this register | not recorded | Individual live verification of the remaining suite routes. **The band-boundary presentation defect is fixed and verified 29 August 2026** and is no longer a gate: `thresholds.json` sets the `very_likely_ai` floor to 0.984, equal to the flag point; `bandFor` in `src/lib/local-signals/engine.ts` selects on `probability >= band.min` while `flagged` uses `probability >= threshold`, the same comparator; and `serverBands` in `src/lib/local-signals/server-route.ts` rewrites the top band's floor to the threshold the server returns, so the routes agree. A score of exactly 98.4% now reads "Very likely AI" and is flagged. The same defect is still recorded as open in [`CAPABILITIES.md`](CAPABILITIES.md) around line 728 and needs clearing there |
| Cycle-2 trained model (`tier3-cycle2-e5small-int8-perchannel.onnx` int8; fp32 on the server) | intfloat/e5-small, 33.36M parameters, retrained on the 15,514-document published-register corpus; per-channel int8 ONNX export at 34.3 MB for the browser, fp32 baked into the server image | independent held-out verification plus a fresh never-seen validation run; both routes refitted to one shared threshold on 29 August | Held-out training evaluation, 6,183 rows: AUROC 0.9695, detection 76.9% at a 1% false-positive budget and 81.2% at 2%. On the 5,558-document fresh long-form corpus (922 AI from 13 current models; 4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE), **four different measurements exist and are not interchangeable**: opening-only int8 browser at 0.984, 833/922 (90.3%) at 62/4,636 (1.34%); opening-only int8 Python at 0.980, 835/922 (90.6%) at 64/4,636 (1.38%); segmented fp32 Python reference at 0.980, 893/922 (96.9%) at 97/4,636 (2.09%); segmented fp32 Python reference at 0.984, 877/922 (95.1%) at 56/4,636 (1.21%), AUROC 0.9971 (`docs/measurements/SEGMENT-TOKEN-FIX.md`). The opening-only pairs predate segmentation and must not be quoted as current | yes; int8 served from the deployed site, fp32 in the deployed container | yes; int8 served from the live site at 34.3 MB, HTTP 200, run in the visitor's browser; fp32 running on Cloud Run as the default route | not recorded | **Reconciliation with the 28 August generated corpus is open** — that corpus reads 5/457 (1.1%) academic and 467/1,244 (37.5%) articles, but at 0.8533 on the superseded cycle-1 model, so it is not like-for-like and neither is a settled rate. **No prompt-style split has been measured on an independent corpus**, so the human-voice result is in-distribution only. **Threshold 0.984 is provisional** pending an owner decision between lowering it and retraining; a reported reproducible miss (a real 512-word GPT-5.6 Sol article at 0.8082, unflagged) is the case forcing it. The browser runtime's own segmented curve over the full corpus has never been measured (~5 hours) and `thresholds.json`'s `measured` block still carries v1-derived browser figures. Base checkpoint `intfloat/e5-small` confirmed **MIT** from the model card on 29 August 2026, which clears the licence blocker three documents recorded as outstanding; a published model card is still outstanding (see [`legal/DEPENDENCY-LEDGER.md`](legal/DEPENDENCY-LEDGER.md)). Human fiction is the worst genre: 33 of 260 wrongly flagged (12.69%), and no matched human fiction set exists in the corpus. Business reports remain data-starved at 72 held-out rows |
| Cloud Run hosted inference | FastAPI server at `services/local-engine/research/model-shrink/reference-server/`, deployed | complete | complete | yes | **yes — live and serving the checker's default route.** Re-checked 29 August 2026: `https://opace-detector-877422072168.europe-west1.run.app`, revision **`opace-detector-00005-284`** at 100% of traffic (`gcloud run services describe opace-detector --region europe-west1 --project opace-ai-detector`), europe-west1, scale to zero, maxScale **1** at both service and revision level. It differs from `00004-dlb` by exactly three fields — maxScale 2→1 and two console-versus-CLI client annotations — with an identical image digest and all 21 environment variables unchanged, so the running code is what was audited on `00004-dlb`. `/v1/health` 200 → `tier3-cycle2`, fp32, build `e313ab00de1fffd2`, **`segments-v2`**. `/v1/status` 200 → daily cap 12,000 **inferences** not requests, per-connection 5/30/100 requests and 20/150/500 inferences, `max_chars` 50,000, `max_words` 4,000, `max_inferences_per_request` 99, browser fallback advertised. The service has been redeployed since the first record here, which said `opace-detector-00003-bfq` and `segments-v1`, and again since the second, which said `opace-detector-00004-dlb`; all are superseded. Segmentation matched the golden table on the earlier revision (1,200 words → 340/340/340/180, `aggregation: "max"`); origin, automation, token and proof-of-work gates all refused as designed. **Cost claim corrected 29 August 2026.** This row previously read "no Cloud Run setting bounds the bill — a flood is ~£519/month at two instances, ~£257 at one — so the ceiling is the kill switch". Both halves were wrong. Requests are billed only when they reach a container, and requests beyond `instances × concurrency` are refused at Cloud Run's front end without starting one, so **max-instances bounds every billed line**. £519 was a point estimate on an unmeasured 500 req/s (the same document's own 2 ms refusal assumption gives £2,868), omitted egress of about £46 at its stated volume, and converted from USD on a **GBP-denominated** billing account. The compute floor is **£51/month at maxScale 1**, which is what now runs, and £106 at maxScale 2. Three separate controls bound the account and must not be collapsed into one "£50 ceiling": **maxScale 1**, a platform-enforced bound; the **£50 Cloud Run spend cap** (budget `3b89c8af-bd1c-434f-8cab-3e0d14491e71`, `Configured`), which genuinely pauses the service but acts on **recorded** spend, usually within 24 hours, and is in **Preview** with nobody having seen it fire — **verify a spend cap in the Cloud Billing console, never by API**, because `gcloud billing budgets list` and REST `v1`/`v1beta1` omit the whole budget and two agents read that as "no cap exists"; and the **kill switch**, reactive rather than a cap, with a delivery leg measured at **44–88 s across three fires**, two on the current revision. The cap trades cost risk for availability risk: it pauses until a human lifts it, takes up to an hour to resume and returns 5xx meanwhile, so an attacker who drives £50 of recorded spend takes the server route offline for the rest of the month, where the kill switch restores in seconds. Acceptable given the unlimited in-browser fallback, but a trade | no | **Wired to the checker and the default route since website commit `88af6f6d` on `origin/main`.** The blocker recorded here — the site-wide "text never leaves your browser" copy — was resolved before wiring: `ROUTE_PRIVACY` in `local-signals-ui.ts` now carries one truthful sentence per route, shown before the run, and each result repeats the server's own `words_sent`/`processed`/`retained`. Both routes share threshold 0.984 (`THRESHOLD_PROB` in the reference server, raised from 0.980 on 29 August) and contract `segments-v2`, so the route-parity item recorded here is closed on decisions; the fp32/int8 decision-region difference is a median 0.0002, and the once-quoted 0.113 was int8-web against int8-**Python**, not against this server. **Still open: (1)** the DPIA is at draft 0.1 ([`legal/DPIA.md`](legal/DPIA.md), 29 August 2026, engineering-written and explicitly not signed off) and needs qualified review; the published lawful-basis notice is not written; **(2)** refusal (413, 429) and error paths are unprobed for body logging — the marker probe covered the scoring path only; **(3)** **both deploy-time controls are now proven on `opace-detector-00005-284`, 29 August 2026, and only on that revision.** The kill switch was fired twice from real Cloud Monitoring alert policies pointed at the production Pub/Sub notification channel, with nothing hand-published to the topic; each time the Cloud Function logged that policy's own condition display name as its trigger, which is what proves Monitoring delivered it. Delivery leg **44–88 s across three fires**, two on this revision — quote the range, not an average: the variance sits above the Cloud Function in Google's own alert evaluation and notification delivery, and this project does not control it. Both ignore-guards hold, the routine-budget guard now proven from **Cloud Billing itself** by real unprompted messages at 15:54:30Z and 16:35:15Z rather than a synthetic one. Total public unavailability across the pass: about **14 seconds**. The zero-body-logging probe covered **ten paths and returned zero marker hits**, with a canary found first so the search was proven able to detect a hit, `_Required` empty, and fifteen requests producing no log entries at all; the 429 was reached by making real requests until the limiter refused, with no limit raised and no gate disabled. That closes item (2) above for the refusal and error paths. **These proofs are revision-specific and are not proof in perpetuity:** the queued `segments-v3` deploy — also meant to carry `MAX_INSTANCES=1`, still `2` in the container while the autoscaler is `1`, and `GLOBAL_BURST_INFERENCES` — creates a new revision and voids both, which must then be re-run. See [`security/THREAT-MODEL.md`](security/THREAT-MODEL.md) |
| Client/CLI/loopback control plane | local candidate | independent G5-base passed | client 11/11; CLI 6/6; Python 30/30; exact-package install/import/bin/lifecycle/privacy/audit green | no | no | no | Semantic model/corpus/legal QA and owner-approved Docker base/distribution |
**Listing copy changed after the ZIP was hashed, 30 August 2026.** `readme.txt` and
`extensions/chrome/README.md` were updated to carry the shipped operating point's figures and a link
to the published detection tables, propagated from `DESCRIPTIONS.md` §0. **The recorded WordPress
1.0.6 ZIP hash therefore no longer covered the current `readme.txt`. **Rebuilt as 1.0.7 on
30 August 2026**, carrying the rewritten writing notes; the current artefact and its hash are in the
row below. No plugin code, model,
threshold or measured claim changed; only the copy that quotes them, and every quoted rate now names
the flag point it was measured at.

| WordPress plugin 1.0.7 | sole current exact local ZIP, built 30 August 2026 against the current core, SHA-256 `fabcd4d0f1748fda270ca6f68b78dfa068b9d5ba04c6119638f8107814ba595e`, superseding 1.0.6 `66df5f2411cfd933522bf314092069b2d3bb745649d027b585b6e7a9aa1d003a`, 1.0.5 `c4431c483f7152d058a7624d518959f3d728137cb4f2a83436b554c72c53f0bd` and 1.0.4 `084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec` | **open** — the implementer and independent package/runtime/submission-preparation reviews were passed by 1.0.4 and do not carry to 1.0.6, and do not carry to 1.0.7 either | **open** — `assets/js/core.mjs` and every version string changed, so Plugin Check, the official readme validator and the minimum/current/Multisite, PHP 7.4, lifecycle, REST, editor, focus, responsive and scoped axe evidence must all be re-run against the 1.0.7 ZIP. **Deterministic three-build parity is open and has a measured failure that is still unexplained**: at 1.0.6, 9 builds were run on 30 August 2026, 8 produced `66df5f24…aa1d003a` and one produced `6620226cd007df22c7694dcb0952bffd56bc6ee3231539a0837df48ee8666a96`. The outlier's artefact was overwritten before it could be diffed and the cause is **not identified**. At 1.0.7, three builds were run in the same session and all three produced `fabcd4d0…14ba595e`. Three agreeing builds do not explain the 1.0.6 outlier and do not close the gate: one non-reproducing build in nine is what has to be accounted for, and the sample that would show it recurring is larger than three. Do not record this ZIP as reproducible. | no | no | no | Confirmed unlisted 29 August 2026: `wordpress.org/plugins/opace-ai-content-integrity/` redirects to the directory search page. Built with `bin/build-plugin.sh`; the copy under `dist/wordpress-submission-prep-1.0.4/plugin/` is the superseded 1.0.4 ZIP and that whole preparation bundle needs regenerating. The GitHub URL gate is met, `.wordpress-org/` banner and icon assets are committed, and `readme.txt` carries the credits and the weakness list. WordPress.org readme does not render SVG, so charts must be linked rather than embedded. Per the owner's standing rule, always add cache busting and increment the version on any plugin change. **The PHP/JS parity break is no longer blocking: it is resolved as a declared subset (see above) and `tests/js/cross-runtime-parity.test.mjs` passes 16 of 16 with a changed purpose.** Remaining: the build-reproducibility failure above; a re-run of every 1.0.4 gate against the 1.0.6 ZIP; a fresh rules audit covering the 113 writing rules the audited build did not have, whose user-facing text was rewritten in full for 1.0.7; listing copy for them; owner Safari/VoiceOver consent; WordPress.org account/slug and SVN submission; post-submission verification. **Open product decision:** whether to route the editor sidebars through the compiled engine in the browser and delete `includes/Analysis/`, which is what HANDOVER §11 requires. |
| BENCH-10 mechanics | private synthetic candidate | private mechanics boundary passed | package 18/18; independent 14/14; exact package-set install/audit/workflow and G1/G2 green | no | no | no | G7 corpus/provider/human/statistical/legal approval and independent reproduction |
| Chrome extension 1.0.0 | exact local Web Store ZIP and listing bundle, rebuilt 30 August 2026 against the current core | **open** — the independent automated package/submission audit was passed by the superseded ZIP `061f5306...a1a93` | exact 15-file ZIP `27272820c839ece248fe12ee2fc8f6379cf7ed2c5a1944d5b3587796ebe9e9d2`; the submission validator passes on it; **open** — unit/type 5/5, audit 0, Chrome 151/145 40/40 per lane and the seven-state axe/Worker parity belong to the superseded ZIP and must be re-run | no | no | no | Owner Chrome Stable Load unpacked/native actions and VoiceOver; live URLs; account/trader/regions/submission choices and public verification |
| Astro ASTRO-25 | private exact-package candidate | independent report-only boundary passed | package 27/27; Astro matrix 9/9; Node 7/7; parity/path/hidden/focus; three-browser responsive/axe; G1/G2 green | no | no | no | Manual AT, local-service/provider decisions, registry/directory publication and owner acceptance |
| Hub/Scribe integrations | blocked | not_started | not_started | no | no | no | Frozen verified accepted heads plus fresh approved worktrees |
| QA-90 automated/private portfolio regression | passed historical baseline | independent final regression and visual review passed | exact selected packages; root/core/G1/G2, G5-base, BENCH, Chrome and Astro green; archive/consolidation scans green; no blocking visual defect | no | no | no | Later WordPress 1.0.4 and submission candidates have separate evidence; semantic G5, G7, manual AT, owner and public gates remain open |

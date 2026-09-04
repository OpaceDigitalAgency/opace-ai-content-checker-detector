# Release-state register

**Current at 1 September 2026.** This register separates live deployments, public source,
locally prepared candidates, verified candidate bytes, submissions and published listings. A pass
in one column is not evidence for another.

## Live release boundary

| Surface | Source public | Deployed or published | Current identity | Current evidence boundary |
|---|---:|---:|---|---|
| GitHub repository | yes | yes | `OpaceDigitalAgency/opace-ai-content-checker-detector`, `main` | Public and MIT licensed. Historical tags `v0.1.0`–`v0.1.2` exist; they do not identify the current publication-readiness work |
| Opace web suite | yes, in its separate website repository | yes | live checker and product routes; renewed result/PDF candidate `8994e990` local only | Live Cycle-5 route verified. Score-label/PDF candidate passed current source, responsive, keyboard, print and genuine-PDF gates; commit exists locally and is not pushed/deployed |
| Cloud Run detector | source public here | yes | `opace-detector-00010-4dt`, `tier3-cycle5-full`, build `45e00978b10d1df6` | 100% traffic; fp32; `segments-v3` / `raw-v1` / `features-v1` / `margin-v1`; revision-specific safety drills passed 1 September |
| npm packages | yes | **no** | five exact 0.1.0 tarballs, locally gate-passed | Registry returned no published package; exact hashes, manifest, repeat-build, dry-run and clean-consumer gates are current for the named bytes below |
| PyPI service package | yes | **no** | exact 0.1.0 wheel/sdist locally gate-passed; future source tag `packages-v0.1.0` not created | No published `opace-content-integrity` distribution; exact local package gates are green, while trusted-publishing tag/account action remains held |
| WordPress.org plugin | yes | **no** | exact 1.0.8 ZIP locally gate-passed | No WordPress.org listing; exact ZIP, 10/10 deterministic build, Plugin Check, min/current/Multisite installed-byte, runtime and visible accessibility gates are green; owner/store actions remain held |
| Chrome Web Store extension | yes | **no** | exact 1.0.0 ZIP locally gate-passed | Not submitted; exact ZIP, browser/Worker, accessibility and privacy gates are green locally; owner/store actions remain held |
| Astro integration catalogue | yes | **no** | exact 0.1.0 integration tarball locally gate-passed; catalogue entry held | Local package/consumer evidence is green; catalogue ingestion is blocked until the npm package is live and its metadata is verified |

No store or registry publication is authorised by this document. Owner account access, 2FA,
submission and post-publication verification remain separate actions after candidate acceptance.

## Locally verified exact candidates

The following hashes were rechecked from the current files on 1 September 2026. Their technical
package gates passed locally; publication state remains **no**.

> **Stale as of 3 September 2026 — do not treat any row below as the current candidate.** The
> owner-authorised rename moved the repository, the product and the surface identifiers on
> 3 September. Every artefact in this table was built under a name that no longer exists, so the
> filenames are wrong and the hashes describe bytes nobody will publish. The rows are kept
> unedited because a hash belongs to the exact bytes it was measured from; rewriting a filename
> beside an unchanged hash would turn an evidence record into a fiction. Each surface reopens its
> own byte-specific gate and must be repacked under its new name and re-measured before this
> table means anything again.

| Surface / file | SHA-256 |
|---|---|
| npm `opace-content-integrity-contracts-0.1.0.tgz` | `1fe269f3ec6b8f9f88e96e896b67a48defdeb0533d588ac14f6e53b707e00341` |
| npm `opace-content-integrity-core-0.1.0.tgz` | `906b75fbcf78538b79d21aeb04f9f322bf2a0dcf7aaf1191a4fb2739cc7e13fa` |
| npm `opace-content-integrity-browser-0.1.0.tgz` | `c2056d8a1c58c175f94bf5cd9253633863d1116906445410ad844431a5e14f0e` |
| npm `opace-content-integrity-client-0.1.0.tgz` | `23796745eedd958fe9f67873f164cd12c26910745d2ffc748ed0828594b990a2` |
| npm `opace-content-integrity-cli-0.1.0.tgz` | `4373b44b9be8784910a2ea823e85a912206379c6fd97f1d89f9449660407548b` |
| npm `manifest.json` | `09aa31d47f81510feaa25908ea17f1bb5e80770ddc41c3becd718c4632c062e7` |
| Astro `opace-astro-content-integrity-0.1.0.tgz` | `2deaf5d31dd74b8bca2910622ecfd27218850bd84209d40dc04ebaad65e0761a` |
| Python `opace_content_integrity-0.1.0-py3-none-any.whl` | `550dfdd9f3b39e272a857dc999e5fad05fdf7d27e9f462130cf5263e4aa948c5` |
| Python `opace_content_integrity-0.1.0.tar.gz` | `cc196d843a16b268acd88368f73b44635350ed73a3326832b0d17fa56948d2cf` |
| Chrome `opace-ai-content-integrity-chrome-1.0.0.zip` | `a52f0856a420a08ad31c9cf1388d7a7516b95759534ffd12054228122de30f0f` |
| WordPress `opace-ai-content-integrity-1.0.8.zip` | `b7b2c411862c6407ade38edbf95022f2f237c2dda63f80d9e1fae143ca63ce03` |

`@opace/watermark-lab` remains private/demo-only and is deliberately excluded from the npm
publication set. Astro is the sixth npm-dependent developer surface, not a sixth shared npm
tarball.

## Current Cycle-5 deployment

The default server route and optional browser route use the same Cycle-5 model family and
operating rule but different numerical runtimes. They can produce different scores and verdicts.

| Field | Current value |
|---|---|
| model | `tier3-cycle5-v1` / server registry name `tier3-cycle5-full` |
| build | `45e00978b10d1df6` |
| flag rule | `max(m1, m2 + 0.34) >= 3.570935` |
| segmentation | `segments-v3` |
| input | `raw-v1` |
| structural features | `features-v1` |
| scoring | `margin-v1` |
| request ceiling | 8,000 words / 100,000 characters |
| service daily ceiling | 12,000 segment inferences |
| scaling | maxScale 1; concurrency 3 |

On the 5,558-document long-form corpus, the server fp32 route flags 902/922 AI documents and
46/4,636 human documents; the browser int8 route flags 900/922 and 73/4,636. The corpus is not
wholly independent of Cycle-2 training: 268 AI documents and 11 human documents overlap a
Cycle-2 split. The Cycle-5 evaluation view removes direct Cycle-5 training/calibration overlap
and contains 675 AI plus 4,500 human documents; its server result is 658/675 and 42/4,500.

The current safety proof is revision-specific. On `opace-detector-00010-4dt`, the alert path fired
the kill switch in 31.80 seconds and the ten-path logging probe found zero body-marker hits after
a canary proved the search. Any redeploy voids this proof until the drills are repeated.

### Daily-allowance pacing

The service has tested support for a paced allowance but it is deliberately disabled in the live
configuration. With the current default, all 12,000 inferences are spendable at once and an
attacker can consume the day's server allowance early. Setting `GLOBAL_BURST_INFERENCES=3000`
would make 3,000 immediately available and accrue the remaining 9,000 at 375 per hour. It cannot
increase the daily cost ceiling; it trades some immediate peak capacity for faster recovery after
abuse. This is availability hardening, not a package-publication blocker, and enabling it requires
a deliberate deployment decision followed by renewed revision-specific safety proof.

## Candidate gate rules

Every publishable surface must satisfy all applicable gates against the same final bytes:

1. one version and cache-bust identity across every source of truth;
2. exact archive path and SHA-256 recorded in the candidate manifest;
3. deterministic repeat-build result, with any mismatch retained and diffed rather than overwritten;
4. extraction and unsafe-path/secret/local-path scans;
5. source, type, unit and contract regression;
6. clean-consumer or clean-install verification;
7. runtime/browser/editor/lifecycle verification appropriate to the surface;
8. keyboard, responsive and accessibility verification against the final package;
9. truthful store/README copy carrying current Cycle-5 figures, overlap and limitations;
10. credential guard present in the exact candidate bytes; and
11. owner acceptance before any account, submission or publication action.

The C2PA text-credential guard is implemented and verified in the exact current candidates. The
WordPress 1.0.8 exact-final visible flow also passed its C2PA UI guard and receipt check. Any rebuild
reopens the byte-specific proof; this is not an unimplemented or parked feature.

## Candidate-specific state

### npm and Astro

- **Technical candidate green:** five shared 0.1.0 tarballs, their manifest and the Astro 0.1.0
  tarball are frozen at the hashes above. Deterministic repeats, clean-consumer installs,
  imports/types/bins, npm dry runs and the Astro consumer gate passed for those bytes.
- Publication, 2FA, post-registry install and catalogue ingestion remain held owner/external gates.

### PyPI

- Project/source/issue metadata was corrected before the exact 0.1.0 rebuild.
- The historical workflow binding to `v0.1.0` cannot produce renewed package bytes. The approved
  future source-tag identity is `packages-v0.1.0`; it does not exist and no tag is authorised by
  this register. Preserve the existing historical `v0.1.0`–`v0.1.2` tags.
- **Technical candidate green:** the exact wheel and sdist above passed repeat-build, Twine,
  external virtual-environment install, `pip check`, command/service lifecycle, network/privacy
  and package-content checks.
- Publication uses the approved trusted-publishing path only after the dependency order is ready.

### WordPress

- **Technical candidate green:** `dist/opace-ai-content-integrity-1.0.8.zip` is frozen at the hash
  above. Ten of ten independent builds were byte-identical.
- Preserve the historical reproducibility warning: one of nine 1.0.6 builds differed and the
  outlier was overwritten before it could be explained. Later matching builds do not erase that
  result.
- Exact installed-byte parity passed on WordPress 6.5.5/PHP 7.4, WordPress 7.1/PHP 8.3 and
  per-site Multisite. Network activation was refused and per-site activation passed. Plugin Check
  2.1.0 returned no errors on minimum/current. The exact-final 1280/375 visible flow on both stacks
  produced zero network requests, zero axe violations and zero console errors; C2PA UI and receipt
  checks passed.
- The WordPress Lab uses the compiled JavaScript engine; server/editor quick-check and persistence
  paths use a declared PHP subset. The listing must not promise full cross-runtime identity.
- WordPress.org account/login, submission, moderation, live-listing/install verification and the
  owner Safari/VoiceOver journey remain open. No local technical pass performs those actions.

### Chrome

- **Technical candidate green:** the exact 1.0.0 ZIP above passed the renewed exact-package,
  browser/Worker, current-claim, no-host/no-network, keyboard, responsive and accessibility gates
  in Chrome for Testing 151. The declared Chrome 145 minimum could not be re-run on an exact 145
  binary because that binary was unavailable; do not turn the 151 result into an exact-minimum
  runtime claim.
- Store submission, owner acceptance and any owner-controlled account/assistive-technology action
  remain held.

## Clearly retired history

- Cycle 2 was live from 28 August to 1 September 2026. Its probability-pair operating point and
  883/922 server, 889/922 browser, 45/4,636 server and 90/4,636 browser results are historical,
  not current.
- Cloud Run revisions before `opace-detector-00010-4dt` are historical. Their health and safety
  evidence does not prove the current revision.
- Package hashes and passes recorded before the publication-readiness refreeze apply only to those
  named historical bytes. They may inform the renewed test plan but cannot be copied forward.
- The old statement that no GitHub repository or hosted inference service existed is retired.

Current verification totals are in [TEST-EVIDENCE.md](TEST-EVIDENCE.md). Current measurement
provenance is in [EVIDENCE-INDEX.md](EVIDENCE-INDEX.md) and
[MODEL_AND_DATA_PROVENANCE.md](../MODEL_AND_DATA_PROVENANCE.md).

# Submission readiness — 26 August 2026

## Decision

The local release candidates are assembled. WordPress, Chrome, website and public npm/Astro/Python/GitHub bundles passed their independent local automated/package/browser/moderation gates; no local packaging or moderation defect remains. No candidate is live, submitted or owner accepted. Public submission remains blocked on owner approval, live product/privacy/support URLs and the owner-controlled checks listed below.

## Exact candidate register

| Surface | Exact candidate | Local decision | Remaining gate before submission |
|---|---|---|---|
| Website | 11 routes in `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-latest`, reviewed on base head `a017b516b2722a24eb539b5ef4de595cd201e8c3` | independent local PASS: 66/66 rendered runs, 22/22 axe, 320 px reflow, sitemap 11/11, links 114/114 | isolate authorised files, commit/push through the normal website route, verify exact deployed commit and retest all 11 production URLs; all currently return 404 |
| WordPress | `implementation/dist/opace-ai-content-integrity-1.0.4.zip`; `084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec` | documentation-only refreeze PASS: three deterministic builds, Plugin Check and official readme validator; executable bytes retain the independent runtime matrix | owner-granted Safari control for VoiceOver journey; live product/privacy/support and GitHub source URLs; WordPress.org account/slug/submission/SVN and public-directory verification |
| Chrome | `implementation/extensions/submission/chrome-web-store/package/opace-ai-content-integrity-chrome-1.0.0.zip`; `061f5306eb872653787ff9ee492e583c86c1ba427bef6ecb22477ccfba7a1a93` | independent automated package/listing PASS; Chrome 151/145 40/40 per lane | owner-approved Chrome Stable Load unpacked/native toolbar/context-menu and VoiceOver; live product/privacy/support URLs; publisher/contact/2SV/trader/regions/deferred-publish choices and Web Store verification |
| Developer npm set | `implementation/dist/public-0.1.0/npm/manifest.json`; `f2e09e2e3894263544503c3d0d1c416104bdb7def33e9409ea4e15745193fe20` | 27 August README refreeze PASS: deterministic repeat, exact clean consumer, six npm dry-runs, source/package README parity and G1/G2 | canonical GitHub repository, owner npm account/scope/2FA and interactive first-release publication of each exact tarball with `--provenance=false`; public install verification; later releases move to stage-only OIDC/provenance |
| Astro | `implementation/dist/public-0.1.0/astro/opace-astro-content-integrity-0.1.0.tgz`; `4a45e4530acb82b514797b7424a4d4d71bff314cd5d48136b8aefef6d1e82da5` | independent local submission PASS: 27/27, exact clean Astro consumer/matrix, audit, visual and archive checks | publish developer dependencies first, then publish this exact first-release archive interactively with account 2FA and `--provenance=false`; verify npm/Astro catalogue; later releases use OIDC/provenance; manual AT remains owner-held |
| Python | wheel `implementation/services/local-engine/dist/public-0.1.0/opace_content_integrity-0.1.0-py3-none-any.whl` (`ddd0b16009cdb3980a6a0a6f46a265312e49da7687d7c7ff87358adacb3b943d`); sdist `implementation/services/local-engine/dist/public-0.1.0/opace_content_integrity-0.1.0.tar.gz` (`34c65f6efbfb8f3a4f014b9de49888bf3b7ffefb63ca3ab3754f1a40587f7d46`) | README refreeze PASS: source and clean wheel/sdist consumers 31/31, deterministic repeat, `pip check`, CLI, Twine and archive checks | canonical GitHub repository and PyPI trusted publisher/account approval, then public install/CLI verification |

The five developer npm archive hashes are contracts `a5d220b89a1ad6d0f1a63dedf62cdd452613d0eaf16db4fdb5872a9bfd956b76`, core `3f3ece941cb1c03bc9dd89d4db8561f1477530545bc91ecaf4d474e8d3719833`, browser `6a3918c3efb48d76179b18d3000f3602daa65ef1958146a8cf588dbb57f86718`, client `0afc623f53e37e9880a899ee8110998faeec33be48e756d1e2975b9ee0c57d73` and CLI `8f7325b102eb21a466929cd70fa554d17bfc1c2290ca80fe2cdef10a15d7ec86`.

## Cross-surface evidence

- Root regression is green: 13 schemas, core 20/20, G1 14/14, G2 24/24 across Chromium/Firefox/WebKit, public package gates and exact-candidate hash verifier 8/8; recorded npm audits report zero vulnerabilities.
- WordPress 1.0.4 has three byte-identical ordinary builds, exact minimum/current/Multisite installs, 301/301 installed-byte parity, Plugin Check, PHP 7.4 lint, lifecycle/schema/companion/REST/editor/no-network/responsive/focus and plugin-scope axe evidence. Implementer evidence: `implementation/wordpress/opace-ai-content-integrity/tests/evidence/g4/1.0.4-final1/`; independent evidence: `implementation/tests/evidence/g4/1.0.4-submission-independent/INDEPENDENT-SUBMISSION-AUDIT.md`.
- Chrome 1.0.0 has validator, unit/type 5/5, audit zero, seven-state axe and packaged Worker parity evidence. No runtime network endpoint, remote code, telemetry, host permission or content-bearing receipt is present.
- Website evidence covers the checker, keyboard, receipt privacy and no-JavaScript journeys as well as static metadata, canonical, structured-data, sitemap and link checks.
- Public-package independent evidence covers the final 1,088-file intended public tree after duplicate generated Chrome outputs were excluded, 54 non-vendor Markdown files with zero broken relative links, no WordPress vendor or `.agent` leakage, deterministic packs/builds, exact clean consumers/matrix, archive/path/secret scans, licences, notices, SBOMs, six npm dry-runs, workflow YAML and release metadata. The authoritative Chrome submission ZIP is unchanged. Evidence: the public-packages independent submission audit of 26 August 2026, superseded on 27 August by the README refreeze in [`PUBLIC-PACKAGE-README-REFREEZE-2026-08-27.md`](PUBLIC-PACKAGE-README-REFREEZE-2026-08-27.md) and retained privately as the historical record.

## Approval-only release order

1. Approve and deploy the isolated website candidate; verify the exact deployed commit and all 11 production routes.
2. Approve creation of the canonical GitHub repository, then commit/push the reviewed public tree and create the exact `v0.1.0` release input.
3. Confirm npm scope ownership and account 2FA. npm requires a package to exist before trusted publishing can be configured, so the owner must publish all six exact `0.1.0` tarballs interactively in dependency order with `npm publish <exact-tarball> --access public --provenance=false`. Do not use a bypass-2FA token. Verify every live package before continuing.
4. Configure stage-only npm OIDC/provenance plus maintainer 2FA for later releases. After the six npm packages are live, publish the exact Python wheel/sdist through the held GitHub-to-PyPI trusted-publishing workflow. Verify registry metadata, public clean installs and Astro catalogue discovery.
5. With live website and GitHub URLs confirmed, complete owner-controlled WordPress Safari/VoiceOver and Chrome Stable/VoiceOver checks.
6. Submit WordPress and Chrome through their owner accounts using the exact registered packages, then verify directory/store processing and the final public listings separately.

## Explicitly outside this release

Full semantic G5, G7, model/corpus/provider evaluation, comparative detector claims, recurring public benchmark publication, Hub/Scribe adapters and later Edge/Firefox/Safari extension ports are not required for the bounded 0.1.0/1.0.0/1.0.4 submissions. They remain separate future gates and must not be described as passed.

No commit, push, tag, public repository, deployment, registry publication, WordPress.org/Chrome submission or external communication was performed while preparing this record.

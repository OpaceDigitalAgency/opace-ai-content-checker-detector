# Checker final independent regression

Date: 27 August 2026  
Decision: **PASS on the corrected local website candidate. No checker logic defect remains.**

## Exact boundary

- Website checkout: `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-latest`
- Branch/base head: `main` at `a017b516b2722a24eb539b5ef4de595cd201e8c3`, with the existing uncommitted Content Integrity candidate and other preserved user work.
- Isolated source/build snapshot: `/tmp/oaci-checker-fixed.8yzzsS`
- Isolated preview: `http://127.0.0.1:4338`
- Production build: PASS, 689 pages and 14,397 optimised image references.
- Frozen checker source hashes:
  - controller: `2bf9b17da037a328ec831871465abfe89b9da2543e5095241219569df93bb698`
  - core adapter: `e3791a4013f13f6298cd7663de92b6eaf4507641d4d152ff59aaaf70dfec14f4`
  - checker page: `f80d831479a1bc93cf712c745a5c41f6003c61a5a39b198ad54a5a0f7179ee6f`
  - breadcrumb component: `52bcc3d943fdf5361d31ff1ac316a90ccae338f7d3cc386f2aaeeffbc795b0f9`
  - corrected Content Integrity CSS: `f9165521df5a0621ad003c1799525b6cd944fbf6887a7c16feb70e91303eb423`

## Defect found and closed

Populated checker evidence actions inherited the global dark-surface secondary-button colour while sitting on white or light-paper panels. Axe measured five serious failures at 1.02:1 to 1.13:1: Preview selected Unicode, Download JSON receipt, Print/save evidence summary, Open methodology and Review Claude readiness.

The correction is scoped to `.integrity-evidence .tools-button--secondary` in `src/styles/content-integrity-tools.css`. It uses dark ink on an Opace paper button for default and hover states. No controller, core, receipt, Worker or other product logic changed. The populated checker then returned zero axe violations at 375 and 320 CSS pixels.

## Functional and privacy result

- Exact 50,000 UTF-16 code units used a real Worker and completed with six progress messages plus the result. Controls were locked during the run, six ordered rows rendered, Anthropic stayed `unsupported`, and focus moved to `#integrity-result-title`.
- A 50,001-character source remained intact, disabled inspection and exposed the explicit first-50,000 choice. Taking that choice produced exactly 50,000 code units.
- A valid surrogate pair ending exactly at the boundary was preserved. A pair crossing the boundary was removed as a complete pair, leaving 49,999 code units with no dangling surrogate or replacement character.
- Empty, normal Markdown upload, unsupported/oversize file, old/new file-read race, edit/check invalidation, programmatic stale-run cancellation, explicit Worker cancellation, short-text suppression and immutable requested-check semantics passed.
- Protected date, currency, number, email and URL spans were recorded. Safe Unicode preview removed only the allowlisted zero-width character; applying it preserved the homoglyph and invalidated stale evidence.
- The downloaded receipt used `application/json`, retained `plain_text` or `markdown` as appropriate, set `contains_content` to false, omitted `source.content`, used a `sha256:` content hash and contained none of the draft.
- The canary draft appeared in no URL, local/session storage, cookie, IndexedDB database, outbound URL or request body. The only attempted external requests were the inherited empty-body Google Tag Manager and HubSpot script loads, which the harness blocked.
- Keyboard tablist navigation, Enter/Space operation and the 3px visible focus outline passed.

## Whole-suite browser smoke

All 11 Content Integrity routes were checked in Chromium at 1440 x 900 and 375 x 812:

- 22/22 routes returned 200.
- 22/22 axe WCAG 2/2.1/2.2 A/AA audits returned zero violations.
- 22/22 had zero horizontal overflow.
- 22/22 breadcrumbs were present, flex-styled, dark-backed, 28px high, correctly below the fixed header at y=98 desktop and y=56 mobile, had `aria-current="page"`, and stayed within their available width.
- The generated Netlify Image CDN URLs return 404 only under plain `astro preview`, which does not implement Netlify's image function. Both raw source assets returned 200 and matched the retained hashes: logo `9117f9d4527b103f8d527b9edf297b0b32876c293a0ce27983dee4bc557c1f74`; hero `ada1b85e077dfa59f5801c556a99d84face6a4d65171cbaa10baa1001e563ded`.

Rendered evidence:

- `evidence/checker-final-regression-2026-08-27/checker-populated-375.png` (`3227a03a37dec77ce61ed1cdabdee91c9757dba339726980ab12eb086c956f23`)
- `evidence/checker-final-regression-2026-08-27/checker-populated-320.png` (`f7f9ea6407ad3016d62064a927b331e6b36bee119459a7c3888ebd99eb288904`)

## Test interpretation

The original 50,000-character ambiguity was a stale/shared-server and harness problem. An initial root build collided with another active build rewriting `dist`; the isolated build passed. Synthetic pointer actions also timed out while the page's smooth scroll moved beneath the fixed header/sticky contact bar. Centring the control instantly showed it as the top hit target, and the keyboard acceptance path passed consistently. Neither behaviour reproduced as checker logic failure.

No commit, push, deployment, publication or submission was performed.

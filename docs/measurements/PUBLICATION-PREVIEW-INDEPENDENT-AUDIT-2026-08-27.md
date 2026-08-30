# Publication preview independent audit

Date: 27 August 2026  
Auditor: independent preview/security lane  
Verdict: **PASS for the final local review boundary**

## Boundary

This was an independent, rendered audit of the temporary publication review desk at `http://127.0.0.1:4319`. It covered the AI Content Integrity inventory, the separately owned Preferred Sources switcher, live refresh, presentation modes, responsive behaviour, links, accessibility and local-server security. It did not publish, deploy, commit or submit anything.

The auditor made no persistent product/source edit. One owner-approved marker was appended to and removed from the Chrome listing source to prove live refresh; exact bytes, mode and nanosecond timestamps were restored. Two owner-approved disposable symlink probes were removed immediately. This evidence file is the only persistent auditor-authored file.

## Exact final sources

**These files are not in this repository and no path below resolves from a checkout.** The review
desk is internal QA tooling, deliberately excluded from every public package — it drives two
unrelated local checkouts and a separate Opace programme, so it is held privately rather than
published. The hashes are retained as the integrity record of exactly what was audited; they can be
checked against the owner's copy, and nothing in this audit's verdict depends on reading the source.

| File, in the private tooling tree | SHA-256 |
|---|---|
| `publication-preview/server.py` | `19c07b5c8d1278b26018cf510206dd9f4bf5d1e556ba5663f71b349f225146b2` |
| `publication-preview/app.js` | `cb5e3f35d070bc909cd4d4218f52e507e65f940b61bf53b082ee806c0c035b76` |
| `publication-preview/index.html` | `5034af1df346d7ee2d2d34b63c21d05b509f7ba27d0955c72c9a0b75b95f7b0e` |
| `publication-preview/preview.css` | `77e0fe35d0e36498061614e27cd3174718853fc17f3aaeece59fae5155776d4b` |
| `publication-preview/start.sh` | `190021c527372070e972e2370218cc99c92368ad6beb24c5a22a4d00e2123d16` |
| Website `src/layouts/BaseLayout.astro`, in the separate website repository | `342ae2308c84682101270b563e5c0ea51dbad5b69906cd0dbcf17245183973c4` |

Final listener proof showed Python bound only to `127.0.0.1:4319`. The independently owned Astro review process was bound to `127.0.0.1:4322` with `OACI_LOCAL_REVIEW_NO_TRACKING=1`.

The later operational-only polish was independently checked after the rendered verdict. `zsh -n` passed for `start.sh`; `server.py` passed `py_compile` with its bytecode redirected to and removed from a temporary cache. A cold alternate-port launch used 15419/15422/15421/18892 while the current 4319/4322/4321/8792 listeners stayed untouched. Startup was deliberately sequential: Content Integrity became ready before the Preferred Sources website started, then the Preferred Sources watcher became ready before the review desk started. There was no Astro data-store race or launcher error. Both suite routes returned 200, the catalogue remained 22/23/24 with all 24 views available, Preferred Sources remained 31/31 PASS with zero blockers, and neither Astro page rendered tracking markers. Ctrl-C exited the preview server cleanly, closed all four alternate listeners and left all four original listeners on their exact original PIDs and returning 200.

## Inventory and rendered presentation

- `/api/catalog` returned exactly **22 intended destinations, 23 unique maintained sources and 24 preview views**.
- The 24 views comprised 11 website pages, 12 Markdown views and one WordPress `readme.txt` view. The Astro README intentionally supplies two views: npm and Astro catalogue.
- AI Content Integrity was the selected/default suite. The separate Preferred Sources control did not replace it.
- All 24 AI Content Integrity views loaded in visible Chromium at 1440 x 900. Each had substantive rendered text, zero broken images, zero unsafe/empty links, zero page errors, zero console errors and no horizontal overflow.
- Markdown used the formatted document shell and platform bar. WordPress `readme.txt` converted its title, sections and subsections and rendered with the WordPress.org platform treatment and `Plugin directory preview` label.
- The final visible run found 22 images across the 24 views and checked every one after explicitly bringing lazy images into view. The apparent footer-image issue in an early run was therefore confirmed as lazy loading rather than a broken asset.
- Search found WordPress, the deliberate no-result state rendered correctly, `/` moved focus to search, the skip link was the first fresh Tab stop, it had a visible outline and activated the titled preview iframe.

The Preferred Sources switcher independently reported **31 surfaces, 31 PASS and zero blockers** from its live watcher. Its navigation contained 31 rows, every matrix row was PASS and every review URL remained on `127.0.0.1:4321` or `127.0.0.1:8792`. Product-hub and Webflow evidence frames loaded, desk search isolated Webflow, and switching back restored AI Content Integrity at 22/23/24 with that suite selected.

## Responsive and breadcrumb proof

- Final screenshots passed at 1440 x 900, 375 x 812 and 320 x 700.
- Root desk and selected WordPress document had no horizontal overflow at 375 or 320. The 320 result is the narrow reflow check.
- All 11 website routes exposed exactly one visible `nav[aria-label="Breadcrumb"]`. Each had the shared dark Opace background `rgb(15, 17, 21)`, a measured 28 px bar, at least one working link and route-specific current text.
- The final mobile breadcrumb showed styled HOME, TOOLS, AI and AI CONTENT INTEGRITY labels in the shared dark bar with no 375 px overflow. It was not the earlier unstyled text treatment.

Screenshots inspected:

- `/tmp/oaci-preview-independent-1440.png`
- `/tmp/oaci-preview-independent-375.png`
- `/tmp/oaci-preview-independent-320.png`
- `/tmp/oaci-preview-independent-preferred-sources-1440.png`
- `/tmp/oaci-preview-independent-suite-switcher-375.png`
- `/tmp/oaci-breadcrumb-independent-final-1440.png`
- `/tmp/oaci-breadcrumb-independent-final-375.png`

## Link and egress proof

- Browser observation across all 24 AI Content Integrity previews recorded requests only to `127.0.0.1:4319` and the owned website process at `127.0.0.1:4322`. Final external-origin count was zero.
- The local-review environment removed the inherited GA4/Google Tag Manager and HubSpot tracking block at render time. Final 4322 HTML contained no `loadTrackingScripts`, `googletagmanager` or `hs-scripts` marker. Production behaviour is unchanged when the review-only environment variable is absent.
- Across the 11 website routes, 113 distinct same-origin links were fetched locally: 113 returned a successful response and zero were unsafe. Seventeen external links were syntax-checked but deliberately not fetched, preserving the no-egress boundary.
- Each rendered preview rejected `javascript:`, `data:` and `file:` link schemes. Markdown output contained no script tag, JavaScript URL or external image source. External HTTP(S) links received a new-tab `noreferrer` treatment.

## Live refresh proof

The owner-approved fixture used `implementation/extensions/submission/chrome-web-store/store-listing.md`.

- Original source version: `1787763338351023269`.
- Fixture source version: `1787829681774383722`.
- The unique marker appeared in `/render?id=chrome-store` without restarting either server.
- After restoration, the marker disappeared and the version returned to `1787763338351023269`.
- SHA-256 before and after: `29f20c00f2ac9112220684393c6ea3dd737e2e1230cb79d0409e80702b1ff738`.
- Bytes, mode and nanosecond modification time matched exactly; no marker remained.

This proves that Markdown/listing source is read on demand. The website views use the owned Astro dev server and its normal live update path.

## HTTP and asset security proof

| Probe | Final result |
|---|---:|
| GET `/` | 200 |
| HEAD `/` | 200 |
| POST `/` | 405 |
| PUT, PATCH, DELETE, OPTIONS, TRACE | denied with 501 by the base handler |
| foreign/missing/malformed Host | 403 |
| foreign or `null` Origin | 403 |
| exact loopback Origin | 200 |
| raw, encoded and absolute traversal | 404 |
| unknown root/item, website item on asset route, non-image | 404 |
| script-shaped render ID | 404 |
| valid allowlisted PNG GET/HEAD | 200; HEAD body zero bytes |
| SVG asset | 404 |
| symlink escaping to `/tmp` | 404; link and target removed, absence verified |

The final server permits only raster PNG, JPEG, GIF and WebP assets resolving under the two allowlisted roots. `resolve(strict=True)` plus the post-resolution root check closes symlink escape. The listener never binds a wildcard or LAN address.

Every successful response carried `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and the local CSP:

`default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-src 'self' http://127.0.0.1:* http://localhost:*; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`

## Accessibility

AccessLint 0.21.0 ran 94 rules against the final desk, direct WordPress render and direct GitHub README render. All three returned **zero violations**. Direct render scans were included because an outer-page scanner does not substitute for auditing iframe documents.

An earlier independent scan found one serious 3:1 contrast failure on `#active-platform`. The final header-only colour `#9b3510` closed it; the rescan returned zero. Keyboard, visible focus, search, narrow reflow and iframe titles also passed the visible browser run. The managed audit Chrome process was stopped after testing.

## Defects found and closed during audit

1. Relative `/render?...` URLs failed under `new URL(item.url)`, blanking all non-website previews. The final code resolves against `location.href`; all 13 affected views then passed.
2. Restarting the original coupled process took 4322 down. The final launcher restores the two website sources, Preferred Sources watcher and review desk in a safe sequence, leaves an existing listener untouched and stops only processes it started.
3. Framed website pages initially attempted GA4, Google Tag Manager, HubSpot and related advertising/analytics egress. The final review-only server environment removes that inherited tracking block and the 24-view browser rerun recorded zero external origins.
4. `#active-platform` initially failed 4.5:1 small-text contrast. The final colour passed the 94-rule rescan.
5. The first cold operational launcher check exposed two Astro servers racing on the shared `.astro/data-store.json.tmp`. The final launcher uses bounded readiness checks and starts the two Astro instances sequentially; the repeated cold launch was clean and its owned processes all closed on exit.

## Remaining release boundary

This PASS applies to the local dynamic review tool and its intended sources. For AI Content Integrity, external public URLs, registries, GitHub, WordPress.org, Chrome Web Store and production deployment remain separate owner-controlled release gates. Preferred Sources keeps its own mixed public/local/private state and evidence; this preview audit did not reclassify it. The 17 Content Integrity external links were not contacted in this no-egress audit. Manual VoiceOver/store-account/public moderation acceptance also remains outside this preview verdict.

## Renamed-route refresh, 27 August 2026

The website task later renamed the Content Integrity family to `/tools/ai/content-verification-integrity/` and renamed its platform routes to `wordpress-plugin`, `chrome-extension`, `astro-integration` and `cli-local-service`. The review desk manifest and health check now follow those current source routes. Removed website sources are no longer advertised as available previews; the maintained methodology research page remains included.

Current catalogue counts are **19 intended destinations, 20 unique sources and 21 views**. A new visible Chromium run rendered all 21 views with substantive content; the smallest rendered body contained 2,861 characters. The formerly blank `web-methodology` selection rendered `AI Content Integrity Methodology`. The same desk then switched to Preferred Sources, showed all 31 navigation items and its substantive product-hub frame, and switched back to Content Verification & Integrity with 21 items restored. Browser errors: zero.

This refresh supersedes only the earlier 22/23/24 inventory and old route names. The earlier security, accessibility and local-only boundary remain unchanged.

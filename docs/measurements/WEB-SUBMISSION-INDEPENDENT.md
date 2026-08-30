# Independent website submission review

Date: 26 August 2026  
Reviewer: independent web submission agent  
Decision: **PASS as an exact local website candidate; BLOCKED from public submission until the candidate is committed, deployed and all 11 production routes are verified live.**

## Exact boundary reviewed

- Website checkout: `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-latest`
- Branch and exact base head: `main` at `a017b516b2722a24eb539b5ef4de595cd201e8c3`
- `HEAD` and `origin/main`: aligned at review time (`0 0` divergence)
- Isolated source/build snapshot: `/tmp/oaci-web-submission.41HxRQ`
- Isolated preview: `http://127.0.0.1:4323`
- Built tree independently counted: 690 static HTML files
- Build result reported for this exact final snapshot: 689 pages and 14,373 image references
- The candidate-owned source in the isolated snapshot matched the current website checkout byte-for-byte after the final rebuild.
- Existing unrelated website work, including the supplied website-cost image and parallel Preferred Sources changes, was not edited, committed, stashed or reset by this review.

The reviewed routes were:

1. `/tools/ai/content-integrity/`
2. `/tools/ai/content-integrity/checker/`
3. `/tools/ai/content-integrity/claude-watermark-readiness-lab/`
4. `/research/claude-synthid-text-watermark/`
5. `/research/methodology/ai-content-integrity/`
6. `/tools/ai/content-integrity/browser-extension/`
7. `/tools/ai/content-integrity/wordpress/`
8. `/tools/ai/content-integrity/astro/`
9. `/tools/ai/content-integrity/cli/`
10. `/tools/ai/content-integrity/privacy/`
11. `/tools/ai/content-integrity/support/`

## Independent test result

| Gate | Result | Exact evidence |
|---|---:|---|
| **Rendered browser matrix** | PASS | 66/66 route runs passed: 11 routes in Chromium, Firefox and WebKit at 1440 x 1000 and 375 x 812 |
| **HTTP/runtime** | PASS | All 66 returned 200 with no unexpected failed responses, console errors or page errors |
| **Metadata and semantics** | PASS | Every route had one unique title, one unique 70-200 character description, one unique H1, one `main`, and the exact self-referencing trailing-slash canonical |
| **Structured data** | PASS | Every JSON-LD block parsed on all routes; no malformed block was found |
| **Responsive layout** | PASS | No horizontal overflow at 1440, 375 or 320 CSS pixels; 320px covered the 1280px-at-400%-zoom reflow equivalent |
| **Accessibility automation** | PASS | axe-core 4.13.0 returned zero WCAG 2 A/AA, 2.1 A/AA and 2.2 AA violations on all 22 Chromium route/viewport audits |
| **Keyboard** | PASS | Mobile menu Enter/Escape, checker tablist arrows/Home, keyboard submission, result-heading focus, FAQ toggle and visible focus outline passed |
| **Checker workflow** | PASS | Unicode evidence, six fixed method rows, explicit unsupported Anthropic state, allowlisted preview, empty-input validation and local Markdown upload passed |
| **Receipt privacy** | PASS | Downloaded JSON receipt parsed, set `contains_content` to false and did not contain the inspected draft text |
| **No-JavaScript boundary** | PASS | H1, method limitations, unsupported production-verification wording and the explicit JavaScript requirement remained readable |
| **Static output** | PASS | All 11 exact route HTML files existed; titles, descriptions, H1s, mains, canonicals and JSON-LD also passed from static HTML rather than a hydrated DOM |
| **Sitemap and links** | PASS | All 11 routes appeared in `sitemap-0.xml`; 114 distinct same-origin links found across the pages returned 2xx or 3xx locally |
| **Control names** | PASS | No unnamed visible link, button, input, textarea or select was found in the 66 rendered runs |
| **Source hygiene** | PASS | Candidate source scan found no local user path, localhost address, private-key marker, AWS key pattern, OpenAI-style key pattern, TODO/FIXME/XXX sentinel or placeholder store/download destination |
| **Visual review** | PASS | 22 full-page Chromium screenshots plus desktop/mobile contact sheets were inspected. Hero, evidence sheet, sections, product notices, research prose, checker, privacy, support and footer matched the existing Opace visual family without clipping after remediation |

Raw local run outputs were written under `/tmp/oaci-web-independent/` during the review. The final machine-readable browser report contains zero failures across 66 records; the final static report contains zero failures across 11 routes and 114 internal links.

## Defects found and closed during independent review

1. The fixed global header originally overlaid the breadcrumb. At 375px the header occupied `y=0-56` while the breadcrumb began at `y=0`; at 1440px the header occupied `y=0-97.52` while the 51px breadcrumb was completely hidden. The candidate-scoped offset now starts the breadcrumb at `y=56` on mobile and `y=98` on desktop. The complete browser, static, responsive, keyboard and axe gates were rerun afterwards.
2. The first offset fix placed the translucent header over the wrapper's light paper background. axe then measured the two desktop header contact links at 4.46:1 instead of the required 4.5:1. A candidate-scoped dark background was applied only beneath the 98px/56px header offset. The complete browser gate then returned zero violations and zero other failures.

## Moderation and claim review

- The browser checker is presented as available on the website, but no package or directory listing is presented as public before approval.
- Chrome version 1.0.0 is labelled prepared for Chrome Web Store review. The page says the verified store link appears only after Google approves it.
- WordPress, Astro, CLI and local-service pages consistently describe tested/private release candidates and state that submission or publication has not happened.
- Astro version 0.1.0 is described as report-only and does not claim to stop a build.
- No page claims authorship proof, universal AI probability, Claude production verification or watermark removal.
- The privacy page covers deliberate Chrome selection/article/paste capture; transient in-memory hostname/title labelling; no storage, transmission or receipt inclusion for hostname/title; no host permissions, remote code, analytics, advertising, sale, transfer, creditworthiness use or human review; local settings/data clearing; and the Chrome Web Store Limited Use statement.
- The support page gives product-specific requirements, restricted-page behaviour, safe reporting guidance and a direct Opace contact route without asking users to expose drafts or credentials.
- Source copy contains no unapproved public download, WordPress.org plugin, Chrome Web Store, npm, PyPI or GitHub destination.

## Remaining public release gate

All 11 intended production URLs returned HTTP 404 during the final review. This is expected for an uncommitted local candidate, but it is a hard public-submission blocker because store and directory reviewers must be able to open the declared privacy, support and product URLs.

The website lane is ready for owner approval of the coordinated release sequence only. It must not be called live or submission-ready in public until:

1. the candidate-owned website files are isolated from unrelated WIP and committed to the verified Opace website repository;
2. the commit is pushed through the normal GitHub-to-Netlify route;
3. the exact deployed commit is observed;
4. all 11 production URLs return 200 with matching canonicals, copy, privacy/support disclosures, schema, links, responsive behaviour and zero candidate accessibility regressions; and
5. the production deployment is then used as the URL set for the relevant store and directory submissions.

No commit, push, deployment, public repository action, registry publication or store submission was performed by this independent review.

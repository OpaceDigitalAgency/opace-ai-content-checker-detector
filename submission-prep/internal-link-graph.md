# Publication internal-link graph

Checked: 27 August 2026

`Live` means the exact HTTPS destination returned its intended public content during this check. `Built, not re-verified` means the route exists in the deployed site build and the site went live on 28 August 2026, but this pass did not re-request it over HTTPS. The `Prepared, 404` label used in the 26–28 August editions of this file was retired on 29 August 2026: it recorded destinations under `/tools/ai/content-integrity/`, a path prefix that was never built. Every such link now points at the route that exists under `/tools/ai/content-verification-integrity/`, with privacy at `/privacy-policy/` and support at `/get-in-touch/`. Local relative documentation links passed the public-tree link audit; they are labelled separately because no public repository exists.

## Organisation and repository directions

| Source | Anchor or field | Destination | Purpose | Live status |
|---|---|---|---|---|
| Opace organisation profile | future pinned repository/profile link | `https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` | Organisation to product repository | Not present; target 404 |
| GitHub About | homepage field | `https://opace.agency/services/artificial-intelligence/` | Closest Opace commercial service | Live, 200 |
| GitHub README | Content Integrity product page / Explore Opace AI Content Integrity | `https://opace.agency/tools/ai/content-verification-integrity/` | Canonical product route | Built, not re-verified |
| GitHub README | Try the browser checker / Check visible text in your browser | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | First useful web action | Built, not re-verified |
| GitHub README | Explore Opace AI and automation services | `https://opace.agency/services/artificial-intelligence/` | Commercial service | Live, 200 |
| GitHub README | Opace Digital Agency | `https://opace.agency/` | Publisher identity | Live, 200 |
| GitHub README | Opace Digital Agency on GitHub | `https://github.com/OpaceDigitalAgency` | Organisation/product hub | Live, 200 |
| GitHub README | Read the privacy notice | `https://opace.agency/privacy-policy/` | Privacy disclosure | Built, not re-verified |
| GitHub README | Get support / Content Integrity support page | `https://opace.agency/get-in-touch/` | Support route | Built, not re-verified |
| GitHub README | Compare protected rewrites in the checker | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | Working comparison experience | Built, not re-verified |
| GitHub README | Review Claude watermark readiness evidence | `https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/` | Claude readiness | Built, not re-verified |
| GitHub README | Read the AI Content Integrity methodology | `https://opace.agency/tools/ai/content-verification-integrity/research/methodology/` | Evidence and acceptance method | Built, not re-verified |
| GitHub README | Astro integration / CLI / Chrome extension / WordPress / contracts | local relative README links | Component discovery inside repository | Local links pass; public state held with repository |

## Website routes

| Source | Anchor | Destination | Purpose | Live status |
|---|---|---|---|---|
| Suite overview | Inspect a draft | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | Primary product action | Built, not re-verified |
| Suite overview | Browse all Opace tools | `https://opace.agency/tools/` | Parent discovery hub | Live, 200 |
| Checker | Open methodology / Read CLI and methods guidance | `https://opace.agency/tools/ai/content-verification-integrity/research/methodology/` | Explain status and receipt rules | Built, not re-verified |
| Checker | Review Claude readiness | `https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/` | Related evidence lab | Built, not re-verified |
| Checker | AI consulting from Birmingham for organisations across the UK and internationally | `https://opace.agency/services/artificial-intelligence/chatgpt-engineer-consultant-services/` | Relevant commercial route with geographic scope stated | Live, 200 |
| Checker | View the full suite | `https://opace.agency/tools/ai/content-verification-integrity/` | Parent product route | Built, not re-verified |
| Claude readiness lab | Claude SynthID text-watermark research note | `https://opace.agency/research/claude-synthid-text-watermark/` | Supporting research | Built, not re-verified |
| Claude readiness lab | AI content integrity methodology | `https://opace.agency/tools/ai/content-verification-integrity/research/methodology/` | Acceptance method | Built, not re-verified |
| Claude readiness lab | View the suite | `https://opace.agency/tools/ai/content-verification-integrity/` | Parent product route | Built, not re-verified |
| Claude research note | Claude Watermark Readiness Lab | `https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/` | Reproduction route | Built, not re-verified |
| Claude research note | methodology | `https://opace.agency/tools/ai/content-verification-integrity/research/methodology/` | Evidence rules | Built, not re-verified |
| Claude research note | View the suite | `https://opace.agency/tools/ai/content-verification-integrity/` | Parent product route | Built, not re-verified |
| Methodology | Claude Watermark Readiness Lab | `https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/` | Apply fixture rules | Built, not re-verified |
| Methodology | Open the checker | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | Apply deterministic checks | Built, not re-verified |
| Methodology | Read the Claude research note | `https://opace.agency/research/claude-synthid-text-watermark/` | Supporting research | Built, not re-verified |
| Privacy | AI Content Integrity support page | `https://opace.agency/get-in-touch/` | Privacy/help escalation | Built, not re-verified |
| Privacy | contact page | `https://opace.agency/get-in-touch/` | General privacy contact | Live, 200 |
| Support | Opace contact page | `https://opace.agency/get-in-touch/` | Owned support contact | Live, 200 |
| Browser extension page | suite/privacy/support cross-links in shared candidate content | Corresponding Content Integrity routes | Product, policy and help continuity | Local 11-route suite verified; production targets 404 |
| WordPress page | suite/privacy/support cross-links in shared candidate content | Corresponding Content Integrity routes | Product, policy and help continuity | Local 11-route suite verified; production targets 404 |
| Astro page | suite/privacy/support cross-links in shared candidate content | Corresponding Content Integrity routes | Product, policy and help continuity | Local 11-route suite verified; production targets 404 |
| CLI page | suite/privacy/support cross-links in shared candidate content | Corresponding Content Integrity routes | Product, policy and help continuity | Local 11-route suite verified; production targets 404 |

## npm, Astro and PyPI directions

| Source | Anchor or field | Destination | Purpose | Live status |
|---|---|---|---|---|
| Contracts npm README | Opace AI Content Integrity | `https://opace.agency/tools/ai/content-verification-integrity/` | Parent product | Built, not re-verified |
| Contracts npm README | Developer and CLI guide | `https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/` | Practical integration guide | Built, not re-verified |
| Core npm README | Browser checker | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | Working product example | Built, not re-verified |
| Browser npm README | Browser checker | `https://opace.agency/tools/ai/content-verification-integrity/checker/` | Working product example | Built, not re-verified |
| Browser npm README | Chrome extension | `https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/` | Related surface | Built, not re-verified |
| Client npm README | Local CLI and API guide | `https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/` | Integration guide | Built, not re-verified |
| Client npm README | Privacy notice | `https://opace.agency/privacy-policy/` | Data-route disclosure | Built, not re-verified |
| CLI npm README | CLI and local API guide | `https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/` | Canonical CLI guide | Built, not re-verified |
| CLI npm README | Privacy notice | `https://opace.agency/privacy-policy/` | Data-route disclosure | Built, not re-verified |
| Contracts/core/browser/client/CLI READMEs | AI and automation services | `https://opace.agency/services/artificial-intelligence/` | Closest service | Live, 200 |
| Contracts/core/browser/client/CLI READMEs | Opace | `https://opace.agency/` | Publisher identity | Live, 200 |
| Contracts/core/browser/client/CLI READMEs | Opace Digital Agency on GitHub | `https://github.com/OpaceDigitalAgency` | Organisation hub | Live, 200 |
| Contracts/core/browser/client/CLI READMEs | MIT Licence / security policy | `https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/...` | Licence and security evidence | Target repository 404 until publication |
| Astro npm README/catalogue | Opace AI Content Integrity for Astro | `https://opace.agency/tools/ai/content-verification-integrity/astro-integration/` | Canonical integration page | Built, not re-verified |
| Astro npm README/catalogue | privacy / support | Corresponding Content Integrity privacy/support routes | Trust and support | Built, not re-verified |
| Astro npm README/catalogue | Opace artificial intelligence services | `https://opace.agency/services/artificial-intelligence/` | Closest service | Live, 200 |
| Astro npm README/catalogue | Opace Digital Agency on GitHub | `https://github.com/OpaceDigitalAgency` | Organisation hub | Live, 200 |
| PyPI README | CLI and local-engine documentation | `https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/` | Canonical project guide | Built, not re-verified |
| PyPI README | Privacy / Support | Corresponding Content Integrity routes | Trust and help | Built, not re-verified |
| PyPI README | repository policy, notices and dependency ledger | `https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/...` | Source/security/licence evidence | Target repository 404 until publication |

## Store directions

| Source | Field or anchor | Destination | Purpose | Live status |
|---|---|---|---|---|
| WordPress.org readme | Opace AI Content Integrity on GitHub | `https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` | Source and issue discovery | Built, not re-verified |
| WordPress.org readme | Content Integrity privacy notice | `https://opace.agency/privacy-policy/` | Required privacy disclosure | Built, not re-verified |
| WordPress.org readme | Content Integrity support page | `https://opace.agency/get-in-touch/` | Owned support | Built, not re-verified |
| WordPress.org plugin header/listing | Plugin URI | `https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/` | Canonical plugin landing page | Built, not re-verified |
| Chrome Web Store | Official website | `https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/` | Canonical extension page | Built, not re-verified |
| Chrome Web Store | Privacy policy | `https://opace.agency/privacy-policy/` | Required data disclosure | Built, not re-verified |
| Chrome Web Store | Support URL | `https://opace.agency/get-in-touch/` | Owned support | Built, not re-verified |

## Destination publication state

| Destination family | Exact state on 27 August 2026 |
|---|---|
| 11 Opace Content Integrity website routes | All returned 404 in production; local rendered/link QA remains green |
| GitHub repository | Exact target returned 404; organisation profile returned 200 |
| Six npm packages | Registry API returned 404 for every prepared name; rendered npm pages returned access-denied responses to automated requests and were not treated as publication evidence |
| Astro catalogue entry | Catalogue is live, but no Opace Content Integrity entry exists because the npm package is unpublished |
| PyPI project | JSON API returned 404; the human project URL redirected to search and is not a live project |
| WordPress.org plugin | Exact slug redirected to directory search and is not a live plugin listing |
| Chrome Web Store | No target item ID or public listing exists |

## Required pre-submission corrections and post-publication checks

1. Deploy and verify every intended product/privacy/support route before any store submission.
2. After publication, verify visible anchor text, redirects, canonical URL, organisation-to-repository discovery, topic placement and each registry/store link. Record public, rendered, indexed and ranking states separately.

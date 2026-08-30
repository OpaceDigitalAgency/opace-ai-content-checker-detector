# Tool-page design reconciliation

Date: 27 August 2026  
State: local website candidate; no commit, push or deployment

## Scope

The rendered Opace tool family was reconciled after owner visual review. The active references were the current Astro Visual Editor page, the service-page breadcrumb pattern and the supplied desktop captures. The final matrix covers 28 routes: every maintained tool route, the four new category hubs, the three Preferred Sources pages and the two Content Integrity research routes that use the same product shell.

## Changes

- Individual Content Integrity and Preferred Sources pages now use the same restrained product-identity pattern as the established Astro and WordPress tools. Category hubs remain logo-free and use a functional catalogue panel instead.
- The shared dark Opace breadcrumb sits flush at the lower edge of each dark tool hero. It is used once per route, keeps one matching `BreadcrumbList`, and is now present across the catalogue, category hubs, Astro, WordPress, calculator, resource, Preferred Sources and Content Integrity tool families.
- `/tools/ai/`, `/tools/astro/`, `/tools/wordpress/` and `/tools/resources/` are now real category hubs, so meaningful tool ancestors no longer point at 404 pages. Each follows the shared dark hero, dark breadcrumb, warm-grey collection and dark closing rhythm.
- The inherited global `nav a` minimum width was explicitly neutralised inside breadcrumbs. This removed the irregular gaps around short ancestors such as `AI` while preserving accessible focus styling.
- On 375 px and 320 px screens, long five-level trails wrap to a compact second line so the current page remains visible; ancestors are not silently removed.
- Content Integrity now alternates light and dark content bands. Its product artwork is integrated into an explanatory split section rather than placed as a standalone banner.
- FAQ content uses the full shared shell and a balanced two-column layout on desktop, stacking on narrow screens.
- Section spacing, card borders, divider colours and light/dark eyebrow colours were normalised. Category cards now use a purposeful numbered status rail, full-card links and a compact mobile treatment. Content Integrity planned states use the same charcoal surface as available states, with status expressed through copy and border treatment rather than clashing beige cards.
- Horizontally scrollable provider tables and terminal examples are keyboard-focusable.
- The Preferred Sources hub, checker and generator no longer repeat the generic 1774 × 887 family banner directly below their heroes. Visible hero headings are shorter while full search phrases remain in metadata. The checker screenshots now sit in a labelled evidence section; the generator's oversized full-page capture was removed. Genuine result and WordPress analytics screenshots remain beside the content they substantiate. The family banner remains available only as page/social metadata artwork.

## Verification

- Final isolated production build: PASS, 693 pages and 14,408 optimised image references.
- Complete Chromium route matrix: PASS, 28 routes at 1440 x 900, 375 x 812 and 320 x 800; 84/84 runs returned HTTP 200 with one dark breadcrumb flush below the hero, no horizontal overflow, no page errors and zero axe violations.
- Dedicated breadcrumb integrity matrix: PASS, 84/84. Visible labels match the sole `BreadcrumbList`, linked ancestors return 200, item boxes have zero unexplained inter-item gaps, the strip is dark and every breadcrumb follows its hero directly.
- Independent four-width visual QA: PASS, 112/112 route/viewport renders at 1440, 768, 375 and 320 px. The focused narrow breadcrumb rerun passed 56/56: every item remained visible, long trails used at most two lines (46 px), all ancestors returned 200 and the strip stayed flush with the hero.
- The independent resource CTA contrast rerun passed 20/20 across five resource pages and four widths with zero axe violations or overflow. Keyboard sampling retained visible focus outlines, and all 26 encountered lazy-media URLs returned 200.
- Focused Content Integrity geometry remains green. The shared FAQ grid now also covers the checker and Claude readiness pages. Mobile routes stack without overflow.
- Final full-page captures were visually inspected at `/tmp/content-integrity-redesign-desktop.png` and `/tmp/content-integrity-redesign-mobile.png`. The dark hero, light breadcrumb, integrated evidence artwork, alternating bands, full-width FAQ, agency links and closing section form one consistent Opace narrative.
- `git diff --check` on the bounded source set: PASS.
- Preferred Sources follow-up: all three pages were visually re-inspected at 1440 and 375 px after the redundant banners were removed. Their seven remaining in-page images loaded at their natural dimensions, and both owned local website processes rendered zero `ps-family-banner` instances.
- Final whole-family lazy-media pass: PASS, 56/56 records across all 28 routes at desktop and 375 px; every route returned 200 with one H1, one breadcrumb, no horizontal overflow, no page errors and no broken image after a real scrolling load.

No public action was taken. Existing unrelated checkout changes were preserved.

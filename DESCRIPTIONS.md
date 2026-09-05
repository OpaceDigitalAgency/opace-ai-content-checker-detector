# AI content checker descriptions and discovery copy

Updated 5 September 2026. These are source descriptions, not evidence of marketplace publication. The website and GitHub source are public; verify every directory and its version before changing that status.

## Canonical platform descriptions

Maintain the complete, platform-specific copy in these files. Do not paste one privacy statement across all packages.

| Surface | Full description and instructions | Metadata |
|---|---|---|
| GitHub | [Main README](README.md) | [Repository fields](submission-prep/github-fields.md) |
| WordPress.org | [Directory readme](wordpress/opace-ai-content-checker-detector/readme.txt) | Plugin header and stable tag: 1.1.3 |
| Chrome Web Store | [Store description](extensions/submission/chrome-web-store/store-listing.md) | [Field values](extensions/submission/chrome-web-store/field-values.json), 1.2.1 |
| Astro and npm | [Astro README](packages/astro/README.md) | [Astro package](packages/astro/package.json), 0.3.1 |
| TypeScript developer packages | Component READMEs linked below | Public candidates: 0.3.1 |
| Python and PyPI | [Local engine README](services/local-engine/README.md) | [PyPI metadata](services/local-engine/pyproject.toml), 0.3.1 |

The WordPress description covers the model, section evidence, editor workflow, character checks, C2PA, reports, privacy routes, allowances, installation, FAQs, screenshots, related tools, support and licences. The Chrome description adds capture methods and permission explanations. Developer documentation separates model-backed detection from model-free building blocks.

## Free AI content checker: reusable introduction

Opace AI Content Checker & Detector is a free AI content checker for reviewing AI-assisted drafts, hidden characters and the evidence behind a reading. Use the online checker, or choose the WordPress, Chrome, Astro or local developer workflow. The full trained detector provides section scores and the passages behind them. Character checks and editorial suggestions remain separate from the AI reading.

A result is a reason to review the writing, not proof of authorship. False positives and misses occur. The checker does not identify a particular generator, search the web for plagiarism or verify every statement in a draft. Review the published measurements and the privacy route for the product you use.

[Try the free AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Opace](https://opace.agency/) · [AI services](https://opace.agency/services/artificial-intelligence/) · [Opace on GitHub](https://github.com/OpaceDigitalAgency)

## AI content detector keyword coverage

Use the primary phrase in the introduction and a relevant heading. Add variations only where they describe a real workflow; avoid repeating every term in every section.

| Intent | Natural language | Where it belongs |
|---|---|---|
| Free text review | free AI content checker, free AI content detector, AI writing checker, AI text detector | Main introduction, use cases and FAQs |
| WordPress editing | AI checker for WordPress, WordPress AI detector | Plugin description, editor workflow and installation |
| Browser review | Chrome AI detector, AI checker for selected text | Extension introduction, page capture and permissions |
| Astro development | Astro AI content checker, on-device AI detector | Toolbar guide; never imply the build scan runs the model |
| Local development | local AI content checker, AI detector CLI, Python AI detector | Local engine setup and optional model configuration |
| Model-family questions | ChatGPT detector, Claude AI checker, Gemini AI text | Qualified FAQ; never promise generator identification |
| Text integrity | hidden characters, invisible Unicode, lookalike letters, AI watermark checks | Separate character checks and unsupported-provider limits |
| Provenance | C2PA, Content Credentials checker | Media workflow; never call it an AI-image classifier |

These phrases are based on the user brief and observed search language, not measured volume or difficulty. No ranking, indexing, accuracy or competitor-superiority guarantee is authorised.

## Developer package descriptions

- [contracts](packages/contracts/README.md): TypeScript contracts and evidence schemas for AI content checker integrations: model status, scored sections, privacy routes and receipts. No detector runtime.
- [core](packages/core/README.md): Free offline text-checking engine for AI content checker applications: invisible Unicode, lookalike letters, protected facts, editing signals and receipts. Model-free.
- [browser](packages/browser/README.md): Browser adapter for AI content checker applications: visible-text extraction, local Web Worker inspection and cancellation. No bundled AI detector model.
- [client](packages/client/README.md): Typed local API client for AI content checker integrations: authenticated loopback requests and validated results, with no cloud fallback.
- [cli](packages/cli/README.md): Free AI content checker CLI: offline text checks, receipts and printable reports, plus AI detection through an explicitly configured local Python model.

Astro: Free AI content checker and on-device AI detector for Astro Dev Toolbar: section evidence, passage highlights and reports, plus model-free build checks.

Python: Free local AI content checker CLI and authenticated loopback API, with optional pinned ONNX model detection, section evidence and content-free receipts.

## Privacy and feature boundaries

- WordPress: the full workbench offers on-device detection and separately enabled, confirmed EU analysis. Editor quick checks use a smaller PHP subset. WordPress authentication still applies.
- Chrome: on-device detection is available after asset consent. EU analysis requires explicit permission and service enablement; do not advertise it as live while the Chrome allowlist gate remains closed.
- Astro: interactive on-device detection; unattended build checks are model-free. Neither route sends page text to the EU detector.
- Core, browser adapter and contracts: no trained model and no detector runtime. The client talks to an explicitly configured local API.
- CLI and Python: AI detection requires a configured local model. No automatic cloud fallback.
- Full text PDF/HTML reports contain scored passages. Content-free receipts and result links do not.
- C2PA checks inspect credentials, not image generation. Missing or untrusted credentials are inconclusive.
- Private provider text watermarks, automatic rewriting, plagiarism search and guaranteed watermark removal are not supplied.

## Evidence required beside detection rates

 The evidence block (paste this wherever a rate appears)

**Every channel that quotes a detection rate must carry this block, or a link plus the weakest
case.** It exists so the three surfaces stop drifting: change it here, then propagate. A rate
without its weakest case is a marketing number and is not permitted anywhere .

> **Measured, at the operating point that ships.** On the full 5,558-document long-form evaluation
> corpus, Cycle 5 flags **902 of 922 AI documents (97.8%)** on our EU server route and **900 of 922
> (97.6%)** in the browser, while wrongly flagging **46 of 4,636 human documents (0.99%)** on the
> server and **73 of 4,636 (1.57%)** in the browser. This corpus is not wholly independent: 654 of
> the 922 AI documents are independent of every Cycle 2 split and 268 are not; 11 of 4,636 human
> documents overlap. On the separate topic-matched held-out slice, the server route flags 153 of
> 176 AI documents and 1 of 418 structured human partners.
>
> **Fiction remains higher-risk than the overall human set.** **7 of 227 human stories (3.1%)** are
> wrongly flagged on the server route and **8 of 227 (3.5%)** in the browser. Novelists should
> treat a flagged result as evidence to review, never an authorship decision.
>
> **Short text is improved, but the measured cell is small.** At 100 words the server evaluation
> route detects **43 of 56 held-out AI passages (76.8%)**. Do not generalise that figure without
> its denominator.
>
> **Heavy AI edits of human originals** are deliberately treated as machine-assisted and **39 of
> 137 (28.5%)** are flagged. That boundary is a product judgement, not proof of authorship.
>
> Every measured rate, by document length, by the model that wrote the text and by content type,
> each with its denominator and a 95% confidence interval:
> https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/

**Where a surface is too small for both halves, it gets the weakest case and the link, never the
headline alone.** Do not present a pooled result as an untouched independent test.

**Operating points are not interchangeable, and every legacy figure in this file names its own.**
The 90.3%/1.34% pair is the pre-segmentation Cycle 2 browser runtime. The 12.69% fiction figure is
Cycle 2 at the 0.980 flag point, and 11.15% (29/260) is its superseded single-threshold 0.984 rule.
**Cycle 5 at the deployed margin rule reads 7/227 = 3.1% on the server route and 8/227 = 3.5% in
the browser.** Do not place a row from one operating point beside a row from another.


## Links and publication checks

Link to the closest product guide, GitHub source, organisation profile, related Opace tools and relevant commercial service. Keep [AI Scribe](https://wordpress.org/plugins/ai-scribe-the-chatgpt-powered-seo-content-creation-wizard/) and [Essential SEO Toolkit](https://wordpress.org/plugins/opace-essential-seo-toolkit/) as separate tools, not bundled integrations.

Use the Chrome product-information page until a public Chrome Web Store listing is verified. Likewise, package-install instructions must say when publication is still pending. Before release, validate exact packaged copy, images, permissions, versions and hashes; source edits do not update an already frozen archive.

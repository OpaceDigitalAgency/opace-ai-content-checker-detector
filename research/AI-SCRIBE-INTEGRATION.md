# AI Scribe integration analysis

> **Public research snapshot.** This first-party brief preserves the evidence and decisions available on its stated research date. It may contain historical versions or planned work. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) and [research index](../docs/RESEARCH-INDEX.md) before quoting a current claim.

## Verified current state

The inspected canonical AI Scribe checkout identified version 3.2.36, while the latest observed WordPress.org result during this research was 3.2.35. The checkout contained unrelated uncommitted user changes; none were altered.

AI Scribe's Humanizer is currently a prompt treatment. It asks the selected model to vary sentence and paragraph length, use natural language, address the reader and avoid repetitive openings. Its public documentation correctly avoids guaranteeing that detectors will pass.

It does not currently provide:

- a named live detector or detector-version receipt;
- a statistical-watermark verifier;
- semantic, numeric, entity, quotation or citation locks;
- multiple rewrite candidates and independent verification;
- local C2PA inspection;
- a held-out false-positive/quality benchmark.

## Recommended feature design

Retain the existing Humanizer for compatibility, but introduce an **Editorial Rewrite Lab** behind a feature flag:

1. Capture immutable facts: named entities, figures, dates, quotations, links and citations.
2. Run deterministic quality linting locally.
3. Generate two or more candidates, optionally using a non-origin model. Warn that another vendor may add its own watermark.
4. Reject candidates that break facts, links or semantic-similarity thresholds.
5. Show a sentence-level diff and allow selective acceptance.
6. Run only explicitly configured detector adapters with customer-owned keys.
7. Save an audit receipt: origin model, rewrite model, prompt/version, checks, detector/version, scores, time and approval.
8. Add Anthropic's adapter only when its official detector specification and access are available.

## Architecture boundary

Use a provider-neutral TypeScript core for browser checks and receipt schemas. The WordPress plugin can provide a GPL PHP bridge and editor UI. AI Hub remains responsible for encrypted provider keys and requests; AI Scribe owns writing/editor workflow. This preserves the existing companion separation.

Do not add this work to the dirty 3.2.36 checkout during research. Create a dedicated implementation branch only after the owner agrees the product boundary and acceptance tests.

## Acceptance tests for a later build

- Protected facts, figures, links, citations and code survive byte-for-byte where required.
- Meaning-retention and readability thresholds pass on a held-out human-reviewed corpus.
- False positives are measured on genuine human text.
- Every detector result names provider, endpoint/version, threshold and timestamp.
- Unsupported Anthropic verification is rendered as unsupported, never inferred.
- WordPress editor behaviour is tested in the exact package at desktop and 375 px.
- Existing AI Scribe settings, content and Hub integration regressions pass before packaging.

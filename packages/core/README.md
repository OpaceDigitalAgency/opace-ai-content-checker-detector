# @opace/content-integrity-core

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Deterministic, offline content-integrity engine: invisible-Unicode and homoglyph forensics, named writing-signal rules with an editorial score, protected spans, safe-fix previews, diffs, gates and RFC 8785 hash-only receipts. This is the single analysis implementation used by every Opace surface (web checker, WordPress plugin, Chrome extension, Astro integration, CLI).

- Consumes `@opace/content-integrity-contracts` contract `1.0.0`
- Browser/SSR-safe ESM, transport-free by design: no network call, telemetry or postinstall download
- Unicode carriers: 38 rules over 415 code points, with context exemptions for emoji, cursive/Indic scripts and French typography (`unicode:2026.08.2`)
- Homoglyphs: 60 Cyrillic/Greek confusables with a mixed-script gate
- Writing signals: 103 weighted categories (106 named rules) at `en-signals:2026.08.4`
- Protected spans: 12 kinds including name, organisation and citation
- `watermark.anthropic` remains visibly `unsupported` until an official interface exists
- Licence: MIT for the Opace-authored package

A pass applies only to its named disclosed check and does not prove authorship or detector clearance. The full capability inventory is in the repository's [capability register](../../docs/CAPABILITIES.md).

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install @opace/content-integrity-core
```

Targets ESM on modern browsers and Node.js 20 or newer.

## API

```js
import {
  inspect,                    // full analysis over an AnalysisRequest
  computeEditorialSignals,    // 0-100 writing-signal score for plain text
  inspectSignalsV2,           // raw signal findings
  inspectUnicode,             // carrier/homoglyph findings for a string
  extractProtectedSpans,      // 12 protected-span kinds
  previewSafeFixes, diff, validateCandidate,
  buildReceipt, verifyReceipt,
  listMethods, registerPatternPack,
  projectVisibleText, prefixedSha256, sha256Hex, utf8Bytes,
  UNICODE_RULES_VERSION, EN_SIGNALS_PATTERN_VERSION,
} from "@opace/content-integrity-core";
```

### Full inspection

`inspect(request)` takes a contract `AnalysisRequest` and returns a frozen `AnalysisResult` with per-method statuses, evidence, limitations and hashes. Verified example (output from the built package):

```js
const result = await inspect({
  schema_version: "1.0",
  contract_version: "1.0.0",
  request_id: "req_readme_demo",
  created_at: new Date().toISOString(),
  source: { content: "In today's rapidly evolving landscape, Opace quoted £1,250.​",
            content_type: "plain_text", language: "en-GB" },
  checks: ["unicode.invisible", "style.patterns", "watermark.anthropic"],
  privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false }
});

result.summary;
// { pass: 0, attention: 2, fail: 0, inconclusive: 0, unsupported: 1, not_configured: 0, not_run: 0, error: 0 }
result.methods.map(m => [m.id, m.status]);
// [["unicode.invisible","attention"], ["style.patterns","attention"], ["watermark.anthropic","unsupported"]]
result.protected_spans.map(s => s.kind);
// ["currency", "number"]
```

The zero-width space hidden in the sample content is what turns `unicode.invisible` to `attention`. Statuses come from the fixed vocabulary `pass | attention | fail | inconclusive | unsupported | not_configured | not_run | error`; unrun checks are never collapsed into a pass, and a zero-finding pattern run carries a scope note stating it is not evidence of human authorship.

### Editorial signals score

```js
const signals = computeEditorialSignals(draftText);
// { score: 23, classification: "mixed_signals", probabilities, confidence: "low",
//   categoriesHit, findingCount, wordCount, version: "en-signals:2026.08.4",
//   status: "scored", description }
```

Classification is trinary (`human_like` / `mixed_signals` / `ai_like`) and false-negative-biased by design. Never present it as authorship detection: clean, well-prompted AI prose scores low on any rule tier, which is why the result vocabulary says "no strong AI-style signals" rather than "human".

### Unicode findings

```js
inspectUnicode("claim​ed");
// [{ code_point: "U+200B", severity: "medium", fix: "remove", span: {...},
//    matched_text_hash: "sha256:...", limitations: [...] }]
```

## Test and integration boundary

```sh
npm ci
npm test
npm run pack:check
```

Use the typed exports rather than copying algorithms into a consumer; browser, Astro, CLI and extension adapters must produce the same stable fields for the same projected input, and the repository's cross-surface battery enforces this. Consumers remain responsible for explicit user consent before inspecting content and for keeping content out of logs and receipts.

## Attribution

The writing-signal rules and stylometrics are adapted from **avoid-ai-writing** (MIT, Conor Bronsdon and contributors); carrier and confusable table data are adapted from **watermarks-remover** (MIT, Guillaume Meyer) and derived from **Unicode Consortium** category data. The runtime dependency `canonicalize@4.0.0` (Apache-2.0) supplies RFC 8785 canonicalisation. Exact records: project-root `THIRD_PARTY_NOTICES.md` and `docs/legal/DEPENDENCY-LEDGER.md`.

## Troubleshooting and links

- **A check reports `unsupported`:** preserve that result. Do not replace it with a different method or a pass.
- **Browser and server output differ:** confirm both adapters supplied the same projected UTF-8 text and use the same contract/core versions (`UNICODE_RULES_VERSION`, `EN_SIGNALS_PATTERN_VERSION` are exported for exactly this).
- **A safe fix changes protected content:** reject the candidate and inspect the protected-span gate before applying any text.

Report security concerns through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/SECURITY.md). For non-sensitive help, use [Content Integrity support](https://opace.agency/tools/ai/content-integrity/support/). Changes follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-integrity/) · [Browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Capability register](../../docs/CAPABILITIES.md) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related contracts package](../contracts/README.md)

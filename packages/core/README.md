# @opacedev/ai-content-checker-core

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Deterministic, offline content-integrity engine: invisible-Unicode and homoglyph forensics, named writing-signal rules with an editorial score, protected spans, safe-fix previews, diffs, gates and RFC 8785 hash-only receipts. This is the single analysis implementation used by every Opace surface (web checker, WordPress plugin, Chrome extension, Astro integration, CLI).

- Consumes `@opacedev/ai-content-checker-contracts` contract `1.0.0`
- Browser/SSR-safe ESM, transport-free by design: no network call, telemetry or postinstall download
- Unicode carriers: 38 rules over 415 code points, with context exemptions for emoji, cursive/Indic scripts and French typography (`unicode:2026.08.2`)
- Homoglyphs: 60 Cyrillic/Greek confusables with a mixed-script gate
- Writing signals: 113 weighted categories (116 named rules, including 7 rhythm and cadence stylometrics and 3 chat-export formatting rules, measured, not calibrated to a clean sheet: on 1,200 human long-form documents these rules flag 24.8% of them, and any claim that they produce no false positives is withdrawn — see the measured rates below) at `en-signals:2026.08.6`, with a raise-only evidence-based escalation policy recorded in an explanatory `escalation` result field. 95 of the 116 fire on real documents: one is recorded inactive and twenty dormant, with the measured per-rule inventory in `tests/battery/rule-liveness.json`
- Protected spans: 12 kinds including name, organisation and citation
- `watermark.anthropic` remains visibly `unsupported` until an official interface exists; the browser checker runs a separate live known-key scan (`@opace/watermark-lab`) rather than presenting that boundary as a check
- Licence: MIT for the Opace-authored package

A pass applies only to its named disclosed check and does not prove authorship or detector clearance. The full capability inventory is in the repository's [capability register](../../docs/CAPABILITIES.md); every test total and evaluation behind it is indexed in the [evidence index](../../docs/EVIDENCE-INDEX.md).

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install @opacedev/ai-content-checker-core
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
  presentCycle5Result, composeCheckerAxes,
  buildContentFreeSharePayload, assertCheckerResultInvariants,
  listMethods, registerPatternPack,
  projectVisibleText, prefixedSha256, sha256Hex, utf8Bytes,
  UNICODE_RULES_VERSION, EN_SIGNALS_PATTERN_VERSION,
} from "@opacedev/ai-content-checker-core";
```

The checker-result helpers are presentation/contract logic, not a bundled detector. They freeze the
Cycle-5 identity and five `signal-*` level ids, format all scores once per run, preserve the three
independent axes and reject model/route/section/export contradictions. A full-checker adapter supplies
the measured model result; without one, `notAssessedAiPattern()` is the only honest AI axis.

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
//   categoriesHit, findingCount, wordCount, version: "en-signals:2026.08.6",
//   status: "scored", escalation: null, description }
```

Classification is trinary (`human_like` / `mixed_signals` / `ai_like`), false-negative-biased by design, and probability-consistent: the label is always the argmax of the published probabilities. The evidence-based escalation policy (artefact floor, citation co-occurrence, artefact-plus-score, formatting floor, formatting cluster, furniture gate, finding breadth) can only raise a classification and, when it does, `escalation` names the policy and reason. Never present the score as authorship detection: clean, well-prompted AI prose scores low on any rule tier, which is why the result vocabulary says "no strong AI-style signals" rather than "human".

Measured on the fresh 5,558-document long-form corpus (`services/local-engine/research/longform-corpus/`), this rules tier detects **45.1%** of AI writing and wrongly flags **24.8%** of human writing. It flags roughly one human document in four, which is why it is editorial suggestion only and contributes nothing to any AI verdict. The older provider-eval aggregate is superseded and must not be quoted: its human side was 169 documents, 76% of them encyclopaedic and question-and-answer text, so its rate described that corpus and not published prose. See `docs/CAPABILITIES.md` §7.2 and §7.3.

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

This engine was built on existing open-source work by deliberate choice, so the projects it
stands on are named here rather than only in a licence file.

- [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) — MIT, Conor Bronsdon and contributors. 46 of the 51 v2 writing-pattern rule categories, the stylometric methods, the weights and the classifier logic, adapted to TypeScript, plus Cyrillic and Greek lookalike map data. One upstream bug was fixed in the port.
- [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) — MIT, Guillaume Meyer. The invisible-character and space-substitute carrier tables and the explicit-carrier inspection model. Table data only; no upstream code is distributed.
- [Unicode Consortium character data](https://www.unicode.org/Public/UCD/latest/) — Unicode licence. The 415-code-point carrier inventory across 38 rules and the 60-entry confusable set.
- [antislop-sampler](https://github.com/sam-paech/antislop-sampler) — Apache-2.0, Sam Paech. Fiction phrase and over-represented name data behind the `fiction-slop-phrase` and `fiction-promptonym` rules.
- [slop-forensics](https://github.com/sam-paech/slop-forensics) — MIT, Sam Paech. Per-model observations corroborating the fiction-lane rules.
- [SLOP_Detector](https://github.com/SicariusSicariiStuff/SLOP_Detector) — Apache-2.0, SicariusSicariiStuff. The graded penalty-class weighting approach.
- [slop-gate](https://github.com/hwajongpark/slop-gate) — MIT, hwajongpark. Promotional-register and buzz-phrase pattern data.
- [anti-ai-writing](https://github.com/avectats7/anti-ai-writing) — MIT, avectats7. Buzz-phrase and weak-verb observation data.
- [anti-slop](https://github.com/kjmagnan1s/anti-slop) — MIT, kjmagnan1s. Faux-insight phrase data and the protect-list and context-profile design.
- [claude-slop-detector](https://github.com/aplaceforallmystuff/claude-slop-detector) — MIT, aplaceforallmystuff. Staccato-fragment and tripled-negation observations.
- [Wikipedia, *Signs of AI writing*](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) — CC BY-SA 4.0. Editorial guidance independently re-expressed with no verbatim excerpts, credited as the licence requires.
- [Project Gutenberg](https://www.gutenberg.org) public-domain texts, all published before 1929 — the embedded human-prose reference corpus behind the rhythm and register signals.
- [canonicalize](https://github.com/cyberphone/json-canonicalization) — Apache-2.0. RFC 8785 canonicalisation.
- Published academic findings by Liang et al. (ICML 2024), Kobak et al. (*Science Advances* 2025), Juzek & Ward (COLING 2025), Reinhart et al. (PNAS 2025), Geng & Trotta (2024) and Pew Research (2026), used as rule thresholds and lexicon facts.

Several well-known detector repositories were cloned and read during the research phase and are
credited as exactly that — read, not used. Nothing in this package derives from `fast-detect-gpt`,
`Binoculars`, `RADAR`, `DIPPER`, `ai-detector-bench`, `BIRA`, `SIRA` or `MarkLLM`.

Full records, with versions, snapshot commits and file-level destinations:
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md) ·
[DEPENDENCY-LEDGER.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/legal/DEPENDENCY-LEDGER.md).

## Troubleshooting and links

- **A check reports `unsupported`:** preserve that result. Do not replace it with a different method or a pass.
- **Browser and server output differ:** confirm both adapters supplied the same projected UTF-8 text and use the same contract/core versions (`UNICODE_RULES_VERSION`, `EN_SIGNALS_PATTERN_VERSION` are exported for exactly this).
- **A safe fix changes protected content:** reject the candidate and inspect the protected-span gate before applying any text.

Report security concerns through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md). For non-sensitive help, use [Opace AI Content Checker & Detector support](https://opace.agency/get-in-touch/). Changes follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

[Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/) · [Browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Capability register](../../docs/CAPABILITIES.md) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related contracts package](../contracts/README.md)

## Where this is weakest, measured

This package ships the deterministic character forensics and editorial writing rules. It does
**not** contain the trained model that produces an AI reading; Cycle 5 runs only in the web
checker. The model results are disclosed here so package users can distinguish the two systems.

**The writing rules are editorial feedback, not detection.** On 922 machine and 1,200 held-out
human long-form documents, they detect 45.1% of machine writing while flagging **24.8% of human
writing** — one human document in four. `computeEditorialSignals` returns a writing score, never
an authorship reading, and must not be presented as one.

The deployed Cycle 5 model (`tier3-cycle5-v1`, margin rule
`max(m1, m2+0.34) >= 3.571`) was measured separately through both live runtimes on the full
5,558-document long-form evaluation corpus. That corpus is not wholly independent: 654/922 AI
documents are independent of every Cycle 2 split and 268 are not; 11/4,636 human documents
overlap. The separate topic-matched held-out slice is the independent evasion measurement.

| Cycle 5 measurement | result | denominator and runtime |
|---|---:|---|
| AI documents flagged | **97.8%** | 902/922, EU server fp32 |
| human documents wrongly flagged | **0.99%** | 46/4,636, EU server fp32 |
| AI documents flagged | **97.6%** | 900/922, browser int8 |
| human documents wrongly flagged | **1.57%** | 73/4,636, browser int8 |
| topic-matched held-out AI flagged | **86.9%** | 153/176, server evaluation route |
| structured human partners wrongly flagged | **0.2%** | 1/418, server evaluation route |
| human fiction wrongly flagged | **3.1% / 3.5%** | 7/227 server / 8/227 browser |
| held-out 100-word AI flagged | **76.8%** | 43/56, server evaluation route |
| heavy AI edits of human originals flagged | **28.5%** | 39/137, server evaluation view |
| academic human documents wrongly flagged | **0.8%** | 15/1,992, server evaluation view |

The 100-word cell is small, fiction remains higher-risk than the overall human set, and treating
heavy AI edits as machine-assisted is a product boundary rather than proof of authorship. Do not
use a result for an academic misconduct decision about one student.

*Historical, not current:* Cycle 2 (`tier3-cycle2-v1`, live 28 August – 1 September 2026) produced
the earlier 883/922 server, 889/922 browser, 45/4,636 server-human and 90/4,636 browser-human
figures. Its fiction and length rows are retired and must not be mixed with Cycle 5.

Complete list with sources: [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations).
The same figures plotted, with the 50% acceptance floor drawn in: [result charts](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#what-it-measures-and-where-it-fails).

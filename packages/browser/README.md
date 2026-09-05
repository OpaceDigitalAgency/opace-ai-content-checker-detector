# @opacedev/ai-content-checker-browser

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Browser adapter for Opace AI Content Checker & Detector. It provides deterministic DOM visible-text projection and a module Worker client over the frozen core and contracts.

- Consumes `@opacedev/ai-content-checker-core` and `@opacedev/ai-content-checker-contracts`
- No analysis-time telemetry, provider call or remote module
- Default Worker target is packaged at `dist/worker/entry.js`
- Licence: MIT for the Opace-authored package

Dependency and provenance evidence is recorded in the project-root `THIRD_PARTY_NOTICES.md`, `MODEL_AND_DATA_PROVENANCE.md` and `docs/legal/DEPENDENCY-LEDGER.md`.

> Release state: a 0.3.1 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Browser AI content checker integration with Web Workers

Build a private text-review workflow around visible page content. This free browser adapter projects rendered text and sends inspection work to the packaged Worker. It supports the deterministic part of an AI content checker without adding a toolbar or an automatic page scan.

## Use cases for developers

Use it in a browser application after an explicit user action, with cancellation and stable text projection. Hidden DOM content, scripts and styles are excluded. A consuming AI detector must add its own model runtime and preserve the matching projected text when presenting section evidence.

## New in the 0.3.1 package set

The renamed `@opacedev/ai-content-checker-*` packages share the current result contracts and documented privacy boundaries. This documentation revision adds component-specific guidance and corrected discovery links; it does not add model inference to this library.

## AI checker integration questions

**Does it download an AI detector model?** No. This adapter is model-free; the separate Cycle-5 runtime is used by full checker surfaces.

**Does importing it read the page?** No. The consumer chooses the document and when inspection starts.

**Who owns the interface and permissions?** Your application does. This library supplies projection and Worker mechanics, not user consent or accessible controls.

[Use the free online AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Browse the complete source](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector) · [Opace AI development services](https://opace.agency/services/artificial-intelligence/)

## Install

```sh
npm install @opacedev/ai-content-checker-browser
```

## Use

The adapter projects rendered, visible body text with stable block and line-break semantics, excluding scripts, styles, templates, noscript and hidden descendants. Its Worker client carries schema-valid messages and supports cancellation without retaining content.

```js
import {
  projectDomVisibleText,     // (document) => DomVisibleTextProjection
  createInspectionWorker,    // () => InspectionWorkerClient
  supportsWorkerInspection,  // () => boolean feature test
} from '@opacedev/ai-content-checker-browser';

if (supportsWorkerInspection()) {
  const projection = projectDomVisibleText(document);
  // hand projection.text to the Worker client for inspection
}
```

Create the Worker only after an explicit user action. The default worker asset is packaged at `dist/worker/entry.js`, so consumers do not need a remote script or CDN. `supportsWorkerInspection()` returns `false` outside a Worker-capable environment (verified: it returns `false` under plain Node), letting a consumer fall back to calling the core directly, as the live checker's watchdog does.

The package targets modern ESM browsers with module Worker support. It does not render a toolbar, request host permissions or read a page by itself; the consuming product must obtain an explicit user action and pass the intended document.

## Verify

```sh
npm ci
npm run typecheck
npm test
```

Rendered consumers should also test their own CSP, Worker URL resolution, cancellation, narrow layouts and network boundary. A successful projection does not authorise content storage or transmission.

## Accessibility, security and licence

This library does not render controls. The consuming toolbar or extension owns accessible names, focus order, live status and reduced-motion behaviour. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md). Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/LICENSE).

For non-sensitive help, use [Opace AI Content Checker & Detector support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CONTRIBUTING.md) and [changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CHANGELOG.md).

## Troubleshooting and links

- **Worker creation fails:** confirm the built `dist/worker/entry.js` asset is copied and allowed by the site's Content Security Policy.
- **Projected text is shorter than expected:** hidden descendants, scripts, styles, templates and `noscript` content are excluded deliberately.
- **Cancellation appears late:** abort the request through the client and dispose of the Worker when the surface closes.

[Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/) · [Browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/CAPABILITIES.md) · [Chrome extension](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related core package](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/packages/core/README.md)

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

## Where this is weakest, measured

This package ships the deterministic character forensics and editorial writing rules. It does
**not** contain the trained model that produces an AI reading. Full checker surfaces use a separate Cycle-5 runtime after explicit model setup or route selection. The model results are disclosed here so package users can distinguish the two systems.

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

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations) — where the tool is weakest, ranked, with denominators

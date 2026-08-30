# @opace/content-integrity-browser

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Browser adapter for Opace AI Content Integrity. It provides deterministic DOM visible-text projection and a module Worker client over the frozen core and contracts.

- Consumes `@opace/content-integrity-core` and `@opace/content-integrity-contracts`
- No analysis-time telemetry, provider call or remote module
- Default Worker target is packaged at `dist/worker/entry.js`
- Licence: MIT for the Opace-authored package

Dependency and provenance evidence is recorded in the project-root `THIRD_PARTY_NOTICES.md`, `MODEL_AND_DATA_PROVENANCE.md` and `docs/legal/DEPENDENCY-LEDGER.md`.

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install @opace/content-integrity-browser
```

## Use

The adapter projects rendered, visible body text with stable block and line-break semantics, excluding scripts, styles, templates, noscript and hidden descendants. Its Worker client carries schema-valid messages and supports cancellation without retaining content.

```js
import {
  projectDomVisibleText,     // (document) => DomVisibleTextProjection
  createInspectionWorker,    // () => InspectionWorkerClient
  supportsWorkerInspection,  // () => boolean feature test
} from '@opace/content-integrity-browser';

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

This library does not render controls. The consuming toolbar or extension owns accessible names, focus order, live status and reduced-motion behaviour. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/SECURITY.md). Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/LICENSE).

For non-sensitive help, use [Content Integrity support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Troubleshooting and links

- **Worker creation fails:** confirm the built `dist/worker/entry.js` asset is copied and allowed by the site's Content Security Policy.
- **Projected text is shorter than expected:** hidden descendants, scripts, styles, templates and `noscript` content are excluded deliberately.
- **Cancellation appears late:** abort the request through the client and dispose of the Worker when the surface closes.

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-verification-integrity/) · [Browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Capability register](../../docs/CAPABILITIES.md) · [Chrome extension](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related core package](../core/README.md)

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
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md) ·
[DEPENDENCY-LEDGER.md](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/legal/DEPENDENCY-LEDGER.md).

## Where this is weakest, measured

This package ships the deterministic character forensics and the editorial writing rules. It does
**not** contain the trained model that produces an AI reading; that runs in the browser checker.
Both sets of limits are published because both matter.

**The writing rules are editorial feedback, not detection.** On 922 machine and 1,200 human
long-form documents the engine had never seen, they detect 45.1% of machine writing while flagging
**24.8% of human writing** — one human document in four. `computeEditorialSignals` returns a
writing score, never an authorship reading, and must not be presented as one.

The trained model, measured on a fresh 5,558-document long-form corpus (922 machine, 4,636 human)
**at the operating point that ships today** — 883/922 = 95.8% detected on the EU server route and
889/922 = 96.4% in the browser, at 45/4,636 = 0.97% and 90/4,636 = 1.94% human false positives
respectively. Where it is weakest:

| weakness | measured | denominator |
|---|---|---|
| human fiction and stories wrongly flagged | **8.8%** | 23 of 260, server route (26 of 260, 10.0%, in the browser) |
| detection at 100–199 words, by achieved word count | **16.9%** | 29 of 172 |
| detection at 300–399 words, by achieved word count | **84.6%** | 193 of 228 |
| machine rewrite of a human original | 30–35% | HAT-Bench v6–v8 edit bands |
| human academic discussion wrongly flagged | 3.81% | 16 of 420 |
| human academic conclusions wrongly flagged | 2.78% | 10 of 360 |
| business reports, AUROC | 0.69 | 72 held-out rows, against 0.93–0.99 elsewhere |
| short human text wrongly flagged | 0% | 0 of 400 at 60–200 words |

A novelist checking their own writing has roughly a one in eleven chance of being told it looks
machine-written. Earlier published fiction figures of 12.69% and 11.15% belong to the retired 0.980
and 0.984 flag points and must not be placed beside the rows above; the length figures published
until 30 August 2026 as 67% at 200 words, 50% at 150 and 19% at 100 are withdrawn, because they
were scored at the retired 0.980 threshold, recorded no per-length denominator and were never
re-measured on a shipping runtime. The model was deliberately never trained on human fiction, because no matched
human fiction corpus was available and training on unmatched machine fiction would have taught it
that fiction equals AI. Do not rely on this tool if you write fiction, if you are checking text
under 200 words, or if you are about to make an academic misconduct decision about a single
student.

Complete list with sources: [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations).

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations) — where the tool is weakest, ranked, with denominators

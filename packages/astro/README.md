# Opace AI Content Integrity for Astro

The interactive Dev Toolbar panel is the full checker: it reads the page you are previewing with the pinned Cycle-5 model, on your own machine, after you agree to the one-off download. You get the same five-band reading, section scores, passages, evidence and printable report as the Opace checker on the web, in the same visual language.

The unattended build scan is a different thing and says so on its own page. It is deterministic build support: no model runs, nothing is sent anywhere, no page text is written, and the AI-pattern reading stays `not_assessed`. Neither the toolbar nor the build scan claims to determine authorship, and neither writes to your source files.

![The Opace AI Content Integrity panel in the Astro Dev Toolbar, showing the Protect and fix view](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/main/docs/assets/screenshots/astro-content-integrity-protect-rewrite.png)

## What it includes

- One development-only toolbar app with five tabs — Check page, Protect & fix, Claude readiness, Receipts and Settings — each opening with one plain line saying what it does. A tab with nothing behind it is not shipped as a tab.
- The complete reading, drawn by the shared Opace presentation: the five-band dial, the level and what it means, the strongest section, section score bars, a deep dive per section with the passage, the measured word re-use, the tell in your own sentences and editing advice, the three independent result axes, every named check, what the reading means and does not mean, how certain it is, and the run record.
- Two routes, both on your machine: the on-device Cycle-5 model after explicit consent, or the quick deterministic checks with the AI-pattern reading honestly left unread.
- Explicit, user-triggered inspection. Nothing scans at install, on start-up or on page load.
- Three exports beside a complete reading: the shared branded printable report in its own tab — the same document the Opace CLI and WordPress plugin produce — a content-free JSON receipt and a content-free share summary.
- Local safe-fix previews for explainable invisible Unicode, and nothing else: **Protect & fix** says in its first line that removing invisible characters is the only fix that ships. Patches are exported for you to read and are never applied to your source files.
- Honest unavailable states. Anthropic's own text-watermark verifier remains `unsupported`, and where a feature is not in this release the tab body says so plainly rather than looking broken.
- Keyboard navigation, visible focus, reduced motion, forced colours, narrow-panel reflow and status text that never depends on colour alone.
- No network request for anything the panel draws. The Outfit and Plus Jakarta Sans OFL subsets, the logo, the stylesheet and the inspection worker are all bundled.

## Install

After the package is published, Astro can add it automatically:

```sh
npx astro add @opace/astro-content-integrity
```

For manual setup:

```sh
npm install @opace/astro-content-integrity
```

```js
import { defineConfig } from 'astro/config';
import contentIntegrity from '@opace/astro-content-integrity';

export default defineConfig({
  integrations: [contentIntegrity()],
});
```

Start `astro dev`, open Astro's Dev Toolbar and choose **Opace AI Content Integrity**. Choose a route, then press **Read this page**. Nothing runs, and nothing downloads, until you do.

## Configuration

The unattended build defaults are offline, report-only and content-free. The interactive toolbar is configured by the person using it, not by this file:

```js
contentIntegrity({
  toolbar: true,
  buildCheck: 'report',
  failOn: ['protected_fact_changed'],
  localService: false,
  include: ['**/*.html'],
  exclude: ['**/404.html', '**/500.html', '**/feed*.html', '**/search*.html', '**/sitemap*.html'],
  reportDirectory: 'content-integrity-report',
  maxCharacters: 50_000,
})
```

| Option | Default | Behaviour |
|---|---|---|
| `toolbar` | `true` | Registers one app during `astro dev`; no production toolbar runtime is emitted. |
| `buildCheck` | `'report'` | Writes deterministic reports and never fails the build. Other values fail closed in 0.2.0. |
| `failOn` | `['protected_fact_changed']` | Reserved deterministic hard-gate list; it does not enable build failure in 0.2.0. |
| `localService` | `false` | Must remain `false`; no service or provider client ships in this release. |
| `include` / `exclude` | safe relative globs | Limits prerendered HTML considered at build time. Absolute and traversing paths are rejected. |
| `reportDirectory` | `'content-integrity-report'` | Relative directory beneath Astro's output directory; symlink escapes are rejected. |
| `maxCharacters` | `50_000` | Upper bound for one rendered document at build time. The toolbar refuses a longer page rather than trimming it. |

Unknown options, wrong types, unsafe paths, secret-shaped values, `buildCheck: 'fail'` and `localService: true` raise an actionable configuration error.

## The model file

The on-device route downloads one 34.5 MB file the first time you use it. It is worth being precise about what that file is.

It is a **data file of model weights** — a large table of numbers the checker reads. It is not a program, and it cannot execute anything on your machine. Before any of it is used, every byte is compared against the published SHA-256 `9f57d6a8…` (in full: `9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b`), and a file that does not match is thrown away rather than run. It comes from one fixed HTTPS base, it is stored in the browser cache like any other web asset, the download can be cancelled while it runs, and one click in Settings clears it again. A 14–26 MB browser runtime is fetched alongside it and verified the same way.

The consent box shows the size and the first eight characters of that hash before you agree to anything, and Settings shows them again beside the clear button.

## Privacy and security

Deterministic page inspection runs in a module Worker with no network request; the worker is bundled into the toolbar and started from a blob, so no dev server has to serve it. The on-device Cycle-5 choice downloads the pinned model, vocabulary and browser runtime from one fixed HTTPS base only after explicit consent, verifies every byte against a pinned hash before anything runs, can be cancelled mid-download and can be cleared again from Settings. On the deterministic route the worker makes no network request at all, and on the on-device route the only request is the pinned model download, so page text is not sent to Opace or to any other recipient on either route. Results and page text are not placed in cookies, local storage, session storage or IndexedDB; only the verified model files use the browser cache. Reloading clears the result. Receipts and share summaries carry hashes, counts, levels and scores, never page text, a page URL or a route path. The fixed model host still needs live CORS before this can be published.

The default build report contains hashes, counts, method identifiers, limitations and opaque source-relative IDs. It excludes page text, routes, filesystem paths, tokens and toolbar code. Review [SECURITY.md](SECURITY.md) before reporting a vulnerability; do not include private content or credentials in an issue.

## Compatibility

Version 0.1.0 passed Astro 5.18.2, 6.4.8 and 7.2.7 in static, server and hybrid projects; 0.2.0 is re-proved against Astro 7.2.7 static and server consumers and inherits that matrix pending a renewed full sweep. Astro 5 passed on Node 20, 22 and 24; Astro 6 and 7 passed on Node 22 and 24 and follow their upstream Node 22.12 minimum. The package peer range is `>=5.0.0 <8.0.0` and its own Node floor is 20.3.

Dynamic SSR pages without prerendered HTML are not included in the build report. Inspect them explicitly in the development toolbar.

## Accessibility

The five views use a roving tab pattern: Left/Right moves between tabs, focus stays on the selected tab, and each state has visible text. Section rows in a reading are real disclosure buttons. Controls have accessible names and focus indicators, run progress is announced politely, and no band is carried by colour alone — every band prints its own name. Automated Chromium checks cover the keyboard journey, reduced motion, forced colours, 375 px reflow and axe at every state. Platform assistive-technology results are recorded separately from automated checks.

## Troubleshooting

**The toolbar app is missing.** Confirm `toolbar` is not `false`, restart `astro dev`, and check that the integration is in `integrations[]`. It is intentionally absent from preview and production output.

**No route appears in the build report.** Check `include`/`exclude` and confirm the route is prerendered. Runtime-only SSR pages use the toolbar instead.

**Configuration fails after an upgrade.** Remove unknown or held options. This release deliberately rejects local-service and build-failure modes.

**The model will not download.** The fixed model base must answer with a CORS header for a browser to read it. Until that is live on the host, the on-device route reports the failure honestly and leaves the AI-pattern reading unread; the quick checks still run.

**A private EU server route.** The toolbar does not have one. Both of its routes stay on your machine. The consented EU server route is offered in the Opace WordPress plugin and Chrome extension.

## Support, evidence and licence

- Product documentation: [Opace AI Content Integrity for Astro](https://opace.agency/tools/ai/content-verification-integrity/astro-integration/)
- Privacy: [Opace AI Content Integrity privacy](https://opace.agency/privacy-policy/)
- Support: [Opace AI Content Integrity support](https://opace.agency/get-in-touch/)
- AI services: [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- Source and issues: [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)
- Security policy: [SECURITY.md](SECURITY.md)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- Software bill of materials: [SBOM.cdx.json](SBOM.cdx.json)

Opace-authored integration code is available under the [MIT Licence](LICENSE). A passing check applies only to the named disclosed method and does not prove human authorship or detector clearance.

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

This package does not bundle the trained model. Its interactive toolbar can download and verify the
pinned Cycle-5 int8 artefact after explicit consent, while its deterministic route and unattended
build scan never produce an AI-pattern reading. The model results below apply only when the trained
model actually ran.

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

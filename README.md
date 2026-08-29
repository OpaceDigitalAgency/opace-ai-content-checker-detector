# Opace AI Content Integrity

One local-first engine for explainable content-integrity evidence: hidden-character forensics, writing-signal analysis, protected facts, watermark science and reproducible receipts. The same compiled engine powers every surface (web checker, WordPress plugin, Chrome extension, Astro integration, CLI and local service), so identical input produces identical findings everywhere.

![Opace AI Content Integrity evidence workflow with a genuine local toolbar](docs/assets/opace-ai-content-integrity-hero-v2.png)

The product never presents an AI score as proof of authorship. Every result names the method that ran, its version, its status and its limitations. A pass applies only to its named check.

[Try the browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Product page](https://opace.agency/tools/ai/content-verification-integrity/) · [Privacy notice](https://opace.agency/privacy-policy/) · [Support](https://opace.agency/get-in-touch/)

> **Status, 29 August 2026.** The browser checker is live and has been since 28 August 2026, serving the cycle-2 trained model. This repository is public at <https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker>. The WordPress plugin, Chrome extension, Astro integration, CLI and npm packages are built and tested but not yet published; no store or registry listing exists yet. The hosted inference service described in `CLOUD-RUN-SETUP.md` was **deployed and verified on 29 August 2026**; see the roadmap section below for what was measured.

## One engine, many surfaces

The engine is `@opace/content-integrity-core` (TypeScript, MIT, local-only), compiled once and bundled into every shell. There are no parallel analysis implementations to drift apart: PHP and Python act as orchestration only. Two version constants, `UNICODE_RULES_VERSION` and `EN_SIGNALS_PATTERN_VERSION`, are stamped into every result and receipt, and a cross-surface test battery proves that the installed engine on the website is byte-identical to source on findings, methods, signals and versions.

| Surface | How it consumes the engine | Where |
|---|---|---|
| Web checker | Browser Worker via `@opace/content-integrity-browser`, with a main-thread watchdog fallback | [live checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) |
| WordPress plugin | Same JS bundle in the admin Worker; PHP handles REST, persistence and receipts | [wordpress/](wordpress/opace-ai-content-integrity/readme.txt) |
| Chrome extension | Bundled MV3 Worker over selected or visible page text | [extensions/chrome/](extensions/chrome/README.md) |
| Astro integration | Dev Toolbar checks and hash-only build reports | [packages/astro/](packages/astro/README.md) |
| Node CLI | `opace-integrity` command over the identical core | [packages/cli/](packages/cli/README.md) |
| Local engine | Authenticated loopback API (`127.0.0.1:8741`) for heavier optional adapters | [services/local-engine/](services/local-engine/README.md) |
| Watermark lab | `@opace/watermark-lab` scores text against demo watermark keys, fully in-browser | [packages/watermark-lab/](packages/watermark-lab/README.md) |

## Capabilities by tier

The full technical register, with exact rule inventories and test evidence, is [docs/CAPABILITIES.md](docs/CAPABILITIES.md). Ready-to-copy listing descriptions for WordPress.org, the Chrome Web Store, npm and Astro live in [DESCRIPTIONS.md](DESCRIPTIONS.md).

### Tier A — deterministic evidence (exact, local, runs everywhere)

- **Invisible-character detection**: 38 carrier rules covering 415 code points (full Cf format set including the tag block, variation selectors including the supplementary range, the Zs space family, separators, unpaired surrogates), with context intelligence so emoji sequences, cursive and Indic scripts and French typography do not false-flag.
- **Homoglyph detection**: 60 Cyrillic and Greek Latin-lookalike confusables with a mixed-script gate, so pure Russian or Greek text never flags.
- **Protected content**: 12 span kinds (currency, number, date, time, unit, url, email, quote, code, name, organisation, citation) extracted precision-first, so facts survive any rewrite.
- **Provenance**: live C2PA Content Credentials reading for uploaded JPEG, PNG, WebP and PDF files on the browser checker, built on the official `@contentauth/c2pa-web` SDK, entirely local. Certificate trust lists are deliberately not consulted, and the UI says so; pasted text is never given a provenance verdict.
- **Receipts**: canonical, hash-only RFC 8785 receipts recording exactly which checks ran, at which versions, with which statuses.

### Tier B — writing-signal rules and stylometrics

- **116 named rules** at `en-signals:2026.08.6`: 113 weighted writing-signal categories plus 3 `en-gb:2026.08.1` rules, producing a 0–100 editorial-signals score. Since 28 August 2026 that score is presented as **writing suggestions** and nothing else. It is not an authorship reading and is not counted toward one.
- The 113 categories are: 51 from the v2 pack (46 adapted from avoid-ai-writing plus 5 Opace-original structural rules), 55 from the v3 merge (including a 7-rule artefact-forensics group with model attribution: exposed chatbot citation tokens, URL fingerprints, placeholders, reasoning leaks and character-set leakage, plus era and attribution metadata and 67 documented exclusions, and three chat-export furniture rules added in the 2026.08.6 calibration), and 7 v4 rhythm and stylometric rules (sentence-length spectral flatness, conditional compression, lexical register distance, punchline fragment density, mic-drop paragraphs, contrast density, rhetorical-to-procedural ratio) calibrated to fire on 0 of 44 verified human control texts.
- The tier still emits its internal three-way label and a raise-only escalation policy (artefact floor, citation co-occurrence, artefact-plus-score, formatting floor, formatting cluster, furniture gate, finding breadth). Both are now confined to the editorial axis: they change how many suggestions are shown, never what the engine says about authorship.
- This tier explains and improves writing and catches careless AI output. It is never presented as authorship detection.

**Why it was demoted, measured.** Re-tested on 5,558 long-form documents neither tier had seen (922 AI, 1,200 human in the rules comparison), the 113 rules detected **45.1% of AI writing while flagging 24.8% of human writing** — worse than the trained model on both axes at once, so mixing them into a verdict could only make it worse. The root cause was already documented: they detect chat-export formatting and promotional register rather than authorship, and the cliché-vocabulary rules fire on 40% of genuine human marketing copy. On 28 August 2026 the tier stopped contributing to the AI verdict and became editorial suggestions.

| tier, same fresh long-form corpus | AI detected | human false positives |
|---|---|---|
| 113 writing rules | 45.1% | **24.8%** |
| cycle-2 model | **90.3%** | **1.34%** |

Two earlier figures are **superseded and must not be quoted**: the 66.7% detection at "zero human false positives" on the 1,896-sample provider-eval corpus, and the `finding_breadth` message claiming human controls peaked at 2 categories. The first was an artefact of a human corpus that was 76% encyclopaedic and question-and-answer text; the second is falsified — real humans reach 5, 6 and once 11 categories, and that rule caused 135 of 139 rules-layer false positives. The full per-rule statistics are in [docs/CAPABILITIES.md](docs/CAPABILITIES.md) and the per-rule validation report.

### Tier C — trained local model (Named local signals) — the only AI reading

**This is the only check in the product that gives an authorship reading.** One e5-small
per-channel int8 ONNX classifier (33.36M parameters, 34.3 MB, 34.5 MB including its
vocabulary), downloaded once on explicit consent, cached, and run entirely in the browser.

Cycle 2 replaced the shipped model on 28 August 2026 after the original was measured at
AUROC 0.530 on published prose — barely better than a coin flip, and inverted on human
business-marketing copy, which it scored *higher* than AI writing. Retrained on a
15,514-document published-register corpus, then validated against **5,558 documents it had
never seen** (922 AI from 13 current models; 4,636 human from Europe PMC, GOV.UK, CRS, Global
Voices, Mongabay, SEC EDGAR and PERSUADE):

| | measured |
|---|---|
| AI detected | **90.3%** |
| human false positives | **1.34%** |
| operating point | 0.984, fitted through the shipped browser runtime |

Per register on the same fresh data: company updates 99.0%, white papers 98.1%, research
summaries 94.9%, academic discussion 93.8%, academic literature reviews 92.5%, long-form
journalism 86.1%, academic essays 84.1%, stories 79.8%. Every long-form category clears the
50% floor with margin. Held-out training evaluation moved AUROC from 0.530 to 0.9695 and
detection at a 1% false-positive budget from 6.7% to 76.9%.

**The threshold was fitted through the runtime that actually ships.** onnxruntime-web and
Python onnxruntime disagree by a median 0.113 on this quantised model, because Python applies
extended int8 fusions the web build does not. Quoting the Python figure would have produced
3.56% real-world false positives while the interface claimed 1.2%. Every number above is
browser-measured; the Python measurement on the same data is 90.6% at 1.22%, and both are
recorded rather than the flattering one being chosen.

**What it does and does not catch.** An AI draft that a person then tidies is detected 82.3%
of the time. An AI rewrite of a human original is 30–35%. Human text that a language model
merely polished is deliberately **not** flagged: in that band a median 93.5% of the words are
the human author's, and flagging it would mean accusing writers who use a model on their own
prose. Detection falls away on short text — 67% at 200 words, 50% at 150, 19% at 100 — and the
page says so; short human text is not falsely flagged (0 of 400 samples at 60–200 words).
A clean result is labelled "No strong AI-style signals", never "human".

**Cycle 3 was built, measured and rejected.** It improves AI-rewrites-of-human from 30% to
46–56% and rank correlation with the true AI share from 0.58 to 0.74, but int8 quantisation
costs it 5.2 points of recall so it cannot run in the browser at all, stories regress from
79.8% to 69.3% and journalism from 89.1% to 81.0%. The trade is not worth it for a browser
tool, and the negative result is published rather than buried.

### The verdict is three readings, never one

`packages/core/src/verdict/combine.ts` (`combined:2026.08.8`) publishes three independent
axes and never collapses them into a single label:

| axis | what it says | who may set it |
|---|---|---|
| `ai_probability` | how likely it is that a machine composed the text | **only** the trained model; `not_assessed` when none ran, and `not_assessed` does not mean human |
| `text_integrity` | `clean` / `attention` / `manipulated` — invisible carriers, homoglyph substitution, private-use clusters, watermark marks | the deterministic character forensics |
| `editorial` | `none` / `some` / `many` writing suggestions | the 113 named rules |

The distinction is the whole point. **A hidden zero-width character proves text manipulation,
not AI origin.** A CMS paste handler, a translation memory, a DTP export or a person editing a
wholly human document can all put one there. The integrity axis is allowed to say "this text
contains hidden characters"; it is never allowed to say, or imply, "this is AI". An assertion
in the module enforces that at runtime and throws rather than publish a collapsed verdict.

### Tier D — authorised external verification (planned)

Bring-your-own-key adapters to commercial detectors the user already pays for, with clearly attributed results, plus official Anthropic verification if and when a supported interface exists.

### Watermark lab

A real SynthID-Text demo detector: DeepMind's Apache-2.0 reference detection mathematics ported faithfully to TypeScript, a GPT-2 tokeniser, genuinely generated watermarked fixtures and a wrong-key collapse demonstration, all in-browser with public demo keys. The live lab's v2 release adds key rotation (pasted text is scored under every held demo key, so a lab-generated sample has its genuine key discovered rather than asserted) and desktop auto-load of the detection engine when the lab scrolls into view.

The same mathematics now also runs **inside the checker** on every assessment, as the named method `watermark.known_keys`: your text is scored under all three public demo keys and you get the per-key table, not a claim. It replaced a static "Anthropic watermark / Unsupported" row that asserted a boundary without running anything. The boundary is still stated, as its own line rather than as a fake check: Anthropic production keys are private, no public verifier exists, and that watermark is not assessed. See [packages/watermark-lab/](packages/watermark-lab/README.md).

## Quick starts

**No install:** paste text into the [browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/). Everything runs in your browser; nothing is uploaded.

**npm — core engine** (after owner-approved publication; verified against the built package):

```js
import { inspect, computeEditorialSignals } from "@opace/content-integrity-core";

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
console.log(result.summary);
// { pass: 0, attention: 2, fail: 0, inconclusive: 0, unsupported: 1, not_configured: 0, not_run: 0, error: 0 }

const signals = computeEditorialSignals(draftText);
// { score, classification, probabilities, confidence, categoriesHit, findingCount, wordCount, version, status, description }
```

**npm — watermark lab:**

```js
import { tokenise, score, DEMO_KEYS } from "@opace/watermark-lab";

const ids = tokenise(watermarkedFixtureText);
score(ids, DEMO_KEYS["opace-demo-alpha"]).meanG; // 0.643 (right key)
score(ids, DEMO_KEYS["opace-demo-beta"]).meanG;  // 0.513 (wrong key: collapses to the 0.5 null)
```

**CLI:**

```sh
opace-integrity inspect article.txt
opace-integrity inspect - --format json < article.txt
```

**Local engine** (optional, loopback only): see [services/local-engine/](services/local-engine/README.md). It binds only to `http://127.0.0.1:8741` with separate run and administration tokens.

To validate the monorepo itself (Node 20+, Python 3.10+, PHP 7.4+ for the full cross-language run):

```sh
npm ci
npm test                            # typecheck; contracts 13 schemas; Python 13 schemas + RFC 8785 vectors; PHP 22 fixtures, 3 hash vectors, 45 assertions
npm run test:battery                # 110 pass / 0 fail adversarial and cross-surface battery
npm --prefix packages/core test     # 123 pass / 0 fail
npm --prefix packages/watermark-lab test   # 30 pass / 0 fail
npm run test:gates                  # G2 core probe 24 passed / 0 failed, plus package and client gates
node tests/battery/calibrate.mjs    # "Calibration OK: 0/44 human samples fire any 2026.08.5 rule."
```

Totals verified on 29 August 2026. The cross-surface battery compares the engine built here
against the copy installed in the website's `node_modules` and fails if they diverge on
findings, methods, signals or versions, so it is also the check that the website is running
what this repository says it is. Every evidence artefact behind these totals is indexed in
[docs/EVIDENCE-INDEX.md](docs/EVIDENCE-INDEX.md).

## Honest limitations

This is the complete list of the places the tool is weakest, ranked by how likely a real person
is to be hurt by it, with the measured figure and its denominator against each one. It is
compiled from the measurement reports rather than restated from other documents, and it is
current as of the `segments-v2` token-bounded segmentation change of 29 August 2026.

**Who should not rely on this tool yet.** Novelists and short-story writers: on the fresh
long-form corpus roughly one human story in eight was wrongly flagged, which is not a rate any
fiction writer should have to argue against. Anyone about to make an academic misconduct decision
about a single student: a distribution-level signal cannot carry that, and this tool will not
pretend it can. Anyone checking text shorter than 200 words, where detection collapses. Anyone
who needs a settled number for business reports, where the evidence is thin enough that the
figure should be treated as provisional.

### 1. Human fiction and stories — the highest false-positive register

**33 of 260 human stories were wrongly flagged: 12.69%.** Measured on the fresh long-form corpus
through the fp32 reference pipeline at the server flag point of 0.980, under `segments-v2`. The
same measurement under the previous segmentation rule was 30 of 260, 11.54%, so the segmentation
change made this slightly worse, and that is recorded rather than dropped.

In plain English: a novelist who pastes their own writing into this tool has roughly a one in
eight chance of being told it looks machine-written. That is a bad experience and a bad outcome,
and it is the single most important number on this page.

Two things that belong with it, neither of which excuses it:

- The flagged samples come disproportionately from the internet-archive-cc-texts pool, which the
  corpus's own author independently flagged as its least trustworthy source. Some of this may be
  data quality rather than model behaviour. It is unproven either way.
- The model was **deliberately never trained on human fiction.** The training corpus holds 300 AI
  fiction samples and no matched human set, and training on unmatched AI fiction would have
  taught the model that fiction equals AI — the exact register shortcut cycle 2 existed to
  remove. The right fix is a few thousand human short stories and long-form narrative, matched by
  length, and that data does not exist here yet.

The browser route's own per-register figure at its 0.984 flag point has **not** been measured;
scoring 21,093 segments through onnxruntime-web is about five hours of compute that has not been
spent. The 12.69% above is the fp32 reference route at a lower threshold, so the browser figure
is likely lower, but nobody has measured it and this README will not estimate it.

### 2. Short text — detection collapses

**67% at 200 words, 50% at 150, 19% at 100.** The denominator for these three figures is not
recorded anywhere in this repository, and they are flagged here as needing a re-measurement with
one. They are the figures the live page discloses, and they are directionally reliable.

Short human text is not falsely flagged: **0 of 400 samples at 60–200 words**. So the failure
below 200 words is silence, not accusation. Below that length the reading is not reliable and the
page says so.

### 3. AI rewrites of a human original — 30–35% detected

Measured on the HAT-Bench v6–v8 edit bands. If someone takes a human draft and asks a model to
rewrite it, this tool catches it about one time in three. Paragraph-mixed documents, where human
and machine writing alternate, remain the weakest case for every model tried here, including the
cycle-3 candidate that was built and rejected.

For contrast, the case that actually matters most is handled: an AI draft that a person then
tidies is detected **82.3%** of the time. And human text that a language model merely polished is
**deliberately not flagged** — in that band a median 93.5% of the words are the human author's,
and flagging it would mean accusing writers who use a model on their own prose.

### 4. Academic writing — the register to watch, but no longer the worst

Earlier documents in this project said academic writing carried the highest human false-positive
rate of any genre. **That is now superseded.** It was measured at the 0.9110 threshold, which is
not the threshold that ships, and stories are now clearly higher. The current per-register human
false positives, measured on the fresh corpus at 0.980 under `segments-v2`:

| register | wrongly flagged | rate |
|---|---:|---:|
| stories | 33 / 260 | **12.69%** |
| academic discussion | 16 / 420 | 3.81% |
| academic conclusions | 10 / 360 | 2.78% |
| academic introductions | 8 / 420 | 1.90% |
| long-form journalism | 13 / 840 | 1.55% |
| research summaries | 3 / 189 | 1.59% |
| white papers | 11 / 840 | 1.31% |
| company updates | 3 / 662 | 0.45% |
| academic literature reviews | 0 / 225 | 0.00% |
| student essays | 0 / 420 | 0.00% |

Academic discussion rose from 2.86% with the segmentation change and is the register to watch.
Student essays and literature reviews are clean at these denominators. On the detection side,
academic essays are the hardest AI register: **122 of 132, 92.42%**, the lowest of any long-form
category — though still far above the 50% floor.

### 5. Business reports and white papers — data-starved, not settled

Only **205 human business reports exist in the whole corpus**, leaving **72 held-out rows** and a
cycle-2 AUROC of **0.6935** against 0.93–0.99 for every other register. It clears the 50% floor
as part of "white papers and research documents", but 72 rows is not enough to call anything
settled, and this figure must not be quoted as though it were.

### 6. The writing rules on their own are not detection

**45.1% detection at a 24.8% human false-positive rate**, measured on 922 AI and 1,200 human
fresh long-form documents. They flag one human document in four. That is why they stopped
contributing to the AI verdict on 28 August 2026 and became editorial suggestions. Genuine human
copy triggers them routinely, and carefully prompted AI text often triggers none of them.

### 7. The published headline figures predate segmentation

The 90.3% detection at 1.34% false positives quoted above was measured through the shipped
browser runtime on 5,558 unseen documents, but **before segmentation existed** — one truncated
pass over each document rather than segment by segment. On the same 5,558 documents, the
segmented fp32 reference route now reads **96.9% detection at 2.09% false positives** at 0.980,
and **95.1% at 1.21%** at 0.984. The browser runtime's own segmented curve over the full corpus
has not been measured. Until it is, the browser figures on this page and on the live site carry a
`segments-v1` pipeline and should be read as a floor rather than as current.

### 8. The rest, stated plainly

- A clean result means no selected check fired. It is **not** evidence of human authorship, and the interface labels it "No strong AI-style signals", never "human".
- **Hidden characters are not an AI signal.** The integrity axis reports that something wrote into the text; it says nothing about who or what composed it, and the engine throws rather than publish a verdict that collapses the two.
- A carrier inserted mid-entity can defeat name and organisation extraction. Regex-driven kinds such as URLs still match through.
- Band boundaries do not align with the flag point: a score of exactly 98.4% displays "Uncertain" while being flagged. Cosmetic, confusing, and open.
- The watermark lab uses public demo keys. It cannot verify or rule out any provider's production watermark, and no public verifier exists for Anthropic production keys.
- No plagiarism checking, no internet-scale source matching, no detector-clearance claims, no guaranteed SEO outcomes. Unsupported and unrun checks are shown as exactly that, never collapsed into a pass.
- Register labels in the evaluation corpus are machine-assigned and unvalidated, so every per-register figure above inherits that. Three of the 5,558 held-out documents come from PERSUADE 2.0, which also appears in the cycle-2 training corpus.

Sources for every figure in this section: [docs/measurements/ROUTE-PARITY.md](docs/measurements/ROUTE-PARITY.md),
[docs/CAPABILITIES.md](docs/CAPABILITIES.md), [docs/TEST-EVIDENCE.md](docs/TEST-EVIDENCE.md),
`services/local-engine/research/cycle2-train/CYCLE2-REPORT.md`, and the `segments-v1` to
`segments-v2` measurement of 29 August 2026.

## Methodology and versioning

Every analysis records the signal-set versions that produced it (`unicode:2026.08.2`, `en-signals:2026.08.6` at the time of writing) in results and receipts, so findings are reproducible and surfaces are provably in step. Statuses come from a fixed vocabulary (`pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`). Test methodology and evidence classes are documented in [docs/TEST-EVIDENCE.md](docs/TEST-EVIDENCE.md); the standing rule is that every new capability lands with a fixture-battery extension.

## Roadmap

- **Trained local model (Tier C)**: cycle 2 is live. Cycle 3 was built and rejected on measured evidence. The next useful purchase is roughly 300 genuinely model-tidied documents for a real held-out edit set, costed at about $2.10, and the technique that worked — a saturating soft target on the AI word share — should be combined with a quantisation-friendly architecture.
- **Hosted inference (deployed 29 August 2026, not yet wired to the checker)**: a Cloud Run endpoint that lets visitors avoid the 34.5 MB download. Verified on the day at `https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq`, europe-west1, scale to zero. `/v1/health` returns model `tier3-cycle2`, fp32, build `e313ab00de1fffd2`, `segmentation_contract: segments-v1`. Server-side segmentation matches the browser contract: a 1,200-word document returns 4 segments of 340/340/340/180 words with `aggregation: "max"`, exactly the published golden case. The daily cap is counted in **inferences, not requests** (12,000 a day; one four-segment request moved the remaining allowance 12,000 → 11,996), because a request is not a fixed unit of cost. Abuse gates and the kill switch were both exercised against the running service. **The £50 spend ceiling is delivered by that kill switch, not by any Cloud Run setting** — `--max-instances` bounds CPU and memory but nothing caps the request count, and a month-long flood is roughly £519 at two instances even with every request rejected. The switch failed twice in testing, once silently, before it worked; `docs/security/THREAT-MODEL.md` records both failures, and it must be re-fired after every redeploy and IAM change. The zero-retention claim was audited the same day by submitting a unique high-entropy marker through the real gated path and finding zero occurrences of it in any log entry in the project — on the scoring path only; refusal and error paths are unprobed, and that probe is re-run after every redeploy too. The URL and revision change on redeploy — re-run `GET /v1/health` rather than trusting either. **Still open:** the checker is not pointed at this route, and the site-wide "your text never leaves your browser" copy must change before it is.
- **Publication**: the source repository is public. No npm or PyPI release, WordPress.org submission, Chrome Web Store listing or Astro catalogue entry exists yet, and those gates are genuinely open.
- **BYOK adapters (Tier D)**: Copyleaks and Originality first, rendering their attributed scores beside ours.
- **WordPress, Chrome and Astro sync**: next release, built from the same engine tarballs. Each will also need the model row and the rules demotion carried across; today they ship the deterministic tiers only.
- **Benchmark and Integrity Index**: reproducible, versioned corpus with published false-positive rates, including a hand-rewritten-AI category.

## Attribution and licences

This project was built on existing open-source work by deliberate choice, not by accident, and
the credit list is long because the reuse was real. Every project that contributed code, data,
rules or method is named here with a link to its canonical source, its licence, and one sentence
on what was taken. Projects that contributed only an idea are on the list too: inspiration is
still a debt. The exhaustive record, including versions, snapshot commits and file-level
destinations, is [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Shipped in the product

| Project | Licence | What was taken |
|---|---|---|
| [intfloat/e5-small](https://huggingface.co/intfloat/e5-small) | MIT (confirmed from the model card, 29 August 2026) | The base encoder, 33.36M parameters, fine-tuned by Opace into the shipped cycle-2 detector and exported to per-channel int8 ONNX. Modified and redistributed. |
| [onnxruntime-web / onnxruntime-common](https://github.com/microsoft/onnxruntime) (Microsoft) | MIT | Runs the shipped int8 classifier in the visitor's browser. Unmodified. |
| [@contentauth/c2pa-web](https://github.com/contentauth/c2pa-js) (Adobe / Content Authenticity Initiative) | MIT | C2PA Content Credentials reading for uploaded images and PDFs. Unmodified. |
| [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (Conor Bronsdon and contributors) | MIT | 46 of the 51 v2 writing-pattern rule categories, the stylometric methods, the weights and the classifier logic, adapted to TypeScript; plus Cyrillic and Greek lookalike map data. One upstream bug was fixed in the port. |
| [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) (Guillaume Meyer) | MIT | The invisible-character and space-substitute carrier tables, and the explicit-carrier inspection model. Table data only; no upstream code is distributed. |
| [synthid-text](https://github.com/google-deepmind/synthid-text) (Google DeepMind) | Apache-2.0 | The SynthID-Text detection mathematics — LCG hashing, g-values, masks, mean and weighted-mean scores — ported from Python and torch to TypeScript in `@opace/watermark-lab`, and the reference generation path that produced the known-key demo fixtures. |
| [OpenAI GPT-2](https://github.com/openai/gpt-2) | MIT | The byte-level BPE tokeniser algorithm, ported from `src/encoder.py`, and the published `vocab.json` and `merges.txt` assets, embedded so pasted text can be tokenised in the browser. |
| [antislop-sampler](https://github.com/sam-paech/antislop-sampler) (Sam Paech) | Apache-2.0 | Frequency-ranked fiction phrase and over-represented name data, adapted into the `fiction-slop-phrase` and `fiction-promptonym` rules. |
| [slop-gate](https://github.com/hwajongpark/slop-gate) (hwajongpark) | MIT | Promotional-register and buzz-phrase pattern data, adapted into the `promo-travel` and `buzzword-phrase` regex families. |
| [anti-ai-writing](https://github.com/avectats7/anti-ai-writing) (avectats7) | MIT | Buzz-phrase and weak-verb observation data, adapted into the 2026.08.3 phrase rules. |
| [anti-slop](https://github.com/kjmagnan1s/anti-slop) (kjmagnan1s) | MIT | Faux-insight phrase data, and the protect-list and context-profile design. No upstream code is distributed. |
| [claude-slop-detector](https://github.com/aplaceforallmystuff/claude-slop-detector) (aplaceforallmystuff) | MIT | Staccato-fragment and tripled-negation observations, adapted as structural rules. |
| [SLOP_Detector](https://github.com/SicariusSicariiStuff/SLOP_Detector) (SicariusSicariiStuff) | Apache-2.0 | The graded penalty-class weighting approach, which informed the corroboration and tier-B weighting. No upstream lists are copied verbatim. |
| [slop-forensics](https://github.com/sam-paech/slop-forensics) (Sam Paech) | MIT | Per-model slop-profile observations, used to corroborate the fiction-lane rules. No upstream code or profile files are distributed. |
| [Wikipedia, *Signs of AI writing*](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | CC BY-SA 4.0 | Editorial guidance, independently re-expressed with no verbatim excerpts, behind the artefact-token, legacy-framing and structural rules. Credited here as the licence requires. |
| [Unicode Consortium character data](https://www.unicode.org/Public/UCD/latest/) | Unicode licence (data) | The category-derived carrier inventory: 415 code points across 38 rules, and the 60-entry confusable set. |
| [Project Gutenberg](https://www.gutenberg.org) public-domain texts (Austen, Darwin, Franklin, Twain, the Federalist authors, Beeton, Adam Smith) | public domain, all published pre-1929 | Roughly 50KB of human prose embedded as the conditional-compression prior and lexical-register reference profile. The pre-1929 cutoff also makes the corpus contamination-proof against model output. Only the raw public-domain text travels; no Project Gutenberg header, licence text or trademark is included. |
| [canonicalize](https://github.com/cyberphone/json-canonicalization), [entities](https://github.com/fb55/entities), [ajv](https://github.com/ajv-validator/ajv) and [ajv-formats](https://github.com/ajv-validator/ajv-formats), [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal), [fast-uri](https://github.com/fastify/fast-uri), [json-schema-traverse](https://github.com/epoberezkin/json-schema-traverse), [require-from-string](https://github.com/floatdrop/require-from-string), [jsonschema](https://github.com/python-jsonschema/jsonschema), [rfc8785.py](https://github.com/trailofbits/rfc8785.py), [opis/json-schema](https://github.com/opis/json-schema) with [opis/string](https://github.com/opis/string) and [opis/uri](https://github.com/opis/uri) | Apache-2.0, BSD-2-Clause, BSD-3-Clause and MIT as recorded per package | Canonical JSON, schema validation and entity decoding across the TypeScript, Python and PHP surfaces. Unmodified. |
| Published academic findings: Liang et al. (ICML 2024), [Kobak et al. (*Science Advances* 2025)](https://www.science.org/doi/10.1126/sciadv.adt3813), Juzek & Ward (COLING 2025), Reinhart et al. (PNAS 2025), Geng & Trotta (2024), Pew Research (2026) | findings are facts, and uncopyrightable | Word-frequency and structural findings used as rule thresholds and lexicon facts. No paper table is reproduced. |

### Methods and data behind the trained model

| Source | Licence | What was taken |
|---|---|---|
| [Pangram Labs technical report](https://arxiv.org/abs/2402.14873) | the method is published; the service is proprietary | **The largest single debt in the project.** The hard-negative-mining training recipe — score a large human pool, find what the classifier wrongly flags, generate machine-written mirrors of those documents, retrain, repeat — is what took published-prose AUROC from 0.530 to 0.970. The Pangram service is not called and makes no claim here. |
| [DivEye](https://arxiv.org/abs/2509.18880) | **CC BY-NC**, so the code was not consulted | The claim that the *diversity* of the surprisal sequence separates machine from human writing better than its *mean*. Reimplemented from the paper alone, measured on 2026 models, and confirmed: diversity moments reach AUROC 0.766 against 0.715 for mean log-perplexity. |
| [GLTR](https://arxiv.org/abs/1906.04043) (Gehrmann, Strobelt & Rush) | no licence recorded in this project — an open gap in our records | The rank-bucket idea and the per-token explanation overlay, reimplemented from the paper as a research baseline. Useful as explanation, not as a verdict: 0.0% detection at a 1% false-positive budget. |
| [GRADTEX](https://huggingface.co/datasets/elisabeth-pl-pl/GRADTEX) · [HAT-Bench](https://huggingface.co/datasets/HAT-Baselines/HAT-Bench) · [PERSUADE 2.0](https://huggingface.co/datasets/realbenpope/PERSUADE_manageable) · [C4](https://huggingface.co/datasets/allenai/c4) · [MAGA](https://huggingface.co/datasets/anyangsong/MAGA) · [aita-human-vs-ai](https://huggingface.co/datasets/mild-rgb/aita-human-vs-ai) | CC BY 4.0 · Apache-2.0 · CC BY 4.0 upstream, MIT mirror · ODC-BY 1.0 · MIT · Apache-2.0 | The 15,514-document cycle-2 training corpus. The corpora are not redistributed, but the model trained on them is, so their licences are recorded. |
| [Europe PMC](https://europepmc.org) · [GOV.UK](https://www.gov.uk) · [CRS reports](https://crsreports.congress.gov) · [Global Voices](https://globalvoices.org) · [Mongabay](https://news.mongabay.com) · [SEC EDGAR](https://www.sec.gov/edgar) | open-access, OGL 3.0, US public domain, CC BY 3.0, CC BY-ND 4.0, US public domain | The 4,636 held-out human long-form documents that every accuracy figure in this README is measured against. |

### Cloned, read, and not used — the correction

Several well-known detector repositories were cloned during the research phase and read as
background. **None of them was used, extended or derived from, and nothing in the product is
built on any of them:** [fast-detect-gpt](https://github.com/baoguangsheng/fast-detect-gpt),
[Binoculars](https://github.com/ahans30/Binoculars), [RADAR](https://github.com/IBM/RADAR),
[DIPPER](https://github.com/martiansideofthemoon/ai-detection-paraphrases),
[ai-detector-bench](https://github.com/sv-pro/ai-detector-bench),
[BIRA](https://github.com/ml-postech/Bias-Inversion-Rewriting-Attack), SIRA / MGT-Eval,
[MarkLLM](https://github.com/THU-BPM/MarkLLM), and the published HumanizerBench data. Searching
every shipped package for their names returns nothing.

Two of them had a *published method* reimplemented from the paper as an evaluation baseline in
`services/local-engine/research/signal-science/`, which is measurement rather than derivation.
[Fast-DetectGPT](https://github.com/baoguangsheng/fast-detect-gpt) (MIT) contributed its
sampling-free curvature statistic, measured here at AUROC 0.545 with a GPT-2 small observer
against roughly 0.93 in its own paper with far larger scoring models — a floor for the
browser-deployable form of the method, not a refutation of it.
[Binoculars](https://github.com/ahans30/Binoculars) (BSD-3-Clause) was **not implemented at
all**: it needs two different models and only one was available offline. The degenerate
same-model proxy that was measured is explicitly not Binoculars' score, and its published 79% at
a 5% false-positive rate on RAID stands unchallenged by anything here.

Reading someone's repository is not extending it, and this project will not claim otherwise.

Full records, including versions, snapshot commits, file-level destinations and the projects that
were deliberately **not** reused (`gptslop` for its AGPL licence, `anti-ai-slop-writing` for
having none, the berenslab excess-word lexicon pending licence verification, wikiHow for its
non-commercial clause): [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
[MODEL_AND_DATA_PROVENANCE.md](MODEL_AND_DATA_PROVENANCE.md),
[docs/legal/DEPENDENCY-LEDGER.md](docs/legal/DEPENDENCY-LEDGER.md).

## Documentation

- [Capability register](docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](docs/EVIDENCE-INDEX.md) — every test result, evaluation report and research artefact, with paths
- [Listing descriptions](DESCRIPTIONS.md) — canonical copy for stores and registries
- [Test evidence](docs/TEST-EVIDENCE.md) · [Release state](docs/RELEASE-STATE.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md) · [Citation](CITATION.cff)

## Privacy and security

Browser, extension and Astro inspection stays on the device: no telemetry, no remote fallback, no content sent to Opace or any detector provider by default. The hosted checker page itself carries the site-wide analytics that fire a standard form-interaction event; that event contains no text, file or result content, and the page discloses it. The loopback service requires bearer tokens and rejects non-loopback origins. Report vulnerabilities through [SECURITY.md](SECURITY.md), never a public issue.

Maintained by [Opace Digital Agency](https://opace.agency/). Opace-authored monorepo code is available under the [MIT Licence](LICENSE); the WordPress distribution retains its declared GPL-compatible licence.

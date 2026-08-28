# Capability register — Opace AI Content Integrity

This is the exhaustive technical register of every check, rule category, carrier table, protected-span kind, status value and test result in the current engine. It is transcribed from the canonical build log and is the file listing copy is checked against: if a capability is not recorded here, it must not be claimed anywhere.

Engine version stamps referenced throughout, exactly as exported by `@opace/content-integrity-core`:

| Constant | Current value | Covers |
|---|---|---|
| `UNICODE_RULES_VERSION` | `unicode:2026.08.2` | Carrier and homoglyph tables |
| `EN_SIGNALS_PATTERN_VERSION` | `en-signals:2026.08.5` (see §3 for the pack contents) | Writing-signal rule pack and scoring — 113 named rules across 110 weighted categories plus 3 en-gb rules, with the evidence-based escalation policy (artefact floor, citation co-occurrence, formatting cluster, finding breadth) calibrated on the August 2026 real-world evaluation (`research/REAL-WORLD-EVAL-2026-08.md`): argmax base, escalations raise only, zero human false positives on the evaluation controls and on the 44-text human calibration set |

Every receipt and result stamps these versions, so two surfaces on the same version must produce byte-identical findings for identical input. This is verified by the cross-surface battery suite (§7).

## 1. Capability tiers

The brief defines four detection tiers, and every surface states which tier a result came from:

- **Tier A — deterministic evidence.** Carriers, homoglyphs, protected content, provenance, receipts. Exact, local, runs everywhere.
- **Tier B — rules and stylometrics.** The writing-signal pack. It explains and improves writing and catches careless AI output. It must never be presented as authorship detection.
- **Tier C — trained local models.** Live in beta on the browser checker as "Named local signals": a consent-gated in-browser classifier for genuine AI-writing signals, free and private, always shown with its measured first-cycle accuracy.
- **Tier D — authorised external verification.** BYOK adapters to commercial detectors, on explicit consent only. Planned.

## 2. Tier A — deterministic Unicode evidence

### 2.1 Invisible-character (carrier) detection

38 carrier rules covering **415 code points**:

- Full Cf format set: ZWSP, ZWNJ, ZWJ, LRM, RLM, bidi embeddings and isolates, word joiner and invisible operators U+2060–2064, BOM, U+061C, U+070F, U+0890–0891, U+08E2, U+180B–180F including the Mongolian vowel separator, interlinear annotation U+FFF9–FFFB, U+110BD and U+110CD, and the tag block U+E0001 plus U+E0020–E007F.
- Variation selectors U+FE00–FE0F **and** the supplementary set U+E0100–E01EF.
- Combining grapheme joiner U+034F.
- The Zs space family: NBSP, U+1680, U+2000–200A, narrow no-break space U+202F, U+205F, U+3000.
- Line and paragraph separators U+2028/U+2029, replacement character U+FFFD, and unpaired surrogates.

Context intelligence, so legitimate multilingual text does not flag:

- ZWJ inside emoji sequences is exempt.
- ZWNJ/ZWJ in cursive and Indic scripts are exempt.
- Variation selectors after emoji bases are skipped; after Han or Mongolian bases they are downgraded to a note.
- French-typography spaces stay at note severity.

The tables are data-driven in `packages/core/src/unicode/data.ts`, derived from Unicode Consortium category data (Cf/Zs) and adapted from the watermarks-remover project's tables (MIT, Guillaume Meyer).

### 2.2 Homoglyph detection

60 confusables: 37 Cyrillic and 23 Greek Latin-lookalikes, including і, к, ѕ, ј, ԁ, ο, ν, lunate sigma and the capital sets. A mixed-script token gate means pure Russian or Greek text never flags.

### 2.3 Protected content — 12 span kinds

`extractProtectedSpans` recognises: currency, number, date, time, unit, url, email, quote, code, plus three added in v0.2:

- **name** — honorific-led and capitalised-run heuristics, sentence-start rejection, stoplist;
- **organisation** — suffix rules (Ltd, LLC, plc and family) plus 2–6-capital acronyms with a GMT/EUR/API-style stoplist;
- **citation** — the (Author et al., 2020) family plus adjacent-year et al. forms.

Extraction is precision-first, with the shared envelope, dedup and sort semantics. Protected content is reported `inconclusive` in summaries, never `pass`.

### 2.4 Provenance — live C2PA file check

The browser checker reads C2PA Content Credentials from uploaded JPEG, PNG, WebP and PDF files, entirely locally, using the official Content Authenticity Initiative `@contentauth/c2pa-web` SDK. Honest status mapping applies: a file with no manifest is reported as having no Content Credentials, not as failed; certificate trust lists are deliberately not consulted, and the UI states that certificate trust is not judged. Pasted text is never given a provenance verdict. The browser-level provenance suite passed 18/18 at its release point (build log §5a).

### 2.5 Receipts

Canonical hash-only receipts via RFC 8785 JSON canonicalisation (`canonicalize`, Apache-2.0). Receipts record content hashes, the methods run, statuses, limitations and the signal-set version stamps. No content is retained by default.

## 3. Tier B — writing-signal rules

The shipped pack is `en-signals:2026.08.5`: **110 weighted categories** (51 v2 + 52 v3 + 7 v4 rhythm) plus 3 en-gb-v1 rules, a total of **113 named rules** (`rules_run: 113` in every result).

### 3.1 The v2 base pack

**51 weighted categories** in `packages/core/src/patterns/en-signals-v2{,-data}.ts`, run alongside the 3 en-gb-v1 rules.

46 categories adapted from avoid-ai-writing (MIT, Conor Bronsdon and contributors), including: tier 1/2/3 vocabulary, chatbot artefacts, cutoff disclaimers, sycophantic and formulaic openers, "let's" constructions, vague attribution, significance and novelty inflation, hollow intensifiers, emotional flatline, false concessions, template phrases, smart-punctuation signature, punctuation distribution, function-word trigram entropy, cross-paragraph burstiness, low type-token ratio, AI placeholders, chatbot citation-markup leaks and AI URL parameters. One upstream bug was fixed in the port (`\b` after `!` in the great-question patterns corrected to `\B`).

5 Opace-original structural rules from owner observations:

| Rule id | Trigger |
|---|---|
| `signals.em_dash_density` | more than 6 em dashes per 1,000 words and at least 3 |
| `signals.not_just_contrast` | the "isn't just X, it's Y" contrast template |
| `signals.uniform_sections` | 4+ sections with length CV < 0.15; high severity at 8+ sections with CV < 0.10 |
| `signals.uniform_list_items` | list items of near-identical length |
| `signals.sentence_flatline` | sentence-length CV < 0.25 |

A normalisation pre-pass (zero-width strip, homoglyph swap) runs before pattern matching, with an offset map so every span addresses the original text.

### 3.2 Editorial signals score

`computeEditorialSignals(text)` returns a 0–100 log-normalised score, a trinary classification (`human_like` / `mixed_signals` / `ai_like`), probabilities, confidence, categories hit, and a status of `scored`, `empty`, `too_short` or `too_long`. It is false-negative-biased by design, per the brief's claim boundaries. The same result is embedded in `inspect()` output as a `{type: "editorial_signals"}` evidence record on the `style.patterns` method; the method status becomes `attention` when the classification is not `human_like`.

Classification is **probability-consistent**: the published label is always the argmax of the published probabilities. The **evidence-based escalation policy** (five raise-only policies from the August 2026 real-world evaluation: artefact floor, citation co-occurrence, artefact-plus-score, formatting cluster, finding breadth) rewrites the probabilities and label together and records an explanatory `escalation` field naming the policy and reason, or null when the label is the unescalated argmax. Escalations only ever raise a classification; no policy touches a result with no artefact or breadth evidence, and the evaluation measured zero human escalations.

Honesty guarantees in the result itself:

- A zero-finding pattern run carries `{type: "scope_note", rules_run: 113}` with the note that this is not evidence of human authorship.
- Unsupported methods state "Not yet available in this release."
- The provider is named "Opace writing-signal rules", never a detector.
- A clean result is presented as "No strong AI-style signals", not as a human verdict.

### 3.3 The v3 merge (52 categories, shipped)

A merge of two research streams (the AI-tells mega pack: 259 raw tells consolidated to 114, and the owner-docs catalogue mined from seven internal writing-guideline documents) contributes 52 categories in `packages/core/src/patterns/en-signals-v3{,-data}.ts`. It adds:

- **An artefact-forensics category** — near-zero-false-positive, model-attributing evidence: exposed citation tokens (oaicite/citeturn forms, 【N†L】 markers, `grok_render_citation_card_json`, `ppl-ai-file-upload` upload-host strings), `utm_source=chatgpt.com`-style URL fingerprints, unfilled placeholders, reasoning-trace leaks, and markdown, math-bold and Private Use Area character leakage. 7 rules covering 11 attributed citation-token patterns.
- **New stylometric and structural measures** — participial significance tails, copula-avoidance ratio, weasel attribution, negative-parallelism variants.
- **Owner-sourced additions** — lexical, phrase, structural and stylometric rules from the owner-docs catalogue (roughly 23 lexical tells, 32 phrases with regexes, 11 structural rules and 5 stylometric measures were catalogued; the merged, deduplicated contribution is 22 owner phrasebook regexes plus dedicated owner-phrase, owner-vocab, setup-and-expansion-cadence, power-verb-compound, passive-ratio, low-specificity and adjacent-lemma-repeat rules; 67 lower-confidence tells are recorded as documented exclusions rather than implemented).
- **Era and model-attribution metadata** on rules, recording that tells decay (some vocabulary tells died in 2025) and that some tells flip attribution between model families over time. Stylometric tells remain corroboration-only, never sole evidence, because of the documented false-positive risk for non-native writers.

### 3.4 The v4 rhythm and stylometric rules (7 categories, shipped)

Seven cadence and register measures in `packages/core/src/patterns/en-signals-v4{,-data,-corpus}.ts`, built from the owner's rhythm observations (`research/OWNER-RHYTHM-NOTES.md`) and the clean-prose plan (`research/CLEAN-PROSE-DETECTION-PLAN.md`):

| Rule | Measures |
|---|---|
| `sentence_length_spectral_flatness` | Windowed DFT over the sentence-length series; unusually structured rhythm across long texts (short texts are exempt) |
| `conditional_compression` | Text that gains unusually little from a varied human-prose compression prior, a degenerate form of what trained classifiers measure |
| `lexical_register_distance` | Function-word profile and word-length register far from the general-prose human reference (with a documented genre caveat) |
| `punchline_fragment_density` | Very short abstract declarative punchlines recurring at high density, especially paragraph-final |
| `mic_drop_paragraph` | Repeated paragraphs shaped as setup sentences ending in a much shorter abstract contrast closer |
| `contrast_density` | Two-sided contrast constructions ("not X, but Y") recurring at high density |
| `rhetorical_procedural_ratio` | Abstract-claim sentences heavily outnumbering sentences naming concrete actions, objects or numbers |

Calibration is a standing gate: `node tests/battery/calibrate.mjs` scores the 40-text verified-human corpus (`tests/battery/human-corpus-v1.json`, documented in `tests/battery/HUMAN-CORPUS.md`) plus the four evaluation human controls, and currently reports "Calibration OK: 0/44 human samples fire any 2026.08.5 rule." Rhythm rules are corroboration-only: alone they never escalate and never reach `ai_like` (enforced by `tests/battery/rhythm-battery.test.mjs`).

Every new capability lands with a battery extension (standing rule, recorded in the battery README).

## 4. Tier C — Named local signals (beta, live)

Rule tiers cannot reliably catch clean, well-prompted AI prose (§9, known limits). The Tier C layer is now live in beta on the browser checker as **Named local signals**:

- An **e5-small int8 ONNX classifier, 34.1 MB** (`services/local-engine/research/models/tier3-e5small-int8.onnx`), run in the browser via ONNX Runtime Web.
- **Consent-gated**: nothing downloads until the user explicitly requests the model; it is fetched once, cached, and every run stays in the browser.
- **Measured-accuracy disclosure on every result**: the UI always states the first-training-cycle numbers (first cycle detected 2 of 23 clean-AI passages (8.7%) and 2 of 30 AI samples overall (6.7%) at a calibrated threshold with zero false positives across all 116 verified human texts (0.0%); a flag is dependable rather than frequent, and cycle 2 targets the measured marketing-copy and encyclopaedic blind spots) with a link to the full results, and a no-signal result carries the scope note that the measured miss rate applies, so it is not a human verdict.
- Trained on the corpus documented in `services/local-engine/research/corpus/manifest.json` with an 8-gram zero-tolerance quarantine against the held-out evaluation set; the browser contract is `services/local-engine/research/BROWSER-RUNTIME-SPEC.md`; the machine-readable evaluation is `services/local-engine/research/eval/eval-report.json`.
- Later cycles apply the published hard-negative-mining method from the Pangram Labs technical report (arXiv:2402.14873), each benchmark-gated before any stronger claim.

## 5. Tier D — external verification (planned)

BYOK adapters for commercial detectors the user already pays for, with clearly attributed "we called X, it said Y" results, plus the official Anthropic verifier if and when a supported interface exists. No adapter is called silently, and no provider is named as passed unless it genuinely ran.

## 6. Watermark lab — `@opace/watermark-lab` 0.1.0

A real, browser-runnable SynthID-Text known-key demo detector: a faithful TypeScript port of the detection path of Google DeepMind's Apache-2.0 reference implementation, plus a GPT-2 byte-level BPE tokeniser so pasted text can be scored entirely in the browser.

Mathematics, in one paragraph: token windows are hashed with an LCG-style function under a keyed schedule (`ngramLen: 5`, the paper's H = 4 context window; `contextHistorySize: 1024`); the hash drives Bernoulli g-values per tournament layer; watermarked generation reweights sampling through a non-distortionary tournament (`num_leaves = 2`); detection computes mean and weighted-mean g-scores with z-scores and p-values against the 0.5 null. The demo keys use 6 tournament layers rather than the reference example's 30, because 30 layers dilute mean g to about 0.52 at educational passage lengths; the deviation is recorded in `WATERMARK_LAB_VERSIONS` and the fixture manifest.

Verified numbers:

- Exact g-value and mask parity with the reference; 72 fixture-by-key scores agree to within 1e-4.
- GPT-2 BPE tokeniser with 12/12 Python-parity vectors.
- Real watermarked fixtures generated with torch and the reference tournament sampler (GPT-2 124M, 3 named demo keys): right-key mean g 0.640–0.694 versus roughly 0.5 for wrong-key and unwatermarked text, with truncation and substitution degradation variants. The seed-selection rule is documented in the manifest.
- 30/30 tests; 10,000 tokens scored in about 50 ms; browser bundle about 1.69 MB (mostly vocabulary data).

The live lab's **v2 release** adds, on top of the same package mathematics:

- **Key rotation with genuine key discovery**: pasted text is scored under every held demo key, so a sample generated through the lab's fixture pipeline has its producing key recovered by the mathematics rather than asserted by the UI, and unrelated text shows every key collapsing to the 0.5 null.
- **Desktop auto-load**: on desktop the roughly 1.6 MB detection engine loads lazily when the lab first scrolls into view; mobile keeps the explicit load button.

Claim boundary, mandatory on every surface: the lab uses public Opace demo keys. It cannot say anything about Gemini or Claude output without the providers' private keys, and a score near 0.5 never proves text is human-written.

## 7. Test evidence (verbatim totals, re-run 28 August 2026)

| Suite | Result |
|---|---|
| Core unit, imports and performance (`npm --prefix packages/core test`) | **77 pass / 0 fail** |
| Root suite (`npm test`) | typecheck clean; 13 contract schemas; Python and PHP fixture suites pass |
| G2 core gate | 24/24 |
| Battery (`npm run test:battery`) | **101/101** across carriers, slop, uniformity, rhythm, protected and cross-surface suites |
| Rhythm calibration (`node tests/battery/calibrate.mjs`) | "Calibration OK: 0/44 human samples fire any 2026.08.5 rule." |
| Watermark lab (`npm --prefix packages/watermark-lab test`) | 30/30 |
| Browser suites at release (build log §5–5b, Playwright) | checker UI 22/22; lab UI 24/24; provenance 18/18 |
| Performance | 50,000 characters inspected in roughly 27–31 ms (gates at 200/300 ms) |
| Cross-surface parity | website's installed engine proven byte-identical to source on findings, methods, signals and versions |
| Live verification | scripted Chrome against production, 6/6: slop fixture scored `ai_like` with highlighted spans; human control clean; carrier text needs-review with protected names extracted |

Every v0.1-review fixture-B carrier is detected. Fixture D (modern slop) classifies `ai_like` where v0.1 found nothing; the human control produces 0 findings. The August 2026 real-world evaluation (34 published samples: 30 labelled AI, 4 verified human controls) measured the escalation policy at 3/30 `ai_like` plus 3/30 `mixed_signals` on AI samples, with slop-class samples escalated 6/7 and zero human escalations.

Full methodology for what each suite proves is in [TEST-EVIDENCE.md](TEST-EVIDENCE.md) and the battery README. Every evidence artefact behind these totals is indexed with its path in [EVIDENCE-INDEX.md](EVIDENCE-INDEX.md).

Release tooling: the permanent `npm run pack:vendor` script (`scripts/pack-vendor.mjs`) packs the engine tarballs for site vendoring with internal `file:` dependencies rewritten to version specs, closing the deploy-failure class recorded in the build log; it is exercised by `tests/gate/pack-vendor.test.mjs`.

## 8. Status vocabulary

Every method reports exactly one of: `pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`. Unsupported, unrun and failed checks are never visually collapsed into a pass, and stubs render as "coming, not yet run", never as live-looking checks.

## 9. Known limits (recorded honestly)

- **Clean, well-prompted AI prose largely evades the rule tiers.** A 100% GPT-5.6 article scored 6/100 on the rule tier. The beta Named local signals model addresses this class, but its first training cycle catches only part of it (first cycle detected 2 of 23 clean-AI passages (8.7%) and 2 of 30 AI samples overall (6.7%) at a calibrated threshold with zero false positives across all 116 verified human texts (0.0%); a flag is dependable rather than frequent, and cycle 2 targets the measured marketing-copy and encyclopaedic blind spots), and every surface discloses those measured numbers rather than implying coverage.
- **Classic-cliché AI text reaches `mixed_signals` (score 32), not `ai_like`.** The score is deliberately false-negative-biased.
- **A carrier inserted mid-entity can defeat name and organisation extraction** (regex-driven kinds such as URLs still match through).
- **The demo watermark keys are public.** The lab demonstrates the published science; it is not a production detector for any provider.
- **Plagiarism checking and internet-scale source matching are out of scope** and stated as such.

## 10. Attribution

| Source | Licence | Used for |
|---|---|---|
| avoid-ai-writing (Conor Bronsdon and contributors) | MIT | Writing-pattern rules, stylometric methods, weights and classifier logic, adapted to TypeScript; confusable table data |
| watermarks-remover (Guillaume Meyer) | MIT | Carrier and confusable table data, adapted; no upstream code distributed |
| google-deepmind/synthid-text | Apache-2.0 | Detection mathematics ported in `@opace/watermark-lab` |
| OpenAI GPT-2 reference encoder and vocabulary | MIT | Tokeniser algorithm and assets |
| Unicode Consortium data | Unicode licence (data) | Category-derived carrier inventory |
| Pangram Labs technical report (arXiv:2402.14873) | published research | Training method for the planned Tier C classifier |
| c2pa-js (Content Authenticity Initiative) | official library | Provenance adapter (landing) |

Full dependency records: [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), [../MODEL_AND_DATA_PROVENANCE.md](../MODEL_AND_DATA_PROVENANCE.md), [legal/DEPENDENCY-LEDGER.md](legal/DEPENDENCY-LEDGER.md).

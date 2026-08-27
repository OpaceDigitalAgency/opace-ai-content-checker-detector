# Capability register — Opace AI Content Integrity

This is the exhaustive technical register of every check, rule category, carrier table, protected-span kind, status value and test result in the current engine. It is transcribed from the canonical build log and is the file listing copy is checked against: if a capability is not recorded here, it must not be claimed anywhere.

Engine version stamps referenced throughout, exactly as exported by `@opace/content-integrity-core`:

| Constant | Current value | Covers |
|---|---|---|
| `UNICODE_RULES_VERSION` | `unicode:2026.08.2` | Carrier and homoglyph tables |
| `EN_SIGNALS_PATTERN_VERSION` | `en-signals:2026.08.3` (see §3 for the merge contents) | Writing-signal rule pack and scoring |

Every receipt and result stamps these versions, so two surfaces on the same version must produce byte-identical findings for identical input. This is verified by the cross-surface battery suite (§7).

## 1. Capability tiers

The brief defines four detection tiers, and every surface states which tier a result came from:

- **Tier A — deterministic evidence.** Carriers, homoglyphs, protected content, provenance, receipts. Exact, local, runs everywhere.
- **Tier B — rules and stylometrics.** The writing-signal pack. It explains and improves writing and catches careless AI output. It must never be presented as authorship detection.
- **Tier C — trained local models.** In development. A distilled classifier for genuine AI-writing signals, free and private.
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

### 2.4 Provenance — C2PA adapter (landing)

A C2PA provenance adapter built on the official `c2pa-js` library is in integration: it reads Content Credentials from JPEG, PNG and WebP images, entirely locally. Until it ships on a surface, provenance methods report their honest unavailable state rather than a silent pass.

### 2.5 Receipts

Canonical hash-only receipts via RFC 8785 JSON canonicalisation (`canonicalize`, Apache-2.0). Receipts record content hashes, the methods run, statuses, limitations and the signal-set version stamps. No content is retained by default.

## 3. Tier B — writing-signal rules

### 3.1 Current shipped pack (`en-signals:2026.08.2`)

**51 weighted categories** in `packages/core/src/patterns/en-signals-v2{,-data}.ts`, run alongside 3 en-gb-v1 rules for a shipped total of **54 named rules** (`rules_run: 54` in every result).

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

Honesty guarantees in the result itself:

- A zero-finding pattern run carries `{type: "scope_note", rules_run: 54}` with the note that this is not evidence of human authorship.
- Unsupported methods state "Not yet available in this release."
- The provider is named "Opace writing-signal rules", never a detector.
- A clean result is presented as "No strong AI-style signals", not as a human verdict.

### 3.3 The `en-signals:2026.08.3` merge (v3, in integration)

A merge of two research streams (the AI-tells mega pack: 259 raw tells consolidated to 114, and the owner-docs catalogue mined from seven internal writing-guideline documents) grows the pack from 51 categories to 103 categories (106 total named rules including the three original en-gb rules). It adds:

- **An artefact-forensics category** — near-zero-false-positive, model-attributing evidence: exposed citation tokens (oaicite/citeturn forms, 【N†L】 markers, `grok_render_citation_card_json`, `ppl-ai-file-upload` upload-host strings), `utm_source=chatgpt.com`-style URL fingerprints, unfilled placeholders, reasoning-trace leaks, and markdown, math-bold and Private Use Area character leakage. 7 rules covering 11 attributed citation-token patterns.
- **New stylometric and structural measures** — participial significance tails, copula-avoidance ratio, weasel attribution, negative-parallelism variants.
- **Owner-sourced additions** — lexical, phrase, structural and stylometric rules from the owner-docs catalogue (roughly 23 lexical tells, 32 phrases with regexes, 11 structural rules and 5 stylometric measures were catalogued; the merged, deduplicated contribution is 22 owner phrasebook regexes plus dedicated owner-phrase, owner-vocab, setup-and-expansion-cadence, power-verb-compound, passive-ratio, low-specificity and adjacent-lemma-repeat rules; 67 lower-confidence tells are recorded as documented exclusions rather than implemented).
- **Era and model-attribution metadata** on rules, recording that tells decay (some vocabulary tells died in 2025) and that some tells flip attribution between model families over time. Stylometric tells remain corroboration-only, never sole evidence, because of the documented false-positive risk for non-native writers.

Every new capability lands with a battery extension (standing rule, recorded in the battery README).

## 4. Tier C — trained local model (in development)

Rule tiers cannot catch clean, well-prompted AI prose (§8, known limits). The planned Tier C layer is a distilled classifier (roughly 20–50 MB, int8 ONNX, run via ONNX Runtime Web) trained with the published hard-negative-mining method from the Pangram Labs technical report (arXiv:2402.14873), downloaded once on explicit consent and cached. Until it ships, no surface presents a rule-tier result as detection.

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

Claim boundary, mandatory on every surface: the lab uses public Opace demo keys. It cannot say anything about Gemini or Claude output without the providers' private keys, and a score near 0.5 never proves text is human-written.

## 7. Test evidence (verbatim totals, 27 August 2026)

| Suite | Result |
|---|---|
| Core unit tests | 41 pass / 0 fail (22 in v0.1) |
| Root suite | typecheck clean; 13 contract schemas; Python and PHP fixture suites pass |
| G2 core gate | 24/24 |
| Battery (`npm run test:battery`) | **84/84**: carriers 63, slop 5, uniformity 3, protected 4, cross-surface 9 |
| Watermark lab | 30/30 |
| Performance | 50,000 characters: ≈12 ms Unicode, ≈22 ms patterns (gates at 200/300 ms) |
| Cross-surface parity | website's installed engine proven byte-identical to source on findings, methods, signals and versions |
| Live verification | scripted Chrome against production, 6/6: slop fixture scored 63/100 `ai_like` with highlighted spans; human control clean; carrier text needs-review with protected names extracted |

Every v0.1-review fixture-B carrier is now detected. Fixture D (modern slop) produces 11 findings, score 63, `ai_like` at high confidence, where v0.1 found nothing. The human control produces 0 findings.

Full methodology for what each suite proves is in [TEST-EVIDENCE.md](TEST-EVIDENCE.md) and the battery README.

## 8. Status vocabulary

Every method reports exactly one of: `pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`. Unsupported, unrun and failed checks are never visually collapsed into a pass, and stubs render as "coming, not yet run", never as live-looking checks.

## 9. Known limits (recorded honestly)

- **Clean, well-prompted AI prose evades the rule tiers entirely.** A 100% GPT-5.6 article scored 6/100, `human_like`, high confidence. Only the Tier C trained model can address this class; it is in development, and every surface says so.
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

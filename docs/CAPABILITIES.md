# Capability register — Opace AI Content Integrity

**Cost-control correction — 29 August 2026.** Google Cloud's enforced spend cap is now a live
capability: £50 monthly, project `opace-ai-detector`, service `Cloud Run`, budget
`3b89c8af-bd1c-434f-8cab-3e0d14491e71`, status `Configured`. Service and revision maximums are
1 on live revision `opace-detector-00005-284`. The £10 kill-switch budget remains because spend
data and enforcement lag and overages can be billed. Any older statement below that no Cloud Run
spend cap exists is superseded.

Status: 29 August 2026.

This is the exhaustive technical register of every check, rule category, carrier table, protected-span kind, status value and test result in the current engine. It is the file listing copy is checked against: if a capability is not recorded here, it must not be claimed anywhere.

**Two things changed on 28 August 2026 and govern everything below.** The trained model was retrained (cycle 2) and is now the only check that gives an authorship reading, browser-measured at 90.3% detection and 1.34% human false positives on 5,558 unseen long-form documents. The 113-rule writing-signal tier was demoted to editorial suggestions after measuring 45.1% detection at a 24.8% human false-positive rate on the same data. Every figure in this register that pre-dates that decision is marked historical where it is kept for the record.

Engine version stamps referenced throughout, exactly as exported by `@opace/content-integrity-core`:

| Constant | Current value | Covers |
|---|---|---|
| `UNICODE_RULES_VERSION` | `unicode:2026.08.2` | Carrier and homoglyph tables |
| `EN_SIGNALS_PATTERN_VERSION` | `en-signals:2026.08.6` (see §3 for the pack contents) | Writing-signal rule pack and scoring — **116 named rules** across **113 weighted categories** (113 categories = 51 v2 + 55 v3 + 7 v4; the 3 en-gb-v1 rules bring the named-rule total to 116). **95 of the 116 fired on at least one of 5,743 AI documents; 1 is recorded inactive and 20 dormant** (§3.4a). Since 28 August 2026 this pack produces **editorial suggestions only** and contributes nothing to the AI reading (§3, §7) |
| `COMBINED_VERDICT_VERSION` | `combined:2026.08.8` | The three-axis verdict layer: AI probability, text integrity and provenance, editorial suggestions. See §4a |

Every receipt and result stamps these versions, so two surfaces on the same version must produce byte-identical findings for identical input. This is verified by the cross-surface battery suite (§7).

## 1. Capability tiers

The brief defines four detection tiers, and every surface states which tier a result came from:

- **Tier A — deterministic evidence.** Carriers, homoglyphs, protected content, provenance, receipts. Exact, local, runs everywhere.
- **Tier B — rules and stylometrics.** The writing-signal pack. It explains and improves writing. It must never be presented as authorship detection, and since 28 August 2026 it is not counted as one either: it produces editorial suggestions and nothing else (§3, §7).
- **Tier C — trained local model.** Live on the browser checker as "Named local signals": a single consent-gated in-browser classifier, free and private, always shown with its measured accuracy. **This is the only check in the product that gives an authorship reading.** A second model (GPT-2 surprisal rhythm) was built, measured and deliberately not shipped; §4.3 records why.
- **Tier D — authorised external verification.** BYOK adapters to commercial detectors, on explicit consent only. Planned.

## 2. Tier A — deterministic Unicode evidence

### 2.1 Invisible-character (carrier) detection

38 carrier rules covering **415 code points**:

- Full Cf format set: ZWSP, ZWNJ, ZWJ, LRM, RLM, bidi embeddings and isolates, word joiner and invisible operators U+2060–2064, BOM, U+061C, U+070F, U+0890–0891, U+08E2, U+180B–180F including the Mongolian vowel separator, interlinear annotation U+FFF9–FFFB, U+110BD and U+110CD, and the tag block U+E0001 plus U+E0020–E007F.
- Variation selectors U+FE00–FE0F **and** the supplementary set U+E0100–E01EF.
- Combining grapheme joiner U+034F.
- The Zs space family: NBSP, U+1680, U+2000–200A, narrow no-break space U+202F, U+205F, U+3000.
- Line and paragraph separators U+2028/U+2029, replacement character U+FFFD, and unpaired surrogates.

One category of carrier is detected but deliberately never removed. C2PA 2.4 §A.8 carries a text
content credential in exactly these code points — U+FE00–FE0F for byte values 0–15, U+E0100–E01EF
for 16–255, prefixed by a U+FEFF sentinel — so the safe-fix path would delete the credential's low
bytes, including the trailing `0x00` of the `C2PATXT\0` magic, and the credential would then read
back as absent rather than as damaged. `previewSafeFixes` detects the wrapper first and holds every
finding inside it back with the skip reason `c2pa_text_credential`. Detection is unchanged: the
characters are still flagged, counted and shown. Removal is possible only through the explicit
`allow_c2pa_credential_removal` option, which is off by default. See §2.4 and §10.

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

The browser checker reads C2PA Content Credentials from uploaded JPEG, PNG, WebP and PDF files, entirely locally, using the official Content Authenticity Initiative `@contentauth/c2pa-web` SDK. Honest status mapping applies: a file with no manifest is reported as having no Content Credentials, not as failed; certificate trust lists are deliberately not consulted, and the UI states that certificate trust is not judged. Pasted text is never given a provenance verdict. Since 29 August 2026 the engine does recognise a C2PA 2.4 §A.8 text credential in pasted text, but only far enough to refuse to destroy it: it locates the U+FEFF sentinel, matches the `C2PATXT\0` magic and reads the declared version and manifest length. The manifest is not parsed, no signature is checked and no trust list is consulted, so recognising a wrapper is not validating a credential and no text provenance verdict is produced. The browser-level provenance suite passed 18/18 at its release point (build log §5a).

### 2.5 Receipts

Canonical hash-only receipts via RFC 8785 JSON canonicalisation (`canonicalize`, Apache-2.0). Receipts record content hashes, the methods run, statuses, limitations and the signal-set version stamps. No content is retained by default.

## 3. Tier B — writing-signal rules

The shipped pack is `en-signals:2026.08.6`: **113 weighted categories** (51 v2 + 55 v3 + 7 v4 rhythm) plus 3 en-gb-v1 rules, a total of **116 named rules**. Of those 116, **95 fire on real documents**; one (`tier3-phrase-cluster`) cannot fire on realistic prose and twenty more are dormant on every corpus measured. §3.4a is the measured inventory, with denominators.

> **Binding status, 28 August 2026: this tier no longer contributes to the AI verdict.**
> Re-tested on the fresh long-form corpus (922 AI, 1,200 human) it detected 45.1% of AI writing
> while flagging **24.8% of human writing** — worse than the trained model on both axes at once,
> so adding it to a verdict could only make that verdict worse. The root cause was already
> established three times over: hand-written style rules detect register and formatting, not
> authorship. The tier is kept and presented as what it measurably is, editorial feedback on
> phrasing and structure, and the AI reading comes from the model row alone.
>
> | tier, fresh long-form corpus | AI detected | human false positives |
> |---|---|---|
> | 113 writing rules | 45.1% | **24.8%** |
> | cycle-2 model | **90.3%** | **1.34%** |
>
> The per-rule evidence is in [`../services/local-engine/research/rule-validation/RULE-VALIDATION.md`](../services/local-engine/research/rule-validation/RULE-VALIDATION.md), which found that 32 of the 113 categories are dead in both raw and stripped views, 17 fire more on humans than on AI, and 96 are not distinguishable from chance. The weights were inherited from `avoid-ai-writing` and never fitted.

Counted directly from the built pack rather than from prose:

```sh
node -e "(async()=>{const a=await import('./packages/core/dist/patterns/en-signals-v2-data.js');\
const b=await import('./packages/core/dist/patterns/en-signals-v3-data.js');\
const c=await import('./packages/core/dist/patterns/en-signals-v4-data.js');\
console.log(Object.keys(a.ISSUE_WEIGHTS).length, Object.keys(b.V3_ISSUE_WEIGHTS).length, Object.keys(c.V4_ISSUE_WEIGHTS).length)})()"
# 51 55 7
```

**Closed, 29 August 2026:** a discrepancy recorded on 28 August — `WRITING_SIGNAL_RULES_RUN` reading `113` while the pack held 116 named rules — has been fixed at source. The constant now reads `116` and `tests/battery/rule-liveness-battery.test.mjs` fails the build if it ever disagrees with the built packs again.

**But 116 is the number of rules RUN, not the number that can fire.** See §3.4a: one of the 116 is recorded inactive and twenty more are dormant on every corpus measured. That inventory is part of this register because a count that includes a rule which cannot fire is a capability claim without a measurement.

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

Classification is **probability-consistent**: the published label is always the argmax of the published probabilities. The **evidence-based escalation policy** then applies raise-only candidates and records an explanatory `escalation` field naming the policy and reason, or null when the label is the unescalated argmax.

Both the label and the escalations are now confined to the editorial axis. The verdict layer translates the tier's historic three-way label into neutral editorial vocabulary (`none` / `some` / `many` suggestions) and its probabilities are published verbatim as a rules artefact, explicitly not as an AI probability (§4a).

Candidates in the shipped 2026.08.6 policy, in the order they are considered:

| Candidate | Fires when | Raises to |
|---|---|---|
| `citation_co_occurrence` | internal citation markup and a leaked citation token both appear | `ai_like` |
| `finding_breadth` | ≥6 findings across ≥4 categories (relaxed from ≥8/≥5 in 2026.08.6). Its user-facing message **was** falsified — it told users human evaluation controls peaked at 2 categories — and was **corrected at source on 29 August 2026**. It now states the measured reality: human writing reaches up to 9 categories and 135 of 4,144 representative human documents trip this same gate. See §3.6 | one band |
| `artefact_score` | artefact evidence with a score ≥10 | `mixed_signals` |
| `artefact_floor` | any core artefact category, or two support categories | `mixed_signals` |
| `furniture_gate` | the combined markdown-furniture gate fired | `mixed_signals` |
| `formatting_floor` | the `formatting` category (heavy bold styling) fired | `mixed_signals` |
| `formatting_cluster` | ≥3 distinct chat-export furniture categories | `mixed_signals` |

Rhythm categories collapse to one combined finding and one combined category before the breadth gate sees them, so four rhythm rules alone can never assemble breadth. The three markdown-furniture categories collapse the same way, for the same reason.

**Recorded defect, 28 August 2026:** `furniture_gate` is currently unreachable. The collapse that protects the breadth gate removes `markdown-furniture` from the category set before the policy runs, so the guard `cats.has("markdown-furniture")` never matches. Verified directly: a text carrying only a markdown heading reports `categoriesHit` including `markdown-furniture` with `escalation.applied === null`. It is now moot for detection purposes, since this tier no longer contributes to the AI verdict, and it is left recorded rather than silently removed.

Honesty guarantees in the result itself:

- A zero-finding pattern run carries a `{type: "scope_note", rules_run: …}` record with the note that this is not evidence of human authorship. The emitted count is `116`, matching the named-rule total (`WRITING_SIGNAL_RULES_RUN` in `packages/core/src/inspect.ts`).
- Unsupported methods state "Not yet available in this release."
- The provider is named "Opace writing-signal rules", never a detector.
- A clean result is presented as "No strong AI-style signals", not as a human verdict.

### 3.3 The v3 merge (55 categories, shipped)

A merge of two research streams (the AI-tells mega pack: 259 raw tells consolidated to 114, and the owner-docs catalogue mined from seven internal writing-guideline documents) contributes 52 categories in `packages/core/src/patterns/en-signals-v3{,-data}.ts`, and the 2026.08.6 provider-eval calibration adds 3 more (§3.5), giving 55. It adds:

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

Calibration is a standing gate: `node tests/battery/calibrate.mjs` scores the 40-text verified-human corpus (`tests/battery/human-corpus-v1.json`, documented in `tests/battery/HUMAN-CORPUS.md`) plus the four evaluation human controls, and currently reports "Calibration OK: 0/44 human samples fire any 2026.08.5 rule." (the gate's own printed version string trails the engine at 2026.08.5; the run is against the current pack). Rhythm rules are corroboration-only: alone they never escalate and never reach `ai_like` (enforced by `tests/battery/rhythm-battery.test.mjs`).

Every new capability lands with a battery extension (standing rule, recorded in the battery README).

### 3.4a Rule liveness — which of the 116 named rules can actually fire

Measured 29 August 2026 on **10,096 documents: 5,743 AI and 4,353 human**. AI side: the 4,016-article current-model corpus this project generated (21 models, published register) plus the 1,727 AI documents of the provider-eval set. Human side: `human-corpus-v2` (4,144 modern samples), the 40-text verified corpus and the 169 held-out provider-eval humans. Per-rule counts with per-corpus denominators are in [`../tests/battery/rule-liveness.json`](../tests/battery/rule-liveness.json); regenerate with `node tests/battery/rule-liveness.mjs`.

| | |
|---|---:|
| Named rules run | **116** |
| Fired on at least one AI document | **95** |
| Recorded **inactive** — cannot fire on realistic prose | **1** |
| Recorded **dormant** — probe-verified reachable, absent from these corpora | **20** |

**The one inactive rule is `tier3-phrase-cluster`.** Its gate needs three or more distinct phrases from a ten-entry list in one document. The measured maximum across all 10,096 documents is **one**. The list is inherited crypto/web3 whitepaper vocabulary: `decentralized compute`, `reward emissions`, `tokenized incentive structures` and `emerging sector/space/category/industry` match **no document in any corpus**, and the only two entries that match anything — `the integration of` (29 AI, 14 human) and `the intersection of` (9 AI, 12 human) — are register-neutral English that fires on humans at a comparable rate. It is not a live capability and is not counted as one. It is left in the pack, recorded here, rather than removed silently.

**The twenty dormant rules split two ways.** Nine are artefact-forensics provenance markers (leaked citation tokens, `utm_source=chatgpt.com` fingerprints, unfilled placeholders, Private Use Area and mathematical-alphanumeric leakage, reasoning-trace leaks, ISBN checksum failures) that fire on text pasted straight out of a chat interface; every corpus document is a finished sample, so their silence is expected rather than a defect. Eleven describe registers the corpora do not contain — rhetorical questions, question-answer cadence, fiction tells, encyclopaedic notability phrasing, stacked paragraph-opening transitions. Each is listed with its reason in [`../tests/battery/rule-liveness-inactive.json`](../tests/battery/rule-liveness-inactive.json), and each must still fire on its committed probe on every test run, which is what separates "absent from these corpora" from "cannot fire at all".

**Correction to an earlier finding.** `ACTION-LIST.md` §2 recorded `contrast-density`, `mic-drop-paragraph` and `punchline-fragment-density` as having *unreachable* thresholds because they never fired on the 1,896-sample provider-eval set. That set is chat-reply register; these three rules measure published-prose cadence. On the 4,016-article published-register corpus all three fire, and all three point the right way:

| rule | AI (of 5,743) | human (of 4,353) | likelihood ratio |
|---|---:|---:|---:|
| `contrast-density` | 15 (0.26%) | 0 (0.00%) | no human fires |
| `mic-drop-paragraph` | 13 (0.23%) | 2 (0.05%) | 4.9 |
| `punchline-fragment-density` | 5 (0.09%) | 1 (0.02%) | 3.8 |

They are live, correctly directed and very rare. **No threshold was changed.** `punchline-fragment-density` is the marginal one: its rate gate of 0.18 sits above the AI corpus 99.9th percentile, and a measured alternative of count ≥ 6, rate ≥ 0.10, paragraph-final ≥ 3 would take it to 36 AI documents against the same single human (0.90% against 0.02%, likelihood ratio 39) on the generated corpus. That is a product change to a shipped rule, so it is published here as a proposal with its evidence, not applied.

> **The count ≥ 6 / rate ≥ 0.10 / paragraph-final ≥ 3 proposal above was MEASURED
> AND REJECTED on 29 August 2026. It must not be applied.** Re-measured on the
> 5,558-document fresh long-form corpus it fires on **0 of 922 AI** and **0 of
> 4,636 human** documents — exactly as many as the shipped gate, which is none.
> The rate gate is the reason: published long-form prose does not reach it. The
> AI corpus maximum punchline rate is **0.136** and its 99th percentile is
> **0.084**, against the 0.10 the proposal asks for and the 0.18 the shipped gate
> asks for. Both gates sit above anything real text produces.
>
> The proposal's 36 AI documents were measured on the *generated* corpus, a
> different and easier population; on long-form prose the same gate reaches zero.
> This is why it reads as a pending improvement and is not one.
>
> The underlying measurement is not dead — punchline count has the best
> unconditional AUROC of any rhythm signal at **0.727**, and a rate gate of 0.06
> gives 14 AI against 1 human (likelihood ratio 70). But at every setting tried it
> fires on **none of the 45 AI documents the model misses** at the flag point, so
> it duplicates work the classifier already does rather than adding evidence. If
> it is ever loosened it should be loosened as an *editorial suggestion*, which is
> what this tier is for, and never as detection evidence.
>
> Source of record: [`measurements/AGGREGATION-AND-RHYTHM.md`](measurements/AGGREGATION-AND-RHYTHM.md) §3.5.

**The guard.** `tests/battery/rule-liveness-battery.test.mjs` fails the build if a rule in the built packs has no measured liveness figure, if a zero-firing rule is not recorded with a category and a reason, if a rule recorded inactive has started firing, if a rule recorded as merely dormant no longer fires on its probe, or if `WRITING_SIGNAL_RULES_RUN` disagrees with the packs. It was verified to fail in both directions before being committed.

### 3.5 The 2026.08.6 provider-eval calibration (3 categories plus policy changes)

Everything in this section was measured on `services/local-engine/research/provider-eval/eval-set.jsonl`: 1,896 samples, 1,727 AI across twelve provider-and-era slices and 169 held-out human documents (129 cal/test corpus humans plus all 40 fresh verified humans, including the 10 business-marketing samples). The full report is `PROVIDER-EVAL-2026-08.md`; §7 of this register publishes the results.

Three new rule categories, all in `en-signals-v3{,-data}.ts`:

| Category | Fires when | Measured on the eval corpus |
|---|---|---|
| `markdown-bold` | any literal `**bold**` run | 0/169 humans; 15.3–99.3% of AI per slice |
| `markdown-heading` | any markdown heading line | 0/169 humans; 15.3–68.0% of AI per slice |
| `markdown-furniture` | any bold run, **or** any heading line, **or** more than 10.75 bullet lines per 1,000 words | 0/169 humans; 74.7–99.3% of AI on every 2024-and-later slice |

These fire on presence, not density: bold and heading occurred in no held-out human document, so a single occurrence is the trigger. Only the combined gate uses a measured density threshold (`V6_FURNITURE_THRESHOLDS.bulletsPer1000 = 10.75`), taken from the report's R5.

All three are **corroboration weight by design** and carry a mandatory caveat in their own rule messages: an editor paste that strips or renders formatting removes the signal entirely, so their absence never counts toward a human reading. Their weights are deliberately small (3, 3 and 4) so furniture cannot inflate a score, and they collapse to one contribution for the breadth gate so they cannot assemble breadth alone.

Three policy changes:

- **Formatting escalation floor** (`formatting_floor`, report R1). The existing `formatting` category — heavy bold styling — fired on 0 of the 169 provider-eval humans and on 9.3–94.7% of AI per slice, yet the old three-category cluster rule converted almost none of it into a classification (5 fires in 1,727). One `formatting` finding now floors the classification at `mixed_signals`. **Historical:** this was the largest contributor to the superseded §7 detection figures, and it is the clearest example of the tier measuring chat-export formatting rather than writing.
- **Relaxed finding-breadth gate** (report R2). Lowered from ≥8 findings across ≥5 categories to ≥6 across ≥4. It measured 0 of 169 human fires on that corpus and its message claimed the human maximum was 2 findings. **Both claims are falsified** on the representative human corpus, and the message was corrected at source on 29 August 2026 (§3.6). The 169-document corpus it was calibrated on was 76% encyclopaedic and question-and-answer text.
- **Furniture gate floor** (report R5), which as recorded in §3.2 is present in the source but currently unreachable.

One bug fix: `inspectSignalsV2` threw `RangeError("split_surrogate")` on 2 of 1,896 samples, where a document-level finding anchored on a single UTF-16 code unit that was half of an emoji surrogate pair. Span boundaries now snap outward to whole code points. Re-running the full eval set against the current build throws zero times.

### 3.6 Escalation message honesty — three falsified claims, corrected 29 August 2026

Three escalation messages asserted things about human writing that were measured to be untrue.
All three derived from the same 169-document provider-eval human corpus, which was 76%
encyclopaedic and question-and-answer text and never described published prose. Every one was
re-measured against the representative 4,144-sample corpus
([`../tests/battery/human-corpus-v2.json`](../tests/battery/human-corpus-v2.json)) on the current
build, and corrected in `packages/core/src/patterns/en-signals-v2.ts`.

| Escalation | The claim it made | Measured on 4,144 representative humans |
|---|---|---|
| `finding_breadth` | "human evaluation controls peaked at 2" categories | Humans reach **9** categories (281 at 4, 120 at 5, 36 at 6, 16 at 7, 2 at 9). **135** documents trip this gate |
| `artefact_score` | a score above "every human evaluation control (maximum 4)" | Human maximum score is **11**; **231** humans (5.6%) score above 4, and **2** clear the ≥10 gate |
| `artefact_floor` | "artefact-class findings fired on no human control" | **4** of 4,144 humans fire it. Rare, but not absent |
| `formatting_cluster` | "fired on no human control" | **0** of 4,144. **This one held** and keeps its claim, now with its denominator |

The 135 + 4 split reproduces the 139 rules-layer false positives recorded in
[`../tests/battery/HUMAN-CORPUS-V2.md`](../tests/battery/HUMAN-CORPUS-V2.md) exactly, which is the
independent check that the re-measurement is sound.

The gates themselves are kept rather than removed. Since the whole 113-rule tier is editorial
suggestions only (§3) and contributes nothing to any AI verdict, their effect is confined to how
many writing suggestions a draft is shown. What could not stand was telling a user, in the
interface, something measured to be false.

Regression coverage: three tests in
[`../tests/core/unit/patterns-v3.test.mjs`](../tests/core/unit/patterns-v3.test.mjs) assert that no
escalation message repeats any of the falsified phrases, that `finding_breadth` carries the
measured ceiling and its denominator, and that **any** escalation message making a claim about
human writing carries either a denominator or an explicit claim boundary. That last one is the
general guard: a bare superlative about human writing is what produced all three defects. The tests
were verified to fail when the falsified string is reintroduced, rather than merely to pass.

## 4. Tier C — the trained local model (live)

Rule tiers cannot reliably catch clean, well-prompted AI prose, and the measurement in §3 shows
they cannot be trusted to try. **The Tier C model is the only check in the product that gives an
authorship reading.**

### 4.1 What ships

- **One** e5-small per-channel int8 ONNX classifier, 33.36M parameters, **34.3 MB**
  (`tier3-cycle2-e5small-int8-perchannel.onnx`, served to the browser from
  `public/models/local-signals-v1/`), run via ONNX Runtime Web. Flag threshold **0.984**.
  The consent step fetches about 34.5 MB in total (the model plus its vocabulary); the ONNX
  Runtime binary is fetched separately by the runtime.
- **Consent-gated**: nothing downloads until the user explicitly requests the model; it is
  fetched once, cached, and every run stays in the browser.
- **Measured-accuracy disclosure on every result**, with the browser-measured cycle-2 figures
  and the short-text floor. A no-signal result carries the scope note that the measured miss
  rate applies, so it is never a human verdict.
- It reads the whole document, scoring it in consecutive sections of about 340 words and
  reporting the strongest section, with every section listed.

### 4.2 What it measures, on data it had never seen

Cycle 2 replaced the shipped model on 28 August 2026. The model it replaced measured AUROC
**0.528–0.530** on published prose — barely distinguishable from a coin flip — and **0.276 on
business reports**, meaning it ranked human reports as more machine-like than machine ones. Its
`tier3-config.json` claimed 0.981. Median human business-marketing scored 0.852 against a median
AI article of 0.848, so for that genre the model was effectively inverted and 42.7% of genuine
human agency copy sat above the flag threshold. No threshold choice rescued that; only retraining
could.

**Final validation, on 5,558 documents the model had never seen** (922 AI from 13 current models;
4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE):

| | measured |
|---|---|
| AI detected | **90.3%** |
| human false positives | **1.34%** |
| operating point | **0.984**, fitted through the shipped browser runtime |

Per register, on the same fresh data:

| register | AI detected |
|---|---|
| company updates | 99.0% |
| white papers | 98.1% |
| research summaries | 94.9% |
| academic discussion | 93.8% |
| academic literature reviews | 92.5% |
| long-form journalism | 86.1% |
| academic essays | 84.1% |
| stories | 79.8% |

Held-out training evaluation (6,183 rows, 1,220 AI and 4,963 human, seen by neither model):
AUROC **0.530 → 0.9695**; detection at a 1% false-positive budget **6.7% → 76.9%**, at 2%
**9.1% → 81.2%**. Scores are bimodal with standard deviation 0.355 and only 2.2% of samples in
the 0.80–0.90 band, which matters because a confidence figure that cannot separate strong
evidence from weak evidence must not be shown to users.

**Why 0.984 and not 0.98.** onnxruntime-web and Python onnxruntime disagree by a median 0.113 on
this quantised model, because Python applies extended int8 fusions the web build does not. The
threshold was refitted through the runtime that actually ships. Publishing the Python figure
would have produced 3.56% real-world false positives while the interface claimed 1.2%. The
Python measurement on the same data is 90.6% (835/922) at 1.22%; both are recorded rather than
the flattering one being chosen. Every number in this section is browser-measured.

**Edited text, measured properly.** An AI draft that a person then tidies is detected 82.3% of
the time. An AI rewrite of a human original is 30–35%. Human text that a language model merely
polished is **deliberately not flagged**: in that band a median 93.5% of the words are the human
author's, and flagging it would mean accusing writers who use a model on their own prose. An
earlier disclosure line saying lightly-edited AI is "missed almost entirely" was wrong,
understated the tool, and was corrected live in commit `ce56ac54`. It must not be restored.

**Short text.** Detection is 67% at 200 words, 50% at 150 and 19% at 100. Short human text is
not falsely flagged: 0 of 400 samples at 60–200 words. Both facts are disclosed on the page.

**Window scoring does not transfer.** Cycle 3 gains from 120-word window aggregation because it
was trained to output an AI proportion. Applied to the deployed cycle-2 model, windowing
collapses detection from 86.4% to 1.8%, because short windows fall outside its training
distribution. This was verified directly rather than assumed.

Evidence: [`../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md),
[`../services/local-engine/research/longform-corpus/REPORT.md`](../services/local-engine/research/longform-corpus/REPORT.md),
[`../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md`](../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md).

### 4.3 Built, measured and deliberately not shipped

Two models were built, measured and rejected. Recording them is the point; burying them would
leave the register incomplete.

**Cycle 3**, aimed at lightly-edited AI. It improves AI-rewrites-of-human from 30% to 46–56% and
rank correlation with the true AI share from 0.58 to 0.74. It is not shipped because int8
quantisation costs it 5.2 points of recall so it cannot run in the browser at all, stories
regress 79.8% → 69.3%, journalism 89.1% → 81.0%, and paragraph-mixed documents regress badly.
The technique that worked — a saturating soft target with the AI word share clamped at 0.85 —
should be combined with a quantisation-friendly architecture in a future cycle.
([`../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md`](../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md))

**A GPT-2 surprisal-rhythm ensemble**, a 124M-parameter model with a 22-feature head over
divergence, spectral, UID and GLTR-rank features. Against the cycle-1 classifier it lifted the
evaluation from 2/23 to 6/23 clean-prose and 2/30 to 8/30 all-AI, but cost 2 of 116 human false
positives (1.73%) and raised the one-off consent download from 34.5 MB to 238.8 MB. It is gated
off in `src/lib/local-signals/model-store.ts` (`TIER2_ENABLED = false`), so no GPT-2 file is
fetched, hashed or cached. The stripped-prose evaluation later measured the same surprisal head
at AUROC 0.4962 on plain prose — chance — which retired the idea rather than deferred it.

### 4.4 Model shrink: the brief was stopped, and no size table exists

The brief to shrink the 34.3 MB detector was **stopped on the owner's instruction before any
candidate was built**. No distillation, int4 or vocabulary-pruning candidate exists, and the
size-against-accuracy table that would have justified one does not exist either. What was
measured, on the full fresh long-form corpus: int8 at 34.28 MB reaches AUROC 0.9915 and 88.29%
detection at a 1% false-positive budget; fp32 at 133.75 MB reaches 0.9916 and the same 88.29%.
Int8 costs five documents in the Python runtime. The real quantisation problem is the 0.113
browser-versus-Python divergence, not the file size.
([`../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md`](../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md))

### 4.5 Hosted inference — deployed 29 August 2026, not yet wired to the checker

A server-side route for the same classifier, so a visitor can be scored without the 34.5 MB
download. **Deployed and verified on 29 August 2026** at
`https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq`
serving 100% of traffic, Cloud Run europe-west1, scale to zero. The URL and revision change on
redeploy; `GET /v1/health` is the check to re-run rather than trusting either string.

`GET /v1/health` returned:

```json
{"ok":true,"model":"tier3-cycle2","precision":"fp32","model_build":"e313ab00de1fffd2",
 "threads":2,"segmentation_contract":"segments-v1"}
```

**Score parity is the hard requirement, not the throughput.** If the server read only a document's
opening while the browser read all of it, the same document would score differently depending on
which route ran — worse than either bug alone. `segments.py` is a rule-for-rule port of the
browser's `segments.ts`: words are `/\S+/` matches, 340 words per segment, a trailing chunk under
120 words is split down the middle rather than merged (a merge would produce a 459-word segment
that the tokeniser would truncate, reintroducing the exact defect segmentation removes), and the
document verdict is the **maximum** segment score, never the mean. Averaging was measured to dilute
detection from 93.3% to 57.8% on the same documents, because one AI section inside an otherwise
human draft is washed out by the human sections around it.

Verified live against the golden table: a 1,200-word document returned `segment_count: 4` with word
spans 0-340, 340-680, 680-1020 and 1020-1200, `aggregation: "max"`, `truncated: false`,
`inferences: 4`, `processed: "server"`, `retained: "nothing"`. The golden case is
`1200 -> [340, 340, 340, 180]`. They match.

**The spend ceiling is denominated in inferences, not requests**, because a request is not a fixed
unit of cost: one 4,000-word document is twelve forward passes, so a cap of 5,000 requests would
authorise up to 60,000 of them. `GET /v1/status` reports a `service_daily_cap` of 12,000 inferences,
per-connection ceilings of 5/30/100 requests and 20/150/500 inferences per minute/hour/day,
`max_words` 4,000 and `max_inferences_per_request` 12. Verified: one four-segment request moved
`daily_allowance_remaining` from 12,000 to 11,996.

Abuse gates, all exercised against the running service: an unlisted origin is refused HTTP 403
`origin_not_allowed`; a scripted client `automation_detected`; a browser user-agent without a token
`token_required`. A 14-bit proof-of-work challenge from `/v1/challenge`, exchanged at `/v1/token`,
yields a token accepted in the **`x-opace-token`** header — **not `Authorization: Bearer`**, which
is ignored.

**The spend ceiling is a kill switch, not a setting.** No combination of Cloud Run settings
delivers the owner's £50 ceiling: `--max-instances` bounds concurrent CPU and memory, but nothing
in Cloud Run caps the request count, and requests are the largest line. A month-long flood pinning
two instances was once quoted as roughly £519 even with every request rejected. That figure is wrong. **Superseded 29 August 2026.** `--max-instances` DOES bound every billed line: requests beyond `instances x concurrency` are refused at Cloud Run's front end without starting a container. The compute floor is about **£51/month at maxScale 1**, which is what now runs. The old £519 figure rested on an unmeasured request rate, omitted egress, and converted from USD on a GBP-denominated account. A **£50 spend cap does exist** and is Configured — but it is invisible to the Budgets API, so verify it in the Cloud Billing console, never by API. It is in Preview, nobody has seen it fire, and it pauses the service until a human lifts it (up to an hour to resume, 5xx meanwhile), so it is a harder stop than the kill switch but a slower recovery.
Built and verified 29 August 2026: Pub/Sub topic `detector-killswitch`; Cloud Function
`detector-killswitch` (gen2, python312, europe-west1) ACTIVE, revoking the `allUsers` invoker
binding and closing ingress on any message while deleting nothing; a fast Cloud Monitoring trigger
at 10 requests/second sustained 5 minutes against a normal peak of a couple a minute; and the £10
billing budget as a slow backstop at 20/50/90/100% of actual and 90% of forecast.

**It failed twice before it worked.** A POST to `:getIamPolicy` where Cloud Run v2 wants a GET,
which failed *silently* with the service serving for the full 200 seconds under observation; then
a `403` on `:setIamPolicy` because `roles/editor` does not include `run.services.setIamPolicy`,
fixed with `roles/run.admin` scoped to the service. The third attempt took health to 404 within 10
seconds. A manual round trip (200 → `disable-service.sh` → 404 → `enable-service.sh` → 200) also
passed. Two independent faults, neither visible without firing it — which is the argument for
firing it after **every** redeploy and IAM change.

Every refusal carries `processed: "none"`, `retained: "nothing"`, a plain-English `message` written
for a visitor to read, and a `fallback.action` of `offer_local_model`. The contract is that the tool
never dead-ends: every reason the server can refuse has a working alternative on the same page.

**Open and blocking, recorded because this capability must not be claimed as finished:**

- The checker is **not** pointed at this route.
- The site-wide "your text never leaves your browser" copy HAS been changed, because it stopped being accurate
  today only because the hosted route is not wired in. Switching the checker over while that claim
  stands would be a false statement to users.
- **Numerical parity between the runtimes is not established.** The server runs fp32 and the browser
  runs int8, and the two are known to disagree by a median 0.113 on this model (§4.2). Structural
  segmentation parity is proven; score parity is not.
- The DPIA and the published lawful-basis notice (legitimate interests, not consent) are
  outstanding.
- **Zero request-body logging is audited on the scoring path only.** Measured 29 August 2026: a
  unique high-entropy marker embedded in a document body was submitted to `/v1/check` on the live
  service through the real gated path, **scored normally** (`probability_ai: 0.0552`,
  `retained: "nothing"`) rather than being refused at a gate — which is what makes the probe valid
  — and then did not appear in **any** log entry in the project across `textPayload`,
  `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`. The whole service produced only 4 log
  entries in that window. This narrows the risk rather than closing it: refusal paths (413, 429)
  and error paths run different code and have not been probed. The probe must be re-run with a
  fresh marker after any redeploy, because the request-log exclusion is a deploy-time flag that a
  future deploy could drop with nothing failing. Method and commands:
  [`reference-server/SECURITY.md`](../services/local-engine/research/model-shrink/reference-server/SECURITY.md) §9.1.

Contract, limits and threat model: [`../services/local-engine/research/model-shrink/reference-server/README.md`](../services/local-engine/research/model-shrink/reference-server/README.md)
and [`SECURITY.md`](../services/local-engine/research/model-shrink/reference-server/SECURITY.md).

## 4a. The combined verdict — three axes, never merged

`packages/core/src/verdict/combine.ts`, version `combined:2026.08.8`, publishes three
independent readings and never reduces them to one:

| Axis | Field | Values | Who may set it |
|---|---|---|---|
| A — AI probability | `ai_probability` | `ai_like` / `uncertain` / `human_like` / `not_assessed` | **Only** a trained-model reading. No character finding, no writing rule and no watermark hit can write to it. With no model reading supplied it is `not_assessed`, and `not_assessed` is an honest answer, not a default of "human" |
| B — text integrity and provenance | `text_integrity` | `clean` / `attention` / `manipulated` | The deterministic character forensics: invisible carriers, homoglyph substitution, private-use clusters and a genuinely detected watermark |
| C — editorial suggestions | `editorial` | `none` / `some` / `many` | The 113 named writing rules |

**Why they are separate.** A hidden zero-width character proves text **manipulation**, not AI
**origin**. It says a tool wrote into the bytes after somebody typed them, and says nothing about
who or what composed the sentences. A CMS paste handler, a translation memory, a DTP export, a
plagiarism-evasion service, a mail client or a person editing a wholly human document can all put
one there. Until 2026.08.8 the module could escalate a single published classification to
`ai_like` on a carrier payload, a homoglyph or a watermark hit; that is a category error and the
independent audit was right to call it one.

Four contracts bind the module, and the first is enforced at runtime rather than documented:

1. **Axis independence.** `assertAxisIndependence` throws rather than publish a collapsed verdict
   if an AI reading appears without a model, if the integrity status rises without character or
   watermark evidence, or if any integrity or editorial string uses the vocabulary of authorship.
2. **Evidence quality, not enthusiasm.** Only characters with near-zero innocent explanation may
   raise the integrity status. Typographic spaces, bidirectional controls, script format marks,
   emoji joiners, ideographic variation selectors and edge homoglyphs in multilingual text are
   graded supporting or excluded and can never raise anything on their own.
3. **Raise-only within an axis.** A finding raises its own axis and names itself; nothing lowers
   an axis silently.
4. **The honesty contract.** Every path contributes its own limitation line, and no path presents
   a finding as proof of authorship.

Protected spans are deliberately not an input to any axis: they are facts the editor must
preserve, not evidence about origin.

Watermark findings sit on axis B rather than axis A. A watermark signal is provenance evidence
that a marked generator produced these tokens at some point; it does not survive an unknown
amount of human rewriting and it is not an AI probability.

Regression coverage: `tests/core/unit/combined-verdict.test.mjs` (32 tests, including six
explicit AUDIT cases asserting that no carrier, payload, homoglyph, private-use cluster or
watermark hit ever produces an AI reading) and `tests/battery/combined-verdict-battery.test.mjs`
(every carrier in the engine's own table and every confusable, pushed through the layer, plus
zero-human-false-positive gates on the 40-text corpus and the repository fixtures).

## 4b. Signal science — what actually separates machine from human prose

An independent study measured 122 interpretable features over a 25,723-document corpus
(10,890 machine / 14,833 human, 6,679 duplicates removed), then ran a causal ablation on the
deployed artefact. It settles several things this project had previously assumed.

- **Repetition is the dominant signal, and machine prose under-repeats.** Adjacent-sentence
  content-word overlap reaches AUROC 0.912 and MATTR 0.911; 112 of the 122 features differ
  significantly across 5,935 matched pairs. The median machine document shares 2.1% of its
  content words between neighbouring sentences; the median human document shares 6.3%.
- **Sentence-length burstiness is worthless: AUROC 0.521**, with a negligible effect size
  pointing the wrong way. It is the most widely repeated claim about spotting AI writing and it
  does not survive contact with a modern corpus.
- **Cliché "AI vocabulary" is weak: AUROC 0.578.** That is consistent with this project's own
  earlier finding that those rules fire on 40% of genuine human marketing copy.
- **The model reads repetition causally.** On 400 machine and 400 human long-form documents at
  the shipped 0.984 threshold, against a 90.0% baseline: replacing a quarter of content words
  with the document's own most frequent content words — changing nothing but how much the text
  repeats itself — drops detection to **57.0%, a fall of 33.0 points**. Deleting every word and
  phrase on the AI-vocabulary list costs **0.8 points** (90.0% → 89.2%). A detector that could be
  defeated by find-and-replace is not this one.
- **Transparency has a measured price.** A 24-feature readable scorecard reaches **72.1%**
  detection at a 1% false-positive budget against the neural model's **89.8%** on the same
  held-out data (793 machine / 4,179 human, unseen by both): **17.7 percentage points**.
  Forbidding formatting features *raised* the scorecard from 62.5% to 72.1%, which is the same
  lesson §3 records. 62% of the neural model's behaviour is reconstructible from named features;
  only 19% of its within-class confidence is.
- **Perplexity is inverted on modern text.** Machine documents have *higher* GPT-2
  log-perplexity than human ones (median 3.68 against 3.31).

Full study: [`../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md`](../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md).

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

### 6.1 The live known-key scan in the checker

Since the 2026.08 release the same mathematics also runs **inside the checker**, as a named method `watermark.known_keys`, on every assessment. It replaces the former static "Anthropic watermark / Unsupported" stub row, which asserted a boundary without running anything.

- `src/lib/watermark-scan/index.ts` tokenises the pasted text and calls `scoreWithKey` for all three public demo keys, reporting a per-key table of mean g, p-value and scored positions, plus the engine version.
- Verdicts are `signal_found` (p < 0.001 and mean g > 0.5 under at least one key), `no_signal`, or `too_short` (fewer than 40 scoreable n-gram positions, in which case no verdict is rendered at all).
- The heavy chunk (about 1.7 MB, detection mathematics plus GPT-2 vocabulary) is dynamically imported only when the check runs, and it is the same chunk the Watermark Readiness Lab lazy-loads, so a visitor who has used either tool pays the download once.
- A `no_signal` result is reported as `inconclusive`, never as a pass, and its wording states that provider keys are private so an absent signal can neither clear nor accuse a text.
- The Anthropic boundary is now a separate, honest line rather than a fake check: "Anthropic production watermark: no public verifier exists; not assessed."

Claim boundary, mandatory on every surface: the lab and the scan use public Opace demo keys. They cannot say anything about Gemini or Claude output without the providers' private keys, and a score near 0.5 never proves text is human-written.

## 7. Measured detection results

### 7.1 Current — the cycle-2 model on fresh data

The figures the product publishes are in §4.2, measured through the shipped browser runtime on
5,558 long-form documents the model had never seen: **90.3% of AI writing detected, 1.34% of
human writing wrongly flagged, at threshold 0.984.** Nothing else in the product produces an AI
figure, and nothing else may be quoted as one.

### 7.2 The rules tier, measured against the model on the same fresh corpus

| tier | AI detected | human false positives |
|---|---|---|
| 113 writing rules | 45.1% | **24.8%** |
| cycle-2 model | **90.3%** | **1.34%** |

The rules flag one human document in four. They are worse than the model on both axes at once,
which is why they were demoted to editorial suggestions on 28 August 2026 (§3).

### 7.3 Historical — provider-scale evaluation, 28 August 2026 (superseded)

**Kept for the record and superseded as an accuracy authority.** The 169-document human side of
this corpus was 76% encyclopaedic and question-and-answer text, so its "zero human false
positives" describes that corpus and not published prose. Re-measured against a representative
human corpus, the same tier flags 24.8% of humans. **The 66.7% figure below must not be published
in any listing, README or marketing copy.** The per-provider and per-era *shape* remains useful,
and that is the only reason this section survives.

Corpus: 1,896 samples. 1,727 AI across twelve provider-and-era slices (LMSYS arena-human-preference-140k, CC BY 4.0, plus HC3 for the 2022-23 slice) and 169 held-out human documents, none of which were used to train or tune anything in the rules tier. Re-aggregated for this register by re-scoring the whole set against the current `packages/core/dist` build; the numbers below match `provider-eval/rules-scores.jsonl` exactly.

**Historical figure, superseded:** at zero false positives on that unrepresentative 169-document human side, 1,152 of 1,727 AI samples reached `mixed_signals` or above, 66.7%.

| Provider and era | Detected | Rate |
|---|---|---|
| deepseek 2025-26 | 143/150 | 95.3% |
| mistral 2025-26 | 139/150 | 92.7% |
| google 2025-26 | 133/150 | 88.7% |
| meta 2025-26 | 131/150 | 87.3% |
| google 2024-25 | 124/150 | 82.7% |
| openai 2024-25 | 62/77 | 80.5% |
| meta 2024-25 | 107/150 | 71.3% |
| openai 2025-26 | 107/150 | 71.3% |
| grok 2025-26 | 102/150 | 68.0% |
| anthropic 2025-26 | 80/150 | 53.3% |
| anthropic 2024-25 | 24/150 | 16.0% |
| openai 2022-23 | 0/150 | 0.0% |
| **all AI** | **1,152/1,727** | **66.7%** |
| **all humans** | **0/169** | **0.0%** |

Three caveats travel with those numbers everywhere they are published. None is optional.

1. **A large share of current-era detection rides chat-export formatting.** Of the 1,152 detections, 1,142 came from an escalation and 10 from the base argmax alone. The escalation counts, all on the AI side, are `formatting_floor` 588, `finding_breadth` 540, `artefact_score` 9, `artefact_floor` 5, and `furniture_gate` 0 for the reason given in §3.2. Re-scoring the same corpus with markdown furniture removed, as an editor paste would remove it, measures the fall directly:

   | Paste condition | AI detected | Human false positives |
   |---|---|---|
   | As generated (chat export intact) | 1,152/1,727 (66.7%) | 0/169 |
   | Bold and heading markers stripped, list structure kept | 198/1,727 (11.5%) | 0/169 |
   | Bold, heading and bullet markers all stripped | 113/1,727 (6.5%) | 0/169 |

   Per-slice detection on stripped text is 0.0–22.1%. The part of the gain that survives a format-stripping paste is the relaxed finding-breadth gate, which does not depend on markdown; the furniture rules and the formatting floor do. This is why the furniture rules are corroboration weight, why their messages say so, and why their absence never counts toward a human reading.

2. **The 0.0% on the 2022-23 slice is a register effect, not a model-age effect.** That slice is HC3 conversational question-and-answer text, which measurably carries no style tells this pack looks for: its one strong signature is `sentence-flatline` at 31.3% against 2.4% of humans. Older models are not harder; short conversational answers are.

3. **These are rules-tier figures on a public arena and HC3 corpus.** They are not a certified benchmark and not comparable to a vendor's published accuracy. The 0/169 result was read at the time as bounding the human false-positive rate at roughly 2.2% by the rule of three. That bound was wrong in practice, not in arithmetic: the corpus it was computed on did not represent published prose, and the true rate on representative long-form human writing is 24.8%. It is the clearest example in this project of a confidence interval computed over the wrong population.

Detail, per-sample scores and the hypothesis tests behind the calibration are in [`../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md`](../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md).

## 8. Test evidence (verbatim totals, re-run 29 August 2026)

| Suite | Result |
|---|---|
| Core unit, imports and performance (`npm --prefix packages/core test`) | **123 pass / 0 fail** |
| Root suite (`npm test`) | typecheck clean; contracts "13 schemas; valid/invalid fixtures and OpenAPI passed"; Python "13 schemas, all fixtures, and RFC 8785 vectors passed"; PHP "22 contract fixtures, 3 hash vectors and 45 assertions passed" |
| G2 core gate | 24/24 |
| Battery (`npm run test:battery`) | **110 pass / 0 fail** across carriers, slop, uniformity, rhythm, protected, combined-verdict and cross-surface suites |
| Rhythm calibration (`node tests/battery/calibrate.mjs`) | "Calibration OK: 0/44 human samples fire any 2026.08.5 rule." |
| Watermark lab (`npm --prefix packages/watermark-lab test`) | **30 pass / 0 fail** |
| Browser suites at release (build log §5–5b, Playwright) | checker UI 22/22; lab UI 24/24; provenance 18/18 |
| Performance | 50,000 characters inspected in roughly 27–31 ms (gates at 200/300 ms) |
| Cross-surface parity | website's installed engine proven byte-identical to source on findings, methods, signals and versions |
| Live verification | scripted Chrome against production, 6/6 |

**Two open items from the 28 August edition are now closed.** The two stale version assertions in
`patterns-v3.test.mjs` and `patterns-v4.test.mjs`, which expected `en-signals:2026.08.5` after the
2026.08.6 bump, are resolved and the core suite is clean. The four cross-surface failures are also
resolved; they were real, and they were the honest kind. The engine built here carried
`combined_verdict` and 116 rules while the copy installed in the website's `node_modules` carried
neither, because the website had not been re-vendored. That is precisely the divergence the
cross-surface battery exists to catch, and it caught it.

**Live production test through the real page**, model enabled (recorded in `../../OBJECTIVE.md`):

| content | score | outcome |
|---|---|---|
| ChatGPT article | 98.9% | very likely AI |
| Gemini 3.5-Flash article | 98.7% | very likely AI |
| Claude Sonnet 5 article | 98.4% | flagged, sitting on the threshold |
| human office-memo control | 64.9% | likely human, not flagged |

All three articles scored 6/100 and read as "No strong AI-style signals" before cycle 2.

Every v0.1-review fixture-B carrier is still detected, and the human control still produces 0
findings. Full methodology is in [TEST-EVIDENCE.md](TEST-EVIDENCE.md) and the battery README;
every evidence artefact is indexed with its path in [EVIDENCE-INDEX.md](EVIDENCE-INDEX.md).

Release tooling: the permanent `npm run pack:vendor` script (`scripts/pack-vendor.mjs`) packs the
engine tarballs for site vendoring with internal `file:` dependencies rewritten to version specs,
and refuses to emit a tarball that still carries one. It closes the deploy-failure class recorded
in the build log, where a hand-vendored tarball with a `file:` spec produced a broken lockfile and
two failed Netlify deploys.

## 9. Status vocabulary

Every method reports exactly one of: `pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`. Unsupported, unrun and failed checks are never visually collapsed into a pass, and stubs render as "coming, not yet run", never as live-looking checks.

## 10. Known limits (recorded honestly)

- **The writing rules are editorial feedback, not detection.** 45.1% detection at a 24.8% human
  false-positive rate on fresh long-form documents. They are never counted toward the AI reading.
- **Detection falls away on short text.** 67% at 200 words, 50% at 150, 19% at 100. Below 200
  words the reading is not reliable and the page says so. Short human text is not falsely
  flagged: 0 of 400 samples at 60–200 words.
- **Human text that a language model polished is deliberately not flagged.** A median 93.5% of
  the words in that band are the human author's. Not flagging it is correct behaviour.
- **AI rewrites of a human original are the weakest real case**, at 30–35%. Paragraph-mixed
  documents remain the weakest case for every model tried, including the rejected cycle 3.
- **The business-report register is data-starved.** 72 held-out rows and AUROC 0.69, against
  0.93–0.99 elsewhere. It clears the floor and must not be quoted as settled.
- **Human fiction and stories carry the highest false-positive rate of any register: 33 of 260,
  12.69%**, measured on the fresh long-form corpus through the fp32 reference route at threshold
  0.980 under `segments-v2` (30 of 260, 11.54%, under `segments-v1`). Two things belong with it.
  The flagged samples come disproportionately from the corpus pool its own author flagged as least
  trustworthy, so some of this may be data quality; that is unproven either way. And the model was
  **deliberately never trained on human fiction** — the corpus holds 300 AI fiction samples and no
  matched human set, and training on unmatched AI fiction would have taught it that fiction equals
  AI. The browser route's own per-register figure at 0.984 has not been measured.
- **Academic writing is the register to watch, but is no longer the worst.** The earlier claim
  that it carried the highest human false-positive rate of any genre was measured at the 0.9110
  threshold, which is not what ships, and is **superseded**. Current per-register human false
  positives on the fresh corpus at 0.980 under `segments-v2`: academic discussion 16/420 (3.81%,
  up from 2.86% with the segmentation change and the register to watch), academic conclusions
  10/360 (2.78%), academic introductions 8/420 (1.90%), academic literature reviews 0/225,
  student essays 0/420. On the detection side academic essays are the hardest AI long-form
  register at 122/132 (92.42%).
- **Band boundaries do not align with the flag point.** A score of exactly 98.4% displays
  "Uncertain" while being flagged. Cosmetic, confusing, and open.
- **Two of this tool's own features pull against each other, and one had to give way.** The
  provenance check reads content credentials; the hidden-character fix removes the characters a
  text credential is carried in. C2PA 2.4 §A.8 uses the variation selectors deliberately, because
  they do not render, which is the same property that makes them worth flagging. That is not a
  fault in either check — it is a design tension that nobody had noticed, and it was found by
  reading the specification alongside the carrier table rather than by any test failing. The
  product's rule is to refuse rather than round over when it cannot be certain, so the fix applies
  it: the characters stay flagged and counted, and the automatic edit stops at the credential's
  edge. The cost is that a genuinely hostile carrier hidden inside a wrapper is not cleaned
  automatically either; it is still reported, and removing it is a deliberate act.
- **Hidden characters are not an AI signal.** The integrity axis reports that something wrote
  into the text. It says nothing about who or what composed it, and §4a enforces that at runtime.
- **The furniture escalation floor does not fire** (§3.2). Moot for detection now, recorded
  rather than removed.
- **A carrier inserted mid-entity can defeat name and organisation extraction** (regex-driven
  kinds such as URLs still match through).
- **The demo watermark keys are public.** The lab demonstrates the published science; it is not a
  production detector for any provider, and no public verifier exists for Anthropic production
  keys.
- **Plagiarism checking and internet-scale source matching are out of scope** and stated as such.
- **The published browser figures predate segmentation.** 90.3% detection at 1.34% false positives
  was measured through the shipped browser runtime before segmentation existed — one truncated
  pass per document. On the same 5,558 documents the segmented fp32 reference route reads 96.9% at
  2.09% (threshold 0.980) and 95.1% at 1.21% (0.984). The browser runtime's own segmented curve
  over the full corpus has not been measured; about five hours of compute that has not been spent.
  Until it is, the browser figures carry a `segments-v1` pipeline and should be read as a floor.
- **The short-text figures have no recorded denominator.** 67% at 200 words, 50% at 150 and 19% at
  100 are the figures the live page discloses, but no source report in this repository records how
  many samples produced them. They need re-measuring with one.
- **The base checkpoint's licence** was not recorded in this repository until 29 August 2026, when
  `intfloat/e5-small` was confirmed MIT from its model card. The canonical URL and an immutable
  revision are recorded in `THIRD_PARTY_NOTICES.md`.

## 11. Attribution

| Source | Licence | Used for |
|---|---|---|
| avoid-ai-writing (Conor Bronsdon and contributors) | MIT | Writing-pattern rules, stylometric methods, weights and classifier logic, adapted to TypeScript; confusable table data |
| watermarks-remover (Guillaume Meyer) | MIT | Carrier and confusable table data, adapted; no upstream code distributed |
| google-deepmind/synthid-text | Apache-2.0 | Detection mathematics ported in `@opace/watermark-lab` |
| OpenAI GPT-2 reference encoder and vocabulary | MIT | Tokeniser algorithm and assets |
| Unicode Consortium data | Unicode licence (data) | Category-derived carrier inventory |
| Pangram Labs technical report (arXiv:2402.14873) | published research | Hard-negative-mining training method, applied in the shipped Tier C classifier |
| intfloat/e5-small | **MIT (confirmed 29 August 2026)** | Base checkpoint fine-tuned into the shipped cycle-2 detector; confirmed 29 August 2026: MIT |
| onnxruntime-web | MIT | Running the shipped classifier in the browser |
| @contentauth/c2pa-web (Content Authenticity Initiative) | MIT | Provenance adapter, live in the browser checker |
| antislop-sampler (Sam Paech) | Apache-2.0 | Fiction phrase and over-represented name data behind the `fiction-slop-phrase` and `fiction-promptonym` rules |
| slop-forensics (Sam Paech) | MIT | Per-model observations corroborating the fiction-lane rules |
| SLOP_Detector (SicariusSicariiStuff) | Apache-2.0 | The graded penalty-class weighting approach behind the tier-B corroboration weighting |
| slop-gate (hwajongpark) | MIT | Promotional-register and buzz-phrase pattern data |
| anti-ai-writing (avectats7) | MIT | Buzz-phrase and weak-verb observation data |
| anti-slop (kjmagnan1s) | MIT | Faux-insight phrase data, and the protect-list and context-profile design |
| claude-slop-detector (aplaceforallmystuff) | MIT | Staccato-fragment and tripled-negation structural observations |
| Wikipedia, *Signs of AI writing* | CC BY-SA 4.0 | Editorial guidance independently re-expressed, no verbatim excerpts, credited as the licence requires |
| Project Gutenberg public-domain texts (all pre-1929) | public domain | The embedded human-prose reference corpus for the conditional-compression prior and lexical-register profile |
| GRADTEX, HAT-Bench, PERSUADE 2.0, C4, MAGA, aita-human-vs-ai | CC BY 4.0, Apache-2.0, CC BY 4.0 / MIT mirror, ODC-BY 1.0, MIT, Apache-2.0 | The 15,514-document cycle-2 training corpus. Not redistributed, but the model trained on them is |
| Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR | open access, OGL 3.0, US public domain, CC BY 3.0, CC BY-ND 4.0, US public domain | The 4,636 held-out human long-form documents behind every accuracy figure here |
| GLTR (Gehrmann, Strobelt & Rush) | no licence recorded in this project — an open gap | Rank-bucket idea and per-token explanation overlay, reimplemented from the paper as a research baseline; not shipped |
| DivEye | CC BY-NC, so the code was not consulted | The surprisal-diversity claim, reimplemented from the paper alone and confirmed on 2026 models; not shipped |
| fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA, MarkLLM, HumanizerBench | various | **Cloned and read during research only.** Not used, not extended, nothing derived. Fast-DetectGPT's published curvature statistic was reimplemented as one of eleven evaluation baselines and measured at AUROC 0.545 with a GPT-2 small observer; Binoculars was not implemented at all |

Full dependency records: [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), [../MODEL_AND_DATA_PROVENANCE.md](../MODEL_AND_DATA_PROVENANCE.md), [legal/DEPENDENCY-LEDGER.md](legal/DEPENDENCY-LEDGER.md).

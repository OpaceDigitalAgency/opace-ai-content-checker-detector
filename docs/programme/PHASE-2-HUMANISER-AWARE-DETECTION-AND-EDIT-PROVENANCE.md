# Phase 2: Humaniser-aware detection and edit provenance

**Status:** execution brief ready; research/model work not started by this brief  
**Written:** 30 August 2026  
**Owner:** David Bryan / Opace  
**Canonical project root:** `ai-watermark-and-content-authenticity/`  
**Implementation repository:** `ai-watermark-and-content-authenticity/implementation/`  
**Authority boundary:** research planning and documentation only. This brief does not authorise paid accounts, API spend, model training spend, threshold changes, deployment, package publication or external submissions.

## 1. Decision

This is a distinct **Phase 2 workstream**, not a Phase 1 correction.

The shipped detector makes a binary authorship assessment. The owner now wants it to distinguish likely source and edit history, including AI-human collaboration and commercial humanisers. Delivering that honestly requires a new labelled transformation corpus, new model outputs, calibration, quality assessment and product vocabulary. It cannot be achieved safely by lowering the existing threshold, promoting editorial rules into the verdict, or treating typos as proof.

The workstream name is:

> **Humaniser-aware detection and edit provenance**

The file name deliberately starts with `PHASE-2` so it is discoverable beside the programme's broader Phase 2 plan, while the rest of the name says exactly what this workstream owns.

## 2. How a new agent must use this brief

Start here with no assumption that chat history is available. Read the linked sources in §16 before editing or training anything. Then:

1. Verify the canonical checkout, normalised `origin`, current branch, `HEAD`, sibling checkouts and working tree.
2. Read `PROJECT.md`, `STATUS.md`, the broad `PHASE-2-NEXT-STEPS.md`, and every current status/evidence document they identify.
3. Recheck the live inference `/v1/health` and `/v1/status`; dated build and revision observations are not durable facts.
4. Reproduce the frozen HumanizerBench/Opace result using the runner in §15 before changing a corpus, model, tokenizer, thresholds or segmentation.
5. Reconcile existing user/other-agent changes. The implementation repository acquired active uncommitted work while this brief was being written. None of it was created or altered by this humaniser-brief task. Preserve it and establish its owner/status before using, moving, committing or modifying it.
6. Work on a named branch from the verified default branch only after the working-tree ownership question is resolved.
7. Update this brief, the living humaniser study and the dated evidence together as results land.

### Concurrent working-tree snapshot at handoff

Observed after the final documentation/link check on 30 August 2026:

```text
 M README.md
 M docs/EVIDENCE-INDEX.md
 M docs/programme/HANDOVER.md
 M packages/core/src/patterns/en-signals-v2.ts
 M packages/core/src/patterns/en-signals-v3.ts
 M tests/battery/rule-liveness.json
 M tests/core/unit/span-extent.test.mjs
 M wordpress/opace-ai-content-integrity/includes/Analysis/DeterministicAnalyser.php
 M wordpress/opace-ai-content-integrity/includes/Analysis/PatternAnalyser.php
?? docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md
?? services/local-engine/research/cycle4-fiction/
```

The `cycle4-fiction/` folder contained `build_topics.py`, `generate_registers.py`, `generation-errors.jsonl`, `pilot.jsonl`, `spend-log.jsonl` and `topics.json` at inspection time, with no local Markdown status file. The snapshot may advance after this brief. Re-run `git status`, find the owning task/status record and reconcile rather than assuming the files are abandoned. Do not stage or commit them as part of HAP-00.

## 3. Owner objective and observed commercial reality

The owner wants more than `likely human` versus `likely AI`. The desired result set is:

- likely human;
- likely AI;
- likely AI but amended by a human;
- likely human but amended by AI;
- likely humanised using deterministic rules;
- likely humanised using a rewrite tool;
- mixed human and AI passages;
- uncertain when the evidence cannot distinguish the process.

The owner's previous hands-on JustDone experience is important product evidence:

- JustDone repeatedly passed Copyleaks and Originality in the versions/settings tested;
- some rewritten content was acceptable, but small parts made no sense;
- it introduced errors and inconsistencies a professional writer would not publish;
- AI generation took about two minutes and JustDone about another two minutes;
- repairing the humanised article took roughly 30–60 minutes;
- writing the article professionally from scratch would have taken about 1–3 hours;
- therefore it still saved time, but produced a poorer and visibly altered draft.

This evidence is an owner observation, not a controlled benchmark. It establishes a commercially useful distinction that ordinary detector leaderboards miss:

> Passing a detector, preserving meaning and producing publication-quality work are three separate outcomes.

Phase 2 must report authorship/provenance and editorial damage independently.

## 4. Current Phase 1 baseline that must not be silently replaced

Live state rechecked on 30 August 2026:

- model: `tier3-cycle2`;
- precision/runtime: fp32 server;
- model build: `e313ab00de1fffd2`;
- segmentation contract: `segments-v3`;
- primary threshold: `0.9855`;
- secondary threshold: `0.9763`;
- verdict rule: strongest segment clears the primary threshold, or the second-strongest segment clears the secondary threshold.

Current measured long-form baseline:

- fp32 server: 883/922 AI detected = 95.8%; 45/4,636 human false positives = 0.97%;
- browser/int8: 889/922 AI detected = 96.4%; 90/4,636 human false positives = 1.94%;
- the figures use the 5,558-document long-form corpus and are runtime-specific;
- text below 200 words is weaker evidence; below 100 words is not meaningful for current public interpretation;
- current server minimum is 60 words, which is an acceptance boundary, not a claim that 60 words is reliable.

The current product has three deliberately independent axes:

1. **AI probability:** set only by the trained model.
2. **Text integrity/provenance evidence:** invisible carriers, homoglyphs, private-use clusters, known-key watermark signals and supported C2PA evidence.
3. **Editorial feedback:** 113 writing/style rules, advisory only.

The rules were demoted because they detected 45.1% of AI documents while falsely flagging 24.8% of human documents on 5,558 fresh documents. They must not be promoted back into the authorship verdict.

Nothing in Phase 2 may overwrite the cycle-2 baseline. A candidate is a separate artefact until every gate in this brief passes and the owner explicitly approves release.

## 5. Exact humaniser challenge result against the current detector

The August 2026 HumanizerBench snapshot contains:

- 33 AI source texts;
- 11 each from Claude Sonnet 5, Gemini 3.5 Flash and GPT-5.5;
- 396 outputs from 12 commercial humanisers/editors;
- public inputs/outputs and score files, but private humaniser adapters and detector credentials;
- a small 11-prompt design operated by WriteHuman, which ranks first in its own benchmark.

Opace caught 28/33 source texts before transformation:

- Claude Sonnet 5: 11/11;
- Gemini 3.5 Flash: 11/11;
- GPT-5.5: 6/11.

The table below is conditional. The denominator includes only a source Opace first caught, and the long-form column excludes a transformed output below 200 words. The external column is HumanizerBench's own aggregate across GPTZero, Winston, ZeroGPT, Copyleaks and Originality; it is not an Opace measurement.

| Humaniser/editor | HumanizerBench aggregate bypass | Escaped current Opace, eligible long-form output |
|---|---:|---:|
| Undetectable.ai | 86.0% | **27/28 (96.4%)** |
| StealthGPT | 27.5% | **24/25 (96.0%)** |
| WriteHuman | 89.1% | **24/27 (88.9%)** |
| Humanize AI Pro | 83.5% | **23/26 (88.5%)** |
| AI Humanize io | 70.8% | **22/25 (88.0%)** |
| Phrasly | 76.4% | **23/28 (82.1%)** |
| HIX Bypass | 75.2% | **20/27 (74.1%)** |
| Stealth Writer | 79.7% | **20/27 (74.1%)** |
| Humbot | 71.7% | **18/27 (66.7%)** |
| Walter Writes | 68.0% | **17/28 (60.7%)** |
| Super Humanizer | 41.5% | **15/27 (55.6%)** |
| Grammarly | 0.0% | **2/27 (7.4%)** |

NoteGPT appears in HumanizerBench's source history with an effectively zero aggregate bypass result but is not one of the 396 transformed outputs in this Opace run.

Correct interpretation of the first row:

> Of 28 source articles this exact Opace build initially caught, 27 Undetectable.ai outputs of at least 200 words fell below the Opace verdict rule.

It does not mean 96.4% quality, 96.4% universal bypass, or proof that 96.4% of the outputs were human.

The StealthGPT result exposes detector-specific transfer failure. HumanizerBench reports only 27.5% aggregate bypass against its five detectors, while the same product escaped Opace on 96.0% of eligible long-form sources. There is no universal humaniser ranking.

## 6. Direct JustDone and QuillBot checks

| Test | Source | Output | Current Opace result | Boundary |
|---|---|---|---|---|
| JustDone public teaser | 450-word Claude article, `0.9897`, flagged | 75 words, `0.9720`, not flagged | below threshold | Invalid bypass test: only a short teaser was returned and most of the article was discarded before the paid boundary |
| JustDone displayed demo | 61 words, `0.6364`, not flagged | 62 words, `0.8587`, not flagged | both below threshold | Neither side was detected and both are too short for a meaningful Opace comparison |
| QuillBot free Humanizer | 450-word Claude article, `0.9897`, flagged | three free chunks recombined to 331 words, `0.9897`, flagged | still flagged | QuillBot failed this one direct Opace test; one sample is not a rate |

The full JustDone paid output remains unmeasured against Opace. Based on the owner's repeated Copyleaks/Originality experience and the measured behaviour of comparable neural humanisers, it is more likely than not to evade the current AI axis, but that remains a prediction with limited confidence.

JustDone publicly describes changes to rhythm, tone, word choice, sentence flow and a detect/refine loop. Its May 2026 vendor study claims 89% all-detector bypass and 95% meaning preservation, but the raw test set, matching detector calls and complete methodology are not available for independent reproduction. Treat those figures as marketing/vendor evidence: <https://justdone.com/blog/ai/ai-humanizer-accuracy>.

QuillBot retained 39.6% of the original four-word sequences in the measured example. The free quota ended before a controlled matched-key watermark test could be completed.

QuillBot says its Humanizer uses fine-tuned models plus rules, trained on tens of thousands of human texts, and changes sentence length, variety, flow and recurring words/structures. That description supports a hybrid neural/rules design, not a simple synonym spinner: <https://quillbot.com/ai-humanizer>.

## 7. Typos, double spaces and visible poor quality

The owner is correct that these were discounted as reliable authorship evidence.

### Double spaces

On a detected 293-word source, replacing every ordinary space with two spaces produced:

- identical 418 WordPiece token IDs;
- identical Opace score `0.9901`;
- identical flagged verdict.

Ordinary double spacing has zero effect on the current AI model. It can be reported as an editorial defect, never authorship evidence.

### Sparse spelling errors

A deterministic test transposed two letters in roughly one eligible word per 100 across the 33 source texts:

- baseline detection: 28/33;
- typo-altered detection: 27/33;
- median probability movement: `−0.0002`;
- maximum absolute movement: `0.0192`;
- verdict flips: 1.

Misspellings alter subword tokens and can perturb a borderline result. They do not explain escape rates of 75–96%.

### Product conclusion

The visible error is usually a symptom of an aggressive rewrite, not the effective evasion feature. Detecting poor grammar is easier than proving the process that caused it, because humans also make errors. Phase 2 therefore needs:

- a provenance/edit-history model;
- a separate editorial-integrity layer;
- no quality defect contributing directly to the authorship label.

## 8. Measured Opace-specific weakness

The current model correctly learned an important property of modern, unmodified machine prose: it tends to **under-repeat**.

On fresh, register-matched long-form text:

- vocabulary variety/MATTR AUROC is about 0.91;
- adjacent-sentence content-word cohesion AUROC is about 0.91;
- median machine writing repeats 2.1% of content words between neighbouring sentences;
- median human writing repeats 6.3%.

The deployed-model causal ablation found:

- baseline detection: 90.0%;
- deleting every familiar “AI vocabulary” item: 89.2%, a loss of 0.8 percentage points;
- deliberately increasing reuse of the document's own content words: 57.0%, a loss of 33 points.

HumanizerBench feature deltas show successful products make the same movement:

| Median source-to-output change | Escaped Opace, n=235 | Still caught, n=87 |
|---|---:|---:|
| Vocabulary variety/MATTR | **−0.04621** | −0.01639 |
| Adjacent-sentence cohesion | **+0.00942** | +0.00258 |
| Repeated word-triple rate | +0.00187 | 0.00000 |
| Sentence-length burstiness | +0.01826 | +0.00984 |
| Double-space rate | 0.00000 | 0.00000 |
| Cliché-word rate | 0.00000 | 0.00000 |

This is the present root-cause statement:

> Cycle 2 is strong on original machine prose but has not learned an invariant that survives aggressive post-generation rewrites which restore human-like lexical reuse and adjacent-sentence cohesion.

The fix is not a threshold adjustment. It is training and evaluating on transformations while controlling for the same transformations applied to human writing.

### 8.1 Watermark boundary

Classifier escape and watermark removal are independent. A transformed article can fall below the AI classifier while retaining a matched-key watermark, or lose a watermark while still looking machine-written to the classifier.

The Opace watermark lab ports the public SynthID-Text detection mathematics using public Opace demonstration keys. It cannot test a production Gemini, Claude or ChatGPT text watermark without the provider's authorised key/interface. `no_signal` under a demo key is inconclusive, never a provider pass.

The controlled matched-key Opace experiment found:

- 40 rewrites of 12 demo-watermarked passages;
- Qwen3-4B and T5 paraphrase arms;
- median mean-g `0.6722` before rewriting and `0.5088` afterwards, close to the null `0.5`;
- 0/40 rewrites remained detected;
- median semantic cosine similarity `0.979`, minimum `0.949`;
- 0/24 blind-graded paraphrases destroyed meaning;
- median four-word retention 9% in the paraphrase arms.

This is strong evidence that a thorough semantic rewrite attacks this known-key statistical watermark configuration. It is not proof about a provider production watermark. Google says mild edits can preserve signal while thorough rewriting/translation reduces confidence. Anthropic says lighter editing should often preserve its planned private-key mark while a complete rewrite can remove it; its public text-detection interface is still forthcoming in the cited status. Keep these claims dated and provider-specific.

## 9. What current Opace checks and what Phase 2 lacks

| Humaniser target | Current coverage | Current verdict role | Phase 2 gap |
|---|---|---|---|
| Vocabulary variety and synonym churn | MATTR, TTR, entropy, repeated n-grams and neural representation | learned implicitly by the neural model | train directly on transformed pairs and unseen tools |
| Terminology reuse and adjacent-sentence cohesion | explicit feature battery and causal probe | strongest identified neural axis | make the representation robust to intentional restoration of repetition |
| Sentence length and burstiness | multiple measured features | weak/advisory; burstiness AUROC 0.521 | retain only as explanation/quality evidence |
| Familiar AI words and phrases | cliché battery and 113 rules | advisory; vocabulary AUROC 0.578 | do not promote into authorship |
| Paragraph organisation/openings | paragraph cadence, similarity, openings and segmentation | measured, not decisive | segment-aware edit/provenance labels |
| Punctuation/formatting | em dashes, markdown, blank lines, double spaces and more | formatting excluded from authorship evidence | editorial feedback only |
| Homoglyphs/invisible carriers | deterministic analysers | text-integrity axis | keep separate from authorship |
| Grammar and internal consistency | partial editorial rules/protected spans | incomplete | grammar, NLI, terminology, entity/number and citation checks |
| Humaniser use | no dedicated trained head | not assessed | multi-class humaniser/edit-direction head |
| Mixed source passages | segments-v3 binary scoring | partial | token/segment provenance with calibrated mixed output |

The 122-feature transparent study reconstructs about 62% of the neural model's across-class behaviour. It does not explain every internal decision and must not be described as doing so.

## 10. Market precedent for multi-class provenance

### Pangram 4 — closest current design

Official model card: <https://www.pangram.com/research/model-card/pangram-4>  
Technical overview: <https://www.pangram.com/blog/pangram-4-technical>  
API output: <https://docs.pangram.com/api-reference/ai-detection>

Pangram 4 documents:

- token-level `Human`, `AI-Assisted` and `AI-Generated` provenance;
- a mixed-authorship head;
- a four-class humaniser head: `Human`, `AI-Generated`, `AI-Edited`, `Humanized-AI`;
- segment labels, assistance scores and a separate humaniser score;
- an internal humaniser threshold of 0.91 at release;
- a vendor-reported 98.83% AI-involvement detection rate across 13 humanisers.

The architecture is relevant precedent. The accuracy claim remains vendor evidence until independently reproduced.

### GPTZero

Official technology page: <https://gptzero.me/technology>  
API guide: <https://support.gptzero.me/articles/8947054519-how-do-i-use-and-interpret-the-results-from-your-api>

GPTZero exposes `HUMAN_ONLY`, `MIXED` and `AI_ONLY` and publicly describes polished and paraphrased/humanised subtypes. It does not publicly establish a universal rules-versus-neural-rewrite distinction.

### Turnitin

Official guide: <https://guides.turnitin.com/hc/en-us/articles/22774058814093-Using-the-AI-Writing-Report>

Turnitin's English detector looks for AI-generated prose modified by paraphrasers, word spinners and bypassers such as QuillBot. It requires at least 300 words of qualifying prose and suppresses sub-20% figures because of false-positive risk.

### Limit

No reviewed system can prove every rules-only versus neural-rewrite workflow from final text. Products can be hybrids, manual edits can follow a tool, and different processes can converge on the same output. Opace must report calibrated resemblance to a transformation class, not a forensic certainty it cannot support.

## 11. Phase 2 output taxonomy

The public product needs cautious labels backed by internal classes and an abstention path.

| Owner-facing outcome | Internal class | Evidence boundary |
|---|---|---|
| Most likely human original | `human_original` | probabilistic |
| Most likely AI original | `ai_original` | probabilistic |
| AI original, then human-edited | `ai_original_human_edited` | requires real professional human-edit pairs; frequently uncertain |
| Human original, then AI-edited | `human_original_ai_edited` | comparable to AI-Assisted/AI-Edited |
| AI original, rules-transformed | `ai_original_rules_transformed` | detectable only where transformation fingerprints survive |
| AI original, neural rewrite/humaniser | `ai_original_neural_rewrite` | transformation-family probability, not proof of a named tool |
| Human and AI passages combined | `mixed_segment_provenance` | token/segment composition, distinct from iterative editing |
| Insufficient/out-of-distribution evidence | `uncertain` | mandatory; never force a provenance history |

Recommended user wording includes “Most similar to…”, “AI involvement likely”, “Patterns associated with neural rewriting”, and a clear confidence/limitations explanation.

The product should display three independent result groups:

1. **Authorship and edit provenance** — the classes above.
2. **Text integrity/provenance evidence** — carriers, homoglyphs, matched-key watermarks, supported credentials.
3. **Editorial integrity** — grammar, contradictions, terminology, names, numbers, citations, semantic drift and repair burden.

## 12. Proposed technical architecture

This is a research direction, not an instruction to ship the first trained model.

1. Keep cycle 2 frozen as the production baseline.
2. Start from a quantisation-friendly shared encoder suitable for fp32 server, int8/WASM browser and WebGPU evaluation.
3. Add separate heads for:
   - source provenance;
   - edit direction/AI assistance;
   - humaniser transformation family;
   - token/segment provenance and mixed authorship;
   - out-of-distribution/abstention confidence.
4. Build editorial integrity as a separate layer, not a logit contribution to authorship.
5. Calibrate every class independently. A softmax score is not automatically a real-world probability.
6. Preserve the exact source/result receipt and per-route privacy boundaries.
7. Do not identify a commercial brand unless a vendor-specific output survives a predeclared, held-out version test. The default output is transformation family, not product attribution.

Cycle 3's useful ideas should be carried forward carefully:

- training against AI share improved ranking of AI involvement;
- applying the same deterministic editor to human controls prevented edit artefacts becoming AI labels;
- the candidate was not shippable because browser quantisation, fiction, journalism and paragraph-mixed behaviour regressed;
- raw score scales differed, so operating points had to be refitted rather than copied.

The new model must solve those problems rather than inherit them invisibly.

## 13. Required transformation corpus

### 13.1 Source cells

- verified human, untouched;
- verified human, professionally human-edited;
- verified human, lightly AI-polished;
- verified human, substantially AI-rewritten;
- current AI, untouched;
- current AI, professionally human-edited at light, medium and heavy levels;
- current AI transformed by deterministic rules/synonym systems;
- current AI transformed by neural humanisers;
- known human/AI passage mixtures at multiple proportions and boundaries;
- out-of-domain human and AI controls.

### 13.2 Humaniser coverage

Initial commercial set:

- JustDone;
- Undetectable.ai;
- StealthGPT;
- WriteHuman;
- Humanize AI Pro;
- AI Humanize io;
- Phrasly;
- HIX Bypass;
- Stealth Writer;
- Humbot;
- Walter Writes;
- Super Humanizer;
- QuillBot;
- Grammarly as a preservation/editor control.

Include both human and AI inputs through each available transformation. Otherwise the model can learn “this tool's house style means AI”, which will fail on a genuine human user of the same editor.

### 13.3 JustDone pilot

Before a large corpus, run a controlled paid full-output pilot after owner authorisation:

- at least 30 long-form AI sources which cycle 2 currently catches;
- at least 30 verified-human long-form controls;
- varied registers, lengths, generators and prompt styles;
- exact date, product mode, setting and subscription/version evidence;
- source and output word counts;
- Opace fp32, int8/WASM and WebGPU results;
- authorised direct Copyleaks, Originality, Pangram and GPTZero results where available;
- grammar defects, contradictions, changed entities/numbers/citations;
- semantic similarity and n-gram retention;
- professional reviewer judgement and estimated repair minutes.

Do not purchase or renew a subscription without explicit owner approval. Do not treat the public 75-word teaser as evidence for this pilot.

### 13.4 Metadata per transformation

Record:

- immutable source ID and provenance evidence;
- source side: human/AI, provider/model, prompt, register, date and licence;
- transformation tool/family, version/date, mode/settings and run ID;
- source/output word and token counts;
- character, word, sentence and n-gram retention;
- protected entity, number, URL, quotation and citation changes;
- grammar and spelling defects;
- contradiction/NLI findings;
- semantic similarity;
- human review outcome and repair time;
- every detector build, route, threshold and returned class;
- cost without storing secrets or account data.

### 13.5 Split policy

Split by source document and transformation lineage. Hold out:

- entire source documents;
- entire humaniser brands/families;
- newest model families;
- at least one register;
- product versions released after training where practical.

A random row split is invalid because near-identical source/output variants would leak between training and evaluation.

### 13.6 Reusing the active OpenRouter generation work

The concurrent `implementation/services/local-engine/research/cycle4-fiction/`
task can contribute to this workstream, but it is not already a humaniser
corpus. Preserve its original purpose and let its current bounded run finish
without redirecting it.

At 11:20 BST on 30 August 2026, while generation was still active,
`ai-registers.jsonl` contained 229 AI-original rows from 11 models across eight
register seeds, totalling 85,594 words and $1.679148 of row-reported OpenRouter
cost. This is an in-progress observation, not the final corpus manifest. The
active command has its own `$3.30` hard budget and the wider programme record
authorises up to `$13` of the previously recorded OpenRouter allowance. Do not
infer the account balance from either figure; reconcile completed spend and
the owner's separate credit-expiry constraint before another paid run.

Useful reuse:

- freeze eligible `cycle4-fiction` outputs as **AI-original source rows**, with
  immutable source IDs, model, prompt style, register, topic, date and cost;
- use eligible, licensed and contamination-guarded human harvests as the human
  side of a paired transformation grid;
- if authorised credits remain after the current task, generate paired
  `human_original_ai_edited` examples at light and substantial edit levels;
- generate paired AI-original-to-LLM-rewrite examples as a generic
  `ai_original_neural_rewrite` augmentation family, using a different model
  family from the source generator where practical;
- optionally rewrite locally demo-watermarked text through OpenRouter for a
  matched-key laboratory arm, kept separate from provider-watermark claims;
- retain before/after text, prompts, settings, model IDs, source lineage,
  semantic/factual deltas and exact costs for every transformation.

Mandatory label limits:

- the current rows whose `style` is `humanise` are AI originals produced under
  a style prompt. They are **not** post-generation humaniser outputs because
  there is no paired original before the style instruction;
- an LLM rewriting AI prose is not a genuine professional human edit and must
  never be labelled `ai_original_human_edited`;
- an OpenRouter rewrite is not evidence about JustDone, QuillBot or another
  named commercial service unless that exact authorised service produced it;
- OpenRouter generations carry no usable provider-watermark ground truth or
  detector key by default;
- all variants from one source must remain in one source-lineage split, and the
  frozen evaluation/measurement corpora must remain quarantined.

This reuse can seed four required source families: current AI untouched,
human lightly/substantially AI-edited, generic AI neural rewrites and broader
out-of-domain controls. It cannot supply professionally human-edited AI,
commercial-humaniser ground truth or professional repair-time judgements.
Rules-only transformations and mixed-passage construction require no paid
model calls and should not consume expiring OpenRouter credit.

## 14. Evaluation and proposed acceptance bars

These are proposed research gates and require owner confirmation before becoming release criteria.

### 14.1 Baseline preservation

- reproduce cycle 2 before/after comparisons from the same source corpus;
- no more than a 1 percentage-point loss from 883/922 fp32 long-form detection;
- no increase beyond 45/4,636 fp32 long-form human false positives at the matched operating point;
- report browser/int8 and WebGPU separately; never substitute fp32 figures;
- no material regression in fiction, journalism, academic, professional or non-native human registers;
- no regression in the established mixed-document test set.

### 14.2 Humaniser-aware performance

- materially outperform cycle 2 on a brand-held-out humanised-AI set;
- report per-tool and per-family recall with denominators and confidence intervals;
- predeclare a target only after the pilot supplies enough data for a power calculation;
- evaluate transformed-human false positives for every tool;
- compare performance on quality-preserving versus quality-damaging outputs;
- never quote a humaniser recall without the corresponding transformed-human false-positive rate.

### 14.3 Multi-class performance

- publish the complete confusion matrix, not accuracy alone;
- calibrate each class and measure expected calibration error/Brier score where suitable;
- measure abstention coverage and accuracy after abstention;
- distinguish concatenated mixed passages from iterative AI assistance;
- measure edit-direction accuracy on genuinely paired human-edit and AI-edit examples;
- compare against a majority/random baseline and the frozen binary cycle-2 model;
- reject a class whose output is not more informative than the baseline.

### 14.4 Editorial integrity

- measure grammar, contradiction, entity, number and citation preservation separately;
- do not infer humanisation from a quality failure;
- report reviewer agreement and repair-time distribution;
- retain source/output diffs for authorised research while respecting corpus licences and privacy.

### 14.5 Route and product gates

- fp32 server, int8/WASM and WebGPU operating curves;
- exact 375 px and desktop rendered result states;
- accessible keyboard/screen-reader journeys;
- truthful per-route privacy text;
- receipt/schema compatibility or an explicitly versioned migration;
- no deployment until model, UI, documentation and rollback are approved together.

## 15. Reproduction and first commands

Run from `ai-watermark-and-content-authenticity/` after verifying the checkout and Python environment:

```text
implementation/services/local-engine/research/current-models/.venv/bin/python \
  evidence/score-opace-humanizerbench.py
```

The runner:

- asserts model build `e313ab00de1fffd2`;
- asserts thresholds `0.9855/0.9763`;
- asserts `segments-v3`;
- scores all 33 sources and 396 transformations;
- prints aggregate JSON only;
- reproduces the feature-shift and spacing/typo probes;
- refuses to label a drifted future detector as the August 2026 snapshot.

Before any future run, also check:

```text
git -C implementation status --short --branch
git -C implementation remote -v
git -C implementation rev-parse HEAD
curl -fsS https://opace-detector-877422072168.europe-west1.run.app/v1/health
curl -fsS https://opace-detector-877422072168.europe-west1.run.app/v1/status
```

Do not paste secrets, user content or paid-account data into logs or documentation.

## 16. Source-of-truth and evidence map

### Read first

- [`PROJECT.md`](../../../PROJECT.md) — bounded programme scope and acceptance criteria.
- [`STATUS.md`](../../../STATUS.md) — current programme state and newest research note.
- [`PHASE-2-NEXT-STEPS.md`](PHASE-2-NEXT-STEPS.md) — broad Phase 2 programme; this brief is one workstream under it. **Link corrected 31 August 2026:** it previously pointed at the programme-root copy, which is stale and now carries a banner saying so. Read the tracked copy beside this file.
- [`research/HUMANIZER.md`](../../../research/HUMANIZER.md) — short discovery handover to the living research record.
- [`research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`](../../../research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md) — full living market, mechanism, owner-evidence and roadmap study.
- [`evidence/HUMANIZERBENCH-AUGUST-2026.md`](../../../evidence/HUMANIZERBENCH-AUGUST-2026.md) — exact dated benchmark, denominators and feature deltas.
- [`evidence/score-opace-humanizerbench.py`](../../../evidence/score-opace-humanizerbench.py) — reproducible aggregate scorer.

### Current detector and signal evidence

- [`WATERMARK-NEXT-STEPS.md`](../../../WATERMARK-NEXT-STEPS.md) — current long-form runtime figures, watermark work and open release/design issues.
- [`implementation/docs/CAPABILITIES.md`](../../../implementation/docs/CAPABILITIES.md) — actual shipped axes and limitations.
- [`implementation/docs/EVIDENCE-INDEX.md`](../../../implementation/docs/EVIDENCE-INDEX.md) — map of executable evidence.
- [`implementation/docs/MEASURED-FINDINGS.md`](../../../implementation/docs/MEASURED-FINDINGS.md) — measured findings and claim boundaries.
- [`implementation/services/local-engine/research/signal-science/SIGNAL-SCIENCE.md`](../../../implementation/services/local-engine/research/signal-science/SIGNAL-SCIENCE.md) — 122-feature study, under-repetition result and causal model probe.
- [`implementation/docs/measurements/AGGREGATION-AND-RHYTHM.md`](../../../implementation/docs/measurements/AGGREGATION-AND-RHYTHM.md) — aggregation and rhythm evidence.
- [`implementation/docs/measurements/TWO-AXIS-RETRAIN.md`](../../../implementation/docs/measurements/TWO-AXIS-RETRAIN.md) — later retrain, gains, regressions and do-not-ship decision.
- [`implementation/services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md`](../../../implementation/services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md) — edited-text direction, HAT-Bench and transformed-human controls.
- [`implementation/docs/measurements/WEBGPU-PARITY.md`](../../../implementation/docs/measurements/WEBGPU-PARITY.md) — WebGPU/runtime evidence.
- [`implementation/docs/PER-MODEL-DETECTION.md`](../../../implementation/docs/PER-MODEL-DETECTION.md) — model/provider variation.

### Watermark evidence, kept separate

- [`implementation/docs/WATERMARK-LAB.md`](../../../implementation/docs/WATERMARK-LAB.md) — supported known-key mathematics and provider limits.
- [`docs/measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md`](../measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md) — 40-run matched-key paraphrase result.
- [`docs/measurements/WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md`](../measurements/WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md) — provider/public-verifier boundaries.

### Release and authority boundaries

- [`implementation/docs/RELEASE-STATE.md`](../../../implementation/docs/RELEASE-STATE.md) — written/committed/packaged/published/deployed distinctions.
- [`implementation/docs/programme/HANDOVER.md`](../../../implementation/docs/programme/HANDOVER.md) — implementation narrative and outstanding gates.
- [`implementation/docs/decisions/OWNER-DECISIONS.md`](../../../implementation/docs/decisions/OWNER-DECISIONS.md) — owner decisions.
- [`implementation/docs/decisions/DECISION-REGISTER.md`](../../../implementation/docs/decisions/DECISION-REGISTER.md) — architectural decisions.
- [`implementation/docs/legal/DPIA.md`](../../../implementation/docs/legal/DPIA.md) — hosted-route privacy assessment and review boundary.

## 17. Work packages and dependencies

| Work package | Scope | Depends on | Completion evidence |
|---|---|---|---|
| HAP-00 | Verify checkout, current model/live state, working-tree ownership and frozen baseline | none | dated environment/status record; HumanizerBench reproduction |
| HAP-10 | Approve taxonomy, public wording, abstention semantics and provisional gates | HAP-00, owner decision | decision-register entry and schema proposal |
| HAP-20 | JustDone paid pilot and transformation manifest | HAP-10, owner-approved account/spend | 30 AI + 30 human outputs, complete metadata, no missing quality review |
| HAP-30 | Wider multi-tool transformation corpus | HAP-20, licence/terms review | corpus manifest, deduplication, lineage-safe splits and licence ledger |
| HAP-40 | Editorial-integrity benchmark | HAP-20/30 | grammar/fact/entity/number/citation/repair-time report |
| HAP-50 | Multi-head model candidates | HAP-30, frozen cycle-2 baseline | training manifest, checkpoints kept out of Git, fp32 curves |
| HAP-60 | Quantisation and three-runtime evaluation | HAP-50 | fp32, int8/WASM and WebGPU parity/operating curves |
| HAP-70 | Independent adversarial and external-detector challenge | HAP-60, authorised credits/access | hidden-tool results, transformed-human FPs, external direct-call receipts |
| HAP-80 | Product/UI/receipt prototype | HAP-10, stable candidate outputs | rendered desktop/375px/accessibility evidence; no production deploy |
| HAP-90 | Release recommendation or rejection | all prior | explicit trade table, rollback, owner decision; deployment separately authorised |

Do not start HAP-50 before HAP-20/30 have lineage-safe transformed-human controls. Training first would optimise against the visible benchmark and repeat the current transfer problem.

### Owner decisions required

Before HAP-20:

- approve or reject paid JustDone access and a maximum budget;
- confirm whether existing Copyleaks/Originality credits may be used;
- approve the 30 AI + 30 human pilot composition;
- confirm whether Pangram/GPTZero paid calls are in scope.

Before HAP-50:

- approve the public taxonomy and the mandatory `uncertain` outcome;
- approve the provisional regression/false-positive bars or replace them with named alternatives;
- decide this workstream's priority relative to the concurrent `cycle4-fiction/` work;
- approve any generation/training spend and the model/checkpoint storage plan.

## 18. Safety, legal and release rules

- Do not decompile, jailbreak or circumvent paid humaniser access controls. Behaviourally characterise authorised outputs.
- Do not create accounts, start trials, purchase credits or renew subscriptions without owner approval.
- Do not expose credentials, proprietary corpus text, customer content or account identifiers.
- Respect corpus redistribution and quotation licences; publish statistics/methods where text cannot be redistributed.
- Do not claim watermark removal from classifier escape.
- Do not claim a production-provider watermark result without the provider's authorised detector/key.
- Do not lower thresholds to catch a named example.
- Do not train/test on near-duplicate transformation lineages across splits.
- Do not commit large checkpoints, corpora or third-party snapshots to the public repository.
- Do not change the live service, website, packages or update feed without a separate explicit approval.
- Treat written, committed, packaged, published, deployed and owner-accepted as different states.

## 19. Known traps for the next agent

1. `96.4%` is a conditional escape rate, not universal human accuracy.
2. A 75-word JustDone teaser is not a long-form bypass test.
3. `no_signal` under an Opace demo watermark key is not a provider watermark pass.
4. Typos and double spaces are not the broad evasion mechanism.
5. Humaniser quality damage is not proof of AI origin.
6. Human-edited AI and AI-edited human are opposite directions and need separate paired data.
7. A rules-based tool may call an LLM; product marketing is not architecture evidence.
8. A model can learn a humaniser brand fingerprint and fail on unseen tools unless transformed-human controls and brand-held-out splits are used.
9. Thresholds are not portable across model calibration scales.
10. fp32, int8/WASM and WebGPU figures are not interchangeable.
11. Pangram's current architecture is useful precedent; its vendor numbers are not independent Opace evidence.
12. `cycle4-fiction/` was an untracked concurrent change at brief creation; do not absorb it by assumption.

## 20. Handoff completion checklist

A future agent may call this Phase 2 workstream complete only when it can provide:

- the exact branch, commit and recoverable remote checkpoint;
- a clean ownership account of every pre-existing change;
- immutable corpus/manifests and licences;
- source/transform lineage-safe splits;
- current model and all candidate model hashes/configuration;
- per-class and per-tool denominators, confidence intervals and calibration;
- transformed-human false positives;
- original-AI, mixed-document and per-register regression tables;
- fp32, int8/WASM and WebGPU results;
- editorial quality and repair-time evidence;
- external-detector results labelled by provider/version/date;
- watermark results kept on their own matched-key axis;
- rendered product evidence at desktop and exactly 375 px;
- accessibility and privacy-route evidence;
- explicit unresolved limitations;
- a written owner decision to ship, reject or continue research.

Passing a training run, producing a model file or improving the visible HumanizerBench rows is not completion.

## 21. Living-document rule

After every related test or decision, update:

1. this Phase 2 execution brief;
2. `research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`;
3. the relevant dated evidence document;
4. `STATUS.md` when programme state changes;
5. the release/decision registers if any candidate crosses a state boundary.

Record owner observations as observations, direct measurements as measurements, vendor results as vendor claims and forecasts as forecasts. Never overwrite a dated result without retaining the build, runtime, thresholds, corpus and denominator that made it true.

---

## 22. Status update, 31 August 2026 — appended, nothing above rewritten

Sections 1–21 stand as written on 30 August. This section records what has since been measured,
which work packages moved, and the two places where a figure above is now superseded. The
living-document rule in §21 requires this; it does not permit overwriting §1–21.

### 22.1 Work package status

| WP | 30 August | 31 August | evidence |
|---|---|---|---|
| HAP-00 | not started | **substantially done** — checkout, live build and frozen baseline verified; the shipped path re-proved against 883/922 and 45/4,636 twice, on two separate harnesses, before any new figure was taken | `docs/measurements/LLM-REWRITE-ROBUSTNESS.md` §2.2–2.3; `JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md` §1 |
| HAP-20 | awaiting owner authorisation | **blocked at the terms boundary**, not at a budget. Nothing was submitted to JustDone. A 12-document manual pack is prepared and waits on the owner | `JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md` |
| HAP-30 | not started | the §13.6 reuse route is built and now **scored**; its scope limit is measured rather than assumed (§22.3) | `docs/measurements/PHASE-2-PAIRED-CORPUS.md`; `LLM-REWRITE-ROBUSTNESS.md` |
| HAP-50 | not started | **a new acceptance bar is required before it starts** (§22.4) | `docs/measurements/TWO-AXIS-RETRAIN.md` §20 |

### 22.2 The JustDone pilot stopped on §18's own rule, and that was the correct outcome

§13.3 and §18 required that paid access be authorised and that no access control be circumvented.
On 31 August the evaluation was set up and then stopped **before any document was submitted**,
because JustDone's Terms of Use §7 prohibit the access method through four independent clauses:
7.1.3 (automated or non-human access), 7.3 (commercial use without specific endorsement), 7.4.1
(systematic retrieval to compile a database) and 7.4.5 (use to build a competing or substitute
product). §13.3's instruction that nothing breaching the terms be committed addresses 7.4.1 only:
withholding output from git does not cure clauses that attach to the act of using the service.

**This is a general trap for §13.2's whole roster and belongs in §19.** Every product on that list
sells an AI detector or an anti-detection service, so 7.4.5-shaped clauses are the norm rather than
JustDone's peculiarity. **Read each product's terms before its budget.** The routes that survive,
in order of cleanliness: a written evaluation licence (7.3 and 7.4.1 both contemplate one), a paid
plan with documented API access, published humaniser-output datasets, and last the owner running a
handful by hand as an ordinary user — which clears the automation clause and no other.

Completed instead, and reusable the moment access exists: a proved harness on the shipped path, a
32-document sample selected and hashed from the detected pool (450–3,061 words, four from each of
eight registers), a validated reference profile of the paraphrase corpus computed with that
corpus's own `measure.py` rather than a reimplementation, and a Unicode floor for our own LLM
output against which any commercial output would have to be read as adversarial.

### 22.3 §13.6's reuse route is measured, and it is a weaker adversary than the brief assumed

§13.6 authorised reusing generic LLM rewrites as an `ai_original_neural_rewrite` augmentation
family, with the mandatory label limit that they are not evidence about any named commercial
service. That limit held: `commercial_humaniser` is `false` on all 2,302 rows and
`transformation_family` is `generic_llm_rewrite` throughout. The corpus has now been scored on the
shipped path, and the result changes how much this family is worth.

Server route, fp32, `segments-v3`, shipped pair, harness proved first:

| | |
|---|---|
| AI sources this build catches, whose rewrites it still catches | **95.6%** (526/550) |
| the same, heavy full rewrites only | **92.0%** (172/187) |
| human originals after a heavy LLM rewrite, flagged | 21.0% (57/272) |
| held-out rewriting family (Mistral) against training families | 79.3% against 72.9% |

**An LLM asked to reword AI prose removes 24 documents in 550 from what this build catches. The
commercial tools in §5 escaped on 96.4% and 96.0% of what it caught.** The two are measured on
different corpora at different lengths and must not be subtracted from one another — the pairs
corpus has a median of 372 words and one section, so maximum-over-sections has nothing to work with
— but both are conditional on sources this build first caught, and the difference between them is
an order of magnitude.

**Interim browser figures, on a partial run.** `onnxruntime-web` WASM, int8 per-channel,
`segments-v3`, same pair. **1,347 of 2,302 rows scored on both routes** at the time of writing,
covering `train` (1,103) and `heldout_source` (244) only — the held-out rewriter and held-out
register splits are **not** in it, so this is not a like-for-like restatement of §22.3's table and
its subgroup cells must not be read as final. On the matched subset the two routes agree closely:
paired survival 96.5% (299/310) browser against the server's 95.6% on the full set, human originals
after a heavy rewrite 20.8% (35/168) on both routes, and document-level verdict disagreement of
32/1,347 = 2.4%. **The direction of §22.3 is not a server-route artefact.** Source:
`services/local-engine/research/humaniser-detection-2026-08-31/browser-interim.md`. Replace this
paragraph with the completed run rather than quoting it once that run finishes.

**Consequence for HAP-30 and HAP-50.** §12's architecture is unchanged, but the sequencing note
under §17 ("do not start HAP-50 before HAP-20/30 have lineage-safe transformed-human controls")
now has a second reason behind it: training a humaniser head on generic LLM rewrites would fit an
adversary that the shipped model already defeats 92% of the time. The corpus remains the right
data for the `human_original_ai_edited` direction and for the mixed and edit-direction classes. It
is not a substitute for §13.2 ground truth, and §22.2 is why that ground truth is now a legal
question before it is a budget one.

### 22.4 A new acceptance bar for HAP-50: calibration spread

§14.1's baseline-preservation bars are necessary and were not sufficient. Cycle 4 produced a
checkpoint that met the spirit of every one of them — 893/922 fp32 and 906/922 browser long-form
detection against the shipped 883 and 889, inside both false-positive budgets, better on fiction
and academic on both routes — and it still cannot ship, because it misses the project's own
quantisation gate at a worst verdict-flip rate of 0.01204 against a limit of 0.01.

`TWO-AXIS-RETRAIN.md` §20 settles why. The saturating calibration temperature is a property of the
**corpus**, not of training length: epoch 0 on the cycle-4 corpus fits 1.7137 against cycle 4a's
1.7298 and cycle 3's 1.2095, with a probability ceiling of 0.9506 and 0.00% of its 21,093 segments
reaching 0.97. Epoch 0 closes the gate at 0.00741 and destroys short-form detection (1/57 at 100
words). **On this corpus the gate and the short-form capability cannot both be had by choosing an
epoch.**

**Add to §14.1, for every candidate:**

- report the fitted calibration temperature, the probability ceiling and the share of segments
  within 0.10 margin of the flag point, alongside detection and false positives;
- treat calibration spread as a **training objective** — a term in the selection criterion and
  possibly the loss — not as a diagnostic read off after training;
- report the quantisation-gate verdict-flip rate for every candidate before any accuracy figure is
  discussed, because it is the bar that has now rejected two cycles;
- quote no short-form figure without its split-half stability band. Cycle 4a's fitted gap spans
  0.36–0.44 across split halves, and 100-word detection runs 38/57 to 15/57 across that band.

### 22.5 Two figures in §1–21 that are now superseded

**§4's operating-point baseline stands; §4's implicit assumption that cycle 2 might soon be
replaced does not.** All four cycle-4 arms were rejected on 30–31 August. The shipped model is
cycle 2 at `0.9855 / 0.9763` and no candidate is queued behind it.

**§8's `2.1%` and `6.3%` adjacent-sentence figures stand as written, and a proposed correction to
them is rejected.** `JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md` states that they should read
1.66% and 4.85%. They should not. The published pair is *content-word* overlap between neighbouring
sentences on the provider-eval corpus (`SIGNAL-SCIENCE.md`); the proposed pair is *Jaccard* overlap
on the `cycle4-humaniser-pairs` sources. `PHASE-2-PAIRED-CORPUS.md` §6 already warns that the two
"are not the same statistic and must not be quoted as those". The ordering reproduces across both;
the absolute numbers were never interchangeable. **§19 should carry this as trap 13: a correction
that changes both the corpus and the statistic is not a correction.**

### 22.6 What has not moved

- No model was trained, no threshold changed, nothing deployed, nothing published.
- `ai_original_human_edited` is still empty. §13.1's professional-human-edit cell, the rules-only
  transformation family and mixed-passage construction are all still unbuilt. The last two need no
  paid model calls.
- The multi-class taxonomy in §11 is still unapproved: HAP-10 has not run and the owner decisions
  listed under §17 are all outstanding.
- The browser route's own run over the paired corpus is **incomplete**: 1,347 of 2,302 rows at
  the time of writing, and it was still advancing. Every headline figure in §22.3 is fp32 server.
  See the interim note in §22.3 for what the browser has said so far and how far it may be
  trusted.

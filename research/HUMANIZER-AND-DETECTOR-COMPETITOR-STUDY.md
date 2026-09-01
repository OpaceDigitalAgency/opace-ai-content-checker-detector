# Humaniser and AI-detector competitor study

> **Public research snapshot.** This first-party study preserves the evidence available on its stated research dates. Humaniser products and detector versions change. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and newer measurement reports before quoting a current claim.

Research dates: 26 and 30 August 2026. This dated snapshot records each detector build, corpus, denominator, length gate and runtime available at the time. It is a market-wide representative review, not a claim that every transient humaniser domain has been found. It covers the 19 tools in the
academic DAMAGE survey, all 13 products in the current HumanizerBench data,
direct JustDone and QuillBot checks, and the major commercial detectors
appearing across current independent studies.

## Main findings

1. **There is no independently proven universal humaniser.** Results change by detector, source model, length, domain, setting and product version.
2. **Pangram has the strongest current independent detector evidence.** It substantially outperformed GPTZero, Copyleaks and Turnitin in two recent independent studies, including humanised and mixed text.
3. **Undetectable AI has the strongest recent independent evidence of evasion**, but only on the particular Pangram/GPTZero setup in one August 2026 study; output-quality concerns remain.
4. **WriteHuman leads the August HumanizerBench data**, but WriteHuman operates that benchmark. Its public data and scoring replay correctly, while the private runner, API adapters and small 11-prompt cycle prevent full independent reproduction.
5. **The toughest detectors are missing from the popular humaniser leaderboard.** HumanizerBench checks GPTZero, Winston, ZeroGPT, Copyleaks and Originality; it does not include Pangram or Turnitin.
6. **Humanisers commonly degrade facts and prose.** The academic audit found hallucinated citations, nonsense, dictionary substitutions, tone downgrades and grammatical damage. Even its best tier was preferred to the original text only 26% of the time.
7. **A detector score is not a watermark result.** None of these style classifiers can certify removal of Anthropic's private SynthID-derived watermark.
8. **The exact current Opace fp32 detector is vulnerable to strong humanisers.** On the August HumanizerBench snapshot, conditional long-form escape rates reached 96.4% for Undetectable.ai and 96.0% for StealthGPT. These are direct Opace results, not old-model or external-detector figures.
9. **The 96.4% is conditional, not a universal “human” rate.** Opace first caught 28/33 source texts; Undetectable then escaped on 27 of those 28. The corpus is small, dated and excludes JustDone and QuillBot.
10. **Typos and double spaces are not the mechanism.** Double spacing produced identical tokenizer IDs and an identical score. Sparse typos changed the median probability by −0.0002 across 33 texts and flipped one borderline verdict.
11. **The measured Opace-specific weakness is lexical.** Successful humanisations reduce vocabulary variety and restore repeated terminology and adjacent-sentence cohesion much more strongly than failed ones. This moves text towards the human side of the deployed model's strongest learned axis.
12. **Multi-class provenance is feasible but not provable from final text alone.** Pangram 4 is the closest current product: token-level Human/AI-Assisted/AI-Generated labels plus a separate humaniser head. Opace can build a comparable evidence-led model, but it needs purpose-built paired training data and an `uncertain` outcome.

## Owner's JustDone evidence and commercial reality

The owner previously tested JustDone repeatedly against Copyleaks and
Originality and observed it passing consistently. Treat that as valuable
hands-on evidence for those product versions and settings, not as a controlled
Opace benchmark or a timeless 100% claim.

The practical result was mixed:

- some output was acceptable, while small parts made no sense;
- it introduced errors and inconsistencies a professional writer would not publish;
- AI generation took about two minutes and JustDone about another two minutes;
- repairing the result then took roughly 30–60 minutes;
- writing the article professionally from scratch would have taken about 1–3 hours.

That is still a real time saving. It is also evidence that “passes a detector”
and “publishable human work” are different outcomes. Opace should expose both:
authorship/provenance probability and a separate editorial-integrity result for
grammar, contradictions, terminology, entities, numbers, claims and citations.

## Exact current Opace challenge result

This run used the current production fp32 artefact, not an older detector:

- run date: 30 August 2026;
- live health rechecked: `tier3-cycle2`, build `e313ab00de1fffd2`, `segments-v3`;
- primary threshold: `0.9855`;
- secondary threshold: `0.9763`;
- rule: strongest segment clears primary, or second-strongest clears secondary;
- source set: 33 texts, 11 each from Claude Sonnet 5, Gemini 3.5 Flash and GPT-5.5;
- Opace baseline: 28/33 caught — Claude 11/11, Gemini 11/11, GPT-5.5 6/11;
- transformed set: 396 outputs from 12 humanisers;
- long-form comparison: outputs of at least 200 words whose source Opace caught.

| Humaniser | Escaped current Opace, eligible long-form only |
|---|---:|
| Undetectable.ai | **27/28 (96.4%)** |
| StealthGPT | **24/25 (96.0%)** |
| WriteHuman | **24/27 (88.9%)** |
| Humanize AI Pro | **23/26 (88.5%)** |
| AI Humanize io | **22/25 (88.0%)** |
| Phrasly | **23/28 (82.1%)** |
| HIX Bypass | **20/27 (74.1%)** |
| Stealth Writer | **20/27 (74.1%)** |
| Humbot | **18/27 (66.7%)** |
| Walter Writes | **17/28 (60.7%)** |
| Super Humanizer | **15/27 (55.6%)** |
| Grammarly | **2/27 (7.4%)** |

Full figures, feature deltas and reproduction instructions are in
[`HUMANIZERBENCH-AUGUST-2026.md`](HUMANIZERBENCH-AUGUST-2026.md).

The correct reading of Undetectable's row is: **of the 28 source articles this
specific Opace build initially caught, 27 transformed outputs of at least 200
words fell below the Opace verdict rule.** It does not mean 96.4% accuracy,
96.4% quality, or a 96.4% chance of fooling every future detector.

## JustDone and QuillBot direct checks

| Tool/check | Source | Output | Current Opace result | Honest verdict |
|---|---|---|---|---|
| JustDone public teaser | 450-word Claude article, `0.9897`, flagged | 75 words, `0.9720`, not flagged | Below threshold | Invalid bypass result: the page returned only a short teaser and discarded most of the article before the paid boundary |
| JustDone displayed demo | 61 words, `0.6364`, not flagged | 62 words, `0.8587`, not flagged | Both below threshold | Demonstrates neither detection nor bypass; both are below Opace's meaningful length range |
| QuillBot free Humanizer | 450-word Claude article, `0.9897`, flagged | Three free chunks recombined to 331 words, `0.9897`, flagged | Still flagged | Failed this one direct Opace test; not a population estimate |

The JustDone full paid mode remains unmeasured against Opace. Based on the
owner's repeated Copyleaks/Originality experience and the current Opace result
for comparable neural humanisers, it is more likely than not to evade the AI
axis. That is a prediction with limited confidence, not a measured pass.

QuillBot retained 39.6% of the original four-word sequences in the direct
sample. That is materially less aggressive than the successful internal
watermark paraphrase arms, whose median four-word retention was 9%. QuillBot
may still weaken a statistical watermark, but the free quota ended before a
matched-key watermark test could be completed.

## Humanisers and text watermarks

Classifier escape and watermark removal are independent outcomes. A text can
fall below Opace's AI probability threshold while retaining a matched-key
statistical watermark, or lose the watermark while remaining easy to classify
as AI.

The current Opace lab is a faithful port of the public SynthID-Text detection
mathematics using public **Opace demonstration keys**. It cannot test a
production Gemini, Claude or ChatGPT watermark because the provider's private
key and an authorised text-verification interface are unavailable. `no_signal`
under the demo key is inconclusive, never a production-provider pass.

The project's controlled matched-key experiment is strong evidence for the
attack mechanism within that boundary:

- 40 rewrites of 12 Opace demo-watermarked passages;
- two local paraphrasers, Qwen3-4B and T5;
- median mean-g fell from `0.6722` to `0.5088`, close to the null value `0.5`;
- 0/40 rewrites remained detected;
- median semantic cosine similarity `0.979`, minimum `0.949`;
- blind grading found 0/24 paraphrases had destroyed the meaning;
- median four-word retention was 9% in the paraphrase arms.

This does not transfer automatically to a provider production watermark, but
it supports the practical conclusion that a thorough semantic rewrite is a
serious attack on statistical text watermark signal.

Google states that SynthID-Text works best on longer, diverse text: lighter
editing can preserve a signal, while thorough rewriting or translation reduces
confidence. See [Google DeepMind's SynthID explanation](https://deepmind.google/blog/watermarking-ai-generated-text-and-video-with-synthid/).
Anthropic states that lighter editing should often preserve its planned
private-key Claude mark while completely rewriting every word can remove it;
its public detection API is still described as forthcoming. See
[Anthropic's watermark announcement](https://www.anthropic.com/news/claude-text-watermark).

The DAMAGE experiment provides independent but non-production evidence: on its
200-token Gemma/SynthID setup, detection at a 1% false-positive point fell from
66.5% before DIPPER paraphrasing to 1.5% afterwards. That result is about its
named experimental configuration, not production Gemini or Claude.

## Do deliberate errors, punctuation and spacing help?

Not in the way humaniser marketing implies.

### Double spacing

The current WordPiece tokeniser treats one or multiple ordinary spaces as the
same boundary. On a 293-word detected source, doubling every ordinary space
left all 418 token IDs unchanged and left the score exactly `0.9901`. An
occasional double space therefore has **zero effect** on the current AI model.
It may still be shown as an editorial defect, but never as authorship evidence.

### Sparse spelling errors

A deterministic probe transposed letters in roughly one word per 100 across
all 33 source documents. Detection changed from 28/33 to 27/33; median score
movement was `−0.0002`, maximum absolute movement `0.0192`, with one verdict
flip. Errors can perturb a borderline score because misspellings change
subword tokens. They do not explain escape rates of 75–96%.

### Why bad writing can still help indirectly

The typo itself is weak. A rewrite system that permits errors is often also
making much larger changes to vocabulary choice, term repetition, sentence
connections and structure. Those semantic and lexical changes move the neural
score. The visible mistake is a symptom of an aggressive rewrite, not the
reliable evasion feature.

The earlier decision therefore stands: spelling mistakes, double spaces,
punctuation quirks, clichés and “burstiness” stay out of the authorship verdict.
They belong in editorial quality feedback.

## Are we checking everything humanisers try to change?

We measure many of the properties, but we do not currently use a dedicated
humaniser classifier.

| Humaniser target | Current Opace coverage | Role in verdict |
|---|---|---|
| Vocabulary variety and synonym churn | MATTR, type-token ratio, entropy, repeated n-grams and neural representation are measured | Strongly learned by the neural model; not a hand-written rule |
| Repeated terminology and sentence-to-sentence cohesion | Adjacent-sentence content-word overlap and repetition battery; causally probed | The strongest identified model axis |
| Sentence length and “burstiness” | Multiple sentence-length and rhythm measures | Measured as weak: burstiness AUROC 0.521; editorial/explanatory only |
| Recurring AI words and phrases | Cliché vocabulary and 113 writing rules | Weak: vocabulary AUROC 0.578; editorial only |
| Paragraph organisation and openings | Paragraph cadence, paragraph similarity, openings and segmentation | Measured, but current rules do not decide authorship |
| Punctuation and formatting | Em dashes, markdown, blank lines, double spaces and other formatting features | Formatting was deliberately excluded as verdict evidence; it often reveals the interface, not the author |
| Homoglyphs and invisible characters | Deterministic integrity analysers | Separate manipulation finding, never an AI-origin claim |
| Grammar, contradictions and factual drift | Partial editorial rules and protected-span mechanics only | **Current gap:** no full grammar, NLI, entity/number/citation consistency head |
| “Was this humanised?” | No dedicated trained head | **Current gap:** HumanizerBench was not in the cycle-2 training set and is not shipped in any package |

The neural classifier can use properties we have not named, but it was trained
to separate human and AI source distributions, not to infer edit history. The
transparent 122-feature work explains about 62% of its across-class behaviour,
not every internal decision.

## The Opace-specific weakness

The model correctly learned a strong modern signal: original machine prose
under-repeats. On fresh matched long-form, vocabulary variety and
adjacent-sentence cohesion each reach AUROC about 0.91. Causal ablation of the
deployed artefact showed that deliberately making AI text repeat its own terms
more often dropped detection from 90.0% to 57.0%; deleting all familiar “AI
words” dropped it only to 89.2%.

The HumanizerBench result shows that several commercial tools perform that
same movement at scale:

| Median source-to-output change | Escaped, n=235 | Still caught, n=87 |
|---|---:|---:|
| Vocabulary variety (MATTR) | **−0.04621** | −0.01639 |
| Adjacent-sentence cohesion | **+0.00942** | +0.00258 |
| Repeated word-triple rate | +0.00187 | 0.00000 |
| Burstiness | +0.01826 | +0.00984 |
| Double-space rate | 0.00000 | 0.00000 |
| Cliché-word rate | 0.00000 | 0.00000 |

This is the most defensible current description of the weakness: **cycle 2 is
strong on original machine prose but has not learned an invariant that survives
aggressive post-generation rewrites which restore human-like lexical reuse.**
The unusually poor transfer on StealthGPT — weak against HumanizerBench's five
detectors, strong against Opace — confirms that this is detector-specific.

It can be improved, but not honestly by lowering a threshold or bolting typo
rules onto the verdict. Both would raise false positives without teaching the
model the transformation. The fix is adversarial training on paired humanised
AI **and humanised human** text, with whole source families and unseen
humanisers held out.

## How humaniser sites appear to work

Public sites rarely disclose enough to distinguish a prompted third-party model from a fine-tuned model. The evidence supports four broad designs:

| Design | What it does | Strength | Failure mode |
|---|---|---|---|
| Rules/synonym substitution | Replaces words, punctuation or sentence forms | Cheap, deterministic, usually preserves local structure | Awkward word choice; modern neural detectors learn the pattern |
| Prompted LLM wrapper | Instructs an LLM to vary rhythm, tone and vocabulary | Fluent and quick to build | Leaves another model fingerprint; may reveal its system prompt; may hallucinate |
| Fine-tuned paraphraser | Learns source-to-humanised pairs or preferred undetected outputs | Better detector-specific adaptation | Overfits one detector/version and can damage meaning |
| Detector-in-the-loop search | Generates candidates, scores them and keeps a passing variant | Strongest against the exact queried detector | Costly; poor transfer; encourages quality drift unless protected by hard gates |

The [DAMAGE study](https://arxiv.org/html/2501.03437) found that some commercial humanisers were LLMs with simple system instructions exposed through jailbreaks. It also demonstrated the more capable pattern: fine-tune a paraphraser using the detector's score as a negative signal. This remains detector-specific, not universal.

Undetectable AI's public API is also instructive: its documentation calls its own `result` the accurate score while labelling the displayed Copyleaks, Writer and other third-party scores as approximate. Opace must call each named detector directly rather than repeating an aggregator's simulated score.

## Humaniser coverage and reported performance

### Current public benchmark

August HumanizerBench contains 11 prompts and 12 ranked products. “Bypass” is its own multi-detector score, not a universal pass rate.

| Product | Composite | Bypass | Meaning | Readability | Assessment |
|---|---:|---:|---:|---:|---|
| WriteHuman | 76.69 | 89% | 72% | 58% | Current leader; material owner-conflict and small-cycle caveats |
| Humanize AI Pro | 71.40 | 84% | 67% | 52% | Promising; independently rated high-quality in older DAMAGE audit |
| Stealth Writer | 69.83 | 80% | 72% | 44% | Detector reduction with weak readability |
| HIX Bypass | 67.93 | 75% | 77% | 38% | Better meaning, poor readability; older audit found occasional nonsense |
| Humbot | 66.95 | 72% | 75% | 43% | Current score improved over a poor older qualitative audit |
| AI Humanize io | 64.57 | 71% | 64% | 55% | Meaning loss remains material |
| Phrasly | 63.30 | 76% | 63% | 67% | High penalties and meaning loss contradict its 100% marketing claim |
| Undetectable.ai | 61.49 | 86% | 72% | 55% | Strong evasion, but a 13-point quality penalty reduced its result |
| Walter Writes | 60.83 | 68% | 69% | 65% | Moderate across all dimensions; no strong independent study found |
| Super Humanizer | 55.86 | 42% | 73% | 58% | More editing than durable evasion |
| Grammarly | 52.91 | 0% | 94% | 79% | Excellent preservation; it is an editor, not an evasion product |
| StealthGPT | 45.55 | 28% | 63% | 71% | Current leaderboard and independent studies show detector-dependent failure |

NoteGPT appears in the source history but was not ranked in the displayed August top 12; its recorded bypass was effectively zero.

The five-detector breakdown reveals poor transfer. For example, Stealth Writer scored 88% against Winston and 89% against ZeroGPT but only 31% against GPTZero and 44% against Originality. HIX scored 89% against ZeroGPT but 13% against GPTZero. A single headline average hides this.

### Broader academic market survey

The 19-tool [DAMAGE](https://arxiv.org/html/2501.03437) survey covered DIPPER, Grammarly, QuillBot, BypassGPT, Ghost AI, HIX Bypass, Humbot, HumanizeAI.io, HumanizeAI.pro, Humanizer.com/AIHumanizer.com, Phrasly, Semihuman AI, StealthGPT, StealthWriter, Surfer SEO, Undetectable AI, Twixify, WriteHuman and GPTInf.

Its qualitative tiers, recorded in January 2025 and therefore potentially stale, were:

- Higher fidelity: DIPPER, GPTInf, Grammarly, HumanizeAI.pro, QuillBot, Semihuman AI, StealthGPT and Twixify.
- Medium: AIHumanizer.com, BypassGPT, StealthWriter and Surfer SEO.
- Low: Ghost AI, HIX Bypass, HumanizeAI.io, Humbot, Phrasly, Undetectable AI and WriteHuman.

The apparent conflict with the August 2026 leaderboard is useful evidence of rapid product and detector drift. Opace needs dated, versioned re-tests rather than permanent rankings.

### Genuinely successful reports

- An August 2026 accepted [preprint on academic-integrity detection](https://arxiv.org/abs/2608.11256) reports that fewer than 4% of Undetectable AI rewrites remained flagged by its selected detectors. This is strong evidence for that narrow setup, not universal accuracy.
- The independent [University of Chicago study](https://bfi.uchicago.edu/wp-content/uploads/2025/09/BFI_WP_2025-116.pdf) found StealthGPT made GPTZero miss roughly half or more of humanised passages. Originality missed around 5% of longer and up to 21% of shorter passages; Pangram still detected nearly all longer passages.
- DAMAGE found GPTZero's default true-positive rate dropped from 95.60% on raw AI text to 34.53% on humanised AI. Its humaniser-aware research detector retained 97.47%, showing that successes disappear when the detector trains on humanised examples.
- HumanizerBench records large current reductions across its five detectors, but the leader's ownership, small samples and missing Pangram/Turnitin limit the strength of the conclusion.

Verdict: humanisers **can genuinely evade specific classifiers**, sometimes at high rates. No reviewed evidence supports “all detectors”, “100% human”, durable success after detector retraining, or production Claude watermark clearance.

## Detector mechanisms

Modern commercial detectors are mostly supervised neural classifiers, not simple perplexity calculators:

- **Pangram:** language-model classifier trained on paired human/AI “mirror” documents, hard-negative mining and humaniser-augmented data. It learns an invariant rather than a list of bad phrases.
- **GPTZero:** since 2023 a hierarchical multi-task deep-learning system with document and sentence-level predictions; its current documentation says perplexity and burstiness are no longer the detector architecture.
- **Copyleaks:** proprietary neural classification and model-family/style fingerprinting, with section-level output and continuously updated datasets.
- **Originality:** proprietary classifiers with different operating modes and thresholds, including models trained to recognise humanised text.
- **Turnitin:** institutional long-form prose classifier plus a category intended to detect AI text modified by paraphrasers/bypassers; scores under 20% are suppressed because they are less reliable.
- **Grammarly:** proprietary model operating over text sections and linguistic patterns; Grammarly itself warns that its score will differ from Turnitin, GPTZero and others.
- **Sapling, Winston and ZeroGPT:** classifier services with much less reproducible current independent technical disclosure.
- **Watermark detectors:** separate keyed statistical tests. They can be precise for a known generator/configuration but are not substitutes for the classifiers above.

## Which detectors are genuinely accurate?

Percentages below are confidence that the detector is useful for the stated current role, not a universal vendor accuracy rate.

| Detector | Independent evidence | Weakness | Confidence |
|---|---|---|---:|
| Pangram | Best in the Chicago study and a July 2026 peer-reviewed 160-paper comparison; strong on mixed/humanised text | Proprietary and version-drifting; no detector is conclusive evidence | 85–92% |
| Copyleaks | Perfect baseline/paraphrase result in one small 2026 study; strong vendor V10 testing | Missed most GPT-4o Deep Research and hybrid/humanised content in another current study | 65–80% |
| Originality.ai | Strong baseline and paraphrase results; good discrimination in Chicago study | More misses on some Claude text and humanised short text; model/threshold choice matters | 65–80% |
| GPTZero | Strong raw-AI results in several studies and lower FPR than Originality in Chicago study | Humanisers produced about 35–60% TPR in different studies; poor mixed-text result in July 2026 paper | 55–75% |
| Turnitin | Important institutional target and explicit limitations/threshold handling | 0% strict success on GPT-4o Deep Research in one current study; 50% on its humanised set | 45–65% |
| Sapling | Strong paraphrase result in the 116-text JAIT study | Fell to 25% on simulated non-native style; limited broader current evidence | 45–65% |
| Winston AI | Common commercial benchmark target | No comparably strong independent 2026 technical evaluation found | 35–55% |
| ZeroGPT | Common, inexpensive comparison signal | Highly variable and easier to bypass; limited technical transparency | 30–50% |
| QuillBot/Grammarly detectors | Useful secondary signals and accessible | Weak and variable after paraphrase or simulated non-native style | 25–50% |

The [July 2026 peer-reviewed comparison](https://link.springer.com/article/10.1007/s40979-026-00226-w) is particularly important: Pangram had 65% strict and 97.5% inclusive accuracy on fully AI GPT-4o Deep Research papers, and 92.5% strict accuracy on both hybrid and humanised papers. GPTZero and Copyleaks substantially underestimated those same categories, while Turnitin missed all fully AI papers under the study's strict classification.

## Does another tool provide the classifications the owner wants?

**Pangram 4 comes closest.** Its July 2026 model card documents a token-level
three-class provenance head (`Human`, `AI-Assisted`, `AI-Generated`), a
mixed-authorship head and a four-class humaniser head (`Human`, `AI-Generated`,
`AI-Edited`, `Humanized-AI`). It returns segment labels, an AI-assistance score,
and a separate humaniser score. Its release threshold for the humaniser flag is
0.91. Pangram reports 98.83% detection of AI involvement across 13 commercial
humanisers, but that is vendor benchmark evidence until independently replayed.

Current official sources:

- [Pangram 4 model card](https://www.pangram.com/research/model-card/pangram-4)
- [Pangram 4 technical overview](https://www.pangram.com/blog/pangram-4-technical)
- [Pangram API provenance output](https://docs.pangram.com/api-reference/ai-detection)

GPTZero exposes `HUMAN_ONLY`, `MIXED` and `AI_ONLY`. Its published taxonomy also
describes polished and paraphrased/humanised subtypes, but its public technical
page does not disclose a separate rules-versus-neural-rewrite label. See
[GPTZero technology](https://gptzero.me/technology) and its
[API interpretation guide](https://support.gptzero.me/articles/8947054519-how-do-i-use-and-interpret-the-results-from-your-api).

Turnitin's English detector explicitly looks for AI-generated text modified by
an AI paraphraser, word spinner or bypasser such as QuillBot. It reports this as
AI-writing evidence rather than reconstructing whether a human or a particular
tool performed every edit. It requires at least 300 words of qualifying prose
and suppresses sub-20% values because of false-positive risk. See the current
[Turnitin AI Writing Report guide](https://guides.turnitin.com/hc/en-us/articles/22774058814093-Using-the-AI-Writing-Report).

No reviewed tool reliably distinguishes a rules-only humaniser from an
LLM-rewrite service in all cases. Many commercial products are hybrids, and two
different processes can produce the same final text. The output should be
worded as a calibrated match to a transformation class, never proof of the
author's workflow.

## Proposed Opace provenance taxonomy

The owner's requested labels are directionally right, but the UI should retain
an uncertainty state and separate mixed passages from whole-document edit
history.

| Requested outcome | Proposed internal class | Can final text support it? |
|---|---|---|
| Likely human | `human_original` | Yes, probabilistically |
| Likely AI | `ai_original` | Yes, probabilistically |
| Likely AI but amended by human | `ai_original_human_edited` | Partly; needs real human-edit pairs and must often return uncertain |
| Likely human but amended by AI | `human_original_ai_edited` | Yes in principle; Pangram calls this AI-Assisted/AI-Edited |
| Likely humanised using rules | `ai_original_rules_transformed` | Sometimes, when deterministic fingerprints survive; not universally identifiable |
| Likely humanised using a rewrite tool | `ai_original_neural_rewrite` | Yes as a trained similarity class; tool identity and authorship are not proven |
| Human and AI passages combined | `mixed_segment_provenance` | Yes, through token/segment labels; distinct from iterative editing |
| Insufficient or out-of-distribution evidence | `uncertain` | Essential; never force one of the six labels |

The public labels should remain cautious: “Most similar to human writing”,
“AI involvement likely”, “Patterns associated with neural rewriting”, and so
on. A receipt should show the segment composition and independent quality
findings rather than collapse everything into one percentage.

## Can Opace build this?

Yes, as a new research model. It cannot be added truthfully as a few rules on
top of cycle 2.

Recommended architecture:

1. Keep the existing cycle-2 AI-probability model as the frozen production
   baseline while research proceeds.
2. Train a shared encoder with separate heads for source provenance,
   AI-assistance/edit direction, humaniser family and mixed segment boundaries.
3. Add a separately calibrated editorial-integrity layer for spelling,
   grammar, contradictions, entity/number changes, citation validity and
   source-to-output semantic drift. Quality evidence must not change the
   authorship class.
4. Return calibrated class probabilities plus `uncertain`; never infer a
   particular brand unless a vendor-specific result survives a held-out
   product-version test.

Required paired corpus cells:

- verified human, untouched;
- verified human, professionally human-edited;
- verified human, lightly AI-polished;
- verified human, substantially AI-rewritten;
- current AI, untouched;
- current AI, professionally human-edited at light, medium and heavy levels;
- current AI through deterministic rules/synonym systems;
- current AI through neural humanisers, including JustDone, Undetectable,
  StealthGPT, WriteHuman, HIX and QuillBot;
- AI and human passages concatenated in known proportions;
- both human and AI controls passed through each transformation, so the model
  cannot learn “this tool's style means AI”.

Split by source document, source model, humaniser family and product version.
Hold out entire humanisers and the newest model families. A random row split
would leak near-duplicate before/after text and produce a false result.

Quality labels should include professional review, grammar defects,
contradictions, named-entity and number preservation, citation validity,
semantic similarity and time-to-repair. The owner's observed 30–60-minute
JustDone repair burden is exactly the kind of commercially useful measure
detector-only leaderboards omit.

### Reuse of the remaining OpenRouter generation allowance

The active `implementation/services/local-engine/research/cycle4-fiction/`
work overlaps with Phase 2, but its current outputs are source material rather
than humaniser evidence. At 11:20 BST on 30 August, its still-running
`ai-registers.jsonl` held 229 AI-original rows from 11 models and eight
register seeds (85,594 words; $1.679148 row-reported cost). Its current run has
its own $3.30 hard cap. Treat those numbers as a dated in-progress snapshot and
reconcile the final manifest before reuse.

Once that bounded task finishes, eligible AI rows can become source documents
for paired rewrite arms. Eligible licensed human harvests can support light
and substantial AI-edit arms. If expiring, already-authorised OpenRouter credit
remains, the highest-value extra calls are paired transformations which retain
the exact source, output, prompt, source model, rewrite model, edit strength,
register and cost. Use a different rewrite-model family from the source model
where practical and keep every variant from one source in the same split.

The labels must remain honest:

- `style: humanise` in the current generator means original AI prose written
  under a style instruction, not an AI original subsequently humanised;
- an LLM rewrite is a generic neural-rewrite example, not proof of JustDone,
  QuillBot or any named commercial tool;
- model-produced rewriting is not professional human editing;
- no OpenRouter row supplies provider-watermark ground truth by default.

This can cover current AI originals, AI-edited human examples, generic neural
rewrites and broader controls. It cannot replace the controlled commercial
humaniser pilot, real professional edits, repair-time review or transformed
human controls from the exact commercial tools. Deterministic-rule variants
and mixed passages need no paid calls, so expiring credit should not be spent
on them. The full reuse boundary and metadata rules are in the Phase 2 brief,
§13.6.

## Next work, in order

1. **Freeze this finding.** Keep the current HumanizerBench output, current
   Opace build and feature-delta runner as a dated baseline. Done on 30 August.
2. **Acquire a controlled JustDone set.** At least 30 long-form sources spanning
   human controls and current AI models, captured from the paid full-output
   mode with the exact product date/setting. This needs owner-authorised access;
   the public teaser is inadequate.
3. **Create a transformation-grid manifest.** Record source provenance,
   generator, prompt, tool/version, operation type, word retention, n-gram
   retention, protected-fact changes, grammar defects and human repair time.
4. **Behaviourally characterise, do not decompile.** Analyse output deltas and
   use public/authorised outputs. Do not evade access controls or claim access
   to proprietary weights, prompts or code.
5. **Train a humaniser-aware candidate.** Include transformed human and
   transformed AI, use multi-task heads, and keep entire tools as hidden
   holdouts. Compare against the frozen cycle-2 baseline.
6. **Gate every class separately.** Publish per-class confusion matrices,
   false-positive rates by register, calibration, abstention coverage and
   unseen-tool transfer. “Humanised” accuracy without a humanised-human control
   is invalid.
7. **Test both runtimes before any release decision.** fp32 server, int8/WASM
   browser and WebGPU must each reproduce their own operating curves. No
   threshold or model is authorised for deployment by this research document.
8. **Challenge against external detectors.** Pangram 4 first, then Copyleaks,
   Originality and GPTZero; Turnitin only with authorised institutional access.
9. **Keep watermark tests independent.** Run matched-key Opace demo watermark
   tests on the same transformations, but never translate classifier escape
   into a production-provider watermark claim.

### Definition of success for the research candidate

- improves humanised-AI recall materially on an unseen-humaniser holdout;
- does not worsen the frozen human false-positive ceiling overall or in
  academic, professional, non-native and creative registers;
- distinguishes `human_original_ai_edited` from
  `ai_original_neural_rewrite` above a predeclared baseline;
- abstains when the direction of editing is not identifiable;
- preserves the existing mixed-document and long-form detection bars;
- reports quality damage independently of provenance;
- reproduces on server and browser runtimes before any shipping recommendation.

## Implications for Opace

- Treat Pangram, Copyleaks and Originality as the first external challenge set; add GPTZero for market comparability.
- Add Turnitin only through authorised institutional access; do not simulate its score.
- Preserve Winston and ZeroGPT as secondary compatibility checks, not proof.
- Optimise the product for fidelity, provenance and transparent receipts. Detector reduction is a dated measurement.
- Train/evaluate on transformed human and transformed AI text so the system does not merely learn “humaniser style”.
- Use a hidden held-out set and live detector calls. Never tune and report on the same samples.
- Include raw human, edited human, non-native English, brand copy, SEO articles, mixed AI/human and latest-model AI text.
- Treat the proposed multi-class model as research only. Nothing in this study changes the shipped cycle-2 model, thresholds, live service or package release state.

## Living-document rule

This file and
[`HUMANIZERBENCH-AUGUST-2026.md`](HUMANIZERBENCH-AUGUST-2026.md)
must be updated together after every humaniser test. Record owner observations
as observations, direct Opace measurements as measurements, vendor results as
vendor claims and predictions as predictions. Never overwrite an older model's
result with a newer one without retaining the build, threshold, corpus and
denominator that made each result true.

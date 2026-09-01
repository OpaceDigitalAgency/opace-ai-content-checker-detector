# PHASE 2 — deferred work, deliberately not done in phase 1

Current as of 29 August 2026, 17:00. Reconciled against the live server, the live site, the
GitHub API and the package registries on that date; evidence per claim in
[`DOC-RECONCILIATION-2026-08-29.md`](DOC-RECONCILIATION-2026-08-29.md).

Read this alongside OBJECTIVE.md (the binding target) and BRIEF.md (the standing intent).
Everything here was consciously deferred, not forgotten. Each item states why. Items that
have since been done are marked **DONE** and keep their original reasoning, so the record of
why they were deferred survives the fact that they no longer are.

**New dedicated workstream, 30 August 2026:** commercial-humaniser robustness,
multi-class edit provenance and independent editorial-damage assessment now have
a self-contained execution brief in
[Phase 2: Humaniser-aware detection and edit provenance](PHASE-2-HUMANISER-AWARE-DETECTION-AND-EDIT-PROVENANCE.md).
It is part of Phase 2 but does not replace the wider deferred-work register in this file.

**Second dedicated workstream, 30 August 2026:** the watermark tool — its accuracy, its claims, its
competitive position and everything still missing from it — has a self-contained execution brief in
`WATERMARK-NEXT-STEPS.md`, "Watermark tool: full history, current state and next steps", held
privately in the programme directory above this repository.
It is written for an implementer with no prior knowledge of this programme and carries the verified
provider facts, the measured attack results, the six decisions taken, and a priority-ordered roadmap
R1–R12 including image and media provenance. **§8 below is now a pointer into it rather than the
record itself.**

**Dated addition, 31 August 2026:** §11 at the foot of this file records what the 31 August
measurements changed — the retrain rejected in all four arms, the humaniser escape rates measured
against the current build, what an LLM rewrite actually costs the detector, and a ranking of the
next cycle's options derived from those numbers. **Read §11 before acting on §10 or §5a**: it does
not rewrite them, but it changes what the next cycle should spend its time on.

**Two things changed under this file since it was written.** The source repository is public
(§7). And server-side inference is now the checker's default route, which this file's phase-1
assumptions predate throughout: where an item below reasons about a browser-only tool, read it
knowing the browser is now the second route rather than the only one.

---

## 1. Teacher and education mode — DEFERRED (new product scope)

Raised by the independent audit. Genuinely valuable, but it is new product scope beyond the
original brief rather than a gap against it, so it was not built.

What it would need:
- A 200-word minimum enforced in the interface, since detection is unreliable below that.
  Measured on human and AI long-form documents truncated to the stated length, 300 AI and 400
  human documents from the fresh corpus, scored under Python onnxruntime at 0.980: 67.0% at
  200 words, 50.3% at 150, 19.0% at 100. False positives stayed at 0.00% at every one of those
  lengths. The AI denominators for the per-length rows are not separately recorded and the
  figures have never been re-measured on either shipping runtime, so treat them as indicative.
  **Withdrawn from every shipped surface on 30 August 2026.** They were printed to every visitor
  of the live checker as its length limits. What replaced them is naturally short passages
  measured at the shipped `0.9855`/`0.9763` pair with denominators: 29/172 (16.9%) of AI passages
  at 100-199 words, 193/228 (84.6%) at 300-399, with under-100 and 200-299 declared unmeasured
  because each holds fewer than 30 AI passages.
  The server route already enforces a minimum word count of its own.
- Validation against humanities, literary criticism, genuinely student-written work, and
  AI-edited student work. Our academic corpus is social-science and STEM weighted; the
  humanities were identified as a gap and never closed.
- A review and appeal workflow, and an exportable evidence pack a student can respond to.
- A prominent, unavoidable safeguard: this must never be the sole evidence for a
  disciplinary decision. The 6.61% academic false-positive rate this item was written against
  came from a separate 900-sample check at the **training** threshold of 0.9110, which does not
  ship. At the shipped 0.984 the highest human false-positive rate on the fresh corpus is
  stories at 16/260 (6.15%), with academic discussion at 14/420 (3.33%). Academic is no longer
  the worst genre, and the original sentence overstated it. The safeguard stands regardless.

## 2. Head-to-head against GPTZero, Copyleaks and Originality — DEFERRED (owner's call, costs money)

The brief's competitive claim ("rivals GPTZero") remains plausible but unproven. No
controlled comparison has been run.

What it would need:
- A frozen, reproducible corpus: roughly 500 AI documents across all 21 models and 500
  human documents across all genres, drawn from what we already hold.
- Estimated cost about £40 against the owner's existing Copyleaks and Originality credits.
  The full 32,000-document corpus would be roughly £1,300 and is not worth it.
- Publish corpus composition, exclusions, confidence intervals and cost.
- Honest risk: they may beat us. Pangram-class accuracy is real. If so, the defensible
  claim becomes "the best free, local, private option" rather than "the best", which is
  still strong and still true.

## 3. Segment-aware model training — DEFERRED (needs a training cycle)

Whole-document segment scoring shipped, and has since been corrected twice. Segments were
originally bounded at 340 *words* on the assumption that always fits the 512-token window; on
dense prose it does not, and 1,348 of 23,318 segments (5.78%) overflowed, affecting 684 of
5,558 documents (12.31%), worst case losing 2,894 tokens from one segment. Segments are now
bounded by *measured* tokens: 0 of 21,093 over the limit, with both implementations agreeing on
5,558/5,558 documents. Contract `segments-v2` on both routes. The measurement is
`implementation/docs/measurements/SEGMENT-TOKEN-FIX.md`.

The 88.5% → 96.2% figures this item was written against are superseded by that report and
should not be quoted; the segmented fp32 Python reference over the full corpus reads 893/922
(96.9%) at 97/4,636 (2.09%) at threshold 0.980 and 877/922 (95.1%) at 56/4,636 (1.21%) at
0.984. The browser runtime's own segmented curve has still never been measured.

But the model itself is still trained only on document openings. A properly segment-aware
model — trained across opening, middle and ending passages — should do better than applying
an opening-trained model to each segment. Naive 120-word windowing was tested and collapsed
detection to 1.8%, so this needs training, not a scoring change.

## 4. Cycle-3 edited-text model — MEASURED, NOT SHIPPED

Built and evaluated in cycle3-edited/. Improves AI-rewrites-of-human from 30% to 46-56% and
rank correlation with true AI share from 0.58 to 0.74. Not shipped because int8 quantisation
costs it 5.2 points of recall (so it cannot run in a browser), stories regress 79.8% to
69.3%, journalism 89.1% to 81.0%, and paragraph-mixed documents regress badly.

Revisit with a quantisation-friendly architecture. The technique that worked — a soft target
of the document's AI word share, saturating at 0.85 — is worth carrying forward.

## 5. Known weaknesses to close, with evidence

- **Corporate communications defeat the transparent scorecard** (35.6% against the neural
  model's 98.9%) and we cannot say why. Unexplained, and unexplained is worse than known-bad.
- **The scorecard's largest single feature is effectively document length** — a real flaw,
  visible only because the model is transparent. First thing a revision should remove.
- **Business reports are data-starved**: 72 held-out rows, AUROC 0.69 against 0.93-0.99
  elsewhere. Clears the floor but must not be quoted as settled.
- **Stories carry the highest human false-positive rate** (6.7%), and the flagged samples
  come from the one source the corpus author flagged as least trustworthy. Data quality or
  model defect, unresolved.
- **Fast-DetectGPT measured 0.545** with a GPT-2-small observer against ~0.93 published.
  That is a floor for the browser-deployable variant, not a refutation of the method.
- **Binoculars was never implemented** (needs two models). The degenerate proxy in our
  records must never be quoted as its score.
- **GLTR's licence is an unclosed gap** in the project's own records.

## 5a. Reconcile the two corpora and settle the threshold — OPEN, and now the priority

This is not a phase-2 deferral. It is an unresolved contradiction sitting under everything the
project publishes, and it was surfaced after the rest of this file was written.

Two corpora tell different stories and have never been reconciled on the deployed model at the
shipped threshold:

- The **held-out long-form corpus** (5,558 documents, 922 AI / 4,636 human) reads 877/922
  (95.1%) detection at 56/4,636 (1.21%) false positives, segmented, fp32 Python reference,
  threshold 0.984.
- The **generated corpus** (28 August 2026, 4,016 usable samples, 21 models, 10 providers)
  reads 5/457 (1.1%) on academic prose and 467/1,244 (37.5%) on articles — but at threshold
  0.8533 on the **superseded cycle-1 model**, so it is not a like-for-like comparison and must
  not be presented as one. Recorded in
  `implementation/services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md`.

What the generated corpus does establish, and what has not been closed: instructing a model to
write in a human voice cost between 12.0 and 60.5 points of detection depending on the model,
with `x-ai/grok-4.6` falling to 0 of 86. Cycle 2 was retrained with human-voice samples
upweighted as hard negatives and reads 269/274 (98.2%) on human-voice prompts at a 2%
false-positive budget — but those held-out samples come from the same generation run, split
group-aware by content hash. **No prompt-style split has been measured on an independent
corpus.** The evasion axis is closed on the distribution the model was trained against and
untested on one it was not.

A reproducible miss on the deployed model is also open: a real 512-word published SEO article
written by GPT-5.6 Sol scored 0.8082 and was not flagged at 0.984, opening section 0.4993, on a
model that is in the training corpus. Reported by a parallel session and not independently
reproduced here.

What this needs:
- Re-score the generated corpus with the deployed cycle-2 model at 0.984, segmented, on both
  shipping runtimes, and publish the result against the held-out figures with denominators.
  **DONE for the fp32 reference runtime, 31 August 2026** — at the shipped pair
  0.9855/0.9763 (not 0.984, which was already superseded when this bullet was written),
  segments-v3, the generated corpus reads 3,758/4,016 (93.6%) overall, 433/457 (94.7%) on
  academic (the register that read 1.1% under cycle 1), and 2,832/2,908 (97.4%) on its
  long-form-comparable subset against the held-out corpus's 883/922 (95.8%). **The corpora
  now tell one story on long-form prose; the contradiction was cycle 1 at 0.8533, not the
  corpora.** `x-ai/grok-4.6` human-voice reads 69/86 (80.2%) where cycle 1 read 0/86. Two
  caveats travel with every figure: 2,568 of the 4,016 rows sit verbatim in cycle-2 splits
  (1,807 in train; hash-independent rows read 1,326/1,448 = 91.6%), and the corpus has no
  human rows, so it contributes no false-positive figure. The browser int8 runtime pass is
  still owed. Evidence:
  [`../measurements/CORPUS-RECONCILIATION-2026-08-31.md`](../measurements/CORPUS-RECONCILIATION-2026-08-31.md).
- Build a prompt-style-labelled corpus the model was not trained against, and measure the
  human-voice split on it. **Still open.** The 31 August re-score does not close it: every
  generated-corpus row, including the hash-independent ones, comes from the generation run
  cycle 2 trained against. The flat style split measured there (plain 92.6%, house-brief
  94.8%, human-voice 93.3%) is an in-distribution result and must not be quoted as evidence
  the evasion axis is closed.
- Owner decision on the threshold: lower it, or retrain. It has been asked and not answered.
  Until then the shipped pair is provisional and must not be written into new material as
  settled. **Still open.**

Until this closes, **no single headline detection rate may be published on any surface.** Any
figure that appears anywhere carries its corpus, threshold, runtime and denominator, and a note
that reconciliation is open.

## 6. Maintenance — the ongoing commitment

Detectors go stale. Our own evidence: the cycle-1 model, trained on 2025 chat data, scored
2.5% on 2026 articles. Plan for a refresh cycle — a few hundred fresh samples per quarter
across current models, retrain, republish the numbers with their dates.

This is also the moat. Every free competitor is stale precisely because nobody maintains
them. A maintained free detector with published measurement dates is something none of them
offer.

## 7. Open-source publication — GitHub DONE, the registries and stores still open

**DONE, 29 August 2026: the public GitHub repository.**
<https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker> is
public and MIT licensed, default branch `main`, tagged `v0.1.0`, `v0.1.1` and `v0.1.2`. Checked
through the GitHub API on 29 August 2026: `private: false`, `visibility: "public"`, last push
`2026-08-29T14:24:59Z`. `git remote -v` in `implementation/` points at that URL. The earlier
statement in this section that the repository had no configured remote and nothing was
published is superseded and must not be restored. The repository excludes third-party clones,
corpora and checkpoints by deliberate decision, not oversight; it is roughly 125 MB against the
programme root's 13 GB.

**Still open, and re-checked against the registries on 29 August 2026 rather than assumed:**

| Surface | Check run | Result |
|---|---|---|
| npm `@opace/content-integrity-core`, `@opace/astro-content-integrity`, `@opace/watermark-lab` | `GET registry.npmjs.org/…` | 404 each — not published |
| PyPI `opace-content-integrity` | `GET pypi.org/pypi/opace-content-integrity/json` | 404 — not published |
| WordPress.org `opace-ai-content-integrity` | `GET wordpress.org/plugins/opace-ai-content-integrity/` | 301 to the directory search page — no listing |
| Chrome Web Store | listing bundle prepared locally | not submitted |
| Astro catalogue | ingested automatically from the npm keyword | blocked behind npm |

The publication order that avoids rework: npm first, because the Astro integration and CLI
depend on it; then the Chrome extension, which has the longest review queue; then WordPress;
then PyPI and the Astro catalogue. Five of the seven npm packages are `0.0.0-private` with
`"private": true`, and publishing means removing that flag deliberately rather than by accident.
The website currently consumes them as vendored tarballs from `vendor/content-integrity/`, so
publishing changes how the site installs them and needs coordinating.

Every store listing must carry the weakness list, not only the headline figures, and while §5a
is open it must not carry a headline figure at all.

## 8. Watermark generation and the standalone lab — PARTLY SUPERSEDED

**The full record now lives in `WATERMARK-NEXT-STEPS.md`, held privately in the programme
directory above this repository.** This section
keeps the original deferral and its reasoning, and records what has changed since.

**Still true.** Only the *detection* half of SynthID-Text is ported. A user cannot watermark their
own text and then detect it, which is much of what made the project that inspired this one
compelling. Porting tournament sampling is the missing piece, and it is the gate on publishing the
standalone repository rather than an enhancement that follows it.

**Newly recorded, and it was not known when this section was written:** tournament sampling needs
next-token distributions, and the lab has no language model. Three options, none free — ship
generation as a demonstration over prepared distributions (~2 days, keeps both the 1.7 MB download
and the no-network promise), bundle a small model (weeks, costs the download size), or call a server
(costs the nothing-is-sent-anywhere promise). The decision taken is the first.
See `WATERMARK-NEXT-STEPS.md` §9 R4.

**Still true.** The lab is decided to get its own repository and has not been split out. The
dependency runs one way only — the lab has no runtime dependencies, makes no network calls, and the
trained classifier never calls it — so the split is clean, at the cost of two releases instead of one
when the maths changes. The watermark check stays built into the checker either way.

**Now decided:** the lab page and any standalone repository build from **one artefact**, with every
claim-bearing sentence exported from the package and layout kept local. Two hand-maintained copies of
a page whose entire value is a precise honesty claim will drift, and a drifted claim does not fail
loudly the way a drifted threshold does — it quietly becomes false. The repository is also decided to
be **named for SynthID**, which forecloses KGW and keyed-Gumbel/EXP.

**Superseded — this section's closing line is no longer accurate.** It said no adversarial robustness
had been measured and that paraphrase, translation round-trips and targeted removal were all
unmeasured. **Paraphrase is now measured**, on our own fixtures under our own demo keys:

> 40 machine rewrites of 12 watermarked passages by two named local paraphrasers. Mean g fell from a
> baseline median of 0.6722 to 0.5088 against a null of 0.500, and **0 of 40 were detected** under the
> lab's own rule (≥40 scored positions, one-sided p < 0.001). Not a length effect: median 180 scored
> positions retained, and a length-preserving control arm leaves detection at 36 of 36. Not meaning
> destruction: median cosine fidelity 0.979 against an unrelated-fixture floor of 0.747, with the
> better-fidelity arm removing *more* signal.

Method, per-passage distributions and limits:
[`../measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md`](../measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md).
Preserved evidence, including all 40 rewrites:
[`../../services/local-engine/research/paraphrase-resilience/`](../../services/local-engine/research/paraphrase-resilience/).

**Still unmeasured, and they must not be filled with anyone else's number:** translation round-trip
and targeted removal. The harness, fixtures and validation procedure are reusable —
`WATERMARK-NEXT-STEPS.md` §9 R8.

## 9. Privacy and legal work the hosted route created — OPEN

The hosted route is live and default, so these are no longer hypothetical.

- **DPIA** — a draft exists as of 29 August 2026, `implementation/docs/legal/DPIA.md` version 0.1, structured against ICO guidance and written by the engineering team. It states plainly that nobody involved is legally qualified and that publishing privacy copy on its strength alone would be a mistake. Qualified review outstanding. Three ICO indicators combine on this route.
- **Published lawful-basis notice** outstanding. The basis is legitimate interests, not
  consent; the ICO warns against consent gates that offer no real choice.
- **Refusal and error paths are unprobed for body logging.** The zero-logging audit covered the
  scoring path only. A 413 and a 429 run different code and neither has been checked.
- **Both deploy-time controls need re-proving on the current revision.** The kill switch and the
  logging probe were verified against `opace-detector-00003-bfq`; the service now runs
  `opace-detector-00004-dlb`. Agent B1 is re-verifying. Neither may be described as proven until
  that lands.

## 10. Paired-transformation corpus — BUILT, 30 August 2026 (data only)

The first work package of the humaniser workstream above is done. It closes the
data half of the brief's §13.6, not the modelling half.

**What it answers.** `HANDOVER.md` §9 item 3 — AI rewrites of a human original
are detected at 30–35% against 95%+ for straight generation — had **no training
data anywhere in the project**. Every AI row in every corpus here is a generation
from a prompt; not one was a transformation of an existing text. The model had
never seen the thing it is worst at.

**Manifest.** `implementation/services/local-engine/research/cycle4-humaniser-pairs/`,
`manifest.json` carries per-file SHA-256. Evidence and full tables:
[`docs/measurements/PHASE-2-PAIRED-CORPUS.md`](../measurements/PHASE-2-PAIRED-CORPUS.md).

| | |
|---|---|
| sources | 600 — 300 AI-origin, 300 human-origin, 247,155 words |
| grid | 2 sides × 5 registers × 3 length bands × 20, exactly balanced |
| paired variants | 1,702 at three intensities (light / medium / heavy) |
| quarantined, preserved | 98 |
| total rows | 2,302 |
| rewriting models | 5 families; 22 generating models represented |
| splits | train 1,103 · heldout_source 372 · heldout_rewriter 370 · heldout_register 457 |
| held out | the **Mistral** rewriting family, the **technical-explainer** register, whole sources |
| cost | **$6.8571** over 2,014 calls |

**Labels.** `ai_original`, `human_original`, `ai_original_neural_rewrite`,
`human_original_ai_edited`, with `edit_intensity` as a separate field.
`ai_original_human_edited` is **empty and validated as forbidden** — an LLM
rewriting prose is not a professional human edit. No row names a commercial
humaniser; none were used.

**Three findings.**

1. **The first intensity taxonomy was wrong and 20 samples caught it.** On the
   verification run, heavy rewrites retained *more* source wording than medium
   (four-gram retention 0.229 against 0.178) because the medium prompt carried
   the stronger lexical instruction. Prompts corrected; both boundaries then
   separated with disjoint interquartile ranges. 500 rows of each would
   otherwise have been generated against a taxonomy that did not hold.
2. **AI editing a human original moves it towards the AI signature**, on the
   project's own dominant axis. A heavy rewrite halves a human passage's
   adjacent-sentence cohesion (0.0481 → 0.0250) and lifts MATTR 0.716 → 0.775
   towards the AI level — from a plain "rewrite this" instruction with no evasion
   intent in the prompt. The human side moves roughly five times as far as the AI
   side, because the AI side is already there. (Jaccard-based cohesion, *not* the
   statistic behind the published 2.1%/6.3% figures; the ordering reproduces, the
   absolute numbers are not interchangeable.)
3. **Rewriting damages protected content, measurably.** Under an explicit
   instruction to preserve names, numbers, quotations, URLs and citations exactly:
   **42.5% of plain copy-edits and 85.7% of heavy rewrites altered at least one**,
   and 48.7% of heavy rewrites changed a number. This is the editorial-integrity
   axis §11 of the brief wants reported separately from authorship, and it now
   has denominators.

**Budget correction, and it matters for the next paid run.** The task was
authorised at $25. The key held **$15.85** of remaining credit when checked, not
$25, and the pool is shared with the concurrent `cycle4-fiction` run. A $7.00
self-cap was set and the run finished at $6.86, leaving roughly $9 for the
concurrent task. **Do not infer the balance from an authorisation figure; query
`/api/v1/key` first**, as §13.6 already warns.

**Deliberately not done — this created data only.** No training, no threshold
change, no deployment, no publication, and **no detector scores**: scoring these
rows needs the segmented harness on a named runtime at a named threshold, and a
truncated whole-text pass would produce a figure with no stated runtime. That is
the obvious next step.

**The corpus's single most important caveat.** Every source overlaps a published
measurement corpus — the AI and human long-form sources are members of the
5,558-document held-out corpus, and the Opace blog passages are members of the
4,368-passage short-form false-positive corpus. It is recorded per row in
`measurement_overlap`. **Any model trained on this data must exclude those
documents from its evaluation set.**

**Still open from §13.2/§13.3 and untouched here:** commercial-humaniser ground
truth, the authorised JustDone pilot, professional human edits, rules-only
transformations and mixed-passage construction. The last two need no paid model
calls and should not consume expiring OpenRouter credit.

---

## 11. What 31 August 2026 measured, and how the next cycle ranks — APPENDED, nothing above rewritten

Appended 31 August 2026. Sections 1–10 stand as written. Where something below supersedes a
figure above, it says which one and leaves the original in place, which is the convention this
programme uses everywhere else.

### 11.1 The retrain was rejected in all four arms, and the ceiling is now measured

The shipped cycle-2 model stays, at the flag pair `0.9855 / 0.9763`. Nothing was deployed and
`thresholds.json` was not touched. Source of record:
[`../measurements/TWO-AXIS-RETRAIN.md`](../measurements/TWO-AXIS-RETRAIN.md) §19 and §20.

| arm | verdict | why |
|---|---|---|
| A, rebalance on the cycle-3 corpus | reject | the free fix, and it fails (§11 of that report) |
| cycle 4a, epoch 1 | reject | best long-form and fiction model this programme has produced, and it misses the project's own quantisation gate at a worst verdict-flip rate of 0.01204 against a limit of 0.01 |
| cycle 4b | reject | 100-word detection worse than the shipped model |
| epoch 0 on the cycle-4 corpus | reject | closes the gate at 0.00741, and collapses 100-word detection to 1/57 |

**The two defects have different causes and the fixes are opposed.** The second training epoch is
what teaches this model short text (38/57 at 100 words on fp32) and it is the same epoch that
sharpens the decision region enough to fail the gate. On this corpus the quantisation gate and the
short-form capability cannot both be had by choosing an epoch. That is measured rather than
argued, and §19.6 of the same report already proved the gate is out of reach of both re-exporting
and re-calibrating.

**The planning fact, and it outlives this model.** Epoch 0 on the cycle-4 corpus fits a
calibration temperature of **1.7137** — cycle 4a's 1.7298, not cycle 3's 1.2095 — with a
probability ceiling of 0.9506 and **0.00% of its 21,093 segments reaching 0.97 on either runtime**.
The compression arrives with the corpus at the first epoch. **Every future cycle trained on this
data inherits it.** A cycle that wants its decision region back has to change the data or the
calibration objective, not the epoch.

**Consequence for the next cycle: calibration spread becomes a training objective, not a
diagnostic read off afterwards.** It is a change to `train.py`'s selection criterion and possibly
to the loss. It reaches the gate, the segment density at the flag point and the stability of the
fitted operating point at once, and it needs no generation and no spend.

### 11.2 A parameter that was inherited rather than fitted changed the verdict on a whole cycle

Recorded in full at [`HANDOVER.md`](HANDOVER.md) §4.9 and repeated here because it is a planning
constraint, not only a retrain anecdote. The secondary flag point had always been carried between
cycles as a fixed ratio of the primary **in probability space**. That ratio is not scale-free: the
same ratio buys a margin gap of 0.4168 on the shipped model and 0.3804 on cycle 4a. Fitting the
gap directly in margin space, under the identical both-routes false-positive constraint, moved
100-word detection from 25/57 to 38/57 and long-form detection from 891/922 to 893/922 on fp32.
Same model, same corpus, same constraint, one parameter fitted instead of assumed.

**Any future cycle that inherits this parameter will reach the same wrong conclusion about a model
that does not deserve it.** Re-fit the primary, the secondary and the gap whenever the model
changes.

### 11.3 The humaniser evidence is worse than the figure this file has been quoting

The **30–35%** figure that appears in §10 above, in `HANDOVER.md` §9 item 3, in `README.md`,
`CAPABILITIES.md`, `PER-MODEL-DETECTION.md` and five package READMEs describes **an LLM asked to
reword a passage**. It has never described a commercial humaniser and must not be read as covering
one. What is measured against commercial tools is much worse, and it is a direct result on the
current build rather than a third-party or old-model number:

| | against the current fp32 build |
|---|---|
| Undetectable.ai | **27 of 28 escaped, 96.4%** |
| StealthGPT | **24 of 25 escaped, 96.0%** |

Source: `research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md` §8, live health rechecked at
`tier3-cycle2`, build `e313ab00de1fffd2`, `segments-v3`. **Read it conditionally.** The
denominator is only sources this build first caught — 28 of 33 — and the eligible-output column
excludes any transformed output below 200 words. It is 96.4% *escape among texts we caught*, not a
96.4% chance of fooling every detector and not a statement that the outputs are human.

Two directly-tested tools that are not in that table:

- **QuillBot's free humaniser failed its one direct test.** A 450-word Claude article at `0.9897`
  came back as three recombined free chunks totalling 331 words, still at `0.9897`, still flagged,
  retaining 39.6% of the original four-word sequences. **One sample is not a rate**, and the free
  quota ended before anything controlled could be run.
- **JustDone is untested.** See §11.6.

### 11.4 What an LLM rewrite actually costs this detector — and why it is not the humaniser answer

The paired corpus built on 30 August (§10 above) has now been scored on the shipped path. Its
"no detector scores" caveat is discharged. Server route, `tier3-cycle2-e5small-fp32.onnx`,
`segments-v3`, shipped pair, harness re-proved against 883/922 and 45/4,636 before any new cut was
taken. Evidence:
[`../measurements/LLM-REWRITE-ROBUSTNESS.md`](../measurements/LLM-REWRITE-ROBUSTNESS.md) and
`services/local-engine/research/humaniser-detection-2026-08-31/fp32-results.md`.

**Of the AI sources this model already catches, rewriting them by LLM removes 24 of 550.**

| | survives the rewrite |
|---|---|
| all strengths | **95.6%** [93.6–97.1] (526/550) |
| light copy-edit | 98.8% (167/169) |
| medium structural paraphrase | 96.4% (187/194) |
| heavy full rewrite | **92.0%** (172/187) |

The other direction — a human original put through an LLM, which is what the 30–35% figure was
always about — reads 1.4% (4/290) at light, 11.0% (33/299) at medium and **21.0% (57/272)** at
heavy.

**Three things must travel with those numbers.** The corpus is short — median 372 words, median
one section per document — so maximum-over-sections has nothing to maximise over and the absolute
rates must never be read against the 95.8% long-form headline. The held-out Mistral rewriter reads
79.3% against training's 72.9%, so there is no generalisation gap here to close. And the light-arm
cells are a lower bound, because 41 `no_change` rows were quarantined and 27 of them have a source
this model already flags.

**A matched-pairs browser comparison agrees, on a partial run.** `onnxruntime-web` WASM, int8
per-channel, same contract and same pair. **1,576 of 2,302 rows** are scored on *both* routes
(`train` 1,103, `heldout_source` 372, `heldout_rewriter` 101); the sweep did not finish and the
remaining 726 rows are still owed, so the absolute levels are not a random sample of the corpus
and must not be quoted as the browser's rate. What the two columns support, because every row in
them was scored twice: the browser is very slightly *more* likely to flag than the server, no cell
differs by more than about a point, **on the heavy band the two routes give the identical figure,
22.5%**, and document-level verdict disagreement is 37/1,576 = 2.3%. **The finding is not a
server-route artefact.** Source: `LLM-REWRITE-ROBUSTNESS.md` §4; replace this paragraph with the
completed sweep rather than quoting it.

**The planning consequence, and it is the one that reorders the options.** A general-purpose model
asked to reword AI prose is a **weak attack**: heavy rewriting still leaves 92% of caught documents
caught. A commercial humaniser escaped 96.4%. The two figures come from different corpora at
different lengths and must not be subtracted from one another — but both are conditional on
sources this build first caught, and the gap between them is an order of magnitude, not a margin.
**Training on more LLM paraphrase does not address a tool escaping 96.4%, because LLM paraphrase is
not the thing that escapes.**

### 11.5 Per-sentence evidence was measured and largely declined

269,732 sentences scored on the fp32 server path over the 5,558-document long-form corpus.
Source: [`../measurements/PER-SENTENCE-RELIABILITY.md`](../measurements/PER-SENTENCE-RELIABILITY.md).

- A single sentence separates the two populations at **AUROC 0.764**, against 0.9695 for whole
  documents — about twenty points of AUROC lost by handing the same model a sentence.
- **57.4% of the sentences inside AI documents score below 0.5** (39,592/68,916). The majority of a
  machine-written document reads human one sentence at a time. Note the denominator: that is all
  AI documents, not only the ones the tool correctly flagged.
- **95.1% of AI documents (877/922) contain no sentence at or above the document flag point.**
  Reusing the document rule at sentence scale would find nothing on nineteen documents in twenty.

**No per-sentence percentage ships.** What ships is an absolute-floor highlight layer, browser
route only, marking passages and ranking them against each other rather than scoring them. The
WASM floor is **0.945**, fitted to a counted human false-mark rate: **25 marked sentences in
200,890 (0.012%)** against 1,292 in 68,916 (1.875%) on the AI side. WebGPU has no counted rate and
stays shut.

### 11.6 JustDone: stopped at the terms boundary, not at a measurement

The §13.3 pilot in the humaniser brief was attempted on 31 August and stopped before any document
was submitted. JustDone's Terms of Use §7 prohibit the access method by four independent clauses —
automated access (7.1.3), commercial use (7.3), systematic retrieval into a database (7.4.1) and
building a competing product (7.4.5). Withholding output from git cures only the third. The
account holder's instruction does not resolve it, because the clauses bind his account.

What exists instead: a proved harness, a 32-document sample selected and hashed from the detected
pool, a validated reference profile of our own paraphrase corpus, and a **12-document manual pack
at `services/local-engine/research/justdone-eval-2026-08-31/manual-run/` awaiting the owner** — his
ten minutes of pasting, no automated access, no spend. Record:
[`../measurements/JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md`](../measurements/JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md).

**Owner decision, 1 September 2026: deferred to the Phase 2 lane**, together with the
commercial-humaniser subscriptions decision at §11.7 below. Both were removed from TASK-BOARD.md's
"waiting on the owner" list on the same date — they remain real open decisions, just not ones being
chased against the current phase.

The clean route to a real pilot is a written evaluation licence, which clauses 7.3 and 7.4.1 both
contemplate and which costs a support email.

### 11.7 The next cycle's options, ranked on measured expected value

Ranked by what the numbers above support, not by appeal.

**First — calibration spread as a training objective.** It is the only lever that reaches the
quantisation gate, the segment density at the flag point and the stability of the fitted operating
point at once (§11.1). The evidence that it is the binding constraint is direct: the gate moves
from 0.01204 to 0.00741 across one epoch, the temperature is set by the corpus at the first epoch,
and 4,005 of 21,093 segments sit within 0.10 margin of cycle 4a's flag point against 572 of 21,093
for the shipped model. It costs compute on data already held: no generation, no subscriptions, no
owner decision. And it has something waiting for it — cycle 4a is ahead of the shipped model on
long form on both routes (893/922 and 906/922 against 883 and 889), inside both false-positive
budgets, better on fiction and on academic discussion, and it cannot ship. This option converts a
measured gain into a shippable one.

**Second — genuine commercial-humaniser output.** It is the only thing that addresses the 96.4%,
and §11.4 is why: the data we hold is a 92%-survivable attack and the measured problem is a
96.4%-escaping one. Its cheapest first step is free and already prepared — the owner's twelve
documents (§11.6). Beyond that it needs paid subscriptions across the §13.2 roster and, for
JustDone specifically, a written licence position; both are owner decisions and neither can be
taken by an implementer. It ranks second not because it matters less than the first but because it
cannot be started unilaterally, and because a corpus obtained without a licence position would be
unusable in a published result.

**Owner decision, 1 September 2026: the £20–50/month commercial-humaniser subscriptions decision is
deferred to the Phase 2 lane**, alongside the JustDone manual pack at §11.6 above. Removed from
TASK-BOARD.md's "waiting on the owner" list on the same date; still an open decision, not an
abandoned one.

**Third — more of the same LLM-paraphrase data.** Lowest measured value of the three. Heavy
rewrites of AI originals are still caught 92.0% of the time, and the held-out rewriting family
reads *above* the training families, so there is no visible generalisation gap for more rows to
close. The existing 1,702 pairs remain the right data for "someone asked a chatbot to reword this",
which is a real user story, and they are already built and paid for. Generating more of them is
not.

**Not ranked, because it answers a different question.** Professional human edits, rules-only
transformations and mixed-passage construction serve the §11 provenance taxonomy rather than the
escape problem. The last two need no paid model calls and should not consume expiring OpenRouter
credit.

### 11.8 What this model can and cannot be expected to do — stated so it is not written as a plan

The shipped classifier is a fine-tuned `e5-small`: **33 million parameters**, trained on tens of
thousands of documents, exported once and refreshed on a quarterly cycle at best. Undetectable.ai
and StealthGPT are commercial products whose entire business is defeating detectors, retrained
continuously against a fleet of them.

**A static 33M checkpoint on a corpus of this size will not hold a durable lead over a tool that
retrains against it.** Any plan that reads "the next cycle will detect humanised text" is an
aspiration written as a plan and should be rejected at review. What the evidence does support:

- **Raise the cost of evasion, and measure it.** Every escape route measured so far damages the
  text. 42.5% of plain copy-edits and 85.7% of heavy rewrites altered at least one protected span
  under an explicit instruction not to; 48.7% of heavy rewrites changed a number (§10 above).
- **Report editorial damage on its own axis**, where it is a finding about the document rather
  than a claim about its author, and where the tool has denominators nobody else publishes.
- **Say what is not covered.** A published escape rate against a named tool, on a named date, with
  its denominator, is more useful to a reader than a headline detection rate that quietly excludes
  the attack they are worried about.

Two mechanisms are already ruled out and should not be re-proposed: ordinary double spacing
produces identical token IDs and an identical score, and sparse typos moved the median probability
by −0.0002 across 33 texts.

### 11.9 A finding recorded, and its evidence document outstanding

A standalone rule-tell panel was measured and rejected on 31 August: a small number of rules clear
a defensible interval bar, on a typical draft the median number that fire is zero, and merged with
the shipped 18-phrase panel the union reaches a minority of AI documents at a real cost in human
ones. The highest-ratio rules are markdown furniture and are excluded, which is consistent with
`stripped-eval`'s existing result that the rule tier falls from AUROC 0.9302 to 0.7108 once
markdown is normalised.

**The per-rule figures for this are not in the repository at the time of writing and are therefore
not quoted here.** They were reported to this update and could not be traced to a measurement
document, a results file or a script. Do not quote a number for this finding until its evidence
document exists; the decision — **no standalone rule panel ships** — stands on the stripped-eval
result and on §4 of the humaniser brief (45.1% detection at 24.8% human false positives), both of
which are recorded.

### 11.10 One figure this update refused

`JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md` carries a section headed "Correction to a figure in
the brief", stating that the project's published **2.1% machine against 6.3% human**
adjacent-sentence figures are wrong and should read 1.66% and 4.85%. **That correction is not
accepted and must not be propagated.** The 2.1/6.3 pair is *content-word* overlap between
neighbouring sentences, measured on the provider-eval corpus in `SIGNAL-SCIENCE.md` ("Eight of those ten are one
signal"). The 1.66/4.85
pair is *Jaccard* overlap measured on the `cycle4-humaniser-pairs` sources. Different statistic,
different corpus. `PHASE-2-PAIRED-CORPUS.md` §6 already warns in terms that the two "are not the
same statistic and must not be quoted as those". The ordering reproduces; the absolute numbers were
never interchangeable. This is the third time in two days a "correction" here has turned out to be
a comparison between two different measurements, and it is worth naming as a recurring failure
mode rather than a one-off.

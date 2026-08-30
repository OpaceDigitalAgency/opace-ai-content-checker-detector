# PHASE 2 — deferred work, deliberately not done in phase 1

Current as of 29 August 2026, 17:00. Reconciled against the live server, the live site, the
GitHub API and the package registries on that date; evidence per claim in
`.agent/docs/ai-content-integrity/DOC-RECONCILIATION-2026-08-29.md`.

Read this alongside OBJECTIVE.md (the binding target) and BRIEF.md (the standing intent).
Everything here was consciously deferred, not forgotten. Each item states why. Items that
have since been done are marked **DONE** and keep their original reasoning, so the record of
why they were deferred survives the fact that they no longer are.

**New dedicated workstream, 30 August 2026:** commercial-humaniser robustness,
multi-class edit provenance and independent editorial-damage assessment now have
a self-contained execution brief in
[Phase 2: Humaniser-aware detection and edit provenance](.agent/docs/ai-content-integrity/PHASE-2-HUMANISER-AWARE-DETECTION-AND-EDIT-PROVENANCE.md).
It is part of Phase 2 but does not replace the wider deferred-work register in this file.

**Second dedicated workstream, 30 August 2026:** the watermark tool — its accuracy, its claims, its
competitive position and everything still missing from it — has a self-contained execution brief in
[Watermark tool: full history, current state and next steps](WATERMARK-NEXT-STEPS.md).
It is written for an implementer with no prior knowledge of this programme and carries the verified
provider facts, the measured attack results, the six decisions taken, and a priority-ordered roadmap
R1–R12 including image and media provenance. **§8 below is now a pointer into it rather than the
record itself.**

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
- Build a prompt-style-labelled corpus the model was not trained against, and measure the
  human-voice split on it.
- Owner decision on the threshold: lower it, or retrain. It has been asked and not answered.
  Until then 0.984 is provisional and must not be written into new material as settled.

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

**The full record now lives in [`WATERMARK-NEXT-STEPS.md`](WATERMARK-NEXT-STEPS.md).** This section
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
`.agent/docs/ai-content-integrity/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md`. Preserved
evidence, including all 40 rewrites: `.agent/docs/ai-content-integrity/evidence/paraphrase-2026-08-29/`.

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
[`implementation/docs/measurements/PHASE-2-PAIRED-CORPUS.md`](../implementation/docs/measurements/PHASE-2-PAIRED-CORPUS.md).

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

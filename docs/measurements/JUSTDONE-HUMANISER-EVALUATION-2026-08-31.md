# JustDone humaniser evaluation — stopped at the terms boundary

**Date:** 31 August 2026
**Status:** **Not measured.** The remote half of this evaluation was not run.
**Harness proof:** PASS — all four recorded figures reproduced exactly.
**Scope of what follows:** a harness proof, a selected and recorded sample, and a
reference profile of our own paraphrase corpus. No JustDone output was obtained,
so neither of the two questions the evaluation was set has a measured answer.

## Summary

The evaluation was to take AI documents the shipped model currently detects, run
them through JustDone's humaniser, and rescore, to answer (1) how much detection
is lost and (2) whether JustDone's output resembles the `cycle4-humaniser-pairs`
LLM-paraphrase corpus we would otherwise train on.

Work stopped before any document was submitted. JustDone's Terms of Use prohibit
the access method this evaluation requires, in terms that are not ambiguous and
not curable by working slowly or by withholding the output from the repository.
The account holder's instruction does not resolve it, because the clauses bind
**his** account and the breach would be committed in his name.

What was completed instead is everything that does not touch their service: the
harness is proved, the sample is selected and hashed, and the reference
distribution the comparison would have been made against is computed and
validated. If access is obtained on a lawful footing, the remaining work is one
script run.

## Why it stopped

JustDone's Terms of Use (`justdone.com/legal/terms-of-use`, last updated
17.07.2023, read 31 August 2026), section 7, contains four separate clauses each
of which independently covers this evaluation:

- **7.1.3** — the user warrants they will not access the Service
  "through automated or non-human means, whether through a bot, script or
  otherwise". Driving their web app through browser automation is exactly and
  only this. Working at human pace does not help: the objection is to the agent,
  not the rate.
- **7.3** — the Service may not be used in connection with commercial endeavours
  unless specifically endorsed by them. This is commercial R&D for a product
  Opace sells.
- **7.4.1** — no systematic retrieval of content from the Service to compile a
  collection or database without written permission. The brief asks for the
  paired texts to be kept as a reproducible corpus.
- **7.4.5** — no use of the Service to create a product that is directly or
  indirectly competitive with, or a substitute for, it. JustDone sells an AI
  Detector; the stated purpose here is to aim the next training cycle of ours.

The brief anticipated a terms problem and instructed that nothing breaching them
be committed. That instruction addresses 7.4.1 only. Withholding the raw output
from git does not cure 7.1.3, 7.3 or 7.4.5, because those attach to the act of
using the service, not to what is published afterwards.

### The free tier would very likely not have produced a valid sample anyway

Independent of the terms, `research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`
records a prior direct attempt. The public teaser returned 75 words from a
450-word article, discarding most of the input before the paid boundary, and the
result is logged there as an **invalid bypass result** for that reason. A
cancelled account on free-tier limits is the same boundary. A 20–40 document
sample was unlikely to be reachable even had the terms permitted it, and a
truncated-output sample would not have answered either question.

## What was completed

### 1. Harness proof — PASS

Before trusting any new number, the shipped path was made to reproduce recorded
figures. Path: `tier3-cycle2-e5small-fp32.onnx`, `segments-v3`, temperature
0.8324, minimum-evidence pair **0.9855 primary / 0.9763 secondary**, fp32
CPUExecutionProvider, onnxruntime 1.29.0. Full precision throughout — the 4 dp
segment store rounds 884/922 where the truth is 883/922.

| check | reproduced | recorded target | |
|---|---|---|---|
| model sha256 | `e313ab00de1fffd2…` | `e313ab00de1fffd2` | MATCH |
| long-form AI detected | 883/922 | 883/922 | MATCH |
| long-form human FP | 45/4636 | 45/4636 | MATCH |
| human `story` FP | 23/260 | 23/260 | MATCH |
| human `academic-discussion` FP | 8/420 | 8/420 | MATCH |

**All four recorded figures reproduce exactly.** Run time 3,255s over 5,558
documents. Script: `research/justdone-eval-2026-08-31/prove_harness.py`, log
`proof.log`, full-precision segment scores `proof-segments.jsonl`.

Human false-positive rate by register, reproduced at the shipped pair:

| register | FP | | register | FP |
|---|---|---|---|---|
| academic-conclusion | 7/360 = 1.94% | | longform-journalism | 3/840 = 0.36% |
| academic-discussion | 8/420 = 1.90% | | research-summary | 0/189 = 0.00% |
| academic-introduction | 1/420 = 0.24% | | **story** | **23/260 = 8.85%** |
| academic-lit-review | 0/225 = 0.00% | | student-essay | 0/420 = 0.00% |
| company-update | 1/662 = 0.15% | | white-paper | 2/840 = 0.24% |

`story` is the weak register by an order of magnitude, which is worth holding in
mind when reading any future humaniser result on the four fiction documents in
the sample: a score move there starts from a noisier baseline than elsewhere.

### 2. Sample selected, recorded, and ready

32 documents, all of which the shipped model **currently detects** at the
shipped pair, 4 from each of the 8 long-form registers, stratified short-to-long
on word count within each register.

| register | word counts |
|---|---|
| academic-discussion | 649, 1542, 1991, 2782 |
| academic-essay | 450, 1616, 2267, 3061 |
| academic-lit-review | 501, 1484, 2105, 2981 |
| company-update | 676, 1099, 1287, 2199 |
| longform-journalism | 747, 1649, 2157, 2932 |
| research-summary | 608, 1031, 1259, 1994 |
| story | 646, 1630, 2038, 2789 |
| white-paper | 542, 1598, 2394, 3039 |

Range 450–3061 words, median 1630, 53,743 words total. Drawn from a detected
pool of 883/922. Manifest with per-document sha256 and full-precision segment
scores: `sample-manifest.jsonl`; texts under `sample-texts/`.

### 3. Reference profile of the LLM-paraphrase corpus

`profile_transformations.py` computes the five named measures over
`cycle4-humaniser-pairs/pairs.jsonl` (1,702 pairs). Metric implementations are
imported from that corpus's own `measure.py` rather than reimplemented, and the
script is driven by `--pairs`, so the identical code would profile any future
commercial-humaniser pairs. A comparison whose two sides were measured by
different code would not be a comparison.

By edit intensity (means):

| intensity | n | adj. cohesion src → out | TTR src → out | sent len out | sent sd out | 4-gram retention |
|---|---|---|---|---|---|---|
| light | 548 | 4.01% → 3.97% | 0.580 → 0.583 | 23.8 | 12.5 | 0.872 |
| medium | 593 | 3.92% → 3.06% | 0.582 → 0.626 | 23.7 | 11.5 | 0.299 |
| heavy | 561 | 3.83% → 2.25% | 0.589 → 0.666 | 22.2 | 10.1 | 0.149 |

**This profiling code is itself validated.** Split by side and intensity it
reproduces the medians recorded in `PHASE-2-PAIRED-CORPUS.md` to 4 dp:

| class | intensity | cohesion (here) | cohesion (recorded) |
|---|---|---|---|
| `ai_original_neural_rewrite` | light | 0.0159 → 0.0165 | 0.0159 → 0.0164 |
| `ai_original_neural_rewrite` | heavy | 0.0169 → 0.0121 | 0.0169 → 0.0121 |
| `human_original_ai_edited` | heavy | 0.0481 → 0.0253 | 0.0481 → 0.0250 |

(Cell counts differ by one row in three cells — rows lacking either text are
skipped here. MATTR reproduces likewise: 0.7162 → 0.7750 against a recorded
0.7159 → 0.7750.)

Punctuation, per 1000 words, source → output across all 1,702 pairs: commas
59.1 → 67.4, em-dashes 2.12 → 2.94, semicolons 2.06 → 2.50, periods 63.0 → 59.9.
LLM paraphrase commas up and sentences longer, a mild and unremarkable drift.

Unicode audit of our own LLM output, as the baseline any JustDone result must be
read against: 2 of 1,702 documents carry invisible characters (9 total), 3 carry
Cyrillic/Greek Latin-lookalikes (261 total, consistent with genuine non-English
content rather than substitution), no unusual whitespace, 59 double-space runs.
**A JustDone result would only be adversarial if it exceeded this floor.**

### A correction that was itself wrong — withdrawn 31 August 2026

**This section previously claimed that "~2.1% machine prose against ~6.3% human"
was wrong and should read 1.66% and 4.85%. That claim is withdrawn: both pairs
are correct, and they measure different things on different corpora.**

- **1.66% / 4.85%** are *Jaccard* adjacent-sentence overlaps on the
  `cycle4-humaniser-pairs` sources, and reproduce `PHASE-2-PAIRED-CORPUS.md` §6
  exactly.
- **2.1% / 6.3%** are *content-word* overlaps on the provider-eval corpus, from
  `signal-science/SIGNAL-SCIENCE.md` §2, and are what the published research
  pages cite.

Different statistic, different population. `PHASE-2-PAIRED-CORPUS.md` §6 already
warns against placing them side by side, and this section did exactly that.

Acting on the original wording would have replaced a correct published figure
with one measured on another corpus — the failure this programme spent
31 August correcting, arriving from the opposite direction. **Name the statistic
and the corpus whenever either pair is quoted.**

## The two questions

**1. How much detection is lost?** No measured answer. Denominator 0/32. The
nearest existing evidence, from the competitor study and not from this run, is
that against this same build strong humanisers reached conditional long-form
escape of 96.4% (Undetectable.ai) and 96.0% (StealthGPT), on 27 of 28 texts the
detector first caught — a small, dated corpus that excluded JustDone. JustDone's
paid mode remains unmeasured against Opace, as it was before this attempt.

**2. Does JustDone's output resemble our corpus?** No measured answer. The
reference side is now computed and validated, so this reduces to profiling the
JustDone side with the same script and comparing.

## Judgement on the training data

The question the evaluation was meant to settle — is `cycle4-humaniser-pairs` the
right adversary — cannot be settled without the measurement. Two things can be
said without it, and neither is a substitute for running it:

- The corpus is **honest about its own gap**. Its README states plainly that no
  commercial humaniser was used, `commercial_humaniser` is `false` on every row,
  and `transformation_family` is `generic_llm_rewrite`. The risk that it aims at
  the wrong adversary is already documented, not newly discovered here.
- Its heavy arm moves text along **the axis the competitor study identified as
  the measured Opace-specific weakness** — reduced vocabulary variety and
  restored adjacent-sentence cohesion (heavy: 4.85% → 2.53% on the human side,
  MATTR 0.716 → 0.775). That is the same direction recorded for products that
  escape the detector. It is suggestive that the corpus is at least pointed the
  right way. It is not evidence that its *magnitude or manner* matches a
  commercial humaniser, and that is precisely what was not measured.

My judgement: **proceed with the existing corpus for the next cycle if the cycle
cannot wait, but do not treat the adversary question as answered.** The corpus is
defensibly aimed and it fills a gap the project has no other data for. The
unmeasured risk is that commercial humanisers transform in a different *kind* —
targeted synonym substitution against known detector features, or character-level
tricks — which a generic LLM rewrite would never produce and training on it would
never teach. Note that the competitor study already rules out two candidate
mechanisms: double spacing produced identical tokenizer IDs and an identical
score, and sparse typos moved the median probability by −0.0002 over 33 texts.

## Getting the measurement lawfully

In rough order of cleanliness:

1. **Ask JustDone for written permission or an evaluation licence.** Clauses
   7.4.1 and 7.3 both contemplate exactly this (written permission; specific
   endorsement). A research-access request naming the purpose is the clean route
   and costs a support email.
2. **A paid plan with documented API access**, if one exists, which would remove
   the 7.1.3 automation objection. It would not by itself remove 7.3 or 7.4.5 —
   those need permission.
3. **Published humaniser-output datasets** (the DAMAGE survey corpus,
   HumanizerBench data) — already cited by the competitor study, no terms
   exposure, but not JustDone-specific and not current.
4. **The owner running a handful by hand as an ordinary user.** This clears
   7.1.3 only. Commercial purpose and competitive development still apply, so it
   is not a route I would recommend without permission in hand.

Route 1 is worth pursuing regardless: a permitted evaluation could be run
properly at 20–40 documents instead of scraped against a free-tier boundary that
already invalidated one attempt.

## Files

Under `services/local-engine/research/justdone-eval-2026-08-31/`:

| file | what |
|---|---|
| `prove_harness.py`, `proof.log` | harness proof, shipped path, shipped pair |
| `proof-segments.jsonl` | full-precision segment scores, 5,558 documents |
| `select_sample.py`, `sample-manifest.jsonl` | the 32 selected documents, hashed |
| `sample-texts/` | the 32 source texts |
| `profile_transformations.py` | profiler, `--pairs`-driven, reusable for both sides |
| `reference-profile-llm-paraphrase.json` | our corpus profiled, overall / intensity / register |
| `reference-profile-llm-paraphrase-per-pair.jsonl` | per-pair scalars |

Nothing was obtained from JustDone, so nothing from them is stored or committed.
No account setting was changed, no payment detail entered, no consent dialog
accepted; the only pages loaded were their public homepage and terms.

## Honest limits

- This is not a corpus measurement of a humaniser. It is a blocked evaluation
  plus the local groundwork.
- The sample of 32 was never run against anything. When it is, 32 documents
  supports a direction and a wide interval, not a rate: an observed escape of
  30/32 carries a 95% Wilson interval of roughly 82–100%, which would not
  distinguish "most" from "nearly all".
- The harness proof is complete and passed on all four recorded figures, so the
  scoring path is trustworthy. That says nothing about the humaniser question,
  which remains unmeasured.
</content>
</invoke>

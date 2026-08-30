# The most popular evasion instruction, measured twice, and what changed between

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/write-like-a-human/`

---

## The finding

"Just tell it to write like a human" is the single most common thing people say about defeating
detectors. Against the model this project shipped in mid-2026, it worked: detection fell by 83% in
relative terms, and one model went from being caught a quarter of the time to being caught never.

Against the model that ships now, measured on documents from a generation run it had no part in,
the same instruction is worth about two points on long-form prose. On the same documents truncated
to their first 512 words, it is worth ten and a half.

The mechanism is the interesting part. Instructing a model to avoid repeating itself makes it
under-repeat harder, and under-repetition is the strongest single signal separating machine prose
from human prose. The evasion that beats rule-based detection makes the real signal clearer.

---

## Provenance

Three measurements, at three operating points on two models. They are kept apart below and must not
be merged into one table.

| strand | detector | operating point | corpus |
|---|---|---|---|
| (a) history | `tier3-e5small-int8-perchannel.onnx`, **retired cycle-1** | 0.8533 and 0.857, **both retired** | 4,016 articles, 21 models, 106 topic prompts |
| (b) in-distribution | cycle-2, held-out split | a 2% false-positive budget | 734 held-out samples from the same generation run |
| (c) independent | `tier3-cycle2-e5small-fp32.onnx`, fp32 Python `onnxruntime` | **0.984 single threshold — not the shipped pair** | 654 machine-written documents that appear nowhere in the cycle-2 dataset |

Sources: `docs/MEASURED-FINDINGS.md` §1 and
`services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md` for (a);
`cycle2-train/CYCLE2-REPORT.md` for (b);
`services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt` §3 and
`.agent/docs/ai-content-integrity/CORPUS-RECONCILIATION-2026-08-29.md` §3 for (c). Corroboration
from `signal-science/SIGNAL-SCIENCE.md` §2.5.

The three prompt styles are constant across every strand. **plain**: write the article.
**house-brief**: write the article to a house style guide. **human-voice**: write the article, and
write like a human.

---

## (a) The version where it worked, and it is history

4,016 articles generated across 21 models, same 106 topic prompts and same registers on every model,
with only the instruction changing. Scored with the model that shipped at the time.

| prompt style | n | detected @ 0.8533 | detected @ 0.857 (shipped at the time) |
|---|---|---|---|
| plain | 1,307 | 55.9% (731/1,307) | 21.0% (275/1,307) |
| house-brief | 1,338 | 44.7% (598/1,338) | 13.1% (175/1,338) |
| human-voice | 1,371 | **19.8% (272/1,371)** | **3.5% (48/1,371)** |

A 36.1-point fall at the comparison threshold, and a 17.5-point fall at the shipped one, which is an
83% relative drop. The house-style brief sits between the two and much closer to plain, so what did
the damage was the explicit anti-detection instruction rather than prompt sophistication in general.

Per model it went further. `anthropic/claude-fable-5` fell from 70.5% (31/44) to 10.0% (5/50).
`x-ai/grok-4.6` fell from 29.3% (24/82) to **0 of 86**. One model of the 21 stayed above 50% under
an anti-detection prompt.

**Retired model, retired thresholds.** Both 0.8533 and 0.857 belong to a checkpoint that no longer
runs, and whose scores span 0.1427 to 0.8582 — it could not clear any current flag point under any
circumstances. This strand is published as the "before" and must be labelled as history wherever it
appears.

## (b) The version that is true and weak on its own

The cycle-2 model was trained with human-voice samples deliberately upweighted as hard negatives. On
held-out samples at a 2% false-positive budget it reads:

| prompt style | n | superseded model | cycle 2 |
|---|---|---|---|
| plain | 184 | 28.3% (52/184) | 97.8% (180/184) |
| house-brief | 276 | 14.5% (40/276) | 97.1% (268/276) |
| human-voice | 274 | 5.8% (16/274) | **98.2% (269/274)** |

That looks like a complete answer and it is not one. Those held-out documents come from the same
generation run, split group-aware by content hash. The model was trained to handle exactly that
distribution. The evasion axis was closed on the distribution it was trained against, and untested
on one it was not.

## (c) The measurement that had never been done

The independent set is the 654 machine-written long-form documents whose normalised text appears
nowhere in the cycle-2 dataset: not in train, not in calibration, not in test. They carry a prompt
style label from generation and are balanced by construction, 207 / 224 / 223, across 13 models from
8 providers.

**fp32, maximum-over-sections, threshold 0.984. This is not the shipped operating point.** Wilson
95% intervals.

| prompt style | n | fp32 server | int8 browser |
|---|---|---|---|
| plain | 207 | 200 = **96.6%** [93.2–98.4] | 201 = 97.1% [93.8–98.7] |
| house-brief | 224 | 209 = **93.3%** [89.2–95.9] | 209 = 93.3% [89.2–95.9] |
| human-voice | 223 | 211 = **94.6%** [90.8–96.9] | 211 = 94.6% [90.8–96.9] |

Instructing a current model to write like a human costs **2.0 points** of detection on long-form
prose, not thirty to sixty. The three intervals overlap heavily and human-voice is not even the
weakest style: house-brief is, by 1.3 points, and that difference is inside the noise too.

Per model, `x-ai/grok-4.6` — the model reported at 0 of 86 in strand (a) — reads **27 of 28 = 96.4%**
on human-voice prompts here. The worst human-voice cell belongs to `meta-llama/llama-4-maverick` at
12 of 17 = 70.6%, on a denominator too small to carry a rate.

### The catch, and it is a length interaction

These are long documents, median 1,611 words. Truncate the same 654 documents to their first 512
words and the penalty comes back.

| prompt style | full document | first 512 words |
|---|---|---|
| plain | 200/207 = 96.6% | 187/207 = **90.3%** |
| house-brief | 209/224 = 93.3% | 187/224 = **83.5%** |
| human-voice | 211/223 = 94.6% | 178/223 = **79.8%** |

At full length the human-voice penalty against plain prompting is 2.0 points. At 512 words it is
**10.5 points**. The evasion axis is closed for long documents and open for short ones. That is a
length interaction rather than a style collapse, and it is the honest description of what changed
since strand (a).

## Why the instruction backfires

Measured from an entirely different direction, on feature statistics rather than detector outputs:

| prompt style | n | vocabulary variety (AUROC) | adjacent-sentence cohesion (AUROC) | any markdown (AUROC) |
|---|---|---|---|---|
| plain | 1,365 | 0.904 | 0.791 | **0.861** |
| house-brief | 1,421 | 0.921 | 0.789 | 0.868 |
| human-voice | 1,455 | 0.916 | **0.879** | **0.768** |

These are feature separations over thousands of documents, not detector outputs, so no operating
point applies and none is printed.

Adjacent-sentence cohesion is the joint-strongest interpretable signal anywhere in this project, and
telling a model to write like a human makes it **stronger**, from 0.791 to 0.879. Machine prose
already repeats itself less than human prose does; instructing a model not to sound repetitive makes
it under-repeat harder, which is precisely the behaviour that gives it away.

The instruction does suppress the formatting signal, from 0.861 to 0.768. So it works against
detectors that read layout, and against a detector that reads how much a text repeats itself, it
points the wrong way.

---

## What this does not prove

- **Strand (c) is at 0.984, not the shipped `0.9855 / 0.9763` pair**, and it has never been re-cut
  there. The re-cut is cheap and should be done before this page is published in a headline
  position. Until it is, the three rates must carry their threshold in the same sentence.
- **The 654-document subset is not "the corpus".** It is the independent subset defined by the
  contamination analysis: 268 of the 922 machine-written documents (29.1%) appear in the cycle-2
  dataset, 168 of them in the training split. Using the independent subset is the correct call for
  this question, and the page should explain why rather than presenting it as the whole corpus. For
  comparison, the same split on the contaminated subset reads 83/87, 82/86 and 92/95, all within a
  point and a half of each other.
- **The three styles are not evenly sized** (207 / 224 / 223) and the differences between them are a
  few points. A two-point gap on these denominators must not be over-read.
- **One generation run, three prompt styles, one detector.** This does not measure a determined
  evader who iterates against the tool, a commercial humaniser service, or paraphrase. Rewrites are
  this tool's weakest case and are a separate question.
- **Strand (a) is not a claim about today.** Retired model, retired thresholds, and the corpus it
  was measured on is 94.8% present in the cycle-2 training data, so re-scoring it on the current
  model would measure memorisation rather than accuracy. It cannot be updated in place; it can only
  be labelled.
- **Strand (b) is in-distribution by construction** and is reported for that reason.

---

## Charts this page needs

**1. New, and this is the page's headline: the three prompt styles on independent documents.**
Three bars with denominators printed on them, Wilson intervals drawn.

- plain 200/207 = 96.6% [93.2–98.4]; house-brief 209/224 = 93.3% [89.2–95.9]; human-voice
  211/223 = 94.6% [90.8–96.9].
- Subtitle must carry: 654 machine-written documents independent of every cycle-2 split, fp32,
  maximum-over-sections, **threshold 0.984 — not the shipped pair**.
- Source: `corpus-reconciliation-2026-08-29/analysis.txt` §3.

**2. New: the length interaction.** The same three styles plotted twice, full document against first
512 words, as a slope chart.

- plain 96.6% → 90.3%; house-brief 93.3% → 83.5%; human-voice 94.6% → 79.8%. Denominators 207 / 224
  / 223 throughout.
- Source: `CORPUS-RECONCILIATION-2026-08-29.md` §3.

**3. The historical collapse — the chart exists and is self-labelled superseded.**
`docs/assets/charts/prompt-style-ablation.svg` plots 55.9 / 44.7 / 19.8 at 0.8533 and 21.0 / 13.1 /
3.5 at 0.857. It is usable **only** inside a clearly historical section, with the retired model and
retired thresholds named in the surrounding copy as well as in the chart's own subtitle.

**4. Optional: why it backfires.** Grouped bars of AUROC by prompt style for the two signals that
move in opposite directions.

- adjacent-sentence cohesion 0.791 / 0.789 / 0.879; any markdown 0.861 / 0.868 / 0.768.
  n = 1,365 / 1,421 / 1,455. Chance line at 0.500, and a note that these are feature statistics with
  no operating point.
- Source: `SIGNAL-SCIENCE.md` §2.5.

---

## Rewrite liabilities (not body copy)

- **The re-cut at the shipped pair is outstanding.** When it is done, strand (c)'s table and chart 1
  are both replaced, and the threshold caveat comes out of three places in the body.
- **cycle-4a** is measured and not shipped, at a refitted pair `0.959674 / 0.950715` and temperature
  1.7298. It moves 100-word detection from 19.3% to 77.2%, which is the axis this page's length
  interaction lives on. If it ships, the "open for short documents" half of the finding needs
  re-measuring before it is repeated.
- The per-model cells in strand (c) sit on denominators between 1 and 42. None carries a rate above
  and none should.

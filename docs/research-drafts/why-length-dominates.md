# Why length dominates detection

**Draft for build. Body copy begins at "The finding". Everything under "Notes for the builder" is
production instruction and must not be published.**

| | |
|---|---|
| Proposed URL | `/tools/ai/content-verification-integrity/research/detection-and-document-length/` |
| Working title | Detection is mostly a question of length, and the cliff is below 200 words |
| Draft status | figures re-verified against source 30 August 2026; see the provenance table at the foot |
| Primary source | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` Tables 1 and 2 |

---

## The finding

How much text you paste in changes the answer more than which model wrote it, what register it is
in, or anything else we have measured. Between 100 and 199 words the detector flags **29 of 172
machine documents, 16.9%**. Across the whole long-form corpus it flags **883 of 922, 95.8%** — and
that corpus has a median document length of 1,612 words. The headline figure is a long-document
figure, and it should be read as one.

## The measurement conditions, which apply to every figure on this page

| | |
|---|---|
| Detector | cycle-2, `tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d` — the fp32 parent of the shipped int8 browser artefact, and the file the EU inference server runs |
| Operating point | the shipped pair: flagged when the strongest section reaches **0.9855**, or the second-strongest reaches **0.9763**, applied to the temperature-calibrated probability at T = 0.8324 |
| Pipeline | `segments-v3` token-bounded segmentation; the reported document probability is the maximum across sections |
| Runtime | Python `onnxruntime` 1.29.0, CPU, fp32. This is the reference-server scoring path and **not** a browser measurement |
| Measured | 30 August 2026 |

Two corpora cover the word-count range and they are never pooled into one cell, because they were
generated differently, by different models, in different registers. The **short-form** corpus is 816
machine passages generated on 29 August 2026 from `openai/gpt-5.6-sol` and `openai/gpt-5.6-luna`
across four target lengths and three prompt styles, plus 4,368 human passages from nine sources. The
**long-form** corpus is the 5,558-document set of 28 August 2026: 922 machine documents across 13
models, 4,636 human documents from eight sources. Bands were chosen from the corpora's own
word-count distributions rather than from round numbers.

Every figure below is at that one operating point, on that one detector, through that one runtime.
Where an older figure is quoted for contrast, its own operating point is named beside it.

## The curve

| words | corpus | machine flagged | detection rate [95% CI] | human wrongly flagged | false-positive rate [95% CI] |
|---|---|---:|---|---:|---|
| under 100 | short-form | 6/27 | n below 30, no rate quoted | 0/388 | 0.0% [0.0–1.0] |
| 100–199 | short-form | **29/172** | **16.9%** [12.0–23.2] | 0/732 | 0.0% [0.0–0.5] |
| 200–299 | short-form | 16/19 | n below 30, no rate quoted | 3/822 | 0.4% [0.1–1.1] |
| 300–399 | short-form | 193/228 | 84.6% [79.4–88.8] | 9/1,170 | 0.8% [0.4–1.5] |
| 400–599 | short-form | 161/199 | 80.9% [74.9–85.8] | 10/1,167 | 0.9% [0.5–1.6] |
| 400–599 | long-form | 3/3 | n below 30, no rate quoted | 3/826 | 0.4% [0.1–1.1] |
| 600–849 | short-form | 161/171 | 94.2% [89.6–96.8] | 0/86 | 0.0% [0.0–4.3] |
| 600–849 | long-form | 46/52 | 88.5% [77.0–94.6] | 2/894 | 0.2% [0.1–0.8] |
| 850–1,199 | long-form | 175/193 | 90.7% [85.7–94.0] | 30/1,050 | 2.9% [2.0–4.0] |
| 1,200–1,699 | long-form | 259/265 | 97.7% [95.1–99.0] | 3/1,237 | 0.2% [0.1–0.7] |
| 1,700–2,399 | long-form | 271/279 | 97.1% [94.4–98.5] | 6/461 | 1.3% [0.6–2.8] |
| 2,400–3,499 | long-form | 129/130 | 99.2% [95.8–99.9] | 0/134 | 0.0% [0.0–2.8] |
| **all lengths** | **short-form** | **566/816** | **69.4%** [66.1–72.4] | 22/4,368 | 0.5% [0.3–0.8] |
| **all lengths** | **long-form** | **883/922** | **95.8%** [94.3–96.9] | 45/4,636 | 1.0% [0.7–1.3] |

Source: `DETECTION-BY-LENGTH-AND-MODEL.md` Table 1. Where a cell holds fewer than 30 documents the
count is printed and no rate is, which is the floor that file applies throughout. Two bands are
omitted from the table above because they hold no machine documents at all; they are dealt with
below.

Three things in that table deserve separating out.

**The cliff is below 200 words, and it is steep.** From 16.9% at 100–199 words to 84.6% at 300–399
is 68 percentage points across a gap of a hundred words. Binning by *achieved* word count rather
than by the length a generator was asked for lowers the sub-200 figure: the previously published
22.6% for a "100-word" band grouped by target length and so included passages that came back at 200
words and more.

**Above 300 words the trend is a gradient with noise on it, not a staircase.** Short-form reads
84.6%, then 80.9%, then 94.2%. Long-form reads 88.5%, 90.7%, 97.7%, 97.1%, 99.2%. Drawing a smooth
curve through those points would claim a precision the denominators do not support.

**Human false positives do not rise with length in any straight line.** The one band that looks bad
is 850–1,199 words at 2.9% (30/1,050), three times the corpus average, and 22 of those 30 documents
are human fiction. Human fiction has a median length of 1,190 words, so 241 of the corpus's 260
human stories land in that single band. Take fiction out and the band reads 8/809 = 0.99%, in line
with the corpus. Fiction inside the band reads 22/241 = 9.1%, which is the known fiction weakness
appearing here as a length band because of where fiction happens to sit on the axis. That cell is
not evidence that detection is unreliable around a thousand words.

## The headline describes long documents

The 95.8% figure comes from a corpus whose median machine document is 1,612 words. At 600–849 words
the same detector on the same corpus reads 88.5% (46/52); at 850–1,199 words, 90.7% (175/193).
Somebody checking an 800-word blog post is not operating at the headline rate, and the interface
should say so at the point of use rather than in a footnote.

## Length is confounded with the model comparison, and the confound runs the wrong way

Per-model detection, at the same operating point, on the same 922 machine documents:

| model | flagged | detection rate [95% CI] | median document length |
|---|---:|---|---:|
| `openai/gpt-5.6-luna` | 121/121 | 100.0% [96.9–100.0] | 2,263 words |
| `qwen/qwen3.8-max` | 109/110 | 99.1% [95.0–99.8] | — |
| `deepseek/deepseek-v4-pro-0813` | 128/131 | 97.7% [93.5–99.2] | 2,144 words |
| `google/gemini-3.7-flash` | 118/121 | 97.5% [93.0–99.2] | — |
| `x-ai/grok-4.6` | 113/121 | 93.4% [87.5–96.6] | 1,176 words |
| `meta-llama/llama-4-maverick` | 80/101 | 79.2% [70.3–86.0] | 905 words |
| **all models** | **883/922** | **95.8%** [94.3–96.9] | 1,612 words |

Source: `DETECTION-BY-LENGTH-AND-MODEL.md` Table 2. Six further rows in that table hold fewer than
30 documents and print counts only; they are omitted here for the same reason the file suppresses
their rates. A 21/23 is not "91.3%" in any sense that should travel.

The two lowest-scoring models wrote the shortest documents. Restrict the corpus to documents of
1,200 words or more and it reads **659/674 = 97.8%**; below that, **224/248 = 90.3%**. So the model
ordering in that table is partly a length ordering. Separating the two would need a length-balanced
generation run, and a per-model-by-length cross-tabulation was deliberately not produced: 922
documents across 13 models and 8 bands would average nine documents per cell, well under the floor
this work applies everywhere else.

## The detector does not become less certain, it loses a tail

All thirteen models sit at a median machine probability between 98.7% and 99.0%, a spread of three
tenths of a percentage point across the whole field, against a primary flag point of 98.55%.
`meta-llama/llama-4-maverick` has the lowest detection rate at 79.2% and the lowest average at
98.4%, and its median is 98.7%, still above the flag point. Its misses are a minority tail rather
than a shifted distribution.

`anthropic/claude-opus-5` shows the split most clearly: average 98.5%, median 99.0%, on 23
documents. Two documents drag the average below the flag point while the median sits above it. This
is why both are printed. It is also why the machine and human populations are counted and averaged
separately everywhere in this work, never as one number across both.

A related piece of arithmetic explains a column that looks alarming and is not. The average machine
probability *of human documents* climbs steadily with length, from 17.8% under 100 words to 90.5%
above 5,000, while the false-positive rate does not. The reported probability is the maximum across
sections, and a longer document offers more sections for that maximum to be drawn from.

## What has not been measured

**Nothing above 3,061 words.** That is the longest machine document in any corpus on this project.
The 3,500–4,999 and 5,000-and-above bands contain human documents only, 21 and 13 of them, both
under the 30-document floor. No detection rate should be inferred there. The server refuses
documents over 4,000 words and offers the browser route instead, so the unmeasured range begins
inside what the server will accept and continues past it.

**Nothing in the browser.** Every figure on this page is fp32 through Python `onnxruntime`. The
browser runs int8 through `onnxruntime-web`. The two agree to a median of 0.0002 in the decision
region, which is close, and a proxy is not the thing. The browser's own full-corpus segmented length
curve has never been measured.

**Nothing about edited text.** Every machine document here is fully model-generated. Mixed
documents, rewrites and human drafts a model tidied are a different problem with different numbers,
and this corpus contains none of them.

## The corpus is not fully held out, and by how much

The 5,558-document long-form corpus is described in some internal records as hash-quarantined
against every training split. That wording is not accurate and should not be repeated. Measured
against `cycle2-train/dataset.jsonl` on normalised SHA-256, **268 of the 922 machine documents
(29.1%) appear in the cycle-2 dataset, 168 of them in the train split.** The human half is
effectively clean: 11 of 4,636, being 5 train, 3 calibration and 3 test.

The effect was measured rather than assumed. At a threshold of **0.984** — the retired
single-threshold rule, not the pair that ships, and quoted here only because that is where the
subset cut was taken:

| subset | n | detected |
|---|---:|---|
| never in the cycle-2 dataset | 654 | 620 = 94.80% |
| in the cycle-2 dataset, any split | 268 | 257 = 95.90% |
| of which the train split | 168 | 163 = 97.02% |

Source: `services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt` §2. Those two
subset figures have not been re-cut at the shipped 0.9855 / 0.9763 pair, and relabelling them as if
they had would be the same error this page exists to correct.

Roughly 1.1 points separate the seen and unseen subsets at that threshold, worth about 0.3 points on
the corpus headline. It changes no conclusion on this page, and where an argument rests entirely on
unseen data the 654-document independent subset is the honest denominator to use.

## Provenance

| figure | file | section |
|---|---|---|
| every cell of the length curve; 883/922; 45/4,636; median 1,612 words; the 850–1,199 fiction decomposition | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | Table 1 and "What Table 1 says" |
| per-model rows, median document lengths, 659/674 and 224/248, the median-versus-average split | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | Table 2 and "What Table 2 says" |
| no machine text above 3,061 words; no browser measurement; nothing about edited text | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | "What is not here" |
| detector SHA, operating point, T = 0.8324, `segments-v3`, `onnxruntime` 1.29.0 | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | Table 1 header |
| 268/922, 168 train split, 11/4,636 human, 620/654 and 257/268 at 0.984 | `services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt` | §2 |
| shipped pair definition and the two-runtime fit | `docs/programme/HANDOVER.md` | §4.2, §4.4 |

The harness behind Tables 1 and 2 reproduces six previously published figures exactly before it
emits a single cell, and `by_register_and_length.py` exits without printing anything if any of them
fails to reproduce. The four reproductions it gates on are 883/922 and 45/4,636 at the shipped pair,
877/922 and 56/4,636 at the prior 0.984 maximum-only rule, the four short-form bands at 0.9845, and
all thirteen per-model cells at 0.984.

---

# Notes for the builder — not body copy

## Charts

All new. None of the eight SVGs in `docs/assets/charts/` covers this page. Of those eight, only
`segmentation-token-coverage.svg` (which needs a `segments-v2` → `segments-v3` relabel) and
`watermark-key-collapse.svg` are current for any purpose; do not reuse
`detection-by-register.svg` or `false-positives-by-register.svg`, which are at the superseded 0.980
`segments-v2` point.

**Chart 1 — the length curve. This is the page.**
X axis: word-count band, ordinal, in the order given below. Y axis: detection rate, 0–100%. **Two
separate series, never joined into one line**, because the corpora overlap between 400 and 849 words
and were generated differently. Print the denominator on or under each bar or point. Bands with
fewer than 30 machine documents are drawn as an open marker with the raw count and no rate.

| band | short-form | long-form |
|---|---|---|
| under 100 | 6/27, no rate | — |
| 100–199 | 29/172 = 16.9% | — |
| 200–299 | 16/19, no rate | — |
| 300–399 | 193/228 = 84.6% | — |
| 400–599 | 161/199 = 80.9% | 3/3, no rate |
| 600–849 | 161/171 = 94.2% | 46/52 = 88.5% |
| 850–1,199 | no documents | 175/193 = 90.7% |
| 1,200–1,699 | — | 259/265 = 97.7% |
| 1,700–2,399 | — | 271/279 = 97.1% |
| 2,400–3,499 | — | 129/130 = 99.2% |
| 3,500–4,999 | — | no machine documents |
| 5,000 and above | — | no machine documents |

Annotate the corpus median (1,612 words) and the corpus headline (883/922 = 95.8%) as a horizontal
reference. Shade everything above 3,061 words as unmeasured, with the label "no machine text of this
length exists in any corpus on this project". Error bars from the Wilson intervals in the body
table.

**Chart 2 — human false positives on the same axis, to show they do not track length.**
Same X axis, second panel beneath Chart 1 so the bands align. Y axis 0–5%, not 0–100%, and say so in
the caption. Values: 0/388, 0/732, 3/822, 9/1,170, 10/1,167 (short-form); 3/826, 2/894, 30/1,050,
3/1,237, 6/461, 0/134, 0/21, 1/13 (long-form). Annotate the 850–1,199 point with "22 of these 30 are
human fiction; excluding fiction, 8/809 = 0.99%".

**Chart 3 — median against average machine probability, per model.**
Dumbbell chart, one row per model, X axis probability 97.5–99.5%, with a vertical rule at the
primary flag point 98.55%. Rows where the corpus holds fewer than 30 documents must be labelled with
their count. Values from `DETECTION-BY-LENGTH-AND-MODEL.md` Table 2: `claude-opus-5` average 98.5%
median 99.0% (n=23); `llama-4-maverick` 98.4% / 98.7% (n=101); `grok-4.6` 98.8% / 99.0% (n=121);
`gemini-3.7-flash` and `deepseek-v4-pro-0813` both 98.9% / 99.0%; the remaining rows 99.0% / 99.0%.
The point of the image is that every median sits above the flag point, so the detection differences
are tail losses.

## Preconditions before this page goes live

1. The live checker page and `docs/CAPABILITIES.md` §10 currently disclose detection of "67% at 200
   words, 50% at 150, 19% at 100". `docs/TEST-EVIDENCE.md` line 103 records that **no denominator
   for those three figures exists anywhere in this repository.** They are superseded by the bands on
   this page and publishing both at once would contradict our own live copy. Correct the live page
   first.
2. `DETECTION-BY-LENGTH-AND-MODEL.md` and `docs/PER-MODEL-DETECTION.md` described the corpus as
   "hash-quarantined against every training split" without qualification. A correction to both was
   in the working tree, uncommitted, on 30 August 2026 and matches what this page says; confirm it
   has landed on `main` before building, and re-read both files if it changed in the meantime. The
   corpus wording on the live site needs the same correction.

## Do not print

- Any figure at 0.984, 0.980, 0.9845, 0.8533 or 0.857 under a current heading. The two subset
  figures in "the corpus is not fully held out" are the only 0.984 numbers on this page and each is
  labelled at the point of use.
- The per-model rows from `docs/PER-MODEL-DETECTION.md` §1 beside the Table 2 rows here. They are
  the same corpus at two operating points, and four rows differ.
- Any browser figure in any cell on this page.

## Rewrite liability — cycle 4a

**High. This page needs its headline rewritten the day a retrain ships.** A retrain, cycle 4a, is
measured and **not shipped**, and nothing about it may appear on this page as current behaviour. It
runs at a refitted pair of 0.959674 / 0.950715 and a temperature of 1.7298, and on the held-out test
split it takes 100-word detection from 11/57 = 19.30% to 44/57 = 77.19%, long-form detection from
883/922 to 900/922 (McNemar p = 0.0019), and fiction false positives from 23/260 to 14/260
(`docs/measurements/TWO-AXIS-RETRAIN.md` §12.3). One gate blocks it: the int8 quantisation gate
fails at a verdict-flip rate of 0.01204 against this project's own 0.01 limit (§13).

If it ships, the sub-200-word cliff stops being the finding, every operating point on this page
changes because the fitted temperature changes with the model, and a new weakness has to be
published alongside: company updates go from 1/662 to 10/662, a tenfold rise (§12.4).

Build the operating point, the detector SHA and the measurement date as **one shared component**
used by every page in this section rather than retyping them into prose. Otherwise the rewrite is a
hunt.

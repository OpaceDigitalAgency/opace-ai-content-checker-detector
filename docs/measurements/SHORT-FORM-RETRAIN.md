# Short-form corpus and retrain — progress and findings

**Written 29 August 2026.** Status: **Part 1 complete, Part 2 pilot run and
measured, Parts 3 and 4 not started.** No model was retrained and no threshold
was changed. **Actual OpenRouter spend: $2.9972** (816 samples), against a $12
cap and a $9 in-script hard stop.

**The pilot answers the question it was set, and finds a third thing that neither
candidate answer anticipated.** See §7.

This file records what was measured, what was built, and the two reasons the
generation step did not run. Figures carry their denominator and their runtime.

---

## 1. Headline

Two findings change the shape of the job, and both contradict an assumption in
the brief. Neither is a reason to abandon it.

**The human short-form passages are not in the training corpus.** The brief said
"no short-form register has any independent measurement at all because every
sample of it sits inside the training set". Tested directly: 0 of 120 randomly
sampled harvested passages appear anywhere in `cycle2-corpus/corpus.jsonl` or
`cycle2-train/dataset.jsonl` (99.9 M characters searched, 12-word shingle match).
The owner's nine documents are absent too. So these passages are already a valid
independent test set, and one measurement the project has been missing could be
taken immediately, for free — see §4.

**Short-form human false positives are not the problem.** On 1,168 unseen human
passages the deployed model wrongly flags **5 (0.43%)**. That is *better* than
the 1.21% long-form figure. The short-form defect is a **recall** problem on AI
text, not a false-positive problem on human text. Any retrain should be judged on
whether it lifts short AI detection without disturbing this 0.43%.

---

## 2. Part 1 — human short-form corpus: 1,168 passages

`scratchpad/shortform/human-shortform.jsonl` (harvester:
`harvest_human.py`). Source: the owner's blog, held locally as markdown at
`opace-website/astro-latest/src/content/blog/`, not scraped.

| band | passages | median words | range |
|---|---|---|---|
| 100 | 320 | 117 | 70–170 |
| 300 | 320 | 280 | 210–337 |
| 400 | 308 | 360 | 282–442 |
| 600 | 220 | 532 | 425–602 |
| **total** | **1,168** | 302 | 70–602 |

From **231 distinct posts**, published 2010–2020. Cut on paragraph boundaries
only; no paragraph is ever split. Every row records source URL, published date,
modified date, word count, categories, and a `group` key (the post slug) for
group-aware splitting.

### 2.1 The date rule in the brief would have yielded zero passages

The brief said to require both `date` **and** `modified` before 30 November 2022.
Measured across all 348 posts: **0 satisfy that rule.** Every post has a modified
date of 2024 or later (2024: 249, 2025: 26, 2026: 73), because the site was
migrated from WordPress to Astro from September 2024, which rewrote every file
without touching the prose. Filtering on `modified` measures the migration, not
the writing. The coordinator independently reached the same conclusion mid-task
and corrected the rule to filter on original publication date.

### 2.2 But contamination is real, and it was found and removed

Treating `modified` as merely an artefact would have been wrong. Reading 25
passages weighted towards the latest modified dates surfaced modern SEO copy
inserted into old posts — for example, in a **2010** post:

> Easy content editing does not remove the need for software updates, backups,
> security checks and technical support. Our guide to website maintenance costs
> in the UK explains …

Git history names the culprit: an SEO campaign in 2026 ("Surfer term and image
pass", "Optimise website cost spokes for UK search intent") edited old posts.

This is removable rather than merely flaggable. The repository carries a **2024
WordPress migration snapshot** at `migration/src/content/blog/`, which predates
that campaign. Every harvested paragraph is gated on appearing in its post's
migration snapshot; anything absent is dropped as a post-2024 insertion.
**35 paragraphs were dropped this way**, and the flagged examples above are gone
from the final corpus. 13 eligible posts have no migration copy and were excluded
entirely rather than shipped unverified.

### 2.3 Independent third-party verification

The Wayback Machine holds `opace.agency` only from 2024, but one post survives on
the old `opace.co.uk` domain from **2019-09-20**, before ChatGPT. Comparing the
harvested passages from that post against the archived page: **165 of 190 ten-word
shingles matched (87%)**, the misses all falling on paragraph-join boundaries
where the harvester concatenates. The text is substantively as it stood in 2019.
That is a spot check on one post, not a corpus-wide guarantee.

### 2.4 Honest statement of the guarantee

The corpus is **date-filtered on original publication and verified against a 2024
pre-campaign snapshot**. It is *not* verified unedited across 2023–2024. That is
weaker than the brief hoped for, and still stronger than any purchased human
corpus, which cannot date its contents at all. 23.1% of passages carry
period-anchored terms (Panda, Penguin, Joomla, Google+, MySpace, 4G, Ello).

### 2.5 Held-out samples

The owner's six team-written samples map to these posts, all **excluded by slug**
so no passage from them can appear anywhere in the corpus:
`post-panda-seo-checklist-part-1`, `social-media-campaign-objectives`,
`emerging-online-trends-esports`, `social-media-future`, `mobile-friendly-seo`,
`seo-ranking-guidelines`. The JSON sample files carry no source URL, so these
were recovered by shingle-matching the text back to the blog.

---

## 3. Part 2 — AI generation: built, verified, not run

`scratchpad/shortform/generate_shortform.py`, with topics in `topics.json`
(231 topics taken from the harvested posts' titles and categories, so the model
cannot learn topic instead of authorship).

Dry-run of the job plan for 2,000 samples: styles 667/667/666 (plain / house /
humanise), lengths 501/501/500/498 (100/300/400/600).

**The owner's humanise instructions are reproduced verbatim**, typos included
("halucinate", "ridged", "humor"), from
`scratchpad/shortform/humanise-style-verbatim.txt`, and asserted verbatim in the
dry run. Within the humanise style, `openai/gpt-5.6-sol` is 23.4% of samples and
`openai/gpt-5.5` 16.4% — together ~40%, the heavy weighting requested.

Each generated row records **discourse-marker density** (34 markers, count and
per-1,000-words), so the prediction that the banned-connective list depresses
marker density — and that this is what makes the style hard to detect — can be
tested rather than assumed.

### 3.1 The GPT-5.6 family: pick a variant

The GPT-5.6 family is on OpenRouter and was used: **Sol** ($2/M in, $10/M out),
**Luna** ($0.20/$1.20), **Terra** ($2/$12), each with a `-pro` variant, all
published 9 July 2026. What does not resolve is a **bare `openai/gpt-5.6`
identifier** — you name a variant. Checked against
`https://openrouter.ai/api/v1/models` (396 models, 29 August 2026).

The pilot used `gpt-5.6-sol` (the model behind the missed article) and
`gpt-5.6-luna` (ten times cheaper on output, used for volume), balanced half and
half inside every cell so the model cannot confound the length x style
comparison.

### 3.2 The budget estimate in the brief is roughly 6× too high

The brief assumed $0.02–0.08 per sample, giving 1,500–2,500 samples for $60. That
came from the earlier **long-form** run. At current OpenRouter prices, short-form
samples of 100–600 words cost about **$0.005** each. Projected cost for the full
2,000-sample run, computed per model and per length from live pricing:

> **$8.32**, against a $55 hard stop.

The hard stop is implemented and checks OpenRouter's own reported `usage.cost`
after every call.

### 3.3 Why it did not run — two blockers

**1. No credential.** `OPENROUTER_API_KEY` is not in this session's environment.
It exists in the owner's `~/.zshrc`. Running the generator would have meant
reading his API key out of his shell profile, which I will not do. The key must
be supplied to the process by the owner.

**2. No spend authorisation from the owner directly.** The $60 authorisation
reached me through the coordinating agent, not from the owner. Spending his money
is irreversible, so it needs his own go-ahead. Given §3.2, the sum he is actually
being asked to approve is roughly **$9, not $60**.

Neither blocker is a judgement about whether the work is worth doing. To run:

```
OPENROUTER_API_KEY=... python3 generate_shortform.py --pilot            # 24 samples, ~$0.10
OPENROUTER_API_KEY=... python3 generate_shortform.py --full --budget 55 # 2,000, ~$8.32
```

Run the pilot first and read the output before committing to the full run.

---

## 4. Measured now, for free: the missing short-form baseline

The one measurement that did not need any spend, and that the project has been
missing. Because the harvested passages are outside the training corpus (§1),
this is a genuine held-out result.

**Runtime: fp32 ONNX, the server runtime.** Deployed `segments-v3` segmentation,
deployed calibration (`p = sigmoid(margin / 0.8324)`), deployed primary threshold
**0.9845**, aggregation max. Model `tier3-cycle2-e5small-fp32.onnx` — the one the
live service serves.

**False positives on human short-form web copy: 5 / 1,168 (0.43%).**

| band | n | false positives | rate | median p | p90 | max p |
|---|---|---|---|---|---|---|
| 100 words | 320 | 0 | 0.00% | 0.0667 | 0.2758 | 0.9674 |
| 300 words | 320 | 1 | 0.31% | 0.0464 | 0.4663 | 0.9865 |
| 400 words | 308 | 2 | 0.65% | 0.0335 | 0.3822 | 0.9889 |
| 600 words | 220 | 2 | 0.91% | 0.0909 | 0.7231 | 0.9879 |

Distribution: 1,113 clear (<0.75), **50 in the 0.75–0.9845 grey band (4.28%)**,
5 flagged.

Two things follow. The false-positive rate **rises with length** here, which is
the opposite of the recall defect and worth keeping in view during any retrain.
And the model is well clear of the threshold on most short human copy — median
probability 0.03–0.09 — so there is headroom to make it more sensitive to short
AI text before human copy starts flagging.

Raw scores: `scratchpad/shortform/baseline-scores.jsonl`.

---

## 5. What is not done

Parts 3 and 4 in full. There is no AI short-form data, so there is no retrain, no
ONNX export, no before/after table by length band, no false-positive-by-register
comparison, no long-form regression check, and no re-measurement of the owner's
nine documents. **Nothing in this file should be read as evidence that a retrained
model would be better.** The only new evidence here is the human-side baseline in
§4 and the corpus in §2.

Next, in order:

1. Owner supplies the key and approves ~$9. Run the pilot, read it, then the full run.
2. Score the AI samples with the current model — this alone gives the
   before-half of the headline table and may show the defect is concentrated in
   the humanise style rather than in length as such.
3. Retrain from `cycle2-checkpoint`, group-aware split on post slug and topic.
4. Export int8 per-channel and fp32, then measure §4 of the brief in full.

Step 2 is worth doing on its own before any retrain: if short AI text is detected
well except under the humanise style, the defect is a style problem, not a length
problem, and the corpus design should change accordingly.

---

## 6. Framing note

The humanise instructions are a good-faith attempt at better writing — sentence
variety, anecdotes, cited statistics, transitions, humour — not an evasion tool.
The detector being defeated by them is a side effect of a professional trying to
write well. Any public write-up should say so.

---

## 7. The pilot: length, not style — and a third axis

Run 29 August 2026. **816 AI short-form samples, $2.9972.** Fully crossed:
4 lengths x 3 prompt styles, model balanced inside every cell (half
`openai/gpt-5.6-sol`, half `openai/gpt-5.6-luna`), topics drawn from the
harvested human passages. 24 calls failed (empty or under-40-word completions)
and were discarded, not retried, which is why cells are 59-70 rather than 70.

Scored with the **currently deployed cycle-2 fp32 model**, deployed
segmentation, deployed calibration, primary threshold **0.9845**, aggregation
max. No retraining, no threshold change.

### 7.1 Detection by length band x prompt style

| length | plain | house | humanise | row total |
|---|---|---|---|---|
| 100w | 21/69 30.4% | 9/67 13.4% | 14/59 23.7% | **44/195 22.6%** |
| 300w | 60/68 88.2% | 57/70 81.4% | 58/68 85.3% | **175/206 85.0%** |
| 400w | 61/69 88.4% | 52/69 75.4% | 56/70 80.0% | **169/208 81.2%** |
| 600w | 66/70 94.3% | 64/68 94.1% | 64/69 92.8% | **194/207 93.7%** |
| **all** | **208/276 75.4%** | **182/274 66.4%** | **192/266 72.2%** | |

Length, with 95% Wilson intervals: 100w **22.6%** [17.3, 28.9]; 300w 85.0%
[79.4, 89.2]; 400w 81.2% [75.4, 86.0]; 600w 93.7% [89.6, 96.3].

Style: plain 75.4% [70.0, 80.1]; house 66.4% [60.6, 71.8]; humanise 72.2%
[66.5, 77.2].

### 7.2 The answer: it is a LENGTH problem

Detection falls with length under **every** style. At 100 words it collapses to
22.6% (44/195) while at 600 words it holds at 93.7% (194/207) — a 71-point gap.

The humanise style is **not** the weak case. Its confidence interval overlaps
both other styles, and it out-detects the plain house brief. The worst style is
`house` at 66.4%, and that gap is driven by length behaving the same way inside
it. Model makes no material difference either: sol 72.3% (290/401), luna 70.4%
(292/415), and the humanise-by-model-by-length breakdown tracks the same curve.

So of the two candidate outcomes, this is the first: **detection falls with
length regardless of style**. On this evidence a length-balanced retrain corpus
aims at the right target, and weighting it towards the humanise style would not.

### 7.3 But the humanise prompt does not reproduce the owner's article

Before treating §7.2 as the whole answer: the pilot tests his *instructions*, not
his *article*. Measured on surface features, his 80.8% article falls outside the
p10-p90 band of the 82 humanise samples his own prompt produced, on 3 of 10
features — and decisively on **type-token ratio**:

| feature | his article | humanise median | [p10, p90] | his percentile |
|---|---|---|---|---|
| type-token ratio | **0.51** | 0.64 | [0.58, 0.70] | **0.0%** |
| mean sentence length | 20.48 | 17.46 | [15.58, 19.72] | 92.7% |
| commas per 1k | 76.17 | 63.59 | [51.16, 75.04] | 91.5% |
| citation links per 1k | 0.00 | 6.54 | [0.00, 15.67] | 0.0% |

Not one generated humanise sample is as lexically repetitive as his article. His
six *human* samples sit at TTR 0.50 — indistinguishable from the article's 0.51.
The article repeats "website" 18 times in 512 words, "design" 10, "cost/costs"
10: ordinary SEO keyword repetition.

The prompt also produced inline citations (median 6.54 links per 1k) because his
instructions say to cite sources; his article has none. So the samples follow the
instructions more literally than his own article did.

### 7.4 The third axis: lexical repetition, and it is not length

Handover §4.5 records the model's dominant signal as AI **under-repeating**
itself — 2.1% adjacent-sentence content-word overlap against human 6.3%. Type-token
ratio measures that directly, so the prediction is that low TTR evades detection.
Tested on all 816 samples, **within each length band** so length cannot confound:

Spearman rho, TTR against AI probability: 100w **+0.323** (n=195), 300w
**+0.476** (n=206), 400w **+0.358** (n=208), 600w **+0.442** (n=207). Positive
throughout: the more repetitive the text, the lower its AI score.

Detection by TTR quartile within band:

| band | Q1 (most repetitive) | Q2 | Q3 | Q4 (least repetitive) |
|---|---|---|---|---|
| 100w | 3/48 6% | 9/48 19% | 14/48 29% | 18/51 35% |
| 300w | 37/51 73% | 42/51 82% | 46/51 90% | 50/53 94% |
| 400w | 35/52 67% | 44/52 85% | 46/52 88% | 44/52 85% |
| 600w | 42/51 82% | 50/51 98% | 50/51 98% | 52/54 96% |

Monotone in three bands of four. At **his article's TTR of 0.51**, only 15 of 816
generated samples are that repetitive at all: at 600 words they are detected
**7/13 (54%)** against 93.7% for the band as a whole, and at 400 words 0/2.

**This is a second, independent evasion axis that the brief did not anticipate
and that neither candidate answer covers.** It also has an uncomfortable
implication: routine SEO keyword repetition — which is what a digital agency does
on purpose, on every commercial page — pushes AI text towards the human side of
the model's strongest signal. That is the most likely explanation for the 80.8%,
and it is a property of the *article*, not of the humanise wording.

Denominators are small at his TTR (13 and 2). This is a strong lead, not a
settled figure, and it deserves a targeted follow-up rather than being folded
silently into a retrain.

### 7.5 What the pilot does and does not settle

- **Settles:** short AI text is missed because it is short, under every style
  tested, on both models. 100 words is the cliff.
- **Settles:** the humanise instructions as written do not defeat the detector.
- **Does not settle:** why his specific article scored 80.8%. Nothing in the
  corpus resembles it on the axis that best explains it, because the prompt did
  not reproduce that axis.
- **Raises:** lexical repetition as an independent evasion route, with a
  consistent within-band correlation and a plausible mechanism from prior work.

---

## 8. False positives on a widened human corpus

The Opace blog is one voice, so §4's 0.43% could not stand alone. Cut short
passages at the same four lengths from the existing 4,636-document human
long-form corpus, per-source quotas, no source above a third.

**4,368 passages, 9 sources, 1,081 groups.** Largest single source: opace-blog
at 26.7%. Every row dated (`era_year` backfilled from front matter for the blog
rows, which were previously being miscounted as undated).

Same runtime and threshold as §4. **24/4,368 flagged = 0.55%**, CI [0.37, 0.82].

| source | n | FP | rate | 95% CI |
|---|---|---|---|---|
| internet-archive-cc-texts (fiction) | 400 | 13 | **3.25%** | [1.91, 5.48] |
| mongabay | 400 | 3 | 0.75% | [0.26, 2.18] |
| globalvoices | 400 | 2 | 0.50% | [0.14, 1.80] |
| opace-blog | 1,168 | 5 | 0.43% | [0.18, 1.00] |
| europepmc-oa | 400 | 1 | 0.25% | [0.04, 1.40] |
| gov.uk | 400 | 0 | 0.00% | [0.00, 0.95] |
| persuade-2.0 | 400 | 0 | 0.00% | [0.00, 0.95] |
| sec-edgar-10k-mdna | 400 | 0 | 0.00% | [0.00, 0.95] |
| crs-report | 400 | 0 | 0.00% | [0.00, 0.95] |

By band: 100w 0/1,120 (0.00%); 300w 7/1,120 (0.62%); 400w 8/1,108 (0.72%);
600w 9/1,020 (0.88%). False positives rise with length — the opposite direction
to the recall defect, on all nine sources.

The only register above 1% is `story` at 13/400 (3.25%), the known fiction
weakness reappearing on independent data, though milder than the 11.2% recorded
for long-form fiction. Four sources flagged nothing at all (0/1,600 combined).

**The human side is not the constraint at any length.** With 100-word human copy
at 0/1,120 and 100-word AI at 44/195, there is substantial headroom to make the
model more sensitive to short text.

### 8.1 Dating caveat

813 of 4,368 (18.6%) carry year-only granularity for 2022, so a small fraction
could post-date 30 November 2022. The rest are 2010-2021, or dated at dataset
level (PERSUADE 2.0). Cut method is recorded per row: SEC EDGAR and Internet
Archive have no blank-line structure and were cut on **sentence** boundaries;
the rest on paragraph boundaries.

---

## 9. Recommendation

**Do not build the length-balanced corpus and retrain yet.** The pilot says
length is the defect, and that alone would justify the original plan. But it also
says the humanise style is not the weak case, which removes the reason to weight
the corpus towards it, and it surfaces lexical repetition as a second axis that
a length-balanced corpus would not address.

In order:

1. **Test the repetition axis properly, cheaply.** Generate AI short-form under
   an SEO-keyword-density instruction that drives TTR down to 0.50-0.55, matched
   for length, and score it with the current model. A few hundred samples,
   roughly $1-2. If detection at 400-600 words collapses the way the 15 low-TTR
   samples hint, the retrain corpus needs a repetition dimension and building it
   length-only would have missed the commercially common case.
2. Then build the retrain corpus across **both** axes, length and repetition.
3. Retrain from `cycle2-checkpoint`, group-aware on post slug and topic.
4. Measure §4 of the original brief in full, including the nine documents.

Step 1 is the cheap test that decides whether step 2 has one dimension or two.
Running it before the retrain costs about $2 and could prevent building the wrong
corpus twice.

**Nothing here justifies a threshold change**, and none was made.

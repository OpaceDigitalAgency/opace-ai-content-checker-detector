# Short-form corpus and retrain — progress and findings

**Written 29 August 2026.** Status: **Parts 1 complete, Part 2 built but not run,
Parts 3 and 4 not started.** No model was retrained and no threshold was changed.
No OpenRouter credit was spent — **actual spend $0.00.**

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

### 3.1 `openai/gpt-5.6` does not exist

The coordinator required `openai/gpt-5.6` in the model set. Checked against
`https://openrouter.ai/api/v1/models` (396 models, 29 August 2026): there is no
bare `openai/gpt-5.6`. The family is `sol`, `luna`, `terra`, each with a `-pro`
variant. The owner's missed article came from `gpt-5.6-sol`, which does exist and
is the most heavily weighted humanise model. All four 5.6 variants plus `gpt-5.5`
are in the set. **This was not silently substituted — it needs the owner's eye**,
in case he meant a specific variant.

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

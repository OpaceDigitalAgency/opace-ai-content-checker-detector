# Phrase frequency ratios: what our corpora can and cannot support

**Measured 30 August 2026.** Corpus: the 5,558-document long-form corpus of 28 August 2026 — 922 AI
documents across 13 models, 4,636 human documents from Europe PMC, GOV.UK, CRS, Global Voices,
Mongabay, SEC EDGAR and PERSUADE 2.0.

**What this is for.** A competitor panel shows phrases lifted from the user's own document with a
frequency ratio beside each — "307×", "83×", "65×" — under the heading *"shows you the 'why' behind
AI detection with sources you can see and verify"*. It is not the classifier explaining itself; it is
a separate corpus lookup, and that is precisely why it can be checked. The question this file answers
is whether we can build the same thing honestly from the corpora we hold.

**The answer.** Yes, but much smaller than theirs, only for three-word phrases, only as intervals,
and only after throwing away the first table we built — which ranked a spelling convention as the
strongest evidence of machine authorship.

---

## 1. The first table was an artefact. It is recorded here because it nearly shipped

Built on the raw text of both corpora, ranked by smoothed document-frequency ratio, the strongest
"AI phrases" were:

| rank | phrase | ratio, mining half | AI docs | human docs |
|---|---|---:|---:|---:|
| 1 | `per cent of` | 30.1× | 100/467 | 16/2,315 |
| 2 | `per cent in` | 28.3× | 31/467 | 5/2,315 |
| 3 | `cent of the` | 28.0× | 42/467 | 7/2,315 |

Three of the top three are the same artefact. Our AI half was generated in British English; our human
half is largely American or mixed. Measured over the two corpora:

| | AI documents (922) | human documents (4,636) |
|---|---:|---:|
| contains "per cent" | **29.9%** | **1.4%** |
| contains "percent" | 4.4% | 9.1% |
| contains an `-our` spelling (colour, behaviour, favour, labour, organisation) | **47.2%** | **11.6%** |
| contains an `-or` spelling (color, behavior, favor, organization) | 9.0% | 20.4% |

A phrase table built on that text is a British-English detector wearing the label of an AI detector.
It would have been quotable, specific, and wrong — the same failure visible in the competitor's own
published panel, where `"consent, accessibility and"` is ranked at 307× and is plainly domain
vocabulary from the user's document rather than a machine tell.

**Fix.** Spelling is normalised to one convention on BOTH sides before anything is counted
(`research/phrase-ratios/normalise.py`). The `per cent` family disappears from the ranking entirely.
This does not remove every corpus artefact and is not claimed to; the register control in §3 is the
other half, and a residual is still visible in §5.

---

## 2. Counting rules, and why the table is so small

**Document frequency, not raw frequency.** A phrase used eleven times inside one white paper is one
document's worth of evidence. Raw frequency is what lets a single verbose document look like a
corpus-wide tendency.

**A minimum count in both halves.** A 4-gram appearing in three AI documents and no human ones has an
undefined ratio, and smoothing produces a large finite number that reads as evidence. Every phrase
must appear in **at least 5 documents on each side of the mining half**.

That floor is what limits the table, and the limit is severe:

| phrase length | phrases meeting the minimum count, whole corpus |
|---|---:|
| 3 words | **2,503** |
| 4 words | **251** |
| 5 words | **21** |

**So nothing longer than three words is published.** The competitor's panel shows four- and five-word
phrases because it is built on a corpus large enough to estimate them. Ours is not: 251 four-word
phrases across 5,558 documents cannot support a panel that draws from an arbitrary user document, and
21 five-word phrases is not a table at all. This is a straightforward consequence of holding hundreds
of AI documents where a commercial service holds millions, and it is not fixable by cleverness.

**Split.** Mining half 467 AI / 2,315 human; held-out half 455 AI / 2,321 human, assigned by a hash of
the document id. Phrases are ranked and register-controlled on the mining half and **reported** on the
held-out half. Selecting on the numbers you then publish is how a table ends up describing its own
noise.

---

## 3. The register control

Our two halves do not have the same register mix and were written to different briefs, so a phrase
can look machine-typical corpus-wide purely because of what the AI half was asked to write about.

For every register with at least 40 documents per side, the ratio is recomputed **inside that register
alone**. A real tendency should lean the same way across registers; an artefact leans hard in one.

Of the top 40 phrases by corpus ratio:

- **19 hold in every register tested** (at least 3 testable registers, all leaning AI);
- **21 fail**, and — worth stating — **every one of those 21 fails for want of statistical power, not
  because it reversed.** No phrase in the top 40 leaned AI corpus-wide and human within a register.
  After spelling normalisation the surviving direction is consistent; what is scarce is evidence, not
  agreement.

---

## 4. Does any of it survive held-out?

Ranked on the mining half, reported on the held-out half, for the top 50 three-word phrases:

| quantity | value |
|---|---|
| correlation of log-ratio, mining half against held-out half | **0.73** |
| median held-out ratio of the top 50 | **10.3×** |
| top-50 phrases whose held-out ratio falls below 1× | **0/50** |
| top-50 phrases spanning more than one register | **49/50** |

So the effect is real and it replicates. What it is *not* is precise: individual intervals commonly
span a factor of five end to end, which is why nothing ships as a point estimate.

---

## 5. What ships, and its residual weakness

18 phrases, in `src/data/content-integrity-phrase-ratios.json`. Selection: minimum count in both
halves, leaning AI in every one of at least 3 testable registers, and a **held-out interval that
excludes 1**. Ratios shown are held-out, as intervals, with their document counts.

| held-out ratio (95%) | registers | AI docs | human docs | phrase |
|---|---:|---:|---:|---|
| 19.9–174.8× | 4 | 40 | 3 | `the evidence base` |
| 11.9–161.6× | 3 | 21 | 2 | `is not simply` |
| 10.6–65.4× | 4 | 28 | 5 | `the result is` |
| 10.2–75.4× | 4 | 24 | 4 | `rather than as` |
| 8.5–17.0× | 7 | 100 | 42 | `rather than a` |
| 7.8–50.5× | 6 | 21 | 5 | `not the same` |
| 7.1–55.5× | 3 | 17 | 4 | `the literature is` |
| 6.2–49.9× | 3 | 15 | 4 | `ways that are` |
| 6.0–35.2× | 5 | 18 | 6 | `but as a` |
| 5.6–59.2× | 3 | 12 | 3 | `should therefore be` |
| 5.2–19.1× | 3 | 26 | 13 | `rather than an` |
| 5.2–18.1× | 7 | 27 | 14 | `the gap between` |
| 5.1–23.6× | 3 | 20 | 9 | `the limits of` |
| 4.1–14.5× | 3 | 23 | 15 | `question of whether` |
| 3.9–29.3× | 3 | 11 | 5 | `evidence from the` |
| 3.9–13.5× | 5 | 23 | 16 | `the first is` |
| 3.5–23.4× | 4 | 11 | 6 | `a mixture of` |
| 2.6–15.5× | 3 | 10 | 8 | `a fraction of` |

**What the surviving phrases have in common, and why it is one finding rather than a list.** Most are contrastive or hedging frames —
`rather than a/an/as`, `is not simply`, `not the same`, `the gap between`, `the limits of`. That is
the same phenomenon as the project's existing repetition finding, seen from a second direction:

> **Machine prose argues by explicit contrast where people repeat and accumulate.**

The repetition measurement says machine writing under-repeats content words between adjacent
sentences — 2.1% overlap against 6.3% for human prose. The phrase table says the words machines reach
for instead are the ones that set two things against each other. Those are not two findings about two
signals; they are one description of how the prose is built, and the interface should present them as
one story rather than two unrelated widgets. `docs/research-drafts/what-the-model-keys-on.md` is the
natural home for the combined account.

It is worth recording, without putting it in front of a customer, that the house writing guidelines
already ban `it's not just X, it's Y` on sight. The corpus arrived independently at the same
judgement, from 922 documents rather than taste.

Overlapping windows of one phrase are collapsed: `the gap between` and `gap between the` slide across
the same words and would pad the panel with what looks like independent evidence.

### 5.1 The artefact that survived every automatic filter, and was cut by judgement

**`the bank of`, 2.5–16.7× held out, on 9 AI and 7 human documents. Excluded from the shipped panel;
recorded here.**

It passed the minimum-count guard, the register control and the held-out interval test. It is still
not a machine tell. Our AI half writes about banking across several registers, so the within-register
control — which compares a phrase's lean *between* registers — cannot separate subject from style
when the subject is present in all of them. This is the blind spot of that control, and it is worth
naming precisely because the control is otherwise the thing that makes the table defensible.

It sits beside the `per cent` family as the two kinds of artefact this exercise produced: one the
method caught (§1) and one it did not.

It was cut on a judgement about credibility rather than statistics. A reader pasting a banking article
who sees their own subject matter marked as an AI phrase will conclude the tool is not thinking — and
on that row they are right. That judgement then travels to the seventeen rows that do replicate.
Shipping a known artefact to demonstrate that the others might be thin costs more than it buys; the
intervals already carry that message, and `19.9–174.8×` tells an attentive reader exactly how much
precision is on offer.

The exclusion lives in `research/phrase-ratios/build_table.py` as a named entry with its reason, and
is emitted into the shipped JSON under `excluded_by_judgement`, so it is reproducible and cannot be
mistaken for tuning the table until it looked good.

**What this means for the rest of the table.** At least one topical artefact reached the final filter.
Others may remain below the point where they were obvious. The counts are printed against every row
so a reader can see how thin each one is, and the weakest rows sit on nine or ten documents.

---

## 6. Limitations that must travel with the panel

1. **A phrase in your draft is not evidence that your draft is machine-written.** These are tendencies
   across thousands of documents. Nothing in this table is a mark against a sentence, and the panel
   must not be laid out so that it reads as one.
2. **Ratios are intervals, never point estimates.** The intervals are wide.
3. **The corpus is small for this.** 922 AI documents against a commercial service's millions. The
   minimum-count floor that keeps the arithmetic honest is exactly what caps the table at three-word
   phrases and 18 rows.
4. **Long-form prose only.** Short marketing, SEO and social copy are not represented, and cannot be:
   every sample this programme owns of those registers sits inside the cycle-2 training set
   (`thresholds.json`, `registers_unmeasured`).
5. **The corpus size must be printed beside the panel.** A ratio without its denominator is the exact
   failure this project keeps correcting.
6. **The AI half is not fully independent.** 268 of the 922 AI documents appear in a cycle-2 split
   (see the correction at the head of `DETECTION-BY-LENGTH-AND-MODEL.md`). That affects the detector's
   accuracy figures; for a phrase count it matters less, because no classifier is involved — but the
   documents are still the ones the model was trained on, and the phrases are therefore not guaranteed
   independent of it.

---

## 7. Reproduction

```
research/phrase-ratios/emit_ngrams.py N out.tsv     # distinct per-document n-grams, spelling normalised
LC_ALL=C sort -t$'\t' -k4,4 out.tsv -o sorted.tsv   # group by phrase; external sort keeps memory flat
research/phrase-ratios/aggregate.py sorted.tsv df.jsonl   # document frequencies, minimum-count guard
research/phrase-ratios/rank.py df.jsonl 3           # ranking with held-out validation
research/phrase-ratios/register_control.py df.jsonl # the within-register control
research/phrase-ratios/build_table.py df.jsonl OUT  # the shipped table
```

No classifier is involved at any point in this file. Nothing here reads a threshold, and nothing here
can move the document verdict.

# Can the four-way verdict be supported? — measured

**31 August 2026.** A measurement, not a feature. Nothing was trained for deployment, no
threshold moved, nothing was deployed and nothing was published. The shipped operating point is
untouched.

**Scripts and raw output:** `services/local-engine/research/cycle4-separability/`
**Corpus:** `services/local-engine/research/cycle4-humaniser-pairs/` (2,302 rows, 600 lineages)
**Question set by:** [`../programme/REDESIGN.md`](../programme/REDESIGN.md) §7

---

## The scope limit, first, because it governs everything below

**This corpus is LLM paraphrase, not commercial-humaniser output.** Every row carries
`commercial_humaniser: false` and `transformation_family: generic_llm_rewrite`; `rewrite.py`
says so explicitly and `measure.py` fails the corpus if a row ever claims otherwise. Five
rewriting models were used — DeepSeek, Gemini, Llama, GPT and a held-out Mistral — under plain
"copy-edit this" / "paraphrase this" / "rewrite this" instructions with **no evasion intent
anywhere in the prompt**.

So every figure on this page describes one thing: **an LLM was asked to reword a text.** It does
not describe JustDone, QuillBot, Undetectable.ai or any product a person would actually reach
for, and no figure here may be quoted as though it did. Whether commercial tools transform text
the same way is being established separately; if they do not, a four-way verdict fitted to this
data would not survive contact with the tools people use.

One further distinction the corpus README is careful about and so is this page: rows carrying
`style=humanise` elsewhere in the project are **AI originals written under an anti-AI style
instruction**, not paired rewrites, and none of them is a source here. And no row is labelled
`ai_original_human_edited` — an LLM rewriting prose is not a professional human edit, the corpus
contains no real human-edit pairs, and `validate()` rejects that label outright. **The owner's
"Likely AI but human edited" therefore has no ground truth anywhere in this project.** What is
measured below is its closest available proxy, AI-then-LLM-rewritten, and the proxy is the
generous case: an LLM rewrite is a larger, more mechanical transformation than a human edit.

---

## The answer, in one paragraph

**The classes do not separate well enough to support the four-way verdict, and one half of it
fails in the wrong direction entirely.** Rewriting an AI document does not move it towards human
— it moves it *further into* AI territory, so pure-AI and rewritten-AI cannot be told apart at
all: AUROC **0.448** [0.431–0.466] on the shipped score, below chance with the interval excluding
0.500, and a probe trained on the pairs with group-aware splits reaches only **0.60**. That
closes *"Likely AI but human edited"*. The other half, *"Likely human but AI edited"*, is real
but weak: AUROC **0.751** [0.731–0.771] overall, rising to **0.866** [0.843–0.892] for the
heaviest rewrites. Held at the 1% false-label discipline the shipped tool already keeps, the best
probe catches **21.3%** of AI-edited human writing and **43.1%** of the heaviest edits — and
wrongly tells **1 in 100** genuinely human writers their work was AI-edited. **Recommendation:
do not ship the four-way verdict.** The two-way verdict remains the ceiling, exactly as
`REDESIGN.md` §7 concluded, and this measurement now closes the question with evidence rather
than leaving it open.

---

## 1. Harness proof — done first, and it passed

An unvalidated harness produces numbers that cannot mean anything, so the shipped figures were
reproduced before a single paired row was scored.

| | expected | measured |
|---|---|---|
| AI detected, long-form corpus | 883 / 922 | **883 / 922** ✅ |
| human false positives | 45 / 4,636 | **45 / 4,636** ✅ |

Exact, at full precision. Configuration, which must be quoted together or not at all:

| | |
|---|---|
| model | `tier3-cycle2-e5small-fp32.onnx` |
| model SHA-256 | `e313ab00de1fffd28d6157f014065b50bca8b59a8842746e54fe8b1504d2788d` |
| segmentation contract | `segments-v3` |
| temperature | `0.8324` |
| decision rule | minimum-evidence pair **0.9855 / 0.9763** |
| runtime | Python `onnxruntime` 1.29.0, CPU, fp32 — the EU server's scoring path |
| corpus | the 5,558-document fresh long-form corpus of 28 August 2026 |

Every paired row below went through that same path. `prove_harness.py` prints
`HARNESS PROOF: PASS` and nothing downstream is meaningful without it.

Corpus integrity was checked too: all six `cycle4-humaniser-pairs` files match their
`manifest.json` SHA-256 exactly, 600 lineages, and **no lineage spans two splits**.

### The document score used throughout

The product's document score is the **highest section's calibrated probability**. AUROC and the
paired shifts below are computed on the same quantity *before* the sigmoid — the raw logit
margin — because the calibrated probability saturates at 1.0 and destroys the resolution a
separability question needs. The two are monotonically related, so no ordering changes; only the
ties disappear. On that logit scale the shipped flag point sits at **3.512**.

---

## 2. What the shipped verdict already does to each class

n = 2,302. Wilson 95% intervals.

| class | what it is | n | flagged at the shipped pair | median score |
|---|---|---:|---|---|
| `human_original` | pure human | 300 | **3 = 1.0%** [0.3–2.9] | 0.1304 |
| `human_original_ai_edited` | human, then an LLM reworded it | 861 | **94 = 10.9%** [9.0–13.2] | 0.7055 |
| `ai_original_neural_rewrite` | AI, then an LLM reworded it | 841 | **623 = 74.1%** [71.0–76.9] | 0.9889 |
| `ai_original` | pure AI | 300 | **196 = 65.3%** [59.8–70.5] | 0.9885 |

The 1.0% pure-human rate matches the shipped 45/4,636 = 0.97% on a completely different corpus,
which is a second, independent check that the harness is behaving.

By edit intensity:

| class | intensity | n | flagged |
|---|---|---:|---|
| human + AI edit | light | 290 | 4 = **1.4%** [0.5–3.5] |
| human + AI edit | medium | 299 | 33 = **11.0%** [8.0–15.1] |
| human + AI edit | heavy | 272 | 57 = **21.0%** [16.5–26.2] |
| AI + rewrite | light | 258 | 174 = **67.4%** [61.5–72.9] |
| AI + rewrite | medium | 294 | 220 = **74.8%** [69.6–79.4] |
| AI + rewrite | heavy | 289 | 229 = **79.2%** [74.2–83.5] |

**The row that decides the question is the last block.** Rewriting an AI document makes it
*more* detectable, monotonically with how hard it is rewritten — 65.3% untouched, 79.2% after a
full rewrite. A verdict that says "AI, but edited" needs edited-AI to look *less* like AI than
pure AI. It looks more like it.

### A figure that does not match `HANDOVER.md` §9 item 3, and why

`HANDOVER.md` records **AI rewrites of a human original at 30–35%**. The same class measured here
is 94/861 = **10.9%**. These are not the same measurement and neither supersedes the other: the
documents here have a median of **343 words**, against 1,092–1,612 for the long-form corpus the
30–35% came from, and detection on this tool is strongly length-dependent (67% at 200 words, 50%
at 150, disclosed on the live page). The honest statement is that on short-to-medium prose the
weakness is worse than the recorded figure, not that the recorded figure is wrong.

---

## 3. Pairwise separability on the shipped score

AUROC with **cluster-bootstrap 95% intervals resampling the 600 lineages**, not the 2,302 rows.
1,702 variants come from 600 sources; an interval computed over rows would assert a sample size
the corpus does not have.

| contrast | n | AUROC | 95% CI |
|---|---|---|---|
| human vs pure AI | 300 / 300 | 0.962 | [0.946–0.976] |
| human vs AI + rewrite | 300 / 841 | 0.978 | [0.969–0.986] |
| human + AI edit vs AI + rewrite | 861 / 841 | 0.897 | [0.875–0.918] |
| human + AI edit vs pure AI | 861 / 300 | 0.858 | [0.831–0.885] |
| **human vs human + AI edit** | 300 / 861 | **0.751** | **[0.731–0.771]** |
| **AI + rewrite vs pure AI** | 841 / 300 | **0.448** | **[0.431–0.466]** |

The two contrasts the four-way verdict actually rests on are the two worst, and the last one is
**below chance with an interval that excludes 0.500**. That is not "weak separation". It is
separation pointing the wrong way: the model scores rewritten AI *higher* than the AI original it
came from.

By intensity:

| contrast | intensity | n | AUROC | 95% CI |
|---|---|---|---|---|
| AI + rewrite vs pure AI | light | 258 / 300 | 0.487 | [0.473–0.500] |
| AI + rewrite vs pure AI | medium | 294 / 300 | 0.438 | [0.416–0.458] |
| AI + rewrite vs pure AI | heavy | 289 / 300 | 0.424 | [0.392–0.453] |
| human vs human + AI edit | light | 300 / 290 | 0.615 | [0.599–0.637] |
| human vs human + AI edit | medium | 300 / 299 | 0.778 | [0.751–0.803] |
| **human vs human + AI edit** | **heavy** | 300 / 272 | **0.866** | **[0.843–0.892]** |

**This is the "separable only for the strongest rewrites" outcome, and only on the human side.**
A light copy-edit of human writing is nearly invisible (0.615). A full rewrite is visible (0.866).
On the AI side, heavier rewriting makes the contrast *worse*, not better.

### Length is not doing the work

A reasonable objection: rewrites change length, and this tool is length-sensitive. It does not
explain the result.

| contrast | model score | word count alone |
|---|---|---|
| human vs human + AI edit | 0.751 | **0.423** |
| AI + rewrite vs pure AI | 0.448 | 0.546 |
| human vs pure AI | 0.962 | 0.516 |

Word count alone is at or below chance everywhere. Restricted to pairs where the rewrite is
within 10% of the original's length, the human-side signal survives: light 0.610 (n = 275),
medium 0.728 (n = 172), **heavy 0.815 (n = 75)**. Slightly lower than unmatched, so a little of
the effect is length, but the substance is not.

---

## 4. The pairing — does a *specific* document move consistently?

This is what the lineage IDs are for, and it is a stronger question than whether the class means
differ. Δ is the change in the document's highest-section logit margin from its own original to
its own rewrite. The flag point sits at 3.512 on this scale.

| side | intensity | n pairs | median Δ | 95% CI | IQR | moves up in | flag lost | flag gained |
|---|---|---:|---|---|---|---|---|---|
| AI | light | 258 | **+0.001** | [+0.000, +0.002] | [−0.01, +0.03] | 55.4% | 2 / 169 | 7 |
| AI | medium | 294 | +0.013 | [+0.006, +0.024] | [−0.01, +0.21] | 64.6% | 7 / 194 | 33 |
| AI | heavy | 289 | +0.050 | [+0.030, +0.067] | [−0.01, +0.37] | 67.8% | 15 / 187 | 57 |
| human | light | 290 | +0.435 | [+0.351, +0.578] | [+0.12, +0.99] | 87.9% | 0 / 3 | 1 |
| human | medium | 299 | +1.773 | [+1.488, +2.112] | [+0.77, +3.41] | 94.0% | 0 / 3 | 30 |
| human | **heavy** | 272 | **+3.039** | [+2.692, +3.321] | [+1.45, +4.42] | **96.7%** | 0 / 3 | 54 |

Two findings, and they point opposite ways.

**On the AI side the shift is consistent in sign and negligible in size.** A heavy rewrite moves
an AI document +0.050 on a scale whose flag point is 3.512 — about 1.4% of the distance to the
decision — and it moves it *upward*, towards AI. It also gains far more flags than it loses
(57 gained against 15 lost). There is no direction here for a "but edited" label to point in.

**On the human side the shift is large and strikingly consistent.** A heavy LLM rewrite of human
writing moves it **+3.039 logits, in 96.7% of cases, in the same direction** — most of the way
from a human score to the flag point. This is a genuine, paired, per-document signal and it is
the strongest positive result on this page. It confirms `PHASE-2-PAIRED-CORPUS.md` §6 through the
detector rather than through lexical statistics: AI editing drags a human original towards the AI
signature.

**But a paired shift is not a product feature.** It measures the distance between a document and
*its own original*. At inference the tool has one document and no original, so what it can
actually use is the unpaired separability of §3 — 0.751, or 0.866 at heavy — not this.

---

## 5. The best achievable boundary on the shipped score

An oracle: the cut points are fitted on the very data they are then scored on, solved exactly
rather than by grid search. No shippable rule can beat this. Because an oracle beats chance even
on noise, each is reported against a **permutation null** — the same procedure on shuffled labels,
200 repeats, at these exact class sizes.

**Three-class** — human < AI+rewrite < pure AI. Balanced accuracy **62.4%**, permutation null
median 35.8% (95th pct 37.7%), chance 33.3%.

| truth ↓ / predicted → | human | AI+rewrite | pure AI | recall |
|---|---:|---:|---:|---|
| human | 291 | 9 | 0 | **97.0%** |
| AI + rewrite | 85 | 702 | 54 | **83.5%** |
| pure AI | 56 | 224 | 20 | **6.7%** |

**Four-way — the owner's ask.** Balanced accuracy **51.8%**, permutation null median 27.2%,
chance 25.0%.

| truth ↓ / predicted → | human | human+AIedit | AI+rewrite | pure AI | recall |
|---|---:|---:|---:|---:|---|
| human | 253 | 39 | 8 | 0 | 84.3% |
| human + AI edit | 377 | 320 | 163 | 1 | **37.2%** |
| AI + rewrite | 25 | 99 | 663 | 54 | 78.8% |
| pure AI | 14 | 59 | 207 | 20 | **6.7%** |

**Read the pure-AI row.** Even an oracle recovers only **6.7%** of pure-AI documents, because
207 of 300 are absorbed into "AI + rewrite". The scalar orders those two classes backwards, so
the boundary between them cannot be drawn anywhere useful. And 377 of 861 AI-edited human
documents — **44%** — are called plain human.

---

## 6. Could a classifier trained on the pairs do better?

The shipped model was trained for a binary decision, so its single score failing to carry a
four-way distinction is expected rather than damning. The fair question is whether a classifier
on top of existing features could. A small multinomial logistic probe was fitted to answer it —
**not a shippable model, and it was not trained as one.**

**Splits are group-aware.** The corpus's own splits are used, and they are lineage-disjoint by
construction: `heldout_source` holds whole unseen sources, `heldout_rewriter` holds every row
rewritten by **Mistral, a family absent from training**, and `heldout_register` holds the whole
technical-explainer register. Verified: **no lineage appears in two splits.**

Two feature arms:

- **arm A** — the shipped model's own outputs: highest and second-highest segment margin, mean,
  min, median, standard deviation, peakiness, fraction of sections above each flag arm, section
  count, log word count.
- **arm B** — arm A plus five document-only surface features (type-token ratio, MATTR,
  adjacent-sentence cohesion, sentence count, mean sentence length), each **computed from the
  text**, so all are available at inference on a document with no known original.

Balanced accuracy, pooled across the three held-out splits:

| arm | task | n | balanced accuracy | chance | per-class recall |
|---|---|---:|---|---|---|
| A | three-class | 754 | 67.6% | 33.3% | human 94%, AI+rewrite 67%, pure AI 42% |
| B | three-class | 754 | 68.5% | 33.3% | human 96%, AI+rewrite 57%, pure AI 53% |
| A | **four-way** | 1,199 | **53.0%** | 25.0% | human 71%, human+AIedit 44%, AI+rewrite 67%, pure AI 29% |
| B | **four-way** | 1,199 | **53.1%** | 25.0% | human 72%, human+AIedit 46%, AI+rewrite 55%, pure AI 40% |
| A | AI+rewrite vs pure AI | 598 | 57.5% | 50.0% | AUROC 0.561–0.621 across splits |
| B | AI+rewrite vs pure AI | 598 | 57.8% | 50.0% | AUROC 0.601–0.606 across splits |
| A | human vs human+AIedit | 601 | 69.1% | 50.0% | AUROC 0.755–0.833 across splits |
| B | human vs human+AIedit | 601 | 70.5% | 50.0% | AUROC 0.755–0.839 across splits |

**A trained probe does not rescue the AI side.** It lifts pure-AI-versus-rewritten-AI from
below chance to AUROC ≈ 0.60 — enough to say the classes are not literally identical, nowhere
near enough to label a named person's document. The human side reaches AUROC ≈ 0.78, essentially
what the shipped scalar already gives. Adding surface features buys about one point.

The probe held up best on `heldout_rewriter` (Mistral, a family it never saw), which is
reassuring about generalisation across rewriting models and makes the weak result harder to
dismiss as a training artefact.

### A leak found and fixed, recorded because it nearly produced a beautiful false result

The first version of arm B read `ttr_output`, `mattr_output`, `adjacent_cohesion_output` and
`sentence_count_output` straight from the corpus. All four are `None` on **every** source row and
present on **every** rewritten row, so they encode "is this a source row" — which, for both
load-bearing binaries, *is the class label*. That probe scored **AUROC 1.000 on every split**.
The features are now recomputed from the text and arm B lands at 0.60 and 0.79, one point above
arm A. A perfect held-out score is a bug report, not a finding.

---

## 7. What the label would cost — the number the product decision turns on

A verdict that says "but AI edited" about someone's writing is an accusation of the same kind as
"AI-generated", so it has to be judged at the same discipline the tool already keeps: **1.0%
human false positives**. Hold the rate at which genuinely human writing is wrongly told it was
AI-edited, and read off how much AI-edited writing is caught there.

**Best available detector (probe arm B, held-out splits only, n = 156 human / 445 edited):**

| false-label budget | all intensities | light | medium | heavy |
|---|---|---|---|---|
| **1%** | **21.3%** [17.8–25.4] | 2.6% | 20.6% | **43.1%** [35.1–51.4] |
| 2% | 39.3% | 7.2% | 47.1% | 66.4% |
| 5% | 46.7% | 14.4% | 54.8% | 73.7% |
| 10% | 49.2% | 19.0% | 56.8% | 74.5% |
| 20% | 60.4% | 35.9% | 63.9% | 83.9% |

On the shipped score with no probe at all, the same table reads 11.7% at a 1% budget and 22.4%
for heavy edits.

**The other label, for completeness.** Pure AI wrongly called "AI, rewritten", against rewritten
AI caught: at a 1% budget **2.3%** [1.5–3.5]; at 20%, 23.5%. There is no operating point.

### What that means in plain terms

Ship *"Likely human but AI edited"* at the 1% discipline and it is **wrong about a genuinely
human writer 1 time in 100**, while **missing 79% of the documents it exists to catch** — 97% of
light edits. Loosen to 5% to catch about half, and one human writer in twenty is told their own
work was machine-edited. **A light copy-edit is invisible at every budget**, and a light
copy-edit is what most people actually do.

Ship *"Likely AI but human edited"* and there is no honest operating point at all, because the
underlying ordering is inverted.

---

## 8. Limitations, stated plainly

- **The corpus is LLM paraphrase, not commercial-humaniser output.** Restated here because it is
  the largest limitation and it applies to every number above. See the opening section.
- **`ai_original_human_edited` does not exist in this project.** "Likely AI but human edited" was
  measured against AI-then-LLM-rewritten as a proxy. The proxy is the generous case and it still
  fails, which strengthens the negative conclusion — but a genuine human-edit corpus could in
  principle behave differently, and nothing here rules that out.
- **9.0% of the AI sources touch the shipped model's training set.** Measured by 64-character
  shingle containment against `cycle2-corpus/corpus.jsonl`: 27 of 300 AI sources touch a cycle-2
  `train` row, against 1 of 300 human sources. The matcher was validated first (it finds 75% of
  `generated-corpus` documents, of which 2,628 of 4,047 are known to feed cycle 2) and
  negative-controlled (1% on fresh human long-form). This inflates pure-AI scores slightly, which
  *widens* the apparent AI/rewrite gap — so it cannot be the reason that contrast failed.
- **Median document is 343 words.** The shipped headline is a long-document figure. Absolute
  detection rates here are lower than the published ones for that reason and are not comparable
  to them.
- **The probe is a linear model on twelve or seventeen features.** A larger model trained
  end-to-end on the pairs might do better than 0.60 on the AI side. This measurement bounds what
  the *existing* features support; it does not prove no model could ever separate them.
- **600 sources, one build, one seed.** Intervals are cluster-bootstrapped over lineages, so they
  reflect that, but this is a single corpus.
- **The corpus contains no mixed documents**, so the half-human/half-AI case that `HANDOVER.md`
  §9 item 4a identifies as the aggregation rule's known weakness is invisible here, as it is to
  every measurement fitted this way.

---

## 9. Recommendation

**Do not ship the four-way verdict.** Specifically:

1. **"Likely AI but human edited" — closed.** The distinction does not exist in the measurement,
   and what signal there is points backwards: rewriting AI text makes it more detectable, not
   less. AUROC 0.448 [0.431–0.466] on the shipped score, ≈0.60 for a trained probe. This closes a
   request the owner has raised repeatedly, and it closes it with a number.
2. **"Likely human but AI edited" — real, and not good enough.** AUROC 0.751 overall, 0.866 for
   heavy rewrites, with a paired shift that is large and 96.7% consistent. But at the project's
   own 1% false-label discipline it catches 21% and misses 97% of light edits, and the failure
   mode is telling a human writer their own work was machine-edited. `REDESIGN.md` §7 called this
   "the same class of defect as the green 'Likely human' gauge on an 80.8% document". It is.
3. **The two-way verdict remains the ceiling**, as `REDESIGN.md` §7 concluded before this
   measurement existed. That section can now cite a number instead of an absence.
4. **This belongs in `docs/research-drafts/measured-and-declined.md`** as a fourth entry, next to
   the GPT-2 surprisal tier, the zero-shot family and per-sentence highlighting. A capability was
   asked for, built to the point of measurement, and declined on the numbers.

**What would change the answer.** Not more of this corpus. The two things that would are a real
`ai_original_human_edited` set — professional human edits of AI drafts, which this project has
never held — and commercial-humaniser output, which is being established separately. If
commercial tools transform text differently from a plain "reword this" instruction, every figure
here would need re-measuring against them before any four-way verdict could be reconsidered.

---

## 10. Reproduction

```
cd services/local-engine/research
current-models/.venv/bin/python cycle4-separability/prove_harness.py /tmp/baseline.json
current-models/.venv/bin/python cycle4-separability/score_pairs.py   /tmp/pair-scores.jsonl
current-models/.venv/bin/python cycle4-separability/analyse.py /tmp/pair-scores.jsonl /tmp/results.json
current-models/.venv/bin/python cycle4-separability/cost.py    /tmp/pair-scores.jsonl /tmp/cost.json
```

`prove_harness.py` must print `HARNESS PROOF: PASS` first. The proof run takes about an hour on
8 CPU threads; the 2,302 paired rows take about two and a half minutes. `.jsonl` outputs are
gitignored by project policy (`.gitignore:41`); the scripts and the JSON summaries are committed
under `cycle4-separability/`.

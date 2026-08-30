# 5,558 documents, a quarantine, and the file it was never pointed at

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/how-we-built-the-corpus/`

---

## The finding

Every accuracy figure this tool publishes is measured on 5,558 documents assembled for that purpose:
4,636 human documents from seven licensed sources, and 922 machine-written documents generated
through OpenRouter after the shipped model finished training. Each candidate was hashed against the
material it had to be independent of, with an exact collision set to abort the build.

**The quarantine did not fully hold.** It was pointed at four held-out files totalling 6,074 hashes,
and it did its job against them: zero exact collisions. The cycle-2 training file was not one of the
four. Measured afterwards, **268 of the 922 machine-written documents (29.1%) appear in the cycle-2
dataset, 168 of them in the training split**. The human half is effectively clean, at 11 of 4,636.

That is the centre of this page rather than a footnote at the bottom of it. The design was sound and
the index was incomplete, which is a more useful lesson than a clean result would have been, and it
is the reason the phrase "hash-quarantined against every training split" has been withdrawn from
this project's records.

---

## Provenance

| | |
|---|---|
| Corpus | `services/local-engine/research/longform-corpus/`, built 28 August 2026 |
| Size | **5,558 documents: 4,636 human, 922 AI** |
| Machine side | 13 current models through OpenRouter, generated **after** the cycle-2 model was trained, 800–2,000 word targets, across eight long-form registers and three prompt styles |
| Spend | $12.33 of the $13 authorised, per-call cost stored on every machine-written row so the total is recomputable from the delivered file |
| Sources | `longform-corpus/MANIFEST.md`; contamination measured in `research/corpus-reconciliation-2026-08-29/analysis.txt` §2 and recorded in [`docs/measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../measurements/CORPUS-RECONCILIATION-2026-08-29.md) §2.1 |

---

## What is in it, and under what licence

Every row carries its licence string. Where two authorities disagree, both are recorded.

| source | documents | licence | registers |
|---|---|---|---|
| Europe PMC open-access | 1,425 | per article: CC BY, CC BY-NC, CC BY-NC-ND, CC BY-NC-SA or CC0. Any other licence is rejected at fetch time | academic introduction, literature review, discussion, conclusion |
| GOV.UK research and policy reports | 851 | Open Government Licence v3.0 | white paper, research summary, company update |
| Congressional Research Service | 420 | US government work, 17 U.S.C. 105 | white paper |
| Global Voices | 420 | CC BY 3.0 | long-form journalism |
| Mongabay | 420 | CC BY-ND 4.0, stored verbatim as ND requires | long-form journalism |
| SEC EDGAR 10-K Item 7 narrative | 420 | mandatory public disclosure; every row carries its Archives URL | company update |
| PERSUADE 2.0 student essays | 420 | CC BY 4.0 upstream; the mirror used declares MIT. **Both recorded, because they differ** | student essay |
| Internet Archive Creative Commons texts | 260 | per item, the uploader's `licenseurl` | story |
| Opace OpenRouter generation run | 922 | owner-generated | all eight long-form registers |

The exclusions show the judgement as clearly as the inclusions. Abstracts were dropped from Europe
PMC because they are formulaic and are not what anyone pastes into a detector. PDF-only GOV.UK
publications were skipped rather than OCR-guessed. Financial tables were stripped from 10-K filings
before chunking, and any passage still mostly figures failed the prose test. Per-source and
per-register capping limits how far one publisher can dominate a register, at most three passages
per SEC filing and at most four items per Internet Archive uploader.

Four sources were examined and refused. The Conversation would have been the single best fit for
long-form journalism written by academics, and its republishing terms state that its Creative
Commons licence prohibits using its content as training data for AI systems. Strange Horizons
reserves all rights on behalf of its authors. BAWE is registration-gated with no redistribution
right, and ICLE is commercially licensed. Excluding the best-fitting source on the publisher's own
terms is the largest single loss in the build.

## The quarantine, as designed

Every candidate document is hashed on normalised text: NFKC, lower-cased, punctuation stripped,
whitespace collapsed. That hash is checked against an index of material the corpus must be
independent of. **An exact collision aborts the build**, because an exact collision is proof rather
than evidence.

Near-duplicates are screened separately, at 12-word shingle overlap with a 25% threshold. Those are
dropped and listed in the manifest rather than aborting the build, because a shingle hit is a
heuristic and a build that halts on a heuristic will be disabled by whoever runs it next.

Splits are group-aware: 60/15/25 by SHA-256 of a group key, with every variant of a source sitting
in the same split as its source. In the cycle-3 build the group key is the post slug, chosen so that
one key covers both "same source URL" and "same topic".

The guard is not decorative, and there is a measurement showing it fires. The cycle-4 build checked
every candidate against the normalised hashes of all **11,004** documents in five measurement sets
and their **2,684** source references, and **caught and excluded three rows**: duplicate uploads of
the same public-domain work. That build asserts if more than 25 rows are caught, on the reasoning
that a large number would mean the exclusion-by-source step had failed rather than that coincidence
had happened.

## What it was pointed at, and what it missed

The index for this build held 6,074 hashes from four files:

| held-out source | texts |
|---|---|
| `eval-samples.json` | 34 |
| `provider-eval/eval-set.jsonl` | 1,896 |
| `tests/battery/human-corpus-v1.json` | 40 |
| `tests/battery/human-corpus-v2.json` | 4,144 |

Result: **0 exact collisions, 2 near-duplicates dropped, 505 internal duplicates dropped.** Against
what it was pointed at, the design worked exactly as specified.

`cycle2-train/dataset.jsonl` is not in that table. It is the training file for the model this corpus
was built to evaluate, and it was built the same day. The index covered the evaluation material and
the human battery, and not the training set itself.

Measured afterwards on normalised SHA-256:

| corpus | rows | also present in the cycle-2 dataset |
|---|---|---|
| `longform-corpus/ai-longform.jsonl` | 922 | **268 (29.1%)** — 168 train, 72 test, 28 calibration |
| `longform-corpus/human-longform.jsonl` | 4,636 | **11 (0.24%)** — 5 train, 3 calibration, 3 test |

## What it cost, in points

The effect was measured directly, by splitting the machine-written half into the documents that
appear nowhere in the cycle-2 dataset and those that do.

**Detector `tier3-cycle2-e5small-fp32.onnx`, fp32 Python `onnxruntime`, maximum-over-sections
aggregation, at the superseded `0.984` single-threshold rule. This is not the shipped operating
point.**

| subset | n | detected |
|---|---|---|
| never in the cycle-2 dataset | 654 | **620 = 94.80%** |
| in the cycle-2 dataset, any split | 268 | 257 = 95.90% |
| in the cycle-2 **train** split alone | 168 | 163 = 97.02% |

Two gaps, and both should be quoted with the pair they describe. Against the seen subset the
independent subset reads **1.1 points lower**. Against the training split alone it reads **2.2
points lower**. Weighted across the corpus, contamination is worth about **0.3 points** on the
headline detection figure.

**No seen-against-unseen split has been measured at the shipped `0.9855 / 0.9763` pair.** The three
rows above are at 0.984 and must not be relabelled or reprinted under a shipped-pair heading. A
re-measurement is outstanding.

The effect is small and the correction is not that it is small. It is that a figure published as
"documents the model had never seen" was, for 29.1% of the machine-written half, a figure about
documents it had seen. Where a page's whole argument rests on unseen data, the **654-document
independent subset** is the population to use, and it should be named as such rather than described
as "the corpus".

### One caveat the manifest carried from the start

PERSUADE 2.0 is not held-out material. It also appears in the cycle-2 training corpus, and the
manifest says plainly that anyone combining the two corpora must deduplicate on `norm_sha256`. That
was recorded on the day the corpus was built and it was correct. It is the most important single
caveat on this page and it must not be softened.

---

## What this corpus does not cover

- **Humanities full text at scale.** Europe PMC is a biomedical index first. Twenty-two subject
  queries widened it deliberately, into education, sociology, linguistics, history, ethics,
  policy and law, anthropology, business, economics and media, and the discipline label is carried
  per row. It remains health-adjacent humanities rather than literary criticism, theology or
  philosophy proper. A detector tuned on this material should not be claimed to be validated on
  humanities essays.
- **Modern open-licensed short fiction barely exists**, and the fiction register is the weakest
  source in the corpus for that reason. What remains is the Internet Archive's Creative Commons text
  pool, which is uneven self-publishing and scanned material; some passages are creative non-fiction
  or essays about literature rather than fiction, and some are OCR of scanned pages. This register's
  numbers deserve more suspicion than the others, and it is also the register with the project's
  worst human false-positive rate.
- **The white-paper register is two governments**, the UK and the US. Think-tank, NGO and
  standards-body publications were sought and are largely PDF-first or non-commercially licensed.
- **Global Voices is substantially translated into English**, which is a different kind of English
  from an originating newsroom.
- **The delivered GOV.UK era span is 2014–2022**, not the 2018–2022 the filter asked for, because
  the search filter and the recorded year are different fields. This is stated in the manifest.
- **Pre-2022 corporate blogs under an open licence were searched for and not found at useful scale.**
  SEC management discussion and analysis stands in for corporate communications, and it reads
  differently: it is written under legal review.
- **The machine-written side is the easy case.** These are single-shot generations from a fixed bank
  of 68 topics across three prompt styles. Nothing here is edited, human-revised or adversarially
  rewritten, and nothing measures hybrid human-and-machine text.
- **The corpus holds no mixed documents and no machine-written document above 3,061 words.** The
  server accepts up to 4,000 words, so the unmeasured range starts inside what it will score.
- **Register labels are machine-assigned.** Every per-register figure anywhere in this project
  inherits that.
- **The 25,723-document figure from the signal study is a different corpus** — six pooled sources,
  de-duplicated — and must never be conflated with these 5,558.

---

## Charts this page needs

All new.

**1. Human-side composition by source and licence.** Stacked or grouped horizontal bars, one row per
source, counts printed on the bars, licence named in the row label.

- Europe PMC 1,425 (CC BY family / CC0); GOV.UK 851 (OGL v3.0); CRS 420 (17 U.S.C. 105); Global
  Voices 420 (CC BY 3.0); Mongabay 420 (CC BY-ND 4.0); SEC EDGAR 420 (public disclosure); PERSUADE
  2.0 420 (CC BY 4.0 upstream / MIT mirror); Internet Archive CC texts 260 (per item). Total 4,636.
- Source: `longform-corpus/MANIFEST.md`.

**2. Machine-side composition by model.** Horizontal bars, counts only, no detection rates on this
chart.

- `deepseek-v4-pro-0813` 131, `openai/gpt-5.6-luna` 121, `google/gemini-3.7-flash` 121,
  `x-ai/grok-4.6` 121, `qwen/qwen3.8-max` 110, `meta-llama/llama-4-maverick` 101, `z-ai/glm-5.3` 67,
  `mistralai/mistral-medium-3-5` 41, `anthropic/claude-sonnet-5` 26, `moonshotai/kimi-k3` 26,
  `anthropic/claude-opus-5` 23, `google/gemini-3.1-pro-preview` 21, `openai/gpt-5.6-sol-pro` 13.
  Total 922.
- Source: `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` Table 2 (denominators column).

**3. The quarantine, drawn — and where it leaked.** A flow diagram: fetch → normalise (NFKC,
lower-case, strip punctuation, collapse whitespace) → SHA-256 → exact-collision check against the
index → 12-word shingle screen at 25% → group-aware 60/15/25 split. The index box lists its four
files with their counts (34, 1,896, 40, 4,144 = 6,074) and a fifth box, drawn outside the index and
clearly marked as absent, is `cycle2-train/dataset.jsonl`. This diagram is the page.

**4. What the leak was worth.** Three bars with denominators, and the threshold named in the
subtitle rather than the title, because it is not the shipped one.

- never in the cycle-2 dataset 620/654 = 94.80%; in the dataset, any split 257/268 = 95.90%; train
  split alone 163/168 = 97.02%.
- Subtitle: fp32, maximum-over-sections, at the superseded 0.984 single-threshold rule. Not measured
  at the shipped pair.
- Source: `corpus-reconciliation-2026-08-29/analysis.txt` §2.

---

## Rewrite liabilities (not body copy)

- **The seen-against-unseen split has never been measured at the shipped pair.** If it is, section
  "What it cost, in points" is replaced wholesale rather than edited, and the threshold caveat
  attached to chart 4 comes off.
- **cycle-4a** is measured and not shipped. It was trained on a corpus that includes material
  derived from these sources, so if it ships, the independence question has to be re-asked against
  its own training file rather than cycle 2's.
- The wording "hash-quarantined against every training split" and "documents the model had never
  seen" appeared in `DETECTION-BY-LENGTH-AND-MODEL.md` and `PER-MODEL-DETECTION.md`. The first has
  since been corrected at the head of that file. Check the second before this page goes live, since
  every page on the site inherits that wording.

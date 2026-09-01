# Model and data provenance

Current as of 29 August 2026. **Model-lane update, 1 September 2026: cycle-5 (`tier3-cycle5-v1`)
replaced cycle-2 (`tier3-cycle2-v1`) as the shipped model.** The table below is retitled and
updated for cycle-5; the cycle-2 table beneath it is retained, marked historical, and must not be
read as describing what is served today. Source: `services/local-engine/research/cycle5-train/CYCLE5-REPORT.md`
and the shipped `public/models/local-signals-v1/thresholds.json`.

A trained model **is** included and **is** distributed. It is served from the live checker at
<https://opace.agency/tools/ai/content-verification-integrity/checker/> and downloaded to the
visitor's browser on explicit consent. Training and evaluation corpora were built inside this
repository. This file records what they are, where they came from and what is still outstanding.

The earlier statement that no model or dataset was included, downloaded or approved described the
Phase 0 foundation and has been superseded.

## The shipped model (cycle-5, current)

| field | value |
|---|---|
| Artefact | `tier3-cycle5-full-e5small-int8-perchannel.onnx` |
| Config version | `tier3-cycle5-v1`, deployed 2026-09-01 |
| Base model | `intfloat/e5-small` |
| Parameters | 33.36M (+8 z-normalised structural features, `features-v1` contract) |
| Export | dynamic int8 ONNX, per-channel (per-tensor is not used on this project) |
| Size | 34.3 MB (34,301,767 bytes) — within 22 KB of the cycle-2 file it replaces |
| Max sequence length | 512 tokens |
| Operating point | margin space: flag iff `max(m1, m2+0.34) >= 3.571` (display-probability equivalents 0.9679/0.9562), not a bare probability threshold |
| Input normalisation | `raw-v1` (cycle-2's `md-strip-v1` is retired) |
| Served from | `public/models/local-signals-v1/` on the Astro site |
| Runtime | onnxruntime-web in the visitor's browser; no pasted text leaves the browser |
| Recorded in | `services/local-engine/research/cycle5-train/CYCLE5-REPORT.md`, the shipped `thresholds.json`, and the served `manifest.json` |

### The previous shipped model (cycle-2, superseded 1 September 2026)

| field | value |
|---|---|
| Artefact | `tier3-cycle2-e5small-int8-perchannel.onnx` |
| Config version | `tier3-cycle2-v1`, trained 2026-08-28, live 2026-08-28 to 2026-09-01 |
| Base model | `intfloat/e5-small` |
| Parameters | 33.36M |
| Export | dynamic int8 ONNX, per-channel (per-tensor is not used on this project) |
| Size | 34.3 MB (34,279,909 bytes) |
| SHA-256 | `b0b985cdabdc61ce05fae5568e69911c2e5b49680477f81e5e8f1a48afa30459` |
| Max sequence length | 512 tokens |
| Operating point | 0.984 calibrated probability, fitted through onnxruntime-web (later refitted to 0.9855/0.9763; see the evidence index) |
| Served from | `public/models/local-signals-v1/` on the Astro site, until 1 September 2026 |
| Runtime | onnxruntime-web in the visitor's browser; no pasted text leaves the browser |
| Recorded in | `services/local-engine/research/models/tier3-cycle2-config.json`, `services/local-engine/research/cycle2-train/onnx-export-report.json`, and the served `manifest.json` |

The consent step fetches exactly two files, 34,511,417 bytes in total: the classifier above and
`vocab.txt` (SHA-256 `07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3`). The GPT-2
Tier 2 assets listed in the served manifest are gated off (`tier2_enabled: false`) and are not
fetched, hashed or cached; the Tier 2 head was calibrated against the cycle-1 classifier and would
need recalibrating before it could ship alongside cycle 2. The onnxruntime-web WebAssembly binaries
are fetched by the runtime outside the consent list.

### Base-model licence — outstanding

**The licence of `intfloat/e5-small` is not recorded in this repository — it must be confirmed
before public release.** `CYCLE2-REPORT.md`, `dataset-manifest.json`, `onnx-export-report.json` and
`tier3-cycle2-config.json` all name the base model and its parameter count, and none of them records
a licence, a canonical URL or an immutable revision. The three `licen*` mentions in the training
report all concern `human-corpus-v2`, not the base weights.

Outstanding fields for the shipped model, against the standing requirement below:

| field | status |
|---|---|
| Owner | recorded (`intfloat`, via the model id) |
| Canonical URL | **not recorded** |
| Immutable revision or upstream hash | **not recorded** |
| Licence | **not recorded** |
| Acceptable-use terms | **not recorded** |
| Training-data provenance of the base model | **not recorded** |
| Languages and domains | English; published-register prose. Recorded. |
| Resource size and expected files | recorded, with SHA-256, in the served `manifest.json` |
| Redistribution decision | made and acted on — the fine-tuned artefact is distributed to every visitor |
| Test evidence | recorded, `cycle2-train/CYCLE2-REPORT.md` and `eval-results.json` |
| Removal process | the artefact and its manifest entry are removable from `public/models/local-signals-v1/` in one deployment |

The redistribution decision was taken and executed ahead of the licence check. That order is wrong
and the gap must be closed before the public repository, npm, PyPI, WordPress.org or Chrome Web
Store gates open.

### Cycle 1 and cycle 3

The cycle-1 classifier `tier3-e5small-int8-perchannel.onnx` was removed from the served directory;
it detected 2.5% of fresh AI long-form against cycle 2's 90.6%. It is retained in the research tree
and not overwritten. Cycle 3 was trained and measured but deliberately not shipped: int8
quantisation costs it 5.2 points of recall, so it cannot run in the browser at all.

## The training corpus

`services/local-engine/research/cycle2-corpus/corpus.jsonl`, built 2026-08-28. **15,514 documents:
5,655 AI and 9,859 human**, published register on both sides, group-aware splits, quarantined
against the evaluation sets by normalised-text SHA-256. Per-source licences are recorded in
`cycle2-corpus/MANIFEST.md` and reproduced here exactly as that manifest states them.

| source | licence, as recorded in `MANIFEST.md` | used for |
|---|---|---|
| `elisabeth-pl-pl/GRADTEX` | CC BY 4.0. Built on MAGE (Apache-2.0); human texts inherited from MAGE. | AI article, tech-news, scientific, encyclopaedic and review prose; the MAGE human pool. |
| `mild-rgb/aita-human-vs-ai` | Apache-2.0 | AI side of the social register. The human half is redacted upstream and is not usable. |
| `HAT-Baselines/HAT-Bench` | Apache-2.0 | Both sides across student essays, research abstracts, news and business reports; v0 human, v1–v8 progressively AI-edited. |
| `anyangsong/MAGA` | MIT | Older-era AI coverage tagged `2024-2025-older`; human rows for the reference and social registers. |
| `allenai/c4` (en) | ODC-BY 1.0 | The bulk of the human business, marketing and SEO copy. ODC-BY covers the database; the underlying pages remain their authors' copyright and use here is research use. |
| `realbenpope/PERSUADE_manageable` | MIT (mirror); upstream PERSUADE 2.0, The Learning Agency Lab, CC BY 4.0. Both are recorded because they differ. | Human academic register, non-professional writing. |
| Opace OpenRouter generation run | Owner-generated, unrestricted internal use | Current-model AI across the registers the tool's users check. |
| `tests/battery/human-corpus-v1.json`, `human-corpus-v2.json` | Owner-curated (Opace); a research-evaluation quotation set. | Admitted and pinned to the test split. Never trained on, never used for calibration. |

Caveats the corpus manifest records and this file does not soften: the 2026 frontier generators
appear only in GRADTEX's own test split, so those rows are re-split by content hash and anyone
benchmarking against a published GRADTEX leaderboard must not use this corpus's train rows; the
AITA human half being redacted is a genuine confound for the social register; HAT-Bench, MAGA and C4
were read as bounded byte ranges from the head of each file rather than uniform draws; C4 genre
labels are assigned by URL and phrase heuristics, not by a person reading each page.

## The evaluation corpora

**`longform-corpus/`** — built 2026-08-28. **5,558 documents: 4,636 human, 922 AI.** This is the
fresh, never-seen corpus every published accuracy figure is measured on. Per-source licences from
`longform-corpus/MANIFEST.md`:

| source | documents | licence, as recorded |
|---|---:|---|
| Europe PMC open-access subset | 1,425 | per article, one of CC BY, CC BY-NC, CC BY-NC-ND, CC BY-NC-SA or CC0; the exact string is stored on every row and other licences are rejected at fetch time |
| GOV.UK research, policy and corporate reports | 851 | Open Government Licence v3.0 (Crown copyright); documents asserting third-party copyright are dropped |
| Congressional Research Service reports | 420 | works of the United States government, not subject to copyright under 17 U.S.C. 105 |
| Global Voices | 420 | CC BY 3.0 |
| Mongabay | 420 | CC BY-ND 4.0; storage is verbatim, which ND permits |
| SEC EDGAR 10-K Item 7 narrative | 420 | mandatory public disclosure; the SEC asserts no copyright. Filers may hold copyright in the underlying text; use here is research use of a public record and every row carries the Archives URL |
| PERSUADE 2.0 student essays | 420 | CC BY 4.0 upstream; the `realbenpope/PERSUADE_manageable` mirror declares MIT. Both recorded because they differ |
| Internet Archive Creative-Commons texts | 260 | per item, the `licenseurl` the uploader set — CC BY, CC BY-ND, CC BY-NC-ND, CC BY-NC-SA or the CC public-domain mark; stored per row |
| Opace OpenRouter long-form generation run | 922 | owner-generated, unrestricted internal use |

The manifest also records what was excluded on licence grounds and why. The Conversation was
excluded on the publisher's own terms, which prohibit using its content as AI training data, and its
loss is the largest single gap in the human long-form set. Strange Horizons, BAWE, ICLE, ASAP-AES and
the Internet Archive pulp-magazine archive were all rejected or unobtainable on licence grounds. The
Internet Archive Creative-Commons pool is the weakest source in the corpus and its story-register
numbers should be treated with more suspicion than the rest.

**`generated-corpus/generated.jsonl`** — Opace's own OpenRouter run, 2026-08-28. 4,050 documents
requested, **4,016 usable** after 34 quarantined, 3,100,043 words, 21 models across 10 providers,
$61.70 of an authorised $75 cap. Owner-generated and **ours to publish**. The inventory, exact
unsanitised model ids, register families, prompt styles, temperatures and per-file counts are in
`generated-corpus/INDEX.md` and `generated-corpus/manifest.json`.

## Integrity note: `tests/battery/human-corpus-v2.json`

4,144 human-written passages, every one dated before 1 December 2022, 973 of them flagged as hard
negatives. Its own manifest (`tests/battery/HUMAN-CORPUS-V2.md`) states the licence position
plainly: this is a research-evaluation quotation set, short verbatim excerpts held privately for
detector calibration and false-positive measurement, making no redistribution claims. It must not be
shipped in product artefacts, published, or used as model-training data beyond threshold calibration
and hard-negative selection.

Two things follow, and both are recorded because they make the published numbers trustworthy rather
than flattering:

1. **The training agent honoured the restriction.** It declined to train on the corpus and held it
   entirely in the test split, which also keeps it an unbiased measurement set. The hard negatives
   it identified were instead learned from 384 licence-clear training humans selected by the same
   structural test. `dataset-manifest.json` carries the licence note and the 4,176 evaluation-only
   row count; `tier3-cycle2-config.json` repeats it.
2. **A topic-level leakage defect in the upstream corpus was found and fixed.** Generated articles
   had been grouped by their own text hash, so all 105 topics appeared in train and the generated
   slice of test was topic-contaminated. The rows were re-split with `group=topic_id`, stratified by
   genre so every long-form category contributes at least one held-out topic: 70 topics to train, 16
   to calibration, 19 to test, recovering 1,722 rows.

The corpus is not distributed in any product artefact.

## Standing requirement — unchanged

Every future model or dataset manifest must record owner, canonical URL, immutable revision or hash,
licence and acceptable-use terms, training/data provenance where available, languages and domains,
resource size, expected files, redistribution decision, test evidence and removal process. A
compatible code licence does not grant model or dataset rights.

For the shipped model, canonical URL, immutable revision, licence, acceptable-use terms and
base-model training provenance are all still outstanding. See the table above.

Benchmark fixtures added here must be authored synthetic text or have a recorded redistributable
licence. Customer and client text is prohibited from fixtures and public benchmarks.

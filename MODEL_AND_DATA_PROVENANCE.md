# Model and data provenance

**Current at 1 September 2026.** Cycle 5 is deployed on both checker routes. Cycle 2 is retained
as explicitly historical evidence. A candidate label inside the 31 August training artefacts
records their state when written; the owner-authorised 1 September deployment record is the
authority for the current release state.

## Current shipped model: Cycle 5

| Field | Value |
|---|---|
| Public identity | `tier3-cycle5-v1` |
| Server registry identity | `tier3-cycle5-full` |
| Base encoder | `intfloat/e5-small` |
| Architecture | e5-small pooler output plus eight z-normalised structural features, dropout 0.1, linear head |
| Parameters | 33.36M plus the eight-feature input |
| Inputs | `input_ids`, `attention_mask`, `feats[8]` |
| Feature contract | `features-v1`; non-finite values become zero after train-fitted z-normalisation, clipped to ±4 |
| Input contract | `raw-v1` |
| Segmentation | `segments-v3` |
| Scoring | `margin-v1`; flag iff `max(m1, m2 + 0.34) >= 3.570935` |
| Display calibration | temperature 1.0479; calibration does not set the flag |
| Selected checkpoint | epoch 1; epoch 2 rejected at 1.08% int8 verdict flips |
| fp32 artefact | `tier3-cycle5-full-e5small-fp32.onnx`, 133,766,349 bytes, SHA-256 `45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057` |
| int8 artefact | `tier3-cycle5-full-e5small-int8-perchannel.onnx`, 34,301,767 bytes, SHA-256 `9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b` |
| Current server deployment | Cloud Run revision `opace-detector-00010-4dt`, build identifier `45e00978b10d1df6` |
| Browser runtime | onnxruntime-web/WebAssembly, downloaded on explicit route choice |
| Source records | [`CYCLE5-REPORT.md`](services/local-engine/research/cycle5-train/CYCLE5-REPORT.md), [`CYCLE5-OPERATING-POINT-2026-08-31.md`](docs/measurements/CYCLE5-OPERATING-POINT-2026-08-31.md), model config and deployment safety record |

The server route sends the submitted text to Opace's EU service and reports `retained: nothing`.
The browser route downloads the int8 model and keeps the submitted text on the device. These are
separate privacy and numerical runtimes; they are not described as identical.

## Base-model licence record

`intfloat/e5-small` is published under the **MIT licence**, confirmed from its canonical model card
on 29 August 2026 and recorded in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The canonical
URL is <https://huggingface.co/intfloat/e5-small>. This closes the earlier statement that the
base-model licence was unknown.

The remaining provenance gaps are narrower and must remain visible:

| Field | Status |
|---|---|
| Owner/model id | recorded: `intfloat/e5-small` |
| Canonical URL | recorded |
| Licence | recorded: MIT |
| Immutable upstream revision or file hash | **not recorded** |
| Separate acceptable-use terms | **not recorded** |
| Base-model training-data provenance | **not recorded in this repository** |
| Opace derivative hashes | recorded above |
| Removal process | remove the served artefacts and manifest entries in one website deployment; select the retained Cycle-2 files for server rollback if required |

The licence finding permits redistribution under its terms; it does not fill the missing immutable
revision or upstream training-provenance fields.

## Cycle-5 dataset

`services/local-engine/research/cycle5-train/dataset-manifest.json` records **31,800 rows**:
18,682 train, 3,859 calibration and 9,259 test. The train split contains **8,327 AI and 10,355
human examples**, with 103 exact generator identifiers on the AI side. Those identifiers include
aliases and dated revisions and are not 103 independent model families.

The dataset consists of:

- the 28,295-row Cycle-4 base, with eight normalised-hash near-duplicates removed;
- 399 AI-origin neural rewrites and 135 heavy AI edits of human originals used on the AI side;
- 2,361 licence-clear GREEN structured-human documents in training;
- 618 non-evaluation matched generations from the frozen generation snapshot; and
- the existing cycles' group-aware corpora and held-out battery pins.

Light and medium AI edits of human originals were excluded from training because either binary
label would misstate their mixed origin. The 750 AMBER-licence structured documents were excluded.
The 418 held-out-topic structured-human documents were reserved for evaluation. A normalised-hash
guard covering 13,288 measurement hashes prevents those measurement sets entering train or
calibration.

Training froze a 756-row matched-generation snapshot while the generator was still running. The
final matched corpus contains 1,110 pairs: 918 training-eligible and 192 evaluation-only. The
reconciliation verified that no evaluation-only row entered training; 300 later-arriving,
training-eligible rows were neither trained on nor evaluated.

## Current evaluation evidence

### Full long-form corpus

`services/local-engine/research/longform-corpus/` contains 5,558 documents: 922 AI and 4,636
human. The corpus must not be called wholly unseen. Against Cycle-2 splits:

- 654 AI documents are independent;
- 268 AI documents overlap: 168 train, 72 test and 28 calibration; and
- 11 human documents overlap a Cycle-2 split.

The current full-corpus Cycle-5 figures pool the independent and overlap subsets because no current
seen-versus-unseen split has been published for the margin rule:

| Runtime | AI flagged | Human false positives |
|---|---:|---:|
| server fp32 | 902/922 (97.8%) | 46/4,636 (0.99%) |
| browser int8/WebAssembly | 900/922 (97.6%) | 73/4,636 (1.57%) |

### Cycle-5 evaluation view

The Cycle-5 report excludes long-form documents whose text entered Cycle-5 train/calibration
directly or as the source of a trained rewrite. This leaves 675 AI and 4,500 human documents. At
the fitted server operating point it records 658/675 AI flagged and 42/4,500 human false
positives. This view is held out from Cycle-5 fitting data, but the same view was used to select the
operating point, so it is not an untouched post-fit benchmark.

### Independent matched-topic evaluation

The matched-generation topic bucket contains 176 AI documents from topics and model families not
used for fitting and 418 structured human partners. Cycle 5 flags 153/176 AI documents and 1/418
human partners. The separate Google-family cells contain only 16 documents in total and must not
be quoted without their denominators and uncertainty.

### Other evaluation assets

- `generated-corpus/generated.jsonl`: 4,016 usable Opace-generated documents from 21 models
  across 10 providers. It contains no human comparison set and overlaps earlier training work, so
  it cannot supply a standalone false-positive or independent-accuracy claim.
- `human-structured-corpus-2026-08-31/`: 3,529 documents, GREEN 2,779 / AMBER 750, with per-file
  hashes and licence decisions. Only the stated GREEN training subset was fitted.
- `tests/battery/human-corpus-v2.json`: 4,144 pre-December-2022 human passages, including 973 hard
  negatives. It is a private evaluation quotation set, not distributable product data and not
  model-training data.
- the owner seven-document field test: 3/3 AI flagged and 0/4 human falsely flagged. This is a
  useful live-flow check, not a population estimate.

## Previous models

Cycle 2 (`tier3-cycle2-v1`) was live from 28 August to 1 September 2026. Its fp32/int8 weights,
probability-pair thresholds and reports remain for reproducibility and rollback, but its accuracy
figures are historical. Cycle 1 is retained in research only. Cycle 3 and Cycle 4 candidates were
measured and rejected rather than silently overwritten.

## Standing requirement

Every future model or dataset manifest must record owner, canonical URL, immutable revision or
hash, licence and acceptable-use terms, training/data provenance where available, languages and
domains, resource size, expected files, redistribution decision, test evidence and removal
process. A compatible code licence does not grant unrelated model or dataset rights.

Customer and client text is prohibited from fixtures, model training and public benchmarks.

# Local-engine model tier — offline research foundation

Workstream ML deliverables for the WEBSITE tool's genuine AI-detection layer
(Tier 2 surprisal-rhythm engine + Tier 3 fresh-corpus classifier), per
[`research/CLEAN-PROSE-DETECTION-PLAN.md`](../../../research/CLEAN-PROSE-DETECTION-PLAN.md).

The [complete research index](../../../docs/RESEARCH-INDEX.md) links every meaningful report in this tree, the dated foundation briefs and all 21 public research papers.

## Layout

- `corpus/` — training/calibration corpus builder (`build_corpus.py`),
  local GPT-2 generation (`generate_gpt2.py`), quarantine enforcement
  (`quarantine.py`), provenance `manifest.json`, output `corpus.jsonl`.
- `tier2/` — GPT-2-small surprisal scoring and the 22-dim feature extractor
  (`surprisal_features.py`), corpus feature run (`compute_features.py`),
  logistic head training (`train_head.py`), golden vectors
  (`golden_vectors.py`).
- `tier3/` — e5-small fine-tune (`train_classifier.py`), ONNX int8 export
  (`export_onnx.py`), `checkpoint/` (fp32 weights, not for git).
- `models/` — exported artefacts: `tier2-head.json`, `golden-vectors.json`,
  `tier3-e5small-int8.onnx`, `tier3-config.json`, `tier3-sizes.json`.
- `eval/run_eval.py` — the honest moment: scores the QUARANTINED 34-sample
  eval set plus reserved corpus-test humans. The only script allowed to read
  `eval-samples.json`, and only ever after all weights/thresholds are frozen.
- `BROWSER-RUNTIME-SPEC.md` — handoff spec for the TypeScript browser runtime.

## Run

```sh
make all            # corpus -> tier2 -> tier3 -> onnx -> golden -> eval
```

`PY` must point at a Python 3.12 venv containing torch (MPS), transformers,
numpy, scipy, pandas, pyarrow, scikit-learn, onnx, onnxruntime. Override:
`make all PY=/path/to/venv/bin/python`. `EVAL_SAMPLES_PATH` must point at the
quarantined eval file; the build aborts without it (the quarantine index is
mandatory).

## Rules honoured

- Eval set is test-only; `quarantine.py` asserts 8-gram non-overlap for every
  training document and the build hard-fails on any hit.
- Thresholds are chosen FPR-first (<= 2% on calibration humans), never on the
  eval set.
- DivEye features are reimplemented from the paper (arXiv:2509.18880; the
  reference code is CC BY-NC and was not used or copied).
- Every corpus source carries its licence in `corpus/manifest.json`; gaps are
  listed there honestly.

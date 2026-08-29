# signal-science

The evidence layer for Opace AI Content Integrity: what actually separates
machine-written from human-written prose, measured on the project's own corpus,
and what the deployed detector keys on.

Everything here is read-only over the rest of the repository. Nothing outside
this directory is written by any script in it.

## Run order

```
python build_corpus.py       # unify + de-duplicate every labelled corpus
python compute_features.py   # 123 interpretable features per document
python score_neural.py       # deployed cycle-2 model over the same documents
python analyse_features.py   # effect sizes, FDR, single-feature detection
python scorecard.py          # the transparent classifier and the neural gap
python probe_model.py        # ablation, occlusion, score-feature correlation
python baselines.py          # GLTR / Fast-DetectGPT / others on our corpus
python robustness.py         # per-source and per-provider survival of each signal
python worked_examples.py    # line-by-line arithmetic on three documents
python make_tables.py        # render results/*.json into tables/*.md
```

Interpreter: `../cycle3-edited/.venv/bin/python` (numpy, scipy, scikit-learn,
onnxruntime, transformers). No network access is used and no API is called.

## Layout

| path | what it is |
|---|---|
| `SIGNAL-SCIENCE.md` | the flagship evidence document |
| `corpus/docs.jsonl` | the unified, de-duplicated analysis corpus |
| `corpus/features.jsonl` | the feature battery, one row per document |
| `corpus/neural-scores.jsonl` | deployed-model margin and calibrated score |
| `corpus/baseline-metrics.jsonl` | GPT-2-derived published-method statistics |
| `results/*.json` | every computed number, machine-readable |
| `tables/*.md` | the rendered tables the flagship document cites |
| `features.py` | the battery itself; every feature documented in place |
| `results/scorecard-model.json` | the shippable scorecard constants, both variants |

## Headline results

- **112 of 122 interpretable features** differ significantly between machine and human writing (BH-corrected, q=0.05, 5,935 matched pairs) — and the strongest eight are all one signal: **machine prose repeats itself less**.
- **Burstiness of sentence length, the most-cited AI-detection heuristic, is worthless**: AUROC 0.521.
- A **transparent 24-feature scorecard** reaches 72.1% detection at a 1% false-positive budget against the deployed neural model's 89.8%, on identical unseen data.
- **62% of the neural model's behaviour is reconstructible** from named features; only 19% of its within-class confidence is.
- Forbidding formatting features made the transparent model **better**, not worse.

## Data licences

`corpus/` is **not** redistributable. It contains rows from
`tests/battery/human-corpus-v*.json`, which are held as a research-evaluation
quotation set with no redistribution rights, and rows under source-specific
licences recorded per document in the `licence` field. Statistics derived from
it are publishable; the text is not. Worked examples quote only owner-generated
or openly licensed documents.

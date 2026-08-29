# Synthetic cadence — measurement module

Deterministic, local, no model and no network. Measures the paragraph-level rhythm of humanised
AI writing: compressed sentence triples, repeated paragraph shapes, balanced two-part
constructions, instructional closings, and the absence of conversational mess.

**This is measurement, not product.** Nothing here is wired into the engine, and the writing-rules
tier it would belong to is editorial-only by design. Findings and the shipping verdict are in
[`docs/measurements/SYNTHETIC-CADENCE.md`](../../../../../docs/measurements/SYNTHETIC-CADENCE.md).

## Files

| file | what it does |
|---|---|
| `cadence.py` | the signals. Standard library only. `compute(text)` returns the document vector; `paragraph_cadence(paragraph)` returns the single-paragraph score; `role_annotate(text)` returns `(role, sentence)` pairs for eyeballing |
| `run_corpus.py` | computes the signals over the 5,558-document long-form corpus and joins the shipped fp32 cycle-2 scores. Asserts the reused scores reproduce 877/922 and 56/4,636 before doing anything |
| `analyse.py` | fire rates, likelihood ratios, the conditional table, AUROC, the positional-weighting comparison, the combined score and its escalation |
| `analyse_rules.py` | the three signals with real conditional direction: bootstrap intervals, confound checks, the operating point and its cross-validation, and the owner's nine documents with the passages that fire |
| `test_cadence.py` | the probe. Twelve tests, four of which break the module and assert the probe then fails |

## Running it

```
python3 run_corpus.py            # ~30 s, writes cadence-features.jsonl
python3 analyse.py > analysis.txt
python3 analyse_rules.py > rules.txt
python3 -m unittest test_cadence
```

Nothing here needs the `current-models` venv — there is no model. Do not run two `run_corpus.py`
processes at once; they write the same file.

`cadence-features.jsonl` and `cadence-scored.jsonl` are gitignored. They are derived from the
corpus, which is not in the repository, and regenerate in half a minute.

## The one thing to know before using it

Several human sources in the corpus lost their paragraph breaks in extraction, including **all 260
human fiction documents**. Every paragraph-shape signal returns `NaN` on those rather than treating
"no paragraphs" as a value, because a signal that did otherwise would separate AI from human by
measuring the scraper. It also means the tool's worst false-positive register is untested here.

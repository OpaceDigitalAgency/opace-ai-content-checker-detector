# cycle4-humaniser-pairs — paired-transformation training corpus

**Training data only.** Nothing here was trained, no threshold moved, nothing
deployed and nothing published. Built 30 August 2026.

## Why it exists

`HANDOVER.md` §9 item 3: **AI rewrites of a human original are detected at
30–35%**, against 95%+ for straight AI generation. It is the tool's largest
measured weakness and the project held **no paired transformation data at all** —
every AI row in every existing corpus is a generation from a prompt, none is a
transformation of an existing text. The model has never seen the thing it is
worst at.

This corpus is the missing shape: the same source text, before and after, at
three controlled edit intensities, from both an AI-origin and a human-origin
side.

## What a row is

One source text is transformed three times by **one** rewriting model:

| intensity | instruction |
|---|---|
| `light` | copy-edit — grammar, punctuation, word choice, light tightening; sentence order unchanged |
| `medium` | structural paraphrase — every sentence reworded, sentences merged, split and reordered within a paragraph; argument intact |
| `heavy` | full rewrite — different voice, different paragraph plan, different order of points; only the underlying facts survive |

## Labels

| source side | row | `class_label` |
|---|---|---|
| AI | untouched | `ai_original` |
| AI | rewritten | `ai_original_neural_rewrite` |
| human | untouched | `human_original` |
| human | rewritten | `human_original_ai_edited` |

`edit_intensity` is a **separate field** (`none` / `light` / `medium` / `heavy`)
and is never folded into the class label. `validate()` in `measure.py` fails the
corpus if it ever is.

### What these rows are not

- **Not commercial-humaniser output.** JustDone, QuillBot, Undetectable.ai and
  the rest were not used. `commercial_humaniser` is `false` on every row and
  `transformation_family` is `generic_llm_rewrite`. Claiming otherwise would be
  a fabricated provenance record.
- **Not `ai_original_human_edited`.** An LLM rewriting prose is not a
  professional human edit. That class needs real human-edit pairs and this
  corpus does not contain any. `validate()` rejects the label outright.
- **Not confusable with `style: humanise` rows elsewhere.** Those existing rows
  are AI *originals* written under an anti-AI style instruction, with no paired
  original before the instruction. They are not sources here.

## Splits

Four files, and **every variant of a source is in the same file as its source**,
enforced on `lineage_id` before anything is written. A light edit in training
and its heavy rewrite in test would let a model score well by recognising the
source rather than the transformation.

| split | what it holds back |
|---|---|
| `train` | — |
| `heldout_source` | whole sources unseen in training |
| `heldout_rewriter` | every source rewritten by **Mistral**, a family that appears nowhere in training |
| `heldout_register` | the whole **technical-explainer** register, on both sides |

Held out on purpose beyond that: Anthropic, Qwen, xAI, Z.ai and Moonshot were
never used as rewriters at all, so a second unseen-family evaluation is
available without generating anything.

## Files

| file | what it is |
|---|---|
| `build_sources.py` | balanced source selection, dedup and split assignment |
| `rewrite.py` | OpenRouter transformation harness, budget cap, quarantine gates |
| `measure.py` | per-pair metrics, intensity-separation test, corpus validation |
| `finalise.py` | split export, manifest, count tables |
| `sources.jsonl` | the selected sources |
| `pairs.jsonl` | the kept transformations, enriched with metrics |
| `corpus-*.jsonl` | the four splits, sources and variants together |
| `quarantine.jsonl` | failed, truncated, unchanged and meaning-damaged outputs |
| `quarantine-superseded-maxtokens.jsonl` | rows lost to **harness** faults, retried, kept for the record |
| `pilot.jsonl` / `pilot2.jsonl` | the two verification runs, v1 and v2 |
| `manifest.json` | counts, hashes, spend, holdouts |

`.jsonl` files are gitignored by project policy (`.gitignore:41`) — corpora are
not redistributed. The scripts, `manifest.json` and this README are committed.

## Honest limits

- **Similarity here is lexical, not semantic.** No embedding model was available
  offline: the research venv has `transformers` without `torch`, and the only
  ONNX encoder in the tree exports logits rather than pooled hidden states. The
  fields are named `lexical_cosine_tfidf`, `four_gram_retention` and
  `word_levenshtein_ratio`. Nothing is called semantic similarity.
- **No detector score.** Scoring these rows needs the segmented harness on a
  named runtime at a named threshold; a truncated whole-text pass would produce
  a figure with no stated runtime, which this project has been burned by before.
  Deliberately left for a separate measurement pass.
- **Every source overlaps a published measurement corpus.** Recorded per row in
  `measurement_overlap` and `measurement_overlap_note`. Any model trained here
  must exclude those documents from its evaluation set.
- **The name detector is a regex proxy**, not NER. `protected_spans.names`
  should be read as an indicator, not a count.

See `docs/measurements/PHASE-2-PAIRED-CORPUS.md` for the evidence and the
counts.

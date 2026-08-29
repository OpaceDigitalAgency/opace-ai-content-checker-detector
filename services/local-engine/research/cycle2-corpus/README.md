# Cycle-2 training corpus — published register, both sides

Cycle 1 trained Tier 3 on chat replies. The measured consequence is in
`../provider-eval/PROVIDER-EVAL-2026-08.md`: the same model
(`claude-sonnet-4.6`) is flagged 66% of the time when it writes a chat reply and
4% of the time when it writes an article. Article prose has never been
detectable by this tool at any model age — GPT-3.5 article prose scores 5.3%,
davinci 0%. The tool's users check articles, marketing and SEO copy, social
posts and academic writing. They never check chat conversations.

So cycle 2 is trained on published-register prose on **both** sides.

## Files

| file | what it is |
|---|---|
| `corpus.jsonl` | the corpus — one JSON object per line |
| `manifest.json` | machine-readable provenance, counts, quarantine record |
| `MANIFEST.md` | per-source licence, counts and honest gaps |
| `CORPUS-REPORT.md` | register / provider / era / genre breakdowns, word-count distributions, and the shipped-model baseline |
| `tier3-baseline.jsonl` | per-document score from the shipped Tier 3 model — the "before" picture |

## Schema

`id`, `side` (`ai`\|`human`), `register`, `provider`, `model`, `era`, `genre`,
`edit_level`, `split` (`train`\|`cal`\|`test`), `source`, `licence`, `words`,
`sha256`, `note`, `ai_token_ratio` (HAT-Bench rows), `text`.

## Rebuilding

```sh
PY=/path/to/venv/bin/python          # needs pandas, pyarrow, numpy, onnxruntime, transformers
export EVAL_SAMPLES_PATH=/path/to/eval-samples.json

$PY build_corpus.py     # fetch, filter, quarantine, balance, split  -> corpus.jsonl, manifest.json
$PY verify_corpus.py    # post-build assertions; exits non-zero on failure
$PY score_tier3.py      # shipped-model baseline                      -> tier3-baseline.jsonl
$PY manifest_md.py      # -> MANIFEST.md
$PY report.py           # -> CORPUS-REPORT.md
```

Upstream slices are cached under `raw/` (gitignored). Delete it to refetch.
`build_corpus.py` re-reads `../generated-corpus/generated.jsonl` on every run,
so re-running picks up whatever the owner's generation run has produced since.

## Rules honoured

- **Nothing in this directory writes outside it.** The engine, the website and
  the other research directories are untouched. `score_tier3.py` reads
  `../models/` and `../tier3/checkpoint/` and writes nothing there.
- **Evaluation data aborts the build.** An exact normalised-text-hash collision
  with `eval-samples.json` or with the `corpus_split == "test"` rows of
  `../provider-eval/eval-set.jsonl` raises and stops the run. The shipped
  regression battery is a softer tier — a colliding candidate is dropped and
  counted, because that file is being extended concurrently from the same
  public archives this corpus draws on.
- **Splits are by content hash, never by index**, stratified by register, side,
  provider and era, and group-aware so an edited copy of a training document
  cannot land in test.
- **Every row carries its licence.** A source without clear terms for research
  use does not get in; ambiguous ones are recorded in `MANIFEST.md` and left out.

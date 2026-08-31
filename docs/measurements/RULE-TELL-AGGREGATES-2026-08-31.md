# Rule-tell merged-panel aggregates — reproduced

**Date:** 31 August 2026
**Script:** `docs/measurements/rule-tell-aggregates.mjs` (this directory)
**Results file:** `docs/measurements/rule-tell-aggregates-2026-08-31.json`
**Status:** the published figures are reproduced exactly.

## Why this document exists

The checker's merged evidence panel publishes one aggregate sentence: 40.8% of
machine-written documents carry at least one row, 11.4% of human ones, on
5,743 AI and 4,353 human documents. Those figures ship from
`MERGED_ROW_COUNTS` in `opace-website/astro-latest/src/lib/content-integrity/rule-tells.ts`,
and until today no script or results file existed anywhere that could re-derive
them (`SESSION-HANDOVER-2026-08-31.md` §1). The per-rule counts were always
verified against `tests/battery/rule-liveness.json`; the union was not. This
run closes that gap.

## What was measured

Every document in the same four measurement corpora as
`tests/battery/rule-liveness.mjs` was scored twice:

1. **Phrase row** — the shipped phrase table
   (`content-integrity-phrase-ratios.json`, version `phrase-ratios-v1`,
   sha256 `1c49f2720bda6f2e55198c68b01f7457ee0f21dd22b87ed21264bd396face681`),
   matched with a port of the site's `findPhrasesIn`/`normaliseSpelling`.
2. **Rule row** — `packages/core` `inspectPatterns` findings filtered to the
   six qualifying tells (`signals.ai_placeholder`, `signals.chatbot`,
   `signals.cutoff_disclaimer`, `signals.hollow_intensifier`,
   `signals.not_just_contrast`, `signals.token_cutoff` — derived in the script
   by the same interval gate and exclusion sets as `rule-tells.ts`, not
   hand-listed), kept only where the finding carries a quotable passage span
   (not document-level, span at least 2 UTF-16 units).

A document "carries a row" when either source produced one.

## Results

| Side | Documents | Phrase row | Rule row | Any row | Both |
|---|---|---|---|---|---|
| AI | 5,743 | 1,218 (21.2%) | 1,543 (26.9%) | 2,345 (40.8%) | 416 |
| Human | 4,353 | 188 (4.3%) | 326 (7.5%) | 497 (11.4%) | 17 |

Every count matches `MERGED_ROW_COUNTS` exactly. Derived figures the panel and
its source comments quote:

- 40.8% of the 5,743 AI documents carry at least one row; 11.4% of the 4,353
  human ones. Phrases alone: 21.2% AI, 4.3% human. All reproduced.
- "73.1% of machine-written documents show no rule tell" — reproduced:
  1,543/5,743 carry one, so 4,200/5,743 (73.1%) show none.
- Near-independence: 416 AI documents carry both, against roughly 327 expected
  if the two sources were independent (1,218 × 1,543 / 5,743 ≈ 327). Reproduced.

Per-corpus splits are in the results JSON.

## How to re-run

From the repository root, after `npm run build` in `packages/core`:

```
node docs/measurements/rule-tell-aggregates.mjs
```

The phrase table is read from the website checkout
(`opace-website/astro-latest/src/data/content-integrity-phrase-ratios.json`)
by default; point `PHRASE_TABLE` at another copy to override. The two
out-of-repository corpora (`generated-corpus/generated.jsonl`,
`provider-eval/eval-set.jsonl`) must be present under
`services/local-engine/research/`, as they are for the liveness battery.

## Limits

- The counts depend on the phrase table version and the engine build; the
  results JSON records the table's sha256 and the script derives the tell set
  from `tests/battery/rule-liveness.json` at run time, so a drifted register
  changes the answer rather than silently reusing this one.
- The per-document funnel figures quoted only in source comments (mean 0.29
  tells per document, median 0) were not re-derived here; nothing published on
  the live panel depends on them.

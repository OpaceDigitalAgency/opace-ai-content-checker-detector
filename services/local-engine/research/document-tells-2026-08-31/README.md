# Document-tells measurement (2026-08-31)

Reusable scripts + raw outputs for the three candidate document-level tells.
Full report: `implementation/docs/measurements/DOCUMENT-TELLS-2026-08-31.md`.

Scripts (run from this directory, python3 + numpy, local only):

- `tells_lib.py` — shared parsing: symmetric heading detection, paragraph
  blocks, sentence split, closer regex, tokenisation.
- `measure_structure.py` — tell 1 (keyphrase echo) and tell 2 v1 (template
  scaffold) on generated-corpus + human-corpus-v2 (+ longform secondary).
  Writes `structure-per-doc.jsonl`, `structure-summary.json`.
- `measure_scaffold_v2.py` — tell 2 v2 (primary): section shape signatures,
  body-shape mode share, bullet rhythm, closers, title-restated-in-close,
  split per model (21) / length band / prompt style, plus human hard-negative
  subsets (listicle-like, per genre, confusable). Writes
  `scaffold-v2-per-doc.jsonl`, `scaffold-v2-summary.json`.
- `measure_phrases.py` — tell 3 data-driven 2-4-gram mining on cycle2 with
  register balancing + out-of-corpus corroboration.
  Writes `phrase-table.json`, `phrase-table.csv` (top 200).
- `measure_known_phrases.py` — curated 98-phrase lexicon measured on both
  AI/human pairings. Writes `known-phrases.json`.

Headline: keyphrase echo and standalone section-shape uniformity DECLINED
(echo is a register tell; structured human docs — especially listicles — are
just as shape-uniform as AI). The composite (shape-uniform AND
sentence-uniform, >=4 sections) separates ~2.8x and ships with caveats, as do
formulaic closers. Per-model house shapes across the 21 models are real and
measurable (llama-4-maverick most templated, opus-5/terra least). Bullet
rhythm is unmeasurable: the human corpora preserved ~zero bullet lists. The
mined phrase table is artefact-dominated, but 21 of 98 curated phrases pass a
dual-corpus >=2x gate and are shippable with their measured per-1,000 rates.

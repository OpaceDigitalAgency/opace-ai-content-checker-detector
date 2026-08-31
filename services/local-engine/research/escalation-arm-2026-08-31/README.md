# Shape-tell escalation arm — pricing run (2026-08-31)

Measurement and pricing only; nothing here moves a threshold or deploys anything.
Report of record: `docs/measurements/ESCALATION-ARM-2026-08-31.md`.

Question: flag a document when the shipped pair (0.9855 primary / 0.9763
second-highest, segments-v3, fp32) does NOT flag it, its max segment
probability sits in a band below the primary, and N of the three strong
shape tells from `DOCUMENT-TELLS-2026-08-31.md` fire (wpp_cv ≤ 0.2,
sec15 ≥ 0.9, composite scaffold). Priced like `SYNTHETIC-CADENCE.md` §5.1.

Files:

- `score_human_fp32.py` — scores the structured human corpus (3,529 docs,
  read-only in `../human-structured-corpus-2026-08-31/`) through the shipped
  fp32 harness; output `inputs/human-fp32.jsonl`. Seeded from the 1,031 rows
  the corpus lane's own run produced before its process was killed;
  spot-verified bit-exact (`price_escalation.py verify`, max delta 0.00e+00).
- `score_stripped.py` — re-scores BOTH corpora with markdown syntax stripped
  (the plain-text paste surface). Motivated by `strip_test.py`: 59 of 60
  human docs flagged on the raw-markdown surface un-flag once the syntax is
  stripped, so raw-surface flag rates on this corpus are a scoring-surface
  artefact. Outputs `inputs/human-fp32-stripped.jsonl`,
  `inputs/generated-fp32-stripped.jsonl`.
- `strip_test.py` — the 60-doc diagnostic above.
- `price_escalation.py` — the pricing: band × N-of-tells grid, per-register /
  legal-bucket / confidence-label human costs, hash-independent AI subset
  (cycle2-membership), 200-way split-half with the tell gates refitted per
  training half. `python3 price_escalation.py` (raw surface) and
  `... stripped`. Outputs `escalation-pricing.json`,
  `escalation-pricing-stripped.json`.

AI side reused read-only: `../generated-corpus/cycle2-rescore-2026-08-31/`
(shipped fp32 scores, membership) and the per-doc structural metrics in
`../human-structured-corpus-2026-08-31/new-human-per-doc.jsonl` (both sides).

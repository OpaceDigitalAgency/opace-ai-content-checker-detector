# Matched generation (bulk complete, 2026-08-31)

1,110 matched human-AI pairs generated from `../corpus.jsonl` briefs only
(no model ever saw the human text). `matched.jsonl` is the corpus;
`manifest.json` carries design, per-model/register counts, quality-gate
history, SHA-256 of every file and the spend reconciliation;
`cost-ledger.jsonl` is the per-run spend record.

Headlines: 949/1,110 (85.5%) within +/-20% of target length, 953/1,110
sections-adherent, 980/1,110 bullets-adherent; $19.79 ledger spend
($20.52 by key delta -- see spend_reconciliation), $0.018/pair.

Training boundary: rows with `eval_only: true` (192 = 176 topic-hash bucket
+ 16 google family) must NEVER enter training. The second bulk run hit the
budget cap before the gemini block, so the google-family slice is thin;
topic-bucket rows carry the held-out duty.

Model mix: llama-4-maverick 393, grok-4.6 369, terra 181, opus-5 151,
gemini 16. gemini-3.1-pro-preview was dropped mid-programme for degenerate
outputs (see manifest quality_gate_history); gemini-3.5-flash replaced it.

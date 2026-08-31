# cycle4-separability — can the four-way verdict be supported?

**A measurement, not a model.** Nothing here was trained for deployment, no
threshold moved, nothing was deployed and nothing was published. Run 31 August
2026.

## The question

`docs/programme/REDESIGN.md` §7 records the owner's request for verdicts of the
form *"Likely human but AI edited"* and *"Likely AI but human edited"*, and
records why they did not ship: the label needs edited-AI separated from pure-AI,
and no measurement existed. This directory is that measurement.

It scores every row of `../cycle4-humaniser-pairs/` through the shipped runtime
and asks whether pure human, pure AI and AI-then-rewritten occupy separable
regions.

## Scope limit, which applies to every figure produced here

The corpus is **LLM paraphrase, not commercial-humaniser output**. Every row
carries `commercial_humaniser: false` and `transformation_family:
generic_llm_rewrite`. What is measured is *"an LLM was asked to reword this"*.
Whether JustDone, QuillBot or Undetectable.ai transform text the same way is a
separate open question.

## Files

| file | what it is |
|---|---|
| `prove_harness.py` | reproduces the shipped 883/922 and 45/4,636 before anything else runs |
| `score_pairs.py` | scores all 2,302 paired rows, keeping per-segment probability and logit margin |
| `analyse.py` | flag rates, pairwise AUROC with cluster bootstrap, paired shift, oracle boundary, group-aware probe |
| `cost.py` | what a four-way label would cost in false labels at a fixed budget |
| `analysis.txt`, `results.json`, `cost.json` | the output of the above |

## Reproduction

```
cd services/local-engine/research
current-models/.venv/bin/python cycle4-separability/prove_harness.py /tmp/baseline.json
current-models/.venv/bin/python cycle4-separability/score_pairs.py   /tmp/pair-scores.jsonl
current-models/.venv/bin/python cycle4-separability/analyse.py /tmp/pair-scores.jsonl /tmp/results.json
current-models/.venv/bin/python cycle4-separability/cost.py    /tmp/pair-scores.jsonl /tmp/cost.json
```

`prove_harness.py` must print `HARNESS PROOF: PASS` or nothing downstream means
anything. The scoring run takes about an hour for the 5,558-document proof and
about two and a half minutes for the 2,302 paired rows, on 8 CPU threads.

`.jsonl` outputs are gitignored by project policy (`.gitignore:41`). The scripts
and the JSON summaries are committed.

The write-up is `docs/measurements/FOUR-WAY-VERDICT-SEPARABILITY.md`.

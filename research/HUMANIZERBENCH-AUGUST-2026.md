# HumanizerBench August 2026 evidence and Opace challenge run

> **Dated public evidence snapshot.** This report preserves the August 2026 benchmark extract and Opace re-score. It does not represent a current vendor leaderboard. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and current measurement reports before quoting it.

**Last updated: 30 August 2026.** This is the dated evidence source for the
commercial-humaniser discussion. Update it whenever the HumanizerBench snapshot,
Opace detector build, thresholds, segmentation contract or scoring method changes.

Source snapshot: `source-snapshots/humanizerbench` at commit `e304f69eaf9c7667a16011e07738200867cdb469`.

The public verifier passed locally. The cycle used 11 prompts. Scores below are the exact current values from the checked-in per-product JSON. Detector columns are HumanizerBench sub-scores, not pass percentages guaranteed by the detector vendors.

| Product | Composite | Aggregate bypass | GPTZero | Winston | ZeroGPT | Copyleaks | Originality |
|---|---:|---:|---:|---:|---:|---:|---:|
| WriteHuman | 76.69 | 0.8914 | 0.8844 | 0.8384 | 0.8471 | 0.6707 | 0.6648 |
| Humanize AI Pro | 71.40 | 0.8354 | 0.8258 | 0.8324 | 0.9051 | 0.6554 | 0.6362 |
| Stealth Writer | 69.83 | 0.7966 | 0.3082 | 0.8823 | 0.8858 | 0.7350 | 0.4372 |
| HIX Bypass | 67.93 | 0.7524 | 0.1309 | 0.8560 | 0.8880 | 0.7620 | 0.3951 |
| Humbot | 66.95 | 0.7169 | 0.2178 | 0.7762 | 0.8360 | 0.8025 | 0.3149 |
| AI Humanize io | 64.57 | 0.7083 | 0.5443 | 0.8067 | 0.8551 | 0.6367 | 0.4007 |
| Phrasly | 63.30 | 0.7644 | 0.8365 | 0.5664 | 0.6637 | 0.8182 | 0.6964 |
| Undetectable.ai | 61.49 | 0.8596 | 0.8661 | 0.8750 | 0.8983 | 0.6527 | 0.6610 |
| Walter Writes | 60.83 | 0.6796 | 0.6947 | 0.5876 | 0.7195 | 0.4603 | 0.5664 |
| Super Humanizer | 55.86 | 0.4154 | 0.2704 | 0.3421 | 0.6865 | 0.4242 | 0.4658 |
| Grammarly | 52.91 | 0.0000 | 0.0193 | 0.0013 | 0.1373 | 0.0000 | 0.0000 |
| StealthGPT | 45.55 | 0.2753 | 0.5258 | 0.2517 | 0.4601 | 0.2424 | 0.2016 |
| NoteGPT | 44.04 | 0.0001 | 0.0000 | 0.0016 | 0.6457 | 0.0000 | 0.0005 |

## Verification limits

- WriteHuman openly operates HumanizerBench and ranks first in this cycle.
- Inputs, outputs, detector verdicts and scoring files are public and hash-verified.
- The runner, humaniser adapters, detector integrations and paid credentials remain private.
- Eleven prompts are inadequate for universal performance claims.
- Pangram and Turnitin are absent.
- Scores can be re-derived from the supplied data but the detector calls cannot be independently replayed without credentials and matching product versions.

## Opace re-score, exact current production detector

This is a new Opace analysis of the published inputs and outputs. It is not a
HumanizerBench score and did not call HumanizerBench's five detectors.

Run date: **30 August 2026**. The live service was rechecked immediately before
the run and returned `tier3-cycle2`, fp32 build `e313ab00de1fffd2`,
`segments-v3`. The local run used that exact model artefact, primary threshold
`0.9855`, secondary threshold `0.9763`, and the production rule: flag when the
strongest segment clears the primary threshold or the second-strongest clears
the secondary threshold.

The 33 source texts comprise 11 each from `claude-sonnet-5`,
`gemini-3-5-flash` and `gpt-5-5`. Opace caught 28/33 before humanisation:
Claude 11/11, Gemini 11/11 and GPT-5.5 6/11. The bypass denominator below is
therefore **only the source documents Opace first caught**. It is not a claim
that a product makes 96% of arbitrary writing look human.

The long-form column also excludes a transformed output when it falls below
200 words. That length gate follows the Opace evidence boundary; shorter text
can still be scored, but it is not strong enough for this comparison.

| Product | All caught sources escaped | Long-form caught sources escaped | Median long-form Opace probability |
|---|---:|---:|---:|
| Undetectable.ai | 27/28 (96.4%) | **27/28 (96.4%)** | 0.3858 |
| StealthGPT | 27/28 (96.4%) | **24/25 (96.0%)** | 0.8912 |
| WriteHuman | 25/28 (89.3%) | **24/27 (88.9%)** | 0.7574 |
| Humanize AI Pro | 25/28 (89.3%) | **23/26 (88.5%)** | 0.8977 |
| AI Humanize io | 25/28 (89.3%) | **22/25 (88.0%)** | 0.9199 |
| Phrasly | 23/28 (82.1%) | **23/28 (82.1%)** | 0.6712 |
| HIX Bypass | 21/28 (75.0%) | **20/27 (74.1%)** | 0.9789 |
| Stealth Writer | 21/28 (75.0%) | **20/27 (74.1%)** | 0.9746 |
| Humbot | 19/28 (67.9%) | **18/27 (66.7%)** | 0.9713 |
| Walter Writes | 17/28 (60.7%) | **17/28 (60.7%)** | 0.9790 |
| Super Humanizer | 16/28 (57.1%) | **15/27 (55.6%)** | 0.9822 |
| Grammarly | 2/28 (7.1%) | **2/27 (7.4%)** | 0.9887 |

The result is detector-specific. StealthGPT scored only 27.5% on
HumanizerBench's own five-detector aggregate, yet escaped Opace on 96.0% of
eligible long-form inputs. Grammarly shows the reverse pattern: it preserves
the source well but almost never evades Opace. A leaderboard average cannot be
substituted for a direct test against the detector being discussed.

### What changed in the successful outputs

The project's existing 122-feature signal-science extractor was run over every
source/output pair. Among the 322 long-form outputs whose source Opace caught:

| Median change from the source | Escaped Opace, n=235 | Still caught, n=87 |
|---|---:|---:|
| MATTR vocabulary variety | **−0.04621** | −0.01639 |
| Adjacent-sentence content-word cohesion | **+0.00942** | +0.00258 |
| Repeated word-triple rate | +0.00187 | 0.00000 |
| Sentence-length burstiness | +0.01826 | +0.00984 |
| Double-space rate | 0.00000 | 0.00000 |
| Cliché-word rate | 0.00000 | 0.00000 |

This is association, not a complete causal explanation, but it points in the
same direction as the independent ablation of the deployed model: successful
humanisers reduce vocabulary variety and reintroduce lexical repetition and
cross-sentence cohesion. They target the current model's strongest learned
axis. Burstiness moves little, while double spacing and cliché deletion do not
explain the escapes.

### Formatting and sparse-typo probe

On one 293-word detected source, replacing every ordinary space with a double
space produced identical tokenizer IDs and an identical Opace score of
`0.9901`. Double spaces therefore have **zero effect** on this detector path.

Across all 33 sources, a deterministic probe transposed two letters in roughly
one eligible word per 100 words. Detection moved from 28/33 to 27/33, with a
median probability change of `−0.0002` and one verdict flip. Sparse errors can
perturb a borderline document, but they do not explain the broad humaniser
bypass rates and must not become authorship evidence.

## Reproduction boundary

The original aggregate-only runner and HumanizerBench source snapshot remain in the private programme workspace because the benchmark integrations and paid credentials are not public. The published report includes denominators, detector build, thresholds, segmentation contract and aggregate results, but it does not claim that a third party can replay the paid detector calls from this repository alone.

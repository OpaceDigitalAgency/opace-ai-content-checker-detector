Rows scored on BOTH routes: **1347 of 2,302**. Split coverage: `heldout_source` 244, `train` 1103.

| population | browser (int8, ORT Web) | server (fp32) | Δ | n |
|---|---|---|---:|---:|
| AI originals, untouched | 64.4% [57.0–71.1] (112/174) | 63.2% [55.8–70.0] (110/174) | +1.1 pp | 174 |
| AI originals after an LLM rewrite | 73.0% [68.8–76.7] (356/488) | 72.7% [68.6–76.5] (355/488) | +0.2 pp | 488 |
| human originals, untouched | 1.1% [0.3–4.1] (2/174) | 1.1% [0.3–4.1] (2/174) | +0.0 pp | 174 |
| human originals after an LLM rewrite | 11.7% [9.2–14.8] (60/511) | 11.2% [8.7–14.2] (57/511) | +0.6 pp | 511 |

| human original → rewrite, by strength | browser | server | n |
|---|---|---|---:|
| light | 2.4% [0.9–6.0] (4/167) | 1.8% [0.6–5.1] (3/167) | 167 |
| medium | 11.9% [7.9–17.6] (21/176) | 10.8% [7.0–16.2] (19/176) | 176 |
| heavy | 20.8% [15.4–27.6] (35/168) | 20.8% [15.4–27.6] (35/168) | 168 |

Paired survival on the browser route, matched subset: **96.5% [93.8–98.0] (299/310)** of AI sources the browser detects still detected after rewriting.

Document-level verdict disagreement between the two routes: **32/1347 = 2.4%** — browser-only flags 19, server-only 13.

# What each notch of a strictness control would cost

**Measured 30 August 2026.** Full-precision re-score of the whole 5,558-document long-form corpus at
eighteen operating points, so a user-facing sensitivity control can state what every setting costs in
wrongly-flagged human writing.

**Nothing here changes the shipped operating point.** The default stays **0.9855 / 0.9763** and this
file does not move it. A retrain is awaiting its flag-point refit and the pair will move; this is
then re-run. **No value in this file may be hard-coded anywhere.**

---

## Why this exists

Both competitors expose strictness as a control — an "AI Allowance" of 0 / 5 / 15 / 25 / 40%, a
"Sensitivity Level 2/3" — and **neither says what a setting costs.** A control that does not is worse
than no control: it lets a reader turn the tool up until it agrees with them, and gives them no way to
know what they have done.

It is also the answer to a real complaint. An AI-written document scored 0.98 and did not flag,
because the flag point sits at 0.9855 to hold human false positives near 1%. That was experienced as
a miss. A sensitivity control turns a recurring argument into a choice the reader makes with the
price in front of them.

---

## Method

| | |
|---|---|
| **Detector** | `tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d` |
| **Runtime** | Python `onnxruntime` 1.29.0, CPU, fp32 — the EU server's scoring path. **Not a browser measurement.** |
| **Segmentation** | `segments-v3`; the reported probability is the maximum across sections |
| **Rule** | flag when the strongest section reaches `primary`, **or** the second-strongest reaches `secondary`. The gap between the arms is held at the shipped **0.0092** at every notch, so each notch is the same rule at a different strictness rather than a different rule |
| **Corpus** | 922 AI documents, 4,636 human documents |
| **Precision** | full, not the 4 dp segment store — that store rounds 884/922 where the truth is 883/922, and a curve built on it would be wrong by a document at every notch |

**Probe check.** The harness reproduces the published shipped-point figures exactly — **883/922 AI
detected and 45/4,636 human false positives at 0.9855/0.9763** — before any new notch was taken.

---

## The curve

| primary / secondary | AI detected | human false positives |
|---|---:|---:|
| 0.9985 / 0.9893 | 562/922 (61.0%) | 3/4,636 (0.06%) |
| 0.9970 / 0.9878 | 718/922 (77.9%) | 6/4,636 (0.13%) |
| 0.9950 / 0.9858 | 785/922 (85.1%) | 13/4,636 (0.28%) |
| 0.9920 / 0.9828 | 828/922 (89.8%) | 20/4,636 (0.43%) |
| 0.9895 / 0.9803 | 851/922 (92.3%) | 26/4,636 (0.56%) |
| **0.9855 / 0.9763** | **883/922 (95.8%)** | **45/4,636 (0.97%)** ← **shipped default** |
| 0.9820 / 0.9728 | 892/922 (96.7%) | 91/4,636 (1.96%) |
| 0.9780 / 0.9688 | 900/922 (97.6%) | 126/4,636 (2.72%) |
| 0.9730 / 0.9638 | 912/922 (98.9%) | 177/4,636 (3.82%) |
| 0.9670 / 0.9578 | 915/922 (99.2%) | 225/4,636 (4.85%) |
| 0.9600 / 0.9508 | 917/922 (99.5%) | 288/4,636 (6.21%) |
| 0.9500 / 0.9408 | 918/922 (99.6%) | 358/4,636 (7.72%) |
| 0.9400 / 0.9308 | 918/922 (99.6%) | 425/4,636 (9.17%) |
| 0.9200 / 0.9108 | 919/922 (99.7%) | 554/4,636 (11.95%) |
| 0.9000 / 0.8908 | 919/922 (99.7%) | 661/4,636 (14.26%) |
| 0.8700 / 0.8608 | 921/922 (99.9%) | 798/4,636 (17.21%) |
| 0.8400 / 0.8308 | 922/922 (100.0%) | 907/4,636 (19.56%) |
| 0.8000 / 0.7908 | 922/922 (100.0%) | 1,041/4,636 (22.45%) |

---

## What the curve says

**The shipped point sits where the trade turns.** Loosening one notch, from 0.9855 to 0.9820, buys
**0.9 points of detection** and costs **doubling the human false-positive rate**, 0.97% to 1.96%.
Loosening to 0.9730 buys 3.1 points and takes false positives to 3.82% — **four times as many
wrongly-flagged human documents for three points**.

**Tightening is cheap in false positives and expensive in detection.** At 0.9950 the tool wrongly
flags 13 human documents in 4,636 and misses one AI document in seven.

**Below about 0.96 the control stops buying anything.** Detection is already 99.5% and only human
false positives keep climbing — to nearly a quarter of all human documents at 0.80. **Any setting
below 0.96 is close to pure cost**, and a control offering one should say so rather than presenting it
as a neutral preference.

---

## Design requirements, if this ships

1. **Every notch prints its own measured false-positive rate, with denominators.** A slider without
   the price is the competitor's version and is worse than no slider.
2. **The default is the shipped point and is labelled as the measured one.** Other notches are the
   reader's choice, not the tool's recommendation.
3. **The bottom of the range must carry a warning, not just a number.** "About one human document in
   five would be flagged at this setting" is the honest label for 0.84.
4. **This curve is fp32 server-route only.** The browser runtime's own curve must be measured
   separately before a control is offered there — `thresholds.json` already fits the document flag
   point per runtime because the two do not agree, and
   [`PER-SENTENCE-RELIABILITY.md`](PER-SENTENCE-RELIABILITY.md) §9 shows how far that goes.
5. **Nothing here is hard-coded.** These are data, re-measured whenever the model or the operating
   point moves.
6. **Per-register cost is not evenly spread** and the control must not imply it is. Human fiction
   carries a disproportionate share of false positives at every notch; the per-register breakdown is
   in `research/sensitivity-curve/curve.json`.

---

## Reproduction

```
research/sensitivity-curve/measure.py curve.json
```

Roughly 13 minutes on 8 CPU threads. Output carries the model SHA, the segmentation contract, the
per-notch rates and the per-register human false-positive breakdown.

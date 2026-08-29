# Transparent versus neural, on identical held-out data

Fresh long-form corpus: 793 AI documents from current models against 4,179 human documents. Neither model was trained on any of it. Detection rates at each human false-positive budget; the threshold is set on that split's human half.

| model | what it is | AUROC | @1% FP | @2% FP | @3% FP | @5% FP | @9% FP |
|---|---|---:|---:|---:|---:|---:|---:|
| **scorecard_prose_only** | 24 readable features, no formatting, additive | 0.980 | 72.1% | 81.1% | 85.4% | 88.8% | 93.4% |
| **scorecard** | 24 readable features, additive | 0.978 | 62.5% | 77.6% | 84.9% | 89.9% | 94.3% |
| **lr_full** | all 122 features, additive | 0.983 | 69.1% | 81.5% | 86.5% | 91.9% | 96.3% |
| **gbt** | all 122 features, gradient-boosted trees | 0.982 | 75.4% | 81.2% | 86.1% | 90.4% | 94.7% |
| **neural_cycle2** | e5-small transformer, 33M parameters (deployed) | 0.993 | 89.8% | 93.1% | 94.5% | 96.7% | 98.4% |

## False positives on an independent human corpus

3,767 human documents from `tests/battery/human-corpus-v*.json` — modern web, business, marketing, academic and non-native English writing, held under an evaluation-only licence and never trained on by any model here. Thresholds are the ones fitted on the fresh long-form human half above, so this measures whether a budget set on one human population holds on another.

| model | @1% budget | @2% | @3% | @5% | @9% |
|---|---:|---:|---:|---:|---:|
| **scorecard** | 0.13% | 0.96% | 1.67% | 3.61% | 6.00% |
| **scorecard_prose_only** | 0.27% | 0.42% | 0.66% | 1.06% | 2.57% |
| **lr_full** | 1.04% | 1.81% | 2.12% | 3.58% | 6.00% |
| **gbt** | 0.35% | 0.66% | 1.43% | 2.39% | 5.23% |
| **neural_cycle2** | at the shipped 0.984 threshold: **0.42%** (n=3,767) | | | | |

## Detection by register, at a 1% false-positive budget

| register | n AI | scorecard_prose_only | scorecard | gbt | neural_cycle2 |
|---|---:|---:|---:|---:|---:|
| academic | 399 | 77.2% | 67.7% | 85.0% | 89.5% |
| corporate | 87 | 35.6% | 66.7% | 87.4% | 98.9% |
| creative | 103 | 62.1% | 28.2% | 26.2% | 79.6% |
| journalism | 115 | 79.1% | 59.1% | 66.1% | 87.8% |
| report | 89 | 87.6% | 79.8% | 89.9% | 96.6% |

## How much of the black box is explainable?

Ridge and gradient-boosted regressions from the interpretable features to the neural model's raw margin, 5-fold cross-validated **within** the fresh held-out set (n = 4,972). Fitting on the training split and testing on fresh data instead measures something harsher — whether the explanation survives a distribution shift — and is reported below it as the caveat.

| what is used to predict the neural score | R² | Pearson r |
|---|---:|---:|
| all 122 interpretable features, linear | 0.620 | 0.787 |
| the 24 scorecard features, linear | 0.486 | 0.697 |
| the 24 prose-only features, linear | 0.487 | 0.698 |
| all 122 features, gradient-boosted (non-linear) | 0.684 | 0.827 |
| all 122 features, within ai documents only (n=793) | 0.190 | 0.460 |
| all 122 features, within human documents only (n=4,179) | 0.432 | 0.658 |
| _caveat: fitted on the training split, tested on fresh data_ | 0.364 | 0.659 |

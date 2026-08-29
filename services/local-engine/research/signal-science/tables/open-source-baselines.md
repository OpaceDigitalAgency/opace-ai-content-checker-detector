# Published open-source methods on our modern corpus

600 AI and 600 human long-form documents, none seen by any model on this project. Observer model: GPT-2 small (124M), int8 with fp16 LM head, 512-token cap. AUROC is oriented so 0.5 is useless.

| method | AUROC | TPR@1% FP | TPR@5% FP | dir |
|---|---:|---:|---:|:--:|
| DivEye-inspired: surprisal kurtosis | 0.766 | 10.3% | 30.7% | AI scores lower |
| DivEye-inspired: surprisal skew | 0.763 | 0.0% | 27.7% | AI scores lower |
| DivEye-inspired: surprisal autocorrelation | 0.757 | 4.5% | 20.7% | AI scores lower |
| mean predictive entropy | 0.746 | 0.0% | 17.5% | AI scores higher |
| GLTR — share in top 100 | 0.735 | 0.0% | 18.0% | AI scores lower |
| mean log rank (DetectGPT baseline) | 0.728 | 0.0% | 19.0% | AI scores higher |
| GLTR — share of tokens in the observer's top 10 | 0.724 | 0.0% | 20.3% | AI scores lower |
| log perplexity | 0.715 | 0.0% | 15.8% | AI scores higher |
| mean log-likelihood (the classic perplexity baseline) | 0.715 | 0.0% | 15.8% | AI scores lower |
| GLTR — share in top 1,000 | 0.672 | 0.5% | 15.3% | AI scores lower |
| GLTR — share beyond rank 1,000 | 0.672 | 0.5% | 15.3% | AI scores higher |
| DivEye-inspired: surprisal spread | 0.587 | 0.0% | 3.0% | AI scores higher |
| **Fast-DetectGPT** conditional-probability curvature | 0.545 | 14.8% | 21.2% | AI scores higher |
| *self*-Binoculars (degenerate: one model in both roles) | 0.502 | 0.0% | 6.8% | AI scores higher |

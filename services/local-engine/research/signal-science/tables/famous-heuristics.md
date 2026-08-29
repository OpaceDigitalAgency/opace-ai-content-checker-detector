# The famous heuristics, measured

Matched corpus: 5,935 AI vs 5,935 human, register and length matched. Fresh long-form: 670 pairs from data no model on this project has seen.

| heuristic | AUROC | Cliff's δ | size | TPR@1% FP | fresh AUROC | fresh TPR@1% | verdict |
|---|---:|---:|---|---:|---:|---:|---|
| Burstiness of sentence length — GPTZero's headline metric `rhy_burstiness` | 0.521 | -0.043 | negligible | 2.5% | 0.547 | 0.1% | **worthless** |
| Sentence-length coefficient of variation `syn_cv_sent_len` | 0.521 | -0.043 | negligible | 2.5% | 0.547 | 0.1% | **worthless** |
| Sentence-length standard deviation ('perplexity's partner') `syn_sd_sent_len` | 0.633 | -0.266 | small | 1.9% | 0.602 | 0.9% | **weak** |
| 'AI vocabulary' — delve, leverage, robust, tapestry… `lex_cliche_word_rate` | 0.578 | +0.156 | small | 6.6% | 0.589 | 5.5% | **weak** |
| 'AI phrases' — in today's…, it's not just…, dive into… `lex_cliche_phrase_rate` | 0.511 | +0.022 | negligible | 1.9% | 0.533 | 0.0% | **worthless** |
| Discourse markers — moreover, furthermore… `lex_discourse_marker_rate` | 0.517 | +0.034 | negligible | 1.8% | 0.570 | 0.0% | **worthless** |
| The 'rule of three' list `pun_rule_of_three_rate` | 0.515 | +0.029 | negligible | 1.1% | 0.579 | 0.0% | **worthless** |
| Closing with 'in conclusion' / 'ultimately' `dis_conclusion_marker` | 0.514 | +0.027 | negligible | 0.0% | 0.508 | 0.0% | **worthless** |
| Passive voice `syn_passive_approx_rate` | 0.601 | -0.202 | small | 0.0% | 0.716 | 0.0% | **weak** |
| Hedging language `lex_hedge_rate` | 0.500 | +0.001 | negligible | 1.4% | 0.516 | 1.5% | **worthless** |
| Intensifiers `lex_booster_rate` | 0.534 | -0.069 | negligible | 0.0% | 0.541 | 0.0% | **worthless** |
| The em dash `pun_emdash_per1kw` | 0.595 | +0.190 | small | 7.2% | 0.772 | 20.3% | **weak** |
| Curly quotes and apostrophes `pun_curly_share` | 0.591 | -0.182 | small | 0.0% | 0.669 | 0.0% | **weak** |
| Any markdown formatting present `fmt_any_markdown` | 0.660 | +0.321 | medium | 0.0% | 0.773 | 0.0% | **moderate** |
| Compression ratio `inf_compress_ratio` | 0.561 | +0.122 | small | 2.3% | 0.734 | 1.8% | **weak** |
| Spectral flatness of the rhythm series `rhy_spectral_flatness` | 0.529 | -0.057 | negligible | 1.0% | 0.571 | 1.8% | **worthless** |
| Uniform information density (adjacent-word surprisal change) `inf_uid_masd` | 0.619 | -0.239 | small | 1.6% | 0.683 | 0.1% | **weak** |
| Uniform information density (between-sentence variance) `inf_uid_sent_var` | 0.533 | -0.066 | negligible | 1.2% | 0.510 | 1.3% | **worthless** |

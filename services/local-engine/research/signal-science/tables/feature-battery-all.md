# Feature battery — register and length matched

5,935 AI documents matched 1:1 to 5,935 human documents on register family and log word count. Effect sizes are Cliff's delta; `dir` says whether AI scores high or low. `TPR@1%` is single-feature detection with the threshold set on the human half so that 1 human in 100 is wrongly flagged. p-values are Mann-Whitney U, Benjamini-Hochberg adjusted across all 122 features at q=0.05.

| rank | signal | AUROC | Cliff's δ | size | TPR@1% FP | TPR@5% FP | dir | median AI | median human | BH p |
|---:|---|---:|---:|---|---:|---:|:--:|---:|---:|---:|
| 1 | vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | 0.797 | +0.594 | large | 25.1% | 46.0% | high | 0.7676 | 0.7089 | <1e-300 |
| 2 | content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | 0.753 | -0.505 | large | 4.9% | 21.1% | low | 0.02166 | 0.04413 | <1e-300 |
| 3 | word-pair surprisal spread `inf_bigram_surprisal_sd` | 0.743 | -0.486 | large | 3.6% | 27.9% | low | 3.118 | 3.312 | <1e-300 |
| 4 | type-token ratio, first 400 words `lex_ttr_first400` | 0.712 | +0.425 | medium | 6.2% | 15.1% | high | 0.6 | 0.5377 | <1e-300 |
| 5 | words of 3 letters or fewer `lex_short_word_rate` | 0.708 | -0.416 | medium | 15.1% | 31.8% | low | 0.3394 | 0.3845 | <1e-300 |
| 6 | repeated word-triple rate `lex_repeat_trigram_rate` | 0.682 | -0.363 | medium | 0.0% | 0.0% | low | 0.01149 | 0.02506 | 8.9e-257 |
| 7 | distinct word triples / word triples `lex_distinct3` | 0.682 | +0.363 | medium | 0.0% | 0.0% | high | 0.9885 | 0.9749 | 8.9e-257 |
| 8 | Yule's K (repetition concentration) `lex_yule_k` | 0.677 | -0.354 | medium | 12.4% | 26.1% | low | 89.18 | 107.5 | 9.5e-244 |
| 9 | function-word rate `lex_function_word_rate` | 0.673 | -0.347 | medium | 1.3% | 20.6% | low | 0.3829 | 0.4294 | 5.3e-234 |
| 10 | 'to' per 1,000 words `lex_to_rate` | 0.672 | -0.345 | medium | 0.0% | 7.6% | low | 21.53 | 29.07 | 4.0e-231 |
| 11 | share of vocabulary used exactly once `lex_hapax_rate` | 0.672 | +0.343 | medium | 9.0% | 18.5% | high | 0.7204 | 0.6798 | 4.6e-229 |
| 12 | distinct word pairs / word pairs `lex_distinct2` | 0.671 | +0.342 | medium | 5.5% | 15.1% | high | 0.9261 | 0.893 | 1.3e-227 |
| 13 | any markdown present `fmt_any_markdown` | 0.660 | +0.321 | medium | 0.0% | 34.4% | high | 0 | 0 | <1e-300 |
| 14 | mean word length `lex_mean_word_len` | 0.659 | +0.318 | medium | 12.2% | 23.4% | high | 5.241 | 4.837 | 2.0e-197 |
| 15 | syn_max_sent_len `syn_max_sent_len` | 0.645 | -0.289 | medium | 0.6% | 7.0% | low | 36 | 43 | 4.4e-163 |
| 16 | 'of' per 1,000 words `lex_of_rate` | 0.638 | -0.276 | small | 0.0% | 11.1% | low | 19 | 25.79 | 1.1e-148 |
| 17 | sentence-length standard deviation `syn_sd_sent_len` | 0.633 | -0.266 | small | 1.9% | 8.6% | low | 8.148 | 9.549 | 5.2e-138 |
| 18 | markdown headings per line `fmt_md_heading_rate` | 0.631 | +0.262 | small | 26.9% | 26.9% | high | 0 | 0 | <1e-300 |
| 19 | mean word-pair surprisal `inf_bigram_surprisal_mean` | 0.627 | +0.255 | small | 0.7% | 12.4% | high | 17.79 | 17.53 | 4.2e-127 |
| 20 | opening parentheses per 1,000 characters `pun_lparen_per1kc` | 0.626 | -0.252 | small | 0.0% | 0.0% | low | 0 | 0.5277 | 4.6e-138 |
| 21 | sentence-length range `syn_range_sent_len` | 0.624 | -0.248 | small | 1.7% | 7.1% | low | 32 | 37 | 2.3e-120 |
| 22 | words of 8 letters or more `lex_long_word_rate` | 0.623 | +0.246 | small | 7.5% | 17.4% | high | 0.2159 | 0.1695 | 7.3e-119 |
| 23 | sentences over 30 words `syn_pct_long_sent` | 0.623 | -0.245 | small | 0.0% | 0.0% | low | 0.07692 | 0.1429 | 1.1e-118 |
| 24 | word surprisal spread `inf_surprisal_sd` | 0.621 | -0.241 | small | 0.8% | 8.9% | low | 3.968 | 4.188 | 5.0e-114 |
| 25 | surprisal change between adjacent words `inf_uid_masd` | 0.619 | -0.239 | small | 1.6% | 10.9% | low | 4.925 | 5.193 | 5.1e-112 |
| 26 | '#' per 1,000 characters `pun_hash_per1kc` | 0.619 | +0.239 | small | 20.2% | 27.3% | high | 0 | 0 | 1.1e-276 |
| 27 | share of vocabulary used exactly twice `lex_dis_rate` | 0.616 | -0.232 | small | 4.4% | 13.1% | low | 0.1394 | 0.1507 | 5.3e-106 |
| 28 | 95th-percentile word surprisal `inf_surprisal_p95` | 0.611 | -0.222 | small | 0.2% | 5.0% | low | 17.37 | 18.15 | 7.0e-97 |
| 29 | '*' per 1,000 characters `pun_asterisk_per1kc` | 0.608 | +0.216 | small | 19.4% | 24.1% | high | 0 | 0 | 1.7e-256 |
| 30 | mean word surprisal `inf_surprisal_mean` | 0.605 | +0.209 | small | 0.1% | 7.0% | high | 11.09 | 10.86 | 2.6e-86 |
| 31 | mean sentence length `syn_mean_sent_len` | 0.604 | -0.209 | small | 0.8% | 9.8% | low | 18.1 | 20.09 | 9.9e-86 |
| 32 | hyphens per 1,000 characters `pun_hyphen_per1kc` | 0.603 | +0.206 | small | 2.6% | 12.2% | high | 1.971 | 1.299 | 4.8e-84 |
| 33 | passive constructions per sentence (approx) `syn_passive_approx_rate` | 0.601 | -0.202 | small | 0.0% | 0.0% | low | 0.1373 | 0.1875 | 9.1e-81 |
| 34 | pun_serial_comma_rate `pun_serial_comma_rate` | 0.600 | +0.200 | small | 1.8% | 10.5% | high | 6.211 | 4 | 1.6e-79 |
| 35 | curly apostrophes per 1,000 characters `pun_curly_apos_per1kc` | 0.598 | -0.196 | small | 0.0% | 0.0% | low | 0 | 0 | 5.0e-99 |
| 36 | word-unigram entropy `inf_word_entropy` | 0.595 | +0.191 | small | 5.4% | 20.6% | high | 7.309 | 7.158 | 6.0e-72 |
| 37 | em dashes per 1,000 words `pun_emdash_per1kw` | 0.595 | +0.190 | small | 7.2% | 19.7% | high | 0 | 0 | 2.4e-133 |
| 38 | em dashes per 1,000 characters `pun_emdash_per1kc` | 0.594 | +0.189 | small | 6.7% | 18.5% | high | 0 | 0 | 7.0e-131 |
| 39 | word entropy, normalised by vocabulary size `inf_word_entropy_norm` | 0.593 | +0.185 | small | 3.7% | 10.3% | high | 0.9204 | 0.9117 | 5.1e-68 |
| 40 | short Title Case lines (headings without markup) `fmt_titlecase_line_rate` | 0.592 | +0.185 | small | 2.3% | 15.0% | high | 0 | 0 | 2.2e-126 |
| 41 | share of quotes/apostrophes that are curly `pun_curly_share` | 0.591 | -0.182 | small | 0.0% | 0.0% | low | 0 | 0 | 7.3e-86 |
| 42 | markdown bold spans per 1,000 words `fmt_md_bold_rate` | 0.587 | +0.175 | small | 18.0% | 18.0% | high | 0 | 0 | 1.0e-235 |
| 43 | 'a' per 1,000 words `lex_a_rate` | 0.587 | +0.173 | small | 1.4% | 8.7% | high | 24.31 | 20.92 | 1.3e-59 |
| 44 | pun_exclaim_per1kc `pun_exclaim_per1kc` | 0.586 | -0.172 | small | 0.0% | 0.0% | low | 0 | 0 | 2.9e-157 |
| 45 | gzip compression ratio, letters only `inf_compress_ratio_alpha` | 0.583 | +0.166 | small | 1.7% | 9.0% | high | 0.4476 | 0.4347 | 6.3e-55 |
| 46 | first-person singular per 1,000 words `lex_1sg_rate` | 0.582 | -0.164 | small | 0.0% | 0.0% | low | 0 | 0 | 1.9e-67 |
| 47 | gzip compression ratio, words only `inf_compress_ratio_words` | 0.582 | +0.163 | small | 1.2% | 8.7% | high | 0.4461 | 0.4332 | 4.3e-53 |
| 48 | exclamations `syn_exclaim_rate` | 0.580 | -0.159 | small | 0.0% | 0.0% | low | 0 | 0 | 1.4e-146 |
| 49 | pun_slash_per1kc `pun_slash_per1kc` | 0.578 | -0.156 | small | 0.0% | 0.0% | low | 0 | 0 | 2.9e-99 |
| 50 | 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | 0.578 | +0.156 | small | 6.6% | 16.4% | high | 0 | 0 | 9.2e-75 |
| 51 | pun_curly_dq_open_per1kc `pun_curly_dq_open_per1kc` | 0.575 | -0.150 | small | 0.0% | 0.0% | low | 0 | 0 | 1.1e-90 |
| 52 | ALL-CAPS words `fmt_allcaps_rate` | 0.572 | -0.144 | small | 0.0% | 0.0% | low | 0.001431 | 0.003289 | 2.8e-44 |
| 53 | sentences under 10 words `syn_pct_short_sent` | 0.571 | +0.143 | small | 1.2% | 8.4% | high | 0.1951 | 0.1389 | 2.0e-41 |
| 54 | first paragraph length, relative to average `dis_first_para_rel_len` | 0.570 | -0.139 | small | 2.3% | 6.5% | low | 0.9155 | 1 | 6.2e-40 |
| 55 | sentence-length distribution entropy `rhy_sentlen_entropy` | 0.568 | -0.135 | small | 1.9% | 6.0% | low | 0.6674 | 0.6982 | 6.6e-37 |
| 56 | share of text in its 50 commonest words `lex_top_content_share` | 0.566 | -0.133 | small | 1.7% | 7.1% | low | 0.1875 | 0.2117 | 1.4e-35 |
| 57 | commas per 1,000 characters `pun_comma_per1kc` | 0.564 | +0.128 | small | 0.9% | 5.0% | high | 8.355 | 7.737 | 2.0e-33 |
| 58 | lex_cliche_any `lex_cliche_any` | 0.562 | +0.124 | small | 0.0% | 0.0% | high | 0 | 0 | 4.3e-44 |
| 59 | gzip compression ratio `inf_compress_ratio` | 0.561 | +0.122 | small | 2.3% | 7.9% | high | 0.4836 | 0.4734 | 1.9e-30 |
| 60 | sentence-length autocorrelation, lag 1 `rhy_autocorr_lag1` | 0.560 | -0.119 | small | 0.9% | 4.7% | low | -0.04462 | 0.009004 | 5.5e-29 |
| 61 | sentences opening with 'The' `syn_the_opener_rate` | 0.559 | +0.118 | small | 0.5% | 5.4% | high | 0.1111 | 0.08823 | 8.1e-29 |
| 62 | ellipses per 1,000 words `pun_ellipsis_any` | 0.558 | -0.116 | small | 0.0% | 0.0% | low | 0 | 0 | 8.1e-116 |
| 63 | second person per 1,000 words `lex_2p_rate` | 0.557 | -0.113 | small | 0.0% | 0.0% | low | 0 | 0.7179 | 2.8e-31 |
| 64 | markdown bullets per line `fmt_md_bullet_rate` | 0.555 | +0.111 | small | 12.1% | 12.2% | high | 0 | 0 | 6.0e-128 |
| 65 | contractions per 1,000 words `lex_contraction_rate` | 0.555 | -0.111 | small | 0.0% | 0.0% | low | 4.866 | 7.848 | 1.4e-25 |
| 66 | sentence-length interquartile range `syn_iqr_sent_len` | 0.553 | -0.107 | negligible | 0.5% | 6.0% | low | 11 | 12 | 9.3e-24 |
| 67 | capitalised non-initial words (proper nouns, approx) `lex_propernoun_approx_rate` | 0.553 | -0.106 | negligible | 1.5% | 7.7% | low | 0.0663 | 0.077 | 1.6e-23 |
| 68 | distinct two-word openers / sentences `syn_distinct_opener2_ratio` | 0.552 | +0.104 | negligible | 0.0% | 0.0% | high | 0.9615 | 0.9444 | 1.4e-23 |
| 69 | content-word overlap between paragraphs `dis_para_jaccard_mean` | 0.548 | -0.095 | negligible | 0.0% | 0.0% | low | 0.02734 | 0.03301 | 1.7e-19 |
| 70 | sentences opening with And/But/So `syn_coord_opener_rate` | 0.547 | -0.095 | negligible | 0.0% | 0.0% | low | 0.01087 | 0.02128 | 5.5e-21 |
| 71 | colons per 1,000 characters `pun_colon_per1kc` | 0.546 | +0.093 | negligible | 1.7% | 8.2% | high | 0.219 | 0 | 3.0e-20 |
| 72 | questions `syn_question_rate` | 0.546 | -0.091 | negligible | 0.0% | 0.0% | low | 0 | 0 | 2.3e-27 |
| 73 | rare-word rate `inf_rare_word_rate` | 0.544 | +0.088 | negligible | 0.3% | 6.3% | high | 0.2349 | 0.224 | 2.0e-16 |
| 74 | sentence-length autocorrelation, lag 2 `rhy_autocorr_lag2` | 0.543 | -0.085 | negligible | 1.0% | 5.7% | low | -0.04034 | -0.002523 | 1.3e-15 |
| 75 | mean sentences per paragraph `rhy_mean_para_sents` | 0.542 | +0.085 | negligible | 0.1% | 2.3% | high | 4 | 3.571 | 1.7e-15 |
| 76 | 'is' per 1,000 words `lex_is_rate` | 0.539 | -0.077 | negligible | 0.0% | 0.0% | low | 9.284 | 10.27 | 4.6e-13 |
| 77 | tokens containing a digit `lex_digit_token_rate` | 0.538 | -0.077 | negligible | 0.0% | 0.0% | low | 0.009509 | 0.01154 | 4.6e-13 |
| 78 | pun_question_per1kc `pun_question_per1kc` | 0.538 | -0.075 | negligible | 0.0% | 0.0% | low | 0 | 0 | 3.6e-18 |
| 79 | sentence count `syn_n_sentences` | 0.537 | +0.074 | negligible | 2.1% | 8.4% | high | 28 | 26 | 3.0e-12 |
| 80 | 'the' per 1,000 words `lex_the_rate` | 0.535 | -0.069 | negligible | 0.4% | 5.7% | low | 49.64 | 52.63 | 8.5e-11 |
| 81 | intensifiers per 1,000 words `lex_booster_rate` | 0.534 | -0.069 | negligible | 0.0% | 0.0% | low | 0 | 0 | 2.7e-13 |
| 82 | between-sentence surprisal variance `inf_uid_sent_var` | 0.533 | -0.066 | negligible | 1.2% | 5.5% | low | 0.9145 | 0.9952 | 7.6e-10 |
| 83 | third person per 1,000 words `lex_3p_rate` | 0.532 | -0.065 | negligible | 0.0% | 5.5% | low | 15.95 | 18.97 | 1.2e-09 |
| 84 | syn_min_sent_len `syn_min_sent_len` | 0.529 | -0.059 | negligible | 0.0% | 0.0% | low | 3 | 4 | 3.3e-08 |
| 85 | spectral flatness of the sentence-length series `rhy_spectral_flatness` | 0.529 | -0.057 | negligible | 1.0% | 5.5% | low | 0.57 | 0.581 | 4.5e-07 |
| 86 | blank lines `fmt_blankline_rate` | 0.525 | -0.049 | negligible | 0.0% | 0.0% | low | 0.4286 | 0.4444 | 2.4e-06 |
| 87 | share of word pairs seen in the background corpus `inf_bigram_known_rate` | 0.524 | -0.048 | negligible | 0.5% | 6.0% | low | 0.5772 | 0.5869 | 6.7e-06 |
| 88 | last paragraph length, relative to average `dis_last_para_rel_len` | 0.523 | +0.046 | negligible | 0.6% | 3.9% | high | 1 | 1 | 1.6e-05 |
| 89 | paragraph sentence-count variation (CV) `rhy_cv_para_sents` | 0.523 | -0.045 | negligible | 0.0% | 0.0% | low | 0.3534 | 0.3963 | 2.1e-05 |
| 90 | pun_ellipsis_char_per1kc `pun_ellipsis_char_per1kc` | 0.522 | -0.045 | negligible | 0.0% | 0.0% | low | 0 | 0 | 2.5e-53 |
| 91 | commas per sentence `syn_comma_per_sent` | 0.522 | +0.044 | negligible | 0.3% | 3.6% | high | 0.9706 | 0.9231 | 3.5e-05 |
| 92 | commonest sentence opener's share `syn_max_opener_repeat` | 0.522 | +0.044 | negligible | 0.4% | 4.3% | high | 0.1818 | 0.1707 | 4.2e-05 |
| 93 | sentence-length coefficient of variation `syn_cv_sent_len` | 0.521 | -0.043 | negligible | 2.5% | 11.0% | low | 0.4896 | 0.4848 | 6.2e-05 |
| 94 | burstiness of sentence lengths `rhy_burstiness` | 0.521 | -0.043 | negligible | 2.5% | 11.0% | low | -0.3426 | -0.347 | 6.2e-05 |
| 95 | subordinators per 1,000 words `syn_subordinator_rate` | 0.520 | +0.040 | negligible | 0.4% | 4.5% | high | 24.88 | 24 | 2.3e-04 |
| 96 | straight apostrophes per 1,000 characters `pun_straight_apos_per1kc` | 0.519 | +0.037 | negligible | 1.8% | 5.9% | high | 0.273 | 0 | 2.4e-04 |
| 97 | inf_char_entropy `inf_char_entropy` | 0.518 | -0.037 | negligible | 0.6% | 4.7% | low | 4.415 | 4.425 | 5.8e-04 |
| 98 | discourse markers per 1,000 words `lex_discourse_marker_rate` | 0.517 | +0.034 | negligible | 1.8% | 6.6% | high | 1.031 | 0.905 | 7.1e-04 |
| 99 | pun_endash_per1kc `pun_endash_per1kc` | 0.516 | -0.032 | negligible | 0.0% | 0.0% | low | 0 | 0 | 9.4e-06 |
| 100 | 'X, Y and Z' lists per 1,000 words `pun_rule_of_three_rate` | 0.515 | +0.029 | negligible | 1.1% | 6.0% | high | 0.8432 | 0 | 3.6e-03 |
| 101 | 'it' per 1,000 words `lex_it_rate` | 0.514 | -0.028 | negligible | 0.0% | 0.0% | low | 5.495 | 5.871 | 9.4e-03 |
| 102 | pun_straight_quote_per1kc `pun_straight_quote_per1kc` | 0.514 | +0.027 | negligible | 0.6% | 3.8% | high | 0 | 0 | 1.1e-03 |
| 103 | closes with a summary marker `dis_conclusion_marker` | 0.514 | +0.027 | negligible | 0.0% | 5.8% | high | 0 | 0 | 8.8e-13 |
| 104 | distinct sentence openers / sentences `syn_distinct_opener_ratio` | 0.514 | -0.027 | negligible | 3.0% | 8.8% | low | 0.6964 | 0.7037 | 1.2e-02 |
| 105 | semicolons per 1,000 characters `pun_semicolon_per1kc` | 0.513 | +0.025 | negligible | 0.2% | 2.1% | high | 0 | 0 | 3.6e-03 |
| 106 | paragraph count `rhy_n_paragraphs` | 0.512 | +0.024 | negligible | 0.7% | 5.3% | high | 7 | 8 | 2.1e-02 |
| 107 | URLs per 1,000 words `fmt_url_rate` | 0.512 | -0.023 | negligible | 0.0% | 0.0% | low | 0 | 0 | 2.0e-20 |
| 108 | double space after a full stop, per 1,000 characters `pun_double_space_rate` | 0.511 | +0.022 | negligible | 2.2% | 2.2% | high | 0 | 0 | 1.1e-28 |
| 109 | 'AI phrases' per 1,000 words `lex_cliche_phrase_rate` | 0.511 | +0.022 | negligible | 1.9% | 7.3% | high | 0 | 0 | 1.1e-03 |
| 110 | mean line length `fmt_mean_line_len` | 0.510 | -0.020 | negligible | 0.6% | 5.1% | low | 251.7 | 257.3 | 5.8e-02 |
| 111 | paragraph-length variation (CV) `rhy_cv_para_words` | 0.508 | -0.016 | negligible | 0.0% | 0.0% | low | 0.3738 | 0.4125 | 1.4e-01 |
| 112 | mean successive sentence-length change `rhy_masd_norm` | 0.508 | +0.016 | negligible | 0.4% | 4.3% | high | 0.5526 | 0.5344 | 1.4e-01 |
| 113 | pun_ampersand_per1kc `pun_ampersand_per1kc` | 0.508 | -0.015 | negligible | 0.0% | 0.0% | low | 0 | 0 | 8.2e-03 |
| 114 | emoji per 1,000 words `fmt_emoji_rate` | 0.507 | +0.015 | negligible | 2.1% | 2.1% | high | 0 | 0 | 6.1e-12 |
| 115 | mean paragraph length `rhy_mean_para_words` | 0.507 | -0.015 | negligible | 0.3% | 5.3% | low | 72.4 | 69.07 | 1.7e-01 |
| 116 | 'that' per 1,000 words `lex_that_rate` | 0.505 | +0.009 | negligible | 0.6% | 3.5% | high | 10.04 | 9.848 | 3.9e-01 |
| 117 | first-person plural per 1,000 words `lex_1pl_rate` | 0.503 | +0.007 | negligible | 0.9% | 5.4% | high | 3.46 | 3.446 | 5.3e-01 |
| 118 | 'and' per 1,000 words `lex_and_rate` | 0.503 | -0.006 | negligible | 0.0% | 3.9% | low | 27.44 | 27.35 | 5.5e-01 |
| 119 | numbered-list lines `fmt_md_numlist_rate` | 0.501 | +0.003 | negligible | 1.0% | 6.0% | high | 0 | 0 | 5.5e-01 |
| 120 | fmt_zerowidth_any `fmt_zerowidth_any` | 0.501 | -0.002 | negligible | 0.0% | 0.0% | low | 0 | 0 | 5.5e-04 |
| 121 | hedges per 1,000 words `lex_hedge_rate` | 0.500 | +0.001 | negligible | 1.4% | 5.7% | high | 3.916 | 3.953 | 9.3e-01 |
| 122 | fmt_nbsp_rate `fmt_nbsp_rate` | 0.500 | -0.000 | negligible | 0.0% | 0.0% | low | 0 | 0 | 3.3e-01 |

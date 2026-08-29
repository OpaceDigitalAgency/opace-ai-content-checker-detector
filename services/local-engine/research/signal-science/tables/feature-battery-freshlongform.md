# Feature battery — fresh longform register matched

670 AI documents matched 1:1 to 670 human documents on register family and log word count. Effect sizes are Cliff's delta; `dir` says whether AI scores high or low. `TPR@1%` is single-feature detection with the threshold set on the human half so that 1 human in 100 is wrongly flagged. p-values are Mann-Whitney U, Benjamini-Hochberg adjusted across all 121 features at q=0.05.

| rank | signal | AUROC | Cliff's δ | size | TPR@1% FP | TPR@5% FP | dir | median AI | median human | BH p |
|---:|---|---:|---:|---|---:|---:|:--:|---:|---:|---:|
| 1 | content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | 0.912 | -0.825 | large | 23.1% | 61.5% | low | 0.02108 | 0.06283 | 1.8e-148 |
| 2 | vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | 0.911 | +0.821 | large | 47.3% | 67.8% | high | 0.7755 | 0.6942 | 1.6e-147 |
| 3 | type-token ratio, first 400 words `lex_ttr_first400` | 0.876 | +0.753 | large | 17.0% | 49.9% | high | 0.595 | 0.5025 | 3.0e-124 |
| 4 | distinct word triples / word triples `lex_distinct3` | 0.839 | +0.677 | large | 16.4% | 43.4% | high | 0.979 | 0.9382 | 7.9e-101 |
| 5 | repeated word-triple rate `lex_repeat_trigram_rate` | 0.839 | -0.677 | large | 16.4% | 43.4% | low | 0.02098 | 0.06179 | 7.9e-101 |
| 6 | distinct word pairs / word pairs `lex_distinct2` | 0.830 | +0.661 | large | 19.7% | 39.3% | high | 0.8779 | 0.8015 | 4.3e-96 |
| 7 | 'to' per 1,000 words `lex_to_rate` | 0.801 | -0.602 | large | 0.0% | 31.9% | low | 18.6 | 27.41 | 4.8e-80 |
| 8 | word-unigram entropy `inf_word_entropy` | 0.788 | +0.576 | large | 11.8% | 27.2% | high | 8.279 | 7.784 | 2.8e-73 |
| 9 | share of vocabulary used exactly once `lex_hapax_rate` | 0.782 | +0.563 | large | 3.9% | 20.4% | high | 0.6741 | 0.6171 | 2.8e-70 |
| 10 | any markdown present `fmt_any_markdown` | 0.773 | +0.546 | large | 0.0% | 56.6% | high | 1 | 0 | 1.7e-105 |
| 11 | opening parentheses per 1,000 characters `pun_lparen_per1kc` | 0.773 | -0.546 | large | 0.0% | 38.7% | low | 0.1918 | 1.331 | 6.8e-67 |
| 12 | em dashes per 1,000 words `pun_emdash_per1kw` | 0.772 | +0.543 | large | 20.3% | 43.9% | high | 3.495 | 0 | 3.5e-75 |
| 13 | gzip compression ratio, words only `inf_compress_ratio_words` | 0.769 | +0.538 | large | 1.6% | 26.0% | high | 0.3954 | 0.3585 | 3.4e-64 |
| 14 | em dashes per 1,000 characters `pun_emdash_per1kc` | 0.768 | +0.537 | large | 19.1% | 41.0% | high | 0.5185 | 0 | 1.6e-73 |
| 15 | gzip compression ratio, letters only `inf_compress_ratio_alpha` | 0.766 | +0.532 | large | 3.1% | 29.4% | high | 0.3967 | 0.3597 | 7.5e-63 |
| 16 | share of text in its 50 commonest words `lex_top_content_share` | 0.763 | -0.525 | large | 9.6% | 29.0% | low | 0.1306 | 0.1799 | 2.3e-61 |
| 17 | Yule's K (repetition concentration) `lex_yule_k` | 0.741 | -0.482 | large | 23.7% | 39.6% | low | 88.49 | 113.7 | 8.2e-52 |
| 18 | ALL-CAPS words `fmt_allcaps_rate` | 0.738 | -0.476 | large | 0.0% | 0.0% | low | 0.001063 | 0.006306 | 2.9e-51 |
| 19 | gzip compression ratio `inf_compress_ratio` | 0.734 | +0.469 | large | 1.8% | 17.3% | high | 0.423 | 0.3882 | 3.7e-49 |
| 20 | word entropy, normalised by vocabulary size `inf_word_entropy_norm` | 0.731 | +0.462 | large | 11.6% | 21.9% | high | 0.8859 | 0.8689 | 7.5e-48 |
| 21 | 'of' per 1,000 words `lex_of_rate` | 0.727 | -0.453 | large | 0.0% | 14.9% | low | 25.73 | 34.07 | 4.5e-46 |
| 22 | word-pair surprisal spread `inf_bigram_surprisal_sd` | 0.726 | -0.452 | large | 0.0% | 29.6% | low | 3.176 | 3.325 | 6.7e-46 |
| 23 | sentences opening with 'The' `syn_the_opener_rate` | 0.717 | +0.433 | large | 4.3% | 16.0% | high | 0.1799 | 0.1176 | 3.1e-42 |
| 24 | passive constructions per sentence (approx) `syn_passive_approx_rate` | 0.716 | -0.432 | large | 0.0% | 10.6% | low | 0.1824 | 0.2899 | 5.9e-42 |
| 25 | 'a' per 1,000 words `lex_a_rate` | 0.712 | +0.424 | medium | 12.8% | 29.0% | high | 23.09 | 17.03 | 1.5e-40 |
| 26 | hyphens per 1,000 characters `pun_hyphen_per1kc` | 0.708 | +0.416 | medium | 6.7% | 19.9% | high | 2.515 | 1.531 | 5.3e-39 |
| 27 | '*' per 1,000 characters `pun_asterisk_per1kc` | 0.705 | +0.411 | medium | 34.0% | 43.1% | high | 0 | 0 | 4.4e-69 |
| 28 | pun_serial_comma_rate `pun_serial_comma_rate` | 0.697 | +0.394 | medium | 4.2% | 16.9% | high | 8.075 | 4.717 | 3.3e-35 |
| 29 | markdown headings per line `fmt_md_heading_rate` | 0.695 | +0.389 | medium | 39.4% | 39.4% | high | 0 | 0 | 1.4e-68 |
| 30 | sentences under 10 words `syn_pct_short_sent` | 0.692 | +0.384 | medium | 0.0% | 4.6% | high | 0.1948 | 0.09677 | 1.4e-33 |
| 31 | words of 3 letters or fewer `lex_short_word_rate` | 0.690 | -0.379 | medium | 26.7% | 41.3% | low | 0.3272 | 0.359 | 9.5e-33 |
| 32 | short Title Case lines (headings without markup) `fmt_titlecase_line_rate` | 0.688 | +0.376 | medium | 1.8% | 24.0% | high | 0.01695 | 0 | 1.9e-42 |
| 33 | syn_max_sent_len `syn_max_sent_len` | 0.685 | -0.370 | medium | 0.7% | 15.8% | low | 49 | 57 | 3.4e-31 |
| 34 | tokens containing a digit `lex_digit_token_rate` | 0.685 | -0.369 | medium | 0.0% | 20.3% | low | 0.01333 | 0.02465 | 4.0e-31 |
| 35 | surprisal change between adjacent words `inf_uid_masd` | 0.683 | -0.365 | medium | 0.1% | 12.2% | low | 4.936 | 5.234 | 1.7e-30 |
| 36 | curly apostrophes per 1,000 characters `pun_curly_apos_per1kc` | 0.682 | -0.363 | medium | 0.0% | 0.0% | low | 0.09333 | 0.6782 | 2.6e-31 |
| 37 | '#' per 1,000 characters `pun_hash_per1kc` | 0.680 | +0.360 | medium | 29.4% | 39.6% | high | 0 | 0 | 5.5e-55 |
| 38 | first paragraph length, relative to average `dis_first_para_rel_len` | 0.675 | -0.350 | medium | 8.5% | 13.7% | low | 0.1787 | 0.6413 | 3.7e-28 |
| 39 | pun_slash_per1kc `pun_slash_per1kc` | 0.674 | -0.348 | medium | 0.0% | 0.0% | low | 0 | 0.06247 | 4.2e-38 |
| 40 | share of quotes/apostrophes that are curly `pun_curly_share` | 0.669 | -0.338 | medium | 0.0% | 0.0% | low | 0.2153 | 1 | 7.3e-32 |
| 41 | 'and' per 1,000 words `lex_and_rate` | 0.666 | -0.331 | medium | 0.0% | 7.8% | low | 26.28 | 32.18 | 2.7e-25 |
| 42 | word surprisal spread `inf_surprisal_sd` | 0.659 | -0.318 | medium | 0.1% | 5.7% | low | 3.954 | 4.15 | 1.9e-23 |
| 43 | subordinators per 1,000 words `syn_subordinator_rate` | 0.657 | +0.315 | medium | 3.4% | 13.9% | high | 27.43 | 22.02 | 5.5e-23 |
| 44 | sentence-length range `syn_range_sent_len` | 0.656 | -0.312 | medium | 0.7% | 14.9% | low | 46 | 53 | 1.2e-22 |
| 45 | mean sentence length `syn_mean_sent_len` | 0.653 | -0.306 | medium | 0.0% | 6.1% | low | 20.41 | 23.67 | 7.9e-22 |
| 46 | commonest sentence opener's share `syn_max_opener_repeat` | 0.650 | +0.300 | medium | 2.2% | 11.0% | high | 0.1888 | 0.1479 | 5.4e-21 |
| 47 | mean word-pair surprisal `inf_bigram_surprisal_mean` | 0.645 | +0.289 | medium | 0.0% | 14.9% | high | 17.76 | 17.5 | 1.3e-19 |
| 48 | 'that' per 1,000 words `lex_that_rate` | 0.644 | +0.289 | medium | 1.0% | 11.2% | high | 13.34 | 10.43 | 1.3e-19 |
| 49 | colons per 1,000 characters `pun_colon_per1kc` | 0.644 | +0.287 | medium | 0.7% | 4.9% | high | 0.4387 | 0.2275 | 1.8e-19 |
| 50 | capitalised non-initial words (proper nouns, approx) `lex_propernoun_approx_rate` | 0.643 | -0.286 | medium | 4.8% | 11.6% | low | 0.05972 | 0.08276 | 2.7e-19 |
| 51 | markdown bold spans per 1,000 words `fmt_md_bold_rate` | 0.642 | +0.284 | medium | 28.7% | 28.7% | high | 0 | 0 | 2.5e-48 |
| 52 | pun_curly_dq_open_per1kc `pun_curly_dq_open_per1kc` | 0.636 | -0.272 | small | 0.0% | 0.0% | low | 0 | 0.06587 | 1.8e-22 |
| 53 | mean successive sentence-length change `rhy_masd_norm` | 0.635 | +0.271 | small | 0.0% | 3.1% | high | 0.6019 | 0.5367 | 2.0e-17 |
| 54 | sentence-length autocorrelation, lag 1 `rhy_autocorr_lag1` | 0.632 | -0.263 | small | 4.2% | 14.0% | low | -0.03498 | 0.05929 | 1.6e-16 |
| 55 | mean word length `lex_mean_word_len` | 0.631 | +0.262 | small | 17.8% | 32.1% | high | 5.59 | 5.351 | 2.0e-16 |
| 56 | 'is' per 1,000 words `lex_is_rate` | 0.628 | +0.256 | small | 8.7% | 20.4% | high | 11.44 | 8.898 | 1.0e-15 |
| 57 | straight apostrophes per 1,000 characters `pun_straight_apos_per1kc` | 0.624 | +0.248 | small | 4.0% | 12.7% | high | 0.06606 | 0 | 1.5e-18 |
| 58 | 'it' per 1,000 words `lex_it_rate` | 0.622 | +0.245 | small | 4.8% | 21.3% | high | 5.303 | 3.686 | 1.8e-14 |
| 59 | sentences over 30 words `syn_pct_long_sent` | 0.622 | -0.243 | small | 1.2% | 13.0% | low | 0.1787 | 0.2412 | 2.6e-14 |
| 60 | 95th-percentile word surprisal `inf_surprisal_p95` | 0.621 | -0.242 | small | 0.3% | 3.1% | low | 17.37 | 17.96 | 3.4e-14 |
| 61 | inf_char_entropy `inf_char_entropy` | 0.620 | -0.240 | small | 0.7% | 10.6% | low | 4.428 | 4.475 | 5.8e-14 |
| 62 | share of vocabulary used exactly twice `lex_dis_rate` | 0.616 | -0.231 | small | 2.4% | 9.6% | low | 0.1539 | 0.1619 | 4.6e-13 |
| 63 | pun_straight_quote_per1kc `pun_straight_quote_per1kc` | 0.610 | +0.219 | small | 3.3% | 20.7% | high | 0 | 0 | 3.4e-24 |
| 64 | distinct two-word openers / sentences `syn_distinct_opener2_ratio` | 0.606 | +0.211 | small | 0.0% | 10.9% | high | 0.9189 | 0.8966 | 3.7e-11 |
| 65 | syn_min_sent_len `syn_min_sent_len` | 0.605 | -0.210 | small | 0.0% | 0.0% | low | 2 | 3 | 1.2e-11 |
| 66 | sentence-length standard deviation `syn_sd_sent_len` | 0.602 | -0.205 | small | 0.9% | 10.9% | low | 10.84 | 11.66 | 1.5e-10 |
| 67 | content-word overlap between paragraphs `dis_para_jaccard_mean` | 0.597 | -0.193 | small | 0.0% | 0.0% | low | 0.03849 | 0.055 | 1.5e-09 |
| 68 | sentence-length autocorrelation, lag 2 `rhy_autocorr_lag2` | 0.594 | -0.187 | small | 4.3% | 13.6% | low | -0.01181 | 0.03546 | 4.9e-09 |
| 69 | sentence count `syn_n_sentences` | 0.592 | +0.185 | small | 3.0% | 11.9% | high | 73 | 62 | 8.3e-09 |
| 70 | 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | 0.589 | +0.179 | small | 5.5% | 12.8% | high | 0.8493 | 0.493 | 8.9e-09 |
| 71 | mean line length `fmt_mean_line_len` | 0.587 | -0.173 | small | 0.0% | 0.0% | low | 274.1 | 383.5 | 6.5e-08 |
| 72 | words of 8 letters or more `lex_long_word_rate` | 0.586 | +0.172 | small | 12.4% | 23.6% | high | 0.2715 | 0.2512 | 8.3e-08 |
| 73 | mean paragraph length `rhy_mean_para_words` | 0.586 | -0.171 | small | 0.0% | 0.1% | low | 80.32 | 109.7 | 9.3e-08 |
| 74 | mean word surprisal `inf_surprisal_mean` | 0.585 | +0.170 | small | 0.0% | 4.9% | high | 11.02 | 10.87 | 1.1e-07 |
| 75 | 'X, Y and Z' lists per 1,000 words `pun_rule_of_three_rate` | 0.579 | -0.158 | small | 0.0% | 0.0% | low | 1.562 | 2.219 | 8.0e-07 |
| 76 | function-word rate `lex_function_word_rate` | 0.577 | -0.155 | small | 0.0% | 20.4% | low | 0.3799 | 0.3957 | 1.4e-06 |
| 77 | paragraph count `rhy_n_paragraphs` | 0.575 | +0.150 | small | 0.1% | 2.5% | high | 19 | 14 | 3.0e-06 |
| 78 | spectral flatness of the sentence-length series `rhy_spectral_flatness` | 0.571 | -0.142 | small | 1.8% | 6.0% | low | 0.5522 | 0.5724 | 1.0e-05 |
| 79 | discourse markers per 1,000 words `lex_discourse_marker_rate` | 0.570 | -0.141 | small | 0.0% | 0.0% | low | 2.505 | 3.183 | 1.2e-05 |
| 80 | rare-word rate `inf_rare_word_rate` | 0.568 | +0.136 | small | 0.0% | 3.1% | high | 0.2334 | 0.2189 | 2.2e-05 |
| 81 | paragraph sentence-count variation (CV) `rhy_cv_para_sents` | 0.565 | -0.131 | small | 0.0% | 0.0% | low | 0.4368 | 0.4909 | 4.7e-05 |
| 82 | share of word pairs seen in the background corpus `inf_bigram_known_rate` | 0.562 | -0.125 | small | 0.1% | 4.3% | low | 0.5791 | 0.5977 | 1.1e-04 |
| 83 | blank lines `fmt_blankline_rate` | 0.558 | +0.117 | small | 0.3% | 3.0% | high | 0.4815 | 0.4762 | 2.9e-04 |
| 84 | last paragraph length, relative to average `dis_last_para_rel_len` | 0.558 | +0.115 | small | 1.3% | 5.4% | high | 0.9676 | 0.8827 | 3.5e-04 |
| 85 | commas per sentence `syn_comma_per_sent` | 0.552 | -0.104 | negligible | 0.0% | 0.1% | low | 1.226 | 1.356 | 1.3e-03 |
| 86 | sentence-length distribution entropy `rhy_sentlen_entropy` | 0.550 | -0.100 | negligible | 0.1% | 4.9% | low | 0.7908 | 0.8095 | 1.9e-03 |
| 87 | distinct sentence openers / sentences `syn_distinct_opener_ratio` | 0.549 | -0.099 | negligible | 6.3% | 15.2% | low | 0.5455 | 0.5681 | 2.3e-03 |
| 88 | first-person singular per 1,000 words `lex_1sg_rate` | 0.548 | -0.095 | negligible | 0.0% | 0.0% | low | 0 | 0 | 8.2e-04 |
| 89 | burstiness of sentence lengths `rhy_burstiness` | 0.547 | +0.094 | negligible | 0.1% | 0.9% | high | -0.2997 | -0.3288 | 3.7e-03 |
| 90 | sentence-length coefficient of variation `syn_cv_sent_len` | 0.547 | +0.094 | negligible | 0.1% | 0.9% | high | 0.5388 | 0.5051 | 3.7e-03 |
| 91 | pun_ellipsis_char_per1kc `pun_ellipsis_char_per1kc` | 0.547 | -0.094 | negligible | 0.0% | 0.0% | low | 0 | 0 | 1.8e-13 |
| 92 | ellipses per 1,000 words `pun_ellipsis_any` | 0.545 | -0.091 | negligible | 0.0% | 0.0% | low | 0 | 0 | 2.0e-11 |
| 93 | commas per 1,000 characters `pun_comma_per1kc` | 0.543 | +0.086 | negligible | 1.0% | 6.6% | high | 8.799 | 8.665 | 7.7e-03 |
| 94 | intensifiers per 1,000 words `lex_booster_rate` | 0.541 | -0.082 | negligible | 0.0% | 0.0% | low | 0.586 | 0.7583 | 9.2e-03 |
| 95 | first-person plural per 1,000 words `lex_1pl_rate` | 0.540 | -0.079 | negligible | 0.0% | 0.0% | low | 1.759 | 2.777 | 1.3e-02 |
| 96 | lex_cliche_any `lex_cliche_any` | 0.539 | +0.078 | negligible | 0.0% | 0.0% | high | 1 | 1 | 2.7e-03 |
| 97 | markdown bullets per line `fmt_md_bullet_rate` | 0.537 | +0.074 | negligible | 8.2% | 8.2% | high | 0 | 0 | 2.0e-10 |
| 98 | contractions per 1,000 words `lex_contraction_rate` | 0.534 | +0.069 | negligible | 3.6% | 8.8% | high | 3.226 | 2.708 | 3.4e-02 |
| 99 | 'AI phrases' per 1,000 words `lex_cliche_phrase_rate` | 0.533 | -0.067 | negligible | 0.0% | 0.0% | low | 0 | 0 | 6.1e-03 |
| 100 | paragraph-length variation (CV) `rhy_cv_para_words` | 0.529 | -0.058 | negligible | 0.0% | 0.0% | low | 0.5373 | 0.5285 | 7.9e-02 |
| 101 | mean sentences per paragraph `rhy_mean_para_sents` | 0.528 | -0.057 | negligible | 0.0% | 0.0% | low | 4 | 4.573 | 8.3e-02 |
| 102 | sentence-length interquartile range `syn_iqr_sent_len` | 0.527 | +0.055 | negligible | 0.4% | 6.0% | high | 16 | 15 | 9.4e-02 |
| 103 | pun_exclaim_per1kc `pun_exclaim_per1kc` | 0.526 | -0.052 | negligible | 0.0% | 0.0% | low | 0 | 0 | 4.8e-08 |
| 104 | 'the' per 1,000 words `lex_the_rate` | 0.525 | -0.050 | negligible | 0.0% | 5.7% | low | 56.7 | 58.46 | 1.3e-01 |
| 105 | URLs per 1,000 words `fmt_url_rate` | 0.523 | -0.046 | negligible | 0.0% | 0.0% | low | 0 | 0 | 3.8e-07 |
| 106 | semicolons per 1,000 characters `pun_semicolon_per1kc` | 0.522 | +0.043 | negligible | 0.1% | 0.3% | high | 0.2524 | 0.1955 | 1.8e-01 |
| 107 | numbered-list lines `fmt_md_numlist_rate` | 0.521 | -0.043 | negligible | 0.0% | 0.0% | low | 0 | 0 | 5.6e-03 |
| 108 | third person per 1,000 words `lex_3p_rate` | 0.520 | +0.039 | negligible | 2.1% | 9.9% | high | 13.22 | 12.85 | 2.3e-01 |
| 109 | sentences opening with And/But/So `syn_coord_opener_rate` | 0.518 | +0.037 | negligible | 1.0% | 7.2% | high | 0.02564 | 0.02424 | 2.6e-01 |
| 110 | exclamations `syn_exclaim_rate` | 0.518 | -0.036 | negligible | 0.0% | 0.0% | low | 0 | 0 | 6.8e-06 |
| 111 | hedges per 1,000 words `lex_hedge_rate` | 0.516 | +0.031 | negligible | 1.5% | 7.6% | high | 5.416 | 5.105 | 3.4e-01 |
| 112 | double space after a full stop, per 1,000 characters `pun_double_space_rate` | 0.513 | +0.027 | negligible | 2.7% | 2.7% | high | 0 | 0 | 2.7e-05 |
| 113 | pun_endash_per1kc `pun_endash_per1kc` | 0.511 | -0.022 | negligible | 0.0% | 0.0% | low | 0 | 0 | 4.5e-01 |
| 114 | between-sentence surprisal variance `inf_uid_sent_var` | 0.510 | -0.020 | negligible | 1.3% | 3.6% | low | 0.9285 | 0.9917 | 5.4e-01 |
| 115 | questions `syn_question_rate` | 0.510 | -0.019 | negligible | 0.0% | 0.0% | low | 0 | 0 | 4.4e-01 |
| 116 | closes with a summary marker `dis_conclusion_marker` | 0.508 | +0.016 | negligible | 0.0% | 0.0% | high | 0 | 0 | 2.8e-01 |
| 117 | pun_question_per1kc `pun_question_per1kc` | 0.506 | +0.013 | negligible | 0.1% | 0.9% | high | 0 | 0 | 6.3e-01 |
| 118 | pun_ampersand_per1kc `pun_ampersand_per1kc` | 0.502 | -0.004 | negligible | 0.0% | 0.0% | low | 0 | 0 | 8.7e-01 |
| 119 | emoji per 1,000 words `fmt_emoji_rate` | 0.501 | -0.003 | negligible | 0.0% | 0.0% | low | 0 | 0 | 3.4e-01 |
| 120 | fmt_zerowidth_any `fmt_zerowidth_any` | 0.501 | -0.003 | negligible | 0.0% | 0.0% | low | 0 | 0 | 1.7e-01 |
| 121 | second person per 1,000 words `lex_2p_rate` | 0.501 | -0.002 | negligible | 0.0% | 0.0% | low | 0 | 0 | 9.5e-01 |

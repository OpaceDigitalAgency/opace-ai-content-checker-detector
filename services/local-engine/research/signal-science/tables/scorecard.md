# THE SCORECARD (prose-only — the one to ship)

Every formatting feature is withheld from this variant. Markdown headings, bullets and bold tell you where text was pasted from, not who wrote it, and a model that leans on them scores well here and fails on prose pasted out of a CMS. Withholding them made this model **better**, not worse: see `transparent-vs-neural.md`.

Every weight is the change in log-odds of 'machine-written' per one standard deviation of that feature, measured against the training distribution. `alone` is the same feature's own AUROC as a single detector on fresh matched long-form: where a feature is strong alone but carries a small weight, its evidence is already being counted by a correlated neighbour.

Fitted on 6,887 documents — the same training split the cycle-2 neural model used. Intercept **+0.1718**.

| # | signal | weight (log-odds per SD) | alone (AUROC) | direction |
|---:|---|---:|---:|---|
| 1 | 'the' per 1,000 words `lex_the_rate` | +0.8254 | 0.525 | more ⇒ machine |
| 2 | sentence count `syn_n_sentences` | +0.8225 | 0.592 | more ⇒ machine |
| 3 | vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.7723 | 0.911 | more ⇒ machine |
| 4 | mean word length `lex_mean_word_len` | +0.7685 | 0.631 | more ⇒ machine |
| 5 | word-pair surprisal spread `inf_bigram_surprisal_sd` | -0.7029 | 0.726 | more ⇒ human |
| 6 | 95th-percentile word surprisal `inf_surprisal_p95` | -0.4715 | 0.621 | more ⇒ human |
| 7 | 'a' per 1,000 words `lex_a_rate` | +0.4565 | 0.712 | more ⇒ machine |
| 8 | first-person singular per 1,000 words `lex_1sg_rate` | +0.4412 | 0.548 | more ⇒ machine |
| 9 | em dashes per 1,000 words `pun_emdash_per1kw` | +0.3915 | 0.772 | more ⇒ machine |
| 10 | third person per 1,000 words `lex_3p_rate` | +0.3786 | 0.520 | more ⇒ machine |
| 11 | share of quotes/apostrophes that are curly `pun_curly_share` | -0.3326 | 0.669 | more ⇒ human |
| 12 | em dashes per 1,000 characters `pun_emdash_per1kc` | +0.3322 | 0.768 | more ⇒ machine |
| 13 | pun_serial_comma_rate `pun_serial_comma_rate` | +0.2935 | 0.697 | more ⇒ machine |
| 14 | pun_ampersand_per1kc `pun_ampersand_per1kc` | -0.2456 | 0.502 | more ⇒ human |
| 15 | exclamations `syn_exclaim_rate` | -0.2398 | 0.518 | more ⇒ human |
| 16 | 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | +0.2240 | 0.589 | more ⇒ machine |
| 17 | content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | -0.2098 | 0.912 | more ⇒ human |
| 18 | word-unigram entropy `inf_word_entropy` | +0.2066 | 0.788 | more ⇒ machine |
| 19 | 'to' per 1,000 words `lex_to_rate` | -0.2027 | 0.801 | more ⇒ human |
| 20 | sentence-length standard deviation `syn_sd_sent_len` | -0.1909 | 0.602 | more ⇒ human |
| 21 | discourse markers per 1,000 words `lex_discourse_marker_rate` | +0.1632 | 0.570 | more ⇒ machine |
| 22 | share of vocabulary used exactly twice `lex_dis_rate` | -0.1591 | 0.616 | more ⇒ human |
| 23 | distinct sentence openers / sentences `syn_distinct_opener_ratio` | -0.0919 | 0.549 | more ⇒ human |
| 24 | second person per 1,000 words `lex_2p_rate` | -0.0444 | 0.501 | more ⇒ human |

## Arithmetic

```
clip each raw feature to its [1st, 99th] training percentile
z_i       = (x_i - mean_i) / sd_i
log_odds  = intercept + Σ weight_i × z_i
score     = 1 / (1 + exp(-log_odds))
```

The constants are in `results/scorecard-model.json`. Nothing else is involved: no hidden layer, no embedding, no lookup the reader cannot see.

---

# THE SCORECARD (unrestricted — formatting allowed in)

Fitted with the whole battery available, including formatting. Kept for comparison, and as the evidence that formatting features cost accuracy on unseen prose rather than buying it.

Every weight is the change in log-odds of 'machine-written' per one standard deviation of that feature, measured against the training distribution. `alone` is the same feature's own AUROC as a single detector on fresh matched long-form: where a feature is strong alone but carries a small weight, its evidence is already being counted by a correlated neighbour.

Fitted on 6,887 documents — the same training split the cycle-2 neural model used. Intercept **+0.6274**.

| # | signal | weight (log-odds per SD) | alone (AUROC) | direction |
|---:|---|---:|---:|---|
| 1 | blank lines `fmt_blankline_rate` | +1.3829 | 0.558 | more ⇒ machine |
| 2 | markdown headings per line `fmt_md_heading_rate` | +0.9658 | 0.695 | more ⇒ machine |
| 3 | mean word length `lex_mean_word_len` | +0.8192 | 0.631 | more ⇒ machine |
| 4 | any markdown present `fmt_any_markdown` | +0.7281 | 0.773 | more ⇒ machine |
| 5 | em dashes per 1,000 characters `pun_emdash_per1kc` | +0.5341 | 0.768 | more ⇒ machine |
| 6 | word-pair surprisal spread `inf_bigram_surprisal_sd` | -0.5006 | 0.726 | more ⇒ human |
| 7 | content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | -0.4969 | 0.912 | more ⇒ human |
| 8 | 'the' per 1,000 words `lex_the_rate` | +0.4937 | 0.525 | more ⇒ machine |
| 9 | content-word overlap between paragraphs `dis_para_jaccard_mean` | -0.4534 | 0.597 | more ⇒ human |
| 10 | mean paragraph length `rhy_mean_para_words` | +0.4140 | 0.586 | more ⇒ machine |
| 11 | 95th-percentile word surprisal `inf_surprisal_p95` | -0.3431 | 0.621 | more ⇒ human |
| 12 | third person per 1,000 words `lex_3p_rate` | +0.3249 | 0.520 | more ⇒ machine |
| 13 | 'a' per 1,000 words `lex_a_rate` | +0.3182 | 0.712 | more ⇒ machine |
| 14 | vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.3169 | 0.911 | more ⇒ machine |
| 15 | sentence-length standard deviation `syn_sd_sent_len` | -0.3063 | 0.602 | more ⇒ human |
| 16 | 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | +0.2716 | 0.589 | more ⇒ machine |
| 17 | pun_ampersand_per1kc `pun_ampersand_per1kc` | -0.2697 | 0.502 | more ⇒ human |
| 18 | commas per 1,000 characters `pun_comma_per1kc` | +0.2536 | 0.543 | more ⇒ machine |
| 19 | second person per 1,000 words `lex_2p_rate` | -0.2290 | 0.501 | more ⇒ human |
| 20 | 'to' per 1,000 words `lex_to_rate` | -0.2180 | 0.801 | more ⇒ human |
| 21 | discourse markers per 1,000 words `lex_discourse_marker_rate` | +0.1921 | 0.570 | more ⇒ machine |
| 22 | distinct sentence openers / sentences `syn_distinct_opener_ratio` | -0.1834 | 0.549 | more ⇒ human |
| 23 | share of vocabulary used exactly twice `lex_dis_rate` | -0.1675 | 0.616 | more ⇒ human |
| 24 | word-unigram entropy `inf_word_entropy` | +0.0199 | 0.788 | more ⇒ machine |

## Arithmetic

```
clip each raw feature to its [1st, 99th] training percentile
z_i       = (x_i - mean_i) / sd_i
log_odds  = intercept + Σ weight_i × z_i
score     = 1 / (1 + exp(-log_odds))
```

The constants are in `results/scorecard-model.json`. Nothing else is involved: no hidden layer, no embedding, no lookup the reader cannot see.

---


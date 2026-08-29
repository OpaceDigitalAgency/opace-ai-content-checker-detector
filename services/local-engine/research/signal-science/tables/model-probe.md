# Ablation: what moves the deployed model's score

400 AI and 400 human long-form documents, each altered one way at a time and re-scored through the deployed artefact. 'flag rate' is the share crossing the shipped 0.984 threshold. A large shift proves the model is *sensitive* to what was changed; it does not prove that is the model's reason.

| change applied | AI flagged before → after | human FP before → after | mean margin shift (AI) | mean margin shift (human) |
|---|---:|---:|---:|---:|
| `strip_markdown` | 90.0% → **85.2%** | 2.25% → **2.00%** | -0.106 | -0.029 |
| `normalise_punctuation` | 90.0% → **85.0%** | 2.25% → **2.25%** | -0.087 | +0.122 |
| `strip_markdown_and_punctuation` | 90.0% → **73.2%** | 2.25% → **2.50%** | -0.277 | +0.114 |
| `shuffle_sentences` | 90.0% → **85.0%** | 2.25% → **1.50%** | -0.069 | -0.202 |
| `shuffle_paragraphs` | 90.0% → **87.0%** | 2.25% → **1.75%** | -0.043 | -0.070 |
| `lowercase` | 90.0% → **90.0%** | 2.25% → **2.25%** | +0.000 | +0.000 |
| `drop_first_paragraph` | 90.0% → **89.0%** | 2.25% → **1.75%** | -0.030 | +0.038 |
| `strip_cliche_vocabulary` | 90.0% → **89.2%** | 2.25% → **1.50%** | -0.003 | -0.047 |
| `increase_repetition` | 90.0% → **57.0%** | 2.25% → **0.25%** | -0.740 | -1.716 |
| `decrease_repetition` | 90.0% → **83.2%** | 2.25% → **1.00%** | -0.131 | -1.007 |
| `flatten_rhythm` | 90.0% → **46.8%** | 2.25% → **0.00%** | -1.280 | -1.969 |
| `truncate_400w` | 90.0% → **89.8%** | 2.25% → **1.75%** | -0.003 | +0.042 |
| `truncate_200w` | 90.0% → **59.8%** | 2.25% → **0.75%** | -0.441 | -0.679 |
| `truncate_100w` | 90.0% → **8.5%** | 2.25% → **0.00%** | -1.380 | -0.853 |

# Sentence occlusion

Every sentence deleted in turn from 57 documents: 2,174 deletions. Attribution is the drop in the model's margin when that sentence is removed, so a positive value means the sentence was pushing the document towards 'machine'.

- Share of sentences with positive attribution: **35.9%**
- Absolute attribution concentrated in the top fifth of sentences: **51.8%**
- Correlation between a sentence's position in the document and its attribution: **+0.027**

| what the deleted sentence looked like | Spearman ρ with attribution |
|---|---:|
| first-person plural per 1,000 words `lex_1pl_rate` | -0.125 |
| words of 3 letters or fewer `lex_short_word_rate` | -0.118 |
| vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.113 |
| type-token ratio, first 400 words `lex_ttr_first400` | +0.113 |
| Yule's K (repetition concentration) `lex_yule_k` | -0.111 |
| word entropy, normalised by vocabulary size `inf_word_entropy_norm` | +0.109 |
| 'of' per 1,000 words `lex_of_rate` | -0.109 |
| share of vocabulary used exactly once `lex_hapax_rate` | +0.099 |
| function-word rate `lex_function_word_rate` | -0.091 |
| share of text in its 50 commonest words `lex_top_content_share` | +0.089 |
| n_words `n_words` | -0.082 |
| mean paragraph length `rhy_mean_para_words` | -0.082 |
| syn_max_sent_len `syn_max_sent_len` | -0.082 |
| mean sentence length `syn_mean_sent_len` | -0.082 |
| syn_min_sent_len `syn_min_sent_len` | -0.082 |
| gzip compression ratio, letters only `inf_compress_ratio_alpha` | +0.078 |
| 'and' per 1,000 words `lex_and_rate` | -0.077 |
| pun_serial_comma_rate `pun_serial_comma_rate` | -0.074 |
| gzip compression ratio, words only `inf_compress_ratio_words` | +0.074 |
| gzip compression ratio `inf_compress_ratio` | +0.073 |

# What the deployed score co-varies with — across both sides

n = 4,977. Spearman ρ between the model's raw margin and each interpretable feature. Correlation is not mechanism: these features are correlated with each other, and the across-sides figures partly restate that both track the label.

| signal | ρ |
|---|---:|
| vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.434 |
| type-token ratio, first 400 words `lex_ttr_first400` | +0.412 |
| any markdown present `fmt_any_markdown` | +0.404 |
| words of 3 letters or fewer `lex_short_word_rate` | -0.375 |
| content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | -0.349 |
| markdown headings per line `fmt_md_heading_rate` | +0.343 |
| distinct word triples / word triples `lex_distinct3` | +0.339 |
| repeated word-triple rate `lex_repeat_trigram_rate` | -0.339 |
| mean word length `lex_mean_word_len` | +0.337 |
| '*' per 1,000 characters `pun_asterisk_per1kc` | +0.323 |
| markdown bold spans per 1,000 words `fmt_md_bold_rate` | +0.317 |
| word-unigram entropy `inf_word_entropy` | +0.317 |
| capitalised non-initial words (proper nouns, approx) `lex_propernoun_approx_rate` | -0.292 |
| distinct word pairs / word pairs `lex_distinct2` | +0.292 |
| share of text in its 50 commonest words `lex_top_content_share` | -0.281 |
| words of 8 letters or more `lex_long_word_rate` | +0.270 |
| 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | +0.268 |
| paragraph count `rhy_n_paragraphs` | +0.260 |
| Yule's K (repetition concentration) `lex_yule_k` | -0.239 |
| discourse markers per 1,000 words `lex_discourse_marker_rate` | +0.238 |

# What the deployed score co-varies with — within AI documents only

n = 793. Spearman ρ between the model's raw margin and each interpretable feature. Correlation is not mechanism: these features are correlated with each other, and the across-sides figures partly restate that both track the label.

| signal | ρ |
|---|---:|
| any markdown present `fmt_any_markdown` | +0.534 |
| vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.514 |
| Yule's K (repetition concentration) `lex_yule_k` | -0.494 |
| markdown headings per line `fmt_md_heading_rate` | +0.488 |
| '#' per 1,000 characters `pun_hash_per1kc` | +0.487 |
| surprisal change between adjacent words `inf_uid_masd` | -0.475 |
| distinct word pairs / word pairs `lex_distinct2` | +0.439 |
| type-token ratio, first 400 words `lex_ttr_first400` | +0.439 |
| word-unigram entropy `inf_word_entropy` | +0.420 |
| words of 3 letters or fewer `lex_short_word_rate` | -0.403 |
| word entropy, normalised by vocabulary size `inf_word_entropy_norm` | +0.398 |
| word surprisal spread `inf_surprisal_sd` | -0.383 |
| third person per 1,000 words `lex_3p_rate` | -0.375 |
| function-word rate `lex_function_word_rate` | -0.374 |
| 'the' per 1,000 words `lex_the_rate` | -0.371 |
| content-word overlap between paragraphs `dis_para_jaccard_mean` | -0.370 |
| mean word length `lex_mean_word_len` | +0.340 |
| word-pair surprisal spread `inf_bigram_surprisal_sd` | -0.329 |
| mean word-pair surprisal `inf_bigram_surprisal_mean` | +0.322 |
| distinct word triples / word triples `lex_distinct3` | +0.315 |

# What the deployed score co-varies with — within human documents only

n = 4,184. Spearman ρ between the model's raw margin and each interpretable feature. Correlation is not mechanism: these features are correlated with each other, and the across-sides figures partly restate that both track the label.

| signal | ρ |
|---|---:|
| discourse markers per 1,000 words `lex_discourse_marker_rate` | +0.368 |
| words of 3 letters or fewer `lex_short_word_rate` | -0.362 |
| mean word length `lex_mean_word_len` | +0.359 |
| words of 8 letters or more `lex_long_word_rate` | +0.300 |
| sentence-length coefficient of variation `syn_cv_sent_len` | -0.264 |
| burstiness of sentence lengths `rhy_burstiness` | -0.264 |
| mean successive sentence-length change `rhy_masd_norm` | -0.257 |
| first-person singular per 1,000 words `lex_1sg_rate` | -0.246 |
| 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | +0.241 |
| capitalised non-initial words (proper nouns, approx) `lex_propernoun_approx_rate` | -0.231 |
| second person per 1,000 words `lex_2p_rate` | -0.218 |
| straight apostrophes per 1,000 characters `pun_straight_apos_per1kc` | -0.217 |
| sentence-length standard deviation `syn_sd_sent_len` | -0.203 |
| sentence-length range `syn_range_sent_len` | -0.200 |
| URLs per 1,000 words `fmt_url_rate` | -0.199 |
| content-word overlap between paragraphs `dis_para_jaccard_mean` | +0.197 |
| contractions per 1,000 words `lex_contraction_rate` | -0.192 |
| vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | +0.187 |
| lex_cliche_any `lex_cliche_any` | +0.181 |
| hedges per 1,000 words `lex_hedge_rate` | +0.180 |

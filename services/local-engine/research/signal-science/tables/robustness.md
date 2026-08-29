# Robustness: does the signal survive every source?

Each human source is compared against only the AI documents sharing its register families, and vice versa. Oriented AUROC, so 0.5 is useless. Sources with fewer than 60 documents are omitted.

## Per signal, across all pairings

| signal | median AUROC | worst AUROC | worst pairing | pairings above 0.65 |
|---|---:|---:|---|---:|
| vocabulary variety in a 100-word window (MATTR) `lex_mattr_100` | 0.791 | 0.562 | meta | 29/33 |
| content-word overlap between neighbouring sentences `dis_adjacent_sent_cohesion` | 0.777 | 0.561 | meta | 31/33 |
| Yule's K (repetition concentration) `lex_yule_k` | 0.700 | 0.530 | globalvoices | 23/33 |
| repeated word-triple rate `lex_repeat_trigram_rate` | 0.698 | 0.527 | hatbench-abstracts-v0 | 23/33 |
| distinct word triples / word triples `lex_distinct3` | 0.698 | 0.527 | hatbench-abstracts-v0 | 23/33 |
| any markdown present `fmt_any_markdown` | 0.667 | 0.519 | nvidia | 18/33 |
| em dashes per 1,000 words `pun_emdash_per1kw` | 0.637 | 0.501 | nvidia | 12/33 |
| burstiness of sentence lengths `rhy_burstiness` | 0.597 | 0.500 | openai | 11/33 |
| share of text in its 50 commonest words `lex_top_content_share` | 0.590 | 0.515 | allenai/c4 (en, C4 April-2019 Common Crawl snapshot, ODC-BY 1.0) | 13/33 |
| 'AI vocabulary' words per 1,000 `lex_cliche_word_rate` | 0.542 | 0.501 | internet-archive-cc-texts | 5/33 |

## Per human source

| source | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | repeated word-triple rate | distinct word triples / word triples | share of text in its 50 commonest words | Yule's K (repetition concentration) | em dashes per 1,000 words | any markdown present | 'AI vocabulary' words per 1,000 | burstiness of sentence lengths |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| allenai/c4 (en, C4 April-2019 Common Crawl snapshot, ODC-BY 1.0) | 3,094 | 0.779 | 0.766 | 0.715 | 0.715 | 0.515 | 0.661 | 0.597 | 0.667 | 0.542 | 0.539 |
| gradtex-human (MAGE) | 2,115 | 0.756 | 0.716 | 0.527 | 0.527 | 0.776 | 0.684 | 0.648 | 0.669 | 0.612 | 0.617 |
| c4-en-2019 | 1,785 | 0.824 | 0.730 | 0.663 | 0.663 | 0.697 | 0.730 | 0.644 | 0.701 | 0.582 | 0.541 |
| europepmc-oa | 1,275 | 0.828 | 0.868 | 0.832 | 0.832 | 0.540 | 0.787 | 0.625 | 0.617 | 0.516 | 0.599 |
| persuade-2.0 | 828 | 0.886 | 0.839 | 0.796 | 0.796 | 0.531 | 0.799 | 0.682 | 0.618 | 0.727 | 0.559 |
| gov.uk | 774 | 0.902 | 0.849 | 0.885 | 0.885 | 0.583 | 0.832 | 0.698 | 0.667 | 0.591 | 0.730 |
| sec-edgar-10k-mdna | 393 | 0.994 | 0.993 | 0.987 | 0.987 | 0.672 | 0.945 | 0.748 | 0.925 | 0.519 | 0.549 |
| globalvoices | 382 | 0.831 | 0.778 | 0.843 | 0.843 | 0.541 | 0.530 | 0.651 | 0.688 | 0.559 | 0.755 |
| crs-report | 376 | 0.794 | 0.583 | 0.808 | 0.808 | 0.552 | 0.691 | 0.561 | 0.635 | 0.667 | 0.856 |
| mongabay | 370 | 0.871 | 0.886 | 0.893 | 0.893 | 0.555 | 0.622 | 0.580 | 0.777 | 0.569 | 0.635 |
| individually verified web page | 324 | 0.782 | 0.808 | 0.751 | 0.751 | 0.553 | 0.616 | 0.550 | 0.673 | 0.531 | 0.532 |
| battery-human-corpus-v2 | 323 | 0.741 | 0.689 | 0.686 | 0.686 | 0.642 | 0.608 | 0.575 | 0.647 | 0.526 | 0.587 |
| maga-human | 311 | 0.694 | 0.709 | 0.591 | 0.591 | 0.746 | 0.621 | 0.583 | 0.548 | 0.550 | 0.533 |
| internet-archive-cc-texts | 237 | 0.668 | 0.804 | 0.720 | 0.720 | 0.518 | 0.775 | 0.572 | 0.579 | 0.501 | 0.674 |
| hatbench-reports-v0 | 180 | 0.759 | 0.702 | 0.605 | 0.605 | 0.705 | 0.711 | 0.649 | 0.635 | 0.638 | 0.591 |
| hatbench-essays-v0 | 76 | 0.894 | 0.836 | 0.813 | 0.813 | 0.590 | 0.808 | 0.682 | 0.618 | 0.705 | 0.537 |
| hatbench-abstracts-v0 | 71 | 0.780 | 0.765 | 0.527 | 0.527 | 0.826 | 0.711 | 0.682 | 0.618 | 0.532 | 0.519 |
| hatbench-news-v0 | 62 | 0.785 | 0.695 | 0.611 | 0.611 | 0.591 | 0.683 | 0.651 | 0.695 | 0.626 | 0.536 |

## Per AI provider

| source | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | repeated word-triple rate | distinct word triples / word triples | share of text in its 50 commonest words | Yule's K (repetition concentration) | em dashes per 1,000 words | any markdown present | 'AI vocabulary' words per 1,000 | burstiness of sentence lengths |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| openai | 2,100 | 0.770 | 0.721 | 0.668 | 0.668 | 0.523 | 0.707 | 0.547 | 0.703 | 0.524 | 0.500 |
| google | 1,845 | 0.842 | 0.798 | 0.779 | 0.779 | 0.572 | 0.680 | 0.578 | 0.634 | 0.635 | 0.579 |
| anthropic | 1,297 | 0.884 | 0.810 | 0.776 | 0.776 | 0.558 | 0.827 | 0.714 | 0.851 | 0.517 | 0.652 |
| alibaba | 853 | 0.675 | 0.708 | 0.678 | 0.678 | 0.517 | 0.575 | 0.536 | 0.606 | 0.576 | 0.519 |
| deepseek | 587 | 0.712 | 0.777 | 0.635 | 0.635 | 0.709 | 0.601 | 0.637 | 0.783 | 0.531 | 0.693 |
| mistral | 475 | 0.813 | 0.772 | 0.691 | 0.691 | 0.568 | 0.700 | 0.674 | 0.735 | 0.590 | 0.503 |
| xai | 335 | 0.912 | 0.900 | 0.782 | 0.782 | 0.751 | 0.738 | 0.640 | 0.547 | 0.520 | 0.609 |
| qwen | 324 | 0.910 | 0.838 | 0.726 | 0.726 | 0.767 | 0.809 | 0.827 | 0.866 | 0.517 | 0.723 |
| meta | 320 | 0.562 | 0.561 | 0.663 | 0.663 | 0.545 | 0.554 | 0.571 | 0.642 | 0.775 | 0.632 |
| moonshot | 310 | 0.821 | 0.762 | 0.698 | 0.698 | 0.597 | 0.765 | 0.715 | 0.865 | 0.521 | 0.732 |
| zhipu | 260 | 0.636 | 0.719 | 0.612 | 0.612 | 0.561 | 0.616 | 0.529 | 0.705 | 0.536 | 0.820 |
| zai | 252 | 0.941 | 0.857 | 0.772 | 0.772 | 0.770 | 0.844 | 0.889 | 0.921 | 0.526 | 0.766 |
| nvidia | 148 | 0.633 | 0.694 | 0.589 | 0.589 | 0.715 | 0.742 | 0.501 | 0.519 | 0.528 | 0.520 |
| grok | 145 | 0.615 | 0.817 | 0.611 | 0.611 | 0.766 | 0.635 | 0.533 | 0.533 | 0.517 | 0.597 |
| other | 82 | 0.791 | 0.779 | 0.543 | 0.543 | 0.713 | 0.687 | 0.523 | 0.912 | 0.862 | 0.759 |

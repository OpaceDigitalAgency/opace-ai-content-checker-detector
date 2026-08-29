# Top signals by provider, prompt style, model tier and era

Oriented AUROC. Each AI group is compared against the same full human pool, so the columns are comparable with each other. The era rows are the weakest of these breakdowns: different eras were sampled from different sources with different register mixes, so an era difference is partly a source difference and should not be read as drift.

## Prompt style

| group | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | word-pair surprisal spread | type-token ratio, first 400 words | words of 3 letters or fewer | repeated word-triple rate | distinct word triples / word triples | Yule's K (repetition concentration) | function-word rate | 'to' per 1,000 words | share of vocabulary used exactly once | distinct word pairs / word pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| human-voice | 1,455 | 0.916 | 0.879 | 0.725 | 0.793 | 0.673 | 0.770 | 0.770 | 0.800 | 0.578 | 0.766 | 0.653 | 0.705 |
| house-brief | 1,421 | 0.921 | 0.789 | 0.848 | 0.775 | 0.808 | 0.703 | 0.703 | 0.840 | 0.828 | 0.774 | 0.610 | 0.673 |
| plain | 1,365 | 0.904 | 0.791 | 0.860 | 0.759 | 0.844 | 0.664 | 0.664 | 0.823 | 0.803 | 0.708 | 0.592 | 0.633 |

## Model tier

| group | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | word-pair surprisal spread | type-token ratio, first 400 words | words of 3 letters or fewer | repeated word-triple rate | distinct word triples / word triples | Yule's K (repetition concentration) | function-word rate | 'to' per 1,000 words | share of vocabulary used exactly once | distinct word pairs / word pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| standard | 2,133 | 0.928 | 0.840 | 0.787 | 0.790 | 0.753 | 0.726 | 0.726 | 0.831 | 0.713 | 0.794 | 0.621 | 0.676 |
| flash-or-mini | 1,147 | 0.859 | 0.752 | 0.843 | 0.721 | 0.811 | 0.636 | 0.636 | 0.770 | 0.777 | 0.647 | 0.576 | 0.605 |
| pro-flagship | 961 | 0.947 | 0.859 | 0.820 | 0.813 | 0.775 | 0.777 | 0.777 | 0.857 | 0.730 | 0.775 | 0.665 | 0.740 |

## Provider

| group | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | word-pair surprisal spread | type-token ratio, first 400 words | words of 3 letters or fewer | repeated word-triple rate | distinct word triples / word triples | Yule's K (repetition concentration) | function-word rate | 'to' per 1,000 words | share of vocabulary used exactly once | distinct word pairs / word pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| openai | 2,100 | 0.769 | 0.720 | 0.773 | 0.681 | 0.699 | 0.667 | 0.667 | 0.706 | 0.680 | 0.685 | 0.579 | 0.650 |
| google | 1,845 | 0.842 | 0.797 | 0.719 | 0.820 | 0.703 | 0.778 | 0.778 | 0.679 | 0.664 | 0.636 | 0.801 | 0.783 |
| anthropic | 1,297 | 0.884 | 0.809 | 0.820 | 0.813 | 0.787 | 0.776 | 0.776 | 0.827 | 0.738 | 0.789 | 0.708 | 0.774 |
| alibaba | 853 | 0.683 | 0.715 | 0.738 | 0.656 | 0.598 | 0.689 | 0.689 | 0.581 | 0.606 | 0.670 | 0.697 | 0.690 |
| deepseek | 587 | 0.712 | 0.776 | 0.723 | 0.627 | 0.523 | 0.634 | 0.634 | 0.601 | 0.509 | 0.780 | 0.550 | 0.563 |
| mistral | 475 | 0.813 | 0.771 | 0.765 | 0.759 | 0.648 | 0.690 | 0.690 | 0.699 | 0.707 | 0.690 | 0.716 | 0.697 |
| xai | 335 | 0.914 | 0.900 | 0.684 | 0.785 | 0.628 | 0.777 | 0.777 | 0.745 | 0.634 | 0.883 | 0.685 | 0.708 |
| qwen | 324 | 0.913 | 0.838 | 0.770 | 0.793 | 0.763 | 0.720 | 0.720 | 0.815 | 0.638 | 0.792 | 0.655 | 0.675 |
| meta | 320 | 0.560 | 0.559 | 0.755 | 0.583 | 0.675 | 0.665 | 0.665 | 0.555 | 0.623 | 0.569 | 0.557 | 0.649 |
| moonshot | 310 | 0.823 | 0.762 | 0.816 | 0.718 | 0.701 | 0.693 | 0.693 | 0.771 | 0.736 | 0.813 | 0.594 | 0.668 |
| zhipu | 260 | 0.642 | 0.734 | 0.861 | 0.501 | 0.655 | 0.645 | 0.645 | 0.635 | 0.570 | 0.833 | 0.501 | 0.622 |
| zai | 252 | 0.943 | 0.857 | 0.812 | 0.801 | 0.784 | 0.767 | 0.767 | 0.849 | 0.706 | 0.846 | 0.629 | 0.718 |
| nvidia | 148 | 0.566 | 0.813 | 0.832 | 0.591 | 0.943 | 0.615 | 0.615 | 0.656 | 0.914 | 0.653 | 0.562 | 0.564 |
| grok | 145 | 0.675 | 0.889 | 0.758 | 0.531 | 0.867 | 0.775 | 0.775 | 0.535 | 0.849 | 0.797 | 0.608 | 0.718 |
| other | 82 | 0.696 | 0.748 | 0.706 | 0.609 | 0.757 | 0.525 | 0.525 | 0.538 | 0.774 | 0.741 | 0.722 | 0.533 |

## Era

| group | n | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | word-pair surprisal spread | type-token ratio, first 400 words | words of 3 letters or fewer | repeated word-triple rate | distinct word triples / word triples | Yule's K (repetition concentration) | function-word rate | 'to' per 1,000 words | share of vocabulary used exactly once | distinct word pairs / word pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-generated | 4,241 | 0.914 | 0.821 | 0.809 | 0.776 | 0.774 | 0.713 | 0.713 | 0.821 | 0.734 | 0.750 | 0.619 | 0.671 |
| 2026-frontier | 1,748 | 0.684 | 0.686 | 0.647 | 0.743 | 0.598 | 0.729 | 0.729 | 0.586 | 0.531 | 0.599 | 0.752 | 0.761 |
| 2026-mid | 942 | 0.919 | 0.901 | 0.755 | 0.905 | 0.831 | 0.871 | 0.871 | 0.680 | 0.753 | 0.698 | 0.904 | 0.887 |
| 2026-current | 911 | 0.564 | 0.856 | 0.800 | 0.529 | 0.936 | 0.739 | 0.739 | 0.538 | 0.934 | 0.704 | 0.603 | 0.671 |
| 2025-26-late | 865 | 0.557 | 0.516 | 0.854 | 0.539 | 0.623 | 0.561 | 0.561 | 0.606 | 0.889 | 0.852 | 0.590 | 0.554 |
| 2025-2026 | 398 | 0.704 | 0.620 | 0.633 | 0.671 | 0.713 | 0.644 | 0.644 | 0.615 | 0.649 | 0.553 | 0.711 | 0.687 |
| 2024-2025-older | 250 | 0.643 | 0.713 | 0.639 | 0.565 | 0.706 | 0.512 | 0.512 | 0.555 | 0.774 | 0.749 | 0.706 | 0.515 |


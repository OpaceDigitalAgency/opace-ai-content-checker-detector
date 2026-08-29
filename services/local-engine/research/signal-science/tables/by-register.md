# Top signals by register family

AUROC, oriented so 0.5 is useless and 1.0 is perfect. Each register compares that register's AI documents against that register's human documents only.

| register | n AI | n human | vocabulary variety in a 100-word window (MATTR) | content-word overlap between neighbouring sentences | word-pair surprisal spread | type-token ratio, first 400 words | words of 3 letters or fewer | repeated word-triple rate | distinct word triples / word triples | Yule's K (repetition concentration) | function-word rate | 'to' per 1,000 words | share of vocabulary used exactly once | distinct word pairs / word pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| academic | 1,548 | 3,470 | 0.838 | 0.820 | 0.747 | 0.838 | 0.773 | 0.769 | 0.769 | 0.771 | 0.703 | 0.684 | 0.749 | 0.770 |
| blog | 1,774 | 1,904 | 0.815 | 0.721 | 0.754 | 0.649 | 0.811 | 0.615 | 0.615 | 0.669 | 0.736 | 0.660 | 0.572 | 0.592 |
| corporate | 435 | 614 | 0.990 | 0.974 | 0.734 | 0.969 | 0.828 | 0.957 | 0.957 | 0.939 | 0.661 | 0.767 | 0.938 | 0.963 |
| creative | 222 | 237 | 0.668 | 0.804 | 0.532 | 0.761 | 0.594 | 0.720 | 0.720 | 0.775 | 0.538 | 0.761 | 0.666 | 0.606 |
| journalism | 622 | 1,217 | 0.855 | 0.834 | 0.729 | 0.816 | 0.730 | 0.801 | 0.801 | 0.587 | 0.650 | 0.636 | 0.679 | 0.766 |
| marketing | 1,155 | 2,658 | 0.871 | 0.731 | 0.785 | 0.720 | 0.731 | 0.653 | 0.653 | 0.797 | 0.712 | 0.759 | 0.529 | 0.615 |
| reference | 395 | 998 | 0.733 | 0.721 | 0.717 | 0.653 | 0.762 | 0.564 | 0.564 | 0.578 | 0.783 | 0.682 | 0.704 | 0.595 |
| report | 259 | 954 | 0.789 | 0.590 | 0.742 | 0.760 | 0.795 | 0.751 | 0.751 | 0.711 | 0.674 | 0.619 | 0.746 | 0.777 |
| social | 1,857 | 1,010 | 0.658 | 0.782 | 0.804 | 0.521 | 0.579 | 0.659 | 0.659 | 0.540 | 0.537 | 0.692 | 0.641 | 0.598 |

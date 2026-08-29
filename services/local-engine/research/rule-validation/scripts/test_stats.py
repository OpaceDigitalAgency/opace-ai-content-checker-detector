"""Sanity checks for scripts/stats.py against known values."""
from stats import fisher_exact_two_sided, wilson, benjamini_hochberg
# Fisher's tea-tasting lady, [[3,1],[1,3]] -> two-sided p = 0.4857142857
p = fisher_exact_two_sided(3, 1, 1, 3)
assert abs(p - 0.4857142857) < 1e-9, p
# [[1,9],[11,3]] -> two-sided p = 0.0027594...
p = fisher_exact_two_sided(1, 9, 11, 3)
assert abs(p - 0.002759456) < 1e-8, p
# Independent table -> p = 1
assert abs(fisher_exact_two_sided(10, 10, 10, 10) - 1.0) < 1e-12
# Wilson 95% for 0/169 upper bound ~ 0.0223
lo, hi = wilson(0, 169)
assert lo == 0.0 and abs(hi - 0.02226) < 1e-4, (lo, hi)
# BH monotone
q = benjamini_hochberg([0.01, 0.02, 0.03, 0.9])
assert q == sorted(q), q
print("stats self-tests passed")

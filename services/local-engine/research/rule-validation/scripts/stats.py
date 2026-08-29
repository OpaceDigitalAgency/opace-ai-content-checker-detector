"""Dependency-free statistics helpers: exact Fisher, Wilson, BH, risk ratio CI.

No scipy in this environment, so Fisher's exact test is implemented directly
from the hypergeometric distribution with exact integer arithmetic
(math.comb), summing every table at most as probable as the observed one.
Cross-checked against published worked examples in tests/test_stats.py.
"""
import math
from fractions import Fraction

def fisher_exact_two_sided(a, b, c, d):
    """2x2 table [[a,b],[c,d]] -> two-sided p-value (exact, integer arithmetic)."""
    n = a + b + c + d
    r1, r2 = a + b, c + d
    c1 = a + c
    total = math.comb(n, c1)
    def prob(x):
        return math.comb(r1, x) * math.comb(r2, c1 - x)
    lo = max(0, c1 - r2)
    hi = min(r1, c1)
    obs = prob(a)
    # exact integer comparison — these binomials overflow float for n ~ 1900
    num = sum(prob(x) for x in range(lo, hi + 1) if prob(x) <= obs)
    return min(1.0, float(Fraction(num, total)))

def wilson(k, n, z=1.959963984540054):
    """Wilson score interval for a proportion."""
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, centre - half), min(1.0, centre + half))

def risk_ratio_ci(a, n1, c, n2, z=1.959963984540054):
    """Risk ratio (a/n1)/(c/n2) with Haldane 0.5 correction and a 95% CI.
    Used here as the likelihood ratio P(fire|AI)/P(fire|human)."""
    A, C = a + 0.5, c + 0.5
    N1, N2 = n1 + 1.0, n2 + 1.0
    rr = (A / N1) / (C / N2)
    se = math.sqrt(1 / A - 1 / N1 + 1 / C - 1 / N2)
    return rr, rr * math.exp(-z * se), rr * math.exp(z * se)

def benjamini_hochberg(pvals):
    """Return BH-adjusted q-values, same order as input."""
    m = len(pvals)
    order = sorted(range(m), key=lambda i: pvals[i])
    q = [0.0] * m
    prev = 1.0
    for rank in range(m - 1, -1, -1):
        i = order[rank]
        val = min(prev, pvals[i] * m / (rank + 1))
        q[i] = val
        prev = val
    return q

"""Honest small samples: uncertainty ranges and sample-adjusted estimates.

- Wilson score interval [Wilson]: the 95% range for a makes-over-attempts
  percentage. Unlike the textbook "p +/- 1.96 standard errors" it stays
  inside 0-100% and behaves well for small samples and extreme rates
  [Agresti-Coull].
- Empirical-Bayes shrinkage [EB]: each player's true rate is treated as a
  draw from a league-wide Beta distribution, fitted by maximum likelihood to
  every qualified player's makes and attempts (a beta-binomial model). A
  player's best estimate is (makes + a) / (attempts + a + b): he starts with
  a + b attempts of league-average shooting, so small samples are pulled
  strongly toward the league rate and large ones barely move.

Sources
- [Wilson] E. B. Wilson, "Probable inference, the law of succession, and
  statistical inference", JASA 22 (1927).
- [Agresti-Coull] A. Agresti and B. Coull, "Approximate is better than
  'exact' for interval estimation of binomial proportions", The American
  Statistician 52 (1998).
- [EB] B. Efron and C. Morris, "Data analysis using Stein's estimator and its
  generalizations", JASA 70 (1975); the beta-binomial form as in D. Robinson,
  "Introduction to Empirical Bayes" (2017).
- [NR] W. Press et al., "Numerical Recipes", 3rd ed. (2007), section 6.4:
  the incomplete beta function behind the posterior intervals.

When a stat has a sample-adjusted estimate, its range is the matching
posterior interval, so the estimate always sits inside its range. Without
one (3P% early in a season) the range is the Wilson interval.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

Z95 = 1.959964  # two-sided 95% normal quantile

# Bounds for the fitted prior strength (a + b, in attempts). Early in a season
# the data may not separate shooters from noise yet; the likelihood then keeps
# rising toward ever stronger priors, and the upper bound stops it there.
MIN_STRENGTH = 2.0
MAX_STRENGTH = 2000.0


def wilson(makes: int, attempts: int, z: float = Z95) -> tuple[float, float] | None:
    """95% Wilson score interval for makes / attempts, in percent."""
    if attempts <= 0:
        return None
    n = attempts
    p = makes / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return max(0.0, 100 * (center - half)), min(100.0, 100 * (center + half))


@dataclass(frozen=True)
class BetaPrior:
    """League-wide distribution of true rates: mean (0-1) and strength
    (a + b, in equivalent attempts)."""

    mean: float
    strength: float

    @property
    def a(self) -> float:
        return self.mean * self.strength

    @property
    def b(self) -> float:
        return (1 - self.mean) * self.strength


def _log_beta(a: float, b: float) -> float:
    return math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)


def _log_likelihood(pairs: list[tuple[int, int]], mean: float, strength: float) -> float:
    a, b = mean * strength, (1 - mean) * strength
    base = _log_beta(a, b)
    return sum(_log_beta(k + a, n - k + b) - base for k, n in pairs)


def fit_beta_binomial(pairs: list[tuple[int, int]]) -> BetaPrior | None:
    """Maximum-likelihood beta-binomial prior over (makes, attempts) pairs.
    A coarse grid over the mean and log-strength, refined twice around the
    best point. None if there is no data."""
    pairs = [(k, n) for k, n in pairs if n > 0]
    if not pairs:
        return None
    pooled = sum(k for k, _ in pairs) / sum(n for _, n in pairs)
    if pooled <= 0 or pooled >= 1:
        return BetaPrior(pooled, MAX_STRENGTH)

    lo_m, hi_m = max(0.001, pooled - 0.15), min(0.999, pooled + 0.15)
    lo_s, hi_s = math.log(MIN_STRENGTH), math.log(MAX_STRENGTH)
    best = (pooled, MAX_STRENGTH)
    for steps in (24, 12, 12):
        candidates = (
            (lo_m + (hi_m - lo_m) * i / steps, math.exp(lo_s + (hi_s - lo_s) * j / steps))
            for i in range(steps + 1) for j in range(steps + 1)
        )
        best = max(candidates, key=lambda c: _log_likelihood(pairs, c[0], c[1]))
        # Zoom in around the best point for the next round.
        dm, ds = 2 * (hi_m - lo_m) / steps, 2 * (hi_s - lo_s) / steps
        lo_m, hi_m = max(0.001, best[0] - dm), min(0.999, best[0] + dm)
        log_best = math.log(best[1])
        lo_s, hi_s = max(math.log(MIN_STRENGTH), log_best - ds), min(math.log(MAX_STRENGTH), log_best + ds)
    return BetaPrior(*best)


def _beta_continued_fraction(a: float, b: float, x: float) -> float:
    """Continued fraction for the regularized incomplete beta function, by
    the modified Lentz method [NR, section 6.4]."""
    tiny, eps = 1e-300, 3e-14
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        for aa in (m * (b - m) * x / ((qam + m2) * (a + m2)),
                   -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))):
            d = 1 + aa * d
            d = 1 / (d if abs(d) > tiny else tiny)
            c = 1 + aa / c
            c = c if abs(c) > tiny else tiny
            h *= d * c
        if abs(d * c - 1) < eps:
            break
    return h


def beta_cdf(x: float, a: float, b: float) -> float:
    """P(X <= x) for X ~ Beta(a, b) [NR, section 6.4]."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    front = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
                     + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return front * _beta_continued_fraction(a, b, x) / a
    return 1 - front * _beta_continued_fraction(b, a, 1 - x) / b


def beta_quantile(p: float, a: float, b: float) -> float:
    """The x with P(X <= x) = p for X ~ Beta(a, b), by bisection."""
    lo, hi = 0.0, 1.0
    for _ in range(60):  # halves the bracket to about 1e-18
        mid = (lo + hi) / 2
        if beta_cdf(mid, a, b) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def posterior_interval(makes: int, attempts: int, prior: BetaPrior,
                       level: float = 0.95) -> tuple[float, float]:
    """Central interval of the posterior Beta(makes + a, misses + b), in
    percent: the range his true rate probably falls in, consistent with the
    sample-adjusted estimate (the posterior mean)."""
    a, b = makes + prior.a, attempts - makes + prior.b
    tail = (1 - level) / 2
    return 100 * beta_quantile(tail, a, b), 100 * beta_quantile(1 - tail, a, b)


def separates_shooters(prior: BetaPrior) -> bool:
    """False when the fit sits at the strength ceiling: the season's data
    cannot yet tell good shooters from lucky ones, so an estimate would just
    repeat the league average for everyone."""
    return prior.strength < 0.95 * MAX_STRENGTH


def shrink(makes: int, attempts: int, prior: BetaPrior) -> float:
    """Sample-adjusted estimate of a player's true rate, in percent."""
    return 100 * (makes + prior.a) / (attempts + prior.strength)

import random

import pytest

from hoops_pipeline.aggregate import mark_qualified
from hoops_pipeline.publish import build_player_records, doc_extras, fit_shrinkage
from hoops_pipeline.samples import (
    BetaPrior,
    beta_cdf,
    beta_quantile,
    fit_beta_binomial,
    posterior_interval,
    separates_shooters,
    shrink,
    wilson,
)


def test_wilson_matches_reference_values():
    # Reference values: R's binom::binom.wilson, 95%.
    lo, hi = wilson(5, 10)
    assert (lo, hi) == (pytest.approx(23.659, abs=0.01), pytest.approx(76.341, abs=0.01))
    lo, hi = wilson(0, 10)
    assert lo == pytest.approx(0) and hi == pytest.approx(27.753, abs=0.01)
    lo, hi = wilson(10, 10)
    assert lo == pytest.approx(72.247, abs=0.01) and hi == pytest.approx(100)
    assert wilson(0, 0) is None


def test_wilson_narrows_with_more_attempts():
    small = wilson(7, 12)
    large = wilson(350, 1000)
    assert small[1] - small[0] > 45  # 7 of 12: anywhere from about 32% to 81%
    assert large[1] - large[0] < 6
    assert large[0] < 35 < large[1]


def test_beta_binomial_fit_recovers_known_league():
    # 400 simulated shooters whose true rates come from a known league
    # distribution (mean 36%, strength 150 attempts).
    rng = random.Random(7)
    truth = BetaPrior(0.36, 150)
    pairs = []
    for _ in range(400):
        p = rng.betavariate(truth.a, truth.b)
        n = rng.randint(30, 400)
        pairs.append((sum(rng.random() < p for _ in range(n)), n))
    fit = fit_beta_binomial(pairs)
    assert fit.mean == pytest.approx(0.36, abs=0.01)
    assert 150 / 1.4 < fit.strength < 150 * 1.4


def test_fit_has_a_ceiling_when_shooters_are_indistinguishable(make_line):
    # Everyone shoots exactly the league rate: no spread beyond chance.
    pairs = [(18, 50)] * 200
    fit = fit_beta_binomial(pairs)
    assert fit.mean == pytest.approx(0.36, abs=0.005)
    assert not separates_shooters(fit)
    assert fit_beta_binomial([]) is None
    # Then no estimates are published for that stat.
    lines = [make_line(pid, gp=10, fg3m=18, fg3a=50) for pid in range(1, 41)]
    mark_qualified(lines)
    assert "fg3_pct" not in fit_shrinkage(lines)
    records, _ = build_player_records(lines)
    assert "fg3_pct" not in records[0].get("adj", {})
    assert records[0]["ci"]["fg3_pct"] == [24, 50]  # 18 of 50: Wilson 24.1-49.9%, still shown


def test_shrinkage_pulls_small_samples_hardest():
    prior = BetaPrior(0.35, 200)
    assert shrink(7, 12, prior) == pytest.approx(100 * (7 + 70) / 212)  # 58% on 12 -> about 36%
    big = shrink(400, 1000, prior)
    assert 39 < big < 40  # 40% on 1000 barely moves
    assert shrink(0, 0, prior) == pytest.approx(35.0)


def test_records_carry_ranges_estimates_and_position_percentiles(make_line):
    lines = [make_line(pid, gp=10, fg3m=pid, fg3a=40) for pid in range(1, 31)]
    for ln in lines:
        ln.position = "C" if ln.pid > 24 else "G"
    lines[0].totals.update(fg3m=2, fg3a=2)  # 2 for 2: tiny sample
    mark_qualified(lines)
    priors = fit_shrinkage(lines)
    records, pool_size = build_player_records(lines, None, priors)
    by_id = {r["id"]: r for r in records}

    tiny = by_id[1]
    # 2 for 2 with a best estimate: the range is the matching posterior
    # interval (not the data-only 34-100%), so the estimate sits inside it.
    lo, hi = tiny["ci"]["fg3_pct"]
    assert lo < tiny["adj"]["fg3_pct"] < hi < 100
    assert "fg3_pct" not in tiny["pct"]  # still below the attempt minimum

    center = by_id[30]
    assert center["rankPos"]["fg3m"] == 1  # best of the 6 centers in threes made
    assert center["rank"]["fg3m"] == 1
    assert by_id[24]["rankPos"]["fg3m"] == 1  # best guard, though 7th overall
    assert by_id[24]["rank"]["fg3m"] == 7

    extras = doc_extras(records, priors)
    assert extras["poolSizePos"]["C"]["pts"] == 6 and extras["poolSizePos"]["G"]["pts"] == 24
    assert extras["poolSizePos"]["F"]["pts"] == 0
    assert extras["medians"]["all"]["pts"] == 14.0
    assert extras["shrinkage"]["fg3_pct"]["strength"] > 0


def test_beta_quantile_matches_closed_forms():
    # Beta(1, 1) is uniform; Beta(a, 1) has CDF x^a; Beta(1, b) has CDF 1 - (1 - x)^b.
    for p in (0.025, 0.5, 0.975):
        assert beta_quantile(p, 1, 1) == pytest.approx(p, abs=1e-9)
        assert beta_quantile(p, 3, 1) == pytest.approx(p ** (1 / 3), abs=1e-9)
        assert beta_quantile(p, 1, 4) == pytest.approx(1 - (1 - p) ** (1 / 4), abs=1e-9)
    assert beta_cdf(0.3, 2.5, 7) == pytest.approx(beta_cdf(0.3, 2.5, 7), abs=0)  # deterministic
    for a, b, x in ((75.6, 8.4, 0.9), (2.5, 7, 0.3), (40, 60, 0.41)):
        assert beta_cdf(beta_quantile(beta_cdf(x, a, b), a, b), a, b) == pytest.approx(beta_cdf(x, a, b), abs=1e-9)
    # Symmetry: Beta(a, b) at x mirrors Beta(b, a) at 1 - x.
    assert beta_cdf(0.3, 2.5, 7) == pytest.approx(1 - beta_cdf(0.7, 7, 2.5), abs=1e-12)


def test_estimate_always_sits_inside_its_range():
    prior = BetaPrior(0.768, 32)  # the league's free throws, early season
    for makes, tries in ((51, 52), (18, 41), (0, 3), (7, 12), (400, 450)):
        lo, hi = posterior_interval(makes, tries, prior)
        assert lo < shrink(makes, tries, prior) < hi
    # 51 of 52: the data-only range starts at 90%, but the league's typical
    # shooter pulls the best estimate to 90% and its range down with it.
    lo, hi = posterior_interval(51, 52, prior)
    assert 80 < lo < 86 and 94 < hi < 98

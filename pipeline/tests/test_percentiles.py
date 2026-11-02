import pytest

from hoops_pipeline.percentiles import compute_percentiles, mid_rank_percentile, rank_desc


def test_mid_rank_counts_ties_as_half():
    pool = [1, 2, 2, 3]
    assert mid_rank_percentile(1, pool) == pytest.approx(12.5)
    assert mid_rank_percentile(2, pool) == pytest.approx(50.0)
    assert mid_rank_percentile(3, pool) == pytest.approx(87.5)


def test_empirical_not_normal():
    # A skewed pool: one star far above everyone else.
    pool = sorted([1.0] * 9 + [40.0])
    assert mid_rank_percentile(40.0, pool) == pytest.approx(95.0)
    assert mid_rank_percentile(1.0, pool) == pytest.approx(45.0)


def test_rank_desc_shares_best_rank_on_ties():
    pool = [1, 2, 2, 3]
    assert rank_desc(3, pool) == 1
    assert rank_desc(2, pool) == 2
    assert rank_desc(1, pool) == 4


def test_only_qualified_and_non_null_values_count():
    stats = {
        1: {"pts": 10.0, "fg3_pct": None},
        2: {"pts": 20.0, "fg3_pct": 40.0},
        3: {"pts": 99.0, "fg3_pct": 50.0},  # not qualified
    }
    pct, rank, size = compute_percentiles(stats, {1, 2}, ["pts", "fg3_pct"])
    assert size == {"pts": 2, "fg3_pct": 1}
    assert pct[2]["pts"] == 75.0 and rank[2]["pts"] == 1
    assert "fg3_pct" not in pct[1]
    assert 3 not in pct

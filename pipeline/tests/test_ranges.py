"""Ranges for counts, points, efficiency and team shares (samples.py models,
metrics.compute_ranges inputs)."""

import math

import pytest

from hoops_pipeline.aggregate import mark_qualified
from hoops_pipeline.metrics import compute_ranges, compute_stats
from hoops_pipeline.publish import build_player_records, fit_shrinkage, v1_records
from hoops_pipeline.samples import made_points_variance, poisson_interval, points_sd
from hoops_pipeline.teamstats import Context

# A typical team game (per-game totals) and its opponent.
OWN = dict(pts=115, fgm=42, fga=89, fg3m=13, fg3a=36, ftm=18, fta=23, oreb=11, dreb=33, reb=44,
           ast=26, stl=8, blk=5, tov=14, pf=19)
OPP = dict(pts=112, fgm=41, fga=88, fg3m=12, fg3a=35, ftm=18, fta=24, oreb=10, dreb=34, reb=44,
           ast=25, stl=7, blk=5, tov=14, pf=20)
CTX = Context(own=OWN, opp=OPP, poss=99.0)


@pytest.mark.parametrize("count,lower,upper", [
    # Exact (Garwood) 95% limits from chi-square quantiles: chi2(.025, 2k)/2
    # and chi2(.975, 2k + 2)/2.
    (0, 0.0, 3.689),
    (10, 4.795, 18.390),
    (100, 81.364, 121.627),
])
def test_poisson_interval_matches_exact_limits(count, lower, upper):
    lo, hi = poisson_interval(count)
    assert lo == pytest.approx(lower, rel=0.01, abs=0.001)
    assert hi == pytest.approx(upper, rel=0.01)


def test_points_and_efficiency_variances():
    assert points_sd(10, 5, 8) == pytest.approx(math.sqrt(4 * 10 + 9 * 5 + 8))
    assert made_points_variance(0, 0, 3) == 0
    # 0 for 10 from three still has spread: p is adjusted to 2/14.
    assert made_points_variance(0, 10, 3) == pytest.approx(9 * 10 * (2 / 14) * (12 / 14))


def test_every_range_contains_the_published_value(make_line):
    line = make_line(1, gp=12, mpg=32)
    stats = compute_stats(line, CTX)
    ranges = compute_ranges(line, CTX)
    expected = {
        "pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "tov", "fg3m",
        "pts36", "reb36", "ast36", "stl36", "blk36", "fg3m36", "tov36",
        "pts100", "reb100", "ast100", "stl100", "blk100", "fg3m100", "tov100",
        "efg_pct", "ts_pct", "tov_pct",
        "usg_pct", "ast_pct", "oreb_pct", "dreb_pct", "reb_pct", "stl_pct", "blk_pct",
    }
    assert set(ranges) == expected
    for stat, (lo, hi) in ranges.items():
        assert lo <= stats[stat] <= hi, stat
        assert lo < hi, stat


def test_scaled_ranges_match_the_per_game_range(make_line):
    line = make_line(1, gp=10, mpg=24)
    r = compute_ranges(line, CTX)
    # Per 36 is the per-game range times 36 / minutes per game.
    for stat in ("ast", "stl", "pts"):
        lo, hi = r[stat]
        assert r[f"{stat}36"][0] == pytest.approx(lo * 36 / 24, abs=0.11)
        assert r[f"{stat}36"][1] == pytest.approx(hi * 36 / 24, abs=0.11)


def test_no_events_yet_still_has_an_upper_end(make_line):
    line = make_line(1, gp=8, stl=0, blk=0)
    r = compute_ranges(line, CTX)
    assert r["stl"][0] == 0 and r["stl"][1] > 0
    assert r["blk_pct"][0] == 0 and r["blk_pct"][1] > 0


def test_more_games_narrow_the_range(make_line):
    short = compute_ranges(make_line(1, gp=5), CTX)
    long = compute_ranges(make_line(1, gp=60), CTX)
    for stat in ("ast", "ts_pct", "reb_pct"):
        assert long[stat][1] - long[stat][0] < short[stat][1] - short[stat][0], stat


def test_ranges_need_their_inputs(make_line):
    no_team = compute_ranges(make_line(1), None)
    assert "ast" in no_team and "ts_pct" in no_team
    assert "ast_pct" not in no_team and "ast100" not in no_team
    no_split = compute_ranges(make_line(1, split=False), CTX)
    assert "reb" in no_split and "reb_pct" in no_split
    assert "oreb" not in no_split and "oreb_pct" not in no_split


def test_records_publish_ranges_for_ranked_players_only(make_line):
    lines = [make_line(pid, gp=10) for pid in range(1, 21)]
    lines.append(make_line(99, gp=1))  # one game: not qualified
    mark_qualified(lines)
    records, _ = build_player_records(lines, None, fit_shrinkage(lines))
    by_id = {r["id"]: r for r in records}
    assert "ast" in by_id[1]["ci"] and "fg3_pct" in by_id[1]["ci"]
    # Unqualified players keep their shooting ranges only.
    assert set(by_id[99]["ci"]) <= {"fg_pct", "fg2_pct", "fg3_pct", "ft_pct"}
    # The /v1/ copy keeps its old shape: shooting ranges only.
    old, _ = v1_records(records, lines)
    assert set(old[0]["ci"]) <= {"fg_pct", "fg2_pct", "fg3_pct", "ft_pct"}

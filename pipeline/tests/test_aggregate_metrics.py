import pytest

from hoops_pipeline.aggregate import fold_name, mark_qualified
from hoops_pipeline.metrics import compute_stats, defensive_score, offensive_score


def test_percentages_come_from_totals(make_line):
    line = make_line(1, gp=3, fgm=24, fga=40, fg3m=0, fg3a=0)
    stats = compute_stats(line)
    assert stats["fg_pct"] == 60.0
    assert stats["fg3_pct"] is None  # no attempts
    assert stats["mpg"] == 30.0


def test_game_score_split_sums_to_hollinger():
    t = dict(pts=30, fgm=11, fga=20, ftm=6, fta=8, oreb=2, dreb=8, ast=7,
             stl=2, blk=1, pf=3, tov=4)
    hollinger = (t["pts"] + 0.4 * t["fgm"] - 0.7 * t["fga"] - 0.4 * (t["fta"] - t["ftm"])
                 + 0.7 * t["oreb"] + 0.3 * t["dreb"] + t["stl"] + 0.7 * t["ast"]
                 + 0.7 * t["blk"] - 0.4 * t["pf"] - t["tov"])
    assert offensive_score(t) + defensive_score(t) == pytest.approx(hollinger)


def test_composites_are_none_without_rebound_split(make_line):
    stats = compute_stats(make_line(1, split=False))
    assert stats["off_score"] is None and stats["game_score"] is None
    assert stats["oreb"] is None
    assert stats["reb"] == 5.0


def test_qualification_uses_games_and_minutes(make_line):
    lines = [make_line(1, gp=10), make_line(2, gp=10, mpg=5), make_line(3, gp=1)]
    mark_qualified(lines)
    assert [ln.qualified for ln in lines] == [True, False, False]


@pytest.mark.parametrize("raw,folded", [
    ("Luka Dončić", "luka doncic"),
    ("Luka Doncic", "luka doncic"),
    ("Nikola Jokić", "nikola jokic"),
    ("Kristaps Porziņģis", "kristaps porzingis"),
    ("Dāvis Bertāns", "davis bertans"),
    ("D'Angelo Russell", "dangelo russell"),
    ("P.J. Washington", "pj washington"),
    ("Walter Clayton Jr.", "walter clayton jr"),
    ("Nikola Đurišić", "nikola durisic"),
])
def test_fold_name(raw, folded):
    assert fold_name(raw) == folded

from datetime import date

from hoops_pipeline import recent
from hoops_pipeline import formulas


def _line(make_line, pid, gp, **totals):
    return make_line(pid, gp=gp, mpg=30.0, **totals)


def test_no_history_publishes_nothing(make_line):
    info, per = recent.compute({}, date(2026, 11, 3), [_line(make_line, 1, 5)])
    assert info == {} and per == {}


def test_latest_game_is_the_difference_of_one_game(make_line):
    history = {}
    recent.record(history, date(2026, 11, 2), [_line(make_line, 1, 4), _line(make_line, 2, 4)])
    # Player 1 played one game scoring 40; player 2 sat out.
    tonight = [
        _line(make_line, 1, 5, pts=14 * 4 + 40, fgm=5 * 4 + 15, fga=10 * 4 + 25),
        _line(make_line, 2, 4),
    ]
    info, per = recent.compute(history, date(2026, 11, 3), tonight)
    assert info["latest"] == {"since": "2026-11-02"}
    g = per[1]["g"]
    assert g["pts"] == 40 and g["fgm"] == 15 and g["fga"] == 25 and g["mpg"] == 30
    assert 2 not in per
    # Game Score is the Hollinger formula on that one game.
    t = {k: g[k] for k in ("pts", "fgm", "fga", "fta", "ftm", "ast", "tov", "stl", "blk")}
    t.update(oreb=1, dreb=4, pf=2)
    assert g["game_score"] == round(formulas.game_score(t), 1)


def test_two_games_since_last_run_is_not_a_single_game(make_line):
    history = {}
    recent.record(history, date(2026, 11, 1), [_line(make_line, 1, 4)])
    info, per = recent.compute(history, date(2026, 11, 3), [_line(make_line, 1, 6)])
    assert "g" not in per.get(1, {})


def test_debut_counts_as_latest_game(make_line):
    history = {}
    recent.record(history, date(2026, 11, 2), [_line(make_line, 1, 4)])
    _, per = recent.compute(history, date(2026, 11, 3), [_line(make_line, 1, 4), _line(make_line, 9, 1, pts=22)])
    assert per[9]["g"]["pts"] == 22


def test_recent_window_uses_newest_night_a_week_back(make_line):
    history = {}
    for day, gp in [(20, 2), (26, 4), (27, 5), (30, 6)]:
        recent.record(history, date(2026, 10, day), [_line(make_line, 1, gp, pts=10 * gp)])
    # Three games since Oct 27 at 20 points each.
    tonight = [_line(make_line, 1, 8, pts=10 * 5 + 60)]
    info, per = recent.compute(history, date(2026, 11, 3), tonight)
    assert info["recent"] == {"since": "2026-10-27", "days": 7}
    assert per[1]["r"]["gp"] == 3
    assert per[1]["r"]["pts"] == 20.0


def test_short_history_needs_three_days(make_line):
    history = {}
    recent.record(history, date(2026, 11, 1), [_line(make_line, 1, 4)])
    info, _ = recent.compute(history, date(2026, 11, 3), [_line(make_line, 1, 5)])
    assert "recent" not in info
    info, _ = recent.compute(history, date(2026, 11, 4), [_line(make_line, 1, 5)])
    assert info["recent"] == {"since": "2026-11-01", "days": 3}


def test_shrinking_totals_are_ignored(make_line):
    history = {}
    recent.record(history, date(2026, 11, 2), [_line(make_line, 1, 4, pts=100)])
    _, per = recent.compute(history, date(2026, 11, 3), [_line(make_line, 1, 5, pts=90)])
    assert 1 not in per


def test_history_keeps_three_weeks_and_replaces_reruns(make_line):
    history = {}
    for day in range(1, 31):
        recent.record(history, date(2026, 11, day), [_line(make_line, 1, day)])
    assert min(history) == "2026-11-09"
    recent.record(history, date(2026, 11, 30), [_line(make_line, 1, 99)])
    assert history["2026-11-30"]["1"][0] == 99

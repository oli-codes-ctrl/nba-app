"""Formula checks.

Three kinds, from strongest to weakest independence:
1. Published values for real players: our formulas on ESPN's 2024-25
   totals must reproduce advanced stats published elsewhere.
2. ESPN's own published percentages for the same totals.
3. Hand-worked examples, with the arithmetic written out, and identities
   that must hold on a real roster.
"""

import json
from pathlib import Path

import pytest

from hoops_pipeline import espn, teamstats
from hoops_pipeline import formulas as f
from hoops_pipeline.metrics import compute_stats

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


# ---------------------------------------- 1. published values, real players

# 2024-25 regular season, all games with one team.
# Jokic: RealGM advanced table (https://basketball.realgm.com/player/wd/Summary/49571),
#   consistent with StatMuse; looked up 2026-11-04.
# Gilgeous-Alexander: TS% from SI's season review and StatMuse; USG% from
#   StatMuse (https://www.statmuse.com/nba/ask/shai-2025); looked up 2026-11-04.
# Tolerances: TS% uses only player totals, so it must match to the published
# precision. Usage, assist % and rebound % also use team totals: ESPN's
# exclude team turnovers and its team minutes are estimated from games and
# the league's overtime share, so they may differ by a few tenths.
PUBLISHED_2024_25 = [
    (3112335, "Nikola Jokic", "ts_pct", 66.3, 0.05),
    (3112335, "Nikola Jokic", "usg_pct", 29.5, 0.75),
    (3112335, "Nikola Jokic", "ast_pct", 43.2, 0.75),
    (3112335, "Nikola Jokic", "reb_pct", 19.1, 0.5),
    (4278073, "Shai Gilgeous-Alexander", "ts_pct", 63.7, 0.05),
    (4278073, "Shai Gilgeous-Alexander", "usg_pct", 34.6, 0.75),
]


@pytest.fixture(scope="module")
def season_2024_25():
    ref = _load("espn_reference_2025.json")
    lines = {ln.pid: ln for ln in espn.parse_bulk(ref["bulk"])}
    ot = teamstats.overtime_factor(ref["leaguePlayerMinutes"], ref["leagueTeamGames"])
    teams = teamstats.build_teams(espn.parse_team_totals(ref["byteam"]), {}, ot)
    return {
        pid: compute_stats(ln, teamstats.player_context(teams, ln.teams))
        for pid, ln in lines.items()
    }


@pytest.mark.parametrize("pid,name,stat,published,tolerance", PUBLISHED_2024_25)
def test_reproduces_published_2024_25_values(season_2024_25, pid, name, stat, published, tolerance):
    assert season_2024_25[pid][stat] == pytest.approx(published, abs=tolerance), name


# ------------------------------------------- 2. ESPN's own published numbers

def test_matches_espns_own_shooting_percentages():
    # Luka Doncic, 2026-27 through Nov 3: totals from ESPN's player feed and
    # ESPN's published TS% 68.284 and eFG% 62.121 (core stats feed), both
    # captured 2026-11-04.
    t = dict(pts=268, fgm=82, fga=165, fg3m=41, fta=71)
    assert f.ts_pct(t) == pytest.approx(68.284, abs=0.001)
    assert f.efg_pct(t) == pytest.approx(62.121, abs=0.001)


# ------------------------------------------- 3. worked examples, identities

def test_shooting_percentages():
    t = dict(pts=30, fgm=10, fga=20, fg3m=4, fg3a=9, ftm=6, fta=8)
    assert f.fg_pct(t) == 50.0
    assert f.fg2_pct(t) == pytest.approx(6 / 11 * 100)
    assert f.efg_pct(t) == pytest.approx((10 + 0.5 * 4) / 20 * 100)
    assert f.ts_pct(t) == pytest.approx(30 / (2 * (20 + 0.44 * 8)) * 100)
    assert f.fg3a_rate(t) == 45.0
    assert f.fta_rate(t) == 40.0
    assert f.fg3_pct({**t, "fg3a": 0}) is None


TEAM = dict(pts=112, fgm=40, fga=88, fg3m=14, fg3a=36, ftm=18, fta=22,
            oreb=10, dreb=34, reb=44, ast=26, stl=8, blk=5, tov=13, pf=19)
OPP = dict(pts=108, fgm=41, fga=90, fg3m=12, fg3a=35, ftm=14, fta=18,
           oreb=11, dreb=35, reb=46, ast=24, stl=7, blk=4, tov=14, pf=20)


def test_possessions_pace_and_ratings():
    team_side = 88 + 0.4 * 22 - 1.07 * (10 / (10 + 35)) * (88 - 40) + 13
    opp_side = 90 + 0.4 * 18 - 1.07 * (11 / (11 + 34)) * (90 - 41) + 14
    poss = 0.5 * (team_side + opp_side)
    assert f.possessions(TEAM, OPP) == pytest.approx(poss)
    assert f.possessions(OPP, TEAM) == pytest.approx(poss)  # one estimate for both teams
    assert f.pace(poss, 240) == pytest.approx(poss)  # one regulation game
    assert f.pace(poss, 265) == pytest.approx(48 * poss / 53)  # one overtime
    assert f.rating(112, poss) == pytest.approx(112 / poss * 100)


def test_four_factors_and_expected_wins():
    assert f.team_tov_pct(TEAM) == pytest.approx(100 * 13 / (88 + 0.44 * 22 + 13))
    assert f.team_oreb_pct(TEAM, OPP) == pytest.approx(100 * 10 / (10 + 35))
    assert f.ft_rate(TEAM) == pytest.approx(100 * 18 / 88)
    assert f.pythagorean_wins(100, 100, 10) == pytest.approx(5)
    assert f.pythagorean_wins(110, 100, 82) == pytest.approx(82 / (1 + (100 / 110) ** 14))
    assert f.pythagorean_wins(0, 100, 5) is None


def test_player_shares_of_team_play():
    # 30 minutes of a 48-minute game: on the court for 30/48 of it.
    p = dict(pts=24, fgm=8, fga=18, fg3a=5, fta=6, oreb=2, dreb=6, reb=8, ast=7, stl=2, blk=1, tov=3)
    on = 30 / 48
    poss = f.possessions(TEAM, OPP)
    assert f.usg_pct(p, 30, TEAM, 240) == pytest.approx(100 * (18 + 0.44 * 6 + 3) / (on * (88 + 0.44 * 22 + 13)))
    assert f.ast_pct(p, 30, TEAM, 240) == pytest.approx(100 * 7 / (on * 40 - 8))
    assert f.tov_pct(p) == pytest.approx(100 * 3 / (18 + 0.44 * 6 + 3))
    assert f.oreb_pct(p, 30, TEAM, OPP, 240) == pytest.approx(100 * 2 / (on * (10 + 35)))
    assert f.dreb_pct(p, 30, TEAM, OPP, 240) == pytest.approx(100 * 6 / (on * (34 + 11)))
    assert f.reb_pct(p, 30, TEAM, OPP, 240) == pytest.approx(100 * 8 / (on * (44 + 46)))
    assert f.stl_pct(p, 30, poss, 240) == pytest.approx(100 * 2 / (on * poss))
    assert f.blk_pct(p, 30, OPP, 240) == pytest.approx(100 * 1 / (on * (90 - 35)))
    on_court = f.player_possessions(30, poss, 240)
    assert on_court == pytest.approx(poss * on)
    assert f.per_100(24, on_court) == pytest.approx(24 / (poss * on) * 100)
    assert f.per_36(24, 30) == pytest.approx(28.8)
    assert f.usg_pct(p, 0, TEAM, 240) is None


def test_usage_shares_of_a_real_roster_add_up_to_100():
    # Every team play is used by someone on the court, so each player's usage
    # weighted by his share of team minutes adds up to 100%. It holds only if
    # player and team totals line up and each player meets the right team.
    roster = _load("espn_roster_sample.json")
    lines = espn.parse_bulk(roster["bulk"])
    teams = teamstats.build_teams(espn.parse_team_totals(_load("espn_byteam_sample.json")), {}, 1.0)
    team = teams[roster["team"]]
    exact = sum(f.usg_pct(ln.totals, ln.minutes, team.own, team.minutes) * ln.minutes for ln in lines)
    assert exact / (team.minutes / 5) == pytest.approx(100, abs=0.01)
    # The published (rounded, per-game-scaled) values hold to it too.
    ctx = teamstats.player_context(teams, [roster["team"]])
    published = sum(compute_stats(ln, ctx)["usg_pct"] * ln.minutes for ln in lines)
    assert published / (team.minutes / 5) == pytest.approx(100, abs=0.5)


def test_team_pages_from_real_feeds():
    totals = espn.parse_team_totals(_load("espn_byteam_sample.json"))
    records = espn.parse_standings(_load("espn_standings_sample.json"))
    doc = teamstats.teams_doc(teamstats.build_teams(totals, records, 1.005))
    rows = {r["abbr"]: r for r in doc["teams"]}
    assert len(rows) == 30
    # Every point scored is a point allowed somewhere.
    assert sum(r["pf"] for r in rows.values()) == pytest.approx(sum(r["pa"] for r in rows.values()), abs=5)
    dal = rows["DAL"]
    assert dal["w"] + dal["l"] == dal["gp"] == 7
    assert dal["net"] == pytest.approx(dal["ortg"] - dal["drtg"], abs=0.11)
    assert dal["luck"] == pytest.approx(dal["w"] - dal["pyth_w"], abs=0.11)
    assert 90 < dal["pace"] < 110
    best_offense = max(rows.values(), key=lambda r: r["ortg"])
    best_defense = min(rows.values(), key=lambda r: r["drtg"])
    assert best_offense["rank"]["ortg"] == 1 and best_defense["rank"]["drtg"] == 1
    assert 100 < doc["league"]["ortg"] < 130


def test_traded_player_is_measured_against_the_average_of_his_teams():
    slow = dict(TEAM)
    fast = {k: v * 1.1 for k, v in TEAM.items()}
    totals = {"SLO": {"gp": 1, "own": slow, "opp": OPP}, "FST": {"gp": 1, "own": fast, "opp": OPP}}
    teams = teamstats.build_teams(totals, {}, 1.0)
    one = teamstats.player_context(teams, ["SLO"])
    other = teamstats.player_context(teams, ["FST"])
    both = teamstats.player_context(teams, ["FST", "SLO"])
    assert both.own["fga"] == pytest.approx((one.own["fga"] + other.own["fga"]) / 2)
    assert both.poss == pytest.approx((one.poss + other.poss) / 2)
    assert teamstats.player_context(teams, ["XXX"]) is None


def test_team_stats_are_empty_without_team_context(make_line):
    stats = compute_stats(make_line(1))
    assert stats["usg_pct"] is None and stats["pts100"] is None
    assert stats["pts36"] == pytest.approx(14 * 36 / 30)  # per-36 needs no team

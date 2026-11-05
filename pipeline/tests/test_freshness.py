import copy
import json
from pathlib import Path

import pytest

from hoops_pipeline import config, espn, freshness, recent
from hoops_pipeline.__main__ import EXIT_STALE, EXIT_UP_TO_DATE, main
from hoops_pipeline.aggregate import attempt_minimums, mark_qualified
from hoops_pipeline.publish import build_player_records

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


# ------------------------------------------------------------ ESPN parsing

def test_standings_and_team_feed_parse_all_30_teams():
    # Both fixtures were captured from ESPN at the same moment (2026-11-04).
    records = espn.parse_standings(_load("espn_standings_sample.json"))
    standings = espn.standings_games(records)
    games, points = espn.parse_team_feed(_load("espn_byteam_sample.json"))
    assert len(standings) == 30 and len(games) == 30
    assert records["DAL"]["w"] + records["DAL"]["l"] == 7
    assert standings == games
    assert standings["DAL"] == 7 and standings["GSW"] == 8  # GS mapped to GSW
    assert points == 24266  # equals the players' points at the same moment


def test_team_feed_ignores_opponent_splits():
    raw = _load("espn_byteam_sample.json")
    _, own = espn.parse_team_feed(raw)
    for team in raw["teams"]:
        for cat in team["categories"]:
            if str(cat.get("splitId")) == "900":
                cat["values"] = [v * 10 if isinstance(v, (int, float)) else v for v in cat["values"]]
    assert espn.parse_team_feed(raw)[1] == own


def test_missing_columns_fail_loudly():
    raw = _load("espn_byteam_sample.json")
    for cat in raw["categories"]:
        if cat["name"] == "offensive" and cat.get("names"):
            cat["names"] = [n for n in cat["names"] if n != "points"]
    with pytest.raises(espn.EspnFormatError):
        espn.parse_team_feed(raw)
    standings = _load("espn_standings_sample.json")
    standings["children"][0]["standings"]["entries"].pop()
    with pytest.raises(espn.EspnFormatError):
        espn.parse_standings(standings)


# ------------------------------------------------------------ freshness gate

def test_fresh_when_all_three_feeds_agree():
    games = {"DAL": 7, "BOS": 7}
    assert freshness.check(games, dict(games), 1500.0, 1500.0).ok


def test_stale_when_team_stats_lag_the_standings():
    report = freshness.check({"DAL": 8, "BOS": 7}, {"DAL": 7, "BOS": 7}, 1500.0, 1500.0)
    assert not report.ok
    assert "DAL 7 vs 8" in report.problems[0]


def test_stale_when_player_feed_lags_the_team_feed():
    games = {"DAL": 8}
    # A whole game is missing from the players' totals.
    assert not freshness.check(games, games, 1500.0, 1730.0).ok
    # A small scoring correction is tolerated.
    assert freshness.check(games, games, 1500.0, 1500.0 + config.FRESHNESS_POINTS_TOLERANCE).ok


def test_stale_when_a_team_is_missing_from_one_feed():
    assert not freshness.check({"DAL": 7, "BOS": 7}, {"DAL": 7}, 0.0, 0.0).ok


# ------------------------------------------------------------ attempt minimums

def test_attempt_minimums_scale_with_the_season(make_line):
    early = [make_line(1, gp=5)]
    late = [make_line(1, gp=60)]
    assert attempt_minimums(early)["fg3_pct"] == {"by": "fg3a", "min": 10}  # floor
    assert attempt_minimums(late)["fg3_pct"] == {"by": "fg3a", "min": 90}  # 1.5 x 60
    assert attempt_minimums(late)["ft_pct"] == {"by": "fta", "min": 60}
    assert attempt_minimums(late)["fg_pct"] == {"by": "fga", "min": 180}


def test_shooting_percentages_need_enough_attempts(make_line):
    lines = [make_line(pid, gp=5) for pid in range(1, 11)]
    # Player 1 is 2 for 2 from three: a perfect but tiny sample.
    lines[0].totals.update(fg3m=2, fg3a=2)
    mark_qualified(lines)
    records, pool_size = build_player_records(lines)
    one = next(r for r in records if r["id"] == 1)
    assert one["s"]["fg3_pct"] == 100.0
    assert "fg3_pct" not in one["pct"] and "fg3_pct" not in one["rank"]
    assert one["pct"]["pts"] is not None  # counting stats still rank
    assert one["att"] == {"fga": 50, "fg2a": 48, "fg3a": 2, "fta": 20}
    assert pool_size["fg3_pct"] == 9 and pool_size["pts"] == 10


# ------------------------------------------------------------ nightly CLI

class FakeEspn:
    """Serves fixtures by URL, like JsonClient.get."""

    def __init__(self, bulk, core, standings, byteam):
        self.bulk, self.core, self.standings, self.byteam = bulk, core, standings, byteam
        self.calls = 0

    def get(self, url, params=None):
        self.calls += 1
        if url == config.ESPN_STANDINGS_URL:
            return copy.deepcopy(self.standings)
        if url == config.ESPN_BYTEAM_URL:
            return copy.deepcopy(self.byteam)
        if url == config.ESPN_BULK_URL:
            return copy.deepcopy(self.bulk)
        return copy.deepcopy(self.core)


def _consistent_byteam(bulk):
    """The team fixture, with one team's points adjusted so the league total
    equals the players' total in the bulk fixture."""
    byteam = _load("espn_byteam_sample.json")
    players = sum(ln.totals.get("pts", 0) for ln in espn.parse_bulk(bulk))
    _, teams = espn.parse_team_feed(byteam)
    names = next(c["names"] for c in byteam["categories"] if c["name"] == "offensive" and c.get("names"))
    i = names.index("points")
    cat = next(c for c in byteam["teams"][0]["categories"]
               if c["name"] == "offensive" and str(c["splitId"]) == "0")
    cat["values"][i] += players - teams
    return byteam


@pytest.fixture
def espn_fake(bulk_sample, core_sample):
    return FakeEspn(bulk_sample, core_sample, _load("espn_standings_sample.json"),
                    _consistent_byteam(bulk_sample))


def _run(tmp_path, client, *extra):
    return main(["nightly", "--state", str(tmp_path / "state"), "--out", str(tmp_path / "out"),
                 "--today", "2026-11-04", "--min-players", "3", *extra], client=client)


def test_nightly_publishes_games_through_yesterday(tmp_path, espn_fake):
    state = tmp_path / "state"
    state.mkdir()
    (state / "totals_history.json").write_text("{}", encoding="utf-8")  # legacy file
    assert _run(tmp_path, espn_fake) == 0
    out = tmp_path / "out" / "v2"
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["gamesThrough"] == "2026-11-03" == manifest["asOf"]
    assert manifest["schemaVersion"] == 2 and "teams" in manifest["files"]
    teams = json.loads((out / manifest["files"]["teams"]).read_text(encoding="utf-8"))
    assert len(teams["teams"]) == 30
    # The /v1/ compatibility copy still carries the retired Off/Def scores.
    v1 = json.loads((tmp_path / "out" / "v1" / "manifest.json").read_text(encoding="utf-8"))
    v1_players = json.loads((tmp_path / "out" / "v1" / v1["files"]["players"]).read_text(encoding="utf-8"))
    assert v1["schemaVersion"] == 1 and "teams" not in v1["files"]
    assert all("off_score" in p["s"] for p in v1_players["players"])
    doc = json.loads((out / manifest["files"]["players"]).read_text(encoding="utf-8"))
    assert doc["minAttempts"]["fg3_pct"]["by"] == "fg3a"
    assert all("att" in p for p in doc["players"])
    assert json.loads((state / "published.json").read_text(encoding="utf-8")) == {"gamesThrough": "2026-11-03"}
    assert "2026-11-03" in recent.load_history(state)
    assert espn.load_team_state(state) is not None
    assert not (state / "totals_history.json").exists()


def test_nightly_publishes_nothing_while_espn_lags(tmp_path, espn_fake):
    lagging = espn_fake.standings["children"][0]["standings"]["entries"][0]
    wins = next(s for s in lagging["stats"] if s["name"] == "wins")
    wins["value"] += 1  # a game the team stats don't have yet
    assert _run(tmp_path, espn_fake) == EXIT_STALE
    assert not (tmp_path / "out").exists()
    assert not (tmp_path / "state" / "published.json").exists()
    assert espn_fake.calls == 3  # stopped before the per-player requests


def test_nightly_skips_games_already_published(tmp_path, espn_fake):
    assert _run(tmp_path, espn_fake) == 0
    assert _run(tmp_path, espn_fake) == EXIT_UP_TO_DATE
    assert _run(tmp_path, espn_fake, "--force") == 0


def test_nightly_waits_once_any_of_todays_games_has_finished(tmp_path, espn_fake):
    """A late retry must not publish once a game from today has ended: ESPN's
    totals would include it under yesterday's label."""
    board = json.loads((Path(__file__).parent / "fixtures" / "espn_scoreboard_sample.json").read_text(encoding="utf-8"))

    class WithScoreboard(FakeEspn):
        def get(self, url, params=None):
            if url == config.ESPN_SCOREBOARD_URL and params["dates"] == "20261104":
                self.calls += 1
                return copy.deepcopy(board)  # two of "today's" games are final
            return super().get(url, params)

    late = WithScoreboard(espn_fake.bulk, espn_fake.core, espn_fake.standings, espn_fake.byteam)
    assert _run(tmp_path, late) == EXIT_STALE
    assert not (tmp_path / "out").exists()

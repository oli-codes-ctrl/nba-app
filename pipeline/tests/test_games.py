"""Box scores from game summaries (games.py), checked on trimmed real ESPN
responses from 2026-11-02 (fixtures/espn_scoreboard_sample.json and
fixtures/espn_summary_sample.json)."""

import copy
import json
from datetime import date
from pathlib import Path

import pytest

from hoops_pipeline import config, games
from hoops_pipeline.http_client import FetchError

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


SCOREBOARD = _load("espn_scoreboard_sample.json")
SUMMARY = _load("espn_summary_sample.json")
LAL_MIA = "401909921"
LAC_TOR = "401909920"


class FakeClient:
    """Answers the scoreboard for 2026-11-02 with the sample, other dates
    with no games, and summaries from a table. Records every request."""

    def __init__(self, summaries, fail=()):
        self.summaries = summaries
        self.fail = set(fail)
        self.calls = []

    def get(self, url, params=None):
        self.calls.append((url, dict(params or {})))
        if url == config.ESPN_SCOREBOARD_URL:
            if params["dates"] == "20261102":
                return SCOREBOARD
            return {"leagues": SCOREBOARD["leagues"], "events": []}
        gid = params["event"]
        if gid in self.fail:
            raise FetchError(f"summary {gid}: 503")
        return self.summaries[gid]


def test_calendar_lists_game_dates():
    assert games.calendar_dates(SCOREBOARD) == ["2026-10-16", "2026-11-01", "2026-11-02", "2026-11-04"]


def test_scoreboard_keeps_finished_regular_season_games():
    refs, unfinished = games.parse_scoreboard(SCOREBOARD, "2026-11-02")
    assert [r.id for r in refs] == [LAC_TOR, LAL_MIA]  # preseason and live games left out
    assert unfinished == 1
    lal = refs[1]
    assert (lal.home, lal.away, lal.home_pts, lal.away_pts, lal.day) == ("LAL", "MIA", 138, 117, "2026-11-02")


def test_box_score_lines():
    box = games.parse_box(SUMMARY)
    assert set(box) == {"MIA", "LAL"}
    assert len(box["MIA"]) == 3  # the did-not-play reserve is left out
    row = dict(zip(("pid", "starter", *games.STAT_KEYS), box["MIA"][0]))
    # Giannis Antetokounmpo: 34 min, 30 pts, 10-17 FG, 0-3 3PT, 10-15 FT,
    # 12 reb (1 off, 11 def), 7 ast, 7 tov, 1 stl, 2 blk, 3 pf, -7.
    assert row == {
        "pid": 3032977, "starter": 1, "min": 34, "pts": 30, "reb": 12, "ast": 7, "stl": 1, "blk": 2,
        "tov": 7, "fgm": 10, "fga": 17, "fg3m": 0, "fg3a": 3, "ftm": 10, "fta": 15, "oreb": 1,
        "dreb": 11, "pf": 3, "pm": -7,
        # Hollinger: 30 + 4 - 11.9 - 2 + 0.7 + 3.3 + 1 + 4.9 + 1.4 - 1.2 - 7
        "gmsc": 23.2,
    }
    assert box["LAL"][0][-2] == 20  # "+20" plus/minus


def test_a_missing_column_fails_loudly():
    broken = copy.deepcopy(SUMMARY)
    stats = broken["boxscore"]["players"][0]["statistics"][0]
    stats["keys"] = [k for k in stats["keys"] if k != "plusMinus"]
    with pytest.raises(games.GameFormatError):
        games.parse_box(broken)


def test_update_is_incremental_and_waits_for_unfinished_games():
    empty_box = {"boxscore": {"players": []}}
    client = FakeClient({LAL_MIA: SUMMARY, LAC_TOR: empty_box})
    state = games.GameState(2026)
    assert games.update(client, state, date(2026, 11, 2)) == 2
    assert state.games[LAL_MIA]["home"] == "LAL"
    lines = state.games[LAL_MIA]["lines"]
    assert lines[0][:3] == [4592691, 0, 1]  # home team first: pid, side, starter
    assert [ln for ln in lines if ln[0] == 3032977][0][:3] == [3032977, 1, 1]  # Giannis, away
    assert {"2026-10-16", "2026-11-01"} <= state.complete
    assert "2026-11-02" not in state.complete  # one game there is still live

    before = len(client.calls)
    assert games.update(client, state, date(2026, 11, 2)) == 0
    summaries = [c for c in client.calls[before:] if c[0] == config.ESPN_SUMMARY_URL]
    assert summaries == []  # stored games are never fetched again
    scoreboards = [c[1]["dates"] for c in client.calls[before:]]
    assert scoreboards == ["20261102"]  # only the incomplete date


def test_a_failed_summary_is_retried_next_run(tmp_path):
    state = games.GameState(2026)
    client = FakeClient({LAL_MIA: SUMMARY}, fail={LAC_TOR})
    games.update(client, state, date(2026, 11, 2))
    assert LAL_MIA in state.games and LAC_TOR not in state.games
    games.save_state(tmp_path, state)
    again = games.load_state(tmp_path, 2026)
    assert again.games.keys() == state.games.keys() and again.complete == state.complete
    assert games.load_state(tmp_path, 2027).games == {}  # a new season starts empty


def test_published_game_logs():
    client = FakeClient({LAL_MIA: SUMMARY, LAC_TOR: {"boxscore": {"players": []}}})
    state = games.GameState(2026)
    games.update(client, state, date(2026, 11, 2))
    doc = games.games_doc(state, date(2026, 11, 2))
    assert doc["keys"] == list(games.STAT_KEYS)
    assert doc["games"][1] == [LAL_MIA, "2026-11-02", "LAL", "MIA", 138, 117]
    giannis = doc["players"]["3032977"]
    assert giannis[0][:4] == [1, 1, 1, 34]  # game index, away, starter, minutes
    assert doc["boxScoresThrough"] == "2026-11-01"
    assert games.games_doc(state, date(2026, 11, 1))["games"] == []

    # Nov 2 still has a live game; once it is in, a later date without games
    # (Nov 3) counts as complete too.
    state.complete.add("2026-11-02")
    assert games.box_scores_through(state, date(2026, 11, 3)) == "2026-11-03"

    pts = {3032977: 30, 3059319: 7}
    gp = {3032977: 1, 3059319: 2}
    assert games.totals_mismatch(doc, pts, gp) == [3059319]

"""Box scores from ESPN's game summaries: one line per player per game.

Feeds (public, unofficial, approved):
- Scoreboard: config.ESPN_SCOREBOARD_URL?dates=YYYYMMDD, one per US Eastern
  game date. Its league calendar whitelists every date with games.
- Summary: config.ESPN_SUMMARY_URL?event={id}, one per game: the full box
  score, including the offensive/defensive rebound split and plus/minus.

Only finished regular-season games are kept (season type 2). State lives in
the pipeline state directory (games_v1.json) and grows incrementally: each
run fetches scoreboards only for dates not yet complete and summaries only
for games not yet stored, so a night costs about one scoreboard and one
summary per game.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from . import config
from . import formulas as f
from .http_client import FetchError, JsonClient
from .teams import standard_abbr

log = logging.getLogger(__name__)

STATE_FILE = "games_v1.json"
REGULAR_SEASON = 2

# Published per player-game, in this order. Minutes are whole minutes as
# ESPN reports them; gmsc is Game Score (formulas.game_score) for the game.
STAT_KEYS = (
    "min", "pts", "reb", "ast", "stl", "blk", "tov",
    "fgm", "fga", "fg3m", "fg3a", "ftm", "fta", "oreb", "dreb", "pf", "pm", "gmsc",
)

# ESPN box score columns (by their stable `keys`) -> our fields.
_SINGLE = {
    "minutes": "min",
    "points": "pts",
    "rebounds": "reb",
    "assists": "ast",
    "turnovers": "tov",
    "steals": "stl",
    "blocks": "blk",
    "offensiveRebounds": "oreb",
    "defensiveRebounds": "dreb",
    "fouls": "pf",
    "plusMinus": "pm",
}
_PAIRS = {
    "fieldGoalsMade-fieldGoalsAttempted": ("fgm", "fga"),
    "threePointFieldGoalsMade-threePointFieldGoalsAttempted": ("fg3m", "fg3a"),
    "freeThrowsMade-freeThrowsAttempted": ("ftm", "fta"),
}


class GameFormatError(RuntimeError):
    """A box score is missing a column we rely on: fail loudly, never guess."""


@dataclass(frozen=True)
class GameRef:
    id: str
    day: str  # US Eastern date, YYYY-MM-DD
    home: str
    away: str
    home_pts: int
    away_pts: int


@dataclass
class GameState:
    season: int
    # Dates whose finished games are all stored.
    complete: set[str] = field(default_factory=set)
    # Game id -> {"date", "home", "away", "hp", "ap", "lines": [[pid, side, starter, *STAT_KEYS]]}
    games: dict[str, dict[str, Any]] = field(default_factory=dict)
    # Every date with games this season (ESPN's calendar), to tell a date
    # without games from one whose box scores are missing.
    calendar: list[str] = field(default_factory=list)


# ------------------------------------------------------------------ parsing


def calendar_dates(raw: dict[str, Any]) -> list[str]:
    """Dates with games, from a scoreboard's league calendar. Entries are
    07:00Z on the US Eastern date, so the first ten characters are the date."""
    leagues = raw.get("leagues") or []
    cal = leagues[0].get("calendar", []) if leagues else []
    return sorted({c[:10] for c in cal if isinstance(c, str)})


def parse_scoreboard(raw: dict[str, Any], day: str) -> tuple[list[GameRef], int]:
    """Finished regular-season games on one date, and how many regular-season
    games that date has that are not finished yet."""
    refs: list[GameRef] = []
    unfinished = 0
    for e in raw.get("events", []):
        if (e.get("season") or {}).get("type") != REGULAR_SEASON:
            continue
        if not ((e.get("status") or {}).get("type") or {}).get("completed"):
            unfinished += 1
            continue
        comp = e["competitions"][0]
        sides = {c["homeAway"]: c for c in comp["competitors"]}
        refs.append(GameRef(
            id=str(e["id"]),
            day=day,
            home=standard_abbr(sides["home"]["team"]["abbreviation"]),
            away=standard_abbr(sides["away"]["team"]["abbreviation"]),
            home_pts=int(sides["home"]["score"]),
            away_pts=int(sides["away"]["score"]),
        ))
    return refs, unfinished


def _number(text: str) -> int:
    text = text.strip()
    if text in ("", "--", "-"):
        return 0
    return int(text.lstrip("+"))


def parse_box(raw: dict[str, Any]) -> dict[str, list[list[Any]]]:
    """Player lines by team abbreviation: [pid, starter, *STAT_KEYS] for every
    player who played. Players marked did-not-play are left out."""
    out: dict[str, list[list[Any]]] = {}
    for team in (raw.get("boxscore") or {}).get("players", []):
        abbr = standard_abbr(team["team"]["abbreviation"])
        stats = team["statistics"][0]
        keys = stats.get("keys") or []
        missing = [k for k in (*_SINGLE, *_PAIRS) if k not in keys]
        if missing:
            raise GameFormatError(f"Box score for {abbr} is missing {missing}")
        index = {k: i for i, k in enumerate(keys)}
        rows = []
        for a in stats.get("athletes", []):
            values = a.get("stats") or []
            if a.get("didNotPlay") or not values:
                continue
            line: dict[str, float] = {}
            for key, name in _SINGLE.items():
                line[name] = _number(values[index[key]])
            for key, (made, tried) in _PAIRS.items():
                m, t = values[index[key]].split("-")
                line[made], line[tried] = _number(m), _number(t)
            # A few seconds on the floor still counts as a game played, as in
            # ESPN's season totals.
            line["gmsc"] = round(f.game_score(line), 1)
            rows.append([int(a["athlete"]["id"]), 1 if a.get("starter") else 0,
                         *(line[k] for k in STAT_KEYS)])
        out[abbr] = rows
    return out


# ---------------------------------------------------------------- fetching


def fetch_scoreboard(client: JsonClient, day: str) -> dict[str, Any]:
    return client.get(config.ESPN_SCOREBOARD_URL, {"dates": day.replace("-", "")})


def fetch_summary(client: JsonClient, game_id: str) -> dict[str, Any]:
    return client.get(config.ESPN_SUMMARY_URL, {"event": game_id})


def update(client: JsonClient, state: GameState, through: date) -> int:
    """Fetch what is missing for dates through `through`. Returns how many
    games were added. A failed summary is skipped (its date stays
    incomplete) and retried on the next run."""
    end = through.isoformat()
    first = fetch_scoreboard(client, end)
    state.calendar = calendar_dates(first) or state.calendar
    days = [d for d in state.calendar if d <= end and d not in state.complete]
    added = 0
    for day in days:
        raw = first if day == end else fetch_scoreboard(client, day)
        refs, unfinished = parse_scoreboard(raw, day)
        ok = unfinished == 0
        for ref in refs:
            if ref.id in state.games:
                continue
            try:
                box = parse_box(fetch_summary(client, ref.id))
            except FetchError as exc:
                log.warning("Box score for game %s (%s) not fetched: %s", ref.id, day, exc)
                ok = False
                continue
            state.games[ref.id] = {
                "date": ref.day, "home": ref.home, "away": ref.away,
                "hp": ref.home_pts, "ap": ref.away_pts,
                "lines": [[row[0], side, *row[1:]]
                          for side, abbr in ((0, ref.home), (1, ref.away))
                          for row in box.get(abbr, [])],
            }
            added += 1
        if ok:
            state.complete.add(day)
    log.info("Box scores: %d new games, %d stored, complete through %s",
             added, len(state.games), max(state.complete, default="none"))
    return added


# ------------------------------------------------------------------- state


def load_state(state_dir: Path, season: int) -> GameState:
    path = state_dir / STATE_FILE
    if not path.exists():
        return GameState(season)
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("season") != season:
        return GameState(season)  # a new season starts empty
    return GameState(season, set(raw.get("complete", [])), raw.get("games", {}), raw.get("calendar", []))


def save_state(state_dir: Path, state: GameState) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / STATE_FILE).write_text(json.dumps({
        "season": state.season,
        "complete": sorted(state.complete),
        "calendar": state.calendar,
        "games": state.games,
    }, separators=(",", ":")), encoding="utf-8")


# -------------------------------------------------------------- publishing


def box_scores_through(state: GameState, through: date) -> str | None:
    """The last date through which every game's box score is stored: `through`
    itself unless a game date up to it is still missing."""
    end = through.isoformat()
    if not state.calendar:
        complete = sorted(d for d in state.complete if d <= end)
        return complete[-1] if complete else None
    pending = [d for d in state.calendar if d <= end and d not in state.complete]
    if not pending:
        return end
    return (date.fromisoformat(min(pending)) - timedelta(days=1)).isoformat()


def games_doc(state: GameState, through: date) -> dict[str, Any]:
    """The published game logs: games in date order, and each player's
    lines as [game index, side (0 home, 1 away), starter, *STAT_KEYS]."""
    end = through.isoformat()
    ordered = sorted(
        ((gid, g) for gid, g in state.games.items() if g["date"] <= end),
        key=lambda item: (item[1]["date"], item[0]),
    )
    games = []
    players: dict[str, list[list[Any]]] = {}
    for i, (gid, g) in enumerate(ordered):
        games.append([gid, g["date"], g["home"], g["away"], g["hp"], g["ap"]])
        for pid, side, *rest in g["lines"]:
            players.setdefault(str(pid), []).append([i, side, *rest])
    return {
        "keys": list(STAT_KEYS),
        # The last date whose box scores are all in (a failed fetch can lag).
        "boxScoresThrough": box_scores_through(state, through),
        "games": games,
        "players": players,
    }


def totals_mismatch(doc: dict[str, Any], season_points: dict[int, int], season_games: dict[int, int]) -> list[int]:
    """Players whose box scores do not add up to ESPN's season totals (games
    and points), for a consistency warning."""
    pts = doc["keys"].index("pts") + 3  # after game index, side and starter
    bad = []
    for pid, total in season_points.items():
        rows = doc["players"].get(str(pid), [])
        if len(rows) != season_games.get(pid, 0) or sum(r[pts] for r in rows) != total:
            bad.append(pid)
    return bad

"""Recent form from nightly season totals.

ESPN's bulk feed only gives season totals. Saving those totals every night
and subtracting an earlier night gives exact totals for the games in
between, without any extra requests:

- "latest": totals since the previous snapshot. When a player's games went up
  by exactly one, that difference is the box line of their latest game.
- "recent": averages over about the last week (the newest saved snapshot at
  least RECENT_DAYS older).

History lives in pipeline state as {games-through date: {pid: [gp, min,
*TRACKED]}} and keeps the last HISTORY_DAYS days. Keys are the last day
whose games are included (US Eastern), not the run date: a run that reads
lagged data must never be labeled with a newer date.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from .aggregate import SeasonLine
from .metrics import defensive_score, offensive_score

HISTORY_FILENAME = "totals_history_v2.json"
# Keyed by run date, which mislabeled lagged data. Removed on the next save.
LEGACY_FILENAMES = ("totals_history.json",)
HISTORY_DAYS = 21
RECENT_DAYS = 7
# With less history than a week, still publish a window once it spans this many days.
RECENT_MIN_DAYS = 3

TRACKED = ("pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "tov", "pf",
           "fgm", "fga", "fg3m", "fg3a", "ftm", "fta")

Row = list[float]
History = dict[str, dict[str, Row]]


def load_history(state_dir: Path) -> History:
    path = state_dir / HISTORY_FILENAME
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def save_history(state_dir: Path, history: History) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    for name in LEGACY_FILENAMES:
        (state_dir / name).unlink(missing_ok=True)
    (state_dir / HISTORY_FILENAME).write_text(
        json.dumps(history, separators=(",", ":"), sort_keys=True), encoding="utf-8")


def snapshot(lines: list[SeasonLine]) -> dict[str, Row]:
    """Tonight's totals, one compact row per player."""
    return {
        str(ln.pid): [ln.gp, round(ln.minutes, 1), *(ln.totals.get(k, 0) for k in TRACKED)]
        for ln in lines
    }


def record(history: History, day: date, lines: list[SeasonLine]) -> None:
    """Save the totals for games through `day` (replacing a rerun for the
    same day) and drop old snapshots."""
    history[day.isoformat()] = snapshot(lines)
    cutoff = (day - timedelta(days=HISTORY_DAYS)).isoformat()
    for old in [d for d in history if d < cutoff]:
        del history[old]


def _totals(row: Row) -> dict[str, float]:
    gp, minutes, *rest = row
    return {"gp": gp, "min": minutes, **dict(zip(TRACKED, rest))}


def _diff(now: Row, then: Row | None) -> dict[str, float] | None:
    """Totals for the games between two nights, or None if no games.

    A player missing from the earlier night had not played yet, so their
    earlier totals are zero."""
    a = _totals(now)
    b = _totals(then) if then is not None else {k: 0.0 for k in a}
    d = {k: a[k] - b[k] for k in a}
    # Season totals never shrink; a drop means ESPN corrected the data or a
    # new season started.
    if d["gp"] < 1 or any(v < 0 for k, v in d.items() if k not in ("oreb", "dreb")):
        return None
    # The rebound split comes from a second feed that can lag a night; keep
    # oreb + dreb equal to reb.
    d["oreb"] = min(max(d["oreb"], 0), d["reb"])
    d["dreb"] = d["reb"] - d["oreb"]
    return d


def _pct(num: float, den: float) -> float | None:
    return None if den <= 0 else round(num / den * 100, 1)


def _averages(d: dict[str, float]) -> dict[str, float | int | None]:
    gp = int(d["gp"])
    per = {k: d[k] / gp for k in d}
    return {
        "gp": gp,
        "mpg": round(per["min"], 1),
        **{k: round(per[k], 1) for k in ("pts", "reb", "ast", "stl", "blk", "fg3m", "tov")},
        "fg_pct": _pct(d["fgm"], d["fga"]),
        "ts_pct": _pct(d["pts"], 2 * (d["fga"] + 0.44 * d["fta"])),
        "game_score": round(offensive_score(per) + defensive_score(per), 1),
    }


def _game_line(d: dict[str, float]) -> dict[str, float | int]:
    line: dict[str, float | int] = {"mpg": round(d["min"])}
    line.update({k: int(d[k]) for k in ("pts", "reb", "ast", "stl", "blk", "tov",
                                         "fgm", "fga", "fg3m", "fg3a", "ftm", "fta")})
    line["game_score"] = round(offensive_score(d) + defensive_score(d), 1)
    return line


def _baseline(history: History, through: date, days: int) -> str | None:
    """Newest snapshot at least `days` before `through`, else the oldest
    night if it is at least RECENT_MIN_DAYS back."""
    earlier = sorted(d for d in history if d < through.isoformat())
    if not earlier:
        return None
    target = (through - timedelta(days=days)).isoformat()
    at_least = [d for d in earlier if d <= target]
    if at_least:
        return at_least[-1]
    oldest = earlier[0]
    return oldest if oldest <= (through - timedelta(days=RECENT_MIN_DAYS)).isoformat() else None


def compute(history: History, through: date, lines: list[SeasonLine]) -> tuple[
        dict[str, Any], dict[int, dict[str, Any]]]:
    """Return (doc-level info, {pid: {"r": averages, "g": latest game}}).

    Doc info has "latest": {"since": date} and "recent": {"since": date,
    "days": n}, each present only when there is an earlier night to compare.
    """
    now = snapshot(lines)
    info: dict[str, Any] = {}
    per_player: dict[int, dict[str, Any]] = {}

    earlier = sorted(d for d in history if d < through.isoformat())
    if earlier:
        since = earlier[-1]
        info["latest"] = {"since": since}
        for pid, row in now.items():
            d = _diff(row, history[since].get(pid))
            if d is not None and d["gp"] == 1:
                per_player.setdefault(int(pid), {})["g"] = _game_line(d)

    base = _baseline(history, through, RECENT_DAYS)
    if base is not None:
        days = (through - date.fromisoformat(base)).days
        info["recent"] = {"since": base, "days": days}
        for pid, row in now.items():
            d = _diff(row, history[base].get(pid))
            if d is not None:
                per_player.setdefault(int(pid), {})["r"] = _averages(d)

    return info, per_player

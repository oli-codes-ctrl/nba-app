"""Daily "Guess the Player" schedule.

Each entry is created once and then frozen in the history, including a copy
of the pool's stats, so the puzzle is identical for everyone that day even
after the nightly refresh changes the numbers.
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from . import config

HISTORY_FILENAME = "puzzle_history.json"
POOL_STATS = ("age", "pts", "ast", "reb", "stl", "blk")
HINT_STATS = ("pts", "ast", "reb", "stl", "blk")
# Window of dates published at once, relative to "today" in PUZZLE_TIMEZONE.
# Yesterday through two days ahead covers every timezone on Earth.
WINDOW_OFFSETS = (-1, 0, 1, 2)


def load_history(state_dir: Path) -> dict[str, dict[str, Any]]:
    path = state_dir / HISTORY_FILENAME
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_history(state_dir: Path, history: dict[str, dict[str, Any]]) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / HISTORY_FILENAME).write_text(
        json.dumps(history, separators=(",", ":"), sort_keys=True), encoding="utf-8"
    )


def candidate_pool(players: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Top scorers among qualified players with a known age (the X axis)."""
    eligible = [p for p in players if p["q"] and p["s"].get("age") is not None]
    eligible.sort(key=lambda p: (-(p["s"]["pts"] or 0), p["id"]))
    return eligible[: config.PUZZLE_POOL_SIZE]


def _recent_answers(history: dict[str, dict[str, Any]], day: date) -> set[int]:
    start = day - timedelta(days=config.PUZZLE_NO_REPEAT_DAYS)
    return {
        entry["answerId"]
        for iso, entry in history.items()
        if start <= date.fromisoformat(iso) < day
    }


def make_puzzle(
    day: date,
    season: int,
    players: list[dict[str, Any]],
    history: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    pool = candidate_pool(players)
    if not pool:
        return None
    recent = _recent_answers(history, day)
    eligible = [p for p in pool if p["id"] not in recent] or pool
    eligible.sort(key=lambda p: p["id"])
    answer = random.Random(f"{season}:{day.isoformat()}").choice(eligible)

    first_day = min((date.fromisoformat(d) for d in history), default=day)
    first_day = min(first_day, day)
    return {
        "date": day.isoformat(),
        "number": (day - first_day).days + 1,
        "answerId": answer["id"],
        "xStat": "age",
        "hintStats": list(HINT_STATS),
        "clues": {
            "position": answer["pos"],
            "conference": answer["conf"],
            "team": answer["team"],
        },
        "pool": [
            {"id": p["id"], "name": p["name"], "searchName": p["searchName"],
             "team": p["team"], **{s: p["s"][s] for s in POOL_STATS}}
            for p in pool
        ],
    }


def ensure_window(
    today: date,
    season: int,
    players: list[dict[str, Any]],
    history: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Create any missing entries in the window (never touching existing ones)
    and return the window's entries in date order."""
    out = []
    for offset in WINDOW_OFFSETS:
        day = today + timedelta(days=offset)
        iso = day.isoformat()
        if iso not in history:
            entry = make_puzzle(day, season, players, history)
            if entry is None:
                continue
            history[iso] = entry
        out.append(history[iso])
    return out

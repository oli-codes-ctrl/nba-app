"""Season lines, qualification and name folding."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field

from . import config
from .teams import CONFERENCE

# Letters NFKD does not decompose into ASCII.
_EXTRA_FOLDS = str.maketrans({
    "đ": "d", "Đ": "D", "ø": "o", "Ø": "O", "ł": "l", "Ł": "L",
    "ß": "ss", "æ": "ae", "Æ": "AE", "ı": "i",
})


def fold_name(name: str) -> str:
    """Lowercase, accent-free, punctuation-light key for search."""
    text = unicodedata.normalize("NFKD", name.translate(_EXTRA_FOLDS))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace(".", "").replace("'", "").replace("’", "")
    return " ".join(text.split())


@dataclass
class SeasonLine:
    """One player's combined regular-season line (all teams)."""

    pid: int
    name: str
    position: str
    age: int | None
    team: str  # current team
    teams: list[str]  # current team first, then any earlier teams
    gp: int
    minutes: float
    # Season totals: pts reb ast stl blk tov pf fgm fga fg3m fg3a ftm fta,
    # plus oreb/dreb when the rebound split is known.
    totals: dict[str, int] = field(default_factory=dict)
    qualified: bool = False

    @property
    def conference(self) -> str:
        return CONFERENCE.get(self.team, "")


def most_team_games(lines: list[SeasonLine]) -> int:
    """The most games any team has played, approximated by the most games
    any single player has played."""
    return max((ln.gp for ln in lines), default=0)


def min_games_to_qualify(lines: list[SeasonLine]) -> int:
    """20% of the most games any team has played, never below 3."""
    return max(config.QUAL_MIN_GP_FLOOR, round(most_team_games(lines) * config.QUAL_GP_FRACTION))


def attempts(line: SeasonLine) -> dict[str, int]:
    """Season attempt totals that sample-size rules and the app use."""
    t = line.totals
    return {
        "fga": t.get("fga", 0),
        "fg2a": t.get("fga", 0) - t.get("fg3a", 0),
        "fg3a": t.get("fg3a", 0),
        "fta": t.get("fta", 0),
    }


def attempt_minimums(lines: list[SeasonLine]) -> dict[str, dict[str, int | str]]:
    """Attempts each shooting percentage needs before it is ranked, scaled to
    the season so far. {stat: {"by": attempt key, "min": attempts}}."""
    most = most_team_games(lines)
    return {
        stat: {"by": key, "min": max(floor, round(rate * most))}
        for stat, (key, rate, floor) in config.ATTEMPT_MINIMUMS.items()
    }


def mark_qualified(lines: list[SeasonLine]) -> None:
    min_gp = min_games_to_qualify(lines)
    for ln in lines:
        ln.qualified = ln.gp >= min_gp and (ln.minutes / ln.gp) >= config.QUAL_MIN_MPG

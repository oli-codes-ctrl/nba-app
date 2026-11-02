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


def min_games_to_qualify(lines: list[SeasonLine]) -> int:
    """20% of the most games any team has played, never below 3.

    A team's games played is approximated by the most games any of its
    current players has played."""
    team_games: dict[str, int] = {}
    for ln in lines:
        team_games[ln.team] = max(team_games.get(ln.team, 0), ln.gp)
    most = max(team_games.values(), default=0)
    return max(config.QUAL_MIN_GP_FLOOR, round(most * config.QUAL_GP_FRACTION))


def mark_qualified(lines: list[SeasonLine]) -> None:
    min_gp = min_games_to_qualify(lines)
    for ln in lines:
        ln.qualified = ln.gp >= min_gp and (ln.minutes / ln.gp) >= config.QUAL_MIN_MPG

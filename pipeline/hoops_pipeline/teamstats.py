"""Team season context.

Two jobs:
- Team pages: possessions, pace, ratings, four factors and expected wins.
- Player shares (usage, assist %, rebound %, per-100): each player is
  measured against his team's totals. Totals are scaled to one game of 48
  minutes first, so a traded player can be measured against the average of
  his teams. (ESPN gives traded players one combined line, so the split
  by team is unknown; box scores in a later milestone will make it exact.)

Team minutes: ESPN publishes none, so each team gets 240 per game times the
league's overtime share (total player minutes / (240 * team-games)). Teams
differ in overtime by well under 1%.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from . import formulas as f

TOTAL_KEYS = ("pts", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta",
              "oreb", "dreb", "reb", "ast", "stl", "blk", "tov", "pf")
GAME_MINUTES = 240  # player-minutes in a regulation game


@dataclass
class Team:
    abbr: str
    gp: int
    own: dict[str, float]
    opp: dict[str, float]
    minutes: float  # estimated player-minutes
    wins: int | None = None
    losses: int | None = None

    @property
    def poss(self) -> float:
        return f.possessions(self.own, self.opp)


@dataclass
class Context:
    """A team (or the average of a traded player's teams), scaled to one
    48-minute game: totals per game, 240 player-minutes."""

    own: dict[str, float]
    opp: dict[str, float]
    poss: float
    minutes: float = GAME_MINUTES


def overtime_factor(league_player_minutes: float, team_games: int) -> float:
    """Average player-minutes per team-game over 240 (1.0 with no overtime)."""
    if team_games <= 0:
        return 1.0
    return max(1.0, league_player_minutes / (GAME_MINUTES * team_games))


def build_teams(
    totals: dict[str, dict[str, Any]],
    records: dict[str, dict[str, int]],
    ot_factor: float,
) -> dict[str, Team]:
    """`totals`: {abbr: {"gp", "own", "opp"}} from the team feed;
    `records`: {abbr: {"w", "l"}} from the standings."""
    teams: dict[str, Team] = {}
    for abbr, t in totals.items():
        rec = records.get(abbr, {})
        teams[abbr] = Team(
            abbr=abbr, gp=int(t["gp"]), own=dict(t["own"]), opp=dict(t["opp"]),
            minutes=GAME_MINUTES * int(t["gp"]) * ot_factor,
            wins=rec.get("w"), losses=rec.get("l"),
        )
    return teams


def _per_game(team: Team) -> Context | None:
    if team.gp <= 0 or team.minutes <= 0:
        return None
    scale = GAME_MINUTES / team.minutes  # one game's worth of player-minutes
    return Context(
        own={k: team.own[k] * scale for k in TOTAL_KEYS},
        opp={k: team.opp[k] * scale for k in TOTAL_KEYS},
        poss=team.poss * scale,
    )


def player_context(teams: dict[str, Team], abbrs: list[str]) -> Context | None:
    """The context a player is measured against: his team, or the average of
    his teams if he was traded. None if none of them are known."""
    parts = [c for a in abbrs if a in teams and (c := _per_game(teams[a])) is not None]
    if not parts:
        return None
    n = len(parts)
    return Context(
        own={k: sum(c.own[k] for c in parts) / n for k in TOTAL_KEYS},
        opp={k: sum(c.opp[k] for c in parts) / n for k in TOTAL_KEYS},
        poss=sum(c.poss for c in parts) / n,
    )


# ----------------------------------------------------------------- publishing

# Published team stats and whether lower ranks first (1 = best or fastest).
TEAM_STATS: dict[str, bool] = {
    "ortg": False, "drtg": True, "net": False, "pace": False,
    "efg_pct": False, "tov_pct": True, "oreb_pct": False, "ft_rate": False,
    "fg3a_rate": False,
    "opp_efg_pct": True, "opp_tov_pct": False, "dreb_pct": False, "opp_ft_rate": True,
}


def _round(v: float | None, digits: int = 1) -> float | None:
    return None if v is None else round(v, digits)


def team_record(t: Team) -> dict[str, Any]:
    poss = t.poss
    ortg = f.rating(t.own["pts"], poss)
    drtg = f.rating(t.opp["pts"], poss)
    pyth = f.pythagorean_wins(t.own["pts"], t.opp["pts"], t.gp)
    opp_oreb = f.team_oreb_pct(t.opp, t.own)
    return {
        "abbr": t.abbr,
        "gp": t.gp,
        "w": t.wins,
        "l": t.losses,
        "pf": t.own["pts"],
        "pa": t.opp["pts"],
        "poss": _round(poss),
        "pace": _round(f.pace(poss, t.minutes)),
        "ortg": _round(ortg),
        "drtg": _round(drtg),
        "net": _round(None if ortg is None or drtg is None else ortg - drtg),
        "pyth_w": _round(pyth),
        # Wins above what the point differential usually produces.
        "luck": _round(None if pyth is None or t.wins is None else t.wins - pyth),
        # Offense: Oliver's four factors, plus how often they shoot threes.
        "efg_pct": _round(f.efg_pct(t.own)),
        "tov_pct": _round(f.team_tov_pct(t.own)),
        "oreb_pct": _round(f.team_oreb_pct(t.own, t.opp)),
        "ft_rate": _round(f.ft_rate(t.own)),
        "fg3a_rate": _round(f.fg3a_rate(t.own)),
        # Defense: the same factors for opponents. Defensive rebound % is
        # the share of opponents' misses this team rebounded.
        "opp_efg_pct": _round(f.efg_pct(t.opp)),
        "opp_tov_pct": _round(f.team_tov_pct(t.opp)),
        "dreb_pct": _round(None if opp_oreb is None else 100 - opp_oreb),
        "opp_ft_rate": _round(f.ft_rate(t.opp)),
    }


def _rank(values: dict[str, float | None], lower_first: bool) -> dict[str, int]:
    """1 = best. Ties share the better rank."""
    present = {k: v for k, v in values.items() if v is not None}
    ordered = sorted(present.values(), reverse=not lower_first)
    return {k: ordered.index(v) + 1 for k, v in present.items()}


def teams_doc(teams: dict[str, Team]) -> dict[str, Any]:
    """Team records with league ranks, plus league averages over all teams."""
    rows = [team_record(t) for t in sorted(teams.values(), key=lambda t: t.abbr)]
    ranks = {stat: _rank({r["abbr"]: r[stat] for r in rows}, lower_first)
             for stat, lower_first in TEAM_STATS.items()}
    for r in rows:
        r["rank"] = {stat: ranks[stat][r["abbr"]] for stat in TEAM_STATS if r["abbr"] in ranks[stat]}

    # League averages come from summed totals, not an average of team rates.
    own = {k: sum(t.own[k] for t in teams.values()) for k in TOTAL_KEYS}
    opp = {k: sum(t.opp[k] for t in teams.values()) for k in TOTAL_KEYS}
    poss = sum(t.poss for t in teams.values())
    minutes = sum(t.minutes for t in teams.values())
    league = {
        "ortg": _round(f.rating(own["pts"], poss)),
        "pace": _round(f.pace(poss, minutes)),
        "efg_pct": _round(f.efg_pct(own)),
        "tov_pct": _round(f.team_tov_pct(own)),
        "oreb_pct": _round(f.team_oreb_pct(own, opp)),
        "ft_rate": _round(f.ft_rate(own)),
        "fg3a_rate": _round(f.fg3a_rate(own)),
    }
    return {"league": league, "teams": rows}

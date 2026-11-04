"""Published player stats. Stat ids here must match app/src/stats/catalog.ts.

Every formula lives in formulas.py with its source; this module only picks
the inputs (season totals, per-game averages, team context) and rounds.
"""

from __future__ import annotations

from . import formulas as f
from .aggregate import SeasonLine
from .teamstats import Context

# Every stat id published under player["s"]. Percent stats are 0-100.
STAT_IDS = (
    "gp", "mpg", "age",
    "pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "tov", "pf",
    "fgm", "fga", "fg3m", "fg3a", "ftm", "fta",
    "fg_pct", "fg2_pct", "fg3_pct", "ft_pct", "efg_pct", "ts_pct",
    "fg3a_rate", "fta_rate",
    "usg_pct", "ast_pct", "tov_pct", "oreb_pct", "dreb_pct", "reb_pct", "stl_pct", "blk_pct",
    "pts36", "reb36", "ast36", "stl36", "blk36", "fg3m36", "tov36",
    "pts100", "reb100", "ast100", "stl100", "blk100", "fg3m100", "tov100",
    "game_score",
)

# Stats that get percentiles. gp/age are context, not performance.
PERCENTILE_STATS = tuple(s for s in STAT_IDS if s not in ("gp", "age"))

# Lower is better for these (the UI flips the wording, ranks stay by value).
LOWER_IS_BETTER = frozenset({"tov", "pf", "tov_pct", "tov36", "tov100"})

# The retired Offensive/Defensive Score, still published in /v1/ only.
V1_ONLY_STATS = ("off_score", "def_score")

PER_MINUTE = ("pts", "reb", "ast", "stl", "blk", "fg3m", "tov")


def compute_stats(line: SeasonLine, ctx: Context | None = None) -> dict[str, float | int | None]:
    """All published stats for one player. Team-based stats (usage and the
    other shares, per-100) need `ctx` and are None without it, as are stats
    that need the offensive/defensive rebound split when it is unknown."""
    t = line.totals
    gp = line.gp
    mp = line.minutes
    per = {k: v / gp for k, v in t.items()}
    has_split = "oreb" in t and "dreb" in t

    s: dict[str, float | int | None] = {
        "gp": gp,
        "mpg": mp / gp,
        "age": line.age,
        "pts": per["pts"], "reb": per["reb"],
        "oreb": per.get("oreb"), "dreb": per.get("dreb"),
        "ast": per["ast"], "stl": per["stl"], "blk": per["blk"],
        "tov": per["tov"], "pf": per["pf"],
        "fgm": per["fgm"], "fga": per["fga"], "fg3m": per["fg3m"], "fg3a": per["fg3a"],
        "ftm": per["ftm"], "fta": per["fta"],
        # Percentages from season totals, never averages of game percentages.
        "fg_pct": f.fg_pct(t),
        "fg2_pct": f.fg2_pct(t),
        "fg3_pct": f.fg3_pct(t),
        "ft_pct": f.ft_pct(t),
        "efg_pct": f.efg_pct(t),
        "ts_pct": f.ts_pct(t),
        "fg3a_rate": f.fg3a_rate(t),
        "fta_rate": f.fta_rate(t),
        "tov_pct": f.tov_pct(t),
        # Game Score is linear, so the season average equals Game Score of
        # the per-game averages.
        "game_score": f.game_score(per) if has_split else None,
    }
    for k in PER_MINUTE:
        s[f"{k}36"] = f.per_36(t[k], mp)

    team = ctx.own if ctx else None
    opp = ctx.opp if ctx else None
    tm_min = ctx.minutes if ctx else 0.0
    poss = f.player_possessions(mp, ctx.poss, tm_min) if ctx else None
    s.update({
        "usg_pct": f.usg_pct(t, mp, team, tm_min) if team else None,
        "ast_pct": f.ast_pct(t, mp, team, tm_min) if team else None,
        "oreb_pct": f.oreb_pct(t, mp, team, opp, tm_min) if team and opp and has_split else None,
        "dreb_pct": f.dreb_pct(t, mp, team, opp, tm_min) if team and opp and has_split else None,
        "reb_pct": f.reb_pct(t, mp, team, opp, tm_min) if team and opp else None,
        "stl_pct": f.stl_pct(t, mp, ctx.poss, tm_min) if ctx else None,
        "blk_pct": f.blk_pct(t, mp, opp, tm_min) if opp else None,
    })
    for k in PER_MINUTE:
        s[f"{k}100"] = f.per_100(t[k], poss)

    return {k: (round(v, 1) if isinstance(v, float) else v) for k, v in ((k, s[k]) for k in STAT_IDS)}


def v1_stats(line: SeasonLine) -> dict[str, float | None]:
    """The retired Offensive/Defensive Score, for the /v1/ copy only."""
    t = line.totals
    if "oreb" not in t or "dreb" not in t:
        return {"off_score": None, "def_score": None}
    per = {k: v / line.gp for k, v in t.items()}
    offense, defense = f.game_score_split(per)
    return {"off_score": round(offense, 1), "def_score": round(defense, 1)}

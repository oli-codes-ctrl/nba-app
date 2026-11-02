"""Derived per-game stats. Stat ids here must match app/src/stats/catalog.ts."""

from __future__ import annotations

from .aggregate import SeasonLine

# Every stat id published under player["s"]. Percent stats are 0-100.
STAT_IDS = (
    "gp", "mpg", "age",
    "pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "tov", "pf",
    "fgm", "fga", "fg3m", "fg3a", "ftm", "fta",
    "fg_pct", "fg2_pct", "fg3_pct", "ft_pct", "efg_pct", "ts_pct",
    "pts36", "reb36", "ast36",
    "off_score", "def_score", "game_score",
)

# Stats that get percentiles. gp/age are context, not performance.
PERCENTILE_STATS = tuple(s for s in STAT_IDS if s not in ("gp", "age"))

# Lower is better for these (the UI flips the wording, ranks stay by value).
LOWER_IS_BETTER = frozenset({"tov", "pf"})


def _ratio(num: float, den: float, scale: float = 1.0) -> float | None:
    return None if den <= 0 else num / den * scale


def offensive_score(t: dict[str, float]) -> float:
    """Offensive half of Hollinger Game Score (totals or per-game)."""
    return (
        t["pts"] + 0.4 * t["fgm"] - 0.7 * t["fga"] - 0.4 * (t["fta"] - t["ftm"])
        + 0.7 * t["oreb"] + 0.7 * t["ast"] - t["tov"]
    )


def defensive_score(t: dict[str, float]) -> float:
    """Defensive half of Hollinger Game Score."""
    return 0.3 * t["dreb"] + t["stl"] + 0.7 * t["blk"] - 0.4 * t["pf"]


def compute_stats(line: SeasonLine) -> dict[str, float | int | None]:
    t = line.totals
    gp = line.gp
    per = {k: v / gp for k, v in t.items()}
    has_split = "oreb" in t and "dreb" in t
    fg2m = t["fgm"] - t["fg3m"]
    fg2a = t["fga"] - t["fg3a"]
    off = offensive_score(per) if has_split else None
    dfn = defensive_score(per) if has_split else None
    s: dict[str, float | int | None] = {
        "gp": gp,
        "mpg": line.minutes / gp,
        "age": line.age,
        "pts": per["pts"], "reb": per["reb"],
        "oreb": per.get("oreb"), "dreb": per.get("dreb"),
        "ast": per["ast"], "stl": per["stl"], "blk": per["blk"],
        "tov": per["tov"], "pf": per["pf"],
        "fgm": per["fgm"], "fga": per["fga"], "fg3m": per["fg3m"], "fg3a": per["fg3a"],
        "ftm": per["ftm"], "fta": per["fta"],
        # Percentages from season totals, never averages of game percentages.
        "fg_pct": _ratio(t["fgm"], t["fga"], 100),
        "fg2_pct": _ratio(fg2m, fg2a, 100),
        "fg3_pct": _ratio(t["fg3m"], t["fg3a"], 100),
        "ft_pct": _ratio(t["ftm"], t["fta"], 100),
        "efg_pct": _ratio(t["fgm"] + 0.5 * t["fg3m"], t["fga"], 100),
        "ts_pct": _ratio(t["pts"], 2 * (t["fga"] + 0.44 * t["fta"]), 100),
        "pts36": _ratio(t["pts"], line.minutes, 36),
        "reb36": _ratio(t["reb"], line.minutes, 36),
        "ast36": _ratio(t["ast"], line.minutes, 36),
        "off_score": off,
        "def_score": dfn,
        "game_score": None if off is None or dfn is None else off + dfn,
    }
    return {k: (round(v, 1) if isinstance(v, float) else v) for k, v in s.items()}

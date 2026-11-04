"""Every formula the pipeline publishes, with its source.

Conventions
- Arguments are season totals unless noted. The box-score formulas are
  linear, so per-game averages work too.
- Keys: pts fgm fga fg3m fg3a ftm fta oreb dreb reb ast stl blk tov pf.
- `team` and `opp` hold a team's and its opponents' totals. Team minutes
  (`team_min`) are player-minutes: 240 in a regulation game, so
  `team_min / 5` is minutes of game time.
- ESPN's team totals are sums of player-credited stats. Official team totals
  also count team turnovers (shot-clock violations and the like), so
  possession estimates here run about 0.5% below published ones.

Sources
- [BR] Basketball-Reference glossary,
  https://www.basketball-reference.com/about/glossary.html. Formulas only;
  the pipeline never fetches data from that site.
- [Oliver] Dean Oliver, "Basketball on Paper" (2004): possessions and the
  four factors.
- [Hollinger] John Hollinger, Game Score, "Pro Basketball Prospectus" (2002).
- [Morey] Daryl Morey's Pythagorean expectation for basketball; exponent 14
  as used by Basketball-Reference.
- [Winston] Wayne Winston (author of "Mathletics"), "Why is standard
  deviation of NBA scores about point spread 12 points?" (blog, March 2018):
  game margins vary about 12 points around the expected margin.
"""

from __future__ import annotations

import math
from collections.abc import Mapping

Totals = Mapping[str, float]

PYTHAGOREAN_EXPONENT = 14
FT_POSSESSION_FACTOR = 0.44  # share of free throw attempts that end a possession [BR]


def ratio(num: float, den: float, scale: float = 1.0) -> float | None:
    """num / den * scale, or None when the denominator is not positive."""
    return None if den <= 0 else num / den * scale


# ------------------------------------------------------------------ shooting

def fg_pct(t: Totals) -> float | None:
    return ratio(t["fgm"], t["fga"], 100)


def fg2_pct(t: Totals) -> float | None:
    return ratio(t["fgm"] - t["fg3m"], t["fga"] - t["fg3a"], 100)


def fg3_pct(t: Totals) -> float | None:
    return ratio(t["fg3m"], t["fg3a"], 100)


def ft_pct(t: Totals) -> float | None:
    return ratio(t["ftm"], t["fta"], 100)


def efg_pct(t: Totals) -> float | None:
    """Effective FG%: a made three counts 1.5 field goals. [BR]
    (FGM + 0.5 * 3PM) / FGA"""
    return ratio(t["fgm"] + 0.5 * t["fg3m"], t["fga"], 100)


def ts_pct(t: Totals) -> float | None:
    """True shooting: points per shooting possession, counting free throws. [BR]
    PTS / (2 * (FGA + 0.44 * FTA))"""
    return ratio(t["pts"], 2 * (t["fga"] + FT_POSSESSION_FACTOR * t["fta"]), 100)


def fg3a_rate(t: Totals) -> float | None:
    """Share of field goal attempts taken from three (3PAr). [BR] 3PA / FGA"""
    return ratio(t["fg3a"], t["fga"], 100)


def fta_rate(t: Totals) -> float | None:
    """Free throw attempts per field goal attempt (FTr). [BR] FTA / FGA"""
    return ratio(t["fta"], t["fga"], 100)


# ---------------------------------------------------------------- game score

def game_score(t: Totals) -> float:
    """Hollinger's Game Score. [Hollinger, BR]
    PTS + 0.4 FGM - 0.7 FGA - 0.4 (FTA - FTM) + 0.7 ORB + 0.3 DRB + STL
    + 0.7 AST + 0.7 BLK - 0.4 PF - TOV"""
    offense, defense = game_score_split(t)
    return offense + defense


def game_score_split(t: Totals) -> tuple[float, float]:
    """Game Score's terms split into scoring/creation and the rest. This was
    the app's old "Offensive/Defensive Score"; it is retired and only kept
    for the /v1/ compatibility copy."""
    offense = (t["pts"] + 0.4 * t["fgm"] - 0.7 * t["fga"] - 0.4 * (t["fta"] - t["ftm"])
               + 0.7 * t["oreb"] + 0.7 * t["ast"] - t["tov"])
    defense = 0.3 * t["dreb"] + t["stl"] + 0.7 * t["blk"] - 0.4 * t["pf"]
    return offense, defense


# ------------------------------------------------------ possessions and pace

def _side_possessions(team: Totals, opp: Totals) -> float:
    orb_share = ratio(team["oreb"], team["oreb"] + opp["dreb"]) or 0.0
    return (team["fga"] + 0.4 * team["fta"] - 1.07 * orb_share * (team["fga"] - team["fgm"])
            + team["tov"])


def possessions(team: Totals, opp: Totals) -> float:
    """Possessions, averaging both teams' estimates. [BR, Oliver]
    0.5 * ((Tm FGA + 0.4 Tm FTA - 1.07 (Tm ORB / (Tm ORB + Opp DRB)) (Tm FGA - Tm FG) + Tm TOV)
         + (Opp FGA + 0.4 Opp FTA - 1.07 (Opp ORB / (Opp ORB + Tm DRB)) (Opp FGA - Opp FG) + Opp TOV))"""
    return 0.5 * (_side_possessions(team, opp) + _side_possessions(opp, team))


def pace(poss: float, team_min: float) -> float | None:
    """Possessions per 48 minutes. [BR] 48 * Poss / (Tm MP / 5)"""
    return ratio(48 * poss, team_min / 5)


def rating(points: float, poss: float) -> float | None:
    """Points per 100 possessions: offensive rating with points scored,
    defensive rating with points allowed. [BR, Oliver]"""
    return ratio(points, poss, 100)


# --------------------------------------------------------------- four factors

def team_tov_pct(t: Totals) -> float | None:
    """Turnovers per 100 plays. [Oliver, BR] TOV / (FGA + 0.44 FTA + TOV)"""
    return ratio(t["tov"], t["fga"] + FT_POSSESSION_FACTOR * t["fta"] + t["tov"], 100)


def team_oreb_pct(team: Totals, opp: Totals) -> float | None:
    """Share of own missed shots rebounded. [Oliver, BR] ORB / (ORB + Opp DRB)"""
    return ratio(team["oreb"], team["oreb"] + opp["dreb"], 100)


def ft_rate(t: Totals) -> float | None:
    """Free throws made per field goal attempt, the fourth factor. [Oliver, BR]
    FTM / FGA"""
    return ratio(t["ftm"], t["fga"], 100)


def pythagorean_wins(points_for: float, points_against: float, games: int) -> float | None:
    """Wins a point differential usually produces. [Morey, BR]
    G * PF^14 / (PF^14 + PA^14)"""
    if points_for <= 0 or points_against <= 0:
        return None
    k = PYTHAGOREAN_EXPONENT
    return games * points_for ** k / (points_for ** k + points_against ** k)


# ----------------------------------------------------------- team noise
# How far NBA games land from the expected margin: one standard deviation,
# in points. A rough, widely quoted figure [Winston]; to be measured from
# box scores once game summaries are in the pipeline.
GAME_MARGIN_SD = 12.0
Z95 = 1.959964


def net_rating_noise(games: int, pace: float | None) -> float | None:
    """95% half-width of a net rating from game-to-game luck alone, in points
    per 100 possessions: 1.96 * SD / sqrt(G), rescaled from points per game
    to per 100 possessions. Teams closer than this could be equally good."""
    if games <= 0 or not pace:
        return None
    return Z95 * GAME_MARGIN_SD * (100 / pace) / math.sqrt(games)


def luck_noise(games: int, points_per_game: float, margin_sd: float = GAME_MARGIN_SD) -> float | None:
    """95% half-width of wins above the Pythagorean expectation when close
    games are coin flips (no skill at winning them).

    Model: each game's margin M ~ Normal(mu, s^2). Linearized around even
    scoring, the expected win share is 1/2 + k * M with
    k = exponent / (4 * points per game), so each game adds
    Var(1[M > 0] - k M) = p (1 - p) + (k s)^2 - 2 k s phi(mu / s)
    to the gap. At mu = 0 that is 1/4 + (k s)^2 - 2 k s / sqrt(2 pi):
    about 0.30 wins per game for any s from 11 to 13 points, and slightly
    less for strong or weak teams, so this is the even-team case."""
    if games <= 0 or points_per_game <= 0:
        return None
    ks = PYTHAGOREAN_EXPONENT / (4 * points_per_game) * margin_sd
    per_game = 0.25 + ks * ks - 2 * ks / math.sqrt(2 * math.pi)
    return Z95 * math.sqrt(max(0.0, per_game) * games)


# ------------------------------------------- player shares of team play [BR]
# Each estimates the share of team events while the player is on the court,
# using his minutes as a share of team minutes.

def usg_pct(p: Totals, p_min: float, team: Totals, team_min: float) -> float | None:
    """Share of team plays a player ends with a shot, free throws or a turnover.
    100 * (FGA + 0.44 FTA + TOV) * (Tm MP / 5) / (MP * (Tm FGA + 0.44 Tm FTA + Tm TOV))"""
    plays = p["fga"] + FT_POSSESSION_FACTOR * p["fta"] + p["tov"]
    team_plays = team["fga"] + FT_POSSESSION_FACTOR * team["fta"] + team["tov"]
    return ratio(plays * (team_min / 5), p_min * team_plays, 100)


def ast_pct(p: Totals, p_min: float, team: Totals, team_min: float) -> float | None:
    """Share of teammate field goals he assisted while on the court.
    100 * AST / (((MP / (Tm MP / 5)) * Tm FG) - FG)"""
    if team_min <= 0:
        return None
    return ratio(p["ast"], (p_min / (team_min / 5)) * team["fgm"] - p["fgm"], 100)


def tov_pct(p: Totals) -> float | None:
    """Turnovers per 100 of his plays. 100 * TOV / (FGA + 0.44 FTA + TOV)"""
    return team_tov_pct(p)


def _share(count: float, p_min: float, team_min: float, pool: float) -> float | None:
    return ratio(count * (team_min / 5), p_min * pool, 100)


def oreb_pct(p: Totals, p_min: float, team: Totals, opp: Totals, team_min: float) -> float | None:
    """Share of available offensive rebounds he grabbed.
    100 * ORB * (Tm MP / 5) / (MP * (Tm ORB + Opp DRB))"""
    return _share(p["oreb"], p_min, team_min, team["oreb"] + opp["dreb"])


def dreb_pct(p: Totals, p_min: float, team: Totals, opp: Totals, team_min: float) -> float | None:
    """Share of available defensive rebounds he grabbed.
    100 * DRB * (Tm MP / 5) / (MP * (Tm DRB + Opp ORB))"""
    return _share(p["dreb"], p_min, team_min, team["dreb"] + opp["oreb"])


def reb_pct(p: Totals, p_min: float, team: Totals, opp: Totals, team_min: float) -> float | None:
    """Share of all available rebounds he grabbed.
    100 * TRB * (Tm MP / 5) / (MP * (Tm TRB + Opp TRB))"""
    return _share(p["reb"], p_min, team_min, team["reb"] + opp["reb"])


def stl_pct(p: Totals, p_min: float, opp_poss: float, team_min: float) -> float | None:
    """Share of opponent possessions ending in his steal.
    100 * STL * (Tm MP / 5) / (MP * Opp Poss)"""
    return _share(p["stl"], p_min, team_min, opp_poss)


def blk_pct(p: Totals, p_min: float, opp: Totals, team_min: float) -> float | None:
    """Share of opponent two-point attempts he blocked.
    100 * BLK * (Tm MP / 5) / (MP * (Opp FGA - Opp 3PA))"""
    return _share(p["blk"], p_min, team_min, opp["fga"] - opp["fg3a"])


# ------------------------------------------------------------ normalizing

def per_36(total: float, minutes: float) -> float | None:
    """A total scaled to 36 minutes. [BR]"""
    return ratio(total, minutes, 36)


def player_possessions(p_min: float, team_poss: float, team_min: float) -> float | None:
    """Team possessions while he was on the court, estimated from his share of
    team minutes. [BR] Poss * MP / (Tm MP / 5)"""
    return ratio(team_poss * p_min, team_min / 5)


def per_100(total: float, player_poss: float | None) -> float | None:
    """A total scaled to 100 possessions on the court. [BR]"""
    return None if not player_poss else ratio(total, player_poss, 100)

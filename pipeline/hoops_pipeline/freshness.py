"""Is ESPN's season data caught up with the games already played?

ESPN's stats feeds finish updating hours after the last game ends, and a
morning run can read yesterday's totals. Three feeds have to agree before a
run may publish:

- standings (wins + losses) count every final game almost at once;
- the team stats feed must show the same games played for every team;
- the player feed's points must add up to the team feed's points, since
  every point is scored by a player.

If any check fails the run publishes nothing and tries again later.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import config


@dataclass
class Freshness:
    problems: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.problems


def check(
    standings_games: dict[str, int],
    team_games: dict[str, int],
    player_points: float,
    team_points: float,
    tolerance: float = config.FRESHNESS_POINTS_TOLERANCE,
) -> Freshness:
    result = Freshness()
    only_one = sorted(set(standings_games) ^ set(team_games))
    if only_one:
        result.problems.append(f"Teams in only one of standings and team stats: {', '.join(only_one)}")
    behind = [
        f"{team} {team_games[team]} vs {games}"
        for team, games in sorted(standings_games.items())
        if team in team_games and team_games[team] != games
    ]
    if behind:
        result.problems.append("Team stats games differ from standings: " + ", ".join(behind))
    if abs(player_points - team_points) > tolerance:
        result.problems.append(
            f"Player points add up to {player_points:.0f} but team points to {team_points:.0f}"
        )
    return result

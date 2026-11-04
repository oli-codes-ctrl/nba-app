"""Pipeline settings. Values can be overridden with environment variables."""

from __future__ import annotations

import os
from datetime import date

SCHEMA_VERSION = 1

# ESPN's public (unofficial, undocumented) stats feeds. No key needed.
ESPN_BULK_URL = (
    "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete"
)
ESPN_CORE_STATS_URL = (
    "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/{year}"
    "/types/2/athletes/{athlete_id}/statistics"
)
ESPN_BYTEAM_URL = (
    "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byteam"
)
ESPN_STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings"
ESPN_PAGE_LIMIT = 500  # one page covers the whole league
# Be polite to an unofficial API: about 4 requests per second.
ESPN_REQUESTS_PER_SECOND = float(os.environ.get("ESPN_RPS", "4"))
USER_AGENT = "hoops-analytics-pipeline/0.1 (nightly; github actions)"

# Qualification for percentiles and games.
QUAL_MIN_MPG = 10.0
QUAL_MIN_GP_FLOOR = 3
QUAL_GP_FRACTION = 0.20  # of the most games any team has played

# Shooting percentages need enough attempts to rank, scaled to the season so
# far: needed = max(floor, rate * most team games). Entries are
# stat -> (attempt total it counts, attempts per team game, floor).
# The rates sit at rotation-player volume: about 246 FGA, 123 3PA and 82 FTA
# over 82 games. (The NBA's own leaderboards are stricter and count makes:
# 300 FGM, 82 3PM, 125 FTM; those suit a top-10 list, not a percentile pool.)
ATTEMPT_MINIMUMS: dict[str, tuple[str, float, int]] = {
    "fg_pct": ("fga", 3.0, 20),
    "efg_pct": ("fga", 3.0, 20),
    "ts_pct": ("fga", 3.0, 20),
    "fg2_pct": ("fg2a", 2.0, 15),
    "fg3_pct": ("fg3a", 1.5, 10),
    "ft_pct": ("fta", 1.0, 10),
}

# Freshness gate. ESPN's stats feeds finish updating some hours after the
# last game ends. A run publishes only when the team feed's games match the
# standings and the players' points add up to the teams' points. One missing
# game is worth 150+ points, so a small tolerance only absorbs scoring fixes.
FRESHNESS_POINTS_TOLERANCE = 20

# Publishing guard: refuse to publish a suspiciously small player list.
MIN_PLAYERS_TO_PUBLISH = int(os.environ.get("MIN_PLAYERS_TO_PUBLISH", "300"))

# Refuse to publish if the per-player rebound split failed for too many players.
MAX_REBOUND_SPLIT_MISSING_SHARE = 0.10

# Daily puzzle.
PUZZLE_POOL_SIZE = 30
PUZZLE_NO_REPEAT_DAYS = 30
PUZZLE_TIMEZONE = "America/New_York"


def current_season(today: date) -> int:
    """Season = start year. 2026 means the 2026-27 season."""
    override = os.environ.get("SEASON")
    if override:
        return int(override)
    return today.year if today.month >= 10 else today.year - 1


def espn_year(season: int) -> int:
    """ESPN labels a season by its end year: 2026-27 is 2027."""
    return season + 1

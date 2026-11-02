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
ESPN_PAGE_LIMIT = 500  # one page covers the whole league
# Be polite to an unofficial API: about 4 requests per second.
ESPN_REQUESTS_PER_SECOND = float(os.environ.get("ESPN_RPS", "4"))
USER_AGENT = "hoops-analytics-pipeline/0.1 (nightly; github actions)"

# Qualification for percentiles and games.
QUAL_MIN_MPG = 10.0
QUAL_MIN_GP_FLOOR = 3
QUAL_GP_FRACTION = 0.20  # of the most games any team has played

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

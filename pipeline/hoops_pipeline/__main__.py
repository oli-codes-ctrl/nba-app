"""CLI entry point.

    python -m hoops_pipeline nightly    --state DIR --out DIR   # fetch from ESPN and publish
    python -m hoops_pipeline build-only --state DIR --out DIR   # rebuild from saved state, no network

Exit codes for `nightly`:
    0   published new output to --out
    75  ESPN's feeds have not caught up with last night's games; nothing
        written, try again later
    76  these games are already published; nothing written (use --force to
        publish anyway)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from . import config, espn, freshness, puzzles, recent
from .aggregate import attempt_minimums, mark_qualified
from .http_client import JsonClient
from .publish import PublishError, build_player_records, write_outputs

log = logging.getLogger("hoops_pipeline")

EXIT_STALE = 75
EXIT_UP_TO_DATE = 76
PUBLISHED_FILE = "published.json"


def load_published(state_dir: Path) -> date | None:
    """The games-through date of the last successful publish."""
    path = state_dir / PUBLISHED_FILE
    if not path.exists():
        return None
    return date.fromisoformat(json.loads(path.read_text(encoding="utf-8"))["gamesThrough"])


def save_published(state_dir: Path, games_through: date) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / PUBLISHED_FILE).write_text(
        json.dumps({"gamesThrough": games_through.isoformat()}), encoding="utf-8")


def main(argv: list[str] | None = None, client: JsonClient | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hoops_pipeline")
    parser.add_argument("command", choices=["nightly", "build-only"])
    parser.add_argument("--state", type=Path, required=True, help="pipeline state directory")
    parser.add_argument("--out", type=Path, required=True, help="publish directory")
    parser.add_argument("--today", type=date.fromisoformat, help="override today's date (testing)")
    parser.add_argument("--min-players", type=int, default=config.MIN_PLAYERS_TO_PUBLISH)
    parser.add_argument("--force", action="store_true",
                        help="publish even if these games were already published")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    # Runs happen in the morning, US Eastern: the data covers games through
    # yesterday once ESPN has caught up.
    today = args.today or datetime.now(ZoneInfo(config.PUZZLE_TIMEZONE)).date()
    season = config.current_season(today)
    cached_splits = espn.load_splits(args.state)

    if args.command == "nightly":
        games_through = today - timedelta(days=1)
        client = client or JsonClient()
        standings_games = espn.parse_standings(espn.fetch_standings(client, season))
        team_games, team_points = espn.parse_team_feed(espn.fetch_byteam(client, season))
        bulk = espn.fetch_bulk(client, season)
        lines = espn.parse_bulk(bulk)
        log.info("ESPN bulk feed: %d players with minutes", len(lines))

        report = freshness.check(standings_games, team_games,
                                 sum(ln.totals.get("pts", 0) for ln in lines), team_points)
        if not report.ok:
            for problem in report.problems:
                log.warning(problem)
            log.warning("ESPN's stats have not caught up with games through %s; not publishing.",
                        games_through)
            return EXIT_STALE

        last = load_published(args.state)
        if last is not None and last >= games_through and not args.force:
            log.info("Games through %s are already published; nothing to do.", last)
            return EXIT_UP_TO_DATE

        splits, missing = espn.fetch_rebound_splits(
            client, season, [ln.pid for ln in lines], cached_splits)
        if lines and missing / len(lines) > config.MAX_REBOUND_SPLIT_MISSING_SHARE:
            raise PublishError(f"Rebound split missing for {missing} of {len(lines)} players")
    else:
        bulk = espn.load_bulk(args.state)
        if bulk is None:
            raise PublishError("No saved ESPN data in state; run 'nightly' first")
        lines = espn.parse_bulk(bulk)
        splits = cached_splits
        games_through = load_published(args.state) or today - timedelta(days=1)

    espn.apply_rebound_splits(lines, splits)
    mark_qualified(lines)
    records, pool_size = build_player_records(lines)

    totals_history = recent.load_history(args.state)
    recent_info, recent_by_player = recent.compute(totals_history, games_through, lines)
    for rec in records:
        rec.update(recent_by_player.get(rec["id"], {}))

    history = puzzles.load_history(args.state)
    window = puzzles.ensure_window(today, season, records, history)

    v_dir = write_outputs(
        args.out, season, records, pool_size, window, games_through.isoformat(),
        min_players=args.min_players,
        extra={"minAttempts": attempt_minimums(lines), **recent_info},
    )
    # Save state only after a successful publish build.
    espn.save_state(args.state, bulk, splits)
    puzzles.save_history(args.state, history)
    if args.command == "nightly":
        recent.record(totals_history, games_through, lines)
        recent.save_history(args.state, totals_history)
        save_published(args.state, games_through)
    log.info("Wrote %d players (%d qualified), games through %s, to %s", len(records),
             sum(1 for r in records if r["q"]), games_through, v_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())

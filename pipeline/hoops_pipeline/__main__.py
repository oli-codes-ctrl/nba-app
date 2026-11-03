"""CLI entry point.

    python -m hoops_pipeline nightly    --state DIR --out DIR   # fetch from ESPN and publish
    python -m hoops_pipeline build-only --state DIR --out DIR   # rebuild from saved state, no network
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from . import config, espn, puzzles, recent
from .aggregate import mark_qualified
from .http_client import JsonClient
from .publish import PublishError, build_player_records, write_outputs

log = logging.getLogger("hoops_pipeline")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hoops_pipeline")
    parser.add_argument("command", choices=["nightly", "build-only"])
    parser.add_argument("--state", type=Path, required=True, help="pipeline state directory")
    parser.add_argument("--out", type=Path, required=True, help="publish directory")
    parser.add_argument("--today", type=date.fromisoformat, help="override today's date (testing)")
    parser.add_argument("--min-players", type=int, default=config.MIN_PLAYERS_TO_PUBLISH)
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    today = args.today or datetime.now(ZoneInfo(config.PUZZLE_TIMEZONE)).date()
    season = config.current_season(today)
    cached_splits = espn.load_splits(args.state)

    if args.command == "nightly":
        client = JsonClient()
        bulk = espn.fetch_bulk(client, season)
        lines = espn.parse_bulk(bulk)
        log.info("ESPN bulk feed: %d players with minutes", len(lines))
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

    espn.apply_rebound_splits(lines, splits)
    mark_qualified(lines)
    records, pool_size = build_player_records(lines)

    totals_history = recent.load_history(args.state)
    recent_info, recent_by_player = recent.compute(totals_history, today, lines)
    for rec in records:
        rec.update(recent_by_player.get(rec["id"], {}))

    history = puzzles.load_history(args.state)
    window = puzzles.ensure_window(today, season, records, history)

    v_dir = write_outputs(
        args.out, season, records, pool_size, window, today.isoformat(),
        min_players=args.min_players, extra=recent_info,
    )
    # Save state only after a successful publish build.
    espn.save_state(args.state, bulk, splits)
    puzzles.save_history(args.state, history)
    if args.command == "nightly":
        recent.record(totals_history, today, lines)
        recent.save_history(args.state, totals_history)
    log.info("Wrote %d players (%d qualified) to %s", len(records),
             sum(1 for r in records if r["q"]), v_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())

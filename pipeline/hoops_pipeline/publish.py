"""Build the published JSON files and write them under <out>/v1/."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config
from .aggregate import SeasonLine, attempt_minimums, attempts, fold_name
from .metrics import LOWER_IS_BETTER, PERCENTILE_STATS, compute_stats
from .percentiles import compute_percentiles

REQUIRED_PLAYER_KEYS = ("id", "name", "searchName", "team", "teams", "pos", "q", "s")
REQUIRED_STATS = ("gp", "mpg", "pts", "reb", "ast", "stl", "blk", "tov", "pf")


class PublishError(RuntimeError):
    pass


def build_player_records(lines: list[SeasonLine]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    stats = {ln.pid: compute_stats(ln) for ln in lines}
    qualified = {ln.pid for ln in lines if ln.qualified}
    att = {ln.pid: attempts(ln) for ln in lines}
    # Shooting percentages are ranked only among players with enough attempts.
    pools = {
        stat: {pid for pid in qualified if att[pid][str(rule["by"])] >= int(rule["min"])}
        for stat, rule in attempt_minimums(lines).items()
    }
    pct, rank, pool_size = compute_percentiles(stats, qualified, PERCENTILE_STATS, pools)
    records = []
    for ln in lines:
        rec: dict[str, Any] = {
            "id": ln.pid,
            "name": ln.name,
            "searchName": fold_name(ln.name),
            "team": ln.team,
            "teams": ln.teams,
            "conf": ln.conference,
            "pos": ln.position,
            "q": ln.qualified,
            "s": stats[ln.pid],
            "att": att[ln.pid],
        }
        if ln.qualified:
            rec["pct"] = pct[ln.pid]
            rec["rank"] = rank[ln.pid]
        records.append(rec)
    return records, pool_size


def validate(records: list[dict[str, Any]], min_players: int) -> None:
    if len(records) < min_players:
        raise PublishError(f"Only {len(records)} players (minimum {min_players}); refusing to publish")
    for rec in records:
        missing = [k for k in REQUIRED_PLAYER_KEYS if k not in rec]
        missing += [f"s.{k}" for k in REQUIRED_STATS if rec["s"].get(k) is None]
        if missing:
            raise PublishError(f"Player {rec.get('id')} is missing {missing}")
    if not any(r["q"] for r in records):
        raise PublishError("No qualified players")


def _dump(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def write_outputs(
    out_dir: Path,
    season: int,
    records: list[dict[str, Any]],
    pool_size: dict[str, int],
    puzzles: list[dict[str, Any]],
    as_of: str,
    min_players: int = config.MIN_PLAYERS_TO_PUBLISH,
    now: datetime | None = None,
    extra: dict[str, Any] | None = None,
) -> Path:
    validate(records, min_players)
    v_dir = out_dir / f"v{config.SCHEMA_VERSION}"
    v_dir.mkdir(parents=True, exist_ok=True)

    players_doc = {
        "schemaVersion": config.SCHEMA_VERSION,
        "season": season,
        "poolSize": pool_size,
        "lowerIsBetter": sorted(LOWER_IS_BETTER),
        # Optional additions (recent form). Absent until there is history.
        **(extra or {}),
        "players": records,
    }
    players_bytes = _dump(players_doc)
    digest = hashlib.sha256(players_bytes).hexdigest()[:12]
    players_name = f"players.{digest}.json"

    for old in v_dir.glob("players.*.json"):
        if old.name != players_name:
            old.unlink()
    (v_dir / players_name).write_bytes(players_bytes)
    (v_dir / "puzzles.json").write_bytes(_dump({"schemaVersion": config.SCHEMA_VERSION, "puzzles": puzzles}))

    manifest = {
        "schemaVersion": config.SCHEMA_VERSION,
        "season": season,
        "generatedAt": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        # The last day whose games are all included (US Eastern date).
        "asOf": as_of,
        "gamesThrough": as_of,
        "source": "ESPN",
        "playerCount": len(records),
        "qualifiedCount": sum(1 for r in records if r["q"]),
        "files": {"players": players_name, "puzzles": "puzzles.json"},
    }
    (v_dir / "manifest.json").write_bytes(_dump(manifest))
    return v_dir

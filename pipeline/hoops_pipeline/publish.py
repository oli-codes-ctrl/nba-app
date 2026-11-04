"""Build the published JSON files and write them under <out>/v2/.

<out>/v1/ is a compatibility copy in the old format (it still carries the
retired Offensive/Defensive Score) so app builds that read /v1/ keep working
until they update. Remove it once no client reads /v1/.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config
from .aggregate import SeasonLine, attempt_minimums, attempts, fold_name
from .metrics import LOWER_IS_BETTER, PERCENTILE_STATS, V1_ONLY_STATS, compute_stats, v1_stats
from .percentiles import compute_percentiles
from .teamstats import Team, player_context

REQUIRED_PLAYER_KEYS = ("id", "name", "searchName", "team", "teams", "pos", "q", "s")
REQUIRED_STATS = ("gp", "mpg", "pts", "reb", "ast", "stl", "blk", "tov", "pf")
V1 = 1


class PublishError(RuntimeError):
    pass


def build_player_records(
    lines: list[SeasonLine],
    teams: dict[str, Team] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Player records with stats, attempts, percentiles and ranks. With
    `teams`, each player is measured against his team (or the average of
    his teams if traded) for usage, the other shares and per-100 stats."""
    stats = {
        ln.pid: compute_stats(ln, player_context(teams, ln.teams) if teams else None)
        for ln in lines
    }
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


def v1_records(
    records: list[dict[str, Any]], lines: list[SeasonLine],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """The /v1/ copy: the same records plus the retired Off/Def scores and
    their percentiles."""
    extra = {ln.pid: v1_stats(ln) for ln in lines}
    qualified = {r["id"] for r in records if r["q"]}
    pct, rank, pool_size = compute_percentiles(extra, qualified, V1_ONLY_STATS)
    out = []
    for r in records:
        rec = {**r, "s": {**r["s"], **extra[r["id"]]}}
        if r["q"]:
            rec["pct"] = {**r["pct"], **pct[r["id"]]}
            rec["rank"] = {**r["rank"], **rank[r["id"]]}
        out.append(rec)
    return out, pool_size


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


def _write_hashed(v_dir: Path, stem: str, doc: dict[str, Any]) -> str:
    """Write <stem>.<hash>.json (removing older copies) and return its name."""
    data = _dump(doc)
    name = f"{stem}.{hashlib.sha256(data).hexdigest()[:12]}.json"
    for old in v_dir.glob(f"{stem}.*.json"):
        if old.name != name:
            old.unlink()
    (v_dir / name).write_bytes(data)
    return name


def _write_version(
    out_dir: Path,
    version: int,
    season: int,
    records: list[dict[str, Any]],
    pool_size: dict[str, int],
    puzzles: list[dict[str, Any]],
    as_of: str,
    generated: datetime,
    extra: dict[str, Any] | None,
    teams: dict[str, Any] | None,
) -> Path:
    v_dir = out_dir / f"v{version}"
    v_dir.mkdir(parents=True, exist_ok=True)
    players_name = _write_hashed(v_dir, "players", {
        "schemaVersion": version,
        "season": season,
        "poolSize": pool_size,
        "lowerIsBetter": sorted(LOWER_IS_BETTER),
        # Optional additions (attempt minimums, recent form).
        **(extra or {}),
        "players": records,
    })
    files = {"players": players_name, "puzzles": "puzzles.json"}
    (v_dir / "puzzles.json").write_bytes(_dump({"schemaVersion": version, "puzzles": puzzles}))
    if teams is not None:
        files["teams"] = _write_hashed(v_dir, "teams", {
            "schemaVersion": version, "season": season, "gamesThrough": as_of, **teams,
        })
    manifest = {
        "schemaVersion": version,
        "season": season,
        "generatedAt": generated.isoformat(timespec="seconds"),
        # The last day whose games are all included (US Eastern date).
        "asOf": as_of,
        "gamesThrough": as_of,
        "source": "ESPN",
        "playerCount": len(records),
        "qualifiedCount": sum(1 for r in records if r["q"]),
        "files": files,
    }
    (v_dir / "manifest.json").write_bytes(_dump(manifest))
    return v_dir


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
    teams: dict[str, Any] | None = None,
    v1: tuple[list[dict[str, Any]], dict[str, int]] | None = None,
) -> Path:
    """Write /v2/ (and the /v1/ copy when `v1` is given). Returns the /v2/ path."""
    validate(records, min_players)
    generated = now or datetime.now(timezone.utc)
    v_dir = _write_version(out_dir, config.SCHEMA_VERSION, season, records, pool_size,
                           puzzles, as_of, generated, extra, teams)
    if v1 is not None:
        v1_recs, v1_pool = v1
        _write_version(out_dir, V1, season, v1_recs, {**pool_size, **v1_pool},
                       puzzles, as_of, generated, extra, None)
    return v_dir

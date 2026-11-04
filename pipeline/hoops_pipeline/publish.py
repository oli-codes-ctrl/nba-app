"""Build the published JSON files and write them under <out>/v2/.

<out>/v1/ is a compatibility copy in the old format (it still carries the
retired Offensive/Defensive Score) so app builds that read /v1/ keep working
until they update. Remove it once no client reads /v1/.
"""

from __future__ import annotations

import hashlib
import json
import logging
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config
from .aggregate import SeasonLine, attempt_minimums, attempts, fold_name
from .metrics import LOWER_IS_BETTER, PERCENTILE_STATS, V1_ONLY_STATS, compute_ranges, compute_stats, v1_stats
from .percentiles import compute_percentiles
from .samples import (
    BetaPrior,
    fit_beta_binomial,
    posterior_interval,
    separates_shooters,
    shrink,
    wilson,
)
from .teamstats import Team, player_context

REQUIRED_PLAYER_KEYS = ("id", "name", "searchName", "team", "teams", "pos", "q", "s")
REQUIRED_STATS = ("gp", "mpg", "pts", "reb", "ast", "stl", "blk", "tov", "pf")
V1 = 1
log = logging.getLogger(__name__)

# Percentiles are also computed within each position group.
POSITION_GROUPS = ("G", "F", "C")

# Makes-over-attempts stats: (makes, attempts) from season totals.
PROPORTIONS = {
    "fg_pct": lambda t: (t.get("fgm", 0), t.get("fga", 0)),
    "fg2_pct": lambda t: (t.get("fgm", 0) - t.get("fg3m", 0), t.get("fga", 0) - t.get("fg3a", 0)),
    "fg3_pct": lambda t: (t.get("fg3m", 0), t.get("fg3a", 0)),
    "ft_pct": lambda t: (t.get("ftm", 0), t.get("fta", 0)),
}
# Shrunk toward the league rate. FG% and 2P% are left out on purpose: they
# depend so much on shot location that a league-wide prior would drag every
# center down and every guard up.
SHRUNK_STATS = ("fg3_pct", "ft_pct")


class PublishError(RuntimeError):
    pass


def fit_shrinkage(lines: list[SeasonLine]) -> dict[str, BetaPrior]:
    """League priors for the shrunk stats, fitted on qualified players. A
    stat is left out while its data cannot yet separate shooters (early in
    the season for 3P%); its uncertainty range still tells the story."""
    priors: dict[str, BetaPrior] = {}
    for stat in SHRUNK_STATS:
        pairs = [PROPORTIONS[stat](ln.totals) for ln in lines if ln.qualified]
        prior = fit_beta_binomial([(int(k), int(n)) for k, n in pairs])
        if prior is None:
            continue
        if separates_shooters(prior):
            priors[stat] = prior
        else:
            log.info("%s: shooters not yet distinguishable from chance; no estimates published", stat)
    return priors


def build_player_records(
    lines: list[SeasonLine],
    teams: dict[str, Team] | None = None,
    priors: dict[str, BetaPrior] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Player records with stats, attempts, uncertainty ranges, sample-adjusted
    estimates, and percentiles and ranks among all qualified players and
    within the player's position. With `teams`, each player is measured
    against his team (or the average of his teams if traded) for usage, the
    other shares and per-100 stats."""
    if priors is None:
        priors = fit_shrinkage(lines)
    contexts = {ln.pid: player_context(teams, ln.teams) if teams else None for ln in lines}
    stats = {ln.pid: compute_stats(ln, contexts[ln.pid]) for ln in lines}
    qualified = {ln.pid for ln in lines if ln.qualified}
    att = {ln.pid: attempts(ln) for ln in lines}
    # Shooting percentages are ranked only among players with enough attempts.
    pools = {
        stat: {pid for pid in qualified if att[pid][str(rule["by"])] >= int(rule["min"])}
        for stat, rule in attempt_minimums(lines).items()
    }
    pct, rank, pool_size = compute_percentiles(stats, qualified, PERCENTILE_STATS, pools)
    pos_pct: dict[int, dict[str, float]] = {}
    pos_rank: dict[int, dict[str, int]] = {}
    for group in POSITION_GROUPS:
        members = {ln.pid for ln in lines if ln.qualified and ln.position == group}
        g_pct, g_rank, _ = compute_percentiles(stats, members, PERCENTILE_STATS, pools)
        pos_pct.update(g_pct)
        pos_rank.update(g_rank)
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
        ci: dict[str, list[float]] = {}
        for stat, makes_attempts in PROPORTIONS.items():
            makes, tries = makes_attempts(ln.totals)
            # With a sample-adjusted estimate, the range comes from the same
            # model so the estimate sits inside it; otherwise Wilson.
            interval = (
                posterior_interval(int(makes), int(tries), priors[stat])
                if stat in priors and tries > 0
                else wilson(int(makes), int(tries))
            )
            if interval is not None:
                # Whole percentages: a range this wide has no meaningful tenths.
                ci[stat] = [round(interval[0]), round(interval[1])]
        if ln.qualified:
            # Counts, points, efficiency and shares: only ranked players
            # need them (rank bands and gated insights in the app).
            ci.update(compute_ranges(ln, contexts[ln.pid]))
        if ci:
            rec["ci"] = ci
        adj: dict[str, float] = {}
        for stat in SHRUNK_STATS:
            makes, tries = PROPORTIONS[stat](ln.totals)
            if stat in priors and tries > 0:
                adj[stat] = round(shrink(int(makes), int(tries), priors[stat]), 1)
        if adj:
            rec["adj"] = adj
        if ln.qualified:
            rec["pct"] = pct[ln.pid]
            rec["rank"] = rank[ln.pid]
            if ln.pid in pos_pct:
                rec["pctPos"] = pos_pct[ln.pid]
                rec["rankPos"] = pos_rank[ln.pid]
        records.append(rec)
    return records, pool_size


def _median(values: list[float]) -> float | None:
    return round(statistics.median(values), 1) if values else None


def doc_extras(records: list[dict[str, Any]], priors: dict[str, BetaPrior]) -> dict[str, Any]:
    """File-level context for samples and position pools: pool sizes by
    position, medians of ranked players (all and by position), and the
    shrinkage priors."""
    ranked = [r for r in records if r["q"]]
    by_group = {g: [r for r in ranked if r["pos"] == g] for g in POSITION_GROUPS}

    def medians(rows: list[dict[str, Any]], key: str) -> dict[str, float | None]:
        return {
            stat: _median([r["s"][stat] for r in rows if stat in r.get(key, {})])
            for stat in PERCENTILE_STATS
        }

    return {
        "poolSizePos": {
            g: {stat: sum(1 for r in rows if stat in r.get("pctPos", {})) for stat in PERCENTILE_STATS}
            for g, rows in by_group.items()
        },
        "medians": {"all": medians(ranked, "pct"), **{g: medians(rows, "pctPos") for g, rows in by_group.items()}},
        "shrinkage": {
            stat: {"mean": round(100 * p.mean, 1), "strength": round(p.strength)}
            for stat, p in priors.items()
        },
    }


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
        if "ci" in r:
            # Old clients word every range as a shooting percentage.
            rec["ci"] = {k: v for k, v in r["ci"].items() if k in PROPORTIONS}
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
    games: dict[str, Any] | None = None,
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
    if games is not None:
        files["games"] = _write_hashed(v_dir, "games", {
            "schemaVersion": version, "season": season, "gamesThrough": as_of, **games,
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
    games: dict[str, Any] | None = None,
) -> Path:
    """Write /v2/ (and the /v1/ copy when `v1` is given). Returns the /v2/ path.
    Game logs (`games`) are published in /v2/ only."""
    validate(records, min_players)
    generated = now or datetime.now(timezone.utc)
    v_dir = _write_version(out_dir, config.SCHEMA_VERSION, season, records, pool_size,
                           puzzles, as_of, generated, extra, teams, games)
    if v1 is not None:
        v1_recs, v1_pool = v1
        _write_version(out_dir, V1, season, v1_recs, {**pool_size, **v1_pool},
                       puzzles, as_of, generated, extra, None)
    return v_dir

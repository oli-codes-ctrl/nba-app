"""Fetch and parse ESPN's season stats.

Two sources:
- The bulk "byathlete" feed: every player's season totals, age and team in
  one request. Traded players come back as one combined line.
- The per-player "core" stats feed, used only for the offensive/defensive
  rebound split, which the bulk feed lacks.
"""

from __future__ import annotations

import gzip
import json
import logging
from pathlib import Path
from typing import Any

from . import config
from .aggregate import SeasonLine
from .http_client import FetchError, JsonClient
from .teams import standard_abbr

log = logging.getLogger(__name__)

BULK_STATE_FILE = "espn_bulk.json.gz"
SPLIT_STATE_FILE = "rebound_splits.json"
TEAM_STATE_FILE = "team_totals.json"

# (category, ESPN stat name) -> our total key
BULK_TOTALS = {
    ("general", "gamesPlayed"): "gp",
    ("general", "minutes"): "min",
    ("general", "rebounds"): "reb",
    ("general", "fouls"): "pf",
    ("offensive", "points"): "pts",
    ("offensive", "fieldGoalsMade"): "fgm",
    ("offensive", "fieldGoalsAttempted"): "fga",
    ("offensive", "threePointFieldGoalsMade"): "fg3m",
    ("offensive", "threePointFieldGoalsAttempted"): "fg3a",
    ("offensive", "freeThrowsMade"): "ftm",
    ("offensive", "freeThrowsAttempted"): "fta",
    ("offensive", "assists"): "ast",
    ("offensive", "turnovers"): "tov",
    ("defensive", "steals"): "stl",
    ("defensive", "blocks"): "blk",
}


class EspnFormatError(RuntimeError):
    pass


# ---------------------------------------------------------------- bulk feed

def fetch_bulk(client: JsonClient, season: int) -> dict[str, Any]:
    year = config.espn_year(season)
    params = {
        "region": "us", "lang": "en", "contentorigin": "espn",
        "isqualified": "false", "season": year, "seasontype": 2,
        "limit": config.ESPN_PAGE_LIMIT, "sort": "general.avgMinutes:desc",
    }
    first = client.get(config.ESPN_BULK_URL, {**params, "page": 1})
    athletes = list(first.get("athletes", []))
    pages = int((first.get("pagination") or {}).get("pages") or 1)
    for page in range(2, pages + 1):
        athletes += client.get(config.ESPN_BULK_URL, {**params, "page": page}).get("athletes", [])
    first["athletes"] = athletes

    requested = first.get("requestedSeason") or {}
    if requested.get("year") != year or (requested.get("type") or {}).get("type") != 2:
        raise EspnFormatError(f"ESPN returned season {requested.get('displayName')!r}, expected {year} regular season")
    return first


def _category_index(raw: dict[str, Any]) -> dict[str, list[str]]:
    return {c["name"]: c["names"] for c in raw.get("categories", [])}


def parse_bulk(raw: dict[str, Any]) -> list[SeasonLine]:
    names_by_cat = _category_index(raw)
    for (cat, stat) in BULK_TOTALS:
        if stat not in names_by_cat.get(cat, []):
            raise EspnFormatError(f"ESPN feed no longer has {cat}.{stat}")

    lines: list[SeasonLine] = []
    for entry in raw.get("athletes", []):
        ath = entry["athlete"]
        values: dict[str, float] = {}
        for cat in entry.get("categories", []):
            names = names_by_cat.get(cat["name"], [])
            for name, value in zip(names, cat.get("values", [])):
                key = BULK_TOTALS.get((cat["name"], name))
                if key is not None:
                    values[key] = float(value or 0)
        gp = int(values.get("gp", 0))
        minutes = values.pop("min", 0.0)
        if gp <= 0 or minutes <= 0:
            continue
        values.pop("gp", None)

        team = standard_abbr(ath.get("teamShortName"))
        teams = [team] if team else []
        for t in ath.get("teams", []):
            abbr = standard_abbr(t.get("abbreviation"))
            if abbr and abbr not in teams:
                teams.append(abbr)

        lines.append(SeasonLine(
            pid=int(ath["id"]),
            name=ath.get("displayName") or f"{ath.get('firstName', '')} {ath.get('lastName', '')}".strip(),
            position=(ath.get("position") or {}).get("abbreviation", ""),
            age=ath.get("age"),
            team=team,
            teams=teams,
            gp=gp,
            minutes=minutes,
            totals={k: int(round(v)) for k, v in values.items()},
        ))
    lines.sort(key=lambda ln: ln.pid)
    return lines


# ------------------------------------------------- team totals and standings

def fetch_byteam(client: JsonClient, season: int) -> dict[str, Any]:
    """Season totals for all 30 teams, own (splitId 0) and opponent (900)."""
    year = config.espn_year(season)
    raw = client.get(config.ESPN_BYTEAM_URL, {
        "region": "us", "lang": "en", "contentorigin": "espn",
        "season": year, "seasontype": 2,
    })
    requested = raw.get("requestedSeason") or {}
    if requested.get("year") != year or (requested.get("type") or {}).get("type") != 2:
        raise EspnFormatError(f"ESPN team feed returned {requested.get('displayName')!r}, expected {year} regular season")
    return raw


# (category, ESPN stat name) -> our total key, for team and opponent totals.
TEAM_TOTALS = {
    ("general", "gamesPlayed"): "gp",
    ("general", "rebounds"): "reb",
    ("general", "fouls"): "pf",
    ("offensive", "points"): "pts",
    ("offensive", "fieldGoalsMade"): "fgm",
    ("offensive", "fieldGoalsAttempted"): "fga",
    ("offensive", "threePointFieldGoalsMade"): "fg3m",
    ("offensive", "threePointFieldGoalsAttempted"): "fg3a",
    ("offensive", "freeThrowsMade"): "ftm",
    ("offensive", "freeThrowsAttempted"): "fta",
    ("offensive", "offensiveRebounds"): "oreb",
    ("offensive", "assists"): "ast",
    ("offensive", "turnovers"): "tov",
    ("defensive", "defensiveRebounds"): "dreb",
    ("defensive", "steals"): "stl",
    ("defensive", "blocks"): "blk",
}
OWN_SPLIT, OPPONENT_SPLIT = "0", "900"


def parse_team_totals(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return {team: {"gp": games, "own": totals, "opp": opponents' totals}}."""
    names: dict[str, list[str]] = {}
    for cat in raw.get("categories", []):
        if cat.get("names"):
            names.setdefault(cat["name"], cat["names"])
    for (cat, stat) in TEAM_TOTALS:
        if stat not in names.get(cat, []):
            raise EspnFormatError(f"ESPN team feed no longer has {cat}.{stat}")
    out: dict[str, dict[str, Any]] = {}
    for entry in raw.get("teams", []):
        abbr = standard_abbr((entry.get("team") or {}).get("abbreviation"))
        sides: dict[str, dict[str, float]] = {OWN_SPLIT: {}, OPPONENT_SPLIT: {}}
        for cat in entry.get("categories", []):
            side = sides.get(str(cat.get("splitId")))
            if side is None:
                continue  # the differential split
            for name, value in zip(names.get(cat["name"], []), cat.get("values", [])):
                key = TEAM_TOTALS.get((cat["name"], name))
                if key is not None:
                    side[key] = float(value or 0)
        own, opp = sides[OWN_SPLIT], sides[OPPONENT_SPLIT]
        missing = [k for k in TEAM_TOTALS.values() if k not in own or (k != "gp" and k not in opp)]
        if missing:
            raise EspnFormatError(f"ESPN team feed is missing {missing} for {abbr}")
        gp = int(own.pop("gp"))
        opp.pop("gp", None)
        out[abbr] = {"gp": gp, "own": own, "opp": opp}
    return out


def parse_team_feed(raw: dict[str, Any]) -> tuple[dict[str, int], float]:
    """Return ({team: games played}, league total points) from the team feed."""
    totals = parse_team_totals(raw)
    if len(totals) != 30:
        raise EspnFormatError(f"ESPN team feed has {len(totals)} teams, expected 30")
    return {abbr: t["gp"] for abbr, t in totals.items()}, sum(t["own"]["pts"] for t in totals.values())


def fetch_standings(client: JsonClient, season: int) -> dict[str, Any]:
    return client.get(config.ESPN_STANDINGS_URL, {"season": config.espn_year(season)})


def parse_standings(raw: dict[str, Any]) -> dict[str, dict[str, int]]:
    """Return {team: {"w": wins, "l": losses}} from the standings."""
    records: dict[str, dict[str, int]] = {}
    for group in raw.get("children", []):
        for entry in (group.get("standings") or {}).get("entries", []):
            stats = {s.get("name"): s.get("value") for s in entry.get("stats", [])}
            if stats.get("wins") is None or stats.get("losses") is None:
                raise EspnFormatError("ESPN standings no longer have wins and losses")
            abbr = standard_abbr((entry.get("team") or {}).get("abbreviation"))
            records[abbr] = {"w": int(stats["wins"]), "l": int(stats["losses"])}
    if len(records) != 30:
        raise EspnFormatError(f"ESPN standings have {len(records)} teams, expected 30")
    return records


def standings_games(records: dict[str, dict[str, int]]) -> dict[str, int]:
    """Games played (wins + losses) per team."""
    return {abbr: r["w"] + r["l"] for abbr, r in records.items()}


# ------------------------------------------------------ rebound split (core)

def parse_core_rebounds(raw: dict[str, Any]) -> tuple[int, int] | None:
    found: dict[str, float] = {}
    for cat in (raw.get("splits") or {}).get("categories", []):
        for stat in cat.get("stats", []):
            if stat.get("name") in ("offensiveRebounds", "defensiveRebounds"):
                found[stat["name"]] = float(stat.get("value") or 0)
    if len(found) != 2:
        return None
    return int(found["offensiveRebounds"]), int(found["defensiveRebounds"])


def fetch_rebound_splits(
    client: JsonClient,
    season: int,
    pids: list[int],
    cached: dict[str, list[int]],
) -> tuple[dict[str, list[int]], int]:
    """Return ({pid: [oreb, dreb]}, number of players with no data at all).

    A failed request falls back to last night's split for that player.
    """
    year = config.espn_year(season)
    splits: dict[str, list[int]] = {}
    missing = 0
    for i, pid in enumerate(pids, 1):
        url = config.ESPN_CORE_STATS_URL.format(year=year, athlete_id=pid)
        result = None
        try:
            result = parse_core_rebounds(client.get(url))
        except FetchError as exc:
            log.warning("Rebound split failed for %s: %s", pid, exc)
        if result is not None:
            splits[str(pid)] = list(result)
        elif str(pid) in cached:
            splits[str(pid)] = cached[str(pid)]
        else:
            missing += 1
        if i % 100 == 0:
            log.info("Rebound splits: %d/%d", i, len(pids))
    return splits, missing


def apply_rebound_splits(lines: list[SeasonLine], splits: dict[str, list[int]]) -> None:
    """Split each player's total rebounds (from the bulk feed) using the
    offensive share from the core feed, so oreb + dreb always equals reb even
    if the two feeds were read moments apart."""
    for ln in lines:
        reb = ln.totals.get("reb", 0)
        split = splits.get(str(ln.pid))
        if split is None:
            ln.totals.pop("oreb", None)
            ln.totals.pop("dreb", None)
            continue
        oreb, dreb = split
        share = oreb / (oreb + dreb) if (oreb + dreb) > 0 else 0.0
        ln.totals["oreb"] = int(round(reb * share))
        ln.totals["dreb"] = reb - ln.totals["oreb"]


# -------------------------------------------------------------------- state

def save_state(state_dir: Path, bulk: dict[str, Any], splits: dict[str, list[int]]) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    with gzip.open(state_dir / BULK_STATE_FILE, "wt", encoding="utf-8") as fh:
        json.dump(bulk, fh, separators=(",", ":"))
    (state_dir / SPLIT_STATE_FILE).write_text(json.dumps(splits, separators=(",", ":")), encoding="utf-8")


def load_bulk(state_dir: Path) -> dict[str, Any] | None:
    path = state_dir / BULK_STATE_FILE
    if not path.exists():
        return None
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        return json.load(fh)


def load_splits(state_dir: Path) -> dict[str, list[int]]:
    path = state_dir / SPLIT_STATE_FILE
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def save_team_state(state_dir: Path, totals: dict[str, dict[str, Any]],
                    records: dict[str, dict[str, int]]) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / TEAM_STATE_FILE).write_text(
        json.dumps({"totals": totals, "records": records}, separators=(",", ":"), sort_keys=True),
        encoding="utf-8")


def load_team_state(state_dir: Path) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, int]]] | None:
    path = state_dir / TEAM_STATE_FILE
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["totals"], data["records"]

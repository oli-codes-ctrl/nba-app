from __future__ import annotations

import json
from pathlib import Path

import pytest

from hoops_pipeline.aggregate import SeasonLine

FIXTURES = Path(__file__).parent / "fixtures"


def season_line(pid: int, *, team: str = "DEN", gp: int = 5, mpg: float = 30.0,
                age: int | None = 25, split: bool = True, **totals: int) -> SeasonLine:
    base = dict(pts=14 * gp, reb=5 * gp, ast=4 * gp, stl=gp, blk=gp, tov=2 * gp, pf=2 * gp,
                fgm=5 * gp, fga=10 * gp, fg3m=gp, fg3a=3 * gp, ftm=3 * gp, fta=4 * gp)
    base.update(totals)
    if split and "oreb" not in base:
        base["oreb"] = base["reb"] // 5
        base["dreb"] = base["reb"] - base["oreb"]
    return SeasonLine(pid=pid, name=f"Player {pid}", position="G", age=age, team=team,
                      teams=[team], gp=gp, minutes=mpg * gp, totals=base)


@pytest.fixture
def make_line():
    return season_line


@pytest.fixture
def bulk_sample():
    return json.loads((FIXTURES / "espn_bulk_sample.json").read_text(encoding="utf-8"))


@pytest.fixture
def core_sample():
    return json.loads((FIXTURES / "espn_core_doncic.json").read_text(encoding="utf-8"))

import copy

import pytest

from hoops_pipeline import espn
from hoops_pipeline.http_client import FetchError


def _by_name(lines):
    return {ln.name: ln for ln in lines}


def test_parse_real_bulk_sample(bulk_sample):
    lines = _by_name(espn.parse_bulk(bulk_sample))
    luka = lines["Luka Doncic"]
    assert luka.team == "LAL"
    assert luka.age == 27
    assert luka.position == "G"
    assert luka.gp == 6
    assert luka.minutes == pytest.approx(215)
    assert luka.totals["pts"] == 226
    assert luka.totals["reb"] == 49
    assert luka.totals["fga"] == 141
    assert "oreb" not in luka.totals  # comes from the core feed


def test_traded_player_has_current_team_first(bulk_sample):
    clayton = _by_name(espn.parse_bulk(bulk_sample))["Walter Clayton Jr."]
    assert clayton.teams == ["DAL", "MEM"]
    assert clayton.team == "DAL"


def test_espn_abbreviations_are_standardized(bulk_sample):
    raw = copy.deepcopy(bulk_sample)
    raw["athletes"][0]["athlete"]["teamShortName"] = "GS"
    (first, *_) = sorted(espn.parse_bulk(raw), key=lambda ln: ln.name != raw["athletes"][0]["athlete"]["displayName"])
    assert first.team == "GSW"


def test_missing_stat_column_fails_loudly(bulk_sample):
    raw = copy.deepcopy(bulk_sample)
    for cat in raw["categories"]:
        if cat["name"] == "offensive":
            cat["names"] = [n if n != "points" else "pointz" for n in cat["names"]]
    with pytest.raises(espn.EspnFormatError):
        espn.parse_bulk(raw)


def test_parse_core_rebounds(core_sample):
    assert espn.parse_core_rebounds(core_sample) == (2, 47)
    assert espn.parse_core_rebounds({"splits": {"categories": []}}) is None


def test_split_scales_to_bulk_total(bulk_sample):
    lines = espn.parse_bulk(bulk_sample)
    luka = _by_name(lines)["Luka Doncic"]
    # Core feed read a game later: 3 + 50 = 53, bulk still says 49.
    espn.apply_rebound_splits(lines, {str(luka.pid): [3, 50]})
    assert luka.totals["oreb"] + luka.totals["dreb"] == 49
    assert luka.totals["oreb"] == 3
    others = [ln for ln in lines if ln is not luka]
    assert all("oreb" not in ln.totals for ln in others)


class FakeClient:
    def __init__(self, responses):
        self.responses = responses

    def get(self, url, params=None):
        result = self.responses[url.split("/athletes/")[1].split("/")[0]]
        if isinstance(result, Exception):
            raise result
        return result


def test_fetch_splits_falls_back_to_cache(core_sample):
    client = FakeClient({"1": core_sample, "2": FetchError("boom"), "3": FetchError("boom")})
    splits, missing = espn.fetch_rebound_splits(client, 2026, [1, 2, 3], {"2": [5, 10]})
    assert splits == {"1": [2, 47], "2": [5, 10]}
    assert missing == 1


def test_state_roundtrip(tmp_path, bulk_sample):
    espn.save_state(tmp_path, bulk_sample, {"1": [2, 3]})
    assert espn.load_bulk(tmp_path) == bulk_sample
    assert espn.load_splits(tmp_path) == {"1": [2, 3]}

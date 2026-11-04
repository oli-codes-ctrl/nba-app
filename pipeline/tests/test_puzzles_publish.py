import json
from datetime import date

import pytest

from hoops_pipeline import espn, puzzles
from hoops_pipeline.__main__ import main
from hoops_pipeline.aggregate import mark_qualified
from hoops_pipeline.publish import PublishError, build_player_records, write_outputs


def _records(make_line, n_players=40):
    lines = [make_line(pid, team="DEN" if pid % 2 else "DAL", pts=pid * 5,
                       age=None if pid == n_players else 20 + pid % 15)
             for pid in range(1, n_players + 1)]
    mark_qualified(lines)
    return build_player_records(lines)


def test_window_is_deterministic_and_frozen(make_line):
    records, _ = _records(make_line)
    h1, h2 = {}, {}
    w1 = puzzles.ensure_window(date(2026, 11, 2), 2026, records, h1)
    w2 = puzzles.ensure_window(date(2026, 11, 2), 2026, records, h2)
    assert [e["answerId"] for e in w1] == [e["answerId"] for e in w2]
    assert [e["date"] for e in w1] == ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]
    assert w1[0]["xStat"] == "age"
    assert set(w1[0]["clues"]) == {"position", "conference", "team"}

    # Stats change overnight; existing entries must not.
    frozen = json.dumps(h1["2026-11-02"], sort_keys=True)
    for r in records:
        r["s"]["pts"] = 0.0
    puzzles.ensure_window(date(2026, 11, 3), 2026, records, h1)
    assert json.dumps(h1["2026-11-02"], sort_keys=True) == frozen
    assert h1["2026-11-05"]["number"] == 5


def test_pool_needs_age_and_answers_do_not_repeat(make_line):
    records, _ = _records(make_line)
    history = {}
    for day in range(1, 27):  # creates 29 entries, 2026-10-31 .. 2026-11-28
        puzzles.ensure_window(date(2026, 11, day), 2026, records, history)
    answers = [history[d]["answerId"] for d in sorted(history)]
    assert len(answers) == 29
    assert len(answers) == len(set(answers))  # 30-player pool, 30-day no-repeat
    no_age_id = 40
    assert all(no_age_id not in {p["id"] for p in e["pool"]} for e in history.values())


def test_publish_writes_manifest_and_hashed_players(tmp_path, make_line):
    records, pool_size = _records(make_line)
    v_dir = write_outputs(tmp_path, 2026, records, pool_size, [], "2026-11-02", min_players=10)
    manifest = json.loads((v_dir / "manifest.json").read_text(encoding="utf-8"))
    players = json.loads((v_dir / manifest["files"]["players"]).read_text(encoding="utf-8"))
    assert manifest["playerCount"] == 40
    assert manifest["asOf"] == "2026-11-02"
    assert players["players"][0]["pct"]["pts"] is not None
    assert players["players"][0]["conf"] == "West"


def test_publish_refuses_small_player_list(tmp_path, make_line):
    records, pool_size = _records(make_line, n_players=5)
    with pytest.raises(PublishError):
        write_outputs(tmp_path, 2026, records, pool_size, [], "2026-11-02", min_players=300)
    assert not (tmp_path / "v1" / "manifest.json").exists()


def test_build_only_cli_end_to_end(tmp_path, bulk_sample):
    state = tmp_path / "state"
    pids = [a["athlete"]["id"] for a in bulk_sample["athletes"]]
    espn.save_state(state, bulk_sample, {pid: [10, 40] for pid in pids})
    rc = main(["build-only", "--state", str(state), "--out", str(tmp_path / "out"),
               "--today", "2026-11-02", "--min-players", "3"])
    assert rc == 0
    out = tmp_path / "out" / "v2"
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    players = json.loads((out / manifest["files"]["players"]).read_text(encoding="utf-8"))["players"]
    luka = next(p for p in players if p["name"] == "Luka Doncic")
    assert luka["s"]["pts"] == 37.7
    assert luka["s"]["game_score"] is not None
    assert len(json.loads((out / "puzzles.json").read_text(encoding="utf-8"))["puzzles"]) == 4

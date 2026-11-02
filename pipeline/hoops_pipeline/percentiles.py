"""Empirical percentile ranks over the qualified pool."""

from __future__ import annotations

from bisect import bisect_left, bisect_right
from collections.abc import Sequence


def mid_rank_percentile(value: float, sorted_values: Sequence[float]) -> float:
    """Share of the pool below `value`, counting ties as half. Range 0-100."""
    n = len(sorted_values)
    if n == 0:
        return 0.0
    below = bisect_left(sorted_values, value)
    equal = bisect_right(sorted_values, value) - below
    return (below + 0.5 * equal) / n * 100.0


def rank_desc(value: float, sorted_values: Sequence[float]) -> int:
    """1 = highest. Tied players share the best rank."""
    return len(sorted_values) - bisect_right(sorted_values, value) + 1


def compute_percentiles(
    stats_by_player: dict[int, dict[str, float | int | None]],
    qualified: set[int],
    stat_ids: Sequence[str],
) -> tuple[dict[int, dict[str, float]], dict[int, dict[str, int]], dict[str, int]]:
    """Return (pct, rank, pool_size). Only qualified players get entries."""
    pct: dict[int, dict[str, float]] = {pid: {} for pid in qualified}
    rank: dict[int, dict[str, int]] = {pid: {} for pid in qualified}
    pool_size: dict[str, int] = {}
    for stat in stat_ids:
        pool = sorted(
            v for pid in qualified
            if (v := stats_by_player[pid].get(stat)) is not None
        )
        pool_size[stat] = len(pool)
        for pid in qualified:
            v = stats_by_player[pid].get(stat)
            if v is None:
                continue
            pct[pid][stat] = round(mid_rank_percentile(v, pool), 1)
            rank[pid][stat] = rank_desc(v, pool)
    return pct, rank, pool_size

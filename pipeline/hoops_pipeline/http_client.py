"""Throttled JSON GET with retries."""

from __future__ import annotations

import logging
import time
from collections.abc import Mapping
from typing import Any

import requests

from . import config

log = logging.getLogger(__name__)

RETRY_STATUSES = {429, 500, 502, 503, 504}


class FetchError(RuntimeError):
    pass


class JsonClient:
    def __init__(
        self,
        requests_per_second: float = config.ESPN_REQUESTS_PER_SECOND,
        session: requests.Session | None = None,
        max_retries: int = 4,
        sleep=time.sleep,
        clock=time.monotonic,
    ) -> None:
        self._session = session or requests.Session()
        self._session.headers["User-Agent"] = config.USER_AGENT
        self._session.headers["Accept"] = "application/json"
        self._min_interval = 1.0 / max(requests_per_second, 0.01)
        self._max_retries = max_retries
        self._sleep = sleep
        self._clock = clock
        self._last_request = float("-inf")

    def _throttle(self) -> None:
        wait = self._min_interval - (self._clock() - self._last_request)
        if wait > 0:
            self._sleep(wait)
        self._last_request = self._clock()

    def get(self, url: str, params: Mapping[str, Any] | None = None) -> dict[str, Any]:
        for attempt in range(self._max_retries + 1):
            self._throttle()
            try:
                resp = self._session.get(url, params=params, timeout=30)
            except requests.RequestException as exc:
                if attempt >= self._max_retries:
                    raise FetchError(f"{url}: {exc}") from exc
                self._sleep(min(30.0, 2.0 ** attempt))
                continue
            if resp.status_code in RETRY_STATUSES and attempt < self._max_retries:
                backoff = min(30.0, 2.0 ** attempt * 2)
                log.warning("HTTP %s on %s, retrying in %.0fs", resp.status_code, url, backoff)
                self._sleep(backoff)
                continue
            if resp.status_code >= 400:
                raise FetchError(f"HTTP {resp.status_code} on {url}")
            try:
                return resp.json()
            except ValueError as exc:
                raise FetchError(f"Non-JSON response from {url}") from exc
        raise FetchError(f"Gave up on {url}")

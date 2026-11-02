import pytest

from hoops_pipeline.http_client import FetchError, JsonClient


class FakeResp:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body

    def json(self):
        if self._body is None:
            raise ValueError("not json")
        return self._body


class FakeSession:
    def __init__(self, responses):
        self.headers = {}
        self.calls = 0
        self._responses = list(responses)

    def get(self, url, params=None, timeout=None):
        self.calls += 1
        return self._responses.pop(0)


def _client(responses):
    session = FakeSession(responses)
    return JsonClient(session=session, sleep=lambda s: None), session


def test_sets_user_agent_and_returns_json():
    client, session = _client([FakeResp(200, {"ok": 1})])
    assert client.get("https://x") == {"ok": 1}
    assert "hoops-analytics" in session.headers["User-Agent"]


def test_retries_on_429_then_succeeds():
    client, session = _client([FakeResp(429), FakeResp(503), FakeResp(200, {"ok": 1})])
    assert client.get("https://x") == {"ok": 1}
    assert session.calls == 3


def test_404_raises_without_retry():
    client, session = _client([FakeResp(404)])
    with pytest.raises(FetchError):
        client.get("https://x")
    assert session.calls == 1


def test_non_json_raises():
    client, _ = _client([FakeResp(200, None)])
    with pytest.raises(FetchError):
        client.get("https://x")

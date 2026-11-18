"""/tiles/{name}.pmtiles — byte ranges from disk (dev) with the Storage fallback stubbed out."""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from britain_exchange import tiles
from britain_exchange.api import app

BODY = b"PMTiles" + bytes(range(256)) * 4


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    path = tmp_path / tiles.TILESETS["boundaries"]
    path.parent.mkdir(parents=True)
    path.write_bytes(BODY)
    monkeypatch.setattr(tiles, "DATA_ROOT", tmp_path)
    monkeypatch.setattr(tiles, "_from_storage", lambda rel, rng: None)
    return TestClient(app)


def test_range_returns_206_with_content_range(client: TestClient) -> None:
    r = client.get("/tiles/boundaries.pmtiles", headers={"Range": "bytes=0-6", "Origin": "http://localhost:3000"})
    assert r.status_code == 206
    assert r.content == b"PMTiles"
    assert r.headers["content-range"] == f"bytes 0-6/{len(BODY)}"
    assert r.headers["accept-ranges"] == "bytes"
    assert "Content-Range" in r.headers["access-control-expose-headers"]


def test_open_ended_range_clamps_to_size(client: TestClient) -> None:
    r = client.get("/tiles/boundaries.pmtiles", headers={"Range": f"bytes={len(BODY) - 3}-"})
    assert r.status_code == 206
    assert r.content == BODY[-3:]


def test_no_range_returns_whole_file(client: TestClient) -> None:
    r = client.get("/tiles/boundaries.pmtiles")
    assert r.status_code == 200
    assert r.content == BODY


def test_unknown_tileset_and_bad_range(client: TestClient) -> None:
    assert client.get("/tiles/elsewhere.pmtiles").status_code == 404
    assert client.get("/tiles/boundaries.pmtiles", headers={"Range": "items=0-1"}).status_code == 416


def test_missing_everywhere_is_503(client: TestClient) -> None:
    assert client.get("/tiles/gb-basemap.pmtiles", headers={"Range": "bytes=0-6"}).status_code == 503

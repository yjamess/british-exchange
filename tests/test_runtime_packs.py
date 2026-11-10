"""Cloud completeness: Postgres gate + curated pack registry."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from britain_exchange import packs, runtime
from britain_exchange.api import app


client = TestClient(app)


def test_require_postgres_explicit_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BX_REQUIRE_POSTGRES", "0")
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RAILWAY_SERVICE_ID", raising=False)
    assert runtime.require_postgres() is False


def test_require_postgres_on_railway(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BX_REQUIRE_POSTGRES", raising=False)
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    assert runtime.require_postgres() is True


def test_health_lists_require_postgres_flag() -> None:
    response = client.get("/health")
    assert response.status_code in {200, 503}
    body = response.json()
    assert "store" in body
    assert "require_postgres" in body
    assert body["status"] in {"ok", "unavailable"}


def test_packs_index_lists_energy_and_housing() -> None:
    response = client.get("/packs")
    assert response.status_code == 200
    ids = {p["pack_id"] for p in response.json()["packs"]}
    assert "energy.atlas" in ids
    assert "energy.stations" in ids
    assert "housing.atlas-average" in ids
    assert "housing.planning-authorities" in ids


def test_pack_atlas_serves_json_when_on_disk() -> None:
    if not (packs.DATA_ROOT / packs.PACK_REGISTRY["energy.atlas"]).is_file():
        pytest.skip("energy atlas curated file not on disk")
    response = client.get("/packs/energy.atlas")
    assert response.status_code == 200
    assert response.headers.get("X-BX-Pack-Source") == "disk"
    payload = response.json()
    assert "points" in payload or "largest_sites" in payload


def test_housing_atlas_average_pack() -> None:
    rel = packs.PACK_REGISTRY["housing.atlas-average"]
    if not (packs.DATA_ROOT / rel).is_file():
        pytest.skip("housing atlas-average not on disk")
    response = client.get("/packs/housing.atlas-average")
    assert response.status_code == 200
    payload = response.json()
    assert "areas" in payload or "months" in payload


def test_pack_rel_rejects_traversal() -> None:
    response = client.get("/packs/rel/housing/planning-layers/curated/../../etc/passwd.json")
    assert response.status_code == 404


def test_pack_rel_serves_planning_index_when_on_disk() -> None:
    rel = "housing/planning-layers/curated/index.json"
    if not (packs.DATA_ROOT / rel).is_file():
        pytest.skip("planning index not on disk")
    response = client.get(f"/packs/rel/{rel}")
    assert response.status_code == 200
    assert response.headers.get("X-BX-Pack-Source") == "disk"


def test_unknown_pack_404() -> None:
    response = client.get("/packs/not.a.real.pack")
    assert response.status_code == 404


def test_housing_land_layers_rejects_bad_code() -> None:
    response = client.get("/housing/land-layers/not-a-code")
    assert response.status_code == 404


def test_housing_land_layers_serves_cached_york() -> None:
    rel = "housing/planning-layers/curated/live/E06000014.json"
    if not (packs.DATA_ROOT / rel).is_file():
        pytest.skip("York live plate not on disk")
    response = client.get("/housing/land-layers/E06000014")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "E06000014"
    assert "layers" in body

"""API observation filters return typed dimensions."""

from fastapi.testclient import TestClient

from britain_exchange.api import app

client = TestClient(app)


def test_energy_fuel_filter_returns_dimensions() -> None:
    response = client.get(
        "/indicators/electricity-generation-by-source/observations",
        params={"fuel": "Gas", "include_aggregates": "false", "limit": 5},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] >= 1
    assert payload["chart"]["chart_kind"] == "time_series"
    for row in payload["observations"]:
        assert row["dimensions"]["fuel"] == "Gas"
        assert row["aggregation_role"] == "component"


def test_water_company_filter_no_industry_aggregate() -> None:
    response = client.get(
        "/indicators/water-supply-interruptions/observations",
        params={"water_company": "TMS", "limit": 20},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["chart"]["allows_industry_aggregate"] is False
    companies = {
        row["dimensions"]["water_company"] for row in payload["observations"]
    }
    assert companies <= {"TMS"}
    assert "industry" not in {c.lower() for c in companies}
    assert any(
        "Company-level only" in w for w in payload["chart"]["compatibility_warnings"]
    )


def test_indicator_chart_meta_labels_cpi() -> None:
    response = client.get("/indicators/cpi-inflation")
    assert response.status_code == 200
    chart = response.json()["chart"]
    assert chart["is_cpi"] is True
    assert chart["is_cpih"] is False

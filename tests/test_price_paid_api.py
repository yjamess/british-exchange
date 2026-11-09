"""Price Paid search must not show operator instructions to visitors."""

from fastapi.testclient import TestClient

from britain_exchange.api import app

client = TestClient(app)


def test_price_paid_unavailable_message_is_for_visitors(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    search = client.get("/housing/price-paid", params={"q": "OX28"})
    assert search.status_code == 503
    body = search.text
    assert "DATABASE_URL" not in body
    assert "uvicorn" not in body.lower()
    assert "temporarily unavailable" in body.lower()

    meta = client.get("/housing/price-paid/meta")
    assert meta.status_code == 200
    payload = meta.json()
    assert payload["available"] is False
    assert payload["publisher"] == "HM Land Registry"
    assert payload["release"] == "pp-2025.csv"
    assert payload["geography"] == "England and Wales"
    assert "DATABASE_URL" not in meta.text

"""Identity hash must stay stable and match the SQL backfill encoding."""

from __future__ import annotations

from britain_exchange.dimensions import observation_identity_hash


def test_identity_hash_stable_bytes() -> None:
    first = observation_identity_hash(
        release_id=42,
        period_start="2024-01-01",
        period_end="2024-12-31",
        geography_code="K02000001",
        dim_fuel="Gas",
        notes="fuel=Gas; payment=Direct debit",
    )
    second = observation_identity_hash(
        release_id=42,
        period_start="2024-01-01",
        period_end="2024-12-31",
        geography_code="K02000001",
        dim_fuel="Gas",
        notes="fuel=Gas; payment=Direct debit",
    )
    assert first == second
    assert len(first) == 32


def test_identity_hash_changes_with_notes() -> None:
    base = dict(
        release_id=1,
        period_start="2020-01-01",
        period_end="2020-01-01",
        geography_code="K02000001",
        dim_fuel="Electricity",
    )
    a = observation_identity_hash(**base, notes="payment=Direct debit; measure=unit_price")
    b = observation_identity_hash(**base, notes="payment=Prepayment; measure=unit_price")
    assert a != b


def test_identity_hash_includes_empty_dims() -> None:
    """Empty dims are part of the key (NOT NULL DEFAULT ''), not omitted."""
    with_empty = observation_identity_hash(
        release_id=7,
        period_start="2021-06-01",
        period_end="2021-06-30",
        geography_code="E12000007",
        notes="series=index",
    )
    with_series_dim = observation_identity_hash(
        release_id=7,
        period_start="2021-06-01",
        period_end="2021-06-30",
        geography_code="E12000007",
        dim_series="index",
        notes="series=index",
    )
    assert with_empty != with_series_dim

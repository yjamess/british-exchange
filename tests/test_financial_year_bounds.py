"""Financial-year labels end the calendar year after they start (1991-92 → 1992, not 2092)."""

import pytest

from housing.connectors import affordable_housing_supply, net_additional_dwellings, net_additions_by_authority

PARSERS = [affordable_housing_supply._fy_bounds, net_additions_by_authority._fy_bounds, net_additional_dwellings._fy_bounds]


@pytest.mark.parametrize("parse", PARSERS)
@pytest.mark.parametrize(
    ("label", "bounds"),
    [
        ("1991-92", ("1991-04-01", "1992-03-31")),
        ("1998-99", ("1998-04-01", "1999-03-31")),
        ("1999-00", ("1999-04-01", "2000-03-31")),
        ("2024-25", ("2024-04-01", "2025-03-31")),
    ],
)
def test_financial_year_bounds(parse, label: str, bounds: tuple[str, str]) -> None:
    assert parse(label) == bounds


@pytest.mark.parametrize("parse", PARSERS)
def test_inconsistent_label_is_not_parsed(parse) -> None:
    assert parse("1991-95") is None

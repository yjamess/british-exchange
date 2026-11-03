"""Unit tests for typed observation dimensions."""

from britain_exchange.dimensions import (
    ObservationDimensions,
    dimensions_from_notes,
    merge_row_dimensions,
    notes_from_dimensions,
)


def test_parse_fuel_notes() -> None:
    dims = dimensions_from_notes("fuel=Gas")
    assert dims.fuel == "Gas"
    assert dims.water_company == ""


def test_parse_water_company_notes() -> None:
    dims = dimensions_from_notes(
        "company=TMS; company_name=Thames Water; ref=APR3A_02; fy=2024-25"
    )
    assert dims.water_company == "TMS"
    assert dims.water_company_name == "Thames Water"


def test_parse_band_category() -> None:
    dims = dimensions_from_notes("band=Medium; ccl=excluding")
    assert dims.category == "Medium"


def test_parse_demographic_sex() -> None:
    dims = dimensions_from_notes("sex=female; series=national life tables UK; age=0")
    assert dims.demographic == "female"
    assert dims.series == "national life tables UK"


def test_round_trip_notes() -> None:
    dims = ObservationDimensions(fuel="Coal")
    notes = notes_from_dimensions(dims)
    assert dimensions_from_notes(notes).fuel == "Coal"


def test_merge_prefers_explicit_columns() -> None:
    dims = merge_row_dimensions(
        {"dim_fuel": "Oil", "notes": "fuel=Gas; company=AFW"}
    )
    assert dims.fuel == "Oil"
    assert dims.water_company == "AFW"

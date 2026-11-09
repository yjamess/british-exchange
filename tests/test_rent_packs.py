"""Unit tests for PIPR series-key mapping (no database required)."""

from britain_exchange.rent_packs import rent_level, series_key


def test_series_key_all_property() -> None:
    assert series_key(series="average-rent", category="") == "all|average-rent"
    assert series_key(series="annual-change", category="") == "all|annual-change"
    assert series_key(series="index", category="") == "all|index"


def test_series_key_bedroom_kinds() -> None:
    assert series_key(series="average-rent", category="bedrooms-1") == "bedrooms-1|average-rent"
    assert series_key(series="annual-change", category="bedrooms-1") is None


def test_rent_level() -> None:
    assert rent_level("K02000001") == "uk"
    assert rent_level("E92000001") == "nation"
    assert rent_level("E12000007") == "region"
    assert rent_level("E09000033") == "local"

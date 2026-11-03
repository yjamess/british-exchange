"""Chart kind inference and labelling guards."""

from britain_exchange.chart_contract import (
    chart_meta_for_indicator,
    infer_chart_kind,
    normalize_frequency,
)


def test_normalize_frequency() -> None:
    assert normalize_frequency("quarterly") == "quarterly"
    assert normalize_frequency("annual (financial year)") == "annual"
    assert normalize_frequency("ad_hoc") == "irregular"
    assert normalize_frequency("election / irregular") == "irregular"


def test_infer_time_series() -> None:
    kind = infer_chart_kind(
        frequency="quarterly",
        geography_codes={"K02000001"},
        fuels={"Gas"},
        water_companies=set(),
        demographics=set(),
        period_starts={"2020-01-01", "2020-04-01"},
    )
    assert kind == "time_series"


def test_infer_geographic_comparison() -> None:
    kind = infer_chart_kind(
        frequency="annual",
        geography_codes={"E92000001", "S92000003"},
        fuels=set(),
        water_companies=set(),
        demographics=set(),
        period_starts={"2023-01-01"},
    )
    assert kind == "geographic_comparison"


def test_infer_categorical_breakdown() -> None:
    kind = infer_chart_kind(
        frequency="annual",
        geography_codes={"K04000001"},
        fuels=set(),
        water_companies={"TMS", "UUW"},
        demographics=set(),
        period_starts={"2024-04-01"},
    )
    assert kind == "categorical_breakdown"


def test_cpi_not_cpih_labels() -> None:
    meta = chart_meta_for_indicator(
        "cpi-inflation",
        title="CPI inflation",
        geography="United Kingdom",
        frequency="monthly",
        unit="% annual rate",
        publisher="ONS",
        source_url="https://example.test",
        caveats="Not CPIH",
        series_id="D7G7",
        definition="CPI",
    )
    assert meta["is_cpi"] is True
    assert meta["is_cpih"] is False
    assert "CPIH" in meta["display_title"]


def test_england_only_and_rail_ppm() -> None:
    nhs = chart_meta_for_indicator(
        "nhs-elective-waiting-list",
        title="NHS elective waiting list",
        geography="England (E92000001) — not UK",
        frequency="monthly",
        unit="pathways",
        publisher="NHS England",
        source_url="https://example.test",
        caveats="England-only",
        series_id="RTT",
        definition="RTT",
    )
    assert nhs["england_only"] is True

    rail = chart_meta_for_indicator(
        "rail-punctuality",
        title="Rail punctuality",
        geography="Great Britain",
        frequency="quarterly",
        unit="% PPM",
        publisher="ORR",
        source_url="https://example.test",
        caveats="PPM",
        series_id="3113",
        definition="PPM",
    )
    assert rail["is_rail_ppm"] is True

    gva = chart_meta_for_indicator(
        "manufacturing-share-of-gva",
        title="Manufacturing share of GVA",
        geography="United Kingdom",
        frequency="annual",
        unit="% of GVA",
        publisher="ONS",
        source_url="https://example.test",
        caveats="weights",
        series_id="L4NT",
        definition="weights",
    )
    assert gva["is_gva_cvm_weight"] is True

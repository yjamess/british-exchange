"""Chart presentation contract — kinds, labels, and compatibility guards."""

from __future__ import annotations

from typing import Any, Literal

ChartKind = Literal[
    "time_series",
    "snapshot",
    "categorical_breakdown",
    "geographic_comparison",
]

# Indicators that must never be silently mixed with a different measure family.
MEASURE_FAMILY: dict[str, str] = {
    "cpi-inflation": "cpi",  # not CPIH
    "manufacturing-share-of-gva": "gva_cvm_weight_pct",
    "rail-punctuality": "rail_ppm",
}

# Display titles that correct common shorthand mistakes in the UI.
DISPLAY_TITLE: dict[str, str] = {
    "cpi-inflation": "CPI inflation (not CPIH)",
    "manufacturing-share-of-gva": "Manufacturing share of GVA (CVM industry weights)",
    "rail-punctuality": "Rail punctuality (PPM, Great Britain)",
    "nhs-elective-waiting-list": "NHS elective waiting list (England)",
    "housing-completions": "Housing completions (England)",
    "gcse-grade-4-english-maths": "GCSE grade 4+ English and maths (England)",
    "house-price-to-earnings-ratio": "House price to earnings ratio (England)",
    "dwelling-stock-by-tenure": "Dwelling stock by tenure (England)",
    "water-supply-interruptions": "Water supply interruptions (company-level)",
}


def normalize_frequency(raw: str) -> str:
    text = (raw or "").strip().lower()
    if "month" in text:
        return "monthly"
    if "quarter" in text:
        return "quarterly"
    if "annual" in text or "year" in text or text == "a":
        return "annual"
    if (
        "election" in text
        or "irregular" in text
        or "sessional" in text
        or "periodic" in text
        or text in {"ad_hoc", "adhoc", "ad-hoc"}
    ):
        return "irregular"
    return "unknown"


def infer_chart_kind(
    *,
    frequency: str,
    geography_codes: set[str],
    fuels: set[str],
    water_companies: set[str],
    demographics: set[str],
    period_starts: set[str],
) -> ChartKind:
    """Classify how a filtered observation set should be charted."""
    multi_geo = len({g for g in geography_codes if g}) > 1
    multi_category = (
        len({f for f in fuels if f}) > 1
        or len({c for c in water_companies if c}) > 1
        or len({d for d in demographics if d}) > 1
    )
    if multi_geo and not multi_category:
        return "geographic_comparison"
    if multi_category and len(period_starts) <= 1:
        return "categorical_breakdown"
    if multi_category and multi_geo:
        return "categorical_breakdown"
    if len(period_starts) <= 1:
        return "snapshot"
    freq = normalize_frequency(frequency)
    if freq == "irregular" and len(period_starts) <= 3:
        return "snapshot"
    return "time_series"


def chart_meta_for_indicator(
    indicator_id: str,
    *,
    title: str,
    geography: str,
    frequency: str,
    unit: str,
    publisher: str,
    source_url: str,
    caveats: str,
    series_id: str,
    definition: str,
) -> dict[str, Any]:
    """Stable chart-level metadata for UI source panels."""
    display_title = DISPLAY_TITLE.get(indicator_id, title)
    england_only = "england" in (geography or "").lower() and "united kingdom" not in (
        geography or ""
    ).lower()
    return {
        "indicator_id": indicator_id,
        "display_title": display_title,
        "series_id": series_id,
        "publisher": publisher,
        "source_url": source_url,
        "geography": geography,
        "frequency": frequency,
        "frequency_normalized": normalize_frequency(frequency),
        "unit": unit,
        "caveats": caveats,
        "definition": definition,
        "measure_family": MEASURE_FAMILY.get(indicator_id, indicator_id),
        "england_only": england_only,
        "is_cpi": indicator_id == "cpi-inflation",
        "is_cpih": False,  # CPIH is not in the Ready catalogue; keep explicit
        "is_gva_cvm_weight": indicator_id == "manufacturing-share-of-gva",
        "is_rail_ppm": indicator_id == "rail-punctuality",
        "allows_industry_aggregate": False
        if indicator_id == "water-supply-interruptions"
        else None,
    }


def assert_compatible_series(units: set[str], geographies: set[str]) -> list[str]:
    """Return warnings when a response would mix incompatible series."""
    warnings: list[str] = []
    real_units = {u for u in units if u}
    real_geos = {g for g in geographies if g}
    if len(real_units) > 1:
        warnings.append(
            f"Mixed units in response ({sorted(real_units)}); do not plot on one axis."
        )
    if len(real_geos) > 1:
        warnings.append(
            f"Mixed geography labels ({sorted(real_geos)[:8]}); treat as comparison, not one series."
        )
    return warnings

"""CPIH COICOP division annual rates — Economy Domain 01 Categories scope.

Orchestrator CDID map: ``docs/economy-01-coicop-cdid-map.md``.
Twelve MM23 series (L55P–L55Z, L562). Do not mix with CPI division rates.
"""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

_MONTHLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array. "
    "Map year+month → ISO month bounds. Geography K02000001. "
    "Latest month provisional; older months final "
    "(CPIH division rates rarely revise history)."
)

# Short public labels for RankBars / Notes — not full ONS titles.
COICOP_CPIH_DIVISIONS: tuple[tuple[str, str, str, str], ...] = (
    ("01", "L55P", "cpih-inflation-food", "Food & non-alcoholic beverages"),
    ("02", "L55Q", "cpih-inflation-alcohol-tobacco", "Alcoholic beverages & tobacco"),
    ("03", "L55R", "cpih-inflation-clothing", "Clothing & footwear"),
    ("04", "L55S", "cpih-inflation-housing", "Housing, water & fuels"),
    ("05", "L55T", "cpih-inflation-furnishings", "Furnishings & household equipment"),
    ("06", "L55U", "cpih-inflation-health", "Health"),
    ("07", "L55V", "cpih-inflation-transport", "Transport"),
    ("08", "L55W", "cpih-inflation-communication", "Communication"),
    ("09", "L55X", "cpih-inflation-recreation", "Recreation & culture"),
    ("10", "L55Y", "cpih-inflation-education", "Education"),
    ("11", "L55Z", "cpih-inflation-restaurants", "Hotels, cafés & restaurants"),
    ("12", "L562", "cpih-inflation-miscellaneous", "Miscellaneous goods & services"),
)

RELATED_HEADLINE = [
    "cpih-inflation",
    "cpih-index",
    "cpi-inflation",
    "cpi-index",
]


def _spec(div: str, series_id: str, indicator_id: str, label: str) -> OnsSeriesSpec:
    """One CPIH COICOP division annual-rate pin."""
    related = [i for i in RELATED_HEADLINE]
    related.extend(
        i for d, _, i, _ in COICOP_CPIH_DIVISIONS if i != indicator_id
    )
    return OnsSeriesSpec(
        indicator_id=indicator_id,
        title=f"CPIH inflation · {label}",
        series_id=series_id,
        dataset_id="MM23",
        landing_url=(
            "https://www.ons.gov.uk/economy/inflationandpriceindices/"
            f"timeseries/{series_id.lower()}/mm23"
        ),
        unit=f"% annual rate (CPIH COICOP {div})",
        definition=(
            f"UK CPIH annual rate for COICOP division {div} ({label}). "
            f"ONS CDID {series_id} in dataset MM23. Companion to headline "
            "cpih-inflation (L55O). Not a CPI category series — never mix families."
        ),
        frequency="monthly",
        period_kind="months",
        notion_registry_url="",
        connector_module="economy.connectors.cpih_coicop_divisions",
        update_cadence="monthly (ONS Consumer price inflation)",
        transformations=_MONTHLY_TRANSFORM,
        revision_notes="CPIH division rates revise with basket/weight updates.",
        caveats=(
            "Division annual rate, not a contribution in percentage points. "
            "Not CPI. Categories UI must label CPIH."
        ),
        related_indicator_ids=related,
    )


CPIH_COICOP_SPECS: tuple[OnsSeriesSpec, ...] = tuple(
    _spec(div, series_id, indicator_id, label)
    for div, series_id, indicator_id, label in COICOP_CPIH_DIVISIONS
)

SPECS_BY_ID: dict[str, OnsSeriesSpec] = {
    spec.indicator_id: spec for spec in CPIH_COICOP_SPECS
}

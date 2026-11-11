"""CPIH COICOP division contributions to the all-items annual rate.

Orchestrator CDID map: ``docs/economy-01-coicop-cdid-map.md`` (contributions section).
Twelve MM23 series (L5H5–L5HG). Percentage points that add (near) to L55O.
Do not mix with CPI contribution series. Rounding effect L5GO is not ingested.
"""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

_MONTHLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array. "
    "Map year+month → ISO month bounds. Geography K02000001. "
    "Latest month provisional; older months final."
)

# Short public labels — aligned with rate divisions where wording differs slightly.
CPIH_CONTRIBUTION_DIVISIONS: tuple[tuple[str, str, str, str], ...] = (
    ("01", "L5H5", "cpih-contribution-food", "Food & non-alcoholic beverages"),
    ("02", "L5H6", "cpih-contribution-alcohol-tobacco", "Alcoholic beverages & tobacco"),
    ("03", "L5H7", "cpih-contribution-clothing", "Clothing & footwear"),
    ("04", "L5H8", "cpih-contribution-housing", "Housing, water & fuels"),
    ("05", "L5H9", "cpih-contribution-furnishings", "Furnishings & household equipment"),
    ("06", "L5HA", "cpih-contribution-health", "Health"),
    ("07", "L5HB", "cpih-contribution-transport", "Transport"),
    ("08", "L5HC", "cpih-contribution-communication", "Communication"),
    ("09", "L5HD", "cpih-contribution-recreation", "Recreation & culture"),
    ("10", "L5HE", "cpih-contribution-education", "Education"),
    ("11", "L5HF", "cpih-contribution-restaurants", "Hotels, cafés & restaurants"),
    ("12", "L5HG", "cpih-contribution-miscellaneous", "Miscellaneous goods & services"),
)

RELATED_HEADLINE = [
    "cpih-inflation",
    "cpih-index",
    "cpi-inflation",
    "cpi-index",
]


def _spec(div: str, series_id: str, indicator_id: str, label: str) -> OnsSeriesSpec:
    """One CPIH COICOP division contribution pin (percentage points)."""
    related = [i for i in RELATED_HEADLINE]
    related.extend(
        i for _, _, i, _ in CPIH_CONTRIBUTION_DIVISIONS if i != indicator_id
    )
    # Pair with the matching annual-rate pin when present.
    rate_id = indicator_id.replace("cpih-contribution-", "cpih-inflation-", 1)
    if rate_id not in related:
        related.append(rate_id)
    return OnsSeriesSpec(
        indicator_id=indicator_id,
        title=f"CPIH contribution · {label}",
        series_id=series_id,
        dataset_id="MM23",
        landing_url=(
            "https://www.ons.gov.uk/economy/inflationandpriceindices/"
            f"timeseries/{series_id.lower()}/mm23"
        ),
        unit=f"percentage points (CPIH COICOP {div} contribution to annual rate)",
        definition=(
            f"UK CPIH contribution of COICOP division {div} ({label}) to the "
            f"all-items annual rate, in percentage points. ONS CDID {series_id} "
            "in dataset MM23. Companion to headline cpih-inflation (L55O). "
            "Division contributions plus a small rounding effect sum to the "
            "headline annual rate."
        ),
        frequency="monthly",
        period_kind="months",
        notion_registry_url="",
        connector_module="economy.connectors.cpih_coicop_contributions",
        update_cadence="monthly (ONS Consumer price inflation)",
        transformations=_MONTHLY_TRANSFORM,
        revision_notes="CPIH contributions revise with basket/weight updates.",
        caveats=(
            "Contribution in percentage points, not the division's own annual rate. "
            "Not CPI. Categories UI must label CPIH. Rounding effect (L5GO) not pinned."
        ),
        related_indicator_ids=related,
    )


CPIH_CONTRIBUTION_SPECS: tuple[OnsSeriesSpec, ...] = tuple(
    _spec(div, series_id, indicator_id, label)
    for div, series_id, indicator_id, label in CPIH_CONTRIBUTION_DIVISIONS
)

SPECS_BY_ID: dict[str, OnsSeriesSpec] = {
    spec.indicator_id: spec for spec in CPIH_CONTRIBUTION_SPECS
}

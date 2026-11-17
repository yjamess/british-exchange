"""Economy Domain 04 — ONS UKEA household living-standards timeseries specs.

Approach (beginner-friendly):
1. One ``OnsSeriesSpec`` per registry indicator (same pattern as GDP per head).
2. Thin connector modules call ``OnsTimeseriesConnector`` + ``run_connector``.
3. Keep quarterly UKEA JSON only; annual aggregates stay in the raw pin.

Best practices:
- Type hints (https://docs.python.org/3/library/typing.html)
- Frozen dataclass config in ``ons_timeseries.OnsSeriesSpec``
  (https://docs.python.org/3/library/dataclasses.html)
- Never invent numbers; fail in the shared parser if CDID/payload is wrong.
"""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

_QUARTERLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the quarters array "
    "(annual aggregates omitted). Map year+Q → ISO quarter bounds. "
    "Geography K02000001. Latest quarter provisional; older quarters final "
    "(UKEA revises history at each quarterly sector-accounts release)."
)

_UKEA_CADENCE = "quarterly (ONS UK Economic Accounts / sector accounts)"
_UKEA_REVISIONS = (
    "UKEA revises: (1) each quarterly sector-accounts release; "
    "(2) Blue Book supply-and-use balancing and CVM rebasing. "
    "The 2026-09-30 vintage is on CVM reference year 2024 for DG2R/CRXX. "
    "Do not mix levels across vintages; growth rates or a fixed-quarter index "
    "are comparable. Next UKEA listed as 22 December 2026."
)

RELATED_04 = [
    "real-household-disposable-income",
    "real-household-disposable-income-per-head",
    "household-saving-ratio",
    "real-gdp",
    "real-gdp-per-head",
    "real-earnings",
    "cpi-inflation",
    "cpih-inflation",
    "mortgage-rate-2yr-fixed",
    "effects-of-taxes-and-benefits",
]


def _related_except(indicator_id: str, *extra: str) -> list[str]:
    related = [i for i in RELATED_04 if i != indicator_id]
    related.extend(i for i in extra if i not in related)
    return related


REAL_HOUSEHOLD_DISPOSABLE_INCOME = OnsSeriesSpec(
    indicator_id="real-household-disposable-income",
    title="Real household disposable income",
    series_id="DG2R",
    dataset_id="UKEA",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dg2r/ukea"
    ),
    unit="£ million chained volume, SA (households S.14)",
    definition=(
        "UK real households' disposable income (RHDI) for the household "
        "institutional sector (ESA S.14), chained volume measures, seasonally "
        "adjusted, £ million. ONS CDID DG2R in UKEA. Reference year 2024 at "
        "the 2026-09-30 vintage. Not households + NPISH (use NRJR for S.14+S.15). "
        "National accounts sector total — not median household income, not HBAI, "
        "not employee pay (AWE)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/p/4196547176858177ba88d10198b5cdee",
    connector_module="economy.connectors.real_household_disposable_income",
    update_cadence=_UKEA_CADENCE,
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=_UKEA_REVISIONS,
    caveats=(
        "S.14 households only. CVM levels are vintage-specific. "
        "Do not infer a typical household budget from this aggregate. "
        "Distinct from Domain 02 real-earnings (A2FC) and Domain 06 ETB."
    ),
    related_indicator_ids=_related_except("real-household-disposable-income"),
    open_questions=[
        "HBAI distribution ownership stays under Domain 04 until People starts.",
        "Should Validation also want annual DG2R as a second file?",
    ],
)

REAL_HOUSEHOLD_DISPOSABLE_INCOME_PER_HEAD = OnsSeriesSpec(
    indicator_id="real-household-disposable-income-per-head",
    title="Real household disposable income per head",
    series_id="CRXX",
    dataset_id="UKEA",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/crxx/ukea"
    ),
    unit="£ chained volume per head, SA",
    definition=(
        "UK real households' disposable income per head, chained volume "
        "measures, seasonally adjusted, £. ONS CDID CRXX in UKEA. Companion "
        "to DG2R (aggregate RHDI). Reference year 2024 at the 2026-09-30 "
        "vintage. Per-head national accounts, not equivalised median income "
        "(HBAI) and not GDP per head (IHXW)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/p/41965471768581998f42e024b57683fa",
    connector_module="economy.connectors.real_household_disposable_income_per_head",
    update_cadence=_UKEA_CADENCE,
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        _UKEA_REVISIONS
        + " Per-head also revises when ONS population denominators change."
    ),
    caveats=(
        "Mean resources per person in the household sector, not a median "
        "household and not equivalised. Do not splice with IHXW (GDP per head) "
        "as if they were the same concept."
    ),
    related_indicator_ids=_related_except(
        "real-household-disposable-income-per-head"
    ),
    open_questions=[
        "Confirm CRXX universe is S.14 (title omits ESA code; DG2R is S.14).",
    ],
)

HOUSEHOLD_SAVING_RATIO = OnsSeriesSpec(
    indicator_id="household-saving-ratio",
    title="Household saving ratio",
    series_id="DGD8",
    dataset_id="UKEA",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dgd8/ukea"
    ),
    unit="% of household total resources, SA (current prices)",
    definition=(
        "UK household saving ratio for households (ESA S.14): saving as a "
        "percentage of household total resources, current prices, seasonally "
        "adjusted. ONS CDID DGD8 in UKEA. National-accounts residual — not a "
        "typical household's liquid savings. Not S.14+S.15 (NRJS) and not "
        "experimental cash-basis CSJ8."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/p/419654717685813cba9cd97e70409fb3",
    connector_module="economy.connectors.household_saving_ratio",
    update_cadence=_UKEA_CADENCE,
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        "Revises with UKEA income and consumption. Current-price ratio; not "
        "CVM. Do not treat as Britain's Financial Buffer (needs WAS / survey "
        "distributions)."
    ),
    caveats=(
        "Aggregate ratio, not the share of households that can save. Includes "
        "pension saving in the headline S.14 residual. Cannot be joined to "
        "LCF expenditure or HBAI income as one household record."
    ),
    related_indicator_ids=_related_except("household-saving-ratio"),
    open_questions=[
        "Financial Buffer remains planned-not-ready until WAS liquid-asset "
        "distributions are ingested.",
    ],
)

ALL_HOUSEHOLD_SPECS = (
    REAL_HOUSEHOLD_DISPOSABLE_INCOME,
    REAL_HOUSEHOLD_DISPOSABLE_INCOME_PER_HEAD,
    HOUSEHOLD_SAVING_RATIO,
)

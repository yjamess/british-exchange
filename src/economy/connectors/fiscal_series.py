"""Fiscal-wave ONS PUSF / QNA series specs (Economy agent).

Five public-finance indicators share the PUSF release family but each has its
own CDID — one connector / data folder per registry row. Cross-link via
``related_indicator_ids`` (do not duplicate the same CDID into two folders).

Business investment (NPEL) is GDP/QNA, not PUSF, but lives in this wave.
"""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

PUSF_RELATED = [
    "public-sector-net-borrowing",
    "public-sector-net-debt",
    "public-sector-debt-interest",
    "tax-receipts",
    "total-managed-expenditure",
]

_PUSF_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array "
    "(quarters/years kept in raw, not curated). Map year+month name → ISO "
    "calendar-month bounds. Geography fixed to K02000001 / United Kingdom. "
    "Values parsed as float; empty → missing. Latest valued month "
    "provisional; older valued months final (PSF revises recent months — "
    "charts drop provisional)."
)

_PUSF_REVISIONS = (
    "Public Sector Finances (PUSF) monthly estimates revise as administrative "
    "data arrive and methods change. Re-fetch and re-pin raw JSON; compare "
    "checksums. Record official_release_date from description.releaseDate."
)

_PUSF_CAVEATS = (
    "Legacy api.ons.gov.uk retired 2024-11-25; ingest uses website timeseries "
    "JSON. Headline fiscal measures often quoted as financial-year-to-date "
    "sums — this package stores period (month) levels only. Quarterly/annual "
    "aggregates exist in raw JSON but are not written to curated observations."
)


PSND_PERCENT_GDP_ID = "public-sector-net-debt-percent-gdp"
"""Official HF6X ratio row — linked only from the Domain 08 debt family."""


def _related_except(indicator_id: str) -> list[str]:
    return [i for i in PUSF_RELATED if i != indicator_id]


def _debt_family_related(indicator_id: str) -> list[str]:
    """PUSF links plus HF6X (Domain 08 debt / borrowing / interest only)."""
    return [*_related_except(indicator_id), PSND_PERCENT_GDP_ID]


PUBLIC_SECTOR_NET_BORROWING = OnsSeriesSpec(
    indicator_id="public-sector-net-borrowing",
    title="Public sector net borrowing",
    series_id="DZLS",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/dzls/pusf"
    ),
    unit="£ million, NSA (ex public sector banks)",
    definition=(
        "Public sector net borrowing excluding public sector banks (PSNBex), "
        "current prices, not seasonally adjusted. ONS CDID DZLS in dataset "
        "PUSF — the headline monthly borrowing measure in Public Sector Finances."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581d0b736e7e36e6b56d7",
    connector_module="economy.connectors.public_sector_net_borrowing",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=_PUSF_REVISIONS,
    caveats=_PUSF_CAVEATS,
    related_indicator_ids=_debt_family_related("public-sector-net-borrowing"),
    open_questions=[
        "Also curate financial-year-to-date PSNB as a derived series?",
    ],
)

PUBLIC_SECTOR_NET_DEBT = OnsSeriesSpec(
    indicator_id="public-sector-net-debt",
    title="Public sector net debt",
    series_id="HF6W",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/hf6w/pusf"
    ),
    unit="£ billion, NSA (ex public sector banks)",
    definition=(
        "Public sector net debt excluding public sector banks (PSNDex), "
        "stock at end of month, £ billion current prices NSA. ONS CDID HF6W "
        "in PUSF. The official ratio HF6X (PSND as % of GDP) is a separate "
        "indicator, public-sector-net-debt-percent-gdp — linked via "
        "related_indicator_ids, not derived here."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581aba151c1ec18617559",
    connector_module="economy.connectors.public_sector_net_debt",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=_PUSF_REVISIONS,
    caveats=(
        _PUSF_CAVEATS
        + " Values are £ billion (not £ million). The official HF6X ratio "
        "(% of GDP) is ingested separately as "
        "public-sector-net-debt-percent-gdp; never derive it from real-gdp."
    ),
    related_indicator_ids=_debt_family_related("public-sector-net-debt"),
    open_questions=[],
)

PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP = OnsSeriesSpec(
    indicator_id=PSND_PERCENT_GDP_ID,
    title="Public sector net debt (% of GDP)",
    series_id="HF6X",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/hf6x/pusf"
    ),
    unit="% of GDP, NSA (ex public sector banks)",
    definition=(
        "Public sector net debt excluding public sector banks as a percentage "
        "of GDP, not seasonally adjusted. ONS CDID HF6X in PUSF; live series "
        "title 'PS: Net Debt (excluding public sector banks) as a % of GDP: "
        "NSA', ONS unit '%'. Official ONS ratio: numerator is PSND (HF6W "
        "concept); denominator is nominal GDP summed over a centred 12-month "
        "window (6 months either side of the debt date; monthly GDP = "
        "quarterly / 3), using OBR forecasts for the latest quarters."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41565471768581e6ad97d6c10b9a5a1a",
    connector_module="economy.connectors.public_sector_net_debt_percent_gdp",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=(
        _PUSF_REVISIONS
        + " HIGH revision risk for the latest ~6 months: the centred GDP "
        "denominator uses forecast quarters until outturn replaces them."
    ),
    caveats=(
        _PUSF_CAVEATS
        + " Values are a ratio in per cent of GDP, not £. Official ONS series; "
        "NOT derived from real-gdp (ABMI is chained volume SA, PSND is current "
        "prices — mixing them is wrong). The latest ~6 months depend on OBR "
        "forecast GDP and revise heavily. Older ONS tables label HF6X 'PSND ex "
        "BoE'; this row follows the live title 'excluding public sector banks'."
    ),
    related_indicator_ids=[
        "public-sector-net-debt",
        "public-sector-net-borrowing",
        "public-sector-debt-interest",
    ],
    open_questions=[
        "Independent Validation: reconcile HF6X x centred nominal GDP (BKTL "
        "family) to HF6W, and record revision size at the 2026-11-20 release.",
    ],
)

PUBLIC_SECTOR_DEBT_INTEREST = OnsSeriesSpec(
    indicator_id="public-sector-debt-interest",
    title="Public sector debt interest",
    series_id="NMFX",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/nmfx/pusf"
    ),
    unit="£ million, NSA (CG net interest payable)",
    definition=(
        "Central government current expenditure: net interest payable "
        "(£ million, current prices, NSA). ONS CDID NMFX in PUSF — the "
        "standard open PSF series used for debt-interest monitoring "
        "(CG measure; public-sector banks excluded from this CG concept)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d654717685815cb4e5d52cb43c17f3",
    connector_module="economy.connectors.public_sector_debt_interest",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=_PUSF_REVISIONS,
    caveats=(
        _PUSF_CAVEATS
        + " Chosen NMFX (CG net interest payable) over broader PS interest/"
        "dividend paid series — document if a PS-wide alternative is preferred."
    ),
    related_indicator_ids=_debt_family_related("public-sector-debt-interest"),
    open_questions=[
        "Prefer a public-sector (not CG-only) interest series if one is "
        "promoted as headline in a later PSF bulletin?",
    ],
)

TAX_RECEIPTS = OnsSeriesSpec(
    indicator_id="tax-receipts",
    title="Tax receipts",
    series_id="AHHY",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/ahhy/pusf"
    ),
    unit="£ million, NSA (PS taxes + NICs)",
    definition=(
        "Total public sector taxes and National Insurance contributions "
        "(£ million, NSA). ONS CDID AHHY in PUSF receipts table — official "
        "open series preferred over HMRC cash-receipts tables for this row "
        "(accruals-aligned PSF concept; includes NICs)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d654717685811090b0dba9cfd17526",
    connector_module="economy.connectors.tax_receipts",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=_PUSF_REVISIONS,
    caveats=(
        _PUSF_CAVEATS
        + " Not HMRC cash tax receipts and not ANBT (total current receipts, "
        "which includes non-tax income). AHHY = taxes + NICs only."
    ),
    related_indicator_ids=_related_except("tax-receipts"),
    open_questions=[
        "Add a parallel HMRC cash-receipts indicator later?",
    ],
)

TOTAL_MANAGED_EXPENDITURE = OnsSeriesSpec(
    indicator_id="total-managed-expenditure",
    title="Total managed expenditure",
    series_id="EBFT",
    dataset_id="PUSF",
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicsectorfinance/timeseries/ebft/pusf"
    ),
    unit="£ million, NSA",
    definition=(
        "Public sector total managed expenditure (TME), £ million current "
        "prices NSA. ONS CDID EBFT in PUSF — open monthly series matching "
        "the HMT/OBR TME concept published via ONS Public Sector Finances."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581fdbd63d0fe45d94e87",
    connector_module="economy.connectors.total_managed_expenditure",
    update_cadence="monthly (ONS Public Sector Finances)",
    transformations=_PUSF_TRANSFORM,
    revision_notes=_PUSF_REVISIONS,
    caveats=_PUSF_CAVEATS,
    related_indicator_ids=_related_except("total-managed-expenditure"),
    open_questions=[
        "Cross-check annual TME against HMT OSCAR / OBR Economic and Fiscal "
        "Outlook tables in Validation?",
    ],
)

BUSINESS_INVESTMENT = OnsSeriesSpec(
    indicator_id="business-investment",
    title="Business investment",
    series_id="NPEL",
    dataset_id="QNA",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/qna"
    ),
    unit="£ million chained volume, SA",
    definition=(
        "UK business investment (GFCF) in chained volume measures, seasonally "
        "adjusted, £ million. ONS CDID NPEL in dataset QNA (live vintage; "
        "the PN2 landing is frozen at 2026-08-12). Also published in the "
        "business investment releases."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/40d654717685811baa79e904f8c3646b",
    connector_module="economy.connectors.business_investment",
    update_cadence=(
        "quarterly (ONS GDP first estimate / QNA; Blue Book annually)"
    ),
    transformations=(
        "Download ONS timeseries JSON (NPEL/QNA /data). Keep only the "
        "quarters array (annual aggregates omitted). Map year+Q→ISO "
        "calendar-quarter bounds. Geography fixed to K02000001 / "
        "United Kingdom. Values parsed as float £m; empty → missing. "
        "observation_status=provisional (QNA vintage; ONS revises history)."
    ),
    revision_notes=(
        "NPEL levels revise with GDP/QNA releases and Blue Book CVM rebasing. "
        "Re-fetch and re-pin raw JSON; compare checksums. "
        "observation_status stays provisional to signal revision risk. "
        "Source switched PN2→QNA on 2026-11-11 (Orchestrator source policy). "
        "Vintage evidence: QNA 2026-09-29 latest quarter is 83,534 vs 78,413 "
        "in the retired PN2 2026-08-12 pin (+6.5%); level ratio is "
        "non-uniform (0.951–1.080) so 2026 Q2 YoY growth is +5.2% on QNA "
        "vs +0.8% on PN2. Never mix vintages in one chart."
    ),
    caveats=(
        "Legacy api.ons.gov.uk retired 2024-11-25; ingest uses website "
        "timeseries JSON. Industry/asset breakdowns live in the separate "
        "Business investment dataset — this indicator is the headline total. "
        "Annual rows present in raw JSON but not written to curated."
    ),
    related_indicator_ids=["real-gdp"],
    # Resolved 2026-11-11: Orchestrator chose QNA over the frozen PN2 landing.
    open_questions=[],
)

ALL_FISCAL_SPECS: dict[str, OnsSeriesSpec] = {
    spec.indicator_id: spec
    for spec in (
        PUBLIC_SECTOR_NET_BORROWING,
        PUBLIC_SECTOR_NET_DEBT,
        PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP,
        PUBLIC_SECTOR_DEBT_INTEREST,
        TAX_RECEIPTS,
        TOTAL_MANAGED_EXPENDITURE,
        BUSINESS_INVESTMENT,
    )
}

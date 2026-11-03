"""Economy Y1 — CPI, GDP/head, productivity, employment, inactivity, real earnings."""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

Y1_RELATED = [
    "cpi-inflation",
    "real-gdp-per-head",
    "labour-productivity",
    "employment-rate",
    "economic-inactivity-rate",
    "real-earnings",
    "real-gdp",
]

_MONTHLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array. "
    "Map year+month → ISO month bounds. Geography K02000001. "
    "observation_status=provisional (ONS revises)."
)

_QUARTERLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the quarters array. "
    "Map year+Q → ISO quarter bounds. Geography K02000001. "
    "observation_status=provisional (ONS revises)."
)


def _related_except(indicator_id: str) -> list[str]:
    return [i for i in Y1_RELATED if i != indicator_id]


CPI_INFLATION = OnsSeriesSpec(
    indicator_id="cpi-inflation",
    title="CPI inflation",
    series_id="D7G7",
    dataset_id="MM23",
    landing_url=(
        "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23"
    ),
    unit="% annual rate (CPI all items, 2015=100 base for index companion)",
    definition=(
        "UK Consumer Prices Index (CPI) annual rate, all items — the inflation "
        "measure used for the Bank of England / government CPI target. ONS CDID "
        "D7G7 in dataset MM23. Not CPIH (L522)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581fd992ff976385c80eb",
    connector_module="economy.connectors.cpi_inflation",
    update_cadence="monthly (ONS Consumer price inflation)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="CPI rates revise with basket/weight updates and corrections.",
    caveats="Headline CPI annual rate, not the index level (D7BT) and not CPIH.",
    related_indicator_ids=_related_except("cpi-inflation"),
)

REAL_GDP_PER_HEAD = OnsSeriesSpec(
    indicator_id="real-gdp-per-head",
    title="Real GDP per head",
    series_id="IHXW",
    dataset_id="PN2",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/pn2"
    ),
    unit="£ chained volume (market prices), SA",
    definition=(
        "UK GDP per head in chained volume measures (CVM), seasonally adjusted. "
        "ONS CDID IHXW in PN2. Companion to ABMI (real GDP level)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/40d65471768581e98479ff451a55164b",
    connector_module="economy.connectors.real_gdp_per_head",
    update_cadence="quarterly (ONS GDP / QNA)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes="Revises with GDP and population estimate updates / Blue Book.",
    caveats="CVM £ per head (IHXW), not current-price IHXT.",
    related_indicator_ids=["real-gdp"] + _related_except("real-gdp-per-head"),
)

LABOUR_PRODUCTIVITY = OnsSeriesSpec(
    indicator_id="labour-productivity",
    title="Labour productivity",
    series_id="LZVB",
    dataset_id="PRDY",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "labourproductivity/timeseries/lzvb/prdy"
    ),
    unit="Index 2023=100, SA (output per hour, whole economy)",
    definition=(
        "UK whole-economy labour productivity: output per hour worked, "
        "seasonally adjusted index (2023=100). ONS CDID LZVB in PRDY."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/40d65471768581268b4cd6d2d5ea6042",
    connector_module="economy.connectors.labour_productivity",
    update_cadence="quarterly (ONS productivity)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes="Productivity revises with GDP and labour input revisions.",
    caveats="Output per hour (LZVB), not output per filled job (LNNN).",
    related_indicator_ids=_related_except("labour-productivity"),
)

EMPLOYMENT_RATE = OnsSeriesSpec(
    indicator_id="employment-rate",
    title="Employment rate",
    series_id="LF24",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/lf24/lms"
    ),
    unit="% of population aged 16–64, SA",
    definition=(
        "UK employment rate for people aged 16 to 64, seasonally adjusted. "
        "ONS CDID LF24 in LMS (Labour Force Survey)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581aaae57f749d490be03",
    connector_module="economy.connectors.employment_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="LFS estimates revise; note reweighting episodes in release notes.",
    caveats=(
        "Rolling three-month average shown as mid-month in LMS convention. "
        "Aged 16–64 rate, not 16+."
    ),
    related_indicator_ids=_related_except("employment-rate"),
)

ECONOMIC_INACTIVITY_RATE = OnsSeriesSpec(
    indicator_id="economic-inactivity-rate",
    title="Economic inactivity rate",
    series_id="LF2S",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf2s/lms"
    ),
    unit="% of population aged 16–64, SA",
    definition=(
        "UK economic inactivity rate for people aged 16 to 64, seasonally "
        "adjusted. ONS CDID LF2S in LMS."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d654717685817f925bfa820d283c45",
    connector_module="economy.connectors.economic_inactivity_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="LFS estimates revise; check reweighting notes.",
    caveats="Aged 16–64 UK all-persons rate (not regional / sex breakdowns).",
    related_indicator_ids=_related_except("economic-inactivity-rate"),
)

REAL_EARNINGS = OnsSeriesSpec(
    indicator_id="real-earnings",
    title="Real earnings",
    series_id="A2FC",
    dataset_id="EMP",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "earningsandworkinghours/timeseries/a2fc/emp"
    ),
    unit="£ per week, SA, real terms (regular pay)",
    definition=(
        "Average weekly earnings (AWE) whole-economy regular pay in real terms, "
        "seasonally adjusted. ONS CDID A2FC. Companion nominal regular pay is KAI7."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d654717685814a998ad66b45808f8c",
    connector_module="economy.connectors.real_earnings",
    update_cadence="monthly (ONS AWE)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="AWE revises with later returns; real terms use CPIH deflator family.",
    caveats=(
        "Regular pay excluding bonuses/arrears, real terms. Great Britain AWE "
        "coverage for earnings survey — confirm geography notes on ONS page."
    ),
    related_indicator_ids=_related_except("real-earnings") + ["cpi-inflation"],
    geography="Great Britain / UK AWE whole economy (see ONS notes); coded K02000001 for spine",
)

ALL_Y1_SPECS = (
    CPI_INFLATION,
    REAL_GDP_PER_HEAD,
    LABOUR_PRODUCTIVITY,
    EMPLOYMENT_RATE,
    ECONOMIC_INACTIVITY_RATE,
    REAL_EARNINGS,
)

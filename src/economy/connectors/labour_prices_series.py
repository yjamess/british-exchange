"""Economy Y1 — CPI, GDP/head, productivity, employment, inactivity, real earnings."""

from __future__ import annotations

from economy.connectors.ons_timeseries import OnsSeriesSpec

Y1_RELATED = [
    "cpi-inflation",
    "cpi-index",
    "cpih-index",
    "cpih-inflation",
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
    "Latest month provisional; older months final "
    "(CPI/CPIH rarely revise history)."
)

_QUARTERLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the quarters array. "
    "Map year+Q → ISO quarter bounds. Geography K02000001. "
    "observation_status=provisional (ONS revises)."
)


def _related_except(indicator_id: str, *extra: str) -> list[str]:
    """Y1_RELATED minus this indicator, plus any extras — each id listed once."""
    related = [i for i in Y1_RELATED if i != indicator_id]
    related.extend(i for i in extra if i not in related)
    return related


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

CPI_INDEX = OnsSeriesSpec(
    indicator_id="cpi-index",
    title="CPI index",
    series_id="D7BT",
    dataset_id="MM23",
    landing_url=(
        "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23"
    ),
    unit="Index 2015=100 (CPI all items)",
    definition=(
        "UK Consumer Prices Index (CPI) all-items index level (2015=100). "
        "ONS CDID D7BT in dataset MM23. Used to express house prices in real terms. "
        "Not the annual rate (D7G7) and not CPIH (L522)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="",
    connector_module="economy.connectors.cpi_index",
    update_cadence="monthly (ONS Consumer price inflation)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="CPI index revises with basket/weight updates and corrections.",
    caveats="Index level for deflation; pair with cpi-inflation (D7G7) for the rate. Prefer cpih-index for household energy real-terms.",
    related_indicator_ids=_related_except("cpi-index", "uk-average-house-price"),
)

CPIH_INDEX = OnsSeriesSpec(
    indicator_id="cpih-index",
    title="CPIH index",
    series_id="L522",
    dataset_id="MM23",
    landing_url=(
        "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23"
    ),
    unit="Index 2015=100 (CPIH all items)",
    definition=(
        "UK Consumer Prices Index including owner occupiers' housing costs (CPIH) "
        "all-items index level (2015=100). ONS CDID L522 in dataset MM23. Preferred "
        "household-cost deflator for Energy real-terms bills. Distinct from CPI (D7BT)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="",
    connector_module="economy.connectors.cpih_index",
    update_cadence="monthly (ONS Consumer price inflation)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="CPIH index revises with basket/weight updates and corrections.",
    caveats="Not CPI (D7BT). Energy must link this Economy series — do not fork under data/energy.",
    related_indicator_ids=_related_except(
        "cpih-index", "domestic-electricity-bills", "domestic-gas-bills"
    ),
)

CPIH_INFLATION = OnsSeriesSpec(
    indicator_id="cpih-inflation",
    title="CPIH inflation",
    series_id="L55O",
    dataset_id="MM23",
    landing_url=(
        "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23"
    ),
    unit="% annual rate (CPIH all items)",
    definition=(
        "UK Consumer Prices Index including owner occupiers' housing costs (CPIH) "
        "annual rate, all items. ONS CDID L55O in dataset MM23. ONS's lead measure "
        "of consumer price inflation; companion rate to cpih-index (L522). "
        "Distinct from CPI annual rate (D7G7), the Bank of England target measure."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/415654717685815b877cc6795dac6273",
    connector_module="economy.connectors.cpih_inflation",
    update_cadence="monthly (ONS Consumer price inflation)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="CPIH rates revise with basket/weight updates and corrections.",
    caveats=(
        "Headline CPIH annual rate, not the index level (L522) and not CPI (D7G7). "
        "Never label as CPI. Economy-owned; Energy/Housing link by id."
    ),
    related_indicator_ids=_related_except("cpih-inflation"),
)

REAL_GDP_PER_HEAD = OnsSeriesSpec(
    indicator_id="real-gdp-per-head",
    title="Real GDP per head",
    series_id="IHXW",
    dataset_id="QNA",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/qna"
    ),
    unit="£ chained volume (market prices), SA",
    definition=(
        "UK GDP per head in chained volume measures (CVM), seasonally adjusted. "
        "ONS CDID IHXW in QNA (reference year 2024). Companion to ABMI "
        "(real GDP level)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/40d65471768581e98479ff451a55164b",
    connector_module="economy.connectors.real_gdp_per_head",
    update_cadence="quarterly (ONS GDP / QNA)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        "Revises with GDP and population estimate updates / Blue Book. "
        "Reference year moves with annual rebasing: the retired PN2 pin "
        "(2026-08-12) was reference year 2023; QNA vintage 2026-09-29 is "
        "reference year 2024 (levels ~4.5% higher, growth since 2019 Q4 "
        "within 0.1 pp). Source switched PN2→QNA on 2026-11-11. "
        "Do not mix vintages in one level chart."
    ),
    caveats=(
        "CVM £ per head (IHXW), not current-price IHXT. ONS publishes 0 as a "
        "placeholder before 1955 Q1 — connector maps those to missing "
        "(zero_as_missing_before=1955-01-01)."
    ),
    # Y1_RELATED already contains "real-gdp"; do not prepend it again.
    related_indicator_ids=_related_except("real-gdp-per-head"),
    zero_as_missing_before="1955-01-01",
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
    revision_notes=(
        "Productivity revises with GDP and labour input revisions. Index "
        "base year (2023=100 at the 2026-08-17 release) can move at the next "
        "productivity release (2026-11-17) when output is rebased; re-read "
        "the series title for the base year on every re-pin."
    ),
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
        "Regular pay excluding bonuses/arrears, real terms (CPIH-based, 2015 "
        "prices). ONS AWE covers Great Britain only — geography_code K03000001."
    ),
    geography="Great Britain (K03000001); AWE excludes Northern Ireland",
    geography_code="K03000001",
    geography_label="Great Britain",
    # Y1_RELATED already lists the CPI/CPIH family; add the nominal companion once.
    related_indicator_ids=["nominal-earnings"] + _related_except("real-earnings"),
)

NOMINAL_EARNINGS = OnsSeriesSpec(
    indicator_id="nominal-earnings",
    title="Average weekly earnings (cash terms)",
    series_id="KAI7",
    dataset_id="EMP",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "earningsandworkinghours/timeseries/kai7/emp"
    ),
    unit="£ per week, SA, cash terms (regular pay)",
    definition=(
        "Average weekly earnings (AWE) whole-economy regular pay in cash (nominal) terms, "
        "seasonally adjusted. ONS CDID KAI7. Companion real-terms series is A2FC (real-earnings)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4146547176858139b68ae2c75df07043",
    connector_module="economy.connectors.nominal_earnings",
    update_cadence="monthly (ONS AWE)",
    transformations=_MONTHLY_TRANSFORM,
    revision_notes="AWE revises with later returns.",
    caveats=(
        "Regular pay per employee, excluding bonuses and arrears; not household income. "
        "Used by Energy for bills as a share of average pay (cash bill ÷ cash pay). "
        "ONS AWE covers Great Britain only — geography_code K03000001."
    ),
    related_indicator_ids=["real-earnings", "cpih-index", "cpi-index", "cpi-inflation"],
    geography="Great Britain (K03000001); AWE excludes Northern Ireland",
    geography_code="K03000001",
    geography_label="Great Britain",
)

ALL_Y1_SPECS = (
    CPI_INFLATION,
    REAL_GDP_PER_HEAD,
    LABOUR_PRODUCTIVITY,
    EMPLOYMENT_RATE,
    ECONOMIC_INACTIVITY_RATE,
    REAL_EARNINGS,
)

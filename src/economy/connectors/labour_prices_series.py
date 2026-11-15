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
    "labour-productivity-hours",
    "employment-rate",
    "employment-level",
    "unemployment-rate",
    "unemployment-level",
    "economic-inactivity-rate",
    "economic-inactivity-level",
    "inactivity-reason-students",
    "inactivity-reason-family-home",
    "inactivity-reason-temp-sick",
    "inactivity-reason-long-term-sick",
    "inactivity-reason-retired",
    "inactivity-reason-other",
    "uk-vacancies",
    "average-actual-weekly-hours",
    "employment-full-time",
    "employment-part-time",
    "workforce-jobs",
    "real-earnings",
    "real-gdp",
]

_MONTHLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array. "
    "Map year+month → ISO month bounds. Geography K02000001. "
    "Latest month provisional; older months final "
    "(CPI/CPIH rarely revise history)."
)

_LMS_MONTHLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the months array. "
    "Map year+month → ISO month bounds. Geography K02000001. "
    "Latest month provisional; older months final "
    "(LFS revises with reweighting and seasonal-adjustment updates)."
)

_QUARTERLY_TRANSFORM = (
    "Download ONS timeseries JSON (/data). Keep only the quarters array. "
    "Map year+Q → ISO quarter bounds. Geography K02000001. "
    "observation_status=provisional (ONS revises)."
)

_LFS_CAVEAT_SHARED = (
    "LFS rolling three-month average shown as mid-month in LMS convention "
    "(e.g. Jun–Aug → July). LFS has known response-rate and reweighting "
    "issues — do not overinterpret small monthly moves. Claimant counts "
    "are not ILO unemployment."
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
    dataset_id="PN2",
    landing_url=(
        "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/pn2"
    ),
    unit="£ chained volume (market prices), SA",
    definition=(
        "UK GDP per head in chained volume measures (CVM), seasonally adjusted. "
        "ONS CDID IHXW in PN2 (first quarterly estimate; reference year 2024). "
        "Companion to ABMI (real GDP level). Live source = PN2 as of "
        "2026-11-14 (QNA still on 2026-09-29)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/40d65471768581e98479ff451a55164b",
    connector_module="economy.connectors.real_gdp_per_head",
    update_cadence="quarterly (ONS GDP first estimate / QNA)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        "Revises with GDP and population estimate updates / Blue Book. "
        "Orchestrator 2026-11-14: live pin is PN2 (release 2026-11-12, "
        "through 2026 Q3). Prefer QNA when its releaseDate is newer. "
        "Retired Aug-2026 PN2 was reference year 2023; Nov-2026 PN2 / "
        "Sep-2026 QNA are reference year 2024. Do not mix vintages in one "
        "level chart."
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
    caveats=(
        "Output per hour (LZVB), not output per filled job (LNNN). Pair with "
        "labour-productivity-hours (LZVA) for hours × output-per-hour views."
    ),
    related_indicator_ids=_related_except("labour-productivity"),
)

LABOUR_PRODUCTIVITY_HOURS = OnsSeriesSpec(
    indicator_id="labour-productivity-hours",
    title="Labour productivity hours",
    series_id="LZVA",
    dataset_id="PRDY",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "labourproductivity/timeseries/lzva/prdy"
    ),
    unit="Index 2023=100, SA (productivity hours, whole economy)",
    definition=(
        "UK whole-economy productivity hours worked, seasonally adjusted "
        "index (2023=100). ONS CDID LZVA in PRDY — the labour-input companion "
        "to output per hour (LZVB)."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/41565471768581e788f5d9373c99e34c",
    connector_module="economy.connectors.labour_productivity_hours",
    update_cadence="quarterly (ONS productivity)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        "Hours revise with LFS labour-input and seasonal-adjustment updates. "
        "Index base year (2023=100 at the 2026-08-17 release) can move at the "
        "next productivity release (2026-11-17); re-read the series title on "
        "every re-pin."
    ),
    caveats=(
        "Productivity hours index (LZVA), not absolute hours totals and not "
        "employment (LF24). Same PRDY vintage as labour-productivity (LZVB). "
        "LFS labour inputs are not accredited official statistics — keep that "
        "on Notes."
    ),
    related_indicator_ids=_related_except("labour-productivity-hours"),
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
        "ONS CDID LF24 in LMS (Labour Force Survey). Numerator companion is "
        "employment-level (LF2G); denominator is working-age population."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d65471768581aaae57f749d490be03",
    connector_module="economy.connectors.employment_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS estimates revise with reweighting and seasonal-adjustment "
        "updates; check the labour-market bulletin notes on every re-pin."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16–64 rate of population, not 16+. "
        "Do not add to inactivity rate and unemployment rate as a "
        "population composition — unemployment uses the economically "
        "active denominator. Flagship composition needs matched counts "
        "(LF2G / LF2I / LF2M)."
    ),
    related_indicator_ids=_related_except("employment-rate"),
)

EMPLOYMENT_LEVEL = OnsSeriesSpec(
    indicator_id="employment-level",
    title="Employment level (aged 16–64)",
    series_id="LF2G",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/lf2g/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK number of people aged 16 to 64 in employment, seasonally "
        "adjusted, thousands. ONS CDID LF2G in LMS. Matched count companion "
        "to employment-rate (LF24) for The British Workforce flagship."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581aebb16ea1522da303b",
    connector_module="economy.connectors.employment_level",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16–64 levels, not the headline 16+ "
        "employment level (MGRZ). Link Energy manufacturing-employment — "
        "do not fork industry jobs here."
    ),
    related_indicator_ids=_related_except("employment-level"),
)

UNEMPLOYMENT_RATE = OnsSeriesSpec(
    indicator_id="unemployment-rate",
    title="Unemployment rate (aged 16–64)",
    series_id="LF2Q",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "unemployment/timeseries/lf2q/lms"
    ),
    unit="% of economically active aged 16–64, SA",
    definition=(
        "UK ILO unemployment rate for people aged 16 to 64, seasonally "
        "adjusted. ONS CDID LF2Q in LMS. Share of the economically active "
        "(employed + unemployed), not of the whole working-age population. "
        "Distinct from headline 16+ rate MGSX."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/418654717685813b8a61fc0b21d78f00",
    connector_module="economy.connectors.unemployment_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS estimates revise with reweighting and seasonal-adjustment "
        "updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Never add LF2Q to LF24 and LF2S as a "
        "population composition. Prefer LF2Q (16–64) with Domain 03 "
        "counts; do not silently substitute MGSX (16+)."
    ),
    related_indicator_ids=_related_except("unemployment-rate"),
)

UNEMPLOYMENT_LEVEL = OnsSeriesSpec(
    indicator_id="unemployment-level",
    title="Unemployment level (aged 16–64)",
    series_id="LF2I",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "unemployment/timeseries/lf2i/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK number of ILO unemployed people aged 16 to 64, seasonally "
        "adjusted, thousands. ONS CDID LF2I in LMS. Matched count companion "
        "for The British Workforce; distinct from headline 16+ level MGSC."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581f0abb5ecbef00645f4",
    connector_module="economy.connectors.unemployment_level",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} ILO unemployment ≠ Claimant Count. Aged "
        "16–64, not 16+ (MGSC)."
    ),
    related_indicator_ids=_related_except("unemployment-level"),
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
        "adjusted. ONS CDID LF2S in LMS. Numerator companion is "
        "economic-inactivity-level (LF2M)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/40d654717685817f925bfa820d283c45",
    connector_module="economy.connectors.economic_inactivity_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS estimates revise with reweighting and seasonal-adjustment "
        "updates; check the labour-market bulletin notes on every re-pin."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16–64 UK all-persons rate (not "
        "regional / sex breakdowns). Inactivity is outside the labour "
        "force — not unemployment."
    ),
    related_indicator_ids=_related_except("economic-inactivity-rate"),
)

ECONOMIC_INACTIVITY_LEVEL = OnsSeriesSpec(
    indicator_id="economic-inactivity-level",
    title="Economic inactivity level (aged 16–64)",
    series_id="LF2M",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf2m/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK number of economically inactive people aged 16 to 64, "
        "seasonally adjusted, thousands. ONS CDID LF2M in LMS. Matched "
        "count companion to economic-inactivity-rate (LF2S) for The "
        "British Workforce flagship."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581d4be4cc8fb3c6fd80f",
    connector_module="economy.connectors.economic_inactivity_level",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16–64 inactivity level (headline "
        "inactivity is also 16–64). Outside the Workforce reason levels "
        "(LF63/LF65/LF67/LF69/LF6B/LF6D) plus discouraged (LFL8) should "
        "reconcile approximately to this total. LF77 is a percent of "
        "inactive people — do not invent a level from LF77 × LF2M."
    ),
    related_indicator_ids=_related_except("economic-inactivity-level"),
)

# Outside the Workforce — INAC01 / LMS reason LEVELS (000s SA, UK 16–64).
# Prefer levels over % twins (LF6X/LF73/LF75/LF79/LF7B/LF77).
# Discouraged workers: the all-persons level is LFL8 (INAC01 SA identifier
# on the reason-levels block). LF77 is the % companion. LF8B is the
# wants-a-job subset only — do not use it as the all-persons level.
_INAC_REASON_RELATED_EXTRA = (
    "economic-inactivity-level",
    "economic-inactivity-rate",
    "inactivity-reason-students",
    "inactivity-reason-family-home",
    "inactivity-reason-temp-sick",
    "inactivity-reason-long-term-sick",
    "inactivity-reason-retired",
    "inactivity-reason-other",
)

_INAC_REASON_CAVEAT = (
    f"{_LFS_CAVEAT_SHARED} Reason levels from LMS / INAC01 SA "
    "(economic inactivity by reason). Sum of principal reason levels plus "
    "inactivity-reason-discouraged (LFL8) ≈ economic-inactivity-level "
    "(LF2M); published rounding can leave a small residual. Never invent "
    "levels from % series × LF2M. Do not draw person-flow arrows between reasons."
)


def _inac_related(indicator_id: str) -> list[str]:
    """Related IDs for one inactivity-reason series."""
    related = [i for i in Y1_RELATED if i != indicator_id]
    related.extend(i for i in _INAC_REASON_RELATED_EXTRA if i not in related and i != indicator_id)
    return related


INACTIVITY_REASON_STUDENTS = OnsSeriesSpec(
    indicator_id="inactivity-reason-students",
    title="Economic inactivity — students (aged 16–64)",
    series_id="LF63",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf63/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is being a "
        "student, seasonally adjusted, thousands. ONS CDID LF63 in LMS "
        "(INAC01 SA family). Level twin — not the % series LF6X."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581078443eb82c80e7ea9",
    connector_module="economy.connectors.inactivity_reason_students",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-students"),
)

INACTIVITY_REASON_FAMILY_HOME = OnsSeriesSpec(
    indicator_id="inactivity-reason-family-home",
    title="Economic inactivity — looking after family/home (aged 16–64)",
    series_id="LF65",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf65/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is looking "
        "after family or home, seasonally adjusted, thousands. ONS CDID "
        "LF65 in LMS (INAC01 SA family)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4186547176858117929ad54d550d7709",
    connector_module="economy.connectors.inactivity_reason_family_home",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-family-home"),
)

INACTIVITY_REASON_TEMP_SICK = OnsSeriesSpec(
    indicator_id="inactivity-reason-temp-sick",
    title="Economic inactivity — temporary sick (aged 16–64)",
    series_id="LF67",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf67/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is temporary "
        "sickness, seasonally adjusted, thousands. ONS CDID LF67 in LMS. "
        "Level twin — prefer over % series LF73."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581e2aec5c0318c86518d",
    connector_module="economy.connectors.inactivity_reason_temp_sick",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-temp-sick"),
)

INACTIVITY_REASON_LONG_TERM_SICK = OnsSeriesSpec(
    indicator_id="inactivity-reason-long-term-sick",
    title="Economic inactivity — long-term sick (aged 16–64)",
    series_id="LF69",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf69/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is long-term "
        "sickness, seasonally adjusted, thousands. ONS CDID LF69 in LMS. "
        "Level twin — prefer over % series LF75."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4186547176858143adc1e0621cfc23fc",
    connector_module="economy.connectors.inactivity_reason_long_term_sick",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-long-term-sick"),
)

INACTIVITY_REASON_RETIRED = OnsSeriesSpec(
    indicator_id="inactivity-reason-retired",
    title="Economic inactivity — retired (aged 16–64)",
    series_id="LF6B",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf6b/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is retirement, "
        "seasonally adjusted, thousands. ONS CDID LF6B in LMS (title omits "
        "'000s' but values are thousands on the same basis as LF2M). Prefer "
        "over % series LF79."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581e7a232f1f1ea7afc01",
    connector_module="economy.connectors.inactivity_reason_retired",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-retired"),
)

INACTIVITY_REASON_OTHER = OnsSeriesSpec(
    indicator_id="inactivity-reason-other",
    title="Economic inactivity — other reasons (aged 16–64)",
    series_id="LF6D",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf6d/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is 'other', "
        "seasonally adjusted, thousands. ONS CDID LF6D in LMS. Prefer over "
        "% series LF7B. Discouraged workers are a separate INAC01 level "
        "(LFL8) — not folded into this series. LF77 is the percent only."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/418654717685811c97bcde11b151f43e",
    connector_module="economy.connectors.inactivity_reason_other",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=_INAC_REASON_CAVEAT,
    related_indicator_ids=_inac_related("inactivity-reason-other"),
)

# LFL8 is the INAC01 SA "Discouraged workers" column on the reason-levels
# block (same row of CDIDs as LF63…LF6D). The LMS title does not repeat
# "16–64" or "SA"; those come from the INAC01 SA table, not from invention.
INACTIVITY_REASON_DISCOURAGED = OnsSeriesSpec(
    indicator_id="inactivity-reason-discouraged",
    title="Economic inactivity — discouraged workers (aged 16–64)",
    series_id="LFL8",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/lfl8/lms"
    ),
    unit="Thousands of people aged 16–64, SA",
    definition=(
        "UK economically inactive aged 16–64 whose main reason is being a "
        "discouraged worker (not looking because they believe no jobs are "
        "available), seasonally adjusted, thousands. ONS CDID LFL8. The LMS "
        "title is only 'Discouraged workers level people: 000s'. Age, "
        "geography and seasonal adjustment are taken from INAC01 SA, where "
        "LFL8 is the dataset identifier on the all-persons reason-levels "
        "column. Not LF77 (percent) and not LF8B (wants-a-job subset)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4196547176858182bddbcee4b7cd75d7",
    connector_module="economy.connectors.inactivity_reason_discouraged",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason levels revise with reweighting and seasonal-adjustment "
        "updates. Counts are small — INAC01 shades small samples."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} This is the published level (LFL8), not a "
        "level made by multiplying LF77 by LF2M. LF8B is the wants-a-job "
        "subset and is smaller. Do not treat the LMS title's missing "
        "'16–64' / 'SA' words as a different series — the INAC01 SA "
        "identifier row is the basis. Small sample: do not overinterpret "
        "month-to-month moves."
    ),
    related_indicator_ids=[
        "economic-inactivity-level",
        "economic-inactivity-rate",
        "inactivity-reason-discouraged-rate",
        "inactivity-reason-students",
        "inactivity-reason-family-home",
        "inactivity-reason-temp-sick",
        "inactivity-reason-long-term-sick",
        "inactivity-reason-retired",
        "inactivity-reason-other",
    ],
    open_questions=[
        "LMS title omits 16–64 and SA; re-check the INAC01 SA identifier row on each re-pin.",
    ],
)

INACTIVITY_REASON_DISCOURAGED_RATE = OnsSeriesSpec(
    indicator_id="inactivity-reason-discouraged-rate",
    title="Discouraged workers as a share of inactive people (aged 16–64)",
    series_id="LF77",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/"
        "economicinactivity/timeseries/lf77/lms"
    ),
    unit="% of economically inactive people aged 16–64, SA",
    definition=(
        "Percentage of UK economically inactive people aged 16–64 whose "
        "main reason is being a discouraged worker, seasonally adjusted. "
        "ONS CDID LF77 in LMS (INAC01 SA percent block). This is not a "
        "level in thousands. Do not multiply by LF2M to make a count — "
        "the level is inactivity-reason-discouraged (LFL8)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/419654717685814bbe94f304fdbe1daf",
    connector_module="economy.connectors.inactivity_reason_discouraged_rate",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS reason percentages revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} NOT A LEVEL. Percent of inactive people "
        "(denominator = economically inactive aged 16–64), not a count and "
        "not a share of the whole population. Do not multiply LF77 by LF2M. "
        "Published to one decimal place on the LMS timeseries (INAC01 "
        "workbook holds a fuller percentage)."
    ),
    related_indicator_ids=[
        "inactivity-reason-discouraged",
        "economic-inactivity-level",
        "economic-inactivity-rate",
    ],
)

UK_VACANCIES = OnsSeriesSpec(
    indicator_id="uk-vacancies",
    title="UK vacancies (total)",
    series_id="AP2Y",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/ap2y/lms"
    ),
    unit="Thousands of vacancies, SA (three-month average)",
    definition=(
        "UK total vacancies, seasonally adjusted, thousands. ONS CDID AP2Y "
        "in LMS (Vacancy Survey). Headline three-month average; not hires "
        "and not Claimant Count."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581c4b9dcc8143efc237b",
    connector_module="economy.connectors.uk_vacancies",
    update_cadence="monthly (ONS vacancies / labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "Vacancy Survey revises with returns and seasonal-adjustment updates. "
        "Oct 2026 bulletin noted seasonal-adjustment basis unchanged; check "
        "LMS/UNEM processing notes on every re-pin (historic LMS vacancy "
        "update lag vs VACS01–03 has occurred)."
    ),
    caveats=(
        "Vacancies ≠ hires. Vacancy Survey employer measure — distinct from "
        "LFS employment/unemployment. Three-month average shown as mid-month "
        "in LMS convention."
    ),
    related_indicator_ids=_related_except(
        "uk-vacancies",
        "employment-level",
        "unemployment-level",
        "average-actual-weekly-hours",
    ),
)

AVERAGE_ACTUAL_WEEKLY_HOURS = OnsSeriesSpec(
    indicator_id="average-actual-weekly-hours",
    title="Average actual weekly hours (all workers)",
    series_id="YBUV",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/ybuv/lms"
    ),
    unit="Hours per week, SA (main & 2nd job)",
    definition=(
        "UK average actual weekly hours of work for all workers in main and "
        "second job, seasonally adjusted. ONS CDID YBUV in LMS (HOUR01 SA "
        "family). Headline hours series for The Working Week."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/418654717685812287abf07322e3768b",
    connector_module="economy.connectors.average_actual_weekly_hours",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS hours revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Average hours across workers with a main "
        "and/or second job — not total hours (YBUS) and not FT-only (YBUY). "
        "Pair with employment-full-time (YCBE) / employment-part-time (YCBH); "
        "those are 16+ levels — age-break chip vs employment-level (LF2G 16–64)."
    ),
    related_indicator_ids=_related_except(
        "average-actual-weekly-hours",
        "employment-level",
        "employment-full-time",
        "employment-part-time",
        "uk-vacancies",
        "labour-productivity-hours",
    ),
)

EMPLOYMENT_FULL_TIME = OnsSeriesSpec(
    indicator_id="employment-full-time",
    title="Full-time employment level (16+)",
    series_id="YCBE",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/ycbe/lms"
    ),
    unit="Thousands of people in full-time employment, SA (16+)",
    definition=(
        "UK number of people in full-time employment, all ages 16 and over, "
        "seasonally adjusted, thousands. ONS CDID YCBE in LMS (EMP01 SA "
        "family). Companion to employment-part-time (YCBH)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/41865471768581eaaaf9edcb2290a45e",
    connector_module="economy.connectors.employment_full_time",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16+ (not 16–64 LF2G). Do not mix into "
        "The British Workforce composition without an age-break chip. "
        "YCBE + YCBH ≈ headline 16+ employment, not LF2G."
    ),
    related_indicator_ids=_related_except(
        "employment-full-time",
        "employment-part-time",
        "average-actual-weekly-hours",
        "employment-level",
    ),
)

EMPLOYMENT_PART_TIME = OnsSeriesSpec(
    indicator_id="employment-part-time",
    title="Part-time employment level (16+)",
    series_id="YCBH",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/ycbh/lms"
    ),
    unit="Thousands of people in part-time employment, SA (16+)",
    definition=(
        "UK number of people in part-time employment, all ages 16 and over, "
        "seasonally adjusted, thousands. ONS CDID YCBH in LMS (EMP01 SA "
        "family). Companion to employment-full-time (YCBE)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4186547176858154973ad2cf13766489",
    connector_module="economy.connectors.employment_part_time",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} Aged 16+ (not 16–64). Part-time ≠ "
        "underemployment (EMP16, NSA, people) and ≠ involuntary part-time "
        "(YCCX, could not find a full-time job)."
    ),
    related_indicator_ids=_related_except(
        "employment-part-time",
        "employment-full-time",
        "average-actual-weekly-hours",
        "employment-level",
        "underemployment",
        "involuntary-part-time",
    ),
)

INVOLUNTARY_PART_TIME = OnsSeriesSpec(
    indicator_id="involuntary-part-time",
    title="Involuntary part-time (could not find full-time job)",
    series_id="YCCX",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/yccx/lms"
    ),
    unit="Thousands of people, SA (UK: All)",
    definition=(
        "UK people in part-time work because they could not find a full-time "
        "job, seasonally adjusted, thousands. ONS CDID YCCX in LMS. Title: "
        "'LFS: Part-time workers: Could not find full-time job: UK: All: "
        "Thousands: SA'. This is a reason for part-time work (EMP01 family), "
        "not underemployment (EMP16) and not all part-time employment (YCBH)."
    ),
    frequency="monthly",
    period_kind="months",
    notion_registry_url="https://app.notion.com/p/4196547176858174bd68dabbaa9b11da",
    connector_module="economy.connectors.involuntary_part_time",
    update_cadence="monthly (ONS labour market)",
    transformations=_LMS_MONTHLY_TRANSFORM,
    revision_notes=(
        "LFS levels revise with reweighting and seasonal-adjustment updates."
    ),
    caveats=(
        f"{_LFS_CAVEAT_SHARED} ONS title says UK: All, not aged 16–64. It "
        "sits with EMP01 part-time reasons beside YCBH (16+). Do not mix "
        "into the 16–64 workforce stack. Not a share of part-time jobs — "
        "the level only. Not EMP16 underemployment (people who want more "
        "hours, NSA, counted as people rather than thousands)."
    ),
    related_indicator_ids=[
        "employment-part-time",
        "employment-full-time",
        "underemployment",
        "average-actual-weekly-hours",
        "employment-level",
    ],
)

WORKFORCE_JOBS = OnsSeriesSpec(
    indicator_id="workforce-jobs",
    title="Workforce jobs (UK total)",
    series_id="DYDC",
    dataset_id="LMS",
    landing_url=(
        "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
        "employmentandemployeetypes/timeseries/dydc/lms"
    ),
    unit="Thousands of jobs, SA",
    definition=(
        "UK total workforce jobs, seasonally adjusted, thousands. ONS CDID "
        "DYDC in LMS (JOBS01 family). Jobs measure (employer surveys + LFS "
        "components) — not the same as LFS employed people (LF2G/MGRZ). "
        "Industry sections live in JOBS02 — not this single series."
    ),
    frequency="quarterly",
    period_kind="quarters",
    notion_registry_url="https://app.notion.com/p/41865471768581c38bcafcb0c97f907e",
    connector_module="economy.connectors.workforce_jobs",
    update_cadence="quarterly (ONS vacancies and jobs / workforce jobs)",
    transformations=_QUARTERLY_TRANSFORM,
    revision_notes=(
        "Workforce jobs revise with QBS/QPSES/LFS inputs and annual "
        "benchmarking (typically December). Prefer JOBS02 for industry "
        "breakdown; link Energy manufacturing-employment — never fork."
    ),
    caveats=(
        "Jobs ≠ people in employment. One person can hold more than one job. "
        "National total only. Industry sections are workforce-jobs-by-industry "
        "(JOBS02, levels not shares). Section C is the same published series "
        "as Energy manufacturing-employment (JWR7) — do not fork that "
        "indicator. BRES regional jobs stay with Energy."
    ),
    related_indicator_ids=_related_except(
        "workforce-jobs",
        "employment-level",
        "uk-vacancies",
        "manufacturing-employment",
        "workforce-jobs-by-industry",
    ),
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

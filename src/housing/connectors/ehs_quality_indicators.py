"""English Housing Survey — Domain 07 "Inside the home" condition indicators.

Emits England (and, where EHS publishes it, region) survey estimates of the
share of dwellings that are:

- ``ehs-decent-homes`` — non-decent, plus each failed criterion
  (DA3201 dwellings · DA3202 areas · DT3101 trend)
- ``ehs-category-1-hazards`` — any HHSRS Category 1 hazard, excess cold, any
  falls, other hazards (DA4101 · DA4102 · annex AT1.6 / AT1.8 hazard types)
- ``ehs-damp-surveyor`` — any surveyor-recorded damp, rising, penetrating,
  condensation/mould (DA5101 · DA5102 · annex AT1.9 history / AT1.10)
- ``ehs-energy-efficiency-bands`` — EER band shares (DA7101 · DA7102)
- ``ehs-disrepair`` — standardised basic repair cost bands (repairs needed)
  and all five electrical safety features (DA5201 · DA5202)

Breakdowns are only what EHS publishes: tenure, dwelling age band, dwelling
type, usable floor area band and region (2020+; three sub-national areas
2008–2019). Before 2022 the characteristic rows are all-tenures only; from
2022 the condition tables publish each characteristic row by tenure. Energy
(DA7101) never crosses characteristics with tenure. Nothing is modelled,
derived, summed or interpolated; suppressed ``u`` cells are kept as
``observation_status=suppressed`` with no value.

Notes keys (``key=value; …``): ``series``, ``tenure``, ``breakdown``
(none | dwelling-age | dwelling-type | floor-area | region |
sub-national-area), the breakdown key itself (``dwelling-age=…`` etc.),
``category=<breakdown>:<slug>`` (typed API filter), ``observation-type``,
``table``, ``base``, ``row-sample-unweighted``, ``row-dwellings-000s``,
``sample-scope`` and caveat flags.

Run:
  uv run python -m housing.connectors.ehs_quality_indicators
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.connectors.ehs_da_parse import (
    DWELLING_TYPE_GROUPING,
    DaCell,
    area_geography,
    parse_cell,
    parse_da_table,
)
from housing.connectors.ehs_pins import (
    COLLECTION_CONDITION,
    COLLECTION_ENERGY,
    PINS,
    pin_into,
)
from housing.ods_util import read_ods_sheet

ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "percent of dwellings"
SOURCE_VERSION = (
    "EHS live tables 2026-07-09 (dwelling years to 2024) + 2024-25 headline annex 2026-01-29"
)

DECENT_MEASURES = {
    "non-decent": "non-decent",
    "minimumstandard": "fails-minimum-standard",
    "repair": "fails-repair",
    "repairs": "fails-repair",
    "modernfacilitiesandservices": "fails-modern-facilities",
    "thermalcomfort": "fails-thermal-comfort",
}
HAZARD_MEASURES = {
    "anyhazard": "any-category-1-hazard",
    "excesscold": "excess-cold",
    "anyfalls": "any-falls",
    "anyotherhazards": "any-other-hazards",
}
DAMP_MEASURES = {
    "anydamp": "any-damp",
    "risingdamp": "rising-damp",
    "penetratingdamp": "penetrating-damp",
    "condensation/mould": "condensation-mould",
}
DISREPAIR_MEASURES = {
    "zerocosts": "no-basic-repair-costs",
    "£1-20/m": "repair-cost-gbp-1-20-per-m2",
    "£20-35/m": "repair-cost-gbp-20-35-per-m2",
    "£35-65/m": "repair-cost-gbp-35-65-per-m2",
    "over£65/m": "repair-cost-gbp-over-65-per-m2",
    "all5electricalsafetyfeatures": "all-5-electrical-safety-features",
}
ENERGY_MEASURES = {
    "a/b": "band-a-b",
    "c": "band-c",
    "a/b/c": "band-a-b-c",
    "d": "band-d",
    "e": "band-e",
    "f": "band-f",
    "g": "band-g",
    "e/f/g": "band-e-f-g",
}

BREAKDOWN_ORDER = {
    "none": 0,
    "dwelling-age": 1,
    "dwelling-type": 2,
    "floor-area": 3,
    "region": 4,
    "sub-national-area": 5,
}


@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    indicator_id: str
    title: str
    source_url: str
    series_id: str
    definition: str
    measure_map: dict[str, str]
    dwellings_pin: str
    areas_pin: str
    extra_pins: tuple[str, ...]
    notion_registry_url: str
    caveats: str
    headline_series: str
    series_values: tuple[str, ...] = field(default_factory=tuple)
    # Series whose values come from a model applied to surveyor records
    # (observation-type=modelled-derived); everything else survey-estimate.
    modelled_series: tuple[str, ...] = field(default_factory=tuple)
    title_note: str = ""


COMMON_CAVEATS = (
    "England survey estimates from the EHS physical (dwelling) survey — not UK, "
    "not an administrative count, not an assessment of any individual home. Each "
    "dwelling year pools two fieldwork years (e.g. 2024 = April 2023–March 2025). "
    "Breakdowns are exactly those published: 2008–2021 characteristic rows "
    "(dwelling age / type / floor area / area) are all-tenures only; from 2022 the "
    "condition tables cross each characteristic with owner occupied / private "
    "rented / social rented, but the tenure-specific cells share one row-level "
    "sample size (sample-scope=row-all-tenures). Region (9 ONS regions, E12…) is "
    "published from 2020; 2008–2019 only three sub-national areas (Northern; "
    "London and South East; Rest of England) with no ONS code. No dwelling type × "
    "region, age × region or region × tenure-by-characteristic cross is published. "
    "'u' = unweighted cell count 1–4 (suppressed, no value). 2020 and 2021 are "
    "occupied dwellings only and were modelled differently (no full internal "
    "inspection, COVID-19); several criteria are N/A (missing) in 2020–2022. 2022 "
    "combines 2021-22 'external plus' and 2022-23 full surveys (hybrid; compare "
    "with caution). Floor-area bands 2020–2022 use modelled internal dimensions."
)

SPECS: tuple[IndicatorSpec, ...] = (
    IndicatorSpec(
        indicator_id="ehs-decent-homes",
        title="EHS Decent Homes (non-decent and failed criteria)",
        source_url=COLLECTION_CONDITION,
        series_id="DA3201 / DA3202 / DT3101 Decent Homes",
        definition=(
            "Share of England dwellings failing the Decent Homes Standard "
            "(series=non-decent) and each criterion: minimum standard (HHSRS "
            "Category 1 hazard), repair, modern facilities and services, thermal "
            "comfort. English Housing Survey dwelling sample."
        ),
        measure_map=DECENT_MEASURES,
        dwellings_pin="DA3201",
        areas_pin="DA3202",
        extra_pins=("DT3101",),
        notion_registry_url="https://app.notion.com/p/40e6547176858127b963c302ab6ee1b9",
        caveats=(
            COMMON_CAVEATS
            + " Decent Homes 'minimum standard' uses the 15-hazard model for trend "
            "consistency (DT3101; DA3201 note 1). 2006–2007 come from the English "
            "House Condition Survey via DT3101; local authority / housing "
            "association splits for 2006–2007 are not ingested because the 2024-25 "
            "annex (AT1.4 note 5) states separate LA/HA estimates are not reliable "
            "before 2008-09. 2022–2024 LA/HA/all-private headline rows come from "
            "DT3101 (the modern DA3201 layout has no LA/HA split)."
        ),
        headline_series="non-decent",
        series_values=(
            "non-decent",
            "fails-minimum-standard",
            "fails-repair",
            "fails-modern-facilities",
            "fails-thermal-comfort",
        ),
    ),
    IndicatorSpec(
        indicator_id="ehs-category-1-hazards",
        title="EHS Category 1 hazards (HHSRS)",
        source_url=COLLECTION_CONDITION,
        series_id="DA4101 / DA4102 Health and safety + annex AT1.6 / AT1.8",
        definition=(
            "Share of England dwellings with at least one HHSRS Category 1 hazard "
            "(26 hazards from 2008), and by hazard group: excess cold, any falls, "
            "any other hazards (live tables); 2024 most common hazards (annex AT1.8)."
        ),
        measure_map=HAZARD_MEASURES,
        dwellings_pin="DA4101",
        areas_pin="DA4102",
        extra_pins=("CH1_QUALITY",),
        notion_registry_url="https://app.notion.com/p/40e6547176858171aa82d8790a911ac3",
        caveats=(
            COMMON_CAVEATS
            + " Excess cold uses SAP12 with new U-values from 2018 with a re-set "
            "threshold — trend across 2017/2018 is not like-for-like (DA4101 note 3). "
            "'Any falls' includes bath falls from 2008. Hazard-type series from AT1.8 "
            "(falls on stairs, on the level, between levels, damp hazard, multiple "
            "hazards) are 2024 only; dwellings can have several hazards so series do "
            "not sum."
        ),
        headline_series="any-category-1-hazard",
        series_values=(
            "any-category-1-hazard",
            "excess-cold",
            "any-falls",
            "any-other-hazards",
            "falls-on-stairs",
            "falls-on-the-level",
            "falls-between-levels",
            "damp-hazard",
            "multiple-category-1-hazards",
        ),
    ),
    IndicatorSpec(
        indicator_id="ehs-damp-surveyor",
        title="EHS damp (surveyor-recorded)",
        source_url=COLLECTION_CONDITION,
        series_id="DA5101 / DA5102 Damp and mould + annex AT1.9 / AT1.10",
        definition=(
            "Share of England dwellings where the surveyor records damp significant "
            "enough to be considered in the HHSRS assessment: any damp, rising damp, "
            "penetrating damp, condensation/mould; multiple damp problems (2024, "
            "AT1.10). Not resident-reported mould (see ehs-damp-mould-reported)."
        ),
        measure_map=DAMP_MEASURES,
        dwellings_pin="DA5101",
        areas_pin="DA5102",
        extra_pins=("CH1_QUALITY",),
        notion_registry_url="https://app.notion.com/p/40e65471768581d0855ccfceaedd61fe",
        caveats=(
            COMMON_CAVEATS
            + " Damp types are not mutually exclusive (a dwelling can be counted in "
            "more than one). Type split not collected 2020–2022 (N/A). 1996–2007 "
            "come from the English House Condition Survey via annex AT1.9 "
            "(all tenures only)."
        ),
        headline_series="any-damp",
        series_values=(
            "any-damp",
            "rising-damp",
            "penetrating-damp",
            "condensation-mould",
            "multiple-damp-problems",
        ),
    ),
    IndicatorSpec(
        indicator_id="ehs-energy-efficiency-bands",
        title="EHS energy efficiency bands",
        source_url=COLLECTION_ENERGY,
        series_id="DA7101 / DA7102 Energy performance (EER band %)",
        definition=(
            "English Housing Survey modelled energy efficiency rating (EER) band "
            "shares for England dwellings. Not the domestic EPC certificate register."
        ),
        measure_map=ENERGY_MEASURES,
        dwellings_pin="DA7101",
        areas_pin="DA7102",
        extra_pins=(),
        notion_registry_url="https://app.notion.com/p/40e6547176858163b32cdf232e2447ab",
        caveats=(
            COMMON_CAVEATS
            + " DA7101 publishes tenure (incl. local authority / housing association) "
            "as rows and characteristics all-tenures only, in every year. Combined "
            "A/B/C and E/F/G columns are published from 2012 only — 2008–2011 have "
            "A/B and C separately and band-a-b-c is NOT derived. SAP 2009 for "
            "2008–2011 tables, SAP 2012 thereafter (sap-version on each row); the "
            "dwelling-age bands split post-1990 into 1991-2002 / 2003-2013 / "
            "post-2013 from 2024."
        ),
        headline_series="band-a-b-c",
        series_values=tuple(ENERGY_MEASURES.values()),
    ),
    IndicatorSpec(
        indicator_id="ehs-disrepair",
        title="EHS disrepair (standardised basic repair costs) and electrical safety",
        source_url=COLLECTION_CONDITION,
        series_id="DA5201 / DA5202 Disrepair and electrics",
        definition=(
            "Share of England dwellings by standardised basic repair cost band — "
            "the modelled cost (£ per m² of floor area, current prices) of the "
            "basic repairs the EHS surveyor records as needed: zero costs (no "
            "basic repairs needed), £1–20, £20–35, £35–65, over £65 per m². Plus "
            "the share with all five electrical safety features (all PVC wiring, "
            "modern earthing, modern consumer unit, MCBs, RCDs). English Housing "
            "Survey dwelling sample."
        ),
        measure_map=DISREPAIR_MEASURES,
        dwellings_pin="DA5201",
        areas_pin="DA5202",
        extra_pins=(),
        notion_registry_url="",
        caveats=(
            COMMON_CAVEATS
            + " Repair-cost bands are modelled: surveyor-recorded faults priced "
            "with a standard schedule ('standardised basic repair costs', current "
            "prices of each survey year), so band boundaries are not inflation-"
            "adjusted and the share in higher bands rises with prices as well as "
            "with disrepair — compare years with caution. 'Basic' repairs exclude "
            "improvements and modernisation. Mean £/m² columns are published but "
            "not ingested (different unit). Electrical safety features are "
            "surveyor-observed."
        ),
        headline_series="no-basic-repair-costs",
        series_values=tuple(DISREPAIR_MEASURES.values()),
        modelled_series=(
            "no-basic-repair-costs",
            "repair-cost-gbp-1-20-per-m2",
            "repair-cost-gbp-20-35-per-m2",
            "repair-cost-gbp-35-65-per-m2",
            "repair-cost-gbp-over-65-per-m2",
        ),
    ),
)


# ---------------------------------------------------------------------------
# Row construction
# ---------------------------------------------------------------------------


def _period(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _fmt(value: float | None) -> str:
    if value is None:
        return ""
    return str(int(value)) if float(value).is_integer() else f"{value}"


def _year_flags(year: int, *, survey: str = "EHS") -> list[str]:
    flags: list[str] = []
    if survey == "EHCS":
        flags.append("survey=english-house-condition-survey")
    if year in (2020, 2021):
        flags += ["sample-base=occupied-dwellings-only", "covid-modelled=true"]
    if year == 2022:
        flags.append("hybrid-sample=2021-22-external-plus+2022-23-full")
    return flags


@dataclass(slots=True)
class RowSpec:
    """Everything needed to emit one Observation."""

    year: int
    series: str
    tenure: str
    value: float | None
    status: ObservationStatus
    raw: str
    table: str
    breakdown: str = "none"
    category: str = ""
    geography_code: str = ENGLAND_CODE
    geography_label: str = ENGLAND_LABEL
    extra: list[str] = field(default_factory=list)
    observation_type: str = "survey-estimate"

    def key(self) -> tuple[str, str, str, str, str, str]:
        return (
            str(self.year),
            self.geography_code,
            self.series,
            self.tenure,
            self.breakdown,
            self.category,
        )


def _notes(row: RowSpec) -> str:
    parts = [f"series={row.series}", f"tenure={row.tenure}", f"breakdown={row.breakdown}"]
    if row.breakdown != "none":
        parts.append(f"{row.breakdown}={row.category}")
        parts.append(f"category={row.breakdown}:{row.category}")
        if row.breakdown == "dwelling-type":
            parts.append(f"type-grouping={DWELLING_TYPE_GROUPING.get(row.category, 'single-type')}")
    parts += [
        f"observation-type={row.observation_type}",
        f"table={row.table}",
        f"geography={row.geography_label}",
        "base=dwellings",
    ]
    if row.status == "suppressed":
        parts.append("suppression=u-unweighted-count-1-to-4")
    elif row.status == "missing":
        reason = "N/A-covid-19-not-collected" if row.raw.upper() == "N/A" else f"published-as-{row.raw or 'blank'}"
        parts.append(f"not-published={reason}")
    parts += row.extra
    parts.append("not-individual-property=true")
    return "; ".join(parts)


def _observation(indicator_id: str, row: RowSpec) -> Observation:
    start, end = _period(row.year)
    return Observation(
        indicator_id=indicator_id,
        period_start=start,
        period_end=end,
        geography_code=row.geography_code,
        geography_label=row.geography_label,
        value=row.value,
        unit=UNIT,
        observation_status=row.status,
        source_version=SOURCE_VERSION,
        notes=_notes(row),
    )


def _cell_row(cell: DaCell, extra_flags: dict[int, list[str]]) -> RowSpec:
    breakdown = "none" if cell.group in ("all", "tenure") else cell.group
    category = "" if breakdown == "none" else cell.category
    geo_code, geo_label = ENGLAND_CODE, ENGLAND_LABEL
    if breakdown in ("region", "sub-national-area"):
        geo_code, geo_label = area_geography(breakdown, cell.category)
    extra = list(_year_flags(cell.year))
    extra += extra_flags.get(cell.year, [])
    if cell.tenure_label == "all social":
        extra.append("tenure-label=all social")
    if cell.row_sample is not None:
        extra.append(f"row-sample-unweighted={cell.row_sample}")
        extra.append(f"sample-scope={cell.sample_scope}")
    if cell.row_dwellings_000s is not None:
        extra.append(f"row-dwellings-000s={_fmt(cell.row_dwellings_000s)}")
    if breakdown == "floor-area" and cell.year in (2020, 2021, 2022):
        extra.append("floor-area-modelled=covid-internal-dimensions-not-collected")
    if cell.measure == "excess-cold" and cell.year >= 2018:
        extra.append("method=sap12-new-u-values-threshold-reset-2018")
    return RowSpec(
        year=cell.year,
        series=cell.measure,
        tenure=cell.tenure,
        value=cell.value,
        status=cell.status,
        raw=cell.raw,
        table=cell.table,
        breakdown=breakdown,
        category=category,
        geography_code=geo_code,
        geography_label=geo_label,
        extra=extra,
    )


def _sap_versions(path: Path) -> dict[int, list[str]]:
    """Read the 'based on the SAP 20xx methodology' footer on each DA7101 sheet."""
    from housing.connectors.ehs_table_parse import year_sheets

    out: dict[int, list[str]] = {}
    for sheet in year_sheets(path):
        rows = read_ods_sheet(path, sheet)
        text = " ".join(r[0] for r in rows if r and r[0])
        match = re.search(r"SAP\s*(\d{4})", text)
        if match:
            out[int(sheet)] = [f"sap-version=SAP{match.group(1)}"]
    return out


# ---------------------------------------------------------------------------
# Supplementary published tables (trend + 2024-25 annex)
# ---------------------------------------------------------------------------

ANNEX_TENURE = {
    "owner occupied": "owner-occupied",
    "all owner occupied": "owner-occupied",
    "private rented": "private-rented",
    "all private": "all-private",
    "all private sector": "all-private",
    "local authority": "local-authority",
    "housing association": "housing-association",
    "all social": "social-rented",
    "all social sector": "social-rented",
    "all tenures": "all-tenures",
}


def _block_after(rows: list[list[str]], marker: str, label_col: int) -> list[list[str]]:
    """Rows after the first row whose non-label cells contain ``marker``."""
    start = None
    for i, row in enumerate(rows):
        if any(marker == c.strip().lower() for c in row):
            start = i + 1
            break
    if start is None:
        raise ValueError(f"marker {marker!r} not found")
    block: list[list[str]] = []
    for row in rows[start:]:
        if any(c.strip().lower() in {"sample size", "percentages", "thousands of dwellings"} for c in row[label_col + 1 :]):
            break
        if len(row) > label_col and row[label_col].strip().lower().startswith(("note", "source", "sample size")):
            break
        block.append(row)
    return block


def dt3101_rows(path: Path) -> list[RowSpec]:
    """Decent Homes trend: 2006–2007 (EHCS) and LA/HA/all-private 2022+."""
    rows = read_ods_sheet(path, "DT3101")
    years = [int(c) for c in rows[3] if c.strip().isdigit()]
    nd_cols = [j for j, c in enumerate(rows[4]) if c.strip().lower() == "non-decent"]
    if len(years) != len(nd_cols):
        raise ValueError("DT3101 year / non-decent column mismatch")
    pct_start = next(
        i for i, r in enumerate(rows) if any("percentage of dwellings" in c.lower() for c in r)
    )
    out: list[RowSpec] = []
    for row in rows[pct_start + 1 :]:
        if not row or not row[0].strip():
            continue
        label = row[0].strip().lower()
        if label.startswith(("notes", "source", "1)", "2)")):
            break
        tenure = ANNEX_TENURE.get(label)
        if tenure is None:
            raise ValueError(f"DT3101 unknown tenure {label!r}")
        for year, col in zip(years, nd_cols):
            keep = year <= 2007 or (year >= 2022 and tenure in {"local-authority", "housing-association", "all-private"})
            if not keep:
                continue
            if year <= 2007 and tenure in {"local-authority", "housing-association"}:
                continue  # AT1.4 note 5: LA/HA not separable before 2008-09
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            value, status = parsed
            extra = _year_flags(year, survey="EHCS" if year <= 2007 else "EHS")
            extra.append("minimum-standard-hazards=15")
            if label == "all social":
                extra.append("tenure-label=all social")
            out.append(
                RowSpec(year=year, series="non-decent", tenure=tenure, value=value, status=status, raw=row[col].strip(), table="DT3101", extra=extra)
            )
    return out


def _annex_year_table(rows: list[list[str]], *, label_col: int, header_row: int) -> tuple[dict[int, int], list[list[str]]]:
    years: dict[int, int] = {}
    for j, c in enumerate(rows[header_row]):
        m = re.match(r"^(\d{4})", c.strip())
        if m:
            years[j] = int(m.group(1))
    return years, _block_after(rows, "percentages", label_col)


def at16_rows(path: Path) -> list[RowSpec]:
    """Annex AT1.6 any Category 1 hazard — LA / HA / all-private for 2022+."""
    rows = read_ods_sheet(path, "AT1_6")
    years, block = _annex_year_table(rows, label_col=1, header_row=4)
    out: list[RowSpec] = []
    for row in block:
        label = row[1].strip().lower() if len(row) > 1 else ""
        tenure = ANNEX_TENURE.get(label)
        if tenure not in {"local-authority", "housing-association", "all-private"}:
            continue
        for col, year in years.items():
            if year < 2022 or col >= len(row):
                continue
            parsed = parse_cell(row[col])
            if parsed is None:
                continue
            out.append(
                RowSpec(year=year, series="any-category-1-hazard", tenure=tenure, value=parsed[0], status=parsed[1], raw=row[col].strip(), table="AT1.6", extra=_year_flags(year) + ["source=2024-25-headline-annex"])
            )
    return out


AT18_SERIES = {
    "falls on stairs": "falls-on-stairs",
    "excess cold": "excess-cold",
    "falls on the level": "falls-on-the-level",
    "falls between levels": "falls-between-levels",
    "damp": "damp-hazard",
    "any category 1 hazard": "any-category-1-hazard",
    "multiple category 1 hazards": "multiple-category-1-hazards",
}
AT18_TENURE_COLS = {
    5: "owner-occupied",
    6: "private-rented",
    7: "local-authority",
    8: "housing-association",
    9: "social-rented",
    10: "all-tenures",
}


def at18_rows(path: Path) -> list[RowSpec]:
    """Annex AT1.8 most common Category 1 hazards, 2024, by tenure."""
    rows = read_ods_sheet(path, "AT1_8")
    header = " | ".join(c.strip().lower() for c in rows[5])
    for needle in ("owner occupiers", "privaterenters", "local authority", "housing association", "socialrenters", "alltenures"):
        if needle not in header.replace(" ", "") and needle not in header:
            raise ValueError(f"AT1.8 header changed: {needle!r} missing")
    block = _block_after(rows, "percentages", 1)
    out: list[RowSpec] = []
    for row in block:
        label = row[1].strip().lower() if len(row) > 1 else ""
        series = AT18_SERIES.get(label)
        if series is None:
            continue
        for col, tenure in AT18_TENURE_COLS.items():
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            out.append(
                RowSpec(year=2024, series=series, tenure=tenure, value=parsed[0], status=parsed[1], raw=row[col].strip(), table="AT1.8", extra=["source=2024-25-headline-annex", "not-mutually-exclusive=true"])
            )
    return out


AT19_COLS = {2: "rising-damp", 3: "penetrating-damp", 4: "condensation-mould", 5: "any-damp"}


def at19_rows(path: Path) -> list[RowSpec]:
    """Annex AT1.9 damp 1996–2007 (English House Condition Survey years)."""
    rows = read_ods_sheet(path, "AT1_9")
    block = _block_after(rows, "percentages", 1)
    out: list[RowSpec] = []
    for row in block:
        m = re.match(r"^(\d{4})", row[1].strip()) if len(row) > 1 else None
        if not m:
            continue
        year = int(m.group(1))
        if year > 2007:
            continue  # 2008+ comes from DA5101 (QA compares the overlap)
        for col, series in AT19_COLS.items():
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            out.append(
                RowSpec(year=year, series=series, tenure="all-tenures", value=parsed[0], status=parsed[1], raw=row[col].strip(), table="AT1.9", extra=_year_flags(year, survey="EHCS") + ["source=2024-25-headline-annex", "not-mutually-exclusive=true"])
            )
    return out


AT110_COLS = {
    2: "rising-damp",
    3: "penetrating-damp",
    4: "condensation-mould",
    5: "any-damp",
    6: "multiple-damp-problems",
}


def at110_rows(path: Path) -> list[RowSpec]:
    """Annex AT1.10 damp by tenure 2024 (adds LA / HA / all-private + multiple)."""
    rows = read_ods_sheet(path, "AT1_10")
    block = _block_after(rows, "percentages", 1)
    out: list[RowSpec] = []
    for row in block:
        label = row[1].strip().lower() if len(row) > 1 else ""
        tenure = ANNEX_TENURE.get(label)
        if tenure is None:
            continue  # own with mortgage / own outright / vacant OO not ingested
        for col, series in AT110_COLS.items():
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            out.append(
                RowSpec(year=2024, series=series, tenure=tenure, value=parsed[0], status=parsed[1], raw=row[col].strip(), table="AT1.10", extra=["source=2024-25-headline-annex"])
            )
    return out


# ---------------------------------------------------------------------------
# Connector
# ---------------------------------------------------------------------------


def _merge(primary: Iterable[RowSpec], supplements: Iterable[RowSpec]) -> list[RowSpec]:
    """Primary (live table) rows win; supplements only fill unpublished keys."""
    merged: dict[tuple[str, ...], RowSpec] = {}
    for row in primary:
        if row.key() in merged:
            raise ValueError(f"duplicate natural key {row.key()}")
        merged[row.key()] = row
    for row in supplements:
        merged.setdefault(row.key(), row)
    return list(merged.values())


def _sort_key(row: RowSpec) -> tuple[object, ...]:
    return (row.year, BREAKDOWN_ORDER[row.breakdown], row.category, row.tenure, row.series)


class EhsQualityConnector(Connector):
    def __init__(self, spec: IndicatorSpec, data_root: Path | None = None) -> None:
        self.spec = spec
        super().__init__(data_root or (HOUSING_DATA / spec.indicator_id))

    @property
    def indicator_id(self) -> str:
        return self.spec.indicator_id

    @property
    def pin_keys(self) -> list[str]:
        return [self.spec.dwellings_pin, self.spec.areas_pin, *self.spec.extra_pins]

    def evidence(self) -> list[RawEvidence]:
        return pin_into(self.data_root, self.pin_keys)

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.spec.indicator_id,
            title=self.spec.title,
            sector="housing-land",
            publisher="MHCLG · English Housing Survey",
            source_url=self.spec.source_url,
            series_id=self.spec.series_id,
            geography=(
                "England (E92000001); ONS regions E12000001–E12000009 from 2020; "
                "EHS sub-national areas 2008–2019 — dwelling sample survey estimates"
            ),
            frequency="annual",
            unit=UNIT,
            definition=self.spec.definition,
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.ehs_quality_indicators",
            curated_path="curated/observations.csv",
            update_cadence="annual (EHS live tables, July)",
            raw_evidence=list(evidence),
            transformations=(
                "Header-driven parse of every year sheet (housing.connectors."
                "ehs_da_parse): measure columns located by header text; legacy "
                "(tenure rows) and modern (tenure column blocks) layouts; rows kept "
                "for tenure, dwelling age, dwelling type, floor area, region / "
                "sub-national area and the all-dwellings summary. Published cells "
                "only — 'u' → suppressed, N/A → missing. Supplementary published "
                "tables fill only keys the live tables do not publish (DT3101; "
                "2024-25 annex AT1.6, AT1.8, AT1.9, AT1.10). Series values: "
                + ", ".join(self.spec.series_values)
                + f". Headline: series={self.spec.headline_series}; breakdown=none."
            ),
            caveats=self.spec.caveats,
            revision_notes=(
                "2026-11-04 v2: adds dwelling-age / dwelling-type / floor-area / "
                "region breakdowns, criterion / hazard / damp-type series and "
                "2008–2021 history (v1 had 2022–2024 headline only). Energy bands: "
                "v1 mis-read 2008–2011 columns (band D shown as A/B/C) — fixed by "
                "header-driven parsing; all-social relabelled social-rented "
                "(tenure-label note keeps the published label)."
            ),
            related_indicator_ids=[
                *[s.indicator_id for s in SPECS if s.indicator_id != self.spec.indicator_id],
                "ehs-overcrowding",
                "ehs-under-occupation",
                "ehs-damp-mould-reported",
            ],
            notion_registry_url=self.spec.notion_registry_url,
            open_questions=[
                "Web loader must filter series=<headline> and breakdown=none for the "
                "existing tenure lines (rows now carry breakdowns).",
            ],
        )

    def _path(self, evidence: Sequence[RawEvidence], key: str) -> Path:
        name = PINS[key].file_name
        for ev in evidence:
            if ev.path.endswith(name):
                return self.data_root / ev.path
        raise KeyError(key)

    def rows(self, evidence: Sequence[RawEvidence]) -> list[RowSpec]:
        spec = self.spec
        dwellings = self._path(evidence, spec.dwellings_pin)
        areas = self._path(evidence, spec.areas_pin)
        flags: dict[int, list[str]] = {}
        if spec.indicator_id == "ehs-energy-efficiency-bands":
            flags = _sap_versions(dwellings)
        cells = parse_da_table(dwellings, table=spec.dwellings_pin, measure_map=spec.measure_map)
        cells += parse_da_table(
            areas,
            table=spec.areas_pin,
            measure_map=spec.measure_map,
            groups={"region", "sub-national-area"},
        )
        primary = [_cell_row(c, flags) for c in cells]
        supplements: list[RowSpec] = []
        if spec.indicator_id == "ehs-decent-homes":
            supplements = dt3101_rows(self._path(evidence, "DT3101"))
        elif spec.indicator_id == "ehs-category-1-hazards":
            annex = self._path(evidence, "CH1_QUALITY")
            supplements = at16_rows(annex) + at18_rows(annex)
        elif spec.indicator_id == "ehs-damp-surveyor":
            annex = self._path(evidence, "CH1_QUALITY")
            supplements = at19_rows(annex) + at110_rows(annex)
        merged = _merge(primary, supplements)
        for row in merged:
            if row.series in spec.modelled_series:
                row.observation_type = "modelled-derived"
                row.extra.append("cost-basis=standardised-basic-repair-costs-current-prices")
        return sorted(merged, key=_sort_key)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        rows = self.rows(evidence)
        if not rows:
            raise ValueError(f"No observations parsed for {self.indicator_id}")
        return [_observation(self.indicator_id, r) for r in rows]


def main() -> None:
    for spec in SPECS:
        connector = EhsQualityConnector(spec)
        evidence = connector.evidence()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        years = sorted({o.period_start[:4] for o in observations})
        headline = [
            o
            for o in observations
            if o.period_start.startswith("2024")
            and f"series={spec.headline_series};" in o.notes
            and "breakdown=none" in o.notes
            and "tenure=all-tenures" in o.notes
        ]
        print(
            f"{spec.indicator_id}: rows={len(observations)} years={years[0]}–{years[-1]} "
            f"2024 headline all-tenures={[o.value for o in headline]}"
        )


if __name__ == "__main__":
    main()

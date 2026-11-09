"""English Housing Survey — Domain 07 Energy Anatomy indicators.

Pins DA6101/DA6102 (heating), DA6201/DA6202 (insulation), and Chapter 2
energy-efficiency annex tables for improvement potential. Complements DA7101
energy bands (``ehs-energy-efficiency-bands``).

Heating and insulation carry every breakdown the live tables publish, in the
``ehs_quality_indicators`` notes convention: tenure rows, the all-dwellings
row, dwelling age, dwelling type, usable floor area (DA6101/DA6201) and
region (2020+) / three sub-national areas (2008–2019) (DA6102/DA6202).
Characteristic rows are all tenures only (DA61/DA62 never cross a
characteristic with tenure). Measure columns are located per year by header
text *and position within the header group* (DA6201 repeats 'none' for loft
depth and glazing extent).

All observations are survey estimates for England dwellings — not the
domestic EPC certificate register (see ``epc-domestic-lodgements``).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.connectors.ehs_da_parse import normalise_header, parse_da_table
from housing.connectors.ehs_pins import PINS, pin_into
from housing.connectors.ehs_quality_indicators import (
    BREAKDOWN_ORDER,
    RowSpec,
    _cell_row,
    _notes,
)
from housing.connectors.ehs_table_parse import parse_pct
from housing.ods_util import read_ods_sheet

SOURCE_ENERGY = (
    "https://www.gov.uk/government/statistical-data-sets/energy-performance"
)
SOURCE_ANNEX = (
    "https://www.gov.uk/government/statistics/"
    "annex-tables-for-english-housing-survey-2024-to-2025-headline-findings"
    "-on-housing-quality-and-energy-efficiency"
)
OFFICIAL_RELEASE_DATE = "2026-07-09"
ANNEX_RELEASE_DATE = "2026-01-29"
SOURCE_VERSION = "EHS live tables DA61/DA62 + 2024-25 Ch2 annex"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"

@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    indicator_id: str
    title: str
    table_file: str
    source_url: str
    series_id: str
    definition: str
    unit: str
    kind: str  # heating | insulation | improvement
    notion_registry_url: str = ""


SPECS: tuple[IndicatorSpec, ...] = (
    IndicatorSpec(
        indicator_id="ehs-heating",
        title="EHS heating systems",
        table_file="DA6101_Heating_-_dwellings.ods",
        source_url=SOURCE_ENERGY,
        series_id="DA6101 / DA6102 Heating — dwellings / areas",
        definition=(
            "Share of England dwellings by main space heating system (central, "
            "storage, room), main fuel, boiler type (condensing, condensing-combi, "
            "none) and heat pump presence, by tenure, dwelling age, dwelling type, "
            "floor area and region (English Housing Survey dwelling sample)."
        ),
        unit="percent of dwellings",
        kind="heating",
        notion_registry_url="https://app.notion.com/p/40e65471768581e898dde60a9492cb25",
    ),
    IndicatorSpec(
        indicator_id="ehs-insulation",
        title="EHS insulation measures",
        table_file="DA6201_Insulation_-_dwellings.ods",
        source_url=SOURCE_ENERGY,
        series_id="DA6201 / DA6202 Insulation — dwellings / areas (+ annex AT2.9)",
        definition=(
            "Share of England dwellings by wall type and insulation, loft "
            "insulation depth and extent of double glazing, by tenure, dwelling "
            "age, dwelling type, floor area and region; plus the annex all-tenure "
            "trend of loft insulation 200mm+, wall insulation and full double "
            "glazing (EHS dwelling sample)."
        ),
        unit="percent of dwellings",
        kind="insulation",
        notion_registry_url="https://app.notion.com/p/40e65471768581879c0fe0b9518a2567",
    ),
    IndicatorSpec(
        indicator_id="ehs-energy-improvement",
        title="EHS potential improvement to band C",
        table_file=(
            "2024-25_EHS_Headline_Report_Chapter_2_Energy_Efficiency_Annex_Tables.ods"
        ),
        source_url=SOURCE_ANNEX,
        series_id="EHS Ch2 AT2.13–2.14 improvement to band C",
        definition=(
            "Modelled share of England dwellings that could be improved to EER "
            "band C, and mean cost among improvable dwellings (EHS SAP simulation)."
        ),
        unit="mixed (percent / GBP)",
        kind="improvement",
        notion_registry_url="https://app.notion.com/p/40e65471768581c2b579f3be11c5a65f",
    ),
)


def _period(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _plausible_pct(value: float) -> bool:
    return 0.0 <= value <= 100.0


def _obs(
    *,
    indicator_id: str,
    year: int,
    value: float,
    series: str,
    tenure: str,
    table: str,
    unit: str,
    extra: str = "",
    base: str = "dwellings",
) -> Observation:
    start, end = _period(year)
    notes = (
        f"series={series}; "
        f"tenure={tenure}; "
        "breakdown=none; "
        f"observation-type="
        + ("modelled-derived" if table in ("AT2.13", "AT2.14") else "survey-estimate")
        + "; "
        f"table={table}; "
        f"geography=England; "
        f"base={base}; "
        "not-epc-register=true; "
        "not-individual-property=true"
    )
    if extra:
        notes = f"{notes}; {extra}"
    return Observation(
        indicator_id=indicator_id,
        period_start=start,
        period_end=end,
        geography_code=ENGLAND_CODE,
        geography_label=ENGLAND_LABEL,
        value=value,
        unit=unit,
        observation_status="final",
        source_version=SOURCE_VERSION,
        notes=notes,
    )


# ---------------------------------------------------------------------------
# DA6101/DA6102 heating · DA6201/DA6202 insulation (all published breakdowns)
# ---------------------------------------------------------------------------

# Normalised header → series. A '|variant' suffix records a relabelled
# column that is kept in the same series (variant goes into notes).
HEATING_COLUMNS: dict[str, str] = {
    "central": "central-heating",
    "storage": "storage-heaters",
    "room": "room-heater",
    "gas": "main-fuel-gas",
    "gasfired": "main-fuel-gas",
    "oil": "main-fuel-oil",
    "oilfired": "main-fuel-oil",
    "electricity": "main-fuel-electricity",
    "electrical": "main-fuel-electricity",
    "communalheating": "communal-heating",
    "condensing": "boiler-condensing",
    "condensing-combi": "boiler-condensing-combi",
    "noboiler": "no-boiler",
}
# Not ingested (kept out to stay inside the 10k-row web load): solid fuel,
# biomass, water heating, standard / back / combination boiler, heat pump 'no'.

WALL_COLUMNS: dict[str, str] = {
    "cavityinsulated": "cavity-insulated",
    "cavitywallswithevidenceofinsulation": "cavity-insulated|label=cavity walls with evidence of insulation",
    "post-1995cavitywallswithinsulationassumedasbuilt": "cavity-post-1995-insulation-assumed-as-built",
    "post-1990-nocwievidence": "cavity-post-1990-no-cwi-evidence",
    "cavityuninsulated": "cavity-uninsulated",
    "non-cavitywall": "non-cavity-wall",
    "solidwallinsulated": "solid-wall-insulated",
    "soliduninsulated": "solid-wall-uninsulated",
}
LOFT_COLUMNS: dict[str, str] = {
    "none": "loft-depth-none",
    "noneinloft": "loft-depth-none",
    "150mmormore": "loft-depth-150mm-plus",
    "200mmormore": "loft-depth-200mm-plus",
    "noloft": "no-loft",
}
GLAZING_COLUMNS: dict[str, str] = {
    "none": "glazing-none",
    "all": "full-double-glazing",
}


# Published rows left out because their label is not a known category
# (QA lists them; nothing is inferred).
SKIPPED_ROWS: list[str] = []


def _header_row(rows: list[list[str]], anchor: str) -> tuple[int, list[str]]:
    for idx in range(1, min(len(rows), 10)):
        labels = [normalise_header(c) for c in rows[idx]]
        if anchor in labels:
            return idx, labels
    raise ValueError(f"header row with {anchor!r} not found")


def heating_columns(rows: list[list[str]]) -> tuple[int, list[tuple[int, str]]]:
    """DA6101/DA6102: one column per measure; heat pump 'yes' follows 'no boiler'."""
    idx, labels = _header_row(rows, "central")
    out: list[tuple[int, str]] = []
    taken: set[str] = set()
    no_boiler_col = labels.index("noboiler") if "noboiler" in labels else None
    for col, label in enumerate(labels):
        if col == 0:
            continue
        series = HEATING_COLUMNS.get(label)
        if label == "yes" and no_boiler_col is not None and col > no_boiler_col:
            series = "heat-pump"
        if series and series not in taken:
            taken.add(series)
            out.append((col, series))
    return idx, out


def insulation_columns(rows: list[list[str]]) -> tuple[int, list[tuple[int, str]]]:
    """DA6201/DA6202: wall group · loft group (to 'no loft') · glazing group."""
    idx, labels = _header_row(rows, "cavityuninsulated")
    if "noloft" not in labels:
        raise ValueError("DA6201: 'no loft' column not found")
    no_loft = labels.index("noloft")
    loft_start = next(
        col for col, label in enumerate(labels) if label in ("none", "noneinloft")
    )
    out: list[tuple[int, str]] = []
    taken: set[str] = set()
    for col, label in enumerate(labels):
        if col == 0 or not label:
            continue
        if col < loft_start:
            series = WALL_COLUMNS.get(label)
        elif col <= no_loft:
            series = LOFT_COLUMNS.get(label)
        else:
            series = GLAZING_COLUMNS.get(label)
        if series and series.split("|")[0] not in taken:
            # First occurrence only: 2008–09 publish two 'non-cavity wall'
            # columns and only the first (footnote 1) carries values.
            taken.add(series.split("|")[0])
            out.append((col, series))
    return idx, out


def _da_rows(
    dwellings: Path,
    areas: Path,
    *,
    table: str,
    areas_table: str,
    columns,
) -> list[RowSpec]:
    cells = parse_da_table(dwellings, table=table, measure_map={}, columns=columns)
    cells += parse_da_table(
        areas,
        table=areas_table,
        measure_map={},
        groups={"region", "sub-national-area"},
        columns=columns,
        skipped=SKIPPED_ROWS,
    )
    rows: list[RowSpec] = []
    for cell in cells:
        row = _cell_row(cell, {})
        series, _, variant = cell.measure.partition("|")
        row.series = series
        if variant:
            row.extra.append(f"published-{variant}")
        row.extra.append("not-epc-register=true")
        if series == "heat-pump":
            row.extra.append("caveat=heat-pump-may-differ-from-other-sources")
        if series == "communal-heating":
            row.extra.append("caveat=communal-heating-published-from-2023")
        rows.append(row)
    return rows


def _derived_sum(
    rows: list[RowSpec], *, series: str, parts: tuple[str, ...], label: str
) -> list[RowSpec]:
    """Sum published shares in the same row; only when every part is final."""
    by_key: dict[tuple[str, ...], dict[str, RowSpec]] = {}
    for row in rows:
        if row.series in parts:
            k = (str(row.year), row.geography_code, row.tenure, row.breakdown, row.category, row.table)
            by_key.setdefault(k, {})[row.series] = row
    out: list[RowSpec] = []
    for found in by_key.values():
        if set(found) != set(parts):
            continue
        if any(r.status != "final" or r.value is None for r in found.values()):
            continue
        total = round(sum(r.value for r in found.values() if r.value is not None), 1)
        if not 0.0 <= total <= 100.0:
            continue
        base = found[parts[0]]
        extra = [e for e in base.extra if not e.startswith("published-label=")]
        out.append(
            RowSpec(
                year=base.year,
                series=series,
                tenure=base.tenure,
                value=total,
                status="final",
                raw="+".join(found[p].raw for p in parts),
                table=base.table,
                breakdown=base.breakdown,
                category=base.category,
                geography_code=base.geography_code,
                geography_label=base.geography_label,
                extra=[*extra, f"derived={label}"],
            )
        )
    return out


def heating_rows(dwellings: Path, areas: Path) -> list[RowSpec]:
    rows = _da_rows(dwellings, areas, table="DA6101", areas_table="DA6102", columns=heating_columns)
    rows += _derived_sum(
        rows,
        series="condensing-boiler",
        parts=("boiler-condensing", "boiler-condensing-combi"),
        label="condensing+condensing-combi",
    )
    return rows


def insulation_rows(dwellings: Path, areas: Path) -> list[RowSpec]:
    rows = _da_rows(dwellings, areas, table="DA6201", areas_table="DA6202", columns=insulation_columns)
    # Wall insulation total only where a 'solid wall insulated' column is
    # published alongside the post-1995 assumed column (2024); never adds
    # 'non-cavity wall' (QA 2026-11-04 §6).
    rows += _derived_sum(
        rows,
        series="wall-insulation",
        parts=("cavity-insulated", "cavity-post-1995-insulation-assumed-as-built", "solid-wall-insulated"),
        label="cavity+assumed-post-1995+solid",
    )
    return rows


def _row_observation(indicator_id: str, row: RowSpec) -> Observation:
    start, end = _period(row.year)
    return Observation(
        indicator_id=indicator_id,
        period_start=start,
        period_end=end,
        geography_code=row.geography_code,
        geography_label=row.geography_label,
        value=row.value,
        unit="percent of dwellings",
        observation_status=row.status,
        source_version=SOURCE_VERSION,
        notes=_notes(row),
    )


def _sorted_rows(rows: list[RowSpec]) -> list[RowSpec]:
    seen: dict[tuple[str, ...], RowSpec] = {}
    for row in rows:
        key = (*row.key(), row.table)
        if key in seen:
            raise ValueError(f"duplicate natural key {key}")
        seen[key] = row
    return sorted(
        seen.values(),
        key=lambda r: (r.year, BREAKDOWN_ORDER[r.breakdown], r.category, r.tenure, r.series),
    )


def parse_insulation_annex(path: Path, *, indicator_id: str) -> list[Observation]:
    """Loft 200mm+ and wall/glazing all-tenures time series from AT 2.9."""
    rows = read_ods_sheet(path, "AT2_9")
    header = rows[4] if len(rows) > 4 else []
    years: list[tuple[int, int]] = []
    for col, cell in enumerate(header):
        text = cell.strip()
        if text.isdigit() and len(text) == 4:
            years.append((col, int(text)))

    def row_by_label(needle: str) -> list[str] | None:
        for row in rows:
            if row and needle in row[1].strip().lower():
                return row
        return None

    loft = row_by_label("200mm or more of loft insulation")
    wall = row_by_label("cavity or solid wall insulation")
    glazing = row_by_label("double glazing (entire house)")
    # Prefer percentage block (labels appear twice — thousands then %).
    loft_pct = None
    wall_pct = None
    glazing_pct = None
    seen = {"loft": 0, "wall": 0, "glazing": 0}
    for row in rows:
        if not row or len(row) < 2:
            continue
        label = row[1].strip().lower()
        if label.startswith("200mm or more of loft"):
            seen["loft"] += 1
            if seen["loft"] == 2:
                loft_pct = row
        elif label == "cavity or solid wall insulation":
            seen["wall"] += 1
            if seen["wall"] == 2:
                wall_pct = row
        elif label.startswith("double glazing"):
            seen["glazing"] += 1
            if seen["glazing"] == 2:
                glazing_pct = row

    observations: list[Observation] = []
    for series, row in (
        ("loft-200mm-plus", loft_pct or loft),
        ("wall-insulation-annex", wall_pct or wall),
        ("full-double-glazing-annex", glazing_pct or glazing),
    ):
        if row is None:
            continue
        for col, year in years:
            value = parse_pct(row[col] if col < len(row) else "")
            if value is None or not _plausible_pct(value):
                continue
            observations.append(
                _obs(
                    indicator_id=indicator_id,
                    year=year,
                    value=value,
                    series=series,
                    tenure="all-tenures",
                    table="AT2.9",
                    unit="percent of dwellings",
                )
            )
    return observations


def parse_improvement(path: Path, *, indicator_id: str) -> list[Observation]:
    """2024 improvable share + mean cost to band C (AT 2.13 / 2.14)."""
    year = 2024
    observations: list[Observation] = []

    at13 = read_ods_sheet(path, "AT2_13")
    for row in at13:
        if not row or len(row) < 4:
            continue
        label = row[1].strip().lower()
        pct = parse_pct(row[3])
        if pct is None or not _plausible_pct(pct):
            continue
        if label.startswith("eligible to be improved"):
            series = "improvable-to-band-c"
        elif label.startswith("dwelling already eer band c"):
            series = "already-band-c-or-above"
        elif label.startswith("received at least one"):
            series = "cannot-reach-band-c"
        else:
            continue
        observations.append(
            _obs(
                indicator_id=indicator_id,
                year=year,
                value=pct,
                series=series,
                tenure="all-tenures",
                table="AT2.13",
                unit="percent of dwellings",
            )
        )

    at14 = read_ods_sheet(path, "AT2_14")
    tenure_cost = {
        "owner occupied": "owner-occupied",
        "private rented": "private-rented",
        "local authority": "local-authority",
        "housing association": "housing-association",
        "private sector": "all-private",
        "social sector": "all-social",
        "all dwellings": "all-tenures",
    }
    in_tenure = False
    for row in at14:
        if not row or len(row) < 3:
            continue
        label = row[1].strip().lower()
        if label == "tenure":
            in_tenure = True
            continue
        if label in {"dwelling age", "dwelling type", "region", "energy efficiency rating band"}:
            in_tenure = False
        if label == "all dwellings" or (in_tenure and label in tenure_cost):
            mean = parse_pct(row[2].replace(",", ""))
            if mean is None or mean < 0:
                continue
            tenure = tenure_cost.get(label, "all-tenures" if label == "all dwellings" else None)
            if tenure is None:
                continue
            observations.append(
                _obs(
                    indicator_id=indicator_id,
                    year=year,
                    value=mean,
                    series="mean-cost-to-band-c",
                    tenure=tenure,
                    table="AT2.14",
                    unit="GBP per improvable dwelling",
                    base="dwellings-able-to-reach-band-c",
                )
            )
            if label == "all dwellings":
                break

    if not observations:
        raise ValueError(f"No improvement observations from {path}")
    return _dedupe(observations)


def _dedupe(observations: list[Observation]) -> list[Observation]:
    unique: dict[tuple[str, str], Observation] = {}
    for obs in observations:
        unique[(obs.period_start, obs.notes)] = obs
    return sorted(unique.values(), key=lambda o: (o.period_start, o.notes))





PIN_KEYS: dict[str, list[str]] = {
    "heating": ["DA6101", "DA6102"],
    "insulation": ["DA6201", "DA6202", "CH2_ENERGY"],
    "improvement": ["CH2_ENERGY"],
}

HEATING_SERIES = (
    "central-heating, storage-heaters, room-heater, main-fuel-gas, main-fuel-oil, "
    "main-fuel-electricity, communal-heating (2023+), boiler-condensing, "
    "boiler-condensing-combi, condensing-boiler (derived sum), no-boiler, heat-pump (2023+)"
)
INSULATION_SERIES = (
    "cavity-insulated, cavity-post-1995-insulation-assumed-as-built (2015+), "
    "cavity-post-1990-no-cwi-evidence (2010–2014), cavity-uninsulated, non-cavity-wall "
    "(2008–2023), solid-wall-insulated / solid-wall-uninsulated (2014, 2024), "
    "loft-depth-none, loft-depth-150mm-plus (2010+), loft-depth-200mm-plus (2008–2009), "
    "no-loft, glazing-none, full-double-glazing, wall-insulation (derived, 2024), and "
    "annex AT2.9 all-tenure series loft-200mm-plus, wall-insulation-annex, "
    "full-double-glazing-annex"
)


class EhsEnergyAnatomyConnector(Connector):
    def __init__(self, spec: IndicatorSpec, data_root: Path | None = None) -> None:
        self.spec = spec
        super().__init__(data_root or (HOUSING_DATA / spec.indicator_id))

    @property
    def indicator_id(self) -> str:
        return self.spec.indicator_id

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        breakdowns = self.spec.kind in ("heating", "insulation")
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
                if breakdowns
                else "England (E92000001) — dwelling sample survey estimates"
            ),
            frequency="annual",
            unit=self.spec.unit,
            definition=self.spec.definition,
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.ehs_energy_anatomy",
            curated_path="curated/observations.csv",
            update_cadence="annual (EHS live tables, July)",
            raw_evidence=list(evidence),
            transformations=(
                "Header-driven parse of every DA6101/DA6102 (heating) or DA6201/DA6202 "
                "(insulation) year sheet via housing.connectors.ehs_da_parse with a "
                "header-group column resolver; rows kept for tenure, dwelling age, "
                "dwelling type, floor area, region / sub-national area and all "
                "dwellings, in the ehs_quality_indicators notes convention "
                "(series, tenure, breakdown, <breakdown>, category, table, base, "
                "row-sample-unweighted, row-dwellings-000s). 'u'/'*' → suppressed. "
                "condensing-boiler and wall-insulation are derived sums of published "
                "columns in the same row (derived= note; emitted only when every part "
                "is a final value). Ch2 annex AT2.9 (all-tenure trend) and AT2.13/2.14 "
                "(improvement) unchanged. Series: "
                + (HEATING_SERIES if self.spec.kind == "heating" else INSULATION_SERIES)
                if breakdowns
                else "Ch2 annex AT2.13 / AT2.14; series= and tenure= notes."
            ),
            caveats=(
                "England survey estimates only — not UK and not EPC register "
                "certificates (see epc-domestic-lodgements for the administrative "
                "register). Breakdowns are exactly those published: characteristic "
                "rows (dwelling age / type / floor area / area) are all tenures only "
                "in every year; region (9 ONS regions) from 2020, three sub-national "
                "areas 2008–2019 (no ONS code). 2020 and 2021 are occupied dwellings "
                "only and modelled (COVID-19); 2022 is a hybrid sample. Column sets "
                "change: 2023 adds biomass / communal heating / heat pumps and drops "
                "water heating; solid fuel excludes biomass from 2023 (not ingested); "
                "cavity-wall evidence wording and the assumed-insulated rule change "
                "(post-1990 no-CWI-evidence 2010–14; post-1995 assumed-as-built 2015+); "
                "loft depth bands change (200mm+ 2008–09; 150mm+ 2010+). Shares are of "
                "all dwellings in the group (no-loft dwellings included in the loft "
                "denominator) — unlike annex loft-200mm-plus. Improvement costs are "
                "SAP-modelled for dwellings below band C that can reach C."
            ),
            revision_notes=(
                "Domain 07 Energy Anatomy ingest 2026-11-04. Same-day fix after QA "
                "(data/qa/qa_housing_ehs_inside_home_2026_11_04.md §6): columns located "
                "by header text per year. Wave 2 (2026-11-04, data/qa/"
                "qa_housing_quality_wave2_2026_11_04.md): heating / insulation now "
                "carry dwelling-age, dwelling-type, floor-area and region / "
                "sub-national-area breakdowns (DA6101/DA6102, DA6201/DA6202) and the "
                "published component series; every row gains breakdown=none|…; "
                "tenure 'all social' relabelled social-rented (tenure-label note keeps "
                "the published label) to match the other EHS packages; evidence now "
                "pinned via housing.connectors.ehs_pins (stable retrieval timestamps). "
                "ehs-energy-improvement rows relabelled observation-type=modelled-derived."
            ),
            related_indicator_ids=[
                "ehs-energy-efficiency-bands",
                "epc-domestic-lodgements",
                "ehs-thermal-comfort",
                *[s.indicator_id for s in SPECS if s.indicator_id != self.spec.indicator_id],
            ],
            notion_registry_url=self.spec.notion_registry_url,
            open_questions=(
                [
                    "Web loaders must filter breakdown=none for the headline tenure "
                    "lines (rows now carry dwelling-age / dwelling-type / floor-area / "
                    "region breakdowns)."
                ]
                if breakdowns
                else []
            ),
        )

    def evidence(self) -> list[RawEvidence]:
        return pin_into(self.data_root, PIN_KEYS[self.spec.kind])

    def _path(self, evidence: Sequence[RawEvidence], key: str) -> Path:
        name = PINS[key].file_name
        for ev in evidence:
            if ev.path.endswith(name):
                return self.data_root / ev.path
        raise KeyError(key)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        if self.spec.kind == "heating":
            rows = heating_rows(self._path(evidence, "DA6101"), self._path(evidence, "DA6102"))
            return [_row_observation(self.indicator_id, r) for r in _sorted_rows(rows)]
        if self.spec.kind == "insulation":
            rows = insulation_rows(self._path(evidence, "DA6201"), self._path(evidence, "DA6202"))
            obs = [_row_observation(self.indicator_id, r) for r in _sorted_rows(rows)]
            obs.extend(
                parse_insulation_annex(
                    self._path(evidence, "CH2_ENERGY"), indicator_id=self.indicator_id
                )
            )
            return obs
        if self.spec.kind == "improvement":
            return parse_improvement(self._path(evidence, "CH2_ENERGY"), indicator_id=self.indicator_id)
        raise ValueError(f"Unknown kind {self.spec.kind}")


def main() -> None:
    for spec in SPECS:
        connector = EhsEnergyAnatomyConnector(spec)
        evidence = connector.evidence()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        latest = [o for o in observations if o.period_start.startswith("2024")]
        print(f"{spec.indicator_id}: observations={len(observations)} 2024={len(latest)}")


if __name__ == "__main__":
    main()

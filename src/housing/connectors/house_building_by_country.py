"""ONS house building by country — permanent dwellings started and completed, calendar years.

Source: ONS, Indicators of house building, UK: permanent dwellings started and
completed by country (dataset), Tables 3a-3e "historical calendar year series"
(UK from 1949; England, Wales, Scotland, Northern Ireland from 1946 or 1949).

Series: series=completions|starts; category=all|private-enterprise|
housing-associations|local-authorities.

Great Britain (K03000001) is derived here as England + Wales + Scotland, because
ONS publishes no Great Britain calendar-year table. It is emitted only for years
where all three are numeric, and checked against UK minus Northern Ireland.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "house-building-completions-by-country"
UNIT = "dwellings"
DATASET = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/"
    "ukhousebuildingpermanentdwellingsstartedandcompleted"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/datasets/"
    "ukhousebuildingpermanentdwellingsstartedandcompleted/current/indicatorsofukhousebuilding.xlsx"
)
PINNED_RAW = "raw/2026-11-10/indicatorsofukhousebuilding.xlsx"
RELEASE_DATE = "2026-10-23"
VERSION = "ONS, Indicators of house building, UK: by country (23 October 2026)"

SHEETS: dict[str, tuple[str, str]] = {
    "3a": ("K02000001", "United Kingdom"),
    "3b": ("E92000001", "England"),
    "3c": ("W92000004", "Wales"),
    "3d": ("S92000003", "Scotland"),
    "3e": ("N92000002", "Northern Ireland"),
}
GB = ("K03000001", "Great Britain")
COLUMNS: dict[str, tuple[str, str]] = {
    "Started - All Dwellings": ("starts", "all"),
    "Started - Private Enterprise": ("starts", "private-enterprise"),
    "Started - Housing Associations": ("starts", "housing-associations"),
    "Started - Local Authorities": ("starts", "local-authorities"),
    "Completed - All Dwellings": ("completions", "all"),
    "Completed - Private Enterprise": ("completions", "private-enterprise"),
    "Completed - Housing Associations": ("completions", "housing-associations"),
    "Completed - Local Authorities": ("completions", "local-authorities"),
}


def _num(v: object) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def parse(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    values: dict[tuple[str, int, str, str], float] = {}
    for sheet, (code, _) in SHEETS.items():
        rows = [list(r) for r in wb[sheet].iter_rows(values_only=True)]
        header = next(r for r in rows if r and "Period" in r)
        year_col = header.index("Period")
        cols = {header.index(name): key for name, key in COLUMNS.items() if name in header}
        if len(cols) != len(COLUMNS):
            raise ValueError(f"sheet {sheet}: expected columns missing")
        for r in rows:
            year = r[year_col] if len(r) > year_col else None
            if not isinstance(year, int):
                continue
            for idx, (series, category) in cols.items():
                v = _num(r[idx])
                if v is not None:
                    values[(code, year, series, category)] = v

    years = sorted({k[1] for k in values})
    for year in years:
        for series, category in COLUMNS.values():
            parts = [values.get((c, year, series, category)) for c in ("E92000001", "W92000004", "S92000003")]
            if all(p is not None for p in parts):
                gb = sum(parts)  # type: ignore[arg-type]
                uk, ni = values.get(("K02000001", year, series, category)), values.get(("N92000002", year, series, category))
                if uk is not None and ni is not None and abs(uk - ni - gb) > 20:
                    raise ValueError(f"{year} {series} {category}: GB {gb} != UK {uk} - NI {ni}")
                values[(GB[0], year, series, category)] = gb

    labels = dict(SHEETS.values()) | {GB[0]: GB[1]}
    out: list[Observation] = []
    for (code, year, series, category), v in sorted(values.items(), key=lambda kv: (kv[0][1], kv[0][0], kv[0][2], kv[0][3])):
        derived = "; derived=England+Wales+Scotland" if code == GB[0] else ""
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=f"{year}-01-01",
                period_end=f"{year}-12-31",
                geography_code=code,
                geography_label=labels[code],
                value=v,
                unit=UNIT,
                observation_status="final",
                source_version=VERSION,
                notes=f"series={series}; category={category}; permanent dwellings; calendar-year{derived}",
            )
        )
    if not out:
        raise ValueError("ONS house building tables parsed no rows")
    return out


class HouseBuildingByCountryConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            return self.fetch_url(PINNED_URL, PINNED_RAW, official_release_date=RELEASE_DATE).evidence
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        return parse(self.data_root / evidence[0].path)

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="House building by country (calendar years)",
            sector="housing-land",
            publisher="ONS (from MHCLG, Welsh Government, Scottish Government, NI Department for Communities)",
            source_url=DATASET,
            series_id="Indicators of house building, UK: by country, Tables 3a-3e (historical calendar year series)",
            geography="United Kingdom, Great Britain (derived), England, Wales, Scotland, Northern Ireland",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Permanent dwellings started and completed each calendar year, by sector, for the UK and "
                "each country. Temporary dwellings (prefabs) are not included. Great Britain is England + "
                "Wales + Scotland."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.house_building_by_country",
            curated_path="curated/observations.csv",
            update_cadence="quarterly ONS release (calendar-year table updated with each)",
            raw_evidence=[evidence[0]] if evidence else [],
            transformations=(
                "Parse Tables 3a-3e; one row per country, year, measure and sector. Great Britain is "
                "derived by summing England, Wales and Scotland and checked against UK minus Northern "
                "Ireland (within 20 dwellings for rounding)."
            ),
            caveats=(
                "Starts are not available for early years in some countries ([x1]). Figures before the "
                "1990s are rounded to the nearest 10 by the publisher. Great Britain is a derived total, "
                "not an ONS table. Sector definitions change over time; 'housing associations' is small "
                "or not separately shown in early years."
            ),
            revision_notes="Pinned indicatorsofukhousebuilding.xlsx (ONS release of 23 October 2026), retrieved 2026-11-10.",
            related_indicator_ids=["housebuilding-completions-long-run", "housing-completions"],
        )


def main() -> None:
    connector = HouseBuildingByCountryConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    _, curated = connector.write_hand_off([evidence], observations)
    print(f"{INDICATOR_ID}: {len(observations)} observations -> {curated}")


if __name__ == "__main__":
    main()

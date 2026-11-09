"""DESNZ Electricity since 1920 — estimated electricity generation by fuel, UK, annual (TWh).

Source: DUKES "Historical electricity data: 1920 to 2025", sheet "Estimated Historical
Generation" (GWh). One observation per fuel × calendar year. Long-run companion to the
quarterly ET 5.1 series (`electricity-generation-by-source`), not a replacement for it:
different publication, coarser fuel groups, and 1920–1995 values are DESNZ estimates.

1. Read the pinned workbook under data/energy/electricity-generation-long-run/raw/.
2. Parse the fuel columns and the published total (as fuel=Total, an aggregate); GWh → TWh.
3. Years before 1996 are `estimated` (DESNZ note 1); 1996 onward are `final`.
4. Write curated CSV + manifest via the shared Connector.write_hand_off.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "electricity-generation-long-run"
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-06/Electricity_since_1920.xlsx"
SOURCE_LANDING_URL = "https://www.gov.uk/government/statistical-data-sets/historical-electricity-data"
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/6a69e449229c578debc1a84d/Electricity_since_1920.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_ELEC_SINCE_1920_2026"
SHEET = "Estimated Historical Generation"
#: DESNZ note 1: estimated 1920–1995 from supply and fuel used; DUKES 5.6 actuals from 1996.
FIRST_REPORTED_YEAR = 1996

#: Exact column header (before any "[Note n]") → fuel label written to notes as fuel=<label>.
FUEL_COLUMNS: dict[str, str] = {
    "Coal estimated generation": "Coal",
    "Oil estimated generation": "Oil",
    "Natural gas estimated generation": "Natural gas",
    "Nuclear estimated generation": "Nuclear",
    "Wind, wave, solar and hydro estimated generation": "Wind, wave, solar and hydro",
    "Coke and breeze estimated generation": "Coke and breeze",
    "Other fuels estimated generation": "Other fuels",
    "Pumped storage estimated generation": "Pumped storage",
}
TOTAL_COLUMN = "Total estimated generation"
#: First year where the published total exceeds the sum of the published fuel columns.
RESIDUAL_FROM = 2017


def _header(raw: object) -> str:
    text = str(raw or "").strip()
    return text.split("[")[0].strip()


def parse_long_run(workbook_path: Path) -> list[Observation]:
    """Parse the Estimated Historical Generation sheet → TWh by fuel × year."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET not in wb.sheetnames:
            raise ValueError(f"Workbook missing {SHEET!r}: {workbook_path}")
        rows = list(wb[SHEET].iter_rows(values_only=True))
    finally:
        wb.close()

    header_idx = next((i for i, r in enumerate(rows) if r and str(r[0]).strip() == "Year"), None)
    if header_idx is None:
        raise ValueError("No 'Year' header row on the Estimated Historical Generation sheet")
    headers = [_header(c) for c in rows[header_idx]]
    cols = {label: headers.index(h) for h, label in FUEL_COLUMNS.items() if h in headers}
    missing = set(FUEL_COLUMNS.values()) - set(cols)
    if missing:
        raise ValueError(f"Fuel columns not found: {sorted(missing)}")
    total_col = headers.index(TOTAL_COLUMN)

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not isinstance(row[0], int):
            continue
        year = row[0]
        status: ObservationStatus = "estimated" if year < FIRST_REPORTED_YEAR else "final"
        fuel_sum = 0.0
        for label, col in cols.items():
            raw = row[col]
            value = float(raw) / 1000 if isinstance(raw, (int, float)) else None
            if value is not None:
                fuel_sum += value
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year:04d}-01-01",
                    period_end=f"{year:04d}-12-31",
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=None if value is None else round(value, 6),
                    unit="TWh",
                    observation_status=status if value is not None else "missing",
                    source_version=SOURCE_VERSION,
                    notes=f"fuel={label}",
                )
            )
        # The published total is kept as an aggregate row (fuel=Total, never summed with fuels).
        # From 2017 DESNZ's total exceeds its own fuel columns by ~2%; that residual is a source
        # finding (data/qa), not something to spread across fuels. Before 2017 they must agree,
        # which guards against a column shift.
        total = row[total_col]
        if isinstance(total, (int, float)):
            gap = total / 1000 - fuel_sum
            if year < RESIDUAL_FROM and abs(gap) > 0.01:
                raise ValueError(f"{year}: fuels sum {fuel_sum:.3f} TWh ≠ published total {total / 1000:.3f}")
            if gap < -0.01:
                raise ValueError(f"{year}: fuels exceed the published total by {-gap:.3f} TWh")
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year:04d}-01-01",
                    period_end=f"{year:04d}-12-31",
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=round(total / 1000, 6),
                    unit="TWh",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="fuel=Total",
                )
            )
    if not observations:
        raise ValueError("No annual rows parsed")
    return observations


def parse_station_history(workbook_path: Path) -> dict:
    """Transcribe the experimental companion register, without inferring operating status."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        rows = list(wb["List of Electricity Generators"].values)
    finally:
        wb.close()
    start = next(i for i, row in enumerate(rows) if row[0] == "Site Name")
    expected = ("Site Name", "Region", "Commissioned date", "Closure date or planned closure date", "Nameplate Capacity (MW)", "Primary Fuel", "X", "Y")
    if tuple(rows[start]) != expected:
        raise ValueError("Historical station register headers changed")
    def text(value):
        if value is None or str(value).strip() in {"", "[x]"}:
            return None
        return str(value).strip()
    records = []
    for source_row, row in enumerate(rows[start + 1:], start + 2):
        if not row[0]:
            continue
        records.append({"id": f"historical-row-{source_row}", "source_row": source_row,
                        "name": str(row[0]).strip(), "region": text(row[1]),
                        "commissioned": text(row[2]), "closure_or_planned": text(row[3]),
                        "capacity_mw": float(row[4]) if isinstance(row[4], (int,float)) else None,
                        "fuel": text(row[5])})
    return {"source_url": SOURCE_LANDING_URL, "source_version": SOURCE_VERSION,
            "raw_checksum_sha256": sha256_file(workbook_path),
            "sheet": "List of Electricity Generators",
            "caveat": "Experimental register compiled for the March 2024 Energy Trends feature; DESNZ warns it may contain errors. Closure dates include planned closures. Blank dates mean unknown, not still operating. No automatic joins to current station records.",
            "records": records}


class ElectricityGenerationLongRunConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ENERGY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Electricity generation by fuel since 1920",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES Electricity since 1920 — Estimated Historical Generation",
            geography="UK (K02000001)",
            frequency="annual",
            unit="TWh",
            definition=(
                "Estimated UK electricity generation by fuel, calendar years 1920–2025, from the DESNZ "
                "historical electricity workbook (DUKES). Eight fuel groups as published: coal, oil, "
                "natural gas, nuclear, wind/wave/solar/hydro, coke and breeze, other fuels, pumped storage."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.electricity_generation_long_run",
            curated_path="curated/observations.csv",
            update_cadence="Annual — DUKES, late July",
            raw_evidence=list(evidence),
            transformations=(
                "Sheet 'Estimated Historical Generation'. Fuel columns only (total and share columns "
                "excluded); GWh ÷ 1000 → TWh. Each year's fuels are checked against the published total. "
                "Years before 1996 → observation_status=estimated; 1996+ → final. The published total is "
                "emitted as fuel=Total (aggregate)."
            ),
            caveats=(
                "1920–1995 are DESNZ estimates: published supply upscaled to generation and apportioned by "
                "fuel used. Before 1987 coverage is major power producers, transport undertakings and "
                "industrial hydro/nuclear only; 1987–1989 carry a high degree of estimation. Wind, wave, solar "
                "and hydro are one published group. Bioenergy sits in 'Other fuels' (with coke oven gas, "
                "blast furnace gas, waste), not in the renewables group. Pumped storage includes battery "
                "storage. From 2017 the published total exceeds the sum of the fuel columns by 5–7 TWh (~2%; shares sum to ~0.98); the total is kept as fuel=Total (aggregate) and the residual is not allocated to any fuel. Fuel groups differ from ET 5.1; do not sum or splice the two series."
            ),
            related_indicator_ids=["electricity-generation-by-source"],
            open_questions=["Register row in Notion; Validation sample vs DUKES 5.6 for 1996+."],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw workbook missing: {path}")
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=None,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        raw = self.data_root / evidence[0].path
        archive = self.data_root / "curated" / "station-history.json"
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_text(json.dumps(parse_station_history(raw), indent=2) + "\n", encoding="utf-8")
        return parse_long_run(raw)


def main() -> None:
    connector = ElectricityGenerationLongRunConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    years = sorted({o.period_start[:4] for o in observations})
    print(f"{INDICATOR_ID}: {len(observations)} observations, {years[0]}–{years[-1]}")
    print(f"raw sha256={evidence.checksum_sha256}")
    print(f"manifest: {manifest_path}\ncurated: {curated_path}")


if __name__ == "__main__":
    main()

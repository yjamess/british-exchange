"""DESNZ DUKES 5.10 — Major Power Producer plant load factors (and efficiency).

Approach (plain language):
1. Prefer the pinned DUKES_5.10.xlsx under data/energy/plant-load-factors/raw/.
2. Parse Table 5.10.B (plant load factor, %) and Table 5.10.C (thermal efficiency, %).
3. Emit one observation per generator type × year × series; unit = percent.
4. ``[x]`` → missing. notes=generator_type=<Label>; series=load_factor|thermal_efficiency.
5. Distinct from Ready renewable LF (DUKES 6.3) — this is MPP plant loads incl. nuclear.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / headers; never invent numbers.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "plant-load-factors"
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-07/DUKES_5.10.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a6a364b0ddb7e4831c629f2/DUKES_5.10.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_5.10_2026"
SHEET_NAME = "5.10.B and 5.10.C"
UNIT = "percent"

TABLE_MARKERS: dict[str, str] = {
    "Table 5.10.B": "load_factor",
    "Table 5.10.C": "thermal_efficiency",
}


def _year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _parse_year_header(cell: object) -> int | None:
    if cell is None:
        return None
    if isinstance(cell, int) and 1900 <= cell <= 2100:
        return cell
    if isinstance(cell, float) and cell.is_integer() and 1900 <= int(cell) <= 2100:
        return int(cell)
    text = str(cell).strip()
    # e.g. "2004 [note 11]"
    token = text.split("[", 1)[0].strip()
    if token.isdigit():
        y = int(token)
        if 1900 <= y <= 2100:
            return y
    return None


def _parse_cell(cell: object) -> tuple[float | None, ObservationStatus]:
    if cell is None or cell == "":
        return None, "missing"
    if isinstance(cell, str):
        text = cell.strip()
        if text in {"[x]", "x", ".."}:
            return None, "missing"
        try:
            return float(text), "final"
        except ValueError as exc:
            raise ValueError(f"Unrecognised DUKES 5.10 cell: {cell!r}") from exc
    if isinstance(cell, (int, float)):
        return float(cell), "final"
    raise ValueError(f"Unrecognised DUKES 5.10 cell type: {cell!r}")


def _clean_generator_label(raw: object) -> str:
    return str(raw).strip()


def parse_dukes_510_plant_loads(workbook_path: Path) -> list[Observation]:
    """Parse Tables 5.10.B and 5.10.C into long-format observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}")
        ws: Worksheet = wb[SHEET_NAME]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    observations: list[Observation] = []
    series: str | None = None
    years: list[int] = []
    year_cols: list[int] = []

    for row in rows:
        if not row:
            continue
        first = row[0]
        if first is None:
            continue
        label = str(first).strip()

        for marker, series_key in TABLE_MARKERS.items():
            if label.startswith(marker):
                series = series_key
                years = []
                year_cols = []
                break
        else:
            # Header row under a table title.
            if series is not None and label.lower().startswith("generator type"):
                years = []
                year_cols = []
                for col, cell in enumerate(row):
                    if col == 0:
                        continue
                    y = _parse_year_header(cell)
                    if y is not None:
                        years.append(y)
                        year_cols.append(col)
                if not years:
                    raise ValueError(f"No year columns under {series}")
                continue

            if series is None or not years:
                continue
            if not label or label.lower().startswith("table "):
                continue

            generator = _clean_generator_label(first)
            for year, col in zip(years, year_cols, strict=True):
                cell = row[col] if col < len(row) else None
                value, status = _parse_cell(cell)
                start_d, end_d = _year_bounds(year)
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start_d,
                        period_end=end_d,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit=UNIT,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=f"generator_type={generator}; series={series}",
                    )
                )

    if not observations:
        raise ValueError("No plant-load observations parsed from DUKES 5.10")
    load_rows = [o for o in observations if "series=load_factor" in o.notes]
    if not load_rows:
        raise ValueError("DUKES 5.10.B load-factor rows missing")
    return observations


class PlantLoadFactorsConnector(Connector):
    """DESNZ DUKES 5.10 MPP plant load factors (+ thermal efficiency companion)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Plant load factors (major power producers)",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "DUKES 5.10.B Plant load factor (%) and 5.10.C Thermal efficiency (%)"
            ),
            geography="UK (K02000001) — Major Power Producers",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK annual plant load factors for Major Power Producers from DUKES "
                "table 5.10.B (percent), including Nuclear stations, CCGT, conventional "
                "thermal, pumped storage, coal-fired subset, all plant, and system load "
                "factor. Companion thermal-efficiency rows from table 5.10.C are tagged "
                "series=thermal_efficiency. Distinct from renewable load factors in "
                "DUKES 6.3."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.plant_load_factors",
            curated_path="curated/observations.csv",
            update_cadence="Annual — DUKES electricity chapter, final Thursday of July",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                f"Parse sheet {SHEET_NAME!r}. For 5.10.B and 5.10.C, read year columns "
                "from the Generator Type header row and emit one Observation per "
                "generator × year. notes=generator_type=<Label>; "
                "series=load_factor|thermal_efficiency. Publisher [x] → missing."
            ),
            caveats=(
                "MPP scope only (see DUKES note 1) — not all generators. Unit is percent "
                "(0–100) as published. Load factors for renewables-as-such belong on "
                "DUKES 6.3 (`renewable-electricity-load-factors`); this series is the "
                "Field Guide nuclear / conventional plant LF companion. System load "
                "factor and 'all plant' are retained — do not sum generator types into "
                "all plant in the UI. Simultaneous maximum demand (table 5.10.A) is out "
                "of scope for this indicator."
            ),
            related_indicator_ids=[
                "renewable-electricity-load-factors",
                "electricity-capacity-by-technology",
                "electricity-generation-by-source",
                "uk-power-stations-dukes",
            ],
            open_questions=[
                "Optional later: table 5.10.A simultaneous maximum load met (MW) as a "
                "separate demand indicator.",
            ],
            revision_notes="Gate 3 B3 ingest — not Ready until Validation accepts.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw workbook missing: {path}")
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_dukes_510_plant_loads(workbook)


def main() -> None:
    """Pinned raw → curated observations + manifest."""
    connector = PlantLoadFactorsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    generators = sorted(
        {
            part.removeprefix("generator_type=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("generator_type=")
        }
    )
    valued = sum(1 for o in observations if o.value is not None)
    missing = sum(1 for o in observations if o.observation_status == "missing")
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (valued={valued}, missing={missing})")
    print(f"generator_types ({len(generators)}): {', '.join(generators)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

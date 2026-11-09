"""DESNZ ECUK Table U1 — all sectors excl. transport by end use (ktoe), 2021–2025.

Short history only — do not draw as a 1970 ribbon. Complements domestic U3.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-06/ECUK_2026_End_Use_tables.xlsx"
SHARED_PIN = (
    ENERGY_DATA / "energy-consumption-ecuk" / "raw" / "2026-11-06" / "ECUK_2026_End_Use_tables.xlsx"
)
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/energy-consumption-in-the-uk-2026"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6aac067444ec1aa417346c38/ECUK_2026_End_Use_tables.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-24"
SOURCE_VERSION = "ECUK_2026_End_Use"
SHEET_NAME = "Table U1"
SECTOR_COLS = ("domestic", "industrial", "services", "total")
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _parse_numeric(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if not text or text.casefold() in MISSING_MARKERS:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "final"
    except ValueError:
        return None, "missing"


def parse_ecuk_u1(workbook_path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        rows = list(wb[SHEET_NAME].iter_rows(values_only=True))
    finally:
        wb.close()
    header_idx = None
    for i, row in enumerate(rows[:15]):
        if row and str(row[0] or "").strip().casefold() == "year":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("U1 Year header not found")

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or row[0] is None:
            break
        try:
            year = int(row[0])
        except (TypeError, ValueError):
            break
        end_use = str(row[1] or "").strip()
        if not end_use:
            continue
        period_start, period_end = f"{year:04d}-01-01", f"{year:04d}-12-31"
        for j, sector in enumerate(SECTOR_COLS):
            raw = row[j + 2] if j + 2 < len(row) else None
            value, status = _parse_numeric(raw)
            observations.append(
                Observation(
                    indicator_id="cross-sector-end-use",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ktoe",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"end_use={end_use};sector={sector}",
                )
            )
    if not observations:
        raise ValueError(f"No U1 rows from {workbook_path}")
    return observations


class CrossSectorEndUseConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ENERGY_DATA / "cross-sector-end-use"))

    @property
    def indicator_id(self) -> str:
        return "cross-sector-end-use"

    def ensure_pinned_raw(self) -> Path:
        dest = self.data_root / PINNED_RAW_RELATIVE
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.is_file():
            if not SHARED_PIN.is_file():
                raise FileNotFoundError(f"Shared End Use pin missing: {SHARED_PIN}")
            shutil.copy2(SHARED_PIN, dest)
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Cross-sector end use (excl. transport)",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ECUK Table U1 — all sectors excl. transport by end use (ktoe)",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "UK final energy consumption by end use for Domestic, Industrial and "
                "Services (excl. transport), ECUK Table U1, 2021–2025. notes "
                "end_use=<label>;sector=domestic|industrial|services|total."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.cross_sector_end_use",
            curated_path="curated/observations.csv",
            update_cadence="Annual — ECUK typically each September",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations="Parse U1 Year × End use × sector columns; [x] → missing.",
            caveats=(
                "Coverage starts 2021 — do not animate from 1970. Transport excluded. "
                "Distinct from domestic-only U3 long-run."
            ),
            revision_notes="ECUK 2026 End Use tables.",
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_ecuk_u1(self.data_root / evidence[0].path)


def main() -> None:
    connector = CrossSectorEndUseConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

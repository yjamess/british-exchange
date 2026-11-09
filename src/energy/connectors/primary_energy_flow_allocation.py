"""DESNZ ECUK Table W1 — primary energy allocation by destination (ktoe).

Approach (plain language):
1. Pin from energy-consumption-ecuk Whole energy flow workbook.
2. Parse Table W1: Year + destination columns (Primary energy → Final consumption).
3. notes ``stage=<column>``; cover sheet marks the pack Official Statistics in Development.
4. Write curated CSV + manifest for Domain 02 Metabolism spine (years from 1998).
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

PINNED_RAW_RELATIVE = "raw/2026-11-06/ECUK_2026_Whole_energy_flow_tables.xlsx"
SHARED_PIN = (
    ENERGY_DATA
    / "energy-consumption-ecuk"
    / "raw"
    / "2026-11-06"
    / "ECUK_2026_Whole_energy_flow_tables.xlsx"
)
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/energy-consumption-in-the-uk-2026"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab3b07d997a4b2950ccedb8/ECUK_2026_Whole_energy_flow_tables.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-09-24"
SOURCE_VERSION = "ECUK_2026_Whole_energy_flow"
SHEET_NAME = "Table W1"
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _clean_stage(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    while "[" in text and "]" in text:
        start = text.index("[")
        end = text.index("]", start)
        text = (text[:start] + text[end + 1 :]).strip()
    return " ".join(text.split())


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


def parse_ecuk_w1(workbook_path: Path) -> list[Observation]:
    """Parse W1 primary energy allocation by destination."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected {SHEET_NAME!r}; got {wb.sheetnames}")
        rows = list(wb[SHEET_NAME].iter_rows(values_only=True))
    finally:
        wb.close()

    header_idx: int | None = None
    stages: list[str] = []
    for i, row in enumerate(rows[:20]):
        if row and str(row[0] or "").strip().casefold() == "year":
            header_idx = i
            stages = [_clean_stage(c) for c in row[1:] if c is not None and str(c).strip()]
            break
    if header_idx is None or not stages:
        raise ValueError("W1 Year header / stages not found")

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or row[0] is None:
            break
        try:
            year = int(row[0])
        except (TypeError, ValueError):
            break
        period_start, period_end = f"{year:04d}-01-01", f"{year:04d}-12-31"
        for j, stage in enumerate(stages):
            raw = row[j + 1] if j + 1 < len(row) else None
            value, status = _parse_numeric(raw)
            observations.append(
                Observation(
                    indicator_id="primary-energy-flow-allocation",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ktoe",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"stage={stage}",
                )
            )
    if not observations:
        raise ValueError(f"No W1 rows from {workbook_path}")
    return observations


class PrimaryEnergyFlowAllocationConnector(Connector):
    """ECUK W1 primary → destination allocation for the Metabolism spine."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "primary-energy-flow-allocation")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "primary-energy-flow-allocation"

    def ensure_pinned_raw(self) -> Path:
        dest = self.data_root / PINNED_RAW_RELATIVE
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.is_file():
            if not SHARED_PIN.is_file():
                raise FileNotFoundError(f"Shared W* pin missing: {SHARED_PIN}")
            shutil.copy2(SHARED_PIN, dest)
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Primary energy flow allocation",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ECUK Table W1 — primary energy allocation by destination (ktoe)",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "Primary energy and its allocation to transfers, transformation, "
                "energy industry use, losses, non-energy use and final consumption "
                "(ktoe), ECUK Table W1. One observation per stage × year; notes stage=<label>."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.primary_energy_flow_allocation",
            curated_path="curated/observations.csv",
            update_cadence="Annual — ECUK typically each September",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse Table W1 Year header and destination columns. Long-format stages. "
                "Workbook cover marks Official Statistics in Development."
            ),
            caveats=(
                "Whole energy flow tables are Official Statistics in Development — not the "
                "same assurance as C1 final consumption. Series starts 1998. Do not treat "
                "stage columns as additive without reading ECUK notes (transfers can be signed). "
                "Useful/rejected (W2) is a separate modelled product."
            ),
            revision_notes="ECUK 2026 Whole energy flow tables; through 2025.",
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
        return parse_ecuk_w1(self.data_root / evidence[0].path)


def main() -> None:
    connector = PrimaryEnergyFlowAllocationConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

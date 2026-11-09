"""DESNZ ECUK Table U3 — domestic final consumption by end use and fuel (ktoe).

Approach (plain language):
1. Prefer the shared ECUK End Use pin under energy-consumption-ecuk.
2. Table U3 is wide: Year × (fuel × end-use) columns, 1970–2025.
3. One Observation per year × column; notes ``end_use=<use>;fuel=<fuel>``.
4. ``Total - *`` columns are end-use aggregates; ``* - total`` are fuel aggregates —
   charts must not double-count them with components.

Used by Domain 02 Gate 3 “Inside Britain's Energy Use” (domestic cutaway first).
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
SHEET_NAME = "Table U3"
MISSING_MARKERS = {"[x]", "[z]", "..", "…"}


def _clean_header(raw: object) -> str:
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


def _split_fuel_end_use(header: str) -> tuple[str, str]:
    """Split ``Fuel - end use`` headers into fuel and end_use labels."""
    if " - " not in header:
        return "Total", header
    fuel, end_use = header.split(" - ", 1)
    return fuel.strip(), end_use.strip()


def parse_ecuk_u3(workbook_path: Path) -> list[Observation]:
    """Parse U3 domestic end use × fuel into long-format observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected {SHEET_NAME!r}; got {wb.sheetnames}")
        rows = list(wb[SHEET_NAME].iter_rows(values_only=True))
    finally:
        wb.close()

    header_idx: int | None = None
    columns: list[str] = []
    for i, row in enumerate(rows[:20]):
        if row and str(row[0] or "").strip().casefold() == "year":
            header_idx = i
            columns = [_clean_header(c) for c in row[1:] if c is not None and str(c).strip()]
            break
    if header_idx is None or not columns:
        raise ValueError("U3 Year header / columns not found")

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or row[0] is None:
            break
        try:
            year = int(row[0])
        except (TypeError, ValueError):
            break
        period_start, period_end = f"{year:04d}-01-01", f"{year:04d}-12-31"
        for j, header in enumerate(columns):
            raw = row[j + 1] if j + 1 < len(row) else None
            value, status = _parse_numeric(raw)
            fuel, end_use = _split_fuel_end_use(header)
            observations.append(
                Observation(
                    indicator_id="domestic-end-use",
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="ktoe",
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=f"end_use={end_use};fuel={fuel}",
                )
            )
    if not observations:
        raise ValueError(f"No U3 rows from {workbook_path}")
    return observations


class DomesticEndUseConnector(Connector):
    """ECUK U3 domestic end-use × fuel for Inside Britain's Energy Use."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "domestic-end-use")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "domestic-end-use"

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
            title="Domestic end use by fuel",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ECUK Table U3 — domestic consumption by end use and fuel (ktoe)",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "UK domestic final energy consumption by end use and fuel (ktoe) from "
                "ECUK Table U3. One observation per end_use × fuel × year; notes "
                "end_use=<label>;fuel=<label>. fuel=Total is the end-use aggregate; "
                "end_use=total / end_use=domestic are fuel or sector aggregates."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.domestic_end_use",
            curated_path="curated/observations.csv",
            update_cadence="Annual — ECUK typically each September",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse Table U3 Year header and fuel×end-use columns. Long-format; "
                "[x] → missing. Do not stack aggregates with components."
            ),
            caveats=(
                "Appliances and some fuel×end-use cells are [x] in early years. "
                "Non-domestic end-use detail (U1/U2/U5) starts 2021 and is a separate "
                "indicator. Do not animate industry/services end uses from 1970."
            ),
            revision_notes="ECUK 2026 End Use tables; series through 2025.",
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        # Prefer checksum already recorded on the shared pin's retrieval when present.
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
        return parse_ecuk_u3(self.data_root / evidence[0].path)


def main() -> None:
    connector = DomesticEndUseConnector()
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

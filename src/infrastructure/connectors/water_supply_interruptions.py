"""Ofwat water supply interruptions — WCPR open data (APR3A_02).

Approach:
1. Prefer pinned WCPR XLSX under data/infrastructure/.../raw/ (manual download —
   Ofwat CDN often returns HTTP 403 to automated clients).
2. Keep UNIQUE_ITEM_REFERENCE == APR3A_02 (Actual performance — supply interruptions).
3. Convert Excel day-fraction (hh:mm:ss) → minutes per property.
4. One Observation per company × financial year; typed company dimensions
   (serialized into notes for curated CSV compatibility).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.dimensions import ObservationDimensions, notes_from_dimensions
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import INFRASTRUCTURE_DATA
from infrastructure.connectors._util import evidence_from_file

INDICATOR_ID = "water-supply-interruptions"
PINNED = "raw/2026-11-03/WCPR_2024-25_Open_Data.xlsx"
SOURCE_LANDING = (
    "https://www.ofwat.gov.uk/publication/data-for-the-water-company-performance-"
    "report-2024-25-open-data-friendly-machine-readable-format/"
)
OFFICIAL_RELEASE_DATE = "2025-10-01"  # WCPR 2024-25 publication window; refine if known
ITEM_REF = "APR3A_02"
UNIT = "minutes per property"
EW_CODE, EW_LABEL = "K04000001", "England and Wales"

FY_RE = re.compile(r"^(\d{4})-(\d{2})$")


def _fy_bounds(label: str) -> tuple[str, str]:
    """Map Ofwat financial year label 2024-25 → 2024-04-01 … 2025-03-31."""
    match = FY_RE.match(label.strip())
    if not match:
        raise ValueError(f"Unexpected financial year label: {label!r}")
    start_year = int(match.group(1))
    end_yy = int(match.group(2))
    end_year = 2000 + end_yy if end_yy < 100 else end_yy
    if end_year != start_year + 1:
        # Accept 2024-25 style only
        end_year = start_year + 1
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def _excel_time_to_minutes(raw: object) -> float | None:
    """Ofwat stores hh:mm:ss as Excel day fraction."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw) * 24.0 * 60.0
    text = str(raw).strip()
    if not text or text.lower() in {"n/a", "na", "-", ".."}:
        return None
    # Rare: HH:MM:SS string
    if ":" in text:
        parts = [float(p) for p in text.split(":")]
        if len(parts) == 3:
            h, m, s = parts
            return h * 60.0 + m + s / 60.0
        if len(parts) == 2:
            m, s = parts
            return m + s / 60.0
    try:
        return float(text.replace(",", "")) * 24.0 * 60.0
    except ValueError:
        return None


def parse_wcpr_interruptions(path: Path) -> list[Observation]:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    try:
        if "in" not in wb.sheetnames:
            raise ValueError(f"Expected sheet 'in' in {path.name}; got {wb.sheetnames}")
        ws = wb["in"]
        observations: list[Observation] = []
        header = None
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if i == 1:
                header = [str(c or "").strip() for c in row[:8]]
                expected = [
                    "COMPANY_NAME",
                    "COMPANY_ABBREVIATION",
                    "UNIQUE_ITEM_REFERENCE",
                    "SHORT_DESCRIPTION",
                    "RAG",
                    "YEAR",
                    "VALUE",
                    "UNITS",
                ]
                if header[:8] != expected:
                    raise ValueError(f"Unexpected WCPR header: {header[:8]!r}")
                continue
            if not row or row[2] != ITEM_REF:
                continue
            company_name = str(row[0] or "").strip()
            company = str(row[1] or "").strip()
            year_label = str(row[5] or "").strip()
            if not company or not year_label:
                continue
            minutes = _excel_time_to_minutes(row[6])
            status: ObservationStatus = "final" if minutes is not None else "missing"
            period_start, period_end = _fy_bounds(year_label)
            dims = ObservationDimensions(
                water_company=company,
                water_company_name=company_name,
            )
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=EW_CODE,
                    geography_label=EW_LABEL,
                    value=minutes,
                    unit=UNIT,
                    observation_status=status,
                    source_version="WCPR_2024-25",
                    notes=notes_from_dimensions(
                        dims,
                        extra=f"ref={ITEM_REF}; fy={year_label}",
                    ),
                )
            )
        if not observations:
            raise ValueError(f"No {ITEM_REF} rows parsed from {path}")
        observations.sort(key=lambda o: (o.period_start, o.notes))
        return observations
    finally:
        wb.close()


class WaterSupplyInterruptionsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (INFRASTRUCTURE_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Water supply interruptions",
            sector="infrastructure",
            publisher="Ofwat",
            source_url=SOURCE_LANDING,
            series_id="APR3A_02 (WCPR actual performance)",
            geography="England and Wales (K04000001); company-level rows",
            frequency="annual (financial year)",
            unit=UNIT,
            definition=(
                "Average water supply interruption duration per property "
                "(Ofwat common performance commitment), from Water Company "
                "Performance Report open data item APR3A_02. Values converted "
                "from Excel day-fraction (hh:mm:ss) to minutes. One observation "
                "per water company × financial year."
            ),
            licence="Open Government Licence / Ofwat open data terms",
            agent_owner="infrastructure",
            connector_module="infrastructure.connectors.water_supply_interruptions",
            curated_path="curated/observations.csv",
            update_cadence="annual (Ofwat WCPR)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858155bc6ccc21ff280c46",
            transformations=(
                "Parse sheet 'in'; filter UNIQUE_ITEM_REFERENCE=APR3A_02. "
                "Convert VALUE day-fraction → minutes (*24*60). Map YEAR "
                "YYYY-YY → financial-year ISO bounds (Apr–Mar). Company "
                "abbreviation/name stored as typed dimensions (notes serialization)."
            ),
            caveats=(
                "Company-level only — this extract has no industry aggregate row; "
                "do not invent or average an industry total without Ofwat weights. "
                "Automated Ofwat CDN downloads often 403; pinned workbook is the "
                "evidence snapshot. Null VALUE → observation_status=missing."
            ),
            revision_notes=(
                "WCPR 2024-25 open-data workbook pinned 2026-11-03 after manual "
                "browser download (automated fetch previously blocked)."
            ),
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_LANDING,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        path = self.data_root / evidence[0].path
        return parse_wcpr_interruptions(path)


def main() -> None:
    connector = WaterSupplyInterruptionsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    # Remove Blocked markers if present
    for name in ("BLOCKED.txt",):
        blocked = connector.data_root / name
        if blocked.exists():
            blocked.unlink()
    companies = sorted(
        {
            obs.notes.split("company=")[1].split(";")[0]
            for obs in observations
            if "company=" in obs.notes
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"companies ({len(companies)}): {', '.join(companies)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

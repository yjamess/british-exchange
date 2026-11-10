"""ONS ASHE Table 4 — manufacturing median earnings by 2-digit SIC.

Approach (plain language):
1. Pin the official ASHE Table 4 zip (industry by two-digit SIC).
2. Read Weekly pay — Gross (4.1a) and Hourly pay — Excluding overtime (4.6a).
3. Keep Manufacturing section C and divisions 10–33 from the All and Full-Time sheets.
4. Emit one Observation per year × measure × sheet × SIC for the published **median**.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
ASHE guidance: median is the preferred average
(https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours).
"""

from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

PIN_DATE = date(2026, 11, 10)
REFERENCE_YEAR = 2025
ZIP_NAME = "ashetable42025revised.zip"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/datasets/industry2digitsicashetable4"
)
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

# Tables we keep (a = estimates; skip b = coefficients of variation).
TABLES: tuple[tuple[str, str, str], ...] = (
    # filename fragment, measure id, unit
    ("Table 4.1a", "weekly_gross", "GBP median weekly pay (gross)"),
    ("Table 4.6a", "hourly_ex_ot", "GBP median hourly pay (excluding overtime)"),
)
SHEETS = ("All", "Full-Time")

# Manufacturing SIC 2007 section + divisions.
MFG_SECTION = "C"
MFG_DIVISIONS = {f"{n:02d}" for n in range(10, 34)}


@dataclass(frozen=True, slots=True)
class AsheRow:
    description: str
    sic: str
    jobs_thousands: float | None
    median: float
    annual_pct_change: float | None


def _clean_code(raw: object) -> str:
    text = str(raw or "").strip().strip("'").strip()
    # Section codes arrive as "C " or "C"; divisions as "10".
    if re.fullmatch(r"[A-U]", text, flags=re.IGNORECASE):
        return text.upper()
    if re.fullmatch(r"\d{1,2}", text):
        return text.zfill(2)
    return text


def _is_numeric_cell(raw: object) -> bool:
    if raw is None or raw in (":", "x", "x ", ".."):
        return False
    if isinstance(raw, (int, float)):
        return True
    try:
        float(str(raw).replace(",", ""))
        return True
    except ValueError:
        return False


def _as_float(raw: object) -> float | None:
    if not _is_numeric_cell(raw):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    return float(str(raw).replace(",", ""))


def _find_header_row(ws: Worksheet) -> int:
    for idx, row in enumerate(ws.iter_rows(max_row=12, values_only=True), 1):
        cells = [str(c).strip().lower() if c is not None else "" for c in row[:6]]
        if cells[:2] == ["description", "code"] and any("median" in c for c in cells):
            return idx
    raise ValueError(f"ASHE header row not found in sheet {ws.title}")


def _parse_sheet(ws: Worksheet) -> list[AsheRow]:
    header_row = _find_header_row(ws)
    out: list[AsheRow] = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        description = str(row[0] or "").strip()
        if not description:
            continue
        # Aggregate rows such as "All Manufacturing" leave Code blank and would
        # duplicate the coded MANUFACTURING / "'C " row — keep coded SIC only.
        sic = _clean_code(row[1])
        if sic != MFG_SECTION and sic not in MFG_DIVISIONS:
            continue
        median = _as_float(row[3])
        if median is None:
            continue
        out.append(
            AsheRow(
                description=description,
                sic=sic,
                jobs_thousands=_as_float(row[2]),
                median=median,
                annual_pct_change=_as_float(row[4]),
            )
        )
    return out


def _member_name(zf: zipfile.ZipFile, table_fragment: str) -> str:
    matches = [
        name
        for name in zf.namelist()
        if table_fragment in name and name.lower().endswith(".xlsx") and " CV" not in name
    ]
    if len(matches) != 1:
        raise ValueError(f"Expected one workbook for {table_fragment}, found {matches}")
    return matches[0]


class AsheManufacturingEarningsConnector(Connector):
    """Manufacturing median earnings from ASHE Table 4 (2-digit SIC)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "ashe-manufacturing-earnings")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "ashe-manufacturing-earnings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="ASHE manufacturing median earnings",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ASHE Table 4 · SIC 2007 2-digit · manufacturing",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="GBP median (weekly gross or hourly excluding overtime)",
            definition=(
                "Annual Survey of Hours and Earnings (ASHE) Table 4 medians for "
                "UK manufacturing (SIC 2007 section C and divisions 10–33). "
                "Weekly pay is gross; hourly pay excludes overtime. "
                "Sheets: All employee jobs and Full-Time employee jobs. "
                "Median is ONS's preferred average of earnings."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.ashe_manufacturing_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (ASHE Table 4 edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41465471768581e3bfbbc844f0357d31"
            ),
            related_indicator_ids=[
                "manufacturing-employment",
                "manufacturing-output-per-hour",
                "cpih-index",
            ],
            transformations=(
                f"Pin ASHE Table 4 zip ({ZIP_NAME}). Extract 4.1a (weekly gross) "
                "and 4.6a (hourly excluding overtime). Parse All and Full-Time "
                "sheets. Keep Manufacturing section C and divisions 10–33 with "
                "published median values. Skip suppressed cells (:, x). "
                f"Reference year {REFERENCE_YEAR} (April pay period for weekly/hourly). "
                "Job counts are indicative only — stored in notes, not as values."
            ),
            revision_notes=(
                "2025 revised edition pin 2026-11-10. ASHE revises provisional "
                "years; re-pin the zip on re-ingest."
            ),
            caveats=(
                "Employee jobs only — not self-employed. Median ≠ mean. "
                "Full-Time ≠ All. Hourly excluding overtime ≠ gross hourly. "
                "Job-count column is indicative, not a reliable BRES/Workforce Jobs total. "
                "This pin is one year (2025 revised); multi-year change needs further editions. "
                "Cash pounds — real terms would restate with Economy CPIH and must be labelled."
            ),
            open_questions=[
                "Optional later: Male/Female sheets; older Table 4 editions for a longer spine.",
            ],
        )

    def evidence_from_pinned_raw(self, relative: str | None = None) -> RawEvidence:
        rel = relative or f"raw/{PIN_DATE.isoformat()}/{ZIP_NAME}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned ASHE zip missing: {path}")
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/zip",
            official_release_date="2025-10-22",
            http_status=None,
            source_url=SOURCE_LANDING_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires pinned ASHE zip evidence")
        zip_path = self.data_root / evidence[0].path
        observations: list[Observation] = []
        period_start = date(REFERENCE_YEAR, 4, 1)
        period_end = date(REFERENCE_YEAR, 4, 30)
        version = f"ASHE-Table4-{REFERENCE_YEAR}-revised"

        with zipfile.ZipFile(zip_path) as zf:
            for table_fragment, measure, unit in TABLES:
                member = _member_name(zf, table_fragment)
                payload = zf.read(member)
                wb = openpyxl.load_workbook(
                    io.BytesIO(payload), data_only=True, read_only=True
                )
                try:
                    for sheet_name in SHEETS:
                        if sheet_name not in wb.sheetnames:
                            raise ValueError(f"Missing sheet {sheet_name} in {member}")
                        rows = _parse_sheet(wb[sheet_name])
                        if not rows:
                            raise ValueError(
                                f"No manufacturing rows in {member} / {sheet_name}"
                            )
                        for row in rows:
                            change = (
                                f"{row.annual_pct_change}"
                                if row.annual_pct_change is not None
                                else ""
                            )
                            jobs = (
                                f"{row.jobs_thousands}"
                                if row.jobs_thousands is not None
                                else ""
                            )
                            classification = (
                                "section" if row.sic == MFG_SECTION else "division"
                            )
                            observations.append(
                                Observation(
                                    indicator_id=self.indicator_id,
                                    period_start=period_start,
                                    period_end=period_end,
                                    geography_code=UK_GEOGRAPHY_CODE,
                                    geography_label=UK_GEOGRAPHY_LABEL,
                                    value=row.median,
                                    unit=unit,
                                    observation_status="final",
                                    source_version=version,
                                    notes=(
                                        f"series=ASHE-T4; measure={measure}; "
                                        f"sheet={sheet_name}; sic={row.sic}; "
                                        f"classification={classification}; "
                                        f"label={row.description}; statistic=median; "
                                        f"annual_pct_change={change}; "
                                        f"jobs_thousands_indicative={jobs}; "
                                        f"table={table_fragment}; "
                                        f"edition={REFERENCE_YEAR}revised"
                                    ),
                                )
                            )
                finally:
                    wb.close()

        observations.sort(
            key=lambda obs: (
                obs.notes or "",
                obs.period_start.isoformat(),
            )
        )
        return observations


def main() -> None:
    connector = AsheManufacturingEarningsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    # Spot headline Full-Time manufacturing weekly median
    for obs in observations:
        notes = obs.notes or ""
        if (
            "measure=weekly_gross" in notes
            and "sheet=Full-Time" in notes
            and "sic=C;" in notes
        ):
            print(f"spot Full-Time weekly section C median: {obs.value}")
            break
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

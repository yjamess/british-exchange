"""ONS BRES Table 4 — manufacturing employee jobs by UK region.

Approach (plain language):
1. Download official BRES Table 4 XLSX editions (region × broad industry).
2. On each regional sheet, find the Manufacturing broad industry row and take
   **Total employees / All** (not Total employment — that adds working proprietors).
3. Emit one Observation per region × reference year.
4. Loud caveats: employee jobs ≠ Ready Workforce Jobs (JWR7); 2024 provisional
   excludes Northern Ireland; PAYE-only discontinuity affects pre-2015 finer series.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

import json
import re
import warnings
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

PIN_DATE = date(2026, 11, 7)
UNIT = "thousands of employee jobs"
INDUSTRY_LABEL = "Manufacturing"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/"
    "regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4"
)
FILE_URI_PREFIX = (
    "https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/"
    "regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4/"
)

# openpyxl-readable editions (2015–2018 use strict OOXML that openpyxl skips).
# Prefer revised when available; latest year = provisional.
EDITIONS: tuple[tuple[int, str, str, str], ...] = (
    # year, edition_slug, filename, status_label
    (2019, "2019revised", "table42019r.xlsx", "revised"),
    (2020, "2020revised", "table42020r.xlsx", "revised"),
    (2021, "2021revised", "table42021r.xlsx", "revised"),
    (2022, "2022revised", "table42022r.xlsx", "revised"),
    (2023, "2023revised", "table42023rv2.xlsx", "revised"),
    (2024, "2024provisional", "table42024pv2.xlsx", "provisional"),
)

# Normalised sheet title → (GSS code, canonical label)
REGION_LOOKUP: dict[str, tuple[str, str]] = {
    "north east": ("E12000001", "North East"),
    "north west": ("E12000002", "North West"),
    "yorkshire and the humber": ("E12000003", "Yorkshire and The Humber"),
    "yorks and humber": ("E12000003", "Yorkshire and The Humber"),
    "yorks & humber": ("E12000003", "Yorkshire and The Humber"),
    "east midlands": ("E12000004", "East Midlands"),
    "west midlands": ("E12000005", "West Midlands"),
    "east of england": ("E12000006", "East of England"),
    "east england": ("E12000006", "East of England"),
    "london": ("E12000007", "London"),
    "south east": ("E12000008", "South East"),
    "south west": ("E12000009", "South West"),
    "wales": ("W92000004", "Wales"),
    "scotland": ("S92000003", "Scotland"),
    "northern ireland": ("N92000002", "Northern Ireland"),
}

SKIP_SHEETS = {"information", "contents"}


@dataclass(frozen=True, slots=True)
class EditionSpec:
    year: int
    edition_slug: str
    filename: str
    status_label: str

    @property
    def url(self) -> str:
        return f"{FILE_URI_PREFIX}{self.edition_slug}/{self.filename}"

    @property
    def relative_raw(self) -> str:
        return f"raw/{PIN_DATE.isoformat()}/{self.filename}"


def _editions() -> tuple[EditionSpec, ...]:
    return tuple(EditionSpec(*row) for row in EDITIONS)


def _norm_sheet(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def _year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def _find_header_columns(ws: Worksheet) -> int:
    """Return 1-based column index for Total employees / All.

    Layout (modern Table 4):
      Row 3: Full time employees | Part time employees | Total employees | Total employment
      Row 4: Public | Private | All  (repeated under each block)
    Total employees / All is the 3rd 'All' under Total employees → column 10.
    """
    # Prefer structural match on row 3/4; fall back to column 10.
    row3 = [ws.cell(3, c).value for c in range(1, 16)]
    row4 = [ws.cell(4, c).value for c in range(1, 16)]
    total_emp_col = None
    for c, val in enumerate(row3, start=1):
        text = str(val or "").strip().lower()
        if text == "total employees":
            total_emp_col = c
            break
    if total_emp_col is not None:
        # Find 'All' in row 4 starting at that block (Public, Private, All).
        for c in range(total_emp_col, min(total_emp_col + 4, 16)):
            if str(row4[c - 1] or "").strip().lower() == "all":
                return c
    # Documented default for current ONS Table 4 layout.
    return 10


def _parse_cell(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "provisional"
    text = str(raw).strip()
    if not text or text in {"*", "-", "…", "..", "n/a", "N/A"}:
        # * = disclosive; - = zero or <50 per ONS notes
        if text == "-":
            return 0.0, "provisional"
        return None, "suppressed" if text == "*" else "missing"
    try:
        return float(text.replace(",", "")), "provisional"
    except ValueError as exc:
        raise ValueError(f"Non-numeric BRES cell: {raw!r}") from exc


def _manufacturing_employee_jobs(ws: Worksheet) -> float | None:
    col = _find_header_columns(ws)
    for row in range(5, min((ws.max_row or 40) + 1, 40)):
        label = ws.cell(row, 1).value
        if label is None:
            continue
        if str(label).strip().lower() == "manufacturing":
            value, status = _parse_cell(ws.cell(row, col).value)
            if status == "suppressed":
                return None
            return value
    raise ValueError(f"Manufacturing row not found on sheet {ws.title!r}")


class BresManufacturingEmployeeJobsConnector(Connector):
    """BRES Table 4 Manufacturing total employee jobs by region."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "bres-manufacturing-employee-jobs")
        super().__init__(root, timeout_s=90.0)

    @property
    def indicator_id(self) -> str:
        return "bres-manufacturing-employee-jobs-by-region"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        years = ", ".join(str(e.year) for e in _editions())
        return Manifest(
            indicator_id=self.indicator_id,
            title="BRES manufacturing employee jobs by region",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="BRES-Table4-Manufacturing-TotalEmployees",
            geography=(
                "UK ITL1 / former GSS regions (E12000001–09, W92000004, "
                "S92000003, N92000002 when published). 2024 provisional excludes NI."
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "Annual Business Register and Employment Survey (BRES) Table 4: "
                "Manufacturing broad industry group, Total employees (All "
                "sectors), thousands, by UK region. Workplace-based employee "
                "jobs. Distinct from Ready Workforce Jobs JWR7 "
                "(manufacturing-employment)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.bres_manufacturing_employee_jobs",
            curated_path="curated/observations.csv",
            update_cadence="annual (BRES Table 4 editions on ONS)",
            raw_evidence=list(evidence),
            related_indicator_ids=["manufacturing-employment"],
            transformations=(
                f"Download BRES Table 4 XLSX for years {years}. Per regional "
                "sheet, locate Manufacturing row; take Total employees / All "
                "(not Total employment). Map sheet titles to GSS codes; trim "
                "trailing spaces. Period = calendar year bounds. "
                "observation_status=provisional (survey revises)."
            ),
            revision_notes=(
                "Each reference year has provisional then revised editions. "
                "This pin uses revised for 2019–2023 and provisional for 2024. "
                "Re-pin when 2024 revised ships. Older 2015–2018 XLSX use strict "
                "OOXML that openpyxl cannot load — out of this pin."
            ),
            caveats=(
                "CRITICAL: BRES **employee jobs** ≠ ONS Workforce Jobs "
                "(Ready manufacturing-employment / JWR7). Do not stitch or "
                "compare levels without a method note. Measure is Total "
                "employees (excludes working proprietors); Total employment is "
                "not curated. 2024 provisional **excludes Northern Ireland** "
                "(ONS Information sheet) — GB regions only for that year. "
                "Figures rounded to nearest 100; * disclosive → missing/"
                "suppressed. PAYE-only units discontinuity is relevant for "
                "pre-2015 / finer NOMIS extracts — not in this 2019–2024 pin "
                "but must be labelled if the series is extended backwards."
            ),
            open_questions=[
                "Extend pin to 2015–2018 once a strict-OOXML reader is available.",
                "Optional: NOMIS open-access finer SIC × local authority after Table 4 spine.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        import time

        import httpx

        from britain_exchange.checksum import sha256_bytes

        day = retrieved_on or PIN_DATE
        evidence: list[RawEvidence] = []
        meta_rows: list[dict[str, object]] = []
        for edition in _editions():
            # Keep filenames stable; pin folder uses wave date.
            relative = f"raw/{day.isoformat()}/{edition.filename}"
            target = self.data_root / relative
            # Reuse an already-pinned file (ONS rate-limits burst downloads).
            if target.is_file() and target.stat().st_size > 1000:
                checksum = sha256_file(target)
                ev = RawEvidence(
                    path=relative,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=checksum,
                    content_type=(
                        "application/vnd.openxmlformats-officedocument."
                        "spreadsheetml.sheet"
                    ),
                    official_release_date="",
                    http_status=None,
                    source_url=edition.url,
                )
            else:
                payload: bytes | None = None
                content_type = ""
                status_code = 0
                last_err: Exception | None = None
                for attempt in range(1, 7):
                    try:
                        with httpx.Client(
                            timeout=self.timeout_s, follow_redirects=True
                        ) as client:
                            response = client.get(edition.url)
                            status_code = response.status_code
                            if status_code == 429:
                                time.sleep(5 * attempt)
                                continue
                            response.raise_for_status()
                            payload = response.content
                            content_type = response.headers.get("content-type", "")
                            break
                    except Exception as exc:  # noqa: BLE001 — retry then fail loud
                        last_err = exc
                        time.sleep(3 * attempt)
                if payload is None:
                    raise RuntimeError(
                        f"Failed to download {edition.url} after retries: {last_err}"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
                checksum = sha256_bytes(payload)
                if sha256_file(target) != checksum:
                    raise RuntimeError(f"Checksum mismatch writing {target}")
                ev = RawEvidence(
                    path=relative,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=checksum,
                    content_type=content_type,
                    official_release_date="",
                    http_status=status_code,
                    source_url=edition.url,
                )
                time.sleep(1.5)

            # Verify openpyxl can see sheets (fail early on strict OOXML).
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                wb = openpyxl.load_workbook(
                    self.data_root / ev.path, read_only=True, data_only=True
                )
                sheet_n = len(wb.sheetnames)
                wb.close()
            if sheet_n == 0:
                raise RuntimeError(
                    f"openpyxl found 0 sheets in {ev.path} — likely strict "
                    "OOXML; pick another edition or add a compatible reader"
                )
            evidence.append(ev)
            meta_rows.append(
                {
                    "year": edition.year,
                    "edition": edition.status_label,
                    "filename": edition.filename,
                    "url": edition.url,
                    "relative_path": relative,
                    "checksum_sha256": ev.checksum_sha256,
                    "sheet_count": sheet_n,
                }
            )
        meta_rel = f"raw/{day.isoformat()}/retrieval.json"
        meta_path = self.data_root / meta_rel
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        meta_path.write_text(
            json.dumps(
                {
                    "indicator_id": self.indicator_id,
                    "retrieved_on": day.isoformat(),
                    "landing_url": SOURCE_LANDING_URL,
                    "editions": meta_rows,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        evidence.append(
            RawEvidence(
                path=meta_rel,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(meta_path),
                content_type="application/json",
                official_release_date="",
                http_status=None,
                source_url=SOURCE_LANDING_URL,
            )
        )
        return evidence

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        day = PIN_DATE
        out: list[RawEvidence] = []
        for edition in _editions():
            rel = f"raw/{day.isoformat()}/{edition.filename}"
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(f"Pinned raw missing: {path}")
            out.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=sha256_file(path),
                    content_type=(
                        "application/vnd.openxmlformats-officedocument."
                        "spreadsheetml.sheet"
                    ),
                    official_release_date="",
                    http_status=None,
                    source_url=edition.url,
                )
            )
        return out

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence entries")
        # Map filename → edition
        by_name = {e.filename: e for e in _editions()}
        observations: list[Observation] = []
        for ev in evidence:
            name = Path(ev.path).name
            if name == "retrieval.json" or name not in by_name:
                continue
            edition = by_name[name]
            path = self.data_root / ev.path
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                wb = openpyxl.load_workbook(path, data_only=True)
            if not wb.sheetnames:
                raise RuntimeError(f"No sheets in {path}")
            version = (
                f"BRES Table 4 {edition.year} {edition.status_label} "
                f"({edition.filename})"
            )
            # Survey estimates revise; keep provisional even for "revised" editions.
            status: ObservationStatus = "provisional"
            start, end = _year_bounds(edition.year)
            seen_regions: set[str] = set()
            for sheet_name in wb.sheetnames:
                key = _norm_sheet(sheet_name)
                if key in SKIP_SHEETS:
                    continue
                if key not in REGION_LOOKUP:
                    raise ValueError(
                        f"Unmapped region sheet {sheet_name!r} in {path.name}"
                    )
                geo_code, geo_label = REGION_LOOKUP[key]
                if geo_code in seen_regions:
                    raise ValueError(f"Duplicate region {geo_code} in {path.name}")
                seen_regions.add(geo_code)
                ws = wb[sheet_name]
                value = _manufacturing_employee_jobs(ws)
                obs_status: ObservationStatus = (
                    "missing" if value is None else status
                )
                observations.append(
                    Observation(
                        indicator_id=self.indicator_id,
                        period_start=start,
                        period_end=end,
                        geography_code=geo_code,
                        geography_label=geo_label,
                        value=value,
                        unit=UNIT,
                        observation_status=obs_status,
                        source_version=version,
                        notes=(
                            f"series=BRES-T4; classification=manufacturing; "
                            f"sic=C; measure=total_employees; "
                            f"edition={edition.year} {edition.status_label}; "
                            f"industry={INDUSTRY_LABEL}; "
                            "employee_jobs_not_workforce_jobs=true"
                        ),
                    )
                )
            # Expect 11 (no NI) or 12 regions
            if len(seen_regions) not in {11, 12}:
                raise ValueError(
                    f"Expected 11–12 regions in {path.name}, got {len(seen_regions)}"
                )
            if edition.year == 2024 and "N92000002" in seen_regions:
                raise ValueError(
                    "2024 provisional unexpectedly includes Northern Ireland"
                )
            if edition.year < 2024 and "N92000002" not in seen_regions:
                raise ValueError(
                    f"{edition.year} expected Northern Ireland sheet missing"
                )

        observations.sort(key=lambda o: (o.period_start, o.geography_code))
        if not observations:
            raise ValueError("No BRES manufacturing observations curated")
        return observations


def main() -> None:
    connector = BresManufacturingEmployeeJobsConnector()
    evidence = connector.fetch_latest(retrieved_on=PIN_DATE)
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw_files: {len(evidence)}")
    for ev in evidence:
        if Path(ev.path).suffix.lower() in {".xlsx", ".xls"}:
            print(f"  {ev.path} sha256={ev.checksum_sha256[:16]}…")
    print(f"observations: {len(observations)}")
    # Samples
    for geo in ("E12000001", "E12000007", "S92000003"):
        rows = [o for o in observations if o.geography_code == geo]
        if rows:
            last = rows[-1]
            print(
                f"sample {last.geography_label} {last.period_start[:4]}: "
                f"{last.value} thousand employee jobs"
            )
    # 2024 NI absence
    ni_2024 = [
        o
        for o in observations
        if o.geography_code == "N92000002" and o.period_start.startswith("2024")
    ]
    print(f"ni_2024_rows: {len(ni_2024)} (expect 0)")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

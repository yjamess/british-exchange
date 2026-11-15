"""JOBS02 workforce jobs by SIC 2007 section (seasonally adjusted).

Approach (plain language):
1. Download the official JOBS02 workbook (one file, many industries).
2. Keep the seasonally adjusted workforce-jobs sheet only.
3. Store each SIC section A–T, plus the published all-jobs total, as levels.
4. Do not calculate shares of the total. A pie can be drawn later from levels.

Section C (manufacturing) is inside this official table. The canonical
single-series indicator stays Energy ``manufacturing-employment`` (JWR7).
This connector does not copy ``data/energy/``.

Jobs are not people. Employee-jobs and self-employment sheets in the same
workbook are a different cut and are not curated here.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
``.xls`` needs xlrd; openpyxl reads ``.xlsx`` only
(https://xlrd.readthedocs.io/en/latest/).
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import xlrd

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import quarter_bounds
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "workforce-jobs-by-industry"
LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "employmentandemployeetypes/datasets/workforcejobsbyindustryjobs02"
)
# The "current" file name changes when ONS publishes the next quarter.
# Dataset page release date checked 2026-11-15: 15 September 2026.
SOURCE_FILE_URI = (
    "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/"
    "datasets/workforcejobsbyindustryjobs02/current/jobs02sep2026.xls"
)
SOURCE_FILE_URL = f"https://www.ons.gov.uk/file?uri={SOURCE_FILE_URI}"
OFFICIAL_RELEASE = "2026-09-15"
RAW_NAME = "jobs02.xls"
SHEET_NAME = "WFJ SA"
SECTIONS_JSON = "curated/sections.json"

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

# Short SIC 2007 names. The workbook wraps some labels across lines
# ("Accommod-ation"), so we do not trust those cells as the display name.
SECTION_NAMES: dict[str, str] = {
    "A": "Agriculture, forestry and fishing",
    "B": "Mining and quarrying",
    "C": "Manufacturing",
    "D": "Electricity, gas, steam and air conditioning supply",
    "E": "Water supply, sewerage, waste and remediation",
    "F": "Construction",
    "G": "Wholesale and retail trade; repair of motor vehicles",
    "H": "Transport and storage",
    "I": "Accommodation and food service activities",
    "J": "Information and communication",
    "K": "Financial and insurance activities",
    "L": "Real estate activities",
    "M": "Professional, scientific and technical activities",
    "N": "Administrative and support service activities",
    "O": "Public administration and defence",
    "P": "Education",
    "Q": "Human health and social work activities",
    "R": "Arts, entertainment and recreation",
    "S": "Other service activities",
    "T": "Activities of households as employers",
}

# Two-digit years in JOBS02: 78 means 1978, 26 means 2026.
_YEAR_PIVOT = 70
_PERIOD = re.compile(
    r"^(Jan|Mar|Jun|Sep|Dec)\s+(\d{2})(?:\s*\(([pr])\))?$",
    re.IGNORECASE,
)
_MONTH_TO_QUARTER = {"mar": 1, "jun": 2, "sep": 3, "dec": 4}
# Section columns are rounded to whole thousands. Across 163+ quarters the
# largest gap versus the published total in the Sep 2026 file is 3.
# A wider gap means a shifted column, not ordinary rounding.
_SUM_TOLERANCE_THOUSANDS = 5.0

# The Sep 2026 workbook mistypes two quarter labels (extra digit).
# Neighbours and the all-jobs total identify them. Values are not edited.
# Mar 193 total 35,439 = published 2019 Q1; Mar 204 total 35,606 = 2020 Q1.
_LABEL_FIXES: dict[str, tuple[int, int]] = {
    "Mar 193": (2019, 1),
    "Mar 204": (2020, 1),
}


def _expand_year(two_digit: int) -> int:
    if two_digit >= _YEAR_PIVOT:
        return 1900 + two_digit
    return 2000 + two_digit


def _as_float(raw: object) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if text in {"", "-", "..", "…"}:
        return None
    return float(text)


def _header_row(sheet: xlrd.sheet.Sheet) -> int:
    for row_index in range(min(15, sheet.nrows)):
        label = str(sheet.cell_value(row_index, 0)).strip()
        if label.startswith("SIC 2007"):
            return row_index
    raise ValueError(f"{SHEET_NAME} has no 'SIC 2007 sections' header row")


def _columns(sheet: xlrd.sheet.Sheet, header_row: int) -> list[tuple[int, str, str, str]]:
    """Return (column, series id, display name, kind) for A–T and the total.

    ``kind`` is ``section`` or ``total``. The G–T services aggregate is
    skipped so a later chart cannot add it on top of G, H, I, … T.
    """
    found: list[tuple[int, str, str, str]] = []
    for col in range(sheet.ncols):
        code = str(sheet.cell_value(header_row, col)).strip().upper()
        if code in SECTION_NAMES:
            found.append((col, code, SECTION_NAMES[code], "section"))
        elif code == "A-T":
            found.append((col, "total", "All jobs", "total"))
        elif code == "G-T":
            continue
    letters = [series for _, series, _, kind in found if kind == "section"]
    missing = [letter for letter in SECTION_NAMES if letter not in letters]
    if missing:
        raise ValueError(f"JOBS02 WFJ SA missing SIC sections: {missing}")
    if not any(kind == "total" for _, _, _, kind in found):
        raise ValueError("JOBS02 WFJ SA missing the A-T all-jobs column")
    return found


def parse_wfj_sa(path: Path, *, source_version: str) -> list[Observation]:
    """Read WFJ SA into one observation per section (or total) per quarter."""
    book = xlrd.open_workbook(path)
    if SHEET_NAME not in book.sheet_names():
        raise ValueError(f"Missing sheet {SHEET_NAME!r} in {path.name}")
    sheet = book.sheet_by_name(SHEET_NAME)
    header_row = _header_row(sheet)
    columns = _columns(sheet, header_row)

    observations: list[Observation] = []
    for row_index in range(header_row + 1, sheet.nrows):
        raw_period = str(sheet.cell_value(row_index, 0)).replace("\xa0", " ").strip()
        if not raw_period:
            continue
        fixed = _LABEL_FIXES.get(raw_period)
        match = _PERIOD.match(raw_period)
        source_label = ""
        if fixed is not None:
            year, quarter = fixed
            marker_note = "none"
            source_label = raw_period
        elif match:
            month_name, year_text, marker = match.group(1), match.group(2), match.group(3)
            quarter = _MONTH_TO_QUARTER[month_name.lower()]
            year = _expand_year(int(year_text))
            marker_note = {"p": "provisional", "r": "revised"}.get((marker or "").lower(), "none")
        elif raw_period[0].isdigit() or raw_period.lower().startswith("note"):
            # Footnotes sit under the last quarter.
            if observations:
                break
            continue
        else:
            raise ValueError(f"Unrecognised JOBS02 period label: {raw_period!r}")
        period_start, period_end = quarter_bounds(year, quarter)

        for col, series, name, kind in columns:
            value = _as_float(sheet.cell_value(row_index, col))
            notes = (
                f"series={series}; section_name={name}; kind={kind}; "
                f"component=workforce_jobs; adjustment=SA; release_marker={marker_note}"
            )
            if series == "C":
                notes += "; linked_indicator=manufacturing-employment"
            if source_label:
                notes += f"; source_label={source_label}"
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="Thousands of jobs, SA",
                    observation_status="missing" if value is None else "final",
                    source_version=source_version,
                    notes=notes,
                )
            )
    if not observations:
        raise ValueError("JOBS02 WFJ SA produced no observations")
    _check_section_sums(observations)
    _check_quarters_contiguous(observations)
    return observations


def _note_value(notes: str, key: str) -> str:
    for part in notes.split(";"):
        piece = part.strip()
        if piece.startswith(key + "="):
            return piece.split("=", 1)[1].strip()
    return ""


def _check_section_sums(observations: Sequence[Observation]) -> None:
    """Fail if A–T levels do not add to the published all-jobs total.

    This checks the official total. It does not create a share series.
    """
    by_period: dict[str, dict[str, float]] = {}
    for obs in observations:
        if obs.value is None:
            continue
        series = _note_value(obs.notes, "series")
        by_period.setdefault(obs.period_start, {})[series] = obs.value

    for period_start, values in by_period.items():
        if "total" not in values:
            raise ValueError(f"Missing all-jobs total for {period_start}")
        section_sum = sum(amount for series, amount in values.items() if series != "total")
        gap = section_sum - values["total"]
        if abs(gap) > _SUM_TOLERANCE_THOUSANDS:
            raise ValueError(
                f"SIC sections sum to {section_sum} but all jobs are "
                f"{values['total']} on {period_start} (gap {gap})"
            )


def _check_quarters_contiguous(observations: Sequence[Observation]) -> None:
    """Fail if a calendar quarter is missing between the first and the last."""
    indexes = sorted(
        {
            int(obs.period_start[:4]) * 4 + (int(obs.period_start[5:7]) - 1) // 3
            for obs in observations
        }
    )
    expected = list(range(indexes[0], indexes[-1] + 1))
    if indexes != expected:
        raise ValueError("JOBS02 WFJ SA is missing a quarter between the first and last row")


def _write_catalog(data_root: Path) -> None:
    catalog = {
        "source": LANDING_URL,
        "release_date": OFFICIAL_RELEASE,
        "sheet": SHEET_NAME,
        "unit": "Thousands of jobs, SA",
        "jobs_not_people": True,
        "shares": "not stored — do not invent a share of DYDC",
        "sections": [
            {"series": letter, "section_name": name, "kind": "section"}
            for letter, name in SECTION_NAMES.items()
        ]
        + [{"series": "total", "section_name": "All jobs", "kind": "total"}],
        "linked_indicators": {
            "C": "manufacturing-employment",
            "total": "workforce-jobs",
        },
        "not_curated": [
            "WFJ NSA",
            "EJ NSA",
            "EJ SA",
            "SEJ NSA",
            "SEJ SA",
            "G-T total services (aggregate of G to T)",
        ],
    }
    path = data_root / SECTIONS_JSON
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


class WorkforceJobsByIndustryConnector(Connector):
    """National workforce jobs by SIC section from JOBS02."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Workforce jobs by industry (SIC 2007 sections)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING_URL,
            series_id="JOBS02 WFJ SA · SIC A–T",
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="quarterly",
            unit="Thousands of jobs, SA",
            definition=(
                "UK workforce jobs by SIC 2007 section, seasonally adjusted, "
                "thousands of jobs. ONS table JOBS02, sheet 'WFJ SA'. Includes "
                "sections A–T and the published all-jobs total (A–T column). "
                "Does not store shares of that total. Jobs (employer surveys "
                "plus LFS components) are not LFS employed people. Section C "
                "is the same published series as Energy manufacturing-employment "
                "(JWR7); this pack is not a second manufacturing indicator."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.workforce_jobs_by_industry",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS workforce jobs / JOBS02)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/p/419654717685811bb08ce13159830438"
            ),
            transformations=(
                "Download JOBS02 xls. Keep sheet WFJ SA. Map Mar/Jun/Sep/Dec "
                "YY to calendar quarters (Mar=Q1 … Dec=Q4). Two-digit years: "
                "70–99 → 19xx, 00–69 → 20xx. Keep SIC letters A–T (kind=section) "
                "and the A–T all-jobs column (series=total, kind=total). Skip "
                "the G–T services aggregate. Notes carry series, section_name, "
                "kind, component=workforce_jobs, adjustment=SA, release_marker. "
                "Section C notes linked_indicator=manufacturing-employment. "
                "No share of DYDC is calculated. Workbook typos 'Mar 193' and "
                "'Mar 204' are mapped to 2019 Q1 and 2020 Q1 (neighbours and "
                "the all-jobs total); notes keep source_label. Latest quarter "
                "per series is provisional. Fail if a quarter is missing or "
                "section levels miss the published total by more than 5 thousand."
            ),
            revision_notes=(
                "Workforce jobs revise with quarterly sources and the annual "
                "December benchmark. JOBS02 file name changes each edition "
                "(this pin: jobs02sep2026.xls, release 2026-09-15). "
                "(p) on a quarter is the ONS provisional marker; (r) means "
                "revised and is still stored as final once a later quarter exists."
            ),
            caveats=(
                "Jobs ≠ people. Do not add these levels to LFS employment "
                "(LF2G). Do not invent industry shares of workforce-jobs "
                "(DYDC) — the total is already in series=total. Section sum "
                "can differ from that total by rounding (about 1 thousand). "
                "Section C links Energy manufacturing-employment (JWR7). "
                "Do not fork BRES (bres-manufacturing-employee-jobs-by-region) "
                "— that is regional employee jobs, not this national workforce "
                "jobs series. March 2019 onwards has an LFS-reweighting step "
                "change (JOBS02 footnote). The Sep 2026 file labels 2019 Q1 "
                "as 'Mar 193' and 2020 Q1 as 'Mar 204'; those two labels are "
                "corrected from their neighbours and stored in source_label. "
                "Sheet unit is thousands."
            ),
            related_indicator_ids=[
                "workforce-jobs",
                "manufacturing-employment",
                "bres-manufacturing-employee-jobs-by-region",
                "employment-level",
            ],
            open_questions=[
                "Occupation (EMP04, LFS people by SOC) is a different concept and is not in this pack.",
                "Employee-jobs and self-employment sheets in JOBS02 are not curated.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/{RAW_NAME}"
        return download_ons_file(
            SOURCE_FILE_URL,
            self.data_root / relative,
            relative_path=relative,
            official_release_date=OFFICIAL_RELEASE,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(raw_path)
        source_version = f"JOBS02 {OFFICIAL_RELEASE}"
        observations = parse_wfj_sa(raw_path, source_version=source_version)
        _write_catalog(self.data_root)

        def _series(obs: Observation) -> str:
            return _note_value(obs.notes, "series")

        return mark_latest_months_provisional(observations, months=1, group_key=_series)


def main() -> None:
    """Fetch → transform → write the industry pack."""
    connector = WorkforceJobsByIndustryConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    latest = max(obs.period_start for obs in observations)
    latest_rows = [obs for obs in observations if obs.period_start == latest and obs.value is not None]
    total = next(obs.value for obs in latest_rows if _note_value(obs.notes, "series") == "total")
    manufacturing = next(obs.value for obs in latest_rows if _note_value(obs.notes, "series") == "C")
    section_sum = sum(
        obs.value or 0 for obs in latest_rows if _note_value(obs.notes, "kind") == "section"
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"latest: {latest} total={total} manufacturing={manufacturing} section_sum={section_sum}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

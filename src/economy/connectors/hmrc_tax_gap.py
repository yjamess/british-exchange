"""HMRC Measuring tax gaps pin — Domain 06 · The Tax Gap (EC-G2-06F).

Approach (beginner-friendly):
1. Download the official MTG online tables workbook + summary/behaviour HTML.
2. Parse the xlsx via zipfile + XML (openpyxl normal load fails — broken drawing
   refs in the GOV.UK file; read_only also mishandles shared strings here).
3. Curate long-form Observation rows for Tables 1.1, 1.2, 1.3 and 7.1.
4. Self-QA headline + ≥2 breakdown cells against the published bulletin.

Non-negotiables:
- Do **not** equate the whole gap with fraud/evasion — HMRC behaviours include
  error, legal interpretation, failure to take reasonable care, etc.
- Label methodology breaks; do not splice incompatible years.
- Tax-year periods (6 Apr–5 Apr), UK geography, OGL v3.0.

Reproduce::

    uv run python -m economy.connectors.hmrc_tax_gap

Refs: pathlib · typing · PEP 8 · OGL v3.0.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence
from xml.etree import ElementTree as ET

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import Observation, write_observations_csv
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "hmrc-tax-gap"
PACKAGE_DIR = "hmrc-tax-gap"
GEO_CODE = "K02000001"
GEO_LABEL = "United Kingdom"
SOURCE_VERSION = "MTG-2026"
EDITION_LABEL = "Measuring tax gaps 2026 edition (estimates for tax year 2024 to 2025)"
OFFICIAL_RELEASE_DATE = "2026-06-23"

TABLES_LANDING = (
    "https://www.gov.uk/government/statistics/measuring-tax-gaps-tables"
)
TABLES_XLSX = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a314f53141f0690ad5fa41e/Measuring_tax_gap_online_tables_2026.xlsx"
)
SUMMARY_URL = (
    "https://www.gov.uk/government/statistics/measuring-tax-gaps/1-tax-gaps-summary"
)
BEHAVIOUR_URL = (
    "https://www.gov.uk/government/statistics/measuring-tax-gaps/"
    "7-tax-gaps-illustrative-tax-gap-by-behaviour"
)
ANNEX_URL = (
    "https://www.gov.uk/government/statistics/measuring-tax-gaps-methodological-annex"
)
QUALITY_URL = (
    "https://www.gov.uk/government/statistics/quality-report-measuring-tax-gaps"
)
MAIN_STATS_URL = "https://www.gov.uk/government/statistics/measuring-tax-gaps"

SSML = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": SSML}

# Latest two tax years in this vintage are HMRC projections (data lags).
PROJECTION_YEARS = frozenset({"2023-24", "2024-25"})

# Headline / breakdown anchors for self-QA (MTG 2026 · tax year 2024-25).
QA_ANCHORS: dict[str, float] = {
    "total_gap_gbp_bn_2024_25": 59.2,
    "total_gap_pct_2024_25": 6.4,
    "theoretical_liability_gbp_bn_2024_25": 924.4,
    "vat_gap_gbp_bn_2024_25": 12.1,
    "vat_gap_pct_2024_25": 6.6,
    "ct_gap_pct_2024_25": 18.1,
    "it_nics_cgt_gap_pct_2024_25": 4.0,
    "excise_gap_pct_2024_25": 5.5,
    "failure_reasonable_care_share_pct_2024_25": 35.0,
    "evasion_share_pct_2024_25": 12.0,
    "small_business_share_pct_2024_25": 62.0,
}

SAFETY_COPY = (
    "HMRC Measuring tax gaps estimate of the difference between theoretical tax "
    "liabilities and tax paid. The gap is **not** the same as deliberate fraud: "
    "published behaviour categories include avoidance, criminal attacks, error, "
    "evasion, failure to take reasonable care, hidden economy, legal interpretation, "
    "and non-payment. Estimates are modelled/administrative — not observed incidents."
)

METHODOLOGY_BREAKS: tuple[dict[str, str], ...] = (
    {
        "id": "ct-step-2019-20",
        "label": "Corporation Tax step change 2019–20",
        "detail": (
            "HMRC Summary: CT gap broadly stable to 2018–19; step change in 2019–20 "
            "partly reflecting improvements in data collection. Emerging evidence that "
            "small-business CT gap may be understated before 2019–20 — not directly "
            "comparable to later years without Notes."
        ),
    },
    {
        "id": "behaviour-series-start",
        "label": "Illustrative behaviour series (Table 7.1)",
        "detail": (
            "Table 7.1 starts at 2019–20. MTG 2023 methodological updates to behaviour "
            "assumptions do not extend the comparable series back to 2005–06. Do not "
            "splice older editions without Notes."
        ),
    },
    {
        "id": "projection-years",
        "label": "Two most recent years are projections",
        "detail": (
            "Cover note / Summary: 2023–24 and 2024–25 are projections due to data lags "
            "(see Methodological annex). Curated status=provisional for those years."
        ),
    },
    {
        "id": "note-comparability",
        "label": "Workbook notes on non-comparability",
        "detail": (
            "Notes sheet flags components that are 'not directly comparable' across "
            "years (e.g. notes 30, 54, 55, 57 and related). Treat as vintage-specific; "
            "revisions each MTG edition rewrite prior years (note 1)."
        ),
    },
    {
        "id": "gap-not-fraud",
        "label": "Gap ≠ fraud",
        "detail": (
            "Evasion is only one illustrative behaviour (12% of the gap in 2024–25). "
            "Largest share is failure to take reasonable care (35%). Never label the "
            "whole gap as deliberate evasion."
        ),
    },
)


@dataclass(frozen=True, slots=True)
class ParsedCell:
    """One long-form cell from a wide HMRC table."""

    table: str
    tax_year: str
    value: float | None
    unit: str
    status: str
    notes: str
    raw_display: str


def tax_year_bounds(tax_year: str) -> tuple[str, str]:
    """Map HMRC label ``2024-25`` → UK tax year 6 Apr–5 Apr inclusive."""
    match = re.fullmatch(r"(20\d{2})-(\d{2})", tax_year.strip())
    if not match:
        raise ValueError(f"Unexpected tax-year label: {tax_year!r}")
    start_y = int(match.group(1))
    return f"{start_y}-04-06", f"{start_y + 1}-04-05"


def slugify(text: str) -> str:
    """Simple slug for dimension values (PEP 8: readable helpers)."""
    s = text.strip().lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def parse_numeric(raw: Any) -> tuple[float | None, str, str]:
    """Return (value, unit_hint, raw_display). ``<0.1`` → suppressed None."""
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None, "", ""
    if isinstance(raw, (int, float)):
        return float(raw), "", str(raw)
    text = str(raw).strip().replace("\xa0", " ")
    if text.startswith("<"):
        return None, "suppressed", text
    pct = text.endswith("%")
    cleaned = text.replace("%", "").replace(",", "").strip()
    try:
        val = float(cleaned)
    except ValueError:
        return None, "unparsed", text
    return val, ("percent" if pct else ""), text


def _col_letters_to_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref)
    if not letters:
        raise ValueError(cell_ref)
    n = 0
    for ch in letters.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out: list[str] = []
    for si in root.findall("m:si", NS):
        texts = [
            t.text or ""
            for t in si.iter(f"{{{SSML}}}t")
        ]
        out.append("".join(texts))
    return out


def sheet_path_map(zf: zipfile.ZipFile) -> dict[str, str]:
    rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {
        rel.attrib["Id"]: rel.attrib["Target"] for rel in rel_root
    }
    wb_root = ET.fromstring(zf.read("xl/workbook.xml"))
    out: dict[str, str] = {}
    for sheet in wb_root.findall(f".//{{{SSML}}}sheet"):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{REL}}}id"]
        tgt = rid_to_target[rid]
        if tgt.startswith("/"):
            out[name] = tgt.lstrip("/")
        else:
            out[name] = "xl/" + tgt.lstrip("./")
    return out


def read_sheet_matrix(zf: zipfile.ZipFile, sheet_path: str) -> list[list[Any]]:
    """Sparse sheet → dense row lists (None for empty cells)."""
    ss = load_shared_strings(zf)
    root = ET.fromstring(zf.read(sheet_path))
    rows_out: list[list[Any]] = []
    max_col = 0
    sparse: dict[int, dict[int, Any]] = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        r_idx = int(row.attrib["r"]) - 1
        sparse[r_idx] = {}
        for c in row.findall("m:c", NS):
            ref = c.attrib["r"]
            c_idx = _col_letters_to_index(ref)
            max_col = max(max_col, c_idx)
            t = c.get("t")
            v_el = c.find("m:v", NS)
            if v_el is None or v_el.text is None:
                continue
            if t == "s":
                sparse[r_idx][c_idx] = ss[int(v_el.text)]
            else:
                # Prefer numeric when possible
                try:
                    sparse[r_idx][c_idx] = float(v_el.text)
                except ValueError:
                    sparse[r_idx][c_idx] = v_el.text
    if not sparse:
        return []
    last_row = max(sparse)
    for r in range(last_row + 1):
        row_vals = [None] * (max_col + 1)
        for c, val in sparse.get(r, {}).items():
            row_vals[c] = val
        rows_out.append(row_vals)
    return rows_out


def find_header_row(matrix: list[list[Any]], *must_contain: str) -> int:
    for i, row in enumerate(matrix):
        texts = [str(c).strip() if c is not None else "" for c in row]
        joined = " | ".join(texts)
        if all(m in joined for m in must_contain):
            return i
    raise ValueError(f"Header row not found for {must_contain}")


def year_columns(header: list[Any]) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for i, cell in enumerate(header):
        if cell is None:
            continue
        text = str(cell).strip()
        if re.fullmatch(r"20\d{2}-\d{2}", text):
            out.append((i, text))
    if not out:
        raise ValueError(f"No tax-year columns in header: {header[:10]!r}")
    return out


def observation_status_for_year(tax_year: str) -> str:
    return "provisional" if tax_year in PROJECTION_YEARS else "final"


def parse_table_1_1_1_2(
    matrix: list[list[Any]],
    *,
    table_id: str,
    measure: str,
    unit: str,
) -> list[ParsedCell]:
    header_i = find_header_row(matrix, "Tax", "Type", "Component")
    header = matrix[header_i]
    years = year_columns(header)
    cells: list[ParsedCell] = []
    for row in matrix[header_i + 1 :]:
        if not row or row[0] is None:
            continue
        tax = str(row[0]).strip()
        typ = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        component = str(row[2]).strip() if len(row) > 2 and row[2] is not None else ""
        if not tax:
            continue
        for col_i, tax_year in years:
            raw = row[col_i] if col_i < len(row) else None
            value, hint, display = parse_numeric(raw)
            if hint == "unparsed" or (value is None and hint != "suppressed" and not display):
                continue
            status = (
                "suppressed"
                if hint == "suppressed"
                else observation_status_for_year(tax_year)
            )
            notes = (
                f"table={table_id}; measure={measure}; "
                f"tax={slugify(tax)}; tax_label={tax}; "
                f"type={slugify(typ)}; type_label={typ}; "
                f"component={slugify(component)}; component_label={component}; "
                f"tax_year={tax_year}"
            )
            if display:
                notes += f"; raw={display}"
            cells.append(
                ParsedCell(
                    table=table_id,
                    tax_year=tax_year,
                    value=value,
                    unit=unit,
                    status=status,
                    notes=notes,
                    raw_display=display,
                )
            )
    return cells


def parse_table_1_3(matrix: list[list[Any]]) -> list[ParsedCell]:
    header_i = find_header_row(matrix, "Customer group", "Component")
    header = matrix[header_i]
    years = year_columns(header)
    cells: list[ParsedCell] = []
    for row in matrix[header_i + 1 :]:
        if not row or row[0] is None:
            continue
        group = str(row[0]).strip()
        component = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        if "proportion" in component.lower():
            measure, unit = "share-of-gap-percent", "percent of tax gap"
        elif "£" in component.lower() or "bn" in component.lower():
            measure, unit = "gap-gbp-bn", "£ billion"
        else:
            measure, unit = "other", "as published"
        for col_i, tax_year in years:
            raw = row[col_i] if col_i < len(row) else None
            value, hint, display = parse_numeric(raw)
            if hint == "unparsed" or (value is None and hint != "suppressed" and not display):
                continue
            status = (
                "suppressed"
                if hint == "suppressed"
                else observation_status_for_year(tax_year)
            )
            notes = (
                f"table=1.3; measure={measure}; "
                f"customer_group={slugify(group)}; customer_group_label={group}; "
                f"component_label={component}; tax_year={tax_year}"
            )
            if display:
                notes += f"; raw={display}"
            cells.append(
                ParsedCell(
                    table="1.3",
                    tax_year=tax_year,
                    value=value,
                    unit=unit,
                    status=status,
                    notes=notes,
                    raw_display=display,
                )
            )
    return cells


def parse_table_7_1(matrix: list[list[Any]]) -> list[ParsedCell]:
    header_i = find_header_row(matrix, "Behaviour", "Component")
    header = matrix[header_i]
    years = year_columns(header)
    cells: list[ParsedCell] = []
    for row in matrix[header_i + 1 :]:
        if not row or row[0] is None:
            continue
        behaviour = str(row[0]).strip()
        component = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        if "proportion" in component.lower() or "%" in component:
            measure, unit = "share-of-gap-percent", "percent of tax gap"
        else:
            measure, unit = "gap-gbp-bn", "£ billion"
        for col_i, tax_year in years:
            raw = row[col_i] if col_i < len(row) else None
            value, hint, display = parse_numeric(raw)
            if hint == "unparsed" or (value is None and hint != "suppressed" and not display):
                continue
            status = (
                "suppressed"
                if hint == "suppressed"
                else observation_status_for_year(tax_year)
            )
            notes = (
                f"table=7.1; measure={measure}; "
                f"behaviour={slugify(behaviour)}; behaviour_label={behaviour}; "
                f"component_label={component}; tax_year={tax_year}; "
                f"series_note=illustrative-behaviour-not-incident-count"
            )
            if display:
                notes += f"; raw={display}"
            cells.append(
                ParsedCell(
                    table="7.1",
                    tax_year=tax_year,
                    value=value,
                    unit=unit,
                    status=status,
                    notes=notes,
                    raw_display=display,
                )
            )
    return cells


def parse_notes_sheet(matrix: list[list[Any]]) -> list[dict[str, str]]:
    notes: list[dict[str, str]] = []
    for row in matrix:
        if not row or row[0] is None:
            continue
        num = str(row[0]).strip()
        if not num.startswith("[note"):
            continue
        text = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        notes.append({"note": num, "text": text})
    return notes


def cells_to_observations(cells: Sequence[ParsedCell]) -> list[Observation]:
    obs: list[Observation] = []
    for cell in cells:
        period_start, period_end = tax_year_bounds(cell.tax_year)
        status = cell.status  # type: ignore[assignment]
        obs.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=GEO_CODE,
                geography_label=GEO_LABEL,
                value=cell.value,
                unit=cell.unit,
                observation_status=status,  # type: ignore[arg-type]
                source_version=SOURCE_VERSION,
                notes=cell.notes,
            )
        )
    return obs


def find_obs(
    observations: Sequence[Observation],
    *,
    tax_year: str,
    required_notes: Sequence[str],
) -> Observation | None:
    period_start, _ = tax_year_bounds(tax_year)
    for obs in observations:
        if obs.period_start != period_start:
            continue
        if all(token in obs.notes for token in required_notes):
            return obs
    return None


class HmrcTaxGapConnector(Connector):
    """Pin HMRC Measuring tax gaps tables for The Tax Gap experience."""

    def __init__(self) -> None:
        super().__init__(ECONOMY_DATA / PACKAGE_DIR)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="HMRC Measuring tax gaps (The Tax Gap)",
            sector="economy-public-finance",
            publisher="HMRC",
            source_url=TABLES_LANDING,
            series_id="MTG-online-tables-2026",
            geography=(
                "United Kingdom (K02000001); HMRC-administered taxes/duties only "
                "(excl. Crown dependencies; not local council tax as a separate head "
                "beyond HMRC coverage)"
            ),
            frequency="annual (tax year)",
            unit="£ billion and percent of theoretical tax liabilities (by series)",
            definition=(
                "HMRC estimate of the tax gap: difference between the amount of tax "
                "that should, in theory, be paid to HMRC and what is actually paid. "
                "Pinned from Measuring tax gaps 2026 edition online tables for tax "
                "years 2005–06 to 2024–25 (excise components may start earlier in "
                "source). Includes tax-type (Tables 1.1/1.2), customer group (1.3), "
                "and illustrative behaviour (7.1). Not observed fraud incidents."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.hmrc_tax_gap",
            curated_path="curated/observations.csv",
            update_cadence="annual (next MTG edition expected June 2027)",
            raw_evidence=list(evidence),
            transformations=(
                "Download MTG 2026 online tables xlsx + summary/behaviour/annex/quality "
                "HTML. Parse xlsx via zipfile/XML (broken drawing relationships break "
                "openpyxl normal load). Curate Tables 1.1 (%), 1.2 (£bn), 1.3 "
                "(customer group), 7.1 (illustrative behaviour). Tax-year periods use "
                "6 Apr–5 Apr. Values '<0.1' stored as suppressed/null with raw= in notes. "
                "Dimensions in notes as key=value."
            ),
            revision_notes=(
                f"Pinned vintage {SOURCE_VERSION}, official release {OFFICIAL_RELEASE_DATE}. "
                "Each MTG edition revises prior years — do not mix editions. "
                "2023–24 and 2024–25 are projections. CT series has a 2019–20 "
                "methodological/data step. Behaviour series starts 2019–20."
            ),
            caveats=(
                f"{SAFETY_COPY} Methodology breaks: "
                + "; ".join(b["id"] for b in METHODOLOGY_BREAKS)
                + "."
            ),
            status_note=(
                "Validation-ready (Economy self-QA) — not Registry Ready. No frontend."
            ),
            related_indicator_ids=[
                "tax-receipts",
                "tax-receipts-composition",
                "tax-machine-income-tax-rules",
            ],
            open_questions=[
                "After Validation PASS, cloud-load for EmptyStage replacement?",
                "Optional later pin of detailed VAT/CT chapter tables (2.x / 5.x)?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/41965471768581969367c87a93f92f58"
            ),
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        sources: list[tuple[str, str]] = [
            ("Measuring_tax_gap_online_tables_2026.xlsx", TABLES_XLSX),
            ("tables_landing.html", TABLES_LANDING),
            ("summary.html", SUMMARY_URL),
            ("behaviour.html", BEHAVIOUR_URL),
            ("methodological_annex.html", ANNEX_URL),
            ("quality_report.html", QUALITY_URL),
            ("main_statistics.html", MAIN_STATS_URL),
        ]
        evidence: list[RawEvidence] = []
        for filename, url in sources:
            result = self.fetch_url(
                url,
                f"raw/{stamp}/{filename}",
                official_release_date=OFFICIAL_RELEASE_DATE,
            )
            evidence.append(result.evidence)
        raw_dir = self.data_root / "raw" / stamp
        lines = [
            f"{item.checksum_sha256}  {Path(item.path).name}" for item in evidence
        ]
        (raw_dir / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
        return evidence

    def _xlsx_path(self, evidence: Sequence[RawEvidence]) -> Path:
        for item in evidence:
            if item.path.endswith(".xlsx"):
                return self.data_root / item.path
        raise FileNotFoundError("No xlsx in evidence")

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        xlsx = self._xlsx_path(evidence)
        with zipfile.ZipFile(xlsx) as zf:
            paths = sheet_path_map(zf)
            t11 = parse_table_1_1_1_2(
                read_sheet_matrix(zf, paths["Table 1.1"]),
                table_id="1.1",
                measure="gap-percent",
                unit="percent of theoretical tax liabilities",
            )
            t12 = parse_table_1_1_1_2(
                read_sheet_matrix(zf, paths["Table 1.2"]),
                table_id="1.2",
                measure="gap-gbp-bn",
                unit="£ billion",
            )
            # Theoretical liability / total % also live on Table 1.2 rows —
            # already captured via Tax column labels.
            t13 = parse_table_1_3(read_sheet_matrix(zf, paths["Table 1.3"]))
            t71 = parse_table_7_1(read_sheet_matrix(zf, paths["Table 7.1"]))
            notes = parse_notes_sheet(read_sheet_matrix(zf, paths["Notes"]))

        # Persist companion artefacts beside observations (hand-off helpers).
        curated = self.data_root / "curated"
        curated.mkdir(parents=True, exist_ok=True)
        notes_path = curated / "workbook_notes.csv"
        with notes_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=["note", "text"])
            writer.writeheader()
            writer.writerows(notes)

        breaks_path = curated / "methodology_breaks.json"
        breaks_path.write_text(
            json.dumps(list(METHODOLOGY_BREAKS), indent=2) + "\n",
            encoding="utf-8",
        )

        all_cells = list(t11) + list(t12) + list(t13) + list(t71)
        return cells_to_observations(all_cells)

    def write_source_matrix(self) -> Path:
        path = self.data_root / "source_register.csv"
        rows = [
            {
                "table": "1.1",
                "title": "Percentage tax gap by type of tax",
                "years": "2005-06 to 2024-25",
                "categories": "VAT; Excise; IT/NICs/CGT; Corporation Tax; Other; Total",
                "unit": "percent of theoretical liabilities",
                "uncertainty": "Projections for 2023-24/2024-25; component notes in workbook",
                "licence": "OGL v3.0",
            },
            {
                "table": "1.2",
                "title": "Tax gap (£ billion) by type of tax",
                "years": "2005-06 to 2024-25",
                "categories": "Same tax types + total theoretical liability",
                "unit": "£ billion",
                "uncertainty": "Rounded to £0.1bn; <0.1 suppressed",
                "licence": "OGL v3.0",
            },
            {
                "table": "1.3",
                "title": "Tax gap by customer group",
                "years": "2005-06 to 2024-25",
                "categories": (
                    "Small businesses; Criminals; Mid-sized; Large; Individuals; Wealthy"
                ),
                "unit": "£ billion and % of gap",
                "uncertainty": "Illustrative grouping; rounding",
                "licence": "OGL v3.0",
            },
            {
                "table": "7.1",
                "title": "Illustrative tax gap by behaviour",
                "years": "2019-20 to 2024-25 only",
                "categories": (
                    "Avoidance; Criminal attacks; Error; Evasion; "
                    "Failure to take reasonable care; Hidden economy; "
                    "Legal interpretation; Non-payment"
                ),
                "unit": "£ billion and % of gap",
                "uncertainty": (
                    "Illustrative; MTG 2023 method update; not incident counts; "
                    "gap ≠ fraud"
                ),
                "licence": "OGL v3.0",
            },
        ]
        with path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "table",
                    "title",
                    "years",
                    "categories",
                    "unit",
                    "uncertainty",
                    "licence",
                ],
            )
            writer.writeheader()
            writer.writerows(rows)
        return path

    def self_qa(self, observations: Sequence[Observation], evidence: Sequence[RawEvidence]) -> dict[str, Any]:
        checks: list[dict[str, Any]] = []

        def check(name: str, ok: bool, detail: str) -> None:
            checks.append({"name": name, "pass": ok, "detail": detail})

        xlsx_ev = next(e for e in evidence if e.path.endswith(".xlsx"))
        xlsx_path = self.data_root / xlsx_ev.path
        disk = hashlib.sha256(xlsx_path.read_bytes()).hexdigest()
        check(
            "xlsx_checksum",
            disk == xlsx_ev.checksum_sha256,
            f"disk={disk} manifest={xlsx_ev.checksum_sha256}",
        )

        cases = [
            (
                "total_gap_gbp_bn_2024_25",
                ["table=1.2", "tax=total-tax-gap", "component=total-tax-gap", "measure=gap-gbp-bn"],
                QA_ANCHORS["total_gap_gbp_bn_2024_25"],
            ),
            (
                "total_gap_pct_2024_25",
                ["table=1.1", "tax=total-tax-gap", "component=total-tax-gap", "measure=gap-percent"],
                QA_ANCHORS["total_gap_pct_2024_25"],
            ),
            (
                "theoretical_liability_gbp_bn_2024_25",
                [
                    "table=1.2",
                    "tax=total-theoretical-tax-liability",
                    "measure=gap-gbp-bn",
                ],
                QA_ANCHORS["theoretical_liability_gbp_bn_2024_25"],
            ),
            (
                "vat_gap_gbp_bn_2024_25",
                ["table=1.2", "tax=vat", "component=total-vat", "measure=gap-gbp-bn"],
                QA_ANCHORS["vat_gap_gbp_bn_2024_25"],
            ),
            (
                "vat_gap_pct_2024_25",
                ["table=1.1", "tax=vat", "component=total-vat", "measure=gap-percent"],
                QA_ANCHORS["vat_gap_pct_2024_25"],
            ),
            (
                "ct_gap_pct_2024_25",
                [
                    "table=1.1",
                    "tax=corporation-tax",
                    "component=total-corporation-tax",
                    "measure=gap-percent",
                ],
                QA_ANCHORS["ct_gap_pct_2024_25"],
            ),
            (
                "failure_reasonable_care_share_pct_2024_25",
                [
                    "table=7.1",
                    "behaviour=failure-to-take-reasonable-care",
                    "measure=share-of-gap-percent",
                ],
                QA_ANCHORS["failure_reasonable_care_share_pct_2024_25"],
            ),
            (
                "evasion_share_pct_2024_25",
                ["table=7.1", "behaviour=evasion", "measure=share-of-gap-percent"],
                QA_ANCHORS["evasion_share_pct_2024_25"],
            ),
            (
                "small_business_share_pct_2024_25",
                [
                    "table=1.3",
                    "customer_group=small-businesses",
                    "measure=share-of-gap-percent",
                ],
                QA_ANCHORS["small_business_share_pct_2024_25"],
            ),
        ]
        for name, tokens, expected in cases:
            obs = find_obs(observations, tax_year="2024-25", required_notes=tokens)
            ok = obs is not None and obs.value == expected
            detail = (
                f"expected={expected} got={None if obs is None else obs.value} "
                f"tokens={tokens}"
            )
            check(name, ok, detail)

        # Gap ≠ fraud: evasion share must be strictly less than failure-to-take-care.
        evasion = find_obs(
            observations,
            tax_year="2024-25",
            required_notes=["table=7.1", "behaviour=evasion", "measure=share-of-gap-percent"],
        )
        ftrc = find_obs(
            observations,
            tax_year="2024-25",
            required_notes=[
                "table=7.1",
                "behaviour=failure-to-take-reasonable-care",
                "measure=share-of-gap-percent",
            ],
        )
        check(
            "gap_not_equated_with_evasion",
            (
                evasion is not None
                and ftrc is not None
                and evasion.value is not None
                and ftrc.value is not None
                and evasion.value < ftrc.value
            ),
            f"evasion={None if evasion is None else evasion.value} "
            f"failure_to_take_reasonable_care={None if ftrc is None else ftrc.value}",
        )

        # Behaviour series must not invent pre-2019-20 rows.
        early_behaviour = [
            o
            for o in observations
            if "table=7.1" in o.notes and o.period_start < "2019-04-06"
        ]
        check(
            "behaviour_no_pre_2019_splice",
            len(early_behaviour) == 0,
            f"early_rows={len(early_behaviour)}",
        )

        # Projection years marked provisional.
        prov = [
            o
            for o in observations
            if "tax_year=2024-25" in o.notes and o.observation_status == "provisional"
        ]
        check(
            "projection_years_provisional",
            len(prov) > 0,
            f"provisional_2024_25_rows={len(prov)}",
        )

        summary_html = next(
            (self.data_root / e.path for e in evidence if e.path.endswith("summary.html")),
            None,
        )
        if summary_html and summary_html.exists():
            text = summary_html.read_text(encoding="utf-8", errors="replace")
            check(
                "summary_html_headline",
                "6.4%" in text and "£59.2 billion" in text.replace("&pound;", "£"),
                "summary contains 6.4% and £59.2 billion",
            )

        passed = sum(1 for c in checks if c["pass"])
        failed = sum(1 for c in checks if not c["pass"])
        return {
            "indicator_id": INDICATOR_ID,
            "source_version": SOURCE_VERSION,
            "edition": EDITION_LABEL,
            "retrieved_checks": checks,
            "passed": passed,
            "failed": failed,
            "overall": "pass" if failed == 0 else "fail",
            "observation_count": len(observations),
            "safety": SAFETY_COPY,
        }

    def write_readme(self, qa: dict[str, Any]) -> Path:
        path = self.data_root / "README.md"
        path.write_text(
            f"""# {INDICATOR_ID}

{EDITION_LABEL}

**Status:** Validation-ready (Economy self-QA **{qa['overall']}**) — **not** Registry Ready.  
**No frontend.** Do not equate the tax gap with fraud.

## Question

What does HMRC estimate as the gap between theoretical tax liabilities and tax collected — by tax type and published reason (behaviour) category?

## Headline (tax year 2024–25, provisional / projected)

| Measure | Value |
|---------|-------|
| Tax gap | **£59.2 billion** |
| Tax gap % of theoretical liabilities | **6.4%** |
| Theoretical liabilities | **£924.4 billion** |

## Coverage

- **Tables curated:** 1.1 (% by tax), 1.2 (£bn by tax), 1.3 (customer group), 7.1 (illustrative behaviour)
- **Tax types:** VAT; Excise duty; Income Tax, NICs & CGT; Corporation Tax; Other taxes; Total
- **Behaviours (HMRC labels):** avoidance; criminal attacks; error; evasion; failure to take reasonable care; hidden economy; legal interpretation; non-payment
- **Geography:** United Kingdom
- **Time:** tax years (6 Apr–5 Apr); Table 7.1 from 2019–20 only
- **Licence:** Open Government Licence v3.0

## Reproduce

```bash
uv run python -m economy.connectors.hmrc_tax_gap
```

## Methodology breaks

See `curated/methodology_breaks.json` and workbook `curated/workbook_notes.csv`.
""",
            encoding="utf-8",
        )
        return path

    def write_validation_report(self, qa: dict[str, Any]) -> Path:
        path = self.data_root / "validation_report.md"
        lines = [
            f"# Self-QA — `{INDICATOR_ID}`",
            "",
            f"**Overall:** {qa['overall']} ({qa['passed']} pass / {qa['failed']} fail)",
            f"**Edition:** {qa['edition']}",
            f"**Observations:** {qa['observation_count']}",
            "",
            "## Safety",
            "",
            qa["safety"],
            "",
            "## Checks",
            "",
        ]
        for c in qa["retrieved_checks"]:
            mark = "PASS" if c["pass"] else "FAIL"
            lines.append(f"- **{mark}** `{c['name']}` — {c['detail']}")
        lines.extend(
            [
                "",
                "## Validation ask",
                "",
                "Independent Validation: **`EC-VAL-06F`** — match curated headline "
                "(£59.2bn / 6.4%) and ≥2 breakdown cells to the published HMRC table "
                "for the pinned MTG 2026 vintage. File under `data/qa/`.",
                "",
            ]
        )
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def run(self) -> dict[str, Any]:
        evidence = self.fetch()
        observations = self.transform(evidence)
        self.write_hand_off(evidence, observations)
        self.write_source_matrix()
        qa = self.self_qa(observations, evidence)
        curated = self.data_root / "curated"
        (curated / "self_qa.json").write_text(
            json.dumps(qa, indent=2) + "\n", encoding="utf-8"
        )
        headline = {
            "tax_year": "2024-25",
            "gap_gbp_bn": QA_ANCHORS["total_gap_gbp_bn_2024_25"],
            "gap_percent": QA_ANCHORS["total_gap_pct_2024_25"],
            "theoretical_liability_gbp_bn": QA_ANCHORS[
                "theoretical_liability_gbp_bn_2024_25"
            ],
            "source_version": SOURCE_VERSION,
            "observation_status": "provisional",
            "note": "Projected year in MTG 2026 edition; gap ≠ fraud.",
        }
        (curated / "headline_2024_25.json").write_text(
            json.dumps(headline, indent=2) + "\n", encoding="utf-8"
        )
        self.write_readme(qa)
        self.write_validation_report(qa)
        if qa["failed"]:
            raise RuntimeError(f"Self-QA failed: {qa['failed']} checks")
        return qa


def main() -> None:
    connector = HmrcTaxGapConnector()
    qa = connector.run()
    print(
        f"{INDICATOR_ID}: self-QA {qa['overall']} "
        f"({qa['passed']}/{qa['passed'] + qa['failed']}) "
        f"obs={qa['observation_count']}"
    )


if __name__ == "__main__":
    main()

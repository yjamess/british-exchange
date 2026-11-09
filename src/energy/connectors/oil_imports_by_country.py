"""DESNZ DUKES 3.7 — UK crude & petroleum product imports by partner country.

Approach (plain language):
1. Download (or reuse pinned) DUKES_3.7.xlsx under data/energy/.../raw/.
2. Parse each year sheet (2012–latest): Country × Total oil (thousand tonnes).
3. One Observation per calendar year × partner country; dimensions in notes.
4. Write curated CSV + manifest via Connector.write_hand_off.

Why this series (Gate 3 Lifelines):
- Official OGL partner-country oil import geography for the Lifelines Map.
- Complements (does not fork) energy-import-dependency and energy-imports-and-exports.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
"""

from __future__ import annotations

import re
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

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

INDICATOR_ID = "oil-imports-by-country"
HEADER_ROW = 4
COUNTRY_COL = 1
EXPECTED_COUNTRY_HEADER = "Country"
EXPECTED_TOTAL_OIL_HEADER = "Total oil"

SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes"
)
ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a69f0a74dda8076771a433f/DUKES_3.7.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DUKES_3.7_JUL_26"

YEAR_SHEET_RE = re.compile(r"^(\d{4})$")
NOTE_MARKER_RE = re.compile(r"\s*\[note[^\]]*\]", re.IGNORECASE)
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "-"}

# Publisher aggregate rows — keep with kind=aggregate so charts do not double-count.
AGGREGATE_PARTNERS = frozenset({"total imports", "not elsewhere specified"})


def _clean_header(raw: object) -> str:
    text = str(raw or "").strip().replace("\n", " ")
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _clean_partner(raw: object) -> str:
    text = str(raw or "").strip()
    text = NOTE_MARKER_RE.sub("", text)
    return " ".join(text.split())


def _parse_numeric_cell(
    raw: object,
) -> tuple[float | None, ObservationStatus | None]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), None
    text = str(raw).strip()
    if not text or text.lower() in MISSING_MARKERS:
        return None, "missing"
    try:
        return float(text.replace(",", "")), None
    except ValueError:
        return None, "missing"


def _year_sheets(workbook: openpyxl.Workbook) -> list[tuple[int, str]]:
    years: list[tuple[int, str]] = []
    for name in workbook.sheetnames:
        match = YEAR_SHEET_RE.match(str(name).strip())
        if match:
            years.append((int(match.group(1)), name))
    if not years:
        raise ValueError(
            f"No year sheets (YYYY) found; got {workbook.sheetnames!r}"
        )
    return sorted(years)


def _find_total_oil_col(ws: Worksheet, sheet_name: str) -> int:
    """Locate the Total oil column by header text (column index varies by max_col)."""
    country_h = _clean_header(ws.cell(HEADER_ROW, COUNTRY_COL).value)
    if country_h.casefold() != EXPECTED_COUNTRY_HEADER.casefold():
        raise ValueError(
            f"Sheet {sheet_name!r}: unexpected Country header {country_h!r}"
        )
    for col in range(2, (ws.max_column or 2) + 1):
        header = _clean_header(ws.cell(HEADER_ROW, col).value)
        if header.casefold() == EXPECTED_TOTAL_OIL_HEADER.casefold():
            return col
    raise ValueError(
        f"Sheet {sheet_name!r}: Total oil column not found in header row {HEADER_ROW}"
    )


def parse_dukes_37_total_oil(workbook_path: Path) -> list[Observation]:
    """Parse DUKES 3.7 Total oil imports by partner country (thousand tonnes)."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=False)
    try:
        observations: list[Observation] = []
        for year, sheet_name in _year_sheets(wb):
            ws = wb[sheet_name]
            total_oil_col = _find_total_oil_col(ws, sheet_name)
            period_start = f"{year:04d}-01-01"
            period_end = f"{year:04d}-12-31"

            for row_idx in range(HEADER_ROW + 1, (ws.max_row or HEADER_ROW) + 1):
                partner = _clean_partner(ws.cell(row_idx, COUNTRY_COL).value)
                if not partner:
                    continue
                value, missing_status = _parse_numeric_cell(
                    ws.cell(row_idx, total_oil_col).value
                )
                status: ObservationStatus = missing_status or "final"
                # Drop structural zeros for ordinary partners (map noise); keep
                # aggregates and any non-zero / missing rows.
                partner_key = partner.casefold()
                is_aggregate = any(
                    partner_key.startswith(agg) for agg in AGGREGATE_PARTNERS
                )
                if value == 0.0 and not is_aggregate:
                    continue
                if value is None and not is_aggregate:
                    continue

                kind = "aggregate" if is_aggregate else "partner"
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit="thousand tonnes",
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"partner={partner}; product=Total oil; "
                            f"kind={kind}; fuel=Oil"
                        ),
                    )
                )
        if not observations:
            raise ValueError(f"No oil-import rows from {workbook_path}")
        return observations
    finally:
        wb.close()


class OilImportsByCountryConnector(Connector):
    """DESNZ DUKES 3.7 UK oil imports by partner country (thousand tonnes)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Oil imports by country",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 3.7 (Imports of crude oil and petroleum products by country of origin — Total oil)",
            geography=(
                "United Kingdom (K02000001) as importing territory; "
                "partner countries are origin labels in notes (not UK admin geography)"
            ),
            frequency="annual",
            unit="thousand tonnes",
            definition=(
                "UK annual imports of crude oil and petroleum products by country "
                "of origin, Total oil column (thousand tonnes), from DUKES table 3.7. "
                "One observation per calendar year × partner country. notes use "
                "partner=<Country>; product=Total oil; kind=partner|aggregate; "
                "fuel=Oil. Zero Total-oil partner rows omitted; Total imports and "
                "Not elsewhere specified kept as kind=aggregate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.oil_imports_by_country",
            curated_path="curated/observations.csv",
            update_cadence="Annual with DUKES petroleum chapter 3 (typically late July)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse each YYYY year sheet header row 4. Long-format: one CSV row "
                "per year × partner for column Total oil only. Strip [note N] from "
                "partner labels. Omit ordinary partners with Total oil = 0. Do not "
                "invent pipeline landfalls or coordinates."
            ),
            caveats=(
                "Geography is UK Official Statistics import totals by declared "
                "country of origin — not a pipeline entry-point atlas. Product-level "
                "columns (Crude oil, DERV, …) are out of scope for this indicator "
                "(open question). Country list widened from 2018 (Note 2). Total "
                "imports by product may differ from other DUKES tables (Note 3). "
                "Distinct from energy-imports-and-exports (ET 1.3 all-fuels ktoe) "
                "and energy-import-dependency. OGL v3.0."
            ),
            revision_notes=(
                "DUKES_3.7.xlsx published 30 July 2026; annual sheets 2012–2025."
            ),
            related_indicator_ids=[
                "energy-import-dependency",
                "energy-imports-and-exports",
                "lng-imports-by-terminal",
                "gas-trade-by-partner",
                "electricity-interconnector-flows",
            ],
            open_questions=[
                "Optional product breakdown (Crude oil / Total petroleum products) "
                "as additional product= rows without forking the connector.",
                "ISO country codes alongside publisher labels for map joins.",
            ],
        )

    def fetch_latest(self, *, retrieved_date: str | None = None) -> RawEvidence:
        day = retrieved_date or datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/DUKES_3.7.xlsx"
        result = self.fetch_url(
            ASSET_URL,
            relative,
            official_release_date=OFFICIAL_RELEASE_DATE,
        )
        return result.evidence

    def evidence_from_pinned_raw(self, relative: str) -> RawEvidence:
        path = self.data_root / relative
        if not path.is_file():
            raise FileNotFoundError(
                f"Pinned raw workbook missing: {path}. Re-run fetch or restore pin."
            )
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=None,
            source_url=ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_dukes_37_total_oil(workbook)


def main() -> None:
    connector = OilImportsByCountryConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    partners = sorted(
        {
            part.removeprefix("partner=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("partner=")
        }
    )
    years = sorted({obs.period_start[:4] for obs in observations})
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"years: {years[0]}–{years[-1]} ({len(years)} years)")
    print(f"partners (distinct): {len(partners)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

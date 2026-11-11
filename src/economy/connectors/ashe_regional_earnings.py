"""ONS ASHE Table 7 — workplace earnings by geography (Geography of Pay).

Approach (plain language):
1. Pin official ASHE Table 7 zips (2026 provisional + 2025 revised).
2. Read Weekly pay — Gross (7.1a) for All and Full-Time.
3. Keep every row with a published median and a GSS geography code.
4. ``period_start`` (April of the reference year) distinguishes editions.

Honesty: this is **workplace** (Table 7), not residence (Table 8).
Economy Domain 02 owns the Wages explorer; do not put curated files under
``data/regions/``.
"""

from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ashe_common import (
    AsheEdition,
    as_float,
    clean_code,
    find_header_row,
    member_name,
)

PIN_DATE = "2026-11-11"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/datasets/placeofworkbylocalauthorityashetable7"
)
TABLE_FRAGMENT = "Table 7.1a"
SHEETS = ("All", "Full-Time")

EDITIONS: tuple[AsheEdition, ...] = (
    AsheEdition(
        year=2026,
        kind="provisional",
        zip_name="ashetable72026provisional.zip",
        release_date="2026-10-22",
    ),
    AsheEdition(
        year=2025,
        kind="revised",
        zip_name="ashetable72025revised.zip",
        release_date="2026-10-22",
    ),
)

NATION_CODES = {
    "K02000001",
    "K03000001",
    "K04000001",
    "E92000001",
    "W92000004",
    "S92000003",
    "N92000002",
}
ENGLISH_REGION_PREFIX = "E12"


def _classification(code: str) -> str:
    if code in NATION_CODES:
        return "nation"
    if code.startswith(ENGLISH_REGION_PREFIX):
        return "region"
    if code.startswith("E11"):
        return "met_county"
    if code.startswith("E10"):
        return "county"
    if code.startswith(("E06", "E07", "E08", "E09", "S12", "W06", "N09")):
        return "local_authority"
    return "other"


def _parse_sheet(ws: Worksheet) -> list[tuple[str, str, float, float | None, float | None]]:
    """Return (label, code, median, mean, jobs_thousands) rows with a median."""
    header_row = find_header_row(ws)
    out: list[tuple[str, str, float, float | None, float | None]] = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        label = str(row[0] or "").strip()
        if not label or label.lower().startswith(("a  ", "b  ", "key", "the quality", "source:")):
            continue
        if label.lower().startswith("not classified"):
            continue
        code = clean_code(row[1])
        if not code:
            continue
        median = as_float(row[3])
        if median is None:
            continue
        out.append(
            (
                re.sub(r"\s+", " ", label).strip(),
                code,
                median,
                as_float(row[5]),
                as_float(row[2]),
            )
        )
    return out


class AsheRegionalEarningsConnector(Connector):
    """Workplace ASHE Table 7 weekly gross medians by geography."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / "ashe-regional-earnings")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "ashe-regional-earnings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        edition_list = ", ".join(f"{e.year} {e.kind}" for e in EDITIONS)
        return Manifest(
            indicator_id=self.indicator_id,
            title="ASHE regional earnings (workplace weekly gross)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ASHE Table 7 · place of work · weekly pay gross · median",
            geography="United Kingdom — nations, English regions, local authorities (workplace)",
            frequency="annual",
            unit="£ per week gross (median)",
            definition=(
                "Annual Survey of Hours and Earnings (ASHE) Table 7 — weekly pay "
                "gross (£) median for employee jobs by **place of work**. "
                f"Sheets: All and Full-Time. Editions: {edition_list}. "
                "Not residence-based (Table 8). Not Average Weekly Earnings."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.ashe_regional_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (ASHE Table 7 edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/4156547176858138a3bad9dba5156403"
            ),
            related_indicator_ids=[
                "ashe-national-earnings",
                "ashe-region-industry-earnings",
                "nominal-earnings",
                "real-earnings",
                "ashe-manufacturing-earnings",
            ],
            transformations=(
                "Pin ASHE Table 7 zips (2026 provisional + 2025 revised). "
                "Extract 7.1a Weekly pay — Gross. Parse All and Full-Time. "
                "Keep rows with GSS codes and published medians. "
                "period_start = 1 April of the reference year; basis=workplace. "
                "CV rule: omit x / : / .. cells; no invented zeros."
            ),
            revision_notes=(
                f"Pins under raw/{PIN_DATE}/. 2026 provisional → observation_status=provisional; "
                "2025 revised → final. Re-pin on the next ASHE autumn release."
            ),
            caveats=(
                "Workplace basis (where people work), not where they live. "
                "UK employee jobs — cash £, not real terms. Full-Time ≠ All. "
                "Met counties / counties sit between regions and districts. "
                "Job counts are indicative. Colour CV bands are not ingested."
            ),
            open_questions=[
                "Optional later: Table 8 residence basis; AreaMap for LAs.",
            ],
        )

    def evidence_for_edition(self, edition: AsheEdition) -> RawEvidence:
        rel = f"raw/{PIN_DATE}/{edition.zip_name}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned ASHE Table 7 zip missing: {path}")
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/zip",
            official_release_date=edition.release_date,
            http_status=200,
            source_url=SOURCE_LANDING_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires pinned ASHE Table 7 zip evidence")
        by_name = {Path(ev.path).name: ev for ev in evidence}
        observations: list[Observation] = []
        unit = "£ per week gross (median)"

        for edition in EDITIONS:
            ev = by_name.get(edition.zip_name)
            if ev is None:
                raise ValueError(f"Missing evidence for {edition.zip_name}")
            zip_path = self.data_root / ev.path
            with zipfile.ZipFile(zip_path) as zf:
                member = member_name(zf, TABLE_FRAGMENT)
                payload = zf.read(member)
                wb = openpyxl.load_workbook(io.BytesIO(payload), data_only=True, read_only=True)
                try:
                    for sheet_name in SHEETS:
                        if sheet_name not in wb.sheetnames:
                            raise ValueError(f"Missing sheet {sheet_name} in {member}")
                        rows = _parse_sheet(wb[sheet_name])
                        if not rows:
                            raise ValueError(f"No geography rows in {member} / {sheet_name}")
                        for label, code, median, mean, jobs in rows:
                            jobs_note = f"{jobs}" if jobs is not None else ""
                            mean_note = f"{mean}" if mean is not None else ""
                            observations.append(
                                Observation(
                                    indicator_id=self.indicator_id,
                                    period_start=edition.period_start,
                                    period_end=edition.period_end,
                                    geography_code=code,
                                    geography_label=label,
                                    value=median,
                                    unit=unit,
                                    observation_status=edition.observation_status,
                                    source_version=edition.source_version("Table7"),
                                    notes=(
                                        f"series=ASHE-T7; measure=weekly_gross; "
                                        f"sheet={sheet_name}; statistic=median; "
                                        f"basis=workplace; "
                                        f"classification={_classification(code)}; "
                                        f"mean={mean_note}; "
                                        f"jobs_thousands_indicative={jobs_note}; "
                                        f"table={TABLE_FRAGMENT}; "
                                        f"edition={edition.edition_tag}"
                                    ),
                                )
                            )
                finally:
                    wb.close()

        observations.sort(
            key=lambda obs: (
                str(obs.period_start),
                obs.geography_code,
                obs.notes or "",
            )
        )
        return observations


def main() -> None:
    """Build curated observations from pinned Table 7 zips."""
    connector = AsheRegionalEarningsConnector()
    evidence = [connector.evidence_for_edition(e) for e in EDITIONS]
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    print(f"indicator_id: {connector.indicator_id}")
    for ev in evidence:
        print(f"raw: {ev.path} sha256={ev.checksum_sha256}")
    print(f"observations: {len(observations)}")
    for obs in observations:
        notes = obs.notes or ""
        if (
            "sheet=Full-Time;" in notes
            and obs.geography_code == "E12000007"
            and "statistic=median;" in notes
        ):
            print(f"spot Full-Time London {obs.period_start}: {obs.value} ({obs.observation_status})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

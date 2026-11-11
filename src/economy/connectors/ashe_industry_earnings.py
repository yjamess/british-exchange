"""ONS ASHE Table 4 — industry earnings by SIC 2007 **section** (all industries).

Approach (plain language):
1. Pin official ASHE Table 4 zips (2026 provisional + 2025 revised).
2. Read Weekly pay — Gross (4.1a) for All and Full-Time.
3. Keep SIC **section** letter rows (A–U) with published medians / percentiles.
4. Do **not** replace Energy ``ashe-manufacturing-earnings`` (manufacturing divisions).

Boundary: Energy owns the manufacturing cut (section C + divisions 10–33) under
``ashe-manufacturing-earnings``. This pack loads **all** sections for Economy
Wages; Energy's pin stays authoritative for manufacturing Jobs Pay.
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
    is_sic_section,
    member_name,
    percentile_stats_from_row,
)

PIN_DATE = "2026-11-11"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/datasets/industry2digitsicashetable4"
)
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"
TABLE_FRAGMENT = "Table 4.1a"
SHEETS = ("All", "Full-Time")

EDITIONS: tuple[AsheEdition, ...] = (
    AsheEdition(
        year=2026,
        kind="provisional",
        zip_name="ashetable42026provisional.zip",
        release_date="2026-10-22",
    ),
    AsheEdition(
        year=2025,
        kind="revised",
        zip_name="ashetable42025revised.zip",
        release_date="2026-10-22",
    ),
)


def _parse_section_rows(
    ws: Worksheet,
) -> list[tuple[str, str, dict[str, float], float | None]]:
    """Return (label, sic_section, stats, jobs) for SIC section letter rows."""
    header_row = find_header_row(ws)
    header = list(next(ws.iter_rows(min_row=header_row, max_row=header_row, values_only=True)))
    out: list[tuple[str, str, dict[str, float], float | None]] = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        label = str(row[0] or "").strip()
        if not label or label.lower().startswith(("a  ", "b  ", "key", "the quality", "source:")):
            continue
        code = clean_code(row[1])
        if not code or not is_sic_section(code):
            continue
        sic = code.upper()
        stats = percentile_stats_from_row(header, row)
        if "median" not in stats:
            continue
        out.append(
            (
                re.sub(r"\s+", " ", label).strip(),
                sic,
                stats,
                as_float(row[2]),
            )
        )
    return out


class AsheIndustryEarningsConnector(Connector):
    """ASHE Table 4 weekly gross by SIC 2007 section (UK)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / "ashe-industry-earnings")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "ashe-industry-earnings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        edition_list = ", ".join(f"{e.year} {e.kind}" for e in EDITIONS)
        return Manifest(
            indicator_id=self.indicator_id,
            title="ASHE industry earnings (SIC 2007 sections, weekly gross)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ASHE Table 4 · SIC 2007 section · weekly pay gross",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="£ per week gross (median / mean / percentiles)",
            definition=(
                "Annual Survey of Hours and Earnings (ASHE) Table 4 — weekly pay "
                "gross (£) for UK employee jobs by SIC 2007 **section** (A–U). "
                f"Sheets: All and Full-Time. Editions: {edition_list}. "
                "Median is ONS's preferred average. "
                "Manufacturing boundary: Energy ``ashe-manufacturing-earnings`` remains "
                "authoritative for manufacturing section C + divisions 10–33 (Jobs Pay). "
                "This pack includes section C among all sections for Economy Wages; "
                "do not fork or replace the Energy manufacturing pin."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.ashe_industry_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (ASHE Table 4 edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41565471768581c49e15f6540946e109"
            ),
            related_indicator_ids=[
                "ashe-national-earnings",
                "ashe-region-industry-earnings",
                "ashe-manufacturing-earnings",
                "nominal-earnings",
                "real-earnings",
            ],
            transformations=(
                "Pin ASHE Table 4 zips (2026 provisional + 2025 revised). "
                "Extract 4.1a Weekly pay — Gross. Parse All / Full-Time. "
                "Keep SIC section letter rows (A–U) only — skip 2-digit divisions "
                "and uncoded aggregates. Emit median/mean/percentiles. "
                "CV rule: omit x / : / .. cells."
            ),
            revision_notes=(
                f"Pins under raw/{PIN_DATE}/. 2026 provisional → provisional; "
                "2025 revised → final. Energy may still pin a separate Table 4 "
                "manufacturing-only cut under data/energy/."
            ),
            caveats=(
                "UK employee jobs — cash £. Section C here is whole-economy manufacturing "
                "section medians, not Energy's division-level manufacturing Jobs series. "
                "Full-Time ≠ All. Colour CV bands are not ingested."
            ),
            open_questions=[
                "Optional later: Part-Time sheets; 2-digit divisions for non-manufacturing.",
            ],
        )

    def evidence_for_edition(self, edition: AsheEdition) -> RawEvidence:
        rel = f"raw/{PIN_DATE}/{edition.zip_name}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned ASHE Table 4 zip missing: {path}")
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
            raise ValueError("transform() requires pinned ASHE Table 4 zip evidence")
        by_name = {Path(ev.path).name: ev for ev in evidence}
        observations: list[Observation] = []
        unit = "£ per week gross"

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
                        rows = _parse_section_rows(wb[sheet_name])
                        if not rows:
                            raise ValueError(f"No SIC section rows in {member} / {sheet_name}")
                        for label, sic, stats, jobs in rows:
                            jobs_note = f"{jobs}" if jobs is not None else ""
                            median = stats["median"]
                            mean = stats.get("mean")
                            for statistic, value in sorted(stats.items(), key=lambda kv: kv[0]):
                                observations.append(
                                    Observation(
                                        indicator_id=self.indicator_id,
                                        period_start=edition.period_start,
                                        period_end=edition.period_end,
                                        geography_code=UK_GEOGRAPHY_CODE,
                                        geography_label=UK_GEOGRAPHY_LABEL,
                                        value=value,
                                        unit=unit,
                                        observation_status=edition.observation_status,
                                        source_version=edition.source_version("Table4"),
                                        notes=(
                                            f"series=ASHE-T4; measure=weekly_gross; "
                                            f"sheet={sheet_name}; statistic={statistic}; "
                                            f"sic={sic}; category={sic}; "
                                            f"classification=section; "
                                            f"industry={label}; "
                                            f"median={median}; "
                                            f"mean={mean if mean is not None else ''}; "
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
                obs.notes or "",
            )
        )
        return observations


def main() -> None:
    """Build curated observations from pinned Table 4 zips."""
    connector = AsheIndustryEarningsConnector()
    evidence = [connector.evidence_for_edition(e) for e in EDITIONS]
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    print(f"indicator_id: {connector.indicator_id}")
    for ev in evidence:
        print(f"raw: {ev.path} sha256={ev.checksum_sha256}")
    print(f"observations: {len(observations)}")
    for obs in observations:
        notes = obs.notes or ""
        if "sic=C;" in notes and "sheet=Full-Time;" in notes and "statistic=median;" in notes:
            print(f"spot FT Manufacturing (C) {obs.period_start}: {obs.value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

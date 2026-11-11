"""ONS ASHE Table 5 — workplace region × SIC 2007 section medians.

Approach (plain language):
1. Pin the official ASHE Table 5 zip (2026 provisional).
2. Read Weekly pay — Gross (5.1a) for All and Full-Time.
3. Keep ``REGION, INDUSTRY`` rows whose SIC code is a section letter (A–U).
4. Map region name prefixes to GSS codes (English regions + Wales + Scotland).

Honesty: workplace basis (Table 5 work region). England / Northern Ireland do
not publish section cross-tabs in 5.1a (only all-industry region totals) —
documented in the manifest. Suppressions (``x``) are omitted.
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
    match_region_prefix,
    member_name,
)

PIN_DATE = "2026-11-11"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/datasets/regionbyindustry2digitsicashetable5"
)
TABLE_FRAGMENT = "Table 5.1a"
SHEETS = ("All", "Full-Time")

EDITIONS: tuple[AsheEdition, ...] = (
    AsheEdition(
        year=2026,
        kind="provisional",
        zip_name="ashetable52026provisional.zip",
        release_date="2026-10-22",
    ),
)


def _parse_sheet(ws: Worksheet) -> list[tuple[str, str, str, str, float]]:
    """Return (geo_code, geo_label, sic, industry_label, median)."""
    header_row = find_header_row(ws)
    out: list[tuple[str, str, str, str, float]] = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        description = str(row[0] or "").strip()
        if not description or description.lower().startswith(
            ("a  ", "b  ", "key", "the quality", "source:")
        ):
            continue
        matched = match_region_prefix(description)
        if matched is None:
            continue
        geo_code, geo_label, industry_raw = matched
        code = clean_code(row[1])
        if not code or not is_sic_section(code):
            continue
        median = as_float(row[3])
        if median is None:
            continue
        industry = re.sub(r"\s+", " ", industry_raw).strip() or description
        out.append((geo_code, geo_label, code.upper(), industry, median))
    return out


class AsheRegionIndustryEarningsConnector(Connector):
    """ASHE Table 5 workplace region × SIC section weekly gross medians."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / "ashe-region-industry-earnings")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "ashe-region-industry-earnings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="ASHE region × industry earnings (workplace, SIC sections)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ASHE Table 5 · work region × SIC 2007 section · weekly pay gross · median",
            geography="English regions + Wales + Scotland (workplace); UK industry via Table 4",
            frequency="annual",
            unit="£ per week gross (median)",
            definition=(
                "Annual Survey of Hours and Earnings (ASHE) Table 5 — weekly pay "
                "gross (£) median for employee jobs by **place of work** region crossed "
                "with SIC 2007 **section** (A–U). Sheets: All and Full-Time. "
                "2026 provisional edition. "
                "England and Northern Ireland do not publish section cross-tabs in Table 5.1a "
                "(region all-industry totals only). "
                "UK × industry sections live on ``ashe-industry-earnings`` (Table 4)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.ashe_region_industry_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (ASHE Table 5 edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41565471768581e485b1c3248b4184e4"
            ),
            related_indicator_ids=[
                "ashe-regional-earnings",
                "ashe-industry-earnings",
                "ashe-national-earnings",
                "ashe-manufacturing-earnings",
            ],
            transformations=(
                "Pin ASHE Table 5 zip (2026 provisional). Extract 5.1a Weekly pay — Gross. "
                "Parse All / Full-Time. Keep REGION, INDUSTRY rows with SIC section letters. "
                "Map region name prefixes to GSS codes. Median only. "
                "CV rule: omit x / : / .. cells."
            ),
            revision_notes=(
                f"Pin under raw/{PIN_DATE}/. Provisional edition — re-pin when revised. "
                "Optional later: 2025 revised for year-on-year geography×industry change."
            ),
            caveats=(
                "Workplace ≠ residence. Full-Time ≠ All. "
                "2-digit industry divisions are not loaded (sections only). "
                "Manufacturing section C here is regional whole-economy manufacturing — "
                "Energy ``ashe-manufacturing-earnings`` stays authoritative for UK manufacturing divisions."
            ),
            open_questions=[
                "Add 2025 revised for change-over-year; optional Table 8 residence.",
            ],
        )

    def evidence_for_edition(self, edition: AsheEdition) -> RawEvidence:
        rel = f"raw/{PIN_DATE}/{edition.zip_name}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned ASHE Table 5 zip missing: {path}")
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
            raise ValueError("transform() requires pinned ASHE Table 5 zip evidence")
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
                            raise ValueError(f"No region×section rows in {member} / {sheet_name}")
                        for geo_code, geo_label, sic, industry, median in rows:
                            observations.append(
                                Observation(
                                    indicator_id=self.indicator_id,
                                    period_start=edition.period_start,
                                    period_end=edition.period_end,
                                    geography_code=geo_code,
                                    geography_label=geo_label,
                                    value=median,
                                    unit=unit,
                                    observation_status=edition.observation_status,
                                    source_version=edition.source_version("Table5"),
                                    notes=(
                                        f"series=ASHE-T5; measure=weekly_gross; "
                                        f"sheet={sheet_name}; statistic=median; "
                                        f"basis=workplace; "
                                        f"sic={sic}; category={sic}; "
                                        f"classification=section; "
                                        f"industry={industry}; "
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
    """Build curated observations from the pinned Table 5 zip."""
    connector = AsheRegionIndustryEarningsConnector()
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
            obs.geography_code == "E12000007"
            and "sic=C;" in notes
            and "sheet=Full-Time;" in notes
        ):
            print(f"spot London FT Manufacturing (C): {obs.value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

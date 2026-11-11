"""ONS ASHE Table 1 — national earnings distribution (wage ladder).

Approach (plain language):
1. Pin official ASHE Table 1 zips (2026 provisional + 2025 revised).
2. Read Weekly pay — Gross (1.1a) for All, Full-Time, and Part-Time.
3. Emit median, mean, and percentiles per sheet × edition.
4. ``period_start`` (April of the reference year) distinguishes editions.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).

Do **not** fork Energy ``ashe-manufacturing-earnings`` — that is Table 4 SIC manufacturing.
"""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ashe_common import (
    AsheEdition,
    as_float,
    find_header_row,
    member_name,
    percentile_stats_from_row,
)

PIN_DATE = "2026-11-11"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/datasets/allemployeesashetable1"
)
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"
WEEKLY_GROSS_FRAGMENT = "Table 1.1a"
SHEETS = ("All", "Full-Time", "Part-Time")

EDITIONS: tuple[AsheEdition, ...] = (
    AsheEdition(
        year=2026,
        kind="provisional",
        zip_name="ashetable12026provisional.zip",
        release_date="2026-10-22",
    ),
    AsheEdition(
        year=2025,
        kind="revised",
        zip_name="ashetable12025revised.zip",
        release_date="2026-10-22",
    ),
)


def _parse_all_employees_row(ws) -> tuple[dict[str, float], float | None]:
    """Return stats map and jobs thousands from the All Employees row."""
    header_row = find_header_row(ws)
    header = list(next(ws.iter_rows(min_row=header_row, max_row=header_row, values_only=True)))
    data = list(next(ws.iter_rows(min_row=header_row + 1, max_row=header_row + 1, values_only=True)))
    if str(data[0] or "").strip().lower() not in {"all employees", "all"}:
        raise ValueError(f"Expected All Employees row, got {data[0]!r} on {ws.title}")
    stats = percentile_stats_from_row(header, data)
    if "median" not in stats:
        raise ValueError(f"Missing median on {ws.title}")
    return stats, as_float(data[2])


class AsheNationalEarningsConnector(Connector):
    """National ASHE Table 1 weekly gross distribution for the Wage ladder."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / "ashe-national-earnings")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "ashe-national-earnings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        edition_list = ", ".join(f"{e.year} {e.kind}" for e in EDITIONS)
        return Manifest(
            indicator_id=self.indicator_id,
            title="ASHE national earnings (weekly gross distribution)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ASHE Table 1 · weekly pay gross · percentiles",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit="£ per week gross (median / mean / percentiles)",
            definition=(
                "Annual Survey of Hours and Earnings (ASHE) Table 1 — weekly pay "
                "gross (£) for UK employee jobs. Stores the published median, mean, "
                "and percentiles (10–90) for All, Full-Time, and Part-Time sheets. "
                f"Editions: {edition_list}. Median is ONS's preferred average. "
                "Employee jobs only — not self-employed. Not Average Weekly Earnings."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.ashe_national_earnings",
            curated_path="curated/observations.csv",
            update_cadence="annual (ASHE Table 1 edition)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/41565471768581c29ffbc38f976c177b"
            ),
            related_indicator_ids=[
                "nominal-earnings",
                "real-earnings",
                "ashe-regional-earnings",
                "ashe-industry-earnings",
                "ashe-manufacturing-earnings",
            ],
            transformations=(
                "Pin ASHE Table 1 zips (2026 provisional + 2025 revised). "
                "Extract 1.1a Weekly pay — Gross. Parse All / Full-Time / Part-Time. "
                "Emit median, mean, and published percentiles (statistic= in notes). "
                "period_start = 1 April of the reference year. "
                "CV rule: omit x / : / .. cells; no invented zeros."
            ),
            revision_notes=(
                f"Pins under raw/{PIN_DATE}/. 2026 provisional rows are observation_status=provisional; "
                "2025 revised rows are final. Re-pin when ONS publishes the next revised edition."
            ),
            caveats=(
                "UK employee jobs — not Great Britain AWE. Full-Time ≠ All ≠ Part-Time. "
                "Gross weekly pay; mean ≠ median. Job-count column is indicative. "
                "Manufacturing ASHE (Table 4) stays on Energy — link only. "
                "Colour CV bands in the workbook are not ingested; only published suppressions are dropped."
            ),
            open_questions=[
                "Optional later: Male/Female sheets; hourly Table 1.5a/1.6a.",
            ],
        )

    def evidence_for_edition(self, edition: AsheEdition) -> RawEvidence:
        rel = f"raw/{PIN_DATE}/{edition.zip_name}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned ASHE Table 1 zip missing: {path}")
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
            raise ValueError("transform() requires pinned ASHE Table 1 zip evidence")
        by_name = {Path(ev.path).name: ev for ev in evidence}
        observations: list[Observation] = []
        unit = "£ per week gross"

        for edition in EDITIONS:
            ev = by_name.get(edition.zip_name)
            if ev is None:
                raise ValueError(f"Missing evidence for {edition.zip_name}")
            zip_path = self.data_root / ev.path
            with zipfile.ZipFile(zip_path) as zf:
                member = member_name(zf, WEEKLY_GROSS_FRAGMENT)
                payload = zf.read(member)
                wb = openpyxl.load_workbook(io.BytesIO(payload), data_only=True, read_only=True)
                try:
                    for sheet_name in SHEETS:
                        if sheet_name not in wb.sheetnames:
                            raise ValueError(f"Missing sheet {sheet_name} in {member}")
                        stats, jobs = _parse_all_employees_row(wb[sheet_name])
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
                                    source_version=edition.source_version("Table1"),
                                    notes=(
                                        f"series=ASHE-T1; measure=weekly_gross; "
                                        f"sheet={sheet_name}; statistic={statistic}; "
                                        f"median={median}; "
                                        f"mean={mean if mean is not None else ''}; "
                                        f"jobs_thousands_indicative={jobs_note}; "
                                        f"table={WEEKLY_GROSS_FRAGMENT}; "
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
    """Build curated observations from pinned Table 1 zips."""
    connector = AsheNationalEarningsConnector()
    evidence = [connector.evidence_for_edition(e) for e in EDITIONS]
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    print(f"indicator_id: {connector.indicator_id}")
    for ev in evidence:
        print(f"raw: {ev.path} sha256={ev.checksum_sha256}")
    print(f"observations: {len(observations)}")
    for obs in observations:
        notes = obs.notes or ""
        if "sheet=All;" in notes and "statistic=median;" in notes:
            print(f"spot All median {obs.period_start}: {obs.value} ({obs.observation_status})")
        if "sheet=Part-Time;" in notes and "statistic=median;" in notes:
            print(f"spot Part-Time median {obs.period_start}: {obs.value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

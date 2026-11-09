"""Long-run permanent dwellings completed, by tenure (calendar years).

Two official MHCLG live tables, kept as separate geographies (never merged):

* Live Table 244 — England, calendar years 1946 onward (live, quarterly refresh).
* Live Table 241 — United Kingdom, calendar years 1949–2018 (discontinued
  July 2019; frozen file still hosted on GOV.UK). 1946–1948 are ".." (not
  available) in the source and are not emitted.

Approach:
1. Pin both files under raw/<date>/ with SHA-256 checksums.
2. Parse completion columns per tenure (private enterprise, housing
   associations, local authorities, all dwellings).
3. Emit one annual Observation per year × geography × tenure, with
   ``series=<tenure slug>`` matching housing-completions slugs.

Refs:
- https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

INDICATOR_ID = "housebuilding-completions-long-run"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building"
)
RAW_DIR = "raw/2026-11-05"

LT244_RAW = f"{RAW_DIR}/LiveTable244.ods"
LT244_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab3e27a997a4b2950ccedf8/LiveTable244.ods"
)
LT244_RELEASE = "2026-09-24"
LT244_VERSION = "LiveTable244 2026-09-24"

LT241_RAW = f"{RAW_DIR}/Discontinued-LiveTable241.xlsx"
LT241_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "5d94affaed915d55461b180a/Discontinued-LiveTable241.xlsx"
)
LT241_RELEASE = "2019-07-04"
LT241_VERSION = "LiveTable241 2019-07-04 (discontinued)"

ENGLAND = ("E92000001", "England")
UK = ("K02000001", "United Kingdom")
UNIT = "dwellings (completions)"
MISSING = {"[x]", "[z]", "..", "…", "", "-"}

LT244_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Private Enterprise Completions", "private-enterprise"),
    ("Housing Association Completions", "housing-association"),
    ("Local Authority Completions", "local-authority"),
    ("All Completions", "all-completions"),
)

# Live Table 241 columns D..G (0-based 3..6); column C carries R/P flags.
LT241_COLUMNS: tuple[tuple[int, str, str], ...] = (
    (3, "Private Enterprise", "private-enterprise"),
    (4, "Housing Associations", "housing-association"),
    (5, "Local Authorities", "local-authority"),
    (6, "All Dwellings", "all-completions"),
)

TENURE_SLUGS: tuple[str, ...] = (
    "private-enterprise",
    "housing-association",
    "local-authority",
)


def _number(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if text in MISSING:
        return None
    return float(text)


def _obs(
    year: int,
    geo: tuple[str, str],
    value: float,
    status: ObservationStatus,
    version: str,
    series: str,
    column: str,
    table: str,
) -> Observation:
    return Observation(
        indicator_id=INDICATOR_ID,
        period_start=f"{year:04d}-01-01",
        period_end=f"{year:04d}-12-31",
        geography_code=geo[0],
        geography_label=geo[1],
        value=value,
        unit=UNIT,
        observation_status=status,
        source_version=version,
        notes=(
            f"series={series}; column={column}; source=MHCLG {table}; "
            f"geography={geo[1]} only; calendar year; rounded to nearest 10"
        ),
    )


def parse_live_table_244(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_244")
    header_idx = next(
        (i for i, row in enumerate(rows) if row and row[0].strip() == "Calendar year"),
        None,
    )
    if header_idx is None:
        raise ValueError("LT_244 header row not found")
    header = rows[header_idx]
    col = {name: header.index(name) for name, _ in LT244_COLUMNS}
    notes_idx = header.index("Notes") if "Notes" in header else None

    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip().isdigit():
            continue
        year = int(row[0].strip())
        flag = row[notes_idx].lower() if notes_idx is not None and notes_idx < len(row) else ""
        status: ObservationStatus = "provisional" if "[p]" in flag else "final"
        for name, slug in LT244_COLUMNS:
            idx = col[name]
            value = _number(row[idx] if idx < len(row) else "")
            if value is None:
                continue
            out.append(_obs(year, ENGLAND, value, status, LT244_VERSION, slug, name, "Live Table 244"))
    if not out:
        raise ValueError("No LT_244 completions parsed")
    return out


def parse_live_table_241(path: Path) -> list[Observation]:
    workbook = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheet = workbook.worksheets[0]
    out: list[Observation] = []
    for row in sheet.iter_rows(values_only=True):
        if not row or not isinstance(row[0], int) or not 1900 < row[0] < 2100:
            continue
        year = row[0]
        flag = str(row[2] or "").strip().upper()
        status: ObservationStatus = "provisional" if flag == "P" else "final"
        for idx, name, slug in LT241_COLUMNS:
            value = _number(row[idx])
            if value is None:
                continue
            out.append(_obs(year, UK, value, status, LT241_VERSION, slug, name, "Live Table 241"))
    workbook.close()
    if not out:
        raise ValueError("No LT241 completions parsed")
    return out


def tenure_sum_gaps(observations: Sequence[Observation]) -> list[tuple[str, str, float, float]]:
    """Return (geo, year, all, sum-of-tenures) where they differ by more than rounding (±20)."""
    grouped: dict[tuple[str, str], dict[str, float]] = {}
    for obs in observations:
        series = obs.notes.split(";")[0].removeprefix("series=")
        grouped.setdefault((obs.geography_code, obs.period_start[:4]), {})[series] = obs.value or 0.0
    gaps = []
    for (geo, year), parts in sorted(grouped.items()):
        if "all-completions" not in parts:
            continue
        total = sum(parts.get(slug, 0.0) for slug in TENURE_SLUGS)
        if abs(total - parts["all-completions"]) > 20:
            gaps.append((geo, year, parts["all-completions"], total))
    return gaps


class HousebuildingCompletionsLongRunConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Housebuilding completions, long run",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id=(
                "Live Table 244 (England, 1946–) and Live Table 241 "
                "(United Kingdom, 1949–2018, discontinued) — permanent dwellings completed by tenure"
            ),
            geography=(
                "England (E92000001) from Live Table 244; United Kingdom (K02000001) "
                "from Live Table 241. Two separate geographies — filter geography_code."
            ),
            frequency="annual (calendar year)",
            unit=UNIT,
            definition=(
                "Permanent new-build dwellings completed in the calendar year, by tenure "
                "of the developer/owner: private enterprise, housing associations, local "
                "authorities, and all dwellings. Building-control-based house building "
                "statistics, rounded to the nearest 10."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.housebuilding_completions_long_run",
            curated_path="curated/observations.csv",
            update_cadence=(
                "England: re-pin Live Table 244 each quarterly 'indicators of new supply' "
                "release; UK: frozen (Live Table 241 discontinued July 2019)."
            ),
            raw_evidence=list(evidence),
            transformations=(
                "LT_244: completion columns only (starts not emitted; starts are blank before "
                "the 1960s in the source). LT241: columns D–G; '..' (1946–1948) not emitted. "
                "series=private-enterprise|housing-association|local-authority|all-completions. "
                "Status: '[p]' / 'P' → provisional, else final ('[r]'/'R' revised but final)."
            ),
            caveats=(
                "New-build completions only — not net additional dwellings (no conversions, "
                "change of use or demolitions). Source notes say earlier years are less "
                "reliable and definitions may not be consistent across the series. "
                "England Oct 2005–Mar 2007 omits a small number of approved-inspector "
                "completions. UK series is GB building-control data plus Northern Ireland "
                "data that used different definitions before 2005, and stops at 2018. "
                "Tenures may not sum to the total because of rounding to the nearest 10. "
                "Do not splice England and UK; they are different geographies. "
                "Live Table 244 annual totals equal the sum of Live Table 213 quarters "
                "from 1978 (see data/qa)."
            ),
            revision_notes=(
                "Pinned 2026-11-05: LiveTable244.ods published 24 September 2026 "
                "(2026 Q2 release; 2023–2025 revised, 2025 provisional); "
                "Discontinued-LiveTable241.xlsx last updated 4 July 2019 (2018 provisional, "
                "never finalised in this table)."
            ),
            related_indicator_ids=[
                "housing-completions",
                "housing-starts",
                "net-additional-dwellings",
                "dwelling-stock-by-tenure",
            ],
            open_questions=[
                "UK figures after 2018 are published by ONS / devolved administrations, "
                "not in a single MHCLG UK table; no UK extension is spliced here.",
            ],
        )

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        pins = (
            (LT244_RAW, LT244_URL, LT244_RELEASE, "application/vnd.oasis.opendocument.spreadsheet"),
            (
                LT241_RAW,
                LT241_URL,
                LT241_RELEASE,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
        )
        evidence = []
        for rel, url, release, content_type in pins:
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(path)
            evidence.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                    # file mtime = download time of the pinned snapshot
                    checksum_sha256=sha256_file(path),
                    content_type=content_type,
                    official_release_date=release,
                    http_status=200,
                    source_url=url,
                )
            )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        by_name = {Path(item.path).name: item for item in evidence}
        observations = parse_live_table_244(self.data_root / by_name["LiveTable244.ods"].path)
        observations += parse_live_table_241(
            self.data_root / by_name["Discontinued-LiveTable241.xlsx"].path
        )
        observations.sort(key=lambda o: (o.geography_code != "E92000001", o.period_start, o.notes))
        return observations


def main() -> None:
    connector = HousebuildingCompletionsLongRunConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    connector.write_hand_off(evidence, observations)
    gaps = tenure_sum_gaps(observations)
    print(f"observations: {len(observations)}; tenure-sum gaps beyond rounding: {len(gaps)}")
    for gap in gaps:
        print("  gap", gap)


if __name__ == "__main__":
    main()

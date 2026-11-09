"""MHCLG Live Table 122 — net additional dwellings by local authority.

Approach:
1. Pin Live_Table_122.ods.
2. Emit annual financial-year observations for England + every LA with a
   Current ONS code (skip group header rows).
3. One series (net-additions) — Geography view ranks latest year.

Caveat: England LAs only; latest year often provisional in the national release.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

PINNED_RAW = "raw/2026-11-04/Live_Table_122.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/live-tables-on-net-supply-of-housing"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "691f395e9c8e8f345bf985d3/Live_Table_122.ods"
)
OFFICIAL_RELEASE_DATE = "2025-11-20"
SOURCE_VERSION = "Live Table 122 (net additions by LA, 2024-25 release)"
UNIT = "dwellings (net additions)"
MISSING = {"[x]", "[z]", "..", "…", "", "NA", "na"}


def _fy_bounds(label: str) -> tuple[str, str] | None:
    text = label.strip().split("[")[0].strip()
    if len(text) < 7 or text[4] != "-":
        return None
    start_yy, end_yy = text[:4], text[5:7]
    if not (start_yy.isdigit() and end_yy.isdigit()):
        return None
    start_year = int(start_yy)
    # A financial year runs April to March, so it always ends the calendar year after it starts
    # ("1991-92" → 1992, "1999-00" → 2000). A label whose second part disagrees is not parsed.
    end_year = start_year + 1
    if int(end_yy) != end_year % 100:
        return None
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def _parse_number(raw: str) -> float | None:
    text = raw.strip().replace(",", "")
    if not text or text in MISSING:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_live_table_122(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_122")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "DCLG code":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("LT_122 header not found")

    header = rows[header_idx]
    year_cols: list[tuple[int, str, str]] = []
    for idx, cell in enumerate(header[4:], start=4):
        bounds = _fy_bounds(cell)
        if bounds:
            year_cols.append((idx, bounds[0], bounds[1]))
    if not year_cols:
        raise ValueError("No financial-year columns in LT_122")

    # Latest year provisional in the national bulletin (2024-25).
    latest_start = year_cols[-1][1]

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 5:
            continue
        code = row[2].strip() if len(row) > 2 else ""
        label = row[3].strip() if len(row) > 3 else ""
        if not code.startswith("E") or not label:
            continue
        for idx, start, end in year_cols:
            raw = row[idx] if idx < len(row) else ""
            value = _parse_number(raw)
            if value is None:
                continue
            status: ObservationStatus = (
                "provisional" if start == latest_start else "final"
            )
            observations.append(
                Observation(
                    indicator_id="net-additions-by-authority",
                    period_start=start,
                    period_end=end,
                    geography_code=code,
                    geography_label=label,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        "series=net-additions; "
                        "source=MHCLG Live Table 122; "
                        "financial-year"
                    ),
                )
            )

    if not observations:
        raise ValueError("No LA net-additions observations parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.geography_code))
    return observations


class NetAdditionsByAuthorityConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "net-additions-by-authority"))

    @property
    def indicator_id(self) -> str:
        return "net-additions-by-authority"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Net additions by local authority",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 122 net additional dwellings by LA",
            geography="England local authority districts (+ England total)",
            frequency="annual (financial year)",
            unit=UNIT,
            definition=(
                "Net additional dwellings by English local authority district "
                "and England total, financial years, from MHCLG Live Table 122."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.net_additions_by_authority",
            curated_path="curated/observations.csv",
            update_cadence="annual (November net additions release)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/p/40e65471768581028ba3f2a10201887b",
            transformations=(
                "Parse LT_122; keep rows with Current ONS code; skip authority group headers."
            ),
            caveats=(
                "England only. Latest financial year treated as provisional to match "
                "the national bulletin. Not completions; not a UK total."
            ),
            revision_notes="Pinned Live_Table_122.ods from 20 November 2025 release (retrieved 2026-11-04).",
            related_indicator_ids=["net-additional-dwellings"],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_live_table_122(self.data_root / evidence[0].path)


def main() -> None:
    connector = NetAdditionsByAuthorityConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    eng = [
        o
        for o in observations
        if o.geography_code == "E92000001" and o.period_start.startswith("2024-")
    ]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    if eng:
        print(f"England 2024-25: {eng[0].value:,.0f}")


if __name__ == "__main__":
    main()

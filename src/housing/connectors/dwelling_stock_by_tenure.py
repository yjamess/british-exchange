"""MHCLG Live Table 104 — England dwelling stock by tenure (annual).

Approach:
1. Pin LiveTable104.ods.
2. Long-format: one Observation per tenure × year (plus All dwellings).
3. Geography fixed to England.
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

PINNED_RAW = "raw/2026-11-03/LiveTable104.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-dwelling-stock-including-vacants"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a0dcbcc40a9c699fd826eec/LiveTable104.ods"
)
OFFICIAL_RELEASE_DATE = "2026-05-21"
SOURCE_VERSION = "LiveTable104 2026-05-21"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "dwellings"
MISSING = {"[x]", "[z]", "..", "…", ""}

TENURE_COLUMNS = {
    "Owner occupied": "owner-occupied",
    "Rented privately or with a job or business": "private-rented",
    "Rented from private registered providers": "private-registered-provider",
    "Rented from local authorities": "local-authority",
    "Other public sector dwellings": "other-public-sector",
    "All dwellings": "all-dwellings",
}


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip()
    if not text or text in MISSING:
        return None, "missing"
    cleaned = text.replace(",", "").replace("P", "").replace("R", "").strip()
    if cleaned in MISSING or not cleaned:
        return None, "missing"
    return float(cleaned), "final"


def parse_live_table_104(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_104")
    header_idx = None
    col_map: dict[int, str] = {}
    year_col = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Date":
            header_idx = i
            for idx, name in enumerate(row):
                key = name.strip()
                if key == "Year":
                    year_col = idx
                elif key in TENURE_COLUMNS:
                    col_map[idx] = TENURE_COLUMNS[key]
            break
    if header_idx is None or year_col is None or not col_map:
        raise ValueError("Could not parse LT_104 header")

    # Some historical years appear twice (1 April and 31 December). Prefer
    # 1 April / keep a single row per calendar year to avoid duplicate keys.
    chosen: dict[int, list[str]] = {}
    for row in rows[header_idx + 1 :]:
        if not row or year_col >= len(row):
            continue
        year_text = row[year_col].strip()
        if not year_text.isdigit():
            continue
        year = int(year_text)
        date_label = row[0].strip().lower() if row else ""
        existing = chosen.get(year)
        if existing is None:
            chosen[year] = row
            continue
        # Prefer April snapshot over December when both exist.
        if "april" in date_label:
            chosen[year] = row

    observations: list[Observation] = []
    for year, row in sorted(chosen.items()):
        date_label = row[0].strip()
        for col_idx, tenure_key in col_map.items():
            cell = row[col_idx] if col_idx < len(row) else ""
            value, status = _parse_number(cell)
            observations.append(
                Observation(
                    indicator_id="dwelling-stock-by-tenure",
                    period_start=f"{year:04d}-01-01",
                    period_end=f"{year:04d}-12-31",
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"tenure={tenure_key}; series=LiveTable104; "
                        f"snapshot={date_label}; England only"
                    ),
                )
            )
    if not observations:
        raise ValueError("No dwelling stock rows parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    return observations


class DwellingStockByTenureConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "dwelling-stock-by-tenure"))

    @property
    def indicator_id(self) -> str:
        return "dwelling-stock-by-tenure"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Dwelling stock by tenure",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 104 (England historical tenure stock)",
            geography="England (E92000001) — not UK",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Estimated dwelling stock in England by tenure from MHCLG Live "
                "Table 104. Long format with tenure=<slug> in notes, including "
                "all-dwellings aggregate."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.dwelling_stock_by_tenure",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858145a3b1f6d396262ffa",
            transformations=(
                "Parse ODS LT_104; long-format tenure columns × year. "
                "[x]/[z] → missing."
            ),
            caveats=(
                "England-only. Early years often missing for tenure splits; "
                "all-dwellings has longer history. Tenure definitions change over "
                "time (PRP vs housing association labelling). Where Live Table 104 "
                "lists both 1 April and 31 December for the same year (1971, 1981), "
                "the connector keeps the 1 April snapshot only."
            ),
            revision_notes="Pinned LiveTable104 updated 21 May 2026.",
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
        return parse_live_table_104(self.data_root / evidence[0].path)


def main() -> None:
    connector = DwellingStockByTenureConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)}")


if __name__ == "__main__":
    main()

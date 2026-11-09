"""MHCLG Live Table 100 — dwelling stock by tenure and local authority.

Approach:
1. Pin LiveTable100.ods (year sheets 2011–2025 with modern ONS codes).
2. Emit one Observation per district × tenure slug × year.
3. Tenure columns are as published: local-authority, private-registered-provider,
   other-public-sector, private-sector, all-dwellings. Private sector is not
   split into owner-occupied vs private rented at district level.
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

PINNED_RAW = "raw/2026-11-04/LiveTable100.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-dwelling-stock-including-vacants"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ac3c6f08fa8f5657c61a8ad/LiveTable100.ods"
)
OFFICIAL_RELEASE_DATE = "2026-05-21"
SOURCE_VERSION = "Live Table 100 2026-05-21"
UNIT = "dwellings"
MISSING = {"[x]", "[z]", "..", "…", "", "[p]", "[r]", "-"}

# Years with CurrentONS / New ONS codes (skip 2009–2010 legacy LA codes).
YEAR_SHEETS = tuple(str(y) for y in range(2011, 2026))

TENURE_ALIASES: dict[str, str] = {
    "local authority": "local-authority",
    "housing association": "private-registered-provider",
    "private registered provider": "private-registered-provider",
    "other public sector": "other-public-sector",
    "other public sector [note 5]": "other-public-sector",
    "private sector": "private-sector",
    "total": "all-dwellings",
}


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "").replace("[p]", "").replace("[r]", "").strip()
    if not text or text in MISSING:
        return None, "missing"
    return float(text), "final"


def _norm_header(cell: str) -> str:
    return cell.strip().lower().replace("  ", " ")


def _find_header(rows: list[list[str]]) -> tuple[int, int, int, dict[int, str]]:
    """Return header_idx, code_col, area_col, tenure col map."""
    for i, row in enumerate(rows):
        norms = [_norm_header(c) for c in row]
        # Detect a tenure header row.
        if "local authority" not in norms and "private sector" not in norms:
            continue
        code_col = None
        area_col = None
        for idx, name in enumerate(norms):
            if name in {"currentons code", "new ons code", "ons code"}:
                code_col = idx
            elif name in {"area", "local authority name"}:
                area_col = idx
        if code_col is None or area_col is None:
            continue
        tenure_cols: dict[int, str] = {}
        for idx, name in enumerate(norms):
            # Strip trailing note markers for alias lookup.
            base = name.split("[")[0].strip()
            slug = TENURE_ALIASES.get(base) or TENURE_ALIASES.get(name)
            if slug:
                tenure_cols[idx] = slug
        if tenure_cols:
            return i, code_col, area_col, tenure_cols
    raise ValueError("Could not find Table 100 header")


def parse_table_100(path: Path) -> list[Observation]:
    observations: list[Observation] = []
    for year_text in YEAR_SHEETS:
        rows = read_ods_sheet(path, year_text)
        header_idx, code_col, area_col, tenure_cols = _find_header(rows)
        year = int(year_text)
        for row in rows[header_idx + 1 :]:
            if not row or code_col >= len(row):
                continue
            code = row[code_col].strip()
            if not code.startswith("E"):
                continue
            label = row[area_col].strip() if area_col < len(row) else code
            if not label:
                continue
            for col_idx, tenure in tenure_cols.items():
                raw = row[col_idx] if col_idx < len(row) else ""
                value, status = _parse_number(raw)
                observations.append(
                    Observation(
                        indicator_id="dwelling-stock-by-district",
                        period_start=f"{year:04d}-03-31",
                        period_end=f"{year:04d}-03-31",
                        geography_code=code,
                        geography_label=label,
                        value=value,
                        unit=UNIT,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"tenure={tenure}; series=LiveTable100; "
                            "snapshot=31 March; district stock"
                        ),
                    )
                )
    if not observations:
        raise ValueError("No dwelling-stock-by-district observations")
    observations.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
    return observations


class DwellingStockByDistrictConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "dwelling-stock-by-district"))

    @property
    def indicator_id(self) -> str:
        return "dwelling-stock-by-district"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Dwelling stock by tenure and local authority",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 100",
            geography="England, regions and local authority districts",
            frequency="annual (31 March)",
            unit=UNIT,
            definition=(
                "Estimated dwelling stock by local authority and tenure group "
                "(LA, PRP, other public, private sector, total), 31 March."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.dwelling_stock_by_district",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Parse year sheets 2011–2025; tenure=* notes. Skip 2009–2010 "
                "(legacy LA codes without modern ONS geography)."
            ),
            caveats=(
                "Private sector combines owner-occupied and private rented — "
                "not split at district level. Totals are estimates, not exact "
                "counts to the last dwelling. Distinct from household tenure (Census)."
            ),
            revision_notes="Pinned LiveTable100.ods 2026-11-04 (to 31 March 2025).",
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
        return parse_table_100(self.data_root / evidence[0].path)


def main() -> None:
    connector = DwellingStockByDistrictConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

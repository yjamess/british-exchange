"""MHCLG Live Table 1000 — additional affordable homes by tenure, England.

Approach:
1. Pin Live_Table_1000.ods.
2. Parse completions sheet (Live_Table_1000) and starts sheet
   (Live_Table_1000_Starts): tenure rows × financial-year columns.
3. Emit England annual observations with series=<tenure-slug> and
   category=completions|starts.

Caveat: England affordable supply only — not all new supply and not UK.
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

PINNED_RAW = "raw/2026-11-04/Live_Table_1000.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-affordable-housing-supply"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a3927d8c6e94f095f3efbce/Live_Table_1000.ods"
)
OFFICIAL_RELEASE_DATE = "2025-11-20"
SOURCE_VERSION = "Live Table 1000 (affordable housing supply 2024-25)"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "dwellings (affordable homes)"
MISSING = {"[x]", "[z]", "..", "…", "", "NA", "na"}

TENURE_SERIES: dict[str, str] = {
    "Social Rent": "social-rent",
    "London Affordable Rent": "london-affordable-rent",
    "Affordable Rent": "affordable-rent",
    "Intermediate Rent": "intermediate-rent",
    "Shared Ownership": "shared-ownership",
    "Affordable Home Ownership": "affordable-home-ownership",
    "First Homes": "first-homes",
    "Unknown Tenure": "unknown-tenure",
    "All affordable": "all-affordable",
}

SHEETS: tuple[tuple[str, str], ...] = (
    ("Live_Table_1000", "completions"),
    ("Live_Table_1000_Starts", "starts"),
)


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


def parse_live_table_1000(path: Path) -> list[Observation]:
    observations: list[Observation] = []
    for sheet, stage in SHEETS:
        rows = read_ods_sheet(path, sheet)
        header_idx = None
        for i, row in enumerate(rows):
            if row and row[0].strip() == "Tenure":
                header_idx = i
                break
        if header_idx is None:
            raise ValueError(f"Tenure header missing on {sheet}")
        header = rows[header_idx]
        year_cols: list[tuple[int, str, str]] = []
        for idx, cell in enumerate(header[2:], start=2):
            bounds = _fy_bounds(cell)
            if bounds:
                year_cols.append((idx, bounds[0], bounds[1]))
        if not year_cols:
            raise ValueError(f"No financial years on {sheet}")

        for row in rows[header_idx + 1 :]:
            if not row or not row[0].strip():
                continue
            tenure_raw = row[0].strip()
            series = TENURE_SERIES.get(tenure_raw)
            if not series:
                continue
            for idx, start, end in year_cols:
                raw = row[idx] if idx < len(row) else ""
                value = _parse_number(raw)
                if value is None:
                    continue
                observations.append(
                    Observation(
                        indicator_id="affordable-housing-supply",
                        period_start=start,
                        period_end=end,
                        geography_code=ENGLAND_CODE,
                        geography_label=ENGLAND_LABEL,
                        value=value,
                        unit=UNIT,
                        observation_status="final",
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"series={series}; "
                            f"category={stage}; "
                            f"tenure={tenure_raw}; "
                            "source=MHCLG Live Table 1000; "
                            "financial-year; "
                            "geography=England only"
                        ),
                    )
                )

    if not observations:
        raise ValueError("No affordable-housing-supply observations parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    return observations


class AffordableHousingSupplyConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "affordable-housing-supply"))

    @property
    def indicator_id(self) -> str:
        return "affordable-housing-supply"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Affordable housing supply",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 1000 additional affordable homes by tenure (England)",
            geography="England (E92000001) — not UK",
            frequency="annual (financial year)",
            unit=UNIT,
            definition=(
                "Additional affordable homes provided in England by tenure "
                "(social rent, affordable rent, shared ownership, First Homes, etc.) "
                "and stage (completions and starts), from MHCLG Live Table 1000."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.affordable_housing_supply",
            curated_path="curated/observations.csv",
            update_cadence="annual (November affordable housing supply release)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/p/40e65471768581dcaf35e17fc0800ce5",
            transformations=(
                "Parse Live_Table_1000 (completions) and Live_Table_1000_Starts; "
                "series=<tenure>; category=completions|starts."
            ),
            caveats=(
                "England only — not UK. Affordable supply is a subset of housing "
                "supply and is not the same as net additional dwellings or Table 213 "
                "new-build completions. Tenure definitions change over time "
                "(e.g. shared ownership separately identified from 2014–15)."
            ),
            revision_notes="Pinned Live_Table_1000.ods from affordable housing live tables (retrieved 2026-11-04).",
            related_indicator_ids=["housing-completions", "housing-starts", "net-additional-dwellings"],
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
        return parse_live_table_1000(self.data_root / evidence[0].path)


def main() -> None:
    connector = AffordableHousingSupplyConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    latest = [
        o
        for o in observations
        if o.period_start.startswith("2024-") and "category=completions" in o.notes
    ]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    for o in sorted(latest, key=lambda x: x.notes):
        series = next((p.split("=", 1)[1] for p in o.notes.split("; ") if p.startswith("series=")), "?")
        print(f"  2024-25 completions {series}: {o.value:,.0f}")


if __name__ == "__main__":
    main()

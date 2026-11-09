"""MHCLG Live Table 118 — net additional dwellings and components.

Approach:
1. Pin Live_Table_118.ods (unrounded sheet).
2. Emit annual financial-year observations for England + English regions.
3. Tag series= for Supply Machine components (net, new-build, conversions,
   change-of-use, other-gains, demolitions). Skip PDR sub-rows and census
   adjustments in v1 — they remain in the raw pin for later.

Caveat: England-only primary measure; latest year often provisional ([p]).
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

PINNED_RAW = "raw/2026-11-04/Live_Table_118.ods"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/live-tables-on-net-supply-of-housing"
)
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "691de48bd140bbbaa59a2a77/Live_Table_118.ods"
)
OFFICIAL_RELEASE_DATE = "2025-11-20"
SOURCE_VERSION = "Live Table 118 unrounded (net supply 2024-25 release)"
UNIT = "dwellings (net additions / components)"
MISSING = {"[x]", "[z]", "..", "…", "", "NA", "na"}

# Publisher label → series slug for Supply Machine.
# LT118 note 1: New build + Net conversions + Net change of use + Net other gains
#   − Demolitions + Adjustment to Census = Net additional dwellings.
# Note 6: a small Residual remains in earlier years. Both are emitted so the
# published identity reproduces exactly; the two Census rows share one slug
# (they never overlap in time) and keep their label in component=.
COMPONENT_SERIES: dict[str, str] = {
    "Net additions": "net-additions",
    "New build": "new-build",
    "Net conversions": "net-conversions",
    "Net change of use": "net-change-of-use",
    "Net other gains and losses": "net-other-gains",
    "Demolitions": "demolitions",
    "Adjustment to Census 2011": "census-adjustment",
    "Adjustment to Census 2021": "census-adjustment",
    "Residual": "residual",
}

REGION_CODES = {
    "England": "E92000001",
    "North East": "E12000001",
    "North West": "E12000002",
    "Yorkshire and The Humber": "E12000003",
    "Yorkshire and the Humber": "E12000003",
    "East Midlands": "E12000004",
    "West Midlands": "E12000005",
    "East of England": "E12000006",
    "London": "E12000007",
    "South East": "E12000008",
    "South West": "E12000009",
}


def _fy_bounds(label: str) -> tuple[str, str] | None:
    """Parse '2024-25' → (2024-04-01, 2025-03-31)."""
    text = label.strip()
    if len(text) != 7 or text[4] != "-":
        return None
    start_yy, end_yy = text[:4], text[5:]
    if not (start_yy.isdigit() and end_yy.isdigit() and len(end_yy) == 2):
        return None
    start_year = int(start_yy)
    # A financial year runs April to March, so it always ends the calendar year after it starts
    # ("1991-92" → 1992, "1999-00" → 2000). A label whose second part disagrees is not parsed.
    end_year = start_year + 1
    if int(end_yy) != end_year % 100:
        return None
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def _parse_number(raw: str) -> float | None:
    """Parse an LT118 cell. Negatives are published in brackets: '(5)' → -5."""
    text = raw.strip().replace(",", "")
    if not text or text in MISSING:
        return None
    negative = text.startswith("(") and text.endswith(")")
    if negative:
        text = text[1:-1].strip()
    # Strip trailing note markers that sometimes leak into value cells
    for marker in ("[p]", "[r]", "[note"):
        if marker in text.lower():
            return None
    try:
        value = float(text)
    except ValueError:
        return None
    return -value if negative else value


def parse_live_table_118(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT118_unrounded")
    header_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == "Components of net housing supply":
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("LT118_unrounded header not found")

    header = rows[header_idx]
    region_cols: list[tuple[int, str, str]] = []
    notes_col: int | None = None
    for idx, name in enumerate(header):
        label = name.strip()
        if label == "Notes":
            notes_col = idx
            continue
        code = REGION_CODES.get(label)
        if code:
            region_cols.append((idx, code, label if label != "England" else "England"))

    if not region_cols:
        raise ValueError("No region columns found in Live Table 118")

    observations: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or len(row) < 3:
            continue
        component = row[0].strip()
        series = COMPONENT_SERIES.get(component)
        if not series:
            continue
        bounds = _fy_bounds(row[1].strip() if len(row) > 1 else "")
        if not bounds:
            continue
        start, end = bounds
        notes_raw = row[notes_col].strip() if notes_col is not None and notes_col < len(row) else ""
        provisional = "[p]" in notes_raw.lower() or "provisional" in notes_raw.lower()
        status: ObservationStatus = "provisional" if provisional else "final"

        for idx, code, label in region_cols:
            raw = row[idx] if idx < len(row) else ""
            value = _parse_number(raw)
            if value is None:
                continue
            observations.append(
                Observation(
                    indicator_id="net-additional-dwellings",
                    period_start=start,
                    period_end=end,
                    geography_code=code,
                    geography_label=label,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={series}; "
                        f"component={component}; "
                        "source=MHCLG Live Table 118 unrounded; "
                        "financial-year; "
                        f"table_notes={notes_raw or 'none'}"
                    ),
                )
            )

    if not observations:
        raise ValueError("No net-additional-dwellings observations parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.geography_code, obs.notes))
    return observations


class NetAdditionalDwellingsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "net-additional-dwellings"))

    @property
    def indicator_id(self) -> str:
        return "net-additional-dwellings"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Net additional dwellings",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="Live Table 118 annual net additional dwellings and components",
            geography="England (E92000001) + English regions — not UK",
            frequency="annual (financial year)",
            unit=UNIT,
            definition=(
                "Net change in dwelling stock between 1 April and 31 March, "
                "with component series for new build, conversions, change of use, "
                "other gains/losses, demolitions (subtracted), the adjustment to "
                "Census 2011/2021 and the residual (MHCLG Live Table 118, note 1)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.net_additional_dwellings",
            curated_path="curated/observations.csv",
            update_cadence="annual (November net additions release)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse LT118_unrounded; bracketed cells are negatives. Emit "
                "series= for net additions, the five physical components, the "
                "Census 2011/2021 adjustment (one slug, label kept in component=) "
                "and the residual, so note 1's identity reproduces; England + "
                "nine regions; skip PDR sub-rows."
            ),
            caveats=(
                "England primary measure — not UK. Completions (Table 213) are "
                "not the same as net additions. Latest year often provisional. "
                "Rounded bulletin figures (e.g. 190,600) may differ slightly from "
                "unrounded table cells (e.g. 190,602)."
            ),
            revision_notes="Pinned Live_Table_118.ods from 20 November 2025 release page (retrieved 2026-11-04).",
            notion_registry_url="https://app.notion.com/p/40e65471768581ab8ae3c718270e78a8",
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
        return parse_live_table_118(self.data_root / evidence[0].path)


def main() -> None:
    connector = NetAdditionalDwellingsConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    eng_latest = [
        o
        for o in observations
        if o.geography_code == "E92000001" and o.period_start.startswith("2024-")
    ]
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    for o in eng_latest:
        series = next((p.split("=", 1)[1] for p in o.notes.split("; ") if p.startswith("series=")), "?")
        print(f"  2024-25 England {series}: {o.value:,.0f} ({o.observation_status})")


if __name__ == "__main__":
    main()

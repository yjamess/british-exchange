"""ONS Price Index of Private Rents (PIPR) — UK monthly index.

Approach:
1. Pin PIPR monthly price statistics workbook.
2. Keep Area code K02000001 (United Kingdom) Index column (Jan 2023=100).
3. Emit monthly observations; map [x]/[z] to missing where needed.
"""

from __future__ import annotations

import calendar
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA

PINNED_RAW = "raw/2026-11-03/pipr_monthly.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/"
    "priceindexofprivaterentsukmonthlypricestatistics"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/inflationandpriceindices/datasets/"
    "priceindexofprivaterentsukmonthlypricestatistics/21october2026/"
    "priceindexofprivaterentsukmonthlypricestatistics.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-10-21"
SOURCE_VERSION = "PIPR monthly 2026-10-21"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "index (Jan 2023=100)"
MISSING = {"[x]", "[z]", "..", "…", ""}


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _as_date(raw: object) -> date:
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    text = str(raw).strip()
    return date.fromisoformat(text[:10])


def _parse_index(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "provisional"
    text = str(raw).strip()
    if text in MISSING:
        return None, "missing"
    return float(text.replace(",", "")), "provisional"


def parse_pipr_uk_index(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    try:
        if "Table 1" not in wb.sheetnames:
            raise ValueError(f"Expected Table 1; got {wb.sheetnames}")
        ws = wb["Table 1"]
        observations: list[Observation] = []
        # Header is row 1 title, row 2 note, row 3 headers — detect by Area code.
        header_seen = False
        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None:
                continue
            if not header_seen:
                if str(row[0]).strip().lower().startswith("time period"):
                    header_seen = True
                continue
            area = str(row[1]).strip() if row[1] is not None else ""
            if area != UK_CODE:
                continue
            period = _as_date(row[0])
            start, end = _month_bounds(period)
            value, status = _parse_index(row[4])  # Index column
            observations.append(
                Observation(
                    indicator_id="private-rental-price-index",
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="series=PIPR Index; area=United Kingdom; base=Jan 2023=100",
                )
            )
        if not observations:
            raise ValueError("No UK PIPR index rows parsed")
        observations.sort(key=lambda obs: obs.period_start)
        return observations
    finally:
        wb.close()


class PrivateRentalPriceIndexConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "private-rental-price-index"))

    @property
    def indicator_id(self) -> str:
        return "private-rental-price-index"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Private rental price index",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="PIPR Index (UK, Jan 2023=100)",
            geography="United Kingdom (K02000001)",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "Price Index of Private Rents (PIPR) for the UK — index of private "
                "rents for new and existing tenancies. Successor to IPHRP; official "
                "statistics from May 2026. Index reference January 2023=100."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.private_rental_price_index",
            curated_path="curated/observations.csv",
            update_cadence="monthly (Private rent and house prices, UK)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d65471768581e8be50f60e0d2a4919",
            transformations=(
                "Parse Table 1; filter Area code=K02000001; take Index column."
            ),
            caveats=(
                "Not seasonally adjusted. Latest two UK monthly estimates are "
                "provisional. PIPR methodology differs from discontinued IPHRP "
                "before 2015 — do not splice without the ONS historical bridge."
            ),
            revision_notes="Pinned 21 October 2026 PIPR monthly edition.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_pipr_uk_index(self.data_root / evidence[0].path)


def main() -> None:
    connector = PrivateRentalPriceIndexConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    print(f"observations: {len(observations)} last={observations[-1].value}")


if __name__ == "__main__":
    main()

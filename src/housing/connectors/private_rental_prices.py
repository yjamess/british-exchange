"""ONS PIPR — average monthly rent (£), annual change, and index by geography.

Approach (plain language):
1. Reuse the pinned PIPR monthly workbook already archived under
   private-rental-price-index (same official release).
2. Emit every real Area code (skip publisher [z] placeholders).
3. Tag measures with series= so the API can filter:
   average-rent (£), annual-change (%), index (Jan 2023=100).
4. Bedroom and property-type £ rents use series=average-rent plus
   bedrooms= / property_type= for the later “What are you renting?” view.
5. Mark the latest two months provisional per geography (ONS practice).

Official sample (21 Oct 2026 release): UK Sep 2026 average rent £1,406; annual +3.8%.
"""

from __future__ import annotations

import calendar
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import (
    Observation,
    ObservationStatus,
    mark_latest_months_provisional,
)
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "private-rental-prices"
PINNED_NAME = "pipr_monthly.xlsx"
PINNED_REL = f"raw/2026-11-03/{PINNED_NAME}"
SOURCE_SIBLING = HOUSING_DATA / "private-rental-price-index" / PINNED_REL
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
MISSING = {"[x]", "[z]", "..", "…", ""}

# Column index → (series slug, unit)
HEADLINE: tuple[tuple[int, str, str], ...] = (
    (7, "average-rent", "GBP per calendar month"),
    (6, "annual-change", "percent"),
    (4, "index", "index (Jan 2023=100)"),
)

BEDROOM_RENT: tuple[tuple[int, str], ...] = (
    (11, "1"),
    (15, "2"),
    (19, "3"),
    (23, "4-plus"),
)

PROPERTY_RENT: tuple[tuple[int, str], ...] = (
    (27, "detached"),
    (31, "semi-detached"),
    (35, "terraced"),
    (39, "flat-maisonette"),
)


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _as_date(raw: object) -> date:
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    return date.fromisoformat(str(raw).strip()[:10])


def _parse_number(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if text in MISSING:
        return None, "missing"
    return float(text.replace(",", "")), "final"


def _obs(
    *,
    period: date,
    code: str,
    label: str,
    value: float | None,
    status: ObservationStatus,
    unit: str,
    notes: str,
) -> Observation:
    start, end = _month_bounds(period)
    return Observation(
        indicator_id=INDICATOR_ID,
        period_start=start,
        period_end=end,
        geography_code=code,
        geography_label=label,
        value=value,
        unit=unit,
        observation_status=status,
        source_version=SOURCE_VERSION,
        notes=notes,
    )


def parse_pipr_prices(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    try:
        if "Table 1" not in wb.sheetnames:
            raise ValueError(f"Expected Table 1; got {wb.sheetnames}")
        ws = wb["Table 1"]
        observations: list[Observation] = []
        header_seen = False
        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None:
                continue
            if not header_seen:
                if str(row[0]).strip().lower().startswith("time period"):
                    header_seen = True
                continue
            code = str(row[1]).strip() if row[1] is not None else ""
            if not code or code in MISSING:
                continue
            label = str(row[2]).strip() if row[2] is not None else code
            period = _as_date(row[0])

            for col, series, unit in HEADLINE:
                value, status = _parse_number(row[col] if col < len(row) else None)
                observations.append(
                    _obs(
                        period=period,
                        code=code,
                        label=label,
                        value=value,
                        status=status,
                        unit=unit,
                        notes=f"series={series}; pipr=all-property",
                    )
                )

            for col, beds in BEDROOM_RENT:
                value, status = _parse_number(row[col] if col < len(row) else None)
                observations.append(
                    _obs(
                        period=period,
                        code=code,
                        label=label,
                        value=value,
                        status=status,
                        unit="GBP per calendar month",
                        # kind= → typed category for API filters (connector-contract).
                        notes=f"series=average-rent; kind=bedrooms-{beds}",
                    )
                )

            for col, prop in PROPERTY_RENT:
                value, status = _parse_number(row[col] if col < len(row) else None)
                observations.append(
                    _obs(
                        period=period,
                        code=code,
                        label=label,
                        value=value,
                        status=status,
                        unit="GBP per calendar month",
                        notes=f"series=average-rent; kind=type-{prop}",
                    )
                )

        if not observations:
            raise ValueError("No PIPR price rows parsed")
        return mark_latest_months_provisional(observations, months=2)
    finally:
        wb.close()


class PrivateRentalPricesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def ensure_pinned_raw(self) -> Path:
        dest = self.data_root / PINNED_REL
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.is_file():
            if not SOURCE_SIBLING.is_file():
                raise FileNotFoundError(
                    f"Missing PIPR workbook at {SOURCE_SIBLING}; fetch the ONS release first."
                )
            shutil.copy2(SOURCE_SIBLING, dest)
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Private rental prices (PIPR)",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="PIPR Table 1 — rental price / annual change / index",
            geography=(
                "UK, nations, English regions, local authorities (E&W), "
                "Broad Rental Market Areas (Scotland / Northern Ireland where published)"
            ),
            frequency="monthly",
            unit="GBP per calendar month (average-rent); percent; index Jan 2023=100",
            definition=(
                "Price Index of Private Rents (PIPR): average monthly private rent "
                "levels (£), annual percentage change, and index (Jan 2023=100) for "
                "new and existing tenancies. Bedroom and property-type £ rents included "
                "where published. Official statistics."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.private_rental_prices",
            curated_path="curated/observations.csv",
            update_cadence="monthly (Private rent and house prices, UK)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40e654717685811c8d02cc5a4ce4ef92",
            transformations=(
                "Parse Table 1 for every real Area code; emit series=average-rent, "
                "annual-change, index; bedroom and property-type £ rents as "
                "series=average-rent with kind=bedrooms-* / kind=type-*; mark latest "
                "two months provisional per geography."
            ),
            caveats=(
                "Scotland rents are mainly advertised new lets; Northern Ireland "
                "advertised new lets only and lag other UK nations — compare with care. "
                "Northern Ireland missing for the latest two UK months (ONS imputes NI "
                "into the UK total). Local figures can jump month-to-month; prefer trends. "
            ),
            revision_notes=(
                "Pinned 21 October 2026 PIPR monthly edition "
                "(shared raw with private-rental-price-index)."
            ),
            related_indicator_ids=["private-rental-price-index"],
            open_questions=[
                "Social rents remain a separate publisher stream — not in this workbook.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_REL,
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
        return parse_pipr_prices(self.data_root / evidence[0].path)


def main() -> None:
    connector = PrivateRentalPricesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    uk = [
        o
        for o in observations
        if o.geography_code == "K02000001"
        and (o.notes or "").startswith("series=average-rent;")
        and "kind=" not in (o.notes or "")
    ]
    uk.sort(key=lambda o: o.period_start)
    last = uk[-1]
    print(
        f"observations={len(observations)} "
        f"uk_avg_rent_last={last.period_start} value={last.value} "
        f"status={last.observation_status}"
    )


if __name__ == "__main__":
    main()

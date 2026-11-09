"""UK HPI selectable measures — UK types/volume plus England market segments.

Approach:
1. Reuse the pinned UK-HPI-full-file already archived under uk-average-house-price.
2. Emit UK rows for Average / Detached / Flat / Semi / Terrace / New / Existing / SalesVolume.
3. Emit England rows for FTB / Cash / Mortgage (those columns are empty on UK totals).
4. Tag each row with notes series=<slug> so the API series filter and facets work.
"""

from __future__ import annotations

import calendar
import csv
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import (
    Observation,
    ObservationStatus,
    mark_latest_months_provisional,
)
from britain_exchange.paths import HOUSING_DATA

PINNED_NAME = "UK-HPI-full-file-2026-08.csv"
PINNED_REL = f"raw/2026-11-03/{PINNED_NAME}"
SOURCE_SIBLING = HOUSING_DATA / "uk-average-house-price" / PINNED_REL
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "uk-house-price-index-data-downloads-august-2026--2"
)
PINNED_URL = (
    "https://publicdata.landregistry.gov.uk/market-trend-data/"
    "house-price-index-data/UK-HPI-full-file-2026-08.csv"
)
OFFICIAL_RELEASE_DATE = "2026-10-21"
SOURCE_VERSION = "UK-HPI-full-file-2026-08"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"

# column → (series slug, unit)
UK_MEASURES: tuple[tuple[str, str, str], ...] = (
    ("AveragePrice", "average", "£ (UK HPI)"),
    ("DetachedPrice", "detached", "£ (UK HPI)"),
    ("SemiDetachedPrice", "semi-detached", "£ (UK HPI)"),
    ("TerracedPrice", "terraced", "£ (UK HPI)"),
    ("FlatPrice", "flat", "£ (UK HPI)"),
    ("NewPrice", "new-build", "£ (UK HPI)"),
    ("OldPrice", "existing", "£ (UK HPI)"),
    ("SalesVolume", "sales-volume", "sales (count)"),
)

# England-only market segments (blank on United Kingdom rows in the full file).
ENGLAND_MEASURES: tuple[tuple[str, str, str], ...] = (
    ("FTBPrice", "first-time-buyer", "£ (UK HPI, England)"),
    ("CashPrice", "cash", "£ (UK HPI, England)"),
    ("MortgagePrice", "mortgage", "£ (UK HPI, England)"),
)


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _parse_uk_date(raw: str) -> date:
    return datetime.strptime(raw.strip(), "%d/%m/%Y").date()


def _emit_measures(
    row: dict[str, str],
    *,
    measures: tuple[tuple[str, str, str], ...],
    geography_code: str,
    geography_label: str,
    region_note: str,
) -> list[Observation]:
    period = _parse_uk_date(row["Date"])
    start, end = _month_bounds(period)
    out: list[Observation] = []
    for column, series, unit in measures:
        raw = (row.get(column) or "").strip()
        if not raw:
            status: ObservationStatus = "missing"
            value = None
        else:
            value = float(raw.replace(",", ""))
            status = "final"
        out.append(
            Observation(
                indicator_id="uk-hpi-measures",
                period_start=start,
                period_end=end,
                geography_code=geography_code,
                geography_label=geography_label,
                value=value,
                unit=unit,
                observation_status=status,
                source_version=SOURCE_VERSION,
                notes=f"series={series}; region={region_note}; column={column}",
            )
        )
    return out


def parse_uk_hpi_measures(csv_path: Path) -> list[Observation]:
    observations: list[Observation] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            name = (row.get("RegionName") or "").strip()
            if name == "United Kingdom":
                observations.extend(
                    _emit_measures(
                        row,
                        measures=UK_MEASURES,
                        geography_code=UK_CODE,
                        geography_label=UK_LABEL,
                        region_note="United Kingdom",
                    )
                )
            elif name == "England":
                observations.extend(
                    _emit_measures(
                        row,
                        measures=ENGLAND_MEASURES,
                        geography_code=ENGLAND_CODE,
                        geography_label=ENGLAND_LABEL,
                        region_note="England",
                    )
                )
    if not observations:
        raise ValueError("No United Kingdom / England HPI measure rows")
    observations.sort(key=lambda obs: (obs.geography_code, obs.period_start, obs.notes))
    # Provisional window is per geography (UK types vs England segments).
    return mark_latest_months_provisional(observations, months=12)


class UkHpiMeasuresConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "uk-hpi-measures"))

    @property
    def indicator_id(self) -> str:
        return "uk-hpi-measures"

    def ensure_pinned_raw(self) -> Path:
        """Copy the sibling UK HPI archive into this package if needed."""
        dest = self.data_root / PINNED_REL
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.is_file():
            if not SOURCE_SIBLING.is_file():
                raise FileNotFoundError(
                    f"Missing pinned UK HPI CSV at {SOURCE_SIBLING} "
                    "(run uk_average_house_price connector first)."
                )
            shutil.copy2(SOURCE_SIBLING, dest)
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK HPI measures (type and volume)",
            sector="housing-land",
            publisher="HM Land Registry / ONS",
            source_url=SOURCE_LANDING,
            series_id=(
                "UK HPI Average/Detached/Flat/New/Old/SalesVolume (UK); "
                "FTB/Cash/Mortgage (England)"
            ),
            geography="United Kingdom (K02000001); England segments (E92000001)",
            frequency="monthly",
            unit="£ (UK HPI) or sales (count)",
            definition=(
                "UK House Price Index measures from the full UK HPI file: UK average "
                "and property-type prices, new/existing, sales volume; plus England "
                "first-time buyer, cash and mortgage prices. Long-format rows keyed "
                "by notes series=<slug>."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.uk_hpi_measures",
            curated_path="curated/observations.csv",
            update_cadence="monthly (UK HPI)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "UK rows: Average, Detached, Semi, Terrace, Flat, New, Old, SalesVolume. "
                "England rows: FTB, Cash, Mortgage (blank on UK totals). "
                "series=<slug> in notes. Latest 12 valued months provisional per geography."
            ),
            caveats=(
                "Latest ~12 months of UK HPI are provisional and revise. "
                "FTB/cash/mortgage are England-only in the source file. "
                "Sales volume is a count, not a price. Not a local or postcode series."
            ),
            revision_notes="Pinned UK-HPI-full-file-2026-08 published 21 Oct 2026.",
            related_indicator_ids=["uk-average-house-price", "house-prices-by-region"],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_REL,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_uk_hpi_measures(self.data_root / evidence[0].path)


def main() -> None:
    connector = UkHpiMeasuresConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

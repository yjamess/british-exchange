"""ONS housing purchase affordability by income and house-price decile.

Approach:
1. Pin the 2024 UK country/region workbook under raw/<date>/.
2. Emit Table 4 median/median ratios by country and English region over time
   (series=median-household).
3. Emit Table 3a England income×price decile grid for the latest financial year
   (series=decile-grid; demographic=income-*; category=price-*).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PINNED_RAW = "raw/2026-11-04/purchase_affordability_2024.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/"
    "housingpurchaseaffordabilityingreatbritain"
)
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/"
    "datasets/housingpurchaseaffordabilityingreatbritain/2024/"
    "housingpurchaseaffordabilityukbycountryandenglishregion2024.xlsx"
)
OFFICIAL_RELEASE_DATE = "2025-09-18"
SOURCE_VERSION = "ONS housing purchase affordability 2024 edition"
UNIT = "ratio (house price decile / household income decile)"

_FY_RE = re.compile(r"^(\d{4})/(\d{2})$")


def _fy_bounds(header: str) -> tuple[str, str] | None:
    """Map '2023/24' → financial year 2023-04-01 … 2024-03-31."""
    text = str(header).strip()
    match = _FY_RE.match(text)
    if not match:
        return None
    start_year = int(match.group(1))
    end_year = start_year + 1
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def _pct_slug(label: str) -> str | None:
    text = str(label).strip().lower()
    if "10th" in text:
        return "p10"
    if "20th" in text:
        return "p20"
    if "30th" in text:
        return "p30"
    if "40th" in text:
        return "p40"
    if "50th" in text:
        return "p50"
    if "60th" in text:
        return "p60"
    if "70th" in text:
        return "p70"
    if "80th" in text:
        return "p80"
    if "90th" in text:
        return "p90"
    return None


def _is_missing(value: object) -> bool:
    if value is None or value == "":
        return True
    if isinstance(value, str) and value.strip() in {":", "-", "…", "..."}:
        return True
    return False


def parse_purchase_affordability(workbook: Path) -> list[Observation]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    observations: list[Observation] = []
    try:
        # --- Table 4: median/median by region ---
        if "4" not in wb.sheetnames:
            raise ValueError(f"Expected sheet 4; got {wb.sheetnames}")
        ws4 = wb["4"]
        header_row = [cell.value for cell in next(ws4.iter_rows(min_row=3, max_row=3))]
        year_cols: list[tuple[int, str, str]] = []
        for idx, header in enumerate(header_row):
            if header is None:
                continue
            bounds = _fy_bounds(str(header))
            if bounds:
                year_cols.append((idx, bounds[0], bounds[1]))
        if not year_cols:
            raise ValueError("No financial-year columns on Table 4")

        for row in ws4.iter_rows(min_row=4, values_only=True):
            if not row or not row[0]:
                continue
            code = str(row[0]).strip()
            label = str(row[1] or "").strip()
            income = _pct_slug(str(row[2] or ""))
            price = _pct_slug(str(row[3] or ""))
            if income != "p50" or price != "p50":
                continue
            for idx, start, end in year_cols:
                value_raw = row[idx] if idx < len(row) else None
                if _is_missing(value_raw):
                    continue
                observations.append(
                    Observation(
                        indicator_id="housing-purchase-affordability",
                        period_start=start,
                        period_end=end,
                        geography_code=code,
                        geography_label=label,
                        value=float(value_raw),
                        unit=UNIT,
                        observation_status="final",
                        source_version=SOURCE_VERSION,
                        notes=(
                            "series=median-household; "
                            "demographic=income-p50; category=price-p50; "
                            "table=4"
                        ),
                    )
                )

        # --- Table 3a: England income × price grid, latest FY only ---
        if "3a" not in wb.sheetnames:
            raise ValueError("Expected sheet 3a")
        ws3 = wb["3a"]
        header3 = [cell.value for cell in next(ws3.iter_rows(min_row=3, max_row=3))]
        year_cols3: list[tuple[int, str, str]] = []
        for idx, header in enumerate(header3):
            if header is None:
                continue
            bounds = _fy_bounds(str(header))
            if bounds:
                year_cols3.append((idx, bounds[0], bounds[1]))
        if not year_cols3:
            raise ValueError("No financial-year columns on Table 3a")
        latest_idx, latest_start, latest_end = year_cols3[-1]

        for row in ws3.iter_rows(min_row=4, values_only=True):
            if not row or not row[0]:
                continue
            code = str(row[0]).strip()
            label = str(row[1] or "").strip()
            income = _pct_slug(str(row[2] or ""))
            price = _pct_slug(str(row[3] or ""))
            if not income or not price:
                continue
            value_raw = row[latest_idx] if latest_idx < len(row) else None
            if _is_missing(value_raw):
                continue
            observations.append(
                Observation(
                    indicator_id="housing-purchase-affordability",
                    period_start=latest_start,
                    period_end=latest_end,
                    geography_code=code,
                    geography_label=label,
                    value=float(value_raw),
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series=decile-grid; demographic=income-{income}; "
                        f"category=price-{price}; table=3a; fy_latest=1"
                    ),
                )
            )
    finally:
        wb.close()

    if not observations:
        raise ValueError("No purchase-affordability observations parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.geography_code, obs.notes))
    return observations


class HousingPurchaseAffordabilityConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "housing-purchase-affordability"))

    @property
    def indicator_id(self) -> str:
        return "housing-purchase-affordability"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Housing purchase affordability",
            sector="housing-land",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="Purchase affordability Tables 4 + 3a (2024 edition)",
            geography="UK countries and English regions (Table 4); England grid (3a)",
            frequency="annual (financial year)",
            unit=UNIT,
            definition=(
                "Ratios of house-price deciles to equivalised household disposable "
                "income deciles. Median/median by region over time, plus England "
                "income×price grid for the latest financial year."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.housing_purchase_affordability",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Table 4 → series=median-household; Table 3a latest FY → "
                "series=decile-grid with income/price percentile notes."
            ),
            caveats=(
                "Household equivalised disposable income (not ASHE workplace earnings). "
                "Not the same as AFF1 years-of-pay. Scotland/NI shorter histories."
            ),
            revision_notes="Pinned 2024 edition, release 18 September 2025.",
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
        return parse_purchase_affordability(self.data_root / evidence[0].path)


def main() -> None:
    connector = HousingPurchaseAffordabilityConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    med = [o for o in observations if "median-household" in o.notes]
    grid = [o for o in observations if "decile-grid" in o.notes]
    print(f"median-household: {len(med)}; decile-grid: {len(grid)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

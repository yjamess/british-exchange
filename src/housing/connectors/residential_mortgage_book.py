"""FCA / PRA Mortgage Lending and Administration Return (MLAR).

Summary workbook, regulated and non-regulated residential loans to individuals.
Outstanding balances are a stock at quarter end. Gross advances, commitments
and purpose shares are flows during the quarter. Not seasonally adjusted.

Q2 2026 check against the FCA commentary: outstanding £1,760.6 billion.

Ref: https://www.fca.org.uk/data/mortgage-lending-statistics
"""

from __future__ import annotations

import calendar
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-05"
STAGING_FILE = "mlar-statistics-summary-long-run.xlsx"
PINNED_URL = "https://www.fca.org.uk/publication/data/mlar-statistics-summary-long-run.xlsx"
SOURCE_LANDING = "https://www.fca.org.uk/data/mortgage-lending-statistics"
OFFICIAL_RELEASE_DATE = "2026-09-08"
SOURCE_VERSION = "MLAR statistics summary long run, September 2026 edition (Q2 2026)"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"

# sheet, excel row, series, measure, unit
# Rows are the published summary lines (see the workbook labels).
SERIES_ROWS: tuple[tuple[str, int, str, str, str], ...] = (
    ("Summary 2", 37, "balances-outstanding", "stock", "gbp-millions"),
    ("Summary 2", 35, "balances-unsecuritised", "stock", "gbp-millions"),
    ("Summary 2", 36, "balances-securitised", "stock", "gbp-millions"),
    ("Summary 1", 17, "gross-advances", "flow", "gbp-millions"),
    ("Summary 1", 18, "net-advances", "flow", "gbp-millions"),
    ("Summary 1", 19, "new-commitments", "flow", "gbp-millions"),
    ("Summary 1", 32, "house-purchase-share-of-advances", "flow", "percent"),
    ("Summary 1", 33, "first-time-buyer-share-of-advances", "flow", "percent"),
    ("Summary 1", 34, "buy-to-let-share-of-advances", "flow", "percent"),
    ("Summary 1", 38, "remortgage-share-of-advances", "flow", "percent"),
    ("Summary 2", 19, "ltv-up-to-75-share", "flow", "percent"),
    ("Summary 2", 20, "ltv-75-to-90-share", "flow", "percent"),
    ("Summary 2", 21, "ltv-90-to-95-share", "flow", "percent"),
    ("Summary 2", 22, "ltv-over-95-share", "flow", "percent"),
    ("Summary 3", 21, "arrears-balances", "stock", "gbp-millions"),
    ("Summary 3", 22, "arrears-share-of-balances", "stock", "percent"),
)


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    end_month = quarter * 3
    start_month = end_month - 2
    last_day = calendar.monthrange(year, end_month)[1]
    return (
        f"{year:04d}-{start_month:02d}-01",
        f"{year:04d}-{end_month:02d}-{last_day:02d}",
    )


def _quarter_columns(ws) -> list[tuple[int, int, int]]:
    """Return (column, year, quarter) using the year row and the Q1–Q4 row."""
    year: int | None = None
    found: list[tuple[int, int, int]] = []
    for col in range(5, (ws.max_column or 5) + 1):
        year_cell = ws.cell(13, col).value
        if isinstance(year_cell, int):
            year = year_cell
        label = ws.cell(14, col).value
        if year is None or not isinstance(label, str) or not label.startswith("Q"):
            continue
        quarter = int(label[1])
        if quarter not in {1, 2, 3, 4}:
            continue
        found.append((col, year, quarter))
    if not found:
        raise ValueError(f"{ws.title}: no quarter columns")
    return found


def parse_mlar(path: Path) -> list[Observation]:
    workbook = openpyxl.load_workbook(path, data_only=True)
    out: list[Observation] = []
    for sheet_name, row, series, measure, unit in SERIES_ROWS:
        ws = workbook[sheet_name]
        for col, year, quarter in _quarter_columns(ws):
            raw = ws.cell(row, col).value
            if not isinstance(raw, (int, float)):
                continue
            start, end = _quarter_bounds(year, quarter)
            out.append(
                Observation(
                    indicator_id="residential-mortgage-book",
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=float(raw),
                    unit=unit,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={series}; measure={measure}; "
                        "adjustment=not-seasonally-adjusted; "
                        f"sheet={sheet_name}"
                    ),
                )
            )
    if not out:
        raise ValueError("No MLAR observations")
    out.sort(key=lambda o: (o.notes, o.period_start))
    return out


class ResidentialMortgageBookConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "residential-mortgage-book"))

    @property
    def indicator_id(self) -> str:
        return "residential-mortgage-book"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Residential mortgage book (MLAR)",
            sector="housing-land",
            publisher="FCA and PRA",
            source_url=SOURCE_LANDING,
            series_id="MLAR summary tables — residential loans to individuals",
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit="£ million, or percent of gross advances",
            definition=(
                "Outstanding residential mortgage balances (stock) and quarterly "
                "gross advances, commitments, purpose shares, loan-to-value shares "
                "and arrears balances. Regulated and non-regulated loans reported "
                "by firms that undertake regulated mortgage business."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.residential_mortgage_book",
            curated_path="curated/observations.csv",
            update_cadence="quarterly",
            raw_evidence=list(evidence),
            transformations=(
                "Read Summary 1–3. Year headers fill forward across Q1–Q4 columns. "
                "Purpose and LTV rows are shares of gross advances, not stocks."
            ),
            caveats=(
                "Not seasonally adjusted. The outstanding balance is a stock at "
                "quarter end. Advances and commitments are flows. Do not add the "
                "stock to Bank of England monthly approvals. Buy-to-let here is a "
                "share of new advances, including purchase, further advance and "
                "remortgage. Arrears are loan accounts in arrears, not possessions."
            ),
            revision_notes="Domain 09 ingest 2026-11-05. September 2026 edition.",
            related_indicator_ids=["mortgage-approvals", "mortgage-rate-2yr-fixed"],
        )

    def evidence_from_pinned(self) -> RawEvidence:
        rel = f"{PIN_DIR}/{STAGING_FILE}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_mlar(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_ownership_pin" / "2026-11-05" / STAGING_FILE
    dest_dir = HOUSING_DATA / "residential-mortgage-book" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = ResidentialMortgageBookConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    stock = next(
        o
        for o in observations
        if o.period_start == "2026-04-01" and "balances-outstanding" in o.notes
    )
    advances = next(
        o
        for o in observations
        if o.period_start == "2026-04-01" and "series=gross-advances" in o.notes
    )
    print(f"residential-mortgage-book: obs={len(observations)}")
    print(f"Q2 2026 balances £ million: {stock.value}")
    print(f"Q2 2026 gross advances £ million: {advances.value}")


if __name__ == "__main__":
    main()

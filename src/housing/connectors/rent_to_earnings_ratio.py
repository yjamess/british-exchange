"""Derived England rent-to-earnings ratio (PIPR rent ÷ AFF1 earnings).

Approach:
1. Read pinned AFF1 workbook Table 1b England median workplace earnings.
2. Read curated PIPR England all-property average monthly rent (September each year).
3. Emit annual ratio = (September rent × 12) / that year's median earnings.

This is DERIVED — formula registered in the manifest. Not an ONS published ratio.
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

AFF1_REL = (
    HOUSING_DATA
    / "house-price-to-earnings-ratio"
    / "raw/2026-11-03/aff1_ratio_workplace.xlsx"
)
PIPR_CURATED = HOUSING_DATA / "private-rental-prices" / "curated/observations.csv"
# Evidence pointer lives beside this indicator for checksum traceability.
PINNED_RAW = "raw/2026-11-04/derivation_inputs.txt"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/"
    "ratioofhousepricetoworkplacebasedearningslowerquartileandmedian"
)
OFFICIAL_RELEASE_DATE = "2026-03-26"
SOURCE_VERSION = "Derived: PIPR England Sep rent ×12 / AFF1 Table 1b England median"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "ratio (annual private rent / median workplace earnings)"


def _england_earnings_by_year(workbook: Path) -> dict[int, float]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    try:
        ws = wb["1b"]
        header = [cell.value for cell in next(ws.iter_rows(min_row=2, max_row=2))]
        england = None
        for row in ws.iter_rows(min_row=3, values_only=True):
            if row and str(row[0]).strip() == ENGLAND_CODE:
                england = row
                break
        if england is None:
            raise ValueError("England row missing from AFF1 Table 1b")
        out: dict[int, float] = {}
        for idx, header_val in enumerate(header):
            if header_val is None:
                continue
            text = str(header_val).strip()
            if not text.isdigit():
                continue
            year = int(text)
            value_raw = england[idx]
            if value_raw is None or value_raw == "":
                continue
            out[year] = float(value_raw)
        return out
    finally:
        wb.close()


def _england_september_rent_by_year(pipr_csv: Path) -> dict[int, float]:
    """All-property average monthly rent for England in September each year."""
    out: dict[int, float] = {}
    with pipr_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("geography_code") != ENGLAND_CODE:
                continue
            notes = row.get("notes") or ""
            if "series=average-rent" not in notes:
                continue
            if "kind=" in notes:
                continue  # bedroom/type breakdowns
            period = (row.get("period_start") or "")[:10]
            if len(period) < 7 or period[5:7] != "09":
                continue
            value_raw = row.get("value")
            if value_raw is None or value_raw == "":
                continue
            year = int(period[:4])
            out[year] = float(value_raw)
    return out


def derive_rent_to_earnings(*, aff1: Path, pipr: Path) -> list[Observation]:
    earnings = _england_earnings_by_year(aff1)
    rents = _england_september_rent_by_year(pipr)
    years = sorted(set(earnings) & set(rents))
    if not years:
        raise ValueError("No overlapping years between AFF1 earnings and PIPR Sep rents")
    observations: list[Observation] = []
    for year in years:
        annual_rent = rents[year] * 12.0
        ratio = annual_rent / earnings[year]
        observations.append(
            Observation(
                indicator_id="rent-to-earnings-ratio",
                period_start=f"{year:04d}-01-01",
                period_end=f"{year:04d}-12-31",
                geography_code=ENGLAND_CODE,
                geography_label=ENGLAND_LABEL,
                value=round(ratio, 4),
                unit=UNIT,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=(
                    f"derived=1; rent_month_sep={rents[year]}; "
                    f"earnings_median={earnings[year]}; "
                    "components=private-rental-prices+AFF1-1b"
                ),
            )
        )
    return observations


class RentToEarningsRatioConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "rent-to-earnings-ratio"))

    @property
    def indicator_id(self) -> str:
        return "rent-to-earnings-ratio"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Rent to earnings ratio",
            sector="housing-land",
            publisher="British Exchange (derived from ONS)",
            source_url=SOURCE_LANDING,
            series_id="PIPR England Sep rent ×12 / AFF1 Table 1b median earnings",
            geography="England (E92000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Derived annual private rent (England PIPR September average × 12) "
                "divided by AFF1 median gross annual workplace-based earnings for England."
            ),
            licence="Open Government Licence v3.0 (component series)",
            agent_owner="housing",
            connector_module="housing.connectors.rent_to_earnings_ratio",
            curated_path="curated/observations.csv",
            update_cadence="when PIPR or AFF1 refreshes",
            raw_evidence=list(evidence),
            transformations=(
                "Join England September average-rent with AFF1 1b earnings by calendar year; "
                "ratio = rent×12 / earnings."
            ),
            caveats=(
                "DERIVED — not a published ONS rent-to-income statistic. "
                "Workplace earnings (ASHE) are not household income. "
                "September rent aligns with AFF1 house-price year-ending-September convention."
            ),
            revision_notes="First derivation 2026-11-04 from pinned AFF1 + PIPR curated.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        """Write a small provenance file listing component paths + checksums."""
        if not AFF1_REL.is_file():
            raise FileNotFoundError(AFF1_REL)
        if not PIPR_CURATED.is_file():
            raise FileNotFoundError(PIPR_CURATED)
        target = self.data_root / PINNED_RAW
        target.parent.mkdir(parents=True, exist_ok=True)
        body = (
            f"aff1={AFF1_REL.relative_to(HOUSING_DATA.parent.parent)}\n"
            f"aff1_sha256={sha256_file(AFF1_REL)}\n"
            f"pipr={PIPR_CURATED.relative_to(HOUSING_DATA.parent.parent)}\n"
            f"pipr_sha256={sha256_file(PIPR_CURATED)}\n"
            f"formula=(PIPR England Sep average-rent × 12) / (AFF1 Table 1b England median)\n"
        )
        target.write_text(body, encoding="utf-8")
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(target),
            content_type="text/plain",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=SOURCE_LANDING,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return derive_rent_to_earnings(aff1=AFF1_REL, pipr=PIPR_CURATED)


def main() -> None:
    connector = RentToEarningsRatioConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"range: {observations[0].period_start} → {observations[-1].period_start}")
    print(f"latest: {observations[-1].value}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

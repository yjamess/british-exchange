"""Bank of England quoted 2-year fixed mortgage rate (IUMBV34).

Approach:
1. Pin the BoE IADB CSV export under raw/<date>/.
2. Parse monthly DATE + IUMBV34 percent values.
3. Emit monthly Observations for the Economy mortgage-rate series used as
   the Housing Budget default interest rate.
"""

from __future__ import annotations

import calendar
import csv
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA

PINNED_RAW = "raw/2026-11-04/iumbv34.csv"
SOURCE_LANDING = "https://www.bankofengland.co.uk/boeapps/database/"
PINNED_URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&Datefrom=01/Jan/2015&Dateto=01/Dec/2026"
    "&SeriesCodes=IUMBV34&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
)
OFFICIAL_RELEASE_DATE = "2026-09-30"
SOURCE_VERSION = "BoE IUMBV34 (quoted rates, 2yr fixed 75% LTV)"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "% a year (quoted rate)"


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _parse_boe_date(raw: str) -> date:
    # e.g. "31 Jan 2015" or "30 Sep 2026"
    return datetime.strptime(raw.strip(), "%d %b %Y").date()


def parse_iumbv34(csv_path: Path) -> list[Observation]:
    observations: list[Observation] = []
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "DATE" not in reader.fieldnames:
            raise ValueError(f"Unexpected BoE CSV headers: {reader.fieldnames}")
        rate_key = "IUMBV34" if "IUMBV34" in reader.fieldnames else None
        if rate_key is None:
            raise ValueError(f"IUMBV34 column missing: {reader.fieldnames}")
        for row in reader:
            date_raw = (row.get("DATE") or "").strip()
            value_raw = (row.get(rate_key) or "").strip()
            if not date_raw or not value_raw:
                continue
            period = _parse_boe_date(date_raw)
            start, end = _month_bounds(period)
            observations.append(
                Observation(
                    indicator_id="mortgage-rate-2yr-fixed",
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=float(value_raw),
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes="series=iumbv34; product=2yr-fixed; ltv=75",
                )
            )
    if not observations:
        raise ValueError("No IUMBV34 rows parsed")
    observations.sort(key=lambda obs: obs.period_start)
    return observations


class MortgageRate2yrFixedConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / "mortgage-rate-2yr-fixed"))

    @property
    def indicator_id(self) -> str:
        return "mortgage-rate-2yr-fixed"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Mortgage rate · 2-year fixed",
            sector="economy-public-finance",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="IUMBV34",
            geography="United Kingdom (quoted rate)",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "Quoted household interest rate for new 2-year fixed-rate "
                "mortgages at 75% loan-to-value (BoE series IUMBV34)."
            ),
            licence="Open Government Licence / BoE terms of use",
            agent_owner="economy",
            connector_module="economy.connectors.mortgage_rate_2yr_fixed",
            curated_path="curated/observations.csv",
            update_cadence="monthly",
            raw_evidence=list(evidence),
            transformations="Parse BoE IADB CSV DATE + IUMBV34; monthly period bounds.",
            caveats=(
                "Quoted rate, not an individual offer. 75% LTV product. "
                "Used as the Housing Budget default rate when latest value loads."
            ),
            revision_notes="Pinned IADB export 2026-11-04 (from Jan 2015).",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_iumbv34(self.data_root / evidence[0].path)


def main() -> None:
    connector = MortgageRate2yrFixedConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"range: {observations[0].period_start} → {observations[-1].period_start}")
    print(f"latest: {observations[-1].value}%")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

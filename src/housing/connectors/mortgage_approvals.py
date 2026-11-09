"""Bank of England Money and Credit — mortgage approvals and lending flows.

These are monthly flows for the United Kingdom, seasonally adjusted.
They are not the stock of outstanding mortgage debt (that is the FCA MLAR book).

Series (IADB codes):
- LPMVTVX  net approvals for house purchase (number)
- LPMB4B3  approvals for remortgaging with a different lender (number)
- LPMVTVJ  net secured lending (£ million)
- LPMVTVC  gross secured lending (£ million)

Ref: https://www.bankofengland.co.uk/statistics/money-and-credit/2026/september-2026
"""

from __future__ import annotations

import calendar
import csv
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-05"
STAGING_FILE = "boe_mortgage_flows.csv"
PINNED_URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&Datefrom=01/Jan/1993&Dateto=01/Dec/2026"
    "&SeriesCodes=LPMVTVX,LPMB4B3,LPMVTVJ,LPMVTVC"
    "&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
)
SOURCE_LANDING = "https://www.bankofengland.co.uk/statistics/money-and-credit/2026/september-2026"
OFFICIAL_RELEASE_DATE = "2026-10-29"
SOURCE_VERSION = "BoE Money and Credit September 2026 (LPMVTVX, LPMB4B3, LPMVTVJ, LPMVTVC)"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"

# code, series slug, unit
COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("LPMVTVX", "house-purchase-approvals", "approvals"),
    ("LPMB4B3", "remortgage-approvals", "approvals"),
    ("LPMVTVJ", "net-secured-lending", "gbp-millions"),
    ("LPMVTVC", "gross-secured-lending", "gbp-millions"),
)


def _month_bounds(when: datetime) -> tuple[str, str]:
    last = calendar.monthrange(when.year, when.month)[1]
    return f"{when.year:04d}-{when.month:02d}-01", f"{when.year:04d}-{when.month:02d}-{last:02d}"


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text in {"", ".."}:
        return None, "missing"
    try:
        return float(text), "final"
    except ValueError:
        return None, "missing"


def parse_flows(path: Path) -> list[Observation]:
    out: list[Observation] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "DATE" not in reader.fieldnames:
            raise ValueError(f"BoE CSV missing DATE column: {reader.fieldnames}")
        for code, _series, _unit in COLUMNS:
            if code not in reader.fieldnames:
                raise ValueError(f"BoE CSV missing {code}")
        for row in reader:
            when = datetime.strptime(row["DATE"].strip(), "%d %b %Y")
            start, end = _month_bounds(when)
            for code, series, unit in COLUMNS:
                value, status = _parse_number(row.get(code) or "")
                if value is None:
                    continue
                out.append(
                    Observation(
                        indicator_id="mortgage-approvals",
                        period_start=start,
                        period_end=end,
                        geography_code=UK_CODE,
                        geography_label=UK_LABEL,
                        value=value,
                        unit=unit,
                        observation_status=status,
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"series={series}; measure=flow; "
                            f"adjustment=seasonally-adjusted; boe={code}"
                        ),
                    )
                )
    if not out:
        raise ValueError("No mortgage approval observations")
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


class MortgageApprovalsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "mortgage-approvals"))

    @property
    def indicator_id(self) -> str:
        return "mortgage-approvals"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Mortgage approvals and secured lending flows",
            sector="housing-land",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="LPMVTVX, LPMB4B3, LPMVTVJ, LPMVTVC",
            geography="United Kingdom (K02000001)",
            frequency="monthly (flow, seasonally adjusted)",
            unit="approvals or £ million",
            definition=(
                "Net mortgage approvals for house purchase, remortgage approvals "
                "with a different lender, and gross and net secured lending to individuals."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.mortgage_approvals",
            curated_path="curated/observations.csv",
            update_cadence="monthly",
            raw_evidence=list(evidence),
            transformations=(
                "Parse the Bank of England IADB CSV. Empty cells are omitted. "
                "Quoted mortgage rates stay on the Economy series IUMBV34."
            ),
            caveats=(
                "Monthly flows, seasonally adjusted. Do not add to the FCA stock of "
                "outstanding mortgage balances. Remortgage approvals cover a change "
                "of lender only. Recent months are revised."
            ),
            revision_notes="Domain 09 ingest 2026-11-05.",
            related_indicator_ids=["residential-mortgage-book", "mortgage-rate-2yr-fixed"],
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
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_flows(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_ownership_pin" / "2026-11-05" / STAGING_FILE
    dest_dir = HOUSING_DATA / "mortgage-approvals" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = MortgageApprovalsConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    sep = [
        o
        for o in observations
        if o.period_start == "2026-09-01" and "house-purchase-approvals" in o.notes
    ]
    print(f"mortgage-approvals: obs={len(observations)}")
    print("Sep 2026 house-purchase approvals:", sep[0].value if sep else None)


if __name__ == "__main__":
    main()

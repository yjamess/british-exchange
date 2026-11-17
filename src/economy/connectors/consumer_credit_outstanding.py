"""Bank of England consumer credit outstanding excluding the Student Loans Company.

Approach (plain language):
1. Pin the BoE IADB CSV export (same pattern as IUMBV34 mortgage rate).
2. Parse monthly DATE plus LPMBI2O (total), LPMVZRJ (credit cards),
   LPMB4TS (other) — seasonally adjusted £ million stocks.
3. One pack, three series in notes. Do not re-ingest Housing
   residential-mortgage-book or mortgage-rate-2yr-fixed.

Best practices: pathlib, type hints
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html, PEP 8).
"""

from __future__ import annotations

import calendar
import csv
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "consumer-credit-outstanding"
PIN_DATE = "2026-11-15"
PINNED_RAW = f"raw/{PIN_DATE}/lpmbi2o_lpmvzrj_lpmb4ts.csv"
SOURCE_LANDING = "https://www.bankofengland.co.uk/boeapps/database/"
PINNED_URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&Datefrom=01/Jan/1993&Dateto=01/Dec/2026"
    "&SeriesCodes=LPMBI2O,LPMVZRJ,LPMB4TS&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
)
OFFICIAL_RELEASE_DATE = "2026-10-29"
SOURCE_VERSION = (
    "BoE Money and Credit / Bankstats Table A5.6 — consumer credit excl. SLC, "
    "SA £ million (published 29 Oct 2026, September 2026 data)"
)
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
UNIT = "£ million, SA"

SERIES: tuple[tuple[str, str], ...] = (
    ("LPMBI2O", "total"),
    ("LPMVZRJ", "credit-cards"),
    ("LPMB4TS", "other"),
)

# September 2026 published stocks.
SELF_QA: dict[str, float] = {
    "total": 261200.0,
    "credit-cards": 83708.0,
    "other": 177492.0,
}

_USER_AGENT = "british-exchange-economy/1.0 (research; BoE IADB)"


def _month_bounds(d: date) -> tuple[str, str]:
    last = calendar.monthrange(d.year, d.month)[1]
    return f"{d.year:04d}-{d.month:02d}-01", f"{d.year:04d}-{d.month:02d}-{last:02d}"


def _parse_boe_date(raw: str) -> date:
    return datetime.strptime(raw.strip(), "%d %b %Y").date()


def parse_consumer_credit(csv_path: Path) -> list[Observation]:
    observations: list[Observation] = []
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "DATE" not in reader.fieldnames:
            raise ValueError(f"Unexpected BoE CSV headers: {reader.fieldnames}")
        missing = [code for code, _ in SERIES if code not in reader.fieldnames]
        if missing:
            raise ValueError(f"Missing BoE columns {missing}: {reader.fieldnames}")
        for row in reader:
            date_raw = (row.get("DATE") or "").strip()
            if not date_raw:
                continue
            period = _parse_boe_date(date_raw)
            start, end = _month_bounds(period)
            for code, series in SERIES:
                value_raw = (row.get(code) or "").strip()
                if not value_raw:
                    continue
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=UK_CODE,
                        geography_label=UK_LABEL,
                        value=float(value_raw),
                        unit=UNIT,
                        observation_status="final",
                        source_version=SOURCE_VERSION,
                        notes=(
                            f"series={series}; cdid={code}; measure=stock; "
                            "adjustment=sa; excl_slc=true; table=A5.6"
                        ),
                    )
                )
    if not observations:
        raise ValueError("No consumer-credit rows parsed")
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    return mark_latest_months_provisional(
        observations,
        months=1,
        group_key=lambda obs: next(
            (part.split("=", 1)[1] for part in obs.notes.split("; ") if part.startswith("series=")),
            "unknown",
        ),
    )


def run_self_qa(observations: list[Observation]) -> None:
    latest = "2026-09-01"
    failed: list[str] = []
    for series, expected in SELF_QA.items():
        match = next(
            (
                obs
                for obs in observations
                if obs.period_start == latest and f"series={series}" in obs.notes
            ),
            None,
        )
        if match is None or match.value != expected:
            failed.append(f"{series} {latest}: {getattr(match, 'value', None)} != {expected}")
    cards = next(o for o in observations if o.period_start == latest and "series=credit-cards" in o.notes)
    other = next(o for o in observations if o.period_start == latest and "series=other" in o.notes)
    total = next(o for o in observations if o.period_start == latest and "series=total" in o.notes)
    if cards.value is None or other.value is None or total.value is None:
        failed.append("missing September 2026 values")
    elif cards.value + other.value != total.value:
        failed.append(
            f"cards+other {cards.value + other.value} != total {total.value}"
        )
    if failed:
        raise RuntimeError("Self-QA failed: " + "; ".join(failed))


def _download_iadb(url: str, target: Path) -> RawEvidence:
    target.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": _USER_AGENT, "Accept": "text/csv,*/*"}
    with httpx.Client(timeout=120.0, follow_redirects=True, headers=headers) as client:
        response = client.get(url)
        response.raise_for_status()
        target.write_bytes(response.content)
    return RawEvidence(
        path=PINNED_RAW,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=sha256_file(target),
        content_type=response.headers.get("content-type", "text/csv"),
        official_release_date=OFFICIAL_RELEASE_DATE,
        http_status=response.status_code,
        source_url=url,
    )


class ConsumerCreditOutstandingConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Consumer credit outstanding (excl. Student Loans Company)",
            sector="economy-public-finance",
            publisher="Bank of England",
            source_url=SOURCE_LANDING,
            series_id="LPMBI2O, LPMVZRJ, LPMB4TS",
            geography="United Kingdom (K02000001); lending to individuals",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "Monthly amounts outstanding of sterling consumer credit lending "
                "to individuals, excluding the Student Loans Company, seasonally "
                "adjusted £ million. LPMBI2O is the headline total; LPMVZRJ is "
                "credit cards; LPMB4TS is other unsecured consumer credit "
                "(overdrafts and other loans/advances). Bankstats Table A5.6 / "
                "Money and Credit. Lender stocks, not a survey of household "
                "debt, not mortgage rates, not the FCA MLAR book."
            ),
            licence="Open Government Licence / BoE terms of use",
            agent_owner="economy",
            connector_module="economy.connectors.consumer_credit_outstanding",
            curated_path="curated/observations.csv",
            update_cadence="monthly (Money and Credit)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse BoE IADB CSV DATE + LPMBI2O/LPMVZRJ/LPMB4TS. Monthly "
                "period bounds. Latest month marked provisional. Empty cells "
                "(e.g. LPMBI2O Mar 1993) skipped."
            ),
            caveats=(
                "Excludes Student Loans Company. Credit-card vs other split is "
                "not comparable before January 1999 (BoE further-details note). "
                "April 2024 reporting-population transfer from ONS may affect "
                "levels. Seasonally adjusted stocks. Do not add to Housing "
                "residential-mortgage-book (MLAR, NSA, different reporters). "
                "mortgage-rate-2yr-fixed is a quoted rate, not a burden. "
                "BoE secured-on-dwellings stock LPMVTXK is not ingested here."
            ),
            revision_notes=(
                "Domain 04 Weight of Debt ingest 2026-11-15. Pin is the "
                "29 Oct 2026 Money and Credit vintage (September 2026 data)."
            ),
            related_indicator_ids=[
                "mortgage-rate-2yr-fixed",
                "residential-mortgage-book",
                "household-financial-wealth",
            ],
            open_questions=[
                "Ingest BoE LPMVTXK (secured on dwellings outstanding, SA) as a "
                "labelled companion, or keep Housing MLAR as the only stock?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/41965471768581ac9b18dd18aa199030"
            ),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_consumer_credit(self.data_root / evidence[0].path)

    def run(self) -> tuple[Path, Path]:
        target = self.data_root / PINNED_RAW
        if target.is_file() and target.stat().st_size > 500:
            evidence = RawEvidence(
                path=PINNED_RAW,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(target),
                content_type="text/csv",
                official_release_date=OFFICIAL_RELEASE_DATE,
                http_status=200,
                source_url=PINNED_URL,
            )
        else:
            evidence = _download_iadb(PINNED_URL, target)
        observations = self.transform([evidence])
        run_self_qa(observations)
        return self.write_hand_off([evidence], observations)


def main() -> None:
    connector = ConsumerCreditOutstandingConnector()
    manifest_path, curated_path = connector.run()
    observations = parse_consumer_credit(connector.data_root / PINNED_RAW)
    latest_total = next(
        obs
        for obs in reversed(observations)
        if "series=total" in obs.notes
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(
        f"range: {observations[0].period_start} → {observations[-1].period_start}"
    )
    print(f"latest total ({latest_total.period_start}): {latest_total.value} £m")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

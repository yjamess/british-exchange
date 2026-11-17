"""Insolvency Service — company insolvencies long-run monthly CSV (wide format)."""

from __future__ import annotations

import csv
import hashlib
import io
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import month_bounds

INDICATOR_ID = "company-insolvencies"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = "https://www.gov.uk/government/collections/company-insolvency-statistics-releases"
CSV_URL = (
    "https://assets.publishing.service.gov.uk/media/6ad0e2bb67af5c09d0479675/"
    "Long-Run_Series_in_CSV_Format_-_Company_Insolvency_Statistics_September_2026.csv"
)
OFFICIAL_RELEASE = "2026-10-20"

# Wide-column → (geography_code, geography_label, series_slug, prefer)
# Prefer seasonally adjusted totals for E&W where published; NSA for SC/NI.
SERIES_COLS: dict[str, tuple[str, str, str]] = {
    "total_ew_sa": ("E92000001+W92000004", "England and Wales", "total-sa"),
    "total_ew_nsa": ("E92000001+W92000004", "England and Wales", "total-nsa"),
    "compliq_ew_sa": ("E92000001+W92000004", "England and Wales", "compulsory-liquidation-sa"),
    "cvl_ew_sa": ("E92000001+W92000004", "England and Wales", "cvl-sa"),
    "admin_ew_sa": ("E92000001+W92000004", "England and Wales", "administration-sa"),
    "total_sc_nsa": ("S92000003", "Scotland", "total-nsa"),
    "compliq_sc_nsa": ("S92000003", "Scotland", "compulsory-liquidation-nsa"),
    "cvl_sc_nsa": ("S92000003", "Scotland", "cvl-nsa"),
    "admin_sc_nsa": ("S92000003", "Scotland", "administration-nsa"),
    "total_ni_nsa": ("N92000002", "Northern Ireland", "total-nsa"),
    "compliq_ni_nsa": ("N92000002", "Northern Ireland", "compulsory-liquidation-nsa"),
    "cvl_ni_nsa": ("N92000002", "Northern Ireland", "cvl-nsa"),
    "admin_ni_nsa": ("N92000002", "Northern Ireland", "administration-nsa"),
}


def _parse_value(raw: str) -> float | None:
    text = (raw or "").strip()
    if not text or text in {"[z]", "[x]", "[c]", ":"}:
        return None
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


class CompanyInsolvenciesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Company insolvencies",
            sector="economy-public-finance",
            publisher="Insolvency Service",
            source_url=LANDING,
            series_id="company-insolvency-long-run",
            geography="England and Wales / Scotland / Northern Ireland (separate)",
            frequency="monthly",
            unit="company insolvency count",
            definition=(
                "Formal company insolvencies by nation and procedure. "
                "England and Wales is not the United Kingdom. "
                "Distinct from ONS business demography deaths."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.company_insolvencies",
            curated_path="curated/observations.csv",
            update_cadence="monthly (Insolvency Service)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Melt long-run wide CSV columns into observations; "
                "series=<procedure-adjustment>; geography per nation."
            ),
            revision_notes=f"Long-run CSV September 2026 release ({OFFICIAL_RELEASE}).",
            caveats=(
                "Do not equate insolvencies with enterprise deaths. "
                "Do not invent a UK total by summing nations/procedures."
            ),
            related_indicator_ids=["business-demography"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/company-insolvencies-long-run.csv"
        dest = self.data_root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(CSV_URL, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as resp:
            dest.write_bytes(resp.read())
            status = int(getattr(resp, "status", 200) or 200)
            ctype = resp.headers.get("Content-Type", "text/csv")
        return [
            RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                content_type=ctype,
                official_release_date=OFFICIAL_RELEASE,
                http_status=status,
                source_url=CSV_URL,
            )
        ]

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        text = (self.data_root / evidence[0].path).read_text(encoding="utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        out: list[Observation] = []
        for row in reader:
            try:
                year = int(row["year"])
                month = int(row["month"])
            except (KeyError, ValueError) as exc:
                raise ValueError(f"Bad year/month in row: {row}") from exc
            start, end = month_bounds(year, month)
            for col, (geo_code, geo_label, series) in SERIES_COLS.items():
                if col not in row:
                    continue
                value = _parse_value(row[col])
                if value is None:
                    continue
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=geo_code,
                        geography_label=geo_label,
                        value=value,
                        unit="company insolvency count",
                        observation_status="final",
                        source_version=f"Insolvency Service long-run {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={series}; category={series}; "
                            f"column={col}; monthly"
                        ),
                    )
                )
        if not out:
            raise ValueError("No insolvency observations parsed")
        out.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
        return mark_latest_months_provisional(
            out,
            months=1,
            group_key=lambda o: f"{o.geography_code}|{o.notes}",
        )


def main() -> None:
    connector = CompanyInsolvenciesConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Company insolvencies\n\n"
        "```bash\nuv run python -m economy.connectors.company_insolvencies\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()

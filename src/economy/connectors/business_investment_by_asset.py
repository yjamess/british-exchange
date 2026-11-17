"""ONS Business investment by asset — CVM SA quarterly asset breakdown.

Companion to headline ``business-investment`` (NPEL). Asset columns:
Transport (EDOH), ICT & other machinery (EDOP), Other buildings (EDQZ),
Intellectual property products (EDRA). CVM components need not sum outside
the reference year.
"""

from __future__ import annotations

import hashlib
import re
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import quarter_bounds

INDICATOR_ID = "business-investment-by-asset"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/"
    "businessinvestmentbyasset"
)
FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/"
    "businessinvestmentbyasset/current/businessinvestmentbyasset.xlsx"
)
OFFICIAL_RELEASE = "2026-09-30"

ASSETS = (
    ("NPEL", "total", "Business investment total"),
    ("EDOH", "transport", "Transport equipment"),
    ("EDOP", "ict-machinery", "ICT equipment and other machinery and equipment"),
    ("EDQZ", "buildings", "Other buildings and structures"),
    ("EDRA", "ipp", "Intellectual property products"),
)


def _download(url: str, dest: Path) -> tuple[int, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())
        return int(getattr(resp, "status", 200) or 200), resp.headers.get(
            "Content-Type", "application/octet-stream"
        )


def _parse_quarter(label: object) -> tuple[str, str] | None:
    text = str(label).strip()
    m = re.match(r"^(\d{4})\s*Q([1-4])$", text, re.I)
    if not m:
        return None
    return quarter_bounds(int(m.group(1)), int(m.group(2)))


class BusinessInvestmentByAssetConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Business investment by asset",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="NPEL/EDOH/EDOP/EDQZ/EDRA",
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit="£ million chained volume, SA (ref year 2024)",
            definition=(
                "UK business investment CVM SA by asset: transport, ICT & other "
                "machinery, other buildings & structures, intellectual property "
                "products, plus the NPEL total. Excludes dwellings and government "
                "capital expenditure."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.business_investment_by_asset",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS Business investment)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download businessinvestmentbyasset.xlsx; read CVM_SA_(Quarterly) "
                "levels table; series=<CDID>; category=<asset-slug>."
            ),
            revision_notes=f"Workbook {OFFICIAL_RELEASE}; CVM ref year 2024.",
            caveats=(
                "CVM asset components need not sum to NPEL outside the reference year. "
                "Headline total should match Ready business-investment when same vintage."
            ),
            related_indicator_ids=["business-investment", "business-investment-by-industry"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/businessinvestmentbyasset.xlsx"
        dest = self.data_root / relative
        status, ctype = _download(FILE_URL, dest)
        return [
            RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                content_type=ctype,
                official_release_date=OFFICIAL_RELEASE,
                http_status=status,
                source_url=FILE_URL,
            )
        ]

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        path = self.data_root / evidence[0].path
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb["CVM_SA_(Quarterly)"]
        rows = list(ws.iter_rows(values_only=True))
        # Row index 3 = Series Identifier; data from row 4 until blank / second table.
        out: list[Observation] = []
        for row in rows[4:]:
            if not row or row[0] is None:
                break
            bounds = _parse_quarter(row[0])
            if not bounds:
                break
            start, end = bounds
            for col, (cdid, slug, label) in enumerate(ASSETS, start=1):
                raw = row[col] if col < len(row) else None
                if raw is None or raw == "":
                    continue
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=float(raw),
                        unit="£ million chained volume, SA",
                        observation_status="final",
                        source_version=f"ONS BI by asset {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={cdid.strip()}; category={slug}; "
                            f"asset={slug}; label={label}; quarterly; cvm-sa"
                        ),
                    )
                )
        wb.close()
        out.sort(key=lambda o: (o.period_start, o.notes))
        return mark_latest_months_provisional(
            out,
            months=1,
            group_key=lambda o: next(
                (
                    p.split("=", 1)[1]
                    for p in o.notes.split(";")
                    if p.strip().startswith("series=")
                ),
                "x",
            ),
        )


def main() -> None:
    connector = BusinessInvestmentByAssetConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Business investment by asset\n\n"
        "```bash\nuv run python -m economy.connectors.business_investment_by_asset\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()

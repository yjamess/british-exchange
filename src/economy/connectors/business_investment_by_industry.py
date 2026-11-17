"""ONS Business investment by industry — CVM SA quarterly industry totals.

Uses Table 4 (CVM SA) industry columns. Never claim CVM industries sum to NPEL.
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

INDICATOR_ID = "business-investment-by-industry"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/"
    "businessinvestmentbyindustryandasset"
)
FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/"
    "businessinvestmentbyindustryandasset/current/"
    "businessinvestmentbyindustryandasset.xlsx"
)
OFFICIAL_RELEASE = "2026-09-30"


def _download(url: str, dest: Path) -> tuple[int, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())
        return int(getattr(resp, "status", 200) or 200), resp.headers.get(
            "Content-Type", "application/octet-stream"
        )


def _slug(label: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    return text[:48] or "industry"


def _parse_quarter(label: object) -> tuple[str, str] | None:
    m = re.match(r"^(\d{4})\s*Q([1-4])$", str(label).strip(), re.I)
    if not m:
        return None
    return quarter_bounds(int(m.group(1)), int(m.group(2)))


class BusinessInvestmentByIndustryConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Business investment by industry",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="BI-by-industry-CVM-SA",
            geography="United Kingdom (K02000001)",
            frequency="quarterly",
            unit="£ million chained volume, SA",
            definition=(
                "UK business investment by industry section/group, chained volume "
                "measures, seasonally adjusted. From ONS Business investment by "
                "industry and asset Table 4."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.business_investment_by_industry",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (ONS Business investment)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download industry×asset workbook; parse Table_4_CVM_SA industry "
                "columns; notes series=industry; category=<slug>."
            ),
            revision_notes=f"Workbook {OFFICIAL_RELEASE}.",
            caveats="CVM industry components are not additive to the headline total.",
            related_indicator_ids=["business-investment", "business-investment-by-asset"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/businessinvestmentbyindustryandasset.xlsx"
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
        ws = wb["Table_4_CVM_SA"]
        rows = list(ws.iter_rows(values_only=True))
        # Find header row with industry labels (first cell mentioning Time / period)
        header_idx = None
        for i, row in enumerate(rows[:20]):
            if row and row[0] and "time" in str(row[0]).lower():
                header_idx = i
                break
            if row and any(isinstance(c, str) and "manufactur" in c.lower() for c in row[1:8]):
                header_idx = i
                break
        if header_idx is None:
            # Fallback: row 3 often titles, row with industries
            for i, row in enumerate(rows[:15]):
                if row and sum(1 for c in row[1:] if isinstance(c, str) and c.strip()) >= 5:
                    header_idx = i
                    break
        if header_idx is None:
            wb.close()
            raise ValueError("Industry header row not found in Table_4_CVM_SA")

        header = rows[header_idx]
        industries: list[tuple[int, str, str]] = []
        for col, label in enumerate(header[1:], start=1):
            if not isinstance(label, str) or not label.strip():
                continue
            if "note" in label.lower() and len(label) < 12:
                continue
            industries.append((col, _slug(label), label.strip()))

        out: list[Observation] = []
        for row in rows[header_idx + 1 :]:
            if not row or row[0] is None:
                # Skip blank separator rows inside multi-table sheets
                if out and len(out) > 20:
                    # stop after first table block ends
                    break
                continue
            bounds = _parse_quarter(row[0])
            if not bounds:
                if out:
                    break
                continue
            start, end = bounds
            for col, slug, label in industries:
                raw = row[col] if col < len(row) else None
                if raw is None or raw == "":
                    continue
                try:
                    value = float(raw)
                except (TypeError, ValueError):
                    continue
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=value,
                        unit="£ million chained volume, SA",
                        observation_status="final",
                        source_version=f"ONS BI by industry {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={slug}; category={slug}; industry={slug}; "
                            f"label={label}; quarterly; cvm-sa"
                        ),
                    )
                )
        wb.close()
        if not out:
            raise ValueError("No industry observations parsed")
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
    connector = BusinessInvestmentByIndustryConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Business investment by industry\n\n"
        "```bash\nuv run python -m economy.connectors.business_investment_by_industry\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m, c)


if __name__ == "__main__":
    main()

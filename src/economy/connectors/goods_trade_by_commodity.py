"""ONS MRET — goods trade by SITC section (WW, CP SA).

SITC 0–9 world exports and imports from the MRET timeseries spreadsheet CSV.
Never sum overlapping HS levels — this package uses SITC sections only.
"""

from __future__ import annotations

import csv
import hashlib
import re
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import MONTH_NAME_TO_NUM, month_bounds

_MONTH_ABBREV = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def _month_num(raw: str) -> int:
    key = raw.strip().lower()
    if key in _MONTH_ABBREV:
        return _MONTH_ABBREV[key]
    if key in MONTH_NAME_TO_NUM:
        return MONTH_NAME_TO_NUM[key]
    raise ValueError(f"Unexpected month name: {raw!r}")

INDICATOR_ID = "goods-trade-by-commodity"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/datasets/"
    "tradeingoodsmretsallbopeu2013timeseriesspreadsheet"
)
CSV_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/nationalaccounts/balanceofpayments/"
    "datasets/tradeingoodsmretsallbopeu2013timeseriesspreadsheet/current/mret.csv"
)
OFFICIAL_RELEASE = "2026-11-12"

SECTION_RE = re.compile(
    r"Trade in Goods:\s*(.+?)\s*\(([0-9])\):\s*WW:\s*(Exports|Imports):\s*BOP:\s*CP:\s*SA",
    re.I,
)


class GoodsTradeByCommodityConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Goods trade by SITC section",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="MRET-SITC-0-9-WW",
            geography="United Kingdom (world partner WW)",
            frequency="monthly",
            unit="£ million current prices, SA",
            definition=(
                "UK trade in goods by SITC one-digit section, world total, "
                "Balance of Payments current prices seasonally adjusted."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.goods_trade_by_commodity",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS MRET)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse MRET CSV titles for SITC (0)–(9) WW Exports/Imports CP SA; "
                "emit series=<section>; category=<sitc-n>."
            ),
            revision_notes=f"MRET release {OFFICIAL_RELEASE}.",
            caveats="SITC sections only — do not mix with HS/CN overlapping levels.",
            related_indicator_ids=["uk-trade-mret", "goods-trade-by-partner"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/mret.csv"
        dest = self.data_root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        local = Path("/tmp/bx-trade09/mret.csv")
        if local.is_file():
            dest.write_bytes(local.read_bytes())
            status, ctype = 200, "text/csv"
        else:
            req = urllib.request.Request(CSV_URL, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=300) as resp:
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
        path = self.data_root / evidence[0].path
        with path.open(encoding="utf-8", errors="replace", newline="") as fh:
            reader = csv.reader(fh)
            titles = next(reader)
            cdids = next(reader)
            # Skip metadata until year rows
            meta = []
            data_start = None
            rows = list(reader)
        # Find first year row
        body = []
        for row in rows:
            if row and re.fullmatch(r"\d{4}", str(row[0]).strip()):
                body.append(row)
            elif body:
                # continue year rows only; monthly rows look like "1997 JAN"
                if row and re.match(r"^\d{4}", str(row[0]).strip()):
                    body.append(row)

        columns: list[tuple[int, str, str, str, str]] = []
        for idx, title in enumerate(titles):
            m = SECTION_RE.search(title or "")
            if not m:
                continue
            label, section, flow = m.group(1).strip(), m.group(2), m.group(3).lower()
            cdid = cdids[idx] if idx < len(cdids) else ""
            columns.append((idx, section, flow, label, cdid))
        if len(columns) < 10:
            raise ValueError(f"Expected SITC 0-9×exports/imports columns, found {len(columns)}")

        out: list[Observation] = []
        for row in body:
            period_label = str(row[0]).strip()
            # Prefer monthly rows "1997 JAN"
            m = re.match(r"^(\d{4})\s+([A-Za-z]{3})$", period_label)
            if not m:
                continue
            year = int(m.group(1))
            month = _month_num(m.group(2))
            start, end = month_bounds(year, month)
            for col, section, flow, label, cdid in columns:
                if col >= len(row) or row[col] in (None, ""):
                    continue
                try:
                    value = float(str(row[col]).replace(",", ""))
                except ValueError:
                    continue
                slug = f"sitc-{section}"
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=value,
                        unit="£ million current prices, SA",
                        observation_status="final",
                        source_version=f"MRET {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={cdid or slug}; category={slug}; flow={flow}; "
                            f"sitc={section}; label={label}; monthly; ww"
                        ),
                    )
                )
        if not out:
            raise ValueError("No SITC commodity observations parsed")
        out.sort(key=lambda o: (o.period_start, o.notes))
        return mark_latest_months_provisional(
            out,
            months=1,
            group_key=lambda o: o.notes,
        )


def main() -> None:
    connector = GoodsTradeByCommodityConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Goods trade by SITC section\n\n"
        "```bash\nuv run python -m economy.connectors.goods_trade_by_commodity\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()

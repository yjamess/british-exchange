"""ONS BoP goods trade by partner country (all-countries SA workbook).

Monthly current-price seasonally adjusted exports and imports by partner.
Customs/HMRC figures are a different basis — never splice into this series.

Source: Trade in goods: all countries SA (September 2026 edition).
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
from economy.connectors.ons_timeseries import month_bounds

INDICATOR_ID = "goods-trade-by-partner"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/"
    "datasets/uktradeallcountriesseasonallyadjusted"
)
FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/nationalaccounts/balanceofpayments/"
    "datasets/uktradeallcountriesseasonallyadjusted/current/"
    "allcountriesseptember2026.xlsx"
)
OFFICIAL_RELEASE = "2026-11-12"

_MONTH = {
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


def _download(url: str, dest: Path) -> tuple[int, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())
        return int(getattr(resp, "status", 200) or 200), resp.headers.get(
            "Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )


def _parse_period(label: str) -> tuple[str, str] | None:
    text = str(label).strip()
    m = re.match(r"^(\d{4})([A-Za-z]{3})$", text)
    if not m:
        return None
    year = int(m.group(1))
    month = _MONTH.get(m.group(2).lower())
    if not month:
        return None
    return month_bounds(year, month)


def _sheet_observations(
    path: Path,
    sheet: str,
    flow: str,
) -> list[Observation]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet]
    rows = ws.iter_rows(values_only=True)
    header = None
    for row in rows:
        if row and row[0] == "Country Code":
            header = row
            break
    if header is None:
        wb.close()
        raise ValueError(f"{sheet}: Country Code header not found")

    periods: list[tuple[int, str, str]] = []
    for idx, label in enumerate(header[2:], start=2):
        if label is None:
            continue
        bounds = _parse_period(str(label))
        if bounds:
            periods.append((idx, bounds[0], bounds[1]))

    out: list[Observation] = []
    for row in rows:
        if not row or row[0] is None:
            continue
        code = str(row[0]).strip()
        name = str(row[1] or "").strip()
        if not code or code.lower() in {"country code", "total"}:
            continue
        # Keep ISO-like and area aggregates that ONS publishes (e.g. WW world).
        for col, start, end in periods:
            if col >= len(row):
                continue
            raw = row[col]
            if raw is None or raw == "":
                continue
            try:
                value = float(raw)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"{sheet} {code} {start}: bad value {raw!r}") from exc
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=code,
                    geography_label=name or code,
                    value=value,
                    unit="£ million current prices, SA",
                    observation_status="final",
                    source_version=f"ONS all-countries SA {OFFICIAL_RELEASE}",
                    notes=(
                        f"series={flow}; category={flow}; flow={flow}; "
                        f"partner={code}; basis=cp; monthly; "
                        f"source=ons-bop-goods-all-countries"
                    ),
                )
            )
    wb.close()
    return out


class GoodsTradeByPartnerConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Goods trade by partner country",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="all-countries-sa-goods",
            geography="Partner countries / areas (BoP goods)",
            frequency="monthly",
            unit="£ million current prices, SA",
            definition=(
                "UK trade in goods exports and imports by partner country, "
                "Balance of Payments basis, current prices, seasonally adjusted. "
                "Not HMRC Overseas Trade Statistics (customs / physical movement)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.goods_trade_by_partner",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS UK Trade all-countries SA)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download all-countries SA xlsx. Parse monthly exports/imports "
                "sheets; country code → geography; period labels YYYYMon → ISO months. "
                "Latest month provisional."
            ),
            revision_notes=f"Workbook release {OFFICIAL_RELEASE}.",
            caveats=(
                "BoP bilateral estimates; partners' own stats may differ. "
                "Goods only — services partner tables are a separate package."
            ),
            related_indicator_ids=["uk-trade-mret", "goods-trade-by-commodity"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/allcountriesseptember2026.xlsx"
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
        observations = [
            *_sheet_observations(path, "5. Monthly Exports", "exports"),
            *_sheet_observations(path, "6. Monthly Imports", "imports"),
        ]
        observations.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
        return mark_latest_months_provisional(
            observations,
            months=1,
            group_key=lambda o: f"{o.geography_code}|{o.notes}",
        )


def main() -> None:
    connector = GoodsTradeByPartnerConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Goods trade by partner (ONS BoP SA)\n\n"
        "```bash\nuv run python -m economy.connectors.goods_trade_by_partner\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n"
        f"- Release: {OFFICIAL_RELEASE}\n",
        encoding="utf-8",
    )
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

"""HMRC Regional Trade Statistics — nation quarterly goods trade (£bn)."""

from __future__ import annotations

import hashlib
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import quarter_bounds

INDICATOR_ID = "goods-trade-by-uk-region"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.gov.uk/government/statistics/"
    "uk-regional-trade-in-goods-statistics-fourth-quarter-october-to-december-2025"
)
OFFICIAL_RELEASE = "2026-03-19"

NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}

NATIONS = {
    "england": ("E92000001", "England", "Figure_1_Englands"),
    "wales": ("W92000004", "Wales", "Figure_2_Wales"),
    "scotland": ("S92000003", "Scotland", "Figure_3_Scotlands"),
    "northern-ireland": ("N92000002", "Northern Ireland", "Figure_4_Northern"),
}


def _cell_text(cell: ET.Element) -> str:
    parts = [t.text or "" for t in cell.iter(f"{{{NS['text']}}}p")]
    return " ".join(p.strip() for p in parts if p and p.strip()).strip()


def _parse_ods(path: Path) -> list[tuple[str, str, float]]:
    """Return list of (period_label, series_label, value_£bn)."""
    with zipfile.ZipFile(path) as zf:
        content_name = next(n for n in zf.namelist() if n.endswith("content.xml"))
        root = ET.fromstring(zf.read(content_name))
    rows: list[list[str]] = []
    for row in root.iter(f"{{{NS['table']}}}table-row"):
        cells: list[str] = []
        for cell in row.findall(f"{{{NS['table']}}}table-cell"):
            text = _cell_text(cell)
            rep = int(cell.attrib.get(f"{{{NS['table']}}}number-columns-repeated", "1"))
            cells.append(text)
            if 1 < rep < 30:
                cells.extend([""] * (rep - 1))
        if any(cells):
            rows.append(cells)
    if len(rows) < 3:
        return []
    # Find header row with 2021 Q1
    header_idx = next(
        (i for i, r in enumerate(rows) if any(re.match(r"^\d{4} Q[1-4]$", c) for c in r)),
        None,
    )
    if header_idx is None:
        return []
    header = rows[header_idx]
    periods = [(i, c) for i, c in enumerate(header) if re.match(r"^\d{4} Q[1-4]$", c)]
    out: list[tuple[str, str, float]] = []
    for row in rows[header_idx + 1 :]:
        label = (row[0] if row else "").strip()
        if not label or label.lower().startswith("source"):
            continue
        for col, period in periods:
            if col >= len(row) or not row[col]:
                continue
            try:
                value = float(row[col].replace(",", ""))
            except ValueError:
                continue
            out.append((period, label, value))
    return out


class GoodsTradeByUkRegionConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Goods trade by UK nation/region",
            sector="economy-public-finance",
            publisher="HMRC",
            source_url=LANDING,
            series_id="RTS-ITL1-nations",
            geography="England / Wales / Scotland / Northern Ireland",
            frequency="quarterly",
            unit="£ billion (RTS attribution)",
            definition=(
                "HMRC Regional Trade Statistics quarterly goods trade for UK "
                "nations. Employment-based / RTS attribution — not physical "
                "shipment origin proof."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.goods_trade_by_uk_region",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (HMRC RTS)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations="Parse nation ODS figure tables; £bn → observations.",
            revision_notes=f"RTS Q4 2025 release {OFFICIAL_RELEASE}.",
            caveats="RTS ≠ OTS/BoP. Attribution methodology labelled in Notes.",
            related_indicator_ids=["goods-trade-by-partner", "uk-trade-mret"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        req = urllib.request.Request(LANDING, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            html = resp.read().decode("utf-8", "replace")
        links = re.findall(
            r'href="(https://assets\.publishing\.service\.gov\.uk/[^"]+\.ods)"', html
        )
        evidence: list[RawEvidence] = []
        seen: set[str] = set()
        for url in links:
            name = url.split("/")[-1]
            key = next((k for k, (_, _, needle) in NATIONS.items() if needle in name), None)
            if key is None or key in seen:
                continue
            seen.add(key)
            relative = f"raw/{day.isoformat()}/{key}.ods"
            dest = self.data_root / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            r2 = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(r2, timeout=120) as resp:
                dest.write_bytes(resp.read())
                status = int(getattr(resp, "status", 200) or 200)
                ctype = resp.headers.get("Content-Type", "application/vnd.oasis.opendocument.spreadsheet")
            evidence.append(
                RawEvidence(
                    path=relative,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                    content_type=ctype,
                    official_release_date=OFFICIAL_RELEASE,
                    http_status=status,
                    source_url=url,
                )
            )
        if len(evidence) < 4:
            raise ValueError(f"Expected 4 nation ODS files, got {len(evidence)}")
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        out: list[Observation] = []
        for ev in evidence:
            path = self.data_root / ev.path
            nation_key = Path(ev.path).stem
            geo_code, geo_label, _ = NATIONS[nation_key]
            for period, series_label, value_bn in _parse_ods(path):
                m = re.match(r"^(\d{4}) Q([1-4])$", period)
                if not m:
                    continue
                start, end = quarter_bounds(int(m.group(1)), int(m.group(2)))
                slug = re.sub(r"[^a-z0-9]+", "-", series_label.lower()).strip("-")
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=geo_code,
                        geography_label=geo_label,
                        value=value_bn * 1000.0,  # £bn → £m for chart consistency
                        unit="£ million (RTS attribution)",
                        observation_status="final",
                        source_version=f"HMRC RTS {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={slug}; category={slug}; "
                            f"label={series_label}; quarterly; rts; "
                            f"source-unit=£bn"
                        ),
                    )
                )
        if not out:
            raise ValueError("No regional trade observations")
        return out


def main() -> None:
    connector = GoodsTradeByUkRegionConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Goods trade by UK region (HMRC RTS)\n\n"
        "```bash\nuv run python -m economy.connectors.goods_trade_by_uk_region\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()

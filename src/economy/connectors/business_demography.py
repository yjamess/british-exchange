"""ONS Business demography — UK births, deaths, active enterprises 2019–2024."""

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
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "business-demography"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/businessindustryandtrade/business/activitysizeandlocation/"
    "datasets/businessdemographyreferencetable"
)
OFFICIAL_RELEASE = "2025-11-20"


def _discover_file_url() -> str:
    req = urllib.request.Request(LANDING, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        text = resp.read().decode("utf-8", "replace")
    links = re.findall(r'href="(/file\?uri=[^"]+)"', text)
    if not links:
        raise ValueError("No demography workbook download link on landing page")
    return "https://www.ons.gov.uk" + links[0]


def _uk_value(ws, year_col_values: dict[int, int]) -> dict[int, float]:
    """Read UNITED KINGDOM / K02000001 row for year columns."""
    out: dict[int, float] = {}
    for row in ws.iter_rows(values_only=True):
        if not row:
            continue
        code = str(row[0] or "").strip()
        label = str(row[1] or "").strip().upper()
        if code != "K02000001" and label != "UNITED KINGDOM":
            continue
        for col, year in year_col_values.items():
            raw = row[col] if col < len(row) else None
            if raw is None or raw == "":
                continue
            out[year] = float(raw)
        break
    return out


def _year_cols(ws) -> dict[int, int]:
    """Map column index → year from header rows."""
    mapping: dict[int, int] = {}
    for row in ws.iter_rows(max_row=8, values_only=True):
        for col, cell in enumerate(row):
            if isinstance(cell, int) and 2000 <= cell <= 2100:
                mapping[col] = cell
            elif isinstance(cell, str) and re.fullmatch(r"20\d{2}", cell.strip()):
                mapping[col] = int(cell.strip())
    return mapping


class BusinessDemographyConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Business demography — births, deaths, active",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="business-demography-2024",
            geography="United Kingdom (K02000001) + regions in notes",
            frequency="annual",
            unit="enterprise counts (control rounded)",
            definition=(
                "ONS Business Demography counts of enterprise births, deaths and "
                "active enterprises. Active-in-year ≠ March UK Business stock. "
                "Not Companies House dissolutions or formal insolvencies."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.business_demography",
            curated_path="curated/observations.csv",
            update_cadence="annual (ONS Business demography)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download reference workbook; extract UK K02000001 from births/"
                "deaths/active geography tables for 2019–2024; series=births|deaths|active."
            ),
            revision_notes=f"Business Demography 2024 released {OFFICIAL_RELEASE}.",
            caveats=(
                "Rounded counts. Excludes unregistered businesses. "
                "Enterprise death ≠ insolvency ≠ Companies House dissolution."
            ),
            related_indicator_ids=["uk-business-enterprises", "company-insolvencies"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        url = _discover_file_url()
        relative = f"raw/{day.isoformat()}/businessdemography.xlsx"
        dest = self.data_root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=180) as resp:
            dest.write_bytes(resp.read())
            status = int(getattr(resp, "status", 200) or 200)
            ctype = resp.headers.get("Content-Type", "application/octet-stream")
        return [
            RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                content_type=ctype,
                official_release_date=OFFICIAL_RELEASE,
                http_status=status,
                source_url=url,
            )
        ]

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        path = self.data_root / evidence[0].path
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        # Geography tables by year group
        measure_sheets = {
            "births": ["Table 1.1a", "Table 1.1b", "Table 1.1c", "Table 1.1d"],
            "deaths": ["Table 2.1a", "Table 2.1b", "Table 2.1c", "Table 2.1d"],
            "active": ["Table 3.1a", "Table 3.1b", "Table 3.1c", "Table 3.1d"],
        }
        values: dict[tuple[str, int], float] = {}
        for measure, sheets in measure_sheets.items():
            for sn in sheets:
                ws = wb[sn]
                year_cols = _year_cols(ws)
                uk = _uk_value(ws, year_cols)
                for year, val in uk.items():
                    values[(measure, year)] = val
        wb.close()
        if not values:
            raise ValueError("No UK demography values parsed")

        out: list[Observation] = []
        for (measure, year), value in sorted(values.items()):
            start = f"{year:04d}-01-01"
            end = f"{year:04d}-12-31"
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code="K02000001",
                    geography_label="United Kingdom",
                    value=value,
                    unit="enterprise count",
                    observation_status="final",
                    source_version=f"ONS Business Demography 2024 ({OFFICIAL_RELEASE})",
                    notes=f"series={measure}; category={measure}; annual; measure={measure}",
                )
            )
        return out


def main() -> None:
    connector = BusinessDemographyConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# Business demography\n\n"
        "```bash\nuv run python -m economy.connectors.business_demography\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()

"""ONS FDI historical — inward/outward flows, positions, earnings."""

from __future__ import annotations

import hashlib
import re
import shutil
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "uk-fdi"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
OFFICIAL_RELEASE = "2026-07-01"

FILES = {
    "inward": (
        "https://www.ons.gov.uk/file?uri=/economy/nationalaccounts/balanceofpayments/"
        "datasets/inwardforeigndirectinvestmentinvolvingukcompanieshistoricaldata/current/"
        "inwardfdiinvolvingukcompanieshistoricaldata.xlsx"
    ),
    "outward": (
        "https://www.ons.gov.uk/file?uri=/economy/nationalaccounts/balanceofpayments/"
        "datasets/outwardforeigndirectinvestmentinvolvingukcompanieshistoricaldata/current/"
        "outwardfdiinvolvingukcompanieshistoricaldata.xlsx"
    ),
}

# Sheet → measure slug; total-row needles (must match the TOTAL line, not the title).
TOTAL_SHEETS = {
    "1.1": ("flows", ("total net fdi flows", "total net fdi")),
    "1.2": (
        "positions",
        (
            "total foreign fdi international investment position",
            "total uk fdi international investment position",
        ),
    ),
    "1.3": (
        "earnings",
        (
            "total net earnings from foreign direct investment",
        ),
    ),
}


def _download(url: str, dest: Path) -> tuple[int, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as resp:
        dest.write_bytes(resp.read())
        return int(getattr(resp, "status", 200) or 200), resp.headers.get(
            "Content-Type", "application/octet-stream"
        )


def _years_from_header(row: tuple[object, ...]) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for col, cell in enumerate(row):
        if isinstance(cell, int) and 1900 <= cell <= 2100:
            out.append((col, cell))
        elif isinstance(cell, str) and re.fullmatch(r"20\d{2}|19\d{2}", cell.strip()):
            out.append((col, int(cell.strip())))
    return out


def _num(raw: object) -> float | None:
    if raw is None or raw == "" or raw in {"x", "c", "z"}:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if text in {"x", "c", "z", "[c]", "[z]"}:
        return None
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _parse_totals(path: Path, direction: str) -> list[Observation]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out: list[Observation] = []
    for sheet, (measure, needles) in TOTAL_SHEETS.items():
        ws = wb[sheet]
        rows = list(ws.iter_rows(values_only=True))
        header = next((r for r in rows if r and str(r[0]).strip().lower() == "measure"), None)
        if header is None:
            continue
        years = _years_from_header(tuple(header))
        total_row = None
        for row in rows:
            label = str(row[0] or "").strip().lower()
            if "discontinuity" in label:
                continue
            # Title / notes cells also contain these phrases — require a real total line.
            if not label.startswith("total"):
                continue
            if any(n in label for n in needles):
                total_row = row
                break
        if total_row is None:
            continue
        for col, year in years:
            value = _num(total_row[col] if col < len(total_row) else None)
            if value is None:
                continue
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year:04d}-01-01",
                    period_end=f"{year:04d}-12-31",
                    geography_code="K02000001",
                    geography_label="United Kingdom",
                    value=value,
                    unit="£ million current prices",
                    observation_status="final",
                    source_version=f"ONS FDI historical {OFFICIAL_RELEASE}",
                    notes=(
                        f"series={direction}-{measure}; category={direction}-{measure}; "
                        f"direction={direction}; measure={measure}; annual; total"
                    ),
                )
            )
    # Country flows from sheet 2.1 (skip header / aggregate rows).
    SKIP_PARTNERS = {
        "",
        "all",
        "economy",
        "continent",
        "area",
        "world",
        "total",
        "europe",
        "africa",
        "asia",
        "americas",
        "oceania",
        "not allocated",
    }
    if "2.1" in wb.sheetnames:
        ws = wb["2.1"]
        rows = list(ws.iter_rows(values_only=True))
        header = next(
            (r for r in rows if r and str(r[0] or "").strip().lower() in {"continent", "area"}),
            None,
        )
        if header:
            years = []
            for col, cell in enumerate(header):
                if isinstance(cell, int) and 1900 <= cell <= 2100:
                    years.append((col, cell))
                elif isinstance(cell, str) and re.fullmatch(r"20\d{2}|19\d{2}", cell.strip()):
                    years.append((col, int(cell.strip())))
            for row in rows:
                economy = str(row[2] or "").strip() if len(row) > 2 else ""
                if economy.lower() in SKIP_PARTNERS:
                    continue
                slug = re.sub(r"[^a-z0-9]+", "-", economy.lower()).strip("-")[:40]
                if not slug:
                    continue
                for col, year in years:
                    value = _num(row[col] if col < len(row) else None)
                    if value is None:
                        continue
                    # Year-as-value rows are header ghosts — skip.
                    if abs(value - float(year)) < 1e-9:
                        continue
                    out.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=f"{year:04d}-01-01",
                            period_end=f"{year:04d}-12-31",
                            geography_code=slug.upper()[:12],
                            geography_label=economy,
                            value=value,
                            unit="£ million current prices",
                            observation_status="final",
                            source_version=f"ONS FDI historical {OFFICIAL_RELEASE}",
                            notes=(
                                f"series={direction}-flows-country; "
                                f"category={direction}-flows; "
                                f"direction={direction}; measure=flows; "
                                f"partner={slug}; annual"
                            ),
                        )
                    )
    wb.close()
    return out


class UkFdiConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="UK foreign direct investment",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=(
                "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/datasets/"
                "inwardforeigndirectinvestmentinvolvingukcompanieshistoricaldata"
            ),
            series_id="FDI-historical-directional",
            geography="United Kingdom + partner economies",
            frequency="annual",
            unit="£ million current prices",
            definition=(
                "Directional FDI flows, positions (stocks) and earnings, inward and "
                "outward. 10% voting-power threshold. Acquisition ≠ new plant or jobs."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.uk_fdi",
            curated_path="curated/observations.csv",
            update_cadence="annual (ONS FDI)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Pin inward+outward historical workbooks; extract total rows from "
                "tables 1.1–1.3 and country flows from 2.1."
            ),
            revision_notes=f"Historical release {OFFICIAL_RELEASE}; structural breaks noted pre-2007/2020.",
            caveats=(
                "Flows can be negative. Positions are stocks. "
                "Immediate vs ultimate ownership not split in these totals."
            ),
            related_indicator_ids=["business-investment"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        evidence: list[RawEvidence] = []
        for direction, url in FILES.items():
            relative = f"raw/{day.isoformat()}/fdi_{direction}.xlsx"
            dest = self.data_root / relative
            # Prefer local /tmp pin if present to avoid re-download
            local = Path(f"/tmp/bx-trade09/fdi_{'in' if direction=='inward' else 'out'}.xlsx")
            if local.is_file():
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(local, dest)
                status, ctype = 200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                status, ctype = _download(url, dest)
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
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        out: list[Observation] = []
        for ev in evidence:
            direction = "inward" if "inward" in ev.path or "fdi_in" in ev.path else "outward"
            out.extend(_parse_totals(self.data_root / ev.path, direction))
        if not out:
            raise ValueError("No FDI observations parsed")
        out.sort(key=lambda o: (o.period_start, o.notes, o.geography_code))
        return out


def main() -> None:
    connector = UkFdiConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# UK FDI\n\n```bash\nuv run python -m economy.connectors.uk_fdi\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()

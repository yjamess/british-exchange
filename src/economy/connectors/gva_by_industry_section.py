"""ONS GDP(O) low-level aggregates — GVA by SIC 2007 section.

Approach (beginner-friendly):
1. Download the official ONS workbook (GDP output approach – low-level aggregates).
2. Keep **SIC section** columns only (A–T) plus Total GVA — not divisions.
3. Emit current-price £m (sheet 1) and chained-volume £m (sheet 2a).
4. Put breakdowns in typed notes so Postgres/API can filter them.

Why current prices matter for Anatomy:
- Section shares of GVA should use **current prices** (they add up).
- Chained-volume £m are for volume stories; do **not** treat CVM shares as
  additive (ONS Blue Book / National Accounts practice).

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).

Do **not** fork Energy ``manufacturing-share-of-gva`` (L4NT/WGDP CVM weight %).
"""

from __future__ import annotations

import calendar
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import (
    Observation,
    mark_latest_months_provisional,
)
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "gva-by-industry-section"
SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/"
    "ukgdpolowlevelaggregates/current"
)
# Pin URI updates when ONS renames the latest file — check landing page.
SOURCE_FILE_URI = (
    "/economy/grossdomesticproductgdp/datasets/ukgdpolowlevelaggregates/"
    "current/gdplowlevelaggregates2026q3.xlsx"
)
SOURCE_FILE_URL = f"https://www.ons.gov.uk/file?uri={SOURCE_FILE_URI}"
RAW_NAME = "gdplowlevelaggregates.xlsx"
OFFICIAL_RELEASE = "2026-11-12"  # GDP first quarterly estimate release date
SECTIONS_JSON = "curated/sections.json"

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

# Single-letter SIC 2007 sections A–T (exclude multi-letter aggregates like B-E).
_SECTION_CODE = re.compile(r"^[A-T]$")
_QUARTER = re.compile(r"^(\d{4})\s*Q([1-4])\s*$", re.I)


@dataclass(frozen=True, slots=True)
class SectionColumn:
    """One SIC section (or total) column in the LLA workbook."""

    col_index: int
    cdid: str
    section: str  # "total" or A–T
    label: str


@dataclass(frozen=True, slots=True)
class MeasureSheet:
    """Which workbook sheet + measure kind we ingest."""

    sheet_name: str
    kind: str  # current_price | chained_volume
    unit: str


MEASURES: tuple[MeasureSheet, ...] = (
    MeasureSheet(
        sheet_name="1",
        kind="current_price",
        unit="£ million current prices, SA",
    ),
    MeasureSheet(
        sheet_name="2a",
        kind="chained_volume",
        unit="£ million chained volume, SA",
    ),
)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _clean_label(raw: object) -> str:
    text = str(raw or "").replace("\xa0", " ").strip()
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) >= 2:
        return lines[-1]
    return text


def _first_line(raw: object) -> str:
    text = str(raw or "").replace("\xa0", " ").strip()
    return text.splitlines()[0].strip() if text else ""


def parse_section_columns(labels: Sequence[object], codes: Sequence[object]) -> list[SectionColumn]:
    """Pick Total GVA + single-letter SIC sections from header rows."""
    out: list[SectionColumn] = []
    for i, (lab, code) in enumerate(zip(labels, codes, strict=False)):
        if lab is None or code is None:
            continue
        cdid = str(code).strip()
        if not cdid or cdid.lower() in {"no code", "nan"}:
            continue
        first = _first_line(lab)
        label = _clean_label(lab)
        if first.replace(" ", "") in {"TotalGVA", "Total"} or first == "Total GVA":
            out.append(SectionColumn(i, cdid, "total", "Total GVA"))
            continue
        if _SECTION_CODE.match(first):
            out.append(SectionColumn(i, cdid, first, label or first))
    if not any(c.section == "total" for c in out):
        raise ValueError("Total GVA column missing from LLA header")
    letters = {c.section for c in out if c.section != "total"}
    missing = [s for s in "ABCDEFGHIJKLMNOPQRST" if s not in letters]
    if missing:
        raise ValueError(f"Missing SIC section columns: {missing}")
    return out


def _period_bounds(period_raw: object) -> tuple[str, str, str]:
    """Return (period_start, period_end, grain) for annual year or ``YYYY Qn``."""
    if isinstance(period_raw, (int, float)) and not isinstance(period_raw, bool):
        year = int(period_raw)
        return f"{year:04d}-01-01", f"{year:04d}-12-31", "annual"
    text = str(period_raw or "").strip()
    if re.fullmatch(r"\d{4}", text):
        year = int(text)
        return f"{year:04d}-01-01", f"{year:04d}-12-31", "annual"
    match = _QUARTER.match(text)
    if not match:
        raise ValueError(f"Unexpected LLA period: {period_raw!r}")
    year = int(match.group(1))
    quarter = int(match.group(2))
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end, "quarterly"


def _as_float(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if text in {"", "-", "..", "…", "x", "X"}:
        return None
    return float(text)


def parse_measure_sheet(
    path: Path,
    measure: MeasureSheet,
    *,
    source_version: str,
) -> tuple[list[SectionColumn], list[Observation]]:
    """Parse one LLA measure sheet into section columns + observations."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        if measure.sheet_name not in wb.sheetnames:
            raise ValueError(f"Missing sheet {measure.sheet_name!r} in {path.name}")
        ws = wb[measure.sheet_name]
        header_rows = list(ws.iter_rows(min_row=5, max_row=6, values_only=True))
        if len(header_rows) < 2:
            raise ValueError(f"Sheet {measure.sheet_name} missing header rows")
        columns = parse_section_columns(header_rows[0], header_rows[1])
        observations: list[Observation] = []
        for row in ws.iter_rows(min_row=7, values_only=True):
            if row is None or row[0] is None:
                continue
            try:
                period_start, period_end, grain = _period_bounds(row[0])
            except ValueError:
                # Skip footnotes / blank trailers.
                continue
            for col in columns:
                value = _as_float(row[col.col_index] if col.col_index < len(row) else None)
                # Typed dims (docs/connector-contract.md): series= section letter
                # (or total); kind= → dimensions.category for current_price /
                # chained_volume. CDID stays in notes as cdid= for provenance.
                notes = (
                    f"series={col.section}; cdid={col.cdid}; "
                    f"section_name={col.label}; kind={measure.kind}; "
                    f"grain={grain}"
                )
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit=measure.unit,
                        observation_status="missing" if value is None else "final",
                        source_version=source_version,
                        notes=notes,
                    )
                )
    finally:
        wb.close()
    return columns, observations


def sections_catalog(columns: Sequence[SectionColumn], *, kind: str) -> list[dict[str, str]]:
    """Stable section list for UI / Notes (one measure's CDIDs)."""
    return [
        {
            "section": c.section,
            "label": c.label,
            "cdid": c.cdid,
            "kind": kind,
        }
        for c in columns
    ]


class GvaByIndustrySectionConnector(Connector):
    """National GVA by SIC section from ONS GDP(O) low-level aggregates."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="GVA by industry section (SIC 2007)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="GDP(O) LLA · SIC sections A–T · KKP5 family",
            geography="United Kingdom (K02000001)",
            frequency="annual+quarterly",
            unit="£ million (current prices SA; chained volume SA)",
            definition=(
                "UK output gross value added (GVA) by SIC 2007 section from the "
                "ONS GDP output approach low-level aggregates workbook. Stores "
                "section totals A–T plus Total GVA in current prices (£m, SA) "
                "and chained volume (£m, SA). Current-price levels are suitable "
                "for additive industry shares; chained-volume levels are not "
                "strictly additive. Figures are output GVA and are not balanced "
                "to income/expenditure GVA. Not GDP at market prices."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.gva_by_industry_section",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (with GDP first estimate / QNA)",
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/p/4186547176858181a65bd3ad760c924a"
            ),
            transformations=(
                "Download ONS gdplowlevelaggregates xlsx. From sheet 1 (current "
                "prices £m SA) and sheet 2a (CVM £m SA), keep Total GVA + "
                "single-letter SIC sections A–T only. Map annual years and "
                "YYYY Qn to ISO quarter/year bounds. Notes carry series=section "
                "(A–T|total), cdid, section_name, kind→category, grain. "
                "Latest valued period per section×kind marked provisional."
            ),
            revision_notes=(
                "Revises with each GDP first estimate and QNA; Blue Book changes "
                "industry structure occasionally (see workbook Cover_sheet). "
                "Pin the dated xlsx under raw/<date>/; compare checksums."
            ),
            caveats=(
                "Do not sum chained-volume section £m as if they equal Total "
                "GVA. Do not treat this as regional GVA (Regions owns "
                "gva-by-uk-nation-and-region). Do not fork Energy "
                "manufacturing-share-of-gva (L4NT CVM weights). Low-level "
                "series can be volatile — prefer section aggregates."
            ),
            related_indicator_ids=[
                "real-gdp",
                "manufacturing-share-of-gva",
                "gva-by-uk-nation-and-region",
            ],
            open_questions=[
                "Should Anatomy also pin sheet 4 CVM weights (parts per thousand) "
                "as a third kind for composition that matches GDP(O) indexing?",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        """Download the LLA workbook into raw/<YYYY-MM-DD>/."""
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/{RAW_NAME}"
        result = self.fetch_url(SOURCE_FILE_URL, relative)
        return RawEvidence(
            path=result.evidence.path,
            retrieved_at=result.evidence.retrieved_at,
            checksum_sha256=result.evidence.checksum_sha256,
            content_type=result.evidence.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE,
            http_status=result.evidence.http_status,
            source_url=SOURCE_FILE_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(raw_path)
        source_version = f"GDP(O) LLA {OFFICIAL_RELEASE}"
        all_obs: list[Observation] = []
        catalog: dict[str, Any] = {
            "source": SOURCE_LANDING_URL,
            "release_date": OFFICIAL_RELEASE,
            "measures": {},
        }
        for measure in MEASURES:
            columns, obs = parse_measure_sheet(
                raw_path, measure, source_version=source_version
            )
            catalog["measures"][measure.kind] = {
                "sheet": measure.sheet_name,
                "unit": measure.unit,
                "sections": sections_catalog(columns, kind=measure.kind),
            }
            all_obs.extend(obs)

        # Write section catalogue beside curated CSV (Orchestrator UI later).
        catalog_path = self.data_root / SECTIONS_JSON
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        catalog_path.write_text(
            json.dumps(catalog, indent=2) + "\n", encoding="utf-8"
        )

        def _section_kind(obs: Observation) -> str:
            """Group annual+quarterly together so only the latest period is provisional."""
            parts = {
                p.split("=", 1)[0].strip(): p.split("=", 1)[1].strip()
                for p in obs.notes.split(";")
                if "=" in p
            }
            # series= holds the SIC section letter (or total).
            return f"{parts.get('series', '')}|{parts.get('kind', '')}"

        return mark_latest_months_provisional(
            all_obs,
            months=1,
            group_key=_section_kind,
        )


def main() -> None:
    """Fetch → transform → write hand-off for gva-by-industry-section."""
    connector = GvaByIndustrySectionConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"sections: {connector.data_root / SECTIONS_JSON}")


if __name__ == "__main__":
    main()

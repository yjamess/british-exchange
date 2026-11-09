"""DESNZ historical UK indigenous crude oil production (annual, million tonnes).

Approach (plain language):
1. Prefer the pinned .xls under data/energy/crude-oil-production/raw/ (immutable).
2. Parse sheet "Production, Imports & Exports" → Indigenous production Total.
3. Convert thousand tonnes → million tonnes (÷1000) so the unit matches
   historical-coal-production and DUKES Chapter 3 narrative.
4. Write curated CSV + manifest via Connector.write_hand_off.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing sheets / unexpected headers; never invent numbers.
- xlrd for legacy .xls (https://xlrd.readthedocs.io/) — openpyxl does not open .xls.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import xlrd

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "crude-oil-production"
UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-07/Oil_Production_Trade_since_1890.xls"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "crude-oil-and-petroleum-production-imports-and-exports"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a69e3a116bc92f51e1a4315/Oil_Production___Trade_since_1890.xls"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "DESNZ_Oil_Production_Trade_since_1890_2026"

SHEET = "Production, Imports & Exports"
#: Row indices are 0-based (xlrd). Header layout verified against the 2026 pin.
HEADER_YEAR_ROW = 3
HEADER_DETAIL_ROW = 4
DATA_START_ROW = 5
COL_YEAR = 0
COL_INDIGENOUS_TOTAL = 2
UNIT = "million tonnes"
THOUSAND_TONNES_TO_MT = 1000.0


def _assert_headers(sheet: xlrd.sheet.Sheet) -> None:
    """Fail loudly if DESNZ reorders columns in a later release."""
    indigenous = str(sheet.cell_value(HEADER_YEAR_ROW, COL_INDIGENOUS_TOTAL)).strip()
    total = str(sheet.cell_value(HEADER_DETAIL_ROW, COL_INDIGENOUS_TOTAL)).strip()
    if "indigenous production" not in indigenous.casefold():
        raise ValueError(
            f"Expected Indigenous production header at col {COL_INDIGENOUS_TOTAL}; "
            f"got {indigenous!r}"
        )
    if total.casefold() != "total":
        raise ValueError(
            f"Expected Total under Indigenous production; got {total!r}"
        )


def parse_indigenous_crude_production_mt(workbook_path: Path) -> list[Observation]:
    """Parse Indigenous production Total → annual UK observations (million tonnes)."""
    book = xlrd.open_workbook(workbook_path)
    if SHEET not in book.sheet_names():
        raise ValueError(
            f"Expected sheet {SHEET!r} in {workbook_path.name}; "
            f"got {book.sheet_names()}"
        )
    sheet = book.sheet_by_name(SHEET)
    _assert_headers(sheet)

    observations: list[Observation] = []
    for row_idx in range(DATA_START_ROW, sheet.nrows):
        year_raw = sheet.cell_value(row_idx, COL_YEAR)
        if not isinstance(year_raw, (int, float)) or year_raw == "":
            continue
        year = int(year_raw)
        if year < 1800 or year > 2100:
            continue

        total_raw = sheet.cell_value(row_idx, COL_INDIGENOUS_TOTAL)
        if total_raw in ("", None):
            # Pre-production years are blank in the publisher file — omit, do not invent 0.
            continue
        if not isinstance(total_raw, (int, float)):
            raise ValueError(
                f"Non-numeric Indigenous production Total at year {year}: {total_raw!r}"
            )

        # Publisher stores thousand tonnes; ÷1000 → Mt. Round to 6 dp so IEEE
        # float noise (e.g. 30657.8/1000) does not litter the curated CSV.
        value_mt = round(float(total_raw) / THOUSAND_TONNES_TO_MT, 6)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=f"{year:04d}-01-01",
                period_end=f"{year:04d}-12-31",
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=value_mt,
                unit=UNIT,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=(
                    "measure=indigenous_production_total; "
                    "source_unit=thousand_tonnes; "
                    "fuel=Crude oil"
                ),
            )
        )

    if not observations:
        raise ValueError(f"No indigenous production rows parsed from {workbook_path}")
    return observations


class CrudeOilProductionConnector(Connector):
    """DESNZ long-run UK indigenous crude oil production (annual)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Crude oil production",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "Crude oil and petroleum: production, imports and exports "
                "1890–2025 — Indigenous production Total"
            ),
            geography="UK (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "UK indigenous crude oil production (Total), calendar years, from the "
                "DESNZ historical crude oil and petroleum workbook. Publisher values "
                "are thousand tonnes; curated values are million tonnes (÷1000). "
                "Covers the Extraction Century / North Sea production national total. "
                "Distinct from primary-energy-production fuel=Oil (Mtoe, ET 1.1) and "
                "from field-level NSTA production."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.crude_oil_production",
            curated_path="curated/observations.csv",
            update_cadence="Annual — with DUKES (late July)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/411654717685812d92a6d647e28cd8a3",
            transformations=(
                "Parse sheet 'Production, Imports & Exports'. Take Indigenous "
                "production Total column (thousand tonnes). Divide by 1000 → "
                "million tonnes. Emit one Observation per calendar year with a "
                "numeric Total. Blank pre-production years are omitted (not zeroed). "
                "Landward, feedstocks, imports, exports, and oil-product columns "
                "are not ingested in this hand-off."
            ),
            caveats=(
                "Sources sheet: years 1890–1920 include some extrapolated product "
                "trade; indigenous production Total begins later (~1920). Through "
                "1962 indigenous production includes shale oil. Do not fabricate "
                "national totals from incomplete NSTA field maps. Unit conversion "
                "thousand tonnes → million tonnes is documented; native thousand "
                "tonnes remain in the pinned raw file."
            ),
            revision_notes=(
                "Pinned Oil_Production_Trade_since_1890.xls (GOV.UK asset updated "
                "30 Jul 2026; retrieved 2026-11-07)."
            ),
            related_indicator_ids=[
                "primary-energy-production",
                "domestic-gas-production",
                "historical-coal-production",
                "energy-imports-and-exports",
            ],
            open_questions=[
                "Optional Gate 3: ingest Landward column; DUKES F.1 NGL split; "
                "NSTA field spatial atlas.",
            ],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        relative = PINNED_RAW_RELATIVE
        path = self.data_root / relative
        if not path.is_file():
            raise FileNotFoundError(
                f"Pinned raw workbook missing: {path}. Re-run fetch or restore pin."
            )
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.ms-excel",
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=None,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_indigenous_crude_production_mt(workbook)


def main() -> None:
    connector = CrudeOilProductionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)

    by_year = {int(obs.period_start[:4]): obs.value for obs in observations}
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(
        f"coverage: {observations[0].period_start[:4]}–"
        f"{observations[-1].period_start[:4]}"
    )
    for year in (1999, 2024, 2025):
        print(f"spot {year}: {by_year.get(year)} {UNIT}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

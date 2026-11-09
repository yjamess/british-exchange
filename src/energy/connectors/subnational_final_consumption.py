"""DESNZ subnational total final energy consumption (ktoe), 2005–2024.

Approach (plain language):
1. Pin the July 2026 workbook (LA structure as of April 2025).
2. One sheet per calendar year; rows are UK / region / LA / Unallocated.
3. Keep the four All-fuels sector columns (Domestic, Transport, Industrial-
   commercial, Total). Skip the DUKES comparison row (Code=DUKES).
4. notes ``sector=<id>``; geography_code is the published Code (GSS).

National ECUK C1 is a different product — do not stitch 1970–2004 into this series.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

PINNED_RAW_RELATIVE = "raw/2026-11-06/Subnational_total_final_consumption_2005_2024.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "total-final-energy-consumption-at-regional-and-local-authority-level-2005-to-2024"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a68c32f16bc92f51e1a4260/Subnational_total_final_consumption_2005_2024.xlsx"
)
OFFICIAL_RELEASE_DATE = "2026-07-30"
SOURCE_VERSION = "Subnational_total_final_2005_2024"
MISSING_MARKERS = {"[x]", "[z]", "..", "…", "c", "u"}

# Header labels after cleaning → Exchange sector ids.
SECTOR_COLUMNS: tuple[tuple[str, str], ...] = (
    ("All fuels: Domestic", "domestic"),
    ("All fuels: Transport", "transport"),
    ("All fuels: Industrial, Commercial and other", "industry-commercial"),
    ("All fuels: Total", "all"),
)


def _clean_header(raw: object) -> str:
    text = str(raw).strip().replace("\n", " ")
    while "[" in text and "]" in text:
        start = text.index("[")
        end = text.index("]", start)
        text = (text[:start] + text[end + 1 :]).strip()
    return " ".join(text.split())


def _parse_numeric(raw: object) -> tuple[float | None, ObservationStatus]:
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if not text or text.casefold() in MISSING_MARKERS:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "final"
    except ValueError:
        return None, "missing"


def parse_subnational_workbook(workbook_path: Path) -> list[Observation]:
    """Parse All-fuels columns for every year sheet into long observations."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    observations: list[Observation] = []
    try:
        year_sheets = [n for n in wb.sheetnames if n.isdigit()]
        if not year_sheets:
            raise ValueError(f"No year sheets in {workbook_path}")
        for sheet_name in year_sheets:
            year = int(sheet_name)
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))
            header_idx = None
            sector_cols: dict[str, int] = {}
            for i, row in enumerate(rows[:15]):
                if not row:
                    continue
                first = str(row[0] or "").strip().casefold()
                if first != "code":
                    continue
                header_idx = i
                for j, cell in enumerate(row):
                    if cell is None:
                        continue
                    label = _clean_header(cell)
                    for want, sector_id in SECTOR_COLUMNS:
                        if label == want or label.startswith(want):
                            sector_cols[sector_id] = j
                break
            if header_idx is None or "all" not in sector_cols:
                raise ValueError(f"{sheet_name}: All-fuels headers not found")

            period_start, period_end = f"{year:04d}-01-01", f"{year:04d}-12-31"
            for row in rows[header_idx + 1 :]:
                if not row or row[0] is None:
                    break
                code = str(row[0]).strip()
                if code.casefold() == "dukes":
                    continue
                region = str(row[1] or "").strip()
                la = str(row[2] or "").strip()
                if la == "All local authorities":
                    geo_label = region
                elif la == "Unallocated":
                    geo_label = f"{region} · Unallocated"
                else:
                    geo_label = f"{la} ({region})" if region else la
                for sector_id, col in sector_cols.items():
                    raw = row[col] if col < len(row) else None
                    value, status = _parse_numeric(raw)
                    observations.append(
                        Observation(
                            indicator_id="subnational-final-consumption",
                            period_start=period_start,
                            period_end=period_end,
                            geography_code=code,
                            geography_label=geo_label,
                            value=value,
                            unit="ktoe",
                            observation_status=status,
                            source_version=SOURCE_VERSION,
                            notes=f"sector={sector_id};la={la}",
                        )
                    )
    finally:
        wb.close()
    if not observations:
        raise ValueError(f"No subnational rows from {workbook_path}")
    return observations


class SubnationalFinalConsumptionConnector(Connector):
    """DESNZ subnational final consumption (All fuels) for Energy Geography."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "subnational-final-consumption")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "subnational-final-consumption"

    def ensure_pinned_raw(self) -> Path:
        dest = self.data_root / PINNED_RAW_RELATIVE
        if not dest.is_file():
            raise FileNotFoundError(
                f"Pin missing at {dest}. Download {PINNED_ASSET_URL} into that path."
            )
        return dest

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Subnational final energy consumption",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "Subnational total final energy consumption 2005–2024 (All fuels, ktoe)"
            ),
            geography="UK countries, English regions, local authorities (April 2025 structure)",
            frequency="annual",
            unit="ktoe",
            definition=(
                "Total final energy consumption (ktoe) at country, region and local "
                "authority level from DESNZ subnational statistics. One observation per "
                "geography × All-fuels sector (domestic, transport, industry-commercial, "
                "all) × year. DUKES comparison rows excluded. notes sector=<id>;la=<label>."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.subnational_final_consumption",
            curated_path="curated/observations.csv",
            update_cadence="Annual — typically each summer",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse year sheets 2005–2024; All-fuels Domestic/Transport/"
                "Industrial-Commercial/Total columns; skip Code=DUKES."
            ),
            caveats=(
                "Not the same as national ECUK C1 (starts 2005; different methods; "
                "transport excludes air; unallocated rows exist). LA geography is April "
                "2025 structure. Fuel detail columns exist in the pin but are out of "
                "scope for this indicator — All fuels only."
            ),
            revision_notes=(
                "Published 2026-07-30; residual and road transport revised back to 2005; "
                "electricity/gas revised back to 2015."
            ),
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_subnational_workbook(self.data_root / evidence[0].path)


def write_geography_pack(observations: list[Observation], dest: Path) -> Path:
    """Slim pack for the explorer: All-local-authority places × All-fuels sectors.

    Full LA rows stay in observations.csv; the API observation limit is 10k, so
    the Geography view reads this JSON from disk (same pattern as the REPD atlas).
    """
    import json

    # Nation / GB / England+Wales / English regions / Wales / Scotland / NI.
    keep_prefixes = ("K0", "E12", "E92", "W92", "S92", "N92")
    places: dict[str, dict] = {}
    for obs in observations:
        if "la=All local authorities" not in (obs.notes or ""):
            continue
        if obs.geography_code.startswith("E13"):  # Inner/Outer London — optional later
            continue
        if not obs.geography_code.startswith(keep_prefixes):
            continue
        if obs.value is None:
            continue
        sector = ""
        for part in (obs.notes or "").split(";"):
            if part.startswith("sector="):
                sector = part.split("=", 1)[1]
        if not sector:
            continue
        year = int(obs.period_start[:4])
        slot = places.setdefault(
            obs.geography_code,
            {"code": obs.geography_code, "label": obs.geography_label, "sectors": {}},
        )
        slot["sectors"].setdefault(sector, {})[str(year)] = obs.value

    payload = {
        "indicator_id": "subnational-final-consumption",
        "unit": "ktoe",
        "years": sorted({int(y) for p in places.values() for s in p["sectors"].values() for y in s}),
        "places": sorted(places.values(), key=lambda p: p["label"]),
        "note": (
            "All local authorities aggregates only (nations + English regions). "
            "Local-authority detail is in curated/authorities.json."
        ),
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest


def write_authorities_pack(observations: list[Observation], dest: Path) -> Path:
    """LA (and Unallocated) pack for place search — All-fuels sectors by year.

    Excludes All-local-authorities aggregates and the DUKES comparison row.
    """
    import json

    places: dict[str, dict] = {}
    for obs in observations:
        notes = obs.notes or ""
        if "la=All local authorities" in notes:
            continue
        if obs.value is None:
            continue
        la = ""
        sector = ""
        for part in notes.split(";"):
            if part.startswith("la="):
                la = part.split("=", 1)[1]
            if part.startswith("sector="):
                sector = part.split("=", 1)[1]
        if not sector:
            continue
        year = int(obs.period_start[:4])
        slot = places.setdefault(
            obs.geography_code,
            {
                "code": obs.geography_code,
                "label": obs.geography_label,
                "la": la,
                "sectors": {},
            },
        )
        slot["sectors"].setdefault(sector, {})[str(year)] = obs.value

    payload = {
        "indicator_id": "subnational-final-consumption",
        "unit": "ktoe",
        "years": sorted({int(y) for p in places.values() for s in p["sectors"].values() for y in s}),
        "places": sorted(places.values(), key=lambda p: p["label"]),
        "note": (
            "Local authority and Unallocated rows. Totals are not intensity — "
            "per-resident needs a linked population denominator (not shipped here)."
        ),
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest


def main() -> None:
    connector = SubnationalFinalConsumptionConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    geo_path = write_geography_pack(observations, connector.data_root / "curated" / "geography.json")
    auth_path = write_authorities_pack(
        observations, connector.data_root / "curated" / "authorities.json"
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"geography: {geo_path}")
    print(f"authorities: {auth_path}")


if __name__ == "__main__":
    main()

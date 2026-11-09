"""DESNZ DUKES 5.11 — UK major power producers station register (fossil + nuclear).

Approach (plain language):
1. Read the pinned DUKES 5.11 workbook (sheet ``5.11 Full list``).
2. Keep rows whose Technology is Fossil Fuel or Nuclear (the non-REPD fleet).
3. Convert OSGB X/Y to WGS84 for GB/Wales/Scotland; skip Northern Ireland
   (Irish Grid ≠ OSGB — wrong CRS would place points incorrectly).
4. Write observations (MW by primary fuel) + curated/stations.json for the map.

REPD covers renewables/storage planning. This connector is the complementary
fossil/nuclear major-power-producer list from the same DUKES chapter family.

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly; never invent coordinates.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA
from energy.geo.osgb import osgb_to_wgs84, parse_xy

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PINNED_RAW_RELATIVE = "raw/2026-11-06/DUKES_5.11.xlsx"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/statistics/"
    "electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6878e9f1ea3d250d0b5c2f2a/DUKES_5.11.xlsx"
)
OFFICIAL_RELEASE_DATE = "2025-07-31"
SOURCE_VERSION = "DUKES_5.11_2025"
SHEET_NAME = "5.11 Full list"
HEADER_MARKERS = ("Company Name", "Site Name", "Technology")
KEEP_TECHNOLOGIES = {"Fossil Fuel", "Nuclear"}
# Irish Grid / TM75 — do not treat as OSGB36.
SKIP_COUNTRIES = {"Northern Ireland"}


def _mw(raw: object) -> float | None:
    if raw is None:
        return None
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return None
    if v <= 0 or not (v == v):  # NaN check
        return None
    return v


def _family(technology: str, primary_fuel: str) -> str:
    if technology == "Nuclear" or primary_fuel == "Nuclear":
        return "nuclear"
    return "fossil"


def parse_stations(workbook_path: Path) -> tuple[list[Observation], dict[str, Any]]:
    """Return fuel MW observations + stations atlas for Fossil Fuel / Nuclear rows."""
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        if SHEET_NAME not in wb.sheetnames:
            raise ValueError(f"Expected sheet {SHEET_NAME!r} in {workbook_path.name}")
        rows = list(wb[SHEET_NAME].iter_rows(values_only=True))
    finally:
        wb.close()

    header_idx: int | None = None
    cols: dict[str, int] = {}
    for i, row in enumerate(rows[:40]):
        if not row:
            continue
        labels = [str(c).strip() if c is not None else "" for c in row]
        if all(any(m in lab for lab in labels) for m in HEADER_MARKERS):
            header_idx = i
            for j, lab in enumerate(labels):
                if lab:
                    # Strip footnote suffixes like " [note 30]"
                    key = lab.split("[")[0].strip()
                    cols[key] = j
            break
    if header_idx is None:
        raise ValueError(f"Header row not found in {SHEET_NAME}")

    required = ("Site Name", "Technology", "Primary Fuel", "InstalledCapacity (MW)", "X-Coordinate", "Y-Coordinate")
    missing = [c for c in required if c not in cols]
    if missing:
        raise ValueError(f"DUKES 5.11 missing columns: {missing}")

    by_fuel: dict[str, float] = defaultdict(float)
    stations: list[dict[str, Any]] = []
    points: list[dict[str, Any]] = []
    skipped_ni = 0
    skipped_xy = 0
    kept = 0

    for row in rows[header_idx + 1 :]:
        if not row:
            continue
        tech = str(row[cols["Technology"]] or "").strip()
        if tech not in KEEP_TECHNOLOGIES:
            continue
        name = str(row[cols["Site Name"]] or "").strip()
        if not name:
            continue
        mw = _mw(row[cols["InstalledCapacity (MW)"]])
        if mw is None:
            continue
        fuel = str(row[cols["Primary Fuel"]] or tech).strip() or tech
        country = str(row[cols["Country"]] or "").strip() if "Country" in cols else ""
        region = str(row[cols["Region"]] or "").strip() if "Region" in cols else ""
        company = str(row[cols.get("Company Name", cols["Site Name"])] or "").strip()
        site_code = ""
        if "DESNZ site code" in cols:
            site_code = str(row[cols["DESNZ site code"]] or "").strip()
        plant_type = str(row[cols["Type"]] or "").strip() if "Type" in cols else ""
        year_raw = row[cols["Year Commissioned"]] if "Year Commissioned" in cols else None
        year_commissioned: int | None = None
        if year_raw is not None and str(year_raw).strip().isdigit():
            year_commissioned = int(str(year_raw).strip())

        family = _family(tech, fuel)
        by_fuel[fuel] += mw
        kept += 1
        station: dict[str, Any] = {
            "id": site_code or f"{name}-{kept}",
            "name": name,
            "company": company,
            "technology": tech,
            "type": plant_type,
            "primary_fuel": fuel,
            "family": family,
            "mw": round(mw, 3),
            "country": country,
            "region": region,
            "year_commissioned": year_commissioned,
        }

        if country in SKIP_COUNTRIES:
            skipped_ni += 1
            stations.append(station)
            continue

        xy = parse_xy(row[cols["X-Coordinate"]], row[cols["Y-Coordinate"]])
        if xy is None:
            skipped_xy += 1
            stations.append(station)
            continue
        wgs = osgb_to_wgs84(xy[0], xy[1])
        if wgs is None:
            skipped_xy += 1
            stations.append(station)
            continue
        station["lon"] = round(wgs.lon, 5)
        station["lat"] = round(wgs.lat, 5)
        stations.append(station)
        points.append(
            {
                "id": station["id"],
                "name": name,
                "mw": station["mw"],
                "technology": tech,
                "primary_fuel": fuel,
                "region": region,
                "country": country,
                "operator": company,
                "year_commissioned": year_commissioned,
                "family": family,
                "lon": station["lon"],
                "lat": station["lat"],
            }
        )

    stations.sort(key=lambda s: -float(s["mw"]))
    points.sort(key=lambda s: -float(s["mw"]))

    status: ObservationStatus = "final"
    observations: list[Observation] = []
    for fuel, mw in sorted(by_fuel.items()):
        observations.append(
            Observation(
                indicator_id="uk-power-stations-dukes",
                period_start="2024-01-01",
                period_end="2024-12-31",
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=mw,
                unit="MW",
                observation_status=status,
                source_version=SOURCE_VERSION,
                notes=f"fuel={fuel}",
            )
        )

    atlas = {
        "source": "DESNZ DUKES 5.11 — Plant capacity of major power producers",
        "extract": SOURCE_VERSION,
        "retrieved_note": (
            "Fossil Fuel and Nuclear rows only from sheet 5.11 Full list. "
            "Complements REPD (renewables/storage). No operating coal plant remains on this list."
        ),
        "crs": "WGS84 from OSGB36 X/Y via Airy 1830 + Helmert (OS guide); NI skipped (Irish Grid)",
        "station_count": kept,
        "stations_with_coordinates": len(points),
        "skipped_northern_ireland": skipped_ni,
        "skipped_missing_or_invalid_xy": skipped_xy,
        "stations": stations,
        "points": points,
        "largest_stations": stations[:40],
    }
    return observations, atlas


class UkPowerStationsDukesConnector(Connector):
    """DUKES 5.11 fossil + nuclear major power producers for the Generation atlas."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "uk-power-stations-dukes")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "uk-power-stations-dukes"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK power stations — fossil and nuclear (DUKES 5.11)",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="DUKES 5.11 Full list — Fossil Fuel and Nuclear rows",
            geography="United Kingdom (major power producers; NI listed without OSGB points)",
            frequency="annual",
            unit="MW",
            definition=(
                "Installed capacity (MW) of major power producers on DUKES table 5.11 "
                "whose Technology is Fossil Fuel or Nuclear, summed by Primary Fuel. "
                "Not generation (TWh). Complements the REPD renewables planning register."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.uk_power_stations_dukes",
            curated_path="curated/observations.csv",
            update_cadence="Annual DUKES chapter 5 release",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Filter Technology ∈ {Fossil Fuel, Nuclear}. Sum InstalledCapacity (MW) "
                "by Primary Fuel → notes=fuel=<label>. Write curated/stations.json with "
                "OSGB→WGS84 points (Northern Ireland skipped: Irish Grid)."
            ),
            caveats=(
                "Major power producers only — not every licensed generator. "
                "Coordinates are generator-supplied OSGB; DESNZ does not verify them. "
                "Northern Ireland sites appear in the register but are not plotted "
                "(Irish Grid ≠ OSGB36). Post-Ratcliffe, the list has no coal plant."
            ),
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW_RELATIVE
        if not path.is_file():
            raise FileNotFoundError(f"Pinned DUKES 5.11 XLSX missing: {path}")
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
            raise ValueError("transform() requires at least one RawEvidence entry")
        path = self.data_root / evidence[0].path
        if not path.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {path}")
        observations, atlas = parse_stations(path)
        out = self.data_root / "curated" / "stations.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(atlas, indent=2) + "\n", encoding="utf-8")
        return observations


def main() -> None:
    connector = UkPowerStationsDukesConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    stations_path = connector.data_root / "curated" / "stations.json"
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"stations: {stations_path}")


if __name__ == "__main__":
    main()

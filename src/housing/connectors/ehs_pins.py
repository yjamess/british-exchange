"""Pinned English Housing Survey source files (shared by EHS connectors).

One staging folder per retrieval date: ``data/housing/_ehs_pin/<date>/``.
``retrieval.json`` beside the files records URL, retrieval timestamp,
checksum and HTTP ``Last-Modified`` for every pin, so evidence timestamps are
not re-stamped on every transform run. Each indicator then copies the files it
cites into its own ``raw/<date>/`` folder (immutable per-indicator evidence).

Refresh (downloads only pins that are missing locally):
  uv run python -m housing.connectors.ehs_pins
"""

from __future__ import annotations

import json
import shutil
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from britain_exchange.checksum import sha256_file
from britain_exchange.manifest import RawEvidence
from britain_exchange.paths import HOUSING_DATA

PIN_DATE = "2026-11-04"
PIN_ROOT = HOUSING_DATA / "_ehs_pin" / PIN_DATE
RETRIEVAL_JSON = PIN_ROOT / "retrieval.json"
ODS = "application/vnd.oasis.opendocument.spreadsheet"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
MEDIA = "https://assets.publishing.service.gov.uk/media"

COLLECTION_CONDITION = (
    "https://www.gov.uk/government/statistical-data-sets/dwelling-condition-and-safety"
)
COLLECTION_ENERGY = "https://www.gov.uk/government/statistical-data-sets/energy-performance"
ANNEX_QUALITY_2024_25 = (
    "https://www.gov.uk/government/statistics/"
    "annex-tables-for-english-housing-survey-2024-to-2025-headline-findings"
    "-on-housing-quality-and-energy-efficiency"
)
COLLECTION_SATISFACTION = (
    "https://www.gov.uk/government/statistical-data-sets/attitudes-and-satisfaction"
)
REPORT_PIQ_2024_25 = (
    "https://www.gov.uk/government/statistics/"
    "english-housing-survey-2024-to-2025-perceptions-and-impacts-of-housing-quality"
)
REPORT_WEATHER_2024_25 = (
    "https://www.gov.uk/government/statistics/"
    "english-housing-survey-2024-to-2025-weather-resilience-in-housing-fact-sheet"
)
REPORT_ADAPTATIONS_2019_20 = (
    "https://www.gov.uk/government/statistics/"
    "english-housing-survey-2019-to-2020-home-adaptations"
)
REPORT_ACCESSIBILITY_2018 = (
    "https://www.gov.uk/government/statistics/"
    "english-housing-survey-2018-accessibility-of-english-homes-fact-sheet"
)
LIVE_TABLES_RELEASE = "2026-07-09"  # collection public_updated_at (2024 dwelling year)
ANNEX_QUALITY_RELEASE = "2026-01-29"
PIQ_RELEASE = "2026-07-09"
WEATHER_RELEASE = "2026-07-09"
ADAPTATIONS_RELEASE = "2021-07-08"
ACCESSIBILITY_RELEASE = "2020-07-09"


@dataclass(frozen=True, slots=True)
class Pin:
    staging_name: str  # file name inside PIN_ROOT
    file_name: str  # canonical published file name (per-indicator raw copy)
    url: str
    official_release_date: str
    content_type: str = ODS


def _pin(staging: str, media_id: str, file_name: str, release: str, content_type: str = ODS) -> Pin:
    return Pin(staging, file_name, f"{MEDIA}/{media_id}/{file_name}", release, content_type)


PINS: dict[str, Pin] = {
    "DA3201": _pin("DA3201.ods", "6a4d9585024e48e52f26f4a1", "DA3201_Decent_Homes_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA3202": _pin("DA3202.ods", "6a4d959892f65594cb029998", "DA3202_Decent_Homes_-_areas.ods", LIVE_TABLES_RELEASE),
    "DT3101": _pin("DT3101.ods", "6a4d9688ed5ddb5c8626f497", "DT3101_Decent_Homes_trend.ods", LIVE_TABLES_RELEASE),
    "DA4101": _pin("DA4101.ods", "6a4d95bced5ddb5c8626f494", "DA4101_Health_and_safety_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA4102": _pin("DA4102.ods", "6a4d95d109605a87f4354512", "DA4102_Health_and_safety_-_areas.ods", LIVE_TABLES_RELEASE),
    "DA5101": _pin("DA5101.ods", "6a4d95f7ed5ddb5c8626f495", "DA5101_Damp_and_mould_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA5102": _pin("DA5102.ods", "6a4d961492f65594cb029999", "DA5102_Damp_and_mould_-_areas.ods", LIVE_TABLES_RELEASE),
    "DA7101": _pin("DA7101.ods", "6a4da4b1ed5ddb5c8626f4a0", "DA7101_Energy_performance_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA7102": _pin("DA7102.ods", "6a4da4c092f65594cb0299a1", "DA7102_Energy_performance_-_areas.ods", LIVE_TABLES_RELEASE),
    "CH1_QUALITY": _pin(
        "EHS_Ch1_Quality_annex.ods",
        "6978ebde1c24881f40a4d6cc",
        "2024-25_EHS_Headline_Report_Chapter_1_Housing_Quality_Annex_Tables.ods",
        ANNEX_QUALITY_RELEASE,
    ),
    "CH2_ENERGY": _pin(
        "EHS_Ch2_Energy_annex.ods",
        "6978ed0f5da1fd4ddea98c5b",
        "2024-25_EHS_Headline_Report_Chapter_2_Energy_Efficiency_Annex_Tables.ods",
        ANNEX_QUALITY_RELEASE,
    ),
    # --- Domain 07 wave 2 (2026-11-04): breakdowns, lived experience, access ---
    "DA6101": _pin("DA6101.ods", "6a4da45d92f65594cb0299a0", "DA6101_Heating_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA6102": _pin("DA6102.ods", "6a4da469ed5ddb5c8626f49f", "DA6102_Heating_-_areas.ods", LIVE_TABLES_RELEASE),
    "DA6201": _pin("DA6201.ods", "6a4da48209605a87f435451f", "DA6201_Insulation_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA6202": _pin("DA6202.ods", "6a4da4926a73e62ba102999a", "DA6202_Insulation_-_areas.ods", LIVE_TABLES_RELEASE),
    "DA5201": _pin("DA5201.ods", "6a4d963c92f65594cb02999a", "DA5201_Disrepair_and_electrics_-_dwellings.ods", LIVE_TABLES_RELEASE),
    "DA5202": _pin("DA5202.ods", "6a4d965992f65594cb02999b", "DA5202_Disrepair_and_electrics_-_areas.ods", LIVE_TABLES_RELEASE),
    "FT5421": _pin(
        "FT5421.ods",
        "6a4d9d536a73e62ba1029998",
        "FT5421_trend_in_satisfaction_with_the_way_landlord_carries_out_repairs_and_maintenance_by_tenure.ods",
        LIVE_TABLES_RELEASE,
    ),
    "PIQ_CH2": _pin(
        "EHS_PIQ_Ch2_annex.ods",
        "6a43af2e167a99cf0018d959",
        "Chapter_2_Annex_Tables_Perceptions_and_Impacts_of_Housing_Quality.ods",
        PIQ_RELEASE,
    ),
    "PIQ_CH3": _pin(
        "EHS_PIQ_Ch3_annex.ods",
        "6a43af9593349b85b718d95f",
        "Chapter_3_Annex_Tables_Perceptions_and_Impacts_of_Housing_Quality.ods",
        PIQ_RELEASE,
    ),
    "WEATHER": _pin(
        "EHS_Weather_resilient_annex.ods",
        "6a460ddb045e1108aaa5e921",
        "Weather_Resilient_Homes_Factsheet_Annex_Tables.ods",
        WEATHER_RELEASE,
    ),
    "ADAPT_1920": _pin(
        "EHS_Home_adaptations_2019-20_annex.ods",
        "60e5b73cd3bf7f568cde9062",
        "Home_Adaptations_Report_Annex_tables.ods",
        ADAPTATIONS_RELEASE,
    ),
    "ACCESS_2018": _pin(
        "EHS_Accessibility_2018_annex.xlsx",
        "5f044f42d3bf7f76939242da",
        "2018-19_EHS_Adaptations_and_Accessability_Annex_Tables.xlsx",
        ACCESSIBILITY_RELEASE,
        XLSX,
    ),
}


def _load_records() -> dict[str, dict[str, str]]:
    if RETRIEVAL_JSON.is_file():
        return json.loads(RETRIEVAL_JSON.read_text(encoding="utf-8"))
    return {}


def _save_records(records: dict[str, dict[str, str]]) -> None:
    RETRIEVAL_JSON.write_text(json.dumps(records, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _download(pin: Pin, target: Path) -> dict[str, str]:
    request = urllib.request.Request(pin.url, headers={"User-Agent": "british-exchange/ehs"})
    with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310 (gov.uk)
        target.write_bytes(response.read())
        last_modified = response.headers.get("Last-Modified", "")
        status = str(response.status)
    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "last_modified": last_modified,
        "http_status": status,
        "timestamp_basis": "download",
    }


def ensure_pins(keys: list[str] | None = None, *, download: bool = True) -> dict[str, dict[str, str]]:
    """Make sure each pin exists in staging and has a retrieval record."""
    PIN_ROOT.mkdir(parents=True, exist_ok=True)
    records = _load_records()
    for key in keys or list(PINS):
        pin = PINS[key]
        target = PIN_ROOT / pin.staging_name
        record = records.get(key)
        if not target.is_file():
            if not download:
                raise FileNotFoundError(target)
            record = _download(pin, target)
        elif record is None:
            # Pinned earlier in the day without a sidecar: keep the file's mtime.
            mtime = datetime.fromtimestamp(target.stat().st_mtime, tz=timezone.utc)
            record = {
                "retrieved_at": mtime.isoformat(),
                "last_modified": "",
                "http_status": "",
                "timestamp_basis": "file-mtime",
            }
        record = {
            **record,
            "url": pin.url,
            "file_name": pin.file_name,
            "checksum_sha256": sha256_file(target),
            "official_release_date": pin.official_release_date,
        }
        records[key] = record
    _save_records(records)
    return records


def pin_into(data_root: Path, keys: list[str]) -> list[RawEvidence]:
    """Copy pins into ``<data_root>/raw/<date>/`` and return their evidence."""
    records = ensure_pins(keys)
    dest_dir = data_root / "raw" / PIN_DATE
    dest_dir.mkdir(parents=True, exist_ok=True)
    evidence: list[RawEvidence] = []
    for key in keys:
        pin = PINS[key]
        source = PIN_ROOT / pin.staging_name
        dest = dest_dir / pin.file_name
        if not dest.is_file() or sha256_file(dest) != sha256_file(source):
            shutil.copy2(source, dest)
        record = records[key]
        status = record.get("http_status") or ""
        evidence.append(
            RawEvidence(
                path=f"raw/{PIN_DATE}/{pin.file_name}",
                retrieved_at=record["retrieved_at"],
                checksum_sha256=sha256_file(dest),
                content_type=pin.content_type,
                official_release_date=pin.official_release_date,
                http_status=int(status) if status.isdigit() else None,
                source_url=pin.url,
            )
        )
    return evidence


def main() -> None:
    records = ensure_pins()
    for key, record in records.items():
        print(f"{key}: {record['checksum_sha256'][:12]} {record['retrieved_at']} ({record['timestamp_basis']})")


if __name__ == "__main__":
    main()

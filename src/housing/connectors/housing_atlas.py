"""Build an experimental presentation bundle from already archived housing data.

This is a deterministic view export, not a new source ingestion or a Ready
indicator. Run with ``PYTHONPATH=src python -m housing.connectors.housing_atlas``.
The existing source archives and their retrieval timestamps are reused verbatim.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, TypedDict

import yaml

from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

Level = Literal["local", "region", "nation", "uk"]
Value = int | float | None


class Measure(TypedDict):
    id: str
    label: str
    unit: str


class Area(TypedDict):
    code: str
    name: str
    level: Level
    values: dict[str, list[Value]]


MEASURES: tuple[tuple[str, str, str, str], ...] = (
    ("average", "Average price", "GBP", "AveragePrice"),
    ("detached", "Detached", "GBP", "DetachedPrice"),
    ("semi-detached", "Semi-detached", "GBP", "SemiDetachedPrice"),
    ("terraced", "Terraced", "GBP", "TerracedPrice"),
    ("flat", "Flat or maisonette", "GBP", "FlatPrice"),
    ("new-build", "New build", "GBP", "NewPrice"),
    ("existing", "Existing home", "GBP", "OldPrice"),
    ("sales-volume", "Sales volume", "sales", "SalesVolume"),
)
LOCAL_PREFIXES = ("E06", "E07", "E08", "E09", "W06", "S12", "N09")
NATION_CODES = {"E92000001", "W92000004", "S92000003", "N92000002"}
EXCLUDED_PREFIXES = ("E10", "E11", "E13", "K03", "K04")
START_MONTH = "1995-01"
ROOT = HOUSING_DATA / "housing-atlas"
CAVEATS = [
    "Experimental view export; independent validation and registry/publication review are required before publication.",
    "Prices are nominal UK HPI mix-adjusted area estimates, not individual property valuations or asking prices.",
    "Geography codes are retained exactly as supplied in this release. Boundary versions must be matched by code; no name-based or approximate joins are permitted.",
    "Source series have different start and end dates. Null means no source value; it is never zero and is not interpolated or carried forward.",
    "Monthly rows for Northern Ireland do not imply independent monthly observations: Northern Ireland contributes quarterly data in the UK HPI.",
    "Recent UK HPI estimates are provisional and can revise. The compact export does not assign final status to individual observations.",
    "County, metropolitan-county, Inner/Outer London, Great Britain and England/Wales aggregates are excluded to avoid mixing overlapping areas into the local-authority layer.",
    "Sales volume counts transactions and has a different unit from prices. New-build, existing-home and sales-volume data can lag the latest average-price month.",
    "Annual price change must compare the same measure and geography exactly 12 calendar months apart; no comparison is available if either value is null.",
]


def digest(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def number(text: str) -> Value:
    if not text.strip():
        return None
    value = float(text.replace(",", ""))
    if not math.isfinite(value):
        raise ValueError(f"Non-finite source value: {text}")
    return int(value) if value.is_integer() else value


def level_for(code: str) -> Level | None:
    if code == "K02000001":
        return "uk"
    if code in NATION_CODES:
        return "nation"
    if code.startswith("E12"):
        return "region"
    if code.startswith(LOCAL_PREFIXES):
        return "local"
    if code.startswith(EXCLUDED_PREFIXES):
        return None
    raise ValueError(f"Unrecognised geography code: {code}")


def month_range(first: str, last: str) -> list[str]:
    first_y, first_m = map(int, first.split("-"))
    last_y, last_m = map(int, last.split("-"))
    return [
        f"{n // 12:04d}-{n % 12 + 1:02d}"
        for n in range(first_y * 12 + first_m - 1, last_y * 12 + last_m)
    ]


def load_source(package_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    package = HOUSING_DATA / package_id
    manifest_path = package / "manifest.yaml"
    manifest = yaml.safe_load(manifest_path.read_text())
    evidence = manifest["raw_evidence"][0]
    raw_path = package / evidence["path"]
    if digest(raw_path) != evidence["checksum_sha256"]:
        raise ValueError(f"Archive checksum differs from source manifest: {raw_path}")
    provenance = {
        "indicator_id": package_id,
        "manifest_path": str(manifest_path.relative_to(HOUSING_DATA.parent.parent)),
        "manifest_sha256": digest(manifest_path),
        "raw_path": str(raw_path.relative_to(HOUSING_DATA.parent.parent)),
        "raw_sha256": evidence["checksum_sha256"],
        "retrieved_at": evidence["retrieved_at"],
        "official_release_date": evidence["official_release_date"],
        "source_url": evidence["source_url"],
    }
    return manifest, provenance


def build_atlas() -> tuple[dict[str, Any], dict[str, Any]]:
    manifest, provenance = load_source("uk-average-house-price")
    raw_path = HOUSING_DATA.parent.parent / provenance["raw_path"]
    records: dict[str, dict[str, dict[str, Value]]] = {}
    metadata: dict[str, tuple[str, Level]] = {}
    excluded: dict[str, str] = {}
    last_month = START_MONTH
    with raw_path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            period = datetime.strptime(row["Date"], "%d/%m/%Y").strftime("%Y-%m")
            if period < START_MONTH:
                continue
            code, name = row["AreaCode"].strip(), row["RegionName"].strip()
            level = level_for(code)
            if level is None:
                excluded[code] = name
                continue
            if code in metadata and metadata[code] != (name, level):
                raise ValueError(f"Conflicting geography labels: {code}")
            metadata[code] = (name, level)
            periods = records.setdefault(code, {})
            if period in periods:
                raise ValueError(f"Duplicate source observation: {code}/{period}")
            periods[period] = {key: number(row[column]) for key, _, _, column in MEASURES}
            last_month = max(last_month, period)
    months = month_range(START_MONTH, last_month)
    areas: list[Area] = [
        {
            "code": code,
            "name": metadata[code][0],
            "level": metadata[code][1],
            "values": {
                key: [records[code].get(month, {}).get(key) for month in months]
                for key, _, _, _ in MEASURES
            },
        }
        for code in sorted(metadata)
    ]
    source = {
        "publisher": manifest["publisher"],
        "url": manifest["source_url"],
        "release": provenance["official_release_date"],
        "version": "UK-HPI-full-file-2026-08",
        "licence": manifest["licence"],
        "retrievedAt": provenance["retrieved_at"],
        "checksum": provenance["raw_sha256"],
    }
    atlas = {
        "months": months,
        "measures": [{"id": key, "label": label, "unit": unit} for key, label, unit, _ in MEASURES],
        "areas": areas,
        "source": source,
        "caveats": CAVEATS,
    }
    audit = {
        "source": provenance,
        "area_counts": dict(Counter(a["level"] for a in areas)),
        "excluded_areas": [{"code": code, "name": name} for code, name in sorted(excluded.items())],
        "months": {"first": months[0], "last": months[-1], "count": len(months)},
        "non_null_observations": sum(value is not None for area in areas for values in area["values"].values() for value in values),
        "null_observations": sum(value is None for area in areas for values in area["values"].values() for value in values),
    }
    return atlas, audit


def source_row_flags(path: Path, key: str) -> dict[str, str]:
    """Recover row-level flags omitted by the original curated connectors."""
    sheet = "LT_213_quarterly" if key == "completions" else "LT_104"
    rows = read_ods_sheet(path, sheet)
    header_name = "Period" if key == "completions" else "Date"
    header_index = next(i for i, row in enumerate(rows) if row and row[0].strip() == header_name)
    header = [cell.strip() for cell in rows[header_index]]
    notes_index = header.index("Notes")
    year_index = header.index("Year") if key == "tenure" else None
    flags: dict[str, str] = {}
    for row in rows[header_index + 1:]:
        if not row or not row[0].strip():
            continue
        if key == "completions":
            parts = row[0].strip().split()
            if len(parts) != 2 or not parts[0].isdigit() or parts[1] not in {"Q1", "Q2", "Q3", "Q4"}:
                continue
            month = 1 + (int(parts[1][1]) - 1) * 3
            period = f"{int(parts[0]):04d}-{month:02d}-01"
        else:
            assert year_index is not None
            if row[0].strip() != "31 March" or year_index >= len(row) or not row[year_index].strip().isdigit():
                continue
            period = row[year_index].strip()
        if period in flags:
            raise ValueError(f"Duplicate source flags: {key}/{period}")
        flags[period] = row[notes_index].strip() if notes_index < len(row) else ""
    return flags


def recovered_status(flags: str, fallback: str) -> str:
    """Missing cells stay missing; a provisional flag overrides revision."""
    if fallback == "missing":
        return fallback
    if "[p]" in flags.lower():
        return "provisional"
    if "[r]" in flags.lower():
        return "revised"
    return fallback


def build_topics() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    ids = {
        "tenure": "dwelling-stock-by-tenure",
        "completions": "housing-completions",
        "rent": "private-rental-price-index",
        "affordability": "house-price-to-earnings-ratio",
    }
    topics: dict[str, Any] = {"sources": {}}
    sources: list[dict[str, Any]] = []
    for key, package_id in ids.items():
        manifest, provenance = load_source(package_id)
        csv_path = HOUSING_DATA / package_id / manifest["curated_path"]
        provenance["curated_path"] = str(csv_path.relative_to(HOUSING_DATA.parent.parent))
        provenance["curated_sha256"] = digest(csv_path)
        sources.append(provenance)
        topics["sources"][key] = {
            "publisher": manifest["publisher"], "url": manifest["source_url"],
            "release": provenance["official_release_date"], "unit": manifest["unit"],
            "geography": manifest["geography"],
        }
        with csv_path.open(newline="") as handle:
            rows = list(csv.DictReader(handle))
        flags = source_row_flags(HOUSING_DATA.parent.parent / provenance["raw_path"], key) if key in {"tenure", "completions"} else {}
        if flags:
            provenance["source_row_flags"] = {period: value for period, value in flags.items() if value}
            provenance["status_recovery_note"] = (
                "Experimental bundle recovers original ODS Notes [p]/[r] omitted from canonical curated statuses. "
                "No source CSV was altered. Provisional takes precedence over revised; sourceFlags preserves both."
            )
        if key != "tenure":
            if key == "completions" and any(row["period_start"] not in flags for row in rows):
                raise ValueError("A curated completion period has no archived source flag row")
            topics[key] = [
                {
                    "period": row["period_start"], "value": number(row["value"]),
                    "status": recovered_status(flags.get(row["period_start"], ""), row["observation_status"]),
                    **({"sourceFlags": flags[row["period_start"]]} if flags.get(row["period_start"]) else {}),
                }
                for row in sorted(rows, key=lambda row: row["period_start"])
            ]
            if len({row["period"] for row in topics[key]}) != len(topics[key]):
                raise ValueError(f"Duplicate topic periods: {key}")
            continue
        by_year: dict[int, dict[str, Value]] = {}
        for row in rows:
            notes = dict(item.strip().split("=", 1) for item in row["notes"].split(";") if "=" in item)
            if notes.get("snapshot") != "31 March":
                continue
            year = int(row["period_start"][:4])
            tenure = notes["tenure"]
            if tenure in by_year.setdefault(year, {}):
                raise ValueError(f"Duplicate stock observation: {year}/{tenure}")
            by_year[year][tenure] = number(row["value"])
        required = ["owner-occupied", "private-rented", "local-authority", "private-registered-provider", "other-public-sector", "all-dwellings"]
        topics["tenure"] = []
        for year, values in sorted(by_year.items()):
            if str(year) not in flags:
                raise ValueError(f"No archived 31 March source flag row for {year}")
            if not all(values.get(tenure) is not None for tenure in required):
                continue
            social = sum(float(values[tenure]) for tenure in required[2:5])  # type: ignore[arg-type]
            topics["tenure"].append({
                "year": year, "owner": values["owner-occupied"],
                "privateRented": values["private-rented"], "social": social,
                "total": values["all-dwellings"],
                "status": "provisional" if "[p]" in flags.get(str(year), "").lower() else "final",
                **({"sourceFlags": flags[str(year)]} if flags.get(str(year)) else {}),
            })
    return topics, sources


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")


def write_measure_slices(atlas: dict[str, Any]) -> list[str]:
    """One-measure value files for the web map (~1MB each).

    Each file still lists every measure, so the map menu can offer them.
    Only ``areas`` is cut down to the selected series.
    """
    paths: list[str] = []
    months = atlas["months"]
    source = atlas.get("source")
    catalogue = atlas.get("measures") or [
        {"id": key, "label": label, "unit": unit} for key, label, unit, _column in MEASURES
    ]
    for measure_id, label, unit, _column in MEASURES:
        slim = {
            "months": months,
            "measures": catalogue,
            "measure": measure_id,
            "source": source,
            "caveats": atlas.get("caveats") or [],
            "areas": [
                {
                    "code": area["code"],
                    "name": area["name"],
                    "level": area["level"],
                    "values": area["values"].get(measure_id) or [None] * len(months),
                }
                for area in atlas["areas"]
            ],
        }
        rel = f"curated/atlas-{measure_id}.json"
        write_json(ROOT / rel, slim)
        paths.append(rel)
    return paths


def main() -> None:
    atlas, audit = build_atlas()
    topics, topic_sources = build_topics()
    write_json(ROOT / "curated/atlas.json", atlas)
    write_json(ROOT / "curated/topics.json", topics)
    measure_paths = write_measure_slices(atlas)
    manifest = {
        "schema_version": "housing-atlas-view/1.0",
        "status": "experimental; awaiting independent validation and publication review",
        "title": "Housing explorer presentation bundle",
        "agent_owner": "housing",
        "connector_module": "housing.connectors.housing_atlas",
        "definition": "Lossless, null-padded presentation view of archived UK HPI observations and existing curated housing topic series.",
        "curated_outputs": [
            {"path": path, "sha256": digest(ROOT / path)}
            for path in ["curated/atlas.json", "curated/topics.json", *measure_paths]
        ],
        "source_evidence": [audit.pop("source"), *topic_sources],
        "coverage": audit,
        "measures": [{"id": key, "source_column": column, "unit": unit} for key, _, unit, column in MEASURES],
        "transformation": "Filter HPI calendar months from January 1995; retain supported exact area codes; preserve source numbers; pad missing calendar slots with null. Export existing topic rows and complete 31 March tenure snapshots without source duplication.",
        "caveats": CAVEATS + [
            "Tenure social category combines local-authority, private-registered-provider and other-public-sector dwellings; this is dwelling stock, not households.",
            "All five tenure components and all-dwellings total must be observed at 31 March. Component shares use the sum of components; source total can differ through rounding.",
            "Completions are England new-build completions, not net additions; affordability is England workplace-based price-to-earnings, not mortgage affordability; rent is a UK index, not rent in pounds.",
            "Archived LT213 Notes marks 2026 Q2 provisional, and LT104 Notes marks 2022–2025 provisional (2024 also revised); existing canonical CSV statuses omit these flags. This experimental bundle recovers them without altering canonical CSVs. Completion [r]-only rows are revised; tenure status is provisional/final, with sourceFlags retaining revision notes.",
        ],
        "registry_note": "This experimental view reuses source indicators; it is deliberately excluded from the canonical Ready CSV catalogue. Register derived indicators and geographic layers separately before publication.",
    }
    (ROOT / "atlas-manifest.yaml").write_text(yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True))
    print(json.dumps({"areas": len(atlas["areas"]), "months": len(atlas["months"]), "coverage": audit["area_counts"], "topic_rows": {key: len(topics[key]) for key in ("tenure", "completions", "rent", "affordability")}}, indent=2))


if __name__ == "__main__":
    main()

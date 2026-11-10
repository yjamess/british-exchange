"""SSEN Distribution DNO topology pilot — substations + overhead lines.

Approach (plain language):
1. Pin the operator CSVs the product owner dropped under raw/<date>/ (checksummed).
2. Summarise counts as Observations (by owner / type / voltage / network class).
3. Build a lean curated atlas for the Invisible Grid pilot map:
   - Existing Primary / Grid·BSP / Switching substations (WGS84 from OSGB)
   - EHV + EHV+ overhead line routes only (publisher lat/long WKT)
4. Leave full HV 11 kV lines + all substations in the raw pin (archived to Storage).

Honesty:
- SEPD + SHEPD licence areas only — not a national DNO atlas
- Overhead lines only — no underground cables in this package
- Not spare capacity by node
- Attribution: © SSEN Distribution · CC BY 4.0 / IB1-O

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing columns / empty pins (PEP 8).
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA
from energy.geo.osgb import osgb_to_wgs84

INDICATOR_ID = "ssen-distribution-network-atlas"
PIN_DIR = "raw/2026-11-09"
SUBSTATIONS_REL = f"{PIN_DIR}/substation-locations-nov-2026.csv"
OHL_REL = f"{PIN_DIR}/overhead-lines-nov-1-2026.csv"
RETRIEVAL_REL = f"{PIN_DIR}/retrieval.json"

SUBSTATION_LANDING = "https://data.ssen.co.uk/@ssen-distribution/ssen-substation-data"
OHL_LANDING = "https://data.ssen.co.uk/@ssen-distribution/ssen-overhead-lines"
LICENCE = (
    "Creative Commons Attribution 4.0 (CC BY 4.0) · IB1-O — "
    "© SSEN Distribution; see portal Rights on each data asset"
)

GEOGRAPHY_CODE = "SSEN"
GEOGRAPHY_LABEL = "SSEN Distribution (SEPD + SHEPD licence areas)"
UNIT = "feature_count"
CRS = "EPSG:4326"

# Display atlas keeps higher-voltage anatomy readable; HV 11 kV stays in raw only.
ATLAS_SUBSTATION_TYPES = frozenset(
    {
        "Primary",
        "Grid/Bulk Supply pt",
        "Switching Station",
    }
)
ATLAS_LINE_NETWORK_TYPES = frozenset({"EHV", "EHV+"})

SUBSTATION_REQUIRED = {
    "owner_name",
    "type",
    "class",
    "number",
    "status",
    "location_x_m",
    "location_y_m",
}
OHL_REQUIRED = {
    "id",
    "nominal_voltage_pp",
    "network_type",
    "route_lat_long",
}

_LINESTRING_RE = re.compile(
    r"LINESTRING\s*\((.+)\)",
    re.IGNORECASE | re.DOTALL,
)


def _snapshot_day() -> date:
    return datetime.now(timezone.utc).date()


def _parse_linestring_lonlat(wkt: str) -> list[list[float]] | None:
    """Parse ``LINESTRING(lon lat, …)`` into ``[[lon, lat], …]``."""
    text = (wkt or "").strip()
    if not text:
        return None
    match = _LINESTRING_RE.search(text)
    if not match:
        return None
    coords: list[list[float]] = []
    for part in match.group(1).split(","):
        tokens = part.strip().split()
        if len(tokens) < 2:
            return None
        try:
            lon = float(tokens[0])
            lat = float(tokens[1])
        except ValueError:
            return None
        coords.append([lon, lat])
    if len(coords) < 2:
        return None
    return coords


def _obs(
    *,
    period: str,
    value: float,
    notes: str,
    source_version: str,
) -> Observation:
    return Observation(
        indicator_id=INDICATOR_ID,
        period_start=period,
        period_end=period,
        geography_code=GEOGRAPHY_CODE,
        geography_label=GEOGRAPHY_LABEL,
        value=value,
        unit=UNIT,
        observation_status="final",
        source_version=source_version,
        notes=notes,
    )


def build_atlas_and_observations(
    substations_path: Path,
    ohl_path: Path,
    *,
    as_of: date,
) -> tuple[list[Observation], dict[str, Any]]:
    """Summarise pins + build the lean display atlas."""
    source_version = f"SSEN_DNO_pilot_{as_of.isoformat()}"
    period = as_of.isoformat()

    owner_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    class_counts: Counter[str] = Counter()
    atlas_substations: list[dict[str, Any]] = []
    skipped_xy = 0
    substation_total = 0

    with substations_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("Substation CSV has no header")
        missing = SUBSTATION_REQUIRED - set(reader.fieldnames)
        if missing:
            raise ValueError(f"Substation CSV missing columns: {sorted(missing)}")
        for row in reader:
            substation_total += 1
            owner = (row.get("owner_name") or "UNKNOWN").strip() or "UNKNOWN"
            stype = (row.get("type") or "UNKNOWN").strip() or "UNKNOWN"
            status = (row.get("status") or "UNKNOWN").strip() or "UNKNOWN"
            sclass = (row.get("class") or "UNKNOWN").strip() or "UNKNOWN"
            owner_counts[owner] += 1
            type_counts[stype] += 1
            status_counts[status] += 1
            class_counts[sclass] += 1

            if status != "Existing" or stype not in ATLAS_SUBSTATION_TYPES:
                continue
            try:
                x = float(row["location_x_m"])
                y = float(row["location_y_m"])
            except (TypeError, ValueError, KeyError):
                skipped_xy += 1
                continue
            wgs = osgb_to_wgs84(x, y)
            if wgs is None:
                skipped_xy += 1
                continue
            atlas_substations.append(
                {
                    "id": f"{owner}:{stype}:{row.get('number') or ''}",
                    "owner": owner,
                    "type": stype,
                    "class": sclass,
                    "number": (row.get("number") or "").strip(),
                    "operating_area": (row.get("operating_area") or "").strip(),
                    "locality": (row.get("locality") or "").strip(),
                    "data_confidence": (row.get("data_confidence") or "").strip(),
                    "lon": round(wgs.lon, 6),
                    "lat": round(wgs.lat, 6),
                }
            )

    network_counts: Counter[str] = Counter()
    voltage_counts: Counter[str] = Counter()
    atlas_lines: list[dict[str, Any]] = []
    ohl_total = 0
    skipped_wkt = 0

    with ohl_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("Overhead-lines CSV has no header")
        missing = OHL_REQUIRED - set(reader.fieldnames)
        if missing:
            raise ValueError(f"Overhead-lines CSV missing columns: {sorted(missing)}")
        for row in reader:
            ohl_total += 1
            network = (row.get("network_type") or "UNKNOWN").strip() or "UNKNOWN"
            voltage = (row.get("nominal_voltage_pp") or "UNKNOWN").strip() or "UNKNOWN"
            network_counts[network] += 1
            voltage_counts[voltage] += 1
            if network not in ATLAS_LINE_NETWORK_TYPES:
                continue
            coords = _parse_linestring_lonlat(row.get("route_lat_long") or "")
            if coords is None:
                skipped_wkt += 1
                continue
            atlas_lines.append(
                {
                    "id": (row.get("id") or "").strip(),
                    "circuit_id": (row.get("circuit_id") or "").strip(),
                    "circuit_nrn": (row.get("circuit_nrn") or "").strip(),
                    "voltage": voltage,
                    "network_type": network,
                    "coordinates": coords,
                }
            )

    if substation_total == 0 or ohl_total == 0:
        raise ValueError("Empty SSEN pin — expected substations and overhead lines")

    observations: list[Observation] = [
        _obs(
            period=period,
            value=float(substation_total),
            notes="kind=total_substations; layer=points",
            source_version=source_version,
        ),
        _obs(
            period=period,
            value=float(ohl_total),
            notes="kind=total_overhead_line_segments; layer=lines; coverage=overhead_only",
            source_version=source_version,
        ),
        _obs(
            period=period,
            value=float(len(atlas_substations)),
            notes=(
                "kind=atlas_substations; "
                "filter=Existing+Primary|Grid/Bulk Supply pt|Switching Station"
            ),
            source_version=source_version,
        ),
        _obs(
            period=period,
            value=float(len(atlas_lines)),
            notes="kind=atlas_ohl_segments; filter=EHV|EHV+",
            source_version=source_version,
        ),
    ]
    for owner, count in sorted(owner_counts.items()):
        observations.append(
            _obs(
                period=period,
                value=float(count),
                notes=f"kind=substations_by_owner; owner={owner}",
                source_version=source_version,
            )
        )
    for stype, count in sorted(type_counts.items()):
        observations.append(
            _obs(
                period=period,
                value=float(count),
                notes=f"kind=substations_by_type; type={stype}",
                source_version=source_version,
            )
        )
    for status, count in sorted(status_counts.items()):
        observations.append(
            _obs(
                period=period,
                value=float(count),
                notes=f"kind=substations_by_status; status={status}",
                source_version=source_version,
            )
        )
    for network, count in sorted(network_counts.items()):
        observations.append(
            _obs(
                period=period,
                value=float(count),
                notes=f"kind=ohl_by_network_type; network_type={network}",
                source_version=source_version,
            )
        )
    for voltage, count in sorted(voltage_counts.items()):
        observations.append(
            _obs(
                period=period,
                value=float(count),
                notes=f"kind=ohl_by_voltage; voltage={voltage}",
                source_version=source_version,
            )
        )

    atlas: dict[str, Any] = {
        "indicator_id": INDICATOR_ID,
        "publisher": "SSEN Distribution",
        "as_of": period,
        "crs": CRS,
        "licence": LICENCE,
        "attribution": "© SSEN Distribution",
        "geography": GEOGRAPHY_LABEL,
        "source": {
            "substations": SUBSTATION_LANDING,
            "overhead_lines": OHL_LANDING,
        },
        "honesty": [
            "SSEN SEPD + SHEPD only — not a national DNO map",
            "Overhead lines only — underground cables absent from this pin",
            "Display atlas filters to Primary / Grid·BSP / Switching + EHV/EHV+ lines",
            "Full HV 11 kV segments remain in the archived raw CSV only",
            "Not local spare capacity",
        ],
        "counts": {
            "substations_raw": substation_total,
            "ohl_segments_raw": ohl_total,
            "atlas_substations": len(atlas_substations),
            "atlas_ohl_segments": len(atlas_lines),
            "skipped_substation_xy": skipped_xy,
            "skipped_ohl_wkt": skipped_wkt,
            "owners": dict(owner_counts),
            "ohl_network_types": dict(network_counts),
        },
        "substations": atlas_substations,
        "lines": atlas_lines,
    }
    return observations, atlas


class SsenDnoPilotConnector(Connector):
    """Curate the SSEN DNO topology pilot from a pinned operator drop."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ENERGY_DATA / "ssen-dno-pilot"), timeout_s=60.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="SSEN distribution network atlas (DNO pilot)",
            sector="energy-industry",
            publisher="SSEN Distribution",
            source_url=SUBSTATION_LANDING,
            series_id="ssen-substation-data + ssen-overhead-lines (pilot pin)",
            geography=(
                "SEPD (central southern England) + SHEPD (north of Scotland) "
                "licence areas only — not GB-wide"
            ),
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "Point-in-time counts of SSEN Distribution substations and overhead-line "
                "segments, plus a lean display atlas (Primary/Grid/Switching points and "
                "EHV/EHV+ overhead routes in WGS84). Pilot for Invisible Grid — not national "
                "topology and not spare capacity."
            ),
            licence=LICENCE,
            agent_owner="energy",
            connector_module="energy.connectors.ssen_dno_pilot",
            curated_path="curated/observations.csv",
            update_cadence="Re-pin when SSEN republishes weekly open assets",
            raw_evidence=list(evidence),
            transformations=(
                "Pin operator CSVs under raw/<date>/. Summarise counts to "
                "curated/observations.csv. Build curated/atlas.json with Existing "
                "Primary/Grid/Switching substations (OSGB→WGS84) and EHV/EHV+ "
                "overhead LINESTRING lon/lat routes. Archive raw CSVs to Supabase Storage."
            ),
            caveats=(
                "Pilot geography only (SEPD+SHEPD). Overhead lines only — no underground. "
                "Display atlas omits HV 11 kV segments (still in raw). Do not invent "
                "spare capacity or treat this as a national DNO product. "
                "Attribution: © SSEN Distribution."
            ),
            related_indicator_ids=[
                "transmission-entry-capacity-register",
                "electricity-interconnector-flows",
            ],
            open_questions=[
                "Pin SSEN licence-area boundary polygons for map clipping.",
                "Confirm Overhead Lines portal Rights text matches CC BY 4.0.",
            ],
            notion_registry_url="https://app.notion.com/p/4136547176858141b066ff8d9b836ca9",
        )

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        """Build evidence list from the manual pin (no re-download)."""
        retrieval_path = self.data_root / RETRIEVAL_REL
        if not retrieval_path.is_file():
            raise FileNotFoundError(f"Missing retrieval pin: {retrieval_path}")
        retrieval = json.loads(retrieval_path.read_text(encoding="utf-8"))
        files = retrieval.get("files") or {}
        evidence: list[RawEvidence] = []
        for relative, meta in (
            (SUBSTATIONS_REL, files.get("substation-locations-nov-2026.csv") or {}),
            (OHL_REL, files.get("overhead-lines-nov-1-2026.csv") or {}),
        ):
            path = self.data_root / relative
            if not path.is_file():
                raise FileNotFoundError(
                    f"Pinned CSV missing: {path}. "
                    "Pull from Supabase: uv run python -m britain_exchange.archive_data "
                    f"pull data/energy/ssen-dno-pilot/{relative}"
                )
            checksum = sha256_file(path)
            expected = str(meta.get("checksum_sha256") or "")
            if expected and checksum != expected:
                raise RuntimeError(
                    f"Checksum mismatch for {relative}: disk={checksum} pin={expected}"
                )
            evidence.append(
                RawEvidence(
                    path=relative,
                    retrieved_at=str(retrieval.get("retrieved_at") or ""),
                    checksum_sha256=checksum,
                    content_type="text/csv",
                    official_release_date=str(retrieval.get("pin_date") or ""),
                    http_status=None,
                    source_url=str(meta.get("landing_url") or ""),
                )
            )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) < 2:
            raise ValueError("SSEN pilot transform needs substations + overhead-lines evidence")
        by_name = {Path(item.path).name: item for item in evidence}
        sub_ev = by_name.get("substation-locations-nov-2026.csv")
        ohl_ev = by_name.get("overhead-lines-nov-1-2026.csv")
        if sub_ev is None or ohl_ev is None:
            raise ValueError("Evidence list must include both SSEN CSV pins")

        as_of = date.fromisoformat(
            Path(sub_ev.path).parent.name
            if len(Path(sub_ev.path).parent.name) == 10
            else _snapshot_day().isoformat()
        )
        observations, atlas = build_atlas_and_observations(
            self.data_root / sub_ev.path,
            self.data_root / ohl_ev.path,
            as_of=as_of,
        )
        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        atlas_path = curated_dir / "atlas.json"
        atlas_path.write_text(json.dumps(atlas, separators=(",", ":")) + "\n", encoding="utf-8")
        meta = {
            "indicator_id": INDICATOR_ID,
            "as_of": atlas["as_of"],
            "crs": CRS,
            "licence": LICENCE,
            "counts": atlas["counts"],
            "honesty": atlas["honesty"],
            "atlas_path": "curated/atlas.json",
            "raw_archived_note": (
                "Push raw/*.csv to bx-data-archive after transform; keep README/manifest local."
            ),
        }
        (curated_dir / "spatial_meta.json").write_text(
            json.dumps(meta, indent=2) + "\n",
            encoding="utf-8",
        )
        return observations


def main(argv: Sequence[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pull-raw",
        action="store_true",
        help="Pull pinned CSVs from Supabase archive before transform",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.pull_raw:
        from britain_exchange.archive_data import pull_path

        # https://docs.python.org/3/library/argparse.html — restore archived raw CSVs first
        pull_path("data/energy/ssen-dno-pilot/raw")

    connector = SsenDnoPilotConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    atlas_path = connector.data_root / "curated" / "atlas.json"
    print(f"indicator_id: {INDICATOR_ID}")
    for item in evidence:
        print(f"raw: {item.path} sha256={item.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"atlas: {atlas_path} ({atlas_path.stat().st_size} bytes)")
    print(f"spatial_meta: {connector.data_root / 'curated' / 'spatial_meta.json'}")
    print(f"licence: {LICENCE}")


if __name__ == "__main__":
    main()

"""DESNZ Renewable Energy Planning Database — operational + pipeline capacity.

Approach (plain language):
1. Prefer the pinned REPD quarterly CSV (one source → many indicators).
2. Operational Ready sibling: Development Status (short) == Operational.
3. Pipeline sibling: every non-operational status, with status in notes.
4. Sum Installed Capacity (MWelec) by technology (and status for pipeline).
5. Operational still writes curated/atlas.json for the Generation map.
6. Do **not** fork a second REPD download pipeline — same pin, same module.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing columns; never invent coordinates or capacity.
"""

from __future__ import annotations

import csv
import json
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA
from energy.geo.osgb import osgb_to_wgs84, parse_xy

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

OPERATIONAL_INDICATOR_ID = "renewable-energy-planning-operational"
PIPELINE_INDICATOR_ID = "renewable-energy-planning-pipeline"

PINNED_RAW_RELATIVE = "raw/2026-11-06/REPD_Publication_Q2_2026.csv"
SOURCE_LANDING_URL = (
    "https://www.gov.uk/government/publications/"
    "renewable-energy-planning-database-quarterly-extract"
)
PINNED_ASSET_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a6cbdc00c36759b5ccaa305/REPD_Publication_Q2_2026.csv"
)
OFFICIAL_RELEASE_DATE = "2026-07-31"
SOURCE_VERSION = "REPD_Q2_2026"
EXTRACT_PERIOD_START = "2026-07-01"
EXTRACT_PERIOD_END = "2026-09-30"
CSV_ENCODING = "cp1252"

# REPD Region label → GSS code used by brand TileMap (housing atlas pattern).
REGION_TO_TILE: dict[str, tuple[str, str]] = {
    "North East": ("E12000001", "North East"),
    "North West": ("E12000002", "North West"),
    "Yorkshire and Humber": ("E12000003", "Yorkshire & Humber"),
    "East Midlands": ("E12000004", "East Midlands"),
    "West Midlands": ("E12000005", "West Midlands"),
    "Eastern": ("E12000006", "East of England"),
    "London": ("E12000007", "London"),
    "South East": ("E12000008", "South East"),
    "South West": ("E12000009", "South West"),
    "Scotland": ("S92000003", "Scotland"),
    "Wales": ("W92000004", "Wales"),
    "Northern Ireland": ("N92000002", "Northern Ireland"),
}


def _mw(raw: str | None) -> float | None:
    text = (raw or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _read_repd_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding=CSV_ENCODING) as handle:
        return list(csv.DictReader(handle))


def _require_columns(rows: list[dict[str, str]], required: set[str]) -> None:
    missing = required - set(rows[0].keys() if rows else [])
    if missing:
        raise ValueError(f"REPD CSV missing columns: {sorted(missing)}")


def operational_date(raw: str | None) -> str | None:
    """Preserve unknown/invalid dates as unknown; never use record-update dates."""
    try:
        return datetime.strptime((raw or "").strip(), "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def parse_operational(
    csv_path: Path,
) -> tuple[list[Observation], dict[str, Any]]:
    """Return technology observations + atlas.json payload (Operational only)."""
    rows = _read_repd_rows(csv_path)
    _require_columns(
        rows,
        {
            "Development Status (short)",
            "Technology Type",
            "Installed Capacity (MWelec)",
            "Region",
            "Site Name",
            "Country",
        },
    )

    ops = [
        r
        for r in rows
        if (r.get("Development Status (short)") or "").strip() == "Operational"
    ]
    if not ops:
        raise ValueError("No Operational rows in REPD pin")

    by_tech: dict[str, float] = defaultdict(float)
    by_tile: dict[str, float] = defaultdict(float)
    offshore_mw = 0.0
    sites: list[dict[str, Any]] = []
    points: list[dict[str, Any]] = []
    with_xy = 0

    for row in ops:
        mw = _mw(row.get("Installed Capacity (MWelec)"))
        if mw is None or mw <= 0:
            continue
        tech = (row.get("Technology Type") or "Unknown").strip() or "Unknown"
        by_tech[tech] += mw
        region = (row.get("Region") or "").strip()
        if region == "Offshore":
            offshore_mw += mw
        elif region in REGION_TO_TILE:
            code, _ = REGION_TO_TILE[region]
            by_tile[code] += mw
        site: dict[str, Any] = {
            "ref": (row.get("Ref ID") or "").strip(),
            "name": (row.get("Site Name") or "").strip() or "(unnamed)",
            "technology": tech,
            "family": "renewable",
            "mw": round(mw, 3),
            "region": region,
            "country": (row.get("Country") or "").strip(),
            "operator": (row.get("Operator (or Applicant)") or "").strip(),
            "operational_date": operational_date(row.get("Operational")),
            "operational_date_raw": (row.get("Operational") or "").strip(),
        }
        xy = parse_xy(row.get("X-coordinate"), row.get("Y-coordinate"))
        if xy is not None:
            wgs = osgb_to_wgs84(xy[0], xy[1])
            if wgs is not None:
                site["lon"] = round(wgs.lon, 5)
                site["lat"] = round(wgs.lat, 5)
                with_xy += 1
                points.append(
                    {
                        "id": site["ref"] or f"{site['name']}-{with_xy}",
                        "name": site["name"],
                        "mw": site["mw"],
                        "technology": tech,
                        "region": site["region"],
                        "country": site["country"],
                        "operator": site["operator"],
                        "operational_date": site["operational_date"],
                        "family": "renewable",
                        "lon": site["lon"],
                        "lat": site["lat"],
                    }
                )
        sites.append(site)

    sites.sort(key=lambda s: -float(s["mw"]))
    points.sort(key=lambda s: -float(s["mw"]))
    status: ObservationStatus = "final"
    observations: list[Observation] = []
    for tech, mw in sorted(by_tech.items()):
        observations.append(
            Observation(
                indicator_id=OPERATIONAL_INDICATOR_ID,
                period_start=EXTRACT_PERIOD_START,
                period_end=EXTRACT_PERIOD_END,
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=mw,
                unit="MW",
                observation_status=status,
                source_version=SOURCE_VERSION,
                notes=f"technology={tech}",
            )
        )

    name_by_code = {code: name for code, name in REGION_TO_TILE.values()}
    tiles = [
        {"code": code, "name": name, "mw": round(by_tile.get(code, 0.0), 3)}
        for code, name in sorted(name_by_code.items())
    ]

    atlas = {
        "source": "DESNZ Renewable Energy Planning Database (REPD)",
        "extract": SOURCE_VERSION,
        "retrieved_note": "Operational sites only; ≥150 kW threshold (1 MW before 2021).",
        "crs": "WGS84 from OSGB36 X/Y via Airy 1830 + Helmert (OS guide)",
        "operational_sites": len(ops),
        "sites_with_coordinates": with_xy,
        "offshore_mw": round(offshore_mw, 3),
        "tiles": tiles,
        "largest_sites": sites[:40],
        "points": points,
    }
    return observations, atlas


def parse_pipeline(csv_path: Path) -> list[Observation]:
    """Non-operational REPD MW by development status × technology."""
    rows = _read_repd_rows(csv_path)
    _require_columns(
        rows,
        {
            "Development Status (short)",
            "Technology Type",
            "Installed Capacity (MWelec)",
        },
    )

    by_key: dict[tuple[str, str], float] = defaultdict(float)
    for row in rows:
        status = (row.get("Development Status (short)") or "").strip()
        if not status or status == "Operational":
            continue
        mw = _mw(row.get("Installed Capacity (MWelec)"))
        if mw is None or mw <= 0:
            continue
        tech = (row.get("Technology Type") or "Unknown").strip() or "Unknown"
        by_key[(status, tech)] += mw

    if not by_key:
        raise ValueError("No non-operational REPD rows with positive MW")

    observations: list[Observation] = []
    for (status, tech), mw in sorted(by_key.items()):
        observations.append(
            Observation(
                indicator_id=PIPELINE_INDICATOR_ID,
                period_start=EXTRACT_PERIOD_START,
                period_end=EXTRACT_PERIOD_END,
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=mw,
                unit="MW",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=f"status={status}; technology={tech}",
            )
        )
    return observations


def _evidence_from_pin(data_root: Path) -> RawEvidence:
    path = data_root / PINNED_RAW_RELATIVE
    if not path.is_file():
        raise FileNotFoundError(f"Pinned REPD CSV missing: {path}")
    return RawEvidence(
        path=PINNED_RAW_RELATIVE,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=sha256_file(path),
        content_type="text/csv",
        official_release_date=OFFICIAL_RELEASE_DATE,
        http_status=200,
        source_url=PINNED_ASSET_URL,
    )


def _ensure_pipeline_raw_pin(operational_root: Path, pipeline_root: Path) -> RawEvidence:
    """Copy the operational pin into the pipeline package (same checksum, no second fetch)."""
    src = operational_root / PINNED_RAW_RELATIVE
    if not src.is_file():
        raise FileNotFoundError(f"Canonical REPD pin missing: {src}")
    dest = pipeline_root / PINNED_RAW_RELATIVE
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.is_file() or sha256_file(dest) != sha256_file(src):
        shutil.copy2(src, dest)
    retrieval_src = operational_root / "raw/2026-11-06/retrieval.json"
    retrieval_dest = pipeline_root / "raw/2026-11-06/retrieval.json"
    if retrieval_src.is_file():
        shutil.copy2(retrieval_src, retrieval_dest)
    return _evidence_from_pin(pipeline_root)


class RenewableEnergyPlanningConnector(Connector):
    """REPD operational renewable (+ storage) capacity for the Generation atlas."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / OPERATIONAL_INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return OPERATIONAL_INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Renewable energy planning — operational capacity",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="REPD quarterly extract — Operational Installed Capacity (MWelec)",
            geography="United Kingdom (planning register; includes NI and offshore)",
            frequency="quarterly",
            unit="MW",
            definition=(
                "Sum of installed electrical capacity (MW) for REPD projects marked "
                "Operational, by technology type. Snapshot of the quarterly extract. "
                "Not generation (TWh). Not a complete UK power-station register — "
                "coal, gas CCGT, nuclear and other non-REPD plant are absent."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.renewable_energy_planning",
            curated_path="curated/observations.csv",
            update_cadence="Quarterly REPD extract (DESNZ / Barbour ABI)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/41065471768581eaa19fc687e6b766f7",
            transformations=(
                "Filter Development Status (short)=Operational. Sum Installed Capacity "
                "(MWelec) by Technology Type → notes=technology=<label>. Also write "
                "curated/atlas.json with TileMap region MW (Offshore held separately), "
                "the 40 largest sites by MW, and WGS84 points from OSGB X/Y."
            ),
            caveats=(
                "REPD tracks renewable (and some storage) projects through planning — "
                "not the full generating fleet. Capacity threshold ≥150 kW (1 MW before "
                "2021). Point map uses OSGB X/Y converted to WGS84; DESNZ does not verify "
                "generator-supplied geography. Do not imply fossil or nuclear coverage."
            ),
            related_indicator_ids=[PIPELINE_INDICATOR_ID],
            open_questions=[],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return _evidence_from_pin(self.data_root)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        csv_path = self.data_root / evidence[0].path
        if not csv_path.is_file():
            raise FileNotFoundError(f"Raw CSV not found: {csv_path}")
        observations, atlas = parse_operational(csv_path)
        atlas_path = self.data_root / "curated" / "atlas.json"
        atlas_path.parent.mkdir(parents=True, exist_ok=True)
        atlas_path.write_text(json.dumps(atlas, indent=2) + "\n", encoding="utf-8")
        return observations


class RenewableEnergyPlanningPipelineConnector(Connector):
    """REPD non-operational planning-stage capacity (sibling of operational)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / PIPELINE_INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return PIPELINE_INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Renewable energy planning — non-operational pipeline",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id=(
                "REPD quarterly extract — Installed Capacity (MWelec) by "
                "Development Status (short), excluding Operational"
            ),
            geography="United Kingdom (planning register; includes NI and offshore)",
            frequency="quarterly",
            unit="MW",
            definition=(
                "Sum of installed electrical capacity (MW) for REPD projects that are "
                "not yet Operational, by Development Status (short) and Technology Type. "
                "Snapshot of the same quarterly extract as the operational sibling. "
                "Not generation (TWh). Not nuclear. Not a complete UK power-station register."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.renewable_energy_planning",
            curated_path="curated/observations.csv",
            update_cadence="Quarterly REPD extract (DESNZ / Barbour ABI)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Exclude Development Status (short)=Operational. Sum Installed Capacity "
                "(MWelec) by status × Technology Type → "
                "notes=status=<label>; technology=<label>. Same raw pin as "
                f"{OPERATIONAL_INDICATOR_ID} (copied, not re-fetched)."
            ),
            caveats=(
                "REPD capacity threshold ≥150 kW (≥1 MW before 2021) — smaller schemes "
                "are absent. Statuses include refused/withdrawn/abandoned as well as "
                "active pipeline (submitted / awaiting construction / under construction). "
                "Filter on notes status= for Field Guide stages. Do not treat pipeline MW "
                "as built capacity. Nuclear is not in REPD."
            ),
            related_indicator_ids=[OPERATIONAL_INDICATOR_ID],
            open_questions=[
                "Optional site-level atlas for non-operational stages (coordinates exist).",
            ],
            revision_notes=(
                "Gate 3 B3: sibling indicator sharing the operational REPD connector "
                "and Q2 2026 pin — not a second REPD pipeline."
            ),
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return _evidence_from_pin(self.data_root)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        csv_path = self.data_root / evidence[0].path
        if not csv_path.is_file():
            raise FileNotFoundError(f"Raw CSV not found: {csv_path}")
        return parse_pipeline(csv_path)


def main() -> None:
    """One REPD pin → operational + pipeline hand-offs."""
    operational = RenewableEnergyPlanningConnector()
    op_evidence = operational.evidence_from_pinned_raw()
    op_obs = operational.transform([op_evidence])
    op_manifest, op_curated = operational.write_hand_off([op_evidence], op_obs)

    pipeline_root = ENERGY_DATA / PIPELINE_INDICATOR_ID
    pipe_evidence = _ensure_pipeline_raw_pin(operational.data_root, pipeline_root)
    pipeline = RenewableEnergyPlanningPipelineConnector(pipeline_root)
    pipe_obs = pipeline.transform([pipe_evidence])
    pipe_manifest, pipe_curated = pipeline.write_hand_off([pipe_evidence], pipe_obs)

    print(f"indicator_id: {operational.indicator_id}")
    print(f"raw: {op_evidence.path} sha256={op_evidence.checksum_sha256}")
    print(f"observations: {len(op_obs)}")
    print(f"manifest: {op_manifest}")
    print(f"curated: {op_curated}")
    print(f"atlas: {operational.data_root / 'curated' / 'atlas.json'}")
    print("---")
    print(f"indicator_id: {pipeline.indicator_id}")
    print(f"raw: {pipe_evidence.path} sha256={pipe_evidence.checksum_sha256}")
    print(f"observations: {len(pipe_obs)}")
    print(f"manifest: {pipe_manifest}")
    print(f"curated: {pipe_curated}")


if __name__ == "__main__":
    main()

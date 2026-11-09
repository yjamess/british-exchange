"""NESO Transmission Entry Capacity (TEC) Register — contracted queue MW.

Approach (plain language):
1. Resolve the official CKAN resource download URL (filename changes with pin date).
2. Pin the CSV under data/energy/neso-tec-register/raw/ (immutable evidence).
3. Emit one observation per register row: value = MW Increase/Decrease (contracted).
4. period_start/end = MW Effective From (contractual capacity date — not an ETA).
5. notes carry Gate, plant type, project status, project ids. No speculative ETAs.
6. Geography is Great Britain (NESO), not UK.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing columns / bad dates; never invent Gate or MW.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import httpx

from britain_exchange.checksum import sha256_bytes, sha256_file
from britain_exchange.connector import Connector, FetchResult
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "transmission-entry-capacity-register"
GB_GEOGRAPHY_CODE = "K03000001"
GB_GEOGRAPHY_LABEL = "Great Britain"

RESOURCE_ID = "17becbab-e3e8-473f-b303-3806f43a6a10"
DATASET_ID = "cbd45e54-e6e2-4a38-99f1-8de6fd96d7c1"
SOURCE_LANDING_URL = (
    "https://www.neso.energy/data-portal/transmission-entry-capacity-tec-register"
)
LICENCE_URL = "https://www.neso.energy/data-portal/ngeso-open-licence"
RESOURCE_SHOW_URL = (
    f"https://api.neso.energy/api/3/action/resource_show?id={RESOURCE_ID}"
)

PIN_DIR = "raw/2026-11-07"
PINNED_META_RELATIVE = f"{PIN_DIR}/retrieval.json"
REQUIRED_COLUMNS = {
    "Project Name",
    "MW Increase / Decrease",
    "Cumulative Total Capacity (MW)",
    "MW Effective From",
    "Project Status",
    "Plant Type",
    "Project ID",
    "Project Number",
    "Gate",
}


def _parse_uk_date(raw: str) -> str | None:
    """Parse dd/mm/yyyy → ISO date. Empty → None."""
    text = (raw or "").strip()
    if not text:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised MW Effective From date: {raw!r}")


def _mw(raw: str | None) -> float | None:
    text = (raw or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def resolve_tec_download(client: httpx.Client) -> dict[str, Any]:
    """Ask CKAN for the current official CSV download URL + metadata."""
    response = client.get(RESOURCE_SHOW_URL)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success"):
        raise RuntimeError(f"NESO resource_show failed: {payload}")
    result = payload["result"]
    url = str(result.get("url") or "").strip()
    if not url:
        raise RuntimeError("NESO TEC resource has empty download URL")
    return {
        "download_url": url,
        "name": result.get("name"),
        "last_modified": result.get("last_modified"),
        "format": result.get("format"),
        "resource_id": RESOURCE_ID,
        "dataset_id": DATASET_ID,
    }


def pin_tec_register(
    data_root: Path,
    *,
    timeout_s: float = 120.0,
) -> tuple[FetchResult, dict[str, Any]]:
    """Download the official TEC CSV into the package raw/ pin directory."""
    data_root.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=timeout_s, follow_redirects=True) as client:
        meta = resolve_tec_download(client)
        download_url = str(meta["download_url"])
        response = client.get(download_url)
        response.raise_for_status()
        payload = response.content

    # Keep publisher filename when present; fall back to stable name.
    filename = download_url.rstrip("/").split("/")[-1] or "tec-register.csv"
    if not filename.lower().endswith(".csv"):
        filename = "tec-register.csv"
    relative = f"{PIN_DIR}/{filename}"
    target = data_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    checksum = sha256_bytes(payload)
    if sha256_file(target) != checksum:
        raise RuntimeError(f"Checksum mismatch writing {target}")

    retrieved_at = datetime.now(timezone.utc).isoformat()
    retrieval = {
        "retrieved_at": retrieved_at,
        "http_status": response.status_code,
        "source_url": download_url,
        "landing_url": SOURCE_LANDING_URL,
        "resource_show_url": RESOURCE_SHOW_URL,
        "checksum_sha256": checksum,
        "last_modified": meta.get("last_modified"),
        "resource_name": meta.get("name"),
        "licence": f"NESO Open Data Licence — {LICENCE_URL}",
        "geography": "Great Britain",
        "note": (
            "Contracted TEC only. Gate column may be blank until countersigned. "
            "Stage rows can duplicate capacity under Connections Reform — do not "
            "treat MW Effective From as a speculative ETA."
        ),
    }
    meta_path = data_root / PINNED_META_RELATIVE
    meta_path.write_text(json.dumps(retrieval, indent=2) + "\n", encoding="utf-8")

    evidence = RawEvidence(
        path=relative,
        retrieved_at=retrieved_at,
        checksum_sha256=checksum,
        content_type=response.headers.get("content-type", "text/csv"),
        official_release_date="",
        http_status=response.status_code,
        source_url=download_url,
    )
    return FetchResult(path=target, evidence=evidence), retrieval


def _pin_date_from_filename(csv_path: Path) -> str:
    """Best-effort ISO date from publisher filenames like tec-register-05-november-2026.csv."""
    stem = csv_path.stem.lower().replace("_", "-")
    # tec-register-05-november-2026
    parts = stem.split("-")
    months = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    for i, part in enumerate(parts):
        if part in months and i > 0 and i + 1 < len(parts):
            day_token = parts[i - 1]
            year_token = parts[i + 1]
            if day_token.isdigit() and year_token.isdigit():
                return (
                    f"{int(year_token):04d}-{months[part]:02d}-{int(day_token):02d}"
                )
    # Fall back to pin folder date (YYYY-MM-DD directory name).
    for parent in csv_path.parents:
        if len(parent.name) == 10 and parent.name[4] == "-" and parent.name[7] == "-":
            return parent.name
    raise ValueError(f"Cannot infer pin date from {csv_path.name}")


def parse_tec_register(csv_path: Path, *, source_version: str) -> list[Observation]:
    """One observation per TEC register row (contracted MW increment + date).

    Built rows with blank MW Effective From use MW Connected and the register pin
    date (``date_basis=built_connected_pin_snapshot``) — still not a speculative ETA.
    """
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("TEC CSV has no header")
        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            raise ValueError(f"TEC CSV missing columns: {sorted(missing)}")
        rows = list(reader)

    pin_date = _pin_date_from_filename(csv_path)
    observations: list[Observation] = []
    built_snapshot = 0
    skipped = 0
    for row in rows:
        increase = _mw(row.get("MW Increase / Decrease"))
        connected = _mw(row.get("MW Connected"))
        cumulative = _mw(row.get("Cumulative Total Capacity (MW)"))
        effective = _parse_uk_date(row.get("MW Effective From") or "")

        if effective is not None:
            if increase is None:
                skipped += 1
                continue
            mw = increase
            date_basis = "mw_effective_from_contractual"
            period = effective
        else:
            # Built / historic connected rows often omit Effective From; MW Increase is 0.
            status_probe = (row.get("Project Status") or "").strip()
            if (
                status_probe == "Built"
                and connected is not None
                and connected > 0
                and (increase is None or increase == 0)
            ):
                mw = connected
                date_basis = "built_connected_pin_snapshot"
                period = pin_date
                built_snapshot += 1
            else:
                skipped += 1
                continue

        gate_raw = (row.get("Gate") or "").strip()
        gate = gate_raw if gate_raw else "unassigned"
        plant = (row.get("Plant Type") or "Unknown").strip() or "Unknown"
        status = (row.get("Project Status") or "Unknown").strip() or "Unknown"
        project_number = (row.get("Project Number") or "").strip()
        project_id = (row.get("Project ID") or "").strip()
        stage = (row.get("Stage") or "").strip()
        host_to = (row.get("HOST TO") or "").strip()
        agreement = (row.get("Agreement Type") or "").strip()

        note_parts = [
            f"plant_type={plant}",
            f"gate={gate}",
            f"project_status={status}",
            f"project_number={project_number}",
            f"project_id={project_id}",
        ]
        if stage:
            note_parts.append(f"stage={stage}")
        if host_to:
            note_parts.append(f"host_to={host_to}")
        if agreement:
            note_parts.append(f"agreement_type={agreement}")
        if connected is not None:
            note_parts.append(f"mw_connected={connected}")
        if cumulative is not None:
            note_parts.append(f"cumulative_mw={cumulative}")
        if increase is not None:
            note_parts.append(f"mw_increase={increase}")
        note_parts.append(f"date_basis={date_basis}")

        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=GB_GEOGRAPHY_CODE,
                geography_label=GB_GEOGRAPHY_LABEL,
                value=mw,
                unit="MW",
                observation_status="final",
                source_version=source_version,
                notes="; ".join(note_parts),
            )
        )

    if not observations:
        raise ValueError("No TEC observations parsed from pinned CSV")
    if built_snapshot or skipped:
        print(
            f"note: built_connected_pin_snapshot={built_snapshot}; skipped_rows={skipped}"
        )
    return observations


class NesoTecRegisterConnector(Connector):
    """NESO TEC Register — contracted transmission entry capacity queue."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "neso-tec-register")
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Transmission entry capacity (TEC) register",
            sector="energy-industry",
            publisher="NESO",
            source_url=SOURCE_LANDING_URL,
            series_id=f"TEC Register (resource_id {RESOURCE_ID})",
            geography="Great Britain (K03000001); Northern Ireland excluded",
            frequency="ad_hoc",
            unit="MW",
            definition=(
                "Contracted Transmission Entry Capacity increments from the NESO TEC "
                "Register. Each curated row is one register line: value = "
                "MW Increase/Decrease; period = MW Effective From (contractual capacity "
                "date). Notes carry Gate (1/2/unassigned), plant type, project status, "
                "and project identifiers. Not speculative connection ETAs. Not a DNO "
                "topology atlas."
            ),
            licence=f"NESO Open Data Licence — {LICENCE_URL}",
            agent_owner="energy",
            connector_module="energy.connectors.neso_tec_register",
            curated_path="curated/observations.csv",
            update_cadence="Twice weekly on NESO data portal (this package is a dated pin)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Pin official CKAN CSV via resource_show download URL. One Observation "
                "per usable register row. Prefer value=MW Increase/Decrease with "
                "period=MW Effective From (date_basis=mw_effective_from_contractual). "
                "Built rows with blank Effective From use value=MW Connected and the "
                "register pin date (date_basis=built_connected_pin_snapshot). "
                "notes=plant_type=…; gate=1|2|unassigned; project_status=…; "
                "project_number=…; project_id=…. Do not invent Gate values when blank."
            ),
            caveats=(
                "Geography is GB (NESO), not UK. Gate may be blank until agreements are "
                "countersigned (published as gate=unassigned). Capacity across stages / "
                "technology types may duplicate under Connections Reform — do not sum "
                "Cumulative Total Capacity across stage rows without dedupe. "
                "MW Effective From is a contractual capacity date, not a speculative ETA. "
                "Built pin-snapshot rows are connected MW at the pin date, not queue ETAs. "
                "National DNO topology remains Blocked — this series is the connections "
                "queue only."
            ),
            related_indicator_ids=[
                "electricity-capacity-by-technology",
                "renewable-energy-planning-pipeline",
            ],
            open_questions=[
                "Optional aggregate snapshot by plant_type × gate for queue charts.",
                "Thermal constraint costs (NESO) remain a separate Gate 3 candidate.",
            ],
            revision_notes="Gate 3 B3 ingest — not Ready until Validation accepts.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        meta_path = self.data_root / PINNED_META_RELATIVE
        if not meta_path.is_file():
            raise FileNotFoundError(
                f"Missing {meta_path}; run with --fetch first to pin the TEC CSV"
            )
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        # Discover the CSV beside retrieval.json.
        pin_dir = self.data_root / PIN_DIR
        csvs = sorted(pin_dir.glob("*.csv"))
        if not csvs:
            raise FileNotFoundError(f"No TEC CSV pin under {pin_dir}")
        csv_path = csvs[0]
        relative = str(csv_path.relative_to(self.data_root))
        return RawEvidence(
            path=relative,
            retrieved_at=str(meta.get("retrieved_at") or datetime.now(timezone.utc).isoformat()),
            checksum_sha256=sha256_file(csv_path),
            content_type="text/csv",
            official_release_date="",
            http_status=int(meta.get("http_status") or 200),
            source_url=str(meta.get("source_url") or SOURCE_LANDING_URL),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        csv_path = self.data_root / evidence[0].path
        if not csv_path.is_file():
            raise FileNotFoundError(f"Raw CSV not found: {csv_path}")
        source_version = f"NESO_TEC_{csv_path.stem}"
        return parse_tec_register(csv_path, source_version=source_version)


def main(argv: list[str] | None = None) -> None:
    """Fetch (optional) + transform pinned TEC register → curated + manifest."""
    import sys

    args = list(sys.argv[1:] if argv is None else argv)
    fetch = "--fetch" in args or "--refresh" in args

    connector = NesoTecRegisterConnector()
    if fetch or not (connector.data_root / PINNED_META_RELATIVE).is_file():
        result, _retrieval = pin_tec_register(connector.data_root)
        evidence = result.evidence
        print(f"pinned: {evidence.path} sha256={evidence.checksum_sha256}")
    else:
        evidence = connector.evidence_from_pinned_raw()

    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    gates = sorted(
        {
            part.removeprefix("gate=")
            for obs in observations
            for part in obs.notes.split("; ")
            if part.startswith("gate=")
        }
    )
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"gates: {', '.join(gates)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

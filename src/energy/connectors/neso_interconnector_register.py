"""NESO Interconnector Register — contracted / connected capacity MW.

Approach (plain language):
1. Resolve the official CKAN resource download URL (filename changes with pin date).
2. Pin the CSV under data/energy/electricity-interconnector-capacity/raw/.
3. Emit one observation per register row.
4. Built + current MW → value = MW Import - Current, period = pin date.
5. Future / staged rows with MW Effective From → value = MW Import - Increase/Decrease.
6. Notes carry project name, export MW, status, Gate, stage. GWh flows stay separate.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing columns; never invent Gate or MW.
- utf-8-sig so the BOM on Project Name does not break the header
  (https://docs.python.org/3/library/csv.html).
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

INDICATOR_ID = "electricity-interconnector-capacity"
PACKAGE_DIR = "electricity-interconnector-capacity"
GB_GEOGRAPHY_CODE = "K03000001"
GB_GEOGRAPHY_LABEL = "Great Britain"

RESOURCE_ID = "64f7908f-f787-4977-93e1-5342a5f1357f"
DATASET_ID = "a7cca714-9dbb-42b1-99c8-4bc7211605a8"
SOURCE_LANDING_URL = "https://www.neso.energy/data-portal/interconnector-register"
LICENCE_URL = "https://www.neso.energy/data-portal/ngeso-open-licence"
RESOURCE_SHOW_URL = (
    f"https://api.neso.energy/api/3/action/resource_show?id={RESOURCE_ID}"
)

PIN_DIR = "raw/2026-11-08"
PINNED_META_RELATIVE = f"{PIN_DIR}/retrieval.json"
REQUIRED_COLUMNS = {
    "Project Name",
    "MW Import - Current",
    "MW Export - Current",
    "MW Import - Increase / Decrease",
    "MW Export - Increase / Decrease",
    "MW Import - Total",
    "MW Export - Total",
    "MW Effective From",
    "Project Status",
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


def resolve_interconnector_download(client: httpx.Client) -> dict[str, Any]:
    """Ask CKAN for the current official CSV download URL + metadata."""
    response = client.get(RESOURCE_SHOW_URL)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success"):
        raise RuntimeError(f"NESO resource_show failed: {payload}")
    result = payload["result"]
    url = str(result.get("url") or "").strip()
    if not url:
        raise RuntimeError("NESO Interconnector Register resource has empty download URL")
    return {
        "download_url": url,
        "name": result.get("name"),
        "last_modified": result.get("last_modified"),
        "format": result.get("format"),
        "resource_id": RESOURCE_ID,
        "dataset_id": DATASET_ID,
    }


def pin_interconnector_register(
    data_root: Path,
    *,
    timeout_s: float = 120.0,
) -> tuple[FetchResult, dict[str, Any]]:
    """Download the official Interconnector Register CSV into the package pin directory."""
    data_root.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=timeout_s, follow_redirects=True) as client:
        meta = resolve_interconnector_download(client)
        download_url = str(meta["download_url"])
        response = client.get(download_url)
        response.raise_for_status()
        payload = response.content

    filename = download_url.rstrip("/").split("/")[-1] or "interconnector-register.csv"
    if not filename.lower().endswith(".csv"):
        filename = "interconnector-register.csv"
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
            "Firm TEC is MW Import - Total / Current (CUSC). Moyle 500 MW is subject to "
            "operational restrictions. Gate may be blank until countersigned. Stage rows "
            "can duplicate capacity under Connections Reform. Capacity MW ≠ ET 5.6 GWh flows."
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
    """Best-effort ISO date from publisher filenames like interconnector-register-05-november-2026.csv."""
    stem = csv_path.stem.lower().replace("_", "-")
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
                return f"{int(year_token):04d}-{months[part]:02d}-{int(day_token):02d}"
    for parent in csv_path.parents:
        if len(parent.name) == 10 and parent.name[4] == "-" and parent.name[7] == "-":
            return parent.name
    raise ValueError(f"Cannot infer pin date from {csv_path.name}")


def parse_interconnector_register(csv_path: Path, *, source_version: str) -> list[Observation]:
    """One observation per Interconnector Register row (import-side firm TEC MW)."""
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("Interconnector Register CSV has no header")
        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            raise ValueError(f"Interconnector Register CSV missing columns: {sorted(missing)}")
        rows = list(reader)

    pin_date = _pin_date_from_filename(csv_path)
    observations: list[Observation] = []
    built_snapshot = 0
    skipped = 0
    for row in rows:
        import_current = _mw(row.get("MW Import - Current"))
        export_current = _mw(row.get("MW Export - Current"))
        import_increase = _mw(row.get("MW Import - Increase / Decrease"))
        export_increase = _mw(row.get("MW Export - Increase / Decrease"))
        import_total = _mw(row.get("MW Import - Total"))
        export_total = _mw(row.get("MW Export - Total"))
        effective = _parse_uk_date(row.get("MW Effective From") or "")
        status = (row.get("Project Status") or "Unknown").strip() or "Unknown"

        if status == "Built" and import_current is not None and import_current > 0:
            mw = import_current
            date_basis = "built_current_pin_snapshot"
            period = pin_date
            built_snapshot += 1
        elif effective is not None and import_increase is not None:
            mw = import_increase
            date_basis = "mw_effective_from_contractual"
            period = effective
        else:
            skipped += 1
            continue

        gate_raw = (row.get("Gate") or "").strip()
        gate = gate_raw if gate_raw else "unassigned"
        project_name = (row.get("Project Name") or "Unknown").strip() or "Unknown"
        customer = (row.get("Customer Name") or "").strip()
        site = (row.get("Connection Site") or "").strip()
        project_number = (row.get("Project Number") or "").strip()
        stage = (row.get("Stage") or "").strip()
        host_to = (row.get("HOST TO") or "").strip()

        note_parts = [
            f"project={project_name}",
            f"project_status={status}",
            f"gate={gate}",
            f"project_number={project_number}",
            f"measure=mw_import",
        ]
        if customer:
            note_parts.append(f"customer={customer}")
        if site:
            note_parts.append(f"connection_site={site}")
        if stage:
            note_parts.append(f"stage={stage}")
        if host_to:
            note_parts.append(f"host_to={host_to}")
        if import_current is not None:
            note_parts.append(f"mw_import_current={import_current}")
        if export_current is not None:
            note_parts.append(f"mw_export_current={export_current}")
        if import_increase is not None:
            note_parts.append(f"mw_import_increase={import_increase}")
        if export_increase is not None:
            note_parts.append(f"mw_export_increase={export_increase}")
        if import_total is not None:
            note_parts.append(f"mw_import_total={import_total}")
        if export_total is not None:
            note_parts.append(f"mw_export_total={export_total}")
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
        raise ValueError("No interconnector capacity observations parsed from pinned CSV")
    if built_snapshot or skipped:
        print(f"note: built_current_pin_snapshot={built_snapshot}; skipped_rows={skipped}")
    return observations


class NesoInterconnectorRegisterConnector(Connector):
    """NESO Interconnector Register — firm TEC capacity MW (import side)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / PACKAGE_DIR)
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Electricity interconnector capacity",
            sector="energy-industry",
            publisher="NESO",
            source_url=SOURCE_LANDING_URL,
            series_id=f"Interconnector Register (resource_id {RESOURCE_ID})",
            geography="Great Britain (K03000001); Northern Ireland excluded",
            frequency="ad_hoc",
            unit="MW",
            definition=(
                "Firm Transmission Entry Capacity for interconnectors from the NESO "
                "Interconnector Register. Built links use MW Import - Current at the "
                "register pin date. Future / staged rows use MW Import - Increase/Decrease "
                "on MW Effective From (contractual). Export MW and project metadata stay "
                "in notes. Not ET 5.6 transferred energy (GWh)."
            ),
            licence=f"NESO Open Data Licence — {LICENCE_URL}",
            agent_owner="energy",
            connector_module="energy.connectors.neso_interconnector_register",
            curated_path="curated/observations.csv",
            update_cadence="Twice weekly on NESO data portal (this package is a dated pin)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Pin official CKAN CSV via resource_show download URL (utf-8-sig). One "
                "Observation per usable register row. Built + current import MW → "
                "date_basis=built_current_pin_snapshot. Rows with MW Effective From → "
                "value=MW Import Increase/Decrease, date_basis=mw_effective_from_contractual. "
                "notes=project=…; project_status=…; gate=…; mw_export_*=…; measure=mw_import."
            ),
            caveats=(
                "Geography is GB (NESO), not UK. MW Import figures are firm TEC (CUSC); "
                "Moyle's 500 MW TEC is subject to operational restrictions. Gate may be "
                "blank until countersigned (gate=unassigned). Stage rows may duplicate "
                "capacity under Connections Reform — do not sum totals without dedupe. "
                "Capacity MW is not transferred GWh (see electricity-interconnector-flows). "
                "Do not invent corridor maps or landfalls from this register alone."
            ),
            related_indicator_ids=[
                "electricity-interconnector-flows",
                "transmission-entry-capacity-register",
            ],
            open_questions=[
                "Optional corridor labels joining Built projects to ET 5.6 corridor names.",
                "Storage as its own Ready series remains a separate Domain 05 gap.",
            ],
            revision_notes="Domain 05 Gate 3 capacity companion — not Ready until Validation accepts.",
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        meta_path = self.data_root / PINNED_META_RELATIVE
        if not meta_path.is_file():
            raise FileNotFoundError(
                f"Missing {meta_path}; run with --fetch first to pin the Interconnector Register CSV"
            )
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        pin_dir = self.data_root / PIN_DIR
        csvs = sorted(pin_dir.glob("*.csv"))
        if not csvs:
            raise FileNotFoundError(f"No Interconnector Register CSV pin under {pin_dir}")
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
        source_version = f"NESO_IC_{csv_path.stem}"
        return parse_interconnector_register(csv_path, source_version=source_version)


def main(argv: list[str] | None = None) -> None:
    """Fetch (optional) + transform pinned Interconnector Register → curated + manifest."""
    import sys

    args = list(sys.argv[1:] if argv is None else argv)
    fetch = "--fetch" in args or "--refresh" in args

    connector = NesoInterconnectorRegisterConnector()
    if fetch or not (connector.data_root / PINNED_META_RELATIVE).is_file():
        result, _retrieval = pin_interconnector_register(connector.data_root)
        evidence = result.evidence
        print(f"pinned: {evidence.path} sha256={evidence.checksum_sha256}")
    else:
        evidence = connector.evidence_from_pinned_raw()

    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    built = sum(1 for o in observations if "date_basis=built_current_pin_snapshot" in o.notes)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (built_snapshot={built})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

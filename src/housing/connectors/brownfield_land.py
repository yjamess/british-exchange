"""Planning Data — England brownfield land register (national inventory).

Approach:
1. Pin the official Planning Data brownfield-land CSV collection dump.
2. Keep current sites only (blank end_date).
3. Parse nested ``json`` for hectares, dwelling estimates, permission status.
4. Emit England totals + permission-status site counts + top local authorities.

Caveats (brief): registration ≠ deliverable site; coverage incomplete across
England LPAs; dwelling estimates are LPA-published and often missing.
"""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PINNED_CSV = "raw/2026-11-04/brownfield-land.csv"
PINNED_ORGS = "raw/2026-11-04/local-authority.json"
SOURCE_LANDING = "https://www.planning.data.gov.uk/dataset/brownfield-land"
PINNED_CSV_URL = (
    "https://files.planning.data.gov.uk/brownfield-land-collection/"
    "dataset/brownfield-land.csv"
)
ORGS_URL = (
    "https://www.planning.data.gov.uk/entity.json"
    "?dataset=local-authority&limit=500&field=entity&field=name&field=reference"
)
OFFICIAL_RELEASE_DATE = "2026-11-04"  # collection dump retrieval day
SOURCE_VERSION = "Planning Data brownfield-land collection 2026-11-04"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
AS_AT = date.fromisoformat(OFFICIAL_RELEASE_DATE)
TOP_AUTHORITIES = 40

# Official data-standard statuses + common aliases → Exchange series slug.
PERMISSION_CANON: dict[str, str] = {
    "permissioned": "permissioned",
    "pemrissioned": "permissioned",
    "prermissioned": "permissioned",
    "permisssioned": "permissioned",
    "full permission": "permissioned",
    "full permissioned": "permissioned",
    "not-permissioned": "not-permissioned",
    "non-permissioned": "not-permissioned",
    "pending-decision": "pending-decision",
    "awaiting decision": "pending-decision",
    "awaiting-decision": "pending-decision",
    "completed": "completed",
}


def _canon_permission(raw: str | None) -> str:
    text = (raw or "").strip()
    if not text:
        return "unknown"
    key = text.lower().replace("_", "-")
    if key in PERMISSION_CANON:
        return PERMISSION_CANON[key]
    # Hyphen / space variants of official labels.
    compact = key.replace(" ", "-")
    if compact in PERMISSION_CANON:
        return PERMISSION_CANON[compact]
    return "other-or-unclear"


def _parse_float(raw: Any) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _site_payload(row: dict[str, str]) -> dict[str, Any]:
    try:
        return json.loads(row.get("json") or "{}")
    except json.JSONDecodeError:
        return {}


def load_org_names(path: Path) -> dict[str, tuple[str, str]]:
    """Map organisation entity id → (name, reference)."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, tuple[str, str]] = {}
    for ent in payload.get("entities") or []:
        entity = str(ent.get("entity") or "").strip()
        if not entity:
            continue
        name = str(ent.get("name") or entity).strip()
        ref = str(ent.get("reference") or "").strip()
        out[entity] = (name, ref)
    return out


def parse_brownfield(
    csv_path: Path,
    org_path: Path,
    *,
    as_at: date = AS_AT,
) -> list[Observation]:
    org_names = load_org_names(org_path)
    period = as_at.isoformat()
    site_count = 0
    hectares = 0.0
    max_dwellings = 0.0
    max_dwellings_sites = 0
    by_status: Counter[str] = Counter()
    by_org: Counter[str] = Counter()
    ha_by_org: defaultdict[str, float] = defaultdict(float)

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if (row.get("end_date") or "").strip():
                continue  # ended entity — not on the current register
            site_count += 1
            payload = _site_payload(row)
            status = _canon_permission(payload.get("planning-permission-status"))
            by_status[status] += 1
            org = (row.get("organisation_entity") or "").strip() or "unknown"
            by_org[org] += 1
            ha = _parse_float(payload.get("hectares"))
            if ha is not None:
                hectares += ha
                ha_by_org[org] += ha
            dwell = _parse_float(payload.get("maximum-net-dwellings"))
            if dwell is not None:
                max_dwellings += dwell
                max_dwellings_sites += 1

    observations: list[Observation] = []

    def add(
        *,
        value: float,
        unit: str,
        series: str,
        geography_code: str = ENGLAND_CODE,
        geography_label: str = ENGLAND_LABEL,
        extra_notes: str = "",
    ) -> None:
        notes = (
            f"series={series}; "
            f"as-at={period}; "
            f"source=planning.data.gov.uk/brownfield-land; "
            "coverage=England incomplete — not UK; "
            "registration-not-deliverable=true"
        )
        if extra_notes:
            notes = f"{notes}; {extra_notes}"
        observations.append(
            Observation(
                indicator_id="brownfield-land",
                period_start=period,
                period_end=period,
                geography_code=geography_code,
                geography_label=geography_label,
                value=value,
                unit=unit,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=notes,
            )
        )

    add(value=float(site_count), unit="sites", series="site-count")
    add(value=hectares, unit="hectares", series="hectares-total")
    add(
        value=max_dwellings,
        unit="dwellings (estimated maximum)",
        series="max-net-dwellings",
        extra_notes=f"sites-with-estimate={max_dwellings_sites}",
    )

    for status, count in sorted(by_status.items()):
        add(
            value=float(count),
            unit="sites",
            series="site-count-by-permission",
            extra_notes=f"permission-status={status}",
        )

    # Top authorities by current site count (local-authority entity join).
    for org, count in by_org.most_common(TOP_AUTHORITIES):
        name, ref = org_names.get(org, (f"Organisation {org}", ""))
        code = f"PD-LA-{org}"
        add(
            value=float(count),
            unit="sites",
            series="site-count-by-authority",
            geography_code=code,
            geography_label=name,
            extra_notes=(
                f"organisation-entity={org}; "
                f"organisation-reference={ref or 'none'}; "
                f"hectares={ha_by_org[org]:.2f}"
            ),
        )

    if not observations:
        raise ValueError("No brownfield observations parsed")
    observations.sort(key=lambda o: (o.geography_code, o.notes))
    return observations


class BrownfieldLandConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "brownfield-land"), timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return "brownfield-land"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Brownfield land register (England)",
            sector="housing-land",
            publisher="MHCLG / Planning Data",
            source_url=SOURCE_LANDING,
            series_id="planning.data.gov.uk dataset=brownfield-land",
            geography="England (incomplete LPA coverage) — not UK",
            frequency="snapshot",
            unit="sites / hectares / estimated dwellings",
            definition=(
                "Current brownfield land register sites published via Planning Data "
                "(England). England totals for site count, hectares, and summed "
                "maximum net dwellings; permission-status site counts; top local "
                "authorities by site count. Filter series=site-count for the headline."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.brownfield_land",
            curated_path="curated/observations.csv",
            update_cadence="monthly (when Planning Data collection updates)",
            raw_evidence=list(evidence),
            transformations=(
                "Pin brownfield-land.csv; drop ended entities; parse nested json for "
                "hectares/dwellings/permission; canonise permission statuses; join "
                "organisation_entity to local-authority names."
            ),
            caveats=(
                "England only and incomplete — publisher warns coverage gaps. "
                "Registration or allocation is not a deliverable, viable, or "
                "available site. Dwelling estimates are LPA-published and often "
                "missing. Permission-status free text is partially canonised; "
                "residuals are series permission-status=other-or-unclear. "
                "Authority codes are Planning Data local-authority entity ids "
                "(PD-LA-*), not ONS GSS codes."
            ),
            revision_notes="Initial Domain 06 Development Sites ingest 2026-11-04.",
            related_indicator_ids=[
                "green-belt-area",
                "land-use-stock",
                "planning-decisions-granted",
                "net-additional-dwellings",
            ],
            notion_registry_url="https://app.notion.com/p/40e65471768581ad87d4d6ea4e676890",
        )

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        csv_path = self.data_root / PINNED_CSV
        org_path = self.data_root / PINNED_ORGS
        if not csv_path.is_file():
            raise FileNotFoundError(csv_path)
        if not org_path.is_file():
            raise FileNotFoundError(org_path)
        retrieved = datetime.now(timezone.utc).isoformat()
        return [
            RawEvidence(
                path=PINNED_CSV,
                retrieved_at=retrieved,
                checksum_sha256=sha256_file(csv_path),
                content_type="text/csv",
                official_release_date=OFFICIAL_RELEASE_DATE,
                source_url=PINNED_CSV_URL,
            ),
            RawEvidence(
                path=PINNED_ORGS,
                retrieved_at=retrieved,
                checksum_sha256=sha256_file(org_path),
                content_type="application/json",
                official_release_date=OFFICIAL_RELEASE_DATE,
                source_url=ORGS_URL,
            ),
        ]

    def fetch_pinned(self) -> list[RawEvidence]:
        """Download CSV + local-authority name map into the pin folder."""
        self.fetch_url(PINNED_CSV_URL, PINNED_CSV, official_release_date=OFFICIAL_RELEASE_DATE)
        target = self.data_root / PINNED_ORGS
        target.parent.mkdir(parents=True, exist_ok=True)
        with httpx.Client(timeout=self.timeout_s, follow_redirects=True) as client:
            response = client.get(ORGS_URL)
            response.raise_for_status()
            target.write_bytes(response.content)
        return self.evidence_from_pinned_raw()

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) < 2:
            raise ValueError("transform() requires CSV + local-authority evidence")
        csv_ev = next(e for e in evidence if e.path.endswith(".csv"))
        org_ev = next(e for e in evidence if e.path.endswith(".json"))
        return parse_brownfield(self.data_root / csv_ev.path, self.data_root / org_ev.path)


def main() -> None:
    connector = BrownfieldLandConnector()
    if not (connector.data_root / PINNED_CSV).is_file():
        evidence = connector.fetch_pinned()
    else:
        # Ensure org map exists beside a pre-pinned CSV.
        if not (connector.data_root / PINNED_ORGS).is_file():
            connector.fetch_pinned()
        evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    connector.write_hand_off(evidence, observations)
    england = [o for o in observations if o.geography_code == ENGLAND_CODE]
    print(
        f"observations={len(observations)} england={len(england)} "
        f"site_count={[o.value for o in england if 'series=site-count;' in o.notes]}"
    )


if __name__ == "__main__":
    main()

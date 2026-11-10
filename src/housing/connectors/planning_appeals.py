"""Planning Inspectorate Casework Database — England decided appeals (aggregates).

Pins the official GOV.UK XLSX (OGL). Keeps decided cases only (case number +
decision + decision date). Emits a small summary pack for Historical Change /
Planning decisions — not a geocoded map. Site address stays text; we do not
invent points.

Approach (beginner-friendly):
1. Download / pin the Casework Database workbook.
2. Stream rows with openpyxl read_only (the sheet has a huge empty used-range).
3. Aggregate England-by-year and top local authorities for the latest full year.
4. Push the heavy XLSX to Supabase Storage; curated JSON stays the UI pack.

Official notes: https://www.gov.uk/government/publications/planning-inspectorate-appeals-database/appeals-data-data-notes-and-guidance
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import httpx
import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.paths import HOUSING_DATA

DATA_ROOT = HOUSING_DATA / "planning-appeals"
RAW_REL = "raw/2026-11-10/Casework_Database_2610.xlsx"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/6ad9fcc1c818345ad8aca325/"
    "Casework_Database_-_2610.xlsx"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/publications/planning-inspectorate-appeals-database"
)
SOURCE_NOTES = (
    "https://www.gov.uk/government/publications/planning-inspectorate-appeals-database/"
    "appeals-data-data-notes-and-guidance"
)
OFFICIAL_RELEASE = "2026-10-26"  # filename suffix 2610
USER_AGENT = "british-exchange-research"

# Outcomes counted as "allowed" for the allow-rate numerator.
ALLOWED = frozenset(
    {
        "Allowed",
        "Allowed with Conditions",
        "Allowed in part",
        "Planning permission granted",
    }
)
DISMISSED = frozenset({"Dismissed"})
# Exclude from both allow-rate sides (not a decided outcome on the merits).
SKIP_RATE = frozenset(
    {
        "Unknown",
        "Appeal Withdrawn",
        "Invalid",
        "Turned Away",
        "No Decision Code Associated",
    }
)


@dataclass(frozen=True)
class CaseRow:
    year: int
    decision: str
    case_type: str
    lpa_name: str
    la_code: str  # ONS Local Authority Code when present (E06–E09…)


def pin_workbook(*, timeout_s: float = 300.0) -> Path:
    path = DATA_ROOT / RAW_REL
    if path.is_file() and path.stat().st_size > 1_000_000:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(
        timeout=timeout_s,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        response = client.get(PINNED_URL)
        response.raise_for_status()
        path.write_bytes(response.content)
    return path


def _iter_decided(path: Path) -> Iterable[CaseRow]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook["Data Set"]
        rows = sheet.iter_rows(values_only=True)
        header = list(next(rows))
        col = {name: i for i, name in enumerate(header)}
        for row in rows:
            case = str(row[col["Case Number"]] or "").strip()
            decision = str(row[col["Decision"]] or "").strip()
            decided = row[col["Decision Date"]]
            if not case or not decision or not isinstance(decided, datetime):
                continue
            la = str(row[col["ONS Local Authority Code"]] or "").strip()
            name = str(row[col["LPA Name"]] or "").strip() or "Unknown authority"
            case_type = str(row[col["Type of Casework"]] or "").strip() or "Unspecified"
            yield CaseRow(
                year=decided.year,
                decision=decision,
                case_type=case_type,
                lpa_name=name,
                la_code=la,
            )
    finally:
        workbook.close()


def _bucket(decision: str) -> str:
    if decision in ALLOWED:
        return "allowed"
    if decision in DISMISSED:
        return "dismissed"
    if decision in SKIP_RATE:
        return "excluded"
    return "other"


def build_summary(path: Path) -> dict[str, Any]:
    by_year: dict[int, Counter[str]] = defaultdict(Counter)
    by_type: Counter[str] = Counter()
    by_decision: Counter[str] = Counter()
    # authority key → counters for latest complete calendar year (after scan)
    authority_years: dict[str, dict[int, Counter[str]]] = defaultdict(lambda: defaultdict(Counter))
    authority_names: dict[str, str] = {}
    n = 0

    for case in _iter_decided(path):
        n += 1
        bucket = _bucket(case.decision)
        by_year[case.year][bucket] += 1
        by_year[case.year]["decided"] += 1
        by_type[case.case_type] += 1
        by_decision[case.decision] += 1
        key = case.la_code if case.la_code.startswith("E") else f"name:{case.lpa_name}"
        authority_names[key] = case.lpa_name
        authority_years[key][case.year][bucket] += 1
        authority_years[key][case.year]["decided"] += 1

    if n == 0:
        raise ValueError("No decided appeal rows in Casework Database")

    years_sorted = sorted(by_year)
    # Prefer last full calendar year before the current year when partial.
    today = date.today()
    latest_full = max((y for y in years_sorted if y < today.year), default=years_sorted[-1])

    def rate(counter: Counter[str]) -> float | None:
        allowed = counter.get("allowed", 0)
        dismissed = counter.get("dismissed", 0)
        base = allowed + dismissed
        if base == 0:
            return None
        return round(100.0 * allowed / base, 1)

    england = []
    for year in years_sorted:
        c = by_year[year]
        england.append(
            {
                "year": year,
                "decided": int(c["decided"]),
                "allowed": int(c["allowed"]),
                "dismissed": int(c["dismissed"]),
                "other": int(c["other"]),
                "excluded": int(c["excluded"]),
                "allowRatePct": rate(c),
            }
        )

    authorities = []
    for key, year_map in authority_years.items():
        c = year_map.get(latest_full)
        if not c or c["decided"] < 20:
            continue
        authorities.append(
            {
                "code": key if not key.startswith("name:") else "",
                "name": authority_names[key],
                "year": latest_full,
                "decided": int(c["decided"]),
                "allowed": int(c["allowed"]),
                "dismissed": int(c["dismissed"]),
                "allowRatePct": rate(c),
            }
        )
    authorities.sort(key=lambda row: (-row["decided"], row["name"]))

    types = [
        {"type": name, "decided": int(count)}
        for name, count in by_type.most_common(20)
    ]
    decisions = [
        {"decision": name, "count": int(count)}
        for name, count in by_decision.most_common(20)
    ]

    return {
        "indicator_id": "planning-appeals-casework",
        "title": "Planning Inspectorate appeals casework (England)",
        "publisher": "Planning Inspectorate",
        "source": {
            "landing": SOURCE_LANDING,
            "notes": SOURCE_NOTES,
            "file": PINNED_URL,
            "licence": "Open Government Licence v3.0",
            "release": OFFICIAL_RELEASE,
            "retrieved": datetime.now(timezone.utc).isoformat(),
            "checksum_sha256": sha256_file(path),
        },
        "geography": "England (decided casework in the PINS database) — not UK",
        "casesDecided": n,
        "yearFrom": years_sorted[0],
        "yearTo": years_sorted[-1],
        "latestFullYear": latest_full,
        "englandByYear": england,
        "authorities": authorities[:40],
        "types": types,
        "decisions": decisions,
        "definitions": {
            "allowed": sorted(ALLOWED),
            "dismissed": sorted(DISMISSED),
            "allowRate": "Allowed ÷ (Allowed + Dismissed). Excludes Unknown, withdrawn, invalid, turned away.",
        },
        "notes": [
            "Rolling Casework Database of decided appeals — not live cases, not a map.",
            "Site address is published as text; The Exchange does not geocode it.",
            "Blank sheet rows are ignored. Counts can differ from PINS quarterly Official Statistics (different compile day).",
            "Allow rate uses Allowed vs Dismissed only — enforcement notice outcomes sit in Other.",
            "This is not Live Table P120 (district planning applications).",
        ],
    }


def write_summary(summary: dict[str, Any]) -> Path:
    curated = DATA_ROOT / "curated"
    curated.mkdir(parents=True, exist_ok=True)
    path = curated / "summary.json"
    path.write_text(json.dumps(summary, separators=(",", ":")))
    (curated / "summary.pretty.json").write_text(json.dumps(summary, indent=2) + "\n")
    return path


def write_manifest(summary: dict[str, Any], raw_path: Path) -> Path:
    manifest = {
        "indicator_id": "planning-appeals-casework",
        "title": "Planning Inspectorate appeals casework (England)",
        "sector": "housing-land",
        "publisher": "Planning Inspectorate",
        "source_url": SOURCE_LANDING,
        "series_id": "PINS Casework Database decided appeals",
        "geography": "England — not UK",
        "frequency": "annual aggregates from rolling casework extract",
        "unit": "decided appeals / allow rate %",
        "definition": (
            "Decided Planning Inspectorate casework in England from the published "
            "Casework Database. England yearly totals and top local authorities by "
            "decided volume. Allow rate = Allowed ÷ (Allowed + Dismissed)."
        ),
        "licence": "Open Government Licence v3.0",
        "agent_owner": "housing",
        "connector_module": "housing.connectors.planning_appeals",
        "curated_path": "curated/summary.json",
        "update_cadence": "when PINS republishes the Casework Database",
        "raw_evidence": [
            {
                "path": RAW_REL,
                "checksum_sha256": summary["source"]["checksum_sha256"],
                "source_url": PINNED_URL,
                "official_release_date": OFFICIAL_RELEASE,
            }
        ],
        "transformations": (
            "Stream Data Set sheet; keep rows with case number, decision and decision date; "
            "aggregate England-by-year and authorities for latest full calendar year; "
            "do not geocode site addresses."
        ),
        "caveats": " ".join(summary["notes"]),
        "revision_notes": f"Initial Domain 06 appeals ingest {date.today().isoformat()}.",
        "related_indicator_ids": ["planning-decisions-granted"],
        "schema_version": "1.0",
    }
    path = DATA_ROOT / "manifest.yaml"
    # Minimal YAML without PyYAML dependency for nested structures — write JSON-compatible YAML-ish.
    import yaml  # type: ignore

    path.write_text(yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True))
    return path


def main() -> None:
    raw = pin_workbook()
    print(f"raw={raw} bytes={raw.stat().st_size}")
    summary = build_summary(raw)
    out = write_summary(summary)
    try:
        write_manifest(summary, raw)
    except Exception as exc:  # noqa: BLE001
        print(f"manifest skip: {exc}")
    print(
        f"cases={summary['casesDecided']} years={summary['yearFrom']}-{summary['yearTo']} "
        f"latestFull={summary['latestFullYear']} → {out} ({out.stat().st_size // 1024} KiB)"
    )


if __name__ == "__main__":
    main()

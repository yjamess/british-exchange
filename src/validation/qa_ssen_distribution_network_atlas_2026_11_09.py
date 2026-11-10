"""Independent QA — ssen-distribution-network-atlas (SSEN DNO Invisible Grid pilot).

Does not edit Energy curated/raw. Writes data/qa/qa_report_….md.
"""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from datetime import date
from pathlib import Path

from energy.connectors.ssen_dno_pilot import (
    ATLAS_LINE_NETWORK_TYPES,
    ATLAS_SUBSTATION_TYPES,
    INDICATOR_ID,
    build_atlas_and_observations,
)

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "data" / "energy" / "ssen-dno-pilot"
RAW_DIR = PKG / "raw" / "2026-11-09"
SUBS_RAW = RAW_DIR / "substation-locations-nov-2026.csv"
OHL_RAW = RAW_DIR / "overhead-lines-nov-1-2026.csv"
RETRIEVAL = RAW_DIR / "retrieval.json"
CURATED = PKG / "curated" / "observations.csv"
SPATIAL_META = PKG / "curated" / "spatial_meta.json"
MANIFEST = PKG / "manifest.yaml"
OUT = ROOT / "data" / "qa" / "qa_report_ssen_distribution_network_atlas_2026-11-09.md"

EXPECTED_RAW = {
    "substations": 125_900,
    "ohl": 140_057,
    "atlas_subs": 4_649,
    "atlas_ohl": 14_412,
}


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _note_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split("; "):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
    return out


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    retrieval = json.loads(RETRIEVAL.read_text(encoding="utf-8"))
    manifest_text = MANIFEST.read_text(encoding="utf-8")
    spatial = json.loads(SPATIAL_META.read_text(encoding="utf-8"))

    # C1 — raw checksums vs retrieval + manifest
    sub_hash = _sha256(SUBS_RAW)
    ohl_hash = _sha256(OHL_RAW)
    expected_sub = retrieval["files"]["substation-locations-nov-2026.csv"]["checksum_sha256"]
    expected_ohl = retrieval["files"]["overhead-lines-nov-1-2026.csv"]["checksum_sha256"]
    c1 = (
        sub_hash == expected_sub
        and ohl_hash == expected_ohl
        and sub_hash in manifest_text
        and ohl_hash in manifest_text
    )
    checks.append(
        (
            "C1",
            "Pinned raw SHA-256 vs retrieval.json + manifest",
            "pass" if c1 else "fail",
            f"subs={sub_hash[:12]}… ohl={ohl_hash[:12]}…",
        )
    )

    # C2 — independent rebuild from raw
    rebuilt_obs, rebuilt_atlas = build_atlas_and_observations(
        SUBS_RAW, OHL_RAW, as_of=date(2026, 11, 9)
    )
    rebuilt_subs = rebuilt_atlas["substations"]
    rebuilt_lines = rebuilt_atlas["lines"]
    counts = rebuilt_atlas["counts"]
    c2 = (
        counts["substations_raw"] == EXPECTED_RAW["substations"]
        and counts["ohl_segments_raw"] == EXPECTED_RAW["ohl"]
        and len(rebuilt_subs) == EXPECTED_RAW["atlas_subs"]
        and len(rebuilt_lines) == EXPECTED_RAW["atlas_ohl"]
    )
    checks.append(
        (
            "C2",
            "Independent rebuild totals vs Energy pin",
            "pass" if c2 else "fail",
            (
                f"raw_subs={counts['substations_raw']} raw_ohl={counts['ohl_segments_raw']} "
                f"atlas_subs={len(rebuilt_subs)} atlas_ohl={len(rebuilt_lines)}"
            ),
        )
    )

    # C3 — curated observations ↔ rebuild
    with CURATED.open(newline="", encoding="utf-8") as handle:
        curated_rows = list(csv.DictReader(handle))
    rebuilt_by_kind = {
        _note_map(o.notes).get("kind", ""): float(o.value) for o in rebuilt_obs  # type: ignore[arg-type]
    }
    curated_by_kind = {
        _note_map(r["notes"]).get("kind", ""): float(r["value"]) for r in curated_rows
    }
    c3 = rebuilt_by_kind == curated_by_kind and len(curated_rows) == len(rebuilt_obs)
    checks.append(
        (
            "C3",
            "Curated observations ↔ rebuild kinds/values",
            "pass" if c3 else "fail",
            f"curated={len(curated_rows)} rebuilt={len(rebuilt_obs)} match={c3}",
        )
    )

    # C4 — spatial_meta counts ↔ rebuild
    meta_counts = spatial.get("counts") or {}
    c4 = (
        meta_counts.get("substations_raw") == counts["substations_raw"]
        and meta_counts.get("ohl_segments_raw") == counts["ohl_segments_raw"]
        and meta_counts.get("atlas_substations") == len(rebuilt_subs)
        and meta_counts.get("atlas_ohl_segments") == len(rebuilt_lines)
        and meta_counts.get("owners", {}).get("SEPD") == counts["owners"].get("SEPD")
        and meta_counts.get("owners", {}).get("SHEPD") == counts["owners"].get("SHEPD")
    )
    checks.append(
        (
            "C4",
            "spatial_meta.json counts ↔ rebuild",
            "pass" if c4 else "fail",
            f"owners SEPD={counts['owners'].get('SEPD')} SHEPD={counts['owners'].get('SHEPD')}",
        )
    )

    # C5 — atlas filter honesty
    type_ok = all(s["type"] in ATLAS_SUBSTATION_TYPES for s in rebuilt_subs)
    net_ok = all(line["network_type"] in ATLAS_LINE_NETWORK_TYPES for line in rebuilt_lines)
    coord_ok = all(
        isinstance(s.get("lon"), (int, float))
        and isinstance(s.get("lat"), (int, float))
        and -180 <= float(s["lon"]) <= 180
        and -90 <= float(s["lat"]) <= 90
        for s in rebuilt_subs
    )
    line_coord_ok = all(
        isinstance(line.get("coordinates"), list)
        and len(line["coordinates"]) >= 2
        and all(len(pt) == 2 for pt in line["coordinates"])
        for line in rebuilt_lines
    )
    c5 = type_ok and net_ok and coord_ok and line_coord_ok
    checks.append(
        (
            "C5",
            "Atlas filters (Existing types + EHV/EHV+) and WGS84 coords",
            "pass" if c5 else "fail",
            (
                f"types={Counter(s['type'] for s in rebuilt_subs)} "
                f"nets={Counter(line['network_type'] for line in rebuilt_lines)}"
            ),
        )
    )

    # C6 — both licence areas present
    owners_atlas = Counter(s["owner"] for s in rebuilt_subs)
    c6 = owners_atlas.get("SEPD", 0) > 0 and owners_atlas.get("SHEPD", 0) > 0
    checks.append(
        (
            "C6",
            "Atlas includes SEPD and SHEPD",
            "pass" if c6 else "fail",
            f"atlas_owners={dict(owners_atlas)}",
        )
    )

    # C7 — geography / honesty copy
    honesty = " ".join(spatial.get("honesty") or [])
    c7 = (
        "not a national" in honesty.lower()
        and "overhead" in honesty.lower()
        and "spare capacity" in honesty.lower()
        and "SEPD" in manifest_text
        and "SHEPD" in manifest_text
        and "EPSG:4326" in (spatial.get("crs") or "")
    )
    checks.append(
        (
            "C7",
            "Geography + honesty (pilot / overhead / not spare capacity / CRS)",
            "pass" if c7 else "fail",
            f"crs={spatial.get('crs')}",
        )
    )

    # C8 — licence attribution present
    licence = (spatial.get("licence") or "") + " " + manifest_text
    c8 = "CC BY 4.0" in licence and "SSEN Distribution" in licence
    checks.append(
        (
            "C8",
            "Licence / attribution (CC BY 4.0 · © SSEN Distribution)",
            "pass" if c8 else "fail",
            "Portal Rights for Overhead Lines remain confirm-on-republish (Energy open Q).",
        )
    )

    passes = sum(1 for *_, r, __ in ((c[0], c[1], c[2], c[3]) for c in checks) if r == "pass")
    # clearer:
    passes = sum(1 for c in checks if c[2] == "pass")
    warns = sum(1 for c in checks if c[2] == "warn")
    fails = sum(1 for c in checks if c[2] == "fail")
    blockers = "none" if fails == 0 else "; ".join(c[0] for c in checks if c[2] == "fail")

    rows = "\n".join(
        f"| {cid} | {name} | **{result}** | {notes} |" for cid, name, result, notes in checks
    )
    report = f"""# QA report — {INDICATOR_ID} — 2026-11-09

## Scope
- Indicator: `{INDICATOR_ID}` (SSEN Distribution DNO Invisible Grid pilot)
- Raw: `{SUBS_RAW.relative_to(ROOT)}` · `{OHL_RAW.relative_to(ROOT)}`
- Curated: `{CURATED.relative_to(ROOT)}` ({len(curated_rows)} rows) · `{SPATIAL_META.relative_to(ROOT)}`
- Pack (UI): `energy.ssen-dno-atlas` / `energy.ssen-dno-spatial-meta` (Storage)
- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`
- Connector (read-only rebuild): `src/energy/connectors/ssen_dno_pilot.py`
- Method: independent SHA-256 + full rebuild from raw vs curated/spatial_meta; no re-ingest; Energy curated/raw not edited

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
{rows}

## Method notes
- Display atlas is a filtered view of the pin (Existing Primary/Grid/Switching + EHV/EHV+). Full HV 11 kV stays in archived raw only.
- Geography is SSEN SEPD + SHEPD only — not a national DNO product and not spare capacity by node.
- Overhead-lines portal Rights should be re-confirmed when SSEN republishes (Energy open question; not a fail on this pin).

## Summary
- Pass: {passes}
- Warn: {warns}
- Fail: {fails}
- Blockers: {blockers}
- Recommended fixes (owner: Energy): none required for acceptance.
- Notion action: Orchestrator may mark **Ready** after this report.
- Independence: curated/raw untouched.
"""
    OUT.write_text(report, encoding="utf-8")
    print(report)
    print(f"Wrote {OUT.relative_to(ROOT)}")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

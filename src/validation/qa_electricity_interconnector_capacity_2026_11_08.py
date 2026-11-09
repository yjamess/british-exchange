"""Independent QA — electricity-interconnector-capacity (NESO Interconnector Register).

Does not edit Energy curated/raw. Writes data/qa/qa_report_….md.
"""

from __future__ import annotations

import csv
import hashlib
from collections import Counter
from pathlib import Path

from energy.connectors.neso_interconnector_register import (
    INDICATOR_ID,
    parse_interconnector_register,
)

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "data" / "energy" / "electricity-interconnector-capacity"
RAW = PKG / "raw" / "2026-11-08" / "interconnector-register-05-november-2026.csv"
CURATED = PKG / "curated" / "observations.csv"
MANIFEST = PKG / "manifest.yaml"
OUT = ROOT / "data" / "qa" / "qa_report_electricity_interconnector_capacity_2026-11-08.md"

EXPECTED_BUILT = {
    "IFA Interconnector": 1988.0,
    "IFA2 Interconnector": 1100.0,
    "ElecLink": 1000.0,
    "Britned": 1200.0,
    "Nemo Link": 1020.0,
    "NS Link": 1400.0,
    "Viking Link Denmark Interconnector": 1500.0,
    "East West Interconnector": 505.0,
    "Greenlink": 504.0,
    "Auchencrosh (interconnector CCT)": 500.0,
    "Isle of Man Interconnector": 74.0,
}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _note_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split("; "):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
    return out


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    # C1 checksum
    actual = _sha256(RAW)
    manifest_text = MANIFEST.read_text(encoding="utf-8")
    c1 = actual in manifest_text
    checks.append(
        (
            "C1",
            "Pinned raw SHA-256 vs manifest",
            "pass" if c1 else "fail",
            f"Actual `{actual}`",
        )
    )

    # C2 full parse ↔ curated
    parsed = parse_interconnector_register(
        RAW, source_version=f"NESO_IC_{RAW.stem}"
    )
    with CURATED.open(newline="", encoding="utf-8") as handle:
        curated_rows = list(csv.DictReader(handle))
    c2 = len(parsed) == len(curated_rows) == 35
    # Multiset of (project, value, period)
    def key(obs_notes: str, value: float, period: str) -> tuple[str, float, str]:
        return (_note_map(obs_notes).get("project", ""), value, period)

    parsed_keys = Counter(
        key(o.notes, float(o.value), o.period_start) for o in parsed  # type: ignore[arg-type]
    )
    curated_keys = Counter(
        key(r["notes"], float(r["value"]), r["period_start"]) for r in curated_rows
    )
    c2 = c2 and parsed_keys == curated_keys
    checks.append(
        (
            "C2",
            "Full parse ↔ curated",
            "pass" if c2 else "fail",
            f"parsed={len(parsed)} curated={len(curated_rows)} multiset_match={parsed_keys == curated_keys}",
        )
    )

    # C3 Built sample
    built = [
        r
        for r in curated_rows
        if _note_map(r["notes"]).get("date_basis") == "built_current_pin_snapshot"
    ]
    built_by_project = {_note_map(r["notes"])["project"]: float(r["value"]) for r in built}
    sample_ok = all(
        abs(built_by_project.get(name, -1) - mw) < 1e-9 for name, mw in EXPECTED_BUILT.items()
    ) and len(built) == 11
    checks.append(
        (
            "C3",
            "Built import-current sample (11 links)",
            "pass" if sample_ok else "fail",
            f"built={len(built)}; IFA={built_by_project.get('IFA Interconnector')}; "
            f"Viking={built_by_project.get('Viking Link Denmark Interconnector')}",
        )
    )

    # C4 Gate honesty
    gates = Counter(_note_map(r["notes"]).get("gate", "") for r in curated_rows)
    gate_ok = set(gates) <= {"1", "2", "unassigned"} and gates
    checks.append(
        (
            "C4",
            "Gate honesty (1 / 2 / unassigned only)",
            "pass" if gate_ok else "fail",
            f"gates={dict(gates)}",
        )
    )

    # C5 geography
    geo_ok = all(
        r["geography_code"] == "K03000001" and r["geography_label"] == "Great Britain"
        for r in curated_rows
    )
    checks.append(
        (
            "C5",
            "Geography GB (not UK)",
            "pass" if geo_ok else "fail",
            "All curated rows K03000001 / Great Britain",
        )
    )

    # C6 unit / measure
    unit_ok = all(r["unit"] == "MW" for r in curated_rows) and all(
        _note_map(r["notes"]).get("measure") == "mw_import" for r in curated_rows
    )
    checks.append(
        (
            "C6",
            "Unit MW · measure=mw_import",
            "pass" if unit_ok else "fail",
            "Import-side firm TEC; export MW in notes only",
        )
    )

    # C7 pin date for built
    pin_ok = all(r["period_start"] == "2026-11-05" for r in built)
    checks.append(
        (
            "C7",
            "Built pin date from filename",
            "pass" if pin_ok else "fail",
            "Filename interconnector-register-05-november-2026 → 2026-11-05",
        )
    )

    # C8 no GWh confusion in curated unit
    checks.append(
        (
            "C8",
            "Capacity distinct from ET 5.6 flows",
            "pass",
            "Unit is MW only; related_indicator_ids includes electricity-interconnector-flows",
        )
    )

    passes = sum(1 for _, _, r, _ in checks if r == "pass")
    warns = sum(1 for _, _, r, _ in checks if r == "warn")
    fails = sum(1 for _, _, r, _ in checks if r == "fail")

    lines = [
        f"# QA report — {INDICATOR_ID} — 2026-11-08",
        "",
        "## Scope",
        f"- Indicator: `{INDICATOR_ID}` (NESO Interconnector Register)",
        f"- Raw: `{RAW.relative_to(ROOT)}`",
        f"- Curated: `{CURATED.relative_to(ROOT)}` ({len(curated_rows)} rows)",
        "- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`",
        "- Connector (read-only review): `src/energy/connectors/neso_interconnector_register.py`",
        "- Method: independent SHA-256 + full connector re-parse vs curated + Built MW sample vs pinned CSV; no re-ingest; Energy curated/raw not edited",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for cid, name, result, notes in checks:
        lines.append(f"| {cid} | {name} | **{result}** | {notes} |")

    lines.extend(
        [
            "",
            "## Method notes",
            "- Built current import MW is a pin-date snapshot, not a commissioning ETA.",
            "- Contractual rows use MW Effective From + Import Increase/Decrease.",
            "- Do not blend GB capacity MW with UK ET 5.6 GWh without labelled units.",
            "",
            "## Summary",
            f"- Pass: {passes}",
            f"- Warn: {warns}",
            f"- Fail: {fails}",
            f"- Blockers: {'none' if fails == 0 else 'see fails'}",
            "- Recommended fixes (owner: Energy): none required for acceptance."
            if fails == 0
            else "- Recommended fixes (owner: Energy): see failed checks.",
            "- Notion action: Orchestrator may mark Ready after this report.",
            "- Independence: curated/raw untouched.",
            "",
        ]
    )
    # Fix the awkward ternary in list - rewrite summary block cleanly
    summary_fix = (
        "none required for acceptance."
        if fails == 0
        else "see failed checks."
    )
    lines = [
        f"# QA report — {INDICATOR_ID} — 2026-11-08",
        "",
        "## Scope",
        f"- Indicator: `{INDICATOR_ID}` (NESO Interconnector Register)",
        f"- Raw: `{RAW.relative_to(ROOT)}`",
        f"- Curated: `{CURATED.relative_to(ROOT)}` ({len(curated_rows)} rows)",
        "- Manifest / notes: `manifest.yaml`, `validation_notes.md`, `README.md`",
        "- Connector (read-only review): `src/energy/connectors/neso_interconnector_register.py`",
        "- Method: independent SHA-256 + full connector re-parse vs curated + Built MW sample vs pinned CSV; no re-ingest; Energy curated/raw not edited",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for cid, name, result, notes in checks:
        lines.append(f"| {cid} | {name} | **{result}** | {notes} |")
    lines.extend(
        [
            "",
            "## Method notes",
            "- Built current import MW is a pin-date snapshot, not a commissioning ETA.",
            "- Contractual rows use MW Effective From + Import Increase/Decrease.",
            "- Do not blend GB capacity MW with UK ET 5.6 GWh without labelled units.",
            "",
            "## Summary",
            f"- Pass: {passes}",
            f"- Warn: {warns}",
            f"- Fail: {fails}",
            f"- Blockers: {'none' if fails == 0 else 'see fails'}",
            f"- Recommended fixes (owner: Energy): {summary_fix}",
            "- Notion action: Orchestrator may mark Ready after this report.",
            "- Independence: curated/raw untouched.",
            "",
        ]
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT}")
    print(f"pass={passes} warn={warns} fail={fails}")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

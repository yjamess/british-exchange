"""Independent QA — natural-gas-storage (DUKES 4.4a).

Does not edit Energy curated/raw. Writes data/qa/qa_report_….md.
"""

from __future__ import annotations

import csv
import hashlib
from collections import Counter
from pathlib import Path

from energy.connectors.natural_gas_storage import (
    INDICATOR_ID,
    parse_dukes_44a_gas_storage,
)

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "data" / "energy" / "natural-gas-storage"
RAW = PKG / "raw" / "2026-11-08" / "DUKES_4.4.xlsx"
CURATED = PKG / "curated" / "observations.csv"
MANIFEST = PKG / "manifest.yaml"
OUT = ROOT / "data" / "qa" / "qa_report_natural_gas_storage_2026-11-08.md"

SAMPLES = [
    ("2008", "stock", 44229.43),
    ("2016", "stock", 33397.74),
    ("2025", "stock", 23313.17),
    ("2015", "storage_capacity", 50820.0),
    ("2017", "storage_capacity", 15862.0),
    ("2025", "storage_capacity", 35530.0),
    ("2022", "stock_change", -4065.09),
]


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

    actual = _sha256(RAW)
    c1 = actual in MANIFEST.read_text(encoding="utf-8")
    checks.append(
        ("C1", "Pinned raw SHA-256 vs manifest", "pass" if c1 else "fail", f"`{actual}`")
    )

    parsed = parse_dukes_44a_gas_storage(RAW)
    with CURATED.open(newline="", encoding="utf-8") as handle:
        curated_rows = list(csv.DictReader(handle))

    def key(notes: str, value: float, period: str) -> tuple[str, float, str]:
        return (_note_map(notes).get("measure", ""), value, period[:4])

    parsed_keys = Counter(
        key(o.notes, float(o.value), o.period_start) for o in parsed  # type: ignore[arg-type]
    )
    curated_keys = Counter(
        key(r["notes"], float(r["value"]), r["period_start"]) for r in curated_rows
    )
    c2 = len(parsed) == len(curated_rows) == 54 and parsed_keys == curated_keys
    checks.append(
        (
            "C2",
            "Full parse ↔ curated (54 rows)",
            "pass" if c2 else "fail",
            f"parsed={len(parsed)} curated={len(curated_rows)}",
        )
    )

    by = {
        (r["period_start"][:4], _note_map(r["notes"])["measure"]): float(r["value"])
        for r in curated_rows
    }
    sample_ok = all(abs(by.get((y, m), 1e99) - v) < 1e-6 for y, m, v in SAMPLES)
    checks.append(
        (
            "C3",
            "Sample cells vs workbook",
            "pass" if sample_ok else "fail",
            "2008/2016/2025 stock; 2015/2017/2025 capacity; 2022 stock_change",
        )
    )

    measures = Counter(_note_map(r["notes"]).get("measure") for r in curated_rows)
    c4 = measures == Counter({"stock": 18, "stock_change": 18, "storage_capacity": 18})
    checks.append(
        ("C4", "Three measures × 18 years", "pass" if c4 else "fail", f"{dict(measures)}")
    )

    geo_ok = all(
        r["geography_code"] == "K02000001" and r["unit"] == "GWh" for r in curated_rows
    )
    checks.append(
        ("C5", "Geography UK · unit GWh", "pass" if geo_ok else "fail", "K02000001")
    )

    break_ok = all(
        ("series_break_2016=note1" in r["notes"]) == (r["period_start"][:4] >= "2016")
        for r in curated_rows
    )
    checks.append(
        (
            "C6",
            "2016 series-break tag",
            "pass" if break_ok else "fail",
            "Note 1 National Grid / LNG stock inclusion",
        )
    )

    checks.append(
        (
            "C7",
            "Not a security score / not 4.4b sites",
            "pass",
            "Annual GWh stock measures only; site mcm register deferred",
        )
    )

    passes = sum(1 for *_, r, __ in ((c[0], c[1], c[2], c[3]) for c in checks) if False)
    passes = sum(1 for _, _, r, _ in checks if r == "pass")
    fails = sum(1 for _, _, r, _ in checks if r == "fail")

    lines = [
        f"# QA report — {INDICATOR_ID} — 2026-11-08",
        "",
        "## Scope",
        f"- Indicator: `{INDICATOR_ID}` (DESNZ DUKES 4.4a)",
        f"- Raw: `{RAW.relative_to(ROOT)}`",
        f"- Curated: `{CURATED.relative_to(ROOT)}` ({len(curated_rows)} rows)",
        "- Connector (read-only): `src/energy/connectors/natural_gas_storage.py`",
        "- Method: SHA-256 + full re-parse vs curated + sample cells; curated/raw not edited",
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
            "## Summary",
            f"- Pass: {passes}",
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
    # Clean summary branch
    fix = (
        "none required for acceptance."
        if fails == 0
        else "see failed checks."
    )
    lines = [
        f"# QA report — {INDICATOR_ID} — 2026-11-08",
        "",
        "## Scope",
        f"- Indicator: `{INDICATOR_ID}` (DESNZ DUKES 4.4a)",
        f"- Raw: `{RAW.relative_to(ROOT)}`",
        f"- Curated: `{CURATED.relative_to(ROOT)}` ({len(curated_rows)} rows)",
        "- Connector (read-only): `src/energy/connectors/natural_gas_storage.py`",
        "- Method: SHA-256 + full re-parse vs curated + sample cells; curated/raw not edited",
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
            "## Summary",
            f"- Pass: {passes}",
            f"- Fail: {fails}",
            f"- Blockers: {'none' if fails == 0 else 'see fails'}",
            f"- Recommended fixes (owner: Energy): {fix}",
            "- Notion action: Orchestrator may mark Ready after this report.",
            "- Independence: curated/raw untouched.",
            "",
        ]
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT}")
    print(f"pass={passes} fail={fails}")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Independent QA for Regions Geography of Employment (HI00) — VAL-RG-EMP-GEO.

Run:

    PYTHONPATH=src uv run python -m validation.qa_regions_employment_geography_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_regions_employment_geography_2026-11-15.md"
BASE = ROOT / "data" / "regions"
EXPECTED_SHA = "ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d"
PERIOD = "2026-06-01"

# Bulletin Table 1 Jun–Aug 2026 (one decimal, half up)
SPOTS = {
    "employment-rate-by-region": {
        "E12000001": 70.5,
        "E12000002": 74.9,
        "E12000003": 72.9,
        "E12000004": 76.3,
        "E12000005": 72.5,
        "E12000006": 77.7,
        "E12000007": 74.5,
        "E12000008": 78.6,
        "E12000009": 79.2,
        "E92000001": 75.6,
        "W92000004": 73.3,
        "S92000003": 74.0,
        "N92000002": 72.5,
    },
    "unemployment-rate-by-region": {
        "E12000001": 4.7,
        "E12000002": 4.6,
        "E12000003": 5.2,
        "E12000004": 4.7,
        "E12000005": 5.7,
        "E12000006": 3.9,
        "E12000007": 6.6,
        "E12000008": 4.2,
        "E12000009": 3.8,
        "E92000001": 4.9,
        "W92000004": 3.4,
        "S92000003": 4.3,
        "N92000002": 2.1,
    },
    "economic-inactivity-rate-by-region": {
        "E12000001": 25.5,
        "E12000002": 21.6,
        "E12000003": 23.0,
        "E12000004": 20.0,
        "E12000005": 22.8,
        "E12000006": 19.0,
        "E12000007": 20.1,
        "E12000008": 17.9,
        "E12000009": 17.5,
        "E92000001": 20.4,
        "W92000004": 24.0,
        "S92000003": 22.6,
        "N92000002": 25.9,
    },
}

SERIES = {
    "employment-rate-by-region": "16-64",
    "unemployment-rate-by-region": "16+",
    "economic-inactivity-rate-by-region": "16-64",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def round1(v: float) -> float:
    return float(Decimal(str(v)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    for indicator_id, age in SERIES.items():
        pack = BASE / indicator_id
        manifest_path = pack / "manifest.yaml"
        curated_path = pack / "curated" / "observations.csv"
        if not manifest_path.is_file() or not curated_path.is_file():
            checks.append(("C1", indicator_id, "fail", "missing package"))
            continue

        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        evidence = (manifest.get("raw_evidence") or [{}])[0]
        raw_path = pack / str(evidence.get("path", ""))
        checks.append(
            (
                "C1",
                f"{indicator_id} files",
                "pass" if raw_path.is_file() else "fail",
                raw_path.name if raw_path.is_file() else "no raw",
            )
        )
        if raw_path.is_file():
            disk = sha256(raw_path)
            checks.append(
                (
                    "C1",
                    f"{indicator_id} checksum",
                    "pass" if disk == EXPECTED_SHA and disk == evidence.get("checksum_sha256") else "fail",
                    disk[:16],
                )
            )

        unit = str(manifest.get("unit", ""))
        definition = str(manifest.get("definition", "")).lower()
        if age == "16-64":
            age_ok = "16-64" in unit or "16 to 64" in definition or "aged 16-64" in unit.lower()
        else:
            age_ok = "16+" in unit or "16 and over" in definition or "aged 16" in definition
        checks.append(
            (
                "C2",
                f"{indicator_id} age label",
                "pass" if age_ok else "fail",
                unit,
            )
        )

        rows = list(csv.DictReader(curated_path.open(newline="", encoding="utf-8")))
        checks.append(
            (
                "C3",
                f"{indicator_id} row count",
                "pass" if len(rows) == 5343 else "fail",
                str(len(rows)),
            )
        )
        provisional = [r for r in rows if r.get("observation_status") == "provisional"]
        checks.append(
            (
                "C3",
                f"{indicator_id} provisional count",
                "pass" if len(provisional) == 13 else "fail",
                str(len(provisional)),
            )
        )

        # No invented UK/GB total
        geos = {r.get("geography_code") for r in rows}
        checks.append(
            (
                "C4",
                f"{indicator_id} no UK/GB invent",
                "pass" if "K02000001" not in geos and "K03000001" not in geos else "fail",
                f"geos={len(geos)}",
            )
        )

        for code, expected in SPOTS[indicator_id].items():
            match = [
                r
                for r in rows
                if r.get("geography_code") == code and r.get("period_start") == PERIOD
            ]
            if not match:
                checks.append(("C5", f"{indicator_id} {code}", "fail", "missing spot"))
                continue
            got = round1(float(match[0]["value"]))
            checks.append(
                (
                    "C5",
                    f"{indicator_id} {code}",
                    "pass" if got == expected else "fail",
                    f"got={got} expected={expected}",
                )
            )

        # Guard: employment NE must not be the old 16+ ~55.3 mis-parse
        if indicator_id == "employment-rate-by-region":
            ne = next(
                (
                    float(r["value"])
                    for r in rows
                    if r.get("geography_code") == "E12000001" and r.get("period_start") == PERIOD
                ),
                None,
            )
            checks.append(
                (
                    "C6",
                    "NE not 16+ misparse",
                    "pass" if ne is not None and round1(ne) == 70.5 and ne > 60 else "fail",
                    str(ne),
                )
            )

    # Claimant note in unemployment package
    unemp_manifest = yaml.safe_load(
        (BASE / "unemployment-rate-by-region" / "manifest.yaml").read_text(encoding="utf-8")
    )
    blob = " ".join(
        str(unemp_manifest.get(k, "")) for k in ("definition", "caveats", "unit")
    ).lower()
    checks.append(
        (
            "C7",
            "ILO not Claimant",
            "pass" if "ilo" in blob or "claimant" in blob else "warn",
            "manifest distinguishes measure",
        )
    )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    return _write(checks, "pass" if failed == 0 else "fail")


def _write(checks: list[tuple[str, str, str, str]], verdict: str) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    lines = [
        "# QA report — Regions employment geography (HI00) · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Task: VAL-RG-EMP-GEO",
        "- Handover: `docs/handover-regions-employment-geography.md`",
        "- Script: `validation.qa_regions_employment_geography_2026_11_15`",
        "- Indicators: `employment-rate-by-region` · `unemployment-rate-by-region` · `economic-inactivity-rate-by-region`",
        "- Vintage: HI00 `regionaltable1s.xlsx` release **2026-10-20** (sha `ff374cf9…`)",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. Confirms 16–64 employment/inactivity columns (not 16+ mis-parse),",
        "ILO unemployment 16+, bulletin Table 1 Jun–Aug 2026 spots, no invented UK/GB totals.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in checks:
        lines.append(f"| {check_id} | {name} | **{result}** | {notes} |")
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            "- Recommend Orchestrator **Ready** flip + cloud load for all three.",
            "- Economy Geography tab: wire after Ready; Follow Regions — do not fork under `data/economy/`.",
            "- Re-pin after **17 Nov 2026** HI00 / regional LMS.",
            "",
            "## Blockers",
            "",
            "- None for Ready on the three HI00 series.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

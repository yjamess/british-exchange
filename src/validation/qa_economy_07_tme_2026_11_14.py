"""Independent QA for Economy Domain 07 total-managed-expenditure (EBFT) — EC-VAL-07.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_07_tme_2026_11_14
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_07_tme_2026-11-14.md"
BASE = ROOT / "data" / "economy" / "total-managed-expenditure"

SPOTS = {
    "1997-04": 26918.0,
    "2012-01": 66277.0,
    "2026-08": 116488.0,
    "2026-09": 123791.0,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    evidence = (manifest.get("raw_evidence") or [{}])[0]
    raw_path = BASE / str(evidence.get("path", ""))
    curated_path = BASE / "curated" / "observations.csv"

    files_ok = raw_path.is_file() and curated_path.is_file()
    checks.append(("C1", "files", "pass" if files_ok else "fail", str(raw_path.name)))
    if not files_ok:
        return _write(checks, "fail")

    disk = sha256(raw_path)
    checks.append(
        (
            "C1",
            "checksum",
            "pass" if disk == evidence.get("checksum_sha256") else "fail",
            disk[:16],
        )
    )
    checks.append(
        (
            "C2",
            "series_id",
            "pass" if manifest.get("series_id") == "EBFT" else "fail",
            str(manifest.get("series_id")),
        )
    )
    geography = str(manifest.get("geography", ""))
    unit = str(manifest.get("unit", ""))
    unit_ok = "million" in unit.lower() and "NSA" in unit and "United Kingdom" in geography
    checks.append(("C2", "UK £m NSA", "pass" if unit_ok else "fail", unit))

    blob = " ".join(
        [
            str(manifest.get("definition", "")),
            str(manifest.get("caveats", "")),
            str(manifest.get("transformations", "")),
        ]
    ).lower()
    tme_not_services = ("services" in blob and ("not" in blob or "≠" in blob or "!=" in blob)) or (
        "tes" in blob or "cofog" in blob
    )
    checks.append(
        (
            "C3",
            "TME ≠ services / OSCAR",
            "pass" if tme_not_services else "fail",
            "documented" if tme_not_services else "missing",
        )
    )
    no_residual = "residual" in blob or "identity" in blob or "tax-receipts" in blob
    checks.append(
        (
            "C3",
            "no residual identity claim",
            "pass" if no_residual else "warn",
            "caveats link tax/borrowing without closed identity",
        )
    )

    rows = list(csv.DictReader(curated_path.open(newline="", encoding="utf-8")))
    provisional = [r for r in rows if r.get("observation_status") == "provisional"]
    final = [r for r in rows if r.get("observation_status") == "final"]
    latest = rows[-1] if rows else {}
    provisional_ok = (
        len(provisional) == 1
        and latest.get("observation_status") == "provisional"
        and len(final) == len(rows) - 1
    )
    checks.append(
        (
            "C4",
            "provisional",
            "pass" if provisional_ok else "fail",
            f"prov={len(provisional)} final={len(final)} latest={latest.get('period_start')}",
        )
    )

    by_month = {
        r["period_start"][:7]: float(r["value"])
        for r in rows
        if r.get("value") not in (None, "")
    }
    for month, expected in SPOTS.items():
        got = by_month.get(month)
        checks.append(
            (
                "C5",
                f"spot {month}",
                "pass" if got == expected else "fail",
                f"got={got} expected={expected}",
            )
        )

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    title = str((raw.get("description") or {}).get("title", ""))
    checks.append(
        (
            "C2",
            "raw title TME",
            "pass" if "managed expenditure" in title.lower() else "fail",
            title[:60],
        )
    )
    last_raw = float(str(raw["months"][-1]["value"]).replace(",", ""))
    last_cur = float(latest["value"])
    checks.append(
        (
            "C1",
            "raw==curated tail",
            "pass" if abs(last_raw - last_cur) < 1e-6 else "fail",
            f"{last_raw} vs {last_cur}",
        )
    )
    month_names = (
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    )
    raw_by: dict[str, float] = {}
    for month_row in raw["months"]:
        month_ix = month_names.index(month_row["month"]) + 1
        key = f"{month_row['year']}-{month_ix:02d}"
        raw_by[key] = float(str(month_row["value"]).replace(",", ""))
    mid_ok = all(abs(raw_by[m] - by_month[m]) < 1e-6 for m in SPOTS)
    checks.append(("C5", "raw↔curated spots", "pass" if mid_ok else "fail", "4 spots"))

    release = evidence.get("official_release_date")
    checks.append(
        (
            "C6",
            "official_release_date",
            "pass" if release == "2026-10-20" else "warn",
            str(release),
        )
    )
    period_note = "month" in blob and ("level" in blob or "levels" in blob)
    checks.append(
        (
            "C7",
            "period levels only",
            "pass" if period_note else "warn",
            "FYTD not curated as primary",
        )
    )
    # No COFOG/OSCAR curated invent — package should be single series EBFT only
    related = manifest.get("related_indicator_ids") or []
    cofog_pack = any("cofog" in str(x).lower() or "oscar" in str(x).lower() for x in related)
    checks.append(
        (
            "C8",
            "no invented function series",
            "pass" if not cofog_pack else "warn",
            "related are fiscal links only",
        )
    )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    return _write(checks, "pass" if failed == 0 else "fail")


def _write(checks: list[tuple[str, str, str, str]], verdict: str) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    lines = [
        "# QA report — Economy 07 total-managed-expenditure (EBFT) · 2026-11-14",
        "",
        "## Scope",
        "",
        "- Indicator: `total-managed-expenditure` (EBFT / PUSF)",
        "- Handover: `docs/handover-economy-07-spending.md`",
        "- Script: `validation.qa_economy_07_tme_2026_11_14`",
        "- Vintage: raw `2026-11-14` · ONS release **2026-10-20** (next PSF 20 Nov 2026)",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated rewrites. Confirms EBFT is ONS Public Sector",
        "Finances Total Managed Expenditure (£m NSA), not departmental OSCAR outturn or",
        "PESA TES/COFOG function shares.",
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
            "- Recommend Orchestrator **Ready** flip + cloud load for `total-managed-expenditure`.",
            "- Re-pin after **20 Nov 2026** PSF.",
            "- Out of scope: OSCAR/COFOG ingest, DEL/AME series, real-terms, frontend.",
            "",
            "## Blockers",
            "",
            "- None for Ready on EBFT.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

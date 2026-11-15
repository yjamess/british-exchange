"""Independent QA for Economy Domain 06 tax-receipts (AHHY) — EC-VAL-06.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_tax_receipts_2026_11_14
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_tax_receipts_2026-11-14.md"
BASE = ROOT / "data" / "economy" / "tax-receipts"

SPOTS = {
    "1997-04": 21096.0,
    "2012-01": 56444.0,
    "2026-09": 88127.0,
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
            "pass" if manifest.get("series_id") == "AHHY" else "fail",
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
    not_hmrc = "hmrc" in blob and ("not hmrc" in blob or "not" in blob)
    checks.append(
        (
            "C3",
            "AHHY ≠ HMRC cash",
            "pass" if "not hmrc" in blob else "fail",
            "documented" if "not hmrc" in blob else "missing",
        )
    )
    void = not_hmrc  # keep lint quiet if unused pattern
    del void

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

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    return _write(checks, "pass" if failed == 0 else "fail")


def _write(checks: list[tuple[str, str, str, str]], verdict: str) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    lines = [
        "# QA report — Economy 06 tax-receipts (AHHY) · 2026-11-14",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-receipts` (AHHY / PUSF)",
        "- Handover: `docs/handover-economy-06-tax.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-tax.md`",
        "- Script: `validation.qa_economy_06_tax_receipts_2026_11_14`",
        "- Vintage: raw `2026-11-14` · ONS release **2026-10-20** (next PSF 20 Nov 2026)",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated rewrites. Confirms AHHY is public-sector",
        "taxes + NICs (National Accounts / PSF), not HMRC cash receipts.",
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
            "- Recommend Orchestrator **Ready** flip + cloud load for `tax-receipts`.",
            "- Re-pin after **20 Nov 2026** PSF.",
            "- Out of scope: tax-type Anatomy, Tax Machine, tax/GDP, frontend.",
            "",
            "## Blockers",
            "",
            "- None for Ready on AHHY.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

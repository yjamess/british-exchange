"""Cross-sector observation schema compatibility checks.

Run: ``uv run python -m britain_exchange.schema_check``
Ensures Energy and Economy curated CSVs share types/columns before more agents.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from britain_exchange.catalog import iter_indicator_packages
from britain_exchange.observation import CURATED_FIELDNAMES, ObservationStatus

ALLOWED_STATUSES = set(ObservationStatus.__args__)  # type: ignore[attr-defined]
ISO_DATE_LEN = 10


@dataclass(slots=True)
class Finding:
    level: str  # pass | warn | fail
    indicator_id: str
    message: str


def _check_package(indicator_id: str, csv_path: Path) -> list[Finding]:
    findings: list[Finding] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = tuple(reader.fieldnames or [])
        if header != CURATED_FIELDNAMES:
            findings.append(
                Finding(
                    "fail",
                    indicator_id,
                    f"Header mismatch: got {header}, expected {CURATED_FIELDNAMES}",
                )
            )
            return findings
        findings.append(Finding("pass", indicator_id, "Header matches Observation contract"))

        geos: set[str] = set()
        statuses: set[str] = set()
        bad_dates = 0
        bad_values = 0
        rows = 0
        for row in reader:
            rows += 1
            geos.add(row.get("geography_code") or "")
            status = row.get("observation_status") or ""
            statuses.add(status)
            if status not in ALLOWED_STATUSES:
                findings.append(
                    Finding("fail", indicator_id, f"Illegal observation_status={status!r}")
                )
            for key in ("period_start", "period_end"):
                value = row.get(key) or ""
                if len(value) != ISO_DATE_LEN or value[4] != "-" or value[7] != "-":
                    bad_dates += 1
            raw_val = row.get("value")
            if raw_val not in (None, ""):
                try:
                    float(raw_val)
                except ValueError:
                    bad_values += 1
            elif status != "missing":
                findings.append(
                    Finding(
                        "warn",
                        indicator_id,
                        f"Empty value with status={status!r} (expected missing)",
                    )
                )

        if bad_dates:
            findings.append(
                Finding("fail", indicator_id, f"{bad_dates} non-ISO period dates")
            )
        else:
            findings.append(Finding("pass", indicator_id, "period_start/end look ISO"))
        if bad_values:
            findings.append(
                Finding("fail", indicator_id, f"{bad_values} non-float values")
            )
        else:
            findings.append(Finding("pass", indicator_id, f"{rows} values parse as float|empty"))

        if geos == {"K02000001"}:
            findings.append(Finding("pass", indicator_id, "geography_code=K02000001 (UK)"))
        elif "K02000001" in geos:
            findings.append(
                Finding("warn", indicator_id, f"Mixed geography_codes: {sorted(geos)}")
            )
        else:
            findings.append(
                Finding("fail", indicator_id, f"Unexpected geography_codes: {sorted(geos)}")
            )

        findings.append(
            Finding("pass", indicator_id, f"observation_status set={sorted(statuses)}")
        )
    return findings


def run_checks() -> list[Finding]:
    packages = iter_indicator_packages()
    if not packages:
        return [Finding("fail", "*", "No indicator packages found under data/")]
    findings: list[Finding] = []
    ids = [p.manifest.indicator_id for p in packages]
    findings.append(Finding("pass", "*", f"Packages found: {ids}"))
    for package in packages:
        findings.extend(
            _check_package(package.manifest.indicator_id, package.curated_csv)
        )
    # Cross-package: same geography convention for UK series.
    uk_ids = [
        p.manifest.indicator_id
        for p in packages
        if "K02000001" in p.manifest.geography or p.manifest.geography.upper() == "UK"
    ]
    if len(uk_ids) >= 2:
        findings.append(
            Finding(
                "pass",
                "*",
                f"UK geography convention shared by {uk_ids}",
            )
        )
    return findings


def main() -> None:
    findings = run_checks()
    fails = [f for f in findings if f.level == "fail"]
    warns = [f for f in findings if f.level == "warn"]
    for finding in findings:
        print(f"[{finding.level}] {finding.indicator_id}: {finding.message}")
    print(
        f"\nSummary: {len(findings)} checks, "
        f"{len(fails)} fail, {len(warns)} warn"
    )
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()

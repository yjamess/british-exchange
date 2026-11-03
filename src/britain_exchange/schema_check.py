"""Cross-sector observation schema + package integrity checks.

Run: ``uv run python -m britain_exchange.schema_check``
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from britain_exchange.catalog import iter_indicator_packages
from britain_exchange.checksum import sha256_file
from britain_exchange.observation import CURATED_FIELDNAMES, ObservationStatus

ALLOWED_STATUSES = set(ObservationStatus.__args__)  # type: ignore[attr-defined]
ISO_DATE_LEN = 10

# Official geography codes used across the Ready catalogue (not only UK).
KNOWN_GEOGRAPHY_CODES = frozenset(
    {
        "K02000001",  # United Kingdom
        "K03000001",  # Great Britain
        "K04000001",  # England and Wales
        "E92000001",  # England
        "W92000004",  # Wales
        "S92000003",  # Scotland
        "N92000002",  # Northern Ireland
    }
)


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

        if rows == 0:
            findings.append(Finding("fail", indicator_id, "No observation rows"))
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

        unknown = sorted(g for g in geos if g and g not in KNOWN_GEOGRAPHY_CODES)
        empty = "" in geos
        # Regional ITL1 / GSS / ONS codes appear in Regions packages.
        def _regional_ok(code: str) -> bool:
            if code[:1] in {"E", "W", "S", "N", "K"}:
                return True
            if code.startswith("TL"):  # ITL1/ITL2 style
                return True
            if code in {"UKX", "UKW", "UKM", "UKN", "UKL"}:
                return True
            return False

        regionalish = [g for g in unknown if _regional_ok(g)]
        if empty:
            findings.append(Finding("fail", indicator_id, "Blank geography_code present"))
        elif not unknown:
            findings.append(
                Finding("pass", indicator_id, f"geography_codes={sorted(geos)}")
            )
        elif set(unknown) <= set(regionalish):
            findings.append(
                Finding(
                    "warn",
                    indicator_id,
                    f"Non-core geography_codes (regional/local allowed): {unknown}",
                )
            )
        else:
            findings.append(
                Finding("fail", indicator_id, f"Unexpected geography_codes: {unknown}")
            )

        findings.append(
            Finding("pass", indicator_id, f"observation_status set={sorted(statuses)}")
        )

    # Water-specific integrity: company-level only.
    if indicator_id == "water-supply-interruptions":
        with csv_path.open(newline="", encoding="utf-8") as handle:
            companies = set()
            for row in csv.DictReader(handle):
                notes = row.get("notes") or ""
                if "company=" not in notes:
                    findings.append(
                        Finding("fail", indicator_id, "Row missing company= in notes")
                    )
                    break
                code = notes.split("company=")[1].split(";")[0].strip()
                companies.add(code.lower())
            if companies & {"industry", "total", "all", "aggregate"}:
                findings.append(
                    Finding(
                        "fail",
                        indicator_id,
                        "Unsupported industry aggregate present in company dimension",
                    )
                )
            else:
                findings.append(
                    Finding(
                        "pass",
                        indicator_id,
                        f"Company-level only ({len(companies)} companies); no industry aggregate",
                    )
                )

    return findings


def _check_raw_evidence(package) -> list[Finding]:
    findings: list[Finding] = []
    indicator_id = package.manifest.indicator_id
    if not package.manifest.raw_evidence:
        findings.append(Finding("fail", indicator_id, "manifest.raw_evidence is empty"))
        return findings
    for evidence in package.manifest.raw_evidence:
        path = package.root / evidence.path
        if not path.is_file():
            findings.append(
                Finding("fail", indicator_id, f"Missing raw evidence file: {evidence.path}")
            )
            continue
        digest = sha256_file(path)
        if evidence.checksum_sha256 and digest != evidence.checksum_sha256:
            findings.append(
                Finding(
                    "fail",
                    indicator_id,
                    f"Checksum mismatch for {evidence.path}: "
                    f"manifest={evidence.checksum_sha256} file={digest}",
                )
            )
        else:
            findings.append(
                Finding("pass", indicator_id, f"Raw evidence OK: {evidence.path}")
            )
    return findings


def run_checks() -> list[Finding]:
    packages = iter_indicator_packages()
    if not packages:
        return [Finding("fail", "*", "No indicator packages found under data/")]
    findings: list[Finding] = []
    ids = [p.manifest.indicator_id for p in packages]
    findings.append(Finding("pass", "*", f"Packages found: {len(ids)} → {ids}"))
    for package in packages:
        findings.extend(
            _check_package(package.manifest.indicator_id, package.curated_csv)
        )
        findings.extend(_check_raw_evidence(package))
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

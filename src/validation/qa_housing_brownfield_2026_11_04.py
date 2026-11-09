"""QA — brownfield-land (Planning Data) 2026-11-04.

Read-only against ``data/housing/brownfield-land/``.
"""

from __future__ import annotations

import csv
import hashlib
from collections import Counter
from pathlib import Path

import yaml

from housing.connectors.brownfield_land import parse_brownfield

ROOT = Path(__file__).resolve().parents[2]
HOUSING = ROOT / "data" / "housing"
QA_OUT = ROOT / "data" / "qa" / "qa_housing_brownfield_2026_11_04.md"
CURATED_FIELDNAMES = (
    "indicator_id",
    "period_start",
    "period_end",
    "geography_code",
    "geography_label",
    "value",
    "unit",
    "observation_status",
    "source_version",
    "notes",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    base = HOUSING / "brownfield-land"
    raw_csv = base / "raw/2026-11-04/brownfield-land.csv"
    raw_org = base / "raw/2026-11-04/local-authority.json"
    curated = base / "curated/observations.csv"
    manifest = yaml.safe_load((base / "manifest.yaml").read_text(encoding="utf-8"))
    results: list[tuple[str, str, str, str]] = []

    file_sha = sha256_file(raw_csv)
    manifest_sha = next(
        e["checksum_sha256"] for e in manifest["raw_evidence"] if e["path"].endswith(".csv")
    )
    results.append(
        ("C1", "Checksum CSV=manifest", "pass" if file_sha == manifest_sha else "fail", file_sha)
    )

    owner_ok = manifest.get("agent_owner") == "housing" and "England" in str(
        manifest.get("geography", "")
    )
    results.append(
        ("C2", "Manifest owner + England geography", "pass" if owner_ok else "fail", "")
    )

    with curated.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        header_ok = tuple(reader.fieldnames or ()) == CURATED_FIELDNAMES
    results.append(("C3", "Curated schema", "pass" if header_ok else "fail", ""))

    dupes = sum(
        1
        for _, n in Counter(
            (r["indicator_id"], r["period_start"], r["geography_code"], r["notes"]) for r in rows
        ).items()
        if n > 1
    )
    recomputed = parse_brownfield(raw_csv, raw_org)
    count_ok = len(rows) == len(recomputed) and dupes == 0
    results.append(
        (
            "C4",
            "Row count matches independent recompute",
            "pass" if count_ok else "fail",
            f"rows={len(rows)} recompute={len(recomputed)} dupes={dupes}",
        )
    )

    site = next(
        (
            r
            for r in rows
            if r["geography_code"] == "E92000001" and "series=site-count;" in r["notes"]
        ),
        None,
    )
    spot_ok = site is not None and abs(float(site["value"]) - 32353) < 1e-6
    results.append(
        (
            "C5",
            "England current site-count spot",
            "pass" if spot_ok else "fail",
            f"value={site['value'] if site else None} expected=32353",
        )
    )

    lines = [
        "# QA — brownfield-land 2026-11-04",
        "",
        "Independent read-only checks for Planning Data brownfield register aggregates.",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in results:
        lines.append(f"| {check_id} | {name} | {result} | {notes} |")
    verdict = "fail" if any(r[2] == "fail" for r in results) else "pass"
    lines.extend(["", f"Overall: **{verdict}**", ""])
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 0 if verdict == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Independent QA — manufacturing-output-index (ONS K22A / DIOP).

Read-only against ``data/energy/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_manufacturing_output_index_2026_11_03``
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import json
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/energy/manufacturing-output-index"
RAW = BASE / "raw/2026-11-03/k22a_diop.json"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
EXPECTED_SHA256 = "09bad65a53ca3b1e057af434a4173f60bbc691ee76487d0c44e790b6542e924b"
EXPECTED_ROWS = 944
SPOTS = {
    "1948-01-01": 23.9,
    "2020-04-01": 71.9,
    "2026-08-01": 102.3,
}

MONTH_NAME_TO_NUM = {
    name: idx for idx, name in enumerate(calendar.month_name) if name
}

REQUIRED_MANIFEST_FIELDS = (
    "indicator_id",
    "title",
    "sector",
    "publisher",
    "source_url",
    "series_id",
    "geography",
    "frequency",
    "unit",
    "definition",
    "licence",
    "agent_owner",
    "connector_module",
    "curated_path",
    "update_cadence",
    "raw_evidence",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    results: list[tuple[str, str, str, str]] = []
    file_sha = sha256_file(RAW)
    manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_sha = manifest["raw_evidence"][0]["checksum_sha256"]
    c1_ok = file_sha == EXPECTED_SHA256 == manifest_sha
    results.append(
        ("C1", "Checksum raw matches freeze + manifest", "pass" if c1_ok else "fail", f"file={file_sha}")
    )

    missing = [f for f in REQUIRED_MANIFEST_FIELDS if not manifest.get(f)]
    unit = str(manifest.get("unit", "")).lower()
    c2_ok = (
        not missing
        and "K02000001" in str(manifest.get("geography", ""))
        and manifest.get("series_id") == "K22A"
        and manifest.get("agent_owner") == "energy"
        and "month" in str(manifest.get("frequency", "")).lower()
        and "index" in unit
    )
    results.append(
        (
            "C2",
            "Manifest contract; UK/K22A; monthly IoP index",
            "pass" if c2_ok else "fail",
            f"missing={missing or 'none'}",
        )
    )

    with CSV_PATH.open(encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header_ok = tuple(reader.fieldnames or ()) == CURATED_FIELDNAMES
        rows = list(reader)
    results.append(
        ("C3", "Curated Observation schema", "pass" if header_ok else "fail", f"cols={reader.fieldnames}")
    )

    starts = [r["period_start"] for r in rows]
    unique_ok = len(starts) == len(set(starts)) == EXPECTED_ROWS
    results.append(
        (
            "C4",
            "Row count / uniqueness",
            "pass" if unique_ok else "fail",
            f"n={len(rows)} unique={len(set(starts))}",
        )
    )

    payload = json.loads(RAW.read_text(encoding="utf-8"))
    by_start = {r["period_start"]: float(r["value"]) for r in rows if r["value"]}
    spot_fail = [k for k, v in SPOTS.items() if by_start.get(k) != v]
    mismatches = 0
    for mrow in payload["months"]:
        year = int(mrow["year"])
        month = MONTH_NAME_TO_NUM[str(mrow["month"])]
        start = f"{year:04d}-{month:02d}-01"
        expected = float(mrow["value"])
        if by_start.get(start) != expected:
            mismatches += 1
    c5_ok = not spot_fail and mismatches == 0 and len(payload["months"]) == EXPECTED_ROWS
    results.append(
        (
            "C5",
            "Independent recompute from raw JSON",
            "pass" if c5_ok else "fail",
            f"spot_fail={spot_fail or 'none'}; mismatches={mismatches}",
        )
    )

    title = str(payload.get("description", {}).get("title", ""))
    c6_ok = "CVMSA" in title.upper() and "MANUFACTURING" in title.upper()
    results.append(
        (
            "C6",
            "Series is Manufacturing CVMSA index (not growth)",
            "pass" if c6_ok else "fail",
            f"title={title}",
        )
    )

    results.append(
        (
            "C7",
            "Quarters/years present in raw but omitted from curated",
            "warn",
            f"raw_q={len(payload.get('quarters') or [])}; raw_y={len(payload.get('years') or [])}",
        )
    )

    fails = sum(1 for *_, status, __ in results if status == "fail")
    for check_id, title_s, status, notes in results:
        print(f"{check_id}\t{status}\t{title_s}\t{notes}")
    print(f"FAILS={fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

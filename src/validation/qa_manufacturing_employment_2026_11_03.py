"""Independent QA — manufacturing-employment (ONS JWR7 / LMS).

Read-only against ``data/energy/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_manufacturing_employment_2026_11_03``
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/energy/manufacturing-employment"
RAW = BASE / "raw/2026-11-03/jwr7_lms.json"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
EXPECTED_SHA256 = "183a4c071f83844af74520398bd4d0c8f56c3076dc22b8bd2ca7437a7256173b"
EXPECTED_ROWS = 193
SPOTS = {
    "1978-04-01": 6732.0,  # 1978 Q2
    "2020-04-01": 2619.0,  # 2020 Q2
    "2026-04-01": 2460.0,  # 2026 Q2
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
    geo = str(manifest.get("geography", ""))
    c2_ok = (
        not missing
        and "K02000001" in geo
        and manifest.get("series_id") == "JWR7"
        and manifest.get("agent_owner") == "energy"
        and "quarter" in str(manifest.get("frequency", "")).lower()
        and "thousand" in str(manifest.get("unit", "")).lower()
    )
    results.append(
        (
            "C2",
            "Manifest contract; UK/JWR7; quarterly thousands SA",
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
    # Full recompute quarters
    mismatches = 0
    for q in payload["quarters"]:
        year = int(q["year"])
        qi = int(str(q["quarter"]).replace("Q", ""))
        start_month = 1 + (qi - 1) * 3
        start = f"{year:04d}-{start_month:02d}-01"
        expected = float(q["value"])
        if by_start.get(start) != expected:
            mismatches += 1
    c5_ok = not spot_fail and mismatches == 0 and len(payload["quarters"]) == EXPECTED_ROWS
    results.append(
        (
            "C5",
            "Independent recompute from raw JSON",
            "pass" if c5_ok else "fail",
            f"spot_fail={spot_fail or 'none'}; mismatches={mismatches}",
        )
    )

    related = manifest.get("related_indicator_ids") or []
    c6_ok = "long-run-manufacturing-employment" in related
    results.append(
        (
            "C6",
            "History long-run linked (no duplicate pipeline)",
            "pass" if c6_ok else "warn",
            f"related={related}",
        )
    )

    annual_in_raw = len(payload.get("years") or [])
    results.append(
        (
            "C7",
            "Annual aggregates omitted from curated (documented)",
            "warn" if annual_in_raw else "pass",
            f"raw_years={annual_in_raw}",
        )
    )

    fails = sum(1 for *_, status, __ in results if status == "fail")
    for check_id, title, status, notes in results:
        print(f"{check_id}\t{status}\t{title}\t{notes}")
    print(f"FAILS={fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

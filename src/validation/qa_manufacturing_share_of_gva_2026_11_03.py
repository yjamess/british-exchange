"""Independent QA — manufacturing-share-of-gva (ONS L4NT / WGDP).

Read-only against ``data/energy/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_manufacturing_share_of_gva_2026_11_03``
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
BASE = REPO_ROOT / "data/energy/manufacturing-share-of-gva"
RAW = BASE / "raw/2026-11-03/l4nt_wgdp.json"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
EXPECTED_SHA256 = "f4554888ae2b87ebceefb92ef06409461fb003717585a7d08ef50138af14b468"
EXPECTED_ROWS = 30
# curated % = weight_ppt / 10
SPOTS = {
    "1997-01-01": 16.58,  # 165.8 ppt
    "2011-01-01": 10.36,  # 103.6 ppt
    "2024-01-01": 8.65,  # 86.5 ppt
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
        and manifest.get("series_id") == "L4NT"
        and manifest.get("agent_owner") == "energy"
        and "annual" in str(manifest.get("frequency", "")).lower()
        and "%" in unit
    )
    results.append(
        (
            "C2",
            "Manifest contract; UK/L4NT; annual % of GVA",
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
    spot_fail = [
        k for k, v in SPOTS.items() if abs(by_start.get(k, -1) - v) > 1e-9
    ]
    mismatches = 0
    for yrow in payload["years"]:
        year = int(yrow["year"])
        start = f"{year:04d}-01-01"
        expected = float(yrow["value"]) / 10.0
        got = by_start.get(start)
        if got is None or abs(got - expected) > 1e-9:
            mismatches += 1
    c5_ok = not spot_fail and mismatches == 0 and len(payload["years"]) == EXPECTED_ROWS
    results.append(
        (
            "C5",
            "Independent recompute weight/10 from raw JSON",
            "pass" if c5_ok else "fail",
            f"spot_fail={spot_fail or 'none'}; mismatches={mismatches}",
        )
    )

    title = str(payload.get("description", {}).get("title", ""))
    c6_ok = title.startswith("C : Manufacturing") and "Weights" in title
    results.append(
        (
            "C6",
            "Series is section C Manufacturing weights (not L4NU agg)",
            "pass" if c6_ok else "fail",
            f"title={title}",
        )
    )

    # Forward-filled recent years (same weight)
    weights = [float(y["value"]) for y in payload["years"][-3:]]
    fwd = len(set(weights)) == 1
    results.append(
        (
            "C7",
            "Recent Blue Book years may hold weight constant",
            "warn" if fwd else "pass",
            f"last3_ppt={weights}",
        )
    )

    fails = sum(1 for *_, status, __ in results if status == "fail")
    for check_id, title_s, status, notes in results:
        print(f"{check_id}\t{status}\t{title_s}\t{notes}")
    print(f"FAILS={fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

"""Lightweight QA for Government / Infrastructure / Regions / History wave.

Read-only against ``data/{government,infrastructure,regions,history}/``.
Re-run: ``uv run python -m validation.qa_sectors_g_i_r_x_2026_11_03``
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT = REPO_ROOT / "data/qa/qa_report_sectors_g_i_r_x_2026-11-03.md"

EXPECTED = {
    "government": [
        "acts-of-parliament-passed",
        "general-election-turnout",
        "departmental-expenditure-limits",
        "arms-length-bodies-count",
    ],
    "infrastructure": [
        "rail-punctuality",
        "road-vehicle-miles",
        "full-fibre-broadband-coverage",
        "water-supply-interruptions",
    ],
    "regions": [
        "gva-by-uk-nation-and-region",
        "employment-rate-by-region",
        "population-by-uk-nation",
        "house-prices-by-region",
    ],
    "history": [
        "bank-of-england-millennium-gdp",
        "long-run-manufacturing-employment",
        "uk-unemployment-rate-long-run",
        "historical-coal-production",
    ],
}


def main() -> int:
    fails = 0
    print("| Sector | Indicator | Result | Notes |")
    print("|--------|-----------|--------|-------|")
    for sector, ids in EXPECTED.items():
        for indicator_id in ids:
            base = REPO_ROOT / "data" / sector / indicator_id
            blocked = base / "BLOCKED.txt"
            if blocked.is_file():
                print(f"| {sector} | `{indicator_id}` | blocked | {blocked.read_text(encoding='utf-8')[:80]} |")
                continue
            manifest_path = base / "manifest.yaml"
            curated_path = base / "curated/observations.csv"
            if not manifest_path.is_file() or not curated_path.is_file():
                print(f"| {sector} | `{indicator_id}` | fail | missing manifest/curated |")
                fails += 1
                continue
            manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
            with curated_path.open(encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                header = tuple(reader.fieldnames or ())
                rows = list(reader)
            ok = (
                header == CURATED_FIELDNAMES
                and manifest.get("indicator_id") == indicator_id
                and manifest.get("agent_owner") == sector
                and bool(manifest.get("raw_evidence"))
                and len(rows) > 0
            )
            if ok:
                print(f"| {sector} | `{indicator_id}` | pass | rows={len(rows)} |")
            else:
                print(
                    f"| {sector} | `{indicator_id}` | fail | "
                    f"header_ok={header==CURATED_FIELDNAMES} rows={len(rows)} |"
                )
                fails += 1
    print(f"\nReport: {REPORT}")
    print(f"Overall: {'fail' if fails else 'pass'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

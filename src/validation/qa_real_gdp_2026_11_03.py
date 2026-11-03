"""Independent QA for Economy Real GDP (T06c) — ONS ABMI / PN2.

Read-only against ``data/economy/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_real_gdp_2026_11_03``

Clear ``main()`` + type hints follow PEP 8 / beginner-friendly structure
(https://peps.python.org/pep-0008/, https://docs.python.org/3/library/__main__.html).
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/economy/real-gdp"
RAW = BASE / "raw/2026-11-03/abmi_pn2.json"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
EXPECTED_SHA256 = "a1265250cf820db23acee78d3ffbbe48ddd0ac3ca7a0aef4027332dbf0d3296d"
EXPECTED_ROWS = 286

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


def quarter_bounds(date_label: str, year: str, quarter: str) -> tuple[str, str]:
    """Map ONS quarter fields → (period_start, period_end) ISO dates."""
    match = re.search(r"(\d{4})\s*Q([1-4])", date_label or "")
    if match:
        year_i, quarter_i = int(match.group(1)), int(match.group(2))
    else:
        year_i = int(year)
        quarter_i = int(str(quarter).replace("Q", ""))
    start_month = {1: 1, 2: 4, 3: 7, 4: 10}[quarter_i]
    end_month = quarter_i * 3
    start = date(year_i, start_month, 1)
    end = date(year_i, end_month, calendar.monthrange(year_i, end_month)[1])
    return start.isoformat(), end.isoformat()


def next_quarter_start(period_start: str) -> str:
    start = date.fromisoformat(period_start)
    month = start.month + 3
    year = start.year
    if month > 12:
        month -= 12
        year += 1
    return date(year, month, 1).isoformat()


def main() -> int:
    """Run T06c checks; print Pass/Warn/Fail table; exit 0 if no fails."""
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
    unit = str(manifest.get("unit", ""))
    freq = str(manifest.get("frequency", "")).lower()
    c2_ok = (
        not missing
        and "K02000001" in geo
        and ("United Kingdom" in geo or "UK" in geo)
        and manifest.get("series_id") == "ABMI"
        and "quarter" in freq
        and "£ million" in unit
        and "chained volume" in unit.lower()
        and "SA" in unit
    )
    results.append(
        (
            "C2",
            "Manifest contract fields; UK/ABMI; quarterly CVM SA £m",
            "pass" if c2_ok else "fail",
            f"missing={missing or 'none'}",
        )
    )

    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = tuple(reader.fieldnames or ())
        rows = list(reader)

    c3_ok = header == CURATED_FIELDNAMES
    results.append(("C3", "Curated Observation schema", "pass" if c3_ok else "fail", f"header_ok={c3_ok}"))

    periods = sorted(r["period_start"] for r in rows)
    dupes = sum(1 for _, count in Counter((r["indicator_id"], r["period_start"]) for r in rows).items() if count > 1)
    gaps = sum(1 for a, b in zip(periods, periods[1:]) if next_quarter_start(a) != b)
    c4_ok = len(rows) == EXPECTED_ROWS and dupes == 0 and gaps == 0
    results.append(
        (
            "C4",
            "Row count / uniqueness / period coverage",
            "pass" if c4_ok else "fail",
            f"rows={len(rows)} dupes={dupes} gaps={gaps} range={periods[0]}..{periods[-1]}",
        )
    )

    raw = json.loads(RAW.read_text(encoding="utf-8"))
    json_by_start: dict[str, tuple[str, str]] = {}
    for item in raw["quarters"]:
        start, end = quarter_bounds(item.get("date", ""), item.get("year", ""), item.get("quarter", ""))
        json_by_start[start] = (str(item["value"]), end)

    idx = {r["period_start"]: r for r in rows}
    spot_periods = ("1955-01-01", "2019-10-01", "2020-04-01", "2025-01-01", "2026-04-01")
    mismatches = 0
    for start in spot_periods:
        jv, jend = json_by_start[start]
        curated = idx[start]
        if abs(float(jv) - float(curated["value"])) > 1e-9 or curated["period_end"] != jend:
            mismatches += 1
    for start, (jv, jend) in json_by_start.items():
        curated = idx.get(start)
        if curated is None or abs(float(jv) - float(curated["value"])) > 1e-9 or curated["period_end"] != jend:
            mismatches += 1
    extra = [ps for ps in idx if ps not in json_by_start]
    c5_ok = mismatches == 0 and not extra and len(json_by_start) == EXPECTED_ROWS
    results.append(
        (
            "C5",
            "Independent JSON recompute (incl 1955Q1, 2020Q2, 2026Q2)",
            "pass" if c5_ok else "fail",
            f"mismatches={mismatches} extra_csv={len(extra)} json_quarters={len(json_by_start)}",
        )
    )

    title = str((raw.get("description") or {}).get("title") or "")
    vals = [float(r["value"]) for r in rows if r["value"] not in ("", None)]
    median = sorted(vals)[len(vals) // 2]
    method_ok = (
        "chained volume" in title.lower()
        and "seasonally adjusted" in title.lower()
        and median > 1000
        and len(raw.get("years") or []) > 0
    )
    results.append(
        (
            "C6",
            "Method SA/CVM levels; quarterly only (annual omitted)",
            "warn" if method_ok else "fail",
            f"title_ok={method_ok}; annual_in_raw={len(raw.get('years') or [])}; annual_in_curated=0",
        )
    )

    statuses = set(r["observation_status"] for r in rows)
    caveats = str(manifest.get("caveats") or "")
    transformations = str(manifest.get("transformations") or "")
    rev_doc = "revis" in caveats.lower() or "revis" in transformations.lower() or "provisional" in transformations.lower()
    rev_notes_empty = not manifest.get("revision_notes")
    c7_ok = statuses == {"provisional"} and rev_doc
    results.append(
        (
            "C7",
            "Status/revision caveats documented",
            "warn" if c7_ok and rev_notes_empty else ("pass" if c7_ok else "fail"),
            f"statuses={statuses}; rev_documented={rev_doc}; revision_notes_empty={rev_notes_empty}",
        )
    )

    print("| ID | Check | Result | Notes |")
    print("|----|-------|--------|-------|")
    for check_id, name, result, notes in results:
        print(f"| {check_id} | {name} | {result} | {notes} |")

    fails = [r for r in results if r[2] == "fail"]
    warns = [r for r in results if r[2] == "warn"]
    verdict = "fail" if fails else ("pass-with-warns" if warns else "pass")
    print(f"\nOverall: {verdict}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

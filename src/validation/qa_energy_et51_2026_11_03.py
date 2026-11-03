"""Independent QA for Energy first slice (T05) — ET 5.1 electricity generation.

Read-only against ``data/energy/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_energy_et51_2026_11_03``

Typing and a clear ``main()`` follow PEP 8 / beginner-friendly structure
(https://peps.python.org/pep-0008/, https://docs.python.org/3/library/__main__.html).
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import yaml
from openpyxl import load_workbook

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE = REPO_ROOT / "data/energy/electricity-generation-by-source"
RAW = BASE / "raw/2026-11-03/ET_5.1_SEP_26.xlsx"
CSV_PATH = BASE / "curated/observations.csv"
MANIFEST_PATH = BASE / "manifest.yaml"
EXPECTED_SHA256 = "2be6ab036d7b034ca544ecb9f17cdcbcb2d60dbad5aec16c15f0ff62ef0eca9d"
EXPECTED_ROWS = 1710

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
    """Return hex SHA-256 of a file (stdlib hashlib)."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def quarter_to_iso(label: str) -> tuple[str, bool]:
    """Parse ET quarter header → (period_start ISO, is_provisional)."""
    provisional = "provisional" in label.lower()
    match = re.search(r"Quarter\s*([1-4])\s+(\d{4})", label, re.IGNORECASE)
    if not match:
        raise ValueError(f"Unrecognised quarter header: {label!r}")
    quarter, year = int(match.group(1)), int(match.group(2))
    start_month = {1: 1, 2: 4, 3: 7, 4: 10}[quarter]
    return date(year, start_month, 1).isoformat(), provisional


def load_curated(path: Path) -> tuple[tuple[str, ...], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = tuple(reader.fieldnames or ())
        return header, list(reader)


def find_all_gen_twh_block(ws) -> dict[str, int]:
    """Locate Table 5.1b All generating companies fuel rows (Coal Q1 ≈ 35.3887)."""
    blocks: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] | None = None
    for row_idx in range(1, min(ws.max_row + 1, 250)):
        gen = ws.cell(row_idx, 1).value
        fuel = ws.cell(row_idx, 2).value
        if gen and "All generating companies" in str(gen) and fuel:
            if current is None:
                current = []
            current.append((row_idx, str(fuel).strip()))
        elif current is not None:
            blocks.append(current)
            current = None
    if current:
        blocks.append(current)

    for block in blocks:
        fuel_rows = {fuel: row for row, fuel in block}
        coal_row = fuel_rows.get("Coal")
        if coal_row is None:
            continue
        q1 = ws.cell(coal_row, 3).value
        try:
            if abs(float(q1) - 35.3887) < 1e-6:
                return fuel_rows
        except (TypeError, ValueError):
            continue
    raise RuntimeError("Could not find All generating companies TWh block (Coal Q1 1998)")


def main() -> int:
    """Run T05 checks; print Pass/Warn/Fail table; exit 0 if no fails."""
    results: list[tuple[str, str, str, str]] = []

    # C1 checksum
    file_sha = sha256_file(RAW)
    manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_sha = manifest["raw_evidence"][0]["checksum_sha256"]
    c1_ok = file_sha == EXPECTED_SHA256 == manifest_sha
    results.append(
        (
            "C1",
            "Checksum raw matches freeze + manifest",
            "pass" if c1_ok else "fail",
            f"file={file_sha}",
        )
    )

    # C2 manifest fields / geo / unit / freq
    missing = [f for f in REQUIRED_MANIFEST_FIELDS if not manifest.get(f)]
    geo = str(manifest.get("geography", ""))
    c2_ok = (
        not missing
        and "UK" in geo
        and "K02000001" in geo
        and manifest.get("unit") == "TWh"
        and "quarter" in str(manifest.get("frequency", "")).lower()
    )
    results.append(
        (
            "C2",
            "Manifest fields; UK/K02000001; TWh; quarterly",
            "pass" if c2_ok else "fail",
            f"missing={missing or 'none'}; geography={geo!r}",
        )
    )

    # C3 + C4 curated
    header, rows = load_curated(CSV_PATH)
    c3_ok = header == CURATED_FIELDNAMES
    results.append(
        (
            "C3",
            "Curated schema matches Observation",
            "pass" if c3_ok else "fail",
            f"header_ok={c3_ok}",
        )
    )

    keys = [(r["indicator_id"], r["period_start"], r["notes"]) for r in rows]
    dupes = sum(1 for _, count in Counter(keys).items() if count > 1)
    c4_ok = len(rows) == EXPECTED_ROWS and dupes == 0
    status_counts = dict(Counter(r["observation_status"] for r in rows))
    results.append(
        (
            "C4",
            "Row count / uniqueness",
            "pass" if c4_ok else "fail",
            f"rows={len(rows)} dupes={dupes} statuses={status_counts}",
        )
    )

    # C5–C7 Excel recompute
    wb = load_workbook(RAW, data_only=True, read_only=True)
    ws = wb["Quarter"]
    fuel_rows = find_all_gen_twh_block(ws)
    headers: list[tuple[int, str]] = []
    for col in range(3, ws.max_column + 1):
        value = ws.cell(6, col).value
        if value is not None:
            headers.append((col, str(value)))

    idx = {
        (r["period_start"], r["notes"].removeprefix("fuel=")): r for r in rows
    }
    mismatches = 0
    for fuel, row_idx in fuel_rows.items():
        for col, label in headers:
            period, is_provisional = quarter_to_iso(label)
            raw = ws.cell(row_idx, col).value
            curated = idx.get((period, fuel))
            if curated is None:
                mismatches += 1
                continue
            if raw == "[x]" or (isinstance(raw, str) and raw.strip() == "[x]"):
                if curated["value"] not in ("", None) or curated["observation_status"] != "missing":
                    mismatches += 1
            else:
                if abs(float(raw) - float(curated["value"])) > 1e-6:
                    mismatches += 1
                expected_status = "provisional" if is_provisional else "final"
                if curated["observation_status"] != expected_status:
                    mismatches += 1
    wb.close()

    c5_ok = mismatches == 0
    results.append(
        (
            "C5",
            "Independent Excel spot/full recompute",
            "pass" if c5_ok else "fail",
            f"mismatches={mismatches} fuels={len(fuel_rows)} quarters={len(headers)}",
        )
    )

    total_fuels = sorted(
        f
        for f in {r["notes"].removeprefix("fuel=") for r in rows}
        if f.startswith("Total")
    )
    results.append(
        (
            "C6",
            "All-gen grain; Total* double-count risk",
            "warn",
            f"grain=All generating companies; Total* kept={total_fuels}",
        )
    )

    missing_with_value = sum(
        1
        for r in rows
        if r["observation_status"] == "missing" and r["value"] not in ("", None)
    )
    bad_ends = 0
    for r in rows:
        start = date.fromisoformat(r["period_start"])
        end = date.fromisoformat(r["period_end"])
        quarter = (start.month - 1) // 3 + 1
        end_month = quarter * 3
        expected_end = date(
            start.year, end_month, calendar.monthrange(start.year, end_month)[1]
        )
        if end != expected_end or start.day != 1 or start.month not in (1, 4, 7, 10):
            bad_ends += 1
    c7_ok = missing_with_value == 0 and bad_ends == 0
    results.append(
        (
            "C7",
            "Missing/provisional + period_end sanity",
            "pass" if c7_ok else "fail",
            f"missing_with_value={missing_with_value} bad_period_ends={bad_ends}",
        )
    )

    print("| ID | Check | Result | Notes |")
    print("|----|-------|--------|-------|")
    for check_id, name, result, notes in results:
        print(f"| {check_id} | {name} | {result} | {notes} |")

    fails = [r for r in results if r[2] == "fail"]
    warns = [r for r in results if r[2] == "warn"]
    if fails:
        verdict = "fail"
    elif warns:
        verdict = "pass-with-warns"
    else:
        verdict = "pass"
    print(f"\nOverall: {verdict}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

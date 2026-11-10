"""Independent QA — second-homes (MHCLG Council Taxbase Table 4).

Read-only. Re-reads the pinned ODS with its own cell walk — not
``housing.connectors.second_homes.parse_table_4``.

Re-run:
  uv run python -m validation.qa_second_homes_2026_11_10
"""

from __future__ import annotations

import csv
import hashlib
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES
from housing.ods_util import read_ods_sheet

REPO = Path(__file__).resolve().parents[2]
BASE = REPO / "data/housing/second-homes"
RAW = BASE / "raw/2026-11-05/Tables_1_-_5_2025.ods"
CURATED = BASE / "curated/observations.csv"
MANIFEST = BASE / "manifest.yaml"
QA_OUT = REPO / "data/qa/qa_report_second-homes_2026-11-10.md"

# Published England cells from Table 4 of the revised 2025 Council Taxbase
# release (21 January 2026). Read by hand from the ODS sheet labels.
SPOT: dict[tuple[str, str], float | None] = {
    ("total", "2025"): 267_894.0,
    ("total", "2024"): 279_870.0,
    ("total", "2021"): 253_400.0,
    ("no-discount-or-premium", "2025"): 90_734.0,
    ("subject-to-discount", "2025"): 6_861.0,
    ("charged-premium", "2025"): 170_299.0,
    ("charged-premium", "2024"): None,  # [x] before the premium starts
}

SERIES_PREFIXES: tuple[tuple[str, str], ...] = (
    ("Total number of dwellings classed as second homes", "total"),
    (
        "Number of second homes not subject to a discount or charged a premium",
        "no-discount-or-premium",
    ),
    ("Number of second homes subject to a discount", "subject-to-discount"),
    ("Number of second homes charged a premium", "charged-premium"),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _parse_cell(raw: str) -> float | None:
    text = raw.strip().replace(",", "").replace("%", "")
    if not text or text in {"[x]", "[z]", "..", "…", "", "[p]", "[r]"}:
        return None
    return float(text)


def read_table_4_independently(path: Path) -> dict[tuple[str, int], float | None]:
    """Own walk of Table_4 — does not import the Housing connector parser."""

    rows = read_ods_sheet(path, "Table_4")
    header: list[str] | None = None
    for row in rows:
        if row and row[0].strip() == "Year":
            header = row
            break
    if header is None:
        raise ValueError("Table 4 year header not found")

    years: list[tuple[int, int]] = []
    for idx, cell in enumerate(header):
        text = cell.strip()
        if text.isdigit():
            years.append((idx, int(text)))

    out: dict[tuple[str, int], float | None] = {}
    for row in rows:
        if not row:
            continue
        label = row[0].strip()
        slug = next((s for prefix, s in SERIES_PREFIXES if label.startswith(prefix)), None)
        if slug is None:
            continue
        for idx, year in years:
            raw = row[idx] if idx < len(row) else ""
            out[(slug, year)] = _parse_cell(raw)
    return out


def series_of(notes: str) -> str:
    for part in notes.split(";"):
        part = part.strip()
        if part.startswith("series="):
            return part.removeprefix("series=")
    return ""


def main() -> int:
    checks: list[tuple[str, str, str]] = []
    failed = 0

    def record(cid: str, ok: bool, detail: str) -> None:
        nonlocal failed
        checks.append((cid, "PASS" if ok else "FAIL", detail))
        if not ok:
            failed += 1

    # C1 — files present
    record("C1-files", RAW.is_file() and CURATED.is_file() and MANIFEST.is_file(), f"raw={RAW.is_file()} curated={CURATED.is_file()} manifest={MANIFEST.is_file()}")

    # C2 — checksum
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    evidence = (manifest.get("raw_evidence") or [{}])[0]
    file_sha = sha256_file(RAW) if RAW.is_file() else ""
    record(
        "C2-checksum",
        bool(file_sha) and evidence.get("checksum_sha256") == file_sha,
        f"sha={file_sha[:16]}… match={evidence.get('checksum_sha256') == file_sha}",
    )

    # C3 — curated shape
    with CURATED.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header_ok = list(reader.fieldnames or []) == list(CURATED_FIELDNAMES)
        rows = list(reader)
    record("C3-header", header_ok, f"fields={len(reader.fieldnames or [])}")
    record("C3-rows", len(rows) == 20, f"rows={len(rows)} (4 series × 5 years)")

    # C4 — independent re-read vs curated
    raw_cells = read_table_4_independently(RAW)
    mismatches: list[str] = []
    for row in rows:
        year = row["period_start"][:4]
        slug = series_of(row.get("notes") or "")
        raw_v = raw_cells.get((slug, int(year)))
        curated_v = None if row.get("value") in (None, "") else float(row["value"])
        if raw_v != curated_v:
            mismatches.append(f"{slug}/{year}: raw={raw_v} curated={curated_v}")
        status = row.get("observation_status")
        if curated_v is None and status != "missing":
            mismatches.append(f"{slug}/{year}: empty value but status={status}")
        if curated_v is not None and status != "final":
            mismatches.append(f"{slug}/{year}: valued but status={status}")
    record("C4-raw-vs-curated", not mismatches, f"mismatches={len(mismatches)}" + (f" · {mismatches[0]}" if mismatches else ""))

    # C5 — published spot cells
    spot_fail: list[str] = []
    for (slug, year), expected in SPOT.items():
        got = raw_cells.get((slug, int(year)))
        if got != expected:
            spot_fail.append(f"{slug}/{year}: got={got} expected={expected}")
    record("C5-spots", not spot_fail, f"checked={len(SPOT)}" + (f" · {spot_fail[0]}" if spot_fail else ""))

    # C6 — identity: total = parts (where premium published)
    id_fail: list[str] = []
    for year in (2021, 2022, 2023, 2024, 2025):
        total = raw_cells.get(("total", year))
        none = raw_cells.get(("no-discount-or-premium", year))
        disc = raw_cells.get(("subject-to-discount", year))
        prem = raw_cells.get(("charged-premium", year))
        if total is None or none is None or disc is None:
            id_fail.append(f"{year}: missing part")
            continue
        if year < 2025:
            if prem is not None:
                id_fail.append(f"{year}: premium should be missing, got {prem}")
            if abs((none + disc) - total) > 0.5:
                id_fail.append(f"{year}: {none}+{disc}≠{total}")
        else:
            if prem is None:
                id_fail.append("2025: premium missing")
            elif abs((none + disc + prem) - total) > 0.5:
                id_fail.append(f"2025: {none}+{disc}+{prem}≠{total}")
    record("C6-identity", not id_fail, "none+discount(+premium)=total" + (f" · {id_fail[0]}" if id_fail else ""))

    # C7 — geography / unit / method caveats
    geos = {r["geography_code"] for r in rows}
    units = {r["unit"] for r in rows}
    record("C7-geo-unit", geos == {"E92000001"} and units == {"dwellings"}, f"geo={geos} unit={units}")
    caveats = str(manifest.get("caveats") or "")
    definition = str(manifest.get("definition") or "")
    record(
        "C8-premium-caveat",
        "premium" in caveats.lower() and "2025" in caveats,
        "caveats name the 2025 premium start",
    )
    record(
        "C8b-not-vacants",
        "Live Table 615" in definition or "vacant" in definition.lower(),
        "definition distinguishes from Table 615 vacants",
    )

    verdict = "PASS" if failed == 0 else "FAIL"
    lines = [
        "# QA report — second-homes",
        "",
        "Date: 2026-11-10 · Validation agent · release: MHCLG Council Taxbase 2025 Table 4 (revised 21 January 2026)",
        "",
        "Independent re-read of the pinned ODS (`Tables_1_-_5_2025.ods`, sheet `Table_4`) with this script's own cell walk — not `housing.connectors.second_homes.parse_table_4`. Compared with curated `observations.csv` and the published England totals.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
    ]
    for cid, result, detail in checks:
        lines.append(f"| {cid} |  | {result} | {detail} |")
    lines.extend(
        [
            "",
            f"**Verdict:** {verdict} — {'ready for UI / Notion Ready' if failed == 0 else 'fix before Ready'}",
            "",
            "## Method notes",
            "",
            "- England only (E92000001). Table 4 prints a year; curated stores 1 October of that year.",
            "- Series: total · no-discount-or-premium · subject-to-discount · charged-premium.",
            "- Premium starts in 2025: earlier premium cells are missing (`[x]`), not zero.",
            "- 2025 identity: 90,734 + 6,861 + 170,299 = 267,894.",
            "- Not Live Table 615 vacants; not the English Housing Survey second-homes definition.",
            "",
            f"Script: `src/validation/qa_second_homes_2026_11_10.py`",
            "",
        ]
    )
    QA_OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {QA_OUT.relative_to(REPO)} · {verdict} · {failed} fail(s)")
    for cid, result, detail in checks:
        print(f"  {result:4} {cid}: {detail}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

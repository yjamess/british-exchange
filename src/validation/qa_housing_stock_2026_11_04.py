"""Independent QA for Housing Domain 04 stock indicators (2026-11-04).

Read-only against curated packages. Re-run:
  uv run python -m validation.qa_housing_stock_2026_11_04
"""

from __future__ import annotations

import csv
import hashlib
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
HOUSING = REPO_ROOT / "data/housing"
QA_OUT = REPO_ROOT / "data/qa/qa_housing_stock_2026_11_04.md"

# Spot checks vs pinned published cells (England).
CHECKS = {
    "vacant-dwellings": {
        "raw": "raw/2026-11-04/Live_Table_615.ods",
        "rows_min": 10_000,
        "spot": ("E92000001", "2025-10-06", "series=all-vacants", 754_264.0),
    },
    "dwelling-stock-by-region": {
        "raw": "raw/2026-11-04/LiveTable109.ods",
        "rows_min": 2_000,
        "spot": ("E92000001", "2025-03-31", "tenure=all-dwellings", 25_826_351.0),
    },
    "dwelling-stock-by-district": {
        "raw": "raw/2026-11-04/LiveTable100.ods",
        "rows_min": 20_000,
        "spot": ("E92000001", "2025-03-31", "tenure=all-dwellings", 25_826_351.0),
    },
    "dwelling-type": {
        "raw": "raw/2026-11-04/census2021-ts044.zip",
        "rows_min": 100,
        "spot": ("E92000001", "2021-03-21", "demographic=all-households", 23_436_085.0),
    },
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    lines: list[str] = [
        "# QA — Housing Stock & Tenure (Domain 04) · 2026-11-04",
        "",
        "Independent numerical checks against pinned MHCLG / ONS extracts.",
        "",
        "| Indicator | Result | Detail |",
        "| --- | --- | --- |",
    ]
    failed = 0
    for indicator_id, meta in CHECKS.items():
        base = HOUSING / indicator_id
        raw = base / meta["raw"]
        curated = base / "curated/observations.csv"
        manifest_path = base / "manifest.yaml"
        ok = True
        detail_parts: list[str] = []

        if not raw.is_file():
            ok = False
            detail_parts.append("missing raw")
        if not curated.is_file():
            ok = False
            detail_parts.append("missing curated")
        if not manifest_path.is_file():
            ok = False
            detail_parts.append("missing manifest")

        if ok:
            manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("agent_owner") != "housing":
                ok = False
                detail_parts.append("agent_owner≠housing")
            evidence = (manifest.get("raw_evidence") or [{}])[0]
            file_sha = sha256_file(raw)
            if evidence.get("checksum_sha256") != file_sha:
                ok = False
                detail_parts.append("checksum mismatch")
            else:
                detail_parts.append(f"sha={file_sha[:12]}…")

            with curated.open(newline="", encoding="utf-8") as handle:
                reader = csv.DictReader(handle)
                if list(reader.fieldnames or []) != list(CURATED_FIELDNAMES):
                    ok = False
                    detail_parts.append("bad header")
                rows = list(reader)
            if len(rows) < int(meta["rows_min"]):
                ok = False
                detail_parts.append(f"rows={len(rows)} < {meta['rows_min']}")
            else:
                detail_parts.append(f"rows={len(rows)}")

            geo, period, note_part, expected = meta["spot"]
            hits = [
                r
                for r in rows
                if r["geography_code"] == geo
                and r["period_start"] == period
                and note_part in (r.get("notes") or "")
                and r.get("value")
            ]
            if not hits:
                ok = False
                detail_parts.append(f"spot miss {geo} {period} {note_part}")
            else:
                value = float(hits[0]["value"])
                if abs(value - expected) > 0.5:
                    ok = False
                    detail_parts.append(f"spot {value} ≠ {expected}")
                else:
                    detail_parts.append(f"spot {geo}={expected:g}")

            # Unit boundary: type is households; others are dwellings.
            if indicator_id == "dwelling-type":
                if manifest.get("unit") != "households":
                    ok = False
                    detail_parts.append("unit must be households")
            elif "dwelling" not in str(manifest.get("unit", "")).lower():
                ok = False
                detail_parts.append("unit should be dwellings")

        status = "PASS" if ok else "FAIL"
        if not ok:
            failed += 1
        lines.append(f"| `{indicator_id}` | {status} | {'; '.join(detail_parts)} |")

    lines.extend(
        [
            "",
            "## Method notes",
            "",
            "- Table 100 private sector is not OO/PR split; Geography view uses Table 109 for tenure.",
            "- Table 615 vacants ≠ second homes ≠ census unoccupied.",
            "- TS044 is households on Census Day 2021-03-21 — not Live Table dwelling stock.",
            "- Vacancy rate on the canvas is Exchange-derived (615 ÷ 100).",
            "",
            f"**Verdict:** {'PASS' if failed == 0 else f'FAIL ({failed})'}",
            "",
        ]
    )
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(QA_OUT)
    print(f"failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

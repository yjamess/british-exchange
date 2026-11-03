"""Independent QA for Economy Y1 labour / prices / GDP-per-head wave."""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

import yaml

from britain_exchange.observation import CURATED_FIELDNAMES
from economy.connectors.labour_prices_series import ALL_Y1_SPECS

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT = REPO_ROOT / "data/qa/qa_report_economy_y1_labour_prices_2026-11-03.md"

# Latest curated value must match raw JSON last period (tolerance for float).
SPOT: dict[str, float] = {
    "cpi-inflation": 3.5,  # Sep 2026 annual rate
    "employment-rate": 75.3,  # Jul 2026 mid-month
    "economic-inactivity-rate": 20.9,
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    for spec in ALL_Y1_SPECS:
        base = REPO_ROOT / "data/economy" / spec.indicator_id
        manifest_path = base / "manifest.yaml"
        curated_path = base / "curated/observations.csv"
        raw_candidates = list((base / "raw/2026-11-03").glob("*.json"))
        ok_files = (
            manifest_path.is_file()
            and curated_path.is_file()
            and len(raw_candidates) == 1
        )
        checks.append(
            (
                f"{spec.indicator_id}/files",
                "manifest+raw+curated",
                "pass" if ok_files else "fail",
                f"raw={raw_candidates[0].name if raw_candidates else None}",
            )
        )
        if not ok_files:
            continue

        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        id_ok = manifest.get("indicator_id") == spec.indicator_id
        series_ok = str(manifest.get("series_id", "")).upper() == spec.series_id.upper()
        checks.append(
            (
                f"{spec.indicator_id}/manifest",
                "id+series",
                "pass" if id_ok and series_ok else "fail",
                f"series={manifest.get('series_id')}",
            )
        )

        with curated_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            header = tuple(reader.fieldnames or ())
            rows = list(reader)
        header_ok = header == CURATED_FIELDNAMES
        checks.append(
            (
                f"{spec.indicator_id}/schema",
                "curated schema+nonempty",
                "pass" if header_ok and rows else "fail",
                f"rows={len(rows)}",
            )
        )

        raw = json.loads(raw_candidates[0].read_text(encoding="utf-8"))
        periods = raw.get(spec.period_kind) or []
        last_raw = periods[-1] if periods else {}
        last_cur = rows[-1] if rows else {}
        raw_val = float(str(last_raw.get("value")).replace(",", ""))
        cur_val = float(last_cur["value"])
        match = abs(raw_val - cur_val) < 1e-6
        checks.append(
            (
                f"{spec.indicator_id}/tail",
                "last curated == last raw",
                "pass" if match else "fail",
                f"raw={raw_val} curated={cur_val}",
            )
        )

        if spec.indicator_id in SPOT:
            expected = SPOT[spec.indicator_id]
            ok = abs(cur_val - expected) < 0.051
            checks.append(
                (
                    f"{spec.indicator_id}/spot",
                    "latest vs published expectation",
                    "pass" if ok else "warn",
                    f"got={cur_val} expected~{expected}",
                )
            )

        # checksum recorded in manifest evidence
        evidence = (manifest.get("raw_evidence") or [{}])[0]
        disk_sha = sha256(raw_candidates[0])
        sha_ok = evidence.get("checksum_sha256") == disk_sha
        checks.append(
            (
                f"{spec.indicator_id}/checksum",
                "manifest checksum matches disk",
                "pass" if sha_ok else "fail",
                disk_sha[:16],
            )
        )

    fails = [c for c in checks if c[2] == "fail"]
    lines = [
        "# QA report — Economy Y1 labour/prices — 2026-11-03",
        "",
        "## Scope",
        "- CPI inflation (D7G7), Real GDP per head (IHXW), Labour productivity (LZVB),",
        "  Employment rate (LF24), Economic inactivity (LF2S), Real earnings (A2FC)",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for cid, name, result, notes in checks:
        lines.append(f"| {cid} | {name} | **{result}** | {notes} |")
    lines.extend(
        [
            "",
            "## Summary",
            f"- Fail: {len(fails)}",
            f"- Blockers: {'none' if not fails else '; '.join(c[0] for c in fails)}",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(REPORT.read_text(encoding="utf-8"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

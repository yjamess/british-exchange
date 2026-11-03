"""Independent QA for People & Society first five indicators (2026-11-03).

Read-only against ``data/people/``. Does not rewrite source data.
Re-run: ``uv run python -m validation.qa_people_wave_2026_11_03``
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import yaml
from openpyxl import load_workbook

from britain_exchange.observation import CURATED_FIELDNAMES

REPO_ROOT = Path(__file__).resolve().parents[2]
PEOPLE = REPO_ROOT / "data/people"
QA_OUT = REPO_ROOT / "data/qa/people_wave_2026_11_03.md"

INDICATORS = {
    "uk-population-estimate": {
        "raw": "raw/2026-11-03/ukpop_pop.json",
        "sha256": "7d954811f1cecf49264695f0ed98106b7408deb0212c90703141d6968b847b6b",
        "rows": 55,
        "geo": "K02000001",
    },
    "long-term-international-net-migration": {
        "raw": "raw/2026-11-03/ltim_ye_dec_2025.xlsx",
        "sha256": "254a57a0d1e30c40c42843290c6dcc8ccb935ad26ac9148ad2665846ff7e9147",
        "rows": 55,
        "geo": "K02000001",
    },
    "nhs-elective-waiting-list": {
        "raw": "raw/2026-11-03/rtt_overview_timeseries_aug26.xlsx",
        "sha256": "33686d41dbd075d7530bcc227a675226f2aac5fdd70c07e843ca33aecfd1f447",
        "rows": 228,
        "geo": "E92000001",
    },
    "life-expectancy-at-birth": {
        "raw": "raw/2026-11-03/nlt_uk.xlsx",
        "sha256": "cbc71edc1a46b75f3ecf6326f05501216c68fa2d648f54f231a4a82cea786846",
        "rows": 86,
        "geo": "K02000001",
    },
    "gcse-grade-4-english-maths": {
        "raw": "raw/2026-11-03/national_characteristics_by_school_types_revised.csv",
        "sha256": "bc2fb3d7020bbd1a641be6e09eebee00b7b0ae24385a6db4681d6613a37d68e9",
        "rows": 16,
        "geo": "E92000001",
    },
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


def check_indicator(indicator_id: str, meta: dict) -> list[tuple[str, str, str, str]]:
    base = PEOPLE / indicator_id
    raw = base / meta["raw"]
    curated = base / "curated/observations.csv"
    manifest = yaml.safe_load((base / "manifest.yaml").read_text(encoding="utf-8"))
    results: list[tuple[str, str, str, str]] = []

    file_sha = sha256_file(raw)
    c1 = file_sha == meta["sha256"] == manifest["raw_evidence"][0]["checksum_sha256"]
    results.append((f"{indicator_id}:C1", "Checksum", "pass" if c1 else "fail", file_sha))

    missing = [f for f in REQUIRED_MANIFEST_FIELDS if not manifest.get(f)]
    geo = str(manifest.get("geography", ""))
    geo_ok = meta["geo"] in geo or (
        meta["geo"] == "E92000001" and "England" in geo
    ) or (meta["geo"] == "K02000001" and ("United Kingdom" in geo or "UK" in geo))
    c2 = not missing and manifest.get("agent_owner") == "people" and geo_ok
    results.append(
        (f"{indicator_id}:C2", "Manifest/owner/geo", "pass" if c2 else "fail", f"missing={missing or 'none'}")
    )

    with curated.open(newline="", encoding="utf-8") as handle:
        header = tuple(next(csv.reader(handle)))
        rows = list(csv.DictReader(handle))
    # reopen properly
    with curated.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = tuple(reader.fieldnames or ())
        rows = list(reader)
    c3 = header == CURATED_FIELDNAMES
    results.append((f"{indicator_id}:C3", "Schema", "pass" if c3 else "fail", ""))

    dupes = sum(1 for _, n in Counter((r["period_start"], r["notes"]) for r in rows).items() if n > 1)
    c4 = len(rows) == meta["rows"] and dupes == 0
    results.append(
        (f"{indicator_id}:C4", "Rows/uniqueness", "pass" if c4 else "fail", f"rows={len(rows)} dupes={dupes}")
    )

    spot_ok = True
    note = ""
    if indicator_id == "uk-population-estimate":
        payload = json.loads(raw.read_text(encoding="utf-8"))
        by_year = {str(y["year"]): float(y["value"]) for y in payload["years"]}
        for r in rows:
            year = r["period_start"][:4]
            if abs(float(r["value"]) - by_year[year]) > 1e-6:
                spot_ok = False
        note = f"json_years={len(by_year)}"
    elif indicator_id == "long-term-international-net-migration":
        wb = load_workbook(raw, data_only=True)
        ws = wb["1"]
        net = [row for row in ws.iter_rows(values_only=True) if row and row[0] == "Net migration"]
        wb.close()
        spot_ok = len(net) == len(rows) and abs(float(rows[-1]["value"]) - float(net[-1][2])) < 1e-6
        note = f"net_rows={len(net)} last={net[-1][2]}"
    elif indicator_id == "nhs-elective-waiting-list":
        wb = load_workbook(raw, data_only=True)
        ws = wb["Full Time Series"]
        last = rows[-1]
        # Aug 2026 estimate total waiting col 23
        found = None
        for r in range(13, ws.max_row + 1):
            month = ws.cell(r, 3).value
            if getattr(month, "year", None) == 2026 and getattr(month, "month", None) == 8:
                found = ws.cell(r, 23).value
                break
        wb.close()
        spot_ok = found is not None and abs(float(last["value"]) - float(found)) < 1e-6
        note = f"Aug2026 raw={found} curated={last['value']}"
    elif indicator_id == "life-expectancy-at-birth":
        wb = load_workbook(raw, data_only=True)
        male = float(wb["2022-2024"].cell(7, 6).value)
        female = float(wb["2022-2024"].cell(7, 13).value)
        wb.close()
        latest = [r for r in rows if r["period_start"] == "2022-01-01"]
        by_sex = {r["notes"].split("sex=")[1].split(";")[0]: float(r["value"]) for r in latest}
        spot_ok = abs(by_sex["male"] - male) < 1e-9 and abs(by_sex["female"] - female) < 1e-9
        note = f"2022-2024 male={male} female={female}"
    elif indicator_id == "gcse-grade-4-english-maths":
        with raw.open(newline="", encoding="utf-8") as handle:
            matches = [
                r
                for r in csv.DictReader(handle)
                if r["geographic_level"] == "National"
                and r["establishment_type_group"] == "All state-funded"
                and r["breakdown_topic"] == "Total"
            ]
        spot_ok = len(matches) == len(rows)
        valued = [r for r in rows if r["value"] not in ("", None)]
        last = valued[-1]
        spot_ok = spot_ok and abs(float(last["value"]) - 64.8) < 1e-9
        note = f"national_total_rows={len(matches)} last={last['value']}"

    results.append(
        (f"{indicator_id}:C5", "Spot recompute", "pass" if spot_ok else "fail", note)
    )
    return results


def main() -> int:
    all_results: list[tuple[str, str, str, str]] = []
    for indicator_id, meta in INDICATORS.items():
        all_results.extend(check_indicator(indicator_id, meta))

    lines = [
        "# QA — People wave 2026-11-03",
        "",
        "Independent read-only checks against `data/people/`.",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in all_results:
        lines.append(f"| {check_id} | {name} | {result} | {notes} |")
    fails = [r for r in all_results if r[2] == "fail"]
    verdict = "fail" if fails else "pass"
    lines.extend(["", f"Overall: **{verdict}**", ""])
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"wrote {QA_OUT}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

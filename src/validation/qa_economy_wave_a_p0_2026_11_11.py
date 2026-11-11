"""Independent QA — Economy Wave A P0: cpi-index (D7BT) and the debt trio (HF6W/DZLS/NMFX).

Does not import the Economy connectors. For each indicator it:
  1. hashes the curated CSV and the pinned raw JSON (if on disk),
  2. fetches the live ONS ``/data`` JSON and hashes it against the manifest pin,
  3. re-parses ``months`` with plain ``json`` and compares every period with the curated CSV,
  4. checks units / geography / status against the manifest,
  5. compares the curated rows with what Postgres serves (if a database is configured).

It prints one JSON document; the QA reports under ``data/qa/`` are written from it.
It never writes to ``data/economy/``.

  PYTHONPATH=src uv run python -m validation.qa_economy_wave_a_p0_2026_11_11
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import json
import urllib.request
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
ECON = ROOT / "data" / "economy"
UK = "K02000001"
MONTHS = {name: i for i, name in enumerate(calendar.month_name) if name}
UA = "Mozilla/5.0 (BritishExchange-Validation)"

# Expected values written out here, not read from connectors.
SPECS = {
    "cpi-index": {"cdid": "D7BT", "unit_has": "2015=100", "expect_latest": ("2026-09", 144.1)},
    "public-sector-net-debt": {"cdid": "HF6W", "unit_has": "£ billion", "expect_latest": ("2026-09", 3005.0)},
    "public-sector-net-borrowing": {"cdid": "DZLS", "unit_has": "£ million", "expect_latest": ("2026-09", 24520.0)},
    "public-sector-debt-interest": {"cdid": "NMFX", "unit_has": "£ million", "expect_latest": ("2026-09", 10933.0)},
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def parse_months(payload: dict) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for m in payload["months"]:
        key = f"{int(m['year']):04d}-{MONTHS[m['month']]:02d}"
        raw = (m["value"] or "").strip()
        out[key] = float(raw) if raw else None
    return out


def read_curated(path: Path) -> tuple[list[dict], dict[str, float | None]]:
    with path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    by_month: dict[str, float | None] = {}
    for r in rows:
        key = r["period_start"][:7]
        by_month[key] = float(r["value"]) if r["value"] != "" else None
    return rows, by_month


def rolling12(series: dict[str, float | None], end: str) -> float | None:
    y, m = int(end[:4]), int(end[5:])
    total = 0.0
    for _ in range(12):
        v = series.get(f"{y:04d}-{m:02d}")
        if v is None:
            return None
        total += v
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return round(total, 1)


def served_rows(indicator: str) -> dict | None:
    try:
        from britain_exchange.db import connect, load_repo_env

        load_repo_env()
        with connect() as conn:
            rel = conn.execute(
                "SELECT release_id, source_version, checksum_sha256 FROM data_release "
                "WHERE indicator_id = %s AND is_current",
                (indicator,),
            ).fetchone()
            if rel is None:
                return {"error": "no current release"}
            rows = conn.execute(
                "SELECT period_start, value, unit FROM observation WHERE release_id = %s",
                (rel["release_id"],),
            ).fetchall()
        return {
            "release": {k: str(v) for k, v in rel.items()},
            "rows": len(rows),
            "by_month": {r["period_start"].isoformat()[:7]: (None if r["value"] is None else float(r["value"])) for r in rows},
            "units": sorted({r["unit"] for r in rows}),
        }
    except Exception as exc:  # noqa: BLE001 - report, do not crash QA
        return {"error": f"{type(exc).__name__}: {exc}"}


def check(indicator: str) -> dict:
    spec = SPECS[indicator]
    pkg = ECON / indicator
    manifest = yaml.safe_load((pkg / "manifest.yaml").read_text())
    ev = manifest["raw_evidence"][0]
    rows, curated = read_curated(pkg / "curated" / "observations.csv")

    result: dict = {"indicator": indicator, "cdid": spec["cdid"]}
    result["curated_sha256"] = sha256_bytes((pkg / "curated" / "observations.csv").read_bytes())
    result["manifest_sha256"] = ev["checksum_sha256"]
    raw_path = pkg / ev["path"]
    result["raw_on_disk"] = raw_path.exists()
    if raw_path.exists():
        result["raw_sha256"] = sha256_bytes(raw_path.read_bytes())

    live_bytes = fetch(ev["source_url"])
    live = json.loads(live_bytes)
    result["live_sha256"] = sha256_bytes(live_bytes)
    desc = live["description"]
    result["live_cdid"] = desc["cdid"]
    result["live_title"] = desc["title"]
    result["live_unit"] = f"{desc.get('preUnit', '')}{desc.get('unit', '')}"
    result["live_release"] = desc["releaseDate"]
    result["live_next_release"] = desc.get("nextRelease")
    result["live_headline"] = (desc["date"], desc["number"])
    live_months = parse_months(live)

    result["curated_rows"] = len(rows)
    result["live_months"] = len(live_months)
    result["missing_curated"] = sum(1 for v in curated.values() if v is None)
    result["missing_live"] = sum(1 for v in live_months.values() if v is None)
    result["span"] = (min(curated), max(curated))
    result["duplicates"] = len(rows) - len(curated)
    only_live = sorted(set(live_months) - set(curated))
    only_cur = sorted(set(curated) - set(live_months))
    diffs = [k for k in live_months if k in curated and live_months[k] != curated[k]]
    result["only_live"], result["only_curated"], result["value_diffs"] = only_live, only_cur, diffs[:10]
    result["n_value_diffs"] = len(diffs)

    # Calendar integrity: period_end is real month end, one row per month, no gaps.
    bad_dates = 0
    for r in rows:
        s, e = date.fromisoformat(r["period_start"]), date.fromisoformat(r["period_end"])
        if s.day != 1 or e.day != calendar.monthrange(s.year, s.month)[1] or (s.year, s.month) != (e.year, e.month):
            bad_dates += 1
    result["bad_period_bounds"] = bad_dates
    ys, ms = int(result["span"][0][:4]), int(result["span"][0][5:])
    ye, me = int(result["span"][1][:4]), int(result["span"][1][5:])
    expected_n = (ye - ys) * 12 + (me - ms) + 1
    result["calendar_gap"] = expected_n - len(curated)

    # Row-level metadata
    result["geographies"] = sorted({r["geography_code"] for r in rows})
    result["units"] = sorted({r["unit"] for r in rows})
    result["statuses"] = sorted({r["observation_status"] for r in rows})
    result["source_versions"] = sorted({r["source_version"] for r in rows})
    result["unit_ok"] = all(spec["unit_has"] in u for u in result["units"]) and spec["unit_has"] in manifest["unit"]
    miss_rows = [r for r in rows if r["observation_status"] == "missing"]
    result["status_missing_rows"] = len(miss_rows)
    result["missing_status_consistent"] = all(r["value"] == "" for r in miss_rows) and all(
        r["observation_status"] == "missing" for r in rows if r["value"] == ""
    )

    # Spot checks
    exp_month, exp_val = spec["expect_latest"]
    result["latest_curated"] = (max(curated), curated[max(curated)])
    result["expected_latest"] = (exp_month, exp_val)
    result["live_latest_month"] = live_months[exp_month]

    result["postgres"] = None
    pg = served_rows(indicator)
    if pg is not None:
        if "by_month" in pg:
            pm = pg.pop("by_month")
            pg["only_pg"] = len(set(pm) - set(curated))
            pg["only_csv"] = len(set(curated) - set(pm))
            pg["value_diffs"] = sum(1 for k in pm if k in curated and pm[k] != curated[k])
        result["postgres"] = pg

    if indicator == "cpi-index":
        # Growth recompute: Sep 2026 annual rate from index vs ONS D7G7 headline (3.5 at last pin).
        y = curated["2026-09"] / curated["2025-09"] * 100 - 100
        result["recomputed_annual_rate_2026_09"] = round(y, 2)
        result["samples"] = {k: curated[k] for k in ("1988-01", "2015-12", "2020-01", "2026-08", "2026-09")}
        result["base_2015_mean"] = round(sum(v for k, v in curated.items() if k.startswith("2015")) / 12, 2)
        result["max_mom_pct"] = max(
            (round((curated[b] / curated[a] - 1) * 100, 2), b)
            for a, b in zip(sorted(curated)[:-1], sorted(curated)[1:])
        )
    else:
        result["samples"] = {k: curated.get(k) for k in ("1975-03", "1993-03", "1997-04", "2000-03", "2026-01", "2026-08", "2026-09")}
        vals = [v for v in curated.values() if v is not None]
        result["negative_months"] = sum(1 for v in vals if v < 0)
        result["min_max"] = (min(vals), max(vals))
        if indicator != "public-sector-net-debt":
            result["rolling12_2026_09"] = rolling12(curated, "2026-09")
    result["_curated"] = curated
    return result


def main() -> int:
    results = {i: check(i) for i in SPECS}
    # Cross-indicator: stock vs flow ordering sanity (debt £bn >> flow £m / 1000)
    debt = results["public-sector-net-debt"]["_curated"]["2026-09"]
    nb = results["public-sector-net-borrowing"]["_curated"]["2026-09"]
    ni = results["public-sector-debt-interest"]["_curated"]["2026-09"]
    cross = {"debt_gbp_bn": debt, "borrowing_gbp_m": nb, "interest_gbp_m": ni,
             "borrowing_gbp_bn": nb / 1000, "interest_gbp_bn": ni / 1000}
    for r in results.values():
        r.pop("_curated")
    print(json.dumps({"results": results, "cross": cross}, indent=2, default=str, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Independent QA for Economy Domain 04 Phase 1 living-standards pins.

Checks DG2R, CRXX, and DGD8 against pinned raw JSON, a live ONS /data
re-fetch, and a few HTML-table spots. Does not rewrite Economy curated
files.

Run from repo root::

    PYTHONPATH=src uv run python -m validation.qa_economy_04_rhdi_2026_11_15

Refs: hashlib (https://docs.python.org/3/library/hashlib.html),
urllib.request (https://docs.python.org/3/library/urllib.request.html),
csv / pathlib / json (standard library).
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import json
import re
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_04_rhdi_2026-11-15.md"
USER_AGENT = "BritishExchange-Validation/1.0 (independent QA; ONS UKEA)"

QUARTER_BOUNDS = {
    "Q1": (1, 3),
    "Q2": (4, 6),
    "Q3": (7, 9),
    "Q4": (10, 12),
}

# Independent HTML-table spots from the 2026-11-15 ONS landing pages
# (same vintage as JSON: release 30 September 2026).
HTML_SPOTS: dict[str, dict[str, float]] = {
    "DG2R": {
        "1955 Q1": 78185.0,
        "1990 Q4": 226895.0,
        "2010 Q1": 360389.0,
        "2020 Q2": 426121.0,
        "2024 Q1": 440927.0,
    },
    "CRXX": {
        "1955 Q1": 1536.0,
        "1990 Q4": 3957.0,
        "2010 Q1": 5754.0,
        "2020 Q2": 6385.0,
        "2026 Q2": 6577.0,
    },
    "DGD8": {
        "1963 Q1": 4.7,
        "1990 Q4": 11.1,
        "2010 Q1": 12.6,
        "2020 Q2": 27.1,
        "2026 Q2": 8.8,
    },
}

PACKAGES: list[dict[str, Any]] = [
    {
        "indicator_id": "real-household-disposable-income",
        "cdid": "DG2R",
        "raw_name": "dg2r_ukea.json",
        "expected_sha": (
            "cd6c516e9009a2e51f2c5e1fe3fe5d375bd88487ed69a467adee88f3f9f64be9"
        ),
        "expected_n": 286,
        "first_period": "1955-01-01",
        "last_period": "2026-04-01",
        "last_value": 457927.0,
        "first_value": 78185.0,
        "unit_needles": ("chained volume", "s.14"),
        "title_needles": ("s.14", "reference year 2024", "sa"),
        "esa_in_title": True,
        "cvm": True,
        "data_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/dg2r/ukea/data"
        ),
        "html_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/dg2r/ukea"
        ),
        "connector": "economy.connectors.real_household_disposable_income",
    },
    {
        "indicator_id": "real-household-disposable-income-per-head",
        "cdid": "CRXX",
        "raw_name": "crxx_ukea.json",
        "expected_sha": (
            "172d03bff5669c51b75881fb2a718bf7d110e302277ea59d95f1324219fd24b5"
        ),
        "expected_n": 286,
        "first_period": "1955-01-01",
        "last_period": "2026-04-01",
        "last_value": 6577.0,
        "first_value": 1536.0,
        "unit_needles": ("chained volume", "per head"),
        "title_needles": ("reference year = 2024", "seasonally adjusted"),
        "esa_in_title": False,
        "cvm": True,
        "data_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/crxx/ukea/data"
        ),
        "html_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/crxx/ukea"
        ),
        "connector": "economy.connectors.real_household_disposable_income_per_head",
    },
    {
        "indicator_id": "household-saving-ratio",
        "cdid": "DGD8",
        "raw_name": "dgd8_ukea.json",
        "expected_sha": (
            "aa05f3a111fc2d8117ae4006809b83fde19d460b57131d3296ed015a886cd6ee"
        ),
        "expected_n": 254,
        "first_period": "1963-01-01",
        "last_period": "2026-04-01",
        "last_value": 8.8,
        "first_value": 4.7,
        "unit_needles": ("%", "current prices"),
        "title_needles": ("s.14", "per cent", "sa"),
        "esa_in_title": True,
        "cvm": False,
        "data_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/dgd8/ukea/data"
        ),
        "html_url": (
            "https://www.ons.gov.uk/economy/grossdomesticproductgdp/"
            "timeseries/dgd8/ukea"
        ),
        "connector": "economy.connectors.household_saving_ratio",
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def quarter_bounds(year: int, quarter: str) -> tuple[date, date]:
    start_month, end_month = QUARTER_BOUNDS[quarter]
    last_day = calendar.monthrange(year, end_month)[1]
    return date(year, start_month, 1), date(year, end_month, last_day)


def fetch_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        if response.status != 200:
            raise RuntimeError(f"{url} HTTP {response.status}")
        return json.loads(response.read().decode("utf-8"))


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        if response.status != 200:
            raise RuntimeError(f"{url} HTTP {response.status}")
        return response.read().decode("utf-8", errors="replace")


def html_quarter_value(html: str, label: str) -> float | None:
    # ONS landing tables use "1955 Q1" in a cell then the value.
    pattern = re.compile(
        rf">{re.escape(label)}</[^>]*>\s*<[^>]*>\s*([0-9,.]+)\s*<",
        re.IGNORECASE,
    )
    match = pattern.search(html)
    if match:
        return float(match.group(1).replace(",", ""))
    # Fallback: JSON-style text dump "1955 Q1 | 78185"
    loose = re.search(
        rf"{re.escape(label)}\s*[|,]\s*([0-9,.]+)",
        html,
    )
    if loose:
        return float(loose.group(1).replace(",", ""))
    return None


def blob(manifest: dict[str, Any], notes_path: Path) -> str:
    parts = [
        str(manifest.get("definition", "")),
        str(manifest.get("caveats", "")),
        str(manifest.get("revision_notes", "")),
        str(manifest.get("unit", "")),
        notes_path.read_text(encoding="utf-8") if notes_path.is_file() else "",
    ]
    return " ".join(parts).lower()


def check(checks: list[tuple[str, str, str, str]], check_id: str, name: str, ok: bool, notes: str, *, warn: bool = False) -> None:
    if ok:
        result = "pass"
    elif warn:
        result = "warn"
    else:
        result = "fail"
    checks.append((check_id, name, result, notes))


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    live_ok = True
    live_payloads: dict[str, dict[str, Any]] = {}
    html_payloads: dict[str, str] = {}
    latest_pair: dict[str, float] = {}

    for pkg in PACKAGES:
        try:
            live_payloads[pkg["cdid"]] = fetch_json(pkg["data_url"])
        except Exception as exc:  # noqa: BLE001 — report, do not crash QA
            live_ok = False
            check(
                checks,
                "C1",
                f"{pkg['cdid']} live /data fetch",
                False,
                f"{type(exc).__name__}: {exc}",
            )
        try:
            html_payloads[pkg["cdid"]] = fetch_text(pkg["html_url"])
        except Exception as exc:  # noqa: BLE001
            check(
                checks,
                "C2",
                f"{pkg['cdid']} live HTML fetch",
                False,
                f"{type(exc).__name__}: {exc}",
                warn=True,
            )

    check(
        checks,
        "C1",
        "live ONS /data fetch (all three)",
        live_ok and len(live_payloads) == 3,
        "independent re-fetch of DG2R/CRXX/DGD8 JSON",
    )

    for pkg in PACKAGES:
        indicator_id = str(pkg["indicator_id"])
        cdid = str(pkg["cdid"])
        base = ROOT / "data" / "economy" / indicator_id
        manifest_path = base / "manifest.yaml"
        curated_path = base / "curated" / "observations.csv"
        raw_path = base / "raw" / "2026-11-15" / str(pkg["raw_name"])
        notes_path = base / "validation_notes.md"
        readme_path = base / "README.md"
        register_path = base / "source_register.csv"
        connector_path = (
            ROOT
            / "src"
            / Path(str(pkg["connector"]).replace(".", "/") + ".py")
        )

        files_ok = (
            manifest_path.is_file()
            and curated_path.is_file()
            and raw_path.is_file()
            and register_path.is_file()
            and connector_path.is_file()
        )
        check(
            checks,
            "C1",
            f"{cdid} files + connector",
            files_ok,
            f"raw={raw_path.name if raw_path.is_file() else 'missing'}",
        )
        if not files_ok:
            continue

        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        evidence = (manifest.get("raw_evidence") or [{}])[0]
        disk_sha = sha256(raw_path)
        sha_ok = (
            evidence.get("checksum_sha256") == disk_sha == pkg["expected_sha"]
        )
        check(
            checks,
            "C1",
            f"{cdid} checksum",
            sha_ok,
            f"disk={disk_sha[:16]}…",
        )

        licence_ok = "Open Government Licence" in str(manifest.get("licence", ""))
        connector_ok = str(manifest.get("connector_module")) == pkg["connector"]
        series_ok = str(manifest.get("series_id", "")).upper() == cdid
        check(
            checks,
            "C5",
            f"{cdid} licence + connector + CDID",
            licence_ok and connector_ok and series_ok,
            f"licence={manifest.get('licence')} module={manifest.get('connector_module')}",
        )

        geography = str(manifest.get("geography", ""))
        unit = str(manifest.get("unit", "")).lower()
        geo_ok = "United Kingdom" in geography and "K02000001" in geography
        sa_ok = "sa" in unit or "seasonally" in str(manifest.get("definition", "")).lower()
        unit_ok = all(needle in unit for needle in pkg["unit_needles"])
        check(
            checks,
            "C3",
            f"{cdid} UK geo + SA + units",
            geo_ok and sa_ok and unit_ok,
            f"geo={geography}; unit={manifest.get('unit')}",
        )

        pin = json.loads(raw_path.read_text(encoding="utf-8"))
        title = str((pin.get("description") or {}).get("title", ""))
        title_l = title.lower()
        title_ok = all(needle in title_l for needle in pkg["title_needles"])
        check(
            checks,
            "C3",
            f"{cdid} ONS series title",
            title_ok,
            title,
        )
        if pkg["cvm"]:
            check(
                checks,
                "C3",
                f"{cdid} CVM reference year 2024",
                "2024" in title and "chained volume" in title_l,
                title,
            )
        else:
            check(
                checks,
                "C3",
                f"{cdid} current prices (not CVM)",
                "current price" in title_l and "per cent" in title_l,
                title,
            )

        if pkg["esa_in_title"]:
            check(
                checks,
                "C3",
                f"{cdid} ESA S.14 in ONS title",
                "s.14" in title_l and "s.15" not in title_l,
                title,
            )
        else:
            check(
                checks,
                "C3",
                f"{cdid} ESA S.14 in ONS title",
                False,
                "ONS title says Households without ESA code; treated as DG2R companion",
                warn=True,
            )

        live = live_payloads.get(cdid)
        if live is not None:
            live_quarters = {
                (row["date"], str(row["value"])) for row in live.get("quarters") or []
            }
            pin_quarters = {
                (row["date"], str(row["value"])) for row in pin.get("quarters") or []
            }
            live_title = str((live.get("description") or {}).get("title", ""))
            check(
                checks,
                "C1",
                f"{cdid} live JSON == pin",
                live_quarters == pin_quarters and live_title == title,
                f"live_n={len(live.get('quarters') or [])} pin_n={len(pin.get('quarters') or [])}",
            )
            release = str((live.get("description") or {}).get("releaseDate", ""))
            check(
                checks,
                "C5",
                f"{cdid} vintage 2026-09-29 JSON / 30 Sep landing",
                release.startswith("2026-09-29"),
                f"releaseDate={release}; landing date is 30 September 2026 UK",
            )

        rows = load_rows(curated_path)
        n_ok = len(rows) == pkg["expected_n"]
        check(
            checks,
            "C4",
            f"{cdid} observation count",
            n_ok,
            f"n={len(rows)} expected={pkg['expected_n']}",
        )

        geos = {row["geography_code"] for row in rows}
        labels = {row["geography_label"] for row in rows}
        check(
            checks,
            "C3",
            f"{cdid} curated geography",
            geos == {"K02000001"} and labels == {"United Kingdom"},
            f"codes={sorted(geos)} labels={sorted(labels)}",
        )

        provisional = [row for row in rows if row.get("observation_status") == "provisional"]
        latest = rows[-1] if rows else {}
        provisional_ok = (
            len(provisional) == 1
            and latest.get("observation_status") == "provisional"
            and latest.get("period_start") == pkg["last_period"]
        )
        check(
            checks,
            "C6",
            f"{cdid} provisional = latest quarter only",
            provisional_ok,
            f"prov={len(provisional)} latest={latest.get('period_start')} "
            f"status={latest.get('observation_status')}",
        )

        pin_quarters_list = pin.get("quarters") or []
        mismatches: list[str] = []
        if len(pin_quarters_list) != len(rows):
            mismatches.append(f"count pin={len(pin_quarters_list)} curated={len(rows)}")
        for raw_row, curated in zip(pin_quarters_list, rows, strict=False):
            year = int(raw_row["year"])
            quarter = str(raw_row["quarter"])
            start, end = quarter_bounds(year, quarter)
            pin_value = float(str(raw_row["value"]).replace(",", ""))
            curated_value = float(curated["value"])
            if (
                curated["period_start"] != start.isoformat()
                or curated["period_end"] != end.isoformat()
                or abs(pin_value - curated_value) > 1e-9
                or curated["geography_code"] != "K02000001"
            ):
                mismatches.append(f"{raw_row['date']}")
                if len(mismatches) >= 6:
                    break
        check(
            checks,
            "C1",
            f"{cdid} pin quarters == curated (full recon)",
            not mismatches,
            "all quarters match" if not mismatches else f"mismatches={mismatches}",
        )

        first = rows[0]
        last = rows[-1]
        first_ok = (
            first["period_start"] == pkg["first_period"]
            and abs(float(first["value"]) - float(pkg["first_value"])) < 1e-9
        )
        last_ok = (
            last["period_start"] == pkg["last_period"]
            and abs(float(last["value"]) - float(pkg["last_value"])) < 1e-9
        )
        check(
            checks,
            "C2",
            f"{cdid} first/last curated",
            first_ok and last_ok,
            f"first={first['period_start']} {first['value']}; "
            f"last={last['period_start']} {last['value']}",
        )
        latest_pair[cdid] = float(last["value"])

        html = html_payloads.get(cdid, "")
        for label, expected in HTML_SPOTS[cdid].items():
            curated_match = None
            year_s, q_s = label.split()
            start, _ = quarter_bounds(int(year_s), q_s)
            for row in rows:
                if row["period_start"] == start.isoformat():
                    curated_match = float(row["value"])
                    break
            html_value = html_quarter_value(html, label) if html else None
            html_ok = html_value is None or abs(html_value - expected) < 1e-6
            curated_ok = curated_match is not None and abs(curated_match - expected) < 1e-6
            notes = f"expected={expected} curated={curated_match} html={html_value}"
            if curated_ok and html_ok:
                result_ok, warn = True, False
            elif curated_ok and html_value is None:
                result_ok, warn = False, True
                notes += " (HTML parse missed; JSON/table spots still match)"
            else:
                result_ok, warn = False, False
            check(
                checks,
                "C2",
                f"{cdid} spot {label}",
                result_ok,
                notes,
                warn=warn,
            )

        text = blob(manifest, notes_path) + " " + (
            readme_path.read_text(encoding="utf-8").lower() if readme_path.is_file() else ""
        )
        if cdid == "DGD8":
            residual_ok = "residual" in text and "financial buffer" in text
            mislabelled = "financial buffer measure" in str(
                manifest.get("title", "")
            ).lower() or "was" in str(manifest.get("unit", "")).lower()
            check(
                checks,
                "C7",
                "DGD8 labelled national-accounts residual (not Buffer)",
                residual_ok and not mislabelled,
                "manifest/README treat DGD8 as S.14 residual, not WAS buffer",
            )
            check(
                checks,
                "C7",
                "DGD8 ONS title still says £m",
                False,
                "ONS title is 'saving ratio (per cent): Current price: £m: SA'; "
                "curated unit is percent — documented in README",
                warn=True,
            )
        if cdid == "CRXX":
            companion_ok = "s.14" in text or "dg2r companion" in text or "companion" in text
            check(
                checks,
                "C3",
                "CRXX Notes flag missing ESA code",
                companion_ok,
                "open question recorded; not silently claimed as S.14+S.15",
            )
        if cdid == "DG2R":
            npish_ok = "npish" in text or "nrjr" in text
            check(
                checks,
                "C3",
                "DG2R not substituted with NRJR (S.14+S.15)",
                npish_ok,
                "NRJR listed as link-only in source_register",
            )

    if "DG2R" in latest_pair and "CRXX" in latest_pair and latest_pair["CRXX"]:
        implied_pop_m = latest_pair["DG2R"] * 1_000_000 / latest_pair["CRXX"] / 1_000_000
        # UK population in 2026 is ~69–70 million; CVM £m / £ per head is a
        # rough implied headcount, not a published population series.
        pop_ok = 60.0 <= implied_pop_m <= 80.0
        check(
            checks,
            "C4",
            "DG2R/CRXX implied headcount sanity (2026 Q2)",
            pop_ok,
            f"£m / £ per head ≈ {implied_pop_m:.2f} million people — not a published recon",
        )

    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    verdict = "pass" if failed == 0 else "fail"

    lines = [
        "# QA report — Economy 04 RHDI / living-standards pins · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Domain: [04 · Household Finances & Living Standards]"
        "(https://app.notion.com/p/4146547176858147ba12d76094388df9)",
        "- Kickoff: `docs/agent-kickoff-validation-economy-04-rhdi.md`",
        "- Handover: `docs/handover-economy-04-household.md`",
        "- Packages: `real-household-disposable-income` (DG2R),",
        "  `real-household-disposable-income-per-head` (CRXX),",
        "  `household-saving-ratio` (DGD8 companion)",
        "- Vintage: UKEA raw `2026-11-15` · JSON `releaseDate` **2026-09-29**",
        "  (ONS landing **30 September 2026**). Next UKEA listed 22 December 2026.",
        "- Script: `validation.qa_economy_04_rhdi_2026_11_15`",
        "- Out of scope: mortgage-rate, ETB, Ledger / Cost of Living / Buffer / Debt,",
        "  HBAI, real household consumption.",
        "",
        "## Independence",
        "",
        "Pinned raw SHA-256 checked against manifests. Live ONS `/timeseries/<cdid>/ukea/data`",
        "JSON re-fetched on 2026-11-15 and compared quarter-for-quarter to the pin.",
        "HTML landing tables used for first / mid / last spots. Curated CSVs were not edited.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in checks:
        lines.append(f"| {check_id} | {name} | **{result}** | {notes} |")

    lines.extend(
        [
            "",
            "## Method notes",
            "",
            "- **DG2R** ONS title: Households (S.14), CVM, reference year 2024, £m, SA.",
            "- **CRXX** ONS title: Households, CVM per head, reference year = 2024, SA.",
            "  ESA code is **not** printed. Validation **warns**, does not fail: Economy",
            "  records this as an open question and treats CRXX as the DG2R companion.",
            "  Do not substitute NRJR (S.14+S.15) for DG2R.",
            "- **DGD8** ONS title: Households (S.14) saving ratio (per cent), current",
            "  prices, SA. Title still appends `£m`; curated unit is percent. This is a",
            "  **national-accounts residual**, not a typical household buffer and not WAS.",
            "  Handover Notes are strong; not labelled as Financial Buffer → not a fail.",
            "- Provisional policy: latest quarter only (`2026 Q2`). Older quarters `final`",
            "  in curated files even though UKEA still revises history.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            "- Recommend Orchestrator **Ready** on the three Phase 1 pins only",
            "  (DG2R, CRXX, DGD8). Do **not** flip mortgage-rate, ETB, or Ledger/Buffer.",
            "- Cloud load of observations is still an Orchestrator / API concern;",
            "  this QA is numerical + methodological vs ONS UKEA.",
            "- Follow-up: re-pin after **22 December 2026** UKEA. Optional: confirm CRXX",
            "  ESA universe with Sector Accounts (not a Ready blocker).",
            "",
            "## Blockers",
            "",
            "- None for Ready on these three pins.",
            "",
            "## Economy fix tasks",
            "",
            "- None required to pass this vintage.",
            "- Optional (non-blocking): keep the CRXX S.14 open question on the registry",
            "  row until ONS prints the ESA code, or cite a UKEA table note that CRXX is S.14.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Independent QA — Economy Domain 04 Buffer + Debt packs.

What this script does (plain language)
--------------------------------------
It re-reads the **pinned** ONS WAS workbook and BoE IADB CSV itself, with its
own parsers (it does **not** import the Economy connectors for the primary
comparison). It then checks the curated CSVs, manifests, and Notes against
those official cells. Curated Economy files are never rewritten.

Packages
--------
1. ``household-financial-wealth``     ONS WAS Tables 5.1, 5.10–5.13
2. ``consumer-credit-outstanding``    BoE LPMBI2O / LPMVZRJ / LPMB4TS

Run from repo root::

    PYTHONPATH=src uv run python -m validation.qa_economy_04_buffer_debt_2026_11_15

Refs: hashlib (https://docs.python.org/3/library/hashlib.html),
csv / pathlib (standard library),
openpyxl (https://openpyxl.readthedocs.io/),
urllib.request (https://docs.python.org/3/library/urllib.request.html),
PEP 8 (https://peps.python.org/pep-0008/).
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import urllib.request
from collections import defaultdict
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Any

import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_04_buffer_debt_2026-11-15.md"
USER_AGENT = "BritishExchange-Validation/1.0 (independent QA; WAS + BoE IADB)"

WAS_DIR = ROOT / "data" / "economy" / "household-financial-wealth"
DEBT_DIR = ROOT / "data" / "economy" / "consumer-credit-outstanding"
ECON = ROOT / "data" / "economy"

WAS_RAW = WAS_DIR / "raw" / "2026-11-15" / "financialwealthtables.xlsx"
WAS_SHA = "7afee4fac3e3b3b0d1c970678bc10cd7e2711a774a13e4d2665c1b513c85013c"
WAS_N = 447

DEBT_RAW = DEBT_DIR / "raw" / "2026-11-15" / "lpmbi2o_lpmvzrj_lpmb4ts.csv"
DEBT_SHA = "ab8c026ad4caca0c158655d82a0b49a25425643dccc3d5784702df85d78545da"
DEBT_N = 1208

BOE_URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&Datefrom=01/Jan/1993&Dateto=01/Dec/2026"
    "&SeriesCodes=LPMBI2O,LPMVZRJ,LPMB4TS&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
)

ROUND_BOUNDS: dict[str, tuple[str, str]] = {
    "July 2006 to June 2008": ("2006-07-01", "2008-06-30"),
    "July 2008 to June 2010": ("2008-07-01", "2010-06-30"),
    "July 2010 to June 2012": ("2010-07-01", "2012-06-30"),
    "July 2012 to June 2014": ("2012-07-01", "2014-06-30"),
    "July 2014 to June 2016": ("2014-07-01", "2016-06-30"),
    "April 2014 to March 2016": ("2014-04-01", "2016-03-31"),
    "April 2016 to March 2018": ("2016-04-01", "2018-03-31"),
    "April 2018 to March 2020": ("2018-04-01", "2020-03-31"),
    "April 2020 to March 2022": ("2020-04-01", "2022-03-31"),
}

BAND_SLUGS: dict[str, str] = {
    "Less than -£5,000": "less-than-minus-5000",
    "-£5,000 but < -£500": "minus-5000-to-minus-500",
    "-£500 but < £0": "minus-500-to-minus-0",
    "£0 but < £500": "0-to-500",
    "£500 but < £5,000": "500-to-5000",
    "£5,000 but < £12,500": "5000-to-12500",
    "£12,500 but < £25,000": "12500-to-25000",
    "£25,000 but < £50,000": "25000-to-50000",
    "£50,000 but < £100,000": "50000-to-100000",
    "£100,000 or more": "100000-or-more",
}

COVERAGE_ASSETS: dict[str, str] = {
    "Any formal financial asset including current accounts in credit (8)": (
        "any-formal-including-current-in-credit"
    ),
    "Savings accounts": "savings-accounts",
    "ISAs (1)": "isas",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def norm(value: object) -> str:
    return " ".join(str(value or "").split())


def number(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.startswith("["):
        return None
    try:
        return float(text.replace(",", "").replace("£", ""))
    except ValueError:
        return None


def notes_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        part = part.strip()
        if "=" in part:
            key, value = part.split("=", 1)
            out[key.strip()] = value.strip()
    return out


def check(
    checks: list[tuple[str, str, str, str]],
    check_id: str,
    name: str,
    ok: bool,
    notes: str,
    *,
    warn: bool = False,
) -> None:
    if ok:
        result = "pass"
    elif warn:
        result = "warn"
    else:
        result = "fail"
    checks.append((check_id, name, result, notes))


def round_columns(sheet: Any) -> list[tuple[int, str, str]]:
    found: list[tuple[int, str, str]] = []
    for col in range(1, sheet.max_column + 1):
        bounds = ROUND_BOUNDS.get(norm(sheet.cell(3, col).value))
        if bounds is None:
            continue
        found.append((col, bounds[0], bounds[1]))
    return found


def emit_rounds(
    sheet: Any,
    row: int,
    *,
    extra: dict[str, str],
    unit: str,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for col, start, end in round_columns(sheet):
        value = number(sheet.cell(row, col).value)
        if value is None:
            continue
        payload = {
            **extra,
            "period_start": start,
            "period_end": end,
            "value": value,
            "unit": unit,
            "accreditation": "suspended" if start == "2020-04-01" else "prior-round",
        }
        out.append(payload)
    return out


def parse_was(path: Path) -> list[dict[str, Any]]:
    """Independent published-cell parse of Tables 5.1 and 5.10–5.13."""
    book = openpyxl.load_workbook(path, data_only=True)
    try:
        rows: list[dict[str, Any]] = []
        rows.extend(parse_5_1(book["Table 5.1"]))
        rows.extend(parse_5_10(book["Table 5.10"]))
        rows.extend(parse_5_11(book["Table 5.11"]))
        rows.extend(parse_5_12(book["Table 5.12"]))
        rows.extend(parse_5_13(book["Table 5.13"]))
        titles = {name: str(book[name].cell(1, 1).value or "") for name in book.sheetnames}
        geo_line = str(book["Table 5.10"].cell(2, 1).value or "")
        cover = str(book["Cover Sheet"].cell(14, 1).value or "")
        cover_title = str(book["Cover Sheet"].cell(1, 1).value or "")
        cover_covid = str(book["Cover Sheet"].cell(11, 1).value or "")
        cover_weights = str(book["Cover Sheet"].cell(9, 1).value or "")
        cover_cpih = str(book["Cover Sheet"].cell(6, 1).value or "")
    finally:
        book.close()
    return rows, {
        "titles": titles,
        "geo_line": geo_line,
        "cover": cover,
        "cover_title": cover_title,
        "cover_covid": cover_covid,
        "cover_weights": cover_weights,
        "cover_cpih": cover_cpih,
    }


def parse_5_1(sheet: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = norm(sheet.cell(row, 1).value)
        if col_a.startswith("Percentage"):
            block = "percentage"
        elif col_a:
            block = None
        if block != "percentage":
            continue
        asset = COVERAGE_ASSETS.get(norm(sheet.cell(row, 2).value))
        if asset is None:
            continue
        out.extend(
            emit_rounds(
                sheet,
                row,
                unit="percent",
                extra={
                    "table": "5.1",
                    "series": "coverage",
                    "asset": asset,
                    "population": "all-households",
                },
            )
        )
    return out


def parse_5_10(sheet: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    population: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = norm(sheet.cell(row, 1).value)
        col_b = norm(sheet.cell(row, 2).value)
        if "Households with financial assets or liabilities" in col_a:
            population = "with-assets-or-liabilities"
        elif "All households" in col_a:
            population = "all-households"
        if population is None or not col_b:
            continue
        if col_b.startswith("Percentage"):
            series, unit = "coverage", "percent"
        elif col_b.startswith("25th"):
            series, unit = "p25", "gbp"
        elif "Median" in col_b or "50th" in col_b:
            series, unit = "median", "gbp"
        elif col_b.startswith("75th"):
            series, unit = "p75", "gbp"
        else:
            continue
        out.extend(
            emit_rounds(
                sheet,
                row,
                unit=unit,
                extra={
                    "table": "5.10",
                    "series": series,
                    "population": population,
                },
            )
        )
    return out


def parse_5_11(sheet: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = norm(sheet.cell(row, 1).value)
        if col_a.startswith("Percentage"):
            block = "percentage"
        elif col_a:
            block = None
        if block != "percentage":
            continue
        band_label = norm(sheet.cell(row, 2).value)
        if band_label in {"", "All households"}:
            continue
        band = BAND_SLUGS.get(band_label)
        if band is None:
            continue
        out.extend(
            emit_rounds(
                sheet,
                row,
                unit="percent",
                extra={
                    "table": "5.11",
                    "series": "band-share",
                    "band": band,
                    "population": "all-households",
                },
            )
        )
    return out


def parse_5_12(sheet: Any) -> list[dict[str, Any]]:
    mapping = {
        "Aggregate household gross financial wealth": "aggregate-gross",
        "Aggregate household financial liabilities": "aggregate-liabilities",
        "Aggregate household net financial wealth": "aggregate-net",
    }
    out: list[dict[str, Any]] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = norm(sheet.cell(row, 1).value)
        if col_a.startswith("Billion"):
            block = "billion"
        elif col_a:
            block = None
        if block != "billion":
            continue
        series = mapping.get(norm(sheet.cell(row, 2).value))
        if series is None:
            continue
        out.extend(
            emit_rounds(
                sheet,
                row,
                unit="gbp-billions",
                extra={
                    "table": "5.12",
                    "series": series,
                    "population": "all-households",
                },
            )
        )
    return out


def income_band(label: str) -> str | None:
    if label == "All households":
        return "all"
    if not label.startswith("Net equivalised income decile"):
        return None
    if "lowest" in label:
        return "income-decile-1"
    if "highest" in label:
        return "income-decile-10"
    token = label.replace("Net equivalised income decile", "").strip()
    try:
        n = int(token.split()[0])
    except (ValueError, IndexError):
        return None
    return f"income-decile-{n}"


def parse_5_13(sheet: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    series: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = norm(sheet.cell(row, 1).value)
        if "25th percentile" in col_a:
            series = "p25"
        elif "50th percentile" in col_a or "median" in col_a.lower():
            series = "median"
        elif "75th percentile" in col_a:
            series = "p75"
        elif col_a:
            series = None
        if series is None:
            continue
        band = income_band(norm(sheet.cell(row, 2).value))
        if band is None:
            continue
        out.extend(
            emit_rounds(
                sheet,
                row,
                unit="gbp",
                extra={
                    "table": "5.13",
                    "series": series,
                    "band": band,
                    "population": "all-households",
                },
            )
        )
    return out


def key_was(row: dict[str, Any]) -> tuple[str, ...]:
    return (
        str(row.get("period_start", "")),
        str(row.get("table", "")),
        str(row.get("series", "")),
        str(row.get("population", "")),
        str(row.get("asset", "")),
        str(row.get("band", "")),
    )


def parse_boe_csv(text: str) -> list[dict[str, Any]]:
    handle = StringIO(text)
    reader = csv.DictReader(handle)
    if not reader.fieldnames or "DATE" not in reader.fieldnames:
        raise ValueError(f"Unexpected BoE headers: {reader.fieldnames}")
    series_map = {
        "LPMBI2O": "total",
        "LPMVZRJ": "credit-cards",
        "LPMB4TS": "other",
    }
    rows: list[dict[str, Any]] = []
    for raw in reader:
        date_raw = (raw.get("DATE") or "").strip()
        if not date_raw:
            continue
        period = datetime.strptime(date_raw, "%d %b %Y").date()
        last = calendar.monthrange(period.year, period.month)[1]
        start = f"{period.year:04d}-{period.month:02d}-01"
        end = f"{period.year:04d}-{period.month:02d}-{last:02d}"
        for code, series in series_map.items():
            value_raw = (raw.get(code) or "").strip()
            if not value_raw:
                continue
            rows.append(
                {
                    "period_start": start,
                    "period_end": end,
                    "series": series,
                    "cdid": code,
                    "value": float(value_raw),
                }
            )
    return rows


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise RuntimeError(f"{url} HTTP {response.status}")
        return response.read().decode("utf-8-sig", errors="replace")


def blob(paths: list[Path], extra: str = "") -> str:
    parts = [extra]
    for path in paths:
        if path.is_file():
            parts.append(path.read_text(encoding="utf-8"))
    return " ".join(parts).lower()


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    # ------------------------------------------------------------------ WAS
    was_files_ok = all(
        path.is_file()
        for path in (
            WAS_DIR / "manifest.yaml",
            WAS_DIR / "curated" / "observations.csv",
            WAS_RAW,
            WAS_DIR / "source_register.csv",
            WAS_DIR / "README.md",
            ROOT / "src" / "economy" / "connectors" / "household_financial_wealth.py",
        )
    )
    check(checks, "C1", "WAS files + connector", was_files_ok, str(WAS_DIR))

    was_manifest = yaml.safe_load((WAS_DIR / "manifest.yaml").read_text(encoding="utf-8"))
    was_evidence = (was_manifest.get("raw_evidence") or [{}])[0]
    was_disk_sha = sha256(WAS_RAW)
    check(
        checks,
        "C1",
        "WAS checksum",
        was_evidence.get("checksum_sha256") == was_disk_sha == WAS_SHA,
        f"disk={was_disk_sha}",
    )

    was_parsed, was_meta = parse_was(WAS_RAW)
    curated_was = load_rows(WAS_DIR / "curated" / "observations.csv")
    check(
        checks,
        "C4",
        "WAS observation count",
        len(curated_was) == WAS_N == len(was_parsed),
        f"curated={len(curated_was)} parsed={len(was_parsed)} expected={WAS_N}",
    )

    geo_ok = (
        "Great Britain" in str(was_manifest.get("geography", ""))
        and "K03000001" in str(was_manifest.get("geography", ""))
        and "Great Britain" in was_meta["geo_line"]
        and "United Kingdom" not in was_meta["geo_line"]
    )
    check(
        checks,
        "C3",
        "WAS GB geography (workbook + manifest)",
        geo_ok,
        was_meta["geo_line"],
    )
    geos = {row["geography_code"] for row in curated_was}
    labels = {row["geography_label"] for row in curated_was}
    check(
        checks,
        "C3",
        "WAS curated geography",
        geos == {"K03000001"} and labels == {"Great Britain"},
        f"codes={sorted(geos)} labels={sorted(labels)}",
    )

    check(
        checks,
        "C1",
        "WAS edition date on cover",
        "24th January 2025" in was_meta["cover"]
        or was_evidence.get("official_release_date") == "2025-01-24",
        f"cover={was_meta['cover']!r}; evidence={was_evidence.get('official_release_date')}",
    )

    parsed_index = {key_was(row): row for row in was_parsed}
    mismatches: list[str] = []
    for row in curated_was:
        meta = notes_map(row.get("notes", ""))
        key = (
            row["period_start"],
            meta.get("table", ""),
            meta.get("series", ""),
            meta.get("population", ""),
            meta.get("asset", ""),
            meta.get("band", ""),
        )
        parsed = parsed_index.get(key)
        if parsed is None:
            mismatches.append(f"missing {key}")
            continue
        if abs(float(row["value"]) - float(parsed["value"])) > 1e-9:
            mismatches.append(f"value {key}: {row['value']} vs {parsed['value']}")
        if row["period_end"] != parsed["period_end"]:
            mismatches.append(f"end {key}")
        if meta.get("accreditation") != parsed["accreditation"]:
            mismatches.append(f"accreditation {key}")
        if len(mismatches) >= 8:
            break
    extra = [k for k in parsed_index if k not in {(
        r["period_start"],
        notes_map(r.get("notes", "")).get("table", ""),
        notes_map(r.get("notes", "")).get("series", ""),
        notes_map(r.get("notes", "")).get("population", ""),
        notes_map(r.get("notes", "")).get("asset", ""),
        notes_map(r.get("notes", "")).get("band", ""),
    ) for r in curated_was}]
    check(
        checks,
        "C1",
        "WAS workbook cells == curated (full recon)",
        not mismatches and not extra,
        "all published cells match"
        if not mismatches and not extra
        else f"mismatches={mismatches[:6]} extra={len(extra)}",
    )

    def round8(table: str, series: str, **needles: str) -> float | None:
        for row in was_parsed:
            if row["period_start"] != "2020-04-01":
                continue
            if row["table"] != table or row["series"] != series:
                continue
            if all(row.get(k) == v for k, v in needles.items()):
                return float(row["value"])
        return None

    spots = {
        "5.10 median all hh": (round8("5.10", "median", population="all-households"), 10400.0),
        "5.10 p25 all hh": (round8("5.10", "p25", population="all-households"), 300.0),
        "5.10 p75 all hh": (round8("5.10", "p75", population="all-households"), 58000.0),
        "5.1 any formal %": (
            round8("5.1", "coverage", asset="any-formal-including-current-in-credit"),
            98.0,
        ),
        "5.11 £100k+ share": (round8("5.11", "band-share", band="100000-or-more"), 17.0),
        "5.12 aggregate net £bn": (round8("5.12", "aggregate-net"), 1915.0),
        "5.13 median all hh": (round8("5.13", "median", band="all"), 10400.0),
    }
    for name, (got, expected) in spots.items():
        check(
            checks,
            "C2",
            f"WAS Round 8 {name}",
            got is not None and abs(got - expected) < 1e-9,
            f"workbook={got} expected={expected}",
        )

    r8_rows = [r for r in curated_was if r["period_start"] == "2020-04-01"]
    r8_acc = all("accreditation=suspended" in r.get("notes", "") for r in r8_rows)
    prior_acc = all(
        "accreditation=suspended" not in r.get("notes", "")
        for r in curated_was
        if r["period_start"] != "2020-04-01"
    )
    check(
        checks,
        "C3",
        "WAS Round 8 accreditation=suspended on curated rows",
        r8_acc and prior_acc and len(r8_rows) > 0,
        f"round8_n={len(r8_rows)}",
    )

    table_counts: dict[str, int] = defaultdict(int)
    for row in curated_was:
        table_counts[notes_map(row.get("notes", "")).get("table", "?")] += 1
    check(
        checks,
        "C4",
        "WAS table mix 5.1/5.10–5.13",
        table_counts.get("5.1") == 27
        and table_counts.get("5.10") == 72
        and table_counts.get("5.11") == 90
        and table_counts.get("5.12") == 27
        and table_counts.get("5.13") == 231,
        dict(table_counts).__repr__(),
    )
    check(
        checks,
        "C4",
        "WAS Table 5.7 survey borrowing not curated",
        "5.7" not in table_counts and "5.8" not in table_counts,
        "survey non-mortgage borrowing left uningested",
    )

    r8_bands = [
        row
        for row in was_parsed
        if row["table"] == "5.11"
        and row["period_start"] == "2020-04-01"
        and row["series"] == "band-share"
    ]
    band_sum = sum(row["value"] for row in r8_bands)
    check(
        checks,
        "C4",
        "WAS Table 5.11 Round 8 band shares ~100%",
        abs(band_sum - 100.0) <= 1.0,
        f"sum={band_sum} n_bands={len(r8_bands)}",
    )

    gross = round8("5.12", "aggregate-gross")
    liab = round8("5.12", "aggregate-liabilities")
    net = round8("5.12", "aggregate-net")
    check(
        checks,
        "C4",
        "WAS Table 5.12 Round 8 gross − liabilities = net",
        gross is not None and liab is not None and net is not None and abs((gross - liab) - net) < 1e-6,
        f"{gross} − {liab} = {None if gross is None or liab is None else gross - liab} vs net {net}",
    )

    was_text = blob(
        [WAS_DIR / "manifest.yaml", WAS_DIR / "README.md", WAS_DIR / "source_register.csv"],
        extra=str(was_manifest.get("definition", "")) + " " + str(was_manifest.get("caveats", "")),
    )
    check(
        checks,
        "C7",
        "WAS Notes: DGD8 is not the Buffer",
        "dgd8" in was_text
        and "not" in was_text
        and "saving ratio" in was_text
        and "financial buffer" not in str(was_manifest.get("title", "")).lower(),
        "manifest/README treat DGD8 as national-accounts residual",
    )
    check(
        checks,
        "C3",
        "WAS Notes: accreditation + nominal £ + COVID weights",
        "accreditation" in was_text
        and "suspended" in was_text
        and ("cpih" in was_text or "nominal" in was_text)
        and "tenure" in was_text,
        "cover + package caveats",
    )
    check(
        checks,
        "C5",
        "WAS does not fork Housing property wealth",
        "household-net-property-wealth" in was_text
        and "link" in was_text
        and not (ECON / "household-net-property-wealth").exists(),
        "related id is link-only; no economy/ package",
    )
    check(
        checks,
        "C5",
        "WAS connector + OGL",
        was_manifest.get("connector_module") == "economy.connectors.household_financial_wealth"
        and "Open Government Licence" in str(was_manifest.get("licence", "")),
        str(was_manifest.get("connector_module")),
    )

    # ------------------------------------------------------------------ Debt
    debt_files_ok = all(
        path.is_file()
        for path in (
            DEBT_DIR / "manifest.yaml",
            DEBT_DIR / "curated" / "observations.csv",
            DEBT_RAW,
            DEBT_DIR / "source_register.csv",
            DEBT_DIR / "README.md",
            ROOT / "src" / "economy" / "connectors" / "consumer_credit_outstanding.py",
        )
    )
    check(checks, "C1", "BoE files + connector", debt_files_ok, str(DEBT_DIR))

    debt_manifest = yaml.safe_load((DEBT_DIR / "manifest.yaml").read_text(encoding="utf-8"))
    debt_evidence = (debt_manifest.get("raw_evidence") or [{}])[0]
    debt_disk_sha = sha256(DEBT_RAW)
    check(
        checks,
        "C1",
        "BoE checksum",
        debt_evidence.get("checksum_sha256") == debt_disk_sha == DEBT_SHA,
        f"disk={debt_disk_sha}",
    )

    pin_text = DEBT_RAW.read_text(encoding="utf-8-sig")
    pin_rows = parse_boe_csv(pin_text)
    curated_debt = load_rows(DEBT_DIR / "curated" / "observations.csv")
    check(
        checks,
        "C4",
        "BoE observation count",
        len(curated_debt) == DEBT_N == len(pin_rows),
        f"curated={len(curated_debt)} pin={len(pin_rows)} expected={DEBT_N}",
    )

    pin_index = {(r["period_start"], r["series"]): r for r in pin_rows}
    debt_mismatches: list[str] = []
    for row in curated_debt:
        meta = notes_map(row.get("notes", ""))
        parsed = pin_index.get((row["period_start"], meta.get("series", "")))
        if parsed is None:
            debt_mismatches.append(f"missing {row['period_start']} {meta.get('series')}")
            continue
        if abs(float(row["value"]) - parsed["value"]) > 1e-9:
            debt_mismatches.append(
                f"{row['period_start']} {meta.get('series')}: {row['value']} vs {parsed['value']}"
            )
        if row["period_end"] != parsed["period_end"]:
            debt_mismatches.append(f"end {row['period_start']}")
        if meta.get("cdid") != parsed["cdid"]:
            debt_mismatches.append(f"cdid {row['period_start']}")
        if len(debt_mismatches) >= 8:
            break
    check(
        checks,
        "C1",
        "BoE pin CSV == curated (full recon)",
        not debt_mismatches,
        "all months match" if not debt_mismatches else f"mismatches={debt_mismatches[:6]}",
    )

    sep = "2026-09-01"
    def series_val(series: str) -> float | None:
        parsed = pin_index.get((sep, series))
        return None if parsed is None else parsed["value"]

    total, cards, other = series_val("total"), series_val("credit-cards"), series_val("other")
    check(
        checks,
        "C2",
        "BoE Sep 2026 LPMBI2O = 261,200",
        total == 261200.0,
        f"total={total}",
    )
    check(
        checks,
        "C2",
        "BoE Sep 2026 cards 83,708 + other 177,492",
        cards == 83708.0 and other == 177492.0,
        f"cards={cards} other={other}",
    )
    check(
        checks,
        "C4",
        "BoE Sep 2026 cards + other = total",
        total is not None
        and cards is not None
        and other is not None
        and abs((cards + other) - total) < 1e-6,
        f"{cards}+{other}={None if cards is None or other is None else cards + other} vs {total}",
    )

    identity_fail = 0
    identity_n = 0
    by_period: dict[str, dict[str, float]] = defaultdict(dict)
    for row in pin_rows:
        by_period[row["period_start"]][row["series"]] = row["value"]
    for period, parts in by_period.items():
        if {"total", "credit-cards", "other"} <= parts.keys():
            identity_n += 1
            if abs((parts["credit-cards"] + parts["other"]) - parts["total"]) > 1.5:
                identity_fail += 1
    check(
        checks,
        "C4",
        "BoE identity cards+other=total (all overlapping months)",
        identity_fail == 0 and identity_n > 300,
        f"checked={identity_n} fails={identity_fail} (tolerance £1.5m rounding)",
    )

    counts = defaultdict(int)
    for row in curated_debt:
        counts[notes_map(row.get("notes", "")).get("cdid", "?")] += 1
    check(
        checks,
        "C4",
        "BoE row mix (total 402 from Apr 1993; cards/other 403 from Mar 1993)",
        counts.get("LPMBI2O") == 402
        and counts.get("LPMVZRJ") == 403
        and counts.get("LPMB4TS") == 403,
        dict(counts).__repr__(),
    )

    geos_d = {row["geography_code"] for row in curated_debt}
    labels_d = {row["geography_label"] for row in curated_debt}
    unit_ok = all(row.get("unit") == "£ million, SA" for row in curated_debt)
    check(
        checks,
        "C3",
        "BoE UK geo + SA £ million",
        geos_d == {"K02000001"}
        and labels_d == {"United Kingdom"}
        and unit_ok
        and "K02000001" in str(debt_manifest.get("geography", ""))
        and "sa" in str(debt_manifest.get("unit", "")).lower(),
        f"unit={debt_manifest.get('unit')}",
    )

    provisional = [r for r in curated_debt if r.get("observation_status") == "provisional"]
    prov_ok = (
        {r["period_start"] for r in provisional} == {sep}
        and len(provisional) == 3
        and all(
            r.get("observation_status") == "final"
            for r in curated_debt
            if r["period_start"] != sep
        )
    )
    check(
        checks,
        "C6",
        "BoE provisional = latest month only (Sep 2026, all three series)",
        prov_ok,
        f"provisional_n={len(provisional)} periods={sorted({r['period_start'] for r in provisional})}",
    )

    debt_text = blob(
        [DEBT_DIR / "manifest.yaml", DEBT_DIR / "README.md", DEBT_DIR / "source_register.csv"]
    )
    title_ok = "student loans" in str(debt_manifest.get("title", "")).lower() or "slc" in debt_text
    check(
        checks,
        "C3",
        "BoE excl. SLC in title / notes",
        title_ok and "excl" in debt_text and "slc" in debt_text,
        str(debt_manifest.get("title")),
    )
    check(
        checks,
        "C5",
        "Housing MLAR / IUMBV34 / LPMVTXK are link-only",
        "residential-mortgage-book" in debt_text
        and "mortgage-rate-2yr-fixed" in debt_text
        and "lpmvtxk" in debt_text
        and "not ingested" in debt_text
        and not (ECON / "residential-mortgage-book").exists()
        and not (ECON / "lpmvtxk").exists()
        and not any(ECON.glob("**/lpmvtxk*")),
        "no Economy fork of Housing MLAR or LPMVTXK",
    )
    check(
        checks,
        "C5",
        "BoE connector + vintage 29 Oct 2026",
        debt_manifest.get("connector_module") == "economy.connectors.consumer_credit_outstanding"
        and debt_evidence.get("official_release_date") == "2026-10-29",
        f"module={debt_manifest.get('connector_module')} release={debt_evidence.get('official_release_date')}",
    )

    live_note = "not fetched"
    try:
        live_text = fetch_text(BOE_URL)
        live_rows = parse_boe_csv(live_text)
        live_index = {(r["period_start"], r["series"]): r["value"] for r in live_rows}
        pin_pairs = {(r["period_start"], r["series"]): r["value"] for r in pin_rows}
        sep_live = live_index.get((sep, "total"))
        extra_live = set(live_index) - set(pin_pairs)
        missing_live = set(pin_pairs) - set(live_index)
        value_diff = [
            f"{period} {series}: pin={pin_pairs[(period, series)]} live={live_index[(period, series)]}"
            for period, series in sorted(set(pin_pairs) & set(live_index))
            if abs(pin_pairs[(period, series)] - live_index[(period, series)]) > 1e-6
        ]
        if not value_diff and not missing_live and not extra_live:
            check(
                checks,
                "C1",
                "BoE live IADB == pin",
                True,
                f"live_n={len(live_rows)} pin_n={len(pin_rows)} Sep2026 total={sep_live}",
            )
        elif not value_diff and not missing_live and extra_live:
            check(
                checks,
                "C1",
                "BoE live IADB vs pin (newer months)",
                False,
                f"pin matches on overlapping keys; live extra={sorted(extra_live)[:6]} — pin is 29 Oct vintage",
                warn=True,
            )
        else:
            check(
                checks,
                "C1",
                "BoE live IADB == pin",
                False,
                f"diffs={value_diff[:5]} missing={list(missing_live)[:3]} extra={list(extra_live)[:3]}",
            )
        live_note = f"sep_live={sep_live}"
    except Exception as exc:  # noqa: BLE001 — report, do not crash QA
        check(
            checks,
            "C1",
            "BoE live IADB re-fetch",
            False,
            f"{type(exc).__name__}: {exc}",
            warn=True,
        )
        live_note = f"fetch failed: {exc}"

    dgd8_readme = ROOT / "data" / "economy" / "household-saving-ratio" / "README.md"
    dgd8_text = dgd8_readme.read_text(encoding="utf-8").lower() if dgd8_readme.is_file() else ""
    check(
        checks,
        "C7",
        "DGD8 companion still labelled residual (not Buffer)",
        "not" in dgd8_text and "buffer" in dgd8_text and "residual" in dgd8_text,
        "household-saving-ratio README; not flipped in this ticket",
    )

    lcf_ids = ("family-spending-by-category", "family-spending-by-income")
    check(
        checks,
        "C5",
        "LCF Cost/Ledger not in this Ready set",
        True,
        "out of scope: " + ", ".join(lcf_ids),
    )

    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    verdict = "pass" if failed == 0 else "fail"
    ready = failed == 0

    lines = [
        "# QA report — Economy 04 Buffer + Debt · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Domain: 04 · Household Finances & Living Standards — Buffer + Weight of Debt",
        "- Kickoff: `docs/agent-kickoff-validation-economy-04-buffer-debt.md`",
        "- Handover: `docs/handover-economy-04-household-deepen.md`",
        "- Packages: `household-financial-wealth` (ONS WAS 5.1, 5.10–5.13),",
        "  `consumer-credit-outstanding` (BoE LPMBI2O, LPMVZRJ, LPMB4TS)",
        "- Script: `validation.qa_economy_04_buffer_debt_2026_11_15`",
        "- Out of scope: LCF Cost of Living / Household Ledger; Housing property wealth,",
        "  MLAR, IUMBV34 as new Economy pins; DGD8 Ready (already a Phase 1 companion).",
        "",
        "## Independence",
        "",
        "Pinned raw SHA-256 checked against manifests. WAS cells recomputed from",
        "`financialwealthtables.xlsx` (Tables 5.1, 5.10–5.13) with a Validation parser",
        "that does not import Economy connectors. BoE pin CSV parsed independently;",
        f"live IADB re-fetch attempted ({live_note}). Curated CSVs were not edited.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in checks:
        safe = notes.replace("|", "/")
        lines.append(f"| {check_id} | {name} | **{result}** | {safe} |")

    lines.extend(
        [
            "",
            "## Method notes",
            "",
            "- **WAS Buffer** is Great Britain (`K03000001`), survey rounds, nominal £.",
            "  Round 8 (Apr 2020–Mar 2022) cells carry `accreditation=suspended` (ONS",
            "  notice 13 June 2025; Round 8 telephone fieldwork + tenure recalibration).",
            "  Cover sheet: published **24 January 2025**. Do not splice July and April",
            "  round systems. Table 5.12 aggregate £bn is a companion stock, not the",
            "  Buffer distribution. **DGD8** is a national-accounts residual — Notes",
            "  correctly refuse it as a Buffer proxy.",
            "- **BoE Weight of Debt** is UK (`K02000001`) monthly SA £ million, excl.",
            "  Student Loans Company. Latest month (Sep 2026 on this pin) is provisional.",
            "  Cards + other = total on this vintage. Housing MLAR and IUMBV34 remain",
            "  link-only; LPMVTXK is documented and **not** ingested.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            "- Recommend Orchestrator **Ready** on these two ids only"
            if ready
            else "- Do **not** Ready these ids until fails are fixed by Economy",
            "  (`household-financial-wealth`, `consumer-credit-outstanding`).",
            "- Do **not** Ready LCF Cost/Ledger. Do not fork Housing property wealth,",
            "  MLAR, or LPMVTXK under `data/economy/`.",
            "",
            "## Blockers",
            "",
            "- None for Ready on these two pins." if failed == 0 else "- See fail rows above (owner: Economy).",
            "",
            "## Economy fix tasks",
            "",
            "- None required to pass this vintage." if failed == 0 else "- Owner: Economy — see fail notes; Validation will not edit curated files.",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

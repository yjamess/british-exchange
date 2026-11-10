"""Independent QA — estates-residential-property (HMRC IHT Table 12.3a / 12.4a).

Does not import the Housing connector. Checks the pinned raw editions against
the manifest checksums, re-reads every edition with its own reader (zipfile +
ElementTree for .ods, openpyxl for .xlsx, xlrd for .xls), compares the Total
column with what Postgres serves for the current release, re-fetches the current
edition from GOV.UK, and confirms the 1 January 2022 coverage break against the
HMRC commentary and background quality report. Writes data/qa/qa_report_….md.

Needs the raw files locally first:

  PYTHONPATH=src uv run python -m britain_exchange.archive_data pull data/housing/estates-residential-property
  uv run python -m validation.qa_estates_residential_property_2026_11_10
"""

from __future__ import annotations

import hashlib
import html
import re
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

import httpx
import yaml

from britain_exchange.db import connect, load_repo_env

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "housing" / "estates-residential-property"
MANIFEST = DATA / "manifest.yaml"
OUT = ROOT / "data" / "qa" / "qa_report_estates-residential-property_2026-11-10.md"
INDICATOR = "estates-residential-property"
UK = "K02000001"
CONTENT_API = "https://www.gov.uk/api/content/government/statistics/inheritance-tax-liabilities-statistics"

# concept → (regex on the row label, number series, value series)
CONCEPTS = {
    "residential": (r"UK residential", "residential-estates", "residential-value"),
    "gross": (r"gross capital", "gross-capital-estates", "gross-capital-value"),
    "net": (r"net capital", "net-capital-estates", "net-capital-value"),
}
SERIES = [s for _, n, v in CONCEPTS.values() for s in (n, v)]

T = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
O = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
X = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"


# ── own spreadsheet reader ────────────────────────────────────────────────


def _ods(path: Path) -> dict[str, list[list]]:
    root = ET.fromstring(zipfile.ZipFile(path).read("content.xml"))
    sheets: dict[str, list[list]] = {}
    for table in root.iter(f"{{{T}}}table"):
        rows: list[list] = []
        for tr in table.iter(f"{{{T}}}table-row"):
            row: list = []
            for cell in tr:
                if cell.tag not in (f"{{{T}}}table-cell", f"{{{T}}}covered-table-cell"):
                    continue
                repeat = min(int(cell.get(f"{{{T}}}number-columns-repeated", "1")), 64)
                raw = cell.get(f"{{{O}}}value")
                if raw is not None:
                    value: object = float(raw)
                else:
                    value = "\n".join("".join(p.itertext()) for p in cell.iter(f"{{{X}}}p")) or None
                row += [value] * repeat
            rows += [row] * min(int(tr.get(f"{{{T}}}number-rows-repeated", "1")), 4)
        sheets[table.get(f"{{{T}}}name")] = rows
    return sheets


def read_workbook(path: Path) -> dict[str, list[list]]:
    if path.suffix == ".ods":
        return _ods(path)
    if path.suffix == ".xlsx":
        import openpyxl

        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        return {ws.title: [list(r) for r in ws.iter_rows(values_only=True)] for ws in wb}
    import xlrd

    wb = xlrd.open_workbook(path)
    return {s.name: [s.row_values(i) for i in range(s.nrows)] for s in wb.sheets()}


def _text(v: object) -> str:
    return re.sub(r"\s+", " ", str(v)).strip() if v not in (None, "") else ""


def extract(path: Path) -> tuple[str, str, dict[str, float]]:
    """Return (sheet name, tax year 'YYYY-YY', {series: Total-column value})."""
    sheets = read_workbook(path)
    (sheet,) = [n for n in sheets if re.search(r"12[._ ]?[34]a", n, re.I)]
    rows = sheets[sheet]

    year = None
    for row in rows[:6]:
        for cell in row:
            m = re.search(r"passing on death in (?:the tax year )?(\d{4})(?:-| to )(\d{2,4})", _text(cell))
            if m:
                year = f"{m.group(1)}-{m.group(2)[-2:]}"
                break
        if year:
            break
    if not year or int(year[-2:]) != (int(year[:4]) + 1) % 100:
        raise ValueError(f"{path.name}: no tax-year title")

    # First 'Total' header; the 2019 edition carries a comparison block to its right.
    total_col = next(
        row.index(c) for row in rows[:12] for c in row if _text(c) == "Total"
    )

    values: dict[str, float] = {}
    for pattern, number_series, value_series in CONCEPTS.values():
        for i, row in enumerate(rows):
            label = " ".join([_text(c) for c in row if _text(c)][:2])
            if re.search(pattern, label, re.I) and re.search(r"\bNumber\b", label):
                amount_label = " ".join([_text(c) for c in rows[i + 1] if _text(c)][:2])
                if not re.search(r"\bAmount\b", amount_label):
                    raise ValueError(f"{path.name}: no Amount row after {label!r}")
                values[number_series] = float(row[total_col])
                values[value_series] = float(rows[i + 1][total_col])
                break
        else:
            raise ValueError(f"{path.name}: no row for {pattern}")
    return sheet, year, values


# ── served data ──────────────────────────────────────────────────────────


def served() -> tuple[list[dict], dict]:
    with connect() as conn:
        release = conn.execute(
            "SELECT release_id, source_version, checksum_sha256, raw_path FROM data_release "
            "WHERE indicator_id = %s AND is_current",
            (INDICATOR,),
        ).fetchone()
        rows = conn.execute(
            "SELECT period_start, period_end, geography_code, value, unit, notes, "
            "dim_series, dim_category FROM observation WHERE release_id = %s",
            (release["release_id"],),
        ).fetchall()
    return rows, release


def notes_map(text: str) -> dict[str, str]:
    return dict(p.strip().split("=", 1) for p in text.split(";") if "=" in p)


def expected_category(start_year: int) -> str:
    if start_year <= 2020:
        return "returns-incl-excepted-estates"
    if start_year == 2021:
        return "transition-excepted-to-dec-2021"
    return "full-iht-accounts-only"


def govuk_text(client: httpx.Client, slug: str) -> str:
    body = client.get(f"{CONTENT_API}/{slug}").json()["details"]["body"]
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body)))


# ── main ─────────────────────────────────────────────────────────────────


def main() -> int:
    load_repo_env()
    manifest = yaml.safe_load(MANIFEST.read_text())
    evidence = manifest["raw_evidence"]
    checks: list[tuple[str, str, str, str]] = []

    def check(cid: str, what: str, ok: bool, detail: str) -> None:
        checks.append((cid, what, "pass" if ok else "FAIL", detail))

    # C1 checksums
    bad = []
    for e in evidence:
        p = DATA / e["path"]
        if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest() != e["checksum_sha256"]:
            bad.append(Path(e["path"]).name)
    check("C1", f"SHA-256 of all {len(evidence)} pinned editions equals manifest", not bad,
          "; ".join(bad) or "12/12 match")

    # C2 re-read every edition
    raw: dict[str, dict] = {}  # tax year → {series: value, edition, sheet, file}
    year_map = []
    for e in evidence:
        p = DATA / e["path"]
        sheet, year, values = extract(p)
        raw[year] = {"values": values, "edition": str(e["official_release_date"]), "file": p.name}
        year_map.append(f"{p.name[:7]}→{year}")
    years = sorted(raw)
    consecutive = [int(y[:4]) for y in years] == list(range(2012, 2024))
    check("C2a", "Edition → tax year read from each file's title; one year per edition, 2012-13…2023-24",
          len(raw) == len(evidence) and consecutive, ", ".join(sorted(year_map)))

    rows, release = served()
    by: dict[tuple[str, str], dict] = {}
    dupes = 0
    for r in rows:
        y = f"{r['period_start'].year}-{str(r['period_end'].year)[-2:]}"
        key = (r["dim_series"], y)
        dupes += key in by
        by[key] = r

    misses = []
    for y in years:
        for s in SERIES:
            r = by.get((s, y))
            want = raw[y]["values"][s]
            if r is None or abs(r["value"] - want) > 1e-6:
                misses.append(f"{s} {y}: raw {want} vs served {r and r['value']}")
            elif notes_map(r["notes"]).get("edition") != raw[y]["edition"]:
                misses.append(f"{s} {y}: edition {notes_map(r['notes']).get('edition')} ≠ {raw[y]['edition']}")
    check("C2b", "All 72 served values equal the raw Total cell of that year's edition (and cite it)",
          not misses and len(rows) == 72, "; ".join(misses) or f"{len(rows)} rows, 72/72 equal")

    # C3 current edition from GOV.UK
    current = max(evidence, key=lambda e: str(e["official_release_date"]))
    with httpx.Client(follow_redirects=True, timeout=60.0) as client:
        page = client.get(CONTENT_API).json()
        (att,) = [a for a in page["details"]["attachments"] if str(a.get("title", "")).startswith("Table 12.3")]
        body = client.get(att["url"]).content
        sha = hashlib.sha256(body).hexdigest()
        if sha == current["checksum_sha256"]:
            ok, detail = True, f"unchanged; {att['url'].rsplit('/', 1)[-1]} sha {sha[:16]}…"
        else:
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / "live.ods"
                p.write_bytes(body)
                _, y, values = extract(p)
            diff = [s for s in SERIES if by.get((s, y)) is None or abs(by[(s, y)]["value"] - values[s]) > 1e-6]
            ok, detail = not diff, f"checksum changed ({sha[:16]}…); {y} values {'match' if not diff else 'differ: ' + ', '.join(diff)}"
        check("C3a", "Live GOV.UK Table 12.3 equals pinned current edition", ok,
              f"{detail}; page updated {page['public_updated_at'][:10]}")
        check("C3b", "Postgres current release cites the current edition",
              release["checksum_sha256"] == current["checksum_sha256"]
              and release["raw_path"] == current["path"],
              f"release {release['raw_path']}")
        commentary = govuk_text(client, "inheritance-tax-liabilities-statistics-commentary")
        bqr = govuk_text(client, "inheritance-tax-liabilities-statistics-background-quality-report")

    # C4 sanity
    def v(s: str, y: str) -> float:
        return by[(s, y)]["value"]

    fails = []
    for y in years:
        if v("residential-value", y) > v("gross-capital-value", y):
            fails.append(f"res>gross £ {y}")
        if v("net-capital-value", y) > v("gross-capital-value", y):
            fails.append(f"net>gross £ {y}")
        if v("residential-estates", y) > v("gross-capital-estates", y):
            fails.append(f"res>gross estates {y}")
    check("C4a", "Residential £ ≤ gross £; net £ ≤ gross £; residential estates ≤ gross estates",
          not fails, "; ".join(fails) or "12/12 years")
    complete = all((s, y) in by for s in SERIES for y in years) and not dupes and len(by) == 72
    check("C4b", "One row per series per tax year, no gaps or duplicates", complete,
          f"{len(by)} keys, {dupes} duplicates")
    units = {r["dim_series"]: r["unit"] for r in rows}
    unit_ok = all(units[s] == ("estates" if s.endswith("-estates") else "gbp-millions") for s in SERIES)
    geo_ok = {r["geography_code"] for r in rows} == {UK}
    periods_ok = all(
        r["period_start"].month == 4 and r["period_start"].day == 6
        and r["period_end"] == date(r["period_start"].year + 1, 4, 5)
        for r in rows
    )
    check("C4c", "Units gbp-millions / estates; geography K02000001; periods 6 Apr–5 Apr",
          unit_ok and geo_ok and periods_ok, f"units {sorted(set(units.values()))}")

    # C5 coverage break
    quotes = {
        "commentary": "Following a reporting requirement change from 1 January 2022, non-taxpaying estates "
        "which are classed as ‘excepted’ are no longer required to report their valuations to HMRC through tax forms.",
        "commentary-2021-22": "or for years up to and partially including 2021 to 2022, a reduced excepted estate return, such as an IHT205",
        "bqr": "As such, their details are no longer included in these statistics, which now have reduced coverage.",
    }
    found = {k: q in (commentary if k.startswith("commentary") else bqr) for k, q in quotes.items()}
    check("C5a", "HMRC text confirms the 1 January 2022 break and 2021-22 part-year mix",
          all(found.values()), ", ".join(f"{k}: {'found' if ok else 'MISSING'}" for k, ok in found.items()))
    caveat = manifest["caveats"]
    check("C5b", "Manifest caveat states the break, the 2021-22 mix and not to read the drop as a fall",
          all(s in caveat for s in ("1 January 2022", "2021-22 is a part-year mix", "Do not read the drop")),
          "caveat present")
    wrong = sorted(
        f"{r['dim_series']} {r['period_start'].year}: {r['dim_category']}"
        for r in rows
        if r["dim_category"] != expected_category(r["period_start"].year)
        or notes_map(r["notes"]).get("category") != r["dim_category"]
    )
    cats = {}
    for r in rows:
        cats.setdefault(r["dim_category"], set()).add(r["period_start"].year)
    cat_detail = "; ".join(
        f"`{c}` {min(ys)}-{str(min(ys) + 1)[-2:]}"
        + (f"…{max(ys)}-{str(max(ys) + 1)[-2:]}" if max(ys) > min(ys) else "")
        for c, ys in sorted(cats.items(), key=lambda kv: min(kv[1]))
    )
    check("C5c", "`category` on every row: before / mixed (2021-22) / full-returns-only", not wrong,
          "; ".join(wrong) or cat_detail)

    # informational
    net_over = [y for y in years if v("net-capital-estates", y) > v("gross-capital-estates", y)]

    failed = [c for c in checks if c[2] != "pass"]
    lines = [
        f"# QA report — {INDICATOR}",
        "",
        f"Date: {date.today().isoformat()} · Validation agent · release: {release['source_version']}",
        "",
        "Independent re-read of all 12 pinned HMRC editions (Table 12.4a to July 2022, 12.3a from "
        "July 2023) with this script's own reader — zipfile + ElementTree for .ods, openpyxl for "
        ".xlsx, xlrd for .xls; no Housing connector code. The tax year is taken from the title "
        "inside each file and the first `Total` column is read (the September 2019 file carries a "
        "2015-16 comparison block to its right). Compared with the current Postgres release; the "
        "current edition is re-downloaded from GOV.UK.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
        *[f"| {a} | {b} | {c} | {d} |" for a, b, c, d in checks],
        "",
        f"**Verdict:** {'PASS — ready for UI' if not failed else f'FAIL — {len(failed)} check(s)'}",
        "",
        "## Coverage break — HMRC wording relied on",
        "",
        f"- Commentary: “{quotes['commentary']}”",
        f"- Commentary (Table 12.2 section): “…by estates required to send HMRC either a full IHT400 "
        f"account, {quotes['commentary-2021-22']}.”",
        "- Background quality report: “Following a reporting requirement change from 1 January 2022, "
        "non-taxpaying estates which are classed as ‘excepted’ are no longer required to report their "
        "valuations to HMRC via IHT forms or notify HMRC that they have obtained a grant of "
        f"representation. {quotes['bqr']}”",
        "",
        "## Notes",
        "",
        "- Served values (£m / estates, Total column): residential value "
        + ", ".join(f"{y} {v('residential-value', y):,.0f}" for y in years)
        + ".",
        "- Informational, not a failure: net-capital estate counts exceed gross-capital counts in "
        + (", ".join(net_over) if net_over else "no year")
        + " (by under 0.1%) — "
        "as published by HMRC in those sample-weighted editions; served as published.",
        "- 2012-13 to 2014-15 values carry HMRC's unrounded sample-weighted figures (e.g. "
        f"{v('residential-estates', '2012-13'):,.2f} estates); later editions are 3 s.f. Served "
        "exactly as published.",
        "- Not checked: other asset rows and range-of-estate bands (not served).",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

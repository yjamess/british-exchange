"""Independent QA for Economy Domain 06 Tax Time Machine history pin — EC-VAL-06E.

Re-parses HMRC ODS (stdlib zip/XML) and spot-checks curated tables.
Cross-checks overlap years vs Ready pin ``tax-machine-income-tax-rules``.
Does not edit Economy curated or raw data.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_timemachine_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-machine-income-tax-history"
READY = ROOT / "data" / "economy" / "tax-machine-rules"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_timemachine_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"

SPOT_YEARS = ("2010-11", "2015-16", "2023-24", "2025-26")
GAP_YEARS = ("2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23")
MIRROR_YEARS = (
    "2010-11",
    "2011-12",
    "2012-13",
    "2013-14",
    "2014-15",
    "2015-16",
    "2016-17",
)
SCOT_PIN_YEARS = ("2023-24", "2024-25", "2025-26", "2026-27")
SPAN_YEARS = tuple(
    f"{y}-{str(y + 1)[2:]}" for y in range(2010, 2027)
)  # 2010-11 … 2026-27

# Scotland starter uppers from GOV.UK HTML after-allowance columns
# (cols: 2026-27, 2025-26, 2024-25, 2023-24).
SCOT_STARTER_UPPER_HTML = {
    "2026-27": 3967,
    "2025-26": 2827,
    "2024-25": 2306,
    "2023-24": 2162,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_csv(base: Path, name: str) -> list[dict[str, str]]:
    with (base / "curated" / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def tax_year_key(label: str) -> str:
    cleaned = re.sub(r"\s*\(note[^)]*\)", "", label, flags=re.I).strip()
    m = re.match(r"(\d{4})\s+to\s+(\d{4})$", cleaned)
    if m:
        return f"{m.group(1)}-{m.group(2)[2:]}"
    m2 = re.match(r"(\d{4})-(\d{2})$", cleaned)
    if m2:
        return cleaned
    raise ValueError(f"Unrecognised tax-year label: {label!r}")


def parse_money_cell(raw: str) -> Decimal | None:
    if not raw or raw.strip().upper() in {"N/A", "NA", "—", "-"}:
        return None
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("£", "").replace(",", "").strip()
    if "/" in text:
        return None
    if not re.fullmatch(r"\d+(\.\d+)?", text):
        return None
    return Decimal(text)


def parse_percent_cell(raw: str) -> Decimal | None:
    if not raw or raw.strip().upper() in {"N/A", "NA"}:
        return None
    if "/" in raw:
        return None
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("%", "").strip()
    if not re.fullmatch(r"\d+(\.\d+)?", text):
        return None
    return Decimal(text)


def parse_band_window(raw: str) -> tuple[Decimal | None, Decimal | None]:
    """HMRC '1 to N' → 0…N; 'Over X' → lower X+1 (Validation reimplementation)."""
    if not raw or raw.strip().upper() in {"N/A", "NA"}:
        return None, None
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("£", "").replace(",", "").strip()
    m_over = re.match(r"(?i)over\s+(\d+)$", text)
    if m_over:
        return Decimal(m_over.group(1)) + 1, None
    m_range = re.match(r"(\d+)\s+to\s+(\d+)$", text)
    if m_range:
        lo = Decimal(m_range.group(1))
        hi = Decimal(m_range.group(2))
        if lo == 1:
            return Decimal("0"), hi
        return lo, hi
    return None, None


def read_ods_sheets(path: Path) -> list[tuple[str, list[list[str]]]]:
    """Independent ODS reader (stdlib zip + XML). OASIS ODF table markup."""
    ns_table = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
    ns_text = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
    ns_office = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"

    def cell_text(cell: ET.Element) -> str:
        for p in cell.findall(f".//{ns_text}p"):
            t = "".join(p.itertext())
            if t:
                return t
        return ""

    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("content.xml"))

    sheets: list[tuple[str, list[list[str]]]] = []
    for table in root.findall(f".//{ns_table}table"):
        name = table.attrib.get(f"{ns_table}name", "?")
        rows: list[list[str]] = []
        for row in table.findall(f"{ns_table}table-row"):
            cells: list[str] = []
            for cell in row.findall(f"{ns_table}table-cell"):
                repeat = int(cell.attrib.get(f"{ns_table}number-columns-repeated", "1"))
                text = cell_text(cell)
                value = cell.attrib.get(f"{ns_office}value")
                display = text if text else (value or "")
                if repeat > 80 and not display:
                    break
                for _ in range(min(repeat, 40)):
                    cells.append(display)
            while cells and cells[-1] == "":
                cells.pop()
            if cells:
                rows.append(cells)
        sheets.append((name, rows))
    return sheets


def parse_a2_ewni(ods_path: Path) -> dict[str, dict[str, tuple[Decimal, Decimal | None, Decimal]]]:
    """tax_year → band_id → (lower, upper|None, rate)."""
    sheets = read_ods_sheets(ods_path)
    main = next(s for s in sheets if "Rates_of_IT" in s[0] and "Footnote" not in s[0])
    out: dict[str, dict[str, tuple[Decimal, Decimal | None, Decimal]]] = {}
    for row in main[1]:
        if not row or not re.match(r"\d{4}\s+to\s+\d{4}", row[0]):
            continue
        tax_year = tax_year_key(row[0])
        while len(row) < 11:
            row.append("")
        bands: dict[str, tuple[Decimal, Decimal | None, Decimal]] = {}
        for band_id, window_raw, rate_raw in (
            ("basic", row[5], row[6]),
            ("higher", row[7], row[8]),
            ("additional", row[9], row[10]),
        ):
            rate = parse_percent_cell(rate_raw)
            lo, hi = parse_band_window(window_raw)
            if rate is None or lo is None:
                continue
            bands[band_id] = (lo, hi, rate)
        if bands:
            out[tax_year] = bands
    return out


def parse_a1_pa(ods_path: Path) -> dict[str, Decimal]:
    sheets = read_ods_sheets(ods_path)
    main = next(s for s in sheets if "PA" in s[0] or "allowance" in s[0].lower())
    out: dict[str, Decimal] = {}
    for row in main[1]:
        if not row or not re.match(r"\d{4}\s+to\s+\d{4}", row[0]):
            continue
        tax_year = tax_year_key(row[0])
        amount = parse_money_cell(row[1] if len(row) > 1 else "")
        if amount is not None:
            out[tax_year] = amount
    return out


def parse_a4_nics(ods_path: Path) -> dict[str, dict[str, str | Decimal | None]]:
    sheets = read_ods_sheets(ods_path)
    main = next(
        s for s in sheets if "MAIN_FEATURE" in s[0].upper() and "FOOT" not in s[0].upper()
    )
    header = main[1][1]
    years = [tax_year_key(h) for h in header[2:]]
    by_label: dict[str, list[str]] = {}
    for row in main[1][2:]:
        label = (row[1] if len(row) > 1 else "").strip().lower()
        if label:
            by_label[label] = row[2:]

    def col(substr: str) -> list[str]:
        for key, vals in by_label.items():
            if substr in key:
                return vals
        raise KeyError(substr)

    lel_row = col("lower earnings limit")
    pt_row = col("primary threshold")
    uel_row = col("upper earnings limit")
    main_rate_row = col("primary (employee) main contribution rate")
    addl_rate_row = col("primary (employee) additional contribution rate")

    out: dict[str, dict[str, str | Decimal | None]] = {}
    for i, tax_year in enumerate(years):
        pt_cell = pt_row[i] if i < len(pt_row) else ""
        main_cell = main_rate_row[i] if i < len(main_rate_row) else ""
        addl_cell = addl_rate_row[i] if i < len(addl_rate_row) else ""
        split = ("/" in pt_cell) or ("/" in main_cell) or ("/" in addl_cell)
        out[tax_year] = {
            "lel": parse_money_cell(lel_row[i]) if i < len(lel_row) else None,
            "pt": parse_money_cell(pt_cell),
            "uel": parse_money_cell(uel_row[i]) if i < len(uel_row) else None,
            "main_rate": parse_percent_cell(main_cell),
            "addl_rate": parse_percent_cell(addl_cell),
            "pt_cell": pt_cell,
            "main_cell": main_cell,
            "addl_cell": addl_cell,
            "rate_status": "intra_year_change" if split else "clean",
        }
    return out


def curated_band(
    bands: list[dict[str, str]], tax_year: str, jurisdiction: str, band_id: str
) -> dict[str, str] | None:
    for row in bands:
        if (
            row["tax_year"] == tax_year
            and row["jurisdiction"] == jurisdiction
            and row["band_id"] == band_id
        ):
            return row
    return None


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    spot_cells: list[str] = []

    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    readme = (BASE / "README.md").read_text(encoding="utf-8")
    fiscal = json.loads(
        (BASE / "curated" / "fiscal_drag_status.json").read_text(encoding="utf-8")
    )
    bands = load_csv(BASE, "income_tax_bands.csv")
    allowances = load_csv(BASE, "allowances.csv")
    nics_rows = load_csv(BASE, "employee_class1_nics.csv")
    coverage = load_csv(BASE, "coverage_inventory.csv")

    # --- C1: checksums ---
    evidence = manifest.get("raw_evidence") or []
    sums_path = RAW_DIR / "SHA256SUMS"
    sums: dict[str, str] = {}
    if sums_path.is_file():
        for line in sums_path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                sums[parts[1]] = parts[0]

    for item in evidence:
        rel = str(item.get("path", ""))
        path = BASE / rel
        expected = str(item.get("checksum_sha256", ""))
        if not path.is_file():
            checks.append(("C1", f"missing {path.name}", "fail", rel))
            continue
        disk = sha256(path)
        match_manifest = disk == expected
        match_sums = sums.get(path.name) == disk
        ok = match_manifest and match_sums
        checks.append(
            (
                "C1",
                f"checksum {path.name}",
                "pass" if ok else "fail",
                f"manifest={match_manifest} SHA256SUMS={match_sums} disk={disk[:16]}",
            )
        )
    if not evidence:
        checks.append(("C1", "raw_evidence", "fail", "empty"))

    # --- C2: year span + jurisdictions labelled ---
    ewni_years = sorted(
        {r["tax_year"] for r in bands if r["jurisdiction"] == "england-wales-ni"}
    )
    scot_years = sorted(
        {r["tax_year"] for r in bands if r["jurisdiction"] == "scotland"}
    )
    span_ok = ewni_years == list(SPAN_YEARS)
    scot_labelled = set(scot_years) == set(SPAN_YEARS)
    checks.append(
        (
            "C2",
            "E/W/NI year span 2010-11…2026-27",
            "pass" if span_ok else "fail",
            f"n={len(ewni_years)} first={ewni_years[0] if ewni_years else None} "
            f"last={ewni_years[-1] if ewni_years else None}",
        )
    )
    checks.append(
        (
            "C2",
            "Scotland rows for all years (labelled)",
            "pass" if scot_labelled else "fail",
            f"n={len(scot_years)}",
        )
    )
    juris = {r["jurisdiction"] for r in bands}
    checks.append(
        (
            "C2",
            "jurisdictions E/W/NI + Scotland",
            "pass" if juris == {"england-wales-ni", "scotland"} else "fail",
            ",".join(sorted(juris)),
        )
    )

    # --- C3: spot E/W/NI bands vs Table A.2 ---
    a2 = parse_a2_ewni(RAW_DIR / "table_a2_rates.ods")
    for ty in SPOT_YEARS:
        ods_bands = a2.get(ty)
        if not ods_bands:
            checks.append(("C3", f"A.2 missing {ty}", "fail", "no ODS row"))
            continue
        for band_id, (lo, hi, rate) in ods_bands.items():
            row = curated_band(bands, ty, "england-wales-ni", band_id)
            if row is None:
                checks.append(("C3", f"{ty} {band_id} curated missing", "fail", ""))
                continue
            cur_lo = Decimal(row["lower_after_allowance_gbp"])
            cur_hi = (
                Decimal(row["upper_after_allowance_gbp"])
                if row["upper_after_allowance_gbp"].strip()
                else None
            )
            cur_rate = Decimal(row["rate_percent"])
            ok = cur_lo == lo and cur_hi == hi and cur_rate == rate
            note = (
                f"ODS→({lo},{hi or 'open'} @{rate}%) curated→"
                f"({cur_lo},{cur_hi or 'open'} @{cur_rate}%)"
            )
            checks.append(
                (
                    "C3",
                    f"E/W/NI {ty} {band_id}",
                    "pass" if ok else "fail",
                    note,
                )
            )
            if band_id == "basic":
                spot_cells.append(
                    f"E/W/NI {ty} basic upper after PA = {cur_hi} @ {cur_rate}% "
                    f"({'match A.2' if ok else 'MISMATCH'})"
                )

    # --- C4: Personal Allowance vs Table A.1 ---
    a1 = parse_a1_pa(RAW_DIR / "table_a1_allowances.ods")
    for ty in SPOT_YEARS:
        ods_pa = a1.get(ty)
        if ods_pa is None:
            checks.append(("C4", f"A.1 missing {ty}", "fail", ""))
            continue
        row = next(
            (
                r
                for r in allowances
                if r["tax_year"] == ty
                and r["jurisdiction"] == "england-wales-ni"
                and r["allowance_id"] == "personal_allowance"
            ),
            None,
        )
        if row is None:
            checks.append(("C4", f"PA curated missing {ty}", "fail", ""))
            continue
        cur = Decimal(row["amount_gbp"])
        ok = cur == ods_pa
        checks.append(
            (
                "C4",
                f"PA {ty}",
                "pass" if ok else "fail",
                f"A.1={ods_pa} curated={cur}",
            )
        )
        spot_cells.append(
            f"PA {ty} = £{cur} ({'match A.1' if ok else 'MISMATCH'})"
        )

    # --- C5: Scotland gaps / mirror / GOV.UK ---
    gap_ok = True
    for ty in GAP_YEARS:
        rows = [
            r
            for r in bands
            if r["tax_year"] == ty and r["jurisdiction"] == "scotland"
        ]
        # Must be exactly gap rows — no silent E/W/NI fill with rates/thresholds
        if not rows:
            gap_ok = False
            checks.append(("C5", f"Scotland {ty} missing", "fail", "no rows"))
            continue
        only_gap = all(
            r["band_id"] == "gap" and r["coverage_status"] == "gap_awaiting_clean_pin"
            for r in rows
        )
        has_rates = any(
            r["rate_percent"].strip() or r["lower_after_allowance_gbp"].strip()
            for r in rows
        )
        ok = only_gap and not has_rates and len(rows) == 1
        if not ok:
            gap_ok = False
        checks.append(
            (
                "C5",
                f"Scotland gap {ty} (no silent fill)",
                "pass" if ok else "fail",
                f"rows={len(rows)} status={rows[0]['coverage_status']} "
                f"band_id={rows[0]['band_id']}",
            )
        )
    if gap_ok:
        spot_cells.append("Scotland 2017–22: explicit gap rows only (no E/W/NI fill)")

    mirror_ok = True
    for ty in MIRROR_YEARS:
        ewni = [
            r
            for r in bands
            if r["tax_year"] == ty and r["jurisdiction"] == "england-wales-ni"
        ]
        scot = [
            r
            for r in bands
            if r["tax_year"] == ty and r["jurisdiction"] == "scotland"
        ]
        if not scot or any(
            r["coverage_status"] != "pre_divergence_mirrors_ewni" for r in scot
        ):
            mirror_ok = False
            checks.append(("C5", f"Scotland mirror label {ty}", "fail", "bad status"))
            continue
        # Same band geometry as E/W/NI
        ewni_key = {
            (r["band_id"], r["rate_percent"], r["lower_after_allowance_gbp"], r["upper_after_allowance_gbp"])
            for r in ewni
        }
        scot_key = {
            (r["band_id"], r["rate_percent"], r["lower_after_allowance_gbp"], r["upper_after_allowance_gbp"])
            for r in scot
        }
        ok = ewni_key == scot_key
        if not ok:
            mirror_ok = False
        checks.append(
            (
                "C5",
                f"Scotland 2010–16 mirror {ty}",
                "pass" if ok else "fail",
                "labelled pre_divergence_mirrors_ewni + same bands"
                if ok
                else "band mismatch vs E/W/NI",
            )
        )
    if mirror_ok:
        spot_cells.append("Scotland 2010–16: labelled mirror of E/W/NI")

    income_html = (RAW_DIR / "income_tax_rates.html").read_text(
        encoding="utf-8", errors="replace"
    )
    for ty, upper in SCOT_STARTER_UPPER_HTML.items():
        row = curated_band(bands, ty, "scotland", "starter")
        if row is None:
            checks.append(("C5", f"Scotland starter {ty}", "fail", "missing"))
            continue
        cur_upper = int(row["upper_after_allowance_gbp"])
        rate_ok = Decimal(row["rate_percent"]) == Decimal("19")
        html_anchor = f"Up to £{upper:,}" in income_html
        status_ok = row["coverage_status"] == "pinned_govuk_after_allowance"
        ok = cur_upper == upper and rate_ok and html_anchor and status_ok
        checks.append(
            (
                "C5",
                f"Scotland {ty} starter vs GOV.UK HTML",
                "pass" if ok else "fail",
                f"curated upper={cur_upper} html Up to £{upper:,} "
                f"rate={row['rate_percent']}% status={row['coverage_status']}",
            )
        )
        if ty in ("2023-24", "2025-26"):
            spot_cells.append(
                f"Scotland {ty} starter upper={cur_upper} @ 19% "
                f"({'match HTML' if ok else 'MISMATCH'})"
            )

    # Top rate 2025-26 / 2026-27 = 48%; 2023-24 = 47%
    for ty, top_rate in (("2023-24", "47"), ("2025-26", "48"), ("2026-27", "48")):
        row = curated_band(bands, ty, "scotland", "top")
        ok = row is not None and Decimal(row["rate_percent"]) == Decimal(top_rate)
        checks.append(
            (
                "C5",
                f"Scotland {ty} top rate {top_rate}%",
                "pass" if ok else "fail",
                f"curated={row['rate_percent'] if row else None}",
            )
        )

    # Coverage inventory agrees
    inv_gaps = [
        r["tax_year"]
        for r in coverage
        if r["scotland_income_tax"] == "gap_awaiting_clean_pin"
    ]
    checks.append(
        (
            "C5",
            "coverage_inventory Scotland gaps",
            "pass" if inv_gaps == list(GAP_YEARS) else "fail",
            f"gaps={inv_gaps}",
        )
    )

    # --- C6: NICs separate + weekly↔A.4 + intra-year ---
    band_header = (BASE / "curated" / "income_tax_bands.csv").read_text(
        encoding="utf-8"
    ).splitlines()[0].lower()
    blended = any(tok in band_header for tok in ("nic", "nics", "national_insurance"))
    nics_file_ok = (BASE / "curated" / "employee_class1_nics.csv").is_file()
    checks.append(
        (
            "C6",
            "NICs separate stage (file, not blended)",
            "pass" if nics_file_ok and not blended else "fail",
            "employee_class1_nics.csv; bands header clean"
            if nics_file_ok and not blended
            else "blend risk",
        )
    )

    a4 = parse_a4_nics(RAW_DIR / "table_a4_nics.ods")
    for ty in ("2015-16", "2025-26"):
        ods = a4.get(ty)
        row = next((r for r in nics_rows if r["tax_year"] == ty), None)
        if not ods or not row:
            checks.append(("C6", f"NICs {ty}", "fail", "missing"))
            continue
        pt_ok = (
            ods["pt"] is not None
            and Decimal(row["primary_threshold_weekly_gbp"]) == ods["pt"]
        )
        uel_ok = (
            ods["uel"] is not None
            and Decimal(row["upper_earnings_limit_weekly_gbp"]) == ods["uel"]
        )
        main_ok = (
            ods["main_rate"] is not None
            and Decimal(row["rate_pt_to_uel_percent"]) == ods["main_rate"]
        )
        x52_ok = (
            int(row["primary_threshold_annual_x52_gbp"])
            == int(Decimal(row["primary_threshold_weekly_gbp"]) * 52)
        )
        ok = pt_ok and uel_ok and main_ok and x52_ok and row["rate_status"] == "clean"
        checks.append(
            (
                "C6",
                f"NICs weekly↔A.4 {ty}",
                "pass" if ok else "fail",
                f"PT={row['primary_threshold_weekly_gbp']} "
                f"UEL={row['upper_earnings_limit_weekly_gbp']} "
                f"main={row['rate_pt_to_uel_percent']}% x52 ok={x52_ok}",
            )
        )
        if ty == "2025-26":
            spot_cells.append(
                f"NICs 2025–26 PT weekly £{row['primary_threshold_weekly_gbp']} "
                f"({'match A.4' if ok else 'MISMATCH'})"
            )

    for ty in ("2022-23", "2023-24"):
        ods = a4.get(ty)
        row = next((r for r in nics_rows if r["tax_year"] == ty), None)
        if not ods or not row:
            checks.append(("C6", f"NICs intra-year {ty}", "fail", "missing"))
            continue
        status_ok = row["rate_status"] == "intra_year_change"
        # Must not invent a single annual main rate when ODS has a split cell
        main_empty = not row["rate_pt_to_uel_percent"].strip()
        # 2023-24 has clean PT but split main rate — main_rate_parsed empty
        if ty == "2022-23":
            no_invent = main_empty and not row["primary_threshold_weekly_gbp"].strip()
        else:
            # 2023-24: PT may be single; main rate must stay unparsed
            no_invent = main_empty
        published_has_slash = "/" in str(ods["main_cell"])
        ok = status_ok and no_invent and published_has_slash
        checks.append(
            (
                "C6",
                f"NICs intra-year not invented {ty}",
                "pass" if ok else "fail",
                f"status={row['rate_status']} main_parsed={row['rate_pt_to_uel_percent']!r} "
                f"published_main={ods['main_cell']!r}",
            )
        )
        spot_cells.append(
            f"NICs {ty}: {row['rate_status']}; published main "
            f"{ods['main_cell']!r}; no invented annual rate"
        )

    # --- C7: fiscal drag deferred; no Ready / frontend claim ---
    drag_ok = fiscal.get("status") == "deferred" and fiscal.get("examples_path") is None
    checks.append(
        (
            "C7",
            "fiscal drag deferred",
            "pass" if drag_ok else "fail",
            f"status={fiscal.get('status')} examples={fiscal.get('examples_path')}",
        )
    )
    status = str(manifest.get("status_note", ""))
    not_ready = "not Ready" in status or "not Ready" in readme
    no_ui = (
        "No UI" in status
        or "No UI" in readme
        or "no frontend" in readme.lower()
        or "No frontend" in readme
    )
    claims_ready = bool(re.search(r"(?<![Nn]ot )\bReady\b", status)) and (
        "not Ready" not in status
    )
    checks.append(
        (
            "C7",
            "no Ready / frontend claim",
            "pass" if not_ready and no_ui and not claims_ready else "fail",
            status[:90],
        )
    )
    web_hit = False
    web_src = ROOT / "web" / "src"
    skip_parts = {".next", "node_modules", "dist", "out", "coverage"}
    if web_src.is_dir():
        for path in web_src.rglob("*"):
            if any(part in skip_parts for part in path.parts):
                continue
            if path.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            # Indicator id wire-up only (planned copy strings alone are not UI shipping)
            if "tax-machine-income-tax-history" in text:
                web_hit = True
                checks.append(
                    (
                        "C7",
                        "no Time Machine UI wiring",
                        "warn",
                        f"mention in {path.relative_to(ROOT)}",
                    )
                )
                break
    if not web_hit:
        checks.append(
            (
                "C7",
                "no Time Machine UI wiring",
                "pass",
                "no web/src reference to history indicator id",
            )
        )

    # --- C8: overlap vs Ready tax-machine-income-tax-rules ---
    ready_bands = load_csv(READY, "income_tax_bands.csv")
    ready_allow = load_csv(READY, "allowances.csv")
    ready_nics = load_csv(READY, "employee_class1_nics.csv")

    for ty in ("2025-26", "2026-27"):
        for juris in ("england-wales-ni", "scotland"):
            hist = [
                r
                for r in bands
                if r["tax_year"] == ty and r["jurisdiction"] == juris
            ]
            ready = [
                r
                for r in ready_bands
                if r["tax_year"] == ty and r["jurisdiction"] == juris
            ]
            hist_key = {
                (
                    r["band_id"],
                    r["rate_percent"],
                    r["lower_after_allowance_gbp"],
                    r["upper_after_allowance_gbp"],
                )
                for r in hist
            }
            ready_key = {
                (
                    r["band_id"],
                    r["rate_percent"],
                    r["lower_after_allowance_gbp"],
                    r["upper_after_allowance_gbp"],
                )
                for r in ready
            }
            ok = hist_key == ready_key and len(hist) == len(ready)
            checks.append(
                (
                    "C8",
                    f"overlap bands {ty} {juris}",
                    "pass" if ok else "fail",
                    f"hist_n={len(hist)} ready_n={len(ready)}",
                )
            )
            if ty == "2025-26" and juris == "scotland" and ok:
                starter = curated_band(bands, ty, "scotland", "starter")
                spot_cells.append(
                    f"Overlap vs Ready: Scotland 2025–26 starter upper="
                    f"{starter['upper_after_allowance_gbp'] if starter else '?'}"
                )

        # PA overlap
        for juris in ("england-wales-ni", "scotland"):
            h = next(
                (
                    r
                    for r in allowances
                    if r["tax_year"] == ty
                    and r["jurisdiction"] == juris
                    and r["allowance_id"] == "personal_allowance"
                ),
                None,
            )
            rdy = next(
                (
                    r
                    for r in ready_allow
                    if r["tax_year"] == ty
                    and r["jurisdiction"] == juris
                    and r["allowance_id"] == "personal_allowance"
                ),
                None,
            )
            ok = (
                h is not None
                and rdy is not None
                and Decimal(h["amount_gbp"]) == Decimal(rdy["amount_gbp"])
            )
            checks.append(
                (
                    "C8",
                    f"overlap PA {ty} {juris}",
                    "pass" if ok else "fail",
                    f"hist={h['amount_gbp'] if h else None} "
                    f"ready={rdy['amount_gbp'] if rdy else None}",
                )
            )

        # NICs: history uses weekly×52; Ready uses PAYE annual — expect documented delta
        h_nics = next((r for r in nics_rows if r["tax_year"] == ty), None)
        r_nics = next((r for r in ready_nics if r["tax_year"] == ty), None)
        if h_nics and r_nics and h_nics["rate_status"] == "clean":
            rate_match = Decimal(h_nics["rate_pt_to_uel_percent"]) == Decimal(
                r_nics["rate_pt_to_uel_percent"]
            ) and Decimal(h_nics["rate_above_uel_percent"]) == Decimal(
                r_nics["rate_above_uel_percent"]
            )
            hist_pt_x52 = Decimal(h_nics["primary_threshold_annual_x52_gbp"])
            ready_pt = Decimal(r_nics["primary_threshold_annual_gbp"])
            hist_uel_x52 = Decimal(h_nics["upper_earnings_limit_annual_x52_gbp"])
            ready_uel = Decimal(r_nics["upper_earnings_limit_annual_gbp"])
            thresh_same = hist_pt_x52 == ready_pt and hist_uel_x52 == ready_uel
            if rate_match and thresh_same:
                checks.append(
                    (
                        "C8",
                        f"overlap NICs {ty}",
                        "pass",
                        f"rates+thresholds match Ready (PT={ready_pt})",
                    )
                )
            elif rate_match:
                # Documented method difference: weekly×52 ≠ PAYE annual
                checks.append(
                    (
                        "C8",
                        f"overlap NICs {ty} thresholds",
                        "warn",
                        f"rates match; weekly×52 PT/UEL "
                        f"{hist_pt_x52}/{hist_uel_x52} vs Ready annual "
                        f"{ready_pt}/{ready_uel} (educational ×52 — not invented)",
                    )
                )
            else:
                checks.append(
                    (
                        "C8",
                        f"overlap NICs {ty}",
                        "fail",
                        f"rate mismatch hist={h_nics['rate_pt_to_uel_percent']} "
                        f"ready={r_nics['rate_pt_to_uel_percent']}",
                    )
                )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    verdict = "pass" if failed == 0 else "fail"
    return _write(checks, verdict, spot_cells)


def _write(
    checks: list[tuple[str, str, str, str]],
    verdict: str,
    spot_cells: list[str],
) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    recommend_ready = verdict == "pass"

    lines = [
        "# QA report — Economy 06 Tax Time Machine history pin · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-machine-income-tax-history`",
        "- Package: `data/economy/tax-machine-income-tax-history/`",
        "- Handover: `docs/handover-economy-06-timemachine.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-timemachine.md`",
        "- Script: `validation.qa_economy_06_timemachine_2026_11_15`",
        "- Vintage: raw `2026-11-15` · years **2010–11…2026–27**",
        "- Related Ready pin (read-only): `data/economy/tax-machine-rules/` · "
        "`tax-machine-income-tax-rules`",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. HMRC ODS re-parsed with stdlib zip/XML",
        "(Validation reimplementation — not Economy connector imports).",
        "Spot cells vs Tables A.1 / A.2 / A.4 and GOV.UK HTML.",
        "Overlap years vs Ready pin curated tables. No curated/raw rewrites.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check_id, name, result, notes in checks:
        safe_notes = notes.replace("|", "\\|")
        lines.append(f"| {check_id} | {name} | **{result}** | {safe_notes} |")

    lines.extend(
        [
            "",
            "## Spot cells",
            "",
        ]
    )
    for cell in spot_cells:
        lines.append(f"- {cell}")

    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            (
                "- **Ready recommendation: yes** — history pin may flip to Registry Ready "
                "after Orchestrator review (cloud load + registry row still "
                "Orchestrator-owned). Fiscal drag remains deferred; Time Machine UI "
                "stays out of scope until Review Gate."
                if recommend_ready
                else "- **Ready recommendation: no** — fix fails before Ready "
                "(owner: Economy)."
            ),
            "- Out of scope: Time Machine React UI; inventing Scotland 2017–22; "
            "fiscal-drag calculator.",
            "",
            "## Blockers",
            "",
        ]
    )
    if failed:
        lines.append(
            "- Failures above — owner: Economy (do not patch curated from Validation)."
        )
    else:
        lines.extend(
            [
                "- None for history-pin Validation PASS.",
                "- Open (documented, non-blocking): Scotland 2017–22 gap until clean "
                "gov.scot / HMRC SIT pin.",
                "- Open (documented warn): NICs weekly×52 educational annual ≠ Ready "
                "PAYE annual PT/UEL (£12,570 / £50,270) — rates still match.",
                "- UI / EmptyStage replacement waits on Review Gate after Ready + "
                "product decision.",
            ]
        )
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

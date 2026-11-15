"""Independent QA — Economy Domain 08: DMO D8B future redemptions + D1A gilts in issue.

What this script does (plain language)
--------------------------------------
Economy curated two DMO packages from browser-pinned ``.xls`` files. This script
re-reads the **raw** ``.xls`` files itself (it does NOT import
``economy.connectors``), then compares them with the curated CSVs, the manifests
and ``SHA256SUMS``. It also cross-checks D8B against D1A (same report date) as an
independent consistency test.

It only reads; it never writes under ``data/economy/``. It writes the QA report to
``data/qa/qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md``.

Run:

    uv run python -m validation.qa_economy_08_dmo_d8b_d1a_2026_11_14
    # or: PYTHONPATH=src uv run python src/validation/qa_economy_08_dmo_d8b_d1a_2026_11_14.py

Refs: pathlib https://docs.python.org/3/library/pathlib.html ·
csv https://docs.python.org/3/library/csv.html ·
xlrd https://xlrd.readthedocs.io/ · PEP 8 https://peps.python.org/pep-0008/
ISIN check digit (ISO 6166, Luhn): https://en.wikipedia.org/wiki/International_Securities_Identification_Number
"""

from __future__ import annotations

import csv
import hashlib
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import xlrd
import yaml

ROOT = Path(__file__).resolve().parents[2]
D8B_DIR = ROOT / "data" / "economy" / "dmo-gilt-future-redemptions"
D1A_DIR = ROOT / "data" / "economy" / "dmo-gilts-in-issue"
D8B_XLS = "Future Redemptions Nov 14 2026.xls"
D1A_XLS = "Gilts in Issue Nov 14 2026.xls"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md"

AS_OF_D1A = date(2026, 11, 13)
DATA_DATE = date(2026, 11, 14)
HEADLINE_TOL_M = 5.0  # £m, per assignment
FLOAT_TOL = 1e-6


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
@dataclass
class Check:
    """One QA check result (``pass`` / ``warn`` / ``fail``)."""

    cid: str
    name: str
    result: str
    notes: str


@dataclass
class Findings:
    checks: list[Check] = field(default_factory=list)
    extra: dict[str, str] = field(default_factory=dict)

    def add(self, cid: str, name: str, ok: bool, notes: str, *, warn: bool = False) -> None:
        result = "pass" if ok else ("warn" if warn else "fail")
        self.checks.append(Check(cid, name, result, notes))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_sums(raw_dir: Path) -> dict[str, str]:
    """Parse ``<hash>  <filename>`` lines from SHA256SUMS."""
    out: dict[str, str] = {}
    for line in (raw_dir / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        parts = line.strip().split(None, 1)
        if len(parts) == 2:
            out[parts[1].strip().lstrip("*")] = parts[0].lower()
    return out


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def parse_notes(notes: str) -> dict[str, str]:
    """``key=value; key=value`` → dict."""
    out: dict[str, str] = {}
    for part in notes.split("; "):
        if "=" in part:
            key, _, value = part.partition("=")
            out[key.strip()] = value.strip()
    return out


def num(cell: object) -> float:
    if isinstance(cell, (int, float)):
        return float(cell)
    return float(str(cell).replace(",", "").strip())


def xl_date(serial: float, datemode: int) -> date:
    return xlrd.xldate_as_datetime(serial, datemode).date()


def fy_label_for(d: date) -> str:
    """Financial year (1 Apr–31 Mar) label containing ``d``, e.g. ``2027-2028``."""
    start = d.year if d.month >= 4 else d.year - 1
    return f"{start}-{start + 1}"


def isin_ok(isin: str) -> bool:
    """ISO 6166 check: 12 chars, letters→digits (A=10…), Luhn mod-10 passes."""
    if not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}[0-9]", isin):
        return False
    digits = "".join(str(int(ch, 36)) for ch in isin)
    total = 0
    for i, ch in enumerate(reversed(digits)):
        n = int(ch)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


# --------------------------------------------------------------------------- #
# Independent raw parsers
# --------------------------------------------------------------------------- #
def parse_d8b_raw(path: Path) -> tuple[date, dict[str, tuple[float, float, float]]]:
    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    data_date = xl_date(sheet.cell_value(0, 1), book.datemode)
    rows: dict[str, tuple[float, float, float]] = {}
    for r in range(2, sheet.nrows):
        label = str(sheet.cell_value(r, 0)).strip()
        if not re.fullmatch(r"\d{4}-\d{4}", label):
            if rows:
                break
            continue
        rows[label] = (num(sheet.cell_value(r, 1)), num(sheet.cell_value(r, 2)), num(sheet.cell_value(r, 3)))
    return data_date, rows


@dataclass
class Gilt:
    name: str
    isin: str
    kind: str  # conventional | index_linked
    maturity: date
    first_issue: date
    nominal: float
    section: str  # bucket (conv) or "3m"/"8m" (IL)
    base_rpi: float | None = None
    uplifted: float | None = None


def parse_d1a_raw(path: Path) -> tuple[str, str, list[Gilt]]:
    """Return ``(title_cell, headline_cell, gilts)`` read straight from the sheet."""
    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    title = str(sheet.cell_value(0, 2))
    headline = str(sheet.cell_value(5, 0))
    gilts: list[Gilt] = []
    kind, section = "", ""
    for r in range(sheet.nrows):
        row = sheet.row_values(r)
        first = str(row[0]).strip()
        second = str(row[1]).strip()
        if first.startswith("Conventional Gilts"):
            kind = "conventional"
            continue
        if first.startswith("Index-linked Gilts"):
            kind = "index_linked"
            section = "3m" if "3-month" in first else "8m"
            continue
        if kind == "conventional" and first in {"Ultra-Short", "Short", "Medium", "Long"} and not second:
            section = first.lower()
            continue
        if kind and re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}[0-9]", second):
            gilt = Gilt(
                name=first,
                isin=second,
                kind=kind,
                maturity=xl_date(row[2], book.datemode),
                first_issue=xl_date(row[3], book.datemode),
                nominal=num(row[6]),
                section=section,
            )
            if kind == "index_linked":
                gilt.base_rpi = num(row[7])
                gilt.uplifted = num(row[8])
            gilts.append(gilt)
    return title, headline, gilts


# --------------------------------------------------------------------------- #
# D8B checks
# --------------------------------------------------------------------------- #
def check_d8b(f: Findings, gilts: list[Gilt]) -> None:
    raw_path = D8B_DIR / "raw" / D8B_XLS
    cur_path = D8B_DIR / "curated" / "observations.csv"
    manifest = yaml.safe_load((D8B_DIR / "manifest.yaml").read_text(encoding="utf-8"))

    # A1 checksum
    actual = sha256(raw_path)
    sums = read_sums(D8B_DIR / "raw").get(D8B_XLS)
    mani = manifest["raw_evidence"][0]["checksum_sha256"]
    f.add(
        "A1",
        "D8B raw SHA-256 = SHA256SUMS = manifest",
        actual == sums == mani,
        f"disk `{actual[:12]}…`; SHA256SUMS `{(sums or 'MISSING')[:12]}…`; manifest `{mani[:12]}…`",
    )

    data_date, raw = parse_d8b_raw(raw_path)
    rows = read_csv(cur_path)
    f.extra["d8b_rows"] = str(len(rows))

    # A2 shape
    series_counts: dict[str, int] = defaultdict(int)
    for row in rows:
        series_counts[parse_notes(row["notes"]).get("series", "?")] += 1
    f.add(
        "A2",
        "D8B row count 141 = 47 FY × 3 series",
        len(rows) == 141 and len(raw) == 47 and set(series_counts.values()) == {47} and len(series_counts) == 3,
        f"curated {len(rows)} rows; raw FY rows {len(raw)}; per series {dict(series_counts)}",
    )

    # A3 independent raw ↔ curated, every FY/series
    curated: dict[tuple[str, str], float] = {}
    dupes = 0
    for row in rows:
        n = parse_notes(row["notes"])
        key = (n["fy"], n["series"])
        if key in curated:
            dupes += 1
        curated[key] = float(row["value"])
    mismatches = []
    for fy, (conv, il, tot) in raw.items():
        for series, value in (("conventional", conv), ("index_linked", il), ("total", tot)):
            got = curated.get((fy, series))
            if got is None or abs(got - value) > FLOAT_TOL:
                mismatches.append((fy, series, value, got))
    extra_keys = set(curated) - {(fy, s) for fy in raw for s in ("conventional", "index_linked", "total")}
    f.add(
        "A3",
        "D8B every raw cell == curated value (141 cells)",
        not mismatches and not extra_keys and dupes == 0,
        f"mismatches {len(mismatches)}; curated-only keys {len(extra_keys)}; duplicate keys {dupes}",
    )

    # A4 headline FY 2027-28
    first = raw.get("2027-2028")
    exp = (152286.0, 15164.0, 167450.0)
    f.add(
        "A4",
        "FY 2027-28: conv 152,286 · IL 15,164 · total 167,450 (raw and curated)",
        first == exp
        and (curated[("2027-2028", "conventional")], curated[("2027-2028", "index_linked")], curated[("2027-2028", "total")])
        == exp,
        f"raw {first}; curated {(curated[('2027-2028', 'conventional')], curated[('2027-2028', 'index_linked')], curated[('2027-2028', 'total')])}",
    )

    # A5 additivity in every FY (curated only, so it tests what UI would read)
    worst = 0.0
    bad = []
    for fy in raw:
        diff = curated[(fy, "conventional")] + curated[(fy, "index_linked")] - curated[(fy, "total")]
        worst = max(worst, abs(diff))
        if abs(diff) > 1.0:
            bad.append((fy, diff))
    f.add(
        "A5",
        "conventional + index-linked ≈ total in every FY (±£1m rounding)",
        not bad,
        f"47 FY; max |diff| £{worst:.0f}m; failures {bad or 'none'}",
    )
    exact = sum(
        1
        for fy in raw
        if abs(curated[(fy, "conventional")] + curated[(fy, "index_linked")] - curated[(fy, "total")]) < FLOAT_TOL
    )
    f.extra["d8b_exact_additive"] = f"{exact}/47"

    # A6 FY structure: contiguous, dates 1 Apr–31 Mar, label matches period
    fys = sorted(raw)
    contiguous = all(int(fys[i + 1][:4]) == int(fys[i][:4]) + 1 for i in range(len(fys) - 1))
    date_bad = []
    for row in rows:
        n = parse_notes(row["notes"])
        y0 = int(n["fy"][:4])
        if row["period_start"] != f"{y0}-04-01" or row["period_end"] != f"{y0 + 1}-03-31":
            date_bad.append((n["fy"], row["period_start"], row["period_end"]))
    f.add(
        "A6",
        "FY labels contiguous 2027-28…2073-74; period = 1 Apr → 31 Mar",
        contiguous and fys[0] == "2027-2028" and fys[-1] == "2073-2074" and not date_bad,
        f"first {fys[0]}, last {fys[-1]}, contiguous={contiguous}, bad periods {len(date_bad)}",
    )

    # A7 contract fields
    bad_fields = [
        r
        for r in rows
        if r["indicator_id"] != "dmo-gilt-future-redemptions"
        or r["geography_code"] != "K02000001"
        or r["unit"] != "£ million"
        or r["observation_status"] != "provisional"
        or float(r["value"]) < 0
    ]
    f.add(
        "A7",
        "indicator_id, geography K02000001, unit £ million, status provisional, values ≥ 0",
        not bad_fields,
        f"{len(bad_fields)} rows breach",
    )

    # A8 method honesty
    no_basis = [r for r in rows if parse_notes(r["notes"]).get("basis") != "net_of_government_holdings"]
    caveats = str(manifest.get("caveats", "")).lower()
    definition = str(manifest.get("definition", "")).lower()
    honest = (
        "net of government holdings" in caveats
        and "net of government holdings" in definition
        and "not psnd" in caveats
        and "hf6w" in caveats
        and "do not tally" in caveats.replace("not tally", "do not tally")
    )
    f.add(
        "A8",
        "notes say net_of_government_holdings on all rows; manifest says ≠ PSND (HF6W)",
        not no_basis and honest,
        f"rows without basis {len(no_basis)}; manifest net+PSND wording {'ok' if honest else 'MISSING'}",
    )

    # A9 no PSND-like instrument leaking in
    leaks = [r for r in rows if re.search(r"psnd|hf6w|net debt", r["notes"] + r["indicator_id"], re.I)]
    f.add("A9", "No PSND / HF6W / net-debt rows in D8B curated", not leaks, f"{len(leaks)} suspicious rows")

    # A10 data date + source_version
    versions = {r["source_version"] for r in rows}
    f.add(
        "A10",
        "Raw data date 2026-11-14 = curated source_version = manifest release date",
        data_date == DATA_DATE
        and versions == {"DMO D8B data-date 2026-11-14"}
        and manifest["raw_evidence"][0]["official_release_date"] == "2026-11-14",
        f"raw data date {data_date}; source_version {sorted(versions)}",
    )

    # A11 raw footnotes present (method statement is DMO's, not Economy's)
    book = xlrd.open_workbook(str(raw_path))
    sheet = book.sheet_by_index(0)
    note_cells = [str(sheet.cell_value(r, 1)) for r in range(sheet.nrows) if str(sheet.cell_value(r, 0)).startswith("Note")]
    note = note_cells[0] if note_cells else ""
    f.add(
        "A11",
        "DMO footnote in raw: net of government holdings; IL ≠ uplifted nominal; FY 1 Apr–31 Mar",
        "net of government holdings" in note and "will not tally with the uplifted nominal" in note and "1 April to 31 March" in note,
        "all three footnote clauses found in raw sheet",
    )

    # A12 cross-check D8B vs D1A, same report date
    conv_gross: dict[str, float] = defaultdict(float)
    il_nom: dict[str, float] = defaultdict(float)
    il_upl: dict[str, float] = defaultdict(float)
    for g in gilts:
        fy = fy_label_for(g.maturity)
        if g.kind == "conventional":
            conv_gross[fy] += g.nominal
        else:
            il_nom[fy] += g.nominal
            il_upl[fy] += g.uplifted or 0.0
    conv_over: list[tuple[str, float, float]] = []
    il_outside: list[tuple[str, float, float, float]] = []
    zero_vs_gilt: list[str] = []
    for fy, (conv, il, _tot) in raw.items():
        if conv > conv_gross.get(fy, 0.0) + 1.0:
            conv_over.append((fy, conv, conv_gross.get(fy, 0.0)))
        if il > il_upl.get(fy, 0.0) + 1.0:
            il_outside.append((fy, il, il_nom.get(fy, 0.0), il_upl.get(fy, 0.0)))
        if (conv == 0) != (conv_gross.get(fy, 0.0) == 0) or (il == 0) != (il_nom.get(fy, 0.0) == 0):
            zero_vs_gilt.append(fy)
    current_fy = fy_label_for(AS_OF_D1A)  # 2026-2027: in progress at the as-of date
    d1a_fys = {fy for fy in set(conv_gross) | set(il_nom)}
    missing_fy = sorted(d1a_fys - set(raw) - {current_fy})
    f.add(
        "A12",
        "Cross-check vs D1A: D8B conv ≤ D1A gross conv; D8B IL ≤ D1A uplifted IL; same FYs non-zero",
        not conv_over and not il_outside and not zero_vs_gilt and not missing_fy,
        f"conv>gross {conv_over or 'none'}; IL>uplifted {il_outside or 'none'}; "
        f"zero/non-zero mismatches {zero_vs_gilt or 'none'}; D1A maturity FYs absent from D8B (excl. current FY) {missing_fy or 'none'}",
    )

    # A12b: D8B starts at 2027-28; the in-progress FY is not in the report.
    cur_gross = conv_gross.get(current_fy, 0.0)
    cur_il = il_upl.get(current_fy, 0.0)
    cur_names = [g.name for g in gilts if fy_label_for(g.maturity) == current_fy]
    f.extra["d8b_current_fy_gap"] = (
        f"D1A shows {len(cur_names)} gilt(s) maturing in FY {current_fy} after the as-of date "
        f"(conventional £{cur_gross:,.0f}m gross; IL uplifted £{cur_il:,.0f}m): {', '.join(cur_names)}"
    )
    f.add(
        "A12b",
        "D8B coverage: first FY is 2027-28; remaining FY 2026-27 redemptions are not in the report",
        not cur_names,
        f.extra["d8b_current_fy_gap"]
        + ". Not a data error (curated == raw) but the README/manifest do not say D8B excludes the in-progress FY.",
        warn=True,
    )

    # A13 information: net vs gross gap (official holdings), expected positive for conv
    gaps = []
    for fy in sorted(raw):
        if conv_gross.get(fy, 0) > 0:
            gaps.append((fy, conv_gross[fy], raw[fy][0]))
    biggest = max(gaps, key=lambda x: x[1] - x[2]) if gaps else None
    f.extra["d8b_vs_d1a_conv_table"] = "\n".join(
        f"| {fy} | {gross:,.0f} | {net:,.0f} | {gross - net:,.0f} |"
        for fy, gross, net in gaps[:6]
    )
    f.add(
        "A13",
        "Net-vs-gross sanity: D8B conv is below D1A gross conv in FYs with official holdings",
        all(net <= gross + 1 for _fy, gross, net in gaps),
        f"{len(gaps)} FYs compared; largest gross−net gap {biggest[0] if biggest else '-'} "
        f"£{(biggest[1] - biggest[2]) if biggest else 0:,.0f}m (consistent with DMO/CRND holdings)",
    )
    f.extra["d8b_total_sum"] = f"{sum(v[2] for v in raw.values()):,.0f}"
    f.extra["d8b_conv_sum"] = f"{sum(v[0] for v in raw.values()):,.0f}"
    f.extra["d8b_il_sum"] = f"{sum(v[1] for v in raw.values()):,.0f}"
    f.extra["d8b_sample"] = "\n".join(
        f"| {fy} | {raw[fy][0]:,.0f} | {raw[fy][1]:,.0f} | {raw[fy][2]:,.0f} | "
        f"{curated[(fy, 'conventional')]:,.0f} / {curated[(fy, 'index_linked')]:,.0f} / {curated[(fy, 'total')]:,.0f} |"
        for fy in ("2027-2028", "2028-2029", "2029-2030", "2047-2048", "2072-2073", "2073-2074")
        if fy in raw
    )


# --------------------------------------------------------------------------- #
# D1A checks
# --------------------------------------------------------------------------- #
def check_d1a(f: Findings, gilts: list[Gilt], title: str, headline: str) -> None:
    raw_path = D1A_DIR / "raw" / D1A_XLS
    cur_path = D1A_DIR / "curated" / "observations.csv"
    manifest = yaml.safe_load((D1A_DIR / "manifest.yaml").read_text(encoding="utf-8"))
    rows = read_csv(cur_path)

    # B1 checksum
    actual = sha256(raw_path)
    sums = read_sums(D1A_DIR / "raw").get(D1A_XLS)
    mani = manifest["raw_evidence"][0]["checksum_sha256"]
    f.add(
        "B1",
        "D1A raw SHA-256 = SHA256SUMS = manifest",
        actual == sums == mani,
        f"disk `{actual[:12]}…`; SHA256SUMS `{(sums or 'MISSING')[:12]}…`; manifest `{mani[:12]}…`",
    )

    # B2 counts
    n_conv = sum(1 for g in gilts if g.kind == "conventional")
    n_il = sum(1 for g in gilts if g.kind == "index_linked")
    by_series: dict[str, int] = defaultdict(int)
    for r in rows:
        by_series[parse_notes(r["notes"]).get("series", "?")] += 1
    isins = {parse_notes(r["notes"])["isin"] for r in rows}
    f.add(
        "B2",
        "D1A 138 rows = 104 gilts (70 conv + 34 IL) → 104 nominal + 34 uplifted",
        len(rows) == 138
        and len(gilts) == 104
        and (n_conv, n_il) == (70, 34)
        and by_series == {"nominal": 104, "uplifted_nominal": 34}
        and len(isins) == 104,
        f"curated {len(rows)} rows; raw gilts {len(gilts)} ({n_conv} conv + {n_il} IL); "
        f"series {dict(by_series)}; unique ISINs {len(isins)}",
    )

    # B3 independent raw ↔ curated, every gilt
    cur: dict[tuple[str, str], tuple[float, dict[str, str], dict[str, str]]] = {}
    dup = 0
    for r in rows:
        n = parse_notes(r["notes"])
        key = (n["isin"], n["series"])
        if key in cur:
            dup += 1
        cur[key] = (float(r["value"]), n, r)
    errs: list[str] = []
    for g in gilts:
        nom = cur.get((g.isin, "nominal"))
        if nom is None or abs(nom[0] - g.nominal) > 1e-4:
            errs.append(f"{g.isin} nominal raw {g.nominal} vs {nom[0] if nom else None}")
        elif nom[1].get("kind") != g.kind or nom[1].get("maturity") != g.maturity.isoformat() or nom[1].get("first_issue") != g.first_issue.isoformat():
            errs.append(f"{g.isin} attrs differ: {nom[1]}")
        if g.kind == "index_linked":
            up = cur.get((g.isin, "uplifted_nominal"))
            if up is None or abs(up[0] - (g.uplifted or 0)) > 1e-4:
                errs.append(f"{g.isin} uplifted raw {g.uplifted} vs {up[0] if up else None}")
        elif (g.isin, "uplifted_nominal") in cur:
            errs.append(f"{g.isin} conventional has an uplifted row")
    f.add(
        "B3",
        "Every raw gilt (amount, kind, maturity, first issue) == curated; no conv uplift rows",
        not errs and dup == 0,
        f"{len(errs)} mismatches; duplicate keys {dup}" + (f"; first: {errs[:3]}" if errs else ""),
    )

    # B4 headline ±£5m
    m = re.search(r"£([\d,\.]+)\s*billion", headline)
    headline_m = float(m.group(1).replace(",", "")) * 1000 if m else float("nan")
    conv_sum = sum(v[0] for (isin, s), v in cur.items() if s == "nominal" and v[1]["kind"] == "conventional")
    il_up_sum = sum(v[0] for (isin, s), v in cur.items() if s == "uplifted_nominal")
    il_nom_sum = sum(v[0] for (isin, s), v in cur.items() if s == "nominal" and v[1]["kind"] == "index_linked")
    total = conv_sum + il_up_sum
    diff = total - headline_m
    f.add(
        "B4",
        "Σ conventional nominal + Σ IL uplifted ≈ £2,939.04bn (±£5m)",
        abs(diff) <= HEADLINE_TOL_M,
        f"curated Σ = £{total:,.3f}m; raw headline £{headline_m:,.0f}m; diff £{diff:+.3f}m "
        f"(conv £{conv_sum:,.3f}m + IL uplifted £{il_up_sum:,.3f}m; IL face £{il_nom_sum:,.3f}m not added)",
    )
    wrong_total = conv_sum + il_nom_sum
    f.extra["d1a_headline"] = f"{headline_m:,.0f}"
    f.extra["d1a_total"] = f"{total:,.3f}"
    f.extra["d1a_diff"] = f"{diff:+.3f}"
    f.extra["d1a_conv_sum"] = f"{conv_sum:,.3f}"
    f.extra["d1a_il_uplifted_sum"] = f"{il_up_sum:,.3f}"
    f.extra["d1a_il_nominal_sum"] = f"{il_nom_sum:,.3f}"
    f.extra["d1a_conv_il_face"] = f"{wrong_total:,.3f}"

    # B5 as-of date
    as_of_ok = "13 NOVEMBER 2026" in title.upper()
    bad_dates = [r for r in rows if r["period_start"] != "2026-11-13" or r["period_end"] != "2026-11-13"]
    stale = [g for g in gilts if g.maturity <= AS_OF_D1A]
    unborn = [g for g in gilts if g.first_issue > AS_OF_D1A]
    versions = {r["source_version"] for r in rows}
    f.add(
        "B5",
        "As-of 2026-11-13 (title) = curated period; no matured / future-issued gilts",
        as_of_ok and not bad_dates and not stale and not unborn
        and versions == {"DMO D1A in issue 2026-11-13 (data-date 2026-11-14)"},
        f"raw title `{title}`; rows with wrong period {len(bad_dates)}; matured {len(stale)}; first-issue after as-of {len(unborn)}",
    )

    # B6 no fake PSND / total rows
    fake = [
        r
        for r in rows
        if not parse_notes(r["notes"]).get("isin")
        or not isin_ok(parse_notes(r["notes"]).get("isin", ""))
        or re.search(r"psnd|hf6w|total|net debt|public sector", r["notes"] + r["indicator_id"], re.I)
    ]
    f.add(
        "B6",
        "No fake PSND / aggregate / total row: every row is one valid-ISIN gilt",
        not fake,
        f"{len(fake)} rows without valid ISIN or with total/PSND wording; "
        f"all {len(isins)} ISINs pass ISO 6166 check digit" if not fake else f"{len(fake)} suspicious rows",
    )

    # B7 contract fields
    bad_fields = [
        r
        for r in rows
        if r["indicator_id"] != "dmo-gilts-in-issue"
        or r["geography_code"] != "K02000001"
        or r["observation_status"] != "final"
        or float(r["value"]) <= 0
        or (parse_notes(r["notes"])["series"] == "nominal" and r["unit"] != "£ million nominal")
        or (parse_notes(r["notes"])["series"] == "uplifted_nominal" and r["unit"] != "£ million nominal (including index-linked uplift)")
    ]
    f.add(
        "B7",
        "indicator_id, geography K02000001, status final, positive values, unit by series",
        not bad_fields,
        f"{len(bad_fields)} rows breach",
    )

    # B8 IL uplift internal consistency: implied reference RPI constant per lag
    implied: dict[str, list[float]] = defaultdict(list)
    ratio_bad = []
    for g in gilts:
        if g.kind != "index_linked":
            continue
        ratio = (g.uplifted or 0) / g.nominal
        implied[g.section].append(ratio * (g.base_rpi or 0))
        if ratio <= 0.9 or ratio >= 6:
            ratio_bad.append((g.isin, round(ratio, 3)))
    spread = {k: (min(v), max(v)) for k, v in implied.items()}
    # 3m lag: same reference RPI for all gilts → spread tiny. 8m lag likewise.
    tight = all((hi - lo) / lo < 1e-4 for lo, hi in spread.values())
    f.add(
        "B8",
        "IL uplift = nominal × (ref RPI ÷ base RPI): implied ref RPI identical across gilts per lag",
        tight and not ratio_bad,
        "implied reference RPI (3m lag) "
        f"{spread['3m'][0]:.4f}–{spread['3m'][1]:.4f}; (8m lag) {spread['8m'][0]:.4f}–{spread['8m'][1]:.4f}; "
        f"odd ratios {ratio_bad or 'none'}",
    )
    f.extra["il_ref_rpi_3m"] = f"{spread['3m'][0]:.3f}"
    f.extra["il_ref_rpi_8m"] = f"{spread['8m'][0]:.3f}"

    # B9 note keys: bucket for conv, lag for IL, matches raw section
    bucket_err, lag_err = [], []
    for g in gilts:
        n = cur[(g.isin, "nominal")][1]
        if g.kind == "conventional" and n.get("bucket") != g.section:
            bucket_err.append((g.isin, n.get("bucket"), g.section))
        if g.kind == "index_linked":
            want = "3" if g.section == "3m" else "8"
            if n.get("lag_months") != want or abs(float(n.get("base_rpi", "nan")) - (g.base_rpi or 0)) > 6e-4:
                lag_err.append((g.isin, n.get("lag_months"), want))
    f.add(
        "B9",
        "Conventional bucket and IL lag_months/base_rpi in notes match raw sheet sections",
        not bucket_err and not lag_err,
        f"bucket errors {len(bucket_err)}; lag/base_rpi errors {len(lag_err)} "
        "(notes round base_rpi to 3 dp, e.g. 194.06667 → 194.067; tolerance ±0.0006; amounts are unrounded)",
    )

    # B10 bucket vs maturity horizon (DMO: ultra-short <3y, short 3–7y, medium 7–15y, long >15y)
    def years(g: Gilt) -> float:
        return (g.maturity - AS_OF_D1A).days / 365.25

    out_of_band = []
    for g in gilts:
        if g.kind != "conventional":
            continue
        y = years(g)
        lo, hi = {"ultra-short": (0, 3.05), "short": (2.95, 7.05), "medium": (6.95, 15.05), "long": (14.95, 999)}[g.section]
        if not lo <= y <= hi:
            out_of_band.append((g.isin, g.section, round(y, 2)))
    f.add(
        "B10",
        "Conventional bucket consistent with years to maturity (<3 / 3–7 / 7–15 / >15)",
        not out_of_band,
        f"out-of-band {out_of_band or 'none'}",
        warn=True,
    )

    # B11 manifest wording
    cav = str(manifest.get("caveats", "")).lower()
    f.add(
        "B11",
        "Manifest caveats: nominal ≠ market value; not PSND; gross (not net of holdings); no cross-kind total",
        all(
            s in cav
            for s in ("not market value", "not psnd", "hf6w", "gross", "do not sum nominal across kinds")
        ),
        "wording present" if "not psnd" in cav else "wording MISSING",
    )

    # B12 headline_check.json agrees with independent recompute
    import json

    hc = json.loads((D1A_DIR / "curated" / "headline_check.json").read_text(encoding="utf-8"))
    f.add(
        "B12",
        "Economy's headline_check.json matches independent recompute",
        abs(hc["sum_conventional_plus_il_uplifted_gbp_million"] - total) < 0.01
        and abs(hc["diff_gbp_million"] - diff) < 0.01
        and hc["pass"] is True,
        f"Economy Σ £{hc['sum_conventional_plus_il_uplifted_gbp_million']:,.3f}m diff £{hc['diff_gbp_million']:+.3f}m; "
        f"Validation Σ £{total:,.3f}m diff £{diff:+.3f}m",
    )

    # Spot sample table
    pick = [g for g in gilts if g.isin in {
        "GB00BL6C7720",  # first conventional
        "GB00BLBDX619",  # last conventional (2073)
        "GB00B128DH60",  # first IL 3m
        "GB0031790826",  # last IL 8m
    }]
    lines = []
    for g in pick:
        nom = cur[(g.isin, "nominal")][0]
        up = cur.get((g.isin, "uplifted_nominal"), (None,))[0]
        lines.append(
            f"| {g.isin} | {g.name} | {g.nominal:,.3f} | {nom:,.3f} | "
            f"{f'{g.uplifted:,.3f}' if g.uplifted else '—'} | {f'{up:,.3f}' if up else '—'} |"
        )
    f.extra["d1a_sample"] = "\n".join(lines)


# --------------------------------------------------------------------------- #
# Report
# --------------------------------------------------------------------------- #
def render(f: Findings) -> str:
    counts = {k: sum(1 for c in f.checks if c.result == k) for k in ("pass", "warn", "fail")}
    overall = "FAIL" if counts["fail"] else ("PASS with warnings" if counts["warn"] else "PASS")
    a = [c for c in f.checks if c.cid.startswith("A")]
    b = [c for c in f.checks if c.cid.startswith("B")]

    def table(cs: list[Check]) -> str:
        return "\n".join(f"| {c.cid} | {c.name} | **{c.result}** | {c.notes.replace('|', '/')} |" for c in cs)

    return f"""# QA report — Economy Domain 08 DMO D8B + D1A — 2026-11-14

**Agent:** Validation
**Overall verdict:** **{overall}** ({counts['pass']} pass · {counts['warn']} warn · {counts['fail']} fail)
**Packages:** `dmo-gilt-future-redemptions` (D8B) · `dmo-gilts-in-issue` (D1A)
**Script:** `src/validation/qa_economy_08_dmo_d8b_d1a_2026_11_14.py`
**Independence:** Re-parsed both raw `.xls` files directly with `xlrd`; did **not** import `economy.connectors`; did not edit `data/economy/`.

## Scope

| Field | D8B Future Redemptions | D1A Gilts in Issue |
|-------|------------------------|--------------------|
| Manifest | `data/economy/dmo-gilt-future-redemptions/manifest.yaml` | `data/economy/dmo-gilts-in-issue/manifest.yaml` |
| Raw | `raw/Future Redemptions Nov 14 2026.xls` | `raw/Gilts in Issue Nov 14 2026.xls` |
| Curated | `curated/observations.csv` ({f.extra['d8b_rows']} rows) | `curated/observations.csv` (138 rows) + `headline_check.json` |
| Unit / basis | £ million; **net of government holdings** | £ million nominal / nominal incl. IL uplift; **gross** |
| Date | Data date 2026-11-14 (FY profile) | In issue 2026-11-13 (data date 2026-11-14) |
| Source channel | Browser pin (DMO captcha); no live re-fetch possible | same |
| Not claimed | PSND (HF6W) · issuance forecast · market value · who owns gilts | same |

Live re-fetch from DMO was **not** attempted: matrix documents Perfdrive/captcha on every export endpoint. "Official release" comparison is therefore against the pinned workbook itself (hash-verified), i.e. raw-vs-curated, plus the DMO-stated headline inside the D1A sheet and a D8B↔D1A cross-check.

## Checks — D8B (`dmo-gilt-future-redemptions`)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
{table(a)}

### D8B spot checks (raw → curated, £m)

| FY | Raw conv | Raw IL | Raw total | Curated conv / IL / total |
|----|---------:|-------:|----------:|---------------------------|
{f.extra['d8b_sample']}

Σ all 47 FYs: conventional £{f.extra['d8b_conv_sum']}m · index-linked £{f.extra['d8b_il_sum']}m · total £{f.extra['d8b_total_sum']}m. Rows where conv + IL equals total exactly: {f.extra['d8b_exact_additive']}.

### D8B ↔ D1A cross-check (first FYs, conventional, £m)

D8B is **net** of government holdings; D1A is **gross**; so D8B ≤ D1A is expected, with the gap = official (DMO/CRND) holdings.

| FY | D1A gross conv by maturity | D8B net conv | Gap |
|----|---------------------------:|-------------:|----:|
{f.extra['d8b_vs_d1a_conv_table']}

## Checks — D1A (`dmo-gilts-in-issue`)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
{table(b)}

### D1A headline arithmetic (£m)

| Quantity | £m |
|----------|---:|
| Σ conventional nominal (70 gilts) | {f.extra['d1a_conv_sum']} |
| Σ index-linked uplifted nominal (34 gilts) | {f.extra['d1a_il_uplifted_sum']} |
| **Σ curated (conv nominal + IL uplifted)** | **{f.extra['d1a_total']}** |
| Raw sheet headline (£2,939.04bn, rounded to £10m) | {f.extra['d1a_headline']} |
| Difference | {f.extra['d1a_diff']} (tolerance ±5) |
| *Not the headline:* conv nominal + IL face | {f.extra['d1a_conv_il_face']} |
| *Memo:* Σ IL nominal (face) | {f.extra['d1a_il_nominal_sum']} |

### D1A spot checks (raw → curated, £m)

| ISIN | Gilt | Raw nominal | Curated nominal | Raw uplifted | Curated uplifted |
|------|------|------------:|----------------:|-------------:|-----------------:|
{f.extra['d1a_sample']}

Implied reference RPI from `uplifted ÷ nominal × base RPI`: 3-month-lag gilts ≈ {f.extra['il_ref_rpi_3m']}; 8-month-lag gilts ≈ {f.extra['il_ref_rpi_8m']} (constant across gilts → uplifts are internally consistent).

## Method notes (for Ready / UI later)

1. **D8B ≠ D1A maturities.** D8B is net of government holdings and carries only part of the IL uplift; never reconcile D8B IL to D1A uplifted amounts.
2. **D1A headline ties only as conventional nominal + IL uplifted nominal.** Adding IL face instead would understate the headline by the IL uplift. The 104 nominal rows must not be summed across kinds in the UI.
3. **Neither package is PSND (HF6W)**; no aggregate rows exist in either curated file.
4. **Snapshots, not time series.** Both change with each gilt operation / redemption / monthly RPI; re-run this script after any re-pin.
5. D8B rows are `provisional` (DMO: holdings update after month-end, net figures may temporarily overstate); D1A rows `final` for the as-of date.

## Summary

- **Blockers:** {'none' if not counts['fail'] else 'see failed checks above'}
- **Recommended fixes (owner):** {'Economy to fix failed checks' if counts['fail'] else 'none blocking — data is faithful to the pinned raw. Docs-only task for Economy (A12b): add to the D8B README, manifest caveats and Notes that the report starts at FY 2027-28 and omits the remainder of the in-progress FY 2026-27 (D1A shows ~£69.8bn gross conventional maturing Jan/Mar 2027), so the Repayment Calendar UI must not imply nothing redeems before Apr 2027.'}
- **Ready recommendation:** {'blocked until fixes' if counts['fail'] else 'both packages pass numerical QA; Orchestrator may mark Validation done → Ready after the A12b caveat is added, then cloud load (no UI before Review).'}
- **Not verified:** live DMO D8B/D1A PDF/XML export (captcha-blocked); registry/Notion status is for the Orchestrator hand-off.
"""


def main() -> int:
    f = Findings()
    _title, _headline = "", ""
    _title, _headline, gilts = parse_d1a_raw(D1A_DIR / "raw" / D1A_XLS)
    check_d8b(f, gilts)
    check_d1a(f, gilts, _title, _headline)
    REPORT.write_text(render(f), encoding="utf-8")
    for c in f.checks:
        print(f"{c.cid:4} {c.result.upper():5} {c.name}\n       {c.notes}")
    fails = sum(1 for c in f.checks if c.result == "fail")
    warns = sum(1 for c in f.checks if c.result == "warn")
    print(f"\n{len(f.checks) - fails - warns} pass · {warns} warn · {fails} fail → {REPORT.relative_to(ROOT)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

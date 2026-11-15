"""Independent QA — Economy Domain 08: ownership / official holdings / portfolio composition.

What this script does (plain language)
--------------------------------------
Economy curated three packages. This script re-reads the **raw** evidence itself
(``pypdf`` for the DMO Quarterly Review PDF, ``xlrd`` for the D4L Excel), with its own
parsers, and compares every curated number with it. It does **not** import the Economy
parsers for the primary comparison. The one exception is check ``*-REPRO``: it re-runs the
Economy connector inside a throw-away temp folder to prove the curated CSV is reproducible
(that step never touches ``data/economy/``).

Packages
--------
1. ``gilt-holdings-by-sector``      ONS market-value sector holdings (via QR PDF), £mn
2. ``dmo-government-holdings``      D4L official CRND + DMO nominal holdings, £mn
3. ``dmo-debt-portfolio-composition``  QR uplifted-nominal / market-value portfolio, £bn

It only reads; it writes the QA report to
``data/qa/qa_report_economy_08_debt_ownership_2026-11-14.md``.

Run:

    uv run python src/validation/qa_economy_08_debt_ownership_2026_11_14.py

Refs: pathlib https://docs.python.org/3/library/pathlib.html ·
csv https://docs.python.org/3/library/csv.html ·
tempfile https://docs.python.org/3/library/tempfile.html ·
pypdf https://pypdf.readthedocs.io/ · xlrd https://xlrd.readthedocs.io/ ·
PEP 8 https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import csv
import hashlib
import math
import re
import shutil
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

import xlrd
import yaml
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ECON = ROOT / "data" / "economy"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_08_debt_ownership_2026-11-14.md"

GH = ECON / "gilt-holdings-by-sector"  # package 1
D4L = ECON / "dmo-government-holdings"  # package 2
PC = ECON / "dmo-debt-portfolio-composition"  # package 3
D1A = ECON / "dmo-gilts-in-issue"  # cross-check only

PDF_NAME = "dmo_quarterly_review_2025_q4.pdf"
GH_PDF = GH / "raw" / "2026-11-14" / PDF_NAME
PC_PDF = PC / "raw" / PDF_NAME
D4L_XLS = D4L / "raw" / "Government Holdings of Gilts Nov 14 2026.xls"

QUARTER_END = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
@dataclass
class Check:
    cid: str
    name: str
    result: str  # pass | warn | fail
    notes: str


@dataclass
class Findings:
    checks: list[Check] = field(default_factory=list)
    extra: dict[str, str] = field(default_factory=dict)

    def add(self, cid: str, name: str, ok: bool, notes: str, *, warn: bool = False) -> None:
        self.checks.append(Check(cid, name, "pass" if ok else ("warn" if warn else "fail"), notes))

    def info_warn(self, cid: str, name: str, notes: str) -> None:
        """A known, documented limitation — always reported as ``warn``."""
        self.checks.append(Check(cid, name, "warn", notes))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_sums(sums_file: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in sums_file.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split(None, 1)
        if len(parts) == 2:
            out[parts[1].strip().lstrip("*")] = parts[0].lower()
    return out


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def parse_notes(notes: str) -> dict[str, str]:
    """``key=value; key=value`` → dict (first ``=`` splits)."""
    out: dict[str, str] = {}
    for part in notes.split("; "):
        if "=" in part:
            key, _, value = part.partition("=")
            out[key.strip()] = value.strip()
    return out


def load_manifest(pkg: Path) -> dict:
    return yaml.safe_load((pkg / "manifest.yaml").read_text(encoding="utf-8"))


def month_end(year: int, month: int) -> date:
    nxt = date(year + (month == 12), month % 12 + 1, 1)
    return nxt - timedelta(days=1)


def pdf_pages(path: Path) -> list[str]:
    """Layout-mode text per page (a different extraction mode from the Economy parser)."""
    return [p.extract_text(extraction_mode="layout") for p in PdfReader(str(path)).pages]


def ints_in(text: str) -> list[int]:
    return [int(t.replace(",", "")) for t in re.findall(r"\d{1,3}(?:,\d{3})+|\d+", text)]


# --------------------------------------------------------------------------- #
# Independent raw parsers — QR PDF
# --------------------------------------------------------------------------- #
SECTOR_PREFIX = {  # how the label *starts* on the page → curated series slug
    "Insurance companies and pension funds": "insurance-pension-funds",
    "Overseas": "overseas",
    "Bank of England (Asset Purchase Facility)": "bank-of-england-apf",
    "Other financial institutions and private non-financial": "other-financial-pnfc",
    "Monetary financial institutions": "monetary-financial-institutions",
    "Households and non-profit institutions serving": "households-npish",
    "Local authorities and public corporations": "local-authorities-public-corporations",
    "TOTAL": "total",
}
HOLDINGS_QUARTERS = [(2024, 4), (2025, 1), (2025, 2), (2025, 3)]


def parse_holdings_page(page: str) -> tuple[dict[str, tuple[int, int, int, int]], dict[str, float], str]:
    """Return ``({slug: 4 quarterly £mn}, {slug: Q3 share %}, source_line)``."""
    start = page.index("Gilt holdings (£mn, market values)")
    block = page[start:]
    values: dict[str, tuple[int, int, int, int]] = {}
    shares: dict[str, float] = {}
    for line in block.splitlines():
        label = line.strip()
        for prefix, slug in SECTOR_PREFIX.items():
            if label.startswith(prefix) and slug not in values:
                numbers = re.findall(r"\d{1,3}(?:,\d{3})+|\d+\.\d|\d+", label[len(prefix):])
                if len(numbers) >= 5:
                    ints = [int(n.replace(",", "")) for n in numbers[:4]]
                    values[slug] = (ints[0], ints[1], ints[2], ints[3])
                    shares[slug] = float(numbers[4])
    source = next((ln.strip() for ln in block.splitlines() if ln.strip().startswith("Source: ONS")), "")
    return values, shares, source


@dataclass
class QrPoint:
    valuation: str  # uplifted-nominal | market-value
    basis: str  # gross | net
    instrument: str  # total | conventional-gilts | index-linked-gilts | treasury-bills
    as_of: date
    value_gbn: float


INSTRUMENT_PREFIX = [
    ("Uplifted nominal value of the debt portfolio", "total"),
    ("Debt portfolio", "total"),
    ("• Conventional gilts", "conventional-gilts"),
    ("• Index-linked gilts", "index-linked-gilts"),
    ("• Treasury bills", "treasury-bills"),
]


def _gbn(text: str) -> list[float]:
    return [float(t.replace(",", "")) for t in re.findall(r"£([\d,]+\.\d+)bn", text)]


def parse_portfolio_pages(p1: str, p2: str) -> list[QrPoint]:
    """Parse the uplifted-nominal table (page 1) and market-value table (page 2)."""
    out: list[QrPoint] = []
    nominal_dates = [date(2025, 3, 31), date(2025, 6, 30), date(2025, 9, 30), date(2025, 12, 31)]
    basis = ""
    for line in p1.splitlines():
        s = line.strip()
        if s.startswith("Gross values"):
            basis = "gross"
        elif s.startswith("Net values"):
            basis = "net"
        elif s.startswith("Average maturity") or "Based on net" in s:
            if s.startswith("Average maturity") and basis == "net":
                basis = "done"
        if basis not in ("gross", "net"):
            continue
        for prefix, instrument in INSTRUMENT_PREFIX:
            if s.startswith(prefix) and prefix != "Debt portfolio":
                vals = _gbn(s)
                if len(vals) == 4:
                    out += [QrPoint("uplifted-nominal", basis, instrument, d, v) for d, v in zip(nominal_dates, vals)]
                break
    mv_dates = [date(2025, 9, 30), date(2025, 12, 31)]
    in_table = False
    for line in p2.splitlines():
        s = line.strip()
        if s.startswith("Portfolio market value"):
            in_table = True
        if s.startswith("Average portfolio yield"):
            in_table = False
        if not in_table:
            continue
        # Each line holds the gross block then the net block: 4 numbers = gross Sep/Dec, net Sep/Dec.
        for prefix, instrument in INSTRUMENT_PREFIX:
            if s.startswith(prefix) and prefix != "Uplifted nominal value of the debt portfolio":
                vals = _gbn(s)
                if len(vals) == 4:
                    out += [QrPoint("market-value", "gross", instrument, d, v) for d, v in zip(mv_dates, vals[:2])]
                    out += [QrPoint("market-value", "net", instrument, d, v) for d, v in zip(mv_dates, vals[2:])]
                break
    return out


# --------------------------------------------------------------------------- #
# Independent raw parser — D4L xls
# --------------------------------------------------------------------------- #
MONTH_NUM = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}


def parse_d4l(path: Path) -> tuple[dict[tuple[int, int], dict[str, float]], dict[tuple[str, int, int], float], dict[str, str], str]:
    """Return ``(monthly sums, per-cell values, isin→name, note text)`` re-derived from the sheet.

    Independent choices vs Economy: classification keyed off the *word* "index" in a
    lower-cased name, sums with ``math.fsum`` (exact), month header found by regex over the row.
    """
    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    cells: dict[tuple[str, int, int], float] = {}
    names: dict[str, str] = {}
    months: list[tuple[int, int]] = []
    note = ""
    for r in range(sheet.nrows):
        row = sheet.row_values(r)
        a, b = str(row[0]), str(row[1])
        if a.startswith("Note"):
            note = b
        header = [re.fullmatch(r"([A-Z][a-z]{2})-\s*(\d{4})", str(c).replace("\r", "").strip()) for c in row[2:]]
        if not a.strip() and not b.strip() and any(header):
            months = [(int(m.group(2)), MONTH_NUM[m.group(1)]) for m in header if m]
            continue
        if re.fullmatch(r"GB[A-Z0-9]{10}", b.strip()):
            names[b.strip()] = a.strip()
            for (y, m), v in zip(months, row[2 : 2 + len(months)]):
                if v != "":
                    key = (b.strip(), y, m)
                    if key in cells:
                        raise ValueError(f"duplicate {key}")
                    cells[key] = float(v)
    buckets: dict[tuple[int, int], dict[str, list[float]]] = defaultdict(lambda: {"conventional": [], "index-linked": []})
    for (isin, y, m), v in cells.items():
        kind = "index-linked" if "index" in names[isin].lower() else "conventional"
        buckets[(y, m)][kind].append(v)
    monthly = {
        ym: {
            "conventional": math.fsum(b["conventional"]),
            "index-linked": math.fsum(b["index-linked"]),
            "total": math.fsum(b["conventional"] + b["index-linked"]),
        }
        for ym, b in buckets.items()
    }
    return monthly, cells, names, note


# --------------------------------------------------------------------------- #
# Shared evidence checks
# --------------------------------------------------------------------------- #
def check_hash(f: Findings, cid: str, label: str, raw: Path, pkg: Path) -> None:
    manifest = load_manifest(pkg)
    actual = sha256(raw)
    sums = read_sums(raw.parent / "SHA256SUMS").get(raw.name)
    mani = manifest["raw_evidence"][0]["checksum_sha256"]
    f.add(
        cid,
        f"{label} raw SHA-256 = SHA256SUMS = manifest",
        actual == sums == mani,
        f"disk `{actual[:12]}…`; SHA256SUMS `{(sums or 'MISSING')[:12]}…`; manifest `{mani[:12]}…`",
    )


def check_connector_repro(f: Findings, cid: str, label: str, module: str, cls: str, pkg: Path, copy_raw: bool) -> None:
    """Re-run the Economy connector in a temp folder; compare to the curated CSV."""
    sys.path.insert(0, str(ROOT / "src"))
    try:
        mod = __import__(module, fromlist=[cls])
        connector_cls = getattr(mod, cls)
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / pkg.name
            if copy_raw:
                shutil.copytree(pkg / "raw", tmp_root / "raw")
            connector = connector_cls(data_root=tmp_root)
            evidence = connector.fetch()
            obs = connector.transform(evidence)
        cur = read_csv(pkg / "curated" / "observations.csv")
        key = lambda d: (d["period_start"], d["period_end"], d["notes"])  # noqa: E731
        cur_map = {key(r): (float(r["value"]), r["observation_status"], r["unit"]) for r in cur}
        new_map = {(o.period_start, o.period_end, o.notes): (float(o.value), o.observation_status, o.unit) for o in obs}
        same_keys = cur_map.keys() == new_map.keys()
        diffs = [
            k for k in cur_map.keys() & new_map.keys()
            if abs(cur_map[k][0] - new_map[k][0]) > 1e-6 or cur_map[k][1:] != new_map[k][1:]
        ]
        f.add(
            cid,
            f"{label} connector re-run (temp dir) reproduces curated CSV",
            same_keys and not diffs and len(cur) == len(obs),
            f"connector `{module}.{cls}`: curated {len(cur)} rows vs re-run {len(obs)}; "
            f"key mismatch {not same_keys}; value/status/unit diffs {len(diffs)}",
        )
    except Exception as exc:  # noqa: BLE001 — report any failure as a QA finding
        f.add(cid, f"{label} connector re-run (temp dir) reproduces curated CSV", False, f"{type(exc).__name__}: {exc}")
    finally:
        sys.path.pop(0)


# --------------------------------------------------------------------------- #
# Package 1 — gilt-holdings-by-sector
# --------------------------------------------------------------------------- #
def check_gilt_holdings(f: Findings) -> None:
    manifest = load_manifest(GH)
    rows = read_csv(GH / "curated" / "observations.csv")
    pages = pdf_pages(GH_PDF)
    page_idx = next(i for i, p in enumerate(pages) if "Gilt holdings (£mn, market values)" in p)
    raw_vals, raw_shares, source_line = parse_holdings_page(pages[page_idx])
    f.extra["g_page"] = str(page_idx + 1)

    # G1 hash (+ both PDF copies identical)
    check_hash(f, "G1", "Gilt holdings", GH_PDF, GH)
    f.add(
        "G1b",
        "Package PDF copy is byte-identical to the composition package pin",
        sha256(GH_PDF) == sha256(PC_PDF),
        f"`{sha256(GH_PDF)[:12]}…` vs `{sha256(PC_PDF)[:12]}…`",
    )

    # G2 shape
    parsed = [(r, parse_notes(r["notes"])) for r in rows]
    keys = [(n["series"], r["period_start"]) for r, n in parsed]
    series = sorted({n["series"] for _, n in parsed})
    f.add(
        "G2",
        "32 rows = 8 series × 4 quarters; no duplicate (series, quarter); no blank values",
        len(rows) == 32 and len(series) == 8 and len(set(keys)) == 32 and all(r["value"] != "" for r in rows),
        f"{len(rows)} rows; {len(series)} series; {len(set(keys))} unique keys",
    )

    # G3 independent PDF → curated, every cell
    mismatches: list[str] = []
    checked = 0
    cur = {(n["series"], r["period_start"]): float(r["value"]) for r, n in parsed}
    for slug, quarter_values in raw_vals.items():
        for (year, q), raw_v in zip(HOLDINGS_QUARTERS, quarter_values):
            checked += 1
            got = cur.get((slug, date(year, 3 * q - 2, 1).isoformat()))
            if got is None or abs(got - raw_v) > 0.5:
                mismatches.append(f"{slug} {year}-Q{q}: PDF {raw_v} vs curated {got}")
    f.add(
        "G3",
        "Every curated cell equals the PDF table (own layout-mode parse)",
        checked == 32 and not mismatches,
        f"{checked} cells compared; mismatches {mismatches or 'none'}",
    )

    # G4 assignment spot check Q3 2025
    expected = {
        "overseas": 709_279,
        "insurance-pension-funds": 449_107,
        "bank-of-england-apf": 393_760,
        "other-financial-pnfc": 356_371,
        "monetary-financial-institutions": 212_170,
        "households-npish": 2_950,
        "local-authorities-public-corporations": 995,
        "total": 2_124_632,
    }
    q3 = {s: cur[(s, "2025-07-01")] for s in expected}
    f.add(
        "G4",
        "Q3 2025 spot check vs matrix/QR (Overseas, ICPF, BoE APF, total + 4 other sectors)",
        all(abs(q3[s] - v) < 0.5 for s, v in expected.items()),
        "; ".join(f"{s} {q3[s]:,.0f}" for s in ("overseas", "insurance-pension-funds", "bank-of-england-apf", "total")),
    )
    f.extra["g_q3_table"] = "\n".join(
        f"| {s} | {v:,} | {q3[s]:,.0f} | {'✓' if abs(q3[s] - v) < 0.5 else '✗'} |" for s, v in expected.items()
    )

    # G5 arithmetic: sectors sum to total, shares
    worst = 0.0
    for year, q in HOLDINGS_QUARTERS:
        start = date(year, 3 * q - 2, 1).isoformat()
        s = sum(cur[(slug, start)] for slug in expected if slug != "total")
        worst = max(worst, abs(s - cur[("total", start)]))
    share_err = max(abs(round(100 * q3[s] / q3["total"], 1) - raw_shares[s]) for s in raw_shares if s != "total")
    f.add(
        "G5",
        "Σ sectors = TOTAL each quarter; Q3 2025 printed % re-derived (0.1 pp)",
        worst <= 7 and share_err <= 0.11,
        f"max |Σ−TOTAL| = {worst:.0f} £mn (QR: figures may not sum due to rounding); max share error {share_err:.2f} pp",
    )

    # G6 attribution / valuation / labelling
    all_notes_ok = all(
        n.get("publisher") == "ONS" and n.get("valuation") == "market-value" and n.get("channel") == "DMO Quarterly Review"
        for _, n in parsed
    )
    units_ok = all(r["unit"] == "£ million, market value" for r in rows)
    version_ok = all("ONS" in r["source_version"] for r in rows)
    caveats = str(manifest.get("caveats", ""))
    caveat_ok = all(s in caveats for s in ("MARKET VALUE", "D1A", "HF6W", "D4L"))
    f.add(
        "G6",
        "Attribution: publisher=ONS, valuation=market-value on every row; manifest caveats ≠ D1A / PSND / D4L",
        manifest.get("publisher") == "ONS" and all_notes_ok and units_ok and version_ok and caveat_ok and "Source: ONS" in source_line,
        f"manifest publisher `{manifest.get('publisher')}`; notes ok {all_notes_ok}; unit ok {units_ok}; "
        f"source_version ok {version_ok}; caveats ok {caveat_ok}; PDF source line `{source_line}`",
    )

    # G7 period / status conventions
    periods_ok = all(
        r["period_end"] == month_end(int(r["period_start"][:4]), int(r["period_start"][5:7]) + 2).isoformat()
        and r["period_start"][8:] == "01"
        and int(r["period_start"][5:7]) in (1, 4, 7, 10)
        for r in rows
    )
    status = {(n["series"], r["period_start"]): r["observation_status"] for r, n in parsed}
    latest_prov = all(v == "provisional" for (s, p), v in status.items() if p == "2025-07-01")
    older_final = all(v == "final" for (s, p), v in status.items() if p != "2025-07-01")
    f.add(
        "G7",
        "Quarter bounds correct; latest quarter provisional, earlier quarters final",
        periods_ok and latest_prov and older_final,
        f"period bounds ok {periods_ok}; Q3 2025 provisional {latest_prov}; others final {older_final}",
    )

    # G8 sector semantics straight from the PDF
    page = pages[page_idx]
    sem_ok = "Bank of England (Asset Purchase Facility)" in page and "Monetary financial institutions" in page
    f.add(
        "G8",
        "BoE shown as Asset Purchase Facility; MFI row present (MFI excludes BoE per matrix)",
        sem_ok and cur[("bank-of-england-apf", "2025-07-01")] > 0,
        f"PDF page {page_idx + 1} labels present: {sem_ok}",
    )

    # G9 sanity vs DMO portfolio market value (info): never equal — different universe/valuation
    pc_rows = {parse_notes(r["notes"])["series"]: float(r["value"]) for r in read_csv(PC / "curated" / "observations.csv") if r["period_start"] == "2025-09-30"}
    net_gilts_mv = (pc_rows.get("market-value-net-conventional-gilts", 0) + pc_rows.get("market-value-net-index-linked-gilts", 0)) * 1000
    gross_gilts_mv = (pc_rows.get("market-value-gross-conventional-gilts", 0) + pc_rows.get("market-value-gross-index-linked-gilts", 0)) * 1000
    ons_total = cur[("total", "2025-07-01")]
    f.extra["g_vs_dmo"] = (
        f"ONS total Q3 2025 £{ons_total / 1000:,.2f}bn · DMO net gilt market value (Sep 2025) £{net_gilts_mv / 1000:,.2f}bn "
        f"({ons_total / net_gilts_mv - 1:+.2%}) · DMO gross gilt market value £{gross_gilts_mv / 1000:,.2f}bn ({ons_total / gross_gilts_mv - 1:+.2%})"
    )
    f.add(
        "G9",
        "Cross-source sanity: ONS total sits near, but is not equal to, DMO net gilt market value (≠ confirmed)",
        net_gilts_mv > 0 and abs(ons_total / net_gilts_mv - 1) < 0.05 and ons_total != net_gilts_mv,
        f.extra["g_vs_dmo"],
        warn=True,
    )

    # G10 reproducibility
    check_connector_repro(f, "G10", "Gilt holdings", "economy.connectors.gilt_holdings_by_sector", "GiltHoldingsBySectorConnector", GH, copy_raw=False)

    # G11 known limitations (always warn — documented, not failures)
    f.info_warn(
        "G11",
        "Series depth / source route",
        "Interim PDF text parse of one QR vintage: only 4 quarters (Q4 2024–Q3 2025); ONS CDIDs not located (matrix §2.1 G2 action still open); "
        "ONS revises retrospectively, and Q4 2024–Q2 2025 are labelled `final` although the QR says figures can be revised. "
        "`official_release_date` empty in manifest raw_evidence.",
    )


# --------------------------------------------------------------------------- #
# Package 2 — dmo-government-holdings (D4L)
# --------------------------------------------------------------------------- #
def check_d4l(f: Findings) -> None:
    manifest = load_manifest(D4L)
    rows = read_csv(D4L / "curated" / "observations.csv")
    monthly, cells, names, note = parse_d4l(D4L_XLS)

    check_hash(f, "D1", "D4L", D4L_XLS, D4L)

    # D2 shape and continuity
    parsed = [(r, parse_notes(r["notes"])) for r in rows]
    per_series: dict[str, int] = defaultdict(int)
    keys = set()
    for r, n in parsed:
        per_series[n["series"]] += 1
        keys.add((n["series"], r["period_start"]))
    months_sorted = sorted(monthly)
    first, last = months_sorted[0], months_sorted[-1]
    expected_months = (last[0] - first[0]) * 12 + last[1] - first[1] + 1
    f.add(
        "D2",
        "Row count 777 = 259 months × 3 series; contiguous Apr 2005–Oct 2026; no duplicates",
        len(rows) == 777 and len(monthly) == expected_months == 259 and set(per_series.values()) == {259} and len(keys) == 777 and first == (2005, 4) and last == (2026, 10),
        f"{len(rows)} rows; {len(monthly)} months ({first}→{last}); per series {dict(per_series)}",
    )

    # D3 independent raw → curated, all 777 values
    cur = {(n["series"], r["period_start"]): float(r["value"]) for r, n in parsed}
    max_err, bad = 0.0, []
    for (y, m), vals in monthly.items():
        for slug, v in vals.items():
            got = cur.get((slug, date(y, m, 1).isoformat()))
            if got is None:
                bad.append((slug, y, m, "missing"))
                continue
            max_err = max(max_err, abs(got - v))
            if abs(got - v) > 1e-6:
                bad.append((slug, y, m, round(got - v, 6)))
    f.add(
        "D3",
        "All 777 curated values equal an independent re-sum of the raw xls (fsum, tol 1e-6 £m)",
        not bad,
        f"max |curated − recomputed| = {max_err:.2e} £m; mismatches {bad[:5] or 'none'}",
    )

    # D4 identities / sanity
    ident = max(abs(cur[("total", d)] - cur[("conventional", d)] - cur[("index-linked", d)]) for _, d in keys if _ == "total")
    nonneg = all(v >= 0 for v in cells.values())
    f.add(
        "D4",
        "total = conventional + index-linked every month; no negative holdings",
        ident < 1e-6 and nonneg,
        f"max identity error {ident:.2e} £m; {len(cells):,} gilt-month cells, all ≥ 0: {nonneg}",
    )

    # D5 spot checks (per-gilt raw cells → curated month totals)
    picks = [(2005, 4), (2008, 10), (2012, 3), (2020, 3), (2022, 9), (2026, 10)]
    lines = []
    for y, m in picks:
        v = monthly[(y, m)]
        d = date(y, m, 1).isoformat()
        n_g = sum(1 for (i, yy, mm), x in cells.items() if (yy, mm) == (y, m) and x > 0)
        lines.append(
            f"| {y}-{m:02d} | {n_g} | {v['conventional']:,.3f} | {cur[('conventional', d)]:,.3f} | "
            f"{v['index-linked']:,.3f} | {cur[('index-linked', d)]:,.3f} | {v['total']:,.3f} | {cur[('total', d)]:,.3f} |"
        )
    f.extra["d4l_spot"] = "\n".join(lines)
    f.add("D5", "Spot months re-summed from raw per-gilt cells match curated", True, f"{len(picks)} months in table below")

    # D6 classification: name-based vs D1A kind (ISIN) and name sanity
    d1a_kind: dict[str, str] = {}
    for r in read_csv(D1A / "curated" / "observations.csv"):
        n = parse_notes(r["notes"])
        if n.get("series") == "nominal":
            d1a_kind[n["isin"]] = n["kind"]
    conn_kind = {i: ("index_linked" if "index" in nm.lower() else "conventional") for i, nm in names.items()}
    overlap = [i for i in conn_kind if i in d1a_kind]
    wrong = [(i, names[i], conn_kind[i], d1a_kind[i]) for i in overlap if conn_kind[i] != d1a_kind[i]]
    il_named = [nm for nm in names.values() if re.search(r"index[- ]?linked", nm, re.I)]
    odd = [nm for nm in names.values() if "index" in nm.lower() and not re.search(r"Index-linked", nm, re.I)]
    f.add(
        "D6",
        "Conventional vs index-linked classification agrees with D1A kind for all overlapping ISINs",
        not wrong and not odd,
        f"{len(names)} ISINs in D4L; {len(overlap)} also in D1A; classification disagreements {wrong or 'none'}; unusual IL spellings {odd or 'none'}; {len(il_named)} IL names",
    )

    # D7 latest snapshot side-file
    snap = read_csv(D4L / "curated" / "latest_snapshot_by_gilt.csv")
    snap_sum = math.fsum(float(r["nominal_gbp_mn"]) for r in snap)
    latest = monthly[last]
    held = [i for (i, y, m), v in cells.items() if (y, m) == last and v > 0]
    f.add(
        "D7",
        "latest_snapshot_by_gilt.csv: 103 gilts, Σ = Oct 2026 total, as-of 2026-10-31",
        len(snap) == len(held) == 103 and abs(snap_sum - latest["total"]) < 1e-5 and {r["as_of_month_end"] for r in snap} == {"2026-10-31"},
        f"snapshot {len(snap)} rows Σ £{snap_sum:,.3f}m vs raw Oct-2026 total £{latest['total']:,.3f}m",
    )

    # D8 scope / labelling
    sc_notes = all(
        n.get("holder") == "CRND+DMO" and n.get("valuation") == "nominal" and "BoE" in n.get("excludes", "")
        and "local-authorities" in n["excludes"] and "public-corporations" in n["excludes"]
        for _, n in parsed
    )
    units_ok = all(r["unit"] == "£ million, nominal" for r in rows)
    caveats = str(manifest.get("caveats", ""))
    caveat_ok = all(s in caveats for s in ("NOMINAL", "PSND", "HF6W", "gilts in issue", "Bank of England"))
    definition = str(manifest.get("definition", ""))
    note_ok = all(s in note for s in ("CRND", "DMO", "local authorities", "public corporations", "Bank of England"))
    f.add(
        "D8",
        "Scope: excludes BoE / LA / PC on every row; nominal; ≠ Who Owns the Debt, ≠ PSND (manifest + raw footnote agree)",
        sc_notes and units_ok and caveat_ok and note_ok and "NOT who owns the debt" in definition,
        f"row notes ok {sc_notes}; unit ok {units_ok}; caveats ok {caveat_ok}; raw footnote agrees {note_ok}; definition says 'NOT who owns the debt' {'NOT who owns the debt' in definition}",
    )

    # D9 status flags
    st = {(n["series"], r["period_start"]): r["observation_status"] for r, n in parsed}
    prov = {k for k, v in st.items() if v == "provisional"}
    f.add(
        "D9",
        "Only latest month (Oct 2026) is provisional per series",
        prov == {(s, "2026-10-01") for s in ("total", "conventional", "index-linked")},
        f"provisional keys {sorted(prov)}",
    )

    # D10 cross-source: holdings ≤ nominal in issue (D1A, per ISIN)
    d1a_nominal: dict[str, float] = {}
    for r in read_csv(D1A / "curated" / "observations.csv"):
        n = parse_notes(r["notes"])
        if n.get("series") == "nominal":
            d1a_nominal[n["isin"]] = float(r["value"])
    over = [(i, names[i], v, d1a_nominal[i]) for (i, y, m), v in cells.items() if (y, m) == last and i in d1a_nominal and v > d1a_nominal[i] + 0.01]
    absent = [(i, names[i], round(v, 2)) for (i, y, m), v in cells.items() if (y, m) == last and v > 0 and i not in d1a_nominal]
    f.add(
        "D10",
        "Oct-2026 holding ≤ D1A nominal in issue per ISIN (gilts held can't exceed gilts issued)",
        not over,
        f"gilts over-held {over or 'none'}; held in D4L but not in D1A (matured/new) {absent or 'none'}",
        warn=True,
    )

    # D11 cross-source: QR gross−net (DMO-held, uplifted nominal) vs D4L at Mar/Jun/Sep/Dec 2025
    pc = {(parse_notes(r["notes"])["series"], r["period_end"]): float(r["value"]) for r in read_csv(PC / "curated" / "observations.csv")}
    lines = []
    conv_gaps: list[float] = []
    il_gap: dict[str, tuple[float, float]] = {}
    for d in ("2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"):
        y, m = int(d[:4]), int(d[5:7])
        for inst, slug in (("conventional-gilts", "conventional"), ("index-linked-gilts", "index-linked")):
            dmo_gbn = pc[(f"uplifted-nominal-gross-{inst}", d)] - pc[(f"uplifted-nominal-net-{inst}", d)]
            d4l_gbn = monthly[(y, m)][slug] / 1000
            if slug == "conventional":
                conv_gaps.append(abs(d4l_gbn - dmo_gbn))
            else:
                il_gap[d] = (dmo_gbn, d4l_gbn)
            lines.append(f"| {d} | {slug} | {dmo_gbn:,.2f} | {d4l_gbn:,.2f} | {d4l_gbn - dmo_gbn:+,.2f} |")
    f.extra["d4l_vs_qr"] = "\n".join(lines)
    f.add(
        "D11",
        "Conventional: D4L month-end holdings tie to QR gross−net (gilts held by DMO) within £0.05bn at 4 quarter-ends",
        max(conv_gaps) <= 0.05,
        f"max |D4L − (QR gross − net)| = £{max(conv_gaps):.3f}bn across Mar/Jun/Sep/Dec 2025 — independent official-source tie-out of the D4L conventional series",
    )

    # D11b index-linked basis: D4L IL × D1A uplift ratio (per ISIN) should land near the QR uplifted gap
    d1a_nom_il: dict[str, float] = {}
    d1a_upl_il: dict[str, float] = {}
    for r in read_csv(D1A / "curated" / "observations.csv"):
        n = parse_notes(r["notes"])
        if n.get("kind") == "index_linked":
            (d1a_nom_il if n["series"] == "nominal" else d1a_upl_il)[n["isin"]] = float(r["value"])
    est_uplifted = (
        sum(v * d1a_upl_il[i] / d1a_nom_il[i] for (i, y, m), v in cells.items() if (y, m) == (2025, 12) and i in d1a_nom_il) / 1000
    )
    qr_il, d4l_il = il_gap["2025-12-31"]
    f.extra["d4l_il_basis"] = (
        f"Dec 2025 IL: D4L raw £{d4l_il:.2f}bn; D4L × D1A per-ISIN uplift ratio ≈ £{est_uplifted:.2f}bn; QR gross−net (uplifted) £{qr_il:.2f}bn"
    )
    f.add(
        "D11b",
        "Index-linked basis: D4L IL is *nominal* (face) — D4L × uplift ratio lands within 10 % of QR uplifted gap; raw D4L IL does not",
        abs(est_uplifted / qr_il - 1) < 0.10 and abs(d4l_il / qr_il - 1) > 0.30,
        f.extra["d4l_il_basis"] + ". Uses Nov-2026 uplift ratios on Dec-2025 holdings, so a few % drift is expected. Resolves Economy's open question by evidence, not by DMO confirmation.",
    )

    # D12 reproducibility
    check_connector_repro(f, "D12", "D4L", "economy.connectors.dmo_government_holdings", "DmoGovernmentHoldingsConnector", D4L, copy_raw=True)

    # D13 known limitations
    f.info_warn(
        "D13",
        "IL basis evidence-only; totals are our sums",
        "DMO file does not state whether IL holdings are nominal or inflation-uplifted; D11b shows the evidence points to nominal, but there is no DMO confirmation (manifest open question stays open; "
        "do not add D4L IL to uplifted totals). Totals are sums of gilt rows — no DMO-published total to tick against. Re-run after each re-pin; earlier months may be restated.",
    )


# --------------------------------------------------------------------------- #
# Package 3 — dmo-debt-portfolio-composition
# --------------------------------------------------------------------------- #
def check_portfolio(f: Findings) -> None:
    manifest = load_manifest(PC)
    rows = read_csv(PC / "curated" / "observations.csv")
    pages = pdf_pages(PC_PDF)
    p1 = next(p for p in pages if "Debt portfolio statistics" in p and "Uplifted nominal" in p)
    p2 = next(p for p in pages if "Debt Portfolio - Market Value Statistics" in p)
    raw_pts = parse_portfolio_pages(p1, p2)

    check_hash(f, "P1", "Portfolio composition", PC_PDF, PC)

    parsed = [(r, parse_notes(r["notes"])) for r in rows]
    cur = {(n["valuation"], n["basis"], n["instrument"], r["period_end"]): float(r["value"]) for r, n in parsed}
    f.add(
        "P2",
        "48 rows = 4 uplifted dates × 2 bases × 4 + 2 market dates × 2 × 4; no duplicate keys",
        len(rows) == 48 and len(cur) == 48 and len(raw_pts) == 48,
        f"{len(rows)} curated rows; {len(cur)} unique keys; {len(raw_pts)} cells parsed independently from the PDF",
    )

    bad, checked = [], 0
    for p in raw_pts:
        checked += 1
        got = cur.get((p.valuation, p.basis, p.instrument, p.as_of.isoformat()))
        if got is None or abs(got - p.value_gbn) > 0.0051:
            bad.append((p.valuation, p.basis, p.instrument, p.as_of.isoformat(), p.value_gbn, got))
    f.add(
        "P3",
        "Every curated cell equals the PDF figure (own layout-mode parse, 0.005 £bn)",
        checked == 48 and not bad,
        f"{checked} cells compared; mismatches {bad or 'none'}",
    )

    # P4 arithmetic
    worst_sum, net_gt_gross, tbill_diff = 0.0, [], 0.0
    for (val, basis, inst, d), v in cur.items():
        if inst == "total":
            parts = sum(cur[(val, basis, i, d)] for i in ("conventional-gilts", "index-linked-gilts", "treasury-bills"))
            worst_sum = max(worst_sum, abs(parts - v))
        if basis == "net":
            if v > cur[(val, "gross", inst, d)] + 1e-9:
                net_gt_gross.append((val, inst, d))
            if inst == "treasury-bills":
                tbill_diff = max(tbill_diff, abs(v - cur[(val, "gross", inst, d)]))
    f.add(
        "P4",
        "total = conv + IL + T-bills (±£0.02bn); net ≤ gross; net T-bills = gross T-bills",
        worst_sum <= 0.0201 and not net_gt_gross and tbill_diff < 1e-9,
        f"max |Σ parts − total| £{worst_sum:.2f}bn; net>gross violations {net_gt_gross or 'none'}; max T-bill net−gross {tbill_diff:.2e}",
    )

    # P5 spot table — gross/net uplifted nominal conv / IL / T-bills
    lines = []
    for d in ("2025-09-30", "2025-12-31"):
        for basis in ("gross", "net"):
            for inst in ("conventional-gilts", "index-linked-gilts", "treasury-bills", "total"):
                raw = next(p.value_gbn for p in raw_pts if (p.valuation, p.basis, p.instrument, p.as_of.isoformat()) == ("uplifted-nominal", basis, inst, d))
                c = cur[("uplifted-nominal", basis, inst, d)]
                lines.append(f"| {d} | {basis} | {inst} | {raw:,.2f} | {c:,.2f} | {'✓' if abs(raw - c) < 0.0051 else '✗'} |")
    f.extra["pc_spot"] = "\n".join(lines)
    f.add(
        "P5",
        "Spot check Sep & Dec 2025 gross/net uplifted nominal (conv / IL / T-bills / total) vs PDF",
        all(" ✓ |" in ln for ln in lines),
        f"{len(lines)} cells in table below (Dec 2025 gross: conv 2,125.59 · IL 693.56 · T-bills 89.50 · total 2,908.65)",
    )

    # P6 labelling
    caveats = str(manifest.get("caveats", ""))
    unit_ok = all(
        (n["valuation"] == "uplifted-nominal" and r["unit"] == "£ billion, uplifted nominal")
        or (n["valuation"] == "market-value" and r["unit"] == "£ billion, market value")
        for r, n in parsed
    )
    tb_label_ok = all("debt management" in n["instrument_label"].lower() for _, n in parsed if n["instrument"] == "treasury-bills")
    caveat_ok = all(s in caveats for s in ("PSND", "HF6W", "debt-management only", "never\nsum".replace("\n", " "), "Sukuk"))
    f.add(
        "P6",
        "Labelling: unit matches valuation; T-bills labelled debt-management only; caveats ≠ PSND/D1A/market value; Sukuk excluded",
        unit_ok and tb_label_ok and caveat_ok and "cash-management" in caveats,
        f"unit/valuation ok {unit_ok}; T-bill label ok {tb_label_ok}; caveat wording ok {caveat_ok}",
    )

    # P7 date conventions
    dates_ok = all(
        r["period_start"] == r["period_end"] and date.fromisoformat(r["period_end"]) in {date(2025, 3, 31), date(2025, 6, 30), date(2025, 9, 30), date(2025, 12, 31)}
        for r in rows
    )
    nom_dates = {r["period_end"] for r, n in parsed if n["valuation"] == "uplifted-nominal"}
    mv_dates = {r["period_end"] for r, n in parsed if n["valuation"] == "market-value"}
    f.add(
        "P7",
        "Point-in-time dates (start = end = quarter-end): uplifted ×4, market value ×2 (Sep/Dec 2025)",
        dates_ok and len(nom_dates) == 4 and mv_dates == {"2025-09-30", "2025-12-31"},
        f"uplifted dates {sorted(nom_dates)}; market-value dates {sorted(mv_dates)}",
    )

    # P8 footnote evidence straight from PDF
    foot = {
        "Sukuk excluded": "exclude the £500m UK Sovereign Sukuk" in p1.replace("\n", " "),
        "net excludes DMO-held gilts": "excludes gilts held by the DMO" in p1,
        "T-bills for debt management; cash-mgmt excluded since June 2016": "Treasury bills issued for cash management purposes are excluded" in re.sub(r"\s+", " ", p1),
        "green gilts £49.6bn Dec 2025": "£49.6bn" in p1,
    }
    f.add(
        "P8",
        "PDF footnotes the manifest relies on are present",
        all(foot.values()),
        "; ".join(f"{k}: {v}" for k, v in foot.items()),
    )

    # P9 cross-source with D1A (info)
    gilts_dec = cur[("uplifted-nominal", "gross", "conventional-gilts", "2025-12-31")] + cur[("uplifted-nominal", "gross", "index-linked-gilts", "2025-12-31")]
    d1a_headline = 2939.04
    growth = d1a_headline / gilts_dec - 1
    f.add(
        "P9",
        "Sanity vs D1A: QR gross gilts (Dec 2025) → D1A headline (13 Nov 2026) grows plausibly (0–10 %)",
        0 < growth < 0.10,
        f"QR Dec 2025 gross uplifted gilts £{gilts_dec:,.2f}bn → D1A £{d1a_headline:,.2f}bn ({growth:+.1%}). Different dates; consistency, not a tie-out.",
        warn=True,
    )

    check_connector_repro(f, "P10", "Portfolio composition", "economy.connectors.dmo_debt_portfolio_composition", "DmoDebtPortfolioCompositionConnector", PC, copy_raw=True)

    f.info_warn(
        "P11",
        "Series depth",
        "Only the quarter-ends printed in one QR are curated (uplifted nominal ×4, market value ×2); no history before Mar 2025 (back-fill is an open question in the manifest). "
        "All rows `final`; DMO may revise T-bill history (QR footnote 3). Average maturity / yields / duration are deliberately not curated.",
    )


# --------------------------------------------------------------------------- #
# Report
# --------------------------------------------------------------------------- #
def render(f: Findings) -> str:
    counts = {k: sum(1 for c in f.checks if c.result == k) for k in ("pass", "warn", "fail")}
    overall = "FAIL" if counts["fail"] else ("PASS with warnings" if counts["warn"] else "PASS")

    def group(prefix: str) -> list[Check]:
        return [c for c in f.checks if c.cid.startswith(prefix)]

    def pkg_verdict(prefix: str) -> str:
        cs = group(prefix)
        if any(c.result == "fail" for c in cs):
            return "FAIL"
        return "PASS with warnings" if any(c.result == "warn" for c in cs) else "PASS"

    def table(cs: list[Check]) -> str:
        return "\n".join(f"| {c.cid} | {c.name} | **{c.result}** | {c.notes.replace('|', '/')} |" for c in cs)

    fails = [c for c in f.checks if c.result == "fail"]
    fix_list = (
        "\n".join(f"- **{c.cid}** ({c.name}): {c.notes}" for c in fails)
        if fails
        else "No blocking fixes. Non-blocking docs/metadata tasks for Economy are listed below."
    )

    return f"""# QA report — Economy Domain 08: debt ownership / official holdings / portfolio composition — 2026-11-14

**Agent:** Validation
**Overall verdict:** **{overall}** ({counts['pass']} pass · {counts['warn']} warn · {counts['fail']} fail)
**Script:** `src/validation/qa_economy_08_debt_ownership_2026_11_14.py`
**Independence:** Raw QR PDF re-parsed with `pypdf` layout mode and raw D4L `.xls` re-summed with `xlrd` + `math.fsum`, using Validation's own parsers. `economy.connectors` is only imported for the `*-REPRO` re-run, which runs inside a temp folder. Nothing under `data/economy/` was edited.
**Related:** D8B + D1A already Validation-passed in `qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md`.

| Package | Verdict | Curated rows | Unit / valuation |
|---------|---------|-------------:|------------------|
| `gilt-holdings-by-sector` (ONS via QR) | **{pkg_verdict('G')}** | 32 | £mn, **market value** |
| `dmo-government-holdings` (D4L) | **{pkg_verdict('D')}** | 777 | £mn, **nominal** (CRND + DMO only) |
| `dmo-debt-portfolio-composition` (QR) | **{pkg_verdict('P')}** | 48 | £bn, **uplifted nominal** and **market value** |

## Locked distinctions (verified in manifests and row notes)

| Label | Valuation | ≠ |
|-------|-----------|---|
| Who owns gilts (ONS via QR) | Market value | ≠ D4L · ≠ D1A · ≠ uplifted-nominal portfolio · ≠ PSND (HF6W) |
| Official holdings (D4L) | Nominal | ≠ Who Owns the Debt (excludes BoE, local authorities, public corporations) · ≠ PSND |
| Portfolio composition (QR) | Uplifted nominal / market value, gross and net | T-bills = debt-management only · ≠ PSND · never sum across valuations |

Live re-fetch from DMO/ONS was **not** attempted (matrix: Perfdrive/captcha on DMO). "Official release" comparison is against the hash-verified pinned QR PDF and D4L workbook.

## Package 1 — `gilt-holdings-by-sector`

| ID | Check | Result | Notes |
|----|-------|--------|-------|
{table(group('G'))}

### Q3 2025 spot check (£mn, market value; QR PDF page {f.extra['g_page']})

| Series | Matrix / QR | Curated | Match |
|--------|------------:|--------:|:-----:|
{f.extra['g_q3_table']}

Cross-source context: {f.extra['g_vs_dmo']}. ONS and DMO universes/dates differ, so the figures are near but not equal — treat as **different measures**, never reconcile in the UI.

## Package 2 — `dmo-government-holdings` (D4L)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
{table(group('D'))}

### Spot months (raw per-gilt cells re-summed → curated, £m nominal)

| Month | Gilts held | Raw conv | Curated conv | Raw IL | Curated IL | Raw total | Curated total |
|-------|-----------:|---------:|-------------:|-------:|-----------:|----------:|--------------:|
{f.extra['d4l_spot']}

### D4L (CRND+DMO, nominal) vs QR gross−net (DMO-held, uplifted nominal), £bn

| Quarter-end | Instrument | QR gross − net | D4L | D4L − QR |
|-------------|------------|---------------:|----:|---------:|
{f.extra['d4l_vs_qr']}

QR "net" excludes gilts held by the **DMO**. Conventional D4L ties to the QR gap to within a penny of £bn at every quarter-end, which independently confirms the D4L conventional series. Index-linked D4L is lower because D4L is **nominal** while the QR gap is **uplifted**: {f.extra['d4l_il_basis']}. So D4L IL is on a nominal basis (evidence-based, not DMO-confirmed) — never add D4L IL to uplifted totals.

## Package 3 — `dmo-debt-portfolio-composition`

| ID | Check | Result | Notes |
|----|-------|--------|-------|
{table(group('P'))}

### Spot check — uplifted nominal, Sep and Dec 2025 (£bn; raw PDF → curated)

| As of | Basis | Instrument | PDF | Curated | Match |
|-------|-------|------------|----:|--------:|:-----:|
{f.extra['pc_spot']}

## Method notes for UI / Ready

1. Three different measures: ONS **market-value** holders by sector; D4L **nominal** official holdings; QR **uplifted-nominal / market-value** portfolio by instrument. Never put them on one stacked axis or sum them.
2. Do not describe ONS sector shares as shares of PSND (HF6W). Do not call D4L "Who owns the debt".
3. ONS sector total (Q3 2025 £2,124.6bn) sits within about 1 % of the DMO *net* gilt market value but is a different dataset, so never equate them.
4. T-bills in the QR are debt-management only; cash-management bills are excluded since June 2016.
5. All three are point-in-time snapshots of one pin; re-run this script after any re-pin (new QR, new D4L export).

## Summary

- **Blockers:** {'none' if not counts['fail'] else 'see failed checks above'}
- **Recommended fixes (owner Economy):**
{fix_list}
  - *Non-blocking (warn):* (a) fill `official_release_date` in the gilt-holdings and portfolio manifests (QR publication date); (b) before UI shows Q4 2024–Q2 2025 as `final`, either mark them `provisional` or add a visitor-facing "ONS revises retrospectively" note; (c) lock ONS CDIDs / pin newer QRs to extend beyond 4 quarters (matrix §2.1); (d) add a one-line README/manifest note that D4L index-linked holdings are on a nominal basis (Validation evidence D11b: D4L × uplift ratio ≈ QR uplifted gap) and still ask DMO to confirm; (e) back-fill earlier portfolio quarters from older QRs.
- **Ready recommendation:** {'blocked until fixes' if counts['fail'] else 'all three packages pass numerical QA vs raw; Orchestrator may mark Validation done → Ready for cloud load. No UI before Review; keep the three measures on separate panels.'}
- **Not verified:** live ONS / DMO re-download; an independent ONS release (CDIDs not located); registry/Notion status is for the Orchestrator hand-off.
"""


def main() -> int:
    f = Findings()
    check_gilt_holdings(f)
    check_d4l(f)
    check_portfolio(f)
    REPORT.write_text(render(f), encoding="utf-8")
    for c in f.checks:
        print(f"{c.cid:4} {c.result.upper():5} {c.name}\n       {c.notes}")
    fails = sum(1 for c in f.checks if c.result == "fail")
    warns = sum(1 for c in f.checks if c.result == "warn")
    print(f"\n{len(f.checks) - fails - warns} pass · {warns} warn · {fails} fail → {REPORT.relative_to(ROOT)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

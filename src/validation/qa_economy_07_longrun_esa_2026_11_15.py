"""Independent QA for Economy 07 long-run + ESA pins — EC-VAL-07D / EC-VAL-07E.

Approach (plain language):

1. Hash the pinned workbooks and compare them to the manifests.
2. Read PSS Table 4.2 (and 4.3 as a guard) and the three ESA Table 11
   workbooks with openpyxl. Do not import the Economy connectors, and do
   not rewrite curated files.
3. Recompute the published identities from those cells, then check every
   curated row against the same cells.
4. Confirm the OSCAR memo exists and that no OSCAR package was curated.

Run::

    uv run python -m validation.qa_economy_07_longrun_esa_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_07_longrun_esa_2026-11-15.md"
LR_BASE = ROOT / "data" / "economy" / "tes-by-function-long-run"
ESA_BASE = ROOT / "data" / "economy" / "esa-gg-expenditure-by-function"
TES_M_BASE = ROOT / "data" / "economy" / "tes-by-function"
OSCAR_MEMO = ROOT / "docs" / "economy-07-oscar-decision-memo.md"

TES_YEARS: tuple[str, ...] = tuple(f"{y}-{(y + 1) % 100:02d}" for y in range(2003, 2026))
ESA_YEARS: tuple[int, ...] = tuple(range(1995, 2025))
FIRST_ESTIMATE_YEAR = "2025-26"
PLAN_START_YEAR = 2026

EXPECTED_CH4_SHA = "573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c"
EXPECTED_ESA_SHA = {
    "esatable11generalgovernment.xlsx": "545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09",
    "esatable11centralgovernment.xlsx": "1de1e5d91531bea990826cf7ed28ff16db7ac7c876621fc264ab2e1930306105",
    "esatable11localgovernment.xlsx": "d1d033a590e32132828375a401cebf260ea774e24664af3285ec5203ddef1f04",
}

LR_UNIT = "£ billion, nominal, financial year"
LR_SOURCE_VERSION = "PSS July 2026 (updated 2026-07-29)"
ESA_UNIT = "£ million, nominal, calendar year"
ESA_SOURCE_VERSION = "ONS ESA Table 11 general government (published 2026-04-23)"
GEO_CODE = "K02000001"

# Kickoff spots (tenths of £ billion for Table 4.2; £ million for ESA).
SPOT_LR = {
    "cofog-07-health": 2424,
    "cofog-10-social-protection": 3863,
    "tes-total": 11665,
    "accounting-adjustments": 1236,
    "table-tme": 12900,
    "eu-transactions": -14,
}
SPOT_LR_YEAR = "2024-25"
SPOT_43_HEALTH = 2508
SPOT_TES_M = {"cofog-07-health": 242_429, "tes-total": 1_166_452, "accounting-adjustments": 123_560, "table-tme": 1_290_012}
SPOT_ESA_YEAR = 2024
SPOT_ESA = {"_T": 1_330_532, "GF07": 253_191, "GF09": 141_118, "GF10": 458_500}
SPOT_ESA_SIBLINGS = {"central": 1_227_604, "local": 268_424}
MAX_LEAF_TENTHS = 2
MAX_BRIDGE_TENTHS = 1
EXPECTED_LR_ROWS = 322
EXPECTED_ESA_ROWS = 330
EXPECTED_LR_OF_WHICH = 8

FUNCTIONS: tuple[tuple[int, str, str, str], ...] = (
    (1, "cofog-01-general-public-services", "GF01", "General public services"),
    (2, "cofog-02-defence", "GF02", "Defence"),
    (3, "cofog-03-public-order-and-safety", "GF03", "Public order and safety"),
    (4, "cofog-04-economic-affairs", "GF04", "Economic affairs"),
    (5, "cofog-05-environment-protection", "GF05", "Environment protection"),
    (6, "cofog-06-housing-and-community-amenities", "GF06", "Housing and community amenities"),
    (7, "cofog-07-health", "GF07", "Health"),
    (8, "cofog-08-recreation-culture-and-religion", "GF08", "Recreation, culture and religion"),
    (9, "cofog-09-education", "GF09", "Education"),
    (10, "cofog-10-social-protection", "GF10", "Social protection"),
)
FUNCTION_BY_NUMBER = {n: (s, c, l) for n, s, c, l in FUNCTIONS}
COFOG_CODES = tuple(c for _, _, c, _ in FUNCTIONS)
LR_SERIES = tuple(s for _, s, _, _ in FUNCTIONS) + ("eu-transactions", "tes-total", "accounting-adjustments", "table-tme")

_FY_CELL = re.compile(r"^20\d{2}-\d{2}$")
_FY_LABEL = re.compile(r"^(20\d{2})-(\d{2})$")
_FOOTNOTE = re.compile(r"(?:\s*\(\d+\))+\s*$")
_FUNCTION = re.compile(r"^(\d+)\.\s+(.*)$")
_ESA_ROW = re.compile(r"^(_T|GF\d{2,})\s*-\s*(.*)$")
_RANK = {"pass": 0, "warn": 1, "fail": 2}
CHECKS = ("L1", "L2", "L3", "L4", "E1", "E2", "E3", "E4", "E5", "OSCAR", "C-extra")

Key = tuple[str, str]


@dataclass
class Curated:
    key: Key
    amount: int
    status: str
    period_start: str
    period_end: str
    geography_code: str
    geography_label: str
    unit: str
    indicator_id: str
    source_version: str
    notes: dict[str, str]


@dataclass
class Gap:
    fy: str
    leaf: int
    tes: int
    adj: int
    tme: int

    @property
    def leaf_gap(self) -> int:
        return self.leaf - self.tes

    @property
    def bridge_gap(self) -> int:
        return self.tes + self.adj - self.tme


@dataclass
class Bundle:
    ch4_sha: str = ""
    esa_sha: dict[str, str] = field(default_factory=dict)
    lr_cells: dict[Key, int] = field(default_factory=dict)
    lr_43_health: int | None = None
    lr_43_equal_2025: int = 0
    lr_43_compared: int = 0
    lr_of_which: int = 0
    gaps: list[Gap] = field(default_factory=list)
    esa_cells: dict[tuple[str, int], int] = field(default_factory=dict)  # (cofog, year) -> OTE
    esa_sub_skipped: int = 0
    esa_cover: str = ""
    esa_sheet_titles: dict[int, str] = field(default_factory=dict)
    esa_siblings: dict[str, int] = field(default_factory=dict)
    esa_sibling_cover: dict[str, str] = field(default_factory=dict)
    lr_rows: int = 0
    esa_rows: int = 0
    tes_m_spots: dict[str, int] = field(default_factory=dict)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fold(text: str) -> str:
    return text.casefold().replace("−", "-").replace("–", "-")


def norm(raw: object) -> str:
    text = str(raw or "").replace("\xa0", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def strip_footnote(label: str) -> str:
    return _FOOTNOTE.sub("", label).strip()


def as_number(raw: object, context: str) -> float:
    if isinstance(raw, str):
        text = raw.strip().replace(",", "")
        if text in {"", "-", "..", "…"}:
            raise ValueError(f"Missing value ({context})")
        return float(text)
    if isinstance(raw, bool) or raw is None:
        raise ValueError(f"Missing value ({context})")
    if isinstance(raw, (int, float)):
        return float(raw)
    raise ValueError(f"Unexpected cell {raw!r} ({context})")


def as_million(raw: object, context: str) -> int:
    value = as_number(raw, context)
    if abs(value - round(value)) > 1e-6:
        raise ValueError(f"Expected whole £ million, got {raw!r} ({context})")
    return int(round(value))


def as_tenths(raw: object, context: str) -> int:
    value = as_number(raw, context) * 10
    tenths = round(value)
    if abs(value - tenths) > 1e-4:
        raise ValueError(f"Expected one decimal place, got {raw!r} ({context})")
    return int(tenths)


def fmt_tenths(t: int) -> str:
    sign = "-" if t < 0 else ""
    whole, frac = divmod(abs(t), 10)
    return f"{sign}{whole:,}.{frac}"


def fmt_m(v: int) -> str:
    return f"{v:,}"


def fy_bounds(fy: str) -> tuple[str, str]:
    m = _FY_LABEL.fullmatch(fy)
    if not m or (int(m.group(1)) + 1) % 100 != int(m.group(2)):
        raise ValueError(f"Bad financial year {fy!r}")
    y = int(m.group(1))
    return f"{y:04d}-04-01", f"{y + 1:04d}-03-31"


def load_sheet(path: Path, name: str) -> list[tuple[object, ...]]:
    wb = load_workbook(path, data_only=True, read_only=True)
    try:
        if name not in wb.sheetnames:
            raise ValueError(f"{path.name} has no sheet {name!r}")
        return [tuple(r) for r in wb[name].iter_rows(values_only=True)]
    finally:
        wb.close()


def parse_table_4(path: Path, sheet: str) -> tuple[dict[Key, int], int]:
    """Read a Chapter 4 function sheet. Returns cells (tenths) and the of-which count."""
    rows = load_sheet(path, sheet)
    header = None
    for row in rows:
        hits = [(i, norm(c)) for i, c in enumerate(row) if _FY_CELL.fullmatch(norm(c))]
        if hits:
            labels = tuple(l for _, l in hits)
            if labels != TES_YEARS:
                raise ValueError(f"{sheet} year header {labels[0]}..{labels[-1]} ({len(labels)})")
            header = (hits[0][0] - 1, tuple(i for i, _ in hits))
            break
    if header is None:
        raise ValueError(f"{sheet}: no year header")
    label_col, year_cols = header
    cells: dict[Key, int] = {}
    of_which = 0
    for row in rows:
        if len(row) <= label_col:
            continue
        label = norm(row[label_col])
        if not label:
            continue
        key = strip_footnote(label).casefold()
        if key.startswith("of which"):
            of_which += 1
            continue
        series = None
        if key == "eu transactions":
            series = "eu-transactions"
        elif key == "public sector expenditure on services":
            series = "tes-total"
        elif key == "accounting adjustments":
            series = "accounting-adjustments"
        elif key == "total managed expenditure":
            series = "table-tme"
        else:
            fm = _FUNCTION.fullmatch(strip_footnote(label))
            if fm:
                n = int(fm.group(1))
                if n not in FUNCTION_BY_NUMBER:
                    raise ValueError(f"{sheet}: unexpected function {label!r}")
                series, _, locked = FUNCTION_BY_NUMBER[n]
                if fm.group(2).casefold() != locked.casefold():
                    raise ValueError(f"{sheet}: function name drift {label!r}")
        if series is None:
            if any(i < len(row) and row[i] not in (None, "") for i in year_cols):
                raise ValueError(f"{sheet}: unrecognised valued row {label!r}")
            continue
        for fy, col in zip(TES_YEARS, year_cols, strict=True):
            if (series, fy) in cells:
                raise ValueError(f"{sheet}: duplicate {series} {fy}")
            cells[(series, fy)] = as_tenths(row[col], f"{sheet} {series} {fy}")
    if {s for s, _ in cells} != set(LR_SERIES) or len(cells) != len(LR_SERIES) * len(TES_YEARS):
        raise ValueError(f"{sheet}: series/cell mismatch ({len(cells)})")
    return cells, of_which


def parse_esa(path: Path) -> tuple[dict[tuple[str, int], int], int, str, dict[int, str]]:
    """Read ESA Table 11: level-1 + total OTE per calendar year, sub-function count, coversheet, titles."""
    wb = load_workbook(path, data_only=True, read_only=True)
    try:
        names = wb.sheetnames
        cover = " ".join(norm(c) for r in wb[names[0]].iter_rows(max_row=6, values_only=True) for c in r if c)
        cells: dict[tuple[str, int], int] = {}
        sub = 0
        titles: dict[int, str] = {}
        for year in ESA_YEARS:
            if str(year) not in names:
                raise ValueError(f"{path.name}: no sheet {year}")
            rows = [tuple(r) for r in wb[str(year)].iter_rows(values_only=True)]
            titles[year] = norm(rows[0][0]) if rows and rows[0] else ""
            ote_col = None
            for row in rows:
                if row and norm(row[0]).casefold() == "transaction":
                    hits = [i for i, c in enumerate(row) if norm(c) == "OTE"]
                    if len(hits) != 1:
                        raise ValueError(f"{path.name} {year}: OTE column hits {hits}")
                    ote_col = hits[0]
                    break
            if ote_col is None:
                raise ValueError(f"{path.name} {year}: no OTE column")
            seen: set[str] = set()
            for row in rows:
                if not row:
                    continue
                m = _ESA_ROW.fullmatch(norm(row[0]))
                if not m:
                    continue
                code = m.group(1)
                if code == "_T" or code in COFOG_CODES:
                    if code in seen:
                        raise ValueError(f"{path.name} {year}: duplicate {code}")
                    seen.add(code)
                    cells[(code, year)] = as_million(row[ote_col], f"{path.name} {year} {code}")
                else:
                    sub += 1
            if seen != set(COFOG_CODES) | {"_T"}:
                raise ValueError(f"{path.name} {year}: rows {sorted(seen)}")
        return cells, sub, cover, titles
    finally:
        wb.close()


def notes_map(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        chunk = part.strip()
        if "=" in chunk:
            k, v = chunk.split("=", 1)
            out.setdefault(k.strip(), v.strip())
    return out


def load_curated(path: Path, *, scale: str, year_key: str) -> list[Curated]:
    parser = as_million if scale == "million" else as_tenths
    rows: list[Curated] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for raw in csv.DictReader(handle):
            n = notes_map(raw.get("notes") or "")
            rows.append(
                Curated(
                    key=(n.get("series", ""), n.get(year_key, "")),
                    amount=parser(raw.get("value"), f"curated {raw.get('period_start')}"),
                    status=(raw.get("observation_status") or "").strip(),
                    period_start=(raw.get("period_start") or "").strip(),
                    period_end=(raw.get("period_end") or "").strip(),
                    geography_code=(raw.get("geography_code") or "").strip(),
                    geography_label=(raw.get("geography_label") or "").strip(),
                    unit=(raw.get("unit") or "").strip(),
                    indicator_id=(raw.get("indicator_id") or "").strip(),
                    source_version=(raw.get("source_version") or "").strip(),
                    notes=n,
                )
            )
    return rows


def manifest_blob(m: Mapping[str, object]) -> str:
    parts = [str(m.get(k) or "") for k in ("definition", "caveats", "transformations", "revision_notes", "status_note", "unit", "geography")]
    parts.append(" ".join(str(i) for i in (m.get("open_questions") or [])))
    return fold("\n".join(parts))


def table(headers: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    rule = "|" + "|".join("---" for _ in headers) + "|"
    return "\n".join([head, rule, *["| " + " | ".join(r) + " |" for r in rows]])


def main() -> None:
    problems: dict[str, list[str]] = {c: [] for c in CHECKS}
    forced: dict[str, str] = {}

    def flag(code: str, message: str, level: str = "fail") -> None:
        problems[code].append(message)
        current = forced.get(code, "pass")
        forced[code] = level if _RANK[level] >= _RANK[current] else current

    b = Bundle()
    lr_manifest = yaml.safe_load((LR_BASE / "manifest.yaml").read_text(encoding="utf-8"))
    esa_manifest = yaml.safe_load((ESA_BASE / "manifest.yaml").read_text(encoding="utf-8"))

    # ---- checksums (L4 / E5) ----
    lr_evidence = lr_manifest.get("raw_evidence") or []
    ch4 = LR_BASE / str(lr_evidence[0]["path"])
    b.ch4_sha = sha256(ch4)
    if b.ch4_sha != EXPECTED_CH4_SHA or b.ch4_sha != str(lr_evidence[0].get("checksum_sha256")):
        flag("L4", f"Chapter 4 sha256 disk={b.ch4_sha[:16]} manifest={str(lr_evidence[0].get('checksum_sha256'))[:16]}")
    esa_paths: dict[str, Path] = {}
    for ev in esa_manifest.get("raw_evidence") or []:
        p = ESA_BASE / str(ev["path"])
        digest = sha256(p)
        b.esa_sha[p.name] = digest
        esa_paths[p.name] = p
        if EXPECTED_ESA_SHA.get(p.name) != digest or str(ev.get("checksum_sha256")) != digest:
            flag("E5", f"{p.name} sha256 disk={digest[:16]} manifest={str(ev.get('checksum_sha256'))[:16]}")
    if set(esa_paths) != set(EXPECTED_ESA_SHA):
        flag("E5", f"ESA raw files {sorted(esa_paths)}")

    # ---- Table 4.2 and 4.3 ----
    try:
        b.lr_cells, b.lr_of_which = parse_table_4(ch4, "4_2")
        cells_43, _ = parse_table_4(ch4, "4_3")
    except ValueError as exc:
        flag("L1", f"Parse failure: {exc}")
        cells_43 = {}
    if b.lr_cells:
        for series, expected in SPOT_LR.items():
            got = b.lr_cells[(series, SPOT_LR_YEAR)]
            if got != expected:
                code = "L3" if series == "eu-transactions" else "L1"
                flag(code, f"Table 4.2 {series} {SPOT_LR_YEAR} is {fmt_tenths(got)}, expected {fmt_tenths(expected)}")
        for fy in TES_YEARS:
            leaf = sum(b.lr_cells[(series, fy)] for _, series, _, _ in FUNCTIONS) + b.lr_cells[("eu-transactions", fy)]
            g = Gap(fy, leaf, b.lr_cells[("tes-total", fy)], b.lr_cells[("accounting-adjustments", fy)], b.lr_cells[("table-tme", fy)])
            b.gaps.append(g)
            if abs(g.leaf_gap) > MAX_LEAF_TENTHS:
                flag("L3", f"{fy} leaf gap {fmt_tenths(g.leaf_gap)} exceeds 0.2")
            if abs(g.bridge_gap) > MAX_BRIDGE_TENTHS:
                flag("L3", f"{fy} bridge gap {fmt_tenths(g.bridge_gap)} exceeds 0.1")
        if b.lr_of_which != EXPECTED_LR_OF_WHICH:
            flag("L3", f"Table 4.2 of-which lines {b.lr_of_which}, expected {EXPECTED_LR_OF_WHICH}")
    if cells_43:
        b.lr_43_health = cells_43[("cofog-07-health", SPOT_LR_YEAR)]
        if b.lr_43_health != SPOT_43_HEALTH:
            flag("L2", f"Table 4.3 Health 2024-25 is {fmt_tenths(b.lr_43_health)}, expected 250.8")
        for s in LR_SERIES:
            b.lr_43_compared += 1
            if cells_43[(s, FIRST_ESTIMATE_YEAR)] == b.lr_cells[(s, FIRST_ESTIMATE_YEAR)]:
                b.lr_43_equal_2025 += 1
            else:
                flag("L2", f"2025-26 {s}: Table 4.2 {fmt_tenths(b.lr_cells[(s, FIRST_ESTIMATE_YEAR)])} != Table 4.3 {fmt_tenths(cells_43[(s, FIRST_ESTIMATE_YEAR)])}")

    # ---- long-run curated ----
    lr_curated = load_curated(LR_BASE / "curated" / "observations.csv", scale="tenth", year_key="fy")
    b.lr_rows = len(lr_curated)
    seen: set[Key] = set()
    for row in lr_curated:
        if row.key in seen:
            flag("L1", f"Duplicate curated {row.key}")
        seen.add(row.key)
        exp = b.lr_cells.get(row.key)
        if exp is None:
            flag("L1", f"Unexpected curated row {row.key}")
            continue
        if row.amount != exp:
            flag("L1", f"{row.key} curated {fmt_tenths(row.amount)} != published {fmt_tenths(exp)}")
        if row.indicator_id != "tes-by-function-long-run":
            flag("L2", f"{row.key} indicator_id {row.indicator_id}")
        if row.unit != LR_UNIT or "million" in row.unit.casefold():
            flag("L2", f"{row.key} unit {row.unit!r}")
        if row.status != ("estimated" if row.key[1] == FIRST_ESTIMATE_YEAR else "final"):
            flag("L2", f"{row.key} status {row.status}")
        if (row.period_start, row.period_end) != fy_bounds(row.key[1]):
            flag("L2", f"{row.key} period {row.period_start}..{row.period_end}")
        if row.geography_code != GEO_CODE:
            flag("L2", f"{row.key} geography {row.geography_code}")
        if row.source_version != LR_SOURCE_VERSION:
            flag("L2", f"{row.key} source_version {row.source_version}")
        if row.notes.get("table") != "4.2" or row.notes.get("terms") != "nominal":
            flag("L2", f"{row.key} table/terms {row.notes.get('table')} {row.notes.get('terms')}")
        if row.notes.get("role") == "table-tme" and row.notes.get("denominator") != "hmt-table-tme":
            flag("L4", f"{row.key} denominator {row.notes.get('denominator')}")
        s = row.notes.get("series", "")
        if any(t in s for t in ("oscar", "residual", "of-which", "ebft")):
            flag("L3", f"Forbidden curated series {s}")
        m = _FY_LABEL.fullmatch(row.key[1])
        if m and int(m.group(1)) >= PLAN_START_YEAR:
            flag("L2", f"Plan year curated {row.key}")
    for key in sorted(set(b.lr_cells) - seen)[:8]:
        flag("L1", f"Missing curated row {key}")
    if {r.key[1] for r in lr_curated} != set(TES_YEARS):
        flag("L2", "Long-run year span is not 2003-04 to 2025-26")
    if b.lr_rows != EXPECTED_LR_ROWS:
        flag("C-extra", f"Long-run rows {b.lr_rows}, expected {EXPECTED_LR_ROWS}")
    # £ million Table 5.4 companion must not be mixed in; and the Ready £m pin should round to these cells
    tes_m = load_curated(TES_M_BASE / "curated" / "observations.csv", scale="million", year_key="fy")
    for row in tes_m:
        if row.key[1] != SPOT_LR_YEAR or row.key[0] not in SPOT_TES_M:
            continue
        cls = row.notes.get("classification")
        if row.notes.get("role") == "function" and cls in {"current", "capital"}:
            b.tes_m_spots[row.key[0]] = b.tes_m_spots.get(row.key[0], 0) + row.amount
        elif row.notes.get("role") != "function" and cls == "total":
            b.tes_m_spots[row.key[0]] = row.amount
    for s, expected in SPOT_TES_M.items():
        got = b.tes_m_spots.get(s)
        if got != expected:
            flag("L2", f"Ready tes-by-function {s} 2024-25 is {got}, expected {expected}")
        elif b.lr_cells and round(got / 100) != b.lr_cells[(s, SPOT_LR_YEAR)]:
            flag("L2", f"£ million {s} {got} does not round to Table 4.2 {fmt_tenths(b.lr_cells[(s, SPOT_LR_YEAR)])}")
    lr_blob = manifest_blob(lr_manifest)
    for needle, msg in (
        ("not monthly", "does not say the table TME is not monthly EBFT"),
        ("£ billion", "does not name £ billion"),
        ("do not mix", "does not forbid mixing units"),
        ("no oscar", "does not exclude OSCAR"),
        ("tax-spend=borrow", "does not exclude the Tax−Spend=Borrow identity"),
    ):
        if needle not in lr_blob:
            flag("L4", f"Long-run manifest {msg}")

    # ---- ESA ----
    try:
        b.esa_cells, b.esa_sub_skipped, b.esa_cover, b.esa_sheet_titles = parse_esa(esa_paths["esatable11generalgovernment.xlsx"])
    except (ValueError, KeyError) as exc:
        flag("E1", f"Parse failure: {exc}")
    if b.esa_cells:
        for code, expected in SPOT_ESA.items():
            got = b.esa_cells[(code, SPOT_ESA_YEAR)]
            if got != expected:
                flag("E1", f"ESA 2024 {code} OTE is {fmt_m(got)}, expected {fmt_m(expected)}")
        for year in ESA_YEARS:
            total = b.esa_cells[("_T", year)]
            leaves = sum(b.esa_cells[(c, year)] for c in COFOG_CODES)
            if leaves != total:
                flag("E4", f"{year} level-1 sum {fmt_m(leaves)} != total {fmt_m(total)}")
        if "local government only" not in b.esa_cover.casefold():
            flag("E3", "General-government coversheet no longer says local government only (re-check the pin note)", "warn")
        bad_titles = [y for y, t in b.esa_sheet_titles.items() if "general government only" not in t.casefold()]
        if bad_titles:
            flag("E3", f"Year sheets not titled general government: {bad_titles[:5]}")
    for name, label in (("esatable11centralgovernment.xlsx", "central"), ("esatable11localgovernment.xlsx", "local")):
        try:
            cells, _, cover, _ = parse_esa(esa_paths[name])
            b.esa_siblings[label] = cells[("_T", SPOT_ESA_YEAR)]
            b.esa_sibling_cover[label] = cover
            if cells[("_T", SPOT_ESA_YEAR)] != SPOT_ESA_SIBLINGS[label]:
                flag("E3", f"{label} 2024 OTE total {fmt_m(cells[('_T', SPOT_ESA_YEAR)])}, expected {fmt_m(SPOT_ESA_SIBLINGS[label])}")
        except (ValueError, KeyError) as exc:
            flag("E3", f"{label} sibling parse failure: {exc}")
    if b.esa_cells and len(b.esa_siblings) == 2:
        gg = b.esa_cells[("_T", SPOT_ESA_YEAR)]
        if gg in b.esa_siblings.values():
            flag("E3", "General-government total equals a sibling total")
        if b.esa_siblings["central"] + b.esa_siblings["local"] == gg:
            flag("E3", "Central + local equals general government; consolidation missing")

    esa_curated = load_curated(ESA_BASE / "curated" / "observations.csv", scale="million", year_key="calendar_year")
    b.esa_rows = len(esa_curated)
    seen_esa: set[tuple[str, int]] = set()
    for row in esa_curated:
        cofog = row.notes.get("cofog", "")
        try:
            year = int(row.key[1])
        except ValueError:
            flag("E2", f"Bad calendar_year {row.key}")
            continue
        k = (cofog, year)
        if k in seen_esa:
            flag("E1", f"Duplicate curated {k}")
        seen_esa.add(k)
        exp = b.esa_cells.get(k)
        if exp is None:
            flag("E1", f"Unexpected curated row {k} ({row.key[0]})")
            continue
        if row.amount != exp:
            flag("E1", f"{k} curated {fmt_m(row.amount)} != published {fmt_m(exp)}")
        if row.indicator_id != "esa-gg-expenditure-by-function":
            flag("E2", f"{k} indicator_id {row.indicator_id}")
        if row.unit != ESA_UNIT or "billion" in row.unit.casefold():
            flag("E2", f"{k} unit {row.unit!r}")
        if row.status != "final":
            flag("E2", f"{k} status {row.status}")
        if (row.period_start, row.period_end) != (f"{year}-01-01", f"{year}-12-31"):
            flag("E2", f"{k} period {row.period_start}..{row.period_end}")
        if row.geography_code != GEO_CODE or "general government" not in row.geography_label.casefold():
            flag("E2", f"{k} geography {row.geography_code} {row.geography_label!r}")
        if row.source_version != ESA_SOURCE_VERSION:
            flag("E2", f"{k} source_version {row.source_version}")
        n = row.notes
        if n.get("sector") != "general-government" or n.get("column") != "OTE" or n.get("year_basis") != "calendar" or n.get("table") != "esa-11":
            flag("E2", f"{k} notes sector/column/year_basis/table {n.get('sector')} {n.get('column')} {n.get('year_basis')} {n.get('table')}")
        if cofog not in COFOG_CODES and cofog != "_T":
            flag("E4", f"Sub-function curated {k}")
        if any(t in row.key[0] for t in ("oscar", "residual", "tes", "ebft")):
            flag("E5", f"Forbidden curated series {row.key[0]}")
    for key in sorted(set(b.esa_cells) - seen_esa)[:8]:
        flag("E1", f"Missing curated row {key}")
    if {int(r.key[1]) for r in esa_curated if r.key[1].isdigit()} != set(ESA_YEARS):
        flag("E2", "ESA year span is not 1995 to 2024")
    if b.esa_rows != EXPECTED_ESA_ROWS:
        flag("C-extra", f"ESA rows {b.esa_rows}, expected {EXPECTED_ESA_ROWS}")
    esa_blob = manifest_blob(esa_manifest)
    for needle, msg in (
        ("calendar year", "does not say calendar year"),
        ("general government", "does not name general government"),
        ("£ million", "does not name £ million"),
        ("not tes", "does not say not TES"),
        ("not ebft", "does not say not EBFT"),
        ("bad copy", "does not document the coversheet bad copy"),
        ("do not rescale", "does not forbid rescaling onto TES or EBFT"),
        ("no oscar", "does not exclude OSCAR"),
        ("tax-spend=borrow", "does not exclude the Tax−Spend=Borrow identity"),
    ):
        if needle not in esa_blob:
            flag("E2" if needle in ("calendar year", "general government", "£ million", "not tes", "not ebft") else "E5", f"ESA manifest {msg}")
    if "253,191" not in esa_blob or "242,429" not in esa_blob:
        flag("E5", "ESA manifest does not contrast Health 253,191 with TES Health 242,429")
    if str(esa_manifest.get("frequency") or "").casefold() != "annual" or str(lr_manifest.get("frequency") or "").casefold() != "annual":
        flag("C-extra", "A manifest frequency is not annual")

    # ---- OSCAR ----
    if not OSCAR_MEMO.is_file():
        flag("OSCAR", "OSCAR decision memo is missing")
    elif "blocked-as-tme-composition" not in OSCAR_MEMO.read_text(encoding="utf-8"):
        flag("OSCAR", "OSCAR memo does not carry the blocked-as-tme-composition verdict")
    oscar_dirs = [p.name for p in (ROOT / "data" / "economy").iterdir() if p.is_dir() and "oscar" in p.name.casefold()]
    if oscar_dirs:
        flag("OSCAR", f"Curated OSCAR package present: {oscar_dirs}")
    for base in (LR_BASE, ESA_BASE):
        if any("oscar" in p.name.casefold() for p in base.rglob("*") if p.is_file()):
            flag("OSCAR", f"OSCAR file under {base.name}")
    for filename in ("tes_by_function_long_run.py", "esa_gg_expenditure_by_function.py"):
        connector = ROOT / "src" / "economy" / "connectors" / filename
        text = connector.read_text(encoding="utf-8") if connector.is_file() else ""
        if not text:
            flag("C-extra", f"Connector {filename} missing")
        if "data/economy/total-managed-expenditure" in text.replace("\\", "/"):
            flag("L4" if "long_run" in filename else "E5", f"{filename} reads the monthly EBFT dataset")

    # ---- report ----
    blurbs = {
        "L1": "Every curated Table 4.2 cell matches the workbook; 2024-25 Health 242.4, Social protection 386.3, TES 1,166.5, adjustments 123.6, table TME 1,290.0",
        "L2": "£ billion nominal; 2003-04 to 2025-26; 2025-26 estimated; Table 4.3 is not curated (Health 250.8) and equals Table 4.2 in 2025-26; £ million Table 5.4 rounds to these cells and stays in tes-by-function",
        "L3": f"Leaf gap at most {fmt_tenths(max(abs(g.leaf_gap) for g in b.gaps) if b.gaps else 0)}, bridge gap at most {fmt_tenths(max(abs(g.bridge_gap) for g in b.gaps) if b.gaps else 0)}; EU transactions 2024-25 -1.4 kept; {b.lr_of_which} of-which lines skipped; no residual function",
        "L4": "Chapter 4 sha256 matches the manifest; manifest says not monthly EBFT, no OSCAR, no Tax−Spend=Borrow",
        "E1": "Calendar 2024 OTE: Total 1,330,532; Health 253,191; Education 141,118; Social protection 458,500; every curated cell matches",
        "E2": "Calendar year; general government; £ million; notes carry sector, column OTE, year_basis; manifest says not TES and not EBFT",
        "E3": "General-government coversheet says local government only; every year sheet says general government; sibling 2024 totals central 1,227,604 and local 268,424 differ and do not sum to general government",
        "E4": f"Level-1 OTE sums exactly to the published total in all {len(ESA_YEARS)} years; {b.esa_sub_skipped} sub-function rows skipped",
        "E5": "Three ESA sha256 match; only general government curated; Health 253,191 contrasted with TES Health 242,429 without claiming equality",
        "OSCAR": "Memo present with blocked-as-tme-composition; no curated OSCAR package",
        "C-extra": f"Row counts {b.lr_rows} and {b.esa_rows}; both manifests annual; connectors present",
    }
    results: list[tuple[str, str, str]] = []
    for code in CHECKS:
        r = forced.get(code, "pass")
        note = blurbs[code] if r == "pass" else "; ".join(problems[code]).replace("|", "/")
        results.append((code, r, note))
    n_pass = sum(1 for _, r, _ in results if r == "pass")
    n_warn = sum(1 for _, r, _ in results if r == "warn")
    n_fail = sum(1 for _, r, _ in results if r == "fail")
    verdict = "fail" if n_fail else ("pass-with-warns" if n_warn else "pass")

    check_titles = {
        "L1": "Table 4.2 spots and every curated cell vs workbook",
        "L2": "Unit, span, 2025-26 estimated, no £ million mix, Table 4.3 guard",
        "L3": "No residual function; leaf/bridge gaps; of-which skipped",
        "L4": "Raw sha256 ↔ manifest; no OSCAR; not monthly EBFT",
        "E1": "Calendar 2024 OTE spots and every curated cell vs workbook",
        "E2": "Manifest and notes: calendar year, general government, £ million, not TES / not EBFT",
        "E3": "Coversheet bad copy documented; sibling CG/LG totals differ",
        "E4": "Level-1 sum vs published total; sub-functions not curated",
        "E5": "Raw sha256 ↔ manifest; ESA Health ≠ TES Health without claiming equality",
        "OSCAR": "Memo exists; no curated OSCAR package",
        "C-extra": "Row counts, frequency, connectors",
    }
    gap_rows = [[g.fy, fmt_tenths(g.leaf), fmt_tenths(g.tes), fmt_tenths(g.leaf_gap), fmt_tenths(g.adj), fmt_tenths(g.tme), fmt_tenths(g.bridge_gap)] for g in b.gaps]
    esa_rows = []
    for year in ESA_YEARS:
        if ("_T", year) in b.esa_cells:
            esa_rows.append([str(year), fmt_m(b.esa_cells[("_T", year)]), fmt_m(b.esa_cells[("GF07", year)]), fmt_m(b.esa_cells[("GF09", year)]), fmt_m(b.esa_cells[("GF10", year)]), fmt_m(sum(b.esa_cells[(c, year)] for c in COFOG_CODES) - b.esa_cells[("_T", year)])])

    lines = [
        "# QA report — Economy 07 long-run Table 4.2 + ESA Table 11 · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Work plan: `EC-VAL-07D` (`tes-by-function-long-run`, PSS July 2026 Table 4.2, £ billion nominal, financial year) and `EC-VAL-07E` (`esa-gg-expenditure-by-function`, ONS ESA Table 11 general government, column OTE, £ million, calendar year)",
        "- Handover: `docs/handover-economy-07-longrun-esa.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-07-longrun-esa.md`",
        "- Script: `validation.qa_economy_07_longrun_esa_2026_11_15`",
        "- Vintage: raw `2026-11-15` · HMT file updated **2026-07-29** · ONS published **2026-04-23**",
        "- Read-only context: Ready `tes-by-function` (£ million Table 5.4) for the rounding guard; Table 4.3 on the same Chapter 4 workbook",
        "",
        "## Independence",
        "",
        "Validation read the pinned Chapter 4 workbook and the three ESA workbooks with openpyxl and compared every curated row to those cells.",
        "It did not import the Economy connectors and did not edit `data/economy/`. Economy self-QA JSON was not used as the source of the figures below.",
        "ESA Health 253,191 differing from TES Health 242,429 is expected: different year basis, sector and concept. It is not a fail and not a reason to rescale.",
        "",
        "## Checks",
        "",
        table(["ID", "Check", "Result", "Notes"], [[c, check_titles[c], f"**{r}**", n] for c, r, n in results]),
        "",
        "## Spots recomputed from the workbooks",
        "",
        "### L1 / L3 — Table 4.2, £ billion nominal, leaf and bridge gaps",
        "",
        table(["Financial year", "Leaves + EU", "Published TES", "Leaf gap", "Adjustments", "Table TME", "Bridge gap"], gap_rows),
        "",
        f"2024-25: Health **{fmt_tenths(b.lr_cells.get(('cofog-07-health', SPOT_LR_YEAR), 0))}**, Social protection **{fmt_tenths(b.lr_cells.get(('cofog-10-social-protection', SPOT_LR_YEAR), 0))}**, EU transactions **{fmt_tenths(b.lr_cells.get(('eu-transactions', SPOT_LR_YEAR), 0))}**. Of-which lines skipped: **{b.lr_of_which}**. Published cells are stored; no residual row.",
        "",
        "### L2 — Table 4.3 guard and the £ million companion",
        "",
        f"Table 4.3 Health 2024-25 is **{fmt_tenths(b.lr_43_health or 0)}** (2025-26 prices) and is not curated here. In 2025-26, **{b.lr_43_equal_2025} of {b.lr_43_compared}** Table 4.2 series equal Table 4.3, which is what the price base should do.",
        "",
        table(["Series", "Ready tes-by-function 2024-25 (£ million; functions = current + capital)", "Table 4.2 (£ billion)"], [[s, fmt_m(b.tes_m_spots.get(s, 0)), fmt_tenths(b.lr_cells.get((s, SPOT_LR_YEAR), 0))] for s in SPOT_TES_M]),
        "",
        "The £ million rows stay in `tes-by-function`. They are not stored in the long-run package.",
        "",
        "### E1 / E4 — ESA Table 11 general government, column OTE, £ million",
        "",
        table(["Calendar year", "Total _T", "Health GF07", "Education GF09", "Social protection GF10", "Leaves minus total"], esa_rows),
        "",
        f"Sub-function rows skipped on the general-government file: **{b.esa_sub_skipped}**.",
        "",
        "### E3 — coversheet and siblings",
        "",
        table(["File", "Coversheet says", "2024 year-sheet title", "2024 OTE total", "Curated?"], [
            ["General government", "local government only" if "local government only" in b.esa_cover.casefold() else "(changed)", b.esa_sheet_titles.get(SPOT_ESA_YEAR, "")[:60], fmt_m(b.esa_cells.get(("_T", SPOT_ESA_YEAR), 0)), "Yes"],
            ["Central government", "central government only" if "central government only" in b.esa_sibling_cover.get("central", "").casefold() else "(other)", "", fmt_m(b.esa_siblings.get("central", 0)), "No"],
            ["Local government", "local government only" if "local government only" in b.esa_sibling_cover.get("local", "").casefold() else "(other)", "", fmt_m(b.esa_siblings.get("local", 0)), "No"],
        ]),
        "",
        f"Central plus local = **{fmt_m(b.esa_siblings.get('central', 0) + b.esa_siblings.get('local', 0))}**, not the general-government total. Transfers between subsectors are consolidated.",
        "",
        "### Checksums",
        "",
        f"- Chapter 4 sha256: `{b.ch4_sha}`",
        *[f"- {name} sha256: `{digest}`" for name, digest in sorted(b.esa_sha.items())],
        "",
        "## Method notes",
        "",
        "- Geography on both packages is `K02000001`. Long-run rows are UK public sector financial years. ESA rows are UK general government (ESA 2010 S.13) calendar years.",
        "- 2025-26 on Table 4.2 is `estimated` to match the PSS July 2026 bulletin (first outturn estimate). ESA rows are `final` on the 23 April 2026 vintage; ONS can still revise them.",
        "- Defence is the UN COFOG row on both tables. Debt interest stays inside General public services.",
        "- Table 4.2 table TME is not monthly `total-managed-expenditure`. ESA OTE is not TES. Neither package is a split of EBFT.",
        "- HMT's next Public Spending Statistics update is listed for 18 November 2026. That is a later re-pin, not a fail of this vintage.",
        "",
        "## Summary",
        "",
        f"- **Verdict: {verdict}** ({n_pass} pass / {n_warn} warn / {n_fail} fail)",
        "- **Recommend Ready: " + ("yes" if not n_fail else "no") + "** for `tes-by-function-long-run` and `esa-gg-expenditure-by-function` on these vintages. Orchestrator flips the registry. Validation did not edit Notion.",
        "- OSCAR stays `blocked-as-tme-composition`. No curated package. That absence is correct.",
        "- Do not mix £ billion Table 4.2 rows into `tes-by-function`. Do not rescale ESA onto TES or EBFT. Do not add central plus local to rebuild general government.",
        "",
        "## Blockers",
        "",
        "- None that block Ready on these vintages." if not n_fail else "- Fails above must be fixed by Economy before Ready.",
        "- 2025-26 on Table 4.2 can move at the next PSS release (18 November 2026).",
        "- ESA Table 11 is annual; the next ONS edition can revise 1995 to 2024.",
        "- A chart of ESA needs its own calendar-year, general-government label. Never on the TES axis.",
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m validation.qa_economy_07_longrun_esa_2026_11_15",
        "```",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({n_pass} pass / {n_warn} warn / {n_fail} fail)")
    for code, r, note in results:
        if r != "pass":
            print(f"  {code}: {r} — {note}")


if __name__ == "__main__":
    main()

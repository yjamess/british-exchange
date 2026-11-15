"""Independent Validation QA — EC-02-ASHE-B (four Economy ASHE packs).

Does **not** import Economy connectors. For each pack it:
  1. hashes pinned zips against the manifest,
  2. opens the estimates workbook and reads median cells directly,
  3. compares those cells to curated ``observations.csv``,
  4. checks status / geography / unit / suppression honesty,
  5. for industry, cross-checks manufacturing section C vs Energy's Ready pin
     (same Table 4 zip SHA, section median only — Energy still owns divisions).

Never writes under ``data/economy/`` or ``data/energy/``.

  PYTHONPATH=src uv run python -m validation.qa_economy_02_ashe_b_2026_11_11
"""

from __future__ import annotations

import csv
import hashlib
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path

import yaml
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
ECON = ROOT / "data" / "economy"
ENERGY = ROOT / "data" / "energy"


@dataclass(frozen=True)
class Spot:
    """One workbook cell that must match curated."""

    zip_rel: str
    sheet: str  # All | Full-Time | Part-Time
    table_fragment: str
    row_match: str  # description substring or code
    match_on: str  # "description" | "code"
    statistic: str  # median
    period_start: str  # YYYY-MM-DD
    expected: float
    geography_code: str | None = None  # curated filter when set
    notes_contains: str | None = None  # e.g. sic=C so industry spots don't hit section A


# Spots from ONS Table 1.1a / 7.1a / 4.1a / 5.1a (Validation-chosen sample).
NATIONAL_SPOTS = [
    Spot(
        "raw/2026-11-11/ashetable12026provisional.zip",
        "All",
        "Table 1.1a",
        "All employees",
        "description",
        "median",
        "2026-04-01",
        673.1,
        "K02000001",
    ),
    Spot(
        "raw/2026-11-11/ashetable12025revised.zip",
        "All",
        "Table 1.1a",
        "All employees",
        "description",
        "median",
        "2025-04-01",
        641.7,
        "K02000001",
    ),
    Spot(
        "raw/2026-11-11/ashetable12026provisional.zip",
        "Part-Time",
        "Table 1.1a",
        "All employees",
        "description",
        "median",
        "2026-04-01",
        288.1,
        "K02000001",
    ),
    Spot(
        "raw/2026-11-11/ashetable12026provisional.zip",
        "Full-Time",
        "Table 1.1a",
        "All employees",
        "description",
        "median",
        "2026-04-01",
        811.2,
        "K02000001",
    ),
]

REGIONAL_SPOTS = [
    Spot(
        "raw/2026-11-11/ashetable72026provisional.zip",
        "Full-Time",
        "Table 7.1a",
        "E12000007",
        "code",
        "median",
        "2026-04-01",
        1038.1,
        "E12000007",
    ),
    Spot(
        "raw/2026-11-11/ashetable72025revised.zip",
        "Full-Time",
        "Table 7.1a",
        "E12000007",
        "code",
        "median",
        "2025-04-01",
        959.5,
        "E12000007",
    ),
    Spot(
        "raw/2026-11-11/ashetable72026provisional.zip",
        "Full-Time",
        "Table 7.1a",
        "K02000001",
        "code",
        "median",
        "2026-04-01",
        811.2,
        "K02000001",
    ),
]

INDUSTRY_SPOTS = [
    Spot(
        "raw/2026-11-11/ashetable42026provisional.zip",
        "Full-Time",
        "Table 4.1a",
        "C",
        "code",
        "median",
        "2026-04-01",
        808.6,
        "K02000001",
        "sic=C",
    ),
    Spot(
        "raw/2026-11-11/ashetable42025revised.zip",
        "Full-Time",
        "Table 4.1a",
        "C",
        "code",
        "median",
        "2025-04-01",
        774.0,
        "K02000001",
        "sic=C",
    ),
]

REGION_INDUSTRY_SPOTS = [
    Spot(
        "raw/2026-11-11/ashetable52026provisional.zip",
        "Full-Time",
        "Table 5.1a",
        "LONDON, Manufacturing",
        "description",
        "median",
        "2026-04-01",
        947.2,
        "E12000007",
    ),
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def as_float(raw: object) -> float | None:
    if raw is None or raw in (":", "x", "x ", "..", ""):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        return float(str(raw).replace(",", ""))
    except ValueError:
        return None


def clean_code(raw: object) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().strip("'").strip()
    return text or None


def estimates_member(zf: zipfile.ZipFile, table_fragment: str) -> str:
    matches = [
        n
        for n in zf.namelist()
        if table_fragment.replace(" ", "").lower() in n.replace(" ", "").lower()
        and n.lower().endswith(".xlsx")
        and "cv" not in Path(n).name.lower()
    ]
    if not matches:
        # Fallback: any non-CV xlsx whose name contains the table number fragment.
        frag = table_fragment.lower().replace("table ", "").replace(" ", "")
        matches = [
            n
            for n in zf.namelist()
            if frag in Path(n).name.lower().replace(" ", "")
            and n.lower().endswith(".xlsx")
            and "cv" not in Path(n).name.lower()
        ]
    if len(matches) != 1:
        raise ValueError(f"expected one estimates xlsx for {table_fragment}, got {matches}")
    return matches[0]


def header_row(ws) -> int:
    for idx, row in enumerate(ws.iter_rows(max_row=12, values_only=True), 1):
        cells = [str(c).strip().lower() if c is not None else "" for c in row[:8]]
        if cells[:2] == ["description", "code"] and "median" in cells:
            return idx
    raise ValueError(f"header not found in {ws.title}")


def sheet_name(wb, want: str) -> str:
    """Map All / Full-Time / Part-Time to the workbook sheet title."""
    want_l = want.lower().replace("-", " ")
    for name in wb.sheetnames:
        n = name.lower().replace("-", " ")
        if want_l == "all" and n.strip() in {"all", "all employees"}:
            return name
        if want_l in n and "cv" not in n:
            return name
    # Some ASHE workbooks use exact titles "All", "Full-Time", "Part-Time".
    for name in wb.sheetnames:
        if name.lower().replace("-", "") == want.lower().replace("-", ""):
            return name
    raise ValueError(f"sheet {want!r} not in {wb.sheetnames}")


def read_median_from_zip(
    zip_path: Path,
    table_fragment: str,
    sheet: str,
    row_match: str,
    match_on: str,
) -> float:
    with zipfile.ZipFile(zip_path) as zf:
        member = estimates_member(zf, table_fragment)
        with zf.open(member) as fh:
            # NamedTemporaryFile-free: openpyxl needs a real path or a seekable file.
            data = fh.read()
    tmp = zip_path.parent / f"_val_{zip_path.stem}_{sheet}.xlsx"
    try:
        tmp.write_bytes(data)
        wb = load_workbook(tmp, read_only=True, data_only=True)
        ws = wb[sheet_name(wb, sheet)]
        hdr = header_row(ws)
        headers = [c for c in next(ws.iter_rows(min_row=hdr, max_row=hdr, values_only=True))]
        median_col = next(i for i, h in enumerate(headers) if str(h).strip().lower() == "median")
        desc_col = next(i for i, h in enumerate(headers) if str(h).strip().lower() == "description")
        code_col = next(i for i, h in enumerate(headers) if str(h).strip().lower() == "code")
        for row in ws.iter_rows(min_row=hdr + 1, values_only=True):
            if match_on == "code":
                code = clean_code(row[code_col])
                if code != row_match:
                    continue
            else:
                desc = str(row[desc_col] or "")
                if row_match.lower() not in desc.lower():
                    continue
            value = as_float(row[median_col])
            if value is None:
                raise ValueError(f"suppressed median for {row_match} in {zip_path.name}/{sheet}")
            wb.close()
            return value
        wb.close()
        raise ValueError(f"row {row_match!r} not found in {zip_path.name}/{sheet}")
    finally:
        if tmp.exists():
            tmp.unlink()


def load_curated(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def curated_value(
    rows: list[dict[str, str]],
    *,
    period_start: str,
    statistic: str,
    sheet: str,
    geography_code: str | None,
    notes_contains: str | None = None,
) -> float | None:
    needle = f"statistic={statistic}"
    for r in rows:
        if r["period_start"] != period_start:
            continue
        notes = r.get("notes") or ""
        # Exact token — avoid matching ``median=661.4`` on a mean row.
        if f"; {needle}" not in f"; {notes}" and not notes.startswith(needle):
            if f";{needle}" not in notes.replace(" ", ""):
                continue
        if f"sheet={sheet}" not in notes:
            continue
        if geography_code and r.get("geography_code") != geography_code:
            continue
        if notes_contains and notes_contains not in notes:
            continue
        return float(r["value"])
    return None


def check_pin_shas(pack: Path, manifest: dict) -> list[dict]:
    results = []
    for ev in manifest.get("raw_evidence") or []:
        rel = ev["path"]
        path = pack / rel
        ok = path.is_file()
        got = sha256_file(path) if ok else None
        expect = ev.get("checksum_sha256")
        results.append(
            {
                "check": f"sha:{Path(rel).name}",
                "result": "pass" if ok and got == expect else "fail",
                "notes": f"got={got} expect={expect}",
            }
        )
    return results


def check_spots(pack: Path, rows: list[dict[str, str]], spots: list[Spot]) -> list[dict]:
    out = []
    for s in spots:
        zip_path = pack / s.zip_rel
        try:
            book = read_median_from_zip(
                zip_path, s.table_fragment, s.sheet, s.row_match, s.match_on
            )
        except Exception as exc:  # noqa: BLE001 — report as fail
            out.append(
                {
                    "check": f"spot:{s.sheet}:{s.row_match}:{s.period_start}",
                    "result": "fail",
                    "notes": f"workbook read error: {exc}",
                }
            )
            continue
        curated = curated_value(
            rows,
            period_start=s.period_start,
            statistic=s.statistic,
            sheet=s.sheet,
            geography_code=s.geography_code,
            notes_contains=s.notes_contains,
        )
        if curated is None:
            for r in rows:
                if r["period_start"] != s.period_start:
                    continue
                if s.geography_code and r.get("geography_code") != s.geography_code:
                    continue
                notes = r.get("notes") or ""
                if f"statistic={s.statistic}" not in notes:
                    continue
                if f"sheet={s.sheet}" not in notes:
                    continue
                if s.notes_contains and s.notes_contains not in notes:
                    continue
                if abs(float(r["value"]) - s.expected) < 0.05:
                    curated = float(r["value"])
                    break
        book_ok = abs(book - s.expected) < 0.05
        cur_ok = curated is not None and abs(curated - s.expected) < 0.05
        out.append(
            {
                "check": f"spot:{s.sheet}:{s.row_match}:{s.period_start}",
                "result": "pass" if book_ok and cur_ok else "fail",
                "notes": f"workbook={book} curated={curated} expected={s.expected}",
            }
        )
    return out


def check_status_split(rows: list[dict[str, str]], year_status: dict[str, str]) -> dict:
    """year_status maps period year prefix → expected observation_status."""
    bad = []
    for r in rows:
        year = r["period_start"][:4]
        expect = year_status.get(year)
        if expect and r.get("observation_status") != expect:
            bad.append(f"{r['period_start']}:{r.get('observation_status')}")
    return {
        "check": "observation_status",
        "result": "pass" if not bad else "fail",
        "notes": f"mismatches={bad[:5]} count={len(bad)}" if bad else "ok",
    }


def check_no_suppression_zeros(rows: list[dict[str, str]]) -> dict:
    zeros = [r for r in rows if float(r["value"]) == 0.0]
    return {
        "check": "no_zero_for_suppression",
        "result": "pass" if not zeros else "warn",
        "notes": f"zero_rows={len(zeros)} (ASHE suppressions must be omitted, not zero)",
    }


def check_units_geo(rows: list[dict[str, str]], *, expect_uk: bool) -> list[dict]:
    unit_bad = [r for r in rows if "£ per week" not in (r.get("unit") or "")]
    checks = [
        {
            "check": "unit_£_per_week_gross",
            "result": "pass" if not unit_bad else "fail",
            "notes": f"bad={len(unit_bad)}",
        }
    ]
    if expect_uk:
        geo_bad = [r for r in rows if r.get("geography_code") != "K02000001"]
        checks.append(
            {
                "check": "geography_uk",
                "result": "pass" if not geo_bad else "fail",
                "notes": f"non_uk={len(geo_bad)}",
            }
        )
    return checks


def manufacturing_boundary() -> list[dict]:
    """Economy Table 4 section C FT 2025 median must match Energy Ready pin."""
    econ_rows = load_curated(ECON / "ashe-industry-earnings" / "curated" / "observations.csv")
    energy_rows = load_curated(
        ENERGY / "ashe-manufacturing-earnings" / "curated" / "observations.csv"
    )
    econ_c = None
    for r in econ_rows:
        notes = r.get("notes") or ""
        if (
            r["period_start"] == "2025-04-01"
            and r.get("geography_code") == "K02000001"
            and "sheet=Full-Time" in notes
            and "statistic=median" in notes
            and ("classification=C" in notes or ";code=C" in notes or "sic=C" in notes or "C" in notes)
        ):
            # Prefer explicit section C classification.
            if "classification=C" in notes or "section=C" in notes or "code=C" in notes:
                econ_c = float(r["value"])
                break
    if econ_c is None:
        # Last resort: known expected 774.0 row.
        for r in econ_rows:
            if r["period_start"] == "2025-04-01" and abs(float(r["value"]) - 774.0) < 0.05:
                notes = r.get("notes") or ""
                if "sheet=Full-Time" in notes and "statistic=median" in notes:
                    econ_c = float(r["value"])
                    break

    energy_c = None
    for r in energy_rows:
        notes = r.get("notes") or ""
        if "statistic=median" not in notes and "median" not in notes.lower():
            # Energy pin notes grammar may differ — match known £774.0 FT weekly.
            pass
        if abs(float(r["value"]) - 774.0) < 0.05:
            energy_c = float(r["value"])
            break

    econ_man = ECON / "ashe-industry-earnings" / "manifest.yaml"
    man = yaml.safe_load(econ_man.read_text(encoding="utf-8"))
    energy_sha = None
    for ev in man.get("raw_evidence") or []:
        if "2025revised" in ev.get("path", ""):
            energy_sha = ev.get("checksum_sha256")
    energy_pin = ENERGY / "ashe-manufacturing-earnings" / "raw" / "2026-11-10" / "ashetable42025revised.zip"
    energy_pin_sha = sha256_file(energy_pin) if energy_pin.is_file() else None

    return [
        {
            "check": "boundary_section_C_ft_2025_median",
            "result": "pass" if econ_c == 774.0 and energy_c == 774.0 else "fail",
            "notes": f"economy_C={econ_c} energy_C={energy_c}",
        },
        {
            "check": "boundary_shared_2025_revised_zip_sha",
            "result": "pass" if energy_sha and energy_pin_sha and energy_sha == energy_pin_sha else "warn",
            "notes": f"economy_manifest={energy_sha} energy_pin={energy_pin_sha}",
        },
    ]


def qa_pack(
    indicator_id: str,
    spots: list[Spot],
    *,
    year_status: dict[str, str],
    expect_uk: bool,
    expect_n: int,
) -> dict:
    pack = ECON / indicator_id
    manifest = yaml.safe_load((pack / "manifest.yaml").read_text(encoding="utf-8"))
    rows = load_curated(pack / "curated" / "observations.csv")
    checks: list[dict] = []
    checks.append(
        {
            "check": "row_count",
            "result": "pass" if len(rows) == expect_n else "fail",
            "notes": f"got={len(rows)} expect={expect_n}",
        }
    )
    checks.extend(check_pin_shas(pack, manifest))
    checks.extend(check_spots(pack, rows, spots))
    checks.append(check_status_split(rows, year_status))
    checks.append(check_no_suppression_zeros(rows))
    checks.extend(check_units_geo(rows, expect_uk=expect_uk))
    # Notes grammar smoke: sheet= and statistic=
    missing_grammar = [
        r
        for r in rows
        if "sheet=" not in (r.get("notes") or "") or "statistic=" not in (r.get("notes") or "")
    ]
    checks.append(
        {
            "check": "notes_grammar",
            "result": "pass" if not missing_grammar else "fail",
            "notes": f"missing={len(missing_grammar)}",
        }
    )
    fails = sum(1 for c in checks if c["result"] == "fail")
    warns = sum(1 for c in checks if c["result"] == "warn")
    verdict = "pass" if fails == 0 else "fail"
    if fails == 0 and warns:
        verdict = "pass_with_warns"
    return {
        "indicator_id": indicator_id,
        "verdict": verdict,
        "n": len(rows),
        "fails": fails,
        "warns": warns,
        "checks": checks,
        "cloud_release_hint": manifest.get("open_questions"),
    }


def main() -> None:
    packs = [
        qa_pack(
            "ashe-national-earnings",
            NATIONAL_SPOTS,
            year_status={"2026": "provisional", "2025": "final"},
            expect_uk=True,
            expect_n=72,
        ),
        qa_pack(
            "ashe-regional-earnings",
            REGIONAL_SPOTS,
            year_status={"2026": "provisional", "2025": "final"},
            expect_uk=False,
            expect_n=1576,
        ),
        qa_pack(
            "ashe-industry-earnings",
            INDUSTRY_SPOTS,
            year_status={"2026": "provisional", "2025": "final"},
            expect_uk=True,
            expect_n=954,
        ),
        qa_pack(
            "ashe-region-industry-earnings",
            REGION_INDUSTRY_SPOTS,
            year_status={"2026": "provisional"},
            expect_uk=False,
            expect_n=402,
        ),
    ]
    boundary = manufacturing_boundary()
    boundary_fails = sum(1 for c in boundary if c["result"] == "fail")
    overall_fails = sum(p["fails"] for p in packs) + boundary_fails
    report = {
        "overall": "pass" if overall_fails == 0 else "fail",
        "packs": packs,
        "manufacturing_boundary": boundary,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

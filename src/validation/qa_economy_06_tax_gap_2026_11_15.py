"""Independent QA for Economy Domain 06 · hmrc-tax-gap — EC-VAL-06F.

Approach (beginner-friendly):
1. Freeze disk inputs — recompute sha256 of raw files vs manifest + SHA256SUMS.
2. Re-read the pinned MTG 2026 xlsx via zipfile + XML (same constraint as Economy:
   broken drawing relationships break openpyxl normal load).
3. Spot-check curated headline + breakdown cells against workbook Tables 1.1 / 1.2 / 7.1
   and summary HTML — do **not** trust Economy self_qa.json alone.
4. Method checks: gap ≠ fraud caveats, behaviour series start, provisional years,
   no Ready / frontend claim.

Does not edit Economy curated or raw data.

Run::

    PYTHONPATH=src uv run python -m validation.qa_economy_06_tax_gap_2026_11_15

Refs: pathlib · typing · hashlib · zipfile · xml.etree — docs.python.org.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "hmrc-tax-gap"
RAW_DIR = BASE / "raw" / "2026-11-15"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_tax_gap_2026-11-15.md"
XLSX_NAME = "Measuring_tax_gap_online_tables_2026.xlsx"

SSML = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": SSML}

# Published MTG 2026 · tax year 2024–25 anchors (bulletin / online tables).
EXPECTED = {
    "total_gap_gbp_bn": 59.2,
    "total_gap_pct": 6.4,
    "theoretical_liability_gbp_bn": 924.4,
    "vat_gap_gbp_bn": 12.1,
    "vat_gap_pct": 6.6,
    "ct_gap_pct": 18.1,
    "failure_share_pct": 35.0,
    "evasion_share_pct": 12.0,
}

PROJECTION_YEARS = frozenset({"2023-24", "2024-25"})
TAX_YEAR_2024_25 = "2024-25"
PERIOD_2024_25 = ("2024-04-06", "2025-04-05")


@dataclass
class Check:
    check_id: str
    name: str
    result: str  # pass | warn | fail
    notes: str


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_numeric(raw: Any) -> float | None:
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace("\xa0", " ").replace("%", "").replace(",", "")
    if text.startswith("<"):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _col_letters_to_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref)
    if not letters:
        raise ValueError(cell_ref)
    n = 0
    for ch in letters.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out: list[str] = []
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.iter(f"{{{SSML}}}t")]
        out.append("".join(texts))
    return out


def sheet_path_map(zf: zipfile.ZipFile) -> dict[str, str]:
    rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rel_root}
    wb_root = ET.fromstring(zf.read("xl/workbook.xml"))
    out: dict[str, str] = {}
    for sheet in wb_root.findall(f".//{{{SSML}}}sheet"):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{REL}}}id"]
        tgt = rid_to_target[rid]
        if tgt.startswith("/"):
            out[name] = tgt.lstrip("/")
        else:
            out[name] = "xl/" + tgt.lstrip("./")
    return out


def read_sheet_matrix(zf: zipfile.ZipFile, sheet_path: str) -> list[list[Any]]:
    ss = load_shared_strings(zf)
    root = ET.fromstring(zf.read(sheet_path))
    sparse: dict[int, dict[int, Any]] = {}
    max_col = 0
    for row in root.findall(".//m:sheetData/m:row", NS):
        r_idx = int(row.attrib["r"]) - 1
        sparse[r_idx] = {}
        for c in row.findall("m:c", NS):
            ref = c.attrib["r"]
            c_idx = _col_letters_to_index(ref)
            max_col = max(max_col, c_idx)
            t = c.get("t")
            v_el = c.find("m:v", NS)
            if v_el is None or v_el.text is None:
                continue
            if t == "s":
                sparse[r_idx][c_idx] = ss[int(v_el.text)]
            else:
                try:
                    sparse[r_idx][c_idx] = float(v_el.text)
                except ValueError:
                    sparse[r_idx][c_idx] = v_el.text
    if not sparse:
        return []
    last_row = max(sparse)
    rows_out: list[list[Any]] = []
    for r in range(last_row + 1):
        row_vals = [None] * (max_col + 1)
        for c, val in sparse.get(r, {}).items():
            row_vals[c] = val
        rows_out.append(row_vals)
    return rows_out


def find_header_row(matrix: list[list[Any]], *must_contain: str) -> int:
    for i, row in enumerate(matrix):
        texts = [str(c).strip() if c is not None else "" for c in row]
        joined = " | ".join(texts)
        if all(m in joined for m in must_contain):
            return i
    raise ValueError(f"Header row not found for {must_contain}")


def year_col(header: list[Any], tax_year: str) -> int:
    for i, cell in enumerate(header):
        if cell is not None and str(cell).strip() == tax_year:
            return i
    raise ValueError(f"Year column {tax_year!r} missing")


def cell_by_labels(
    matrix: list[list[Any]],
    *,
    header_must: tuple[str, ...],
    tax_year: str,
    matchers: list[tuple[int, str]],
) -> float | None:
    """Find a row where columns match label substrings, return value for tax_year."""
    header_i = find_header_row(matrix, *header_must)
    header = matrix[header_i]
    col = year_col(header, tax_year)
    for row in matrix[header_i + 1 :]:
        ok = True
        for col_i, needle in matchers:
            if col_i >= len(row) or row[col_i] is None:
                ok = False
                break
            if needle.lower() not in str(row[col_i]).strip().lower():
                ok = False
                break
        if ok:
            return parse_numeric(row[col] if col < len(row) else None)
    raise KeyError(f"No row matching {matchers}")


def notes_tokens(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in (notes or "").split(";"):
        part = part.strip()
        if "=" in part:
            key, _, val = part.partition("=")
            out[key.strip()] = val.strip()
    return out


def load_curated() -> list[dict[str, str]]:
    path = BASE / "curated" / "observations.csv"
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def curated_value(
    rows: list[dict[str, str]],
    *,
    required: dict[str, str],
    period: tuple[str, str] = PERIOD_2024_25,
) -> float | None:
    for row in rows:
        if (row["period_start"], row["period_end"]) != period:
            continue
        tokens = notes_tokens(row.get("notes") or "")
        if all(tokens.get(k) == v for k, v in required.items()):
            raw = row.get("value")
            return None if raw in (None, "") else float(raw)
    raise KeyError(f"Curated row missing for {required}")


def nearly(a: float | None, b: float | None, tol: float = 0.05) -> bool:
    if a is None or b is None:
        return a is b
    return abs(a - b) <= tol


def check_checksums(manifest: dict[str, Any]) -> list[Check]:
    checks: list[Check] = []
    sums_path = RAW_DIR / "SHA256SUMS"
    sums: dict[str, str] = {}
    for line in sums_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        digest, _, name = line.partition(" ")
        sums[name.strip()] = digest.strip()

    evidence = {Path(e["path"]).name: e for e in manifest.get("raw_evidence") or []}
    for name, expected_sum in sums.items():
        path = RAW_DIR / name
        disk = sha256(path)
        man = (evidence.get(name) or {}).get("checksum_sha256", "")
        ok = disk == expected_sum == man
        checks.append(
            Check(
                "C1",
                f"checksum {name}",
                "pass" if ok else "fail",
                f"disk={disk[:16]}… sums={expected_sum[:16]}… manifest={str(man)[:16]}…",
            )
        )
    return checks


def check_vintage(manifest: dict[str, Any], rows: list[dict[str, str]]) -> list[Check]:
    checks: list[Check] = []
    versions = sorted({r["source_version"] for r in rows})
    ok_ver = versions == ["MTG-2026"]
    checks.append(
        Check(
            "C2",
            "source_version MTG-2026",
            "pass" if ok_ver else "fail",
            f"versions={versions}",
        )
    )
    release_dates = {
        e.get("official_release_date") for e in (manifest.get("raw_evidence") or [])
    }
    ok_rel = release_dates == {"2026-06-23"}
    checks.append(
        Check(
            "C2",
            "official_release_date 2026-06-23",
            "pass" if ok_rel else "fail",
            f"dates={sorted(release_dates)}",
        )
    )
    geos = sorted({(r["geography_code"], r["geography_label"]) for r in rows})
    ok_geo = geos == [("K02000001", "United Kingdom")]
    checks.append(
        Check(
            "C2",
            "UK geography K02000001",
            "pass" if ok_geo else "fail",
            f"geos={geos}",
        )
    )
    # Tax-year bounds for 2024-25
    ty_rows = [r for r in rows if "tax_year=2024-25" in (r.get("notes") or "")]
    bounds = sorted({(r["period_start"], r["period_end"]) for r in ty_rows})
    ok_bounds = bounds == [PERIOD_2024_25]
    checks.append(
        Check(
            "C2",
            "tax year 2024-25 = 6 Apr–5 Apr",
            "pass" if ok_bounds else "fail",
            f"bounds={bounds}",
        )
    )
    headline = json.loads(
        (BASE / "curated" / "headline_2024_25.json").read_text(encoding="utf-8")
    )
    ok_h = (
        headline.get("tax_year") == "2024-25"
        and headline.get("source_version") == "MTG-2026"
        and headline.get("observation_status") == "provisional"
    )
    checks.append(
        Check(
            "C2",
            "headline_2024_25.json vintage",
            "pass" if ok_h else "fail",
            f"tax_year={headline.get('tax_year')} status={headline.get('observation_status')}",
        )
    )
    return checks


def check_headline_and_spots(
    rows: list[dict[str, str]], matrices: dict[str, list[list[Any]]]
) -> list[Check]:
    checks: list[Check] = []
    t11 = matrices["Table 1.1"]
    t12 = matrices["Table 1.2"]
    t71 = matrices["Table 7.1"]

    # Total tax gap % (Table 1.1)
    wb_total_pct = cell_by_labels(
        t11,
        header_must=("Tax", "Type", "Component"),
        tax_year=TAX_YEAR_2024_25,
        matchers=[(0, "Total tax gap"), (2, "Total tax gap")],
    )
    cur_total_pct = curated_value(
        rows,
        required={
            "table": "1.1",
            "measure": "gap-percent",
            "component": "total-tax-gap",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C3",
            "Table 1.1 total gap % 2024-25",
            "pass"
            if nearly(wb_total_pct, EXPECTED["total_gap_pct"])
            and nearly(cur_total_pct, EXPECTED["total_gap_pct"])
            else "fail",
            f"workbook={wb_total_pct} curated={cur_total_pct} expected={EXPECTED['total_gap_pct']}",
        )
    )

    # Total tax gap £bn (Table 1.2)
    wb_total_gbp = cell_by_labels(
        t12,
        header_must=("Tax", "Type", "Component"),
        tax_year=TAX_YEAR_2024_25,
        matchers=[(0, "Total tax gap"), (2, "Total tax gap")],
    )
    cur_total_gbp = curated_value(
        rows,
        required={
            "table": "1.2",
            "measure": "gap-gbp-bn",
            "component": "total-tax-gap",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C3",
            "Table 1.2 total gap £bn 2024-25",
            "pass"
            if nearly(wb_total_gbp, EXPECTED["total_gap_gbp_bn"])
            and nearly(cur_total_gbp, EXPECTED["total_gap_gbp_bn"])
            else "fail",
            f"workbook={wb_total_gbp} curated={cur_total_gbp} expected={EXPECTED['total_gap_gbp_bn']}",
        )
    )

    # Theoretical liability (Table 1.2)
    wb_theory = cell_by_labels(
        t12,
        header_must=("Tax", "Type", "Component"),
        tax_year=TAX_YEAR_2024_25,
        matchers=[(0, "Total theoretical tax liability")],
    )
    cur_theory = curated_value(
        rows,
        required={
            "table": "1.2",
            "tax": "total-theoretical-tax-liability",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C3",
            "Table 1.2 theoretical liabilities £bn 2024-25",
            "pass"
            if nearly(wb_theory, EXPECTED["theoretical_liability_gbp_bn"])
            and nearly(cur_theory, EXPECTED["theoretical_liability_gbp_bn"])
            else "fail",
            f"workbook={wb_theory} curated={cur_theory} expected={EXPECTED['theoretical_liability_gbp_bn']}",
        )
    )

    # Identity: gap / theory ≈ percent (allow 0.1pp)
    if wb_total_gbp and wb_theory:
        implied = round(100.0 * wb_total_gbp / wb_theory, 1)
        ok_id = nearly(implied, EXPECTED["total_gap_pct"], tol=0.15)
        checks.append(
            Check(
                "C3",
                "identity gap/theory ≈ 6.4%",
                "pass" if ok_id else "warn",
                f"59.2/924.4→{implied}% expected={EXPECTED['total_gap_pct']}",
            )
        )

    # Headline JSON
    headline = json.loads(
        (BASE / "curated" / "headline_2024_25.json").read_text(encoding="utf-8")
    )
    ok_hj = (
        nearly(float(headline["gap_gbp_bn"]), EXPECTED["total_gap_gbp_bn"])
        and nearly(float(headline["gap_percent"]), EXPECTED["total_gap_pct"])
        and nearly(
            float(headline["theoretical_liability_gbp_bn"]),
            EXPECTED["theoretical_liability_gbp_bn"],
        )
    )
    checks.append(
        Check(
            "C3",
            "headline_2024_25.json figures",
            "pass" if ok_hj else "fail",
            (
                f"£{headline['gap_gbp_bn']}bn / {headline['gap_percent']}% / "
                f"theory £{headline['theoretical_liability_gbp_bn']}bn"
            ),
        )
    )

    # Summary HTML strings
    summary = (RAW_DIR / "summary.html").read_text(encoding="utf-8", errors="replace")
    has_pct = "6.4%" in summary or "6.4 per cent" in summary.lower()
    has_gbp = "£59.2 billion" in summary or "£59.2bn" in summary.replace(" ", "")
    # GOV.UK often uses &pound; or encoded forms
    has_gbp_alt = "59.2 billion" in summary and ("tax gap" in summary.lower())
    checks.append(
        Check(
            "C3",
            "summary.html headline strings",
            "pass" if (has_pct and (has_gbp or has_gbp_alt)) else "fail",
            f"has_6.4%={has_pct} has_59.2bn={has_gbp or has_gbp_alt}",
        )
    )

    # C4 breakdowns — VAT £bn, CT %, behaviour shares
    wb_vat = cell_by_labels(
        t12,
        header_must=("Tax", "Type", "Component"),
        tax_year=TAX_YEAR_2024_25,
        matchers=[(0, "VAT"), (2, "Total VAT")],
    )
    cur_vat = curated_value(
        rows,
        required={
            "table": "1.2",
            "component": "total-vat",
            "measure": "gap-gbp-bn",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C4",
            "VAT total gap £bn 2024-25",
            "pass"
            if nearly(wb_vat, EXPECTED["vat_gap_gbp_bn"])
            and nearly(cur_vat, EXPECTED["vat_gap_gbp_bn"])
            else "fail",
            f"workbook={wb_vat} curated={cur_vat} expected={EXPECTED['vat_gap_gbp_bn']}",
        )
    )

    wb_ct = cell_by_labels(
        t11,
        header_must=("Tax", "Type", "Component"),
        tax_year=TAX_YEAR_2024_25,
        matchers=[(0, "Corporation Tax"), (2, "Total Corporation Tax")],
    )
    cur_ct = curated_value(
        rows,
        required={
            "table": "1.1",
            "component": "total-corporation-tax",
            "measure": "gap-percent",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C4",
            "CT total gap % 2024-25",
            "pass"
            if nearly(wb_ct, EXPECTED["ct_gap_pct"]) and nearly(cur_ct, EXPECTED["ct_gap_pct"])
            else "fail",
            f"workbook={wb_ct} curated={cur_ct} expected={EXPECTED['ct_gap_pct']}",
        )
    )

    # Table 7.1 share rows (proportion / %), not £bn components.
    header_i = find_header_row(t71, "Behaviour", "Component")
    header = t71[header_i]
    ycol = year_col(header, TAX_YEAR_2024_25)
    wb_fail_share: float | None = None
    wb_evasion_share: float | None = None
    for row in t71[header_i + 1 :]:
        if not row or row[0] is None:
            continue
        beh = str(row[0]).strip().lower()
        comp = str(row[1]).strip().lower() if len(row) > 1 and row[1] is not None else ""
        if "proportion" not in comp and "%" not in comp:
            continue
        val = parse_numeric(row[ycol] if ycol < len(row) else None)
        if "failure to take reasonable care" in beh:
            wb_fail_share = val
        if beh == "evasion":
            wb_evasion_share = val

    cur_fail = curated_value(
        rows,
        required={
            "table": "7.1",
            "behaviour": "failure-to-take-reasonable-care",
            "measure": "share-of-gap-percent",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    cur_evasion = curated_value(
        rows,
        required={
            "table": "7.1",
            "behaviour": "evasion",
            "measure": "share-of-gap-percent",
            "tax_year": TAX_YEAR_2024_25,
        },
    )
    checks.append(
        Check(
            "C4",
            "behaviour failure-to-take-reasonable-care share %",
            "pass"
            if nearly(wb_fail_share, EXPECTED["failure_share_pct"])
            and nearly(cur_fail, EXPECTED["failure_share_pct"])
            else "fail",
            f"workbook={wb_fail_share} curated={cur_fail} expected={EXPECTED['failure_share_pct']}",
        )
    )
    checks.append(
        Check(
            "C4",
            "behaviour evasion share %",
            "pass"
            if nearly(wb_evasion_share, EXPECTED["evasion_share_pct"])
            and nearly(cur_evasion, EXPECTED["evasion_share_pct"])
            else "fail",
            f"workbook={wb_evasion_share} curated={cur_evasion} expected={EXPECTED['evasion_share_pct']}",
        )
    )
    return checks


def check_caveats_and_method(rows: list[dict[str, str]], manifest: dict[str, Any]) -> list[Check]:
    checks: list[Check] = []
    readme = (BASE / "README.md").read_text(encoding="utf-8")
    breaks = json.loads(
        (BASE / "curated" / "methodology_breaks.json").read_text(encoding="utf-8")
    )
    break_ids = {b["id"] for b in breaks}
    required_breaks = {
        "ct-step-2019-20",
        "behaviour-series-start",
        "projection-years",
        "note-comparability",
        "gap-not-fraud",
    }
    checks.append(
        Check(
            "C5",
            "methodology_breaks labelled",
            "pass" if required_breaks <= break_ids else "fail",
            f"ids={sorted(break_ids)}",
        )
    )

    caveats = (manifest.get("caveats") or "") + "\n" + readme
    gap_not_fraud = (
        "not the same as deliberate fraud" in caveats.lower()
        or "gap ≠ fraud" in caveats.lower()
        or "gap \u2260 fraud" in caveats
        or "do not equate the tax gap with fraud" in caveats.lower()
    )
    checks.append(
        Check(
            "C5",
            "caveat: gap ≠ fraud",
            "pass" if gap_not_fraud else "fail",
            "README/manifest deny whole-gap=fraud",
        )
    )
    proj_ok = "provisional" in caveats.lower() or "projection" in caveats.lower()
    checks.append(
        Check(
            "C5",
            "caveat: provisional / projection years",
            "pass" if proj_ok else "fail",
            "projection wording present",
        )
    )

    # Provisional status on curated rows for projection years
    bad_status = []
    for row in rows:
        tokens = notes_tokens(row.get("notes") or "")
        ty = tokens.get("tax_year", "")
        if ty in PROJECTION_YEARS and row.get("observation_status") != "provisional":
            if row.get("observation_status") == "suppressed":
                continue
            bad_status.append((ty, row.get("observation_status")))
    checks.append(
        Check(
            "C5",
            "2023-24 / 2024-25 observation_status=provisional",
            "pass" if not bad_status else "fail",
            f"non_provisional={len(bad_status)} sample={bad_status[:3]}",
        )
    )

    # Behaviour series: no curated years before 2019-20
    early = []
    for row in rows:
        tokens = notes_tokens(row.get("notes") or "")
        if tokens.get("table") != "7.1":
            continue
        ty = tokens.get("tax_year", "")
        m = re.fullmatch(r"(20\d{2})-(\d{2})", ty)
        if not m:
            continue
        start = int(m.group(1))
        if start < 2019:
            early.append(ty)
    checks.append(
        Check(
            "C5",
            "Table 7.1 no pre-2019-20 rows",
            "pass" if not early else "fail",
            f"early_rows={len(early)} sample={early[:5]}",
        )
    )
    return checks


def check_no_invention(rows: list[dict[str, str]]) -> list[Check]:
    checks: list[Check] = []
    behaviours = sorted(
        {
            notes_tokens(r.get("notes") or "").get("behaviour", "")
            for r in rows
            if notes_tokens(r.get("notes") or "").get("table") == "7.1"
        }
        - {""}
    )
    # HMRC Table 7.1 behaviours + published Total aggregate row (not invented).
    allowed = {
        "avoidance",
        "criminal-attacks",
        "error",
        "evasion",
        "failure-to-take-reasonable-care",
        "hidden-economy",
        "legal-interpretation",
        "non-payment",
        "total",
    }
    extra = set(behaviours) - allowed
    checks.append(
        Check(
            "C6",
            "behaviour labels = HMRC set only",
            "pass" if not extra else "fail",
            f"behaviours={behaviours} extra={sorted(extra)}",
        )
    )
    # Evasion must be present as a category, not the only story
    has_evasion = "evasion" in behaviours
    has_failure = "failure-to-take-reasonable-care" in behaviours
    checks.append(
        Check(
            "C6",
            "evasion is one HMRC category (not sole gap)",
            "pass" if has_evasion and has_failure else "fail",
            f"has_evasion={has_evasion} has_failure={has_failure}",
        )
    )
    # Tables curated should be only 1.1, 1.2, 1.3, 7.1
    tables = sorted(
        {
            notes_tokens(r.get("notes") or "").get("table", "")
            for r in rows
        }
        - {""}
    )
    ok_tables = set(tables) <= {"1.1", "1.2", "1.3", "7.1"}
    checks.append(
        Check(
            "C6",
            "curated tables ⊆ {1.1,1.2,1.3,7.1}",
            "pass" if ok_tables else "fail",
            f"tables={tables}",
        )
    )
    return checks


def check_no_ready_claim(manifest: dict[str, Any]) -> list[Check]:
    checks: list[Check] = []
    status = (manifest.get("status_note") or "").lower()
    readme = (BASE / "README.md").read_text(encoding="utf-8").lower()
    text = status + "\n" + readme
    # Affirmative Ready flip only — deny forms ("not Registry Ready") are required.
    not_ready = (
        "not registry ready" in text
        or "not ready" in text
        or "validation-ready" in text
    )
    no_frontend = "no frontend" in text
    claims_ready = bool(re.search(r"(?<!\bnot )(?<!not\s)status:\s*ready\b", text))
    checks.append(
        Check(
            "C7",
            "no Ready / frontend claim",
            "pass" if not_ready and no_frontend and not claims_ready else "fail",
            f"not_ready={not_ready} no_frontend={no_frontend} claims_ready={claims_ready}",
        )
    )
    return checks


def write_report(checks: list[Check], row_count: int) -> None:
    n_pass = sum(1 for c in checks if c.result == "pass")
    n_warn = sum(1 for c in checks if c.result == "warn")
    n_fail = sum(1 for c in checks if c.result == "fail")
    verdict = "pass" if n_fail == 0 and n_warn == 0 else ("warn" if n_fail == 0 else "fail")
    ready = "yes" if verdict == "pass" else "no — blockers below"

    lines = [
        "# QA report — Economy 06 hmrc-tax-gap · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `hmrc-tax-gap`",
        "- Package: `data/economy/hmrc-tax-gap/`",
        "- Handover: `docs/handover-economy-06-tax-gap.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-tax-gap.md`",
        "- Script: `validation.qa_economy_06_tax_gap_2026_11_15`",
        "- Vintage: Measuring tax gaps **2026** edition · tax year **2024–25** · "
        "release **2026-06-23** · raw `2026-11-15`",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated/raw rewrites. Headline and breakdown",
        "cells recomputed from pinned xlsx via zipfile/XML (not Economy self_qa).",
        f"Curated observation rows: **{row_count}**.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for c in checks:
        notes = c.notes.replace("|", "\\|")
        lines.append(f"| {c.check_id} | {c.name} | **{c.result}** | {notes} |")

    lines.extend(
        [
            "",
            "## Spots checked (tax year 2024–25)",
            "",
            "| Spot | Expected | Source |",
            "|------|----------|--------|",
            "| Total tax gap | £59.2bn / 6.4% | Tables 1.2 / 1.1 + summary |",
            "| Theoretical liabilities | £924.4bn | Table 1.2 |",
            "| VAT total gap | £12.1bn | Table 1.2 |",
            "| Corporation Tax total gap | 18.1% | Table 1.1 |",
            "| Failure to take reasonable care | 35% of gap | Table 7.1 |",
            "| Evasion | 12% of gap | Table 7.1 |",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({n_pass} pass / {n_warn} warn / {n_fail} fail)",
            f"- **Ready recommendation: {ready}**",
            "- Orchestrator may flip registry to Ready + schedule cloud load after PASS.",
            "- Out of scope: Tax Gap UI / EmptyStage; detailed chapter tables (2.x / 5.x); "
            "cloud load.",
            "",
            "## Blockers",
            "",
        ]
    )
    if n_fail:
        for c in checks:
            if c.result == "fail":
                lines.append(f"- **{c.check_id}** {c.name}: {c.notes}")
    else:
        lines.append("- None for Ready on `hmrc-tax-gap` (MTG-2026 pin).")
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)}")
    print(f"Verdict: {verdict} ({n_pass} pass / {n_warn} warn / {n_fail} fail)")


def main() -> None:
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    rows = load_curated()
    checks: list[Check] = []

    checks.extend(check_checksums(manifest))
    expected_count = 1682
    checks.append(
        Check(
            "C1",
            "curated row count",
            "pass" if len(rows) == expected_count else "warn",
            f"rows={len(rows)} expected={expected_count}",
        )
    )
    checks.extend(check_vintage(manifest, rows))

    xlsx = RAW_DIR / XLSX_NAME
    with zipfile.ZipFile(xlsx) as zf:
        paths = sheet_path_map(zf)
        matrices = {
            name: read_sheet_matrix(zf, paths[name])
            for name in ("Table 1.1", "Table 1.2", "Table 7.1")
        }

    checks.extend(check_headline_and_spots(rows, matrices))
    checks.extend(check_caveats_and_method(rows, manifest))
    checks.extend(check_no_invention(rows))
    checks.extend(check_no_ready_claim(manifest))

    write_report(checks, len(rows))


if __name__ == "__main__":
    main()

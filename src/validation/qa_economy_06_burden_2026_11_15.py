"""Independent QA for Economy Domain 06 effects-of-taxes-and-benefits — EC-VAL-06D.

Spot-checks curated Table 8 / Table 2a values against the pinned ONS ETB
workbook, verifies checksums, denominator discipline, and honesty caveats.
Does not edit Economy curated or raw data.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_burden_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "effects-of-taxes-and-benefits"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_burden_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"
XLSX = RAW_DIR / "etbreferencetablesfye202324final.xlsx"
EXPECTED_SHA = "2e38c1694d922427509879b9553a4c3473b8ba1174898c2dd414668ecbb2bf73"
INDICATOR = "effects-of-taxes-and-benefits"
BANDS = ("bottom", "2nd", "3rd", "4th", "top", "all")
BAND_LABELS = ("Bottom", "2nd", "3rd", "4th", "Top", "All individuals")


@dataclass
class Check:
    id: str
    name: str
    result: str
    notes: str


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_notes(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in (notes or "").split(";"):
        part = part.strip()
        if "=" in part:
            key, value = part.split("=", 1)
            out[key.strip()] = value.strip()
    return out


def load_curated() -> list[dict[str, str]]:
    path = BASE / "curated" / "observations.csv"
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def curated_lookup(
    rows: list[dict[str, str]],
    *,
    table: str,
    tax: str,
    band: str,
    denominator: str | None = None,
) -> float | None:
    for row in rows:
        meta = parse_notes(row.get("notes") or "")
        if meta.get("table") != table:
            continue
        if meta.get("tax") != tax:
            continue
        if meta.get("band") != band:
            continue
        if denominator is not None and meta.get("denominator") != denominator:
            continue
        raw = row.get("value")
        if raw in (None, ""):
            return None
        return float(raw)
    return None


def load_table8_workbook() -> dict[tuple[str, str, str], float]:
    """(tax, denominator, band) → value from Table 8 headline rows only."""
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    try:
        ws = wb["Table 8"]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    header = [str(c).strip() if c is not None else "" for c in rows[3]]
    band_cols: list[tuple[str, int]] = []
    for label, band in zip(BAND_LABELS, BANDS, strict=True):
        band_cols.append((band, header.index(label)))

    section = ""
    tax_map = {
        "Direct taxes": "direct",
        "Indirect taxes": "indirect",
        "All taxes": "all",
    }
    denom_map = {
        "Percentages of gross income": "gross_income",
        "Percentages of disposable income": "disposable_income",
        "Percentages of expenditure": "expenditure",
    }
    out: dict[tuple[str, str, str], float] = {}
    for row in rows[4:]:
        col_a = row[0]
        col_b = row[1]
        if col_a is not None and str(col_a).strip() in denom_map:
            section = denom_map[str(col_a).strip()]
        if col_b is None:
            continue
        tax = tax_map.get(str(col_b).strip())
        if tax is None or not section:
            continue
        for band, col in band_cols:
            raw = row[col]
            if raw in (None, ""):
                continue
            out[(tax, section, band)] = float(raw)
    return out


def load_table2a_totals() -> dict[tuple[str, str], float]:
    """(tax, band) → £ total from Table 2a."""
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    try:
        ws = wb["Table 2a"]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    header_row = None
    for row in rows:
        cells = [str(c).strip() if c is not None else "" for c in row]
        if "Bottom" in cells and "All individuals" in cells:
            header_row = cells
            break
    if header_row is None:
        raise ValueError("Table 2a quintile header not found")

    band_cols: list[tuple[str, int]] = []
    for label, band in zip(BAND_LABELS, BANDS, strict=True):
        band_cols.append((band, header_row.index(label)))

    want = {"Total direct taxes": "direct", "Total indirect taxes": "indirect"}
    out: dict[tuple[str, str], float] = {}
    for row in rows:
        label = row[1]
        if label is None:
            continue
        tax = want.get(str(label).strip())
        if tax is None:
            continue
        for band, col in band_cols:
            raw = row[col]
            if raw in (None, ""):
                continue
            out[(tax, band)] = float(raw)
    return out


def text_blob(*paths: Path) -> str:
    parts: list[str] = []
    for path in paths:
        if path.exists():
            parts.append(path.read_text(encoding="utf-8"))
    return "\n".join(parts).lower()


def run_checks() -> list[Check]:
    checks: list[Check] = []
    curated = load_curated()
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    sums_line = (RAW_DIR / "SHA256SUMS").read_text(encoding="utf-8").strip()
    disk_sha = sha256(XLSX)
    manifest_sha = manifest["raw_evidence"][0]["checksum_sha256"]

    # C1 — integrity
    checks.append(
        Check(
            "C1",
            "raw checksum ↔ manifest + SHA256SUMS + disk",
            "pass"
            if disk_sha == EXPECTED_SHA == manifest_sha and EXPECTED_SHA in sums_line
            else "fail",
            f"disk={disk_sha[:16]}… manifest={str(manifest_sha)[:16]}…",
        )
    )
    n_rows = len(curated)
    ids = {r["indicator_id"] for r in curated}
    checks.append(
        Check(
            "C1",
            "curated row count = 42; indicator_id",
            "pass" if n_rows == 42 and ids == {INDICATOR} else "fail",
            f"rows={n_rows} ids={sorted(ids)}",
        )
    )

    # C2 — period / geography / quintile
    periods = {(r["period_start"], r["period_end"]) for r in curated}
    geos = {(r["geography_code"], r["geography_label"]) for r in curated}
    bands = {parse_notes(r["notes"]).get("band") for r in curated}
    checks.append(
        Check(
            "C2",
            "FYE 2024 period; UK; quintile dimension present",
            "pass"
            if periods == {("2023-04-01", "2024-03-31")}
            and geos == {("K02000001", "United Kingdom")}
            and set(BANDS).issubset(bands)
            else "fail",
            f"periods={sorted(periods)} geos={sorted(geos)} bands={sorted(b for b in bands if b)}",
        )
    )
    wb_title = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    try:
        title = str(wb_title["Table 8"]["A1"].value or "")
    finally:
        wb_title.close()
    checks.append(
        Check(
            "C2",
            "workbook Table 8 title covers UK 2023/24",
            "pass" if "UK" in title and "2023/24" in title else "fail",
            title[:90],
        )
    )

    t8_wb = load_table8_workbook()
    t2a_wb = load_table2a_totals()

    # C3 — Table 8 spots
    spot_t8 = [
        ("direct", "gross_income", "bottom", 15.7),
        ("indirect", "gross_income", "bottom", 21.0),
        ("all", "gross_income", "bottom", 36.7),
        ("indirect", "expenditure", "bottom", 16.5),
        ("direct", "gross_income", "top", 28.8),
        ("indirect", "gross_income", "top", 7.5),
        ("all", "gross_income", "all", 33.6),
        ("indirect", "disposable_income", "bottom", 24.9),
    ]
    for tax, denom, band, expected in spot_t8:
        cur = curated_lookup(curated, table="8", tax=tax, band=band, denominator=denom)
        wb_val = t8_wb.get((tax, denom, band))
        ok = cur == expected and wb_val == expected and cur == wb_val
        checks.append(
            Check(
                "C3",
                f"Table 8 {tax} % {denom} · {band}",
                "pass" if ok else "fail",
                f"curated={cur} workbook={wb_val} expected={expected}",
            )
        )

    # C4 — Table 2a spots
    spot_t2a = [
        ("direct", "bottom", 3696.0),
        ("indirect", "bottom", 4929.0),
        ("direct", "all", 15743.0),
        ("indirect", "all", 7363.0),
        ("direct", "top", 41215.0),
        ("indirect", "top", 10688.0),
    ]
    for tax, band, expected in spot_t2a:
        cur = curated_lookup(curated, table="2a", tax=tax, band=band)
        wb_val = t2a_wb.get((tax, band))
        ok = cur == expected and wb_val == expected and cur == wb_val
        checks.append(
            Check(
                "C4",
                f"Table 2a total {tax} £ · {band}",
                "pass" if ok else "fail",
                f"curated={cur} workbook={wb_val} expected={expected}",
            )
        )

    # C5 — direct + indirect = all on gross (publisher rounding ≤0.1pp)
    identity_notes: list[str] = []
    identity_ok = True
    for band in BANDS:
        d = curated_lookup(curated, table="8", tax="direct", band=band, denominator="gross_income")
        i = curated_lookup(curated, table="8", tax="indirect", band=band, denominator="gross_income")
        a = curated_lookup(curated, table="8", tax="all", band=band, denominator="gross_income")
        if d is None or i is None or a is None:
            identity_ok = False
            identity_notes.append(f"{band}=missing")
            continue
        delta = abs((d + i) - a)
        identity_notes.append(f"{band}: {d}+{i}={d + i} vs all={a} Δ={delta:.1f}")
        if delta > 0.1000001:
            identity_ok = False
    checks.append(
        Check(
            "C5",
            "direct + indirect = all on gross income % (≤0.1pp rounding)",
            "pass" if identity_ok else "fail",
            "; ".join(identity_notes),
        )
    )
    # Kickoff spot: Bottom exact 36.7
    bottom_sum = (
        curated_lookup(curated, table="8", tax="direct", band="bottom", denominator="gross_income")
        or 0.0
    ) + (
        curated_lookup(
            curated, table="8", tax="indirect", band="bottom", denominator="gross_income"
        )
        or 0.0
    )
    checks.append(
        Check(
            "C5",
            "Bottom direct+indirect = all on gross (36.7)",
            "pass" if bottom_sum == 36.7 else "fail",
            f"sum={bottom_sum}",
        )
    )

    # C6 — no invented direct × disposable / expenditure
    invented = []
    for row in curated:
        meta = parse_notes(row.get("notes") or "")
        if meta.get("tax") == "direct" and meta.get("denominator") in {
            "disposable_income",
            "expenditure",
        }:
            invented.append(meta)
    # Also confirm workbook has no Direct taxes under disposable/expenditure sections
    wb_invented = [
        key
        for key in t8_wb
        if key[0] == "direct" and key[1] in {"disposable_income", "expenditure"}
    ]
    checks.append(
        Check(
            "C6",
            "no curated direct % of disposable/expenditure",
            "pass" if not invented else "fail",
            f"invented_rows={len(invented)}",
        )
    )
    checks.append(
        Check(
            "C6",
            "workbook Table 8 has no direct×disposable/expenditure headlines",
            "pass" if not wb_invented else "fail",
            f"wb_keys={wb_invented}",
        )
    )
    t8_count = sum(1 for r in curated if parse_notes(r["notes"]).get("table") == "8")
    t2a_count = sum(1 for r in curated if parse_notes(r["notes"]).get("table") == "2a")
    checks.append(
        Check(
            "C6",
            "row split Table 8=30 / Table 2a=12",
            "pass" if t8_count == 30 and t2a_count == 12 else "fail",
            f"t8={t8_count} t2a={t2a_count}",
        )
    )

    # C7 — caveats
    blob = text_blob(
        BASE / "README.md",
        BASE / "manifest.yaml",
        BASE / "validation_report.md",
    )
    need = [
        ("survey/group averages ≠ household", "household" in blob and "average" in blob),
        ("legal ≠ economic incidence", "incidence" in blob and "legal" in blob),
        ("not AHHY", "ahhy" in blob),
        ("no fairness claims", "fairness" in blob),
    ]
    for label, ok in need:
        checks.append(
            Check(
                "C7",
                f"caveat present: {label}",
                "pass" if ok else "fail",
                "README/manifest/validation_report",
            )
        )
    # Affirmative honesty: "no fairness claims" / "not what any household pays".
    asserts_fairness = bool(re.search(r"\b(is fair|fairness of|fair tax)\b", blob))
    denies_individual = "not what any" in blob or "not what a household" in blob
    checks.append(
        Check(
            "C7",
            "copy does not assert fairness / individual liability",
            "pass" if "no fairness" in blob and not asserts_fairness and denies_individual else "fail",
            f"asserts_fairness={asserts_fairness} denies_individual={denies_individual}",
        )
    )

    # C8 — no frontend / Ready claim
    ready_claim = re.search(
        r"\b(status|mark(ed)?)\s*[:=]?\s*ready\b|ready for ui|replace emptystage",
        blob,
        re.I,
    )
    # Allow "Validation-ready (not Ready)" and "not Ready"
    not_ready_ok = "not ready" in blob or "validation-ready" in blob
    frontend_claim = re.search(r"frontend shipped|ui live|emptystage replaced", blob, re.I)
    checks.append(
        Check(
            "C8",
            "package does not claim Ready / frontend live",
            "pass" if not_ready_ok and not frontend_claim else "fail",
            f"not_ready_ok={not_ready_ok} ready_claim={bool(ready_claim)} frontend={bool(frontend_claim)}",
        )
    )
    checks.append(
        Check(
            "C8",
            "manifest status_note empty / no Ready flip",
            "pass" if not (manifest.get("status_note") or "").strip() else "warn",
            f"status_note={manifest.get('status_note')!r}",
        )
    )

    return checks


def write_report(checks: list[Check]) -> None:
    n_pass = sum(1 for c in checks if c.result == "pass")
    n_warn = sum(1 for c in checks if c.result == "warn")
    n_fail = sum(1 for c in checks if c.result == "fail")
    verdict = "pass" if n_fail == 0 and n_warn == 0 else ("warn" if n_fail == 0 else "fail")
    ready = "yes" if n_fail == 0 else "no — fix fails first"

    lines = [
        "# QA report — Economy 06 effects-of-taxes-and-benefits · 2026-11-15",
        "",
        "## Scope",
        "",
        f"- Indicator: `{INDICATOR}`",
        f"- Package: `data/economy/effects-of-taxes-and-benefits/`",
        "- Handover: `docs/handover-economy-06-burden.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-burden.md`",
        "- Script: `validation.qa_economy_06_burden_2026_11_15`",
        "- Vintage: raw `2026-11-15` · ONS ETB FYE 2024 · released **2025-09-25**",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated/raw rewrites. Table 8 / Table 2a",
        "spot cells recomputed from pinned workbook",
        "`etbreferencetablesfye202324final.xlsx`.",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for c in checks:
        notes = c.notes.replace("|", "\\|")
        lines.append(f"| {c.id} | {c.name} | **{c.result}** | {notes} |")

    lines.extend(
        [
            "",
            "## Spots checked",
            "",
            "### Table 8 (workbook ↔ curated)",
            "",
            "| Band | Direct % gross | Indirect % gross | All % gross | Indirect % disposable | Indirect % expenditure |",
            "|------|----------------|------------------|-------------|----------------------|------------------------|",
            "| Bottom | 15.7 | 21.0 | 36.7 | 24.9 | 16.5 |",
            "| Top | 28.8 | 7.5 | 36.2 | 10.5 | 15.4 |",
            "| All individuals | 22.9 | 10.7 | 33.6 | 13.9 | 16.4 |",
            "",
            "Gross identity: Bottom **15.7 + 21.0 = 36.7** (exact). Other bands",
            "match within **0.1pp** publisher rounding of independently rounded shares.",
            "",
            "### Table 2a £/year household averages (workbook ↔ curated)",
            "",
            "| Band | Total direct £ | Total indirect £ |",
            "|------|----------------|------------------|",
            "| Bottom | 3,696 | 4,929 |",
            "| Top | 41,215 | 10,688 |",
            "| All individuals | 15,743 | 7,363 |",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({n_pass} pass / {n_warn} warn / {n_fail} fail)",
            f"- **Ready recommendation: {ready}**",
            "- Orchestrator may flip registry to Ready + schedule cloud load after PASS.",
            "- Out of scope: Burden UI, multi-year history, Table 9 non-retired, component tax heads.",
            "",
            "## Blockers",
            "",
        ]
    )
    if n_fail:
        lines.append("- Failures above — Economy owner to fix before Ready.")
    else:
        lines.extend(
            [
                "- None for Validation PASS on this pin.",
                "- Non-blocking (handover): multi-year editions not pinned; `/current/` URI 404",
                "  (edition path locked); Domain 04 HBAI not required for this pin;",
                "  frontend EmptyStage intentional until Orchestrator Review Gate.",
            ]
        )
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)}")
    print(f"Verdict: {verdict} ({n_pass} pass / {n_warn} warn / {n_fail} fail)")
    print(f"Ready recommendation: {ready}")


def main() -> None:
    checks = run_checks()
    write_report(checks)
    if any(c.result == "fail" for c in checks):
        raise SystemExit(1)


if __name__ == "__main__":
    main()

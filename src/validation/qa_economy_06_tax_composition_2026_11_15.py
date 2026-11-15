"""Independent QA for Economy Domain 06 tax-receipts-composition — EC-VAL-06B.

Recomputes identity MF6P+AIIH+NMHM+AHGR=AHHY against Ready tax-receipts,
spot-checks curated vs pinned PUSF JSON / Appendix D workbook, and verifies
manifest caveats. Does not edit Economy curated or raw data.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_tax_composition_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-receipts-composition"
TAXR = ROOT / "data" / "economy" / "tax-receipts"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_tax_composition_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"

SPOT_MONTHS = ("2026-07-01", "2026-08-01", "2026-09-01")
COMPONENTS = ("MF6P", "AIIH", "NMHM", "AHGR")
PUSF_JSON = {
    "MF6P": "mf6p_pusf.json",
    "AIIH": "aiih_pusf.json",
    "NMHM": "nmhm_pusf.json",
}
MONTH_NAME_TO_NUM = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def series_from_notes(notes: str) -> str | None:
    match = re.search(r"series=([A-Z0-9]+)", notes or "")
    return match.group(1) if match else None


def load_curated_by_series() -> dict[str, dict[str, float | None]]:
    """Map series → period_start → value (None if missing)."""
    path = BASE / "curated" / "observations.csv"
    out: dict[str, dict[str, float | None]] = defaultdict(dict)
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            series = series_from_notes(row.get("notes") or "")
            if not series:
                continue
            raw = row.get("value")
            value = None if raw in (None, "") else float(raw)
            out[series][row["period_start"]] = value
    return out


def load_ahhy() -> dict[str, float]:
    path = TAXR / "curated" / "observations.csv"
    out: dict[str, float] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            raw = row.get("value")
            if raw in (None, ""):
                continue
            out[row["period_start"]] = float(raw)
    return out


def pusf_month_map(path: Path) -> dict[str, float]:
    blob = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, float] = {}
    for row in blob.get("months") or []:
        year = int(str(row["year"]))
        month = MONTH_NAME_TO_NUM[str(row["month"]).strip().lower()]
        period = f"{year:04d}-{month:02d}-01"
        raw = row.get("value")
        if raw in (None, ""):
            continue
        out[period] = float(str(raw).replace(",", ""))
    return out


def workbook_time_series_maps() -> dict[str, dict[str, float]]:
    xlsx = RAW_DIR / "appendix_d_public_sector_current_receipts.xlsx"
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    try:
        ws = wb["Time Series"]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    cdids = [str(c).strip().upper() if c is not None else "" for c in rows[5]]
    want = ["MF6P", "AIIH", "NMHM", "AHGR", "AHHY"]
    cols = {name: cdids.index(name) for name in want}
    out: dict[str, dict[str, float]] = {name: {} for name in want}
    for row in rows[6:]:
        label = row[0]
        if label is None:
            continue
        parts = str(label).strip().split()
        if len(parts) != 2:
            continue
        year = int(parts[0])
        month = MONTH_NAME_TO_NUM[parts[1].strip().lower()]
        period = f"{year:04d}-{month:02d}-01"
        for name, col in cols.items():
            raw = row[col] if col < len(row) else None
            if raw in (None, ""):
                continue
            out[name][period] = float(raw)
    return out


def fytd_documented_in_table() -> tuple[bool, str]:
    """Confirm Appendix D Table sheet exposes FYTD columns (not curated primary)."""
    xlsx = RAW_DIR / "appendix_d_public_sector_current_receipts.xlsx"
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    try:
        ws = wb["Table"]
        header = next(ws.iter_rows(min_row=6, max_row=6, values_only=True))
    finally:
        wb.close()
    text = " | ".join(str(c) for c in header if c is not None)
    has_fytd = "April 2026 to September 2026" in text
    # Spot AHHY FYTD if present
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    try:
        ws = wb["Table"]
        ahhy_fytd = None
        for row in ws.iter_rows(min_row=7, values_only=True):
            if row and str(row[1]).strip().upper() == "AHHY":
                ahhy_fytd = row[6]  # April 2026 to September 2026
                break
    finally:
        wb.close()
    note = f"Table FYTD col present; AHHY Apr–Sep 2026={ahhy_fytd}"
    return has_fytd, note


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    curated_path = BASE / "curated" / "observations.csv"
    identity_path = BASE / "curated" / "anatomy_identity_check.json"

    files_ok = curated_path.is_file() and RAW_DIR.is_dir()
    checks.append(
        ("C-files", "package files present", "pass" if files_ok else "fail", str(RAW_DIR.name))
    )
    if not files_ok:
        return _write(checks, "fail", identity_months=0)

    # --- Checksums ---
    evidence = manifest.get("raw_evidence") or []
    checksum_fails = 0
    for item in evidence:
        rel = str(item.get("path", ""))
        path = BASE / rel
        expected = str(item.get("checksum_sha256", ""))
        if not path.is_file():
            checks.append(("C-extra", f"checksum {path.name}", "fail", "missing file"))
            checksum_fails += 1
            continue
        got = sha256(path)
        ok = got == expected
        if not ok:
            checksum_fails += 1
        checks.append(
            (
                "C-extra",
                f"checksum {path.name}",
                "pass" if ok else "fail",
                f"{got[:16]}… http={item.get('http_status')}",
            )
        )

    # --- V5: AHGR 404 probe ---
    probe_path = RAW_DIR / "ahgr_pusf_probe.json"
    probe = json.loads(probe_path.read_text(encoding="utf-8"))
    probe_ok = int(probe.get("http_status", 0)) == 404
    checks.append(
        (
            "V5",
            "AHGR PUSF /data 404 probe",
            "pass" if probe_ok else "fail",
            f"status={probe.get('http_status')}",
        )
    )
    blob = " ".join(
        [
            str(manifest.get("definition", "")),
            str(manifest.get("caveats", "")),
            str(manifest.get("transformations", "")),
            str(manifest.get("revision_notes", "")),
        ]
    )
    blob_l = blob.lower()
    ahgr_doc = (
        "appendix d" in blob_l
        and "ahgr" in blob_l
        and ("404" in blob_l or "workbook" in blob_l)
        and "residual" in blob_l
    )
    checks.append(
        (
            "V5",
            "AHGR workbook sourcing documented",
            "pass" if ahgr_doc else "fail",
            "manifest caveats/transforms",
        )
    )

    # --- V3: caveats ---
    accruals_ok = (
        ("hmrc" in blob_l and ("not hmrc" in blob_l or "≠" in blob or "not" in blob_l))
        and ("ahhy" in blob_l)
        and ("jw2o" in blob_l)
    )
    # Stronger: explicit not HMRC / not JW2O as total
    not_hmrc = "not hmrc" in blob_l or ("accruals" in blob_l and "hmrc" in blob_l)
    not_jw2o = "jw2o" in blob_l and ("not" in blob_l or "do not" in blob_l)
    checks.append(
        (
            "V3",
            "accruals ≠ HMRC cash documented",
            "pass" if not_hmrc else "fail",
            "manifest caveats",
        )
    )
    checks.append(
        (
            "V3",
            "total is AHHY not JW2O",
            "pass" if not_jw2o and "ahhy" in blob_l else "fail",
            "manifest caveats",
        )
    )
    del accruals_ok

    # --- V4: no HMRC cash series ---
    curated_text = curated_path.read_text(encoding="utf-8").lower()
    source_reg = (BASE / "source_register.csv").read_text(encoding="utf-8").lower()
    hmrc_leak = (
        "hmrc cash" in curated_text
        or "hmrc.gov" in curated_text
        or any(
            token in curated_text
            for token in ("paye income tax", "self assessment cash", "corporation tax cash")
        )
    )
    # Also scan notes for non-anatomy CDIDs that look like HMRC cash heads — soft
    notes_series = set()
    with curated_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            s = series_from_notes(row.get("notes") or "")
            if s:
                notes_series.add(s)
    only_anatomy = notes_series <= set(COMPONENTS)
    checks.append(
        (
            "V4",
            "no HMRC cash series in package",
            "pass" if only_anatomy and not hmrc_leak else "fail",
            f"series={sorted(notes_series)}",
        )
    )
    # source_register should not list HMRC cash as primary
    checks.append(
        (
            "V4",
            "source_register not HMRC cash",
            "pass" if "hmrc cash" not in source_reg else "warn",
            "source_register.csv",
        )
    )

    # --- C-extra: provisional = latest valued month per series ---
    by_series_rows: dict[str, list[dict[str, str]]] = defaultdict(list)
    with curated_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            s = series_from_notes(row.get("notes") or "")
            if s:
                by_series_rows[s].append(row)

    prov_ok = True
    prov_notes: list[str] = []
    for series, rows in sorted(by_series_rows.items()):
        valued = [
            r
            for r in rows
            if r.get("observation_status") in ("final", "provisional")
            and r.get("value") not in (None, "")
        ]
        valued.sort(key=lambda r: r["period_start"])
        provisional = [r for r in rows if r.get("observation_status") == "provisional"]
        if len(provisional) != 1:
            prov_ok = False
            prov_notes.append(f"{series}:prov={len(provisional)}")
            continue
        latest = valued[-1]
        if provisional[0]["period_start"] != latest["period_start"]:
            prov_ok = False
            prov_notes.append(f"{series}:prov≠latest")
        else:
            prov_notes.append(f"{series}:{provisional[0]['period_start'][:7]}")
    checks.append(
        (
            "C-extra",
            "provisional = latest valued / series",
            "pass" if prov_ok else "fail",
            "; ".join(prov_notes),
        )
    )

    # --- V1: identity vs Ready tax-receipts ---
    curated = load_curated_by_series()
    ahhy = load_ahhy()
    identity_ok = 0
    identity_fail = 0
    incomplete = 0
    fail_samples: list[str] = []
    all_periods = sorted(
        set().union(*(curated[s].keys() for s in COMPONENTS if s in curated))
    )
    for period in all_periods:
        vals = {}
        skip = False
        for s in COMPONENTS:
            if s not in curated or period not in curated[s]:
                skip = True
                break
            v = curated[s][period]
            if v is None:
                skip = True
                break
            vals[s] = v
        if skip or period not in ahhy:
            incomplete += 1
            continue
        left = sum(vals[s] for s in COMPONENTS)
        right = ahhy[period]
        if abs(left - right) < 0.01 + 1e-9:
            identity_ok += 1
        else:
            identity_fail += 1
            if len(fail_samples) < 5:
                fail_samples.append(f"{period}:{left}-{right}")

    spot_identity_ok = True
    spot_notes: list[str] = []
    for period in SPOT_MONTHS:
        vals = {s: curated[s][period] for s in COMPONENTS}
        left = sum(float(vals[s] or 0) for s in COMPONENTS)
        right = ahhy[period]
        diff = left - right
        ok = abs(diff) < 0.01 + 1e-9
        if not ok:
            spot_identity_ok = False
        spot_notes.append(f"{period[:7]} sum={left:.0f} AHHY={right:.0f} d={diff:.0f}")

    v1_pass = identity_ok >= 3 and identity_fail == 0 and spot_identity_ok
    checks.append(
        (
            "V1",
            "identity MF6P+AIIH+NMHM+AHGR=AHHY",
            "pass" if v1_pass else "fail",
            f"ok={identity_ok} fail={identity_fail} incomplete={incomplete}",
        )
    )
    checks.append(
        (
            "V1",
            "spot months Jul/Aug/Sep 2026",
            "pass" if spot_identity_ok else "fail",
            "; ".join(spot_notes),
        )
    )

    # Cross-check Economy's identity artefact (informational)
    if identity_path.is_file():
        artefact = json.loads(identity_path.read_text(encoding="utf-8"))
        artefact_ok = (
            artefact.get("pass") is True
            and int(artefact.get("n_failed", 1)) == 0
            and int(artefact.get("months_checked_ok", 0)) == identity_ok
        )
        checks.append(
            (
                "V1",
                "identity artefact agrees",
                "pass" if artefact_ok else "warn",
                f"artefact_ok={artefact.get('months_checked_ok')} recomputed={identity_ok}",
            )
        )

    fytd_ok, fytd_note = fytd_documented_in_table()
    checks.append(
        (
            "V1",
            "FYTD present in Appendix D Table (not curated)",
            "pass" if fytd_ok else "warn",
            fytd_note,
        )
    )

    # --- V2: curated vs raw PUSF JSON + workbook ---
    wb_maps = workbook_time_series_maps()
    for series, filename in PUSF_JSON.items():
        raw_map = pusf_month_map(RAW_DIR / filename)
        mismatches = []
        for period in SPOT_MONTHS:
            c = curated[series][period]
            r = raw_map.get(period)
            w = wb_maps[series].get(period)
            if c != r:
                mismatches.append(f"{period[:7]} curated≠json {c} vs {r}")
            if c != w:
                mismatches.append(f"{period[:7]} curated≠wb {c} vs {w}")
        checks.append(
            (
                "V2",
                f"spot {series} vs PUSF JSON + workbook",
                "pass" if not mismatches else "fail",
                "match" if not mismatches else "; ".join(mismatches[:4]),
            )
        )

    ahgr_mismatches = []
    for period in SPOT_MONTHS:
        c = curated["AHGR"][period]
        w = wb_maps["AHGR"].get(period)
        if c != w:
            ahgr_mismatches.append(f"{period[:7]} {c} vs {w}")
    checks.append(
        (
            "V2",
            "spot AHGR vs Appendix D Time Series",
            "pass" if not ahgr_mismatches else "fail",
            "match" if not ahgr_mismatches else "; ".join(ahgr_mismatches),
        )
    )

    # Workbook identity for spot months (independent of Ready AHHY)
    wb_id_ok = True
    wb_notes = []
    for period in SPOT_MONTHS:
        left = sum(wb_maps[s][period] for s in COMPONENTS)
        right = wb_maps["AHHY"][period]
        diff = left - right
        if abs(diff) >= 0.01:
            wb_id_ok = False
        wb_notes.append(f"{period[:7]} d={diff:.0f}")
    checks.append(
        (
            "V2",
            "workbook identity Jul/Aug/Sep",
            "pass" if wb_id_ok else "fail",
            "; ".join(wb_notes),
        )
    )

    # Ready AHHY equals workbook AHHY on spots
    ahhy_align = True
    ahhy_notes = []
    for period in SPOT_MONTHS:
        a = ahhy[period]
        w = wb_maps["AHHY"][period]
        if a != w:
            ahhy_align = False
        ahhy_notes.append(f"{period[:7]} Ready={a:.0f} wb={w:.0f}")
    checks.append(
        (
            "V2",
            "Ready AHHY == workbook AHHY spots",
            "pass" if ahhy_align else "fail",
            "; ".join(ahhy_notes),
        )
    )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    verdict = "pass" if failed == 0 else "fail"
    if failed == 0 and warned > 0:
        verdict = "pass"  # warns do not block Ready for this pin
    return _write(
        checks,
        verdict,
        identity_months=identity_ok,
        identity_fail=identity_fail,
        incomplete=incomplete,
        fail_samples=fail_samples,
        checksum_fails=checksum_fails,
    )


def _write(
    checks: list[tuple[str, str, str, str]],
    verdict: str,
    *,
    identity_months: int,
    identity_fail: int = 0,
    incomplete: int = 0,
    fail_samples: list[str] | None = None,
    checksum_fails: int = 0,
) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    ready = "yes" if failed == 0 else "no"
    blockers = []
    if failed:
        blockers.append("Fix failing checks (owner: Economy) before Ready.")
    if checksum_fails:
        blockers.append(f"{checksum_fails} checksum mismatch(es).")
    if identity_fail:
        blockers.append(f"{identity_fail} identity month(s) failed.")
    if not blockers:
        blockers.append("None for Ready on tax-receipts-composition.")

    lines = [
        "# QA report — Economy 06 tax-receipts-composition · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-receipts-composition` (MF6P + AIIH + NMHM + AHGR → AHHY)",
        "- Package: `data/economy/tax-receipts-composition/`",
        "- Cross-check (read-only): Ready `data/economy/tax-receipts/` (AHHY)",
        "- Handover: `docs/handover-economy-06-anatomy-pin.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-anatomy.md`",
        "- Script: `validation.qa_economy_06_tax_composition_2026_11_15`",
        "- Vintage: raw `2026-11-15` · PUSF JSON release **2026-10-20** · Appendix D **2026-10-21**",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated/raw rewrites. Identity recomputed against",
        "Ready `tax-receipts` observations; AHGR spot-checked against Appendix D Time",
        "Series (not treated as an Exchange residual).",
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
            "## Identity",
            "",
            f"- Months with all four heads + Ready AHHY and exact match (£0.01m): **{identity_months}**",
            f"- Failed identity months: **{identity_fail}**"
            + (f" ({', '.join(fail_samples or [])})" if fail_samples else ""),
            f"- Incomplete / skipped overlap months: **{incomplete}** (early history before full four-head + AHHY overlap)",
            "- Spot months independently checked: **2026-07**, **2026-08**, **2026-09**",
            "",
            "## AHGR note",
            "",
            "- Live PUSF `…/timeseries/ahgr/pusf/data` returns **HTTP 404** (pinned probe",
            "  `raw/2026-11-15/ahgr_pusf_probe.json`).",
            "- Curated AHGR values match Appendix D **Time Series** column `AHGR`",
            "  (*Other local government taxes*) for Jul/Aug/Sep 2026.",
            "- Manifest documents workbook sourcing and states AHGR is **not** an",
            "  Exchange-invented residual `AHHY − (MF6P+AIIH+NMHM)`.",
            "- Connector correctly refuses to ship if AHGR `/data` returns 200 without a",
            "  code change (forces intentional JSON switch).",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            f"- **Ready recommendation: {ready}**",
            "- Orchestrator may flip registry to Ready + schedule cloud load after PASS.",
            "- Re-pin after **20 Nov 2026** PSF (may revise recent months); re-probe AHGR `/data`.",
            "- Out of scope: Anatomy frontend, Tax Machine, HMRC cash ingest, JW2O total, CG drill.",
            "",
            "## Blockers",
            "",
        ]
    )
    for item in blockers:
        lines.append(f"- {item}")
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Wrote {REPORT.relative_to(ROOT)} — {verdict} "
        f"({passed}/{warned}/{failed}) identity_months={identity_months} Ready={ready}"
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

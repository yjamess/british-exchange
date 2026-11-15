"""Independent QA for Economy Domain 06 tax-receipts-cg-composition — EC-VAL-06B-DRILL.

Recomputes identity NMBY+NMCU+LIQR=MF6P against pinned MF6P JSON and Ready
tax-receipts-composition (series=MF6P), spot-checks curated leaves vs PUSF JSON
/ Appendix D workbook, and verifies manifest caveats. Does not edit Economy
curated or raw data.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_tax_cg_composition_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-receipts-cg-composition"
PARENT = ROOT / "data" / "economy" / "tax-receipts-composition"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_tax_cg_composition_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"

SPOT_MONTHS = ("2026-07-01", "2026-08-01", "2026-09-01")
LEAVES = ("NMBY", "NMCU", "LIQR")
DEFERRED = ("LIBR", "NZGF", "CPRN")
PUSF_JSON = {
    "NMBY": "nmby_pusf.json",
    "NMCU": "nmcu_pusf.json",
    "LIQR": "liqr_pusf.json",
    "MF6P": "mf6p_pusf.json",
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


def load_curated_by_series(path: Path) -> dict[str, dict[str, float | None]]:
    """Map series → period_start → value (None if missing)."""
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


def load_parent_mf6p() -> dict[str, float]:
    """Ready tax-receipts-composition series=MF6P only (read-only)."""
    path = PARENT / "curated" / "observations.csv"
    out: dict[str, float] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if series_from_notes(row.get("notes") or "") != "MF6P":
                continue
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
    want = ["NMBY", "NMCU", "LIQR", "MF6P"]
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


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    curated_path = BASE / "curated" / "observations.csv"
    identity_path = BASE / "curated" / "cg_identity_check.json"

    files_ok = curated_path.is_file() and RAW_DIR.is_dir() and (PARENT / "curated" / "observations.csv").is_file()
    checks.append(
        (
            "C-files",
            "package + Ready parent present",
            "pass" if files_ok else "fail",
            f"raw={RAW_DIR.name}; parent=tax-receipts-composition",
        )
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

    # --- V4: accruals / NAB caveats ---
    blob = " ".join(
        [
            str(manifest.get("definition", "")),
            str(manifest.get("caveats", "")),
            str(manifest.get("transformations", "")),
            str(manifest.get("revision_notes", "")),
        ]
    )
    blob_l = blob.lower()
    not_hmrc = (
        "hmrc" in blob_l
        and ("not hmrc" in blob_l or "≠" in blob or "not" in blob_l)
        and ("accrual" in blob_l or "national accounts" in blob_l or "nab" in blob_l)
    )
    sibling_ok = (
        "tax-receipts-composition" in blob_l
        and "mf6p" in blob_l
        and ("sibling" in blob_l or "does not rewrite" in blob_l or "not rewrite" in blob_l)
    )
    not_ahhy_rewrite = "ahhy" in blob_l and (
        "does not rewrite" in blob_l or "not rewrite" in blob_l or "four-head" in blob_l
    )
    checks.append(
        (
            "V4",
            "accruals ≠ HMRC cash documented",
            "pass" if not_hmrc else "fail",
            "manifest caveats",
        )
    )
    checks.append(
        (
            "V4",
            "sibling under MF6P; parent AHHY not rewritten",
            "pass" if sibling_ok and not_ahhy_rewrite else "fail",
            "manifest caveats/definition",
        )
    )

    # --- V5: no HMRC cash / no incomplete deeper residual ---
    curated_text = curated_path.read_text(encoding="utf-8")
    curated_lower = curated_text.lower()
    source_reg = (BASE / "source_register.csv").read_text(encoding="utf-8")
    source_lower = source_reg.lower()

    notes_series: set[str] = set()
    with curated_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            s = series_from_notes(row.get("notes") or "")
            if s:
                notes_series.add(s)

    only_leaves = notes_series == set(LEAVES)
    hmrc_leak = (
        "hmrc cash" in curated_lower
        or "hmrc.gov" in curated_lower
        or any(
            token in curated_lower
            for token in ("paye income tax", "self assessment cash", "corporation tax cash")
        )
    )
    checks.append(
        (
            "V5",
            "no HMRC cash series in package",
            "pass" if only_leaves and not hmrc_leak else "fail",
            f"series={sorted(notes_series)}",
        )
    )
    checks.append(
        (
            "V5",
            "source_register leaves only (MF6P evidence)",
            "pass" if "hmrc cash" not in source_lower and "NMBY" in source_reg else "fail",
            "source_register.csv",
        )
    )

    deferred_absent = all(
        token not in notes_series and f"series={token}" not in curated_text
        for token in DEFERRED
    )
    deferred_labelled = all(token in blob for token in DEFERRED) and (
        "deferred" in blob_l or "second-depth" in blob_l or "second depth" in blob_l
    )
    no_invented_residual = "invented residual" in blob_l or "no invented" in blob_l
    checks.append(
        (
            "V5",
            "no incomplete deeper residual (LIBR/NZGF/CPRN deferred)",
            "pass" if deferred_absent and deferred_labelled and no_invented_residual else "fail",
            "deferred labelled; not curated",
        )
    )

    # MF6P must not appear as a curated leaf series
    mf6p_not_leaf = "MF6P" not in notes_series
    checks.append(
        (
            "V5",
            "MF6P not curated as leaf (identity evidence only)",
            "pass" if mf6p_not_leaf else "fail",
            f"curated_series={sorted(notes_series)}",
        )
    )

    # --- C-extra: provisional = latest valued month per leaf ---
    by_series_rows: dict[str, list[dict[str, str]]] = defaultdict(list)
    status_counts: Counter[str] = Counter()
    with curated_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            status_counts[row.get("observation_status") or ""] += 1
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
            "provisional = latest valued / leaf",
            "pass" if prov_ok else "fail",
            "; ".join(prov_notes),
        )
    )
    status_note = ", ".join(f"{k}={v}" for k, v in sorted(status_counts.items()) if k)
    expected_status = status_counts.get("missing", 0) == 51 and status_counts.get(
        "final", 0
    ) == 1059 and status_counts.get("provisional", 0) == 3
    checks.append(
        (
            "C-extra",
            "status counts (1059 final / 3 provisional / 51 missing)",
            "pass" if expected_status else "warn",
            status_note,
        )
    )

    # --- Load series maps ---
    curated = load_curated_by_series(curated_path)
    parent_mf6p = load_parent_mf6p()
    pinned_mf6p = pusf_month_map(RAW_DIR / "mf6p_pusf.json")
    wb_maps = workbook_time_series_maps()

    # --- V1: identity NMBY+NMCU+LIQR = MF6P (pinned) ---
    identity_ok = 0
    identity_fail = 0
    incomplete = 0
    fail_samples: list[str] = []
    all_periods = sorted(set().union(*(curated[s].keys() for s in LEAVES if s in curated)))
    for period in all_periods:
        vals: dict[str, float] = {}
        skip = False
        for s in LEAVES:
            if s not in curated or period not in curated[s]:
                skip = True
                break
            v = curated[s][period]
            if v is None:
                skip = True
                break
            vals[s] = v
        if skip or period not in pinned_mf6p:
            incomplete += 1
            continue
        left = sum(vals[s] for s in LEAVES)
        right = pinned_mf6p[period]
        if abs(left - right) < 0.01 + 1e-9:
            identity_ok += 1
        else:
            identity_fail += 1
            if len(fail_samples) < 5:
                fail_samples.append(f"{period}:{left}-{right}")

    spot_rows: list[dict[str, float | str]] = []
    spot_identity_ok = True
    spot_notes: list[str] = []
    for period in SPOT_MONTHS:
        vals = {s: float(curated[s][period] or 0) for s in LEAVES}
        left = sum(vals[s] for s in LEAVES)
        right = pinned_mf6p[period]
        ready = parent_mf6p[period]
        diff = left - right
        ok = abs(diff) < 0.01 + 1e-9 and abs(right - ready) < 0.01 + 1e-9
        if not ok:
            spot_identity_ok = False
        spot_notes.append(
            f"{period[:7]} sum={left:.0f} MF6P={right:.0f} ready={ready:.0f} d={diff:.0f}"
        )
        spot_rows.append(
            {
                "period": period,
                "NMBY": vals["NMBY"],
                "NMCU": vals["NMCU"],
                "LIQR": vals["LIQR"],
                "sum": left,
                "MF6P_pinned": right,
                "MF6P_ready": ready,
                "diff": diff,
            }
        )

    v1_pass = identity_ok >= 3 and identity_fail == 0 and spot_identity_ok
    checks.append(
        (
            "V1",
            "identity NMBY+NMCU+LIQR=MF6P",
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

    if identity_path.is_file():
        artefact = json.loads(identity_path.read_text(encoding="utf-8"))
        artefact_ok = (
            artefact.get("pass") is True
            and int(artefact.get("n_failed", 1)) == 0
            and int(artefact.get("months_checked_ok", 0)) == identity_ok
            and int(artefact.get("n_mf6p_ready_vs_pinned_mismatches", 1)) == 0
        )
        checks.append(
            (
                "V1",
                "identity artefact agrees",
                "pass" if artefact_ok else "warn",
                f"artefact_ok={artefact.get('months_checked_ok')} recomputed={identity_ok}",
            )
        )

    # --- V3: pinned MF6P == Ready composition series=MF6P ---
    ready_mismatches: list[str] = []
    ready_ok = 0
    overlap = sorted(set(pinned_mf6p) & set(parent_mf6p))
    for period in overlap:
        if abs(pinned_mf6p[period] - parent_mf6p[period]) >= 0.01 + 1e-9:
            if len(ready_mismatches) < 5:
                ready_mismatches.append(
                    f"{period}:{pinned_mf6p[period]}≠{parent_mf6p[period]}"
                )
        else:
            ready_ok += 1
    v3_pass = len(ready_mismatches) == 0 and ready_ok >= 3
    checks.append(
        (
            "V3",
            "pinned MF6P == Ready tax-receipts-composition MF6P",
            "pass" if v3_pass else "fail",
            f"ok={ready_ok} mismatches={len(ready_mismatches)} overlap={len(overlap)}",
        )
    )
    # Spot Ready alignment already baked into spot_identity_ok; explicit line:
    spot_ready_ok = all(
        abs(float(r["MF6P_pinned"]) - float(r["MF6P_ready"])) < 0.01 + 1e-9 for r in spot_rows
    )
    checks.append(
        (
            "V3",
            "spot MF6P Ready == pinned",
            "pass" if spot_ready_ok else "fail",
            "; ".join(f"{r['period'][:7]}={float(r['MF6P_ready']):.0f}" for r in spot_rows),
        )
    )

    # --- V2: curated leaves vs PUSF JSON + workbook ---
    for series, filename in PUSF_JSON.items():
        if series == "MF6P":
            continue  # not curated as leaf
        raw_map = pusf_month_map(RAW_DIR / filename)
        mismatches: list[str] = []
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

    # Full curated vs JSON for each leaf (not just spots)
    full_leaf_ok = True
    full_notes: list[str] = []
    for series, filename in PUSF_JSON.items():
        if series == "MF6P":
            continue
        raw_map = pusf_month_map(RAW_DIR / filename)
        n_match = 0
        n_miss = 0
        for period, cval in curated[series].items():
            if cval is None:
                if period in raw_map:
                    n_miss += 1
                continue
            rval = raw_map.get(period)
            if rval is None or abs(cval - rval) >= 0.01 + 1e-9:
                n_miss += 1
            else:
                n_match += 1
        if n_miss:
            full_leaf_ok = False
        full_notes.append(f"{series}:match={n_match} miss={n_miss}")
    checks.append(
        (
            "V2",
            "full curated leaves vs PUSF JSON",
            "pass" if full_leaf_ok else "fail",
            "; ".join(full_notes),
        )
    )

    # Workbook identity for spot months
    wb_id_ok = True
    wb_notes: list[str] = []
    for period in SPOT_MONTHS:
        left = sum(wb_maps[s][period] for s in LEAVES)
        right = wb_maps["MF6P"][period]
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

    # Discovery matrix Sep 2026 spot (66,282)
    sep = "2026-09-01"
    sep_sum = sum(float(curated[s][sep] or 0) for s in LEAVES)
    sep_ok = abs(sep_sum - 66282.0) < 0.01 + 1e-9 and abs(pinned_mf6p[sep] - 66282.0) < 0.01
    checks.append(
        (
            "V2",
            "Sep 2026 matches discovery matrix (66,282)",
            "pass" if sep_ok else "fail",
            f"sum={sep_sum:.0f} MF6P={pinned_mf6p[sep]:.0f}",
        )
    )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    verdict = "pass" if failed == 0 else "fail"
    return _write(
        checks,
        verdict,
        identity_months=identity_ok,
        identity_fail=identity_fail,
        incomplete=incomplete,
        fail_samples=fail_samples,
        checksum_fails=checksum_fails,
        spot_rows=spot_rows,
        ready_ok=ready_ok,
        ready_mismatches=len(ready_mismatches),
        status_note=status_note,
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
    spot_rows: list[dict[str, float | str]] | None = None,
    ready_ok: int = 0,
    ready_mismatches: int = 0,
    status_note: str = "",
) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")
    ready = "yes" if failed == 0 else "no"
    blockers: list[str] = []
    if failed:
        blockers.append("Fix failing checks (owner: Economy) before Ready.")
    if checksum_fails:
        blockers.append(f"{checksum_fails} checksum mismatch(es).")
    if identity_fail:
        blockers.append(f"{identity_fail} identity month(s) failed.")
    if not blockers:
        blockers.append("None for Ready on tax-receipts-cg-composition.")

    lines = [
        "# QA report — Economy 06 tax-receipts-cg-composition · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-receipts-cg-composition` (NMBY + NMCU + LIQR → MF6P)",
        "- Package: `data/economy/tax-receipts-cg-composition/`",
        "- Cross-check (read-only): Ready `data/economy/tax-receipts-composition/` (series=MF6P)",
        "- Handover: `docs/handover-economy-06-anatomy-cg-drill.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-anatomy-cg-drill.md`",
        "- Script: `validation.qa_economy_06_tax_cg_composition_2026_11_15`",
        "- Vintage: raw `2026-11-15` · PUSF JSON release **2026-10-20** · Appendix D **2026-10-21**",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. No curated/raw rewrites. Identity recomputed against",
        "pinned `mf6p_pusf.json` and Ready `tax-receipts-composition` series=MF6P.",
        "Parent AHHY four-head package not edited.",
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
            f"- Months with all three leaves + pinned MF6P and exact match (£0.01m): **{identity_months}**",
            f"- Failed identity months: **{identity_fail}**"
            + (f" ({', '.join(fail_samples or [])})" if fail_samples else ""),
            f"- Incomplete / skipped overlap months: **{incomplete}** (early NMBY history before NMCU/LIQR)",
            f"- Pinned MF6P vs Ready composition matches: **{ready_ok}** (mismatches={ready_mismatches})",
            "- Spot months independently checked: **2026-07**, **2026-08**, **2026-09**",
            "",
            "### Identity spot (≥3 months)",
            "",
            "| Period | NMBY | NMCU | LIQR | Sum | MF6P pinned | MF6P Ready | Diff |",
            "|--------|------|------|------|-----|-------------|------------|------|",
        ]
    )
    for row in spot_rows or []:
        lines.append(
            "| {period} | {nmby:,.0f} | {nmcu:,.0f} | {liqr:,.0f} | {s:,.0f} | {mp:,.0f} | {mr:,.0f} | {d:.0f} |".format(
                period=str(row["period"])[:7],
                nmby=float(row["NMBY"]),
                nmcu=float(row["NMCU"]),
                liqr=float(row["LIQR"]),
                s=float(row["sum"]),
                mp=float(row["MF6P_pinned"]),
                mr=float(row["MF6P_ready"]),
                d=float(row["diff"]),
            )
        )

    lines.extend(
        [
            "",
            "## Method notes",
            "",
            "- Accruals / National Accounts (Appendix D / PSA6D) — **not** HMRC cash.",
            "- Sibling drill under MF6P; Ready `tax-receipts-composition` AHHY four heads untouched.",
            "- MF6P is identity evidence only (not a curated leaf).",
            "- Deeper leaves LIBR / NZGF / CPRN deferred (not half-shipped; no invented residual).",
            f"- Observation statuses: {status_note or 'n/a'}.",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            f"- **Ready recommendation: {ready}**",
            "- Orchestrator may flip registry to Ready + schedule cloud load after PASS.",
            "- Re-pin after **20 Nov 2026** PSF (may revise recent months).",
            "- Out of scope: Anatomy CG UI, HMRC cash stack, second-depth leaves, Notion Ready flip by Validation.",
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

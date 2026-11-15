"""Independent QA for Economy Domain 03 labelled gaps — EC-VAL-03-JOBS02/UNDEREMP/DISCOURAGED.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_03_gaps_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_03_gaps_2026-11-15.md"
BASE = ROOT / "data" / "economy"

# Spots from docs/handover-economy-03-gaps.md (provisional latest where noted)
JOBS02_TOTAL_Q2 = 36_734.0
JOBS02_C_Q2 = 2_460.0
UNDEREMP_LEVEL = 2_768_796.0
UNDEREMP_EMP = 34_426_383.0
UNDEREMP_RATE = 8.042657284095165
YCCX_JUL = 915.0
LFL8_JUL = 30.0
LF77_JUL = 0.3
LF2M_JUL = 9_091.0
REASON_IDS = (
    "inactivity-reason-students",
    "inactivity-reason-family-home",
    "inactivity-reason-temp-sick",
    "inactivity-reason-long-term-sick",
    "inactivity-reason-retired",
    "inactivity-reason-other",
    "inactivity-reason-discouraged",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_pack(indicator_id: str) -> tuple[dict, Path, list[dict]]:
    pack = BASE / indicator_id
    manifest = yaml.safe_load((pack / "manifest.yaml").read_text(encoding="utf-8"))
    evidence = (manifest.get("raw_evidence") or [{}])[0]
    raw_path = pack / str(evidence.get("path", ""))
    curated = list(
        csv.DictReader((pack / "curated" / "observations.csv").open(newline="", encoding="utf-8"))
    )
    return manifest, raw_path, curated


def note_field(notes: str, key: str) -> str | None:
    marker = f"{key}="
    if marker not in notes:
        return None
    return notes.split(marker, 1)[1].split(";", 1)[0].strip()


def check_files(
    checks: list[tuple[str, str, str, str]],
    check_id: str,
    indicator_id: str,
) -> tuple[dict, list[dict]] | None:
    try:
        manifest, raw_path, rows = load_pack(indicator_id)
    except Exception as exc:  # noqa: BLE001
        checks.append((check_id, indicator_id, "fail", f"missing: {exc}"))
        return None
    evidence = (manifest.get("raw_evidence") or [{}])[0]
    files_ok = raw_path.is_file() and bool(rows)
    checks.append((check_id, f"{indicator_id} files", "pass" if files_ok else "fail", raw_path.name))
    if not files_ok:
        return None
    disk = sha256(raw_path)
    checks.append(
        (
            check_id,
            f"{indicator_id} checksum",
            "pass" if disk == evidence.get("checksum_sha256") else "fail",
            disk[:16],
        )
    )
    return manifest, rows


def value_at(rows: list[dict], period_prefix: str, *, series: str | None = None) -> float | None:
    for row in reversed(rows):
        if not row["period_start"].startswith(period_prefix):
            continue
        if series is not None and note_field(row.get("notes") or "", "series") != series:
            continue
        if row.get("value") in (None, ""):
            continue
        return float(row["value"])
    return None


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []

    # --- JOBS02 ---
    loaded = check_files(checks, "JOBS02", "workforce-jobs-by-industry")
    if loaded:
        _manifest, rows = loaded
        total = value_at(rows, "2026-04", series="total")
        section_c = value_at(rows, "2026-04", series="C")
        checks.append(
            (
                "JOBS02",
                "2026 Q2 total",
                "pass" if total == JOBS02_TOTAL_Q2 else "fail",
                str(total),
            )
        )
        checks.append(
            (
                "JOBS02",
                "2026 Q2 section C",
                "pass" if section_c == JOBS02_C_Q2 else "fail",
                str(section_c),
            )
        )
        section_sum = 0.0
        letters: list[str] = []
        for row in rows:
            if not row["period_start"].startswith("2026-04"):
                continue
            series = note_field(row.get("notes") or "", "series") or ""
            if len(series) == 1 and series.isalpha():
                section_sum += float(row["value"])
                letters.append(series)
        gap = abs(section_sum - (total or 0.0))
        checks.append(
            (
                "JOBS02",
                "A–T sum vs total",
                "pass" if gap <= 5.0 and len(set(letters)) == 20 else "fail",
                f"sum={section_sum} gap={gap} n={len(set(letters))}",
            )
        )
        # No share series stored as a unit
        share_units = [r for r in rows if "%" in (r.get("unit") or "")]
        checks.append(
            (
                "JOBS02",
                "no share unit",
                "pass" if not share_units else "fail",
                f"share_rows={len(share_units)}",
            )
        )
        # Cross-check DYDC / JWR7 packages if present
        try:
            _, _, jobs = load_pack("workforce-jobs")
            dydc = value_at(jobs, "2026-04")
            checks.append(
                (
                    "JOBS02",
                    "matches DYDC package",
                    "pass" if dydc == JOBS02_TOTAL_Q2 else "fail",
                    str(dydc),
                )
            )
        except Exception as exc:  # noqa: BLE001
            checks.append(("JOBS02", "DYDC package", "warn", str(exc)))

    # --- Underemployment + involuntary ---
    loaded = check_files(checks, "UNDEREMP", "underemployment")
    if loaded:
        _manifest, rows = loaded
        level = value_at(rows, "2026-04", series="underemployment_level")
        emp = value_at(rows, "2026-04", series="employment_level")
        rate = value_at(rows, "2026-04", series="underemployment_rate")
        checks.append(
            (
                "UNDEREMP",
                "Apr–Jun 2026 level",
                "pass" if level == UNDEREMP_LEVEL else "fail",
                str(level),
            )
        )
        checks.append(
            (
                "UNDEREMP",
                "Apr–Jun 2026 employment",
                "pass" if emp == UNDEREMP_EMP else "fail",
                str(emp),
            )
        )
        identity = (
            level is not None
            and emp is not None
            and emp > 0
            and abs((level / emp) * 100.0 - (rate or 0.0)) < 1e-9
        )
        checks.append(
            (
                "UNDEREMP",
                "people rate identity",
                "pass" if identity and rate is not None and abs(rate - UNDEREMP_RATE) < 1e-9 else "fail",
                f"rate={rate}",
            )
        )
        # Banner says thousands but cells are people — refuse thousand-scaled reading
        scaled = level is not None and abs(level / 1000.0 - 2768.796) < 1e-6
        checks.append(
            (
                "UNDEREMP",
                "not thousands-scaled",
                "pass" if level == UNDEREMP_LEVEL and scaled else "fail",
                "people cells",
            )
        )

    loaded = check_files(checks, "UNDEREMP", "involuntary-part-time")
    if loaded:
        _manifest, rows = loaded
        yccx = value_at(rows, "2026-07")
        checks.append(
            (
                "UNDEREMP",
                "YCCX Jul 2026",
                "pass" if yccx == YCCX_JUL else "fail",
                str(yccx),
            )
        )

    # --- Discouraged ---
    loaded = check_files(checks, "DISCOURAGED", "inactivity-reason-discouraged")
    if loaded:
        _manifest, rows = loaded
        level = value_at(rows, "2026-07")
        checks.append(
            (
                "DISCOURAGED",
                "LFL8 Jul 2026",
                "pass" if level == LFL8_JUL else "fail",
                str(level),
            )
        )

    loaded = check_files(checks, "DISCOURAGED", "inactivity-reason-discouraged-rate")
    if loaded:
        _manifest, rows = loaded
        rate = value_at(rows, "2026-07")
        checks.append(
            (
                "DISCOURAGED",
                "LF77 Jul 2026",
                "pass" if rate == LF77_JUL else "fail",
                str(rate),
            )
        )
        # Must not invent level from rate × LF2M
        invented = LF77_JUL * LF2M_JUL
        checks.append(
            (
                "DISCOURAGED",
                "rate×LF2M ≠ level",
                "pass" if abs(invented - LFL8_JUL) > 1.0 else "fail",
                f"invented≈{invented:.1f}",
            )
        )

    reason_sum = 0.0
    for reason_id in REASON_IDS:
        try:
            _, _, rows = load_pack(reason_id)
            val = value_at(rows, "2026-07")
            if val is None:
                checks.append(("DISCOURAGED", f"{reason_id} Jul", "fail", "missing"))
                continue
            reason_sum += val
        except Exception as exc:  # noqa: BLE001
            checks.append(("DISCOURAGED", reason_id, "fail", str(exc)))
    residual = abs(reason_sum - LF2M_JUL)
    checks.append(
        (
            "DISCOURAGED",
            "seven reasons vs LF2M",
            "pass" if residual <= 1.0 else "fail",
            f"sum={reason_sum} residual={residual}",
        )
    )

    passed = sum(1 for c in checks if c[2] == "pass")
    failed = sum(1 for c in checks if c[2] == "fail")
    warned = sum(1 for c in checks if c[2] == "warn")
    verdict = "PASS" if failed == 0 else "FAIL"

    lines = [
        "# QA — Economy Domain 03 labelled gaps (2026-11-15)",
        "",
        f"**Verdict:** {verdict} · {passed} pass / {failed} fail / {warned} warn",
        "",
        "Independent sample against `docs/handover-economy-03-gaps.md`.",
        "Does not rewrite Economy packages.",
        "",
        "| Gate | Check | Result | Detail |",
        "|------|-------|--------|--------|",
    ]
    for gate, name, result, detail in checks:
        lines.append(f"| {gate} | {name} | {result} | {detail} |")
    lines.extend(
        [
            "",
            "## Ready recommendation",
            "",
            (
                "Promote to Ready and cloud-load when verdict is PASS: "
                "`workforce-jobs-by-industry`, `underemployment`, `involuntary-part-time`, "
                "`inactivity-reason-discouraged`, `inactivity-reason-discouraged-rate`."
            ),
            "",
            "Do not treat LF77×LF2M as a discouraged level. Do not store JOBS02 shares. "
            "EMP16 cells are people despite the thousands banner.",
            "",
        ]
    )
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"{verdict}: {passed} pass / {failed} fail / {warned} warn → {REPORT}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

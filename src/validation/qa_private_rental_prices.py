"""Independent QA for private-rental-prices (PIPR £ levels).

Re-run: ``uv run python -m validation.qa_private_rental_prices``
Does not rewrite source data.
"""

from __future__ import annotations

import csv
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]
BASE = REPO / "data/housing/private-rental-prices"
QA_OUT = REPO / "data/qa/qa_private_rental_prices_2026_11_04.md"

# ONS Private rent and house prices, UK — October 2026 bulletin (21 Oct 2026 release).
# Average UK monthly private rent £1,406 in Sep 2026; +3.8% on a year earlier.
EXPECTED_UK_RENT = 1406.0
EXPECTED_UK_CHANGE = 3.8
EXPECTED_PERIOD = "2026-09-01"


def _series(notes: str) -> str:
    for part in notes.split(";"):
        part = part.strip()
        if part.startswith("series="):
            return part.split("=", 1)[1]
    return ""


def _dims(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def main() -> int:
    findings: list[tuple[str, str]] = []
    curated = BASE / "curated/observations.csv"
    manifest_path = BASE / "manifest.yaml"
    if not curated.is_file() or not manifest_path.is_file():
        findings.append(("FAIL", "missing curated CSV or manifest"))
        _write(findings)
        return 1

    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("agent_owner") != "housing":
        findings.append(("FAIL", f"agent_owner={manifest.get('agent_owner')}"))
    else:
        findings.append(("PASS", "agent_owner=housing"))
    if "GBP" not in str(manifest.get("unit", "")):
        findings.append(("WARN", "manifest unit does not mention GBP"))
    else:
        findings.append(("PASS", "manifest unit mentions GBP"))

    rows = list(csv.DictReader(curated.open(encoding="utf-8")))
    findings.append(("PASS" if len(rows) > 100_000 else "FAIL", f"rows={len(rows)}"))

    uk_rent = [
        r
        for r in rows
        if r["geography_code"] == "K02000001"
        and _series(r.get("notes") or "") == "average-rent"
        and "kind" not in _dims(r.get("notes") or "")
        and r.get("value")
    ]
    uk_rent.sort(key=lambda r: r["period_start"])
    last = uk_rent[-1]
    rent_ok = (
        last["period_start"] == EXPECTED_PERIOD
        and abs(float(last["value"]) - EXPECTED_UK_RENT) < 0.5
    )
    findings.append(
        (
            "PASS" if rent_ok else "FAIL",
            f"UK average rent {last['period_start']}={last['value']} "
            f"(expect {EXPECTED_PERIOD} £{EXPECTED_UK_RENT:.0f})",
        )
    )
    if last.get("observation_status") != "provisional":
        findings.append(("WARN", f"latest UK rent status={last.get('observation_status')} (expect provisional)"))
    else:
        findings.append(("PASS", "latest UK rent marked provisional"))

    uk_ch = [
        r
        for r in rows
        if r["geography_code"] == "K02000001"
        and _series(r.get("notes") or "") == "annual-change"
        and r.get("value")
        and r["period_start"] == EXPECTED_PERIOD
    ]
    if not uk_ch:
        findings.append(("FAIL", "missing UK annual-change for expected period"))
    else:
        ch = float(uk_ch[0]["value"])
        ok = abs(ch - EXPECTED_UK_CHANGE) < 0.05
        findings.append(
            (
                "PASS" if ok else "FAIL",
                f"UK annual change {ch:.3f}% (expect ~{EXPECTED_UK_CHANGE}%)",
            )
        )

    geos = {r["geography_code"] for r in rows if r["geography_code"]}
    findings.append(
        ("PASS" if len(geos) > 100 else "FAIL", f"distinct geographies={len(geos)}")
    )

    beds = {
        _dims(r.get("notes") or "").get("kind")
        for r in rows
        if _series(r.get("notes") or "") == "average-rent"
        and str(_dims(r.get("notes") or "").get("kind", "")).startswith("bedrooms-")
        and r.get("value")
    }
    expected_beds = {"bedrooms-1", "bedrooms-2", "bedrooms-3", "bedrooms-4-plus"}
    findings.append(
        ("PASS" if expected_beds <= beds else "WARN", f"bedroom kinds={sorted(x for x in beds if x)}")
    )

    failed = sum(1 for s, _ in findings if s == "FAIL")
    _write(findings)
    print("\n".join(f"{s}: {m}" for s, m in findings))
    print(f"wrote {QA_OUT} fails={failed}")
    return 1 if failed else 0


def _write(findings: list[tuple[str, str]]) -> None:
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# QA — private-rental-prices",
        "",
        "Independent check vs ONS Private rent and house prices, UK (21 Oct 2026 release).",
        "Sample: UK Sep 2026 average rent £1,406; annual change +3.8%.",
        "",
        "| Status | Check |",
        "|--------|-------|",
    ]
    for status, msg in findings:
        lines.append(f"| {status} | {msg} |")
    lines.append("")
    QA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())

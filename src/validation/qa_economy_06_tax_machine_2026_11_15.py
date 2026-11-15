"""Independent QA for Economy Domain 06 Tax Machine statute pin — EC-VAL-06C.

Recomputes worked examples from curated band/allowance/NICs tables alone.
Does not edit Economy curated or raw data.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_tax_machine_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-machine-rules"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_tax_machine_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"

PENNY = Decimal("0.01")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def money(value: Decimal) -> Decimal:
    return value.quantize(PENNY, rounding=ROUND_HALF_UP)


def load_csv(name: str) -> list[dict[str, str]]:
    path = BASE / "curated" / name
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def personal_allowance(
    allowances: list[dict[str, str]], tax_year: str, jurisdiction: str
) -> Decimal:
    for row in allowances:
        if (
            row["tax_year"] == tax_year
            and row["jurisdiction"] == jurisdiction
            and row["allowance_id"] == "personal_allowance"
        ):
            return Decimal(row["amount_gbp"])
    raise KeyError(f"PA missing for {tax_year}/{jurisdiction}")


def income_tax_from_bands(
    bands: list[dict[str, str]],
    tax_year: str,
    jurisdiction: str,
    taxable_after_pa: Decimal,
) -> Decimal:
    """Tax on income after Personal Allowance using inclusive after-allowance windows.

    Bands use contiguous inclusive bounds (e.g. basic 0–37700, higher 37701–…).
    Slice width for a band with lower L (>0) is measured from L−1 so the £1
    between 37700 and 37701 is not double-counted or skipped.
    """
    rows = [
        r
        for r in bands
        if r["tax_year"] == tax_year and r["jurisdiction"] == jurisdiction
    ]
    rows.sort(key=lambda r: int(r["lower_after_allowance_gbp"]))
    total = Decimal("0")
    for row in rows:
        lower = int(row["lower_after_allowance_gbp"])
        upper_raw = row["upper_after_allowance_gbp"].strip()
        upper = int(upper_raw) if upper_raw else None
        rate = Decimal(row["rate_percent"]) / Decimal("100")
        floor = Decimal(0 if lower == 0 else lower - 1)
        ceiling = Decimal(upper) if upper is not None else taxable_after_pa
        if taxable_after_pa <= floor:
            continue
        slice_amount = min(taxable_after_pa, ceiling) - floor
        if slice_amount > 0:
            total += slice_amount * rate
    return money(total)


def employee_nics(
    nics_rows: list[dict[str, str]], tax_year: str, gross: Decimal
) -> Decimal:
    row = next(r for r in nics_rows if r["tax_year"] == tax_year and r["category_letter"] == "A")
    pt = Decimal(row["primary_threshold_annual_gbp"])
    uel = Decimal(row["upper_earnings_limit_annual_gbp"])
    rate_mid = Decimal(row["rate_pt_to_uel_percent"]) / Decimal("100")
    rate_above = Decimal(row["rate_above_uel_percent"]) / Decimal("100")
    mid = max(Decimal("0"), min(gross, uel) - pt) * rate_mid
    above = max(Decimal("0"), gross - uel) * rate_above
    return money(mid + above)


def main() -> int:
    checks: list[tuple[str, str, str, str]] = []
    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    readme = (BASE / "README.md").read_text(encoding="utf-8")
    examples_doc = json.loads(
        (BASE / "curated" / "worked_examples.json").read_text(encoding="utf-8")
    )
    bands = load_csv("income_tax_bands.csv")
    allowances = load_csv("allowances.csv")
    nics_rows = load_csv("employee_class1_nics.csv")

    # --- C1: raw snapshots + checksums ---
    evidence = manifest.get("raw_evidence") or []
    sums_path = RAW_DIR / "SHA256SUMS"
    sums: dict[str, str] = {}
    if sums_path.is_file():
        for line in sums_path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                sums[parts[1]] = parts[0]

    c1_fail = 0
    for item in evidence:
        rel = str(item.get("path", ""))
        path = BASE / rel
        expected = str(item.get("checksum_sha256", ""))
        if not path.is_file():
            checks.append(("C1", f"missing {path.name}", "fail", rel))
            c1_fail += 1
            continue
        disk = sha256(path)
        match_manifest = disk == expected
        match_sums = sums.get(path.name) == disk
        ok = match_manifest and match_sums
        if not ok:
            c1_fail += 1
        checks.append(
            (
                "C1",
                f"checksum {path.name}",
                "pass" if ok else "fail",
                f"manifest={match_manifest} SHA256SUMS={match_sums} disk={disk[:16]}",
            )
        )
    if not evidence:
        checks.append(("C1", "raw_evidence", "fail", "empty"))
        c1_fail += 1

    # --- C2: tax years + jurisdictions ---
    years = {r["tax_year"] for r in bands}
    juris = {r["jurisdiction"] for r in bands}
    years_ok = {"2025-26", "2026-27"}.issubset(years)
    juris_ok = {"england-wales-ni", "scotland"}.issubset(juris)
    allow_years = {r["tax_year"] for r in allowances}
    nics_years = {r["tax_year"] for r in nics_rows}
    checks.append(
        (
            "C2",
            "tax years in bands",
            "pass" if years_ok else "fail",
            ",".join(sorted(years)),
        )
    )
    checks.append(
        (
            "C2",
            "E/W/NI + Scotland bands",
            "pass" if juris_ok else "fail",
            ",".join(sorted(juris)),
        )
    )
    expected_years = {"2025-26", "2026-27"}
    allow_nics_ok = allow_years == expected_years and nics_years == expected_years
    checks.append(
        (
            "C2",
            "allowances + NICs years",
            "pass" if allow_nics_ok else "fail",
            f"allow={sorted(allow_years)} nics={sorted(nics_years)}",
        )
    )

    # --- C3: NICs curated separately (not blended into income-tax bands) ---
    band_header = (BASE / "curated" / "income_tax_bands.csv").read_text(encoding="utf-8").splitlines()[0].lower()
    band_blob = " ".join(band_header.split(","))
    blended = any(tok in band_blob for tok in ("nic", "nics", "national_insurance"))
    nics_file_ok = (BASE / "curated" / "employee_class1_nics.csv").is_file()
    checks.append(
        (
            "C3",
            "NICs separate file",
            "pass" if nics_file_ok and not blended else "fail",
            "employee_class1_nics.csv present; bands have no NICs cols"
            if nics_file_ok and not blended
            else "blend risk",
        )
    )
    for ex in examples_doc.get("examples", []):
        note = str(ex.get("note", "")).lower()
        separate = "separate" in note and "blend" in note
        checks.append(
            (
                "C3",
                f"stages note {ex['example_id']}",
                "pass" if separate else "warn",
                "combined ≠ blended rate" if separate else "missing separate-stages note",
            )
        )

    # --- C4 / C5: recompute worked examples from curated tables alone ---
    recomputed: dict[str, tuple[Decimal, Decimal]] = {}
    for ex in examples_doc.get("examples", []):
        eid = ex["example_id"]
        tax_year = ex["tax_year"]
        jurisdiction = ex["jurisdiction"]
        gross = Decimal(ex["gross_taxable_income_gbp"])
        pa = personal_allowance(allowances, tax_year, jurisdiction)
        taxable = max(Decimal("0"), gross - pa)
        it = income_tax_from_bands(bands, tax_year, jurisdiction, taxable)
        nics = employee_nics(nics_rows, tax_year, gross)
        recomputed[eid] = (it, nics)
        exp_it = Decimal(ex["income_tax_gbp"])
        exp_nics = Decimal(ex["employee_class1_nics_gbp"])
        exp_combined = Decimal(ex["combined_statutory_deductions_gbp"])
        ok = it == exp_it and nics == exp_nics and money(it + nics) == exp_combined
        check_id = "C5" if jurisdiction == "scotland" else "C4"
        checks.append(
            (
                check_id,
                f"recompute {eid}",
                "pass" if ok else "fail",
                f"IT {it} (exp {exp_it}); NICs {nics} (exp {exp_nics})",
            )
        )

    # Scotland contrast vs E/W/NI at same gross
    scot = recomputed.get("scotland_contrast_basic_top")
    ewni = recomputed.get("ewni_basic_top")
    if scot and ewni:
        contrast_ok = scot[0] > ewni[0] and scot[1] == ewni[1]
        checks.append(
            (
                "C5",
                "Scotland IT > E/W/NI same NICs",
                "pass" if contrast_ok else "fail",
                f"Scot IT {scot[0]} vs E/W/NI {ewni[0]}; NICs {scot[1]} vs {ewni[1]}",
            )
        )
    else:
        checks.append(("C5", "Scotland contrast pair", "fail", "missing examples"))

    # --- C6: spot PA / basic rate vs GOV.UK HTML pin ---
    income_html = (RAW_DIR / "income_tax_rates.html").read_text(encoding="utf-8", errors="replace")
    employers_2526 = (RAW_DIR / "employers_2025_26.html").read_text(
        encoding="utf-8", errors="replace"
    )
    pa_row = next(
        r
        for r in allowances
        if r["tax_year"] == "2025-26" and r["jurisdiction"] == "england-wales-ni"
    )
    basic = next(
        r
        for r in bands
        if r["tax_year"] == "2025-26"
        and r["jurisdiction"] == "england-wales-ni"
        and r["band_id"] == "basic"
    )
    pa_ok = (
        Decimal(pa_row["amount_gbp"]) == Decimal("12570")
        and "£12,570" in income_html
        and "Personal Allowance" in income_html
    )
    basic_ok = (
        Decimal(basic["rate_percent"]) == Decimal("20")
        and int(basic["upper_after_allowance_gbp"]) == 37700
        and "Basic rate" in income_html
        and "20%" in income_html
        and "Up to £37,700" in income_html
        and "Up to £37,700" in employers_2526
    )
    checks.append(
        (
            "C6",
            "PA £12,570 vs GOV.UK HTML",
            "pass" if pa_ok else "fail",
            "curated 12570 + income_tax_rates.html anchors",
        )
    )
    checks.append(
        (
            "C6",
            "basic 20% / £37,700 vs GOV.UK HTML",
            "pass" if basic_ok else "fail",
            "income_tax_rates + employers_2025_26 anchors",
        )
    )

    # Scotland starter after-allowance vs published gross band (spot)
    scot_html = (RAW_DIR / "scottish_2025_26.html").read_text(encoding="utf-8", errors="replace")
    starter = next(
        r
        for r in bands
        if r["tax_year"] == "2025-26" and r["jurisdiction"] == "scotland" and r["band_id"] == "starter"
    )
    # Published: £12,571 to £15,397 → after PA 12570 → 1..2827; curated uses 0–2827 window
    starter_ok = (
        Decimal(starter["rate_percent"]) == Decimal("19")
        and int(starter["upper_after_allowance_gbp"]) == 2827
        and "£12,571 to £15,397" in scot_html
        and "19%" in scot_html
    )
    checks.append(
        (
            "C6",
            "Scotland starter vs scottish_2025_26.html",
            "pass" if starter_ok else "fail",
            f"upper_after_allowance={starter['upper_after_allowance_gbp']}",
        )
    )

    # --- C7: exclusions + not tax advice ---
    caveats = str(manifest.get("caveats", ""))
    safety = str(examples_doc.get("safety", ""))
    exclusions = examples_doc.get("exclusions") or []
    advice_ok = (
        "not tax advice" in caveats.lower()
        and "not tax advice" in safety.lower()
        and "not tax advice" in readme.lower()
    )
    need = [
        "benefits in kind",
        "pension",
        "marriage allowance",
        "student loan",
        "employer class 1",
        "corporation tax",
        "vat",
        "cgt",
    ]
    excl_blob = " ".join(str(x).lower() for x in exclusions) + " " + caveats.lower()
    excl_ok = all(tok in excl_blob for tok in need)
    checks.append(
        (
            "C7",
            "not tax advice documented",
            "pass" if advice_ok else "fail",
            "manifest + README + worked_examples.json",
        )
    )
    checks.append(
        (
            "C7",
            "exclusions listed",
            "pass" if excl_ok else "fail",
            f"n={len(exclusions)} exclusions in JSON",
        )
    )

    # --- C8: no frontend / Ready claim ---
    status = str(manifest.get("status_note", ""))
    claims_ready = bool(re.search(r"(?<![Nn]ot )\bReady\b", status)) and "not Ready" not in status
    not_ready_ok = ("not Ready" in status or "not Ready" in readme) and (
        "No UI" in readme
        or "no calculator UI" in status.lower()
        or "No calculator UI" in status
    )
    checks.append(
        (
            "C8",
            "no Ready claim / no UI",
            "pass" if not_ready_ok and not claims_ready else "fail",
            status[:80],
        )
    )
    # No CT/VAT/CGT tables as curated artefacts (filename stems, not substrings)
    curated_stems = {p.stem.lower() for p in (BASE / "curated").iterdir() if p.is_file()}
    banned = {"corporation_tax", "vat", "cgt", "council_tax", "capital_gains"}
    other_tax = sorted(curated_stems & banned)
    checks.append(
        (
            "C8",
            "no CT/VAT/CGT curated tables",
            "pass" if not other_tax else "fail",
            f"stems={sorted(curated_stems)}",
        )
    )

    failed = sum(1 for *_, result, __ in checks if result == "fail")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    verdict = "pass" if failed == 0 else "fail"
    return _write(checks, verdict, recomputed)


def _write(
    checks: list[tuple[str, str, str, str]],
    verdict: str,
    recomputed: dict[str, tuple[Decimal, Decimal]],
) -> int:
    passed = sum(1 for *_, result, __ in checks if result == "pass")
    warned = sum(1 for *_, result, __ in checks if result == "warn")
    failed = sum(1 for *_, result, __ in checks if result == "fail")

    example_lines = []
    labels = {
        "ewni_low": "E/W/NI £30,000",
        "ewni_basic_top": "E/W/NI £50,270",
        "ewni_higher": "E/W/NI £80,000 (spot)",
        "scotland_contrast_basic_top": "Scotland £50,270",
    }
    for eid, label in labels.items():
        if eid in recomputed:
            it, nics = recomputed[eid]
            example_lines.append(f"- `{eid}` ({label}): IT £{it}; employee Class 1 NICs £{nics}")

    recommend_ready = verdict == "pass"
    lines = [
        "# QA report — Economy 06 Tax Machine statute pin · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-machine-income-tax-rules`",
        "- Package: `data/economy/tax-machine-rules/`",
        "- Handover: `docs/handover-economy-06-tax-machine.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-tax-machine.md`",
        "- Script: `validation.qa_economy_06_tax_machine_2026_11_15`",
        "- Vintage: raw `2026-11-15` · tax years **2025–26** and **2026–27**",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. Liabilities recomputed from",
        "`income_tax_bands.csv` + `allowances.csv` + `employee_class1_nics.csv`",
        "without reading connector source constants. No curated/raw rewrites.",
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
            "## Worked examples recomputed",
            "",
            *example_lines,
            "",
            "Tax year for examples: **2025–26**. Income tax and employee Class 1 NICs",
            "remain separate stages (combined sum is not a blended rate).",
            "",
            "## Summary",
            "",
            f"- **Verdict: {verdict}** ({passed} pass / {warned} warn / {failed} fail)",
            (
                "- **Ready recommendation: yes** — statute-pin evidence package may flip"
                " to Registry Ready after Orchestrator review (cloud load + registry row"
                " still Orchestrator-owned)."
                if recommend_ready
                else "- **Ready recommendation: no** — fix fails before Ready."
            ),
            "- Out of scope: Tax Machine React UI; Anatomy; AHHY re-QA.",
            "",
            "## Blockers",
            "",
        ]
    )
    if failed:
        lines.append("- Failures above — owner: Economy (do not patch curated from Validation).")
    else:
        lines.extend(
            [
                "- None for statute-pin Validation PASS.",
                "- Open (Orchestrator): Notion registry row for `tax-machine-income-tax-rules`?",
                "- UI / EmptyStage replacement waits on Review Gate after Ready + product decision.",
            ]
        )
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT.relative_to(ROOT)} — {verdict} ({passed}/{warned}/{failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

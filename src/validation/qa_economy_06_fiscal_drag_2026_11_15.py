"""Independent QA for Economy Domain 06 fiscal-drag examples — EC-VAL-06E-DRAG.

Recomputes tax-year AWE from pinned ONS KAI7 and spot-checks liability /
counterfactual arithmetic against curated statute tables. Does not import
Economy ``tax_machine_fiscal_drag``. Does not edit curated or raw.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_fiscal_drag_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-machine-income-tax-history"
RAW_DIR = BASE / "raw" / "2026-11-15"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_fiscal_drag_2026-11-15.md"

EXPECTED_KAI7_SHA = (
    "c23b05e8873d568c7cab0dd7779b442e9370bb477b1705c544bf34d1634c7c98"
)
# Prior SCOT PASS / Economy self-QA fingerprint (28 Scotland 2017–22 rows).
EXPECTED_SCOTLAND_FP = (
    "c3ab0cbf7c6753e036b50feab5119211234d0251cd689a93694d1328d60a8f1a"
)
SCOTLAND_GAP_YEARS = {
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
}
TAX_YEARS = ("2021-22", "2022-23", "2023-24", "2024-25", "2025-26")
SAMPLE_AWE_YEARS = ("2021-22", "2025-26")
SAMPLE_LIABILITY_YEARS = ("2021-22", "2025-26")
MONEY_TOL = Decimal("0.02")
RATE_TOL = Decimal("0.02")

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
}


@dataclass
class Check:
    check_id: str
    name: str
    result: str
    notes: str


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def money(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def approx_equal(a: Decimal, b: Decimal, tol: Decimal) -> bool:
    return abs(a - b) <= tol


def extract_manifest_kai7_sha(manifest_text: str) -> str | None:
    """Pull kai7 checksum without requiring a fully valid YAML document.

    The package ``transformations`` block currently contains unquoted colons
    that break ``yaml.safe_load``; Validation still checks the evidence row.
    """
    match = re.search(
        r"path:\s*raw/2026-11-15/kai7_emp\.json\n"
        r"(?:.*\n)*?"
        r"\s*checksum_sha256:\s*([0-9a-f]{64})",
        manifest_text,
    )
    return match.group(1) if match else None


def scotland_2017_22_fingerprint(bands_csv: Path) -> tuple[int, str]:
    rows = [
        line
        for line in bands_csv.read_text(encoding="utf-8").splitlines()
        if ",scotland," in line and line[:7] in SCOTLAND_GAP_YEARS
    ]
    digest = hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()
    return len(rows), digest


def tax_year_for(year: int, month: int) -> str:
    start = year if month >= 4 else year - 1
    return f"{start}-{str(start + 1)[2:]}"


def parse_monthly_kai7(payload: dict[str, Any]) -> list[tuple[int, int, Decimal]]:
    months = payload.get("months")
    if not isinstance(months, list) or not months:
        raise ValueError("KAI7 JSON missing months[]")
    out: list[tuple[int, int, Decimal]] = []
    for row in months:
        year = int(row["year"])
        month = MONTH_NAME_TO_NUM[str(row["month"]).strip().lower()]
        out.append((year, month, Decimal(str(row["value"]))))
    out.sort(key=lambda item: (item[0], item[1]))
    return out


def recompute_tax_year_awe(
    monthly: list[tuple[int, int, Decimal]], tax_year: str
) -> tuple[Decimal, Decimal, int]:
    vals = [
        value
        for year, month, value in monthly
        if tax_year_for(year, month) == tax_year
    ]
    if len(vals) != 12:
        raise ValueError(f"{tax_year}: expected 12 months, got {len(vals)}")
    mean_week = sum(vals) / Decimal(12)
    annual = mean_week * Decimal(52)
    return mean_week, annual, len(vals)


@dataclass(frozen=True)
class Band:
    band_id: str
    band_label: str
    rate_percent: Decimal
    lower: int
    upper: int | None


def load_pa(path: Path, jurisdiction: str) -> dict[str, int]:
    out: dict[str, int] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["jurisdiction"] != jurisdiction:
                continue
            if row["allowance_id"] != "personal_allowance":
                continue
            out[row["tax_year"]] = int(Decimal(row["amount_gbp"]))
    return out


def load_bands(path: Path, jurisdiction: str) -> dict[str, list[Band]]:
    by_year: dict[str, list[Band]] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["jurisdiction"] != jurisdiction:
                continue
            upper_raw = (row.get("upper_after_allowance_gbp") or "").strip()
            upper = int(Decimal(upper_raw)) if upper_raw else None
            by_year.setdefault(row["tax_year"], []).append(
                Band(
                    band_id=row["band_id"],
                    band_label=row["band_label"],
                    rate_percent=Decimal(row["rate_percent"]),
                    lower=int(Decimal(row["lower_after_allowance_gbp"])),
                    upper=upper,
                )
            )
    for year, bands in by_year.items():
        by_year[year] = sorted(bands, key=lambda band: band.lower)
    return by_year


def personal_allowance_after_taper(gross: Decimal, pa: int, limit: int = 100_000) -> Decimal:
    if gross <= limit:
        return Decimal(pa)
    reduction = math.floor(float((gross - Decimal(limit)) / Decimal(2)))
    return max(Decimal("0"), Decimal(pa) - Decimal(reduction))


def income_tax_liability(
    gross: Decimal, pa: int, bands: list[Band]
) -> dict[str, Any]:
    """Independent educational NSND liability from after-allowance bands.

    Band uppers are treated as the maximum taxable income still charged at
    that rate (continuous £ slices), matching HMRC basic-rate-limit language.
    """
    applied_pa = personal_allowance_after_taper(gross, pa)
    taxable = max(Decimal("0"), gross - applied_pa)
    steps: list[dict[str, Any]] = []
    tax = Decimal("0")
    prev_upper = Decimal("0")
    for band in bands:
        lo = prev_upper
        hi = Decimal(band.upper) if band.upper is not None else None
        if taxable <= lo:
            break
        top = taxable if hi is None else min(taxable, hi)
        band_taxable = max(Decimal("0"), top - lo)
        if band_taxable <= 0:
            if hi is not None:
                prev_upper = hi
            continue
        band_tax = band_taxable * (band.rate_percent / Decimal(100))
        tax += band_tax
        steps.append(
            {
                "band_id": band.band_id,
                "band_label": band.band_label,
                "rate_percent": float(band.rate_percent),
                "after_allowance_from_gbp": float(lo),
                "after_allowance_to_gbp": float(hi) if hi is not None else None,
                "taxable_in_band_gbp": float(money(band_taxable)),
                "tax_gbp": float(money(band_tax)),
            }
        )
        if hi is None:
            break
        prev_upper = hi
    effective = (tax / gross * Decimal(100)) if gross > 0 else Decimal("0")
    return {
        "gross_employment_income_gbp": float(money(gross)),
        "personal_allowance_applied_gbp": float(money(applied_pa)),
        "taxable_income_gbp": float(money(taxable)),
        "income_tax_gbp": float(money(tax)),
        "effective_income_tax_rate_percent": float(
            effective.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        ),
        "band_steps": steps,
    }


def compare_liability(
    recomputed: dict[str, Any], curated: dict[str, Any]
) -> list[str]:
    mismatches: list[str] = []
    for key in (
        "gross_employment_income_gbp",
        "personal_allowance_applied_gbp",
        "taxable_income_gbp",
        "income_tax_gbp",
    ):
        a = money(recomputed[key])
        b = money(curated[key])
        if not approx_equal(a, b, MONEY_TOL):
            mismatches.append(f"{key}: recomputed={a} curated={b}")
    a_rate = Decimal(str(recomputed["effective_income_tax_rate_percent"]))
    b_rate = Decimal(str(curated["effective_income_tax_rate_percent"]))
    if not approx_equal(a_rate, b_rate, RATE_TOL):
        mismatches.append(
            f"effective_rate: recomputed={a_rate} curated={b_rate}"
        )
    r_steps = recomputed["band_steps"]
    c_steps = curated["band_steps"]
    if len(r_steps) != len(c_steps):
        mismatches.append(f"band_steps len {len(r_steps)} vs {len(c_steps)}")
        return mismatches
    for idx, (r_step, c_step) in enumerate(zip(r_steps, c_steps, strict=True)):
        if r_step["band_id"] != c_step["band_id"]:
            mismatches.append(
                f"step[{idx}] band_id {r_step['band_id']} vs {c_step['band_id']}"
            )
        for key in ("taxable_in_band_gbp", "tax_gbp"):
            if not approx_equal(
                money(r_step[key]), money(c_step[key]), MONEY_TOL
            ):
                mismatches.append(
                    f"step[{idx}].{key}: {r_step[key]} vs {c_step[key]}"
                )
        if float(r_step["rate_percent"]) != float(c_step["rate_percent"]):
            mismatches.append(
                f"step[{idx}].rate: {r_step['rate_percent']} vs {c_step['rate_percent']}"
            )
    return mismatches


def find_profile(examples: dict[str, Any], profile_id: str) -> dict[str, Any]:
    for profile in examples["profiles"]:
        if profile["profile_id"] == profile_id:
            return profile
    raise KeyError(profile_id)


def year_row(profile: dict[str, Any], tax_year: str) -> dict[str, Any]:
    for row in profile["years"]:
        if row["tax_year"] == tax_year:
            return row
    raise KeyError(tax_year)


def run_checks() -> list[Check]:
    checks: list[Check] = []
    kai7_path = RAW_DIR / "kai7_emp.json"
    sums_path = RAW_DIR / "SHA256SUMS"
    manifest_text = (BASE / "manifest.yaml").read_text(encoding="utf-8")
    manifest_yaml_ok = True
    try:
        yaml.safe_load(manifest_text)
    except yaml.YAMLError:
        manifest_yaml_ok = False
    examples = json.loads(
        (BASE / "curated" / "fiscal_drag_examples.json").read_text(encoding="utf-8")
    )
    status = json.loads(
        (BASE / "curated" / "fiscal_drag_status.json").read_text(encoding="utf-8")
    )
    awe_csv_rows = list(
        csv.DictReader(
            (BASE / "curated" / "awe_kai7_tax_year.csv").open(
                newline="", encoding="utf-8"
            )
        )
    )
    awe_by_year = {row["tax_year"]: row for row in awe_csv_rows}

    # --- C1: KAI7 checksum + ONS metadata ---------------------------------
    disk_sha = sha256(kai7_path)
    sums_text = sums_path.read_text(encoding="utf-8")
    sums_match = re.search(
        r"^([0-9a-f]{64})\s+kai7_emp\.json$", sums_text, flags=re.M
    )
    sums_sha = sums_match.group(1) if sums_match else None
    manifest_sha = extract_manifest_kai7_sha(manifest_text)
    payload = json.loads(kai7_path.read_text(encoding="utf-8"))
    desc = payload.get("description") or {}
    title = str(desc.get("title") or "")
    cdid = str(desc.get("cdid") or "")
    release_date = str(desc.get("releaseDate") or "")
    c1_ok = (
        disk_sha == EXPECTED_KAI7_SHA
        and sums_sha == EXPECTED_KAI7_SHA
        and manifest_sha == EXPECTED_KAI7_SHA
        and "AWE" in title
        and "Regular Pay" in title
        and cdid == "KAI7"
        and release_date.startswith("2026-10-19")
    )
    checks.append(
        Check(
            "C1",
            "kai7_emp.json SHA-256 ↔ manifest / SHA256SUMS; ONS title/CDID/releaseDate",
            "pass" if c1_ok else "fail",
            (
                f"disk={disk_sha[:16]}… sums_ok={sums_sha == EXPECTED_KAI7_SHA} "
                f"manifest_ok={manifest_sha == EXPECTED_KAI7_SHA} "
                f"cdid={cdid!r} releaseDate={release_date!r} title={title[:60]!r}"
            ),
        )
    )

    # --- C2: recompute tax-year means -------------------------------------
    monthly = parse_monthly_kai7(payload)
    for tax_year in SAMPLE_AWE_YEARS:
        mean_week, annual, n_months = recompute_tax_year_awe(monthly, tax_year)
        curated = awe_by_year[tax_year]
        curated_mean = Decimal(curated["awe_mean_weekly_gbp"])
        curated_annual = Decimal(curated["awe_annualised_x52_gbp"])
        # CSV stores rounded mean to 4 dp and annual to 2 dp.
        mean_ok = approx_equal(
            mean_week.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            curated_mean,
            Decimal("0.0002"),
        )
        annual_ok = approx_equal(money(annual), money(curated_annual), MONEY_TOL)
        ok = mean_ok and annual_ok and n_months == 12
        checks.append(
            Check(
                "C2",
                f"Recompute tax-year mean×52 for {tax_year}",
                "pass" if ok else "fail",
                (
                    f"recomputed mean={float(mean_week):.6f} annual={float(annual):.4f} "
                    f"curated mean={curated_mean} annual={curated_annual} months={n_months}"
                ),
            )
        )

    # --- C3: recompute E/W/NI liability steps -----------------------------
    ewni_pa = load_pa(BASE / "curated" / "allowances.csv", "england-wales-ni")
    ewni_bands = load_bands(
        BASE / "curated" / "income_tax_bands.csv", "england-wales-ni"
    )
    sco_pa = load_pa(BASE / "curated" / "allowances.csv", "scotland")
    sco_bands = load_bands(BASE / "curated" / "income_tax_bands.csv", "scotland")
    ewni_profile = find_profile(examples, "ewni_awe_scaled")
    for tax_year in SAMPLE_LIABILITY_YEARS:
        row = year_row(ewni_profile, tax_year)
        gross = Decimal(str(row["actual_statutory"]["gross_employment_income_gbp"]))
        recomputed = income_tax_liability(
            gross, ewni_pa[tax_year], ewni_bands[tax_year]
        )
        mismatches = compare_liability(recomputed, row["actual_statutory"])
        checks.append(
            Check(
                "C3",
                f"Recompute ewni_awe_scaled liability {tax_year}",
                "pass" if not mismatches else "fail",
                (
                    "band_steps match curated"
                    if not mismatches
                    else "; ".join(mismatches)
                ),
            )
        )

    # --- C4: counterfactual indexes PA/basic by KAI7 only -----------------
    base_awe = Decimal(awe_by_year["2021-22"]["awe_annualised_x52_gbp"])
    base_pa = ewni_pa["2021-22"]
    base_basic = next(b for b in ewni_bands["2021-22"] if b.band_id == "basic")
    assert base_basic.upper is not None
    for tax_year in SAMPLE_LIABILITY_YEARS:
        row = year_row(ewni_profile, tax_year)
        cf = row["counterfactual_thresholds_indexed_to_awe"]
        index = Decimal(str(row["awe_index_vs_2021_22"]))
        expected_index = (
            Decimal(awe_by_year[tax_year]["awe_annualised_x52_gbp"]) / base_awe
        )
        expected_pa = int(round(float(Decimal(base_pa) * expected_index)))
        expected_basic = int(
            round(float(Decimal(base_basic.upper) * expected_index))
        )
        # Rates must match actual statute for basic/higher/additional (not invented).
        actual_rates = {
            band.band_id: band.rate_percent for band in ewni_bands[tax_year]
        }
        cf_liability = cf["liability"]
        cf_rates = {
            step["band_id"]: Decimal(str(step["rate_percent"]))
            for step in cf_liability["band_steps"]
        }
        rates_ok = all(
            band_id in actual_rates and rate == actual_rates[band_id]
            for band_id, rate in cf_rates.items()
        )
        # Additional lower must follow actual statute (2023–24 cut etc.).
        add_actual = next(b for b in ewni_bands[tax_year] if b.band_id == "additional")
        add_in_cf = next(
            (
                step
                for step in cf_liability["band_steps"]
                if step["band_id"] == "additional"
            ),
            None,
        )
        # For sample years at AWE-scale, additional may not appear in steps;
        # still verify threshold fields + liability recompute under CF rules.
        cf_bands = [
            Band("basic", "Basic rate", Decimal("20"), 0, int(cf["basic_upper_after_allowance_gbp"])),
            Band(
                "higher",
                "Higher rate",
                Decimal("40"),
                int(cf["basic_upper_after_allowance_gbp"]) + 1,
                add_actual.lower - 1,
            ),
            Band(
                "additional",
                "Additional rate",
                add_actual.rate_percent,
                add_actual.lower,
                None,
            ),
        ]
        gross = Decimal(str(row["actual_statutory"]["gross_employment_income_gbp"]))
        cf_recomputed = income_tax_liability(gross, int(cf["personal_allowance_gbp"]), cf_bands)
        liability_mismatches = compare_liability(cf_recomputed, cf_liability)
        index_ok = approx_equal(index, expected_index, Decimal("0.000002"))
        thresholds_ok = (
            int(cf["personal_allowance_gbp"]) == expected_pa
            and int(cf["basic_upper_after_allowance_gbp"]) == expected_basic
        )
        ok = index_ok and thresholds_ok and rates_ok and not liability_mismatches
        # If CF includes an additional step, its lower must match statute.
        if add_in_cf is not None:
            ok = ok and int(
                add_in_cf.get("after_allowance_from_gbp", -1)
            ) == add_actual.lower
        checks.append(
            Check(
                "C4",
                f"E/W/NI counterfactual indexes PA/basic by KAI7 only ({tax_year})",
                "pass" if ok else "fail",
                (
                    f"index={float(index):.6f} expected={float(expected_index):.6f} "
                    f"PA={cf['personal_allowance_gbp']} (exp {expected_pa}) "
                    f"basic_upper={cf['basic_upper_after_allowance_gbp']} (exp {expected_basic}) "
                    f"rates_ok={rates_ok} liability_ok={not liability_mismatches}"
                ),
            )
        )

    # Also spot-check near-HRT 2025-26 (where drag is larger / may hit higher).
    near = find_profile(examples, "ewni_near_higher")
    near_end = year_row(near, "2025-26")
    near_cf = near_end["counterfactual_thresholds_indexed_to_awe"]
    near_index = (
        Decimal(awe_by_year["2025-26"]["awe_annualised_x52_gbp"]) / base_awe
    )
    near_pa_exp = int(round(float(Decimal(base_pa) * near_index)))
    near_basic_exp = int(
        round(float(Decimal(base_basic.upper) * near_index))
    )
    near_ok = (
        int(near_cf["personal_allowance_gbp"]) == near_pa_exp
        and int(near_cf["basic_upper_after_allowance_gbp"]) == near_basic_exp
        and Decimal(str(near_cf["extra_tax_vs_counterfactual_gbp"])) > 0
    )
    checks.append(
        Check(
            "C4",
            "E/W/NI near-HRT 2025-26 counterfactual extra tax > 0",
            "pass" if near_ok else "fail",
            (
                f"PA={near_cf['personal_allowance_gbp']} (exp {near_pa_exp}) "
                f"basic_upper={near_cf['basic_upper_after_allowance_gbp']} "
                f"(exp {near_basic_exp}) "
                f"extra_tax={near_cf['extra_tax_vs_counterfactual_gbp']}"
            ),
        )
    )

    # --- C5: Scotland uses Scotland bands (not E/W/NI copy) ---------------
    sco_profile = find_profile(examples, "scotland_awe_scaled")
    ewni_ids = {p["profile_id"]: p for p in examples["profiles"]}
    for tax_year in TAX_YEARS:
        sco_year = year_row(sco_profile, tax_year)
        ewni_year = year_row(ewni_ids["ewni_awe_scaled"], tax_year)
        sco_steps = sco_year["actual_statutory"]["band_steps"]
        ewni_steps = ewni_year["actual_statutory"]["band_steps"]
        sco_band_ids = [step["band_id"] for step in sco_steps]
        ewni_band_ids = [step["band_id"] for step in ewni_steps]
        # Scotland table must differ from E/W/NI (starter etc.) and match CSV.
        csv_ids = [band.band_id for band in sco_bands[tax_year]]
        # Recompute Scotland liability from Scotland CSV only.
        gross = Decimal(
            str(sco_year["actual_statutory"]["gross_employment_income_gbp"])
        )
        sco_recomputed = income_tax_liability(
            gross, sco_pa[tax_year], sco_bands[tax_year]
        )
        mismatches = compare_liability(
            sco_recomputed, sco_year["actual_statutory"]
        )
        # Must not equal E/W/NI liability when band structures differ.
        same_as_ewni = (
            sco_year["actual_statutory"]["income_tax_gbp"]
            == ewni_year["actual_statutory"]["income_tax_gbp"]
            and sco_band_ids == ewni_band_ids
        )
        has_scotland_structure = any(
            band_id in {"starter", "intermediate", "top"} for band_id in csv_ids
        ) or (tax_year == "2021-22" and "basic" in csv_ids)
        # For every year 2021–26 Scotland has starter/intermediate/top.
        jurisdiction_ok = sco_profile["jurisdiction"] == "scotland"
        not_copy = not same_as_ewni and has_scotland_structure
        # Band steps used must be subset of Scotland CSV bands.
        steps_from_scotland = all(step in csv_ids for step in sco_band_ids)
        ok = (
            jurisdiction_ok
            and not_copy
            and steps_from_scotland
            and not mismatches
            and "counterfactual_thresholds_indexed_to_awe" not in sco_year
        )
        checks.append(
            Check(
                "C5",
                f"Scotland profile uses Scotland rows ({tax_year})",
                "pass" if ok else "fail",
                (
                    f"jurisdiction={sco_profile['jurisdiction']} "
                    f"sco_bands={sco_band_ids} ewni_bands={ewni_band_ids} "
                    f"csv={csv_ids} liability_ok={not mismatches} "
                    f"not_ewni_copy={not_copy}"
                ),
            )
        )

    # --- C6: Scotland 2017–22 fingerprint unchanged -----------------------
    n_rows, digest = scotland_2017_22_fingerprint(
        BASE / "curated" / "income_tax_bands.csv"
    )
    fp_ok = n_rows == 28 and digest == EXPECTED_SCOTLAND_FP
    checks.append(
        Check(
            "C6",
            "Scotland 2017–18…2022–23 band CSV fingerprint unchanged",
            "pass" if fp_ok else "fail",
            f"rows={n_rows} sha256={digest}",
        )
    )

    # --- C7: status documented; ready=false; no Ready/frontend claim ------
    status_ok = (
        status.get("status") == "documented"
        and status.get("ready") is False
        and examples.get("status") == "documented"
    )
    handover = (ROOT / "docs" / "handover-economy-06-fiscal-drag.md").read_text(
        encoding="utf-8"
    )
    no_ready_claim = (
        "not a Ready flip" in handover
        or "Validation-ready, not a Ready flip" in handover
    )
    no_frontend_claim = "No frontend" in handover or "no frontend" in handover.lower()
    # Manifest must not claim Ready solely for fiscal-drag.
    false_ready = bool(
        re.search(r"fiscal.?drag.*\bReady\b", manifest_text, flags=re.I)
    ) and not bool(
        re.search(
            r"not a Ready flip|not Ready alone|Validation ask",
            manifest_text,
            flags=re.I,
        )
    )
    no_ui_in_manifest = bool(
        re.search(r"No fiscal-drag UI|no frontend", manifest_text, flags=re.I)
    )
    c7_ok = (
        status_ok
        and no_ready_claim
        and no_frontend_claim
        and no_ui_in_manifest
        and not false_ready
    )
    checks.append(
        Check(
            "C7",
            "Status=documented, ready=false; no frontend / Ready claim by Economy",
            "pass" if c7_ok else "fail",
            (
                f"status={status.get('status')!r} ready={status.get('ready')!r} "
                f"examples.status={examples.get('status')!r} "
                f"handover_no_ready={no_ready_claim} "
                f"handover_no_frontend={no_frontend_claim} "
                f"manifest_no_ui={no_ui_in_manifest}"
            ),
        )
    )
    checks.append(
        Check(
            "C7b",
            "Package manifest.yaml parses as YAML",
            "warn" if not manifest_yaml_ok else "pass",
            (
                "transformations block has unquoted colon after "
                "'Fiscal-drag examples' — yaml.safe_load fails; "
                "KAI7 checksum still verified via regex extract (owner: Economy)"
                if not manifest_yaml_ok
                else "manifest parses"
            ),
        )
    )

    # --- C8: exclusions + educational disclaimer --------------------------
    assumptions = examples.get("assumptions") or {}
    disclaimer = str(assumptions.get("educational_disclaimer") or "")
    tax_model = assumptions.get("tax_model") or {}
    exclusions = tax_model.get("exclusions") or []
    needed = ("NICs", "student loan", "pension", "dividends")
    exclusions_text = " ".join(str(item) for item in exclusions).lower()
    has_exclusions = all(token.lower() in exclusions_text for token in needed)
    has_disclaimer = (
        "not tax advice" in disclaimer.lower()
        and "educational" in disclaimer.lower()
    )
    status_reason = str(status.get("reason") or "").lower()
    c8_ok = has_exclusions and has_disclaimer and "not tax advice" in status_reason
    checks.append(
        Check(
            "C8",
            "Exclusions + educational disclaimer present",
            "pass" if c8_ok else "fail",
            (
                f"disclaimer_ok={has_disclaimer} exclusions={len(exclusions)} "
                f"needed_tokens_ok={has_exclusions}"
            ),
        )
    )

    return checks


def write_report(checks: list[Check]) -> tuple[int, int, int]:
    passes = sum(1 for check in checks if check.result == "pass")
    warns = sum(1 for check in checks if check.result == "warn")
    fails = sum(1 for check in checks if check.result == "fail")

    if fails:
        verdict = "FAIL"
        ui_rec = (
            "**Do not** expose the fiscal-drag overlay in Time Machine UI yet. "
            "Fix Fail items (owner: Economy) and re-run Validation."
        )
        blockers = [
            f"{check.check_id} {check.name}: {check.notes}"
            for check in checks
            if check.result == "fail"
        ]
    else:
        verdict = "PASS"
        ui_rec = (
            "Orchestrator **may** ship a Time Machine fiscal-drag overlay UI "
            "that presents these documented educational examples (with caveats). "
            "Do **not** flip Registry Ready for fiscal-drag alone — it extends "
            "the already-Ready history package as a documented artefact "
            f"(`status=documented`, `ready=false`). Warns={warns}."
        )
        blockers = []

    lines = [
        "# QA report — Economy 06 fiscal-drag examples · 2026-11-15",
        "",
        "## Scope",
        "",
        "- Indicator: `tax-machine-income-tax-history` (fiscal-drag artefacts only)",
        "- Package: `data/economy/tax-machine-income-tax-history/`",
        "- Handover: `docs/handover-economy-06-fiscal-drag.md`",
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-fiscal-drag.md`",
        "- Script: `validation.qa_economy_06_fiscal_drag_2026_11_15`",
        "- Artefacts: `curated/fiscal_drag_examples.json`, `fiscal_drag_status.json`,",
        "  `awe_kai7_tax_year.csv`, `raw/2026-11-15/kai7_emp.json`",
        "",
        "## Independence",
        "",
        "Disk raw + curated only. Tax-year AWE recomputed from pinned ONS KAI7",
        "months; liabilities recomputed from curated PA + after-allowance bands.",
        "Does **not** import `economy.connectors.tax_machine_fiscal_drag`.",
        "Does **not** rewrite curated bands (Scotland 2017–22 fingerprint checked).",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
    ]
    for check in checks:
        notes = check.notes.replace("|", "\\|")
        lines.append(
            f"| {check.check_id} | {check.name} | **{check.result}** | {notes} |"
        )

    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- Verdict counts: **{passes} pass / {warns} warn / {fails} fail** → **{verdict}**",
            f"- Ready / UI recommendation: {ui_rec}",
            "- Blockers:",
        ]
    )
    if blockers:
        for item in blockers:
            lines.append(f"  - {item}")
    else:
        lines.append("  - None")
    lines.extend(
        [
            (
                "- Recommended fixes (owner): optional Economy quote-fix for "
                "`manifest.yaml` `transformations` (C7b warn); no curated/data "
                "changes required for PASS"
                if fails == 0 and warns
                else "- Recommended fixes (owner): none — Validation PASS"
                if fails == 0
                else "- Recommended fixes (owner): Economy — see Fail notes; "
                "do not rewrite Scotland 2017–22 bands to silence Fail"
            ),
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    return passes, warns, fails


def main() -> None:
    checks = run_checks()
    passes, warns, fails = write_report(checks)
    print(f"Wrote {REPORT.relative_to(ROOT)}")
    print(f"pass={passes} warn={warns} fail={fails}")
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

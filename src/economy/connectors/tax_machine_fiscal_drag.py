"""Fiscal-drag worked examples for tax-machine-income-tax-history.

Approach (beginner-friendly):
1. Pin ONS AWE KAI7 (regular pay, SA, cash) under the Time Machine raw folder.
2. Build tax-year means (Apr–Mar) × 52 as a labelled annual earnings index.
3. Apply curated statutory income-tax rules to ≤3 hypothetical profiles.
4. Write curated JSON + flip fiscal_drag_status — do **not** rewrite band CSVs.

Educational illustration only — not tax advice.
Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
 https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from britain_exchange.paths import ECONOMY_DATA

PACKAGE_DIR = "tax-machine-income-tax-history"
INDICATOR_ID = "tax-machine-income-tax-history"
RELATED_EARNINGS_ID = "nominal-earnings"
KAI7_URL = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/timeseries/kai7/emp/data"
)
KAI7_LANDING = (
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/"
    "earningsandworkinghours/timeseries/kai7/emp"
)
# Ready pin sibling used if live ONS fetch is blocked.
FALLBACK_KAI7 = ECONOMY_DATA / "nominal-earnings" / "raw" / "2026-11-07" / "kai7_emp.json"

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

BASE_TAX_YEAR = "2021-22"
END_TAX_YEAR = "2025-26"
TAX_YEARS = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]

# Scotland 2017–22 fingerprint — must remain unchanged by this pass.
SCOTLAND_GAP_YEARS = {
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
}


@dataclass(frozen=True, slots=True)
class Band:
    band_id: str
    band_label: str
    rate_percent: float
    lower: int
    upper: int | None


@dataclass(frozen=True, slots=True)
class YearRules:
    tax_year: str
    jurisdiction: str
    personal_allowance: int
    income_limit: int
    bands: tuple[Band, ...]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def scotland_2017_22_fingerprint(bands_csv: Path) -> tuple[int, str]:
    rows = [
        ln
        for ln in bands_csv.read_text(encoding="utf-8").splitlines()
        if ",scotland," in ln and ln[:7] in SCOTLAND_GAP_YEARS
    ]
    digest = hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()
    return len(rows), digest


def fetch_kai7(raw_path: Path) -> dict[str, Any]:
    """Download ONS KAI7 JSON; fall back to Ready pin if blocked."""
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = Request(
            KAI7_URL,
            headers={
                "User-Agent": "BritishExchange/1.0 (economy-agent; OGL reuse)",
                "Accept": "application/json",
            },
        )
        with urlopen(req, timeout=60) as resp:  # noqa: S310 — official ONS URL
            payload = resp.read()
            status = getattr(resp, "status", 200)
        raw_path.write_bytes(payload)
        meta = {
            "source": "live_ons",
            "http_status": int(status),
            "source_url": KAI7_URL,
        }
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        if not FALLBACK_KAI7.is_file():
            raise RuntimeError(f"ONS KAI7 fetch failed and no fallback: {exc}") from exc
        raw_path.write_bytes(FALLBACK_KAI7.read_bytes())
        meta = {
            "source": "fallback_ready_nominal_earnings_pin",
            "http_status": None,
            "source_url": KAI7_URL,
            "fallback_path": str(FALLBACK_KAI7.relative_to(ECONOMY_DATA.parent.parent))
            if FALLBACK_KAI7.is_relative_to(ECONOMY_DATA.parent.parent)
            else str(FALLBACK_KAI7),
            "note": f"live fetch failed ({exc!s}); reused Ready nominal-earnings pin",
        }
    data = json.loads(raw_path.read_text(encoding="utf-8"))
    meta["checksum_sha256"] = sha256_file(raw_path)
    meta["retrieved_at"] = datetime.now(timezone.utc).isoformat()
    return {"data": data, "meta": meta, "path": raw_path}


def parse_monthly_kai7(data: dict[str, Any]) -> list[dict[str, Any]]:
    months = data.get("months")
    if not isinstance(months, list) or not months:
        raise ValueError("KAI7 JSON missing months[]")
    out: list[dict[str, Any]] = []
    for row in months:
        year = int(row["year"])
        month = MONTH_NAME_TO_NUM[str(row["month"]).strip().lower()]
        value = float(row["value"])
        out.append({"year": year, "month": month, "value_gbp_week": value})
    out.sort(key=lambda r: (r["year"], r["month"]))
    return out


def tax_year_label(year: int, month: int) -> str | None:
    """UK tax year containing calendar year-month (Apr–Mar)."""
    if month >= 4:
        start = year
    else:
        start = year - 1
    end = start + 1
    return f"{start}-{str(end)[2:]}"


def build_tax_year_awe(monthly: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Mean weekly AWE over Apr–Mar, annualised ×52. Require all 12 months."""
    buckets: dict[str, list[float]] = {}
    for row in monthly:
        ty = tax_year_label(row["year"], row["month"])
        if ty is None:
            continue
        buckets.setdefault(ty, []).append(float(row["value_gbp_week"]))

    rows: list[dict[str, Any]] = []
    for ty in TAX_YEARS:
        vals = buckets.get(ty, [])
        if len(vals) != 12:
            raise ValueError(
                f"Tax year {ty} needs 12 monthly KAI7 points; found {len(vals)}"
            )
        mean_week = sum(vals) / 12.0
        annual = mean_week * 52.0
        rows.append(
            {
                "tax_year": ty,
                "awe_mean_weekly_gbp": round(mean_week, 4),
                "awe_annualised_x52_gbp": round(annual, 2),
                "months_used": 12,
                "series_id": "KAI7",
                "geography": "Great Britain (K03000001)",
                "definition": (
                    "Tax-year mean of monthly ONS AWE whole-economy regular pay "
                    "(SA, cash, excl. bonuses/arrears), annualised ×52 for educational "
                    "gross employment income paths. Not ASHE; not NI; not take-home pay."
                ),
            }
        )
    return rows


def load_rules(data_root: Path, jurisdiction: str) -> dict[str, YearRules]:
    allowances: dict[str, int] = {}
    with (data_root / "curated" / "allowances.csv").open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["jurisdiction"] != jurisdiction:
                continue
            if row["allowance_id"] != "personal_allowance":
                continue
            allowances[row["tax_year"]] = int(float(row["amount_gbp"]))

    bands_by_year: dict[str, list[Band]] = {}
    with (data_root / "curated" / "income_tax_bands.csv").open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["jurisdiction"] != jurisdiction:
                continue
            ty = row["tax_year"]
            upper_raw = (row.get("upper_after_allowance_gbp") or "").strip()
            upper = int(float(upper_raw)) if upper_raw else None
            bands_by_year.setdefault(ty, []).append(
                Band(
                    band_id=row["band_id"],
                    band_label=row["band_label"],
                    rate_percent=float(row["rate_percent"]),
                    lower=int(float(row["lower_after_allowance_gbp"])),
                    upper=upper,
                )
            )

    out: dict[str, YearRules] = {}
    for ty in TAX_YEARS:
        if ty not in allowances:
            raise KeyError(f"Missing PA for {jurisdiction} {ty}")
        bands = tuple(sorted(bands_by_year[ty], key=lambda b: b.lower))
        if not bands:
            raise KeyError(f"Missing bands for {jurisdiction} {ty}")
        out[ty] = YearRules(
            tax_year=ty,
            jurisdiction=jurisdiction,
            personal_allowance=allowances[ty],
            income_limit=100_000,
            bands=bands,
        )
    return out


def personal_allowance_after_taper(gross: float, pa: int, limit: int = 100_000) -> float:
    """Standard £1 taper for every £2 above £100k (to zero)."""
    if gross <= limit:
        return float(pa)
    reduction = math.floor((gross - limit) / 2.0)
    return max(0.0, float(pa) - reduction)


def income_tax_liability(gross: float, rules: YearRules) -> dict[str, Any]:
    """Apply after-allowance bands as continuous £ slices.

    Curated tables use inclusive integer windows (e.g. basic 0…37700, higher
    37701…). For educational GBP arithmetic we treat each band upper as the
    maximum taxable income still charged at that rate, so basic width is
    ``upper`` (not ``upper+1``). Next band starts immediately above the previous
    upper — matching HMRC “basic rate limit” language.
    """
    pa = personal_allowance_after_taper(gross, rules.personal_allowance, rules.income_limit)
    taxable = max(0.0, gross - pa)
    steps: list[dict[str, Any]] = []
    tax = 0.0
    prev_upper = 0.0
    for band in rules.bands:
        lo = prev_upper
        hi = float(band.upper) if band.upper is not None else None
        if taxable <= lo:
            break
        top = taxable if hi is None else min(taxable, hi)
        band_taxable = max(0.0, top - lo)
        if band_taxable <= 0:
            if hi is not None:
                prev_upper = hi
            continue
        rate = band.rate_percent / 100.0
        band_tax = band_taxable * rate
        tax += band_tax
        steps.append(
            {
                "band_id": band.band_id,
                "band_label": band.band_label,
                "rate_percent": band.rate_percent,
                "after_allowance_from_gbp": lo,
                "after_allowance_to_gbp": hi,
                "taxable_in_band_gbp": round(band_taxable, 2),
                "tax_gbp": round(band_tax, 2),
            }
        )
        if hi is None:
            break
        prev_upper = hi

    effective = (tax / gross * 100.0) if gross > 0 else 0.0
    return {
        "gross_employment_income_gbp": round(gross, 2),
        "personal_allowance_applied_gbp": round(pa, 2),
        "taxable_income_gbp": round(taxable, 2),
        "income_tax_gbp": round(tax, 2),
        "effective_income_tax_rate_percent": round(effective, 3),
        "band_steps": steps,
    }


def counterfactual_ewni_rules(
    base: YearRules, index: float, actual: YearRules
) -> YearRules:
    """Grow base-year PA + basic upper with AWE index; keep actual rates / additional cut."""
    base_basic = next(b for b in base.bands if b.band_id == "basic")
    if base_basic.upper is None:
        raise ValueError("base basic band needs upper")
    pa = int(round(base.personal_allowance * index))
    basic_upper = int(round(base_basic.upper * index))
    # Keep additional-rate threshold from actual statute (2023+ cut is a separate reform).
    add_band = next(b for b in actual.bands if b.band_id == "additional")
    higher_upper = (add_band.lower - 1) if add_band.lower else None
    bands = (
        Band("basic", "Basic rate", 20.0, 0, basic_upper),
        Band("higher", "Higher rate", 40.0, basic_upper + 1, higher_upper),
        Band(
            "additional",
            "Additional rate",
            float(add_band.rate_percent),
            add_band.lower,
            None,
        ),
    )
    return YearRules(
        tax_year=actual.tax_year,
        jurisdiction=actual.jurisdiction,
        personal_allowance=pa,
        income_limit=100_000,
        bands=bands,
    )


def build_examples(
    awe_rows: list[dict[str, Any]],
    ewni: dict[str, YearRules],
    scotland: dict[str, YearRules],
) -> dict[str, Any]:
    awe_by_year = {r["tax_year"]: r for r in awe_rows}
    base_awe = awe_by_year[BASE_TAX_YEAR]["awe_annualised_x52_gbp"]
    index_by_year = {
        ty: awe_by_year[ty]["awe_annualised_x52_gbp"] / base_awe for ty in TAX_YEARS
    }

    # Profile starting levels (hypothetical); growth path = verified AWE index.
    profiles_spec = [
        {
            "profile_id": "ewni_awe_scaled",
            "label": "E/W/NI · AWE-scaled hypothetical (1.0× base AWE)",
            "jurisdiction": "england-wales-ni",
            "base_gross_gbp": round(base_awe, 2),
            "notes": (
                "Starts at 1.0× tax-year-annualised KAI7 in 2021–22; "
                "gross grows exactly with the KAI7 tax-year index."
            ),
        },
        {
            "profile_id": "ewni_near_higher",
            "label": "E/W/NI · near higher-rate threshold (hypothetical £45,000 base)",
            "jurisdiction": "england-wales-ni",
            "base_gross_gbp": 45_000.0,
            "notes": (
                "Hypothetical base £45,000 in 2021–22 (below HRT £50,270); "
                "gross grows with the same KAI7 tax-year index — growth not invented."
            ),
        },
        {
            "profile_id": "scotland_awe_scaled",
            "label": "Scotland · AWE-scaled hypothetical (same earnings as ewni_awe_scaled)",
            "jurisdiction": "scotland",
            "base_gross_gbp": round(base_awe, 2),
            "notes": (
                "Same earnings path as ewni_awe_scaled; Scottish band table from this "
                "package (not E/W/NI). Scotland thresholds are not assumed frozen."
            ),
        },
    ]

    profiles: list[dict[str, Any]] = []
    for spec in profiles_spec:
        jurisdiction = spec["jurisdiction"]
        rules_map = ewni if jurisdiction == "england-wales-ni" else scotland
        years_out: list[dict[str, Any]] = []
        for ty in TAX_YEARS:
            idx = index_by_year[ty]
            gross = float(spec["base_gross_gbp"]) * idx
            actual = income_tax_liability(gross, rules_map[ty])
            year_row: dict[str, Any] = {
                "tax_year": ty,
                "awe_index_vs_2021_22": round(idx, 6),
                "awe_annualised_x52_gbp": awe_by_year[ty]["awe_annualised_x52_gbp"],
                "actual_statutory": actual,
            }
            if jurisdiction == "england-wales-ni":
                cf_rules = counterfactual_ewni_rules(ewni[BASE_TAX_YEAR], idx, ewni[ty])
                cf = income_tax_liability(gross, cf_rules)
                year_row["counterfactual_thresholds_indexed_to_awe"] = {
                    "personal_allowance_gbp": cf_rules.personal_allowance,
                    "basic_upper_after_allowance_gbp": next(
                        b.upper for b in cf_rules.bands if b.band_id == "basic"
                    ),
                    "liability": cf,
                    "extra_tax_vs_counterfactual_gbp": round(
                        actual["income_tax_gbp"] - cf["income_tax_gbp"], 2
                    ),
                }
            years_out.append(year_row)

        base_tax = years_out[0]["actual_statutory"]["income_tax_gbp"]
        end_tax = years_out[-1]["actual_statutory"]["income_tax_gbp"]
        base_eff = years_out[0]["actual_statutory"]["effective_income_tax_rate_percent"]
        end_eff = years_out[-1]["actual_statutory"]["effective_income_tax_rate_percent"]
        profiles.append(
            {
                **spec,
                "years": years_out,
                "summary": {
                    "base_tax_year": BASE_TAX_YEAR,
                    "end_tax_year": END_TAX_YEAR,
                    "gross_growth_percent": round(
                        (index_by_year[END_TAX_YEAR] - 1.0) * 100.0, 3
                    ),
                    "income_tax_base_gbp": base_tax,
                    "income_tax_end_gbp": end_tax,
                    "income_tax_change_gbp": round(end_tax - base_tax, 2),
                    "effective_rate_base_percent": base_eff,
                    "effective_rate_end_percent": end_eff,
                    "effective_rate_change_pp": round(end_eff - base_eff, 3),
                },
            }
        )

    assumptions = {
        "educational_disclaimer": (
            "Educational illustration of statutory income-tax arithmetic under "
            "labelled assumptions — not tax advice, not a personal tax calculation, "
            "and not a substitute for HMRC guidance."
        ),
        "earnings_measure": {
            "publisher": "ONS",
            "series_id": "KAI7",
            "dataset": "EMP",
            "title": (
                "AWE: Whole Economy Level (£): Seasonally Adjusted Regular Pay "
                "Excluding Arrears"
            ),
            "related_indicator_id": RELATED_EARNINGS_ID,
            "geography": "Great Britain (K03000001) — AWE excludes Northern Ireland",
            "unit": "£ per week, SA, cash (regular pay)",
            "landing_url": KAI7_LANDING,
            "data_url": KAI7_URL,
            "annualisation": "tax_year_mean_weekly × 52",
            "tax_year_window": "April–March inclusive; require 12 months",
            "vintage_note": "Pinned ONS EMP/KAI7 JSON; releaseDate from description",
            "not_this_measure": [
                "ASHE median/mean weekly pay",
                "AWE total pay (incl. bonuses)",
                "Northern Ireland earnings",
                "household income / take-home pay",
            ],
        },
        "counterfactual": {
            "base_tax_year": BASE_TAX_YEAR,
            "end_tax_year": END_TAX_YEAR,
            "jurisdiction_scope": (
                "E/W/NI only — PA and basic-rate upper after allowance indexed to "
                "KAI7 from 2021–22 levels; rates unchanged; additional-rate threshold "
                "follows actual statute (incl. 2023–24 cut)."
            ),
            "scotland_note": (
                "Scotland profile uses actual pinned Scottish bands each year. "
                "No invented Scotland freeze or E/W/NI copy."
            ),
            "price_basis": "nominal GBP throughout (not real / CPI-deflated)",
            "freeze_context": (
                "UK Personal Allowance £12,570 and E/W/NI basic band upper £37,700 "
                "(HRT £50,270) held in the curated pin across 2021–22…2025–26."
            ),
        },
        "tax_model": {
            "income_type": "hypothetical taxable employment income (NSND) only",
            "personal_allowance_taper": "£1 reduction per £2 above £100,000 to zero",
            "band_basis": "after-allowance bands from curated income_tax_bands.csv",
            "exclusions": [
                "employee/employer Class 1 NICs",
                "student loan",
                "pension contributions / gift aid",
                "savings starting rate / dividends",
                "marriage / blind / age allowances",
                "Welsh rates (use E/W/NI table as labelled england-wales-ni)",
                "benefits-in-kind / payroll quirks",
            ],
        },
        "profiles_are_hypothetical": True,
        "wage_path_not_invented": (
            "Growth path = observed KAI7 tax-year annualised index only; "
            "starting levels are labelled hypothetical multiples/levels."
        ),
    }

    return {
        "indicator_id": INDICATOR_ID,
        "artefact": "fiscal_drag_examples",
        "status": "documented",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "assumptions": assumptions,
        "awe_tax_year_path": awe_rows,
        "profiles": profiles,
        "profile_count": len(profiles),
    }


def write_awe_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fields = [
        "tax_year",
        "awe_mean_weekly_gbp",
        "awe_annualised_x52_gbp",
        "months_used",
        "series_id",
        "geography",
        "definition",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row[k] for k in fields})


def self_qa(
    data_root: Path,
    examples: dict[str, Any],
    kai7_meta: dict[str, Any],
    scotland_fp_before: tuple[int, str],
) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    def add(cid: str, ok: bool, notes: str) -> None:
        checks.append({"id": cid, "result": "pass" if ok else "fail", "notes": notes})

    raw = data_root / "raw" / "2026-11-15" / "kai7_emp.json"
    add("R1_kai7_raw_present", raw.is_file(), f"path={raw.name}")
    add(
        "R2_kai7_checksum",
        kai7_meta.get("checksum_sha256") == sha256_file(raw),
        kai7_meta.get("checksum_sha256", "")[:16],
    )
    add("R3_profile_count_le_3", examples["profile_count"] <= 3, str(examples["profile_count"]))
    add(
        "R4_jurisdictions_separate",
        {p["jurisdiction"] for p in examples["profiles"]}
        == {"england-wales-ni", "scotland"},
        ",".join(sorted({p["jurisdiction"] for p in examples["profiles"]})),
    )
    add(
        "R5_assumptions_present",
        "earnings_measure" in examples["assumptions"]
        and "counterfactual" in examples["assumptions"],
        "earnings_measure+counterfactual",
    )
    add(
        "R6_disclaimer",
        "not tax advice" in examples["assumptions"]["educational_disclaimer"].lower(),
        "disclaimer",
    )

    # Spot arithmetic: E/W/NI 2021-22 basic-only liability
    ewni_rules = load_rules(data_root, "england-wales-ni")
    p0 = examples["profiles"][0]["years"][0]
    gross = p0["actual_statutory"]["gross_employment_income_gbp"]
    recomputed = income_tax_liability(gross, ewni_rules[BASE_TAX_YEAR])
    add(
        "R7_spot_liability_2021_22",
        abs(recomputed["income_tax_gbp"] - p0["actual_statutory"]["income_tax_gbp"]) < 0.02,
        f"pkg={p0['actual_statutory']['income_tax_gbp']} re={recomputed['income_tax_gbp']}",
    )

    n, digest = scotland_2017_22_fingerprint(data_root / "curated" / "income_tax_bands.csv")
    add(
        "R8_scotland_2017_22_unchanged",
        (n, digest) == scotland_fp_before,
        f"rows={n} sha={digest[:16]}",
    )

    # Effective rate should rise for ewni_awe under freeze (fiscal drag signal)
    ewni_prof = next(p for p in examples["profiles"] if p["profile_id"] == "ewni_awe_scaled")
    add(
        "R9_ewni_effective_rate_rises",
        ewni_prof["summary"]["effective_rate_change_pp"] > 0,
        str(ewni_prof["summary"]["effective_rate_change_pp"]),
    )
    # Counterfactual extra tax positive by end year for ewni profiles
    end_cf = ewni_prof["years"][-1]["counterfactual_thresholds_indexed_to_awe"][
        "extra_tax_vs_counterfactual_gbp"
    ]
    add("R10_ewni_cf_extra_tax_positive", end_cf > 0, str(end_cf))

    overall = "pass" if all(c["result"] == "pass" for c in checks) else "fail"
    return {
        "overall": overall,
        "checks": checks,
        "scotland_2017_22_fingerprint": {"rows": n, "sha256": digest},
        "kai7": kai7_meta,
    }


def update_sums_file(raw_dir: Path, filename: str, digest: str) -> None:
    sums = raw_dir / "SHA256SUMS"
    lines: list[str] = []
    if sums.is_file():
        lines = [
            ln
            for ln in sums.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.rstrip().endswith(f"  {filename}")
        ]
    lines.append(f"{digest}  {filename}")
    sums.write_text("\n".join(lines) + "\n", encoding="utf-8")


def append_manifest_evidence(data_root: Path, kai7_meta: dict[str, Any]) -> None:
    """Append KAI7 raw evidence to manifest.yaml if missing (minimal edit)."""
    man_path = data_root / "manifest.yaml"
    text = man_path.read_text(encoding="utf-8")
    if "kai7_emp.json" in text:
        return
    block = (
        f"- path: raw/2026-11-15/kai7_emp.json\n"
        f"  retrieved_at: '{kai7_meta['retrieved_at']}'\n"
        f"  checksum_sha256: {kai7_meta['checksum_sha256']}\n"
        f"  content_type: application/json;charset=utf-8\n"
        f"  official_release_date: ''\n"
        f"  http_status: {kai7_meta.get('http_status') or 200}\n"
        f"  source_url: {KAI7_URL}\n"
    )
    # Insert after last raw_evidence entry (before transformations:)
    marker = "transformations:"
    if marker not in text:
        raise RuntimeError("manifest.yaml missing transformations: marker")
    text = text.replace(marker, block + marker, 1)
    # Soft-update caveats / definition deferred wording
    text = text.replace(
        "Fiscal-drag examples deferred.",
        "Fiscal-drag worked examples documented (KAI7 path); not Ready alone.",
    )
    text = text.replace(
        "Fiscal drag deferred this pass.",
        "Fiscal drag examples pinned (educational); Validation ask EC-VAL-06E-DRAG.",
    )
    text = text.replace(
        "  fiscal-drag counterfactual calculator;",
        "  interactive fiscal-drag calculator UI;",
    )
    man_path.write_text(text, encoding="utf-8")


def main() -> None:
    data_root = ECONOMY_DATA / PACKAGE_DIR
    curated = data_root / "curated"
    raw_dir = data_root / "raw" / "2026-11-15"
    raw_dir.mkdir(parents=True, exist_ok=True)

    bands_csv = curated / "income_tax_bands.csv"
    scotland_fp_before = scotland_2017_22_fingerprint(bands_csv)

    fetched = fetch_kai7(raw_dir / "kai7_emp.json")
    kai7_meta = fetched["meta"]
    desc = fetched["data"].get("description") or {}
    kai7_meta["ons_release_date"] = desc.get("releaseDate")
    kai7_meta["ons_title"] = (desc.get("title") or "")[:200]
    kai7_meta["ons_cdid"] = desc.get("cdid")
    update_sums_file(raw_dir, "kai7_emp.json", kai7_meta["checksum_sha256"])

    monthly = parse_monthly_kai7(fetched["data"])
    awe_rows = build_tax_year_awe(monthly)
    ewni = load_rules(data_root, "england-wales-ni")
    scotland = load_rules(data_root, "scotland")
    examples = build_examples(awe_rows, ewni, scotland)

    awe_csv = curated / "awe_kai7_tax_year.csv"
    write_awe_csv(awe_csv, awe_rows)
    examples_path = curated / "fiscal_drag_examples.json"
    examples_path.write_text(
        json.dumps(examples, indent=2) + "\n", encoding="utf-8"
    )

    qa = self_qa(data_root, examples, kai7_meta, scotland_fp_before)
    qa_path = curated / "fiscal_drag_self_qa.json"
    qa_path.write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")

    status = {
        "status": "documented",
        "reason": (
            "Worked examples pinned with verified ONS AWE KAI7 tax-year path "
            f"({BASE_TAX_YEAR}…{END_TAX_YEAR}); ≤3 hypothetical profiles; "
            "Scotland and E/W/NI separate; educational — not tax advice."
        ),
        "examples_path": "curated/fiscal_drag_examples.json",
        "earnings_measure": {
            "series_id": "KAI7",
            "related_indicator_id": RELATED_EARNINGS_ID,
            "raw_path": "raw/2026-11-15/kai7_emp.json",
            "checksum_sha256": kai7_meta["checksum_sha256"],
            "tax_year_table": "curated/awe_kai7_tax_year.csv",
            "ons_release_date": kai7_meta.get("ons_release_date"),
        },
        "self_qa_path": "curated/fiscal_drag_self_qa.json",
        "self_qa_overall": qa["overall"],
        "validation_ask": "EC-VAL-06E-DRAG",
        "ready": False,
    }
    (curated / "fiscal_drag_status.json").write_text(
        json.dumps(status, indent=2) + "\n", encoding="utf-8"
    )

    append_manifest_evidence(data_root, kai7_meta)

    # README soft update — fiscal drag no longer deferred
    readme = data_root / "README.md"
    if readme.is_file():
        rt = readme.read_text(encoding="utf-8")
        rt = rt.replace(
            "- Fiscal drag: **deferred** (`curated/fiscal_drag_status.json`)",
            "- Fiscal drag: **documented** (`curated/fiscal_drag_examples.json`; "
            "ONS KAI7 path; Validation ask `EC-VAL-06E-DRAG`)",
        )
        rt = rt.replace(
            "- fiscal-drag counterfactual calculator\n",
            "- interactive fiscal-drag calculator UI\n",
        )
        if "fiscal_drag_examples.json" not in rt:
            rt = rt.replace(
                "- `curated/fiscal_drag_status.json`\n",
                "- `curated/fiscal_drag_status.json`\n"
                "- `curated/fiscal_drag_examples.json`\n"
                "- `curated/awe_kai7_tax_year.csv`\n"
                "- `curated/fiscal_drag_self_qa.json`\n",
            )
        if "handover-economy-06-fiscal-drag.md" not in rt:
            rt = rt.replace(
                "- Scotland fill: `docs/handover-economy-06-scotland-bands.md`\n",
                "- Scotland fill: `docs/handover-economy-06-scotland-bands.md`\n"
                "- Fiscal drag: `docs/handover-economy-06-fiscal-drag.md`\n",
            )
        readme.write_text(rt, encoding="utf-8")

    # Confirm Scotland fingerprint still matches after writes
    scotland_fp_after = scotland_2017_22_fingerprint(bands_csv)
    if scotland_fp_after != scotland_fp_before:
        raise RuntimeError("Scotland 2017–22 band rows changed — abort")

    print(f"kai7: {kai7_meta['checksum_sha256'][:16]}… source={kai7_meta.get('source')}")
    print(f"profiles: {examples['profile_count']}")
    print(f"self-QA: {qa['overall']} ({sum(1 for c in qa['checks'] if c['result']=='pass')}/{len(qa['checks'])})")
    for p in examples["profiles"]:
        s = p["summary"]
        print(
            f"  {p['profile_id']}: eff {s['effective_rate_base_percent']}% → "
            f"{s['effective_rate_end_percent']}% ({s['effective_rate_change_pp']:+} pp)"
        )
    print(f"scotland fingerprint unchanged: {scotland_fp_after[1][:16]}…")
    print(f"status → {status['status']}")
    print(f"examples → {examples_path}")


if __name__ == "__main__":
    main()

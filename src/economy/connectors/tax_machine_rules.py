"""Tax Machine statute pin — income tax bands + employee Class 1 NICs.

Educational rule tables for Domain 06 (The Tax Machine). Not tax advice.

Pin scope (EC-G2-06C):
- Tax years: current + one prior at retrieval (2026–27 and 2025–26)
- Jurisdictions: England/Wales/NI full tables; Scotland labelled alternate
- Employee Class 1 NICs (category A) as a **separate** stage — never blended
  into an income-tax rate

Reproduce::

    uv run python -m economy.connectors.tax_machine_rules

Sources (OGL v3.0):
- https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
- https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions
- https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
- https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
- https://www.gov.uk/scottish-income-tax/2025-to-2026-tax-year
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import Observation, write_observations_csv
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "tax-machine-income-tax-rules"
PACKAGE_DIR = "tax-machine-rules"

# Tax years pinned = current + one prior on retrieval date 2026-11-15.
TAX_YEARS = ("2025-26", "2026-27")

SOURCE_URLS: dict[str, str] = {
    "income_tax_rates.html": (
        "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/"
        "income-tax-rates-and-allowances-current-and-past"
    ),
    "nics_rates.html": (
        "https://www.gov.uk/government/publications/"
        "rates-and-allowances-national-insurance-contributions/"
        "rates-and-allowances-national-insurance-contributions"
    ),
    "employers_2025_26.html": (
        "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026"
    ),
    "employers_2026_27.html": (
        "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027"
    ),
    "scottish_2025_26.html": (
        "https://www.gov.uk/scottish-income-tax/2025-to-2026-tax-year"
    ),
}

# Strings that must appear in raw HTML (self-QA anchors).
RAW_ANCHORS: dict[str, tuple[str, ...]] = {
    "income_tax_rates.html": (
        "Personal Allowance",
        "£12,570",
        "Up to £37,700",
        "£37,701 to £125,140",
    ),
    "nics_rates.html": (
        "Primary Threshold",
        "Upper Earnings Limit",
        "Between Primary Threshold and Upper Earnings Limit",
    ),
    "employers_2025_26.html": (
        "2025 to 2026",
        "Up to £37,700",
        "Up to £2,827",
        "£12,570 per year",
        "£50,270 per year",
    ),
    "employers_2026_27.html": (
        "2026 to 2027",
        "Up to £37,700",
        "Up to £3,967",
        "£12,570 per year",
        "£50,270 per year",
    ),
    "scottish_2025_26.html": (
        "2025 to 2026",
        "£12,571 to £15,397",
        "19%",
        "48%",
    ),
}

PENNY = Decimal("0.01")


def _money(value: Decimal | int | str | float) -> Decimal:
    """Round to nearest penny (banker's half-up for educational examples)."""
    return Decimal(value).quantize(PENNY, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class Band:
    """One income-tax band on income *after* the personal allowance."""

    band_id: str
    label: str
    rate_percent: Decimal
    # Inclusive lower bound on income after allowances (£); 0 = first band.
    lower_after_allowance: Decimal
    # Inclusive upper bound; None = open-ended.
    upper_after_allowance: Decimal | None


@dataclass(frozen=True, slots=True)
class YearRules:
    tax_year: str
    period_start: str  # ISO date of tax-year start (6 April)
    period_end: str  # ISO date of tax-year end (5 April)
    personal_allowance: Decimal
    pa_income_limit: Decimal  # taper starts above this gross income
    ewni_bands: tuple[Band, ...]
    scotland_bands: tuple[Band, ...]
    # Employee Class 1 (category A) — annual thresholds for educational annual model
    nic_primary_threshold: Decimal
    nic_upper_earnings_limit: Decimal
    nic_rate_pt_to_uel_percent: Decimal
    nic_rate_above_uel_percent: Decimal
    nic_lel_annual: Decimal


def _ewni_bands() -> tuple[Band, ...]:
    """England/Wales/NI bands — identical for 2025–26 and 2026–27 in this pin."""
    return (
        Band("basic", "Basic rate", Decimal("20"), Decimal("0"), Decimal("37700")),
        Band(
            "higher",
            "Higher rate",
            Decimal("40"),
            Decimal("37701"),
            Decimal("125140"),
        ),
        Band(
            "additional",
            "Additional rate",
            Decimal("45"),
            Decimal("125141"),
            None,
        ),
    )


def _scotland_bands_2025_26() -> tuple[Band, ...]:
    """Scotland bands on income after allowances — employers 2025–26 table."""
    return (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2827")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2828"), Decimal("14921")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("14922"),
            Decimal("31092"),
        ),
        Band("higher", "Higher rate", Decimal("42"), Decimal("31093"), Decimal("62430")),
        Band(
            "advanced",
            "Advanced rate",
            Decimal("45"),
            Decimal("62431"),
            Decimal("125140"),
        ),
        Band("top", "Top rate", Decimal("48"), Decimal("125141"), None),
    )


def _scotland_bands_2026_27() -> tuple[Band, ...]:
    """Scotland bands on income after allowances — employers 2026–27 table."""
    return (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("3967")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("3968"), Decimal("16956")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("16957"),
            Decimal("31092"),
        ),
        Band("higher", "Higher rate", Decimal("42"), Decimal("31093"), Decimal("62430")),
        Band(
            "advanced",
            "Advanced rate",
            Decimal("45"),
            Decimal("62431"),
            Decimal("125140"),
        ),
        Band("top", "Top rate", Decimal("48"), Decimal("125141"), None),
    )


RULES: dict[str, YearRules] = {
    "2025-26": YearRules(
        tax_year="2025-26",
        period_start="2025-04-06",
        period_end="2026-04-05",
        personal_allowance=Decimal("12570"),
        pa_income_limit=Decimal("100000"),
        ewni_bands=_ewni_bands(),
        scotland_bands=_scotland_bands_2025_26(),
        nic_primary_threshold=Decimal("12570"),
        nic_upper_earnings_limit=Decimal("50270"),
        nic_rate_pt_to_uel_percent=Decimal("8"),
        nic_rate_above_uel_percent=Decimal("2"),
        nic_lel_annual=Decimal("6500"),
    ),
    "2026-27": YearRules(
        tax_year="2026-27",
        period_start="2026-04-06",
        period_end="2027-04-05",
        personal_allowance=Decimal("12570"),
        pa_income_limit=Decimal("100000"),
        ewni_bands=_ewni_bands(),
        scotland_bands=_scotland_bands_2026_27(),
        nic_primary_threshold=Decimal("12570"),
        nic_upper_earnings_limit=Decimal("50270"),
        nic_rate_pt_to_uel_percent=Decimal("8"),
        nic_rate_above_uel_percent=Decimal("2"),
        nic_lel_annual=Decimal("6708"),
    ),
}


EXCLUSIONS: tuple[str, ...] = (
    "benefits in kind",
    "pension contributions / relief",
    "marriage allowance",
    "blind person's allowance",
    "student loan repayments",
    "savings / dividend income (starting rate for savings and dividend rates out of scope)",
    "personal allowance taper for income above £100,000 (examples stay at or below £100,000)",
    "employer Class 1 NICs (employer stage not modelled)",
    "married women's reduced NICs rates / other category letters (category A only)",
    "corporation tax, VAT, CGT, council tax",
)


SAFETY_COPY = (
    "Educational illustration of dated statutory income-tax and employee Class 1 "
    "NICs rules — not tax advice and not a substitute for HMRC guidance or a "
    "personal tax calculation. Hypothetical taxable employment income only; "
    "Scotland uses a labelled alternate band table. Statutory incidence (who the "
    "law charges) is not the same as economic incidence (who ultimately bears "
    "the cost). Modelled liabilities are not observed population tax paid."
)


def personal_allowance_for(gross: Decimal, rules: YearRules) -> Decimal:
    """Standard PA with £1-for-£2 taper above the income limit (documented but unused in examples ≤ £100k)."""
    if gross <= rules.pa_income_limit:
        return rules.personal_allowance
    reduction = (gross - rules.pa_income_limit) // 2
    remaining = rules.personal_allowance - reduction
    return max(Decimal("0"), remaining)


def income_tax_liability(
    gross: Decimal,
    bands: tuple[Band, ...],
    rules: YearRules,
) -> tuple[Decimal, list[dict[str, str]]]:
    """PAYE-style band tax on non-savings non-dividend income after PA."""
    allowance = personal_allowance_for(gross, rules)
    taxable = max(Decimal("0"), gross - allowance)
    steps: list[dict[str, str]] = [
        {
            "step": "personal_allowance",
            "detail": f"PA={allowance} (standard; taper limit {rules.pa_income_limit})",
            "amount": str(_money(allowance)),
        },
        {
            "step": "taxable_income",
            "detail": f"gross {gross} − PA {allowance}",
            "amount": str(_money(taxable)),
        },
    ]
    remaining = taxable
    # Walk bands using published inclusive bounds on income after allowances.
    # Convert to contiguous widths: first band width = upper; later = upper−prev_upper.
    prev_upper = Decimal("0")
    total = Decimal("0")
    for band in bands:
        if remaining <= 0:
            break
        if band.upper_after_allowance is None:
            width = remaining  # open-ended
        else:
            width = band.upper_after_allowance - prev_upper
            if width < 0:
                raise ValueError(f"Band order error: {band.band_id}")
        slice_amt = min(remaining, width)
        if slice_amt > 0:
            tax = _money(slice_amt * band.rate_percent / Decimal("100"))
            total += tax
            steps.append(
                {
                    "step": f"band_{band.band_id}",
                    "detail": (
                        f"{band.label} @ {band.rate_percent}% on {_money(slice_amt)} "
                        f"(after-allowance window "
                        f"{band.lower_after_allowance}–"
                        f"{band.upper_after_allowance if band.upper_after_allowance is not None else 'open'})"
                    ),
                    "amount": str(tax),
                }
            )
            remaining -= slice_amt
        if band.upper_after_allowance is not None:
            prev_upper = band.upper_after_allowance
    steps.append(
        {
            "step": "income_tax_total",
            "detail": "sum of band tax (separate from NICs)",
            "amount": str(_money(total)),
        }
    )
    return _money(total), steps


def employee_class1_nics(gross: Decimal, rules: YearRules) -> tuple[Decimal, list[dict[str, str]]]:
    """Annualised employee Class 1 (category A) — separate stage from income tax."""
    steps: list[dict[str, str]] = []
    pt = rules.nic_primary_threshold
    uel = rules.nic_upper_earnings_limit
    rate_mid = rules.nic_rate_pt_to_uel_percent
    rate_top = rules.nic_rate_above_uel_percent
    mid = max(Decimal("0"), min(gross, uel) - pt)
    top = max(Decimal("0"), gross - uel)
    mid_nic = _money(mid * rate_mid / Decimal("100"))
    top_nic = _money(top * rate_top / Decimal("100"))
    total = _money(mid_nic + top_nic)
    steps.append(
        {
            "step": "nic_pt_to_uel",
            "detail": f"earnings {_money(mid)} between PT {pt} and UEL {uel} @ {rate_mid}%",
            "amount": str(mid_nic),
        }
    )
    steps.append(
        {
            "step": "nic_above_uel",
            "detail": f"earnings {_money(top)} above UEL {uel} @ {rate_top}%",
            "amount": str(top_nic),
        }
    )
    steps.append(
        {
            "step": "employee_class1_nics_total",
            "detail": "category A employee primary contributions (not blended with income tax)",
            "amount": str(total),
        }
    )
    return total, steps


def build_worked_examples() -> list[dict[str, object]]:
    """Three E/W/NI examples + one Scottish contrast (2025–26)."""
    year = "2025-26"
    rules = RULES[year]
    scenarios: list[tuple[str, Decimal, str, tuple[Band, ...]]] = [
        ("ewni_low", Decimal("30000"), "england-wales-ni", rules.ewni_bands),
        ("ewni_basic_top", Decimal("50270"), "england-wales-ni", rules.ewni_bands),
        ("ewni_higher", Decimal("80000"), "england-wales-ni", rules.ewni_bands),
        ("scotland_contrast_basic_top", Decimal("50270"), "scotland", rules.scotland_bands),
    ]
    out: list[dict[str, object]] = []
    for example_id, gross, jurisdiction, bands in scenarios:
        it_total, it_steps = income_tax_liability(gross, bands, rules)
        nic_total, nic_steps = employee_class1_nics(gross, rules)
        out.append(
            {
                "example_id": example_id,
                "tax_year": year,
                "jurisdiction": jurisdiction,
                "scenario_type": "hypothetical_taxable_employment_income",
                "gross_taxable_income_gbp": str(_money(gross)),
                "exclusions": list(EXCLUSIONS),
                "income_tax_gbp": str(it_total),
                "employee_class1_nics_gbp": str(nic_total),
                "combined_statutory_deductions_gbp": str(_money(it_total + nic_total)),
                "note": (
                    "Combined figure is the sum of two separate statutory stages "
                    "(income tax + employee Class 1 NICs), not a single blended tax rate."
                ),
                "income_tax_steps": it_steps,
                "employee_class1_nics_steps": nic_steps,
                "safety": SAFETY_COPY,
            }
        )
    return out


class TaxMachineRulesConnector(Connector):
    """Fetch GOV.UK statute pages; emit curated rule tables + worked examples."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / PACKAGE_DIR)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Tax Machine income-tax + employee Class 1 NICs rules",
            sector="economy-public-finance",
            publisher="HMRC / GOV.UK (rates and allowances); Scottish Income Tax via GOV.UK",
            source_url=SOURCE_URLS["income_tax_rates.html"],
            series_id="tax-machine-statute-pin",
            geography=(
                "England, Wales and Northern Ireland (full PAYE-style tables); "
                "Scotland as labelled alternate income-tax bands. NICs thresholds "
                "are UK-wide for Class 1 in this pin."
            ),
            frequency="ad_hoc",
            unit="GBP thresholds / percent rates / GBP modelled liability",
            definition=(
                "Dated statutory Personal Allowance, income-tax bands/rates, and "
                "employee Class 1 (category A) NICs thresholds/rates for tax years "
                "2025–26 and 2026–27, plus hypothetical worked liabilities. "
                "Educational Tax Machine evidence — not observed receipts and not "
                "tax advice. Income tax and NICs are separate stages."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.tax_machine_rules",
            curated_path="curated/observations.csv",
            update_cadence="re-pin when GOV.UK rates pages update (typically each tax year)",
            raw_evidence=list(evidence),
            transformations=(
                "Download GOV.UK HTML snapshots. Curated CSV/JSON tables are typed "
                "extractions of published allowances, bands (income after allowances), "
                "and annual Class 1 employee thresholds/rates. Worked examples recompute "
                "liabilities from curated tables with documented exclusions. "
                "observations.csv stores key rule parameters as Observation rows "
                "(dimensions in notes)."
            ),
            revision_notes=(
                "Re-fetch HTML when HMRC updates rates pages. Do not invent missing "
                "years. Scotland and E/W/NI must stay labelled separately."
            ),
            caveats=(
                f"{SAFETY_COPY} Exclusions: {'; '.join(EXCLUSIONS)}. "
                "Kickoff preferred years were 2025–26 / 2024–25; this pin uses "
                "current + one prior on 2026-11-15 retrieval → 2026–27 + 2025–26 "
                "(both published on GOV.UK)."
            ),
            status_note=(
                "Statute pin for Tax Machine evidence. Validation-ready, not Ready. "
                "No calculator UI."
            ),
            related_indicator_ids=["tax-receipts"],
            open_questions=[
                "Registry row for tax-machine-income-tax-rules?",
                "Extend pin to 2024–25 historical contrast later?",
            ],
            notion_registry_url="",
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        evidence: list[RawEvidence] = []
        for filename, url in SOURCE_URLS.items():
            result = self.fetch_url(
                url,
                f"raw/{stamp}/{filename}",
                official_release_date="",
            )
            evidence.append(result.evidence)
        # SHA256SUMS beside raw files for Validation convenience
        raw_dir = self.data_root / "raw" / stamp
        lines = []
        for item in evidence:
            path = self.data_root / item.path
            lines.append(f"{item.checksum_sha256}  {path.name}")
        (raw_dir / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        """Key rule parameters as Observation rows for the shared CSV contract."""
        obs: list[Observation] = []
        for tax_year in TAX_YEARS:
            rules = RULES[tax_year]
            geo_specs = (
                ("EWNI", "England, Wales and Northern Ireland", rules.ewni_bands),
                ("S92000003", "Scotland", rules.scotland_bands),
            )
            for geo_code, geo_label, bands in geo_specs:
                obs.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=rules.period_start,
                        period_end=rules.period_end,
                        geography_code=geo_code,
                        geography_label=geo_label,
                        value=float(rules.personal_allowance),
                        unit="GBP personal allowance",
                        observation_status="final",
                        source_version=tax_year,
                        notes=(
                            f"kind=allowance; name=personal_allowance; tax_year={tax_year}; "
                            f"pa_income_limit={rules.pa_income_limit}"
                        ),
                    )
                )
                for band in bands:
                    upper = (
                        float(band.upper_after_allowance)
                        if band.upper_after_allowance is not None
                        else None
                    )
                    obs.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=rules.period_start,
                            period_end=rules.period_end,
                            geography_code=geo_code,
                            geography_label=geo_label,
                            value=float(band.rate_percent),
                            unit="percent income-tax rate",
                            observation_status="final",
                            source_version=tax_year,
                            notes=(
                                f"kind=income_tax_band; band={band.band_id}; "
                                f"label={band.label}; tax_year={tax_year}; "
                                f"lower_after_allowance={band.lower_after_allowance}; "
                                f"upper_after_allowance="
                                f"{band.upper_after_allowance if band.upper_after_allowance is not None else 'open'}"
                            ),
                        )
                    )
                    if upper is not None:
                        # Keep upper bound discoverable as a companion value row
                        obs.append(
                            Observation(
                                indicator_id=INDICATOR_ID,
                                period_start=rules.period_start,
                                period_end=rules.period_end,
                                geography_code=geo_code,
                                geography_label=geo_label,
                                value=upper,
                                unit="GBP band upper (income after allowances)",
                                observation_status="final",
                                source_version=tax_year,
                                notes=(
                                    f"kind=income_tax_band_upper; band={band.band_id}; "
                                    f"tax_year={tax_year}"
                                ),
                            )
                        )
            # NICs — UK-wide Class 1 employee (category A)
            for name, value, unit in (
                ("primary_threshold", rules.nic_primary_threshold, "GBP annual PT"),
                ("upper_earnings_limit", rules.nic_upper_earnings_limit, "GBP annual UEL"),
                ("lel_annual", rules.nic_lel_annual, "GBP annual LEL"),
                (
                    "rate_pt_to_uel",
                    rules.nic_rate_pt_to_uel_percent,
                    "percent employee Class 1",
                ),
                (
                    "rate_above_uel",
                    rules.nic_rate_above_uel_percent,
                    "percent employee Class 1",
                ),
            ):
                obs.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=rules.period_start,
                        period_end=rules.period_end,
                        geography_code="K02000001",
                        geography_label="United Kingdom (Class 1 employee NICs)",
                        value=float(value),
                        unit=unit,
                        observation_status="final",
                        source_version=tax_year,
                        notes=(
                            f"kind=employee_class1_nics; name={name}; "
                            f"category=A; tax_year={tax_year}; "
                            "stage=separate_from_income_tax"
                        ),
                    )
                )
        obs.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
        return obs

    def _write_curated_tables(self, curated: Path) -> None:
        bands_path = curated / "income_tax_bands.csv"
        with bands_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "tax_year",
                    "jurisdiction",
                    "band_id",
                    "band_label",
                    "rate_percent",
                    "lower_after_allowance_gbp",
                    "upper_after_allowance_gbp",
                    "source_note",
                ],
            )
            writer.writeheader()
            for tax_year in TAX_YEARS:
                rules = RULES[tax_year]
                for jurisdiction, bands in (
                    ("england-wales-ni", rules.ewni_bands),
                    ("scotland", rules.scotland_bands),
                ):
                    for band in bands:
                        writer.writerow(
                            {
                                "tax_year": tax_year,
                                "jurisdiction": jurisdiction,
                                "band_id": band.band_id,
                                "band_label": band.label,
                                "rate_percent": str(band.rate_percent),
                                "lower_after_allowance_gbp": str(band.lower_after_allowance),
                                "upper_after_allowance_gbp": (
                                    str(band.upper_after_allowance)
                                    if band.upper_after_allowance is not None
                                    else ""
                                ),
                                "source_note": (
                                    "GOV.UK Income Tax rates and allowances / "
                                    "employers rates-and-thresholds (income after allowances)"
                                ),
                            }
                        )

        allow_path = curated / "allowances.csv"
        with allow_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "tax_year",
                    "jurisdiction",
                    "allowance_id",
                    "amount_gbp",
                    "income_limit_gbp",
                    "taper_rule",
                    "source_note",
                ],
            )
            writer.writeheader()
            for tax_year in TAX_YEARS:
                rules = RULES[tax_year]
                for jurisdiction in ("england-wales-ni", "scotland"):
                    writer.writerow(
                        {
                            "tax_year": tax_year,
                            "jurisdiction": jurisdiction,
                            "allowance_id": "personal_allowance",
                            "amount_gbp": str(rules.personal_allowance),
                            "income_limit_gbp": str(rules.pa_income_limit),
                            "taper_rule": "reduce_by_1_for_every_2_above_limit_to_zero",
                            "source_note": "GOV.UK Income Tax rates and allowances",
                        }
                    )

        nics_path = curated / "employee_class1_nics.csv"
        with nics_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "tax_year",
                    "category_letter",
                    "primary_threshold_annual_gbp",
                    "upper_earnings_limit_annual_gbp",
                    "lower_earnings_limit_annual_gbp",
                    "rate_pt_to_uel_percent",
                    "rate_above_uel_percent",
                    "source_note",
                ],
            )
            writer.writeheader()
            for tax_year in TAX_YEARS:
                rules = RULES[tax_year]
                writer.writerow(
                    {
                        "tax_year": tax_year,
                        "category_letter": "A",
                        "primary_threshold_annual_gbp": str(rules.nic_primary_threshold),
                        "upper_earnings_limit_annual_gbp": str(
                            rules.nic_upper_earnings_limit
                        ),
                        "lower_earnings_limit_annual_gbp": str(rules.nic_lel_annual),
                        "rate_pt_to_uel_percent": str(rules.nic_rate_pt_to_uel_percent),
                        "rate_above_uel_percent": str(rules.nic_rate_above_uel_percent),
                        "source_note": (
                            "GOV.UK NICs rates and allowances + employers "
                            "rates-and-thresholds (employee primary, category A)"
                        ),
                    }
                )

        examples = build_worked_examples()
        (curated / "worked_examples.json").write_text(
            json.dumps(
                {
                    "indicator_id": INDICATOR_ID,
                    "safety": SAFETY_COPY,
                    "exclusions": list(EXCLUSIONS),
                    "tax_years_in_tables": list(TAX_YEARS),
                    "worked_examples_tax_year": "2025-26",
                    "examples": examples,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        # Human-readable note beside JSON
        lines = [
            "# Worked examples (human-readable)",
            "",
            SAFETY_COPY,
            "",
            f"Exclusions: {'; '.join(EXCLUSIONS)}.",
            "",
            "Tax year for examples: **2025–26** (E/W/NI income-tax + employee NICs "
            "rates for these incomes match 2026–27 in this pin).",
            "",
        ]
        for ex in examples:
            lines.append(
                f"## {ex['example_id']} — {ex['jurisdiction']} · gross £{ex['gross_taxable_income_gbp']}"
            )
            lines.append(f"- Income tax: **£{ex['income_tax_gbp']}**")
            lines.append(f"- Employee Class 1 NICs: **£{ex['employee_class1_nics_gbp']}**")
            lines.append(
                f"- Sum of separate stages: £{ex['combined_statutory_deductions_gbp']}"
            )
            lines.append("")
        (curated / "worked_examples.md").write_text("\n".join(lines), encoding="utf-8")

    def _self_qa(self, evidence: Sequence[RawEvidence]) -> dict[str, object]:
        checks: list[dict[str, object]] = []

        def add(check_id: str, ok: bool, notes: str) -> None:
            checks.append({"id": check_id, "result": "pass" if ok else "fail", "notes": notes})

        # C1 checksums
        for item in evidence:
            path = self.data_root / item.path
            ok = path.is_file() and sha256_file(path) == item.checksum_sha256
            add("C1_checksum", ok, f"{item.path} sha256 match={ok}")

        # C2 raw anchors
        for item in evidence:
            name = Path(item.path).name
            text = (self.data_root / item.path).read_text(encoding="utf-8", errors="replace")
            for anchor in RAW_ANCHORS.get(name, ()):
                ok = anchor in text
                add("C2_raw_anchor", ok, f"{name} contains {anchor!r}: {ok}")

        # C3 Scotland vs E/W/NI diverge at £50,270
        examples = build_worked_examples()
        by_id = {e["example_id"]: e for e in examples}
        ewni = by_id["ewni_basic_top"]
        sco = by_id["scotland_contrast_basic_top"]
        add(
            "C3_scotland_contrast",
            Decimal(str(sco["income_tax_gbp"])) > Decimal(str(ewni["income_tax_gbp"])),
            (
                f"Scotland IT £{sco['income_tax_gbp']} > E/W/NI £{ewni['income_tax_gbp']} "
                f"at gross £50,270"
            ),
        )

        # C4 recompute from curated tables
        expected = {
            "ewni_low": ("3486.00", "1394.40"),
            "ewni_basic_top": ("7540.00", "3016.00"),
            "ewni_higher": ("19432.00", "3610.60"),
            "scotland_contrast_basic_top": ("9127.20", "3016.00"),
        }
        for eid, (it_exp, nic_exp) in expected.items():
            ex = by_id[eid]
            ok = ex["income_tax_gbp"] == it_exp and ex["employee_class1_nics_gbp"] == nic_exp
            add(
                "C4_worked_example",
                ok,
                f"{eid}: IT={ex['income_tax_gbp']} (exp {it_exp}); "
                f"NICs={ex['employee_class1_nics_gbp']} (exp {nic_exp})",
            )

        # C5 NICs not blended into income-tax rate rows
        bands_csv = (self.data_root / "curated" / "income_tax_bands.csv").read_text(
            encoding="utf-8"
        )
        add(
            "C5_no_blend",
            "class1" not in bands_csv.lower() and "nic" not in bands_csv.lower(),
            "income_tax_bands.csv has no NICs columns/labels",
        )

        overall = all(c["result"] == "pass" for c in checks)
        return {
            "indicator_id": INDICATOR_ID,
            "retrieved_date": date.today().isoformat(),
            "overall": "pass" if overall else "fail",
            "checks": checks,
            "sample_liability": {
                "example_id": "ewni_higher",
                "gross": "80000.00",
                "jurisdiction": "england-wales-ni",
                "tax_year": "2025-26",
                "income_tax_gbp": by_id["ewni_higher"]["income_tax_gbp"],
                "employee_class1_nics_gbp": by_id["ewni_higher"]["employee_class1_nics_gbp"],
            },
        }

    def write_package(
        self, evidence: Sequence[RawEvidence], observations: Sequence[Observation]
    ) -> dict[str, Path]:
        curated = self.data_root / "curated"
        curated.mkdir(parents=True, exist_ok=True)
        obs_path = write_observations_csv(curated / "observations.csv", observations)
        self._write_curated_tables(curated)
        qa = self._self_qa(evidence)
        (curated / "self_qa.json").write_text(
            json.dumps(qa, indent=2) + "\n", encoding="utf-8"
        )

        manifest = self.build_manifest(evidence)
        man_path = save_manifest(self.data_root / "manifest.yaml", manifest)

        readme = self.data_root / "README.md"
        readme.write_text(
            "\n".join(
                [
                    "# Tax Machine — income tax + employee Class 1 NICs (statute pin)",
                    "",
                    f"**Indicator:** `{INDICATOR_ID}`  ",
                    f"**Package folder:** `data/economy/{PACKAGE_DIR}/`  ",
                    "**Status:** Validation-ready, **not** Ready. No UI.",
                    "",
                    SAFETY_COPY,
                    "",
                    "## Coverage",
                    "",
                    "- Tax years: **2025–26** and **2026–27** (current + one prior on 2026-11-15)",
                    "- Jurisdictions: England/Wales/NI; Scotland alternate income-tax bands",
                    "- Stages: (1) income tax after Personal Allowance; (2) employee Class 1 NICs (category A) separately",
                    "",
                    "## Exclusions",
                    "",
                    *[f"- {item}" for item in EXCLUSIONS],
                    "",
                    "## Reproduce",
                    "",
                    "```bash",
                    "uv run python -m economy.connectors.tax_machine_rules",
                    "```",
                    "",
                    "## Curated artefacts",
                    "",
                    "- `curated/income_tax_bands.csv`",
                    "- `curated/allowances.csv`",
                    "- `curated/employee_class1_nics.csv`",
                    "- `curated/worked_examples.json` (+ `.md`)",
                    "- `curated/observations.csv` (shared Observation contract)",
                    "- `validation_report.md` (Economy self-QA)",
                    "",
                    "## Related",
                    "",
                    "- Receipts flagship (separate): `tax-receipts` (ONS AHHY)",
                    "- Handover: `docs/handover-economy-06-tax-machine.md`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        # validation_report.md
        check_rows = []
        for c in qa["checks"]:  # type: ignore[index]
            check_rows.append(
                f"| {c['id']} | {c['result']} | {c['notes']} |"
            )
        sample = qa["sample_liability"]  # type: ignore[index]
        report = "\n".join(
            [
                f"# QA report — {INDICATOR_ID} — {qa['retrieved_date']}",
                "",
                "## Scope",
                f"- Package: `data/economy/{PACKAGE_DIR}/`",
                f"- Connector: `economy.connectors.tax_machine_rules`",
                f"- Tax years: {', '.join(TAX_YEARS)}",
                "- Overall (Economy self-QA): "
                f"**{qa['overall']}**",
                "",
                "## Checks",
                "| ID | Result | Notes |",
                "|----|--------|-------|",
                *check_rows,
                "",
                "## Sample liability",
                (
                    f"- `{sample['example_id']}` · {sample['jurisdiction']} · "
                    f"gross £{sample['gross']} · {sample['tax_year']}: "
                    f"income tax £{sample['income_tax_gbp']}; "
                    f"employee Class 1 NICs £{sample['employee_class1_nics_gbp']}"
                ),
                "",
                "## Blockers for Ready",
                "- Independent Validation task `EC-VAL-06C` not yet run under `data/qa/`.",
                "- No React Tax Machine; EmptyStage remains until Review Gate after PASS.",
                "",
                "## Accounting / legal reminders",
                "- Statutory incidence ≠ economic incidence.",
                "- Modelled liability ≠ observed population tax paid / AHHY receipts.",
                "- Do not blend NICs into income-tax rates.",
                "",
            ]
        )
        report_path = self.data_root / "validation_report.md"
        report_path.write_text(report, encoding="utf-8")

        return {
            "manifest": man_path,
            "observations": obs_path,
            "readme": readme,
            "validation_report": report_path,
        }


def main() -> None:
    connector = TaxMachineRulesConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    observations = connector.transform(evidence)
    paths = connector.write_package(evidence, observations)
    qa_path = connector.data_root / "curated" / "self_qa.json"
    qa = json.loads(qa_path.read_text(encoding="utf-8"))
    print(f"overall self-QA: {qa['overall']}")
    print(f"worked examples: {len(build_worked_examples())}")
    print(f"sample: {qa['sample_liability']}")
    for label, path in paths.items():
        print(f"{label}: {path}")


if __name__ == "__main__":
    main()

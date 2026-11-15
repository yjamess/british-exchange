"""Tax Time Machine — multi-year income-tax (+ employee Class 1 NICs) history pin.

Sibling of ``tax_machine_rules`` (Ready statute pin for 2025–26 / 2026–27).
Do not invent rates: missing / split years stay gaps.

Reproduce::

    uv run python -m economy.connectors.tax_machine_income_tax_history

Sources (OGL v3.0 unless noted):
- HMRC Table A.2 Rates of Income Tax (ODS) — E/W/NI bands 2010–11…2026–27
- HMRC Table A.1 Personal allowances (ODS)
- HMRC Table A.4 NICs main features (ODS) — employee Class 1 separate stage
- GOV.UK Income Tax rates HTML — Scotland bands 2023–24…2026–27 + cross-check
- gov.scot / HMRC Scottish Income Tax reports — Scotland bands 2017–18…2022–23
"""

from __future__ import annotations

import csv
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import Observation, write_observations_csv
from britain_exchange.paths import ECONOMY_DATA

# Reuse band arithmetic helpers from the Ready statute pin (one connector family).
from economy.connectors.tax_machine_rules import Band, SAFETY_COPY

INDICATOR_ID = "tax-machine-income-tax-history"
PACKAGE_DIR = "tax-machine-income-tax-history"
RELATED_READY_ID = "tax-machine-income-tax-rules"

# Kickoff target: at least 2010–11; ODS supports through 2026–27.
FIRST_YEAR = "2010-11"
LAST_YEAR = "2026-27"

SOURCE_URLS: dict[str, str] = {
    "table_a2_rates.ods": (
        "https://assets.publishing.service.gov.uk/media/6a54ca0b9e9c95844ae64d9a/"
        "Table_a2_-_Income_Tax_-_rates_and_allowances.ods"
    ),
    "table_a1_allowances.ods": (
        "https://assets.publishing.service.gov.uk/media/6a54c97ba4890e65cce64db8/"
        "Table_a1_-_Income_Tax_-_personal_allowances_and_reliefs.ods"
    ),
    "table_a4_nics.ods": (
        "https://assets.publishing.service.gov.uk/media/6a54ca0fa4890e65cce64db9/"
        "Table_a4_-_National_Insurance_Contributions_-_rates_and_allowances.ods"
    ),
    "income_tax_rates.html": (
        "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/"
        "income-tax-rates-and-allowances-current-and-past"
    ),
    "nics_rates.html": (
        "https://www.gov.uk/government/publications/"
        "rates-and-allowances-national-insurance-contributions/"
        "rates-and-allowances-national-insurance-contributions"
    ),
    "rates_of_income_landing.html": (
        "https://www.gov.uk/government/statistics/rates-of-income-statistics"
    ),
    "allowances_landing.html": (
        "https://www.gov.uk/government/statistics/income-tax-personal-allowances-and-reliefs"
    ),
    "nics_stats_landing.html": (
        "https://www.gov.uk/government/statistics/main-features-of-national-insurance-contributions"
    ),
    # Scotland 2017–18…2022–23 — official gov.scot / HMRC SIT tables (not E/W/NI copies).
    "sco_2017_18_govscot.html": "https://www.gov.scot/news/scottish-income-tax/",
    "sco_2018_19_govscot.html": (
        "https://www.gov.scot/publications/scottish-income-tax-2018-2019/"
    ),
    "sco_hmrc_sit_2019.html": (
        "https://www.gov.uk/government/publications/"
        "scottish-income-tax-hmrc-annual-report-2019/"
        "scottish-income-tax-hmrc-annual-report-2019"
    ),
    "sco_hmrc_sit_2020.html": (
        "https://www.gov.uk/government/publications/"
        "scottish-income-tax-hmrc-annual-report-2020/"
        "scottish-income-tax-hmrc-annual-report-2020"
    ),
    "sco_hmrc_sit_2021.html": (
        "https://www.gov.uk/government/publications/"
        "scottish-income-tax-hmrc-annual-report-2021/"
        "scottish-income-tax-hmrc-annual-report-2021"
    ),
    "sco_2020_21_govscot.html": (
        "https://www.gov.scot/publications/"
        "scotland-act-2012-2016-annual-implementation-report-2021/pages/3/"
    ),
    "sco_2021_22_budget.html": (
        "https://www.gov.scot/publications/scottish-budget-2021-22/pages/3/"
    ),
    "sco_2022_23_govscot.html": (
        "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/"
        "pages/rates-and-bands-2022-to-2023/"
    ),
    "sco_hmrc_sit_2023.html": (
        "https://www.gov.uk/government/publications/"
        "scottish-income-tax-hmrc-annual-report-2023/"
        "scottish-income-tax-hmrc-annual-report-2023"
    ),
    "employers_2018_19.html": (
        "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2018-to-2019"
    ),
    "employers_2020_21.html": (
        "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021"
    ),
}

RAW_ANCHORS: dict[str, tuple[str, ...]] = {
    "income_tax_rates.html": (
        "Personal Allowance",
        "£12,570",
        "Up to £37,700",
        "Starter rate",
    ),
    "nics_rates.html": (
        "Primary Threshold",
        "Upper Earnings Limit",
        "Between Primary Threshold and Upper Earnings Limit",
    ),
    "sco_2017_18_govscot.html": ("£43,000", "Scottish Basic rate", "20%"),
    "sco_2018_19_govscot.html": ("Starter Rate", "19%", "£13,850", "£43,430"),
    "sco_hmrc_sit_2019.html": ("2017 to 2018", "2018 to 2019", "2019 to 2020", "19%"),
    "sco_hmrc_sit_2020.html": ("2019 to 2020", "£14,549", "41%"),
    "sco_hmrc_sit_2021.html": ("2020 to 2021", "£14,585", "£25,158"),
    "sco_2020_21_govscot.html": ("2020-21", "£14,585", "£43,430", "2021-22"),
    "sco_2021_22_budget.html": ("2021-22", "£14,667", "£25,296", "£43,662"),
    "sco_2022_23_govscot.html": ("2022 to 2023", "£14,732", "£25,688", "£43,662"),
    "sco_hmrc_sit_2023.html": ("2022 to 2023", "£14,732", "£25,688"),
    "employers_2018_19.html": ("Scottish starter", "£2,000", "£31,580"),
    "employers_2020_21.html": ("Scottish starter", "£2,085", "£30,930"),
}

# Scotland 2017–18…2022–23 from gov.scot / HMRC SIT (gross tables → after-allowance).
# Mapping: PA-relative uppers for starter/basic/intermediate; £150,000 absolute for
# higher/top (PA taper — same convention as HMRC employers / SRR rate limits).
# Never copied from E/W/NI.
SCOTLAND_BANDS_HISTORICAL: dict[str, tuple[Band, ...]] = {
    "2017-18": (
        Band("basic", "Basic rate", Decimal("20"), Decimal("0"), Decimal("31500")),
        Band("higher", "Higher rate", Decimal("40"), Decimal("31501"), Decimal("150000")),
        Band("additional", "Additional rate", Decimal("45"), Decimal("150001"), None),
    ),
    "2018-19": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2000")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2001"), Decimal("12150")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("12151"),
            Decimal("31580"),
        ),
        Band("higher", "Higher rate", Decimal("41"), Decimal("31581"), Decimal("150000")),
        Band("top", "Top rate", Decimal("46"), Decimal("150001"), None),
    ),
    "2019-20": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2049")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2050"), Decimal("12444")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("12445"),
            Decimal("30930"),
        ),
        Band("higher", "Higher rate", Decimal("41"), Decimal("30931"), Decimal("150000")),
        Band("top", "Top rate", Decimal("46"), Decimal("150001"), None),
    ),
    "2020-21": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2085")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2086"), Decimal("12658")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("12659"),
            Decimal("30930"),
        ),
        Band("higher", "Higher rate", Decimal("41"), Decimal("30931"), Decimal("150000")),
        Band("top", "Top rate", Decimal("46"), Decimal("150001"), None),
    ),
    "2021-22": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2097")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2098"), Decimal("12726")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("12727"),
            Decimal("31092"),
        ),
        Band("higher", "Higher rate", Decimal("41"), Decimal("31093"), Decimal("150000")),
        Band("top", "Top rate", Decimal("46"), Decimal("150001"), None),
    ),
    "2022-23": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2162")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2163"), Decimal("13118")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("13119"),
            Decimal("31092"),
        ),
        Band("higher", "Higher rate", Decimal("41"), Decimal("31093"), Decimal("150000")),
        Band("top", "Top rate", Decimal("46"), Decimal("150001"), None),
    ),
}

# Scotland labelled alternate bands from GOV.UK current+3 table (income after allowances).
SCOTLAND_BANDS_GOVUK: dict[str, tuple[Band, ...]] = {
    "2023-24": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2162")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2163"), Decimal("13118")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("13119"),
            Decimal("31092"),
        ),
        Band("higher", "Higher rate", Decimal("42"), Decimal("31093"), Decimal("125140")),
        Band("top", "Top rate", Decimal("47"), Decimal("125141"), None),
    ),
    "2024-25": (
        Band("starter", "Starter rate", Decimal("19"), Decimal("0"), Decimal("2306")),
        Band("basic", "Basic rate", Decimal("20"), Decimal("2307"), Decimal("13991")),
        Band(
            "intermediate",
            "Intermediate rate",
            Decimal("21"),
            Decimal("13992"),
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
    ),
    "2025-26": (
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
    ),
    "2026-27": (
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
    ),
}

# Unified Scotland lookup (historical pin + GOV.UK recent).
SCOTLAND_BANDS: dict[str, tuple[Band, ...]] = {
    **SCOTLAND_BANDS_HISTORICAL,
    **SCOTLAND_BANDS_GOVUK,
}

SCOTLAND_HISTORICAL_COVERAGE = "pinned_govscot_hmrc_sit"
SCOTLAND_GOVUK_COVERAGE = "pinned_govuk_after_allowance"

FISCAL_DRAG_STATUS = {
    "status": "deferred",
    "reason": (
        "No verified earnings measure + counterfactual assumptions package in this pass. "
        "Kickoff allowed deferral; inventory + rates history only."
    ),
    "examples_path": None,
}

EXCLUSIONS: tuple[str, ...] = (
    "savings starting-rate band (out of NSND employment focus)",
    "dividend rates / dividend allowance",
    "marriage / blind person's / age-related allowances as modelled reliefs",
    "employer Class 1 NICs",
    "non-A NICs category letters",
    "fiscal-drag counterfactual calculator",
    "corporation tax, VAT, CGT, council tax",
)


def _tax_year_key(label: str) -> str:
    """Normalise '2010 to 2011' / '2010-11' / notes → '2010-11'."""
    cleaned = re.sub(r"\s*\(note[^)]*\)", "", label, flags=re.I).strip()
    m = re.match(r"(\d{4})\s+to\s+(\d{4})$", cleaned)
    if m:
        return f"{m.group(1)}-{m.group(2)[2:]}"
    m2 = re.match(r"(\d{4})-(\d{2})$", cleaned)
    if m2:
        return cleaned
    raise ValueError(f"Unrecognised tax-year label: {label!r}")


def _year_sort_key(tax_year: str) -> tuple[int, int]:
    a, b = tax_year.split("-")
    return int(a), int(b)


def _in_span(tax_year: str) -> bool:
    return _year_sort_key(FIRST_YEAR) <= _year_sort_key(tax_year) <= _year_sort_key(LAST_YEAR)


def _period_bounds(tax_year: str) -> tuple[str, str]:
    start_y = int(tax_year.split("-")[0])
    return f"{start_y}-04-06", f"{start_y + 1}-04-05"


def _parse_money_cell(raw: str) -> Decimal | None:
    if not raw or raw.strip().upper() in {"N/A", "NA", "—", "-"}:
        return None
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("£", "").replace(",", "").strip()
    if "/" in text:
        # Intra-year change cells — caller handles; do not invent a single value.
        return None
    if not re.fullmatch(r"\d+(\.\d+)?", text):
        return None
    return Decimal(text)


def _parse_percent_cell(raw: str) -> Decimal | None:
    if not raw or raw.strip().upper() in {"N/A", "NA"}:
        return None
    if "/" in raw:
        return None
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("%", "").strip()
    if not re.fullmatch(r"\d+(\.\d+)?", text):
        return None
    return Decimal(text)


def _parse_band_window(raw: str) -> tuple[Decimal | None, Decimal | None, str]:
    """Parse HMRC '1 to 37,700' / 'Over 150,000' into after-allowance bounds.

    Convention (aligned with Ready pin ``tax-machine-income-tax-rules``):
    - first band ``1 to N`` → lower 0, upper N
    - ``A to B`` → lower A, upper B
    - ``Over X`` when previous closed at X → lower X+1, upper open
      (HMRC often writes Over X while GOV.UK writes Over X+1)
    """
    if not raw or raw.strip().upper() in {"N/A", "NA"}:
        return None, None, "absent"
    text = re.sub(r"\s*\(note[^)]*\)", "", raw, flags=re.I)
    text = text.replace("£", "").replace(",", "").strip()
    m_over = re.match(r"(?i)over\s+(\d+)$", text)
    if m_over:
        x = Decimal(m_over.group(1))
        return x + 1, None, "over_plus_one_vs_hmrc_over_x"
    m_range = re.match(r"(\d+)\s+to\s+(\d+)$", text)
    if m_range:
        lo = Decimal(m_range.group(1))
        hi = Decimal(m_range.group(2))
        if lo == 1:
            return Decimal("0"), hi, "hmrc_1_to_n_as_0_to_n"
        return lo, hi, "hmrc_inclusive_range"
    return None, None, f"unparsed:{raw}"


@dataclass(frozen=True, slots=True)
class OdsSheet:
    name: str
    rows: list[list[str]]


def read_ods_sheets(path: Path) -> list[OdsSheet]:
    """Read ODS tables with the standard library (zip + XML).

    Avoids adding a spreadsheet dependency. See OASIS ODF table markup:
    https://docs.oasis-open.org/office/v1.2/os/OpenDocument-v1.2-os-part1.html
    """
    ns_table = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
    ns_text = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
    ns_office = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"

    def cell_text(cell: ET.Element) -> str:
        for p in cell.findall(f".//{ns_text}p"):
            t = "".join(p.itertext())
            if t:
                return t
        return ""

    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("content.xml"))

    sheets: list[OdsSheet] = []
    for table in root.findall(f".//{ns_table}table"):
        name = table.attrib.get(f"{ns_table}name", "?")
        rows: list[list[str]] = []
        for row in table.findall(f"{ns_table}table-row"):
            cells: list[str] = []
            for cell in row.findall(f"{ns_table}table-cell"):
                repeat = int(cell.attrib.get(f"{ns_table}number-columns-repeated", "1"))
                text = cell_text(cell)
                value = cell.attrib.get(f"{ns_office}value")
                display = text if text else (value or "")
                if repeat > 80 and not display:
                    break
                for _ in range(min(repeat, 40)):
                    cells.append(display)
            while cells and cells[-1] == "":
                cells.pop()
            if cells:
                rows.append(cells)
        sheets.append(OdsSheet(name=name, rows=rows))
    return sheets


def parse_ewni_bands_from_a2(ods_path: Path) -> dict[str, tuple[Band, ...]]:
    sheets = read_ods_sheets(ods_path)
    main = next(s for s in sheets if "Rates_of_IT" in s.name and "Footnote" not in s.name)
    out: dict[str, tuple[Band, ...]] = {}
    for row in main.rows:
        if not row or not re.match(r"\d{4}\s+to\s+\d{4}", row[0]):
            continue
        tax_year = _tax_year_key(row[0])
        if not _in_span(tax_year):
            continue
        # Columns: year, lower_band, lower_rate, starting_band, starting_rate,
        # basic_band, basic_rate, higher_band, higher_rate, additional_band, additional_rate
        while len(row) < 11:
            row.append("")
        bands: list[Band] = []
        specs = (
            ("basic", "Basic rate", row[5], row[6]),
            ("higher", "Higher rate", row[7], row[8]),
            ("additional", "Additional rate", row[9], row[10]),
        )
        for band_id, label, window_raw, rate_raw in specs:
            rate = _parse_percent_cell(rate_raw)
            lo, hi, _conv = _parse_band_window(window_raw)
            if rate is None or lo is None:
                continue
            bands.append(Band(band_id, label, rate, lo, hi))
        if not bands:
            raise ValueError(f"No E/W/NI bands parsed for {tax_year}")
        out[tax_year] = tuple(bands)
    return out


def parse_personal_allowances(ods_path: Path) -> dict[str, Decimal]:
    sheets = read_ods_sheets(ods_path)
    main = next(s for s in sheets if "PA" in s.name or "allowance" in s.name.lower())
    out: dict[str, Decimal] = {}
    for row in main.rows:
        if not row or not re.match(r"\d{4}\s+to\s+\d{4}", row[0]):
            continue
        tax_year = _tax_year_key(row[0])
        if not _in_span(tax_year):
            continue
        amount = _parse_money_cell(row[1] if len(row) > 1 else "")
        if amount is None:
            raise ValueError(f"Missing personal allowance for {tax_year}")
        out[tax_year] = amount
    return out


@dataclass(frozen=True, slots=True)
class NicsYear:
    tax_year: str
    lel_weekly: Decimal | None
    pt_weekly: Decimal | None
    uel_weekly: Decimal | None
    rate_pt_to_uel_percent: Decimal | None
    rate_above_uel_percent: Decimal | None
    published_pt_cell: str
    published_main_rate_cell: str
    published_addl_rate_cell: str
    rate_status: str  # clean | intra_year_change | gap


def parse_employee_class1_nics(ods_path: Path) -> dict[str, NicsYear]:
    sheets = read_ods_sheets(ods_path)
    main = next(s for s in sheets if "MAIN_FEATURE" in s.name.upper() and "FOOT" not in s.name.upper())
    header = main.rows[1]
    years = [_tax_year_key(h) for h in header[2:]]
    by_label: dict[str, list[str]] = {}
    for row in main.rows[2:]:
        label = (row[1] if len(row) > 1 else "").strip().lower()
        if not label:
            continue
        by_label[label] = row[2:]

    def col(label_substr: str) -> list[str]:
        for key, vals in by_label.items():
            if label_substr in key:
                return vals
        raise KeyError(label_substr)

    lel_row = col("lower earnings limit")
    pt_row = col("primary threshold")
    uel_row = col("upper earnings limit")
    main_rate_row = col("primary (employee) main contribution rate")
    addl_rate_row = col("primary (employee) additional contribution rate")

    out: dict[str, NicsYear] = {}
    for i, tax_year in enumerate(years):
        if not _in_span(tax_year):
            continue
        pt_cell = pt_row[i] if i < len(pt_row) else ""
        main_cell = main_rate_row[i] if i < len(main_rate_row) else ""
        addl_cell = addl_rate_row[i] if i < len(addl_rate_row) else ""
        split = ("/" in pt_cell) or ("/" in main_cell) or ("/" in addl_cell)
        rate_status = "intra_year_change" if split else "clean"
        out[tax_year] = NicsYear(
            tax_year=tax_year,
            lel_weekly=_parse_money_cell(lel_row[i]) if i < len(lel_row) else None,
            pt_weekly=_parse_money_cell(pt_cell),
            uel_weekly=_parse_money_cell(uel_row[i]) if i < len(uel_row) else None,
            rate_pt_to_uel_percent=_parse_percent_cell(main_cell),
            rate_above_uel_percent=_parse_percent_cell(addl_cell),
            published_pt_cell=pt_cell,
            published_main_rate_cell=main_cell,
            published_addl_rate_cell=addl_cell,
            rate_status=rate_status,
        )
    return out


def scotland_coverage_for(tax_year: str) -> str:
    if tax_year in SCOTLAND_BANDS_GOVUK:
        return SCOTLAND_GOVUK_COVERAGE
    if tax_year in SCOTLAND_BANDS_HISTORICAL:
        return SCOTLAND_HISTORICAL_COVERAGE
    if _year_sort_key(tax_year) < _year_sort_key("2017-18"):
        return "pre_divergence_mirrors_ewni"
    return "gap_awaiting_clean_pin"


def scotland_bands_for(tax_year: str) -> tuple[Band, ...] | None:
    return SCOTLAND_BANDS.get(tax_year)


class TaxMachineIncomeTaxHistoryConnector(Connector):
    """Fetch HMRC ODS + GOV.UK HTML; emit multi-year history tables."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / PACKAGE_DIR)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Tax Time Machine income-tax (+ employee Class 1 NICs) history",
            sector="economy-public-finance",
            publisher="HMRC / GOV.UK (rates statistics + rates and allowances)",
            source_url=SOURCE_URLS["rates_of_income_landing.html"],
            series_id="tax-machine-timemachine-history",
            geography=(
                "England, Wales and Northern Ireland (HMRC Table A.2); Scotland as "
                "labelled alternate (gov.scot/HMRC SIT 2017–18…2022–23; GOV.UK "
                "2023–24…2026–27; pre-divergence mirror 2010–11…2016–17). "
                "Employee Class 1 NICs UK-wide."
            ),
            frequency="annual_tax_year",
            unit="GBP thresholds / percent rates / GBP weekly NICs thresholds",
            definition=(
                f"Multi-year Personal Allowance and income-tax band history "
                f"({FIRST_YEAR}…{LAST_YEAR}) for The Tax Time Machine, plus optional "
                "employee Class 1 (category A) NICs thresholds/rates as a separate stage. "
                "Sibling of the Ready statute pin tax-machine-income-tax-rules. "
                "Educational evidence — not tax advice. Fiscal-drag examples deferred."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.tax_machine_income_tax_history",
            curated_path="curated/observations.csv",
            update_cadence="re-pin when HMRC Table A.1/A.2/A.4 or GOV.UK rates pages update",
            raw_evidence=list(evidence),
            transformations=(
                "Download HMRC ODS (Tables A.1, A.2, A.4), GOV.UK HTML landings, and "
                "gov.scot / HMRC Scottish Income Tax HTML. Parse ODS with stdlib "
                "zip/XML. Map HMRC taxable-income windows to after-allowance bands "
                "(1→N as 0→N; Over X as lower X+1). Scotland 2017–22 from gov.scot/"
                "HMRC SIT gross tables mapped to after-allowance (PA-relative lower "
                "bands; £150,000 absolute higher/top per employers/SRR convention); "
                "never copy E/W/NI. Scotland 2023–27 from GOV.UK after-allowance "
                "table; 2010–16 mirrors E/W/NI. NICs weekly figures retained; "
                "weekly×52 documented as educational annual equivalent only. "
                "Intra-year NICs rate cells kept as published text without inventing "
                "a single annual rate."
            ),
            revision_notes=(
                "2026-11-15: filled Scotland 2017–18…2022–23 from gov.scot / HMRC SIT. "
                "Do not invent freezes or mid-year blends."
            ),
            caveats=(
                f"{SAFETY_COPY} Exclusions: {'; '.join(EXCLUSIONS)}. "
                "Fiscal drag deferred this pass. Scotland Personal Allowance remains "
                "the reserved UK PA (HMRC Table A.1) — gov.scot tables state this."
            ),
            status_note=(
                "Time Machine history pin (+ Scotland 2017–22 fill). "
                "Validation-ready, not Ready. No UI."
            ),
            related_indicator_ids=[RELATED_READY_ID, "tax-receipts"],
            open_questions=[
                "Overlay Ready-pin annual NICs PT/UEL (£12,570 / £50,270) vs weekly×52?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/4196547176858177bf79d15680c0c264"
            ),
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        evidence: list[RawEvidence] = []
        for filename, url in SOURCE_URLS.items():
            result = self.fetch_url(url, f"raw/{stamp}/{filename}", official_release_date="")
            evidence.append(result.evidence)
        raw_dir = self.data_root / "raw" / stamp
        lines = [
            f"{item.checksum_sha256}  {Path(item.path).name}" for item in evidence
        ]
        (raw_dir / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
        return evidence

    def _raw_by_name(self, evidence: Sequence[RawEvidence]) -> dict[str, Path]:
        return {Path(item.path).name: self.data_root / item.path for item in evidence}

    def _build_tables(
        self, evidence: Sequence[RawEvidence]
    ) -> tuple[
        dict[str, tuple[Band, ...]],
        dict[str, Decimal],
        dict[str, NicsYear],
        list[dict[str, str]],
    ]:
        paths = self._raw_by_name(evidence)
        ewni = parse_ewni_bands_from_a2(paths["table_a2_rates.ods"])
        allowances = parse_personal_allowances(paths["table_a1_allowances.ods"])
        nics = parse_employee_class1_nics(paths["table_a4_nics.ods"])

        coverage: list[dict[str, str]] = []
        years = sorted(ewni.keys(), key=_year_sort_key)
        for tax_year in years:
            sco = scotland_coverage_for(tax_year)
            nic = nics.get(tax_year)
            coverage.append(
                {
                    "tax_year": tax_year,
                    "ewni_income_tax": "pinned_hmrc_a2",
                    "personal_allowance": "pinned_hmrc_a1",
                    "scotland_income_tax": sco,
                    "employee_class1_nics": (
                        nic.rate_status if nic is not None else "gap"
                    ),
                    "notes": (
                        "Scotland mirrors E/W/NI until 2016–17 (HMRC A.2 note 14). "
                        "Scotland 2017–22 from gov.scot / HMRC SIT (not E/W/NI). "
                        "Scotland 2023–27 from GOV.UK HTML. "
                        "NICs intra_year_change years keep published split cells only."
                    ),
                }
            )
        return ewni, allowances, nics, coverage

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        ewni, allowances, nics, _coverage = self._build_tables(evidence)
        obs: list[Observation] = []
        for tax_year, bands in sorted(ewni.items(), key=lambda kv: _year_sort_key(kv[0])):
            p0, p1 = _period_bounds(tax_year)
            pa = allowances[tax_year]
            obs.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=p0,
                    period_end=p1,
                    geography_code="EWNI",
                    geography_label="England, Wales and Northern Ireland",
                    value=float(pa),
                    unit="GBP personal allowance",
                    observation_status="final",
                    source_version=tax_year,
                    notes=(
                        f"kind=allowance; name=personal_allowance; tax_year={tax_year}; "
                        "pa_income_limit=100000; source=hmrc_table_a1"
                    ),
                )
            )
            for band in bands:
                obs.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=p0,
                        period_end=p1,
                        geography_code="EWNI",
                        geography_label="England, Wales and Northern Ireland",
                        value=float(band.rate_percent),
                        unit="percent income-tax rate",
                        observation_status="final",
                        source_version=tax_year,
                        notes=(
                            f"kind=income_tax_band; band={band.band_id}; "
                            f"label={band.label}; tax_year={tax_year}; "
                            f"lower_after_allowance={band.lower_after_allowance}; "
                            f"upper_after_allowance="
                            f"{band.upper_after_allowance if band.upper_after_allowance is not None else 'open'}; "
                            "source=hmrc_table_a2"
                        ),
                    )
                )

            sco_status = scotland_coverage_for(tax_year)
            if sco_status == SCOTLAND_GOVUK_COVERAGE:
                sco_bands = SCOTLAND_BANDS_GOVUK[tax_year]
                source = "govuk_rates_html"
            elif sco_status == SCOTLAND_HISTORICAL_COVERAGE:
                sco_bands = SCOTLAND_BANDS_HISTORICAL[tax_year]
                source = "govscot_hmrc_sit"
            elif sco_status == "pre_divergence_mirrors_ewni":
                sco_bands = bands
                source = "mirror_ewni_pre_2017_18"
            else:
                sco_bands = ()
                source = "gap"

            if sco_bands:
                obs.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=p0,
                        period_end=p1,
                        geography_code="S92000003",
                        geography_label="Scotland",
                        value=float(pa),
                        unit="GBP personal allowance",
                        observation_status="final",
                        source_version=tax_year,
                        notes=(
                            f"kind=allowance; name=personal_allowance; tax_year={tax_year}; "
                            f"pa_income_limit=100000; scotland_coverage={sco_status}; "
                            f"source={source}"
                        ),
                    )
                )
                for band in sco_bands:
                    obs.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=p0,
                            period_end=p1,
                            geography_code="S92000003",
                            geography_label="Scotland",
                            value=float(band.rate_percent),
                            unit="percent income-tax rate",
                            observation_status="final",
                            source_version=tax_year,
                            notes=(
                                f"kind=income_tax_band; band={band.band_id}; "
                                f"label={band.label}; tax_year={tax_year}; "
                                f"lower_after_allowance={band.lower_after_allowance}; "
                                f"upper_after_allowance="
                                f"{band.upper_after_allowance if band.upper_after_allowance is not None else 'open'}; "
                                f"scotland_coverage={sco_status}; source={source}"
                            ),
                        )
                    )

            nic = nics.get(tax_year)
            if nic is not None and nic.rate_status == "clean" and nic.pt_weekly is not None:
                for name, value, unit in (
                    ("lel_weekly", nic.lel_weekly, "GBP weekly LEL"),
                    ("primary_threshold_weekly", nic.pt_weekly, "GBP weekly PT"),
                    ("upper_earnings_limit_weekly", nic.uel_weekly, "GBP weekly UEL"),
                    (
                        "rate_pt_to_uel",
                        nic.rate_pt_to_uel_percent,
                        "percent employee Class 1",
                    ),
                    (
                        "rate_above_uel",
                        nic.rate_above_uel_percent,
                        "percent employee Class 1",
                    ),
                    (
                        "primary_threshold_annual_x52",
                        nic.pt_weekly * 52 if nic.pt_weekly is not None else None,
                        "GBP annual PT equivalent weekly×52",
                    ),
                    (
                        "upper_earnings_limit_annual_x52",
                        nic.uel_weekly * 52 if nic.uel_weekly is not None else None,
                        "GBP annual UEL equivalent weekly×52",
                    ),
                ):
                    if value is None:
                        continue
                    obs.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=p0,
                            period_end=p1,
                            geography_code="K02000001",
                            geography_label="United Kingdom (Class 1 employee NICs)",
                            value=float(value),
                            unit=unit,
                            observation_status="final",
                            source_version=tax_year,
                            notes=(
                                f"kind=employee_class1_nics; name={name}; category=A; "
                                f"tax_year={tax_year}; rate_status=clean; "
                                "stage=separate_from_income_tax; source=hmrc_table_a4"
                            ),
                        )
                    )
        obs.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
        return obs

    def _write_curated(
        self,
        curated: Path,
        ewni: dict[str, tuple[Band, ...]],
        allowances: dict[str, Decimal],
        nics: dict[str, NicsYear],
        coverage: list[dict[str, str]],
    ) -> None:
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
                    "coverage_status",
                    "source_note",
                ],
            )
            writer.writeheader()
            for tax_year, bands in sorted(ewni.items(), key=lambda kv: _year_sort_key(kv[0])):
                for band in bands:
                    writer.writerow(
                        {
                            "tax_year": tax_year,
                            "jurisdiction": "england-wales-ni",
                            "band_id": band.band_id,
                            "band_label": band.label,
                            "rate_percent": str(band.rate_percent),
                            "lower_after_allowance_gbp": str(band.lower_after_allowance),
                            "upper_after_allowance_gbp": (
                                str(band.upper_after_allowance)
                                if band.upper_after_allowance is not None
                                else ""
                            ),
                            "coverage_status": "pinned_hmrc_a2",
                            "source_note": "HMRC Table A.2 Rates of Income Tax (ODS)",
                        }
                    )
                sco_status = scotland_coverage_for(tax_year)
                if sco_status == "gap_awaiting_clean_pin":
                    writer.writerow(
                        {
                            "tax_year": tax_year,
                            "jurisdiction": "scotland",
                            "band_id": "gap",
                            "band_label": "GAP — Scottish rates not pinned",
                            "rate_percent": "",
                            "lower_after_allowance_gbp": "",
                            "upper_after_allowance_gbp": "",
                            "coverage_status": sco_status,
                            "source_note": (
                                "Explicit gap; do not apply E/W/NI silently"
                            ),
                        }
                    )
                    continue
                if sco_status == SCOTLAND_GOVUK_COVERAGE:
                    sco_bands = SCOTLAND_BANDS_GOVUK[tax_year]
                    source_note = (
                        "GOV.UK Income Tax rates and allowances "
                        "(Scotland after-allowance table)"
                    )
                elif sco_status == SCOTLAND_HISTORICAL_COVERAGE:
                    sco_bands = SCOTLAND_BANDS_HISTORICAL[tax_year]
                    source_note = (
                        "gov.scot / HMRC Scottish Income Tax tables "
                        "(gross → after-allowance; not E/W/NI)"
                    )
                else:
                    sco_bands = bands
                    source_note = (
                        "Pre-divergence: mirrors E/W/NI main rates "
                        "(HMRC Table A.2 note 14); labelled Scotland"
                    )
                for band in sco_bands:
                    writer.writerow(
                        {
                            "tax_year": tax_year,
                            "jurisdiction": "scotland",
                            "band_id": band.band_id,
                            "band_label": band.label,
                            "rate_percent": str(band.rate_percent),
                            "lower_after_allowance_gbp": str(band.lower_after_allowance),
                            "upper_after_allowance_gbp": (
                                str(band.upper_after_allowance)
                                if band.upper_after_allowance is not None
                                else ""
                            ),
                            "coverage_status": sco_status,
                            "source_note": source_note,
                        }
                    )

        with (curated / "allowances.csv").open("w", encoding="utf-8", newline="") as fh:
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
            for tax_year, amount in sorted(
                allowances.items(), key=lambda kv: _year_sort_key(kv[0])
            ):
                for jurisdiction in ("england-wales-ni", "scotland"):
                    writer.writerow(
                        {
                            "tax_year": tax_year,
                            "jurisdiction": jurisdiction,
                            "allowance_id": "personal_allowance",
                            "amount_gbp": str(amount),
                            "income_limit_gbp": "100000",
                            "taper_rule": "reduce_by_1_for_every_2_above_limit_to_zero",
                            "source_note": (
                                "HMRC Table A.1; £100k taper per footnote (8) from 2010–11"
                            ),
                        }
                    )

        with (curated / "employee_class1_nics.csv").open(
            "w", encoding="utf-8", newline=""
        ) as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "tax_year",
                    "category_letter",
                    "rate_status",
                    "lel_weekly_gbp",
                    "primary_threshold_weekly_gbp",
                    "upper_earnings_limit_weekly_gbp",
                    "primary_threshold_annual_x52_gbp",
                    "upper_earnings_limit_annual_x52_gbp",
                    "rate_pt_to_uel_percent",
                    "rate_above_uel_percent",
                    "published_pt_cell",
                    "published_main_rate_cell",
                    "published_addl_rate_cell",
                    "source_note",
                ],
            )
            writer.writeheader()
            for tax_year, nic in sorted(nics.items(), key=lambda kv: _year_sort_key(kv[0])):
                writer.writerow(
                    {
                        "tax_year": tax_year,
                        "category_letter": "A",
                        "rate_status": nic.rate_status,
                        "lel_weekly_gbp": "" if nic.lel_weekly is None else str(nic.lel_weekly),
                        "primary_threshold_weekly_gbp": (
                            "" if nic.pt_weekly is None else str(nic.pt_weekly)
                        ),
                        "upper_earnings_limit_weekly_gbp": (
                            "" if nic.uel_weekly is None else str(nic.uel_weekly)
                        ),
                        "primary_threshold_annual_x52_gbp": (
                            ""
                            if nic.pt_weekly is None
                            else str(nic.pt_weekly * 52)
                        ),
                        "upper_earnings_limit_annual_x52_gbp": (
                            ""
                            if nic.uel_weekly is None
                            else str(nic.uel_weekly * 52)
                        ),
                        "rate_pt_to_uel_percent": (
                            ""
                            if nic.rate_pt_to_uel_percent is None
                            else str(nic.rate_pt_to_uel_percent)
                        ),
                        "rate_above_uel_percent": (
                            ""
                            if nic.rate_above_uel_percent is None
                            else str(nic.rate_above_uel_percent)
                        ),
                        "published_pt_cell": nic.published_pt_cell,
                        "published_main_rate_cell": nic.published_main_rate_cell,
                        "published_addl_rate_cell": nic.published_addl_rate_cell,
                        "source_note": (
                            "HMRC Table A.4; employee primary Class 1. "
                            "weekly×52 is educational annual equivalent only "
                            "(may differ from PAYE annual thresholds on employers pages). "
                            "Intra-year cells are not collapsed to a single invented rate."
                        ),
                    }
                )

        with (curated / "coverage_inventory.csv").open(
            "w", encoding="utf-8", newline=""
        ) as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "tax_year",
                    "ewni_income_tax",
                    "personal_allowance",
                    "scotland_income_tax",
                    "employee_class1_nics",
                    "notes",
                ],
            )
            writer.writeheader()
            for row in coverage:
                writer.writerow(row)

        (curated / "fiscal_drag_status.json").write_text(
            json.dumps(FISCAL_DRAG_STATUS, indent=2) + "\n", encoding="utf-8"
        )

    def _self_qa(
        self,
        evidence: Sequence[RawEvidence],
        ewni: dict[str, tuple[Band, ...]],
        allowances: dict[str, Decimal],
        nics: dict[str, NicsYear],
    ) -> dict[str, object]:
        checks: list[dict[str, object]] = []

        def add(check_id: str, ok: bool, notes: str) -> None:
            checks.append(
                {"id": check_id, "result": "pass" if ok else "fail", "notes": notes}
            )

        for item in evidence:
            path = self.data_root / item.path
            ok = path.is_file() and sha256_file(path) == item.checksum_sha256
            add("C1_checksum", ok, f"{item.path} sha256 match={ok}")

        for item in evidence:
            name = Path(item.path).name
            if name not in RAW_ANCHORS:
                continue
            text = (self.data_root / item.path).read_text(
                encoding="utf-8", errors="replace"
            )
            for anchor in RAW_ANCHORS[name]:
                ok = anchor in text
                add("C2_raw_anchor", ok, f"{name} contains {anchor!r}: {ok}")

        years = sorted(ewni.keys(), key=_year_sort_key)
        add(
            "C3_year_span",
            years[0] == FIRST_YEAR and years[-1] == LAST_YEAR,
            f"E/W/NI years {years[0]}…{years[-1]} (target {FIRST_YEAR}…{LAST_YEAR})",
        )

        add(
            "C4_pa_2025_26",
            allowances.get("2025-26") == Decimal("12570"),
            f"2025–26 PA={allowances.get('2025-26')}",
        )

        b2526 = {b.band_id: b for b in ewni["2025-26"]}
        add(
            "C5_basic_upper_2025_26",
            b2526["basic"].upper_after_allowance == Decimal("37700")
            and b2526["basic"].rate_percent == Decimal("20"),
            f"basic upper={b2526['basic'].upper_after_allowance} rate={b2526['basic'].rate_percent}",
        )

        # Cross-check Ready pin Scotland 2025–26 starter upper
        sco = SCOTLAND_BANDS_GOVUK["2025-26"]
        add(
            "C6_scotland_2025_26_vs_ready_pin",
            sco[0].upper_after_allowance == Decimal("2827")
            and sco[-1].rate_percent == Decimal("48"),
            "Scotland 2025–26 starter upper 2827; top rate 48% (matches Ready pin family)",
        )

        # Scotland 2017–22 filled from gov.scot / HMRC SIT (not E/W/NI, not gaps)
        hist_years = [
            "2017-18",
            "2018-19",
            "2019-20",
            "2020-21",
            "2021-22",
            "2022-23",
        ]
        gap_years = [
            y for y in years if scotland_coverage_for(y) == "gap_awaiting_clean_pin"
        ]
        hist_ok = all(
            scotland_coverage_for(y) == SCOTLAND_HISTORICAL_COVERAGE
            and y in SCOTLAND_BANDS_HISTORICAL
            for y in hist_years
        )
        add(
            "C7_scotland_2017_22_filled",
            hist_ok and gap_years == [],
            f"Scotland historical pinned={hist_ok}; remaining gaps={gap_years}",
        )

        # Spot-check after-allowance vs employers / SRR
        s1819 = {b.band_id: b for b in SCOTLAND_BANDS_HISTORICAL["2018-19"]}
        add(
            "C7b_scotland_2018_19_employers",
            s1819["starter"].upper_after_allowance == Decimal("2000")
            and s1819["intermediate"].upper_after_allowance == Decimal("31580")
            and s1819["higher"].rate_percent == Decimal("41"),
            "2018–19 starter 2000 / intermediate 31580 / higher 41% (employers + gov.scot)",
        )
        s2021 = {b.band_id: b for b in SCOTLAND_BANDS_HISTORICAL["2020-21"]}
        add(
            "C7c_scotland_2020_21_employers",
            s2021["starter"].upper_after_allowance == Decimal("2085")
            and s2021["intermediate"].upper_after_allowance == Decimal("30930"),
            "2020–21 starter 2085 / intermediate 30930 (employers + HMRC SIT)",
        )
        s2122 = {b.band_id: b for b in SCOTLAND_BANDS_HISTORICAL["2021-22"]}
        add(
            "C7d_scotland_2021_22_srr",
            s2122["starter"].upper_after_allowance == Decimal("2097")
            and s2122["basic"].upper_after_allowance == Decimal("12726")
            and s2122["intermediate"].upper_after_allowance == Decimal("31092"),
            "2021–22 SRR rate limits 2097 / 12726 / 31092",
        )
        # Must not equal E/W/NI for a divergent year
        ewni_1819 = {b.band_id: b for b in ewni["2018-19"]}
        add(
            "C7e_scotland_not_ewni_copy",
            "starter" in s1819
            and "starter" not in ewni_1819
            and s1819["higher"].rate_percent == Decimal("41")
            and ewni_1819["higher"].rate_percent == Decimal("40"),
            "2018–19 Scotland has starter + higher 41% vs E/W/NI higher 40%",
        )

        # NICs not blended into income-tax band file
        bands_csv = (self.data_root / "curated" / "income_tax_bands.csv").read_text(
            encoding="utf-8"
        )
        add(
            "C8_no_nics_blend_in_it_bands",
            "class1" not in bands_csv.lower()
            and "primary_threshold" not in bands_csv.lower(),
            "income_tax_bands.csv has no NICs threshold columns",
        )

        # Intra-year NICs not invented
        for y in ("2022-23", "2023-24"):
            nic = nics[y]
            add(
                f"C9_nics_split_{y}",
                nic.rate_status == "intra_year_change"
                and nic.rate_pt_to_uel_percent is None,
                f"{y} status={nic.rate_status}; main_rate_parsed={nic.rate_pt_to_uel_percent}",
            )

        add(
            "C10_fiscal_drag_deferred",
            FISCAL_DRAG_STATUS["status"] == "deferred",
            "fiscal drag deferred (no invented examples)",
        )

        # Spot-check 2010–11 additional rate 50%
        b1011 = {b.band_id: b for b in ewni["2010-11"]}
        add(
            "C11_2010_11_additional_50",
            b1011["additional"].rate_percent == Decimal("50"),
            f"2010–11 additional={b1011['additional'].rate_percent}",
        )

        overall = all(c["result"] == "pass" for c in checks)
        return {
            "indicator_id": INDICATOR_ID,
            "related_ready_indicator_id": RELATED_READY_ID,
            "retrieved_date": date.today().isoformat(),
            "year_span": f"{FIRST_YEAR}…{LAST_YEAR}",
            "overall": "pass" if overall else "fail",
            "checks": checks,
            "fiscal_drag": FISCAL_DRAG_STATUS,
            "sample_rules": {
                "tax_year": "2025-26",
                "ewni_personal_allowance": str(allowances["2025-26"]),
                "ewni_basic_upper": str(b2526["basic"].upper_after_allowance),
                "scotland_starter_upper": str(sco[0].upper_after_allowance),
                "nics_pt_weekly_2025_26": str(nics["2025-26"].pt_weekly),
            },
        }

    def write_package(
        self, evidence: Sequence[RawEvidence], observations: Sequence[Observation]
    ) -> dict[str, Path]:
        curated = self.data_root / "curated"
        curated.mkdir(parents=True, exist_ok=True)
        ewni, allowances, nics, coverage = self._build_tables(evidence)
        self._write_curated(curated, ewni, allowances, nics, coverage)
        obs_path = write_observations_csv(curated / "observations.csv", observations)
        qa = self._self_qa(evidence, ewni, allowances, nics)
        (curated / "self_qa.json").write_text(
            json.dumps(qa, indent=2) + "\n", encoding="utf-8"
        )

        manifest = self.build_manifest(evidence)
        man_path = save_manifest(self.data_root / "manifest.yaml", manifest)

        readme = self.data_root / "README.md"
        readme.write_text(
            "\n".join(
                [
                    "# Tax Time Machine — income-tax (+ NICs) history",
                    "",
                    f"**Indicator:** `{INDICATOR_ID}`  ",
                    f"**Package:** `data/economy/{PACKAGE_DIR}/`  ",
                    f"**Related Ready pin:** `{RELATED_READY_ID}`  ",
                    "**Status:** Validation-ready, **not** Ready. No UI.",
                    "",
                    SAFETY_COPY,
                    "",
                    "## Coverage",
                    "",
                    f"- E/W/NI income-tax bands + Personal Allowance: **{FIRST_YEAR}…{LAST_YEAR}** (HMRC Tables A.2 / A.1)",
                    "- Scotland: labelled alternate — mirrors E/W/NI **2010–11…2016–17**; "
                    "gov.scot / HMRC SIT **2017–18…2022–23**; GOV.UK **2023–24…2026–27**",
                    "- Employee Class 1 NICs: separate stage (HMRC Table A.4 weekly); "
                    "intra-year rate cells not collapsed",
                    "- Fiscal drag: **deferred** (`curated/fiscal_drag_status.json`)",
                    "",
                    "## Exclusions",
                    "",
                    *[f"- {item}" for item in EXCLUSIONS],
                    "",
                    "## Reproduce",
                    "",
                    "```bash",
                    "uv run python -m economy.connectors.tax_machine_income_tax_history",
                    "```",
                    "",
                    "## Curated artefacts",
                    "",
                    "- `curated/income_tax_bands.csv`",
                    "- `curated/allowances.csv`",
                    "- `curated/employee_class1_nics.csv`",
                    "- `curated/coverage_inventory.csv`",
                    "- `curated/fiscal_drag_status.json`",
                    "- `curated/observations.csv`",
                    "- `validation_report.md`",
                    "",
                    "## Related",
                    "",
                    f"- Ready statute pin: `{RELATED_READY_ID}` (`tax_machine_rules`)",
                    "- Handover: `docs/handover-economy-06-timemachine.md`",
                    "- Scotland fill: `docs/handover-economy-06-scotland-bands.md`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        check_rows = [
            f"| {c['id']} | {c['result']} | {c['notes']} |" for c in qa["checks"]  # type: ignore[index]
        ]
        sample = qa["sample_rules"]  # type: ignore[index]
        report = "\n".join(
            [
                f"# QA report — {INDICATOR_ID} — {qa['retrieved_date']}",
                "",
                "## Scope",
                f"- Package: `data/economy/{PACKAGE_DIR}/`",
                "- Connector: `economy.connectors.tax_machine_income_tax_history`",
                f"- Year span: {qa['year_span']}",
                f"- Related Ready: `{RELATED_READY_ID}`",
                f"- Overall (Economy self-QA): **{qa['overall']}**",
                f"- Fiscal drag: **{FISCAL_DRAG_STATUS['status']}**",
                "",
                "## Checks",
                "| ID | Result | Notes |",
                "|----|--------|-------|",
                *check_rows,
                "",
                "## Sample rules",
                (
                    f"- {sample['tax_year']}: PA £{sample['ewni_personal_allowance']}; "
                    f"E/W/NI basic upper £{sample['ewni_basic_upper']}; "
                    f"Scotland starter upper £{sample['scotland_starter_upper']}; "
                    f"NICs PT weekly £{sample['nics_pt_weekly_2025_26']}"
                ),
                "",
                "## Blockers for Ready",
                "- Independent Validation tasks `EC-VAL-06E` / `EC-VAL-06E-SCOT` "
                "under `data/qa/`.",
                "- No Time Machine React / EmptyStage replacement this Economy pass.",
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
    connector = TaxMachineIncomeTaxHistoryConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    observations = connector.transform(evidence)
    paths = connector.write_package(evidence, observations)
    qa = json.loads(
        (connector.data_root / "curated" / "self_qa.json").read_text(encoding="utf-8")
    )
    print(f"overall self-QA: {qa['overall']}")
    print(f"year span: {qa['year_span']}")
    print(f"observations: {len(observations)}")
    print(f"sample: {qa['sample_rules']}")
    for label, path in paths.items():
        print(f"{label}: {path}")


if __name__ == "__main__":
    main()

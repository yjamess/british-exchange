"""ONS Wealth and Assets Survey — household financial wealth (GB).

Approach (plain language):
1. Pin the ONS financial-wealth workbook (Round 8 edition, Apr 2020–Mar 2022).
2. Curate distribution-friendly cells: net-wealth percentiles, wealth-band
   shares, % of households with formal financial assets, and income-decile
   medians. Skip holder-only asset-type £ values that are easy to misread.
3. Label Round 8 cells as accreditation-suspended. Great Britain, not UK.
   DGD8 is not this measure. Housing owns property wealth — link only.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html, PEP 8).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "household-financial-wealth"
PIN_DATE = "2026-11-15"
OFFICIAL_RELEASE_DATE = "2025-01-24"
SOURCE_VERSION = (
    "ONS financial wealth tables, July 2006 to June 2016 and "
    "April 2014 to March 2022 edition, released 24 January 2025"
)

SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "financialwealthwealthingreatbritain"
)
SOURCE_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "financialwealthwealthingreatbritain/"
    "july2006tojune2016andapril2014tomarch2022/financialwealthtables.xlsx"
)
RAW_RELATIVE = f"raw/{PIN_DATE}/financialwealthtables.xlsx"

GB_CODE = "K03000001"
GB_LABEL = "Great Britain"

ROUND_BOUNDS: dict[str, tuple[str, str]] = {
    "July 2006 to June 2008": ("2006-07-01", "2008-06-30"),
    "July 2008 to June 2010": ("2008-07-01", "2010-06-30"),
    "July 2010 to June 2012": ("2010-07-01", "2012-06-30"),
    "July 2012 to June 2014": ("2012-07-01", "2014-06-30"),
    "July 2014 to June 2016": ("2014-07-01", "2016-06-30"),
    "April 2014 to March 2016": ("2014-04-01", "2016-03-31"),
    "April 2016 to March 2018": ("2016-04-01", "2018-03-31"),
    "April 2018 to March 2020": ("2018-04-01", "2020-03-31"),
    "April 2020 to March 2022": ("2020-04-01", "2022-03-31"),
}

ROUND8_START = "2020-04-01"

COVERAGE_ASSETS: dict[str, str] = {
    "Any formal financial asset including current accounts in credit (8)": (
        "any-formal-including-current-in-credit"
    ),
    "Savings accounts": "savings-accounts",
    "ISAs (1)": "isas",
}

BAND_SLUGS: dict[str, str] = {
    "Less than -£5,000": "less-than-minus-5000",
    "-£5,000 but < -£500": "minus-5000-to-minus-500",
    "-£500 but < £0": "minus-500-to-minus-0",
    "£0 but < £500": "0-to-500",
    "£500 but < £5,000": "500-to-5000",
    "£5,000 but < £12,500": "5000-to-12500",
    "£12,500 but < £25,000": "12500-to-25000",
    "£25,000 but < £50,000": "25000-to-50000",
    "£50,000 but < £100,000": "50000-to-100000",
    "£100,000 or more": "100000-or-more",
}

# Self-QA vs Round 8 (Apr 2020–Mar 2022) published cells.
SELF_QA: dict[str, float] = {
    "t510_median_all": 10400.0,
    "t510_p25_all": 300.0,
    "t510_p75_all": 58000.0,
    "t51_any_formal_pct": 98.0,
    "t511_100k_or_more_pct": 17.0,
    "t512_aggregate_net_bn": 1915.0,
    "t513_median_all": 10400.0,
}


def _norm(value: object) -> str:
    return " ".join(str(value or "").split())


def _number(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.startswith("["):
        return None
    try:
        return float(text.replace(",", "").replace("£", ""))
    except ValueError:
        return None


def _round_columns(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[tuple[int, str, str]]:
    found: list[tuple[int, str, str]] = []
    for col in range(1, sheet.max_column + 1):
        bounds = ROUND_BOUNDS.get(_norm(sheet.cell(3, col).value))
        if bounds is None:
            continue
        found.append((col, bounds[0], bounds[1]))
    if not found:
        raise ValueError(f"No survey-round headers on {sheet.title}")
    return found


def _notes(**parts: str) -> str:
    return "; ".join(f"{k}={v}" for k, v in parts.items())


def _accreditation(period_start: str) -> str:
    return "suspended" if period_start == ROUND8_START else "prior-round"


def _obs(
    *,
    start: str,
    end: str,
    value: float,
    unit: str,
    notes: str,
) -> Observation:
    return Observation(
        indicator_id=INDICATOR_ID,
        period_start=start,
        period_end=end,
        geography_code=GB_CODE,
        geography_label=GB_LABEL,
        value=value,
        unit=unit,
        observation_status="final",
        source_version=SOURCE_VERSION,
        notes=notes,
    )


def _emit_rounds(
    sheet: openpyxl.worksheet.worksheet.Worksheet,
    row: int,
    *,
    unit: str,
    extra: dict[str, str],
) -> list[Observation]:
    out: list[Observation] = []
    for col, start, end in _round_columns(sheet):
        value = _number(sheet.cell(row, col).value)
        if value is None:
            continue
        parts = {
            **extra,
            "accreditation": _accreditation(start),
            "geography": "gb",
        }
        out.append(_obs(start=start, end=end, value=value, unit=unit, notes=_notes(**parts)))
    return out


def parse_table_5_1(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[Observation]:
    """% of households holding selected formal financial assets (all households)."""
    out: list[Observation] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = _norm(sheet.cell(row, 1).value)
        if col_a.startswith("Percentage"):
            block = "percentage"
        elif col_a:
            block = None
        if block != "percentage":
            continue
        asset = COVERAGE_ASSETS.get(_norm(sheet.cell(row, 2).value))
        if asset is None:
            continue
        out.extend(
            _emit_rounds(
                sheet,
                row,
                unit="percent",
                extra={
                    "table": "5.1",
                    "series": "coverage",
                    "asset": asset,
                    "population": "all-households",
                    "measure": "share",
                    "definition": "formal-financial-asset-coverage",
                },
            )
        )
    if len(out) < 20:
        raise ValueError(f"Table 5.1 coverage rows missing, got {len(out)}")
    return out


def parse_table_5_10(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[Observation]:
    """Net financial wealth percentiles for all households and holders."""
    out: list[Observation] = []
    population: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = _norm(sheet.cell(row, 1).value)
        col_b = _norm(sheet.cell(row, 2).value)
        if "Households with financial assets or liabilities" in col_a:
            population = "with-assets-or-liabilities"
        elif "All households" in col_a:
            population = "all-households"
        if population is None or not col_b:
            continue
        if col_b.startswith("Percentage"):
            series, unit = "coverage", "percent"
        elif col_b.startswith("25th"):
            series, unit = "p25", "gbp"
        elif "Median" in col_b or "50th" in col_b:
            series, unit = "median", "gbp"
        elif col_b.startswith("75th"):
            series, unit = "p75", "gbp"
        else:
            continue
        out.extend(
            _emit_rounds(
                sheet,
                row,
                unit=unit,
                extra={
                    "table": "5.10",
                    "series": series,
                    "population": population,
                    "measure": "net-financial-wealth",
                    "definition": "net-financial-wealth",
                },
            )
        )
    if len(out) < 50:
        raise ValueError(f"Table 5.10 expected percentiles, got {len(out)}")
    return out


def parse_table_5_11(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[Observation]:
    """Share of households in published net financial wealth bands."""
    out: list[Observation] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = _norm(sheet.cell(row, 1).value)
        if col_a.startswith("Percentage"):
            block = "percentage"
        elif col_a:
            block = None
        if block != "percentage":
            continue
        band_label = _norm(sheet.cell(row, 2).value)
        if band_label in {"", "All households"}:
            continue
        band = BAND_SLUGS.get(band_label)
        if band is None:
            raise ValueError(f"Unknown wealth band {band_label!r}")
        out.extend(
            _emit_rounds(
                sheet,
                row,
                unit="percent",
                extra={
                    "table": "5.11",
                    "series": "band-share",
                    "band": band,
                    "population": "all-households",
                    "measure": "share",
                    "definition": "net-financial-wealth-band",
                },
            )
        )
    if len(out) < 80:
        raise ValueError(f"Table 5.11 band shares missing, got {len(out)}")
    return out


def parse_table_5_12(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[Observation]:
    """Aggregate £ billion stocks (companion to the distribution, not the Buffer)."""
    mapping = {
        "Aggregate household gross financial wealth": "aggregate-gross",
        "Aggregate household financial liabilities": "aggregate-liabilities",
        "Aggregate household net financial wealth": "aggregate-net",
    }
    out: list[Observation] = []
    block: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = _norm(sheet.cell(row, 1).value)
        if col_a.startswith("Billion"):
            block = "billion"
        elif col_a:
            block = None
        if block != "billion":
            continue
        series = mapping.get(_norm(sheet.cell(row, 2).value))
        if series is None:
            continue
        out.extend(
            _emit_rounds(
                sheet,
                row,
                unit="gbp-billions",
                extra={
                    "table": "5.12",
                    "series": series,
                    "population": "all-households",
                    "measure": "stock",
                    "definition": "aggregate-financial-wealth",
                },
            )
        )
    if len(out) < 20:
        raise ValueError(f"Table 5.12 aggregates missing, got {len(out)}")
    return out


def _income_band(label: str) -> str | None:
    if label == "All households":
        return "all"
    if not label.startswith("Net equivalised income decile"):
        return None
    if "lowest" in label:
        return "income-decile-1"
    if "highest" in label:
        return "income-decile-10"
    token = label.replace("Net equivalised income decile", "").strip()
    try:
        n = int(token.split()[0])
    except (ValueError, IndexError):
        return None
    return f"income-decile-{n}"


def parse_table_5_13(sheet: openpyxl.worksheet.worksheet.Worksheet) -> list[Observation]:
    """Net financial wealth percentiles by equivalised income decile."""
    out: list[Observation] = []
    series: str | None = None
    for row in range(4, sheet.max_row + 1):
        col_a = _norm(sheet.cell(row, 1).value)
        if "25th percentile" in col_a:
            series = "p25"
        elif "50th percentile" in col_a or "median" in col_a.lower():
            series = "median"
        elif "75th percentile" in col_a:
            series = "p75"
        elif col_a:
            series = None
        if series is None:
            continue
        band = _income_band(_norm(sheet.cell(row, 2).value))
        if band is None:
            continue
        out.extend(
            _emit_rounds(
                sheet,
                row,
                unit="gbp",
                extra={
                    "table": "5.13",
                    "series": series,
                    "band": band,
                    "population": "all-households",
                    "measure": "net-financial-wealth",
                    "definition": "net-financial-wealth-by-income-decile",
                },
            )
        )
    if len(out) < 150:
        raise ValueError(f"Table 5.13 income-decile rows missing, got {len(out)}")
    return out


def parse_financial_wealth(path: Path) -> list[Observation]:
    book = openpyxl.load_workbook(path, data_only=True)
    try:
        observations = (
            parse_table_5_1(book["Table 5.1"])
            + parse_table_5_10(book["Table 5.10"])
            + parse_table_5_11(book["Table 5.11"])
            + parse_table_5_12(book["Table 5.12"])
            + parse_table_5_13(book["Table 5.13"])
        )
    finally:
        book.close()
    observations.sort(key=lambda obs: (obs.period_start, obs.notes))
    if len(observations) < 300:
        raise ValueError(f"Expected WAS financial-wealth cells, got {len(observations)}")
    return observations


def _find(observations: list[Observation], **needles: str) -> Observation:
    for obs in observations:
        if all(f"{k}={v}" in obs.notes for k, v in needles.items()):
            if obs.period_start == ROUND8_START:
                return obs
    raise LookupError(f"Missing Round 8 observation {needles}")


def run_self_qa(observations: list[Observation]) -> None:
    checks = (
        ("t510_median_all", _find(observations, table="5.10", series="median", population="all-households")),
        ("t510_p25_all", _find(observations, table="5.10", series="p25", population="all-households")),
        ("t510_p75_all", _find(observations, table="5.10", series="p75", population="all-households")),
        (
            "t51_any_formal_pct",
            _find(
                observations,
                table="5.1",
                asset="any-formal-including-current-in-credit",
            ),
        ),
        ("t511_100k_or_more_pct", _find(observations, table="5.11", band="100000-or-more")),
        ("t512_aggregate_net_bn", _find(observations, table="5.12", series="aggregate-net")),
        ("t513_median_all", _find(observations, table="5.13", series="median", band="all")),
    )
    failed: list[str] = []
    for key, obs in checks:
        expected = SELF_QA[key]
        if obs.value != expected:
            failed.append(f"{key}: curated {obs.value} != published {expected}")
    if failed:
        raise RuntimeError("Self-QA failed: " + "; ".join(failed))


class HouseholdFinancialWealthConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Household financial wealth",
            sector="economy-public-finance",
            publisher="Office for National Statistics",
            source_url=SOURCE_LANDING,
            series_id="WAS Tables 5.1, 5.10, 5.11, 5.12, 5.13",
            geography="Great Britain (K03000001) — not United Kingdom",
            frequency="ad_hoc",
            unit="£, percent of households, or £ billion",
            definition=(
                "ONS Wealth and Assets Survey financial wealth for Great Britain. "
                "Net financial wealth is formal and informal financial assets "
                "minus financial liabilities (not property, not pensions). "
                "Curates Table 5.10 percentiles (all households and households "
                "with assets or liabilities), Table 5.11 band shares, Table 5.1 "
                "coverage of formal financial assets, Table 5.12 aggregate £ "
                "billion stocks, and Table 5.13 percentiles by equivalised "
                "income decile. Distribution of household financial buffers — "
                "not the national-accounts saving ratio (DGD8)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.household_financial_wealth",
            curated_path="curated/observations.csv",
            update_cadence="When ONS publishes a new WAS financial-wealth table",
            raw_evidence=list(evidence),
            transformations=(
                "Download the Apr 2020–Mar 2022 edition workbook. Parse published "
                "cells only. Survey-round headers map to round start/end dates. "
                "Skip [x]/[u] cells and within-band percentiles on Table 5.11."
            ),
            caveats=(
                "WAS accreditation was suspended from Round 8 (April 2020 to "
                "March 2022; ONS notice 13 June 2025). Great Britain, not UK. "
                "Nominal £, not CPIH-deflated bulletin figures. Round 8 weights "
                "were recalibrated for tenure during COVID telephone fieldwork. "
                "DGD8 household-saving-ratio is a national-accounts residual, "
                "not this survey buffer. Do not fork Housing "
                "household-net-property-wealth. July 2006–June 2016 and April "
                "2014–March 2022 round systems overlap — do not splice as one "
                "continuous series without labelling the break."
            ),
            revision_notes=(
                "Domain 04 Buffer ingest 2026-11-15. Edition released 24 January 2025."
            ),
            related_indicator_ids=[
                "household-net-property-wealth",
                "household-saving-ratio",
                "real-household-disposable-income",
                "consumer-credit-outstanding",
            ],
            open_questions=[
                "Pin Table 5.7 survey non-mortgage borrowing as a labelled "
                "companion, or keep Weight of Debt on BoE lender stocks only?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/41965471768581cd858ccf56a04a719e"
            ),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_financial_wealth(self.data_root / evidence[0].path)

    def run(self) -> tuple[Path, Path]:
        target = self.data_root / RAW_RELATIVE
        if target.is_file() and target.stat().st_size > 10_000:
            evidence = RawEvidence(
                path=RAW_RELATIVE,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(target),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
                official_release_date=OFFICIAL_RELEASE_DATE,
                http_status=200,
                source_url=SOURCE_FILE_URL,
            )
        else:
            evidence = download_ons_file(
                SOURCE_FILE_URL,
                target,
                relative_path=RAW_RELATIVE,
                official_release_date=OFFICIAL_RELEASE_DATE,
            )
        observations = self.transform([evidence])
        run_self_qa(observations)
        return self.write_hand_off([evidence], observations)


def main() -> None:
    connector = HouseholdFinancialWealthConnector()
    manifest_path, curated_path = connector.run()
    observations = parse_financial_wealth(
        connector.data_root / RAW_RELATIVE
    )
    median = _find(observations, table="5.10", series="median", population="all-households")
    print(f"indicator_id: {connector.indicator_id}")
    print(f"observations: {len(observations)}")
    print(f"Round 8 median net financial wealth, all households: £{median.value:,.0f}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

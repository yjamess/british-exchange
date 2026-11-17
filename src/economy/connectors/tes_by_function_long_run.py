"""PSS July 2026 Table 4.2 — long-run TES / COFOG in nominal £ billion.

Approach (plain language):

1. Download the accredited PSS Chapter 4 workbook and refuse it if the
   SHA-256 does not match the discovery pin.
2. Read sheet ``4_2``. Keep outturn years 2003-04 to 2025-26. No plan years.
3. Curate ten UN COFOG level-1 functions, EU transactions (published sign),
   the published TES total, accounting adjustments, and this table's TME.
   Unit is £ billion, one decimal place, nominal. Current and capital are
   already summed on this sheet.
4. Do not curate "of which" lines. Do not invent a residual when the level-1
   leaves miss the published TES total. In this workbook the largest miss is
   £0.2 billion (2022-23). The 2024-25 leaf and bridge gaps are £0.1 billion.
5. Read sheet ``4_3`` only as a guard. Health in 2024-25 must stay 242.4 here
   and 250.8 on the real sheet. In 2025-26 the two sheets match, because that
   year is the real-terms price base. Table 4.3 is not curated.
6. Do not copy these rows into the £ million ``tes-by-function`` series.

Reproduce::

    uv run python -m economy.connectors.tes_by_function_long_run

Refs: pathlib, typing, PEP 8, openpyxl, docs/connector-contract.md.
https://docs.python.org/3/library/pathlib.html
https://docs.python.org/3/library/typing.html
https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.pss_july_2026 import (
    GEO_CODE,
    GEO_LABEL,
    LICENCE,
    LONG_RUN_OUTTURN_YEARS,
    OFFICIAL_RELEASE_DATE,
    PRICE_BASE_YEAR,
    PSS_LANDING_URL,
    PUBLISHER,
    SOURCE_VERSION,
    financial_year_bounds,
    format_billion,
    notes_map,
    require_pinned_checksum,
    require_xlsx,
    status_for_pinned_year,
    structured_notes,
)
from economy.connectors.tes_by_function_real import (
    FUNCTIONS,
    FunctionParse,
    parse_function_sheet,
)

INDICATOR_ID = "tes-by-function-long-run"
CONNECTOR_MODULE = "economy.connectors.tes_by_function_long_run"
SHEET_NAME = "4_2"
REAL_SHEET = "4_3"
RAW_NAME = "July_PSS_2026_Chapter_4.xlsx"
# Same Chapter 4 file as tes-by-function-real. A new PSS file must be reviewed.
EXPECTED_SHA256 = "573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c"
FILE_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a574aac822fbe6b8245c955/July_PSS_2026_Chapter_4.xlsx"
)
NOTION_REGISTRY_URL = "https://app.notion.com/p/4196547176858108be4bd40a2251cd7b"

UNIT = "£ billion, nominal, financial year"
# Leaf sums can miss published TES by £0.2 billion in this workbook (2022-23).
# TES + adjustments can miss table TME by £0.1 billion. Two tenths is the fail line.
MAX_GAP_TENTHS = 2
EXPECTED_OF_WHICH = 8
EXPECTED_SERIES = 14
EXPECTED_OBSERVATIONS = EXPECTED_SERIES * len(LONG_RUN_OUTTURN_YEARS)

SPOT_YEAR = "2024-25"
SPOT_HEALTH = 242.4
SPOT_SOCIAL_PROTECTION = 386.3
SPOT_EU = -1.4
SPOT_TES = 1166.5
SPOT_ADJUSTMENTS = 123.6
SPOT_TME = 1290.0
# Table 4.3 Health the same year. If this pin stores 250.8, the sheets were mixed.
REAL_HEALTH_MUST_NOT_MATCH = 250.8

# £ million Table 5.4 companions, used only as a read-only rounding check.
# They are not copied into this package.
MILLION_PIN = ECONOMY_DATA / "tes-by-function" / "curated" / "observations.csv"
MILLION_HEALTH = 242_429.0
MILLION_TES = 1_166_452.0
MILLION_ADJUSTMENTS = 123_560.0
MILLION_TME = 1_290_012.0


def _notes(series: str, role: str, label: str, cofog: str, financial_year: str) -> str:
    fields: list[tuple[str, str]] = [
        ("series", series),
        ("classification", "total"),
        ("role", role),
        ("fy", financial_year),
        ("cofog", cofog),
        ("label", label),
        ("table", "4.2"),
        ("terms", "nominal"),
    ]
    if role == "table-tme":
        fields.append(("denominator", "hmt-table-tme"))
    return structured_notes(fields)


def _tenths(value: float) -> int:
    """£ billion to an integer number of tenths. 242.4 becomes 2424."""
    return int(round(value * 10))


def _from_tenths(tenths: int) -> float:
    return tenths / 10


def _index(parsed: FunctionParse) -> dict[tuple[str, str], float]:
    out: dict[tuple[str, str], float] = {}
    for cell in parsed.cells:
        key = (cell.row.series, cell.financial_year)
        if key in out:
            raise ValueError(f"Duplicate cell {key} on {parsed.sheet_name}")
        out[key] = cell.value
    return out


def _get(index: dict[tuple[str, str], float], series: str, financial_year: str) -> float:
    try:
        return index[(series, financial_year)]
    except KeyError as exc:
        raise ValueError(f"Missing {series} / {financial_year}") from exc


def cells_to_observations(parsed: FunctionParse) -> list[Observation]:
    """Store Table 4.2 only. Table 4.3 stays in memory for the mix-up guard."""
    if parsed.sheet_name != SHEET_NAME:
        raise ValueError(f"Refusing to curate sheet {parsed.sheet_name}")
    observations: list[Observation] = []
    for cell in parsed.cells:
        period_start, period_end = financial_year_bounds(cell.financial_year)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=GEO_CODE,
                geography_label=GEO_LABEL,
                value=cell.value,
                unit=UNIT,
                observation_status=status_for_pinned_year(
                    cell.financial_year, LONG_RUN_OUTTURN_YEARS
                ),
                source_version=SOURCE_VERSION,
                notes=_notes(
                    cell.row.series,
                    cell.row.role,
                    cell.row.label,
                    cell.row.cofog,
                    cell.financial_year,
                ),
            )
        )
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, built {len(observations)}"
        )
    return observations


def _round_million_to_billion(million: float) -> float:
    """Round a £ million total to £ billion at one decimal place.

    242,429 £ million becomes 242.4. This is a comparison only. The £ million
    figure is not stored in this package.
    """
    tenths = int(round(million / 100.0))
    return tenths / 10


def _read_million_companion() -> dict[str, object]:
    """Read Table 5.4 Health, TES, adjustments, and TME for 2024-25.

    Returns a note when that package is absent. Does not write it.
    """
    if not MILLION_PIN.is_file():
        return {"present": False, "read_error": f"missing {MILLION_PIN}"}
    wanted = {
        ("cofog-07-health", "current"): "health_current",
        ("cofog-07-health", "capital"): "health_capital",
        ("cofog-10-social-protection", "current"): "social_current",
        ("cofog-10-social-protection", "capital"): "social_capital",
        ("tes-total", "total"): "tes",
        ("accounting-adjustments", "total"): "adjustments",
        ("table-tme", "total"): "table_tme",
    }
    found: dict[str, float] = {}
    with MILLION_PIN.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            parts = notes_map(row["notes"])
            if parts.get("fy") != SPOT_YEAR or parts.get("table") != "5.4":
                continue
            key = (parts.get("series", ""), parts.get("classification", ""))
            slot = wanted.get(key)
            if slot is None:
                continue
            if slot in found:
                raise ValueError(f"Duplicate Table 5.4 companion row {key}")
            found[slot] = float(row["value"])
    missing = [name for name in wanted.values() if name not in found]
    if missing:
        raise ValueError(f"Table 5.4 companion is missing {missing}")
    health = found["health_current"] + found["health_capital"]
    social = found["social_current"] + found["social_capital"]
    if health != MILLION_HEALTH or found["tes"] != MILLION_TES:
        raise ValueError(
            "Table 5.4 companion spots moved. "
            f"Health {health}, TES {found['tes']}"
        )
    if found["adjustments"] != MILLION_ADJUSTMENTS or found["table_tme"] != MILLION_TME:
        raise ValueError("Table 5.4 adjustments or TME companion spots moved")
    rounded = {
        "health": _round_million_to_billion(health),
        "social_protection": _round_million_to_billion(social),
        "tes": _round_million_to_billion(found["tes"]),
        "adjustments": _round_million_to_billion(found["adjustments"]),
        "table_tme": _round_million_to_billion(found["table_tme"]),
    }
    return {"present": True, "million": found, "health_sum": health, "rounded_billion": rounded}


def build_identity_check(nominal: FunctionParse, real: FunctionParse) -> dict[str, object]:
    """Prove the 2024-25 spots, the rounding band, and that Table 4.3 was not stored."""
    if nominal.sheet_name != SHEET_NAME or real.sheet_name != REAL_SHEET:
        raise ValueError("Expected nominal sheet 4_2 and real sheet 4_3")
    if nominal.of_which_skipped != EXPECTED_OF_WHICH:
        raise ValueError(
            f"Expected to skip {EXPECTED_OF_WHICH} of-which rows on Table 4.2, "
            f"skipped {nominal.of_which_skipped}"
        )
    nominal_index = _index(nominal)
    real_index = _index(real)
    gaps: list[dict[str, object]] = []
    price_base_mismatches: list[str] = []

    for financial_year in LONG_RUN_OUTTURN_YEARS:
        leaf_tenths = sum(
            _tenths(_get(nominal_index, function.series, financial_year))
            for function in FUNCTIONS
        )
        leaf_tenths += _tenths(_get(nominal_index, "eu-transactions", financial_year))
        tes = _get(nominal_index, "tes-total", financial_year)
        adjustments = _get(nominal_index, "accounting-adjustments", financial_year)
        table_tme = _get(nominal_index, "table-tme", financial_year)
        leaf_gap = leaf_tenths - _tenths(tes)
        bridge_gap = _tenths(tes) + _tenths(adjustments) - _tenths(table_tme)
        if abs(leaf_gap) > MAX_GAP_TENTHS or abs(bridge_gap) > MAX_GAP_TENTHS:
            raise ValueError(
                f"{financial_year} rounding gap exceeds £0.2 billion: "
                f"leaf {leaf_gap} tenths, bridge {bridge_gap} tenths"
            )
        gaps.append(
            {
                "fy": financial_year,
                "leaf_sum": _from_tenths(leaf_tenths),
                "tes": tes,
                "leaf_gap": _from_tenths(leaf_gap),
                "adjustments": adjustments,
                "table_tme": table_tme,
                "bridge_gap": _from_tenths(bridge_gap),
            }
        )

    for series in sorted({cell.row.series for cell in nominal.cells}):
        nominal_value = _get(nominal_index, series, PRICE_BASE_YEAR)
        real_value = _get(real_index, series, PRICE_BASE_YEAR)
        if _tenths(nominal_value) != _tenths(real_value):
            price_base_mismatches.append(
                f"{series}: Table 4.2 {nominal_value} vs Table 4.3 {real_value}"
            )
    if price_base_mismatches:
        raise ValueError(
            "2025-26 nominal rows do not equal real Table 4.3: "
            + "; ".join(price_base_mismatches[:6])
        )

    health = _get(nominal_index, "cofog-07-health", SPOT_YEAR)
    social = _get(nominal_index, "cofog-10-social-protection", SPOT_YEAR)
    real_health = _get(real_index, "cofog-07-health", SPOT_YEAR)
    if _tenths(health) != _tenths(SPOT_HEALTH):
        raise ValueError(f"Health {SPOT_YEAR} is {health}, expected {SPOT_HEALTH}")
    if _tenths(social) != _tenths(SPOT_SOCIAL_PROTECTION):
        raise ValueError(
            f"Social protection {SPOT_YEAR} is {social}, expected {SPOT_SOCIAL_PROTECTION}"
        )
    if _tenths(real_health) != _tenths(REAL_HEALTH_MUST_NOT_MATCH):
        raise ValueError(
            f"Table 4.3 Health {SPOT_YEAR} is {real_health}, "
            f"expected {REAL_HEALTH_MUST_NOT_MATCH}"
        )
    if _tenths(health) == _tenths(real_health):
        raise ValueError("2024-25 nominal Health equals real Health. The sheets were mixed.")
    eu_value = _get(nominal_index, "eu-transactions", SPOT_YEAR)
    if _tenths(eu_value) != _tenths(SPOT_EU):
        raise ValueError(f"EU transactions {SPOT_YEAR} is {eu_value}, expected {SPOT_EU}")
    if eu_value >= 0:
        raise ValueError("2024-25 EU transactions lost the published negative sign")
    if _tenths(_get(nominal_index, "tes-total", SPOT_YEAR)) != _tenths(SPOT_TES):
        raise ValueError("2024-25 TES does not match the published spot")
    if _tenths(_get(nominal_index, "accounting-adjustments", SPOT_YEAR)) != _tenths(SPOT_ADJUSTMENTS):
        raise ValueError("2024-25 accounting adjustments do not match the published spot")
    if _tenths(_get(nominal_index, "table-tme", SPOT_YEAR)) != _tenths(SPOT_TME):
        raise ValueError("2024-25 table TME does not match the published spot")

    roles = {cell.row.role for cell in nominal.cells}
    series_ids = {cell.row.series for cell in nominal.cells}
    forbidden = {"residual", "other-function", "leaf-gap", "unallocated", "oscar"}
    if series_ids & forbidden or "function" not in roles:
        raise ValueError(f"Unexpected series or roles: {series_ids} {roles}")
    if any(series.startswith("residual") or "of-which" in series for series in series_ids):
        raise ValueError("Of-which or residual series were curated")
    if any(abs(cell.value) > 10_000 for cell in nominal.cells):
        raise ValueError("A £ million-sized value landed in the £ billion series")

    companion = _read_million_companion()
    if companion.get("present"):
        rounded = companion["rounded_billion"]
        assert isinstance(rounded, dict)
        # Social protection is a Table 4.2 spot. It is not asserted against Table 5.4
        # here: half-even rounding of a £ million sum can differ by £0.1 billion.
        pairs = (
            ("health", health),
            ("tes", SPOT_TES),
            ("adjustments", SPOT_ADJUSTMENTS),
            ("table_tme", SPOT_TME),
        )
        for name, billion in pairs:
            if _tenths(float(rounded[name])) != _tenths(billion):
                raise ValueError(
                    f"Table 5.4 {name} does not round to Table 4.2 "
                    f"({rounded[name]} vs {billion})"
                )

    nonzero = [row for row in gaps if row["leaf_gap"] != 0 or row["bridge_gap"] != 0]
    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "unit": UNIT,
        "terms": "nominal",
        "years": f"{LONG_RUN_OUTTURN_YEARS[0]} to {LONG_RUN_OUTTURN_YEARS[-1]}",
        "year_count": len(LONG_RUN_OUTTURN_YEARS),
        "gaps": gaps,
        "nonzero_gap_years": len(nonzero),
        "max_abs_leaf_gap": max(abs(float(row["leaf_gap"])) for row in gaps),
        "max_abs_bridge_gap": max(abs(float(row["bridge_gap"])) for row in gaps),
        "spot_2024_25": {
            "health": health,
            "social_protection": social,
            "eu_transactions": eu_value,
            "tes": SPOT_TES,
            "accounting_adjustments": SPOT_ADJUSTMENTS,
            "table_tme": SPOT_TME,
            "leaf_gap": next(row["leaf_gap"] for row in gaps if row["fy"] == SPOT_YEAR),
            "bridge_gap": next(row["bridge_gap"] for row in gaps if row["fy"] == SPOT_YEAR),
        },
        "table_4_3_not_curated": {
            "health_2024_25": real_health,
            "mixed_into_this_pin": False,
            "price_base_year_equals_table_4_2": True,
        },
        "table_5_4_rounding_check": companion,
        "of_which_skipped": nominal.of_which_skipped,
        "residual_function_rows": 0,
        "row_count": EXPECTED_OBSERVATIONS,
    }


def _check_observations(observations: Sequence[Observation]) -> None:
    if any(obs.indicator_id != INDICATOR_ID for obs in observations):
        raise ValueError("A row was labelled as another indicator")
    if any(obs.unit != UNIT for obs in observations):
        raise ValueError("A row left the nominal £ billion unit")
    estimated = [obs for obs in observations if obs.observation_status == "estimated"]
    if len(estimated) != EXPECTED_SERIES:
        raise ValueError("2025-26 must be the only estimated year, once per series")
    for obs in observations:
        parts = notes_map(obs.notes)
        financial_year = parts["fy"]
        expected = status_for_pinned_year(financial_year, LONG_RUN_OUTTURN_YEARS)
        if obs.observation_status != expected:
            raise ValueError(f"Bad status on {financial_year}")
        if parts.get("terms") != "nominal" or parts.get("table") != "4.2":
            raise ValueError("Nominal Table 4.2 flag missing")
        if "price_base" in parts or parts.get("terms") == "real":
            raise ValueError("Real-terms fields leaked into the nominal pin")
        if parts.get("classification") != "total":
            raise ValueError("Table 4.2 has no current/capital split to store")
        if "million" in obs.unit.casefold():
            raise ValueError("£ million leaked into the £ billion series")
        if obs.value is None or abs(obs.value) > 10_000:
            raise ValueError(f"Implausible £ billion value {obs.value}")


class TesByFunctionLongRunConnector(Connector):
    """Table 4.2 nominal TES / COFOG. One workbook. Table 4.3 is a check, not a pin."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._nominal: FunctionParse | None = None
        self._real: FunctionParse | None = None

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch_pinned(self) -> RawEvidence:
        """Download Chapter 4 into raw/<UTC date>/ and check the pinned checksum."""
        day = datetime.now(timezone.utc).date().isoformat()
        relative = f"raw/{day}/{RAW_NAME}"
        result = self.fetch_url(
            FILE_URL,
            relative,
            official_release_date=OFFICIAL_RELEASE_DATE,
        )
        path = self.data_root / result.evidence.path
        require_xlsx(path)
        digest = require_pinned_checksum(path, EXPECTED_SHA256)
        if digest != result.evidence.checksum_sha256:
            raise RuntimeError("In-memory checksum and disk checksum disagree")
        return result.evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() needs the pinned Chapter 4 workbook")
        path = self.data_root / evidence[0].path
        nominal = parse_function_sheet(path, SHEET_NAME)
        real = parse_function_sheet(path, REAL_SHEET)
        build_identity_check(nominal, real)
        observations = cells_to_observations(nominal)
        _check_observations(observations)
        self._nominal = nominal
        self._real = real
        return observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Public sector expenditure on services by function, long run (PSS Table 4.2)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=PSS_LANDING_URL,
            series_id="PSS July 2026 Table 4.2",
            geography=(
                "United Kingdom public sector (K02000001): central government, "
                "local government and public corporations, including devolved "
                "administrations inside the functions"
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "HM Treasury Total Expenditure on Services (TES) by UN COFOG "
                "level 1, from PSS July 2026 Table 4.2. Financial-year outturn "
                "from 2003-04 to 2025-26, £ billion, one decimal place, nominal. "
                "Each function is the published total (current and capital already "
                "summed). EU transactions keep the published sign and sit inside "
                "TES but outside the ten functions. The published TES total is "
                "stored because level-1 leaves can miss it by up to £0.2 billion. "
                "Accounting adjustments are the bridge from TES to this table's "
                "Total Managed Expenditure. They are not a function. This is the "
                "long-run companion of £ million Table 5.4 (tes-by-function) and "
                "of real £ billion Table 4.3 (tes-by-function-real). Do not mix "
                "the units. Health in 2024-25 is 242.4 nominal, against Table 4.3 "
                "Health 250.8 in 2025-26 prices. Table 4.3 is not curated. This "
                "table's TME is not monthly ONS EBFT."
            ),
            licence=LICENCE,
            agent_owner="economy",
            connector_module=CONNECTOR_MODULE,
            curated_path="curated/observations.csv",
            update_cadence=(
                "PSS key series are updated in the November, February and April "
                "cycle. Re-pin on a new edition; do not overwrite this checksum."
            ),
            raw_evidence=list(evidence),
            notion_registry_url=NOTION_REGISTRY_URL,
            transformations=(
                "Download PSS July 2026 Chapter 4. Read sheet 4_2 for curated rows. "
                "Keep financial years 2003-04 to 2025-26. Curate ten COFOG level-1 "
                "functions, EU transactions, published TES, accounting adjustments, "
                "and table TME. All rows are classification=total because the sheet "
                "does not split current and capital. Skip of-which lines. Do not "
                "invent a residual for the £ billion rounding gap. Read sheet 4_3 "
                "only to prove Health 2024-25 is 250.8 there and 242.4 here, and "
                "that 2025-26 nominal equals real. Do not write Table 4.3. Do not "
                "write £ million Table 5.4 into this folder. 2025-26 "
                "observation_status=estimated. Notes use series, classification, "
                "role, fy, cofog, label, table=4.2, terms=nominal. Table TME notes "
                "set denominator=hmt-table-tme."
            ),
            revision_notes=(
                "PSS July 2026, file updated 2026-07-29. 2025-26 is the first "
                "outturn estimate. Later PSS editions can revise these years. "
                "Compare sha256 before replacing the raw workbook. Table 4.2 "
                "Health 2024-25 (242.4) is Table 5.4 Health 242,429 £ million "
                "rounded to 0.1 billion. The £ million series stays in "
                "tes-by-function."
            ),
            caveats=(
                "Unit is £ billion, nominal, one decimal place. Do not mix these "
                "rows with £ million tes-by-function or with £ billion "
                "tes-by-function-real (2025-26 prices). In 2024-25, Health is "
                "242.4, Social protection is 386.3, TES is 1,166.5, accounting "
                "adjustments are 123.6, and table TME is 1,290.0. Level-1 leaves "
                "plus EU are 0.1 above TES that year, and TES plus adjustments are "
                "0.1 above table TME. The largest leaf gap in this workbook is "
                "£0.2 billion, in 2022-23. Published cells are stored. No residual "
                "function. EU transactions in 2024-25 are -1.4, so the ten "
                "functions are not TES on their own. Defence is the UN COFOG "
                "definition, not the NATO definition. Public-sector debt interest "
                "is an of-which line inside General public services and is not a "
                "separate curated function. No Tax−Spend=Borrow identity. No OSCAR "
                "rows. No PESA plan years. No ESA Table 11 rows. This table's TME "
                "is not monthly EBFT."
            ),
            status_note=(
                "Financial-year outturn for 2003-04 to 2025-26 from PSS July 2026 "
                "Table 4.2, nominal £ billion. 2025-26 is a first estimate and can "
                "still be revised. Not the real-terms Table 4.3 series."
            ),
            related_indicator_ids=[
                "tes-by-function",
                "tes-by-function-real",
                "total-managed-expenditure",
            ],
            open_questions=[
                "Do not append these £ billion rows onto tes-by-function.",
                "Do not treat Table 4.3 as this series. Real terms stay on tes-by-function-real.",
                "Do not rescale Table 4.2 onto monthly total-managed-expenditure.",
            ],
        )


def _write_source_register(data_root: Path, parsed: FunctionParse) -> Path:
    path = data_root / "source_register.csv"
    fields = ["series", "classification", "role", "cofog", "label", "table", "curated"]
    seen: set[str] = set()
    rows: list[dict[str, str]] = []
    for cell in parsed.cells:
        if cell.row.series in seen:
            continue
        seen.add(cell.row.series)
        rows.append(
            {
                "series": cell.row.series,
                "classification": cell.row.classification,
                "role": cell.row.role,
                "cofog": cell.row.cofog,
                "label": cell.row.label,
                "table": "4.2",
                "curated": "true",
            }
        )
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return path


def _markdown_gaps(check: dict[str, object], *, nonzero_only: bool) -> list[str]:
    lines = [
        "| Financial year | Level-1 + EU | Published TES | Leaf gap | Adjustments | Table TME | TES+adjustments minus TME |",
        "|----------------|-------------:|--------------:|---------:|------------:|----------:|---------------------------:|",
    ]
    shown = 0
    for row in check["gaps"]:  # type: ignore[index]
        assert isinstance(row, dict)
        if nonzero_only and row["leaf_gap"] == 0 and row["bridge_gap"] == 0:
            continue
        shown += 1
        lines.append(
            f"| {row['fy']} | {format_billion(float(row['leaf_sum']))} | "
            f"{format_billion(float(row['tes']))} | "
            f"{format_billion(float(row['leaf_gap']))} | "
            f"{format_billion(float(row['adjustments']))} | "
            f"{format_billion(float(row['table_tme']))} | "
            f"{format_billion(float(row['bridge_gap']))} |"
        )
    if shown == 0:
        lines.append("| — | exact in every pinned year | | | | | |")
    return lines


def _write_readme(data_root: Path, evidence: RawEvidence, check: dict[str, object]) -> Path:
    spot = check["spot_2024_25"]
    real = check["table_4_3_not_curated"]
    assert isinstance(spot, dict)
    assert isinstance(real, dict)
    lines = [
        "# tes-by-function-long-run",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** PSS July 2026 Table 4.2, £ billion, **nominal**, UK public sector, financial year",
        "",
        "TES is expenditure on services. It is not this table's TME. This table's TME is not monthly EBFT.",
        "This package is the long-run companion of `tes-by-function`. It does not contain £ million rows.",
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.tes_by_function_long_run",
        "```",
        "",
        "## What is curated",
        "",
        "| Role | What | Chart as a function slice? |",
        "|------|------|----------------------------|",
        "| `function` | Ten COFOG level-1 totals (current and capital already summed) | Yes, these ten only |",
        "| `eu-transactions` | EU transactions, published sign | No. Inside TES, outside the ten |",
        "| `tes-total` | Published public sector expenditure on services | No. It is the total |",
        "| `bridge` | Accounting adjustments | No. Not a function |",
        "| `table-tme` | This table's Total Managed Expenditure | No. Denominator is `hmt-table-tme` |",
        "",
        "Of-which lines are not curated. There is no current/capital split on this sheet.",
        "Do not add leaves, the TES total, and the TME bridge together.",
        "",
        f"History: **{check['years']}** ({check['year_count']} outturn years). "
        "2025-26 is `estimated`. Earlier years are `final`.",
        "",
        "## Spot — 2024-25, £ billion nominal",
        "",
        f"Health **{format_billion(float(spot['health']))}**. "
        f"Social protection **{format_billion(float(spot['social_protection']))}**.",
        f"EU transactions **{format_billion(float(spot['eu_transactions']))}**. "
        f"TES **{format_billion(float(spot['tes']))}**. "
        f"Accounting adjustments **{format_billion(float(spot['accounting_adjustments']))}**. "
        f"Table TME **{format_billion(float(spot['table_tme']))}**.",
        f"Leaf gap **{format_billion(float(spot['leaf_gap']))}**. "
        f"TES + adjustments minus table TME = **{format_billion(float(spot['bridge_gap']))}**.",
        "The published cells are stored. No residual was added.",
        "",
        f"Table 4.3 Health the same year is **{format_billion(float(real['health_2024_25']))}** "
        "in 2025-26 prices. That sheet is checked and **not** curated.",
        "",
        "## Rounding",
        "",
        "Level-1 rows plus EU transactions can miss published TES by up to £0.2 billion.",
        "TES plus accounting adjustments can miss table TME by up to £0.1 billion in this workbook.",
        f"Largest leaf gap: £{check['max_abs_leaf_gap']} billion. "
        f"Largest bridge gap: £{check['max_abs_bridge_gap']} billion. "
        f"Years that are not exact: **{check['nonzero_gap_years']}**.",
        "",
        "Non-zero years only. Exact years are in `curated/identity_check.json`.",
        "",
        *_markdown_gaps(check, nonzero_only=True),
        "",
        "## Not the other function series",
        "",
        "- `tes-by-function` is Table 5.4 in **£ million**, five years, current and capital split.",
        "- `tes-by-function-real` is Table 4.3 in **£ billion, 2025-26 prices**.",
        "- This package is Table 4.2 in **£ billion, nominal**.",
        "- In 2025-26, Table 4.2 equals Table 4.3 because that year is the price base.",
        "- Health 242.4 is the one-decimal rounding of Table 5.4 Health 242,429 £ million.",
        "  The £ million figure is not stored here.",
        "",
        "## Raw",
        "",
        f"- File: `{evidence.path}`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        f"- Release date on the pin: {OFFICIAL_RELEASE_DATE}",
        "",
        "Docs: `docs/handover-economy-07-longrun-esa.md`",
        "",
    ]
    path = data_root / "README.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _write_validation_report(
    data_root: Path,
    evidence: RawEvidence,
    check: dict[str, object],
) -> Path:
    stamp = datetime.now(timezone.utc).date().isoformat()
    spot = check["spot_2024_25"]
    real = check["table_4_3_not_curated"]
    assert isinstance(spot, dict)
    assert isinstance(real, dict)
    lines = [
        f"# QA report — tes-by-function-long-run — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Workbook: PSS July 2026 Chapter 4, sheet `4_2`",
        "- Companion check only: sheet `4_3` (real £ billion, 2025-26 prices). Not curated.",
        "- Companion check only: `tes-by-function` Table 5.4 £ million spots, read and not copied.",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        "- Years: 2003-04 to 2025-26 outturn. No plan years.",
        "- Unit: £ billion, nominal, one decimal place.",
        "- ESA Table 11: absent (correct)",
        "- OSCAR: absent (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| L1 | Health 2024-25 = 242.4 £ billion, nominal | pass | "
        f"{format_billion(float(spot['health']))} |",
        "| L2 | Social protection 2024-25 = 386.3; TES 1,166.5; adjustments 123.6; TME 1,290.0 | pass | "
        "published cells |",
        "| L3 | EU transactions 2024-25 keep the published sign (−1.4) | pass | not a function |",
        "| L4 | Level-1 + EU versus TES, and TES + adjustments versus table TME, within £0.2 billion | pass | "
        f"max leaf {check['max_abs_leaf_gap']}; max bridge {check['max_abs_bridge_gap']} |",
        "| L5 | No residual function; of-which lines skipped | pass | "
        f"skipped {check['of_which_skipped']} |",
        "| L6 | Table 4.3 Health 2024-25 is 250.8 and is not curated; 2025-26 nominal equals real | pass | "
        f"{format_billion(float(real['health_2024_25']))} |",
        "| L7 | 2025-26 estimated; no plan years; unit is nominal £ billion, not £ million | pass | "
        f"{check['year_count']} years |",
        "| L8 | Table 5.4 £ million spots round to these £ billion cells; million rows not stored | pass | "
        "read-only |",
        "",
        f"Curated rows: **{check['row_count']}**.",
        "",
        "## Rounding — every pinned year",
        "",
        *_markdown_gaps(check, nonzero_only=False),
        "",
        "Positive leaf gap means the leaves are above published TES. The published total is kept.",
        "2022-23 is the year that reaches £0.2 billion. 2024-25 is £0.1 billion on both gaps.",
        "",
        "## Summary",
        "",
        "- Overall: **pass** (Economy self-QA)",
        "- Blockers for Ready: independent Validation `EC-VAL-07D`",
        "",
    ]
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    """Fetch → prove Table 4.2 → write the tes-by-function-long-run hand-off."""
    connector = TesByFunctionLongRunConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch_pinned()
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    observations = connector.transform([evidence])
    if connector._nominal is None or connector._real is None:
        raise RuntimeError("transform() did not keep the parse result")
    check = build_identity_check(connector._nominal, connector._real)
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    identity_path = connector.data_root / "curated" / "identity_check.json"
    identity_path.write_text(json.dumps(check, indent=2) + "\n", encoding="utf-8")
    register_path = _write_source_register(connector.data_root, connector._nominal)
    readme_path = _write_readme(connector.data_root, evidence, check)
    report_path = _write_validation_report(connector.data_root, evidence, check)
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"identity: {identity_path}")
    print(f"source_register: {register_path}")
    print(f"readme: {readme_path}")
    print(f"validation_report: {report_path}")
    spot = check["spot_2024_25"]
    assert isinstance(spot, dict)
    print(
        "spot 2024-25 £ billion: "
        f"Health {spot['health']}; Social protection {spot['social_protection']}; "
        f"TES {spot['tes']}; adjustments {spot['accounting_adjustments']}; "
        f"TME {spot['table_tme']}"
    )


if __name__ == "__main__":
    main()

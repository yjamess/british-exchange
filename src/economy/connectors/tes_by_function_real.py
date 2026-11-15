"""PSS July 2026 Table 4.3 — TES / COFOG by function in real terms.

Approach (plain language):

1. Download the accredited PSS Chapter 4 workbook and refuse it if the
   SHA-256 does not match the discovery pin.
2. Read sheet ``4_3``. Keep outturn years 2003-04 to 2025-26. No plan years.
3. Curate ten UN COFOG level-1 functions, EU transactions (published sign),
   the published TES total, accounting adjustments, and this table's TME.
   Unit is £ billion, one decimal place, 2025-26 prices.
4. Do not curate "of which" lines. Do not invent a residual when the level-1
   leaves miss the published TES total by up to £0.2 billion.
5. In 2025-26 the price base means these rows equal nominal Table 4.2.
   Health in 2024-25 is 250.8, against Table 4.2 Health 242.4. Table 4.2 is
   checked and not curated.
6. Do not deflate monthly EBFT.

Reproduce::

    uv run python -m economy.connectors.tes_by_function_real

Refs: pathlib, typing, PEP 8, openpyxl, docs/connector-contract.md.
https://docs.python.org/3/library/pathlib.html
https://docs.python.org/3/library/typing.html
https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.pss_july_2026 import (
    GDP_DEFLATOR_NOTE,
    GEO_CODE,
    GEO_LABEL,
    LICENCE,
    LONG_RUN_OUTTURN_YEARS,
    OBR_PLAN_DEFLATOR_NOTE,
    OFFICIAL_RELEASE_DATE,
    PRICE_BASE_YEAR,
    PSS_LANDING_URL,
    PUBLISHER,
    REAL_NOT_EBFT_NOTE,
    SOURCE_VERSION,
    as_billion,
    financial_year_bounds,
    find_year_header,
    format_billion,
    load_sheet_rows,
    match_key,
    normalise_label,
    notes_map,
    require_pinned_checksum,
    require_xlsx,
    status_for_pinned_year,
    strip_trailing_footnote,
    structured_notes,
)

INDICATOR_ID = "tes-by-function-real"
CONNECTOR_MODULE = "economy.connectors.tes_by_function_real"
SHEET_NAME = "4_3"
COMPANION_SHEET = "4_2"
RAW_NAME = "July_PSS_2026_Chapter_4.xlsx"
# Discovery read on 2026-11-15. A new PSS file must be reviewed, not silently pinned.
EXPECTED_SHA256 = "573625f73c0e311ff68c5635691801be955fd466cd9b5b4a0e00b8173852195c"
FILE_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a574aac822fbe6b8245c955/July_PSS_2026_Chapter_4.xlsx"
)
NOTION_REGISTRY_URL = "https://app.notion.com/p/4196547176858116bd53d358fb541942"

UNIT = "£ billion, 2025-26 prices, financial year"
# Leaf sums can miss published TES by £0.2 billion. TES + adjustments can miss
# table TME by £0.1 billion. Two tenths is the fail line. Cells are not rewritten.
MAX_GAP_TENTHS = 2
EXPECTED_OF_WHICH = 8
EXPECTED_SERIES = 14
EXPECTED_OBSERVATIONS = EXPECTED_SERIES * len(LONG_RUN_OUTTURN_YEARS)

SPOT_YEAR = "2024-25"
SPOT_HEALTH = 250.8
SPOT_EU = -1.5
SPOT_TES = 1206.6
SPOT_ADJUSTMENTS = 127.8
SPOT_TME = 1334.5
COMPANION_HEALTH = 242.4

_FUNCTION_NUMBER = re.compile(r"^(\d+)\.\s+")


@dataclass(frozen=True, slots=True)
class CofogFunction:
    """One UN COFOG level-1 function, using HMT's published name."""

    number: int
    series: str
    cofog: str
    label: str


# Same series ids as the nominal function pin, so the real table can sit beside it.
# HMT spells "Environment protection".
FUNCTIONS: tuple[CofogFunction, ...] = (
    CofogFunction(1, "cofog-01-general-public-services", "GF01", "General public services"),
    CofogFunction(2, "cofog-02-defence", "GF02", "Defence"),
    CofogFunction(3, "cofog-03-public-order-and-safety", "GF03", "Public order and safety"),
    CofogFunction(4, "cofog-04-economic-affairs", "GF04", "Economic affairs"),
    CofogFunction(5, "cofog-05-environment-protection", "GF05", "Environment protection"),
    CofogFunction(6, "cofog-06-housing-and-community-amenities", "GF06", "Housing and community amenities"),
    CofogFunction(7, "cofog-07-health", "GF07", "Health"),
    CofogFunction(8, "cofog-08-recreation-culture-and-religion", "GF08", "Recreation, culture and religion"),
    CofogFunction(9, "cofog-09-education", "GF09", "Education"),
    CofogFunction(10, "cofog-10-social-protection", "GF10", "Social protection"),
)
FUNCTION_BY_NUMBER = {item.number: item for item in FUNCTIONS}


@dataclass(frozen=True, slots=True)
class CuratedRow:
    """One published row we keep. Table 4.3 is already current plus capital."""

    series: str
    classification: str
    role: str
    label: str
    cofog: str = ""


@dataclass(frozen=True, slots=True)
class Cell:
    """One published number, already tied to a curated row and a financial year."""

    row: CuratedRow
    financial_year: str
    value: float


@dataclass(frozen=True, slots=True)
class FunctionParse:
    """Curated cells from one Chapter 4 function sheet."""

    cells: tuple[Cell, ...]
    of_which_skipped: int
    sheet_name: str


def _notes(row: CuratedRow, financial_year: str) -> str:
    fields: list[tuple[str, str]] = [
        ("series", row.series),
        ("classification", row.classification),
        ("role", row.role),
        ("fy", financial_year),
        ("cofog", row.cofog),
        ("label", row.label),
        ("table", "4.3"),
        ("price_base", PRICE_BASE_YEAR),
        ("terms", "real"),
    ]
    if row.role == "table-tme":
        fields.append(("denominator", "hmt-table-tme"))
    return structured_notes(fields)


def _tenths(value: float) -> int:
    """£ billion to an integer number of tenths. 250.8 becomes 2508."""
    return int(round(value * 10))


def _from_tenths(tenths: int) -> float:
    return tenths / 10


def _function_row(label: str) -> CuratedRow:
    cleaned = strip_trailing_footnote(normalise_label(label))
    match = _FUNCTION_NUMBER.match(cleaned)
    if not match:
        raise ValueError(f"Not a numbered function: {label!r}")
    number = int(match.group(1))
    function = FUNCTION_BY_NUMBER.get(number)
    if function is None:
        raise ValueError(f"Unknown COFOG number: {label!r}")
    name = cleaned[match.end() :].strip()
    if name.casefold() != function.label.casefold():
        raise ValueError(
            f"Sheet name {name!r} does not match the locked label {function.label!r}"
        )
    return CuratedRow(function.series, "total", "function", function.label, function.cofog)


def _bridge_row(key: str) -> CuratedRow | None:
    if key == "eu transactions":
        return CuratedRow("eu-transactions", "total", "eu-transactions", "EU transactions")
    if key == "public sector expenditure on services":
        return CuratedRow(
            "tes-total",
            "total",
            "tes-total",
            "Public sector expenditure on services",
        )
    if key == "accounting adjustments":
        return CuratedRow(
            "accounting-adjustments",
            "total",
            "bridge",
            "Accounting adjustments",
        )
    if key == "total managed expenditure":
        return CuratedRow(
            "table-tme",
            "total",
            "table-tme",
            "Total Managed Expenditure",
        )
    return None


def _row_has_year_value(row: Sequence[object], year_cols: Sequence[int]) -> bool:
    for col in year_cols:
        if col < len(row) and row[col] not in (None, ""):
            return True
    return False


def parse_function_sheet(path: Path, sheet_name: str) -> FunctionParse:
    """Read a Chapter 4 function sheet. Of-which lines are counted and skipped."""
    rows = load_sheet_rows(path, sheet_name)
    header_index, label_col, year_cols = find_year_header(rows, LONG_RUN_OUTTURN_YEARS)
    cells: list[Cell] = []
    seen: set[tuple[str, str]] = set()
    of_which_skipped = 0

    for raw in rows[header_index + 1 :]:
        if label_col >= len(raw):
            continue
        label = normalise_label(raw[label_col])
        if not label:
            continue
        key = match_key(label)
        if key.startswith("of which"):
            of_which_skipped += 1
            continue

        curated = _bridge_row(key)
        if curated is None and _FUNCTION_NUMBER.match(strip_trailing_footnote(label)):
            curated = _function_row(label)
        if curated is None:
            if _row_has_year_value(raw, year_cols):
                raise ValueError(f"Unrecognised valued row on {sheet_name}: {label!r}")
            continue

        if any((curated.series, financial_year) in seen for financial_year in LONG_RUN_OUTTURN_YEARS):
            raise ValueError(f"Duplicate row on {sheet_name}: {label!r}")
        for financial_year, col in zip(LONG_RUN_OUTTURN_YEARS, year_cols, strict=True):
            context = f"{sheet_name} {curated.label} / {financial_year}"
            value = as_billion(raw[col], context=context)
            seen.add((curated.series, financial_year))
            cells.append(Cell(curated, financial_year, value))

    _require_expected_keys(seen, sheet_name)
    return FunctionParse(tuple(cells), of_which_skipped, sheet_name)


def _require_expected_keys(seen: set[tuple[str, str]], sheet_name: str) -> None:
    expected: set[tuple[str, str]] = set()
    series_ids = [item.series for item in FUNCTIONS]
    series_ids.extend(
        ["eu-transactions", "tes-total", "accounting-adjustments", "table-tme"]
    )
    for series in series_ids:
        for financial_year in LONG_RUN_OUTTURN_YEARS:
            expected.add((series, financial_year))
    missing = expected - seen
    extra = seen - expected
    if missing or extra:
        raise ValueError(
            f"{sheet_name} key mismatch. Missing {sorted(missing)[:4]} extra {sorted(extra)[:4]}"
        )


def cells_to_observations(parsed: FunctionParse) -> list[Observation]:
    """Store Table 4.3 only. Table 4.2 cells stay in memory for the price-base check."""
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
                notes=_notes(cell.row, cell.financial_year),
            )
        )
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, built {len(observations)}"
        )
    return observations


def _index(parsed: FunctionParse) -> dict[tuple[str, str], float]:
    out: dict[tuple[str, str], float] = {}
    for cell in parsed.cells:
        key = (cell.row.series, cell.financial_year)
        if key in out:
            raise ValueError(f"Duplicate cell {key}")
        out[key] = cell.value
    return out


def _get(index: dict[tuple[str, str], float], series: str, financial_year: str) -> float:
    try:
        return index[(series, financial_year)]
    except KeyError as exc:
        raise ValueError(f"Missing {series} / {financial_year}") from exc


def build_identity_check(real: FunctionParse, nominal: FunctionParse) -> dict[str, object]:
    """Prove rounding, the Health spot, and the 2025-26 price base. Do not invent a residual."""
    if real.of_which_skipped != EXPECTED_OF_WHICH:
        raise ValueError(
            f"Expected to skip {EXPECTED_OF_WHICH} of-which rows on Table 4.3, "
            f"skipped {real.of_which_skipped}"
        )
    real_index = _index(real)
    nominal_index = _index(nominal)
    gaps: list[dict[str, object]] = []
    price_base_mismatches: list[str] = []

    for financial_year in LONG_RUN_OUTTURN_YEARS:
        leaf_tenths = sum(
            _tenths(_get(real_index, function.series, financial_year)) for function in FUNCTIONS
        )
        leaf_tenths += _tenths(_get(real_index, "eu-transactions", financial_year))
        tes = _get(real_index, "tes-total", financial_year)
        adjustments = _get(real_index, "accounting-adjustments", financial_year)
        table_tme = _get(real_index, "table-tme", financial_year)
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

    # Price base: only 2025-26 must match nominal Table 4.2. Earlier years differ on purpose.
    for series in sorted({cell.row.series for cell in real.cells}):
        real_value = _get(real_index, series, PRICE_BASE_YEAR)
        nominal_value = _get(nominal_index, series, PRICE_BASE_YEAR)
        if _tenths(real_value) != _tenths(nominal_value):
            price_base_mismatches.append(
                f"{series}: real {real_value} vs Table 4.2 {nominal_value}"
            )
    if price_base_mismatches:
        raise ValueError(
            "2025-26 real rows do not equal nominal Table 4.2: "
            + "; ".join(price_base_mismatches[:6])
        )

    health = _get(real_index, "cofog-07-health", SPOT_YEAR)
    companion_health = _get(nominal_index, "cofog-07-health", SPOT_YEAR)
    if _tenths(health) != _tenths(SPOT_HEALTH):
        raise ValueError(f"Health {SPOT_YEAR} is {health}, expected {SPOT_HEALTH}")
    if _tenths(companion_health) != _tenths(COMPANION_HEALTH):
        raise ValueError(
            f"Table 4.2 Health {SPOT_YEAR} is {companion_health}, expected {COMPANION_HEALTH}"
        )
    if _tenths(health) == _tenths(companion_health):
        raise ValueError("2024-25 real Health equals nominal Health. The sheets were mixed.")
    eu_value = _get(real_index, "eu-transactions", SPOT_YEAR)
    if _tenths(eu_value) != _tenths(SPOT_EU):
        raise ValueError(f"EU transactions {SPOT_YEAR} is {eu_value}, expected {SPOT_EU}")
    if _tenths(_get(real_index, "tes-total", SPOT_YEAR)) != _tenths(SPOT_TES):
        raise ValueError("2024-25 TES does not match the published spot")
    if _tenths(_get(real_index, "accounting-adjustments", SPOT_YEAR)) != _tenths(SPOT_ADJUSTMENTS):
        raise ValueError("2024-25 accounting adjustments do not match the published spot")
    if _tenths(_get(real_index, "table-tme", SPOT_YEAR)) != _tenths(SPOT_TME):
        raise ValueError("2024-25 table TME does not match the published spot")

    roles = {cell.row.role for cell in real.cells}
    series_ids = {cell.row.series for cell in real.cells}
    forbidden = {"residual", "other-function", "leaf-gap", "unallocated", "oscar"}
    if series_ids & forbidden or "function" not in roles:
        raise ValueError(f"Unexpected series or roles: {series_ids} {roles}")
    if any(series.startswith("residual") or "of-which" in series for series in series_ids):
        raise ValueError("Of-which or residual series were curated")

    nonzero = [row for row in gaps if row["leaf_gap"] != 0 or row["bridge_gap"] != 0]
    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "price_base": PRICE_BASE_YEAR,
        "unit": UNIT,
        "deflator": GDP_DEFLATOR_NOTE,
        "years": f"{LONG_RUN_OUTTURN_YEARS[0]} to {LONG_RUN_OUTTURN_YEARS[-1]}",
        "year_count": len(LONG_RUN_OUTTURN_YEARS),
        "gaps": gaps,
        "nonzero_gap_years": len(nonzero),
        "max_abs_leaf_gap": max(abs(float(row["leaf_gap"])) for row in gaps),
        "max_abs_bridge_gap": max(abs(float(row["bridge_gap"])) for row in gaps),
        "health_2024_25": {
            "real": health,
            "nominal_table_4_2": companion_health,
            "table_4_2_curated": False,
        },
        "spot_2024_25": {
            "eu_transactions": eu_value,
            "tes": SPOT_TES,
            "accounting_adjustments": SPOT_ADJUSTMENTS,
            "table_tme": SPOT_TME,
            "tes_plus_adjustments_minus_tme": _from_tenths(
                _tenths(SPOT_TES) + _tenths(SPOT_ADJUSTMENTS) - _tenths(SPOT_TME)
            ),
        },
        "price_base_equals_table_4_2": True,
        "of_which_skipped": real.of_which_skipped,
        "residual_function_rows": 0,
        "ebft_deflated": False,
        "row_count": EXPECTED_OBSERVATIONS,
    }


def _check_observations(observations: Sequence[Observation]) -> None:
    if any(obs.unit != UNIT for obs in observations):
        raise ValueError("A row left the £ billion 2025-26 price unit")
    estimated = [obs for obs in observations if obs.observation_status == "estimated"]
    if len(estimated) != EXPECTED_SERIES:
        raise ValueError("2025-26 must be the only estimated year, once per series")
    for obs in observations:
        parts = notes_map(obs.notes)
        financial_year = parts["fy"]
        expected = status_for_pinned_year(financial_year, LONG_RUN_OUTTURN_YEARS)
        if obs.observation_status != expected:
            raise ValueError(f"Bad status on {financial_year}")
        if parts.get("terms") != "real" or parts.get("price_base") != PRICE_BASE_YEAR:
            raise ValueError("Price base or real-terms flag missing")
        if parts.get("classification") != "total":
            raise ValueError("Table 4.3 has no current/capital split to store")
        if "million" in obs.unit.casefold():
            raise ValueError("£ million leaked into the £ billion series")


class TesByFunctionRealConnector(Connector):
    """Table 4.3 real TES / COFOG. One workbook. Table 4.2 is a check, not a pin."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._real: FunctionParse | None = None
        self._nominal: FunctionParse | None = None

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
        real = parse_function_sheet(path, SHEET_NAME)
        nominal = parse_function_sheet(path, COMPANION_SHEET)
        build_identity_check(real, nominal)
        observations = cells_to_observations(real)
        _check_observations(observations)
        self._real = real
        self._nominal = nominal
        return observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Public sector expenditure on services by function in real terms (PSS Table 4.3)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=PSS_LANDING_URL,
            series_id="PSS July 2026 Table 4.3",
            geography=(
                "United Kingdom public sector (K02000001): central government, "
                "local government and public corporations, including devolved "
                "administrations inside the functions"
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "HM Treasury Total Expenditure on Services (TES) by UN COFOG "
                "level 1, from PSS July 2026 Table 4.3. Financial-year outturn "
                "from 2003-04 to 2025-26, £ billion, one decimal place, 2025-26 "
                "prices. Each function is the published total (current and capital "
                "already summed). EU transactions keep the published sign and sit "
                "inside TES but outside the ten functions. The published TES total "
                "is stored because level-1 leaves can miss it by up to £0.2 billion. "
                "Accounting adjustments are the bridge from TES to this table's "
                "Total Managed Expenditure. They are not a function. In 2025-26 "
                "these rows equal nominal Table 4.2. Health in 2024-25 is 250.8, "
                "against Table 4.2 Health 242.4. Table 4.2 is not curated. "
                + GDP_DEFLATOR_NOTE
                + " "
                + OBR_PLAN_DEFLATOR_NOTE
                + " This table's real TME is not monthly ONS EBFT."
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
                "Download PSS July 2026 Chapter 4. Read sheet 4_3 for curated rows. "
                "Keep financial years 2003-04 to 2025-26. Curate ten COFOG level-1 "
                "functions, EU transactions, published TES, accounting adjustments, "
                "and table TME. All rows are classification=total because the sheet "
                "does not split current and capital. Skip of-which lines. Do not "
                "invent a residual for the £ billion rounding gap. Read sheet 4_2 "
                "only to prove Health 2024-25 is 242.4 nominal and that 2025-26 "
                "real equals nominal. 2025-26 observation_status=estimated. Notes "
                "use series, classification, role, fy, cofog, label, table=4.3, "
                "price_base=2025-26, terms=real. Table TME notes set "
                "denominator=hmt-table-tme."
            ),
            revision_notes=(
                "PSS July 2026, file updated 2026-07-29. 2025-26 is the first "
                "outturn estimate. Later PSS editions can revise these years. "
                "Compare sha256 before replacing the raw workbook. "
                + GDP_DEFLATOR_NOTE
            ),
            caveats=(
                "Unit is £ billion at 2025-26 prices, one decimal place. Do not mix "
                "these rows with £ million Table 5.4 or Table 1.2. "
                + GDP_DEFLATOR_NOTE
                + " "
                + OBR_PLAN_DEFLATOR_NOTE
                + " In 2024-25, Health is 250.8 (real) against Table 4.2 Health 242.4 "
                "(nominal). TES is 1,206.6 and accounting adjustments are 127.8; "
                "their sum is 0.1 below published table TME 1,334.5. That rounding "
                "is stored as printed. No residual function. EU transactions in "
                "2024-25 are -1.5, so the ten functions are not TES on their own. "
                "Defence is the UN COFOG definition, not the NATO definition. "
                "Public-sector debt interest is an of-which line inside General "
                "public services and is not a separate curated function. No "
                "Tax−Spend=Borrow identity. No OSCAR rows. No PESA plan years. "
                + REAL_NOT_EBFT_NOTE
            ),
            status_note=(
                "Financial-year outturn for 2003-04 to 2025-26 from PSS July 2026 "
                "Table 4.3, 2025-26 prices. 2025-26 is a first estimate and can "
                "still be revised. 2025-26 real equals nominal Table 4.2."
            ),
            related_indicator_ids=[
                "tes-by-function",
                "tme-del-ame-real",
                "total-managed-expenditure",
            ],
            open_questions=[
                "Nominal Table 4.2 is checked in self-QA and is not its own pin.",
                "Do not deflate monthly total-managed-expenditure to match this table.",
                "Do not rescale these £ billion rows onto £ million Table 1.2.",
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
                "table": "4.3",
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
    health = check["health_2024_25"]
    spot = check["spot_2024_25"]
    assert isinstance(health, dict)
    assert isinstance(spot, dict)
    lines = [
        "# tes-by-function-real",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** PSS July 2026 Table 4.3, £ billion, **2025-26 prices**, UK public sector, financial year",
        "",
        "TES is expenditure on services. It is not this table's TME. This table's real TME is not monthly EBFT.",
        "",
        GDP_DEFLATOR_NOTE,
        OBR_PLAN_DEFLATOR_NOTE,
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.tes_by_function_real",
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
        "## Spot — Health, 2024-25",
        "",
        f"Table 4.3 Health **{format_billion(float(health['real']))}** £ billion, 2025-26 prices.",
        f"Table 4.2 Health **{format_billion(float(health['nominal_table_4_2']))}** £ billion, nominal. "
        "That companion cell is checked and **not** curated.",
        "",
        f"Same year: EU transactions **{format_billion(float(spot['eu_transactions']))}**. "
        f"TES **{format_billion(float(spot['tes']))}**. "
        f"Accounting adjustments **{format_billion(float(spot['accounting_adjustments']))}**. "
        f"Table TME **{format_billion(float(spot['table_tme']))}**.",
        f"TES + adjustments minus table TME = "
        f"**{format_billion(float(spot['tes_plus_adjustments_minus_tme']))}**. "
        "The published cells are stored. No residual was added.",
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
        "## Price base — 2025-26 real equals nominal Table 4.2",
        "",
        "Every curated series in 2025-26 matches the same row on Table 4.2.",
        "Table 4.2 is not written to this package.",
        "",
        "## Not a real monthly EBFT",
        "",
        REAL_NOT_EBFT_NOTE,
        "",
        "## Raw",
        "",
        f"- File: `{evidence.path}`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        f"- Release date on the pin: {OFFICIAL_RELEASE_DATE}",
        "",
        "Docs: `docs/handover-economy-07-real-pin.md`",
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
    health = check["health_2024_25"]
    assert isinstance(health, dict)
    lines = [
        f"# QA report — tes-by-function-real — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Workbook: PSS July 2026 Chapter 4, sheet `4_3`",
        "- Companion check only: sheet `4_2` (nominal £ billion). Not curated.",
        "- Price base: 2025-26 prices. " + GDP_DEFLATOR_NOTE,
        "- " + OBR_PLAN_DEFLATOR_NOTE,
        f"- SHA-256: `{evidence.checksum_sha256}`",
        "- Years: 2003-04 to 2025-26 outturn. No plan years.",
        "- OSCAR: absent (correct)",
        "- Monthly EBFT was not deflated (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| F1 | Health 2024-25 = 250.8 £ billion, 2025-26 prices | pass | "
        f"{format_billion(float(health['real']))} |",
        "| F2 | Table 4.2 Health 2024-25 = 242.4, not curated | pass | "
        f"{format_billion(float(health['nominal_table_4_2']))} |",
        "| F3 | Level-1 + EU versus TES, and TES + adjustments versus table TME, within £0.2 billion | pass | "
        f"max leaf {check['max_abs_leaf_gap']}; max bridge {check['max_abs_bridge_gap']} |",
        "| F4 | No residual function; of-which lines skipped | pass | "
        f"skipped {check['of_which_skipped']} |",
        "| F5 | 2025-26 real curated rows equal Table 4.2 | pass | price base |",
        "| F6 | 2025-26 estimated; no plan years; unit is £ billion | pass | "
        f"{check['year_count']} years |",
        "| F7 | EBFT not deflated; real table TME is not real monthly EBFT | pass | manifest caveats |",
        "",
        f"Curated rows: **{check['row_count']}**.",
        "",
        "## Rounding — every pinned year",
        "",
        *_markdown_gaps(check, nonzero_only=False),
        "",
        "Positive leaf gap means the leaves are above published TES. The published total is kept.",
        "",
        "## Summary",
        "",
        "- Overall: **pass** (Economy self-QA)",
        "- Blockers for Ready: independent Validation `EC-VAL-07C`",
        "",
    ]
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    """Fetch → prove Table 4.3 → write the tes-by-function-real hand-off."""
    connector = TesByFunctionRealConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch_pinned()
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    observations = connector.transform([evidence])
    if connector._real is None or connector._nominal is None:
        raise RuntimeError("transform() did not keep the parse result")
    check = build_identity_check(connector._real, connector._nominal)
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    identity_path = connector.data_root / "curated" / "identity_check.json"
    identity_path.write_text(json.dumps(check, indent=2) + "\n", encoding="utf-8")
    register_path = _write_source_register(connector.data_root, connector._real)
    readme_path = _write_readme(connector.data_root, evidence, check)
    report_path = _write_validation_report(connector.data_root, evidence, check)
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"identity: {identity_path}")
    print(f"source_register: {register_path}")
    print(f"readme: {readme_path}")
    print(f"validation_report: {report_path}")
    health = check["health_2024_25"]
    assert isinstance(health, dict)
    print(
        "spot Health 2024-25: "
        f"{health['real']} real £ billion; Table 4.2 companion {health['nominal_table_4_2']}"
    )


if __name__ == "__main__":
    main()

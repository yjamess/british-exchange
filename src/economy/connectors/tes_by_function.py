"""PSS July 2026 Table 5.4 — TES / COFOG by function (Economy Domain 07).

Approach (plain language):

1. Download the accredited PSS Chapter 5 workbook and refuse it if the
   SHA-256 does not match the discovery pin.
2. Read sheet ``5_4`` only. Keep five outturn years, 2021-22 to 2025-26.
3. Curate ten UN COFOG level-1 functions (current and capital), EU
   transactions (published sign), the published TES totals, accounting
   adjustments, and this table's TME.
4. Do not curate "of which" lines. Do not invent a residual function when
   the level-1 leaves miss the published current total by £0–2 million.
5. Prove the table's own identities, then write the hand-off.

TES is spending on services. It is not this table's TME (the gap is
accounting adjustments). Neither row is monthly EBFT.

Reproduce::

    uv run python -m economy.connectors.tes_by_function

Refs: pathlib, typing, PEP 8, openpyxl, docs/connector-contract.md.
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
    FIRST_ESTIMATE_YEAR,
    GEO_CODE,
    GEO_LABEL,
    LICENCE,
    OFFICIAL_RELEASE_DATE,
    OUTTURN_YEARS,
    PSS_LANDING_URL,
    PUBLISHED_TABLE_TME,
    PUBLISHER,
    SOURCE_VERSION,
    UNIT,
    EbftGapNote,
    as_million,
    ebft_gap_sentences,
    financial_year_bounds,
    find_outturn_header,
    format_million,
    load_sheet_rows,
    match_key,
    normalise_label,
    notes_map,
    read_ebft_gap,
    require_pinned_checksum,
    require_xlsx,
    status_for_year,
    structured_notes,
)

INDICATOR_ID = "tes-by-function"
CONNECTOR_MODULE = "economy.connectors.tes_by_function"
SHEET_NAME = "5_4"
RAW_NAME = "July_PSS_2026_Chapter_5.xlsx"
# Discovery read on 2026-11-15. A new PSS file must be reviewed, not silently pinned.
EXPECTED_SHA256 = "d61db8cad4f4333b192022e63979237d24dbdace7b354a846af2f4ac18b37436"
FILE_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a574acd2cbe5d1c179a64fd/July_PSS_2026_Chapter_5.xlsx"
)
# Filled after the Notion registry row exists. Empty until then.
NOTION_REGISTRY_URL = "https://app.notion.com/p/41965471768581c5a15bea3cca34d474"

# Leaf rows may miss the published current or capital total by at most this many £ million.
MAX_LEAF_GAP = 2.0
# This pinned workbook has 15 "of which" lines (8 current, 7 capital). They are not slices.
EXPECTED_OF_WHICH = 15
EXPECTED_OBSERVATIONS = 140

# Kickoff spot, 2024-25 outturn, £ million.
SPOT_YEAR = "2024-25"
SPOT_HEALTH_CURRENT = 228_613.0
SPOT_HEALTH_CAPITAL = 13_816.0
SPOT_EU_CURRENT = -1_412.0
SPOT_TES_CURRENT = 1_034_248.0
SPOT_TES_CAPITAL = 132_204.0
SPOT_TES_TOTAL = 1_166_452.0
SPOT_ADJUSTMENTS_TOTAL = 123_560.0

_FUNCTION_NUMBER = re.compile(r"^(\d+)\.\s+")


@dataclass(frozen=True, slots=True)
class CofogFunction:
    """One UN COFOG level-1 function, using HMT's published name."""

    number: int
    series: str
    cofog: str
    label: str


# GF codes are the UN level-1 codes for these names. The sheet prints the
# names and numbers, not the GF prefix. HMT spells "Environment protection".
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
    """One published row we keep, already placed on current / capital / total."""

    series: str
    classification: str
    role: str
    label: str
    cofog: str = ""


@dataclass(frozen=True, slots=True)
class Table54Parse:
    """Curated rows, plus published bridges checked but not stored as slices."""

    observations: list[Observation]
    ps_current: dict[str, float]
    ps_capital: dict[str, float]
    of_which_skipped: int


def _notes(row: CuratedRow, financial_year: str) -> str:
    fields: list[tuple[str, str]] = [
        ("series", row.series),
        ("classification", row.classification),
        ("role", row.role),
        ("fy", financial_year),
        ("cofog", row.cofog),
        ("label", row.label),
        ("table", "5.4"),
    ]
    if row.role == "table-tme":
        fields.append(("denominator", "hmt-table-tme"))
    return structured_notes(fields)


def _emit(
    observations: list[Observation],
    seen: set[tuple[str, str, str]],
    row: CuratedRow,
    values: Sequence[object],
    year_cols: Sequence[int],
) -> None:
    for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
        key = (row.series, row.classification, financial_year)
        if key in seen:
            raise ValueError(f"Duplicate Table 5.4 row {key}")
        seen.add(key)
        context = f"{row.label} / {row.classification} / {financial_year}"
        value = as_million(values[col], context=context)
        period_start, period_end = financial_year_bounds(financial_year)
        observations.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code=GEO_CODE,
                geography_label=GEO_LABEL,
                value=value,
                unit=UNIT,
                observation_status=status_for_year(financial_year),
                source_version=SOURCE_VERSION,
                notes=_notes(row, financial_year),
            )
        )


def _year_values(row: Sequence[object], year_cols: Sequence[int], *, context: str) -> dict[str, float]:
    out: dict[str, float] = {}
    for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
        out[financial_year] = as_million(row[col], context=f"{context} / {financial_year}")
    return out


def parse_table_5_4(path: Path) -> Table54Parse:
    """Read sheet 5_4 into curated observations. Unknown valued rows fail."""
    rows = load_sheet_rows(path, SHEET_NAME)
    header_index, label_col, year_cols = find_outturn_header(rows)
    observations: list[Observation] = []
    seen: set[tuple[str, str, str]] = set()
    ps_current: dict[str, float] = {}
    ps_capital: dict[str, float] = {}
    of_which_skipped = 0
    phase: str | None = None

    for row in rows[header_index + 1 :]:
        if label_col >= len(row):
            continue
        label = normalise_label(row[label_col])
        if not label:
            continue
        key = match_key(label)

        if key == "public sector current expenditure on services":
            phase = "current"
            continue
        if key == "public sector capital expenditure on services":
            phase = "capital"
            continue
        if key.startswith("of which"):
            of_which_skipped += 1
            continue

        curated: CuratedRow | None = None
        if key == "eu transactions":
            if phase != "current":
                raise ValueError(f"EU transactions appeared outside the current block: {label!r}")
            curated = CuratedRow(
                "eu-transactions",
                "current",
                "eu-transactions",
                "EU transactions",
            )
        elif key == "total public sector current expenditure on services":
            curated = CuratedRow(
                "tes-total",
                "current",
                "tes-total",
                "Total public sector current expenditure on services",
            )
        elif key == "total public sector capital expenditure on services":
            curated = CuratedRow(
                "tes-total",
                "capital",
                "tes-total",
                "Total public sector capital expenditure on services",
            )
        elif key == "total public sector expenditure on services":
            phase = "total"
            curated = CuratedRow(
                "tes-total",
                "total",
                "tes-total",
                "Total public sector expenditure on services",
            )
        elif key == "accounting adjustments":
            if phase not in {"current", "capital", "total"}:
                raise ValueError(f"Accounting adjustments before a section: {label!r}")
            curated = CuratedRow(
                "accounting-adjustments",
                phase,
                "bridge",
                "Accounting adjustments",
            )
        elif key == "public sector current expenditure":
            # Published bridge. Checked below. Not a COFOG slice, so not curated.
            ps_current = _year_values(row, year_cols, context=label)
            continue
        elif key == "public sector capital expenditure":
            ps_capital = _year_values(row, year_cols, context=label)
            continue
        elif key == "total managed expenditure":
            curated = CuratedRow(
                "table-tme",
                "total",
                "table-tme",
                "Total Managed Expenditure",
            )
        else:
            number_match = _FUNCTION_NUMBER.match(label)
            if number_match:
                number = int(number_match.group(1))
                function = FUNCTION_BY_NUMBER.get(number)
                if function is None:
                    raise ValueError(f"Unknown COFOG number on Table 5.4: {label!r}")
                if phase not in {"current", "capital"}:
                    raise ValueError(f"Function outside current/capital blocks: {label!r}")
                curated = CuratedRow(
                    function.series,
                    phase,
                    "function",
                    function.label,
                    function.cofog,
                )
            elif _row_has_year_value(row, year_cols):
                raise ValueError(f"Unrecognised valued row on Table 5.4: {label!r}")

        if curated is not None:
            _emit(observations, seen, curated, row, year_cols)

    if of_which_skipped != EXPECTED_OF_WHICH:
        raise ValueError(
            f"Expected to skip {EXPECTED_OF_WHICH} of-which rows, skipped {of_which_skipped}"
        )
    if len(ps_current) != len(OUTTURN_YEARS) or len(ps_capital) != len(OUTTURN_YEARS):
        raise ValueError("Public sector current or capital expenditure bridge row is missing")
    _require_expected_keys(seen)
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, parsed {len(observations)}"
        )
    return Table54Parse(observations, ps_current, ps_capital, of_which_skipped)


def _row_has_year_value(row: Sequence[object], year_cols: Sequence[int]) -> bool:
    for col in year_cols:
        if col < len(row) and row[col] not in (None, ""):
            return True
    return False


def _require_expected_keys(seen: set[tuple[str, str, str]]) -> None:
    expected: set[tuple[str, str, str]] = set()
    for function in FUNCTIONS:
        for classification in ("current", "capital"):
            for financial_year in OUTTURN_YEARS:
                expected.add((function.series, classification, financial_year))
    for classification in ("current", "capital", "total"):
        for financial_year in OUTTURN_YEARS:
            expected.add(("tes-total", classification, financial_year))
            expected.add(("accounting-adjustments", classification, financial_year))
    for financial_year in OUTTURN_YEARS:
        expected.add(("eu-transactions", "current", financial_year))
        expected.add(("table-tme", "total", financial_year))
    missing = expected - seen
    extra = seen - expected
    if missing or extra:
        raise ValueError(f"Table 5.4 key mismatch. Missing {sorted(missing)} extra {sorted(extra)}")


def _index(observations: Sequence[Observation]) -> dict[tuple[str, str, str], float]:
    out: dict[tuple[str, str, str], float] = {}
    for obs in observations:
        parts = notes_map(obs.notes)
        key = (parts["series"], parts["classification"], parts["fy"])
        if obs.value is None:
            raise ValueError(f"Missing value for {key}")
        out[key] = obs.value
    return out


def _get(index: dict[tuple[str, str, str], float], series: str, classification: str, financial_year: str) -> float:
    try:
        return index[(series, classification, financial_year)]
    except KeyError as exc:
        raise ValueError(f"Missing {series} / {classification} / {financial_year}") from exc


def build_identity_check(parsed: Table54Parse) -> dict[str, object]:
    """Prove V1–V3. Raise if an identity fails. Do not invent a residual."""
    index = _index(parsed.observations)
    v1: list[dict[str, object]] = []
    v3: list[dict[str, object]] = []
    bridge: list[dict[str, object]] = []

    for financial_year in OUTTURN_YEARS:
        tes_current = _get(index, "tes-total", "current", financial_year)
        tes_capital = _get(index, "tes-total", "capital", financial_year)
        tes_total = _get(index, "tes-total", "total", financial_year)
        adjustments_current = _get(index, "accounting-adjustments", "current", financial_year)
        adjustments_capital = _get(index, "accounting-adjustments", "capital", financial_year)
        adjustments_total = _get(index, "accounting-adjustments", "total", financial_year)
        table_tme = _get(index, "table-tme", "total", financial_year)

        # Published totals are stored as printed. In 2023-24, current + capital
        # TES is £1 million below the published TES total, and the adjustments
        # split is £1 million above the published adjustments total. Those two
        # gaps offset, so TES + adjustments still equals table TME. Do not
        # rewrite either published cell to force the split shut.
        current_plus_capital = tes_current + tes_capital - tes_total
        tes_plus_adjustments = tes_total + adjustments_total - table_tme
        adjustments_split = adjustments_current + adjustments_capital - adjustments_total
        if tes_plus_adjustments != 0:
            raise ValueError(
                f"V1 failed {financial_year}: TES + accounting adjustments != table TME "
                f"({tes_total} + {adjustments_total} vs {table_tme})"
            )
        if abs(current_plus_capital) > MAX_LEAF_GAP:
            raise ValueError(
                f"V1 {financial_year}: current TES + capital TES misses published TES "
                f"by {current_plus_capital}, outside £{MAX_LEAF_GAP:.0f} million"
            )
        if abs(adjustments_split) > MAX_LEAF_GAP:
            raise ValueError(
                f"{financial_year}: current + capital adjustments miss the published "
                f"total by {adjustments_split}, outside £{MAX_LEAF_GAP:.0f} million"
            )
        if table_tme != PUBLISHED_TABLE_TME[financial_year]:
            raise ValueError(
                f"{financial_year}: table TME {table_tme} != published {PUBLISHED_TABLE_TME[financial_year]}"
            )

        ps_current = parsed.ps_current[financial_year]
        ps_capital = parsed.ps_capital[financial_year]
        if tes_current + adjustments_current != ps_current:
            raise ValueError(f"{financial_year}: current TES + current adjustments != PS current expenditure")
        if tes_capital + adjustments_capital != ps_capital:
            raise ValueError(f"{financial_year}: capital TES + capital adjustments != PS capital expenditure")
        if ps_current + ps_capital != table_tme:
            raise ValueError(f"{financial_year}: PS current + PS capital != table TME")

        current_leaf = sum(
            _get(index, function.series, "current", financial_year) for function in FUNCTIONS
        )
        eu_value = _get(index, "eu-transactions", "current", financial_year)
        current_leaf += eu_value
        capital_leaf = sum(
            _get(index, function.series, "capital", financial_year) for function in FUNCTIONS
        )
        current_gap = current_leaf - tes_current
        capital_gap = capital_leaf - tes_capital
        if abs(current_gap) > MAX_LEAF_GAP or abs(capital_gap) > MAX_LEAF_GAP:
            raise ValueError(
                f"V3 leaf gap exceeds £{MAX_LEAF_GAP:.0f}m in {financial_year}: "
                f"current {current_gap}, capital {capital_gap}"
            )

        v1.append(
            {
                "fy": financial_year,
                "tes_current": tes_current,
                "tes_capital": tes_capital,
                "tes_total": tes_total,
                "accounting_adjustments": adjustments_total,
                "accounting_adjustments_current": adjustments_current,
                "accounting_adjustments_capital": adjustments_capital,
                "table_tme": table_tme,
                "current_plus_capital_minus_tes": current_plus_capital,
                "adjustments_split_minus_total": adjustments_split,
                "tes_plus_adjustments_minus_tme": tes_plus_adjustments,
            }
        )
        v3.append(
            {
                "fy": financial_year,
                "side": "current",
                "leaf_sum_including_eu": current_leaf,
                "published_tes": tes_current,
                "gap": current_gap,
            }
        )
        v3.append(
            {
                "fy": financial_year,
                "side": "capital",
                "leaf_sum_including_eu": capital_leaf,
                "published_tes": tes_capital,
                "gap": capital_gap,
            }
        )
        bridge.append(
            {
                "fy": financial_year,
                "ps_current_expenditure": ps_current,
                "ps_capital_expenditure": ps_capital,
                "curated": False,
            }
        )

    health_current = _get(index, "cofog-07-health", "current", SPOT_YEAR)
    health_capital = _get(index, "cofog-07-health", "capital", SPOT_YEAR)
    if health_current != SPOT_HEALTH_CURRENT or health_capital != SPOT_HEALTH_CAPITAL:
        raise ValueError(
            f"V2 Health {SPOT_YEAR} expected {SPOT_HEALTH_CURRENT} + {SPOT_HEALTH_CAPITAL}, "
            f"got {health_current} + {health_capital}"
        )
    if health_current + health_capital != SPOT_HEALTH_CURRENT + SPOT_HEALTH_CAPITAL:
        raise ValueError("V2 Health current + capital is not 242,429")
    if _get(index, "eu-transactions", "current", SPOT_YEAR) != SPOT_EU_CURRENT:
        raise ValueError(f"EU transactions {SPOT_YEAR} lost the published sign or value")
    if _get(index, "tes-total", "current", SPOT_YEAR) != SPOT_TES_CURRENT:
        raise ValueError("2024-25 current TES does not match the published spot")
    if _get(index, "tes-total", "capital", SPOT_YEAR) != SPOT_TES_CAPITAL:
        raise ValueError("2024-25 capital TES does not match the published spot")
    if _get(index, "tes-total", "total", SPOT_YEAR) != SPOT_TES_TOTAL:
        raise ValueError("2024-25 TES total does not match the published spot")
    if _get(index, "accounting-adjustments", "total", SPOT_YEAR) != SPOT_ADJUSTMENTS_TOTAL:
        raise ValueError("2024-25 accounting adjustments do not match the published spot")

    roles = {notes_map(obs.notes)["role"] for obs in parsed.observations}
    series_ids = {notes_map(obs.notes)["series"] for obs in parsed.observations}
    forbidden = {"residual", "other-function", "leaf-gap", "unallocated", "oscar"}
    if series_ids & forbidden or "function" not in roles:
        raise ValueError(f"Unexpected series or roles: {series_ids} {roles}")
    if any(series.startswith("residual") or "of-which" in series for series in series_ids):
        raise ValueError("Of-which or residual series were curated")
    _check_statuses(parsed.observations)

    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "v1": v1,
        "v2_health_2024_25": {
            "current": health_current,
            "capital": health_capital,
            "sum": health_current + health_capital,
            "pass": True,
        },
        "v3_leaf_gaps": v3,
        "published_expenditure_bridge_not_curated": bridge,
        "of_which_skipped": parsed.of_which_skipped,
        "residual_function_rows": 0,
        "row_count": len(parsed.observations),
    }


def _check_statuses(observations: Sequence[Observation]) -> None:
    for obs in observations:
        financial_year = notes_map(obs.notes)["fy"]
        expected = status_for_year(financial_year)
        if obs.observation_status != expected:
            raise ValueError(
                f"{financial_year} status is {obs.observation_status}, expected {expected}"
            )
        if financial_year not in OUTTURN_YEARS:
            raise ValueError(f"Plan year curated: {financial_year}")
    estimated = [obs for obs in observations if obs.observation_status == "estimated"]
    if not estimated or any(notes_map(obs.notes)["fy"] != FIRST_ESTIMATE_YEAR for obs in estimated):
        raise ValueError("2025-26 must be the only estimated year")


class TesByFunctionConnector(Connector):
    """Table 5.4 TES / COFOG pin. One workbook, one indicator."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._parsed: Table54Parse | None = None

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch_pinned(self) -> RawEvidence:
        """Download Chapter 5 into raw/<UTC date>/ and check the pinned checksum."""
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
            raise ValueError("transform() needs the pinned Chapter 5 workbook")
        path = self.data_root / evidence[0].path
        parsed = parse_table_5_4(path)
        # Proved before we write curated rows. A failed identity leaves no CSV.
        build_identity_check(parsed)
        self._parsed = parsed
        return parsed.observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        gap = read_ebft_gap(PUBLISHED_TABLE_TME)
        return Manifest(
            indicator_id=self.indicator_id,
            title="Public sector expenditure on services by function (TES / COFOG)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=PSS_LANDING_URL,
            series_id="PSS July 2026 Table 5.4",
            geography=(
                "United Kingdom public sector (K02000001): central government, "
                "local government and public corporations, including devolved "
                "administrations inside the functions"
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "HM Treasury Total Expenditure on Services (TES) by UN COFOG "
                "level 1, from PSS July 2026 Table 5.4. Financial-year outturn, "
                "£ million, nominal. Ten functions each have current and capital "
                "rows. EU transactions keep the published sign and sit inside TES "
                "but outside the ten functions. The published TES total is stored "
                "because level-1 leaves can miss it by £0–2 million. Accounting "
                "adjustments are the bridge from TES to this table's Total Managed "
                "Expenditure. They are not a function. This table's TME is not "
                "monthly ONS EBFT and is not 'services people receive'."
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
                "Download PSS July 2026 Chapter 5. Read sheet 5_4 only. Keep "
                "financial years 2021-22 to 2025-26. Curate ten COFOG level-1 "
                "functions (current and capital), EU transactions, published TES "
                "totals (current, capital, total), accounting adjustments "
                "(current, capital, total), and table TME. Skip of-which lines. "
                "Do not curate public-sector current or capital expenditure as "
                "extra slices; those published bridges are checked in self-QA. "
                "2025-26 observation_status=estimated (first estimate). Notes use "
                "series, classification, role, fy, cofog, label, table=5.4. "
                "Table TME notes set denominator=hmt-table-tme."
            ),
            revision_notes=(
                "PSS July 2026, file updated 2026-07-29. 2025-26 is the first "
                "outturn estimate because not every department had published its "
                "annual report. Later PSS editions can revise these years. "
                "Compare sha256 before replacing the raw workbook."
            ),
            caveats=(
                "Label this TES / COFOG, not a split of monthly EBFT and not "
                "services equal to TME. In 2024-25, TES is 1,166,452 and table "
                "TME is 1,290,012; the gap is accounting adjustments of 123,560. "
                "EU transactions in 2024-25 are -1,412 on the current side, so "
                "the ten functions are not TES on their own. Defence is the UN "
                "COFOG definition, not the NATO definition. Public-sector debt "
                "interest sits inside General public services and is not a "
                "separate curated function. No Tax−Spend=Borrow identity. No "
                "OSCAR rows. No PESA plan years. No invented residual for the "
                "£0–2 million leaf gap. "
                + ebft_gap_sentences(gap)
            ),
            status_note=(
                "Financial-year outturn for 2021-22 to 2025-26 from PSS July 2026. "
                "2025-26 is a first estimate and can still be revised."
            ),
            related_indicator_ids=[
                "tme-del-ame",
                "total-managed-expenditure",
            ],
            open_questions=[
                "Table 4.2 long-run (£ billion) and Table 4.3 real terms are not in this pin.",
                "ESA Table 11 and OSCAR are intentionally absent.",
                "Do not rescale these financial-year rows onto monthly EBFT.",
            ],
        )


def _write_source_register(data_root: Path, observations: Sequence[Observation]) -> Path:
    path = data_root / "source_register.csv"
    fields = ["series", "classification", "role", "cofog", "label", "table", "curated"]
    seen: set[tuple[str, str]] = set()
    rows: list[dict[str, str]] = []
    for obs in observations:
        parts = notes_map(obs.notes)
        key = (parts["series"], parts["classification"])
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "series": parts["series"],
                "classification": parts["classification"],
                "role": parts["role"],
                "cofog": parts.get("cofog", ""),
                "label": parts["label"],
                "table": "5.4",
                "curated": "true",
            }
        )
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return path


def _markdown_v1(check: dict[str, object]) -> list[str]:
    lines = [
        "| Financial year | Current TES | Capital TES | Total TES | Current+capital minus TES | Adjustments | TES+adjustments minus TME | Table TME |",
        "|----------------|------------:|------------:|----------:|---------------------------:|------------:|---------------------------:|----------:|",
    ]
    for row in check["v1"]:  # type: ignore[index]
        assert isinstance(row, dict)
        lines.append(
            f"| {row['fy']} | {format_million(float(row['tes_current']))} | "
            f"{format_million(float(row['tes_capital']))} | "
            f"{format_million(float(row['tes_total']))} | "
            f"{format_million(float(row['current_plus_capital_minus_tes']))} | "
            f"{format_million(float(row['accounting_adjustments']))} | "
            f"{format_million(float(row['tes_plus_adjustments_minus_tme']))} | "
            f"{format_million(float(row['table_tme']))} |"
        )
    return lines


def _v1_rounding_note(check: dict[str, object]) -> str:
    """Say which years the published current/capital split misses the total."""
    misses: list[str] = []
    for row in check["v1"]:  # type: ignore[index]
        assert isinstance(row, dict)
        tes_gap = float(row["current_plus_capital_minus_tes"])
        adj_gap = float(row["adjustments_split_minus_total"])
        if tes_gap == 0 and adj_gap == 0:
            continue
        misses.append(
            f"{row['fy']}: current+capital TES minus published TES = {format_million(tes_gap)}; "
            f"current+capital adjustments minus published adjustments = {format_million(adj_gap)}"
        )
    if not misses:
        return (
            "Current TES + capital TES equals published TES in every pinned year, "
            "and the adjustments split matches its published total."
        )
    return (
        "Published total TES + published accounting adjustments equals table TME "
        "in every pinned year. The current/capital split of those published totals "
        "is exact except: "
        + "; ".join(misses)
        + ". Same £1 million rounding class as the level-1 leaf gap. "
        "The published cells are stored unchanged. No residual was added."
    )


def _markdown_v3(check: dict[str, object]) -> list[str]:
    lines = [
        "| Financial year | Side | Level-1 leaves | Published TES | Gap (£ million) |",
        "|----------------|------|---------------:|--------------:|----------------:|",
    ]
    for row in check["v3_leaf_gaps"]:  # type: ignore[index]
        assert isinstance(row, dict)
        leaf_label = "10 functions + EU" if row["side"] == "current" else "10 functions"
        lines.append(
            f"| {row['fy']} | {row['side']} ({leaf_label}) | "
            f"{format_million(float(row['leaf_sum_including_eu']))} | "
            f"{format_million(float(row['published_tes']))} | "
            f"{format_million(float(row['gap']))} |"
        )
    return lines


def _write_readme(
    data_root: Path,
    evidence: RawEvidence,
    check: dict[str, object],
    gap: EbftGapNote,
) -> Path:
    health = check["v2_health_2024_25"]
    assert isinstance(health, dict)
    lines = [
        "# tes-by-function",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** PSS July 2026 Table 5.4 (TES / COFOG), £ million, UK public sector, financial year",
        "",
        "TES is expenditure on services. It is not this table's TME. This table's TME is not monthly EBFT.",
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.tes_by_function",
        "```",
        "",
        "## What is curated",
        "",
        "| Role | What | Chart as a function slice? |",
        "|------|------|----------------------------|",
        "| `function` | Ten COFOG level-1 rows, current and capital | Yes, these ten only |",
        "| `eu-transactions` | EU transactions, published sign | No. Inside TES, outside the ten |",
        "| `tes-total` | Published current, capital, and total TES | No. It is the total |",
        "| `bridge` | Accounting adjustments (current, capital, total) | No. Not a function |",
        "| `table-tme` | This table's Total Managed Expenditure | No. Denominator is `hmt-table-tme` |",
        "",
        "Of-which lines are not curated. Public-sector current and capital expenditure",
        "are checked in self-QA and are not extra slices (they equal TES plus adjustments).",
        "",
        "Do not add the rows together across roles. Leaves, totals, and bridges overlap.",
        "",
        "## Spot — Health, 2024-25",
        "",
        f"Current {format_million(float(health['current']))} + capital "
        f"{format_million(float(health['capital']))} = "
        f"**{format_million(float(health['sum']))}**.",
        "",
        "Same year: current TES 1,034,248 + capital TES 132,204 = TES **1,166,452**.",
        "TES 1,166,452 + accounting adjustments **123,560** = table TME **1,290,012**.",
        "EU transactions (current) = **-1,412**.",
        "",
        _v1_rounding_note(check),
        "",
        "## Leaf gap",
        "",
        "Level-1 rows plus EU transactions can miss the published current total by £0–2 million.",
        "The published TES total is stored. There is no residual function.",
        "",
        *_markdown_v3(check),
        "",
        "## Financial year versus monthly EBFT",
        "",
        _gap_markdown(gap),
        "",
        "Do not rescale this package onto `total-managed-expenditure`.",
        "",
        "## Raw",
        "",
        f"- File: `{evidence.path}`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        f"- Release date on the pin: {OFFICIAL_RELEASE_DATE}",
        "",
        "2025-26 is `estimated` (first outturn estimate). 2021-22 to 2024-25 are `final`.",
        "",
        "Docs: `docs/handover-economy-07-function-pin.md`",
        "",
    ]
    path = data_root / "README.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _gap_markdown(gap: EbftGapNote) -> str:
    if gap.read_error:
        return f"EBFT pin was not re-read: {gap.read_error}"
    lines = [
        f"Ready pin `{gap.curated_path}` (PSF release {gap.official_release_date or 'unknown'}).",
        "Sums below are derived April–March totals of monthly EBFT, not an official financial-year series.",
        "",
        "| Financial year | Sum of monthly EBFT | HMT table TME | Difference |",
        "|----------------|--------------------:|--------------:|-----------:|",
    ]
    for year in gap.years:
        if year.ebft_sum is None:
            lines.append(
                f"| {year.financial_year} | incomplete ({year.ebft_months} months) | "
                f"{format_million(year.hmt_table_tme)} | — |"
            )
        else:
            lines.append(
                f"| {year.financial_year} | {format_million(year.ebft_sum)} | "
                f"{format_million(year.hmt_table_tme)} | {format_million(year.difference or 0.0)} |"
            )
    return "\n".join(lines)


def _write_validation_report(
    data_root: Path,
    evidence: RawEvidence,
    check: dict[str, object],
    gap: EbftGapNote,
) -> Path:
    stamp = datetime.now(timezone.utc).date().isoformat()
    health = check["v2_health_2024_25"]
    assert isinstance(health, dict)
    lines = [
        f"# QA report — tes-by-function — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Workbook: PSS July 2026 Chapter 5, sheet `5_4`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        "- ESA Table 11: absent (correct)",
        "- OSCAR: absent (correct)",
        "- Table 4.2 £ billion: not in this package (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| V1 | Published total TES + accounting adjustments = table TME, every pinned year | pass | exact |",
        "| V1b | Current + capital versus the published TES and adjustments totals | pass | within £2 million; published cells kept |",
        f"| V2 | Health {SPOT_YEAR} current + capital = 242,429 | pass | "
        f"{format_million(float(health['current']))} + {format_million(float(health['capital']))} |",
        "| V3 | Level-1 + EU versus published TES documented; gap within £2 million; no residual function | pass | see table |",
        "| V5 | Totals are HMT financial-year TES / table TME, not monthly EBFT; TME is not services; no Tax−Spend=Borrow; no OSCAR | pass | manifest caveats |",
        "| V6 | 2025-26 estimated; no plan years | pass | five outturn years only |",
        "| V7 | ESA and OSCAR files absent | pass | correct for this pin |",
        "",
        f"Curated rows: **{check['row_count']}**. Of-which lines skipped: **{check['of_which_skipped']}**.",
        "",
        "## V1 — aggregate identity",
        "",
        *_markdown_v1(check),
        "",
        _v1_rounding_note(check),
        "",
        "## V2 — Health 2024-25",
        "",
        f"{format_million(float(health['current']))} + {format_million(float(health['capital']))} = "
        f"{format_million(float(health['sum']))}.",
        "",
        "Table 4.2 is not pinned, so the £242.4 billion companion cell is not re-checked here.",
        "",
        "## V3 — leaf gap (no residual function)",
        "",
        *_markdown_v3(check),
        "",
        "Positive gap means the leaves are above the published total. The published total is kept.",
        "",
        "## Expenditure bridge (checked, not curated)",
        "",
        "Public sector current expenditure = current TES + current accounting adjustments.",
        "Public sector capital expenditure = capital TES + capital accounting adjustments.",
        "Those two published rows sum to table TME. They are not COFOG functions.",
        "",
        "## EBFT gap (read-only)",
        "",
        _gap_markdown(gap),
        "",
        "## Summary",
        "",
        "- Overall: **pass** (Economy self-QA)",
        "- Blockers for Ready: independent Validation `EC-VAL-07B`",
        "",
    ]
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    """Fetch → prove identities → write the tes-by-function hand-off."""
    connector = TesByFunctionConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch_pinned()
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    observations = connector.transform([evidence])
    parsed = connector._parsed
    if parsed is None:
        raise RuntimeError("transform() did not keep the parse result")
    check = build_identity_check(parsed)
    gap = read_ebft_gap(PUBLISHED_TABLE_TME)
    check["ebft_gap"] = {
        "official_release_date": gap.official_release_date,
        "read_error": gap.read_error,
        "years": [
            {
                "fy": year.financial_year,
                "hmt_table_tme": year.hmt_table_tme,
                "ebft_months": year.ebft_months,
                "ebft_sum": year.ebft_sum,
                "difference": year.difference,
            }
            for year in gap.years
        ],
    }
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    identity_path = connector.data_root / "curated" / "identity_check.json"
    identity_path.write_text(json.dumps(check, indent=2) + "\n", encoding="utf-8")
    register_path = _write_source_register(connector.data_root, observations)
    readme_path = _write_readme(connector.data_root, evidence, check, gap)
    report_path = _write_validation_report(connector.data_root, evidence, check, gap)
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"identity: {identity_path}")
    print(f"source_register: {register_path}")
    print(f"readme: {readme_path}")
    print(f"validation_report: {report_path}")
    health = check["v2_health_2024_25"]
    assert isinstance(health, dict)
    print(
        "spot Health 2024-25: "
        f"{health['current']} + {health['capital']} = {health['sum']}"
    )


if __name__ == "__main__":
    main()

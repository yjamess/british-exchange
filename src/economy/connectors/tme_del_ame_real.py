"""PSS July 2026 Table 1.2 — DEL, AME, and table TME in real terms.

Approach (plain language):

1. Download the same accredited PSS Chapter 1 workbook as the nominal pin.
   Refuse it if the SHA-256 does not match.
2. Read sheet ``Table_1_2`` only for the curated rows. Keep five outturn years,
   2021-22 to 2025-26. No PESA plan years.
3. Curate four published rows: Total DEL, Departmental AME, Other AME, and
   this table's TME. Prices are 2025-26 prices, £ million. Keep Other AME,
   including years when it is negative.
4. Do not rebuild Total DEL from resource DEL + capital DEL. Those lines are
   read only to prove they are a different number, then left out of the CSV.
5. In 2025-26 the price base means real equals nominal. Check that against
   Table 1.1 in the same workbook, including resource DEL 496,670.
6. Do not deflate monthly EBFT. Real table TME is not real monthly EBFT.

Reproduce::

    uv run python -m economy.connectors.tme_del_ame_real

Refs: pathlib, typing, PEP 8, openpyxl, docs/connector-contract.md.
https://docs.python.org/3/library/pathlib.html
https://docs.python.org/3/library/typing.html
https://peps.python.org/pep-0008/
"""

from __future__ import annotations

import csv
import json
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
    GDP_DEFLATOR_NOTE,
    GEO_CODE,
    GEO_LABEL,
    LICENCE,
    OBR_PLAN_DEFLATOR_NOTE,
    OFFICIAL_RELEASE_DATE,
    OUTTURN_YEARS,
    PRICE_BASE_YEAR,
    PSS_LANDING_URL,
    PUBLISHED_TABLE_TME,
    PUBLISHER,
    REAL_NOT_EBFT_NOTE,
    SOURCE_VERSION,
    as_million,
    financial_year_bounds,
    find_outturn_header,
    format_million,
    load_sheet_rows,
    match_key,
    normalise_label,
    notes_map,
    require_pinned_checksum,
    require_xlsx,
    status_for_year,
    structured_notes,
)

INDICATOR_ID = "tme-del-ame-real"
CONNECTOR_MODULE = "economy.connectors.tme_del_ame_real"
SHEET_NAME = "Table_1_2"
NOMINAL_SHEET = "Table_1_1"
RAW_NAME = "July_PSS_2026_Chapter_1.xlsx"
# Same Chapter 1 file as the nominal pin. A new PSS file must be reviewed.
EXPECTED_SHA256 = "ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe"
FILE_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx"
)
NOTION_REGISTRY_URL = "https://app.notion.com/p/419654717685815ba4c7d9d669dd661b"

UNIT = "£ million, 2025-26 prices, financial year"
EXPECTED_OBSERVATIONS = 20
SPOT_YEAR = "2024-25"

# Kickoff spot. In the 2025-26 price base this real cell equals nominal Table 1.1.
RESOURCE_DEL_PRICE_BASE = 496_670.0

# Published control totals, £ million, 2025-26 prices. Read from Table 1.2 on
# 2026-11-15. Other AME is negative in 2021-22. That sign stays.
PUBLISHED_ROWS: dict[str, dict[str, float]] = {
    "2021-22": {
        "total-del": 648_705.0,
        "departmental-ame": 816_338.0,
        "other-ame": -202_678.0,
        "table-tme": 1_262_365.0,
    },
    "2022-23": {
        "total-del": 613_433.0,
        "departmental-ame": 461_587.0,
        "other-ame": 240_194.0,
        "table-tme": 1_315_214.0,
    },
    "2023-24": {
        "total-del": 601_148.0,
        "departmental-ame": 584_293.0,
        "other-ame": 139_510.0,
        "table-tme": 1_324_951.0,
    },
    "2024-25": {
        "total-del": 616_422.0,
        "departmental-ame": 626_432.0,
        "other-ame": 91_603.0,
        "table-tme": 1_334_457.0,
    },
    "2025-26": {
        "total-del": 639_807.0,
        "departmental-ame": 622_645.0,
        "other-ame": 97_670.0,
        "table-tme": 1_360_122.0,
    },
}


@dataclass(frozen=True, slots=True)
class ControlRow:
    """One published control total on the Table 1.2 'of which' block."""

    match: str
    series: str
    classification: str
    role: str
    label: str


CONTROL_ROWS: tuple[ControlRow, ...] = (
    ControlRow("total del", "total-del", "control-total", "control-total", "Total DEL"),
    ControlRow(
        "departmental ame",
        "departmental-ame",
        "control-total",
        "control-total",
        "Departmental AME",
    ),
    ControlRow("other ame", "other-ame", "control-total", "control-total", "Other AME"),
    ControlRow(
        "total managed expenditure",
        "table-tme",
        "total",
        "table-tme",
        "Total Managed Expenditure",
    ),
)
CONTROL_BY_KEY = {row.match: row for row in CONTROL_ROWS}
CURATED_SERIES = tuple(row.series for row in CONTROL_ROWS)


@dataclass(frozen=True, slots=True)
class ControlBlock:
    """Four control totals, plus the resource and capital DEL lines we do not add."""

    values: dict[tuple[str, str], float]
    resource_del: dict[str, float]
    capital_del: dict[str, float]


def _notes(row: ControlRow, financial_year: str) -> str:
    fields: list[tuple[str, str]] = [
        ("series", row.series),
        ("classification", row.classification),
        ("role", row.role),
        ("fy", financial_year),
        ("label", row.label),
        ("table", "1.2"),
        ("price_base", PRICE_BASE_YEAR),
        ("terms", "real"),
    ]
    if row.role == "table-tme":
        fields.append(("denominator", "hmt-table-tme"))
    return structured_notes(fields)


def _year_values(row: Sequence[object], year_cols: Sequence[int], *, context: str) -> dict[str, float]:
    out: dict[str, float] = {}
    for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
        out[financial_year] = as_million(row[col], context=f"{context} / {financial_year}")
    return out


def read_control_block(path: Path, sheet_name: str) -> ControlBlock:
    """Read the four control totals from Table 1.1 or Table 1.2.

    Detail rows above the 'of which' block are not returned. Resource DEL and
    capital DEL are returned so the caller can prove they are not Total DEL.
    """
    rows = load_sheet_rows(path, sheet_name)
    header_index, label_col, year_cols = find_outturn_header(rows)
    values: dict[tuple[str, str], float] = {}
    seen: set[str] = set()
    resource_del: dict[str, float] = {}
    capital_del: dict[str, float] = {}

    for raw in rows[header_index + 1 :]:
        if label_col >= len(raw):
            continue
        label = normalise_label(raw[label_col])
        if not label:
            continue
        key = match_key(label)
        if key == "total resource del":
            resource_del = _year_values(raw, year_cols, context=f"{sheet_name} {label}")
            continue
        if key == "total capital del":
            capital_del = _year_values(raw, year_cols, context=f"{sheet_name} {label}")
            continue
        spec = CONTROL_BY_KEY.get(key)
        if spec is None:
            continue
        if spec.series in seen:
            raise ValueError(f"Duplicate {sheet_name} control row: {label!r}")
        seen.add(spec.series)
        for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
            value = as_million(raw[col], context=f"{sheet_name} {spec.label} / {financial_year}")
            values[(spec.series, financial_year)] = value

    missing = set(CURATED_SERIES) - seen
    if missing:
        raise ValueError(f"{sheet_name} missing control rows: {sorted(missing)}")
    if not resource_del or not capital_del:
        raise ValueError(f"{sheet_name} is missing resource DEL or capital DEL")
    return ControlBlock(values, resource_del, capital_del)


def observations_from_block(block: ControlBlock) -> list[Observation]:
    """Turn the Table 1.2 block into curated observations. Four series only."""
    observations: list[Observation] = []
    for spec in CONTROL_ROWS:
        for financial_year in OUTTURN_YEARS:
            value = block.values[(spec.series, financial_year)]
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
                    notes=_notes(spec, financial_year),
                )
            )
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, built {len(observations)}"
        )
    return observations


def _require(value: float, expected: float, context: str) -> None:
    if value != expected:
        raise ValueError(f"{context} is {value}, expected {expected}")


def build_identity_check(real: ControlBlock, nominal: ControlBlock) -> dict[str, object]:
    """Prove the control-total identity, the price base, and that Total DEL was not rebuilt."""
    v4: list[dict[str, object]] = []
    not_rebuilt: list[dict[str, object]] = []
    for financial_year in OUTTURN_YEARS:
        published = PUBLISHED_ROWS[financial_year]
        values = {series: real.values[(series, financial_year)] for series in CURATED_SERIES}
        for series, expected in published.items():
            _require(values[series], expected, f"{financial_year} {series}")
        total = values["total-del"] + values["departmental-ame"] + values["other-ame"]
        if total != values["table-tme"]:
            raise ValueError(
                f"Identity failed {financial_year}: "
                f"{values['total-del']} + {values['departmental-ame']} + {values['other-ame']} "
                f"= {total}, table TME {values['table-tme']}"
            )
        if financial_year == PRICE_BASE_YEAR:
            if values["table-tme"] != PUBLISHED_TABLE_TME[financial_year]:
                raise ValueError("2025-26 real table TME does not equal nominal table TME")
        elif values["table-tme"] == PUBLISHED_TABLE_TME[financial_year]:
            raise ValueError(
                f"{financial_year} real table TME equals nominal table TME. "
                "Only the 2025-26 price-base year should match."
            )
        v4.append(
            {
                "fy": financial_year,
                "total_del": values["total-del"],
                "departmental_ame": values["departmental-ame"],
                "other_ame": values["other-ame"],
                "table_tme": values["table-tme"],
                "sum_minus_tme": 0.0,
            }
        )

        resource = real.resource_del[financial_year]
        capital = real.capital_del[financial_year]
        rebuilt = resource + capital
        if rebuilt == values["total-del"]:
            raise ValueError(
                f"{financial_year}: resource DEL + capital DEL equals published Total DEL. "
                "Footnote 7 says block grant adjustments sit outside that pair."
            )
        not_rebuilt.append(
            {
                "fy": financial_year,
                "resource_del": resource,
                "capital_del": capital,
                "resource_plus_capital": rebuilt,
                "published_total_del": values["total-del"],
                "gap": values["total-del"] - rebuilt,
                "curated": False,
            }
        )

    if real.values[("other-ame", "2021-22")] >= 0:
        raise ValueError("2021-22 Other AME must keep its published negative sign")

    price_base: dict[str, float] = {}
    for series in CURATED_SERIES:
        real_value = real.values[(series, PRICE_BASE_YEAR)]
        nominal_value = nominal.values[(series, PRICE_BASE_YEAR)]
        _require(real_value, nominal_value, f"price base {series}")
        price_base[series] = real_value
    real_resource = real.resource_del[PRICE_BASE_YEAR]
    nominal_resource = nominal.resource_del[PRICE_BASE_YEAR]
    _require(real_resource, RESOURCE_DEL_PRICE_BASE, "Table 1.2 resource DEL 2025-26")
    _require(nominal_resource, RESOURCE_DEL_PRICE_BASE, "Table 1.1 resource DEL 2025-26")
    real_capital = real.capital_del[PRICE_BASE_YEAR]
    _require(
        real_capital,
        nominal.capital_del[PRICE_BASE_YEAR],
        "price base capital DEL",
    )

    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "price_base": PRICE_BASE_YEAR,
        "unit": UNIT,
        "deflator": GDP_DEFLATOR_NOTE,
        "v4": v4,
        "price_base_equals_nominal": {
            "fy": PRICE_BASE_YEAR,
            "resource_del": real_resource,
            "capital_del": real_capital,
            **price_base,
        },
        "total_del_not_rebuilt": not_rebuilt,
        "real_table_tme_equals_nominal_only_in_price_base_year": True,
        "ebft_deflated": False,
        "row_count": EXPECTED_OBSERVATIONS,
    }


def _check_observations(observations: Sequence[Observation]) -> None:
    series_ids = {notes_map(obs.notes)["series"] for obs in observations}
    if series_ids != set(CURATED_SERIES):
        raise ValueError(f"Unexpected series in the real DEL pin: {series_ids}")
    if any("oscar" in obs.notes.casefold() for obs in observations):
        raise ValueError("OSCAR text was curated")
    if any(obs.unit != UNIT for obs in observations):
        raise ValueError("A row left the 2025-26 £ million unit")
    estimated = [obs for obs in observations if obs.observation_status == "estimated"]
    if len(estimated) != len(CURATED_SERIES):
        raise ValueError("2025-26 must be the only estimated year, once per series")
    for obs in observations:
        financial_year = notes_map(obs.notes)["fy"]
        if obs.observation_status != status_for_year(financial_year):
            raise ValueError(f"Bad status on {financial_year}")
        if financial_year not in OUTTURN_YEARS:
            raise ValueError(f"Plan year curated: {financial_year}")
        if notes_map(obs.notes).get("terms") != "real":
            raise ValueError("Real-terms flag missing from notes")
        if notes_map(obs.notes).get("price_base") != PRICE_BASE_YEAR:
            raise ValueError("Price base missing from notes")


class TmeDelAmeRealConnector(Connector):
    """Table 1.2 real-terms control totals. One workbook, four series."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._real: ControlBlock | None = None
        self._nominal: ControlBlock | None = None

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch_pinned(self) -> RawEvidence:
        """Download Chapter 1 into raw/<UTC date>/ and check the pinned checksum."""
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
            raise ValueError("transform() needs the pinned Chapter 1 workbook")
        path = self.data_root / evidence[0].path
        real = read_control_block(path, SHEET_NAME)
        nominal = read_control_block(path, NOMINAL_SHEET)
        check = build_identity_check(real, nominal)
        observations = observations_from_block(real)
        _check_observations(observations)
        if check["row_count"] != len(observations):
            raise ValueError("Identity check row count does not match observations")
        self._real = real
        self._nominal = nominal
        return observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Total DEL, departmental AME, and other AME in real terms (PSS Table 1.2)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=PSS_LANDING_URL,
            series_id="PSS July 2026 Table 1.2",
            geography=(
                "United Kingdom (K02000001); public sector via departmental "
                "budgets plus Other AME"
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "HM Treasury control totals from PSS July 2026 Table 1.2, "
                "financial-year outturn, £ million, 2025-26 prices. Curated rows "
                "are the published Total DEL, Departmental AME, Other AME, and "
                "this table's Total Managed Expenditure. Identity: Total DEL + "
                "Departmental AME + Other AME = this table's TME. Other AME is "
                "kept, including when it is negative. Total DEL is the published "
                "row, not resource DEL plus capital DEL. In 2025-26, real equals "
                "nominal Table 1.1, including resource DEL 496,670. "
                + GDP_DEFLATOR_NOTE
                + " "
                + OBR_PLAN_DEFLATOR_NOTE
                + " The denominator is this table's real TME, not monthly ONS EBFT."
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
                "Download PSS July 2026 Chapter 1. Read sheet Table_1_2 for the "
                "curated rows. Keep financial years 2021-22 to 2025-26. Curate "
                "Total DEL, Departmental AME, Other AME, and table TME. Do not "
                "curate resource or capital DEL, departmental detail, or Other "
                "AME components. Read Table_1_1 in the same workbook only to prove "
                "the 2025-26 price base (real equals nominal). 2025-26 "
                "observation_status=estimated (first estimate). Notes use series, "
                "classification, role, fy, label, table=1.2, price_base=2025-26, "
                "terms=real. Table TME notes set denominator=hmt-table-tme."
            ),
            revision_notes=(
                "PSS July 2026, file updated 2026-07-29. Outturn only — PESA plan "
                "years 2026-27 to 2028-29 are not in this workbook and are not "
                "in this pin. 2025-26 is the first estimate and can still be revised. "
                + GDP_DEFLATOR_NOTE
            ),
            caveats=(
                "Prices are 2025-26 prices, £ million. "
                + GDP_DEFLATOR_NOTE
                + " "
                + OBR_PLAN_DEFLATOR_NOTE
                + " Denominator is this table's real TME, not monthly EBFT and not TES. "
                "In 2024-25, Total DEL 616,422 + Departmental AME 626,432 + "
                "Other AME 91,603 = table TME 1,334,457. Dropping Other AME leaves "
                "the total short by 91,603. Resource DEL + capital DEL is not "
                "published Total DEL (footnote 7: Scottish Government block grant "
                "adjustments, Table 1.4, sit outside that pair). 2021-22 Other AME "
                "is -202,678. In 2025-26 the four control totals and resource DEL "
                "496,670 equal nominal Table 1.1. Earlier years do not. No "
                "Tax−Spend=Borrow identity. No OSCAR rows. No PESA plan years. "
                + REAL_NOT_EBFT_NOTE
            ),
            status_note=(
                "Financial-year outturn for 2021-22 to 2025-26 from PSS July 2026 "
                "Table 1.2, 2025-26 prices. 2025-26 is a first estimate and can "
                "still be revised. 2025-26 real equals 2025-26 nominal."
            ),
            related_indicator_ids=[
                "tme-del-ame",
                "tes-by-function-real",
                "total-managed-expenditure",
            ],
            open_questions=[
                "Do not deflate monthly total-managed-expenditure to match this table.",
                "PESA plan years after 2025-26 are out of scope.",
                "Do not mix these £ million rows with Table 4.3 £ billion rows.",
            ],
        )


def _write_source_register(data_root: Path) -> Path:
    path = data_root / "source_register.csv"
    fields = ["series", "classification", "role", "label", "table", "curated"]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in CONTROL_ROWS:
            writer.writerow(
                {
                    "series": row.series,
                    "classification": row.classification,
                    "role": row.role,
                    "label": row.label,
                    "table": "1.2",
                    "curated": "true",
                }
            )
        writer.writerow(
            {
                "series": "total-resource-del",
                "classification": "not-curated",
                "role": "excluded",
                "label": "Total resource DEL",
                "table": "1.2",
                "curated": "false",
            }
        )
        writer.writerow(
            {
                "series": "total-capital-del",
                "classification": "not-curated",
                "role": "excluded",
                "label": "Total capital DEL",
                "table": "1.2",
                "curated": "false",
            }
        )
    return path


def _markdown_v4(check: dict[str, object]) -> list[str]:
    lines = [
        "| Financial year | Total DEL | Departmental AME | Other AME | Sum | Table TME |",
        "|----------------|----------:|-----------------:|----------:|----:|----------:|",
    ]
    for row in check["v4"]:  # type: ignore[index]
        assert isinstance(row, dict)
        lines.append(
            f"| {row['fy']} | {format_million(float(row['total_del']))} | "
            f"{format_million(float(row['departmental_ame']))} | "
            f"{format_million(float(row['other_ame']))} | "
            f"{format_million(float(row['table_tme']))} | "
            f"{format_million(float(row['table_tme']))} |"
        )
    return lines


def _spot_not_rebuilt(check: dict[str, object]) -> dict[str, object]:
    for row in check["total_del_not_rebuilt"]:  # type: ignore[index]
        assert isinstance(row, dict)
        if row["fy"] == SPOT_YEAR:
            return row
    raise ValueError(f"Missing {SPOT_YEAR} Total DEL exclusion check")


def _write_readme(data_root: Path, evidence: RawEvidence, check: dict[str, object]) -> Path:
    rebuilt = _spot_not_rebuilt(check)
    price = check["price_base_equals_nominal"]
    assert isinstance(price, dict)
    lines = [
        "# tme-del-ame-real",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** PSS July 2026 Table 1.2, £ million, **2025-26 prices**, United Kingdom, financial year",
        "",
        "Identity: Total DEL + Departmental AME + Other AME = **this table's real TME**.",
        "That denominator is not monthly EBFT, and it is not a deflated EBFT series.",
        "",
        GDP_DEFLATOR_NOTE,
        OBR_PLAN_DEFLATOR_NOTE,
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.tme_del_ame_real",
        "```",
        "",
        "## What is curated",
        "",
        "| Series | Role | Keep? |",
        "|--------|------|-------|",
        "| Total DEL | control total | Yes. The published row |",
        "| Departmental AME | control total | Yes |",
        "| Other AME | control total | Yes. Do not drop it, even when negative |",
        "| Table TME | denominator `hmt-table-tme` | Yes. This real table only |",
        "| Resource DEL, capital DEL | excluded | No. They do not add up to Total DEL |",
        "",
        "## Identity",
        "",
        *_markdown_v4(check),
        "",
        "## Price base — 2025-26 real equals nominal",
        "",
        f"Resource DEL {format_million(float(price['resource_del']))} equals Table 1.1 "
        f"and the kickoff spot {format_million(RESOURCE_DEL_PRICE_BASE)}.",
        f"Total DEL {format_million(float(price['total-del']))}, "
        f"Departmental AME {format_million(float(price['departmental-ame']))}, "
        f"Other AME {format_million(float(price['other-ame']))}, "
        f"table TME {format_million(float(price['table-tme']))}.",
        "Earlier years are higher than the nominal pin because they are restated in 2025-26 prices.",
        "",
        "## Do not rebuild Total DEL",
        "",
        f"{SPOT_YEAR} resource DEL {format_million(float(rebuilt['resource_del']))} + "
        f"capital DEL {format_million(float(rebuilt['capital_del']))} = "
        f"{format_million(float(rebuilt['resource_plus_capital']))}, "
        f"not published Total DEL {format_million(float(rebuilt['published_total_del']))}.",
        "",
        "## Not a real monthly EBFT",
        "",
        REAL_NOT_EBFT_NOTE,
        "The nominal gap between HMT table TME and summed monthly EBFT is documented on `tme-del-ame`.",
        "This package does not divide that monthly series by a deflator.",
        "",
        "## Raw",
        "",
        f"- File: `{evidence.path}`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        f"- Release date on the pin: {OFFICIAL_RELEASE_DATE}",
        "",
        "2025-26 is `estimated` (first outturn estimate). 2021-22 to 2024-25 are `final`.",
        "2021-22 Other AME is negative. That is the published sign.",
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
    rebuilt = _spot_not_rebuilt(check)
    price = check["price_base_equals_nominal"]
    assert isinstance(price, dict)
    lines = [
        f"# QA report — tme-del-ame-real — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Workbook: PSS July 2026 Chapter 1, sheet `Table_1_2`",
        "- Price base: 2025-26 prices. " + GDP_DEFLATOR_NOTE,
        "- " + OBR_PLAN_DEFLATOR_NOTE,
        f"- SHA-256: `{evidence.checksum_sha256}`",
        "- OSCAR: absent (correct)",
        "- PESA plan years: absent (correct)",
        "- Monthly EBFT was not deflated (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| R1 | Total DEL + Departmental AME + Other AME = real table TME, every pinned year | pass | see table |",
        "| R2 | 2025-26 real control totals and resource DEL equal nominal Table 1.1 | pass | "
        f"resource DEL {format_million(RESOURCE_DEL_PRICE_BASE)} |",
        "| R3 | Total DEL is not resource DEL + capital DEL | pass | "
        f"{format_million(float(rebuilt['resource_plus_capital']))} vs "
        f"{format_million(float(rebuilt['published_total_del']))} in {rebuilt['fy']} |",
        "| R4 | Earlier real table TME is not equal to nominal table TME | pass | price base is 2025-26 only |",
        "| R5 | 2025-26 estimated; no plan years; unit is £ million at 2025-26 prices | pass | five outturn years |",
        "| R6 | Other AME kept, including 2021-22 negative | pass | -202,678 |",
        "| R7 | EBFT not deflated; real table TME is not real monthly EBFT | pass | manifest caveats |",
        "",
        f"Curated rows: **{check['row_count']}**.",
        "",
        "## R1 — control totals",
        "",
        *_markdown_v4(check),
        "",
        "## R2 — price base",
        "",
        f"2025-26 resource DEL {format_million(float(price['resource_del']))} "
        f"(Table 1.2 and Table 1.1).",
        f"Total DEL {format_million(float(price['total-del']))}; "
        f"Departmental AME {format_million(float(price['departmental-ame']))}; "
        f"Other AME {format_million(float(price['other-ame']))}; "
        f"table TME {format_million(float(price['table-tme']))}.",
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
    """Fetch → prove the real control totals → write the tme-del-ame-real hand-off."""
    connector = TmeDelAmeRealConnector()
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
    register_path = _write_source_register(connector.data_root)
    readme_path = _write_readme(connector.data_root, evidence, check)
    report_path = _write_validation_report(connector.data_root, evidence, check)
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"identity: {identity_path}")
    print(f"source_register: {register_path}")
    print(f"readme: {readme_path}")
    print(f"validation_report: {report_path}")
    spot = PUBLISHED_ROWS[SPOT_YEAR]
    print(
        "spot 2024-25 real: "
        f"{spot['total-del']} + {spot['departmental-ame']} + {spot['other-ame']} "
        f"= {spot['table-tme']}"
    )
    print(f"spot resource DEL {PRICE_BASE_YEAR}: {RESOURCE_DEL_PRICE_BASE}")
    print(f"first estimate year constant: {FIRST_ESTIMATE_YEAR}")


if __name__ == "__main__":
    main()

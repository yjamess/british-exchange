"""ONS ESA Table 11 — general government expenditure by function.

Approach (plain language):

1. Download three workbooks from the 23 April 2026 release: general government,
   central government, and local government. Refuse a file whose SHA-256 does
   not match the discovery pin.
2. The general-government coversheet says "local government only". That sentence
   is a bad copy. Confirm it against the central and local files, and against
   the year-sheet titles inside the general-government file.
3. Curate only the general-government file. Keep calendar years 1995 to 2024.
   Keep COFOG level 1 and the total, column ``OTE`` (total government
   expenditure), £ million.
4. Do not curate sub-functions. Do not curate the other ESA transaction columns.
   Do not rescale these rows onto TES or onto monthly EBFT.

Reproduce::

    uv run python -m economy.connectors.esa_gg_expenditure_by_function

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

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_workbook import download_ons_file
from economy.connectors.pss_july_2026 import (
    GEO_CODE,
    LICENCE,
    as_million,
    format_million,
    load_sheet_rows,
    normalise_label,
    notes_map,
    require_xlsx,
    structured_notes,
)

INDICATOR_ID = "esa-gg-expenditure-by-function"
CONNECTOR_MODULE = "economy.connectors.esa_gg_expenditure_by_function"
PUBLISHER = "Office for National Statistics"
OFFICIAL_RELEASE_DATE = "2026-04-23"
SOURCE_VERSION = "ONS ESA Table 11 general government (published 2026-04-23)"
UNIT = "£ million, nominal, calendar year"
GEO_LABEL = "United Kingdom (general government)"

# Dataset landing page. The file URL is the raw download.
LANDING_URL = (
    "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
    "publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/current"
)
NOTION_REGISTRY_URL = "https://app.notion.com/p/41965471768581f88f08d3b6a730dc52"

FIRST_YEAR = 1995
LAST_YEAR = 2024
CALENDAR_YEARS: tuple[int, ...] = tuple(range(FIRST_YEAR, LAST_YEAR + 1))
FRONT_SHEETS = ("Coversheet", "Table of contents", "Notes")

SPOT_YEAR = 2024
SPOT_TOTAL = 1_330_532.0
SPOT_HEALTH = 253_191.0
SPOT_EDUCATION = 141_118.0
SPOT_SOCIAL = 458_500.0
# Sibling OTE totals, 2024. Checked, not curated.
SPOT_CG_TOTAL = 1_227_604.0
SPOT_LG_TOTAL = 268_424.0
# TES Health, financial year 2024-25, £ million. A different number on purpose.
TES_HEALTH_FY_2024_25 = 242_429.0

EXPECTED_SERIES = 11
EXPECTED_OBSERVATIONS = EXPECTED_SERIES * len(CALENDAR_YEARS)

_LEVEL1 = re.compile(r"^(GF\d{2}) - (.+)$")
_SUBFUNCTION = re.compile(r"^GF\d{3,} - ")
_TOTAL = re.compile(r"^_T - (.+)$")

# Published ONS names, not the HMT TES names. A rename fails the pin.
LOCKED_LABELS: dict[str, str] = {
    "_T": "Total",
    "GF01": "General Public Services",
    "GF02": "Defence",
    "GF03": "General Public Order & Safety",
    "GF04": "Economic Affairs",
    "GF05": "Environmental Protection",
    "GF06": "Housing & Community Development",
    "GF07": "Health",
    "GF08": "Recreation",
    "GF09": "Education",
    "GF10": "Social Protection",
}
SERIES_BY_CODE: dict[str, str] = {
    "_T": "esa-total",
    "GF01": "esa-gf01-general-public-services",
    "GF02": "esa-gf02-defence",
    "GF03": "esa-gf03-public-order-and-safety",
    "GF04": "esa-gf04-economic-affairs",
    "GF05": "esa-gf05-environmental-protection",
    "GF06": "esa-gf06-housing-and-community",
    "GF07": "esa-gf07-health",
    "GF08": "esa-gf08-recreation",
    "GF09": "esa-gf09-education",
    "GF10": "esa-gf10-social-protection",
}
CODE_ORDER: tuple[str, ...] = tuple(LOCKED_LABELS)


@dataclass(frozen=True, slots=True)
class SectorFile:
    """One ESA Table 11 workbook. Only general government is curated."""

    key: str
    filename: str
    file_url: str
    landing_url: str
    sha256: str
    coversheet_phrase: str
    title_phrase: str


GENERAL = SectorFile(
    key="general-government",
    filename="esatable11generalgovernment.xlsx",
    file_url=(
        "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
        "publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/"
        "current/esatable11generalgovernment.xlsx"
    ),
    landing_url=LANDING_URL,
    sha256="545236391260ca77580cff5d8dba243b35f1e588d48067ed0f02287c7c3afa09",
    # The coversheet copies the local-government sentence. That is the conflict.
    coversheet_phrase=(
        "This table presents annual UK government expenditure for local government only, "
        "broken down by function using the classification of functions of government."
    ),
    title_phrase="for general government only",
)
CENTRAL = SectorFile(
    key="central-government",
    filename="esatable11centralgovernment.xlsx",
    file_url=(
        "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
        "publicspending/datasets/esatable11annualexpenditureofcentralgovernment/"
        "current/esatable11centralgovernment.xlsx"
    ),
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicspending/datasets/esatable11annualexpenditureofcentralgovernment/current"
    ),
    sha256="1de1e5d91531bea990826cf7ed28ff16db7ac7c876621fc264ab2e1930306105",
    coversheet_phrase=(
        "This table presents annual UK government expenditure for central government only, "
        "broken down by function using the classification of functions of government."
    ),
    title_phrase="for central government only",
)
LOCAL = SectorFile(
    key="local-government",
    filename="esatable11localgovernment.xlsx",
    file_url=(
        "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
        "publicspending/datasets/esatable11annualexpenditurelocalgovernment/"
        "current/esatable11localgovernment.xlsx"
    ),
    landing_url=(
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        "publicspending/datasets/esatable11annualexpenditurelocalgovernment/current"
    ),
    sha256="d1d033a590e32132828375a401cebf260ea774e24664af3285ec5203ddef1f04",
    coversheet_phrase=(
        "This table presents annual UK government expenditure for local government only, "
        "broken down by function using the classification of functions of government."
    ),
    title_phrase="for local government only",
)
SECTOR_FILES: tuple[SectorFile, ...] = (GENERAL, CENTRAL, LOCAL)


@dataclass(frozen=True, slots=True)
class SectorRead:
    """OTE level-1 cells plus the coversheet sentence. Sub-functions are counted only."""

    spec: SectorFile
    coversheet: str
    titles: dict[int, str]
    ote: dict[int, dict[str, float]]
    subfunctions_skipped: int


def _require_checksum(path: Path, expected: str) -> str:
    digest = sha256_file(path)
    if digest != expected:
        raise RuntimeError(
            f"Checksum mismatch for {path.name}. Got {digest}, expected pinned {expected}. "
            "Refusing to curate a different ESA Table 11 file."
        )
    return digest


def _joined_text(rows: Sequence[Sequence[object]]) -> str:
    parts: list[str] = []
    for row in rows:
        for cell in row:
            if cell not in (None, ""):
                parts.append(normalise_label(cell))
    return "\n".join(parts)


def _ote_column(rows: Sequence[Sequence[object]], *, context: str) -> tuple[int, int]:
    """Return ``(transaction_row_index, ote_column)``. Exactly one OTE code."""
    for row_index, row in enumerate(rows):
        if not row or normalise_label(row[0]) != "Transaction":
            continue
        columns = [col for col, cell in enumerate(row) if normalise_label(cell) == "OTE"]
        if len(columns) != 1:
            raise ValueError(f"{context}: expected one OTE column, found {columns}")
        column = columns[0]
        if row_index == 0:
            raise ValueError(f"{context}: OTE code has no header row above it")
        header = normalise_label(rows[row_index - 1][column] if column < len(rows[row_index - 1]) else "")
        if "total government expenditure" not in header.casefold() or "£ million" not in header:
            raise ValueError(f"{context}: OTE header is {header!r}")
        return row_index, column
    raise ValueError(f"{context}: no Transaction row")


def read_sector_file(path: Path, spec: SectorFile) -> SectorRead:
    """Read coversheet text and OTE level-1 cells. Do not keep other columns."""
    cover_rows = load_sheet_rows(path, "Coversheet")
    coversheet = _joined_text(cover_rows)
    if spec.coversheet_phrase not in coversheet:
        raise ValueError(
            f"{spec.filename} coversheet is missing the pinned sentence: "
            f"{spec.coversheet_phrase}"
        )
    titles: dict[int, str] = {}
    ote: dict[int, dict[str, float]] = {}
    skipped = 0
    for year in CALENDAR_YEARS:
        sheet = str(year)
        rows = load_sheet_rows(path, sheet)
        if not rows or rows[0] is None:
            raise ValueError(f"{spec.filename} {sheet} has no title")
        title = normalise_label(rows[0][0])
        if spec.title_phrase not in title or str(year) not in title:
            raise ValueError(f"{spec.filename} {sheet} title is not {spec.title_phrase!r}: {title}")
        if "calendar year" not in _joined_text(rows[:6]).casefold():
            raise ValueError(f"{spec.filename} {sheet} does not say it is calendar year data")
        titles[year] = title
        trans_index, column = _ote_column(rows, context=f"{spec.filename} {sheet}")
        found: dict[str, float] = {}
        for row in rows[trans_index + 1 :]:
            if not row:
                continue
            label = normalise_label(row[0] if row else "")
            if not label:
                continue
            code: str | None = None
            published = ""
            total_match = _TOTAL.match(label)
            level_match = _LEVEL1.match(label)
            if total_match:
                code = "_T"
                published = total_match.group(1)
            elif level_match:
                code = level_match.group(1)
                published = level_match.group(2)
            elif _SUBFUNCTION.match(label):
                skipped += 1
                continue
            else:
                raw_value = row[column] if column < len(row) else None
                if raw_value not in (None, ""):
                    raise ValueError(f"Unrecognised valued row on {spec.filename} {sheet}: {label!r}")
                continue
            locked = LOCKED_LABELS[code]
            if published != locked:
                raise ValueError(
                    f"{spec.filename} {sheet} {code} label {published!r} != {locked!r}"
                )
            if code in found:
                raise ValueError(f"Duplicate {code} on {spec.filename} {sheet}")
            value = as_million(row[column] if column < len(row) else None, context=f"{label} / {year}")
            found[code] = value
        missing = [code for code in CODE_ORDER if code not in found]
        if missing:
            raise ValueError(f"{spec.filename} {sheet} is missing {missing}")
        ote[year] = found
    return SectorRead(spec, coversheet, titles, ote, skipped)


def _notes(code: str, year: int) -> str:
    role = "total" if code == "_T" else "function"
    return structured_notes(
        [
            ("series", SERIES_BY_CODE[code]),
            ("classification", "ote"),
            ("role", role),
            ("calendar_year", str(year)),
            ("cofog", code),
            ("label", LOCKED_LABELS[code]),
            ("table", "esa-11"),
            ("column", "OTE"),
            ("sector", "general-government"),
            ("framework", "esa2010"),
            ("year_basis", "calendar"),
        ]
    )


def to_observations(general: SectorRead) -> list[Observation]:
    """Curate general-government OTE only. One row per code per calendar year."""
    if general.spec.key != "general-government":
        raise ValueError(f"Refusing to curate {general.spec.key}")
    observations: list[Observation] = []
    for year in CALENDAR_YEARS:
        for code in CODE_ORDER:
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year}-01-01",
                    period_end=f"{year}-12-31",
                    geography_code=GEO_CODE,
                    geography_label=GEO_LABEL,
                    value=general.ote[year][code],
                    unit=UNIT,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=_notes(code, year),
                )
            )
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, built {len(observations)}"
        )
    return observations


def build_identity_check(
    general: SectorRead,
    central: SectorRead,
    local: SectorRead,
) -> dict[str, object]:
    """Prove OTE spots, the level-1 identity, and the coversheet conflict."""
    identities: list[dict[str, object]] = []
    negative = 0
    for year in CALENDAR_YEARS:
        values = general.ote[year]
        leaf = sum(values[f"GF{number:02d}"] for number in range(1, 11))
        total = values["_T"]
        gap = leaf - total
        if gap != 0:
            raise ValueError(
                f"{year}: COFOG level-1 OTE sums to {leaf}, published total is {total}"
            )
        if any(value < 0 for value in values.values()):
            negative += 1
        identities.append({"calendar_year": year, "ote_total": total, "leaf_minus_total": gap})

    health = general.ote[SPOT_YEAR]["GF07"]
    education = general.ote[SPOT_YEAR]["GF09"]
    social = general.ote[SPOT_YEAR]["GF10"]
    total = general.ote[SPOT_YEAR]["_T"]
    if (total, health, education, social) != (
        SPOT_TOTAL,
        SPOT_HEALTH,
        SPOT_EDUCATION,
        SPOT_SOCIAL,
    ):
        raise ValueError(
            f"2024 OTE spots are total {total}, health {health}, "
            f"education {education}, social protection {social}"
        )
    if health == TES_HEALTH_FY_2024_25:
        raise ValueError("ESA Health 2024 equals TES Health 2024-25. The frameworks were mixed.")

    cg_total = central.ote[SPOT_YEAR]["_T"]
    lg_total = local.ote[SPOT_YEAR]["_T"]
    if cg_total != SPOT_CG_TOTAL or lg_total != SPOT_LG_TOTAL:
        raise ValueError(f"Sibling 2024 OTE totals moved: CG {cg_total}, LG {lg_total}")
    if total in {cg_total, lg_total}:
        raise ValueError("General-government total equals a subsector total")
    if cg_total + lg_total == total:
        raise ValueError(
            "Central plus local equals general government. "
            "That would hide consolidation. Do not rebuild GG from the siblings."
        )
    if "local government only" not in general.coversheet.casefold():
        raise ValueError("Expected the bad coversheet sentence on the general-government file")
    if "general government only" not in general.titles[SPOT_YEAR]:
        raise ValueError("2024 year sheet does not say general government")
    if any("local government only" in title for title in general.titles.values()):
        raise ValueError("A general-government year sheet says local government only")

    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "unit": UNIT,
        "sector": "general-government",
        "year_basis": "calendar",
        "column": "OTE",
        "years": f"{FIRST_YEAR} to {LAST_YEAR}",
        "year_count": len(CALENDAR_YEARS),
        "coversheet_check": {
            "verdict": "general-government-file",
            "coversheet_conflict": True,
            "gg_coversheet_says": "local government only",
            "gg_year_sheets_say": "general government only",
            "cg_coversheet_says": "central government only",
            "lg_coversheet_says": "local government only",
            "ote_2024": {
                "general_government": total,
                "central_government": cg_total,
                "local_government": lg_total,
                "central_plus_local": cg_total + lg_total,
                "central_plus_local_minus_general": cg_total + lg_total - total,
            },
            "siblings_curated": False,
            "note": (
                "The general-government coversheet copies the local-government sentence. "
                "Year sheets, the table of contents, the filename, and the OTE total "
                "identify general government. Central plus local is larger than general "
                "government because transfers between subsectors are consolidated. "
                "Do not add the siblings to rebuild this total."
            ),
        },
        "spot_2024_ote": {
            "total": total,
            "health_gf07": health,
            "education_gf09": education,
            "social_protection_gf10": social,
            "tes_health_fy_2024_25_million": TES_HEALTH_FY_2024_25,
            "equal_to_tes_health": False,
        },
        "level1_identity": identities,
        "years_with_a_negative_ote_cell": negative,
        "subfunctions_skipped": {
            "general_government": general.subfunctions_skipped,
            "central_government_not_curated": central.subfunctions_skipped,
            "local_government_not_curated": local.subfunctions_skipped,
        },
        "residual_function_rows": 0,
        "rescaled_onto_tes_or_ebft": False,
        "row_count": EXPECTED_OBSERVATIONS,
    }


def _check_observations(observations: Sequence[Observation]) -> None:
    if any(obs.unit != UNIT for obs in observations):
        raise ValueError("A row left the calendar-year £ million unit")
    if any(obs.observation_status != "final" for obs in observations):
        raise ValueError("This release does not mark a year estimated")
    seen: set[tuple[str, str]] = set()
    for obs in observations:
        parts = notes_map(obs.notes)
        if parts.get("sector") != "general-government" or parts.get("year_basis") != "calendar":
            raise ValueError("Sector or calendar-year flag missing")
        if parts.get("column") != "OTE" or parts.get("framework") != "esa2010":
            raise ValueError("OTE / ESA flag missing")
        if parts.get("classification") != "ote":
            raise ValueError("Classification must stay ote, not a TES current/capital split")
        if "financial" in obs.unit.casefold() or "billion" in obs.unit.casefold():
            raise ValueError("Financial-year or £ billion unit leaked into ESA")
        key = (parts["series"], parts["calendar_year"])
        if key in seen:
            raise ValueError(f"Duplicate ESA row {key}")
        seen.add(key)
        if obs.period_start[5:] != "01-01" or obs.period_end[5:] != "12-31":
            raise ValueError(f"Period is not a calendar year: {obs.period_start}")
        if obs.value == TES_HEALTH_FY_2024_25 and parts.get("cofog") == "GF07":
            raise ValueError("TES Health was stored as ESA Health")


class EsaGgExpenditureConnector(Connector):
    """ESA Table 11 general government, column OTE. Siblings are a sector check."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._general: SectorRead | None = None
        self._central: SectorRead | None = None
        self._local: SectorRead | None = None

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch_pinned(self) -> list[RawEvidence]:
        """Download GG, CG, and LG into raw/<UTC date>/ and check pinned checksums."""
        day = datetime.now(timezone.utc).date().isoformat()
        evidence: list[RawEvidence] = []
        for spec in SECTOR_FILES:
            relative = f"raw/{day}/{spec.filename}"
            item = download_ons_file(
                spec.file_url,
                self.data_root / relative,
                relative_path=relative,
                official_release_date=OFFICIAL_RELEASE_DATE,
            )
            path = self.data_root / item.path
            require_xlsx(path)
            digest = _require_checksum(path, spec.sha256)
            if digest != item.checksum_sha256:
                raise RuntimeError("In-memory checksum and disk checksum disagree")
            evidence.append(item)
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) != len(SECTOR_FILES):
            raise ValueError("transform() needs the general, central, and local workbooks")
        reads: list[SectorRead] = []
        for item, spec in zip(evidence, SECTOR_FILES, strict=True):
            if not item.path.endswith(spec.filename):
                raise ValueError(f"Expected {spec.filename} in evidence order, got {item.path}")
            reads.append(read_sector_file(self.data_root / item.path, spec))
        general, central, local = reads
        build_identity_check(general, central, local)
        observations = to_observations(general)
        _check_observations(observations)
        self._general = general
        self._central = central
        self._local = local
        return observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="General government expenditure by function (ESA Table 11, OTE)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=LANDING_URL,
            series_id="ONS ESA Table 11 general government, column OTE",
            geography=(
                "United Kingdom general government (ESA 2010 sector S.13, "
                "geography K02000001). Central government plus local government "
                "plus social security funds, after consolidation. Excludes public "
                "corporations. Not the UK public sector used by TES."
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "ONS ESA 2010 Table 11, general government annual expenditure by "
                "UN COFOG, column OTE (total government expenditure). Calendar "
                "years 1995 to 2024, £ million, nominal. Ten level-1 functions "
                "plus the published total. Sub-functions are not curated. This is "
                "not HM Treasury Total Expenditure on Services, not a financial "
                "year, and not monthly EBFT. Health in calendar 2024 is 253,191. "
                "TES Health in financial year 2024-25 is 242,429. Different year, "
                "different sector, different expenditure concept. The workbook "
                "coversheet says local government only. That sentence is a bad "
                "copy: year sheets say general government, and the 2024 OTE total "
                "1,330,532 is not the local-government total 268,424 or the "
                "central-government total 1,227,604. Sibling files are archived "
                "for that check and are not curated."
            ),
            licence=LICENCE,
            agent_owner="economy",
            connector_module=CONNECTOR_MODULE,
            curated_path="curated/observations.csv",
            update_cadence=(
                "ONS publishes ESA Table 11 about once a year. Re-pin on a new "
                "edition; do not overwrite these checksums."
            ),
            raw_evidence=list(evidence),
            notion_registry_url=NOTION_REGISTRY_URL,
            transformations=(
                "Download the 23 April 2026 general, central, and local government "
                "ESA Table 11 workbooks. Curate the general-government file only. "
                "Read calendar-year sheets 1995 to 2024. Keep rows _T and GF01 to "
                "GF10, column OTE only. Skip sub-function rows (GF0101 and below). "
                "Do not keep other transaction columns. Do not rescale onto TES or "
                "EBFT. Do not add central plus local to rebuild the total. Notes "
                "use series, classification=ote, role, calendar_year, cofog, label, "
                "table=esa-11, column=OTE, sector=general-government, "
                "framework=esa2010, year_basis=calendar. observation_status=final "
                "on this vintage. The sheet does not mark 2024 as estimated."
            ),
            revision_notes=(
                "Spreadsheet published 07:00 on 23 April 2026. ONS can revise "
                "these calendar years in the next annual ESA Table 11. Compare "
                "sha256 before replacing the raw workbooks. The general-government "
                "coversheet sentence that says local government only is retained "
                "as evidence of the bad copy. It is not the sector of this pin."
            ),
            caveats=(
                "Calendar year. General government (S.13). £ million. Column OTE. "
                "Not TES. Not EBFT. Not financial-year PESA. Health ESA calendar "
                "2024 is 253,191. TES Health financial year 2024-25 is 242,429. "
                "Do not draw them on one axis and do not rescale one onto the other. "
                "Level-1 rows sum exactly to the published total in every pinned "
                "year. No residual function. Central government 2024 OTE total is "
                "1,227,604 and local government is 268,424. Their sum is not "
                "1,330,532, because general government consolidates transfers "
                "between subsectors. The coversheet says local government only. "
                "Treat that as a bad copy. No OSCAR rows. No Tax−Spend=Borrow identity."
            ),
            status_note=(
                "Calendar years 1995 to 2024 from ONS ESA Table 11 general "
                "government, published 23 April 2026. Column OTE, £ million. "
                "Not a financial-year TES series. Later ONS editions can revise "
                "these years."
            ),
            related_indicator_ids=[
                "tes-by-function",
                "tes-by-function-long-run",
                "total-managed-expenditure",
            ],
            open_questions=[
                "Do not rescale ESA Table 11 onto tes-by-function or onto monthly EBFT.",
                "Central and local sibling workbooks are evidence for the coversheet check only.",
                "A chart of this series needs its own calendar-year, general-government label.",
            ],
        )


def _write_source_register(data_root: Path) -> Path:
    path = data_root / "source_register.csv"
    fields = ["series", "classification", "role", "cofog", "label", "table", "sector", "curated"]
    rows: list[dict[str, str]] = []
    for code in CODE_ORDER:
        rows.append(
            {
                "series": SERIES_BY_CODE[code],
                "classification": "ote",
                "role": "total" if code == "_T" else "function",
                "cofog": code,
                "label": LOCKED_LABELS[code],
                "table": "esa-11",
                "sector": "general-government",
                "curated": "true",
            }
        )
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return path


def _write_readme(data_root: Path, evidence: Sequence[RawEvidence], check: dict[str, object]) -> Path:
    spot = check["spot_2024_ote"]
    cover = check["coversheet_check"]
    assert isinstance(spot, dict)
    assert isinstance(cover, dict)
    ote = cover["ote_2024"]
    assert isinstance(ote, dict)
    general_evidence = evidence[0]
    lines = [
        "# esa-gg-expenditure-by-function",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** ONS ESA Table 11, general government, column OTE, £ million, calendar year",
        "",
        "This is general government expenditure on an ESA basis. It is not TES and it is not monthly EBFT.",
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.esa_gg_expenditure_by_function",
        "```",
        "",
        "## What is curated",
        "",
        "| Role | What | Chart as a function slice? |",
        "|------|------|----------------------------|",
        "| `function` | Ten COFOG level-1 rows, column OTE | Yes, these ten only |",
        "| `total` | Published `_T` total government expenditure | No. It is the total |",
        "",
        "Sub-functions (GF0101 and below) are not curated. Other transaction columns are not curated.",
        "Central and local government workbooks are not curated.",
        "",
        f"History: **{check['years']}** ({check['year_count']} calendar years). "
        "Every curated row is `final` on this vintage. ONS can still revise them.",
        "",
        "## Spot — calendar 2024, OTE, £ million",
        "",
        f"Total **{format_million(float(spot['total']))}**. "
        f"Health GF07 **{format_million(float(spot['health_gf07']))}**. "
        f"Education GF09 **{format_million(float(spot['education_gf09']))}**. "
        f"Social protection GF10 **{format_million(float(spot['social_protection_gf10']))}**.",
        "",
        f"TES Health, financial year 2024-25, is **{format_million(float(spot['tes_health_fy_2024_25_million']))}** "
        "£ million. That is a different year, a different sector, and a different concept. "
        "It is not stored in this package.",
        "",
        "Level-1 rows sum exactly to the published total in every pinned year. No residual was added.",
        "",
        "## Coversheet check",
        "",
        "Verdict: **general-government file**. The coversheet conflict is real.",
        "",
        "| File | What the coversheet says | What the 2024 sheet says | 2024 OTE total | Curated? |",
        "|------|--------------------------|--------------------------|---------------:|----------|",
        f"| General government | {cover['gg_coversheet_says']} | {cover['gg_year_sheets_say']} | "
        f"{format_million(float(ote['general_government']))} | Yes |",
        f"| Central government | {cover['cg_coversheet_says']} | central government only | "
        f"{format_million(float(ote['central_government']))} | No |",
        f"| Local government | {cover['lg_coversheet_says']} | local government only | "
        f"{format_million(float(ote['local_government']))} | No |",
        "",
        f"Central plus local = **{format_million(float(ote['central_plus_local']))}**, which is "
        f"**{format_million(float(ote['central_plus_local_minus_general']))}** above the "
        "general-government total. Do not add the siblings to rebuild general government.",
        "",
        str(cover["note"]),
        "",
        "## Raw",
        "",
        f"- Curated file: `{general_evidence.path}`",
        f"- SHA-256: `{general_evidence.checksum_sha256}`",
        f"- Release date on the pin: {OFFICIAL_RELEASE_DATE}",
        "- Sibling checksums are in `manifest.yaml`. They are the sector check, not a second series.",
        "",
        "Docs: `docs/handover-economy-07-longrun-esa.md`",
        "",
    ]
    path = data_root / "README.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _write_validation_report(
    data_root: Path,
    evidence: Sequence[RawEvidence],
    check: dict[str, object],
) -> Path:
    stamp = datetime.now(timezone.utc).date().isoformat()
    spot = check["spot_2024_ote"]
    cover = check["coversheet_check"]
    assert isinstance(spot, dict)
    assert isinstance(cover, dict)
    ote = cover["ote_2024"]
    assert isinstance(ote, dict)
    lines = [
        f"# QA report — esa-gg-expenditure-by-function — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Curated workbook: ONS ESA Table 11 general government, column OTE",
        "- Sector check only: central government and local government workbooks, same release",
        f"- SHA-256 (general government): `{evidence[0].checksum_sha256}`",
        "- Years: calendar 1995 to 2024. Not financial years.",
        "- Unit: £ million, nominal.",
        "- TES and EBFT: not in this package (correct)",
        "- OSCAR: absent (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| E1 | 2024 OTE total = 1,330,532 | pass | "
        f"{format_million(float(spot['total']))} |",
        "| E2 | 2024 OTE Health GF07 = 253,191; Education 141,118; Social protection 458,500 | pass | "
        "published cells |",
        "| E3 | Level-1 OTE sums exactly to the published total, every calendar year | pass | no residual |",
        "| E4 | Coversheet says local government only; year sheets say general government | pass | bad copy |",
        "| E5 | 2024 OTE total is not CG 1,227,604 and not LG 268,424 | pass | siblings not curated |",
        "| E6 | Central plus local is not rebuilt into general government | pass | "
        f"gap {format_million(float(ote['central_plus_local_minus_general']))} |",
        "| E7 | Health 253,191 is not TES Health 242,429; no rescale onto TES or EBFT | pass | different concept |",
        "| E8 | Calendar-year periods; unit is £ million; sub-functions skipped | pass | "
        f"{check['year_count']} years |",
        "",
        f"Curated rows: **{check['row_count']}**.",
        "",
        "## Coversheet",
        "",
        str(cover["note"]),
        "",
        "## Summary",
        "",
        "- Overall: **pass** (Economy self-QA)",
        "- Coversheet check: **general-government file** (coversheet sentence is a bad copy)",
        "- Blockers for Ready: independent Validation `EC-VAL-07E`",
        "",
    ]
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    """Fetch → prove ESA Table 11 → write the general-government hand-off."""
    connector = EsaGgExpenditureConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch_pinned()
    for item in evidence:
        print(f"raw: {item.path}")
        print(f"sha256: {item.checksum_sha256}")
    observations = connector.transform(evidence)
    if connector._general is None or connector._central is None or connector._local is None:
        raise RuntimeError("transform() did not keep the sector reads")
    check = build_identity_check(connector._general, connector._central, connector._local)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
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
    spot = check["spot_2024_ote"]
    cover = check["coversheet_check"]
    assert isinstance(spot, dict)
    assert isinstance(cover, dict)
    print(
        "spot 2024 OTE £ million: "
        f"Total {spot['total']}; Health {spot['health_gf07']}; "
        f"Education {spot['education_gf09']}; Social protection {spot['social_protection_gf10']}"
    )
    print(f"coversheet verdict: {cover['verdict']}")


if __name__ == "__main__":
    main()

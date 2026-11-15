"""PSS July 2026 Table 1.1 — DEL, AME, and table TME (Economy Domain 07).

Approach (plain language):

1. Download the accredited PSS Chapter 1 workbook and refuse it if the
   SHA-256 does not match the discovery pin.
2. Read sheet ``Table_1_1`` only. Keep five outturn years, 2021-22 to 2025-26.
3. Curate four published rows: Total DEL, Departmental AME, Other AME, and
   this table's TME. Keep Other AME, including years when it is negative.
4. Do not rebuild Total DEL from resource DEL + capital DEL. Those lines are
   read only to prove they are a different number, then left out of the CSV.
5. Prove ``Total DEL + Departmental AME + Other AME = table TME`` for every year.

The denominator is this table's TME, not monthly EBFT.

Reproduce::

    uv run python -m economy.connectors.tme_del_ame

Refs: pathlib, typing, PEP 8, openpyxl, docs/connector-contract.md.
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

INDICATOR_ID = "tme-del-ame"
CONNECTOR_MODULE = "economy.connectors.tme_del_ame"
SHEET_NAME = "Table_1_1"
RAW_NAME = "July_PSS_2026_Chapter_1.xlsx"
# Discovery read on 2026-11-15. A new PSS file must be reviewed, not silently pinned.
EXPECTED_SHA256 = "ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe"
FILE_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6a5749ec2f6185941a9a6519/July_PSS_2026_Chapter_1.xlsx"
)
NOTION_REGISTRY_URL = "https://app.notion.com/p/419654717685815dbb3de6db75d6a00d"

EXPECTED_OBSERVATIONS = 20
SPOT_YEAR = "2024-25"

# Published control totals, £ million. Same cells as the discovery matrix.
# Other AME is negative in 2021-22. That sign stays.
PUBLISHED_ROWS: dict[str, dict[str, float]] = {
    "2021-22": {
        "total-del": 534_892.0,
        "departmental-ame": 673_115.0,
        "other-ame": -167_119.0,
        "table-tme": 1_040_888.0,
    },
    "2022-23": {
        "total-del": 541_362.0,
        "departmental-ame": 407_356.0,
        "other-ame": 211_974.0,
        "table-tme": 1_160_692.0,
    },
    "2023-24": {
        "total-del": 558_434.0,
        "departmental-ame": 542_776.0,
        "other-ame": 129_597.0,
        "table-tme": 1_230_807.0,
    },
    "2024-25": {
        "total-del": 595_892.0,
        "departmental-ame": 605_568.0,
        "other-ame": 88_552.0,
        "table-tme": 1_290_012.0,
    },
    "2025-26": {
        "total-del": 639_807.0,
        "departmental-ame": 622_645.0,
        "other-ame": 97_670.0,
        "table-tme": 1_360_122.0,
    },
}

# Footnote 6: Total DEL is not this pair. 2024-25 spot from the same sheet.
RESOURCE_DEL_2024_25 = 469_578.0
CAPITAL_DEL_2024_25 = 111_587.0


@dataclass(frozen=True, slots=True)
class ControlRow:
    """One published control total on the Table 1.1 'of which' block."""

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


@dataclass(frozen=True, slots=True)
class Table11Parse:
    """Four curated series, plus the resource/capital DEL lines we refuse to add."""

    observations: list[Observation]
    resource_del: dict[str, float]
    capital_del: dict[str, float]


def _notes(row: ControlRow, financial_year: str) -> str:
    fields: list[tuple[str, str]] = [
        ("series", row.series),
        ("classification", row.classification),
        ("role", row.role),
        ("fy", financial_year),
        ("label", row.label),
        ("table", "1.1"),
    ]
    if row.role == "table-tme":
        fields.append(("denominator", "hmt-table-tme"))
    return structured_notes(fields)


def _year_values(row: Sequence[object], year_cols: Sequence[int], *, context: str) -> dict[str, float]:
    out: dict[str, float] = {}
    for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
        out[financial_year] = as_million(row[col], context=f"{context} / {financial_year}")
    return out


def parse_table_1_1(path: Path) -> Table11Parse:
    """Read the four control totals. Detail rows above them are not curated."""
    rows = load_sheet_rows(path, SHEET_NAME)
    header_index, label_col, year_cols = find_outturn_header(rows)
    observations: list[Observation] = []
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
            resource_del = _year_values(raw, year_cols, context=label)
            continue
        if key == "total capital del":
            capital_del = _year_values(raw, year_cols, context=label)
            continue
        spec = CONTROL_BY_KEY.get(key)
        if spec is None:
            continue
        if spec.series in seen:
            raise ValueError(f"Duplicate Table 1.1 control row: {label!r}")
        seen.add(spec.series)
        for financial_year, col in zip(OUTTURN_YEARS, year_cols, strict=True):
            value = as_million(raw[col], context=f"{spec.label} / {financial_year}")
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

    missing = {row.series for row in CONTROL_ROWS} - seen
    if missing:
        raise ValueError(f"Table 1.1 missing control rows: {sorted(missing)}")
    if not resource_del or not capital_del:
        raise ValueError("Resource DEL or capital DEL row was not found to exclude")
    if len(observations) != EXPECTED_OBSERVATIONS:
        raise ValueError(
            f"Expected {EXPECTED_OBSERVATIONS} observations, parsed {len(observations)}"
        )
    return Table11Parse(observations, resource_del, capital_del)


def _index(observations: Sequence[Observation]) -> dict[tuple[str, str], float]:
    out: dict[tuple[str, str], float] = {}
    for obs in observations:
        parts = notes_map(obs.notes)
        key = (parts["series"], parts["fy"])
        if obs.value is None:
            raise ValueError(f"Missing value for {key}")
        out[key] = obs.value
    return out


def build_identity_check(parsed: Table11Parse) -> dict[str, object]:
    """Prove V4 for every pinned year, and that Total DEL was not rebuilt."""
    index = _index(parsed.observations)
    v4: list[dict[str, object]] = []
    for financial_year in OUTTURN_YEARS:
        published = PUBLISHED_ROWS[financial_year]
        values = {
            series: index[(series, financial_year)]
            for series in ("total-del", "departmental-ame", "other-ame", "table-tme")
        }
        for series, expected in published.items():
            if values[series] != expected:
                raise ValueError(
                    f"{financial_year} {series} is {values[series]}, published anchor {expected}"
                )
        total = values["total-del"] + values["departmental-ame"] + values["other-ame"]
        if total != values["table-tme"]:
            raise ValueError(
                f"V4 failed {financial_year}: "
                f"{values['total-del']} + {values['departmental-ame']} + {values['other-ame']} "
                f"= {total}, table TME {values['table-tme']}"
            )
        if values["table-tme"] != PUBLISHED_TABLE_TME[financial_year]:
            raise ValueError(f"{financial_year} table TME does not match Table 5.4's published TME")
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

    resource = parsed.resource_del[SPOT_YEAR]
    capital = parsed.capital_del[SPOT_YEAR]
    total_del = index[("total-del", SPOT_YEAR)]
    if resource != RESOURCE_DEL_2024_25 or capital != CAPITAL_DEL_2024_25:
        raise ValueError(
            f"Resource/capital DEL spot moved: {resource} + {capital}. "
            "Refusing to guess a new Total DEL."
        )
    rebuilt = resource + capital
    if rebuilt == total_del:
        raise ValueError(
            "Resource DEL + capital DEL equals published Total DEL. "
            "Footnote 6 says Total DEL excludes Scottish Government block grant adjustments."
        )

    series_ids = {notes_map(obs.notes)["series"] for obs in parsed.observations}
    if series_ids != {"total-del", "departmental-ame", "other-ame", "table-tme"}:
        raise ValueError(f"Unexpected series in the DEL pin: {series_ids}")
    if any("oscar" in obs.notes.casefold() for obs in parsed.observations):
        raise ValueError("OSCAR text was curated")
    for obs in parsed.observations:
        financial_year = notes_map(obs.notes)["fy"]
        if obs.observation_status != status_for_year(financial_year):
            raise ValueError(f"Bad status on {financial_year}")
        if financial_year not in OUTTURN_YEARS:
            raise ValueError(f"Plan year curated: {financial_year}")
    if index[("other-ame", "2021-22")] >= 0:
        raise ValueError("2021-22 Other AME must keep its published negative sign")

    return {
        "pass": True,
        "indicator_id": INDICATOR_ID,
        "v4": v4,
        "total_del_not_rebuilt": {
            "fy": SPOT_YEAR,
            "resource_del": resource,
            "capital_del": capital,
            "resource_plus_capital": rebuilt,
            "published_total_del": total_del,
            "curated_resource_or_capital_del": False,
        },
        "row_count": len(parsed.observations),
    }


class TmeDelAmeConnector(Connector):
    """Table 1.1 control-total pin. One workbook, four series."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=120.0)
        self._parsed: Table11Parse | None = None

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
        parsed = parse_table_1_1(self.data_root / evidence[0].path)
        build_identity_check(parsed)
        self._parsed = parsed
        return parsed.observations

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        gap = read_ebft_gap(PUBLISHED_TABLE_TME)
        return Manifest(
            indicator_id=self.indicator_id,
            title="Total DEL, departmental AME, and other AME (PSS Table 1.1)",
            sector="economy-public-finance",
            publisher=PUBLISHER,
            source_url=PSS_LANDING_URL,
            series_id="PSS July 2026 Table 1.1",
            geography=(
                "United Kingdom (K02000001); public sector via departmental "
                "budgets plus Other AME"
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "HM Treasury control totals from PSS July 2026 Table 1.1, "
                "financial-year outturn, £ million, nominal. Curated rows are "
                "the published Total DEL, Departmental AME, Other AME, and this "
                "table's Total Managed Expenditure. Identity: Total DEL + "
                "Departmental AME + Other AME = this table's TME. Other AME is "
                "kept, including when it is negative. Total DEL is the published "
                "row, not resource DEL plus capital DEL. The denominator is this "
                "table's TME, not monthly ONS EBFT, and not TES."
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
                "Download PSS July 2026 Chapter 1. Read sheet Table_1_1 only. "
                "Keep financial years 2021-22 to 2025-26. Curate Total DEL, "
                "Departmental AME, Other AME, and table TME from the published "
                "of-which block. Do not curate resource or capital DEL, "
                "departmental detail, or Other AME components. "
                "2025-26 observation_status=estimated (first estimate). Notes use "
                "series, classification, role, fy, label, table=1.1. Table TME "
                "notes set denominator=hmt-table-tme."
            ),
            revision_notes=(
                "PSS July 2026, file updated 2026-07-29. Outturn only — PESA plan "
                "years 2026-27 to 2028-29 are not in this workbook and are not "
                "in this pin. 2025-26 is the first estimate and can still be revised."
            ),
            caveats=(
                "Denominator is this table's TME, not monthly EBFT and not TES. "
                "In 2024-25, Total DEL 595,892 + Departmental AME 605,568 + "
                "Other AME 88,552 = table TME 1,290,012. Dropping Other AME "
                "leaves the total short by 88,552. Resource DEL 469,578 + "
                "capital DEL 111,587 = 581,165, which is not Total DEL 595,892 "
                "(footnote 6: Scottish Government block grant adjustments sit "
                "outside that pair). 2021-22 Other AME is -167,119. No "
                "Tax−Spend=Borrow identity. No OSCAR rows. No PESA plan years. "
                "Central government gross debt interest sits inside Other AME "
                "and is not merged with public-sector-debt-interest (NMFX). "
                + ebft_gap_sentences(gap)
            ),
            status_note=(
                "Financial-year outturn for 2021-22 to 2025-26 from PSS July 2026. "
                "2025-26 is a first estimate and can still be revised."
            ),
            related_indicator_ids=[
                "tes-by-function",
                "total-managed-expenditure",
                "public-sector-debt-interest",
            ],
            open_questions=[
                "Table 1.2 real terms is not in this pin.",
                "PESA plan years after 2025-26 are out of scope.",
                "Do not rescale these financial-year rows onto monthly EBFT.",
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
                    "table": "1.1",
                    "curated": "true",
                }
            )
        writer.writerow(
            {
                "series": "total-resource-del",
                "classification": "not-curated",
                "role": "excluded",
                "label": "Total resource DEL",
                "table": "1.1",
                "curated": "false",
            }
        )
        writer.writerow(
            {
                "series": "total-capital-del",
                "classification": "not-curated",
                "role": "excluded",
                "label": "Total capital DEL",
                "table": "1.1",
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


def _write_readme(
    data_root: Path,
    evidence: RawEvidence,
    check: dict[str, object],
    gap: EbftGapNote,
) -> Path:
    rebuilt = check["total_del_not_rebuilt"]
    assert isinstance(rebuilt, dict)
    lines = [
        "# tme-del-ame",
        "",
        "**Owner:** Economy agent",
        "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready",
        f"**indicator_id:** `{INDICATOR_ID}`",
        "**Source:** PSS July 2026 Table 1.1, £ million, United Kingdom, financial year",
        "",
        "Identity: Total DEL + Departmental AME + Other AME = **this table's TME**.",
        "That denominator is not monthly EBFT and not TES.",
        "",
        "## Reproduce",
        "",
        "```bash",
        "uv run python -m economy.connectors.tme_del_ame",
        "```",
        "",
        "## What is curated",
        "",
        "| Series | Role | Keep? |",
        "|--------|------|-------|",
        "| Total DEL | control total | Yes. The published row |",
        "| Departmental AME | control total | Yes |",
        "| Other AME | control total | Yes. Do not drop it, even when negative |",
        "| Table TME | denominator `hmt-table-tme` | Yes. This table only |",
        "| Resource DEL, capital DEL | excluded | No. They do not add up to Total DEL |",
        "",
        "## Identity",
        "",
        *_markdown_v4(check),
        "",
        "## Do not rebuild Total DEL",
        "",
        f"2024-25 resource DEL {format_million(float(rebuilt['resource_del']))} + "
        f"capital DEL {format_million(float(rebuilt['capital_del']))} = "
        f"{format_million(float(rebuilt['resource_plus_capital']))}, "
        f"not published Total DEL {format_million(float(rebuilt['published_total_del']))}.",
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
        "2021-22 Other AME is negative. That is the published sign.",
        "",
        "Docs: `docs/handover-economy-07-function-pin.md`",
        "",
    ]
    path = data_root / "README.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _write_validation_report(
    data_root: Path,
    evidence: RawEvidence,
    check: dict[str, object],
    gap: EbftGapNote,
) -> Path:
    stamp = datetime.now(timezone.utc).date().isoformat()
    rebuilt = check["total_del_not_rebuilt"]
    assert isinstance(rebuilt, dict)
    lines = [
        f"# QA report — tme-del-ame — {stamp}",
        "",
        "Economy self-QA. **Not** independent Validation and **not** Registry Ready.",
        "",
        "## Scope",
        "",
        f"- Package: `data/economy/{INDICATOR_ID}/`",
        f"- Connector: `{CONNECTOR_MODULE}`",
        "- Workbook: PSS July 2026 Chapter 1, sheet `Table_1_1`",
        f"- SHA-256: `{evidence.checksum_sha256}`",
        "- OSCAR: absent (correct)",
        "- PESA plan years: absent (correct)",
        "",
        "## Checks",
        "",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        "| V4 | Total DEL + Departmental AME + Other AME = table TME, every pinned year | pass | see table |",
        "| V5 | Denominator is this table's TME, not monthly EBFT; no Tax−Spend=Borrow; no OSCAR | pass | manifest caveats |",
        "| V6 | 2025-26 estimated; no plan years | pass | five outturn years only |",
        "| V7 | OSCAR files absent | pass | correct for this pin |",
        f"| DEL | Total DEL is not resource DEL + capital DEL | pass | "
        f"{format_million(float(rebuilt['resource_plus_capital']))} vs "
        f"{format_million(float(rebuilt['published_total_del']))} in {rebuilt['fy']} |",
        "| Sign | 2021-22 Other AME stays negative | pass | -167,119 |",
        "",
        f"Curated rows: **{check['row_count']}**.",
        "",
        "## V4 — control totals",
        "",
        *_markdown_v4(check),
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
    """Fetch → prove the control-total identity → write the tme-del-ame hand-off."""
    connector = TmeDelAmeConnector()
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
    register_path = _write_source_register(connector.data_root)
    readme_path = _write_readme(connector.data_root, evidence, check, gap)
    report_path = _write_validation_report(connector.data_root, evidence, check, gap)
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"identity: {identity_path}")
    print(f"source_register: {register_path}")
    print(f"readme: {readme_path}")
    print(f"validation_report: {report_path}")
    spot = PUBLISHED_ROWS[SPOT_YEAR]
    print(
        "spot 2024-25: "
        f"{spot['total-del']} + {spot['departmental-ame']} + {spot['other-ame']} "
        f"= {spot['table-tme']}"
    )


if __name__ == "__main__":
    main()

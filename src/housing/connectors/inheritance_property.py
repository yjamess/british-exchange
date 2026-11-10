"""HMRC Inheritance Tax — UK residential buildings in estates passing on death.

Aggregate evidence for "The Transfer of Property Wealth" (ownership phase 5).
One national total per tax year of death. Never a property-by-property chain.

Source table: HMRC "Assets in estates by range of net estate and tax due".
It was Table 12.4 up to the July 2022 release and Table 12.3 from July 2023.
Each annual edition covers one tax year of death, so the series is built from
twelve pinned editions: the live July 2026 file plus earlier files recovered
from the UK Government Web Archive (their GOV.UK asset URLs now redirect to
the current edition).

Columns used: the "Total" column of sheet 12.xa (all net-estate bands).
Rows used: UK residential buildings, total gross capital, total net capital —
each a number of estates and an amount in £ million.

Coverage is not constant. For deaths before 1 January 2022 the population
includes excepted (non-taxpaying) estates that filed a reduced return such as
IHT205. From 1 January 2022 excepted estates no longer report their assets, so
from 2022-23 the table covers only estates that filed a full IHT400 account.
2021-22 is a part-year mix. The ``category`` dimension records this.

Ref: https://www.gov.uk/government/statistics/inheritance-tax-liabilities-statistics
"""

from __future__ import annotations

import re
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "estates-residential-property"
PIN_DIR = "raw/2026-11-10"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/inheritance-tax-liabilities-statistics"
)
SOURCE_VERSION = (
    "HMRC Inheritance Tax assets in estates by range of net estate "
    "(Table 12.4 to July 2022, Table 12.3 from July 2023), "
    "editions July 2015 to 30 July 2026"
)
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"

UKGWA = "https://webarchive.nationalarchives.gov.uk/ukgwa"
_OLD_UPLOADS = "https://www.gov.uk/government/uploads/system/uploads/attachment_data/file"
_ASSET_UPLOADS = (
    "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/"
    "attachment_data/file"
)
_MEDIA = "https://assets.publishing.service.gov.uk/media"


@dataclass(frozen=True, slots=True)
class Edition:
    """One annual release; each covers a single tax year of death."""

    release_date: str
    death_year: int  # first calendar year of the tax year, e.g. 2023 = 2023-24
    table: str
    filename: str
    url: str


EDITIONS: tuple[Edition, ...] = (
    Edition("2015-07-30", 2012, "12.4", "2015-07_table_12_4.xls",
            f"{UKGWA}/20151009id_/{_OLD_UPLOADS}/449202/Table12-4.xls"),
    Edition("2016-07-29", 2013, "12.4", "2016-07_table_12_4.xls",
            f"{UKGWA}/20161126id_/{_OLD_UPLOADS}/541410/Table_12-4.xls"),
    Edition("2017-07-28", 2014, "12.4", "2017-07_table_12_4.xls",
            f"{UKGWA}/20170908id_/{_OLD_UPLOADS}/632843/Table_12-4.xls"),
    Edition("2018-07-31", 2015, "12.4", "2018-07_table_12_4.xlsx",
            f"{UKGWA}/20180912064548id_/{_ASSET_UPLOADS}/730131/Table_12_4.xlsx"),
    Edition("2019-09-19", 2016, "12.4", "2019-09_table_12_4.xlsx",
            f"{UKGWA}/20191022id_/{_ASSET_UPLOADS}/832094/Table_12_4.xlsx"),
    Edition("2020-07-30", 2017, "12.4", "2020-07_table_12_4.xlsx",
            f"{UKGWA}/20200904id_/{_ASSET_UPLOADS}/903207/Table_12_4.xlsx"),
    Edition("2021-07-29", 2018, "12.4", "2021-07_table_12_4.ods",
            f"{UKGWA}/20210910id_/{_ASSET_UPLOADS}/1004278/Table_12_4.ods"),
    Edition("2022-07-28", 2019, "12.4", "2022-07_table_12_4.ods",
            f"{UKGWA}/20220910id_/{_ASSET_UPLOADS}/1092701/Table_12_4.ods"),
    Edition("2023-07-26", 2020, "12.3", "2023-07_table_12_3.ods",
            f"{UKGWA}/20231001id_/{_ASSET_UPLOADS}/1172681/Table_12_3.ods"),
    Edition("2024-07-31", 2021, "12.3", "2024-07_table_12_3.ods",
            f"{UKGWA}/20240910id_/{_MEDIA}/669fe13b0808eaf43b50d5ba/table_12_3_publication.ods"),
    Edition("2025-07-31", 2022, "12.3", "2025-07_table_12_3.ods",
            f"{UKGWA}/20250910id_/{_MEDIA}/6888efb2e1a850d72c40919a/table_12_3.ods"),
    Edition("2026-07-30", 2023, "12.3", "2026-07_table_12_3.ods",
            f"{_MEDIA}/6a60bb8534dfb74772f96d28/table_12_3_final.ods"),
)

# (series id prefix, label regex). Each yields "<id>-estates" and "<id>-value".
TARGETS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("residential", re.compile(r"UK residential", re.I)),
    ("gross-capital", re.compile(r"gross capital", re.I)),
    ("net-capital", re.compile(r"total net capital", re.I)),
)

_SHEET_RE = re.compile(r"12[._ ]?[34]a|by estate size", re.I)
_YEAR_RE = re.compile(r"death in (?:the tax year )?(\d{4})\s*(?:-|to)\s*(\d{2,4})", re.I)

_T = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
_O = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"


def _coverage(death_year: int) -> str:
    if death_year <= 2020:
        return "returns-incl-excepted-estates"
    if death_year == 2021:
        return "transition-excepted-to-dec-2021"
    return "full-iht-accounts-only"


def _read_ods(path: Path) -> list[list[object]]:
    """Read the 12.xa sheet using typed office:value cells, not display text."""
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    for sheet in root.iter(f"{{{_T}}}table"):
        if not _SHEET_RE.search(sheet.get(f"{{{_T}}}name", "")):
            continue
        rows: list[list[object]] = []
        for row in sheet.iter(f"{{{_T}}}table-row"):
            cells: list[object] = []
            for cell in row.findall(f"{{{_T}}}table-cell"):
                repeat = int(cell.get(f"{{{_T}}}number-columns-repeated", "1"))
                raw = cell.get(f"{{{_O}}}value")
                value: object = float(raw) if raw is not None else "".join(cell.itertext())
                if repeat > 50 and value == "":
                    continue
                cells.extend([value] * min(repeat, 50))
            rows.append(cells)
        return rows
    raise ValueError(f"No 12.xa sheet in {path.name}")


def _read_grid(path: Path) -> list[list[object]]:
    suffix = path.suffix.lower()
    if suffix == ".ods":
        return _read_ods(path)
    if suffix == ".xls":
        import xlrd

        book = xlrd.open_workbook(path)
        sheet = next(s for s in book.sheets() if _SHEET_RE.search(s.name))
        return [sheet.row_values(r) for r in range(sheet.nrows)]
    import openpyxl

    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheet = next(book[n] for n in book.sheetnames if _SHEET_RE.search(n))
    return [list(r) for r in sheet.iter_rows(values_only=True)]


def _text(value: object) -> str:
    return " ".join(str(value or "").split())


def _number(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None  # "..", "[c]" and blanks are suppressed or absent


def parse_edition(path: Path, edition: Edition) -> dict[str, float]:
    """Return {series: value} from the Total column of one edition."""
    grid = _read_grid(path)

    year_match = None
    for row in grid[:12]:
        for cell in row:
            year_match = year_match or _YEAR_RE.search(_text(cell))
    if year_match is None or int(year_match.group(1)) != edition.death_year:
        raise ValueError(f"{path.name}: expected deaths in {edition.death_year}, got {year_match}")

    total_col = next(
        (i for row in grid for i, c in enumerate(row) if _text(c) == "Total"), None
    )
    if total_col is None:
        raise ValueError(f"{path.name}: no Total column")

    def at(row: list[object]) -> float | None:
        return _number(row[total_col]) if total_col < len(row) else None

    out: dict[str, float] = {}
    for idx, row in enumerate(grid):
        labels = [_text(c) for c in row[:total_col] if isinstance(c, str)]
        joined = " ".join(labels)
        for series, pattern in TARGETS:
            if not pattern.search(joined):
                continue
            if joined.startswith("Number of estates containing"):
                key, value = f"{series}-estates", at(row)
            elif joined.startswith("Amount of"):
                key, value = f"{series}-value", at(row)
            elif "Number" in labels:
                key, value = f"{series}-estates", at(row)
                amount_row = next(
                    (r for r in grid[idx + 1 : idx + 4]
                     if any(_text(c).startswith("Amount") for c in r[:total_col])),
                    None,
                )
                if amount_row is not None and f"{series}-value" not in out:
                    amount = at(amount_row)
                    if amount is not None:
                        out[f"{series}-value"] = amount
            else:
                continue
            if value is not None and key not in out:
                out[key] = value

    expected = {f"{s}-{m}" for s, _ in TARGETS for m in ("estates", "value")}
    if set(out) != expected:
        raise ValueError(f"{path.name}: missing {sorted(expected - set(out))}")
    return out


UNITS = {"estates": "estates", "value": "gbp-millions"}


def build_observations(data_root: Path) -> list[Observation]:
    out: list[Observation] = []
    for edition in EDITIONS:
        values = parse_edition(data_root / PIN_DIR / edition.filename, edition)
        start = f"{edition.death_year}-04-06"
        end = f"{edition.death_year + 1}-04-05"
        coverage = _coverage(edition.death_year)
        for series, value in sorted(values.items()):
            measure = series.rsplit("-", 1)[1]
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=UNITS[measure],
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        f"series={series}; category={coverage}; "
                        f"basis=tax-year-of-death; table={edition.table}a; "
                        f"edition={edition.release_date}"
                    ),
                )
            )
    return out


class InheritancePropertyConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID), timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK residential property in estates passing on death",
            sector="housing-land",
            publisher="HM Revenue & Customs",
            source_url=SOURCE_LANDING,
            series_id=(
                "Inheritance Tax liabilities statistics Table 12.3a (from July 2023; "
                "Table 12.4a in Inheritance Tax statistics to July 2022): assets in "
                "estates by range of net estate, Total column"
            ),
            geography=f"{UK_LABEL} ({UK_CODE})",
            frequency="annual",
            unit="gbp-millions (value series) or estates (count series)",
            definition=(
                "For estates of people who died in each UK tax year (6 April to "
                "5 April) and were notified to HMRC on Inheritance Tax returns: "
                "residential-value is the total value of UK residential buildings "
                "held in those estates, before reliefs and exemptions and before "
                "deducting mortgages; residential-estates is the number of those "
                "estates holding any UK residential buildings. gross-capital-* and "
                "net-capital-* are total gross assets and net estate (assets less "
                "liabilities) for the same estates, so a residential share can be "
                "derived. These are estates notified for probate that filed a "
                "return (taxpaying and non-taxpaying), not taxpaying estates only."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.inheritance_property",
            curated_path="curated/observations.csv",
            update_cadence="Annually each July with the HMRC Inheritance Tax liabilities statistics",
            raw_evidence=list(evidence),
            transformations=(
                "One pinned workbook per annual edition (12 editions). From sheet "
                "12.4a / 12.3a read the 'Total' column for UK residential buildings, "
                "total gross capital value and total net capital value (number and "
                "£ million). The death-year in each title is checked against the "
                "edition. Earlier editions come from UK Government Web Archive "
                "captures because their GOV.UK asset URLs now redirect to the "
                "current file. No values are derived or summed."
            ),
            caveats=(
                "Aggregate only: national totals for all estates in a year, not "
                "the inheritance of individual homes and not a property chain. "
                "Year basis is the tax year of death, not the year the property "
                "passed or was sold. Coverage changes (category dimension): to "
                "2020-21 the population includes excepted, non-taxpaying estates "
                "that filed reduced returns (about 270,000 to 310,000 estates); "
                "from 1 January 2022 excepted estates no longer report assets, so "
                "2022-23 onward covers only estates filing a full IHT400 account "
                "(about 69,000); 2021-22 is a part-year mix. Do not read the drop "
                "after 2021-22 as a fall in property passing on death. These are "
                "not taxpaying estates only: most estates in the table pay no tax. "
                "Estates passing without a grant of representation or return are "
                "not covered. Values are probate valuations before reliefs and "
                "exemptions; residential value is gross of mortgages. Counts in "
                "older editions are sample-weighted, and later editions round to "
                "three significant figures. Figures may be under-estimates where "
                "returns were not yet recorded when HMRC extracted the data."
            ),
            revision_notes=(
                "Ownership phase 5 ingest 2026-11-10. Each tax year comes from its "
                "own first-published edition; HMRC does not republish earlier years."
            ),
            related_indicator_ids=["household-net-property-wealth"],
            open_questions=[
                "Table 12.3b (by tax due) could give a taxpaying-only subset, but "
                "band cells are rounded and suppressed; not summed here.",
            ],
        )

    def pin_editions(self) -> list[RawEvidence]:
        """Download any missing edition, then return evidence (latest first)."""
        evidence: list[RawEvidence] = []
        for edition in EDITIONS:
            rel = f"{PIN_DIR}/{edition.filename}"
            path = self.data_root / rel
            if path.is_file():
                evidence.append(
                    RawEvidence(
                        path=rel,
                        retrieved_at=datetime.fromtimestamp(
                            path.stat().st_mtime, timezone.utc
                        ).isoformat(),
                        checksum_sha256=sha256_file(path),
                        official_release_date=edition.release_date,
                        source_url=edition.url,
                    )
                )
                continue
            result = self.fetch_url(
                edition.url, rel, official_release_date=edition.release_date
            )
            if result.path.read_bytes()[:2] not in (b"PK", b"\xd0\xcf"):
                raise ValueError(f"{edition.url} did not return a spreadsheet")
            evidence.append(result.evidence)
        evidence.reverse()
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return build_observations(self.data_root)


def main() -> None:
    connector = InheritancePropertyConnector()
    evidence = connector.pin_editions()
    observations = connector.transform(evidence)
    connector.write_hand_off(evidence, observations)
    print(f"{INDICATOR_ID}: obs={len(observations)}")
    for obs in observations:
        if obs.period_start.startswith("2023-") or obs.period_start.startswith("2020-"):
            print(f"  {obs.period_start} {obs.notes.split(';')[0]}: {obs.value} {obs.unit}")


if __name__ == "__main__":
    main()

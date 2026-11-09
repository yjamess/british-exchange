"""ONS Wealth and Assets Survey — household net property wealth.

Net property wealth is a household's self-valuation of property it owns, minus
mortgage debt. It is not a Land Registry price and not the FCA mortgage book.

Table 3.8 percentiles and Table 3.9 aggregates are repeated survey rounds.
Table 3.19 is the share of people living in households in each wealth band,
for April 2020 to March 2022 only. That round's accreditation was suspended
(ONS notice, 13 June 2025). The published cells are kept, with that caveat.

Ref: https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/propertywealthwealthingreatbritain
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-05"
STAGING_FILE = "propertywealthtables.xlsx"
PINNED_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "propertywealthwealthingreatbritain/"
    "july2006tojune2016andapril2014tomarch2022/propertywealthtables.xlsx"
)
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "propertywealthwealthingreatbritain"
)
OFFICIAL_RELEASE_DATE = "2025-01-24"
SOURCE_VERSION = (
    "ONS property wealth tables, July 2006 to June 2016 and "
    "April 2014 to March 2022 edition, released 24 January 2025"
)
GB_CODE = "K03000001"
GB_LABEL = "Great Britain"

# Header text in the workbook, after newlines are collapsed, to survey bounds.
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

# Table 3.8 excel rows. Percentiles are pounds.
PERCENTILE_ROWS: tuple[tuple[int, str], ...] = (
    (6, "p25-property-owners"),
    (7, "p25-all-households"),
    (9, "median-property-owners"),
    (10, "median-all-households"),
    (12, "p75-property-owners"),
    (13, "p75-all-households"),
)

# Table 3.19, April 2020 to March 2022 block. Columns are wealth bands.
AGE_ROWS: tuple[tuple[int, str], ...] = (
    (95, "age-under-16"),
    (96, "age-16-24"),
    (97, "age-25-34"),
    (98, "age-35-44"),
    (99, "age-45-54"),
    (100, "age-55-64"),
    (101, "age-65-plus"),
    (102, "age-all-persons"),
)
BANDS: tuple[tuple[int, str], ...] = (
    (2, "do-not-own"),
    (3, "under-50"),
    (4, "50-to-125"),
    (5, "125-to-250"),
    (6, "250-to-375"),
    (7, "375-to-500"),
    (8, "500-or-more"),
)


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
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _obs(
    *,
    start: str,
    end: str,
    value: float,
    unit: str,
    notes: str,
) -> Observation:
    return Observation(
        indicator_id="household-net-property-wealth",
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


def parse_property_wealth(path: Path) -> list[Observation]:
    """Read Tables 3.8, 3.9 and 3.19 from the pinned workbook."""
    book = openpyxl.load_workbook(path, data_only=True)
    out: list[Observation] = []

    sheet = book["3.8"]
    for col in range(2, sheet.max_column + 1):
        bounds = ROUND_BOUNDS.get(_norm(sheet.cell(4, col).value))
        if bounds is None:
            continue
        start, end = bounds
        for row, series in PERCENTILE_ROWS:
            value = _number(sheet.cell(row, col).value)
            if value is None:
                continue
            out.append(
                _obs(
                    start=start,
                    end=end,
                    value=value,
                    unit="gbp",
                    notes=(
                        f"series={series}; measure=stock; "
                        "definition=net-property-wealth; table=3.8"
                    ),
                )
            )

    sheet = book["3.9"]
    for col in range(2, sheet.max_column + 1):
        bounds = ROUND_BOUNDS.get(_norm(sheet.cell(4, col).value))
        if bounds is None:
            continue
        start, end = bounds
        value = _number(sheet.cell(8, col).value)
        if value is None:
            continue
        out.append(
            _obs(
                start=start,
                end=end,
                value=value,
                unit="gbp-billions",
                notes=(
                    "series=aggregate-net; measure=stock; "
                    "definition=net-property-wealth; table=3.9"
                ),
            )
        )

    # One cross-section. People are classified by their household's wealth.
    start, end = ROUND_BOUNDS["April 2020 to March 2022"]
    sheet = book["3.19"]
    for row, series in AGE_ROWS:
        for col, band in BANDS:
            value = _number(sheet.cell(row, col).value)
            if value is None:
                continue
            out.append(
                _obs(
                    start=start,
                    end=end,
                    value=value,
                    unit="percent",
                    notes=(
                        f"series={series}; band={band}; measure=share; "
                        "definition=household-net-property-wealth; table=3.19; "
                        "round=april-2020-to-march-2022"
                    ),
                )
            )

    if len(out) < 100:
        raise ValueError(f"Expected the published wealth tables, got {len(out)} rows")
    return out


class PropertyWealthConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "household-net-property-wealth"))

    @property
    def indicator_id(self) -> str:
        return "household-net-property-wealth"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Household net property wealth",
            sector="housing-land",
            publisher="Office for National Statistics",
            source_url=SOURCE_LANDING,
            series_id="Wealth and Assets Survey Tables 3.8, 3.9 and 3.19",
            geography=GB_LABEL,
            frequency="ad_hoc",
            unit="£, £ billion, or percent of people",
            definition=(
                "Net property wealth is self-valued property minus mortgage debt. "
                "Percentiles are for households. The age table is the share of "
                "people living in households in each band, including people who "
                "do not themselves own the home."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.property_wealth",
            curated_path="curated/observations.csv",
            update_cadence="When ONS publishes a new Wealth and Assets Survey wealth table",
            raw_evidence=list(evidence),
            transformations=(
                "Read Table 3.8 percentile rows, Table 3.9 aggregate net property "
                "wealth, and the April 2020 to March 2022 block of Table 3.19. "
                "Survey-round headers map to the round's start and end dates."
            ),
            caveats=(
                "Accreditation of the Wealth and Assets Survey was suspended from "
                "the April 2020 to March 2022 round (ONS, 13 June 2025). Values "
                "are self-reported, Great Britain, and not Land Registry prices. "
                "The lower quartile for all households is £0 because households "
                "without property are included. Do not read the age table as "
                "personal wealth, and do not treat the aggregate as inheritance."
            ),
            revision_notes="Domain 09 ingest 2026-11-05. Edition released 24 January 2025.",
            related_indicator_ids=["residential-mortgage-book", "mortgage-approvals"],
        )

    def evidence_from_pinned(self) -> RawEvidence:
        rel = f"{PIN_DIR}/{STAGING_FILE}"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_property_wealth(self.data_root / evidence[0].path)


def main() -> None:
    staging = HOUSING_DATA / "_ownership_pin" / "2026-11-05" / STAGING_FILE
    dest_dir = HOUSING_DATA / "household-net-property-wealth" / PIN_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / STAGING_FILE
    if not staging.is_file():
        raise FileNotFoundError(staging)
    if not dest.is_file() or sha256_file(dest) != sha256_file(staging):
        shutil.copy2(staging, dest)

    connector = PropertyWealthConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    median = next(
        o
        for o in observations
        if o.period_start == "2020-04-01" and "series=median-all-households" in o.notes
    )
    owners = next(
        o
        for o in observations
        if o.period_start == "2020-04-01" and "series=median-property-owners" in o.notes
    )
    print(f"household-net-property-wealth: obs={len(observations)}")
    print(f"Apr 2020–Mar 2022 median, all households £: {median.value}")
    print(f"Apr 2020–Mar 2022 median, property owners £: {owners.value}")


if __name__ == "__main__":
    main()

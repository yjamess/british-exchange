"""English Housing Survey — household-based Domain 07 measures (Space layer).

Source: 2024-25 EHS headline report, *Housing quality and energy efficiency*
Chapter 1 annex tables (published 2026-01-29).

- ``ehs-overcrowding`` — AT1.2 share of households overcrowded under the
  bedroom standard, by tenure, 1995-96 to 2024-25. **Three-year moving
  averages** (labelled year = last of the three survey years).
- ``ehs-under-occupation`` — AT1.3 share of households under-occupying (two or
  more bedrooms above the bedroom standard), by tenure, 1995-96 to 2024-25.
  Single survey years (no averaging note; single-year sample sizes).
- ``ehs-damp-mould-reported`` — AT1.11 households saying "my home has
  problems with condensation, damp or mould", by tenure, and what the
  surveyor recorded in those homes (2-year household sample, 2024).

Base is **households** (EHS household interview sample), not dwellings.
1995-96 to 2007-08 are Survey of English Housing; 2008-09 onwards EHS.
Periods are survey (financial) years; for three-year averages the period
spans all three years. No values are derived.

Run:
  uv run python -m housing.connectors.ehs_household_measures
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.connectors.ehs_da_parse import parse_cell
from housing.connectors.ehs_pins import ANNEX_QUALITY_2024_25, PINS, pin_into
from housing.ods_util import read_ods_sheet

ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
UNIT = "percent of households"
SOURCE_VERSION = "EHS 2024-25 headline report Ch1 housing quality annex (2026-01-29)"
TENURE_COLS = {2: "owner-occupied", 3: "private-rented", 4: "social-rented", 5: "all-tenures"}


@dataclass(frozen=True, slots=True)
class Spec:
    indicator_id: str
    title: str
    sheet: str
    table: str
    series: str
    definition: str
    caveats: str
    three_year_average: bool


SPECS: tuple[Spec, ...] = (
    Spec(
        indicator_id="ehs-overcrowding",
        title="EHS overcrowding (bedroom standard)",
        sheet="AT1_2",
        table="AT1.2",
        series="overcrowded",
        definition=(
            "Share of households in England with fewer bedrooms than the bedroom "
            "standard requires (overcrowded), by tenure. Three-year moving average."
        ),
        caveats=(
            "Household base (EHS / SEH household interview), not dwellings. Every "
            "value is a three-year moving average: the labelled year is the last of "
            "the three survey years and period_start/period_end span all three. "
            "1995-96 to 2007-08 Survey of English Housing; 2008-09 onwards EHS full "
            "household sample. 2020-21 to 2022-23 averages include pandemic-affected "
            "fieldwork with much smaller samples (pooled sample in notes). Not "
            "published by dwelling type, dwelling age or region in this table."
        ),
        three_year_average=True,
    ),
    Spec(
        indicator_id="ehs-under-occupation",
        title="EHS under-occupation (bedroom standard)",
        sheet="AT1_3",
        table="AT1.3",
        series="under-occupied",
        definition=(
            "Share of households in England with two or more bedrooms more than "
            "the bedroom standard requires (under-occupied), by tenure."
        ),
        caveats=(
            "Household base, not dwellings. Single survey years (AT1.3 carries no "
            "averaging note and single-year sample sizes) — unlike ehs-overcrowding, "
            "which is a three-year average; do not plot the two as one comparable "
            "pair without saying so. 1995-96 to 2007-08 Survey of English Housing. "
            "2020-21 sample is very small (7,474 households). Not published by "
            "dwelling type, dwelling age or region in this table."
        ),
        three_year_average=False,
    ),
)


def _fy_period(label: str, *, years: int) -> tuple[str, str]:
    """'2024-25' → financial year(s) ending 31 March 2025."""
    match = re.match(r"^(\d{4})-(\d{2})$", label.strip())
    if not match:
        raise ValueError(f"not a survey year label: {label!r}")
    end_year = int(match.group(1)) + 1
    start_year = end_year - years
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def _blocks(rows: list[list[str]]) -> dict[str, dict[str, list[str]]]:
    """``{'thousands'|'percentages'|'sample': {year_label: row}}``."""
    blocks: dict[str, dict[str, list[str]]] = {}
    current = ""
    for row in rows[4:]:
        marker = " ".join(c.strip().lower() for c in row[2:] if c.strip())
        label = row[1].strip() if len(row) > 1 else ""
        if not re.match(r"^\d{4}-\d{2}$", label):
            if marker.startswith("thousands"):
                current = "thousands"
            elif marker == "percentages":
                current = "percentages"
            elif marker == "sample size":
                current = "sample"
            continue
        if current:
            blocks.setdefault(current, {})[label] = row
    for name in ("thousands", "percentages", "sample"):
        if name not in blocks:
            raise ValueError(f"block {name!r} not found")
    return blocks


def parse_bedroom_standard(path: Path, spec: Spec) -> list[Observation]:
    rows = read_ods_sheet(path, spec.sheet)
    header = " ".join(c.strip().lower().replace(" ", "") for c in rows[4])
    for needle in ("owneroccupiers", "privaterenters", "socialrenters", "alltenures"):
        if needle not in header:
            raise ValueError(f"{spec.table}: tenure header changed ({needle} missing)")
    blocks = _blocks(rows)
    out: list[Observation] = []
    for label, row in blocks["percentages"].items():
        start, end = _fy_period(label, years=3 if spec.three_year_average else 1)
        survey = "survey-of-english-housing" if int(label[:4]) < 2008 else "english-housing-survey"
        for col, tenure in TENURE_COLS.items():
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            value, status = parsed
            thousands = blocks["thousands"].get(label, [])
            sample = blocks["sample"].get(label, [])
            parts = [
                f"series={spec.series}",
                f"tenure={tenure}",
                "breakdown=none",
                "observation-type="
                + ("survey-estimate-3-year-average" if spec.three_year_average else "survey-estimate"),
                f"table={spec.table}",
                "geography=England",
                "base=households",
                "measure=bedroom-standard",
                f"survey-year-label={label}",
                f"survey={survey}",
            ]
            if spec.three_year_average:
                parts.append("averaging=3-year-moving-average-ending-labelled-year")
            if col < len(thousands) and thousands[col].strip():
                parts.append(f"households-000s={thousands[col].strip().replace(',', '')}")
            if col < len(sample) and sample[col].strip():
                key = "sample-unweighted-pooled-3-years" if spec.three_year_average else "sample-unweighted"
                parts.append(f"{key}={sample[col].strip().replace(',', '')}")
            if status == "suppressed":
                parts.append("suppression=u")
            out.append(
                Observation(
                    indicator_id=spec.indicator_id,
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="; ".join(parts),
                )
            )
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


REPORTED_COLS = {
    4: "owner-occupied",
    5: "private-rented",
    6: "local-authority",
    7: "housing-association",
    8: "social-rented",
    9: "all-tenures",
}
REPORTED_ROWS = {
    # (group, row label) → (series, base)
    ("mentioned", "mentioned"): ("resident-reports-damp-mould", "all-occupied-households"),
    ("surveyor", "problem with damp"): ("of-reporters-surveyor-damp", "households-reporting-damp-mould"),
    ("surveyor", "multiple problems with damp"): ("of-reporters-surveyor-multiple-damp", "households-reporting-damp-mould"),
    ("surveyor", "category 1 damp hazard"): ("of-reporters-category-1-damp-hazard", "households-reporting-damp-mould"),
}


def parse_reported_damp(path: Path) -> list[Observation]:
    """AT1.11 — resident-reported condensation, damp or mould vs surveyor findings."""
    rows = read_ods_sheet(path, "AT1_11")
    header = " ".join(c.strip().lower().replace(" ", "") for c in rows[4])
    for needle in ("owneroccupiers", "privaterenters", "localauthority", "housingassociation", "socialrenters", "alltenures"):
        if needle not in header:
            raise ValueError(f"AT1.11 header changed ({needle} missing)")
    pct_start = next(i for i, r in enumerate(rows) if any(c.strip().lower() == "percentages" for c in r))
    sample_rows = {
        (r[1].strip().lower() if len(r) > 1 else ""): r
        for r in rows[pct_start:]
        if len(r) > 1 and r[1].strip()
    }
    sample_all = next((r for k, r in sample_rows.items() if k == "all households"), [])
    sample_mentioned = next(
        (r for k, r in sample_rows.items() if k.startswith('"my home') and any(c.strip() for c in r[2:])),
        [],
    )
    start, end = "2023-04-01", "2025-03-31"
    out: list[Observation] = []
    group = ""
    for row in rows[pct_start + 1 :]:
        label = row[1].strip().lower() if len(row) > 1 else ""
        if not label:
            continue
        if label == "sample size" or any(c.strip().lower() == "sample size" for c in row[2:]):
            break
        if label.startswith('"my home') and " - " in label:
            group = "surveyor"
            continue
        if label.startswith('"my home'):
            group = "mentioned"
            continue
        key = REPORTED_ROWS.get((group, label))
        if key is None:
            continue
        series, base = key
        sample_row = sample_all if base == "all-occupied-households" else sample_mentioned
        for col, tenure in REPORTED_COLS.items():
            parsed = parse_cell(row[col]) if col < len(row) else None
            if parsed is None:
                continue
            value, status = parsed
            parts = [
                f"series={series}",
                f"tenure={tenure}",
                "breakdown=none",
                "observation-type=survey-estimate",
                "table=AT1.11",
                "geography=England",
                f"base={base}",
                "sample-design=2-year-household-sample-2023-24-and-2024-25",
                "resident-reported=true" if series == "resident-reports-damp-mould" else "surveyor-recorded-within-reporting-homes=true",
            ]
            if col < len(sample_row) and sample_row[col].strip():
                parts.append(f"sample-unweighted={sample_row[col].strip().replace(',', '')}")
            out.append(
                Observation(
                    indicator_id="ehs-damp-mould-reported",
                    period_start=start,
                    period_end=end,
                    geography_code=ENGLAND_CODE,
                    geography_label=ENGLAND_LABEL,
                    value=value,
                    unit=UNIT,
                    observation_status=status,
                    source_version=SOURCE_VERSION,
                    notes="; ".join(parts),
                )
            )
    if not out:
        raise ValueError("AT1.11 parsed no rows")
    return out


class EhsHouseholdConnector(Connector):
    def __init__(self, indicator_id: str, title: str, definition: str, caveats: str, series_id: str) -> None:
        self._id = indicator_id
        self.title = title
        self.definition = definition
        self.caveats = caveats
        self.series_id = series_id
        super().__init__(HOUSING_DATA / indicator_id)

    @property
    def indicator_id(self) -> str:
        return self._id

    def evidence(self) -> list[RawEvidence]:
        return pin_into(self.data_root, ["CH1_QUALITY"])

    def annex_path(self, evidence: Sequence[RawEvidence]) -> Path:
        return self.data_root / evidence[0].path

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self._id,
            title=self.title,
            sector="housing-land",
            publisher="MHCLG · English Housing Survey",
            source_url=ANNEX_QUALITY_2024_25,
            series_id=self.series_id,
            geography="England (E92000001) — household sample survey estimates",
            frequency="annual",
            unit=UNIT,
            definition=self.definition,
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.ehs_household_measures",
            curated_path="curated/observations.csv",
            update_cadence="annual (EHS headline report annex)",
            raw_evidence=list(evidence),
            transformations=(
                "Read the percentages block of the annex sheet; attach published "
                "thousands and unweighted sample sizes as notes. No derivation."
            ),
            caveats=self.caveats,
            revision_notes="2026-11-04: initial ingest for Domain 07 Space / damp layers.",
            related_indicator_ids=[
                "ehs-overcrowding",
                "ehs-under-occupation",
                "ehs-damp-mould-reported",
                "ehs-damp-surveyor",
                "ehs-decent-homes",
            ],
            notion_registry_url="",
            open_questions=[
                "Live tables FA1422 (full bedroom-standard distribution) and FT1421 "
                "were last updated 2024/2023 and stop at 2022-23 / 2021-22 — not ingested.",
            ],
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:  # pragma: no cover - set per id
        raise NotImplementedError


class BedroomStandardConnector(EhsHouseholdConnector):
    def __init__(self, spec: Spec) -> None:
        self.spec = spec
        super().__init__(spec.indicator_id, spec.title, spec.definition, spec.caveats, f"EHS 2024-25 annex {spec.table}")

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        return parse_bedroom_standard(self.annex_path(evidence), self.spec)


class ReportedDampConnector(EhsHouseholdConnector):
    def __init__(self) -> None:
        super().__init__(
            "ehs-damp-mould-reported",
            "EHS resident-reported condensation, damp or mould",
            (
                "Share of occupied households in England whose household reference "
                "person says 'my home has problems with condensation, damp or mould' "
                "(resident-reports-damp-mould), and — among those households — the "
                "share where the EHS surveyor recorded a damp problem, multiple damp "
                "problems, or a Category 1 damp hazard."
            ),
            (
                "Household base with two different denominators: "
                "resident-reports-damp-mould uses all occupied households; the "
                "of-reporters-* series use households that mentioned the problem "
                "(see base= on each row). 2-year household sample (2023-24 and "
                "2024-25), so period spans April 2023–March 2025. Resident perception "
                "is not the surveyor-recorded HHSRS damp measure (ehs-damp-surveyor). "
                "Single 2024 snapshot only — no time series, region, dwelling age or "
                "dwelling type breakdown is published."
            ),
            "EHS 2024-25 annex AT1.11",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        return parse_reported_damp(self.annex_path(evidence))


def connectors() -> list[EhsHouseholdConnector]:
    return [*(BedroomStandardConnector(s) for s in SPECS), ReportedDampConnector()]


def main() -> None:
    assert "CH1_QUALITY" in PINS
    for connector in connectors():
        evidence = connector.evidence()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        latest = [o for o in observations if "tenure=all-tenures" in o.notes][-1:]
        print(
            f"{connector.indicator_id}: rows={len(observations)} "
            f"{observations[0].period_start}→{observations[-1].period_end} "
            f"latest all-tenures={[(o.period_start, o.value) for o in latest]}"
        )


if __name__ == "__main__":
    main()

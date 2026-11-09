"""English Housing Survey — Domain 07 lived experience of housing quality.

Three indicators, all England, all published EHS annex / live-table cells:

- ``ehs-thermal-comfort`` (survey-response) — households unable to keep
  comfortably warm in the living room in cold winter weather, homes that get
  uncomfortably hot, both / neither, rooms affected by overheating, and the
  energy actions 'reduced heating' / 'limited energy use' (responses to rising
  energy prices). 2024 dwelling sample / 2024-25 household subsample:
  * PIQ AT2.9  — by tenure (owner occupied, private rented, LA, HA, social)
  * PIQ AT2.11 — rooms affected by overheating, by tenure
  * PIQ AT2.12 / AT2.13 — by household age composition (65+, under 5)
  * Weather fact sheet AT1.1 / AT1.2 — by dwelling type and construction
    (wall) type × tenure (owner occupied, private rented, social rented)
  * Weather fact sheet AT1.3 — overheating only / cold only / both / neither,
    by tenure and dwelling type
- ``ehs-repairs-satisfaction`` (survey-response) — satisfaction with the way
  the landlord (or freeholder / agent) carries out repairs and maintenance:
  * FT5421 — renters by tenure, 1994-95 to 2024-25 (5-point scale + nets)
  * PIQ AT3.1 — 2024-25 leaseholders and renters, by housing quality
    (decent / non-decent / damp present / no damp)
  * PIQ AT3.2 — private renters by who is responsible for repairs
  * PIQ AT3.3 — main reason for dissatisfaction, by tenure
- ``ehs-accessibility-adaptations`` — surveyor-recorded accessibility
  ('visitability') features 2009 and 2018 (survey-estimate) and household
  need for / lack of adaptations, 2014-15 and 2019-20 (survey-response).

Notes follow the ``ehs_quality_indicators`` convention: ``series``,
``tenure``, ``breakdown`` (none | dwelling-type | construction-type |
household-composition | housing-quality | repair-responsibility |
age-of-oldest-person-needing-adaptation), ``<breakdown>=<slug>``,
``category=<breakdown>:<slug>``, ``observation-type``, ``table``, ``base``,
``question=…``, published thousands and unweighted sample sizes. 'u' →
suppressed; nothing is derived. Complement rows (e.g. 'able to keep warm',
'suitable accommodation') are not emitted where the published complement
is exactly 100 minus the emitted share — QA checks the pair.

Run:
  uv run python -m housing.connectors.ehs_lived_experience
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA
from housing.connectors.ehs_da_parse import parse_cell
from housing.connectors.ehs_pins import (
    COLLECTION_SATISFACTION,
    PINS,
    REPORT_ACCESSIBILITY_2018,
    REPORT_ADAPTATIONS_2019_20,
    REPORT_PIQ_2024_25,
    REPORT_WEATHER_2024_25,
    pin_into,
)
from housing.ods_util import read_ods_sheet

ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
# 2024 dwelling sample = fieldwork April 2023 – March 2025 (two survey years);
# the PIQ / weather household-subsample tables share its sample sizes.
SPAN_2024 = ("2023-04-01", "2025-03-31")
MARKERS = {
    "thousands of dwellings": "thousands",
    "thousands of households": "thousands",
    "percentages": "percentages",
    "sample sizes": "sample",
    "sample size": "sample",
}


def _norm(text: str) -> str:
    return " ".join(text.strip().lower().replace("’", "'").split())


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _norm(text)).strip("-")


def _num(text: str) -> str:
    return text.strip().replace(",", "")


# ---------------------------------------------------------------------------
# Generic annex block reader
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Block:
    """``cells[(section, group, label)] = row`` for one annex sheet."""

    cells: dict[tuple[str, str, str], list[str]] = field(default_factory=dict)

    def get(self, section: str, group: str, label: str) -> list[str] | None:
        return self.cells.get((section, _norm(group), _norm(label)))


def read_blocks(rows: list[list[str]], *, label_col: int = 1, start: int = 3) -> Block:
    """Split an EHS annex sheet into thousands / percentages / sample sections.

    A row whose non-label cells contain only a marker ('percentages', …)
    starts a section; a label with no values is a group header; a label with
    values is a category row.
    """
    block = Block()
    section, group = "", ""
    for row in rows[start:]:
        if not row:
            continue
        label = row[label_col].strip() if len(row) > label_col else ""
        rest = [c.strip() for c in row[label_col + 1 :]]
        values = [c for c in rest if c]
        lowered = {_norm(c) for c in values}
        if values and lowered <= set(MARKERS) and not label:
            section = MARKERS[_norm(values[-1])]
            group = ""
            continue
        if _norm(label).startswith(("note", "source", "1)", "2)", "3)", "4)")):
            break
        if not label:
            continue
        if not values:
            group = _norm(label)
            continue
        if _norm(label) in MARKERS and MARKERS[_norm(label)] == "sample":
            block.cells[("sample", "", "all")] = row
            continue
        block.cells[(section, group, _norm(label))] = row
    return block


def _check_header(rows: list[list[str]], needles: Iterable[str], table: str, *, upto: int = 8) -> None:
    text = " ".join(" ".join(r) for r in rows[:upto]).lower().replace(" ", "")
    for needle in needles:
        if needle.replace(" ", "") not in text:
            raise ValueError(f"{table}: header changed ({needle!r} missing)")


# ---------------------------------------------------------------------------
# Row spec → Observation
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Row:
    series: str
    tenure: str
    value: float | None
    status: ObservationStatus
    raw: str
    table: str
    period: tuple[str, str]
    observation_type: str
    base: str
    unit: str
    breakdown: str = "none"
    category: str = ""
    extra: list[str] = field(default_factory=list)

    def key(self) -> tuple[str, ...]:
        return (self.period[0], self.series, self.tenure, self.breakdown, self.category)


def _notes(row: Row) -> str:
    parts = [f"series={row.series}", f"tenure={row.tenure}", f"breakdown={row.breakdown}"]
    if row.breakdown != "none":
        parts += [f"{row.breakdown}={row.category}", f"category={row.breakdown}:{row.category}"]
    parts += [
        f"observation-type={row.observation_type}",
        f"table={row.table}",
        "geography=England",
        f"base={row.base}",
    ]
    if row.status == "suppressed":
        parts.append("suppression=u-unweighted-count-1-to-4")
    elif row.status == "missing":
        parts.append(f"not-published=published-as-{row.raw or 'blank'}")
    parts += row.extra
    parts.append("not-individual-property=true")
    return "; ".join(parts)


def _cell(
    row: list[str] | None, col: int, **kw: object
) -> Row | None:
    if row is None or col >= len(row):
        return None
    parsed = parse_cell(row[col])
    if parsed is None:
        return None
    value, status = parsed
    if value is not None and not 0.0 <= value <= 100.0:
        raise ValueError(f"{kw.get('table')} {kw.get('series')}: {value} is not a percentage")
    return Row(value=value, status=status, raw=row[col].strip(), **kw)  # type: ignore[arg-type]


def _extra_counts(thousands: list[str] | None, sample: list[str] | None, col: int, unit_key: str, sample_key: str) -> list[str]:
    out: list[str] = []
    if thousands is not None and col < len(thousands) and _num(thousands[col]) not in ("", "u"):
        out.append(f"{unit_key}={_num(thousands[col])}")
    if sample is not None and col < len(sample) and _num(sample[col]):
        out.append(f"{sample_key}={_num(sample[col])}")
    return out


# ---------------------------------------------------------------------------
# Thermal comfort
# ---------------------------------------------------------------------------

Q_WARM = (
    "question=able to keep comfortably warm in the living room during cold winter "
    "weather (HRP or main respondent; 'no' = unable)"
)
Q_HOT = (
    "question=home gets uncomfortably hot at any time of the year and unable to "
    "cool it down ('overheating', HRP or main respondent)"
)
Q_REDUCE = (
    "question=response to rising energy prices — mentioned any of: cut down the "
    "hours the home is heated / heat to a lower temperature / heat fewer rooms / "
    "stop heating the home"
)
Q_LIMIT = (
    "question=response to rising energy prices — mentioned any of: use less hot "
    "water / electricity / gas / gas or electricity in cooking, limit hot meals, "
    "stop cooking hot food, limit leisure activities that use electricity"
)
Q_ROOMS = (
    "question=rooms of the home particularly affected by overheating (multiple "
    "answers; base all households incl. those not overheating)"
)

PIQ_TENURE = {2: "owner-occupied", 3: "private-rented", 4: "local-authority", 5: "housing-association", 6: "social-rented", 7: "all-tenures"}
WEATHER_TENURE = {2: "owner-occupied", 3: "private-rented", 4: "social-rented", 5: "all-tenures"}

WEATHER_TYPE = {
    "terraced house": ("all-terrace", "aggregate"),
    "end terraced": ("end-terrace", "terrace-position"),
    "mid terraced": ("mid-terrace", "terrace-position"),
    "semi-detached house": ("semi-detached", "single-type"),
    "detached house": ("detached", "single-type"),
    "bungalow": ("bungalow", "single-type"),
    "flat": ("all-flats", "aggregate"),
    "purpose built high rise": ("purpose-built-flat-high-rise", "single-type"),
    "purpose built low rise": ("purpose-built-flat-low-rise", "single-type"),
    "converted flat": ("converted-flat", "single-type"),
}
CONSTRUCTION = {
    "solid masonry": "solid-masonry",
    "cavity masonry": "cavity-masonry",
    "other less common wall types": "other-less-common-wall-types",
    "crosswall masonry": "crosswall-masonry",
    "timber frame": "timber-frame",
    "steel frame": "steel-frame",
    "concrete frame": "concrete-frame",
    "concrete boxwall": "concrete-boxwall",
    "other concrete": "other-concrete",
}
COMPOSITION = {
    "household contains occupants aged 65 or over": "has-occupant-aged-65-plus",
    "household does not contain occupants aged 65 or over": "no-occupant-aged-65-plus",
    "household contains children aged below 5": "has-child-aged-under-5",
    "household does not contain children aged below 5": "no-child-aged-under-5",
}
COMPOSITION_SAMPLE = {
    "has-occupant-aged-65-plus": "households containing occupants aged 65 or over",
    "no-occupant-aged-65-plus": "households not containing occupants aged 65 or over",
    "has-child-aged-under-5": "households containing children aged below 5",
    "no-child-aged-under-5": "households not containing children aged below 5",
}


def _hh_common(table: str) -> list[str]:
    return [
        "sample-design=household-subsample-of-2024-dwelling-sample",
        "survey-year-label=2024-25",
        "subjective=true",
    ] + ([f"source-report=EHS 2024-25 perceptions and impacts of housing quality"] if table.startswith("PIQ") else [])


def piq_at29(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT_2_9")
    _check_header(rows, ("owner", "private", "local", "housing", "all social", "all"), "PIQ AT2.9")
    block = read_blocks(rows)
    spec = [
        ("able to keep warm during winter", "no", "unable-to-keep-warm-in-winter", Q_WARM),
        ("home gets uncomfortably hot", "yes", "home-gets-uncomfortably-hot", Q_HOT),
        ("reduce heating", "mentioned", "reduced-heating", Q_REDUCE),
        ("limit energy use", "mentioned", "limited-energy-use", Q_LIMIT),
    ]
    out: list[Row] = []
    for group, label, series, question in spec:
        pct = block.get("percentages", group, label)
        thousands = block.get("thousands", group, label)
        sample = block.get("sample", "", group)
        for col, tenure in PIQ_TENURE.items():
            row = _cell(
                pct, col, series=series, tenure=tenure, table="PIQ AT2.9", period=SPAN_2024,
                observation_type="survey-response", base="all-households-excl-non-response",
                unit="percent of households",
                extra=[question, *_hh_common("PIQ"), *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted")],
            )
            if row:
                out.append(row)
    return out


def piq_at211(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT_2_11")
    block = read_blocks(rows)
    sample = block.get("sample", "", "all")
    out: list[Row] = []
    for label in ("bedrooms", "living rooms", "attic rooms", "conservatory"):
        pct = block.get("percentages", "rooms affected by overheating", label)
        thousands = block.get("thousands", "rooms affected by overheating", label)
        series = f"overheating-room-{_slug(label)}"
        for col, tenure in PIQ_TENURE.items():
            row = _cell(
                pct, col, series=series, tenure=tenure, table="PIQ AT2.11", period=SPAN_2024,
                observation_type="survey-response", base="all-households-excl-non-response",
                unit="percent of households",
                extra=[Q_ROOMS, "not-mutually-exclusive=true", *_hh_common("PIQ"), *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted")],
            )
            if row:
                out.append(row)
    return out


def piq_composition(path: Path, sheet: str, table: str, label: str, series: str, question: str) -> list[Row]:
    rows = read_ods_sheet(path, sheet)
    block = read_blocks(rows)
    out: list[Row] = []
    for group, slug in COMPOSITION.items():
        pct = block.get("percentages", group, label)
        thousands = block.get("thousands", group, label)
        sample = block.get("sample", "", COMPOSITION_SAMPLE[slug])
        if pct is None:
            raise ValueError(f"{table}: {group!r} / {label!r} not found")
        for col, tenure in PIQ_TENURE.items():
            row = _cell(
                pct, col, series=series, tenure=tenure, table=table, period=SPAN_2024,
                observation_type="survey-response", base="all-households-in-group-excl-non-response",
                unit="percent of households", breakdown="household-composition", category=slug,
                extra=[question, *_hh_common("PIQ"), *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted")],
            )
            if row:
                out.append(row)
    return out


def weather_by_characteristic(path: Path, sheet: str, table: str, series: str, question: str) -> list[Row]:
    rows = read_ods_sheet(path, sheet)
    _check_header(rows, ("owner occupied", "privaterented", "social rented", "alldwellings"), table)
    block = read_blocks(rows)
    out: list[Row] = []
    groups = (("dwelling type", "dwelling-type", WEATHER_TYPE), ("construction type", "construction-type", CONSTRUCTION))
    for group, breakdown, mapping in groups:
        for label, target in mapping.items():
            slug, grouping = target if isinstance(target, tuple) else (target, "")
            pct = block.get("percentages", group, label)
            if pct is None:
                raise ValueError(f"{table}: {group}/{label} missing")
            thousands = block.get("thousands", group, label)
            sample = block.get("sample", group, label)
            for col, tenure in WEATHER_TENURE.items():
                extra = [
                    question,
                    "sample-design=2024-dwelling-sample-household-reported",
                    "dwelling-year=2024",
                    "subjective=true",
                    "excludes=dont-know",
                    *_extra_counts(thousands, sample, col, "dwellings-000s", "cell-sample-unweighted"),
                ]
                if grouping:
                    extra.insert(0, f"type-grouping={grouping}")
                if breakdown == "construction-type":
                    extra.insert(0, "construction=predominant-wall-construction")
                if table == "Weather AT1.2" and slug == "detached" and tenure == "all-tenures":
                    # QA 2026-11-04 wave 2 §5: published thousands (4,190) cannot
                    # be 5.7% of detached dwellings; share kept, count flagged.
                    extra.append("source-anomaly=published-thousands-inconsistent-with-share")
                row = _cell(
                    pct, col, series=series, tenure=tenure, table=table, period=SPAN_2024,
                    observation_type="survey-response", base="occupied-dwellings-excl-dont-know",
                    unit="percent of occupied dwellings", breakdown=breakdown, category=slug, extra=extra,
                )
                if row:
                    out.append(row)
    return out


WEATHER_AT13_COLS = {
    1: "neither-overheating-nor-unable-to-keep-warm",
    2: "overheating-only",
    3: "unable-to-keep-warm-only",
    4: "both-overheating-and-unable-to-keep-warm",
}
WEATHER_AT13_TENURE = {"owner occupied": "owner-occupied", "private rented": "private-rented", "social rented": "social-rented"}


def weather_at13(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT1_3")
    _check_header(rows, ("not reported for overheating", "reported for overheating only", "unable to keep warm only", "reported for both"), "Weather AT1.3")
    block = read_blocks(rows, start=4)
    out: list[Row] = []
    for (section, group, label), row in block.cells.items():
        if section != "percentages":
            continue
        thousands = block.get("thousands", group, label)
        # Columns: label 1 · four categories 2–5 · all dwellings 6 · sample 7.
        sample_raw = thousands[7] if thousands is not None and len(thousands) > 7 else ""
        if label == "all dwellings":
            tenure, breakdown, category, grouping = "all-tenures", "none", "", ""
        elif group == "tenure":
            tenure, breakdown, category, grouping = WEATHER_AT13_TENURE[label], "none", "", ""
        elif group == "dwelling type":
            (category, grouping), tenure, breakdown = WEATHER_TYPE[label], "all-tenures", "dwelling-type"
        else:
            raise ValueError(f"Weather AT1.3: unexpected row {group}/{label}")
        for col, series in WEATHER_AT13_COLS.items():
            col_idx = col + 1  # label sits in column 1
            extra = [
                f"question={Q_HOT.split('=', 1)[1]} × {Q_WARM.split('=', 1)[1]}",
                "sample-design=2024-dwelling-sample-household-reported",
                "dwelling-year=2024",
                "subjective=true",
                "excludes=dont-know",
                "mutually-exclusive=true",
            ]
            if thousands is not None and col_idx < len(thousands) and _num(thousands[col_idx]) not in ("", "u"):
                extra.append(f"dwellings-000s={_num(thousands[col_idx])}")
            if _num(sample_raw):
                extra.append(f"row-sample-unweighted={_num(sample_raw)}")
            if grouping:
                extra.insert(0, f"type-grouping={grouping}")
            cell = _cell(
                row, col_idx, series=series, tenure=tenure, table="Weather AT1.3", period=SPAN_2024,
                observation_type="survey-response", base="occupied-dwellings-excl-dont-know",
                unit="percent of occupied dwellings", breakdown=breakdown, category=category, extra=extra,
            )
            if cell:
                out.append(cell)
    return out


def thermal_rows(piq2: Path, weather: Path) -> list[Row]:
    primary = piq_at29(piq2) + piq_at211(piq2)
    primary += piq_composition(piq2, "AT_2_12", "PIQ AT2.12", "home gets uncomfortably hot", "home-gets-uncomfortably-hot", Q_HOT)
    primary += piq_composition(piq2, "AT_2_13", "PIQ AT2.13", "unable to keep warm during winter", "unable-to-keep-warm-in-winter", Q_WARM)
    primary += weather_by_characteristic(weather, "AT1_1", "Weather AT1.1", "home-gets-uncomfortably-hot", Q_HOT)
    primary += weather_by_characteristic(weather, "AT1_2", "Weather AT1.2", "unable-to-keep-warm-in-winter", Q_WARM)
    primary += weather_at13(weather)
    return primary


# ---------------------------------------------------------------------------
# Repairs satisfaction
# ---------------------------------------------------------------------------

Q_REPAIRS = (
    "question=satisfaction with the way the landlord carries out repairs and "
    "maintenance (FT5421 title wording)"
)
Q_REPAIRS_PIQ = (
    "question=satisfaction with the repairs or maintenance provided by the "
    "freeholder, agent, residents group or landlord (PIQ ch.3)"
)

FT5421_COLS = {
    1: "very-satisfied",
    2: "fairly-satisfied",
    3: "satisfied",
    4: "neither-satisfied-nor-dissatisfied",
    5: "slightly-dissatisfied",
    6: "very-dissatisfied",
    7: "dissatisfied",
}
FT5421_GROUPS = {
    "local authority renters": "local-authority",
    "housing association renters": "housing-association",
    "all social renters": "social-rented",
    "all private renters": "private-rented",
}


def _fy(label: str) -> tuple[str, str]:
    m = re.match(r"^(\d{4})-(\d{2})$", label)
    if not m:
        raise ValueError(label)
    start = int(m.group(1))
    return f"{start:04d}-04-01", f"{start + 1:04d}-03-31"


def ft5421_rows(path: Path, skipped: list[str]) -> list[Row]:
    rows = read_ods_sheet(path, "FT5421")
    _check_header(rows, ("very satisfied", "fairlysatisfied", "all satisfied", "alldissatisfied", "allhouseholds"), "FT5421")
    out: list[Row] = []
    tenure = ""
    for i, row in enumerate(rows[8:], start=8):
        if not row or not any(c.strip() for c in row):
            continue
        label = row[0].strip()
        low = _norm(label)
        if low in FT5421_GROUPS:
            tenure = FT5421_GROUPS[low]
            continue
        if low.startswith(("notes", "sources", "1)", "2)", "3)", "1994/5", "2008 onwards")):
            break
        has_values = any(c.strip() for c in row[1:9])
        m = re.match(r"^(\d{4}-\d{2})(\d?)$", label)
        if not has_values:
            if m:
                continue  # stray label row (FT5421 private renters '2008-09')
            raise ValueError(f"FT5421 row {i}: {label!r}")
        if not m:
            skipped.append(f"FT5421 row {i + 1} ({tenure}): unlabelled values row {[c.strip() for c in row[1:10]]}")
            continue
        year_label, note = m.group(1), m.group(2)
        start, end = _fy(year_label)
        households = _num(row[9]) if len(row) > 9 else ""
        survey = "survey-of-english-housing" if int(year_label[:4]) < 2008 else "english-housing-survey-full-household-sample"
        extra = [Q_REPAIRS, f"survey-year-label={year_label}", f"survey={survey}"]
        if note:
            extra.append(f"table-note={note}-lsvt-almo-transfers-accounted-from-2008-09")
        if year_label == "1994-95":
            extra.append("caveat=asked-october-to-march-only")
        if households:
            extra.append(f"households-000s={households}")
        extra.append("total-includes=small-number-where-no-repairs-or-not-landlord-responsibility")
        for col, series in FT5421_COLS.items():
            cell = _cell(
                row, col, series=series, tenure=tenure, table="FT5421", period=(start, end),
                observation_type="survey-response", base="renting-households",
                unit="percent of households", extra=list(extra),
            )
            if cell:
                out.append(cell)
    return out


PIQ3_TENURE = {
    2: "owner-occupied-leaseholder",
    3: "private-rented",
    4: "local-authority",
    5: "housing-association",
    6: "social-rented",
    7: "all-renters",
    8: "all-leaseholders-and-renters",
}
PIQ3_QUALITY = {
    "decent": "decent",
    "non-decent": "non-decent",
    "no damp present": "no-damp-present",
    "damp present": "damp-present",
    "all households": "all-households",
}
PIQ3_SERIES = {
    "satisfied": "satisfied",
    "neither satisfied nor dissatisfied": "neither-satisfied-nor-dissatisfied",
    "dissatisfied": "dissatisfied",
}


def piq_at31(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT_3_1")
    _check_header(rows, ("leaseholders", "privaterenters", "localauthority", "housingassociation", "all socialrenters", "allrenters"), "PIQ AT3.1")
    block = read_blocks(rows)
    out: list[Row] = []
    for group, quality in PIQ3_QUALITY.items():
        sample = block.get("sample", "", group)
        for label, series in PIQ3_SERIES.items():
            pct = block.get("percentages", group, label)
            thousands = block.get("thousands", group, label)
            if pct is None:
                raise ValueError(f"PIQ AT3.1 {group}/{label} missing")
            for col, tenure in PIQ3_TENURE.items():
                cell = _cell(
                    pct, col, series=series, tenure=tenure, table="PIQ AT3.1", period=SPAN_2024,
                    observation_type="survey-response",
                    base="leaseholders-and-renters-excl-not-landlord-responsible",
                    unit="percent of households", breakdown="housing-quality", category=quality,
                    extra=[
                        Q_REPAIRS_PIQ,
                        "housing-quality-source=surveyor-decent-homes-and-damp",
                        *_hh_common("PIQ"),
                        *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted"),
                    ],
                )
                if cell:
                    out.append(cell)
    return out


def piq_at32(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT_3_2")
    block = read_blocks(rows)
    groups = {
        "landlord responsible for repairs": "landlord",
        "estate agent or property manager responsible for repairs": "estate-agent-or-property-manager",
        "all households": "all-private-renters",
    }
    out: list[Row] = []
    for group, slug in groups.items():
        sample = block.get("sample", "", group)
        for label, series in PIQ3_SERIES.items():
            pct = block.get("percentages", group, label)
            thousands = block.get("thousands", group, label)
            if pct is None:
                raise ValueError(f"PIQ AT3.2 {group}/{label} missing")
            cell = _cell(
                pct, 2, series=series, tenure="private-rented", table="PIQ AT3.2", period=SPAN_2024,
                observation_type="survey-response",
                base="private-renters-excl-not-landlord-agent-responsible",
                unit="percent of households", breakdown="repair-responsibility", category=slug,
                extra=[Q_REPAIRS_PIQ, *_hh_common("PIQ"), *_extra_counts(thousands, sample, 2, "households-000s", "sample-unweighted")],
            )
            if cell:
                out.append(cell)
    return out


PIQ33_TENURE = {
    2: "owner-occupied-leaseholder",
    3: "private-rented",
    4: "local-authority",
    5: "housing-association",
    6: "social-rented",
    7: "all-leaseholders-and-renters",
}


def piq_at33(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT_3_3")
    block = read_blocks(rows)
    sample = block.get("sample", "", "all")
    out: list[Row] = []
    for (section, group, label), pct in block.cells.items():
        if section != "percentages" or group != "reason" or label == "all households":
            continue
        thousands = block.get("thousands", group, label)
        series = f"dissatisfaction-reason-{_slug(label)}"
        for col, tenure in PIQ33_TENURE.items():
            cell = _cell(
                pct, col, series=series, tenure=tenure, table="PIQ AT3.3", period=SPAN_2024,
                observation_type="survey-response",
                base="leaseholders-and-renters-dissatisfied-with-repairs",
                unit="percent of households",
                extra=[
                    "question=main reason for dissatisfaction with repairs ('landlord' = freeholder, agent, residents group or landlord)",
                    "single-main-reason=true",
                    *_hh_common("PIQ"),
                    *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted"),
                ],
            )
            if cell:
                out.append(cell)
    return out


def repairs_rows(ft5421: Path, piq3: Path, skipped: list[str]) -> list[Row]:
    return ft5421_rows(ft5421, skipped) + piq_at31(piq3) + piq_at32(piq3) + piq_at33(piq3)


# ---------------------------------------------------------------------------
# Accessibility and adaptations
# ---------------------------------------------------------------------------

ACCESS_FEATURES = {
    "flush threshold < 15mm?": "feature-flush-threshold",
    "wc at entrance level?": "feature-wc-at-entrance-level",
    "doorsets and circulation meet part m?": "feature-doorsets-and-circulation-meet-part-m",
    "level access to main entrance": "feature-level-access-to-main-entrance",
    "all four accessibility features": "all-four-accessibility-features",
}
ACCESS_TENURE = {
    "owner occupied": "owner-occupied",
    "private rented": "private-rented",
    "local authority": "local-authority",
    "housing association": "housing-association",
    "all dwellings": "all-tenures",
}


def accessibility_2018(path: Path) -> list[Row]:
    """2018-19 fact sheet annex AT1 (2009) and AT2 (2018): features by tenure."""
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    out: list[Row] = []
    for sheet, year in (("AT1", 2009), ("AT2", 2018)):
        ws = wb[sheet]
        values = [list(r) for r in ws.iter_rows(values_only=True)]
        title = next(str(c) for r in values for c in r if c)
        if str(year) not in title or "accessibility features" not in title.lower():
            raise ValueError(f"accessibility {sheet}: unexpected title {title!r}")
        header = next(r for r in values if r and any(str(c).strip().lower() == "yes" for c in r if c is not None))
        yes_cols = [i for i, c in enumerate(header) if c is not None and str(c).strip().lower() == "yes"]
        if len(yes_cols) != 2:
            raise ValueError(f"accessibility {sheet}: expected two 'yes' columns, got {yes_cols}")
        thousands_col, pct_col = yes_cols
        all_col = thousands_col + 2
        tenure = ""
        for r in values:
            label_b = str(r[1]).strip().lower() if len(r) > 1 and r[1] is not None else ""
            label_c = str(r[2]).strip().lower() if len(r) > 2 and r[2] is not None else ""
            if label_b in ACCESS_TENURE:
                tenure = ACCESS_TENURE[label_b]
                continue
            if label_c not in ACCESS_FEATURES or not tenure:
                continue
            pct = r[pct_col]
            if pct is None:
                continue
            value = round(float(pct), 1)
            yes = r[thousands_col]
            total = r[all_col]
            extra = [
                "question=surveyor-recorded presence of the feature (visitability standard)",
                f"dwelling-year={year}",
                "published-precision=unrounded-cell-rounded-to-1dp",
            ]
            if yes is not None:
                extra.append(f"dwellings-with-feature={int(round(float(yes)))}")
            if total is not None:
                extra.append(f"dwellings-in-base={int(round(float(total)))}")
            if label_c == "level access to main entrance":
                extra.append("base-excludes=dwellings-where-feature-not-assessable")
            out.append(
                Row(
                    series=ACCESS_FEATURES[label_c], tenure=tenure, value=value, status="final",
                    raw=repr(pct), table=f"Accessibility 2018 annex {sheet}",
                    period=(f"{year}-01-01", f"{year}-12-31"), observation_type="survey-estimate",
                    base="dwellings", unit="percent of dwellings", extra=extra,
                )
            )
    wb.close()
    return out


ADAPT_TENURE = {
    "owner occupiers": "owner-occupied",
    "private renters": "private-rented",
    "local authority": "local-authority",
    "housing association": "housing-association",
    "all households": "all-tenures",
}
ADAPT_AGE = {
    "under 55": "under-55",
    "55-64": "55-64",
    "65-74": "65-74",
    "75 or over": "75-plus",
}


def adaptations_at11(path: Path) -> list[Row]:
    rows = read_ods_sheet(path, "AT1_1")
    block = read_blocks(rows)
    sample = block.get("sample", "", "all")
    pct = block.get("percentages", "required adaptation(s)", "yes")
    thousands = block.get("thousands", "required adaptation(s)", "yes")
    out: list[Row] = []
    for col, label in ((2, "2014-15"), (3, "2019-20")):
        cell = _cell(
            pct, col, series="household-member-needs-adaptations", tenure="all-tenures",
            table="Adaptations 2019-20 AT1.1", period=_fy(label), observation_type="survey-response",
            base="all-households", unit="percent of households",
            extra=[
                "question=at least one person in the household has a long-standing illness or disability that requires adaptations to the home (whether or not already installed)",
                f"survey-year-label={label}",
                "sample-design=full-household-sample",
                *_extra_counts(thousands, sample, col, "households-000s", "sample-unweighted"),
            ],
        )
        if cell:
            out.append(cell)
    return out


def _adapt_two_year(path: Path, sheet: str, table: str, series: str, col_offset: int, question: str) -> list[Row]:
    """AT1.3 / AT3.1 — two side-by-side year blocks, rows by age and tenure."""
    rows = read_ods_sheet(path, sheet)
    block = read_blocks(rows)
    years = (("2014-15", 2), ("2019-20", 7))
    out: list[Row] = []
    for (section, group, label), pct in block.cells.items():
        if section != "percentages":
            continue
        thousands = block.get("thousands", group, label)
        if group.startswith("age"):
            breakdown, category, tenure = "age-of-oldest-person-needing-adaptation", ADAPT_AGE[label], "all-tenures"
        elif group == "tenure" or label == "all households":
            breakdown, category, tenure = "none", "", ADAPT_TENURE[label]
        else:
            raise ValueError(f"{table}: unexpected row {group}/{label}")
        for year_label, base_col in years:
            col = base_col + col_offset
            sample_col = base_col + 3
            extra = [question, f"survey-year-label={year_label}", "sample-design=full-household-sample"]
            if thousands is not None:
                if col < len(thousands) and _num(thousands[col]):
                    extra.append(f"households-000s={_num(thousands[col])}")
                if sample_col < len(thousands) and _num(thousands[sample_col]):
                    extra.append(f"sample-unweighted={_num(thousands[sample_col])}")
            cell = _cell(
                pct, col, series=series, tenure=tenure, table=table, period=_fy(year_label),
                observation_type="survey-response", base="households-needing-adaptations",
                unit="percent of households", breakdown=breakdown, category=category, extra=extra,
            )
            if cell:
                out.append(cell)
    return out


def accessibility_rows(access_2018: Path, adapt: Path) -> list[Row]:
    rows = accessibility_2018(access_2018)
    rows += adaptations_at11(adapt)
    rows += _adapt_two_year(
        adapt, "AT1_3", "Adaptations 2019-20 AT1.3", "accommodation-unsuitable", 1,
        "question=household's current accommodation is unsuitable for the person's illness or disability (households needing adaptations)",
    )
    rows += _adapt_two_year(
        adapt, "AT3_1", "Adaptations 2019-20 AT3.1", "lacks-needed-adaptations", 0,
        "question=household lacks at least one adaptation it needs (households needing adaptations)",
    )
    return rows


# ---------------------------------------------------------------------------
# Connector
# ---------------------------------------------------------------------------

BREAKDOWN_ORDER = {
    "none": 0,
    "dwelling-type": 1,
    "construction-type": 2,
    "household-composition": 3,
    "housing-quality": 4,
    "repair-responsibility": 5,
    "age-of-oldest-person-needing-adaptation": 6,
}


@dataclass(frozen=True, slots=True)
class Spec:
    indicator_id: str
    title: str
    source_url: str
    series_id: str
    unit: str
    definition: str
    caveats: str
    pins: tuple[str, ...]
    build: Callable[[dict[str, Path], list[str]], list[Row]]
    related: tuple[str, ...]


SPECS: tuple[Spec, ...] = (
    Spec(
        indicator_id="ehs-thermal-comfort",
        title="EHS thermal comfort (unable to keep warm, overheating, energy actions)",
        source_url=REPORT_PIQ_2024_25,
        series_id="EHS 2024-25 PIQ annex AT2.9 / AT2.11–2.13 + weather resilient homes annex AT1.1–1.3",
        unit="percent of households / occupied dwellings (see base=)",
        definition=(
            "Household-reported thermal comfort in England, 2024 dwelling sample "
            "(2024-25 household subsample): unable to keep comfortably warm in the "
            "living room in cold winter weather (unable-to-keep-warm-in-winter); "
            "home gets uncomfortably hot and cannot be cooled (home-gets-uncomfortably-"
            "hot); overheating only / unable to keep warm only / both / neither; rooms "
            "affected by overheating; and the energy actions reduced-heating and "
            "limited-energy-use taken in response to rising energy prices. By tenure, "
            "dwelling type, construction (wall) type and household age composition."
        ),
        caveats=(
            "Subjective self-report by the household reference person or main "
            "respondent — perception, not a measured temperature or a surveyor "
            "assessment (cf. ehs-category-1-hazards excess cold, a modelled HHSRS "
            "hazard). Two bases: PIQ tables are 'all households' (household "
            "subsample, non-response excluded); weather fact-sheet tables are 'all "
            "occupied dwellings' (same respondents weighted to dwellings, don't-know "
            "excluded) — the all-dwellings rows of AT1.1/1.2 equal PIQ AT2.9 and are "
            "not duplicated (QA compares). Single snapshot (2024 / 2024-25): the "
            "fact sheet cites 7% overheating in 2019 from the 2019-20 headline "
            "report, not ingested. Weather tables cross dwelling type and "
            "construction type with three tenures only (no LA/HA split). Figures "
            "based on small samples are italicised in the source (not machine-"
            "readable); cell-sample-unweighted is carried instead — treat bases "
            "under ~100 as indicative. 'u' = unweighted count 1–4. The published "
            "AT1.2 thousands for detached houses, all dwellings (4,190) is "
            "inconsistent with its 5.7% share (QA §); percentages are unaffected."
        ),
        pins=("PIQ_CH2", "WEATHER"),
        build=lambda p, s: thermal_rows(p["PIQ_CH2"], p["WEATHER"]),
        related=("ehs-category-1-hazards", "ehs-decent-homes", "ehs-heating", "ehs-insulation", "ehs-damp-mould-reported"),
    ),
    Spec(
        indicator_id="ehs-repairs-satisfaction",
        title="EHS satisfaction with landlord repairs and maintenance",
        source_url=COLLECTION_SATISFACTION,
        series_id="EHS FT5421 trend + 2024-25 PIQ annex AT3.1–3.3",
        unit="percent of households",
        definition=(
            "Share of renting households in England satisfied / dissatisfied with the "
            "way their landlord carries out repairs and maintenance, by tenure, "
            "1994-95 to 2024-25 (FT5421, five-point scale and nets; breakdown=none). "
            "2024-25 detail for leaseholders and renters: by surveyor-assessed housing "
            "quality (decent / non-decent / damp present / no damp; "
            "breakdown=housing-quality), private renters by who is responsible for "
            "repairs (breakdown=repair-responsibility), and main reason for "
            "dissatisfaction (series=dissatisfaction-reason-*)."
        ),
        caveats=(
            "Self-reported satisfaction (survey-response). Different bases are "
            "never mixed in one series key: FT5421 (breakdown=none) is all renting "
            "households, full household sample, and its total includes a few "
            "households where no repairs were done or repairs were not the "
            "landlord's responsibility; PIQ AT3.1/3.2 (breakdown=housing-quality / "
            "repair-responsibility, category …:all-households / all-private-renters "
            "for their own totals) exclude households whose landlord / freeholder / "
            "agent is not responsible and use the household subsample — so 2024-25 "
            "private renters 'satisfied' is 72.6% in FT5421 but 67.5% in AT3.1. PIQ "
            "adds owner-occupier leaseholders (freeholder/agent repairs). 1994-95 to "
            "2007-08 Survey of English Housing (1994-95 asked October–March only); "
            "2008-09 onwards EHS, with LSVT/ALMO transfers between LA and HA "
            "accounted for from 2008-09 (table note 3). FT5421 private renters print "
            "an unlabelled values row between 2007-08 and 2008-09 — not ingested "
            "(QA). Reasons are a single main reason among dissatisfied households."
        ),
        pins=("FT5421", "PIQ_CH3"),
        build=lambda p, s: repairs_rows(p["FT5421"], p["PIQ_CH3"], s),
        related=("ehs-decent-homes", "ehs-damp-surveyor", "ehs-disrepair", "ehs-damp-mould-reported"),
    ),
    Spec(
        indicator_id="ehs-accessibility-adaptations",
        title="EHS accessibility features and home adaptations",
        source_url=REPORT_ADAPTATIONS_2019_20,
        series_id="EHS 2018 accessibility annex AT1/AT2 + 2019-20 home adaptations annex AT1.1 / AT1.3 / AT3.1",
        unit="percent of dwellings / households (see base=)",
        definition=(
            "Accessibility: share of England dwellings with each of the four "
            "'visitability' features recorded by the EHS surveyor — level access to "
            "the main entrance, flush threshold (<15mm), WC at entrance level, "
            "doorsets and circulation meeting Part M — and all four, by tenure, 2009 "
            "and 2018 (survey-estimate). Adaptations: share of households with someone "
            "whose long-standing illness or disability requires adaptations "
            "(2014-15, 2019-20), and among those households the share whose home is "
            "unsuitable and the share lacking an adaptation they need, by tenure and "
            "age of the oldest person needing adaptations (survey-response)."
        ),
        caveats=(
            "Old snapshots: accessibility features 2009 and 2018 (dwelling years; "
            "fact sheet published 2020), adaptations 2014-15 and 2019-20 (report "
            "published 2021). No later EHS accessibility or adaptations tables are "
            "published. Accessibility cells are stored unrounded in the source "
            "workbook and rounded here to 1 dp (as displayed). Level access is "
            "assessed for fewer dwellings (base in notes). Adaptation needs are "
            "self-reported and include adaptations already installed; 'unsuitable' "
            "and 'lacks' are among households needing adaptations only. 2019-20 "
            "fieldwork ended early (COVID-19, March 2020)."
        ),
        pins=("ACCESS_2018", "ADAPT_1920"),
        build=lambda p, s: accessibility_rows(p["ACCESS_2018"], p["ADAPT_1920"]),
        related=("ehs-decent-homes", "ehs-category-1-hazards"),
    ),
)

# Published rows not ingested because they are unlabelled / ambiguous.
SKIPPED_ROWS: list[str] = []


class EhsLivedExperienceConnector(Connector):
    def __init__(self, spec: Spec) -> None:
        self.spec = spec
        super().__init__(HOUSING_DATA / spec.indicator_id)

    @property
    def indicator_id(self) -> str:
        return self.spec.indicator_id

    def evidence(self) -> list[RawEvidence]:
        return pin_into(self.data_root, list(self.spec.pins))

    def _paths(self, evidence: Sequence[RawEvidence]) -> dict[str, Path]:
        out: dict[str, Path] = {}
        for key in self.spec.pins:
            name = PINS[key].file_name
            out[key] = next(self.data_root / e.path for e in evidence if e.path.endswith(name))
        return out

    def rows(self, evidence: Sequence[RawEvidence]) -> list[Row]:
        rows = self.spec.build(self._paths(evidence), SKIPPED_ROWS)
        seen: dict[tuple[str, ...], Row] = {}
        for row in rows:
            if row.key() in seen:
                raise ValueError(f"{self.indicator_id}: duplicate natural key {row.key()} ({row.table} vs {seen[row.key()].table})")
            seen[row.key()] = row
        return sorted(seen.values(), key=lambda r: (r.period[0], BREAKDOWN_ORDER[r.breakdown], r.category, r.series, r.tenure))

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        return [
            Observation(
                indicator_id=self.indicator_id,
                period_start=r.period[0],
                period_end=r.period[1],
                geography_code=ENGLAND_CODE,
                geography_label=ENGLAND_LABEL,
                value=r.value,
                unit=r.unit,
                observation_status=r.status,
                source_version=f"{r.table} ({PINS[self._pin_for(r.table)].official_release_date})",
                notes=_notes(r),
            )
            for r in self.rows(evidence)
        ]

    def _pin_for(self, table: str) -> str:
        if table.startswith("PIQ AT2"):
            return "PIQ_CH2"
        if table.startswith("PIQ AT3"):
            return "PIQ_CH3"
        if table.startswith("Weather"):
            return "WEATHER"
        if table == "FT5421":
            return "FT5421"
        if table.startswith("Accessibility"):
            return "ACCESS_2018"
        return "ADAPT_1920"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        spec = self.spec
        sources = {
            "ehs-thermal-comfort": f"{REPORT_PIQ_2024_25} ; {REPORT_WEATHER_2024_25}",
            "ehs-repairs-satisfaction": f"{COLLECTION_SATISFACTION} ; {REPORT_PIQ_2024_25}",
            "ehs-accessibility-adaptations": f"{REPORT_ACCESSIBILITY_2018} ; {REPORT_ADAPTATIONS_2019_20}",
        }[spec.indicator_id]
        return Manifest(
            indicator_id=spec.indicator_id,
            title=spec.title,
            sector="housing-land",
            publisher="MHCLG · English Housing Survey",
            source_url=spec.source_url,
            series_id=spec.series_id,
            geography="England (E92000001) — survey estimates / household responses",
            frequency="annual" if spec.indicator_id == "ehs-repairs-satisfaction" else "ad_hoc",
            unit=spec.unit,
            definition=spec.definition,
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.ehs_lived_experience",
            curated_path="curated/observations.csv",
            update_cadence=(
                "annual (FT5421 live table, July); PIQ annex per report"
                if spec.indicator_id == "ehs-repairs-satisfaction"
                else "ad hoc (EHS topic reports / fact sheets)"
            ),
            raw_evidence=list(evidence),
            transformations=(
                "Annex sheets split into thousands / percentages / sample sections "
                "(housing.connectors.ehs_lived_experience.read_blocks); tenure columns "
                "checked against header text; one row per published percentage cell "
                "with published thousands and unweighted sample sizes in notes; 'u' → "
                "suppressed. Complements (able to keep warm, home not hot, suitable "
                "accommodation, all adaptations installed) not emitted. Sources: "
                + sources
            ),
            caveats=spec.caveats,
            revision_notes="2026-11-04: initial ingest (Domain 07 housing quality wave 2).",
            related_indicator_ids=list(spec.related),
            notion_registry_url="",
            open_questions=[],
        )


def connectors() -> list[EhsLivedExperienceConnector]:
    return [EhsLivedExperienceConnector(s) for s in SPECS]


def main() -> None:
    for connector in connectors():
        evidence = connector.evidence()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        print(f"{connector.indicator_id}: rows={len(observations)}")
    for line in SKIPPED_ROWS:
        print(f"  skipped: {line}")


if __name__ == "__main__":
    main()

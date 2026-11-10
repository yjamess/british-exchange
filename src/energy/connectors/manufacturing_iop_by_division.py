"""ONS IoP DIOP — manufacturing SIC Section C divisions / subsections (CVMSA).

Approach (plain language):
1. Download the official DIOP multi-series CSV from the ONS Index of Production
   current dataset landing (not the Ready K22A single timeseries).
2. Keep only seasonally adjusted chained-volume **index** series (titles ending
   CVMSA) that sit under SIC 2007 Section C: subsections CA–CM and 2-digit
   divisions 10–33 (plus the honest ONS 11+12 combined break).
3. Emit one Observation per division/subsection × calendar month (UK).
4. Do **not** fork Ready ``manufacturing-output-index`` (K22A Section C headline).

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import (
    Observation,
    ObservationStatus,
    mark_latest_months_provisional,
)
from britain_exchange.paths import ENERGY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

UNIT = "index (chained volume, SA; base year = 100)"
DATASET_ID = "DIOP"
PIN_DATE = date(2026, 11, 7)

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/"
    "datasets/indexofproduction/current"
)
SOURCE_CSV_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/economicoutputandproductivity/"
    "output/datasets/indexofproduction/current/diop.csv"
)

# Headline Section C — Ready elsewhere; never curated here.
EXCLUDED_HEADLINE_CDID = "K22A"

MONTH_TOKEN = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}


@dataclass(frozen=True, slots=True)
class DivisionSeries:
    """One curated IoP CVMSA break under Section C."""

    cdid: str
    sic_code: str
    level: str  # subsection | division | combined_division
    short_label: str


# Explicit catalogue — SIC breaks labelled honestly (combined 11+12 is ONS as published).
SECTION_C_SERIES: tuple[DivisionSeries, ...] = (
    # Subsections CA–CM (exclude headline C / K22A)
    DivisionSeries("K22B", "CA", "subsection", "Food products, beverages and tobacco"),
    DivisionSeries("K22P", "CB", "subsection", "Textiles, wearing apparel and leather"),
    DivisionSeries("K22T", "CC", "subsection", "Wood, paper products and printing"),
    DivisionSeries("K22X", "CD", "subsection", "Coke and refined petroleum products"),
    DivisionSeries("K22Z", "CE", "subsection", "Chemicals and chemical products"),
    DivisionSeries(
        "K239", "CF", "subsection", "Basic pharmaceutical products and preparations"
    ),
    DivisionSeries(
        "K23B",
        "CG",
        "subsection",
        "Rubber, plastics and other non-metallic mineral products",
    ),
    DivisionSeries("K23G", "CH", "subsection", "Basic metals and metal products"),
    DivisionSeries(
        "K23N", "CI", "subsection", "Computer, electronic and optical products"
    ),
    DivisionSeries("K23P", "CJ", "subsection", "Electrical equipment"),
    DivisionSeries("K23R", "CK", "subsection", "Machinery and equipment n.e.c."),
    DivisionSeries("K23T", "CL", "subsection", "Transport equipment"),
    DivisionSeries("K23Z", "CM", "subsection", "Other manufacturing and repair"),
    # 2-digit divisions (and ONS combined 11+12 where separate CVMSA is unpublished)
    DivisionSeries("K22C", "10", "division", "Manufacture of food products"),
    DivisionSeries(
        "DM4H",
        "11+12",
        "combined_division",
        "Manufacture of beverages and tobacco products",
    ),
    DivisionSeries("K22Q", "13", "division", "Manufacture of textiles"),
    DivisionSeries("K22R", "14", "division", "Manufacture of wearing apparel"),
    DivisionSeries("K22S", "15", "division", "Manufacture of leather and related products"),
    DivisionSeries(
        "K22U",
        "16",
        "division",
        "Wood and products of wood and cork (except furniture)",
    ),
    DivisionSeries("K22V", "17", "division", "Manufacture of paper and paper products"),
    DivisionSeries("K22W", "18", "division", "Printing and reproduction of recorded media"),
    DivisionSeries(
        "K22Y", "19", "division", "Manufacture of coke and refined petroleum products"
    ),
    DivisionSeries("K232", "20", "division", "Manufacture of chemicals and chemical products"),
    DivisionSeries(
        "K23A",
        "21",
        "division",
        "Basic pharmaceutical products and pharmaceutical preparations",
    ),
    DivisionSeries("K23C", "22", "division", "Manufacture of rubber and plastic products"),
    DivisionSeries(
        "K23D", "23", "division", "Manufacture of other non-metallic mineral products"
    ),
    DivisionSeries("K23H", "24", "division", "Manufacture of basic metals"),
    DivisionSeries(
        "K23K",
        "25",
        "division",
        "Fabricated metal products (except machinery and equipment)",
    ),
    DivisionSeries(
        "K23O", "26", "division", "Computer, electronic and optical products"
    ),
    DivisionSeries("K23Q", "27", "division", "Manufacture of electrical equipment"),
    DivisionSeries(
        "K23S", "28", "division", "Manufacture of machinery and equipment n.e.c."
    ),
    DivisionSeries(
        "K23U", "29", "division", "Motor vehicles, trailers and semi-trailers"
    ),
    DivisionSeries("K23V", "30", "division", "Manufacture of other transport equipment"),
    DivisionSeries("K242", "31", "division", "Manufacture of furniture"),
    DivisionSeries("K243", "32", "division", "Other manufacturing"),
    DivisionSeries(
        "K244", "33", "division", "Repair and installation of machinery and equipment"
    ),
)

SERIES_BY_CDID = {s.cdid: s for s in SECTION_C_SERIES}


def _pin_day() -> date:
    return PIN_DATE


def _parse_release_date(raw: str) -> str:
    """ONS DIOP uses DD-MM-YYYY in the Release Date row."""
    text = (raw or "").strip()
    if not text:
        return ""
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return text[:10]


def _month_bounds(year: int, month: int) -> tuple[str, str]:
    import calendar

    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def _parse_month_period(label: str) -> tuple[str, str] | None:
    """Return ISO month bounds for labels like ``2026 AUG``; else None."""
    parts = label.strip().split()
    if len(parts) != 2:
        return None
    year_s, mon_s = parts
    if not year_s.isdigit() or len(year_s) != 4:
        return None
    month = MONTH_TOKEN.get(mon_s.upper()[:3])
    if month is None:
        return None
    return _month_bounds(int(year_s), month)


def _parse_numeric(raw: object) -> tuple[float | None, ObservationStatus]:
    """Valued cells are final; transform marks the latest ~12 months provisional."""
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if not text or text in {"..", "…", "-", "n/a", "N/A"}:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "final"
    except ValueError as exc:
        raise ValueError(f"Non-numeric DIOP value: {raw!r}") from exc


def _load_diop_table(path: Path) -> tuple[list[str], list[str], str, list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.reader(handle))
    if len(rows) < 8:
        raise ValueError(f"DIOP CSV too short: {path}")
    titles = rows[0]
    cdids = rows[1]
    if (titles[0] or "").strip().lower() != "title":
        raise ValueError(f"Expected Title row, got {titles[0]!r}")
    if (cdids[0] or "").strip().upper() != "CDID":
        raise ValueError(f"Expected CDID row, got {cdids[0]!r}")
    release = ""
    for row in rows[2:7]:
        if row and (row[0] or "").strip().lower() == "release date":
            # Prefer K22A / first non-empty manufacturing-related cell.
            for cell in row[1:]:
                if str(cell).strip():
                    release = _parse_release_date(str(cell))
                    break
            break
    return titles, cdids, release, rows[7:]


class ManufacturingIopByDivisionConnector(Connector):
    """DIOP CVMSA indices for SIC Section C divisions and subsections."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "manufacturing-iop-by-division")
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return "manufacturing-iop-by-division"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Manufacturing IoP by SIC division / subsection",
            sector="energy-industry",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="DIOP-Section-C-CVMSA",
            geography="United Kingdom (K02000001)",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "UK Index of Production chained-volume seasonally adjusted "
                "indices for SIC 2007 Section C manufacturing **subsections** "
                "CA–CM and **divisions** 10–33 (ONS DIOP multi-series CSV). "
                "Distinct from Ready headline Section C series K22A "
                "(manufacturing-output-index) — that pipeline is not forked."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.manufacturing_iop_by_division",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS Index of Production / DIOP dataset)",
            raw_evidence=list(evidence),
            related_indicator_ids=["manufacturing-output-index"],
            transformations=(
                "Download DIOP current CSV. Select explicit CDID catalogue of "
                "Section C subsection + division CVMSA series (exclude K22A). "
                "Keep monthly period rows only (YYYY MON). Map to ISO month "
                "bounds; geography K02000001. notes carry series=, "
                "classification=, sic=, label=. observation_status=provisional."
            ),
            revision_notes=(
                "IoP revises each monthly release and at Blue Book / annual "
                "chain-linking. Base year moves with Blue Book. Re-pin DIOP CSV "
                "on re-ingest; compare checksums. Catalogue CDIDs are pinned in "
                "connector source — new ONS breaks need an explicit add."
            ),
            caveats=(
                "SIC honesty: curated breaks are ONS-published CVMSA titles for "
                "subsections CA–CM and divisions 10–33. Divisions 11 and 12 are "
                "**not** published separately as CVMSA in DIOP; ONS publishes "
                "combined 11+12 (CDID DM4H) — labelled classification="
                "combined_division. Finer group/class series (e.g. 10.1, 20A) "
                "and non-index series (weights, growth rates, turnover £m, NSA) "
                "are out of scope. Headline Section C (K22A) is Ready elsewhere. "
                "Index levels are not growth rates."
            ),
            open_questions=[
                "Optional Gate 3+: add selected 3-digit / ONS group CVMSA series "
                "for Production Anatomy cells once Validation accepts spine.",
                "Confirm Blue Book base-year label in unit string on next BB.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or _pin_day()
        relative = f"raw/{day.isoformat()}/diop.csv"
        result = self.fetch_url(SOURCE_CSV_URL, relative)
        release_date = ""
        try:
            _, _, release_date, _ = _load_diop_table(result.path)
        except (OSError, ValueError):
            release_date = ""
        return RawEvidence(
            path=result.evidence.path,
            retrieved_at=result.evidence.retrieved_at,
            checksum_sha256=result.evidence.checksum_sha256,
            content_type=result.evidence.content_type,
            official_release_date=release_date,
            http_status=result.evidence.http_status,
            source_url=result.evidence.source_url,
        )

    def evidence_from_pinned_raw(self, relative: str | None = None) -> RawEvidence:
        rel = relative or f"raw/{_pin_day().isoformat()}/diop.csv"
        path = self.data_root / rel
        if not path.is_file():
            raise FileNotFoundError(f"Pinned raw missing: {path}")
        _, _, release, _ = _load_diop_table(path)
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=release,
            http_status=None,
            source_url=SOURCE_CSV_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        raw_path = self.data_root / evidence[0].path
        titles, cdids, release, data_rows = _load_diop_table(raw_path)
        version = f"{DATASET_ID} {release or 'unknown-release'}"

        col_index: dict[str, int] = {}
        for idx, cdid in enumerate(cdids):
            if idx == 0:
                continue
            code = (cdid or "").strip().upper()
            if code in SERIES_BY_CDID:
                col_index[code] = idx

        missing = sorted(set(SERIES_BY_CDID) - set(col_index))
        if missing:
            raise ValueError(f"DIOP CSV missing expected CDIDs: {missing}")

        # Sanity: headline exists in file but we do not select it.
        headline_present = any(
            (c or "").strip().upper() == EXCLUDED_HEADLINE_CDID for c in cdids
        )
        if not headline_present:
            raise ValueError("Expected K22A in DIOP CSV (excluded from curated set)")
        if EXCLUDED_HEADLINE_CDID in col_index:
            raise RuntimeError("K22A must not be curated in this connector")
        observations: list[Observation] = []
        for row in data_rows:
            if not row:
                continue
            period_label = (row[0] or "").strip()
            bounds = _parse_month_period(period_label)
            if bounds is None:
                continue
            start, end = bounds
            for cdid, col in col_index.items():
                meta = SERIES_BY_CDID[cdid]
                raw_val = row[col] if col < len(row) else ""
                value, status = _parse_numeric(raw_val)
                title = titles[col] if col < len(titles) else meta.short_label
                observations.append(
                    Observation(
                        indicator_id=self.indicator_id,
                        period_start=start,
                        period_end=end,
                        geography_code=UK_GEOGRAPHY_CODE,
                        geography_label=UK_GEOGRAPHY_LABEL,
                        value=value,
                        unit=UNIT,
                        observation_status=status,
                        source_version=version,
                        notes=(
                            f"series={cdid}; classification={meta.level}; "
                            f"sic={meta.sic_code}; label={meta.short_label}; "
                            f"dataset={DATASET_ID}; ons_title={title}"
                        ),
                    )
                )
        observations.sort(
            key=lambda obs: (obs.period_start, _series_sort_key(obs.notes))
        )
        if not observations:
            raise ValueError("No monthly Section C observations parsed from DIOP")
        # IoP revises roughly the latest year of months; mark per CDID.
        return mark_latest_months_provisional(
            observations,
            months=12,
            group_key=lambda obs: _series_sort_key(obs.notes),
        )


def _series_sort_key(notes: str) -> str:
    match = re.search(r"series=([A-Z0-9]+)", notes or "")
    return match.group(1) if match else notes


def write_annual_means_pack(
    observations: Sequence[Observation],
    dest: Path,
) -> Path:
    """Year-mean index per series for Explorer Production Anatomy (lean pack).

    Monthly DIOP is ~34k rows; the UI only needs one point per calendar year
    per SIC break for ChangeRows and branch dials.
    """
    # Per series × year: collect final monthly values only. A year enters the pack
    # only when all 12 months are present and final (no part-year, no provisional tip).
    buckets: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    notes_by_series: dict[str, str] = {}
    classification_by_series: dict[str, str] = {}
    source_version = ""
    unit = UNIT
    for obs in observations:
        match = re.search(r"series=([A-Z0-9]+)", obs.notes or "")
        if match is None or obs.value is None:
            continue
        if obs.observation_status != "final":
            continue
        series = match.group(1)
        year = int(obs.period_start[:4])
        buckets[series][year].append(float(obs.value))
        if series not in notes_by_series:
            notes_by_series[series] = obs.notes or ""
            class_match = re.search(r"classification=([^;]+)", obs.notes or "")
            classification_by_series[series] = (
                class_match.group(1).strip() if class_match else "division"
            )
        if not source_version:
            source_version = obs.source_version
        if obs.unit:
            unit = obs.unit

    rows: list[dict[str, object]] = []
    for series in sorted(buckets):
        classification = classification_by_series[series]
        notes = notes_by_series[series]
        for year in sorted(buckets[series]):
            vals = buckets[series][year]
            if len(vals) < 12:
                continue
            mean = sum(vals) / len(vals)
            rows.append(
                {
                    "indicator_id": "manufacturing-iop-by-division",
                    "period_start": f"{year}-01-01",
                    "period_end": f"{year}-12-31",
                    "geography_code": UK_GEOGRAPHY_CODE,
                    "geography_label": UK_GEOGRAPHY_LABEL,
                    "value": round(mean, 4),
                    "unit": unit,
                    "observation_status": "final",
                    "source_version": source_version,
                    "notes": notes,
                    "dimensions": {"series": series, "category": classification},
                }
            )

    payload = {
        "indicator_id": "manufacturing-iop-by-division",
        "kind": "annual_year_mean",
        "unit": unit,
        "source_version": source_version,
        "series_count": len(buckets),
        "observation_count": len(rows),
        "note": (
            "Year-mean of monthly CVMSA index per SIC break — only complete "
            "calendar years with twelve final months. Part-year and provisional "
            "months are omitted. Not additive across divisions; not GVA shares."
        ),
        "observations": rows,
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return dest


WEIGHTS_INDICATOR_ID = "manufacturing-iop-weights"
WEIGHTS_UNIT = "parts per thousand of the Index of Production (GVA weight)"
SECTION_C_WEIGHT_CDID = "KM44"

# Index CDID → ONS annual weight CDID for the same SIC break (DIOP "…: Weight").
WEIGHT_CDID_BY_INDEX: dict[str, str] = {
    "K22B": "KM47", "K22P": "KM48", "K22T": "KM49", "K22X": "KM4B", "K22Z": "KM4C",
    "K239": "KM4D", "K23B": "KM4E", "K23G": "KM4F", "K23N": "KM4G", "K23P": "KM4I",
    "K23R": "KM4J", "K23T": "KM4K", "K23Z": "KM4L",
    "K22C": "KM27", "DM4H": "DM3Z", "K22Q": "KM2L", "K22R": "KM2M", "K22S": "KM2N",
    "K22U": "KM2O", "K22V": "KM2P", "K22W": "KM2Q", "K22Y": "KM2R", "K232": "KM2S",
    "K23A": "KM2Z", "K23C": "KM32", "K23D": "KM33", "K23H": "KM36", "K23K": "KM39",
    "K23O": "KM3C", "K23Q": "KM3D", "K23S": "KM3E", "K23U": "KM3F", "K23V": "KM3G",
    "K242": "KM3K", "K243": "KM3L", "K244": "KM3M",
}


def _year_label(label: str) -> int | None:
    text = label.strip()
    return int(text) if len(text) == 4 and text.isdigit() else None


def weights_from_raw(raw_path: Path) -> tuple[list[dict[str, object]], str]:
    """Annual ONS IoP weights for Section C and each curated SIC break.

    Weights are published, additive parts per thousand of all production (IoP = 1000):
    subsections CA–CM sum to Section C (KM44) within rounding, as do divisions.
    Rows are keyed by the **index** CDID (``dimensions.series``) so the Explorer can
    join a branch's weight to its volume index.
    """
    titles, cdids, release, data_rows = _load_diop_table(raw_path)
    col = {(c or "").strip().upper(): i for i, c in enumerate(cdids) if i}
    wanted = {**WEIGHT_CDID_BY_INDEX, "C": SECTION_C_WEIGHT_CDID}
    missing = sorted(w for w in wanted.values() if w not in col)
    if missing:
        raise ValueError(f"DIOP CSV missing expected weight CDIDs: {missing}")
    for w in wanted.values():
        if not titles[col[w]].strip().endswith("Weight"):
            raise ValueError(f"{w} is not a Weight series: {titles[col[w]]!r}")
    version = f"{DATASET_ID} {release or 'unknown-release'}"

    rows: list[dict[str, object]] = []
    for row in data_rows:
        year = _year_label(row[0] if row else "")
        if year is None:
            continue
        for index_cdid, weight_cdid in wanted.items():
            raw_val = row[col[weight_cdid]] if col[weight_cdid] < len(row) else ""
            value, _ = _parse_numeric(raw_val)
            if value is None:
                continue
            if index_cdid == "C":
                sic, level, label = "C", "section", "Manufacturing"
            else:
                meta = SERIES_BY_CDID[index_cdid]
                sic, level, label = meta.sic_code, meta.level, meta.short_label
            rows.append(
                {
                    "indicator_id": WEIGHTS_INDICATOR_ID,
                    "period_start": f"{year}-01-01",
                    "period_end": f"{year}-12-31",
                    "geography_code": UK_GEOGRAPHY_CODE,
                    "geography_label": UK_GEOGRAPHY_LABEL,
                    "value": value,
                    "unit": WEIGHTS_UNIT,
                    "observation_status": "final",
                    "source_version": version,
                    "notes": (
                        f"series={index_cdid}; weight_series={weight_cdid}; "
                        f"classification={level}; sic={sic}; label={label}; "
                        f"dataset={DATASET_ID}; ons_title={titles[col[weight_cdid]].strip()}"
                    ),
                    "dimensions": {"series": index_cdid, "category": level},
                }
            )
    if not rows:
        raise ValueError("No annual weight rows parsed from DIOP")
    _check_weights_additive(rows)
    return rows, version


def _check_weights_additive(rows: Sequence[dict[str, object]]) -> None:
    """Fail loudly if subsections or divisions stop summing to Section C."""
    by_year: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        year = int(str(r["period_start"])[:4])
        level = str(r["dimensions"]["category"])  # type: ignore[index]
        key = "division" if level == "combined_division" else level
        by_year[year][key] += float(r["value"])  # type: ignore[arg-type]
    for year, sums in by_year.items():
        total = sums.get("section")
        if total is None:
            continue
        for level in ("subsection", "division"):
            if level in sums and abs(sums[level] - total) > 1.0:
                raise ValueError(
                    f"{year}: {level} weights sum {sums[level]:.1f} ≠ Section C {total:.1f}"
                )


def write_weights_pack(raw_path: Path, dest: Path) -> Path:
    rows, version = weights_from_raw(raw_path)
    payload = {
        "indicator_id": WEIGHTS_INDICATOR_ID,
        "kind": "annual_weights",
        "unit": WEIGHTS_UNIT,
        "source_version": version,
        "source_url": SOURCE_CSV_URL,
        "series_count": len({r["dimensions"]["series"] for r in rows}),  # type: ignore[index]
        "observation_count": len(rows),
        "note": (
            "ONS annual GVA weights from the Index of Production dataset (DIOP), parts per "
            "thousand of all production. Additive: subsections CA–CM and divisions 10–33 "
            "each sum to Section C. Share of manufacturing = branch ÷ Section C."
        ),
        "observations": rows,
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return dest


def main_weights() -> None:
    """Rebuild the weights pack from the pinned DIOP raw (no network)."""
    connector = ManufacturingIopByDivisionConnector()
    evidence = connector.evidence_from_pinned_raw()
    raw_path = connector.data_root / evidence.path
    dest = write_weights_pack(raw_path, connector.data_root / "curated" / "weights.json")
    payload = json.loads(dest.read_text(encoding="utf-8"))
    print(f"indicator_id: {WEIGHTS_INDICATOR_ID}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"rows: {payload['observation_count']} series: {payload['series_count']}")
    print(f"weights_pack: {dest}")


def main() -> None:
    connector = ManufacturingIopByDivisionConnector()
    evidence = connector.fetch_latest(retrieved_on=_pin_day())
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    annual_path = write_annual_means_pack(
        observations,
        connector.data_root / "curated" / "annual_means.json",
    )
    by_series: dict[str, int] = {}
    for obs in observations:
        m = re.search(r"series=([A-Z0-9]+)", obs.notes or "")
        key = m.group(1) if m else "?"
        by_series[key] = by_series.get(key, 0) + 1
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"official_release_date: {evidence.official_release_date or '(unknown)'}")
    print(f"observations: {len(observations)}")
    print(f"series_count: {len(by_series)} (expected {len(SECTION_C_SERIES)})")
    # Sample: food division K22C latest + chemicals K232
    for sample_cdid in ("K22C", "K232", "K23U"):
        rows = [o for o in observations if f"series={sample_cdid}" in o.notes]
        if rows:
            last = rows[-1]
            print(
                f"sample {sample_cdid}: {last.period_start} value={last.value} "
                f"({SERIES_BY_CDID[sample_cdid].short_label})"
            )
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"annual_pack: {annual_path}")
    weights_path = write_weights_pack(
        connector.data_root / evidence.path,
        connector.data_root / "curated" / "weights.json",
    )
    print(f"weights_pack: {weights_path}")


if __name__ == "__main__":
    import sys

    main_weights() if "--weights-only" in sys.argv else main()

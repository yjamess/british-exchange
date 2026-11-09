"""Domestic EPC lodgements by energy efficiency band — England and Wales.

Source: MHCLG *Energy Performance of Buildings Certificates* statistical
release, live tables (quarterly, Official Statistics):

- **D1** — domestic EPCs for all dwellings by energy efficiency rating (EER
  band A–G + not recorded), England and Wales / England / Wales / English
  region / local authority, by calendar quarter (and calendar-year totals for
  the three country sheets).
- **EB1** / **NB1** — the same for existing dwellings / new dwellings
  (country and region sheets ingested; their LA sheets are published but not
  ingested — D1 carries the LA detail).

Two registry indicators from the one source (one connector):

- ``epc-domestic-lodgements`` — England and Wales / England / Wales /
  English regions; D1 + EB1 + NB1 (~26k rows).
- ``epc-domestic-lodgements-by-local-authority`` — D1 by local authority
  (~217k rows; kept separate so the national package stays light).

Every value is a published count of **certificates lodged on the register in
the period** — an administrative record of transactions (sales, lettings,
new build, conversions, scheme assessments), not a count or sample of the
dwelling stock. A property can have several certificates over time (repeat
or superseded lodgements); homes that have not been sold, let or built since
2008 never appear. Not representative of all homes — use
``ehs-energy-efficiency-bands`` for a stock estimate (England, survey).

Rows not ingested: cumulative '(Total)' / blank-quarter rows (QA checks the
quarters sum to them) and the total-floor-area column (different unit).
Nothing is summed, modelled or apportioned.

Run:
  uv run python -m housing.connectors.epc_domestic_lodgements
"""

from __future__ import annotations

import json
import re
import shutil
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.connectors.ehs_da_parse import REGIONS
from housing.ods_util import read_ods_sheet

INDICATOR_ID = "epc-domestic-lodgements"
LA_INDICATOR_ID = "epc-domestic-lodgements-by-local-authority"
RETRIEVED = "2026-11-04"
PIN_ROOT = HOUSING_DATA / "_epc_pin" / RETRIEVED
RELEASE_DATE = "2026-10-29"  # 'originally published at 9.30am 29 October 2026'
RELEASE_LABEL = "EPB live tables 2026-10-29 (to 2026-09-30)"
LIVE_TABLES = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "live-tables-on-energy-performance-of-buildings-certificates"
)
RELEASE_PAGE = (
    "https://www.gov.uk/government/statistics/"
    "energy-performance-of-building-certificates-in-england-and-wales-july-to-september-2026"
)
TECHNICAL_NOTES = (
    "https://www.gov.uk/government/publications/"
    "energy-performance-of-buildings-certificates-in-england-and-wales-technical-notes"
)
MEDIA = "https://assets.publishing.service.gov.uk/media"
ODS = "application/vnd.oasis.opendocument.spreadsheet"
UNIT = "certificates lodged"

COUNTRY = {
    "England_and_Wales": ("K04000001", "England and Wales"),
    "England_Only": ("E92000001", "England"),
    "Wales_Only": ("W92000004", "Wales"),
}
UNALLOCATED = ("EPC-UNALLOCATED", "Not allocated to an area (published as 'Unknown')")
LA_CODE = re.compile(r"^(E06|E07|E08|E09|W06)\d{6}$")
QUARTER = re.compile(r"^(\d{4})/([1-4])$")
BAND_COLUMNS = {
    "number lodgements": "lodgements-total",
    "a": "band-a",
    "b": "band-b",
    "c": "band-c",
    "d": "band-d",
    "e": "band-e",
    "f": "band-f",
    "g": "band-g",
    "not recorded": "band-not-recorded",
}


@dataclass(frozen=True, slots=True)
class Table:
    key: str  # D1 | EB1 | NB1
    media_id: str
    file_name: str
    dwelling_status: str  # all | existing | new
    include_la: bool


TABLES: tuple[Table, ...] = (
    Table("D1", "6ae0bbc016428df537606223", "D1-_Domestic_Properties.ods", "all", True),
    Table("EB1", "6ae0ba657b7111c482d80a39", "EB1-_Existing_Domestic_Properties.ods", "existing", False),
    Table("NB1", "6ae0bb50e4367e5c8b046788", "NB1-_New_Domestic_Properties.ods", "new", False),
)

# Short, parseable caveat flag on every row (manifest caveats explain in full;
# kept terse because the LA package has ~217k rows):
# lodgements in the period, not the stock; a property can have repeat /
# superseded certificates; selected population (sales, lets, new build,
# schemes) — not representative of all homes.
CAVEAT_FLAGS = "caveat=lodgements-not-stock|repeat-or-superseded-certificates|selected-population"


def _number(text: str) -> float | None:
    cleaned = text.strip().replace(",", "")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _quarter_period(label: str) -> tuple[str, str]:
    match = QUARTER.match(label.strip())
    if not match:
        raise ValueError(f"not a quarter label: {label!r}")
    year, q = int(match.group(1)), int(match.group(2))
    start_month = 3 * (q - 1) + 1
    end_month = start_month + 2
    end_day = {3: 31, 6: 30, 9: 30, 12: 31}[end_month]
    return f"{year:04d}-{start_month:02d}-01", f"{year:04d}-{end_month:02d}-{end_day:02d}"


def _header(rows: list[list[str]]) -> tuple[int, dict[int, str]]:
    for idx, row in enumerate(rows[:8]):
        labels = [c.strip().lower() for c in row]
        if "number lodgements" in labels:
            cols = {col: BAND_COLUMNS[label] for col, label in enumerate(labels) if label in BAND_COLUMNS}
            if len(cols) != len(BAND_COLUMNS):
                raise ValueError(f"EPC header incomplete: {labels}")
            return idx, cols
    raise ValueError("EPC header row ('Number Lodgements') not found")


@dataclass(frozen=True, slots=True)
class EpcRow:
    table: str
    dwelling_status: str
    level: str  # country | region | local-authority
    geography_code: str
    geography_label: str
    period_type: str  # calendar-quarter | calendar-year
    period_label: str
    period_start: str
    period_end: str
    series: str
    raw: str
    value: float


def parse_epc_table(path: Path, table: Table) -> list[EpcRow]:
    out: list[EpcRow] = []
    prefix = table.key

    def emit(row: list[str], cols: dict[int, str], *, level: str, geo: tuple[str, str], ptype: str, plabel: str, start: str, end: str) -> None:
        for col, series in cols.items():
            raw = row[col].strip() if col < len(row) else ""
            value = _number(raw)
            if value is None:
                raise ValueError(f"{prefix} {geo[1]} {plabel} {series}: non-numeric {raw!r}")
            out.append(
                EpcRow(prefix, table.dwelling_status, level, geo[0], geo[1], ptype, plabel, start, end, series, raw, value)
            )

    for sheet, geo in COUNTRY.items():
        rows = read_ods_sheet(path, f"{prefix}_{sheet}")
        idx, cols = _header(rows)
        for row in rows[idx + 1 :]:
            if not row or not row[0].strip():
                continue
            year_label = row[0].strip()
            quarter_label = row[1].strip() if len(row) > 1 else ""
            if year_label.startswith("("):
                continue  # '(Total)' cumulative row — QA reconciles, not ingested
            if quarter_label:
                start, end = _quarter_period(quarter_label)
                if not quarter_label.startswith(year_label):
                    raise ValueError(f"{prefix} {sheet}: year {year_label} vs quarter {quarter_label}")
                emit(row, cols, level="country", geo=geo, ptype="calendar-quarter", plabel=quarter_label, start=start, end=end)
            elif re.fullmatch(r"\d{4}", year_label):
                emit(
                    row, cols, level="country", geo=geo, ptype="calendar-year", plabel=year_label,
                    start=f"{year_label}-01-01", end=f"{year_label}-12-31",
                )
            else:
                raise ValueError(f"{prefix} {sheet}: unexpected row label {year_label!r}")

    rows = read_ods_sheet(path, f"{prefix}_by_Region")
    idx, cols = _header(rows)
    for row in rows[idx + 1 :]:
        if not row or not row[0].strip():
            continue
        name = row[0].strip()
        quarter_label = row[1].strip() if len(row) > 1 else ""
        if not quarter_label:
            continue  # cumulative 2008–latest total per region
        if name.lower() == "unknown":
            geo = UNALLOCATED
        else:
            if name.lower() not in REGIONS:
                raise ValueError(f"{prefix} region {name!r} unknown")
            _, code, label = REGIONS[name.lower()]
            geo = (code, label)
        start, end = _quarter_period(quarter_label)
        emit(row, cols, level="region", geo=geo, ptype="calendar-quarter", plabel=quarter_label, start=start, end=end)

    if table.include_la:
        rows = read_ods_sheet(path, f"{prefix}_by_LA")
        idx, cols = _header(rows)
        for row in rows[idx + 1 :]:
            if not row or not row[0].strip():
                continue
            code = row[0].strip()
            name = row[1].strip()
            quarter_label = row[2].strip()
            if not quarter_label:
                continue
            if LA_CODE.match(code):
                geo = (code, name)
            elif code.lower() == "unknown":
                geo = UNALLOCATED
            else:
                raise ValueError(f"{prefix} LA code {code!r} not an ONS LA code")
            start, end = _quarter_period(quarter_label)
            emit(row, cols, level="local-authority", geo=geo, ptype="calendar-quarter", plabel=quarter_label, start=start, end=end)
    return out


def _notes(row: EpcRow) -> str:
    parts = [f"series={row.series}", "tenure=all-tenures"]
    if row.dwelling_status == "all":
        parts.append("breakdown=none")
    else:
        parts += [
            "breakdown=dwelling-status",
            f"dwelling-status={row.dwelling_status}",
            f"category=dwelling-status:{row.dwelling_status}",
        ]
    parts += [
        "observation-type=administrative-record",
        f"table={row.table}",
        f"geography-level={row.level}",
        f"period-type={row.period_type}",
        "base=certificates-lodged",
        CAVEAT_FLAGS,
    ]
    if row.level == "local-authority":
        parts.append("la-code=as-published")
    if row.geography_code == UNALLOCATED[0]:
        parts.append("area=unallocated-as-published-unknown")
    return "; ".join(parts)


def ensure_pins() -> dict[str, dict[str, str]]:
    """Download each live table once into data/housing/_epc_pin/<date>/."""
    PIN_ROOT.mkdir(parents=True, exist_ok=True)
    record_file = PIN_ROOT / "retrieval.json"
    records: dict[str, dict[str, str]] = (
        json.loads(record_file.read_text(encoding="utf-8")) if record_file.is_file() else {}
    )
    for table in TABLES:
        url = f"{MEDIA}/{table.media_id}/{table.file_name}"
        target = PIN_ROOT / table.file_name
        record = records.get(table.key)
        if not target.is_file() or record is None:
            request = urllib.request.Request(url, headers={"User-Agent": "british-exchange/epc"})
            with urllib.request.urlopen(request, timeout=180) as response:  # noqa: S310 (gov.uk)
                target.write_bytes(response.read())
                record = {
                    "retrieved_at": datetime.now(timezone.utc).isoformat(),
                    "last_modified": response.headers.get("Last-Modified", ""),
                    "http_status": str(response.status),
                }
        records[table.key] = {
            **record,
            "url": url,
            "file_name": table.file_name,
            "checksum_sha256": sha256_file(target),
            "official_release_date": RELEASE_DATE,
        }
    record_file.write_text(json.dumps(records, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return records


def pin_into(root: Path, tables: Sequence[Table]) -> list[RawEvidence]:
    """Copy staged pins into <root>/raw/<date>/ (immutable per-indicator evidence)."""
    records = ensure_pins()
    raw_dir = root / "raw" / RETRIEVED
    raw_dir.mkdir(parents=True, exist_ok=True)
    evidence: list[RawEvidence] = []
    for table in tables:
        source = PIN_ROOT / table.file_name
        dest = raw_dir / table.file_name
        if not dest.is_file() or sha256_file(dest) != sha256_file(source):
            shutil.copy2(source, dest)
        record = records[table.key]
        evidence.append(
            RawEvidence(
                path=f"raw/{RETRIEVED}/{table.file_name}",
                retrieved_at=record["retrieved_at"],
                checksum_sha256=sha256_file(dest),
                content_type=ODS,
                official_release_date=RELEASE_DATE,
                http_status=int(record["http_status"]) if record.get("http_status", "").isdigit() else None,
                source_url=record["url"],
            )
        )
    return evidence


def published_notes(path: Path) -> list[str]:
    """Publisher's own 'Notes' sheet text (quoted into the manifest caveats)."""
    rows = read_ods_sheet(path, "Notes")
    return [f"{r[0].strip()}: {r[1].strip()}" for r in rows if len(r) > 1 and r[0].strip().lower().startswith("note ")]


class EpcDomesticLodgementsConnector(Connector):
    """``scope='national'`` → country + region (D1/EB1/NB1); ``'la'`` → D1 by LA."""

    def __init__(self, scope: str = "national", data_root: Path | None = None) -> None:
        if scope not in ("national", "la"):
            raise ValueError(scope)
        self.scope = scope
        self._id = INDICATOR_ID if scope == "national" else LA_INDICATOR_ID
        self.tables = TABLES if scope == "national" else (TABLES[0],)
        super().__init__(data_root or (HOUSING_DATA / self._id))

    @property
    def indicator_id(self) -> str:
        return self._id

    def evidence(self) -> list[RawEvidence]:
        return pin_into(self.data_root, self.tables)

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        d1 = self.data_root / next(e.path for e in evidence if e.path.endswith(TABLES[0].file_name))
        publisher_notes = " | ".join(n for n in published_notes(d1) if n.lower().startswith(("note 1", "note 2", "note 3", "note 5")))
        national = self.scope == "national"
        return Manifest(
            indicator_id=self._id,
            title=(
                "Domestic EPC lodgements by energy efficiency band (England and Wales)"
                if national
                else "Domestic EPC lodgements by energy efficiency band, by local authority"
            ),
            sector="housing-land",
            publisher="MHCLG · Energy Performance of Buildings Certificates statistics",
            source_url=LIVE_TABLES,
            series_id=(
                "EPB live tables D1 (all dwellings), EB1 (existing), NB1 (new) — energy efficiency rating"
                if national
                else "EPB live table D1_by_LA — domestic EPCs by energy efficiency rating, per local authority"
            ),
            geography=(
                "England and Wales (K04000001), England (E92000001), Wales (W92000004), "
                "English regions (E12000001–E12000009), plus 'Unknown' unallocated "
                "lodgements (EPC-UNALLOCATED, region sheet)"
                if national
                else "Local authorities as published (E06/E07/E08/E09, W06 codes at "
                "lodgement) plus 'Unknown' unallocated lodgements (EPC-UNALLOCATED)"
            ),
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "Number of domestic Energy Performance Certificates lodged on the "
                "England and Wales register in each calendar quarter (Q4 2008 onwards; "
                "calendar-year totals as published for the country sheets), by "
                "energy efficiency rating band A–G and 'not recorded' "
                "(series=band-a … band-g, band-not-recorded) and in total "
                "(series=lodgements-total). breakdown=none is all dwellings (D1); "
                "breakdown=dwelling-status splits existing (EB1) and new (NB1) dwellings."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.epc_domestic_lodgements",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (late Jan / Apr / Jul / Oct; next 2027-01-28)",
            raw_evidence=list(evidence),
            transformations=(
                "Read the country (England and Wales / England / Wales), region and "
                "(D1 only) local-authority sheets of D1, EB1 and NB1; one row per "
                "published count cell (lodgements total + 8 band columns). Quarter "
                "'YYYY/q' → calendar quarter period; year rows → calendar year. "
                "Cumulative '(Total)' rows and region rows with no quarter are not "
                "ingested (QA reconciles them). Region names → ONS E12 codes; LA codes "
                "kept as published; 'Unknown' → EPC-UNALLOCATED. Total floor area (m²) "
                "not ingested. No values summed, shared out or modelled."
            ),
            caveats=(
                "Administrative record of certificates lodged in the period — NOT the "
                "dwelling stock and NOT a survey: buildings need an EPC only when sold, "
                "let or constructed (plus some scheme assessments), so dwellings not "
                "transacted since 2008 are absent and frequently-let homes recur. One "
                "property can have several certificates (repeat or superseded "
                "lodgements, e.g. a re-assessment after improvement); counts are "
                "certificates, not distinct homes. Selected population — compare with "
                "EHS energy efficiency bands (survey estimate of all England dwellings) "
                "rather than treating band shares as stock shares. Bands follow the SAP "
                "methodology in force at lodgement (RdSAP for existing dwellings); the "
                "rating ignores energy prices. LA codes are as published by the register "
                "(codes of the authority at lodgement: reorganised areas start or stop "
                "mid-series, e.g. North/West Northamptonshire from 2021 Q2, Cumberland / "
                "Westmorland and Furness, North Yorkshire and Somerset from 2023 Q2). "
                "The 29 Oct 2026 tables were aligned to the address-level open data and "
                "region/LA allocation methodology was updated, so figures for all "
                "quarters are lower than in earlier releases (publisher cover sheet). "
                "Quarters are revised each release. Publisher notes: " + publisher_notes
            ),
            revision_notes=(
                "2026-11-04: initial ingest from the 29 October 2026 live tables "
                "(data to 30 September 2026). Earlier releases are superseded, not "
                "archived here."
            ),
            related_indicator_ids=[
                LA_INDICATOR_ID if national else INDICATOR_ID,
                "ehs-energy-efficiency-bands",
                "ehs-energy-improvement",
                "ehs-insulation",
                "ehs-heating",
            ],
            notion_registry_url="",
            open_questions=[
                "Certificate-level data (one row per certificate, with UPRN/address, "
                "lodgement date, transaction type, superseding links) is on "
                "get-energy-performance-data.communities.gov.uk and requires a GOV.UK "
                "One Login account — not used. A deduplicated 'latest certificate per "
                "property' stock view would need that pipeline (certificate lifecycle, "
                "supersession, address/UPRN matching, expiry after 10 years).",
                "EB1 / NB1 local-authority sheets and tables D2–D4 (environmental "
                "impact rating, floor area / energy use, transaction type × tenure) are "
                "published but not ingested.",
            ],
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        observations: list[Observation] = []
        for table in self.tables:
            ev = next(e for e in evidence if e.path.endswith(table.file_name))
            for row in parse_epc_table(self.data_root / ev.path, table):
                if (row.level == "local-authority") != (self.scope == "la"):
                    continue
                observations.append(
                    Observation(
                        indicator_id=self._id,
                        period_start=row.period_start,
                        period_end=row.period_end,
                        geography_code=row.geography_code,
                        geography_label=row.geography_label,
                        value=row.value,
                        unit=UNIT,
                        observation_status="final",
                        source_version=RELEASE_LABEL,
                        notes=_notes(row),
                    )
                )
        keys = {(o.period_start, o.period_end, o.geography_code, o.notes) for o in observations}
        if len(keys) != len(observations):
            raise ValueError("duplicate EPC natural keys")
        level_order = {"country": 0, "region": 1, "local-authority": 2}
        observations.sort(
            key=lambda o: (
                level_order[re.search(r"geography-level=([^;]+)", o.notes).group(1)],  # type: ignore[union-attr]
                o.geography_code,
                o.period_start,
                o.period_end,
                o.notes,
            )
        )
        return observations


def main() -> None:
    for scope in ("national", "la"):
        connector = EpcDomesticLodgementsConnector(scope)
        evidence = connector.evidence()
        observations = connector.transform(evidence)
        connector.write_hand_off(evidence, observations)
        print(f"{connector.indicator_id}: rows={len(observations)}")
        for o in observations:
            if o.geography_code == "K04000001" and o.period_start == "2026-07-01" and "breakdown=none" in o.notes:
                print(f"  2026Q3 E&W {o.notes.split(';')[0]} = {o.value:,.0f}")


if __name__ == "__main__":
    main()

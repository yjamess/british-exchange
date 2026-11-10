"""HM Land Registry — titles held by UK and overseas companies (CCOD + OCOD).

Counts registered titles in England and Wales whose proprietors are companies,
from the two monthly full files on HM Land Registry's Use land and property data
service:

  ccod  UK companies that own property in England and Wales
  ocod  Overseas companies that own property in England and Wales

Only aggregate counts are kept. No title, address or company name leaves this
module. The raw zips (CCOD is 1.59 GB unzipped) stream through a temporary
folder and are deleted; their checksums and retrieval times go in the manifest.
The API serves only the current month, so each run appends that month to the
curated CSV instead of replacing it. Pull the curated CSV from the archive
before a refresh so earlier months are kept:

  uv run python -m britain_exchange.archive_data pull data/housing/corporate-owned-titles
  uv run python -m housing.connectors.corporate_ownership

Env: HMLR_API_KEY (Use land and property data account, licence accepted).
Ref: https://use-land-property-data.service.gov.uk/api-information
Tech spec: https://www.gov.uk/government/publications/overseas-companies-ownership-data-technical-specification
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import tempfile
import zipfile
from calendar import monthrange
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.db import load_repo_env
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import CURATED_FIELDNAMES, Observation
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "corporate-owned-titles"
API_BASE = "https://use-land-property-data.service.gov.uk/api/v1"
SOURCE_LANDING = "https://use-land-property-data.service.gov.uk/datasets"
DATASETS: dict[str, str] = {"ccod": "uk-company", "ocod": "overseas-company"}

EW_CODE = "K04000001"
EW_LABEL = "England and Wales"

LAD_URL = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "LAD_DEC_2024_UK_NC/FeatureServer/0/query"
    "?where=1%3D1&outFields=LAD24CD,LAD24NM,LAD24NMW&returnGeometry=false&f=json"
)
# Land Registry district names that differ from ONS LAD 2024 names.
DISTRICT_ALIASES: dict[str, str] = {
    "RHONDDA CYNON TAFF": "Rhondda Cynon Taf",
    "HEREFORDSHIRE": "Herefordshire, County of",
    "WREKIN": "Telford and Wrekin",
    "THE VALE OF GLAMORGAN": "Vale of Glamorgan",
}
TENURES = ("Freehold", "Leasehold")
FILE_RE = re.compile(r"^(CCOD|OCOD)_FULL_(\d{4})_(\d{2})\.zip$")


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "not-stated"


def _country(name: str) -> str:
    """Title-case a capitalised country name, keeping "of", "and", "the" small."""
    words = name.title().split()
    small = {"Of", "And", "The", "Da", "De"}
    return " ".join(w.lower() if i and w in small else w for i, w in enumerate(words))


def _key(name: str) -> str:
    text = name.lower().replace("&", "and")
    for drop in ("city of ", ", city of", "county of ", ", county of"):
        text = text.replace(drop, "")
    return re.sub(r"[^a-z]", "", text.replace("st. ", "st "))


# ——— Fetch ———


def _api_key() -> str:
    load_repo_env()
    key = os.environ.get("HMLR_API_KEY", "").strip()
    if not key:
        raise SystemExit("HMLR_API_KEY is not set (repo .env)")
    return key


def latest_full_file(client: httpx.Client, dataset: str) -> tuple[str, str]:
    """Return (file name, last_updated ISO date) of the dataset's current full file."""
    response = client.get(f"{API_BASE}/datasets/{dataset}")
    response.raise_for_status()
    result = response.json()["result"]
    names = [r["file_name"] for r in result["resources"] if FILE_RE.match(r["file_name"])]
    if len(names) != 1:
        raise RuntimeError(f"{dataset}: expected one full file, got {names}")
    updated = datetime.strptime(result["last_updated"], "%d %B %Y").date().isoformat()
    return names[0], updated


def download(client: httpx.Client, dataset: str, file_name: str, dest: Path) -> str:
    """Stream one file to dest and return its sha256. The signed link lasts ~10 s."""
    link = client.get(f"{API_BASE}/datasets/{dataset}/{file_name}")
    link.raise_for_status()
    url = link.json()["result"]["download_url"]
    digest = hashlib.sha256()
    with httpx.stream("GET", url, timeout=600.0, follow_redirects=True) as response:
        response.raise_for_status()
        with dest.open("wb") as handle:
            for chunk in response.iter_bytes(1024 * 1024):
                handle.write(chunk)
                digest.update(chunk)
    checksum = digest.hexdigest()
    if sha256_file(dest) != checksum:
        raise RuntimeError(f"Checksum mismatch writing {dest}")
    return checksum


def fetch_lad_lookup(dest: Path) -> dict[str, tuple[str, str]]:
    """ONS LAD Dec 2024 names → (code, name), England and Wales only."""
    response = httpx.get(LAD_URL, timeout=60.0)
    response.raise_for_status()
    dest.write_bytes(response.content)
    return load_lad_lookup(dest)


def load_lad_lookup(path: Path) -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for feature in json.loads(path.read_text())["features"]:
        a = feature["attributes"]
        code, name = a["LAD24CD"], a["LAD24NM"]
        if code[0] not in "EW":
            continue
        for label in (name, a.get("LAD24NMW")):
            if label:
                out[_key(label)] = (code, name)
    if len(out) < 300:
        raise ValueError(f"LAD lookup looks short: {len(out)} names")
    return out


# ——— Count ———


@dataclass
class Tally:
    origin: str
    titles: int = 0
    trailer: int | None = None
    by_tenure: Counter[str] = field(default_factory=Counter)
    by_district: Counter[str] = field(default_factory=Counter)
    by_type: Counter[str] = field(default_factory=Counter)
    by_country: Counter[str] = field(default_factory=Counter)
    companies: set[str] = field(default_factory=set)
    title_numbers: set[str] = field(default_factory=set)
    in_both: int = 0


def count_file(
    zip_path: Path, origin: str, *, keep_titles: bool = False, other: set[str] | None = None
) -> Tally:
    """Stream the CSV inside a full-file zip into counts (one title = one row)."""
    tally = Tally(origin=origin)
    with zipfile.ZipFile(zip_path) as archive:
        (member,) = [n for n in archive.namelist() if n.lower().endswith(".csv")]
        with archive.open(member) as raw:
            reader = csv.reader(io.TextIOWrapper(raw, encoding="utf-8", newline=""))
            header = next(reader)
            col = {name: i for i, name in enumerate(header)}
            reg_cols = [col[f"Company Registration No. ({i})"] for i in range(1, 5)]
            country_col = col.get("Country Incorporated (1)")
            for row in reader:
                if row and row[0] == "Row Count:":
                    tally.trailer = int(row[1])
                    continue
                tenure = row[col["Tenure"]]
                if tenure not in TENURES:
                    raise ValueError(f"{zip_path.name}: unexpected tenure {tenure!r}")
                tally.titles += 1
                tally.by_tenure[tenure] += 1
                tally.by_district[row[col["District"]].strip()] += 1
                tally.by_type[row[col["Proprietorship Category (1)"]].strip()] += 1
                if country_col is not None:
                    tally.by_country[row[country_col].strip()] += 1
                for i in reg_cols:
                    number = row[i].strip().upper()
                    if number:
                        tally.companies.add(number)
                title = row[col["Title Number"]]
                if keep_titles:
                    tally.title_numbers.add(title)
                if other is not None and title in other:
                    tally.in_both += 1
    if tally.trailer != tally.titles:
        raise ValueError(
            f"{zip_path.name}: counted {tally.titles} titles, trailer says {tally.trailer}"
        )
    return tally


def observations_for(
    tallies: Sequence[Tally],
    lads: dict[str, tuple[str, str]],
    *,
    year: int,
    month: int,
    source_version: str,
) -> list[Observation]:
    start = f"{year:04d}-{month:02d}-01"
    end = f"{year:04d}-{month:02d}-{monthrange(year, month)[1]:02d}"

    def obs(value: float, notes: str, *, code: str = EW_CODE, label: str = EW_LABEL,
            unit: str = "titles") -> Observation:
        return Observation(
            indicator_id=INDICATOR_ID,
            period_start=start,
            period_end=end,
            geography_code=code,
            geography_label=label,
            value=float(value),
            unit=unit,
            observation_status="final",
            source_version=source_version,
            notes=notes,
        )

    out: list[Observation] = []
    unmatched: Counter[str] = Counter()
    for t in tallies:
        out.append(obs(t.titles, f"series=owner-origin; category={t.origin}"))
        for tenure in TENURES:
            out.append(
                obs(
                    t.by_tenure[tenure],
                    f"series=owner-origin; category={t.origin}; tenure={tenure.lower()}",
                )
            )
        by_lad: Counter[tuple[str, str]] = Counter()
        for district, n in t.by_district.items():
            hit = lads.get(_key(DISTRICT_ALIASES.get(district, district)))
            if hit is None:
                unmatched[district] += n
            else:
                by_lad[hit] += n
        for (code, name), n in sorted(by_lad.items()):
            out.append(
                obs(n, f"series=owner-origin; category={t.origin}", code=code, label=name)
            )
        for label, n in t.by_type.most_common():
            out.append(
                obs(
                    n,
                    f"series={t.origin}-owner-type; category={_slug(label)}; "
                    f"category_label={label or 'Not stated'}",
                )
            )
        for label, n in t.by_country.most_common():
            out.append(
                obs(
                    n,
                    f"series=overseas-country; category={_slug(label)}; "
                    f"category_label={_country(label) or 'Not stated'}",
                )
            )
        if t.origin == "uk-company":
            out.append(
                obs(
                    len(t.companies),
                    "series=proprietors; category=uk-companies-with-number",
                    unit="companies",
                )
            )
    if unmatched:
        raise ValueError(f"Districts with no ONS LAD 2024 match: {dict(unmatched)}")
    return out


# ——— Connector ———


class CorporateOwnershipConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Titles held by UK and overseas companies",
            sector="housing-land",
            publisher="HM Land Registry",
            source_url=SOURCE_LANDING,
            series_id="CCOD and OCOD full files (UK and overseas companies that own property)",
            geography="England and Wales; local authorities (ONS LAD December 2024)",
            frequency="monthly",
            unit="titles, or companies",
            definition=(
                "Registered titles in England and Wales whose registered proprietor is a "
                "company or other corporate body, as at the monthly release. A title is a "
                "registered estate, not a home: one title can cover many addresses or none. "
                "Owner type and country are those of the first proprietor."
            ),
            licence=(
                "HM Land Registry CCOD and OCOD licence, accepted on the Use land and "
                "property data service. Attribution: contains HM Land Registry data © Crown "
                "copyright and database right. Only aggregate counts are republished."
            ),
            agent_owner="housing",
            connector_module="housing.connectors.corporate_ownership",
            curated_path="curated/observations.csv",
            update_cadence="Monthly; HM Land Registry publishes in the first working days",
            raw_evidence=list(evidence),
            transformations=(
                "Stream each full-file CSV, skip the 'Row Count:' trailer and check it "
                "equals the rows read. Count titles by origin (CCOD = UK company, OCOD = "
                "overseas company), tenure, district, first proprietor's category and, for "
                "OCOD, first proprietor's country. Districts map to ONS LAD December 2024 "
                "codes by name, with four aliases. Distinct UK companies = distinct "
                "registration numbers across proprietors 1–4. Each run appends its month."
            ),
            caveats=(
                "Raw zips are not retained (CCOD is 1.59 GB unzipped); the manifest keeps "
                "their checksums. HM Land Registry's API serves only the current month, so "
                "a past month cannot be re-fetched. Titles held by individuals are not in "
                "these files. Counts are titles, not properties or land area. A title with "
                "a UK and an overseas company proprietor can appear in both files."
            ),
            revision_notes="Domain 09 ingest 2026-11-10, release 2026-11.",
            related_indicator_ids=["dwelling-stock-by-tenure", "residential-mortgage-book"],
            open_questions=[
                "Confirm licence terms for republishing title-level rows before any "
                "company lookup (phase 4).",
            ],
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        raise NotImplementedError("Use run(): raw zips are streamed, not kept on disk")

    def run(self) -> tuple[list[RawEvidence], list[Observation]]:
        key = _api_key()
        evidence: list[RawEvidence] = []
        tallies: list[Tally] = []
        period: tuple[int, int] | None = None
        released = ""
        headers = {"Authorization": key, "Accept": "application/json"}
        with tempfile.TemporaryDirectory(prefix="hmlr-") as tmp, httpx.Client(
            headers=headers, timeout=60.0
        ) as client:
            lad_rel = "raw/ons-lad-dec-2024.json"
            lad_path = self.data_root / lad_rel
            lad_path.parent.mkdir(parents=True, exist_ok=True)
            lads = fetch_lad_lookup(lad_path)
            evidence.append(
                RawEvidence(
                    path=lad_rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=sha256_file(lad_path),
                    content_type="application/json",
                    source_url=LAD_URL,
                )
            )
            ocod_titles: set[str] = set()
            for dataset in ("ocod", "ccod"):
                file_name, released = latest_full_file(client, dataset)
                match = FILE_RE.match(file_name)
                assert match
                this = (int(match.group(2)), int(match.group(3)))
                if period not in (None, this):
                    raise RuntimeError(f"CCOD and OCOD months differ: {period} vs {this}")
                period = this
                dest = Path(tmp) / file_name
                print(f"downloading {file_name} …", flush=True)
                checksum = download(client, dataset, file_name, dest)
                evidence.append(
                    RawEvidence(
                        path=f"not-retained/{file_name}",
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                        checksum_sha256=checksum,
                        content_type="application/zip",
                        official_release_date=released,
                        http_status=200,
                        source_url=f"{API_BASE}/datasets/{dataset}/{file_name}",
                    )
                )
                tally = count_file(
                    dest,
                    DATASETS[dataset],
                    keep_titles=dataset == "ocod",
                    other=ocod_titles if dataset == "ccod" else None,
                )
                if dataset == "ocod":
                    ocod_titles = tally.title_numbers
                else:
                    print(f"titles in both files: {tally.in_both:,}", flush=True)
                dest.unlink()
                tallies.append(tally)
                print(f"{file_name}: {tally.titles:,} titles", flush=True)
        assert period is not None
        year, month = period
        source_version = f"HM Land Registry CCOD and OCOD {year:04d}-{month:02d}, published {released}"
        new = observations_for(tallies, lads, year=year, month=month, source_version=source_version)
        return evidence, new


def read_curated(path: Path) -> list[Observation]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if tuple(reader.fieldnames or ()) != CURATED_FIELDNAMES:
            raise ValueError(f"{path}: unexpected header {reader.fieldnames}")
        return [
            Observation(**{**row, "value": float(row["value"]) if row["value"] else None})
            for row in reader
        ]


def merge_months(existing: Sequence[Observation], new: Sequence[Observation]) -> list[Observation]:
    """Keep earlier months, replace this month; latest month first (sets the release)."""
    month = new[0].period_start
    kept = [o for o in existing if o.period_start != month]
    return sorted([*new, *kept], key=lambda o: o.period_start, reverse=True)


def main() -> None:
    connector = CorporateOwnershipConnector()
    curated = connector.data_root / "curated" / "observations.csv"
    existing = read_curated(curated) if curated.is_file() else []
    evidence, new = connector.run()
    rows = merge_months(existing, new)
    connector.write_hand_off(evidence, rows)
    ew = {
        o.notes: o.value
        for o in new
        if o.geography_code == EW_CODE and o.notes.startswith("series=owner-origin; category=")
        and "tenure" not in o.notes
    }
    print(f"{INDICATOR_ID}: {len(new)} rows this month, {len(rows)} total")
    for notes, value in ew.items():
        print(f"  {notes}: {value:,.0f}")


if __name__ == "__main__":
    main()

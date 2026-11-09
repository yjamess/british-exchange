"""ONS subnational mid-year population estimates (regions + local authorities).

Approach (plain language):
1. Pin the UK MYE mid-2024 tables (MYE2 Persons — All ages by GSS code) for
   nations, English regions, and local authorities on April 2024 boundaries.
2. Pin MYEB mid-2011 to mid-2025 (MYEB1) and sum Female + Male across ages to
   get a local-authority time series for intensity joins 2011–2025.
3. Prefer MYE2 for calendar year 2024 where both exist (newer revision).
4. Emit observations.csv plus curated/population.json for the Energy Geography
   intensity toggle (People owns population; Energy only reads the pack).

Official sources:
- https://www.ons.gov.uk/.../mid2024/mye24tablesuk.xlsx
- https://www.ons.gov.uk/.../mid2011tomid2025/myebtablesuk20112025.xlsx
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import PEOPLE_DATA

PINNED_MYE2 = "raw/2026-11-07/mye24tablesuk.xlsx"
PINNED_MYEB = "raw/2026-11-07/myebtablesuk20112025.xlsx"
SOURCE_LANDING = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland"
)
MYE2_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland/"
    "mid2024/mye24tablesuk.xlsx"
)
MYEB_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/"
    "populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland/"
    "mid2011tomid2025/myebtablesuk20112025.xlsx"
)
OFFICIAL_RELEASE_MYE2 = "2025-09-26"
OFFICIAL_RELEASE_MYEB = "2026-10-01"
UNIT = "persons (mid-year estimate)"
INDICATOR_ID = "subnational-population-estimate"


def _parse_persons(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if not text or text in {"..", "…", "-"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_mye2_persons(path: Path) -> dict[str, dict]:
    """Code → {label, geography, population: {2024: n}} from MYE2 Persons All ages."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    try:
        ws = wb["MYE2 - Persons"]
        header_row = None
        for i, row in enumerate(ws.iter_rows(min_row=1, max_row=20, values_only=True), 1):
            if row and str(row[0] or "").strip().casefold() == "code":
                header_row = i
                break
        if header_row is None:
            raise ValueError("MYE2 Persons: Code header not found")
        places: dict[str, dict] = {}
        for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
            if not row or row[0] is None:
                break
            code = str(row[0]).strip()
            if len(code) != 9:
                continue
            persons = _parse_persons(row[3])
            if persons is None:
                continue
            places[code] = {
                "code": code,
                "label": str(row[1] or "").strip(),
                "geography": str(row[2] or "").strip(),
                "population": {"2024": persons},
                "source": "MYE2-Persons-mid2024",
            }
        if not places:
            raise ValueError("MYE2 Persons: no population rows")
        return places
    finally:
        wb.close()


def parse_myeb1_totals(path: Path) -> dict[str, dict]:
    """LA code → {label, geography, population: {year: n}} from MYEB1 age×sex sums."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    try:
        ws = wb["MYEB1"]
        header = None
        for row in ws.iter_rows(min_row=2, max_row=2, values_only=True):
            header = list(row)
            break
        if not header:
            raise ValueError("MYEB1: missing header")
        year_cols: list[tuple[int, int]] = []
        for i, cell in enumerate(header):
            text = str(cell or "")
            if text.startswith("population_"):
                year_cols.append((i, int(text.split("_", 1)[1])))
        if not year_cols:
            raise ValueError("MYEB1: no population_YYYY columns")

        totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))
        labels: dict[str, str] = {}
        for row in ws.iter_rows(min_row=3, values_only=True):
            if not row or row[0] is None:
                break
            code = str(row[0]).strip()
            labels.setdefault(code, str(row[1] or "").strip())
            for col_i, year in year_cols:
                value = row[col_i]
                if isinstance(value, (int, float)):
                    totals[code][year] += float(value)

        places: dict[str, dict] = {}
        for code, by_year in totals.items():
            places[code] = {
                "code": code,
                "label": labels.get(code, code),
                "geography": "Local authority (MYEB1 ladcode23)",
                "population": {str(y): by_year[y] for y in sorted(by_year)},
                "source": "MYEB1-mid2011tomid2025",
            }
        if not places:
            raise ValueError("MYEB1: no aggregated places")
        return places
    finally:
        wb.close()


def merge_population_places(
    mye2: dict[str, dict],
    myeb: dict[str, dict],
) -> list[dict]:
    """Union of codes; MYE2 wins for 2024; MYEB fills 2011–2025 for LAs."""
    codes = sorted(set(mye2) | set(myeb))
    merged: list[dict] = []
    for code in codes:
        a = mye2.get(code)
        b = myeb.get(code)
        population: dict[str, float] = {}
        if b:
            population.update({k: float(v) for k, v in b["population"].items()})
        if a:
            # Prefer mid-2024 MYE2 revision / April 2024 boundaries.
            population["2024"] = float(a["population"]["2024"])
        label = (a or b)["label"]
        geography = (a or b)["geography"]
        sources = []
        if a:
            sources.append(a["source"])
        if b:
            sources.append(b["source"])
        merged.append(
            {
                "code": code,
                "label": label,
                "geography": geography,
                "population": dict(sorted(population.items(), key=lambda kv: int(kv[0]))),
                "sources": sources,
            }
        )
    return merged


def places_to_observations(places: list[dict]) -> list[Observation]:
    observations: list[Observation] = []
    for place in places:
        for year_s, persons in place["population"].items():
            year = int(year_s)
            status: ObservationStatus = "provisional" if year >= 2025 else "final"
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=f"{year:04d}-06-30",
                    period_end=f"{year:04d}-06-30",
                    geography_code=place["code"],
                    geography_label=place["label"],
                    value=persons,
                    unit=UNIT,
                    observation_status=status,
                    source_version="ONS MYE/MYEB mid-year UK tables",
                    notes=(
                        f"geography={place['geography']}; "
                        f"sources={'+'.join(place['sources'])}; "
                        "usually resident mid-year population"
                    ),
                )
            )
    observations.sort(key=lambda o: (o.geography_code, o.period_start))
    return observations


def write_population_pack(places: list[dict], dest: Path) -> Path:
    years = sorted({int(y) for p in places for y in p["population"]})
    payload = {
        "indicator_id": INDICATOR_ID,
        "unit": UNIT,
        "years": years,
        "places": [
            {
                "code": p["code"],
                "label": p["label"],
                "geography": p["geography"],
                "population": p["population"],
            }
            for p in places
        ],
        "note": (
            "Mid-year usually resident population by GSS code. "
            "Local authorities: MYEB1 totals 2011–2025 (Female+Male, all ages), "
            "with mid-2024 overwritten from MYE2 Persons where available. "
            "Nations and English regions: MYE2 Persons mid-2024 only — "
            "intensity for other energy years uses the mid-2024 denominator and "
            "must say so in the chart Notes."
        ),
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest


class SubnationalPopulationEstimateConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (PEOPLE_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Subnational population estimate",
            sector="people-society",
            publisher="ONS",
            source_url=SOURCE_LANDING,
            series_id="MYE2+MYEB1",
            geography="UK nations, English regions, local authorities (GSS)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Mid-year (30 June) usually resident population by geography code. "
                "Built for joining DESNZ subnational final energy consumption to a "
                "per-resident intensity denominator."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="people",
            connector_module="people.connectors.subnational_population_estimate",
            curated_path="curated/observations.csv",
            update_cadence="annual (mid-year estimates)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/41165471768581129467ceb34c7a15b0",
            transformations=(
                "MYE2 Persons All ages → mid-2024 snapshot for all listed geos; "
                "MYEB1 sum age×sex → LA totals 2011–2025; MYE2 wins for 2024."
            ),
            caveats=(
                "MYEB1 uses ladcode23 (April 2023). MYE2 mid-2024 uses April 2024 "
                "boundaries. Energy subnational LAs use April 2025 structure — "
                "codes that do not match drop out of intensity. Regions lack a "
                "MYEB time series in this pack; only mid-2024 region population "
                "is published here."
            ),
            revision_notes=(
                f"Pinned MYE2 release {OFFICIAL_RELEASE_MYE2}; "
                f"MYEB release {OFFICIAL_RELEASE_MYEB}."
            ),
        )

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        out: list[RawEvidence] = []
        for rel, url, release, ctype in (
            (PINNED_MYE2, MYE2_URL, OFFICIAL_RELEASE_MYE2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            (PINNED_MYEB, MYEB_URL, OFFICIAL_RELEASE_MYEB, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ):
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(path)
            out.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=sha256_file(path),
                    content_type=ctype,
                    official_release_date=release,
                    http_status=200,
                    source_url=url,
                )
            )
        return out

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) < 2:
            raise ValueError("transform() requires MYE2 and MYEB RawEvidence")
        by_name = {e.path: e for e in evidence}
        mye2 = parse_mye2_persons(self.data_root / by_name[PINNED_MYE2].path)
        myeb = parse_myeb1_totals(self.data_root / by_name[PINNED_MYEB].path)
        places = merge_population_places(mye2, myeb)
        # Stash for pack writer in main().
        self._merged_places = places  # type: ignore[attr-defined]
        return places_to_observations(places)


def main() -> None:
    connector = SubnationalPopulationEstimateConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    places = getattr(connector, "_merged_places")
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    pack_path = write_population_pack(places, connector.data_root / "curated" / "population.json")
    print(f"indicator_id: {connector.indicator_id}")
    for ev in evidence:
        print(f"raw: {ev.path} sha256={ev.checksum_sha256}")
    print(f"places: {len(places)}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"population pack: {pack_path}")


if __name__ == "__main__":
    main()

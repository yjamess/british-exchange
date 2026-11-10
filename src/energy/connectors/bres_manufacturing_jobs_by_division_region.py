"""Nomis open-access BRES — manufacturing employee jobs by SIC division × region.

Approach (plain language):
1. Call the Nomis API for dataset NM_189_1 (BRES open access).
2. Pull Great Britain regions (TYPE480) × SIC 2007 divisions 10–33 × years.
3. Keep employment_status=Employees, measure=Count.
4. Store values as thousands of employee jobs (Nomis publishes rounded headcounts).

Why Nomis: ONS Table 4 only publishes Manufacturing as a whole. Places needs
branch × region so an Anatomy industry can show where its jobs sit.

Best practices: pathlib, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
Nomis API: https://www.nomisweb.co.uk/api/v01/help
"""

from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_bytes, sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ENERGY_DATA

PIN_DATE = date(2026, 11, 10)
UNIT = "thousands of employee jobs"
DATASET_ID = "NM_189_1"
SOURCE_LANDING_URL = "https://www.nomisweb.co.uk/datasets/newbres6pub"
API_BASE = f"https://www.nomisweb.co.uk/api/v01/dataset/{DATASET_ID}.data.csv"

# Nomis TYPE480 region codes (England regions + Wales + Scotland). No NI in open access.
REGION_CODES: tuple[tuple[str, str, str], ...] = (
    ("2013265921", "E12000001", "North East"),
    ("2013265922", "E12000002", "North West"),
    ("2013265923", "E12000003", "Yorkshire and The Humber"),
    ("2013265924", "E12000004", "East Midlands"),
    ("2013265925", "E12000005", "West Midlands"),
    ("2013265926", "E12000006", "East of England"),
    ("2013265927", "E12000007", "London"),
    ("2013265928", "E12000008", "South East"),
    ("2013265929", "E12000009", "South West"),
    ("2013265930", "W92000004", "Wales"),
    ("2013265931", "S92000003", "Scotland"),
)

# SIC division 10–33 → Nomis industry codes (CL_189_1_INDUSTRY).
DIVISION_INDUSTRY: tuple[tuple[str, str, str], ...] = (
    ("10", "146800650", "Manufacture of food products"),
    ("11", "146800651", "Manufacture of beverages"),
    ("12", "146800652", "Manufacture of tobacco products"),
    ("13", "146800653", "Manufacture of textiles"),
    ("14", "146800654", "Manufacture of wearing apparel"),
    ("15", "146800655", "Manufacture of leather and related products"),
    ("16", "146800656", "Manufacture of wood and of products of wood and cork"),
    ("17", "146800657", "Manufacture of paper and paper products"),
    ("18", "146800658", "Printing and reproduction of recorded media"),
    ("19", "146800659", "Manufacture of coke and refined petroleum products"),
    ("20", "146800660", "Manufacture of chemicals and chemical products"),
    ("21", "146800661", "Manufacture of basic pharmaceutical products"),
    ("22", "146800662", "Manufacture of rubber and plastic products"),
    ("23", "146800663", "Manufacture of other non-metallic mineral products"),
    ("24", "146800664", "Manufacture of basic metals"),
    ("25", "146800665", "Manufacture of fabricated metal products"),
    ("26", "146800666", "Manufacture of computer, electronic and optical products"),
    ("27", "146800667", "Manufacture of electrical equipment"),
    ("28", "146800668", "Manufacture of machinery and equipment n.e.c."),
    ("29", "146800669", "Manufacture of motor vehicles, trailers and semi-trailers"),
    ("30", "146800670", "Manufacture of other transport equipment"),
    ("31", "146800671", "Manufacture of furniture"),
    ("32", "146800672", "Other manufacturing"),
    ("33", "146800673", "Repair and installation of machinery and equipment"),
)

# Align with Table 4 pin window; Nomis open access starts 2015 with PAYE-only break.
YEARS: tuple[int, ...] = (2019, 2020, 2021, 2022, 2023, 2024)


def _download_url(year: int) -> str:
    geos = ",".join(code for code, _, _ in REGION_CODES)
    inds = ",".join(code for _, code, _ in DIVISION_INDUSTRY)
    return (
        f"{API_BASE}?geography={geos}&date={year}"
        f"&industry={inds}&employment_status=1&measure=1&measures=20100"
    )


class BresManufacturingJobsByDivisionRegionConnector(Connector):
    """Nomis BRES employee jobs: manufacturing SIC division × GB region."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / "bres-manufacturing-jobs-by-division-region")
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return "bres-manufacturing-jobs-by-division-region"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        years = ", ".join(str(y) for y in YEARS)
        return Manifest(
            indicator_id=self.indicator_id,
            title="BRES manufacturing employee jobs by division and region",
            sector="energy-industry",
            publisher="ONS via Nomis",
            source_url=SOURCE_LANDING_URL,
            series_id=f"{DATASET_ID}-SIC2-TYPE480-employees",
            geography=(
                "Great Britain ITL1 / former GSS regions (E12000001–09, "
                "W92000004, S92000003). Northern Ireland is not in Nomis open access."
            ),
            frequency="annual",
            unit=UNIT,
            definition=(
                "Business Register and Employment Survey (BRES) open-access "
                "employee-job counts for manufacturing SIC 2007 divisions 10–33 "
                "by GB country/region (Nomis NM_189_1). Workplace-based. "
                "Complements Table 4 (all manufacturing) with branch × place."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module=(
                "energy.connectors.bres_manufacturing_jobs_by_division_region"
            ),
            curated_path="curated/observations.csv",
            update_cadence="annual (Nomis BRES open access)",
            raw_evidence=list(evidence),
            related_indicator_ids=[
                "bres-manufacturing-employee-jobs-by-region",
                "manufacturing-iop-by-division",
            ],
            transformations=(
                f"Download Nomis NM_189_1 CSV for years {years}: geography=TYPE480 "
                "regions, industry=SIC divisions 10–33, employment_status=Employees, "
                "measure=Count. Convert OBS_VALUE headcounts to thousands "
                "(÷ 1000). Period = calendar year. "
                "observation_status=provisional for the latest year; earlier final. "
                "notes carry sic= and classification=division."
            ),
            revision_notes=(
                "Nomis revises prior years when a new BRES edition lands. Re-pin "
                "raw CSVs on each annual release. Latest year treated as provisional."
            ),
            caveats=(
                "Employee jobs ≠ Workforce Jobs (JWR7). GB only — no Northern "
                "Ireland. Values are rounded (often to the nearest 100 or 1,000). "
                "Division sums will not exactly match Table 4 Manufacturing totals "
                "(rounding and suppressions). PAYE-only discontinuity applies "
                "before 2015 — this pin starts 2019."
            ),
            open_questions=[
                "Add SIC subsections as summed divisions for Anatomy broad branches.",
                "Optional: local-authority cut after region spine is Ready.",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or PIN_DATE
        evidence: list[RawEvidence] = []
        with httpx.Client(timeout=self.timeout_s, follow_redirects=True) as client:
            for year in YEARS:
                relative = f"raw/{day.isoformat()}/nm189_{year}.csv"
                target = self.data_root / relative
                url = _download_url(year)
                if target.is_file() and target.stat().st_size > 500:
                    checksum = sha256_file(target)
                    evidence.append(
                        RawEvidence(
                            path=relative,
                            retrieved_at=datetime.now(timezone.utc).isoformat(),
                            checksum_sha256=checksum,
                            content_type="text/csv",
                            official_release_date="",
                            http_status=200,
                            source_url=url,
                        )
                    )
                    continue
                response = client.get(url)
                response.raise_for_status()
                payload = response.content
                head = payload[:800]
                if b"DATE" not in head or b"GEOGRAPHY" not in head:
                    raise RuntimeError(
                        f"Nomis response for {year} does not look like a data CSV"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
                checksum = sha256_bytes(payload)
                evidence.append(
                    RawEvidence(
                        path=relative,
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                        checksum_sha256=checksum,
                        content_type=response.headers.get("content-type", "text/csv"),
                        official_release_date="",
                        http_status=response.status_code,
                        source_url=url,
                    )
                )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        geo_by_nomis = {code: (gss, label) for code, gss, label in REGION_CODES}
        sic_by_industry = {code: sic for sic, code, _ in DIVISION_INDUSTRY}
        label_by_sic = {sic: label for sic, _, label in DIVISION_INDUSTRY}
        latest_year = max(YEARS)
        observations: list[Observation] = []

        for ev in evidence:
            path = self.data_root / ev.path
            text = path.read_text(encoding="utf-8", errors="replace")
            year = int(path.stem.split("_")[-1])
            status: ObservationStatus = (
                "provisional" if year == latest_year else "final"
            )
            version = f"Nomis {DATASET_ID} {year}"
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                raw = (row.get("OBS_VALUE") or "").strip()
                if not raw:
                    continue
                try:
                    headcount = float(raw)
                except ValueError as exc:
                    raise ValueError(f"Bad OBS_VALUE {raw!r} in {ev.path}") from exc
                thousands = headcount / 1000.0
                ind = (row.get("INDUSTRY") or "").strip()
                sic = sic_by_industry.get(ind)
                if sic is None:
                    # Fallback: parse "20 : Manufacture…"
                    name = row.get("INDUSTRY_NAME") or ""
                    sic = name.split(":", 1)[0].strip()
                geo_nomis = (row.get("GEOGRAPHY") or "").strip()
                gss, label = geo_by_nomis.get(
                    geo_nomis,
                    (
                        (row.get("GEOGRAPHY_CODE") or "").strip(),
                        (row.get("GEOGRAPHY_NAME") or "").strip(),
                    ),
                )
                if not gss:
                    continue
                # Prefer our canonical East of England label over Nomis "East".
                if gss == "E12000006":
                    label = "East of England"
                branch_label = label_by_sic.get(sic, row.get("INDUSTRY_NAME") or sic)
                obs_status = status
                flag = (row.get("OBS_STATUS_NAME") or "").lower()
                if "suppress" in flag or "disclos" in flag:
                    continue
                observations.append(
                    Observation(
                        indicator_id=self.indicator_id,
                        period_start=date(year, 1, 1),
                        period_end=date(year, 12, 31),
                        geography_code=gss,
                        geography_label=label,
                        value=thousands,
                        unit=UNIT,
                        observation_status=obs_status,
                        source_version=version,
                        notes=(
                            f"series=Nomis-{DATASET_ID}; classification=division; "
                            f"sic={sic}; label={branch_label}; "
                            f"measure=employees; geography_type=region; "
                            f"employee_jobs_not_workforce_jobs=true; "
                            f"headcount={headcount:g}"
                        ),
                    )
                )

        observations.sort(
            key=lambda o: (o.period_start, o.notes, o.geography_code)
        )
        if not observations:
            raise ValueError("No Nomis BRES division×region observations curated")
        return observations

def main() -> None:
    connector = BresManufacturingJobsByDivisionRegionConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    print(f"wrote {len(observations)} observations → {curated_path}")
    print(f"manifest → {manifest_path}")


if __name__ == "__main__":
    main()

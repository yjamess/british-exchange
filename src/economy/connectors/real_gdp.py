"""ONS Real GDP (ABMI) — quarterly chained volume £m, seasonally adjusted.

Approach (beginner-friendly):
1. Download the official timeseries JSON and pin it under raw/<date>/.
2. Parse only the ``quarters`` array (skip annual aggregates for this indicator).
3. Emit one Observation per quarter for UK (K02000001).
4. Write curated CSV + manifest via shared Connector.write_hand_off.

Best practices used:
- pathlib.Path for paths (https://docs.python.org/3/library/pathlib.html)
- type hints on public functions (https://docs.python.org/3/library/typing.html)
- Fail loudly on missing keys / bad values; never invent numbers.
"""

from __future__ import annotations

import calendar
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ECONOMY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

SERIES_ID = "ABMI"
DATASET_ID = "PN2"
UNIT = "£ million chained volume (market prices), SA"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2"
)
SOURCE_DATA_URL = f"{SOURCE_LANDING_URL}/data"

QUARTER_NUMBER = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    """Return inclusive ISO dates for a calendar quarter.

    Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep, Q4=Oct–Dec.
    """
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def _parse_quarter_code(raw: str) -> int:
    """Map ONS ``Q1``…``Q4`` to 1…4."""
    code = raw.strip().upper()
    if code not in QUARTER_NUMBER:
        raise ValueError(f"Unexpected quarter code: {raw!r}")
    return QUARTER_NUMBER[code]


def _parse_value(raw: object) -> tuple[float | None, ObservationStatus]:
    """Parse ONS string/number cell; empty → missing."""
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "provisional"
    text = str(raw).strip()
    if not text or text in {"..", "…", "-"}:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "provisional"
    except ValueError as exc:
        raise ValueError(f"Non-numeric ABMI value: {raw!r}") from exc


def _release_date_iso(description: dict[str, Any]) -> str:
    """Official release date from ONS description.releaseDate (date only)."""
    raw = description.get("releaseDate") or ""
    if not raw:
        return ""
    # e.g. 2026-08-12T23:00:00.000Z → 2026-08-13 UTC calendar date, or date part.
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        return str(raw)[:10]


def _source_version(description: dict[str, Any]) -> str:
    release = _release_date_iso(description) or "unknown-release"
    return f"PN2/{SERIES_ID} {release}"


def parse_abmi_quarters(payload: dict[str, Any]) -> list[Observation]:
    """Turn ONS timeseries JSON into quarterly Real GDP observations."""
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError("ONS payload missing description object")

    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != SERIES_ID:
        raise ValueError(f"Expected CDID {SERIES_ID}, got {cdid!r}")

    quarters = payload.get("quarters")
    if not isinstance(quarters, list) or not quarters:
        raise ValueError("ONS payload missing non-empty quarters array")

    version = _source_version(description)
    observations: list[Observation] = []

    for row in quarters:
        if not isinstance(row, dict):
            raise ValueError(f"Quarter row is not an object: {row!r}")
        year_raw = row.get("year")
        quarter_raw = row.get("quarter")
        if year_raw is None or quarter_raw is None:
            raise ValueError(f"Quarter row missing year/quarter: {row!r}")
        year = int(str(year_raw))
        quarter = _parse_quarter_code(str(quarter_raw))
        period_start, period_end = _quarter_bounds(year, quarter)
        value, status = _parse_value(row.get("value"))
        dataset = str(row.get("sourceDataset") or DATASET_ID)
        observations.append(
            Observation(
                indicator_id="real-gdp",
                period_start=period_start,
                period_end=period_end,
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=value,
                unit=UNIT,
                observation_status=status,
                source_version=version,
                notes=f"series={SERIES_ID}; dataset={dataset}; SA CVM £m",
            )
        )

    observations.sort(key=lambda obs: obs.period_start)
    return observations


class RealGdpConnector(Connector):
    """ONS Real GDP — first Economy indicator under the shared contract."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / "real-gdp")
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return "real-gdp"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Real GDP",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id=SERIES_ID,
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="quarterly",
            unit=UNIT,
            definition=(
                "UK GDP at market prices in chained volume measures (CVM), "
                "seasonally adjusted. Levels in £m from ONS CDID ABMI in "
                "dataset PN2 (also published under QNA). Reference/base year "
                "moves with Blue Book (BB2024 last base year 2022)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.real_gdp",
            curated_path="curated/observations.csv",
            update_cadence=(
                "quarterly (ONS GDP first estimate + QNA; Blue Book annually)"
            ),
            raw_evidence=list(evidence),
            notion_registry_url=(
                "https://app.notion.com/40d6547176858109b56fe01fb94ff2eb"
            ),
            transformations=(
                "Download ONS timeseries JSON (ABMI/PN2 /data). Keep only the "
                "quarters array (annual aggregates omitted). Map year+Q→ISO "
                "calendar-quarter bounds. Geography fixed to K02000001 / "
                "United Kingdom. Values parsed as float £m; empty → missing. "
                "observation_status=provisional (PN2 first-estimate family; "
                "ONS revises history)."
            ),
            revision_notes=(
                "ABMI levels are routinely revised: (1) each subsequent GDP "
                "monthly/quarterly release after the first estimate; (2) when "
                "the series moves from PN2 first estimate into QNA; (3) at "
                "Blue Book with supply-and-use balancing and CVM rebasing "
                "(BB2024 restored annual rebasing; last base year 2022 — "
                "confirm on release notes each ingest). Do not treat a pinned "
                "historical point as immutable — re-fetch and re-pin raw JSON, "
                "then compare checksums. observation_status stays "
                "'provisional' for this PN2-sourced slice to signal revision "
                "risk. Record official_release_date from description.releaseDate."
            ),
            caveats=(
                "Legacy api.ons.gov.uk retired 2024-11-25; ingest uses website "
                "timeseries JSON. Historical levels revise each quarterly "
                "release and Blue Book. Annual rows present in raw JSON but "
                "not written to curated observations."
            ),
            open_questions=[
                "Prefer QNA vintage after second estimate vs always PN2 landing?",
                "Should Validation also want annual ABMI aggregates as a second file?",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        """Download ABMI/PN2 JSON into raw/<YYYY-MM-DD>/ and return evidence."""
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/abmi_pn2.json"
        # Peek release date after download for evidence metadata.
        result = self.fetch_url(SOURCE_DATA_URL, relative)
        release_date = ""
        try:
            payload = json.loads(result.path.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and isinstance(payload.get("description"), dict):
                release_date = _release_date_iso(payload["description"])
        except (json.JSONDecodeError, OSError):
            release_date = ""
        # Rebuild evidence with official_release_date filled (path/checksum unchanged).
        evidence = RawEvidence(
            path=result.evidence.path,
            retrieved_at=result.evidence.retrieved_at,
            checksum_sha256=result.evidence.checksum_sha256,
            content_type=result.evidence.content_type,
            official_release_date=release_date,
            http_status=result.evidence.http_status,
            source_url=result.evidence.source_url,
        )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(f"Raw JSON not found: {raw_path}")
        payload = json.loads(raw_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"Expected JSON object in {raw_path}")
        return parse_abmi_quarters(payload)


def main() -> None:
    """Fetch → transform → write hand-off for real-gdp."""
    connector = RealGdpConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)

    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    print(f"official_release_date: {evidence.official_release_date or '(unknown)'}")
    print(f"observations: {len(observations)}")
    if observations:
        first, last = observations[0], observations[-1]
        print(
            f"range: {first.period_start} → {last.period_start} "
            f"(last value={last.value})"
        )
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()

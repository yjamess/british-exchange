"""Shared ONS website timeseries JSON helpers for Economy connectors.

Approach (beginner-friendly):
1. Download ``…/timeseries/<cdid>/<dataset>/data`` JSON and pin under raw/.
2. Keep either the ``months`` or ``quarters`` array (skip other aggregates).
3. Emit typed Observations via the shared Connector contract.

Best practices:
- pathlib.Path for paths (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- dataclasses for config (https://docs.python.org/3/library/dataclasses.html)
- Fail loudly on missing keys / bad values; never invent numbers.
"""

from __future__ import annotations

import calendar
import json
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Literal, Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import ECONOMY_DATA

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

PeriodKind = Literal["months", "quarters"]
Frequency = Literal["monthly", "quarterly"]

MONTH_NAME_TO_NUM = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

QUARTER_NUMBER = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}


@dataclass(frozen=True, slots=True)
class OnsSeriesSpec:
    """Configuration for one ONS timeseries → one registry indicator."""

    indicator_id: str
    title: str
    series_id: str
    dataset_id: str
    landing_url: str
    unit: str
    definition: str
    frequency: Frequency
    period_kind: PeriodKind
    notion_registry_url: str
    connector_module: str
    update_cadence: str
    transformations: str
    revision_notes: str
    caveats: str
    related_indicator_ids: list[str] = field(default_factory=list)
    open_questions: list[str] = field(default_factory=list)
    publisher: str = "ONS"
    geography: str = "United Kingdom (K02000001); excl. Crown dependencies"
    licence: str = "Open Government Licence v3.0"
    raw_filename: str = ""

    @property
    def data_url(self) -> str:
        return f"{self.landing_url.rstrip('/')}/data"

    @property
    def archive_name(self) -> str:
        if self.raw_filename:
            return self.raw_filename
        return f"{self.series_id.lower()}_{self.dataset_id.lower()}.json"


def quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    """Inclusive ISO dates for a calendar quarter."""
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def month_bounds(year: int, month: int) -> tuple[str, str]:
    """Inclusive ISO dates for a calendar month."""
    start = f"{year:04d}-{month:02d}-01"
    end_day = calendar.monthrange(year, month)[1]
    end = f"{year:04d}-{month:02d}-{end_day:02d}"
    return start, end


def parse_quarter_code(raw: str) -> int:
    code = raw.strip().upper()
    if code not in QUARTER_NUMBER:
        raise ValueError(f"Unexpected quarter code: {raw!r}")
    return QUARTER_NUMBER[code]


def parse_month_name(raw: str) -> int:
    key = raw.strip().lower()
    if key not in MONTH_NAME_TO_NUM:
        raise ValueError(f"Unexpected month name: {raw!r}")
    return MONTH_NAME_TO_NUM[key]


def parse_value(raw: object) -> tuple[float | None, ObservationStatus]:
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
        raise ValueError(f"Non-numeric ONS value: {raw!r}") from exc


def release_date_iso(description: dict[str, Any]) -> str:
    raw = description.get("releaseDate") or ""
    if not raw:
        return ""
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        return str(raw)[:10]


def source_version(description: dict[str, Any], series_id: str, dataset_id: str) -> str:
    release = release_date_iso(description) or "unknown-release"
    return f"{dataset_id}/{series_id} {release}"


def parse_ons_periods(
    payload: dict[str, Any],
    *,
    spec: OnsSeriesSpec,
) -> list[Observation]:
    """Turn ONS timeseries JSON into observations for one frequency only."""
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError("ONS payload missing description object")

    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != spec.series_id.upper():
        raise ValueError(f"Expected CDID {spec.series_id}, got {cdid!r}")

    rows = payload.get(spec.period_kind)
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"ONS payload missing non-empty {spec.period_kind} array")

    version = source_version(description, spec.series_id, spec.dataset_id)
    observations: list[Observation] = []

    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"Period row is not an object: {row!r}")
        year_raw = row.get("year")
        if year_raw is None:
            raise ValueError(f"Period row missing year: {row!r}")
        year = int(str(year_raw))

        if spec.period_kind == "quarters":
            quarter_raw = row.get("quarter")
            if quarter_raw is None:
                raise ValueError(f"Quarter row missing quarter: {row!r}")
            period_start, period_end = quarter_bounds(year, parse_quarter_code(str(quarter_raw)))
            period_note = f"quarter={str(quarter_raw).upper()}"
        else:
            month_raw = row.get("month")
            if month_raw is None:
                raise ValueError(f"Month row missing month: {row!r}")
            month = parse_month_name(str(month_raw))
            period_start, period_end = month_bounds(year, month)
            period_note = f"month={month:02d}"

        value, status = parse_value(row.get("value"))
        dataset = str(row.get("sourceDataset") or spec.dataset_id)
        observations.append(
            Observation(
                indicator_id=spec.indicator_id,
                period_start=period_start,
                period_end=period_end,
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=value,
                unit=spec.unit,
                observation_status=status,
                source_version=version,
                notes=(
                    f"series={spec.series_id}; dataset={dataset}; "
                    f"{period_note}; {spec.frequency}"
                ),
            )
        )

    observations.sort(key=lambda obs: obs.period_start)
    return observations


class OnsTimeseriesConnector(Connector):
    """Generic ONS timeseries connector driven by OnsSeriesSpec."""

    def __init__(self, spec: OnsSeriesSpec, data_root: Path | None = None) -> None:
        self.spec = spec
        root = data_root or (ECONOMY_DATA / spec.indicator_id)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return self.spec.indicator_id

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.spec.indicator_id,
            title=self.spec.title,
            sector="economy-public-finance",
            publisher=self.spec.publisher,
            source_url=self.spec.landing_url,
            series_id=self.spec.series_id,
            geography=self.spec.geography,
            frequency=self.spec.frequency,
            unit=self.spec.unit,
            definition=self.spec.definition,
            licence=self.spec.licence,
            agent_owner="economy",
            connector_module=self.spec.connector_module,
            curated_path="curated/observations.csv",
            update_cadence=self.spec.update_cadence,
            raw_evidence=list(evidence),
            notion_registry_url=self.spec.notion_registry_url,
            transformations=self.spec.transformations,
            revision_notes=self.spec.revision_notes,
            caveats=self.spec.caveats,
            related_indicator_ids=list(self.spec.related_indicator_ids),
            open_questions=list(self.spec.open_questions),
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/{self.spec.archive_name}"
        result = self.fetch_url(self.spec.data_url, relative)
        release_date = ""
        try:
            payload = json.loads(result.path.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and isinstance(payload.get("description"), dict):
                release_date = release_date_iso(payload["description"])
        except (json.JSONDecodeError, OSError):
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

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        raw_path = self.data_root / evidence[0].path
        if not raw_path.is_file():
            raise FileNotFoundError(f"Raw JSON not found: {raw_path}")
        payload = json.loads(raw_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"Expected JSON object in {raw_path}")
        return parse_ons_periods(payload, spec=self.spec)


def run_connector(connector: OnsTimeseriesConnector) -> None:
    """Fetch → transform → write hand-off; print a short summary."""
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

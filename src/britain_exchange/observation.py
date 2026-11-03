"""Curated observation rows written by sector connectors.

Keep columns stable so Validation and later FastAPI ingestion share one shape.
"""

from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Literal


ObservationStatus = Literal["final", "provisional", "estimated", "suppressed", "missing"]


@dataclass(slots=True)
class Observation:
    """One typed value for an indicator at a place and time."""

    indicator_id: str
    period_start: str  # ISO date YYYY-MM-DD (start of period)
    period_end: str  # ISO date YYYY-MM-DD (end of period, inclusive intent)
    geography_code: str  # e.g. K02000001 for UK; document in manifest
    geography_label: str
    value: float | None
    unit: str
    observation_status: ObservationStatus
    source_version: str  # publisher release label or file version
    notes: str = ""


CURATED_FIELDNAMES: tuple[str, ...] = (
    "indicator_id",
    "period_start",
    "period_end",
    "geography_code",
    "geography_label",
    "value",
    "unit",
    "observation_status",
    "source_version",
    "notes",
)


def write_observations_csv(path: Path, rows: Iterable[Observation]) -> Path:
    """Write curated observations as CSV with a stable header order."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(CURATED_FIELDNAMES))
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))
    return path

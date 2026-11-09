"""Curated observation rows written by sector connectors.

Keep columns stable so Validation and later FastAPI ingestion share one shape.
"""

from __future__ import annotations

import csv
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Literal


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


def mark_latest_months_provisional(
    observations: list[Observation],
    *,
    months: int = 12,
    group_key: Callable[[Observation], str] | None = None,
) -> list[Observation]:
    """Mark the latest ``months`` valued periods per group as provisional.

    Older valued rows become ``final``. ``missing`` rows stay missing.
    Default group is ``geography_code`` (UK HPI revises roughly the last year).
    See https://docs.python.org/3/library/dataclasses.html#dataclasses.replace
    """
    if months < 1:
        raise ValueError("months must be >= 1")
    key_fn = group_key or (lambda obs: obs.geography_code)
    by_group: dict[str, list[Observation]] = defaultdict(list)
    for obs in observations:
        by_group[key_fn(obs)].append(obs)

    out: list[Observation] = []
    for rows in by_group.values():
        valued_periods = sorted(
            {
                obs.period_start
                for obs in rows
                if obs.value is not None and obs.observation_status != "missing"
            }
        )
        provisional_periods = set(valued_periods[-months:])
        for obs in rows:
            if obs.observation_status == "missing" or obs.value is None:
                out.append(
                    obs
                    if obs.observation_status == "missing"
                    else replace(obs, observation_status="missing")
                )
                continue
            status: ObservationStatus = (
                "provisional" if obs.period_start in provisional_periods else "final"
            )
            out.append(obs if obs.observation_status == status else replace(obs, observation_status=status))
    return out


def write_observations_csv(path: Path, rows: Iterable[Observation]) -> Path:
    """Write curated observations as CSV with a stable header order."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(CURATED_FIELDNAMES))
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))
    return path

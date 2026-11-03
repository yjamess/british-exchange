"""Explicit aggregation roles so charts do not double-count series.

Energy ET 5.1 stores fuel in ``notes`` as ``fuel=<Label>``. Some labels are
publisher totals that already include other rows — summing them with components
misleads. API and validators should use these roles.
"""

from __future__ import annotations

from typing import Literal

AggregationRole = Literal["component", "aggregate", "unknown"]

# Labels that must NOT be summed with component fuels.
ENERGY_AGGREGATE_FUELS: frozenset[str] = frozenset(
    {
        "Total wind",  # Onshore + Offshore (+ sometimes wave/tidal in other grains)
        "Total all generating companies",  # sum of all generating companies generation
    }
)


def fuel_label_from_notes(notes: str) -> str | None:
    """Extract fuel label from ``fuel=Coal`` notes; else None."""
    text = (notes or "").strip()
    if text.startswith("fuel="):
        return text[len("fuel=") :].strip() or None
    return None


def energy_aggregation_role(notes: str) -> AggregationRole:
    """Return component/aggregate/unknown for an electricity-generation row."""
    label = fuel_label_from_notes(notes)
    if label is None:
        return "unknown"
    if label in ENERGY_AGGREGATE_FUELS:
        return "aggregate"
    return "component"


def is_chart_safe_energy_row(notes: str) -> bool:
    """True when a row is safe to include in a stacked/summed fuel chart."""
    return energy_aggregation_role(notes) == "component"

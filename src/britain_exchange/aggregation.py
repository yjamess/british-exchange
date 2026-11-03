"""Explicit aggregation roles so charts do not double-count series.

Energy fuels are typed dimensions (also serialized as ``fuel=<Label>`` in notes).
Some labels are publisher totals that already include other rows — summing them
with components misleads. Water company rows are always components; Ofwat does
not supply an industry aggregate in the WCPR extract we curate.
"""

from __future__ import annotations

from typing import Literal

from britain_exchange.dimensions import dimensions_from_notes

AggregationRole = Literal["component", "aggregate", "unknown"]

# Labels that must NOT be summed with component fuels.
ENERGY_AGGREGATE_FUELS: frozenset[str] = frozenset(
    {
        "Total wind",  # Onshore + Offshore (+ sometimes wave/tidal in other grains)
        "Total all generating companies",  # sum of all generating companies generation
        "Total",  # ET 1.1 indigenous production total (sum of primary fuels)
    }
)


def fuel_label_from_notes(notes: str) -> str | None:
    """Extract fuel label from ``fuel=Coal`` notes; else None."""
    label = dimensions_from_notes(notes).fuel
    return label or None


def energy_aggregation_role(notes_or_fuel: str) -> AggregationRole:
    """Return component/aggregate/unknown for an energy fuel row.

    Accepts either raw notes (``fuel=Coal``) or a bare fuel label.
    """
    text = (notes_or_fuel or "").strip()
    if text.startswith("fuel="):
        label = fuel_label_from_notes(text)
    elif "=" in text:
        label = fuel_label_from_notes(text)
    else:
        label = text or None
    if label is None:
        return "unknown"
    if label in ENERGY_AGGREGATE_FUELS:
        return "aggregate"
    return "component"


def is_chart_safe_energy_row(notes_or_fuel: str) -> bool:
    """True when a row is safe to include in a stacked/summed fuel chart."""
    return energy_aggregation_role(notes_or_fuel) == "component"

"""Shared platform contract for British Exchange sector agents.

Energy and Economy import from here; they do not reimplement manifests or checksums.
Docs: docs/connector-contract.md
"""

from britain_exchange.aggregation import (
    ENERGY_AGGREGATE_FUELS,
    energy_aggregation_role,
    is_chart_safe_energy_row,
)
from britain_exchange.checksum import sha256_bytes, sha256_file
from britain_exchange.connector import Connector, FetchResult
from britain_exchange.dimensions import ObservationDimensions, dimensions_from_notes
from britain_exchange.manifest import Manifest, RawEvidence, load_manifest, save_manifest
from britain_exchange.observation import Observation, write_observations_csv

__all__ = [
    "ENERGY_AGGREGATE_FUELS",
    "Connector",
    "FetchResult",
    "Manifest",
    "Observation",
    "ObservationDimensions",
    "RawEvidence",
    "dimensions_from_notes",
    "energy_aggregation_role",
    "is_chart_safe_energy_row",
    "load_manifest",
    "save_manifest",
    "sha256_bytes",
    "sha256_file",
    "write_observations_csv",
]

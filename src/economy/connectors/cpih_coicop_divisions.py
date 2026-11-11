"""Batch connector — CPIH COICOP division annual rates (Domain 01 Categories).

Run from repo root::

    uv run python -m economy.connectors.cpih_coicop_divisions

Pins all twelve division series under ``data/economy/cpih-inflation-*/``.
CDID map: ``docs/economy-01-coicop-cdid-map.md``.
"""

from __future__ import annotations

from economy.connectors.coicop_cpih_series import CPIH_COICOP_SPECS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


def main() -> None:
    """Ingest each locked CPIH COICOP division series in map order."""
    for spec in CPIH_COICOP_SPECS:
        print(f"\n=== {spec.indicator_id} ({spec.series_id}) ===")
        run_connector(OnsTimeseriesConnector(spec))


if __name__ == "__main__":
    main()

"""Batch connector — CPIH COICOP division contributions (Domain 01 Categories).

Run from repo root::

    uv run python -m economy.connectors.cpih_coicop_contributions

Pins all twelve contribution series under ``data/economy/cpih-contribution-*/``.
CDID map: ``docs/economy-01-coicop-cdid-map.md``.
"""

from __future__ import annotations

import time

from economy.connectors.cpih_contribution_series import CPIH_CONTRIBUTION_SPECS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


def main() -> None:
    """Ingest each locked CPIH contribution series in map order."""
    for i, spec in enumerate(CPIH_CONTRIBUTION_SPECS):
        if i:
            # Pace requests — ONS returns 429 under burst.
            time.sleep(1.5)
        print(f"\n=== {spec.indicator_id} ({spec.series_id}) ===")
        run_connector(OnsTimeseriesConnector(spec))


if __name__ == "__main__":
    main()

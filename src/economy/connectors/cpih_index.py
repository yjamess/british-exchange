"""Economy connector — CPIH_INDEX (L522 level for household real-terms costs)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import CPIH_INDEX
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class CpihIndexConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(CPIH_INDEX)


def main() -> None:
    run_connector(CpihIndexConnector())


if __name__ == "__main__":
    main()

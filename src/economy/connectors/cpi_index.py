"""Economy connector — CPI_INDEX (D7BT level for real house prices)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import CPI_INDEX
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class CpiIndexConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(CPI_INDEX)


def main() -> None:
    run_connector(CpiIndexConnector())


if __name__ == "__main__":
    main()

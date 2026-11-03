"""Economy connector — CPI_INFLATION."""

from __future__ import annotations

from economy.connectors.labour_prices_series import CPI_INFLATION
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class CpiInflationConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(CPI_INFLATION)


def main() -> None:
    run_connector(CpiInflationConnector())


if __name__ == "__main__":
    main()

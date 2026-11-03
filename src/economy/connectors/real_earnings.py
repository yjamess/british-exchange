"""Economy connector — REAL_EARNINGS."""

from __future__ import annotations

from economy.connectors.labour_prices_series import REAL_EARNINGS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class RealEarningsConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(REAL_EARNINGS)


def main() -> None:
    run_connector(RealEarningsConnector())


if __name__ == "__main__":
    main()

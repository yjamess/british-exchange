"""Economy connector — UNEMPLOYMENT_RATE (LF2Q, aged 16–64)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import UNEMPLOYMENT_RATE
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class UnemploymentRateConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(UNEMPLOYMENT_RATE)


def main() -> None:
    run_connector(UnemploymentRateConnector())


if __name__ == "__main__":
    main()

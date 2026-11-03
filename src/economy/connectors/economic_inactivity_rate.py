"""Economy connector — ECONOMIC_INACTIVITY_RATE."""

from __future__ import annotations

from economy.connectors.labour_prices_series import ECONOMIC_INACTIVITY_RATE
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EconomicInactivityRateConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(ECONOMIC_INACTIVITY_RATE)


def main() -> None:
    run_connector(EconomicInactivityRateConnector())


if __name__ == "__main__":
    main()

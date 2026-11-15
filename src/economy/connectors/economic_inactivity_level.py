"""Economy connector — ECONOMIC_INACTIVITY_LEVEL (LF2M)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import ECONOMIC_INACTIVITY_LEVEL
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EconomicInactivityLevelConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(ECONOMIC_INACTIVITY_LEVEL)


def main() -> None:
    run_connector(EconomicInactivityLevelConnector())


if __name__ == "__main__":
    main()

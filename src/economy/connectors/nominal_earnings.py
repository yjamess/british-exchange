"""Economy connector — NOMINAL_EARNINGS (ONS AWE regular pay, cash terms, KAI7)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import NOMINAL_EARNINGS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class NominalEarningsConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(NOMINAL_EARNINGS)


def main() -> None:
    run_connector(NominalEarningsConnector())


if __name__ == "__main__":
    main()

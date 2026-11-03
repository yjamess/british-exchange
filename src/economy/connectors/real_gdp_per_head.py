"""Economy connector — REAL_GDP_PER_HEAD."""

from __future__ import annotations

from economy.connectors.labour_prices_series import REAL_GDP_PER_HEAD
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class RealGdpPerHeadConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(REAL_GDP_PER_HEAD)


def main() -> None:
    run_connector(RealGdpPerHeadConnector())


if __name__ == "__main__":
    main()

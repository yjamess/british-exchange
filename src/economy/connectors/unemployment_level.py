"""Economy connector — UNEMPLOYMENT_LEVEL (LF2I, aged 16–64)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import UNEMPLOYMENT_LEVEL
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class UnemploymentLevelConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(UNEMPLOYMENT_LEVEL)


def main() -> None:
    run_connector(UnemploymentLevelConnector())


if __name__ == "__main__":
    main()

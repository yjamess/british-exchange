"""Economy connector — CPIH_INFLATION (L55O annual rate, companion to cpih-index L522)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import CPIH_INFLATION
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class CpihInflationConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(CPIH_INFLATION)


def main() -> None:
    run_connector(CpihInflationConnector())


if __name__ == "__main__":
    main()

"""Economy connector — EMPLOYMENT_RATE."""

from __future__ import annotations

from economy.connectors.labour_prices_series import EMPLOYMENT_RATE
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EmploymentRateConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(EMPLOYMENT_RATE)


def main() -> None:
    run_connector(EmploymentRateConnector())


if __name__ == "__main__":
    main()

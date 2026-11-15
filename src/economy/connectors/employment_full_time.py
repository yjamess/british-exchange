"""Economy connector — EMPLOYMENT_FULL_TIME (YCBE)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import EMPLOYMENT_FULL_TIME
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EmploymentFullTimeConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(EMPLOYMENT_FULL_TIME)


def main() -> None:
    run_connector(EmploymentFullTimeConnector())


if __name__ == "__main__":
    main()

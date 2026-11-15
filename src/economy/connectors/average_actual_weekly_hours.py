"""Economy connector — AVERAGE_ACTUAL_WEEKLY_HOURS (YBUV)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import AVERAGE_ACTUAL_WEEKLY_HOURS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class AverageActualWeeklyHoursConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(AVERAGE_ACTUAL_WEEKLY_HOURS)


def main() -> None:
    run_connector(AverageActualWeeklyHoursConnector())


if __name__ == "__main__":
    main()

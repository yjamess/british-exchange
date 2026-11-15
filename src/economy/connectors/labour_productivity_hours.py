"""Economy connector — LABOUR_PRODUCTIVITY_HOURS (LZVA / PRDY)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import LABOUR_PRODUCTIVITY_HOURS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class LabourProductivityHoursConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(LABOUR_PRODUCTIVITY_HOURS)


def main() -> None:
    run_connector(LabourProductivityHoursConnector())


if __name__ == "__main__":
    main()

"""Economy connector — EMPLOYMENT_PART_TIME (YCBH)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import EMPLOYMENT_PART_TIME
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EmploymentPartTimeConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(EMPLOYMENT_PART_TIME)


def main() -> None:
    run_connector(EmploymentPartTimeConnector())


if __name__ == "__main__":
    main()

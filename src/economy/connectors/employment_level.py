"""Economy connector — EMPLOYMENT_LEVEL (LF2G)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import EMPLOYMENT_LEVEL
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class EmploymentLevelConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(EMPLOYMENT_LEVEL)


def main() -> None:
    run_connector(EmploymentLevelConnector())


if __name__ == "__main__":
    main()

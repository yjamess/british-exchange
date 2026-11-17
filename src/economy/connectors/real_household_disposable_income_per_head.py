"""Economy connector — real-household-disposable-income-per-head (CRXX / UKEA)."""

from __future__ import annotations

from economy.connectors.household_series import (
    REAL_HOUSEHOLD_DISPOSABLE_INCOME_PER_HEAD,
)
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class RealHouseholdDisposableIncomePerHeadConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(REAL_HOUSEHOLD_DISPOSABLE_INCOME_PER_HEAD)


def main() -> None:
    run_connector(RealHouseholdDisposableIncomePerHeadConnector())


if __name__ == "__main__":
    main()

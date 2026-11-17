"""Economy connector — real-household-disposable-income (DG2R / UKEA)."""

from __future__ import annotations

from economy.connectors.household_series import REAL_HOUSEHOLD_DISPOSABLE_INCOME
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class RealHouseholdDisposableIncomeConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(REAL_HOUSEHOLD_DISPOSABLE_INCOME)


def main() -> None:
    run_connector(RealHouseholdDisposableIncomeConnector())


if __name__ == "__main__":
    main()

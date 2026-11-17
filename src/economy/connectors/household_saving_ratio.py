"""Economy connector — household-saving-ratio (DGD8 / UKEA)."""

from __future__ import annotations

from economy.connectors.household_series import HOUSEHOLD_SAVING_RATIO
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class HouseholdSavingRatioConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(HOUSEHOLD_SAVING_RATIO)


def main() -> None:
    run_connector(HouseholdSavingRatioConnector())


if __name__ == "__main__":
    main()

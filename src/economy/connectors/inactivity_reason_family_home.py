"""Economy connector — INACTIVITY_REASON_FAMILY_HOME (LF65)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_FAMILY_HOME
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonFamilyHomeConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_FAMILY_HOME)


def main() -> None:
    run_connector(InactivityReasonFamilyHomeConnector())


if __name__ == "__main__":
    main()

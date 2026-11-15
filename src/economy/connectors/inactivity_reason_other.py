"""Economy connector — INACTIVITY_REASON_OTHER (LF6D)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_OTHER
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonOtherConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_OTHER)


def main() -> None:
    run_connector(InactivityReasonOtherConnector())


if __name__ == "__main__":
    main()

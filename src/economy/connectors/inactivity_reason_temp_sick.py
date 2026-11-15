"""Economy connector — INACTIVITY_REASON_TEMP_SICK (LF67)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_TEMP_SICK
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonTempSickConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_TEMP_SICK)


def main() -> None:
    run_connector(InactivityReasonTempSickConnector())


if __name__ == "__main__":
    main()

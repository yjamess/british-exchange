"""Economy connector — INACTIVITY_REASON_LONG_TERM_SICK (LF69)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_LONG_TERM_SICK
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonLongTermSickConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_LONG_TERM_SICK)


def main() -> None:
    run_connector(InactivityReasonLongTermSickConnector())


if __name__ == "__main__":
    main()

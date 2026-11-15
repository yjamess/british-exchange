"""Economy connector — discouraged workers as a percent of inactive people (LF77).

This series is a percentage. It is not a count. Do not multiply it by LF2M.
"""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_DISCOURAGED_RATE
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonDiscouragedRateConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_DISCOURAGED_RATE)


def main() -> None:
    run_connector(InactivityReasonDiscouragedRateConnector())


if __name__ == "__main__":
    main()

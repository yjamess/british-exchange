"""Economy connector — INACTIVITY_REASON_RETIRED (LF6B)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_RETIRED
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonRetiredConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_RETIRED)


def main() -> None:
    run_connector(InactivityReasonRetiredConnector())


if __name__ == "__main__":
    main()

"""Economy connector — discouraged workers level (LFL8)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_DISCOURAGED
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonDiscouragedConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_DISCOURAGED)


def main() -> None:
    run_connector(InactivityReasonDiscouragedConnector())


if __name__ == "__main__":
    main()

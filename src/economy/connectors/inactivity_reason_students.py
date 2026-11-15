"""Economy connector — INACTIVITY_REASON_STUDENTS (LF63)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import INACTIVITY_REASON_STUDENTS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InactivityReasonStudentsConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INACTIVITY_REASON_STUDENTS)


def main() -> None:
    run_connector(InactivityReasonStudentsConnector())


if __name__ == "__main__":
    main()

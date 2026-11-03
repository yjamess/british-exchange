"""Economy connector — LABOUR_PRODUCTIVITY."""

from __future__ import annotations

from economy.connectors.labour_prices_series import LABOUR_PRODUCTIVITY
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class LabourProductivityConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(LABOUR_PRODUCTIVITY)


def main() -> None:
    run_connector(LabourProductivityConnector())


if __name__ == "__main__":
    main()

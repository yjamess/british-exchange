"""Economy connector — WORKFORCE_JOBS (DYDC)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import WORKFORCE_JOBS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class WorkforceJobsConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(WORKFORCE_JOBS)


def main() -> None:
    run_connector(WorkforceJobsConnector())


if __name__ == "__main__":
    main()

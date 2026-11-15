"""Economy connector — involuntary part-time (YCCX).

People in part-time work because they could not find a full-time job.
Not underemployment, and not all part-time employment.
"""

from __future__ import annotations

from economy.connectors.labour_prices_series import INVOLUNTARY_PART_TIME
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class InvoluntaryPartTimeConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(INVOLUNTARY_PART_TIME)


def main() -> None:
    run_connector(InvoluntaryPartTimeConnector())


if __name__ == "__main__":
    main()

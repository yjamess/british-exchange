"""ONS Business investment CVM SA (NPEL / PN2) — quarterly £m."""

from __future__ import annotations

from economy.connectors.fiscal_series import BUSINESS_INVESTMENT
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class BusinessInvestmentConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(BUSINESS_INVESTMENT)


def main() -> None:
    run_connector(BusinessInvestmentConnector())


if __name__ == "__main__":
    main()

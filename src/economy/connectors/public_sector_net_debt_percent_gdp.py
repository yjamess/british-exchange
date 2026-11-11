"""ONS Public sector net debt as % of GDP (HF6X / PUSF) — monthly, official ratio."""

from __future__ import annotations

from economy.connectors.fiscal_series import PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class PublicSectorNetDebtPercentGdpConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP)


def main() -> None:
    run_connector(PublicSectorNetDebtPercentGdpConnector())


if __name__ == "__main__":
    main()

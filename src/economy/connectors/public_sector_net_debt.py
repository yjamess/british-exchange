"""ONS Public sector net debt (HF6W / PUSF) — monthly £bn NSA ex banks."""

from __future__ import annotations

from economy.connectors.fiscal_series import PUBLIC_SECTOR_NET_DEBT
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class PublicSectorNetDebtConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(PUBLIC_SECTOR_NET_DEBT)


def main() -> None:
    run_connector(PublicSectorNetDebtConnector())


if __name__ == "__main__":
    main()

"""ONS Public sector net borrowing (DZLS / PUSF) — monthly £m NSA ex banks."""

from __future__ import annotations

from economy.connectors.fiscal_series import PUBLIC_SECTOR_NET_BORROWING
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class PublicSectorNetBorrowingConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(PUBLIC_SECTOR_NET_BORROWING)


def main() -> None:
    run_connector(PublicSectorNetBorrowingConnector())


if __name__ == "__main__":
    main()

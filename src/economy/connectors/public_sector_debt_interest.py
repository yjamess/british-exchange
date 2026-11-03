"""ONS CG net interest payable (NMFX / PUSF) — monthly £m NSA debt interest."""

from __future__ import annotations

from economy.connectors.fiscal_series import PUBLIC_SECTOR_DEBT_INTEREST
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class PublicSectorDebtInterestConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(PUBLIC_SECTOR_DEBT_INTEREST)


def main() -> None:
    run_connector(PublicSectorDebtInterestConnector())


if __name__ == "__main__":
    main()

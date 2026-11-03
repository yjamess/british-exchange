"""ONS total PS taxes + NICs (AHHY / PUSF) — monthly £m NSA tax receipts."""

from __future__ import annotations

from economy.connectors.fiscal_series import TAX_RECEIPTS
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class TaxReceiptsConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(TAX_RECEIPTS)


def main() -> None:
    run_connector(TaxReceiptsConnector())


if __name__ == "__main__":
    main()

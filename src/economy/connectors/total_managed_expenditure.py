"""ONS total managed expenditure (EBFT / PUSF) — monthly £m NSA."""

from __future__ import annotations

from economy.connectors.fiscal_series import TOTAL_MANAGED_EXPENDITURE
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class TotalManagedExpenditureConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(TOTAL_MANAGED_EXPENDITURE)


def main() -> None:
    run_connector(TotalManagedExpenditureConnector())


if __name__ == "__main__":
    main()

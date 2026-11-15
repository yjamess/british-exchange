"""Economy connector — UK_VACANCIES (AP2Y)."""

from __future__ import annotations

from economy.connectors.labour_prices_series import UK_VACANCIES
from economy.connectors.ons_timeseries import OnsTimeseriesConnector, run_connector


class UkVacanciesConnector(OnsTimeseriesConnector):
    def __init__(self) -> None:
        super().__init__(UK_VACANCIES)


def main() -> None:
    run_connector(UkVacanciesConnector())


if __name__ == "__main__":
    main()

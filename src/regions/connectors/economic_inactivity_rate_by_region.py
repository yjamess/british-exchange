"""Economic inactivity rate by region — HI00 persons, aged 16 to 64.

Same age and denominator idea as Economy LF2S, for nations and English regions.
Parsing lives in ``hi00_labour``.
"""

from regions.connectors.hi00_labour import (
    EconomicInactivityRateByRegionConnector,
    run_connector,
)

__all__ = ["EconomicInactivityRateByRegionConnector"]


def main() -> None:
    run_connector(EconomicInactivityRateByRegionConnector)


if __name__ == "__main__":
    main()
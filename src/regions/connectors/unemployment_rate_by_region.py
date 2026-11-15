"""ILO unemployment rate by region — HI00 persons, aged 16 and over.

Not the Claimant Count, and not Economy LF2Q (that rate is aged 16 to 64).
Parsing lives in ``hi00_labour``.
"""

from regions.connectors.hi00_labour import UnemploymentRateByRegionConnector, run_connector

__all__ = ["UnemploymentRateByRegionConnector"]


def main() -> None:
    run_connector(UnemploymentRateByRegionConnector)


if __name__ == "__main__":
    main()

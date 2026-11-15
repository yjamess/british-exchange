"""Employment rate by region — entry point for the HI00 persons series.

Parsing lives in ``hi00_labour`` so the 16-to-64 column is chosen in one place.
That module also writes the unemployment and inactivity packages.
"""

from regions.connectors.hi00_labour import EmploymentRateByRegionConnector, run_connector

__all__ = ["EmploymentRateByRegionConnector"]


def main() -> None:
    run_connector(EmploymentRateByRegionConnector)


if __name__ == "__main__":
    main()

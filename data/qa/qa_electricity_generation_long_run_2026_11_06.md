# QA hand-off — electricity-generation-long-run (2026-11-06)

**From:** Energy · **To:** Validation · **Registry:** add row (Status → Validation). Not Ready.

| Item | Value |
|------|-------|
| Source | DESNZ, *Historical electricity data: 1920 to 2025* (DUKES), published 2026-07-30 |
| Landing | https://www.gov.uk/government/statistical-data-sets/historical-electricity-data |
| Asset (pinned) | https://assets.publishing.service.gov.uk/media/6a69e449229c578debc1a84d/Electricity_since_1920.xlsx |
| Retrieved | 2026-11-06 |
| Raw | `data/energy/electricity-generation-long-run/raw/2026-11-06/Electricity_since_1920.xlsx` |
| sha256 | `c95cc17e446f76cd4333421be3e2e537fbaf81073c5795385d70a9ae7bdde8de` |
| Entrypoint | `uv run python -m energy.connectors.electricity_generation_long_run` |
| Curated | `data/energy/electricity-generation-long-run/curated/observations.csv` (954 rows: 106 years × 8 fuels + Total) |

## Checks run by Energy

- Fuel columns sum to the published total for 1920–2016 (to 0.01 TWh); the connector fails if they do not.
- Published **Total** equals the sum of ET 5.1 component fuels (`electricity-generation-by-source`, aggregates excluded) in 1998, 2012, 2016, 2020, 2024, 2025. Differs in 2005 (398.4 vs 395.4) and 2017 (338.2 vs 324.7): check ET 5.1 revisions.

## Finding for Validation — residual from 2017

From 2017 the published total exceeds the sum of the eight fuel columns, and share columns sum to ~0.98:

| Year | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|------|------|------|------|------|------|------|------|------|------|
| Total − fuels (TWh) | 5.882 | 5.443 | 5.933 | 6.878 | 5.418 | 5.068 | 5.609 | 5.731 | 5.386 |

Because the total matches ET 5.1, the fuel columns appear to omit a category from 2017 (candidate: a DUKES 5.6 category not mapped to the historic groups). Not allocated to any fuel by Energy. The UI draws it as a separate band, "not allocated to a fuel in the source". Suggest raising with energy.stats@energysecurity.gov.uk.

## Sample for Validation

Coal 1950 52.181 TWh · Oil 1984 91.762 · Natural gas 2000 148.077 · Nuclear 1995 (check vs DUKES) · Wind/wave/solar/hydro 2025 106.581 · Total 2025 293.562.

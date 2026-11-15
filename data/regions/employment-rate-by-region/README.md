# Employment rate by region

**Status: Validation-ready. Not Ready.** Regions owns this series. Economy keeps the UK national rate (LF24) and links here.

People aged 16 to 64 in work, as a percentage of the population aged 16 to 64. Persons, seasonally adjusted. One row per English region or UK country, for each rolling three-month period from March–May 1992 to June–August 2026.

## Why the previous pin was wrong

The workbook has two columns called “Employment rate (%)”. The first is everyone aged 16 and over (North East, June–August 2026: about 55.3%). The published regional headline is the later column, aged 16 to 64 (North East: **70.5%**). The old parser took the first match and still called it 16–64. This pin takes the column inside the “All aged 16 to 64” block. The registry row is back on **Validation** until that is checked independently.

## Source

- Publisher: ONS. Licence: Open Government Licence v3.0.
- Dataset: [HI00](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/headlinelabourforcesurveyindicatorsforallregionshi00) — headline Labour Force Survey indicators for all regions.
- Release on the file: **20 October 2026**. Next release: **17 November 2026**.
- Workbook: `raw/2026-11-15/regionaltable1s.xlsx`
- sha256: `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d` (same bytes as the 3 November 2026 pin).

`data/**/raw/**` and `data/regions/**/curated/**` are gitignored. A checkout does not contain the workbook. Regenerate from the pin, or download it once:

```bash
uv run python -m regions.connectors.hi00_labour --download
uv run python -m regions.connectors.employment_rate_by_region
```

`uv` is the project runner ([uv docs](https://docs.astral.sh/uv/)). `--download` will not overwrite a file that is already there.

## What is not in this package

- UK and Great Britain totals (they are not sheets in HI00).
- Men and women (those sheets exist; they are not read).
- ILO unemployment and inactivity (separate packages from the same workbook).
- Claimant Count.
- BRES employee jobs (Energy manufacturing).

Handover: `docs/handover-regions-employment-geography.md`.

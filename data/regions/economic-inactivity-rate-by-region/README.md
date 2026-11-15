# Economic inactivity rate by region

**Status: Validation-ready. Not Ready.** People aged 16 to 64 who are neither in work nor ILO unemployed, as a percentage of the population aged 16 to 64. Persons, seasonally adjusted. English regions and UK countries.

Same age and denominator idea as Economy `economic-inactivity-rate` (LF2S). The geography is a nation or English region, not the UK. The UK rate for June–August 2026 is LF2S **20.9%**. It is not a row in this file.

Do not add this rate to `unemployment-rate-by-region`. That series is aged 16 and over and uses a different denominator.

## Source

Same HI00 workbook as the employment package. Release **20 October 2026**. sha256 `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d`.

```bash
uv run python -m regions.connectors.hi00_labour --download
uv run python -m regions.connectors.economic_inactivity_rate_by_region
```

Handover: `docs/handover-regions-employment-geography.md`.

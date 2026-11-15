# Unemployment rate by region

**Status: Validation-ready. Not Ready.** ILO unemployment for people aged 16 and over, as a percentage of the economically active aged 16 and over. Persons, seasonally adjusted. English regions and UK countries.

This is the headline rate in the ONS regional labour market bulletin. It is **not** the Claimant Count. It is **not** Economy `unemployment-rate` (LF2Q), which is the UK rate for people aged 16 to 64.

England in June–August 2026 prints as **4.9%**. Economy LF2Q for the UK in the same period is also 4.9%. Those are different geographies and different ages. The UK 16-and-over rate in the same bulletin is **4.7%**.

## Source

Same HI00 workbook as employment and inactivity. Release **20 October 2026**. sha256 `ff374cf96c5fa18a60f4540318b03a24fc06e9b0cd6af502c9dd205dcdc4967d`.

```bash
uv run python -m regions.connectors.hi00_labour --download
uv run python -m regions.connectors.unemployment_rate_by_region
```

`--download` fills the employment package if the pin is missing, and does not overwrite an existing file. This package copies that pin so it can be re-run on its own.

Handover: `docs/handover-regions-employment-geography.md`.

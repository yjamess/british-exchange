# electricity-generation-long-run

**Owner:** Energy · **Status:** Ingesting → Validation (not Ready) · **indicator_id:** `electricity-generation-long-run`

Long-run companion to `electricity-generation-by-source` (ET 5.1, quarterly from 1998). Draws the
1920–2025 stream in Energy Domain 01 (*Changing Current*). Not a replacement: different publication,
coarser fuel groups; the two are never summed or spliced.

| Field | Value |
|-------|-------|
| Publisher | DESNZ (DUKES) |
| Landing page | https://www.gov.uk/government/statistical-data-sets/historical-electricity-data |
| Workbook | Electricity since 1920 (published 2026-07-30) |
| Sheet | Estimated Historical Generation (GWh → TWh) |
| Geography | UK `K02000001` |
| Frequency | Annual, calendar year |
| Licence | OGL v3.0 |

Fuels (as published, `fuel=` in notes): Coal · Oil · Natural gas · Nuclear · Wind, wave, solar and hydro ·
Coke and breeze · Other fuels · Pumped storage · **Total** (aggregate — never sum with fuels).

## Caveats

- 1920–1995 are DESNZ estimates (`observation_status=estimated`): supply upscaled to generation and apportioned by fuel used. 1996+ are DUKES 5.6 actuals.
- Before 1987: major power producers, transport undertakings, industrial hydro and nuclear only. 1987–1989 heavily estimated.
- Bioenergy is inside **Other fuels**, not the renewables group (DESNZ note 5).
- **From 2017 the published total exceeds the fuel columns by 5–7 TWh (~2%).** Kept as published; the UI shows the gap as "not allocated to a fuel in the source". See `data/qa/qa_electricity_generation_long_run_2026_11_06.md`.

## Reproduce

```bash
uv run python -m energy.connectors.electricity_generation_long_run
```

Raw pin: `raw/2026-11-06/Electricity_since_1920.xlsx` (sha256 `c95cc17e446f76cd4333421be3e2e537fbaf81073c5795385d70a9ae7bdde8de`).

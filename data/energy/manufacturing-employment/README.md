# Manufacturing employment

**Registry:** [Manufacturing employment](https://app.notion.com/40d65471768581e3a829d4cad506e0bc)  
**Agent:** energy (Energy & Industry)  
**Series:** ONS `JWR7` / LMS — UK Workforce Jobs SA, SIC section C Manufacturing (thousands)

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_employment
```

Pins raw JSON under `raw/2026-11-03/jwr7_lms.json`, writes `curated/observations.csv` + `manifest.yaml`.

## Cross-sector note

History & Change **Long-run manufacturing employment** is catalogue-only and should **link** this modern official series — do not build a duplicate long-run pipeline here.

## QA

```bash
uv run python -m validation.qa_manufacturing_employment_2026_11_03
```

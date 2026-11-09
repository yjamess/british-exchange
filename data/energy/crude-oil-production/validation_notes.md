# Validation notes — `crude-oil-production`

**Prepared:** 2026-11-07 · Energy agent (Wave A2) · Status → Validation  
**Registry:** https://app.notion.com/411654717685812d92a6d647e28cd8a3

## Reproduce

```bash
uv run python -m energy.connectors.crude_oil_production
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/Oil_Production_Trade_since_1890.xls` |
| sha256 | `4537b0a9882c28da296104b161bef9a0c79161fad4703040fc3bc245364b7b7d` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a69e3a116bc92f51e1a4315/Oil_Production___Trade_since_1890.xls |
| Official release | 2026-07-30 |
| Curated rows | 106 (1920–2025) |
| Connector | `energy.connectors.crude_oil_production` |

## Sample checks (Energy self-check)

| Year | Workbook Total (thousand t) | Curated Mt | Official narrative |
|------|-----------------------------|------------|--------------------|
| 1999 | 137099 | 137.099 | DUKES 2026 Ch.3 peak 137 Mt |
| 2024 | 30657.8 | 30.6578 | |
| 2025 | 31406.05 | 31.40605 | “just over 31 million tonnes”; +2.4% YoY |

Please re-open the pinned .xls and confirm Indigenous production Total for these years before Ready.

## Method notes

- Unit transform: thousand tonnes ÷ 1000 → million tonnes (documented; raw unchanged).
- Blank Total cells before first production year omitted (not invented as 0).
- Shale oil included in indigenous production through 1962 (Sources sheet).

## Out of scope this hand-off

- Landward / feedstock columns
- NSTA field-level spatial production
- DUKES F.1 NGL detail
- Reserves / resources

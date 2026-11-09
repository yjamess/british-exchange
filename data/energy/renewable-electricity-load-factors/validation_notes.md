# Validation notes — `renewable-electricity-load-factors`

**Prepared:** 2026-11-07 · Energy agent (Wave B1) · Status → Validation  
**Registry:** https://app.notion.com/41165471768581dfbb30e984c9aa01ba

## Reproduce

```bash
uv run python -m energy.connectors.renewable_electricity_load_factors
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/DUKES_6.3.xlsx` |
| sha256 | `4f0c19f1b063ae20f71e11dd3744c1fb37df484e9873f510e817a3a1711bb53a` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a6a276f8319ab05f7caa1cf/DUKES_6.3.xlsx |
| Official release | 2026-07-30 |
| Curated rows | 558 (549 valued, 9 missing `[x]`) |
| Years | 2008–2025 |
| Connector | `energy.connectors.renewable_electricity_load_factors` |

## Sample checks (Energy self-check vs pinned Excel sheet `6.3`)

Prefer the Excel pin over chapter narrative (narrative rounds).

| Year | Technology | Basis | Excel | Curated | notes |
|------|------------|-------|------:|--------:|-------|
| 2025 | Onshore | average_boe_capacity | 24.02 | 24.02 | `fuel=Onshore; basis=average_boe_capacity` |
| 2025 | Offshore | average_boe_capacity | 36.12 | 36.12 | `fuel=Offshore; basis=average_boe_capacity` |
| 2025 | Solar photovoltaics | average_boe_capacity | 11.08 | 11.08 | |
| 2025 | Bioenergy (excludes cofiring, includes non-biodegradable wastes) | average_boe_capacity | 63 | 63.0 | |
| 2025 | All renewable technologies (excluding cofiring and non-biodegradable wastes) | average_boe_capacity | 28.32 | 28.32 | |
| 2024 | Solar photovoltaics | average_boe_capacity | 9.22 | 9.22 | |
| 2011 | Solar photovoltaics | average_boe_capacity | 5.08 | 5.08 | first valued solar year in this pin |
| 2010 | Solar photovoltaics | average_boe_capacity | `[x]` | null / missing | |

Chapter 6 narrative (2025) rounds Onshore ≈ 24.1%, Offshore ≈ 36.4%, Solar ≈ 11.1%, Bioenergy ≈ 63% — accept Excel precision, not rounded prose.

## Method notes

- Both stacked tables ingested; filter UI/API on `basis=`.
- Publisher label casing differs across tables: `Plant Biomass [note 5]` vs `Plant biomass [note 5]` — preserved exactly.
- Child rows `Onshore` / `Offshore` sit under Wind without the word “wind” in the label (as printed).
- Parent aggregates retained (`Wind`, `Hydro`, `Bioenergy…`, `All renewable technologies…`) — do not sum children into parents in the UI.

## Out of scope this hand-off

- Nuclear load factors (see DUKES 5.10 MPP plant loads — optional companion)
- Regional Renewable Statistics load factors
- Rewriting REPD / capacity / generation packages

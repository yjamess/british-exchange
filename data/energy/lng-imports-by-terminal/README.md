# LNG imports by terminal

**`indicator_id`:** `lng-imports-by-terminal`  
**Owner:** Energy (DESNZ) · Gate 3 Imports Lifelines  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_lng_imports_by_terminal_2026-11-07.md`)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes |
| Table | DUKES 4.6 — Liquefied Natural Gas imports by terminal |
| Pinned raw | `raw/2026-11-07/DUKES_4.6.xlsx` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a69f46eb5fc953081705fea/DUKES_4.6.xlsx |
| Release | 30 Jul 2026 |
| Unit | GWh |
| Frequency | Annual (calendar year) |
| Geography | UK (`K02000001`); terminal names are publisher facility labels |
| Licence | Open Government Licence v3.0 |
| Checksum | `5ae07c741aab95e6cec642fd3adb8e1ec4832dedccb1074e2192700e85b49284` |
| Observations | 130 (4 terminals + Total × 2000–2025) |

## Scope choices

- **Ingest:** Sheet `4.6` — Dragon, Isle of Grain, South Hook, Teeside GasPort, Total LNG imports.
- **Notes:** `terminal=<name>; kind=terminal|aggregate; fuel=LNG; mode=LNG`.
- **Keep zeros:** Pre-commissioning / idle years (honest terminal history).
- **Honesty:** DESNZ-named LNG terminals only — **not** invented pipeline landfalls.
- **Map coordinates:** draft harbour-authority pins under `data/energy/lng-terminal-geo/` (Blocked — Teesside unsourced; not Validated). Lifelines stays RankBars for LNG until that package is Ready.

## Related (link, do not fork)

- `gas-trade-by-partner` — DUKES 4.5a country of origin (complementary)
- `oil-imports-by-country` — DUKES 3.7 oil partners
- `electricity-interconnector-flows` — ET 5.6 Ready reuse

## Reproduce

```bash
uv run python -m energy.connectors.lng_imports_by_terminal
```

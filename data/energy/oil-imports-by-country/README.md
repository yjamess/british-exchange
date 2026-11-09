# Oil imports by country

**`indicator_id`:** `oil-imports-by-country`  
**Owner:** Energy (DESNZ) · Gate 3 Imports Lifelines  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_oil_imports_by_country_2026-11-07.md`)

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes |
| Table | DUKES 3.7 — Imports of crude oil and petroleum products by country of origin |
| Pinned raw | `raw/2026-11-07/DUKES_3.7.xlsx` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a69f0a74dda8076771a433f/DUKES_3.7.xlsx |
| Release | 30 Jul 2026 |
| Unit | thousand tonnes |
| Frequency | Annual (calendar year) |
| Geography | UK (`K02000001`) importing territory; partners in notes |
| Licence | Open Government Licence v3.0 |
| Checksum | `fd855afe3ad2145c69db63f83d55bdd7f50fc615d9a5893014af7163ede6bb06` |
| Observations | 896 (2012–2025; non-zero partners + aggregates) |

## Scope choices

- **Ingest:** `Total oil` column only (primary oils + petroleum products).
- **Notes:** `partner=<Country>; product=Total oil; kind=partner|aggregate; fuel=Oil`.
- **Omit:** Ordinary partners with Total oil = 0 (map noise). Keep `Total imports` and `Not elsewhere specified`.
- **Not ingested:** Product-level columns (Crude oil, DERV, …) — open question.
- **Honesty:** Partner countries of origin — **not** pipeline landfalls.

## Related (link, do not fork)

- `energy-import-dependency` / `energy-imports-and-exports` — ET 1.3 aggregates
- `gas-trade-by-partner` / `lng-imports-by-terminal` — gas Lifelines siblings
- `electricity-interconnector-flows` — ET 5.6 electricity corridors

## Reproduce

```bash
uv run python -m energy.connectors.oil_imports_by_country
```

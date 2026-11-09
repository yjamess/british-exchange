# Gas trade by partner

**`indicator_id`:** `gas-trade-by-partner`  
**Owner:** Energy (DESNZ) · Gate 3 Imports Lifelines  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_gas_trade_by_partner_2026-11-07.md`)  
**Note on naming:** Mission example said `gas-trade-facilities`; this package ingests **DUKES 4.5a trade flows** (partner countries). Sheet **4.5b** facility capacity is a static register and is **not** ingested (open question).

## Source

| Field | Value |
|-------|--------|
| Landing | https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes |
| Table | DUKES 4.5a — Natural gas imports and exports |
| Pinned raw | `raw/2026-11-07/DUKES_4.5.xlsx` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6aba96a9734e2435f202f1d6/DUKES_4.5.xlsx |
| Release | 30 Jul 2026 |
| Unit | GWh |
| Frequency | Annual (calendar year) |
| Geography | UK (`K02000001`); partners in notes |
| Licence | Open Government Licence v3.0 |
| Checksum | `9e005b47311313def8d45274db493938ba6b2383ec609865b3a436c81d91b12c` |
| Observations | 464 (2000–2025; non-zero partners + aggregates) |

## Scope choices

- **Ingest:** Sheet `4.5a` — Imports / Exports / Net × Pipeline / LNG × partner.
- **Notes:** `partner=<Country>; flow=…; mode=…; kind=partner|aggregate; fuel=Gas`.
- **Omit:** Ordinary partner zeros. Keep publisher totals as `kind=aggregate`.
- **Not ingested:** Sheet `4.5b` facility max flow rates (mm3/day) — not annual trade.
- **Honesty:** Partner countries — **not** invented pipeline landfalls from 4.5b location text.

## Related (link, do not fork)

- `lng-imports-by-terminal` — DUKES 4.6 terminal volumes
- `oil-imports-by-country` — DUKES 3.7 oil partners
- `energy-import-dependency` / `electricity-interconnector-flows` — Ready reuse

## Reproduce

```bash
uv run python -m energy.connectors.gas_trade_by_partner
```

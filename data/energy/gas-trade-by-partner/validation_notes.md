# Validation notes — `gas-trade-by-partner`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B1 Lifelines)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_gas_trade_by_partner_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.gas_trade_by_partner
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/DUKES_4.5.xlsx` |
| sha256 | `9e005b47311313def8d45274db493938ba6b2383ec609865b3a436c81d91b12c` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6aba96a9734e2435f202f1d6/DUKES_4.5.xlsx |
| Official release | 2026-07-30 |
| Curated rows | 464 |
| Connector | `energy.connectors.gas_trade_by_partner` |
| Sheet used | `4.5a` only (`4.5b` deferred) |

## Sample checks (Energy self-check)

| Year | Slice | Workbook GWh | Curated |
|------|-------|--------------|---------|
| 2025 | Import / Pipeline / Norway | 320249.12 | 320249.12 |
| 2025 | Import / LNG / USA | 106175.2 | 106175.2 |
| 2025 | Import / LNG / Qatar | 8216.34 | 8216.34 |
| 2025 | Import / LNG / Norway | 1817.85 | 1817.85 |
| 2025 | Import / Total / Total imports | 463691.92 | 463691.92 |

Please re-open pinned sheet `4.5a` column 2025 before Ready.

## Method notes

- Note 2 (2016): LNG methodology break.
- Note 5: negative Net imports = net exporter period.
- Cover Sheet 2026: 2025 LNG origin correction (Brazil/Mexico → USA) already in this pin.
- Licence: Open Government Licence v3.0.

## Out of scope this hand-off

- DUKES 4.5b facility capacity / owner / location text as Observation rows
- Invented Bacton / Easington / St Fergus map coordinates
- Marking Ready / writing `data/qa/`

# Validation notes — `lng-imports-by-terminal`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B1 Lifelines)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_lng_imports_by_terminal_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.lng_imports_by_terminal
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/DUKES_4.6.xlsx` |
| sha256 | `5ae07c741aab95e6cec642fd3adb8e1ec4832dedccb1074e2192700e85b49284` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a69f46eb5fc953081705fea/DUKES_4.6.xlsx |
| Official release | 2026-07-30 |
| Curated rows | 130 |
| Connector | `energy.connectors.lng_imports_by_terminal` |

## Sample checks (Energy self-check)

| Year | Terminal | Workbook GWh | Curated |
|------|----------|--------------|---------|
| 2025 | South Hook (Milford Haven) | 77446.91 | 77446.91 |
| 2025 | Dragon (Milford Haven) | 32272.78 | 32272.78 |
| 2025 | Isle of Grain | 27644.08 | 27644.08 |
| 2025 | Teeside GasPort (Teeside) | 0 | 0.0 |
| 2025 | Total LNG imports | 137363.77 | 137363.77 |

Please re-open pinned sheet `4.6` column 2025 before Ready.

## Method notes

- Note 2 (2016): methodology break for LNG cargo coverage — flag in secondary analysis.
- Terminal labels strip `[note N]`; Isle of Grain note retained only in source workbook.
- Licence: Open Government Licence v3.0.

## Out of scope this hand-off

- Map coordinates for terminals (need separate authoritative GIS)
- DUKES 4.5b capacity (mm3/day) register
- Marking Ready / writing `data/qa/`

# Validation notes — `oil-imports-by-country`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B1 Lifelines)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_oil_imports_by_country_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.oil_imports_by_country
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/DUKES_3.7.xlsx` |
| sha256 | `fd855afe3ad2145c69db63f83d55bdd7f50fc615d9a5893014af7163ede6bb06` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a69f0a74dda8076771a433f/DUKES_3.7.xlsx |
| Official release | 2026-07-30 |
| Curated rows | 896 |
| Connector | `energy.connectors.oil_imports_by_country` |

## Sample checks (Energy self-check)

| Year | Partner | Workbook Total oil (thousand t) | Curated |
|------|---------|----------------------------------|---------|
| 2025 | Total imports | 76591.82 | 76591.82 |
| 2025 | United States | 16866.42 | 16866.42 |
| 2025 | Norway | 12178.23 | 12178.23 |
| 2025 | Algeria | 2698.25 | 2698.25 |
| 2025 | Belgium | 2952.96 | 2952.96 |

Please re-open the pinned XLSX year sheet `2025` Total oil column before Ready.

## Method notes

- UK statistical geography (`K02000001`); partner labels live in `notes`, not invented admin codes.
- Zero Total-oil partner rows omitted; aggregates retained with `kind=aggregate`.
- Licence: Open Government Licence v3.0.

## Out of scope this hand-off

- Product-level breakdowns (Crude oil / DERV / …)
- Pipeline landfall / port coordinates
- Marking Ready / writing `data/qa/`

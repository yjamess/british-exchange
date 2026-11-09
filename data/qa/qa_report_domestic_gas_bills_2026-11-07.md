# QA report — domestic gas bills — 2026-11-07

## Scope
- Indicator: `domestic-gas-bills` (DESNZ QEP 2.3.1 Average annual domestic gas bills @ 11,200 kWh/year, UK, cash)
- Manifest: `data/energy/domestic-gas-bills/manifest.yaml`
- Raw: `data/energy/domestic-gas-bills/raw/2026-11-07/table_231.xlsx`
- Curated: `data/energy/domestic-gas-bills/curated/observations.csv` (80 rows)
- Connector: `src/energy/connectors/domestic_gas_bills.py` (read-only)
- Energy notes: `data/energy/domestic-gas-bills/validation_notes.md`
- Twin pattern: `data/qa/qa_report_domestic_electricity_bills_2026-11-07.md` (QEP 2.2.1 @ 3,400 kWh)
- Registry: https://app.notion.com/41165471768581048377c944c354e01c

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs expected / manifest | **pass** | `shasum -a 256` = `680e8d3522ac82c365cd2b4c9020ac30901c0813b59fd012c50278bf9c3285b2` (exact match to manifest + task pin). No re-ingest as primary path. |
| C2 | Curated coverage — ~80 UK annual rows 2014–2025 @ 11,200 kWh | **pass** | 80 rows; years contiguous 2014–2025; all `consumption_kwh=11200`; geo `K02000001` / United Kingdom; unit `GBP`; fuel=`Gas` |
| C3 | Method — GBP bills @ 11,200 kWh; not electricity 3,400 kWh or industrial p/kWh | **pass** | Manifest unit `GBP`; Cover Sheet: fixed 11,200 kWh/year for UK domestic gas; notes carry `consumption_kwh=11200` and `fuel=Gas`. No `3400`, electricity, or p/kWh units in curated. Distinct from Ready twin `domestic-electricity-bills` and `industrial-electricity-prices`. |
| C4 | Method — UK geography; annual; payment × tariff dimensions | **pass** | UK only. Calendar years (`YYYY-01-01`–`YYYY-12-31`). Payment ∈ {Standard credit, Direct debit, Prepayment, Overall}; tariff ∈ {Fixed, Variable, All} in `notes`. Pre-2022 Fixed/Variable blank in XLSX and correctly omitted (48 All + 16 Fixed + 16 Variable = 80). |
| C5 | Method — Fixed/Variable in-development caveat; historic sheets out of scope | **pass** | Sheet R3 + manifest: Fixed/Variable = official statistics in development from 2022. Financial-year / 13,600–18,000 kWh / real-terms sheets present in workbook but not ingested (sheet `2.3.1` only). |
| C6 | Numerical — Energy claimed spots vs pinned sheet `2.3.1` | **pass** | Independent `openpyxl` `data_only` re-read; claimed 2-dp figures match. Overall/All 2023/2024/2025 + 2014; Direct debit/All 2025 — all exact float match to curated (diff 0.0). |
| C7 | Numerical — full sheet ↔ curated integrity | **pass** | Every non-null cell in payment×tariff columns for years 2014–2025 present in curated; no extras; 0 value mismatches at 1e-9 |
| C8 | No silent rewrite / no Ofgem invent / no Domain 03 complete claim | **pass** | Validation did not edit Energy curated/raw. No Ofgem cap series invented. Domain 03 remains open (regional, unit/standing, Ofgem cap, real-terms). |
| C9 | Manifest / connector reproducibility | **pass** | Headers on row 8 match connector `EXPECTED_HEADERS`; Cover Sheet publication date 30/06/2026; entrypoint `uv run python -m energy.connectors.domestic_gas_bills`; source_version `QEP_2.3.1_JUN_26` |
| C10 | Dimensions live in free-text `notes` | **warn** | Payment/tariff/consumption/fuel are parseable `key=value` notes, not typed columns. Same as electricity twin; acceptable for contract v1.0; not a Ready blocker |

## Numerical samples (Validation recompute)

Pinned sheet `2.3.1` (`data_only`) vs curated:

| Year | Payment | Tariff | XLSX float | Curated | Display (2 dp) | Match |
|------|---------|--------|------------|---------|----------------|-------|
| 2023 | Overall | All | 1094.4419988659938 | 1094.4419988659938 | 1094.44 | exact |
| 2024 | Overall | All | 845.7347348080573 | 845.7347348080573 | 845.73 | exact |
| 2025 | Overall | All | 834.4710473402552 | 834.4710473402552 | 834.47 | exact |
| 2014 | Overall | All | 584.9232699006332 | 584.9232699006332 | 584.92 | exact |
| 2025 | Direct debit | All | 823.353444031362 | 823.353444031362 | 823.35 | exact |
| 2022 | Standard credit | All | 1063.357062761741 | 1063.357062761741 | 1063.36 | exact |
| 2025 | Direct debit | Fixed | 793.7881189306232 | 793.7881189306232 | 793.79 | exact |

Observation statuses: all 80 = `final`. Source version: `QEP_2.3.1_JUN_26`.

Energy claimed ≈ figures (1094.44 / 845.73 / 834.47 / 823.35) match 2-decimal display rounding of official floats.

## Summary
- Pass: **9**
- Warn: **1**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Ready. Optional later: promote payment/tariff/consumption into typed observation fields if Domain 03 filtering needs it (same warn as electricity twin).
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence includes this QA path

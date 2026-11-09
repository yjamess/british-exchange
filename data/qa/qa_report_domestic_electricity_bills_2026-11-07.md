# QA report — domestic electricity bills — 2026-11-07

## Scope
- Indicator: `domestic-electricity-bills` (DESNZ QEP 2.2.1 Standard Electricity bills @ 3,400 kWh/year, UK, cash)
- Manifest: `data/energy/domestic-electricity-bills/manifest.yaml`
- Raw: `data/energy/domestic-electricity-bills/raw/2026-11-07/table_221.xlsx`
- Curated: `data/energy/domestic-electricity-bills/curated/observations.csv` (80 rows)
- Connector: `src/energy/connectors/domestic_electricity_bills.py`
- Energy notes: `data/energy/domestic-electricity-bills/validation_notes.md`
- Gate 1: `data/energy/energy-prices/` (reuse map links Ready `industrial-electricity-prices`; no re-ingest)
- Registry: https://app.notion.com/411654717685810ca44cff374a0b7d24

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs expected / manifest | **pass** | `shasum -a 256` = `818c53fc646ccfb40bbc54d5f22baed07fe17d20ca4b89ae79e821017a6f774b` (exact match) |
| C2 | Curated coverage — ~80 UK annual rows 2014–2025 @ 3,400 kWh | **pass** | 80 rows; years contiguous 2014–2025; all `consumption_kwh=3400`; geo `K02000001` / United Kingdom; unit `GBP` |
| C3 | Method — GBP bills ≠ industrial p/kWh; typical-consumption documented | **pass** | Manifest unit `GBP`, definition + caveats state fixed 3,400 kWh (not Ofgem TDCV); notes carry `consumption_kwh=3400`; Cover Sheet confirms 3,400 kWh; distinct from Ready `industrial-electricity-prices` (GB mfg p/kWh, QEP 3.1.2) |
| C4 | Method — UK geography; payment / tariff dimensions | **pass** | UK only. Payment ∈ {Standard credit, Direct debit, Prepayment, Overall}; tariff ∈ {Fixed, Variable, All} encoded in `notes`. Pre-2022 Fixed/Variable blank in XLSX and correctly omitted (48 All + 16 Fixed + 16 Variable = 80) |
| C5 | Method — EPG / EBSS / Fixed–Variable caveats | **pass** | Sheet notes + manifest: EPG from Oct 2022 included; EBSS £200 excluded; Fixed/Variable = official statistics in development |
| C6 | Numerical — Energy spot-checks vs pinned sheet `2.2.1` | **pass** | Independent `openpyxl` `data_only` re-read; all five spots exact float match (diff 0.0). Display rounding matches claimed 2-dp figures |
| C7 | Numerical — full sheet ↔ curated integrity | **pass** | Every non-null cell in payment×tariff columns for years 2014–2025 present in curated; no extras; 0 value mismatches at 1e-9 |
| C8 | No silent rewrite / no Ofgem invent / no Ready fork | **pass** | Validation did not edit Energy data. No Ofgem cap history invented. `industrial-electricity-prices` reused via Gate 1 only |
| C9 | Manifest / connector reproducibility | **pass** | Headers on row 13 match connector `EXPECTED_HEADERS`; Cover Sheet publication date 30/06/2026; entrypoint `uv run python -m energy.connectors.domestic_electricity_bills` |
| C10 | Dimensions live in free-text `notes` | **warn** | Payment/tariff/consumption are parseable `key=value` notes, not typed columns. Acceptable for contract v1.0 and Gate 3 discovery; not a Ready blocker |

## Numerical samples (Validation recompute)

Pinned sheet `2.2.1` (`data_only`) vs curated:

| Year | Payment | Tariff | XLSX float | Curated | Display (2 dp) | Match |
|------|---------|--------|------------|---------|----------------|-------|
| 2023 | Overall | All | 1213.366842800942 | 1213.366842800942 | 1213.37 | exact |
| 2025 | Direct debit | All | 1059.3856398583757 | 1059.3856398583757 | 1059.39 | exact |
| 2022 | Standard credit | All | 1166.7306844582668 | 1166.7306844582668 | 1166.73 | exact |
| 2014 | Overall | All | 547.5030113506989 | 547.5030113506989 | 547.50 | exact |
| 2025 | Direct debit | Fixed | 1021.6440838142062 | 1021.6440838142062 | 1021.64 | exact |

Observation statuses: all 80 = `final`. Source version: `QEP_2.2.1_JUN_26`.

## Summary
- Pass: **9**
- Warn: **1**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Ready. Optional later: promote payment/tariff/consumption into typed observation fields if Domain 03 filtering needs it.
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence includes this QA path

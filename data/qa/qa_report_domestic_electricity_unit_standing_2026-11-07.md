# QA report — domestic electricity unit rates and standing charges — 2026-11-07

## Scope
- Indicator: `domestic-electricity-unit-standing` (DESNZ QEP 2.2.4 average variable unit price £/kWh + average fixed cost £/year, standard electricity, UK regions, calendar year)
- Manifest: `data/energy/domestic-electricity-unit-standing/manifest.yaml`
- Raw: `data/energy/domestic-electricity-unit-standing/raw/2026-11-07/table_224.xlsx`
- Curated: `data/energy/domestic-electricity-unit-standing/curated/observations.csv` (2048 rows)
- Connector (read-only): `src/energy/connectors/domestic_electricity_unit_standing.py`
- Gate 1 composition: `data/energy/energy-prices/GATE1_COMPOSITION.md` (Study C — Dissected Bill layers)
- Companion Ready: `domestic-electricity-bills` (QEP 2.2.1)
- Claimed checksum: `1a28aad7d06bc2696dafef85704e6aa308d7c4b0d1e2fdfcbbd21d4d811f8d02`
- Asset: https://assets.publishing.service.gov.uk/media/6a4245b97ac6fd9c6a94aae2/table_224__1_.xlsx
- Registry: https://app.notion.com/41165471768581f08a34c092a897fbfd

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs claimed / manifest | **pass** | `shasum -a 256` = `1a28aad7d06bc2696dafef85704e6aa308d7c4b0d1e2fdfcbbd21d4d811f8d02` (exact match) |
| C2 | Curated coverage — year × region × payment × measure | **pass** | 2048 rows; years contiguous 2010–2025; 30 regions incl. United Kingdom; payments {Standard credit, Direct debit, Prepayment, Overall}; measures balanced 1024/1024; geo code always `K02000001` |
| C3 | Method — £/kWh vs £/year in unit field | **pass** | `measure=unit_price` → `GBP_per_kWh`; `measure=fixed_cost` → `GBP_per_year`; no crossed units |
| C4 | Method — Credit→Standard credit; region/PES in notes | **pass** | Sheet header “Credit” mapped to `payment=Standard credit` (0 residual `payment=Credit`); `region=` and `pes=` present on every row |
| C5 | Method — calendar-year sheet only; OS in development | **pass** | Only sheet `2.2.4` ingested (Economy 7 / Financial Year sheets present in workbook, absent from curated). Methodology note 1: “official statistics in development”; Cover Sheet publication 30/06/2026 |
| C6 | Numerical — claimed UK 2025 Overall spot vs sheet `2.2.4` | **pass** | Unit ≈ 0.257461 £/kWh (xlsx `0.2574607297288936`); fixed ≈ 193.98 £/year (xlsx `193.97637754712437`); curated exact float match |
| C7 | Numerical — full sheet ↔ curated integrity | **pass** | Every non-null payment×measure cell on calendar sheet → curated; 0 missing / 0 extra / 0 mismatches at 1e-9 |
| C8 | Companion reconstruction vs Ready `domestic-electricity-bills` @ 3400 kWh | **pass** | For UK × payment × tariff=All (2014–2025): `fixed_cost + unit_price × 3400` matches published 2.2.1 bills at float precision (diff 0). Fixed/Variable bill slices are not reconstructed from this aggregate series (expected; do not invent). Not far → no warn |
| C9 | No silent rewrite / no Ofgem invent / no Ready fork | **pass** | Validation did not edit Energy curated/raw. No Ofgem cap invented. Companion bills reused read-only |
| C10 | Dimensions live in free-text `notes` | **warn** | payment / measure / region / pes are parseable `key=value` notes, not typed columns. Same contract v1.0 pattern as Ready bills twins; not a Ready blocker |

## Numerical samples (Validation recompute)

Pinned sheet `2.2.4` (`data_only`) vs curated — United Kingdom Overall:

| Year | Measure | XLSX float | Curated | Display claim | Match |
|------|---------|------------|---------|---------------|-------|
| 2025 | unit_price | 0.2574607297288936 | 0.2574607297288936 | ~0.257461 £/kWh | exact |
| 2025 | fixed_cost | 193.97637754712437 | 193.97637754712437 | ~193.98 £/year | exact |
| 2024 | unit_price | 0.2582700021794268 | 0.2582700021794268 | — | exact |
| 2024 | fixed_cost | 205.1094903566591 | 205.1094903566591 | — | exact |
| 2023 | unit_price | 0.30376439668966027 | 0.30376439668966027 | — | exact |

Reconstruction samples (UK Overall @ 3400 kWh vs Ready 2.2.1 Overall/All):

| Year | Reconstructed | Published bill | Diff |
|------|---------------|----------------|------|
| 2025 | 1069.342857624363 | 1069.342857624363 | 0.0 |
| 2024 | 1083.227497766709 | 1083.227497766709 | 0.0 |
| 2023 | 1213.366842800942 | 1213.366842800942 | 0.0 |

Observation statuses: all 2048 = `final`. Source version: `QEP_2.2.4_JUN_26`. NI 2025 fixed_cost = 0.0 across payments (matches publisher presentation).

## Summary
- Pass: **9**
- Warn: **1**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Ready. Optional later: Economy 7 / financial-year sibling indicators; typed region/PES columns if UI needs them.
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence includes this QA path

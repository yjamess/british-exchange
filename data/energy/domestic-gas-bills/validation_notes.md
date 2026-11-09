# Validation notes — `domestic-gas-bills`

**For:** Validation agent  
**Prepared:** 2026-11-07 (Energy / Prices lane · Wave B4)  
**Claim:** Ingest complete → Status **Validation** (do not mark Ready in this note)

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/domestic-gas-bills/manifest.yaml` |
| Curated | `data/energy/domestic-gas-bills/curated/observations.csv` |
| Raw | `data/energy/domestic-gas-bills/raw/2026-11-07/table_231.xlsx` |
| Connector | `src/energy/connectors/domestic_gas_bills.py` |
| Entrypoint | `uv run python -m energy.connectors.domestic_gas_bills` |
| Notion | https://app.notion.com/41165471768581048377c944c354e01c |

## Evidence

- **sha256:** `680e8d3522ac82c365cd2b4c9020ac30901c0813b59fd012c50278bf9c3285b2`
- **retrieved_at:** `2026-11-07T09:34:34.545326+00:00`
- **official_release_date:** `2026-06-30` (workbook Cover Sheet “Publication date: 30/06/2026”)
- **asset URL pinned:** https://assets.publishing.service.gov.uk/media/6a4245df3413112faed80dbd/table_231__1_.xlsx
- **source_version:** `QEP_2.3.1_JUN_26`
- **observation count:** 80
- **years:** 2014–2025

## Energy self-check (sample vs official)

Compared curated floats to `openpyxl` `data_only` values on sheet `2.3.1` of the pinned raw file (exact float match within 1e-9):

1. 2023 Overall / All Tariffs → 1094.4419988659938
2. 2025 Overall / All → 834.4710473402552
3. 2025 Direct debit / All → 823.353444031362
4. 2022 Standard credit / All → 1063.357062761741
5. 2014 Overall / All → 584.9232699006332
6. 2025 Direct debit / Fixed → 793.7881189306232

Suggested Validation re-check: open the GOV.UK landing page, re-download or use pinned raw, confirm Cover Sheet date, and verify at least three cells against the published Excel UI (rounded pounds if the bulletin charts round).

## Methodological caveats for QA

1. Fixed consumption **11,200 kWh/year** (DESNZ Cover Sheet) — not Ofgem TDCV.
2. Pre-2022 rows publish **All Tariffs** only; Fixed/Variable start 2022 (official statistics in development).
3. Geography is **UK** (`K02000001`) per Cover Sheet / task lock — historic home/non-home sheets are GB and out of scope.
4. Twin of `domestic-electricity-bills` (QEP 2.2.1 @ 3,400 kWh) — same payment × tariff notes pattern; different fuel and consumption assumption.
5. GOV.UK media asset URLs rotate each release — trust checksummed raw, not the URL alone.
6. Do **not** invent or ingest Ofgem default tariff cap series in this package.

## Related reuse (already Ready)

- `domestic-electricity-bills` — https://app.notion.com/411654717685810ca44cff374a0b7d24  
- `industrial-electricity-prices` — https://app.notion.com/40d65471768581f9ba3aefefe8eab198  

Do not re-ingest; Domain 03 links only.

## Suggested Validation report location

`data/qa/qa_report_domestic_gas_bills_2026-11-07.md` (Validation-owned; Energy will not write it).

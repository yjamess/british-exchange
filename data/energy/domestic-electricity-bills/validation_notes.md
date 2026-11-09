# Validation notes — `domestic-electricity-bills`

**For:** Validation agent  
**Prepared:** 2026-11-07 (Energy / Prices lane)  
**Claim:** Ingest complete → Status **Validation** (do not mark Ready in this note)

## Hand-off paths

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/domestic-electricity-bills/manifest.yaml` |
| Curated | `data/energy/domestic-electricity-bills/curated/observations.csv` |
| Raw | `data/energy/domestic-electricity-bills/raw/2026-11-07/table_221.xlsx` |
| Connector | `src/energy/connectors/domestic_electricity_bills.py` |
| Entrypoint | `uv run python -m energy.connectors.domestic_electricity_bills` |

## Evidence

- **sha256:** `818c53fc646ccfb40bbc54d5f22baed07fe17d20ca4b89ae79e821017a6f774b`
- **retrieved_at:** see manifest `raw_evidence[0].retrieved_at`
- **official_release_date:** `2026-06-30` (workbook Cover Sheet “Publication date: 30/06/2026”)
- **source_version:** `QEP_2.2.1_JUN_26`
- **observation count:** 80
- **years:** 2014–2025

## Energy self-check (sample vs official)

Compared curated floats to `openpyxl` `data_only` values on sheet `2.2.1` of the pinned raw file (exact float match within 1e-9):

1. 2023 Overall / All Tariffs → £1213.37 (display) / raw 1213.3668…
2. 2025 Direct debit / All → 1059.3856…
3. 2022 Standard credit / All → 1166.7307…
4. 2014 Overall / All → 547.5030…
5. 2025 Direct debit / Fixed → 1021.6441…

Suggested Validation re-check: open the GOV.UK landing page, re-download or use pinned raw, confirm Cover Sheet date, and verify at least three cells against the published Excel UI (rounded pounds if the bulletin charts round).

## Methodological caveats for QA

1. Fixed consumption **3,400 kWh/year** (DESNZ current assumption) — not Ofgem TDCV.
2. Pre-2022 rows publish **All Tariffs** only; Fixed/Variable start 2022 (official statistics in development).
3. EPG included from Oct 2022; EBSS £200 **excluded** (stated on sheet).
4. Geography is **UK**, not GB — distinct from `industrial-electricity-prices` (GB manufacturing p/kWh).
5. GOV.UK media asset URLs rotate each release — trust checksummed raw, not the URL alone.

## Related reuse (already Ready)

- `industrial-electricity-prices` — https://app.notion.com/40d65471768581f9ba3aefefe8eab198  
  Do not re-ingest; Domain 03 links only.

## Suggested Validation report location

`data/qa/domestic-electricity-bills.md` (Validation-owned; Energy will not write it).

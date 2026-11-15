# Kickoff — Validation · EC-VAL-06E-DRAG (fiscal drag)

**Status:** done (PASS 16/1/0) · 2026-11-15  
**Owner:** Validation  
**Package:** `data/economy/tax-machine-income-tax-history/`  
**Handover:** [handover-economy-06-fiscal-drag.md](handover-economy-06-fiscal-drag.md)  
**Work plan:** `EC-VAL-06E-DRAG`

## Ask

Independently re-check fiscal-drag artefacts vs raw ONS KAI7 and curated statute tables. File pass/fail under `data/qa/`.

## Checks

| ID | Check |
|----|--------|
| C1 | `kai7_emp.json` SHA-256 ↔ manifest / `SHA256SUMS`; ONS title/CDID/releaseDate present |
| C2 | Recompute tax-year means for 2021–22 and 2025–26 from raw months (Apr–Mar) ×52 ↔ `awe_kai7_tax_year.csv` |
| C3 | Recompute one E/W/NI liability (e.g. `ewni_awe_scaled` 2021–22 and 2025–26) from PA + bands ↔ JSON `band_steps` |
| C4 | E/W/NI counterfactual indexes PA/basic upper by KAI7 only (rates not invented) |
| C5 | Scotland profile uses Scotland rows — not E/W/NI copy |
| C6 | Scotland 2017–18…2022–23 band CSV fingerprint unchanged vs prior SCOT PASS |
| C7 | Status=`documented`, `ready=false`; no frontend / no Ready claim by Economy |
| C8 | Exclusions + educational disclaimer present |

## Do not

Rewrite curated bands; invent wage paths; flip Ready; build fiscal-drag UI.

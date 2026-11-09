# Validation notes — ofgem-default-tariff-cap (Energy self-check)

**Date:** 2026-11-07  
**Connector:** `energy.connectors.ofgem_default_tariff_cap`

| Artefact | Path |
|----------|------|
| Manifest | `data/energy/ofgem-default-tariff-cap/manifest.yaml` |
| Periods | `periods.json` / `periods.csv` |
| Curated | `curated/observations.csv` (12 rows = 4 periods × 3 measures) |
| Raw | `raw/2026-11-07/{jan-mar,apr-jun,jul-sep,oct-dec}-2026/` |

## Self-check (Annex 9 `1a` GB average, inc VAT, Other Payment Method)

| Period | dual_fuel £/year | elec_single | gas |
|--------|------------------:|------------:|----:|
| 2026-01 → 03 | 1757.98 | 947.56 | 810.42 |
| 2026-04 → 06 | 1641.22 | 875.01 | 766.21 |
| 2026-07 → 09 | 1663.37 | 861.50 | 801.87 |
| 2026-10 → 12 | 1723.36 | 858.20 | 865.16 |

Spot-check next: Oct–Dec 2026 **Energy price cap levels** PDF dual-fuel GB / direct-debit headline vs 1723.36.

## Honesty

- Not DESNZ bills; not NI; not a scraped third-party series.  
- TDCV change Jul 2026 must appear in any chart comparing H1 vs H2 2026.
- PDF headline tables are often excl VAT / regional; curated = Annex 9 GB average **inc VAT**.

## QA

`data/qa/qa_report_ofgem_default_tariff_cap_2026-11-07.md` — £ levels pass; C7 TDCV footnote fixed (Jul–Sep → 2.5 / 9.5 MWh). **Ready**.

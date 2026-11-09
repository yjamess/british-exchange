# Ofgem default tariff (price) cap — pin archive

**Indicator:** `ofgem-default-tariff-cap`  
**Geography:** Great Britain only — **not** Northern Ireland  
**Method:** Pin each charge-restriction period’s official PDF + Annex 9 XLSX; curate GB-average VAT-inclusive benchmark £/year. There is **no** official continuous historic CSV.

Landing: [Energy price cap (default tariff) levels](https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels)

## Reproduce

```bash
uv run python -m energy.connectors.ofgem_default_tariff_cap
```

Reads `periods.json` → pinned `raw/` → writes `curated/observations.csv` + `manifest.yaml` + `periods.csv`.

## What is curated (v1)

For each pinned quarter, three observations under **Other Payment Method** (≈ direct debit):

| measure (in `notes`) | Meaning |
|----------------------|---------|
| `elec_single` | Electricity single-rate, GB average, inc VAT, benchmark £/year |
| `gas` | Gas, same basis |
| `dual_fuel` | Dual fuel (implied), same basis |

Typical Domestic Consumption Values (TDCV) are recorded in `notes` from Annex 9 sheet `1c` (period-dated columns — Jul 2026 onwards uses the July-revised TDCV). **Do not** equate with DESNZ QEP 3,400 / 11,200 kWh bill tables.

**PDF vs curated:** Energy price cap levels PDFs are typically **excl VAT** and regional. Curated values are Annex 9 **GB average, inc VAT** (Other Payment Method).

## First pins (2026-11-07)

| Period | Dual-fuel GB avg (inc VAT) |
|--------|----------------------------|
| Jan–Mar 2026 | £1,757.98 |
| Apr–Jun 2026 | £1,641.22 |
| Jul–Sep 2026 | £1,663.37 |
| Oct–Dec 2026 | £1,723.36 |

TDCV shifted Jul 2026 (elec 2.7→2.5 MWh; gas 11.5→9.5 MWh) — period comparisons need that caveat.

## Not yet

- Pre-2026 history (pin more periods)  
- Standard Credit / PPM payment methods  
- 14 regional rows  
- UI wire-in  

## Status

Ingested → hand to **Validation**. Not Ready until QA vs Ofgem PDF headline figures.

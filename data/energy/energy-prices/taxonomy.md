# Energy Prices & Costs — Gate 1 taxonomy

**Domain:** 03 · Energy Prices & Costs  
**Locked question:** What does energy really cost British households and industries, how has that changed, and what is being compared?  
**Notion brief:** https://app.notion.com/p/41065471768581b6a1f2c431166de362  
**Inventory date:** 2026-11-07

## Measure families (do not mix axes)

| Family | What it is | Typical unit | Official home | Compare carefully with |
|--------|------------|--------------|---------------|------------------------|
| Domestic retail bill | Illustrative annual bill at **fixed** consumption | GBP / year | DESNZ QEP 2.2.x / 2.3.x | Ofgem TDCV bills; actual meter reads |
| Domestic unit + standing | Unit rate and fixed charge components | p/kWh, £/year or p/day | DESNZ QEP 2.2.4 / 2.3.4; Ofgem cap tables | Bill totals (need consumption × days) |
| Industrial / manufacturing price | Survey average purchase price | p/kWh | DESNZ QEP 3.1.2 (GB mfg) | Non-domestic QEP 3.4.1 (UK); domestic bills |
| Price cap level | Maximum default-tariff charges by region/payment | £/year typical, p/kWh, p/day | Ofgem default tariff cap | Actual DESNZ average bills; NI regimes |
| Wholesale / indices | Market or deflator series | £/therm, index | ICE/NBP via Fossils; ONS CPIH via Economy | Retail bills (lags, taxes, network) |
| Income / expenditure burden | Bill ÷ income or fuel spend | % or £ | QEP 2.6.x + Economy/People | Observed vs user scenario |

## Consumption assumptions (label every chart)

| Source | Standard electricity | Economy 7 / ToU | Gas |
|--------|---------------------|-----------------|-----|
| DESNZ QEP bills (current) | **3,400 kWh/year** | **4,800 kWh/year** (2,400 off-peak) | **11,200 kWh/year** |
| DESNZ historic (pre-2024 methodology sheets) | 3,600 kWh | 5,100 kWh | — |
| Ofgem TDCV (typical use; updates) | Medium ~2,500 kWh (check release) | — | Medium ~9,500 kWh (check release) |

DESNZ keeps consumption fixed to isolate price change; Ofgem TDCV tracks typical use. **Never plot them on one unlabelled axis.**

## Geography rules

- **UK (`K02000001`):** QEP domestic bill tables 2.2.1–2.2.x (electricity).
- **Great Britain (`K03000001`):** Manufacturing QEP 3.1.2; most Ofgem price-cap material; many gas regional tables.
- **Northern Ireland:** Separate retail regime — do not apply GB price-cap rules to NI postcodes.

## Payment / tariff dimensions

Use typed notes (contract):

- `payment=Standard credit|Direct debit|Prepayment|Overall`
- `tariff=Fixed|Variable|All` (Fixed/Variable = official statistics in development in QEP 2.2.1)
- `fuel=Electricity|Gas`
- `meter=Standard|Economy7`
- `consumption_kWh=<n>`
- Industrial reuse: `band=<Size>; ccl=excluding`

## Safeguards (from Notion §5)

1. Price caps are **not** caps on the total amount paid — bills depend on use.
2. Do not equate wholesale with domestic bills.
3. Do not mix nominal and real without a documented deflator (Economy-owned).
4. Track VAT, EPG/EBSS policy overlays, and methodology breaks (consumption change 2024).

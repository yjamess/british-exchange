# Effects of taxes and benefits (tax burden)

**Indicator:** `effects-of-taxes-and-benefits`  
**Domain:** 06 · Taxation & Revenue — **Who Bears the Tax Burden?**  
**Status:** Validation-ready (not Ready) · no frontend

## What this is

ONS [Effects of taxes and benefits on household income](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/theeffectsoftaxesandbenefitsonhouseholdincomefinancialyearending2014) (ETB) reference tables for **financial year ending 2024** (released 25 Sep 2025).

Pinned for the burden instrument:

| Table | Content |
|-------|---------|
| **Table 8** | Direct / indirect / all taxes as % of **gross income**; indirect also as % of **disposable income** and **expenditure** (publisher-supported denominators only) |
| **Table 2a** | Average household £/year **total direct** and **total indirect** taxes by quintile |

## Reproduce

```bash
uv run python -m economy.connectors.effects_of_taxes_and_benefits
```

## Honest limits

- Survey group averages (HFS/LCF private households) — **not** what any household pays.
- Legal liability ≠ economic incidence. **No fairness claims.**
- Direct taxes are **not** published as % of disposable income or expenditure in Table 8 — do not invent those shares.
- Ranking uses modified-OECD equivalised disposable income; Table 2a £ figures are unequivalised household averages.
- Not AHHY public-sector receipts; Domain 04 owns household income/HBAI — link, do not fork.

## Related

- Bulletin: [Effects of taxes and benefits on UK household income: FYE 2024](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/theeffectsoftaxesandbenefitsonhouseholdincome/2024)
- Handover: `docs/handover-economy-06-burden.md`
- Validation ask: `EC-VAL-06D`

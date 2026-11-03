# Manufacturing share of GVA

**Registry:** [Manufacturing share of GVA](https://app.notion.com/40d65471768581fa917ad614140dd2b3)  
**Agent:** energy (Energy & Industry)  
**Series:** ONS `L4NT` / WGDP — C Manufacturing Weights:CVM (parts per thousand → curated %)

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_share_of_gva
```

Pins raw JSON under `raw/2026-11-03/l4nt_wgdp.json`. Curated value = ONS weight ÷ 10 (% of GVA).

## Method caveat

These are **GDP(O) CVM industry weights**, not current-price GVA shares. Recent Blue Book years may hold the weight constant until the next BB.

## QA

```bash
uv run python -m validation.qa_manufacturing_share_of_gva_2026_11_03
```

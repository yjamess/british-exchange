# Economic policy — reuse map

## Context series (Ready elsewhere in Economy — link by id, never fork)

| Series | Domain › view | Used by |
|--------|---------------|---------|
| `cpi-inflation` | inflation › rate | Bank of England Act 1998; inflation target pledge |
| `mortgage-rate-2yr-fixed` | inflation › rate | Bank of England Act 1998 |
| `nominal-earnings` · `real-earnings` | wages › vs-prices | National Minimum Wage Act 1998 |
| `employment-rate` · `unemployment-rate` | employment › rates | Welfare Reform Act 2012; furlough scheme |
| `public-sector-net-borrowing` | debt › borrowing | Fiscal Responsibility Act 2010; 2011 Act; OBR; Charter; furlough |
| `public-sector-net-debt-percent-gdp` | debt › dial | 2011 Act; Charter |
| `real-gdp` | growth › produce | OBR; EU (Future Relationship) Act 2020 |
| `tes-by-function` | spending › function | Welfare cap pledge (context only; not the cap measure) |

## Other sectors' registers (reference by id in `dossier.related`)

- **Housing** `data/housing/policy-events/events.json` — WRA 2012 → `housing-act-1996`, `localism-act-2011`; Autumn Budget 2025 → `localism-act-2011`. Never copy Housing rows.
- **Energy** `data/energy/industrial-policy/events.json` — Autumn Budget 2024 → `energy-act-2023`, `climate-change-act-2008`; Autumn Budget 2025 → `climate-change-act-2008`, `modern-industrial-strategy-2025`.

## Blocked / candidate only

- Bank Rate and asset-purchase decisions as a series — needs a Ready Bank of England indicator first; the register must not carry monthly decisions as events.
- Further Budget / Finance Act rows — only add with OBR / HMT costings URLs.
- Further evaluations — select committees and academic assessments one by one.
- PSNFL and current-budget series — needed before any Charter pledge can be scored.
- Symmetric inflation scoring — rule filed (`docs/economy-10-symmetric-target-scoring-rule.md`); scorer path not built.

## Forbidden conflations

- A pledge or decision moving with a series is not an effect.
- Public sector net debt is not PSNFL.
- Net borrowing is not the current budget.
- Royal Assent is not commencement; announcement is not law.

# Economy data prompt — Domain 05 next pins (Anatomy · Revisions · Engine output)

**Owner:** Economy · **Orchestrator:** schedule with BX-BACK-007 / 008 (and Engine upgrade)  
**Domain:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)  
**Paths:** `src/economy/`, `data/economy/` · no frontend in this wave  
**Date locked:** 2026-11-11

## Design lock (do not reopen)

- Tabs **01 Produce** / **02 Ledger** carry **total output** (Real GDP / per head).
- Tab **03 Productivity** Engine shows **hours + output per hour** only. Notes already say Engine output is **not** GDP. Do **not** put GDP and the Engine identity on one instrument.
- Later upgrade only: pin ONS’s **published productivity output index** so the Engine can plot a published output row (identity checked vs ONS), instead of any Exchange product of hours × OPH. **Visual layout unchanged** — published number replaces a derived one.

## Bundle (one Economy wave)

| Priority | Indicator (proposed id) | Source | Why |
|----------|-------------------------|--------|-----|
| 1 | `labour-productivity-output` (name TBD) | ONS PRDY / *Output per hour worked, UK* — whole-economy **output (GVA) index** alongside LZVA hours + LZVB OPH | Engine upgrade: published output, not Exchange product |
| 2 | Industry GVA breakdown (Anatomy) | Official GVA-by-industry (volume vs current price declared) | BX-BACK-007 |
| 3 | Dated GDP vintages (Revision Archive) | Dated raw pins per GDP release under `raw/<date>/`; extend `economy.gdp-vintage-band` | BX-BACK-008 · after BX-BACK-005 re-pins |

Also re-pin with **BX-BACK-005** when running: ABMI / IHXW (post-12 Nov) · LZVB + LZVA (post-17 Nov) · new output index on the same PRDY vintage.

## G2 deliverables (Economy)

1. **Discover** the exact CDID / file column for whole-economy productivity **output** (same vintage and index base as LZVA/LZVB). Fail loudly if none matches — do not invent from ABMI.
2. Connector + curated + Manifest; registry row → Validation.
3. Spot-check identity: published output vs hours × OPH (document residual; do not force equality).
4. Scope industry GVA pin(s) for Anatomy (nominal vs CVM; no additive CVM shares without Notes).
5. Procedure note for storing dated QNA/PN2-style raws for the Revision Archive.
6. Handoff paths + checksums; **no React**.

## Validation

Independent QA under `data/qa/` before Ready. Orchestrator wires Engine published-output row only after Ready.

## Do not

- Fork Energy manufacturing productivity / IoP.
- Treat Engine output as Real GDP (ABMI).
- Sum chained-volume industry components as if additive.
- Build Anatomy / full Revision Archive UI in this wave.

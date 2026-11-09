# Energy Imports & Security — Gate 1 notes (Domain 05)

**Domain Notion:** [Energy Imports & Security](https://app.notion.com/p/410654717685813f8062c65191f6c0bb)  
**Locked question:** Where does Britain's imported energy enter the system, how has reliance changed, and what does resilience actually mean?  
**Wave:** Parallel Wave A3 — ingest only (no UI)  
**Owner:** Energy (Imports lane)

## Already Ready (do not fork)

| Indicator | Package | Coverage |
|-----------|---------|----------|
| `energy-imports-and-exports` | `data/energy/energy-imports-and-exports/` | DESNZ ET 1.3 aggregate UK Imports + Exports (ktoe), quarterly, 1998-Q1 → 2026-Q2 provisional. Notes: `flow=Imports\|Exports`. Exports keep DESNZ signed balance convention. |

**Registry:** [Energy imports and exports](https://app.notion.com/40d6547176858157b47ad6027387bc4e) — stays **Ready**.

Checksum re-verified 2026-11-07:

`raw/2026-11-03/ET_1.3_SEP_26.xlsx` → `7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81`

## Added this wave (Gate 2 vertical slice)

| Indicator | Package | Why |
|-----------|---------|-----|
| `energy-import-dependency` | `data/energy/energy-import-dependency/` | Official DESNZ **import dependency** ratio from the same ET 1.3 workbook (`Annual` / `Quarter dependency & low carbon`). Complements gross trade; answers “how has reliance changed” without inventing a vulnerability score. |

## Statistical safeguards (from domain brief)

- **Net ≠ gross** — Ready series is gross Imports and Exports; net is a derived balance, not a substitute for either flow.
- **Origin ≠ original source** — trade partner / entry-point geography is **not** in these tables; do not draw shipping routes from aggregate UK totals.
- **Dependency ≠ vulnerability** — `energy-import-dependency` is DESNZ’s published ratio (net imports ÷ documented denominator). It is **not** a resilience, diversity, storage, or price-exposure index.

Full category → source mapping: [gap-inventory.md](gap-inventory.md).

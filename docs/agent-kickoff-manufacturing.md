# Kickoff — Manufacturing (Domain 08)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI (Study C deepen)  
**Domain Notion:** https://app.notion.com/p/41065471768581afa032dec7299a7cfb  
**Mode:** **deepen wave** (2026-11-10) — Gate 4 closed; Composition + Industry Ledger + Output vs Jobs deepen. Anatomy redesign is owner-owned.

## Locked question

What does Britain manufacture today, how has the composition of output changed, and where does production take place?

## Creative thesis (Notion)

Living inventory of productive Britain — not a GDP dashboard. Flagship: **The Production Anatomy**.

## Delivered

| Item | Location |
|------|----------|
| Gate 1 inventory | `data/energy/manufacturing/` |
| Gate 1 composition | `GATE1_COMPOSITION.md` — **Study C locked** |
| Ready series | `manufacturing-output-index` · `manufacturing-share-of-gva` · `manufacturing-employment` · `manufacturing-output-per-hour` · `manufacturing-iop-by-division` · `bres-manufacturing-employee-jobs-by-region` |
| **UI** | Anatomy (owner redesign) · Composition · Output vs Jobs · Places · Industry Ledger · Data |
| Lean IoP pack | `energy.manufacturing-iop-annual` → `curated/annual_means.json` |

## Routes

| URL | What |
|-----|------|
| `/energy?domain=manufacturing` | Production Anatomy — SIC catalogue + national section C |
| `&level=` | `subsection` (default) · `division` |
| `&industry=` | DIOP CDID or all (catalogue) |
| `&from=` / `&year=` | Index / BRES change window |
| `&measure=` | National dial: volume / share / jobs / productivity |
| `&view=composition` | Economy GVA share + BRES regional job shares |
| `&view=output-jobs` | Volume · jobs · productivity (three panels) |
| `&view=places` | BRES employee jobs by region — RankBars + ChangeRows |
| `&view=ledger` | Official SIC specimen catalogue (not a product list) |
| `&view=data` | Branch table + BRES + national series |

## Ready spine

| Indicator | Status |
|-----------|--------|
| `manufacturing-iop-by-division` | **On UI** (M05) |
| `bres-manufacturing-employee-jobs-by-region` | **On UI** (M06 Places) |

## Still open

- British Product Ledger (later)
- Full regional GVA atlas (later)

## Forbidden

- Invent subsector tiles without Ready cuts
- Mix index / % / jobs / productivity on one unmarked axis
- Derive productivity as IoP÷jobs
- Claim Domain 08 complete

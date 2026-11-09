# Kickoff — Manufacturing (Domain 08)

**Opened:** 2026-11-07  
**Owners:** Energy (data) · Orchestrator/UI (Study C deepen)  
**Domain Notion:** https://app.notion.com/p/41065471768581afa032dec7299a7cfb  
**Mode:** Interim deepen shipped (Study C) — Domain 08 **not** complete; subsector catalogue deferred

## Locked question

What does Britain manufacture today, how has the composition of output changed, and where does production take place?

## Creative thesis (Notion)

Living inventory of productive Britain — not a GDP dashboard. Flagship: **The Production Anatomy**.

## Delivered

| Item | Location |
|------|----------|
| Gate 1 inventory | `data/energy/manufacturing/` |
| Gate 1 composition | `GATE1_COMPOSITION.md` — **Study C locked** |
| Ready series | `manufacturing-output-index` · `manufacturing-share-of-gva` · `manufacturing-employment` · `manufacturing-output-per-hour` |
| **Gate 2 UI** | `/energy?domain=manufacturing` · Anatomy card · Output vs Jobs · Data |

## Gate 2 routes

| URL | What |
|-----|------|
| `/energy?domain=manufacturing` | Anatomy ledger (volume · share · jobs · productivity) |
| `&measure=` | Dial: volume / share / jobs / productivity |
| `&view=output-jobs` | Volume index and jobs on separate charts |
| `&view=data` | Catalogue records |

## Still open

- Subsector IoP / GVA catalogue (true flagship)
- Manufacturing Atlas (regional)
- British Product Ledger

## Forbidden

- Invent subsector tiles without Ready cuts
- Mix index / % / jobs / productivity on one unmarked axis
- Derive productivity as IoP÷jobs
- Claim Domain 08 complete

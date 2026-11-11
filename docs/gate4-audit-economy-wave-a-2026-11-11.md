# Gate 4 audit — Economy Wave A (2026-11-11)

**Mode:** B — finishing sector / Wave A domains  
**Scope:** `web/src/brand/economy/` · rail in `sector-pages.ts` · contract `docs/economy-visual-contract.md`  
**References:** Energy Consumption / Generation · Housing Explorer shell  
**Skill:** `.cursor/skills/structural-consistency-audit/SKILL.md`  
**Read-only:** yes — no fixes in this pass

## Verdict

**Wave A Economy is structurally ready for Gate 4 close on the Explorer shell**, with **P1** follow-ups (Follow registry; optional `domain-sources`; phone-width measure not run). No P0 vs Consumption/Generation frame.

Gate 2 (instruments live) ≠ Gate 4 (this audit). Wave A G3 UI + cloud Ready loads are already done; this audit checks shell honesty.

## Coverage

| Area | Status |
|------|--------|
| Ready canvases | Inflation · Wages · Growth · Debt |
| Prep rail | employment · household · tax · spending · investment · policy (EmptyStage) |
| REF_ICON plates | Ten `economy*` plates — **owner-placed / ticked** |
| Phone 390px | **Not inspected** (no CDP session this pass) |
| Follow registry | **Absent** — intentional until Economy connections module |
| Maps | N/A |

## Sweep table (S1–S27)

| ID | Result | Notes |
|----|--------|-------|
| S1 Source | **Pass** | All chart feet use `formatSource`; wages vs-prices uses Boundaries |
| S2 Notes | **Pass** | One `FigureRecord` foot per Stage; no Coverage; no body ledes |
| S3 Controls | **Pass** | Outer `ControlRow` + `MenuControl` / Reset only |
| S4 Empty | **Pass** | `EmptyStage` when packs null; prep domains use shared empty copy |
| S5 Charts | **Pass** | No `leaders={true}`; sentence-case `stageTitle`; Data = titled tables |
| S6–S7 Maps | **N/A** | No Economy maps |
| S8 Signal/ink | **Pass** | No `tokens.css` fork; no Signal-on-prose hits |
| S9 URL/Reset | **Pass** | `domain` · `view` · `measure` in URL; Reset restores defaults |
| S10 Docs lock | **Pass** | Contract + identity + explorer-stage agree |
| S11 Energy frame | **Pass** | Frame order matches Consumption/Generation |
| S12 Follow | **Fail → P1** | No `connections/economy.ts`; Ready stages have no primary Follow |
| S13 Labelled gaps | **Pass** | COICOP / basket called planned-not-ready in Inflation Notes |
| S14 Stocks≠flows | **Pass** | Debt dial keeps measures separate; no stock+flow sum |
| S15 Atlas | **N/A** | |
| S16 Domain sources | **Fail → P1** | No `economy/domain-sources.ts`; load is inline by domain (honest but not Energy-pattern) |
| S17 Cloud Ready | **Pass** | `load.ts` API-only; comment forbids laptop CSV |
| S18 Empty options | **Pass*** | Measure options are fixed enums; *needs live browser confirm packs non-null |
| S19 Pooled periods | **Pass** | No period menus |
| S20 Missing as zero | **Pass** | `?? 0` only on `.length` checks, not chart values |
| S21 Options vs view | **Pass** | Measure menu only on dial/rate/produce views |
| S22 One-option menus | **Pass** | CPI/CPIH and debt/growth measures have ≥2 options |
| S23 Multi-select | **Pass** | None |
| S24 Loaded not offered | **Pass** | Wave A packs match menus |
| S25–S26 | **N/A** / **Pass** | No place lists; availability via EmptyStage |
| S27 Plain labels | **Pass** | CPI / CPIH / Net debt etc. — no raw CDID in menus |

### Menu table (Ready domains)

| Domain › view | Control | URL key | Default | Options | Drives |
|---------------|---------|---------|---------|---------|--------|
| inflation › rate | Measure | `measure` | `cpi` | CPI · CPIH | TimeChart series |
| inflation › index / data | — | — | — | — | dual index / tables |
| wages › * | — | `view` | `real` | real · vs-prices · cash · data | canvas body |
| debt › dial | Measure | `measure` | `debt` | debt · borrowing · interest · percent | TimeChart |
| growth › produce | Measure | `measure` | `gdp` | gdp · per-head · productivity | TimeChart |

## What’s consistent

- Shared Explorer shell; BrandRoot; `containerPort` print hero
- Ten-domain rail with REF_ICON plates; Ready vs prep from `ECONOMY_READY_DOMAINS`
- One Notes foot; `formatSource` grammar; EmptyStage honesty
- GB≠UK chip on wages vs prices; HF6X not derived from ABMI; CPI ≠ CPIH

## Inconsistency matrix

| ID | Where | Issue | Canonical | Pri |
|----|-------|-------|-----------|-----|
| G4-01 | Economy Ready stages | No primary Follow edge | Energy `EnergyStageFollow` + connections registry | **P1** |
| G4-02 | `economy/load.ts` | No `domain-sources.ts` allow-list | Energy `domain-sources.ts` | **P1** |
| G4-03 | Audit pass | Phone width not measured at 390px | Skill Responsive note | **P2** |
| G4-04 | Sage/straw grounds | Contract says alternate by family; canvases stay paper | Contract lever | **P2** (optional elevation) |

## Intentional variations to keep

- Prep domains: EmptyStage only (no fake charts)
- Debt / growth / inflation: one measure at a time (no dual-axis)
- Wages vs-prices: rebased indexes + geography break — not a household budget

## Minimal fix plan (do not implement in audit)

1. Add `web/src/brand/connections/economy.ts` + stage Follow chrome for Wave A Ready views (P1).
2. Add `economy/domain-sources.ts` mirroring Energy allow-lists (P1).
3. CDP 390px pass on `/economy?domain=inflation|wages|growth|debt` (P2).
4. Optional sage/straw section grounds per contract (P2).

## Gate ticks (Mode B)

- [x] Sweeps on finishing tree (S1–S27; phone Not inspected)
- [x] Explorer slots match Consumption/Housing
- [x] No custom multi-ink instruments
- [x] URL + Reset
- [x] EmptyStage
- [ ] Follow where Ready — **P1 open**
- [x] No P0 vs references
- [x] Exceptions listed

**Recommendation:** Tick Wave A Gate 4 **conditional** — close shell G4 after Follow + domain-sources (P1), or accept Follow as Wave B prep and mark G4 done with documented exception.

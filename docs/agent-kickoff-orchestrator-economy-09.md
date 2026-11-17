# Orchestrator kickoff — Economy Domain 09 · Trade & Investment closeout

**Opened:** 2026-11-17  
**Role:** Domain Orchestrator for **09 only** (parallel track with Domain 10)  
**Skill:** `.cursor/skills/orchestrator/SKILL.md` · UI: `.claude/skills/exchange-domain-view/SKILL.md`  
**Sector control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Notion plan:** [09 · Trade, Investment & Business](https://app.notion.com/p/4146547176858138a339d24221b5bda0)  
**Prior kickoff:** [agent-kickoff-economy-09-trade.md](agent-kickoff-economy-09-trade.md)  
**Prior Gate 4:** [gate4-audit-economy-09-trade.md](gate4-audit-economy-09-trade.md)  
**Work plan:** `docs/work-plan.md` → *Economy · Domain 09 restructure*

## Mission

Close the **Trade & Investment restructure** so Domain 09 is ready for the **sector-wide structural audit**. Gate 4 already passed on the eight-view canvas; this track finishes owner restructure open items and re-runs Gate 4.

## Owner decision (locked 2026-11-16)

- Rename experience to **Trade & Investment**
- Five experiences: Trade ledger · Trading world · Products · Investment ledger · Capital across borders
- Business views (Landscape, Births & deaths) stay in the rail until owner picks a new home
- Route id `investment` and view ids kept for saved links

## Path ownership (do not cross)

| Own | Do not touch |
|-----|----------------|
| `web/src/brand/economy/InvestmentCanvas.tsx` and trade/investment helpers | `PolicyCanvas.tsx`, `policy-model.ts`, `data/economy/economic-policy/` |
| `src/economy/connectors/goods_*`, trade / FDI / business demography packages under `data/economy/` that this domain already owns | Domain 10 schema (`britain_exchange.policy_event` dossier fields) unless Orchestrator sector desk asks |
| Storage packs `economy.goods-*`, FDI, enterprises, demography | Housing / Energy policy registers |

Delegate ingest fixes to **Economy**; numerical QA to **Validation**; you own sequencing, UI wiring, Notion, and Gate 4 re-run.

## Open backlog (ordered)

1. **VAL-EC-09-OTS** — Validation Ready for `economy.goods-trade-partner-commodity` (HMRC OTS × SITC1; pack already pushed).
2. **EC-09-DOSSIER** — Wire Trading world country dossier product frames to that pack once Ready.
3. **EC-09-MAPS** — Services on Trading world map · FDI partner map · UK nation map (calendar-year honesty; no invented joins).
4. **EC-09-BUSINESS-HOME** — Owner decision: where Landscape / Births & deaths live (keep on rail, move, or defer with EmptyStage honesty).
5. **EC-09-NOTION** — Title / question / Control board → Trade & Investment; status complete after Gate 4 re-run.
6. **EC-G4-09R** — Gate 4 re-run (structural-consistency-audit Mode B, domain 09 only) + QA roll-up under `data/qa/`.

## Done already (do not redo)

- Partner map annual pack + Products / Investment ledger / Capital / EU vs RoW trend / UK nation lens source fix
- Eight views Gate 4 closed (2026-11-16)
- OTS partner × SITC1 ingest + Storage push (awaiting Validation)

## Exit criteria

- [x] OTS SITC1 pack Validated → Ready; dossier products live or honestly EmptyStage
- [x] Map backlog closed — services lens · FDI partner map · UK nation RegionMap
- [x] Business-view home decided — keep Landscape / Births & deaths on rail
- [x] Notion title updated (Trade & Investment); Control row complete after Gate 4 re-run
- [x] Gate 4 re-run filed; work-plan Review: Shipped / Blocked / Next
- [x] Hand back to **Sector Orchestrator** for Economy-wide audit (do not start sector audit from this chat)

## Parallel track

Domain 10 Orchestrator: [agent-kickoff-orchestrator-economy-10.md](agent-kickoff-orchestrator-economy-10.md). No shared file ownership. Sector desk merges only after both exit.

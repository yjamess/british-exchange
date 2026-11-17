# Orchestrator kickoff — Economy Domain 10 · Economic Policy deepen

**Opened:** 2026-11-17  
**Role:** Domain Orchestrator for **10 only** (parallel track with Domain 09)  
**Skill:** `.cursor/skills/orchestrator/SKILL.md` · UI: `.claude/skills/exchange-domain-view/SKILL.md`  
**Sector control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Notion plan:** [10 · Economic Policy & History](https://app.notion.com/p/41465471768581e49f4ad2516c4c5b99)  
**Prior kickoff:** [agent-kickoff-economy-10-policy.md](agent-kickoff-economy-10-policy.md)  
**Standards:** [economy-10-policy-source-standards.md](economy-10-policy-source-standards.md)  
**Work plan:** `docs/work-plan.md` → *Economy & Public Finance · Domain 10*

## Mission

Take Domain 10 from **Gate 2 seed** to **Gate 4 complete**, so the sector-wide structural audit can cover Policy with the other nine domains. Do not claim the domain complete until Validation + Gate 4 say so.

## Path ownership (do not cross)

| Own | Do not touch |
|-----|----------------|
| `data/economy/economic-policy/` · packs `economy.policy-events` · `economy.policy-pledges` | `InvestmentCanvas.tsx`, trade / FDI / goods connectors and packs |
| `web/src/brand/economy/PolicyCanvas.tsx` · `policy-model.ts` | Domain 09 restructure UI |
| Shared `britain_exchange.policy_event` only for Economy register needs; keep Housing/Energy loaders green | Copying Housing/Energy events into this register |

Delegate new evidence rows / source pins to **Economy** when bulk ingest is needed; date/source QA to **Validation**; you own schema honesty, catalogue depth, UI, Notion, Gates 3–4.

## Non-negotiables

- No causal arrows from decisions to inflation, growth, jobs, or borrowing
- Announcement ≠ assent ≠ commencement ≠ repeal; status is a core property
- Housing / Energy records: **reference by id** in `dossier.related` — never copy
- Net debt ≠ PSNFL; net borrowing ≠ current budget
- Cloud: packs in Storage; local JSON is pin/cache for tests only
- Brand: Explorer shell + visual identity; no parallel Policy skin

## Open backlog (ordered — brief priorities 3–6)

1. **EP-CROSS** — When a sourced Economy decision touches them, link Housing (`housing-act-1980`, `localism-act-2011`, …) and Energy (`climate-change-act-2008`, `modern-industrial-strategy-2025`, …) via `dossier.related`.
2. **EP-BUDGETS** — Budgets / Finance Acts as measures with OBR costings (small well-sourced set beats thin hundreds).
3. **EP-PIN-GAPS** — Still not pinned (honest until source found): 1992 inflation objective; interim OBR day May 2010; 1946 appointed day; UC national roll-out; Low Pay Commission founding; HM Treasury institution record; WRA 2012 under-occupancy section. Pin only with original URL + date.
4. **EP-EVAL** — More evaluations (select committees, IFS) attached to existing records where sourced.
5. **EP-PLEDGE** — Symmetric-target scoring rule (e.g. inflation) **before** any pledge is scored; keep 0 scored until rule exists.
6. **EP-NOTION** — Update Domain 10 plan + Control board (was blocked on Notion 404).
7. **VAL-EC-10** — Independent Validation: register dates vs sources → `data/qa/`; no silent rewrites.
8. **EC-G3-10** — Gate 3 polish if Validation / catalogue depth requires UI changes (menus, EmptyStage honesty, Follows).
9. **EC-G4-10** — Gate 4 structural-consistency-audit Mode B (domain 10) + browser 390px; file audit under `docs/`.

## Already shipped (Gate 2 seed — 2026-11-15)

- Schema + source standards; 19 records with evidence; 7 evaluations; 5 eras; 11 relationships
- Pledges listed (none scored); Storage packs; six-view canvas (Ledger · Institutions · Eras · Changes · Evidence · Promises)
- Tests in `tests/test_economy_policy_events.py`

## Exit criteria

- [ ] Cross-register links and budget/measure deepen done or explicitly deferred with owner note
- [ ] Validation QA pass on register dates
- [ ] Pledge scoring either live under a written rule or still unscored with rule filed
- [ ] Notion Domain 10 + Control status accurate
- [ ] Gate 4 audit filed; work-plan Review: Shipped / Blocked / Next
- [ ] Hand back to **Sector Orchestrator** for Economy-wide audit (do not start sector audit from this chat)

## Parallel track

Domain 09 Orchestrator: [agent-kickoff-orchestrator-economy-09.md](agent-kickoff-orchestrator-economy-09.md). No shared file ownership. Sector desk merges only after both exit.

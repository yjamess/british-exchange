# Kickoff — Economy Domain 03 gaps (industry · underemployment · discouraged)

**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Prior:** [handover-economy-03-employment-complete.md](handover-economy-03-employment-complete.md)  
**Work plan:** EC-G2-03c  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-15  
**No React** — Orchestrator owns G3 after Validation.

Orchestrator is closing labelled Employment EmptyStages. **Geography is owned by Regions** (separate kickoff) — do not ingest LA/regional atlas under Economy.

## Already live (do not rebuild)

Workforce composition · Rates · Outside the Workforce (six reasons) · hours YBUV · FT/PT · vacancies AP2Y · workforce-jobs DYDC · CSV pins beside JSON.

## Three gaps you own

### 1. What Britain Does for Work — industry / occupation sections

- Source: ONS JOBS02 / Workforce Jobs by industry (or EMP13 / LFS by industry if clearer).
- Ingest a **reproducible multi-series pack** (SIC sections or published industry groups) that can support composition UI later.
- **Link only** Energy `manufacturing-employment` / BRES — never fork under `data/economy/`.
- Jobs ≠ people: label Workforce Jobs vs LFS employed.

### 2. The Working Week — underemployment

- Find official underemployment / involuntary part-time CDIDs (LMS / EMP).
- Prefer levels or rates with clear denominators; document age/geo/SA.
- If none exist cleanly → **Blocked** with URLs and why (no invent).

### 3. Outside the Workforce — discouraged levels

- LF77 is **% only**; residual vs LF2M documented.
- Search again for all-persons UK 16–64 **000s SA** discouraged twin.
- If still missing → keep **Blocked**; do **not** invent from LF77 × LF2M.
- Optional: pin LF77 as % companion with explicit “not a level” caveat — only if useful for Notes.

## Deliverables

1. Packages + connectors for anything ingestible; registry rows Ingesting.
2. `docs/handover-economy-03-gaps.md` (Validation-ready IDs · Blocked list · spots).
3. Update EC-G2-03c in `docs/work-plan.md`.
4. Notion Domain 03 experience states if MCP available.

## Do not

- Touch `web/`, `src/energy/`, `data/energy/`, `src/regions/`, `data/regions/`.
- Build industry pies that invent shares of DYDC.
- Claimant Count as ILO; person-flow arrows.

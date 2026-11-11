# Kickoff template — Economy domain (Gates 1–2)

**Sector:** [Economy & Public Finance](https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`  
**Contract:** [connector-contract.md](connector-contract.md) · [brief.md](brief.md)

Copy this file to `docs/agent-kickoff-economy-NN-<slug>.md` and fill the domain block. One domain per subagent.

---

## Domain block (fill in)

| Field | Value |
|-------|--------|
| Domain # / title | e.g. 01 · Inflation & Prices |
| Notion plan | URL |
| Wave | A \| B \| C |
| Locked question | *(provisional until end of G2)* |
| Owner | Economy |
| Paths | `src/economy/`, `data/economy/` only |

---

## Non-negotiables

- **No frontend in G1/G2.** Dataset foundation + Notion plan + handover only. Do not add `web/src/brand/economy/**` canvases, do not expand `sector-pages.ts` domains, do not invent chart components.
- **Reuse by id.** If Energy or Housing already owns a series, **link** the registry ID — never fork under `data/economy/`. See the overlap matrix.
- **One registry row per indicator.** Status Inbox → … → Validation → Ready only after sample QA.
- **Declare** UK/GB/England, SA/NSA, nominal/real, base year, frequency, geography code.
- **Cloud rule:** Ready observations → Postgres; heavy blobs → Storage. Local `data/` is pin/cache only.
- **Brand:** visual ideas go in the Notion plan as requirements (flagship name, one signature instrument, planned-not-ready graphics). Orchestrator owns the Review Gate visual contract.

---

## Four handover artefacts (required)

1. **Dataset foundation** — sources, connector entrypoints, raw checksums, curated paths, validation notes, registry links.
2. **Research scope** — questions the domain can answer; geography/history coverage; known limitations and breaks.
3. **Notion plan** — research areas, datasets, flagship experience, distinctive graphics (label unsupported ones **planned-not-ready**), tech requirements, implementation checklist.
4. **Handover** — exact files, indicator IDs, available dimensions, dependencies, blocked items, **recommended** frontend views (as requirements for G3 — not code).

Orchestrator reviews all four before any G3 authorisation.

---

## Candidate inventory (start here)

List existing `data/economy/<id>/` pins for this domain from the overlap matrix. Re-validate against the official release before claiming Ready. Add new candidates only with registry rows.

---

## Do not

- Touch `src/energy/`, `data/energy/`, `src/housing/`, or `data/housing/` except to **read** for link IDs.
- Mark Ready without Validation.
- Present CPI as CPIH (or the reverse).
- Derive debt/GDP or real series without documenting the formula in Notes/handover.
- Open Wave B/C full work until Orchestrator schedules it (thin Notion scaffolds are fine).
- Invent a parallel palette or Explorer shell.

---

## Gate map (sector)

| Gate | Your job |
|------|----------|
| G1 | Architecture already orchestrator-owned; confirm domain boundaries vs overlap matrix |
| G2 | Evidence + Notion plan complete (this kickoff) |
| Review Gate | Wait — orchestrator consolidates visual contract |
| G3 | Only after Review Gate: integrate into Explorer shell |
| G4 | Structural consistency audit (orchestrator + Validation) |

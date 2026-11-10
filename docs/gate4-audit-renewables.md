# Gate 4 — Structural consistency audit · Domain 06 Renewables & Nuclear

**Mode:** B — Finishing domain  
**Date:** 2026-11-08  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Housing pipeline · Consumption · Generation  
**Under audit:** `RenewablesCanvas.tsx` · `RenewablesFieldGuide.tsx` · `/energy?domain=low-carbon`

## Verdict

**Ready with fixes (applied same day).** Shell and Explorer grammar match the locked frame; one P0 year-default bug and P1 Exact-figures / body-note drifts were fixed before close.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Field Guide · Capacity ≠ Output · Pipeline · Buildout · Data |
| Controls | Measure · Year · LF basis · Lane · Stage · pipe tech · Reset · EventRail select |
| Viewports | Desktop live (`localhost:3000`); narrow **Not inspected** in browser this pass |
| States | EmptyStage paths (code); loading via server packs |
| Cross-check | Code vs Consumption / Housing Types specimens / Imports follow |
| Not inspected | Keyboard-only tour · reduced-motion plate stills · full a11y scan |

## What is consistent

- `SectorPage` / `Explorer` order: crumb → question → tabs → figures → controls → stage → one `FigureRecord` Notes foot.
- View tabs joined squares; `MenuControl` + Reset in `ControlRow`; URL state for view/filters.
- Multi-chart panels use `stack` / `panel` / `stageTitle` + shared `TimeChart` / `RankBars`.
- Field Guide specimens mirror Housing dwelling Types (fixed plate size; measured marks separate).
- Data tab = observation tables, not catalogue dumps.
- Nuclear labelled low-carbon; REPD pipeline excludes nuclear.

## Inconsistency matrix

| ID | Location | Issue | Canonical | Priority | Status |
|----|----------|-------|-----------|----------|--------|
| R06-01 | Field Guide / Capacity year default | `yearPool` included ET 5.1 part-year **2026**, so default year showed capacity/LF as — while generation had a partial sum | Prefer latest capacity (or LF) year for default | P0 | **Fixed** — default `latest` from capacity/LF years |
| R06-02 | Capacity ≠ Output | Always-on “Exact figures” table competed with Notes / TimeChart exact grammar | Field card + Notes + TimeChart exact — no echo table | P1 | **Fixed** — removed (was briefly an ExactRegister) |
| R06-03 | FieldCard | Body `receiptNote` restated method | Method only in Notes foot | P1 | **Fixed** — removed |
| R06-04 | Field Guide / Buildout journeys | “Contextual · Contextual — …” doubled kind into the note | Note alone | P2 | **Fixed** |
| R06-05 | Buildout | Policy annotations deferred with Ready industrial-policy JSON available | EventRail + context link to Policy domain | P1 | **Fixed** — EventRail from Ready events |
| R06-06 | Narrow viewport | Specimen grid / control wrap | Identity responsive rules | P2 | Not inspected live |
| R06-07 | Single-series TimeChart | Default leaders on (Latest card) | explorer-stage: OK for one series | — | Intentional |

## Intentional variations to preserve

- **Field card** ledger (Capacity ≠ Output) — Study C custom instrument; one ink; three labelled measures.
- **Specimen grid** — Field Guide flagship; illustrative plates, never MW-scaled area.
- **Pipeline lanes** — Active vs not-proceeding; Operational stays on Generation atlas.
- **Journey list** — same `.follow` pattern as Imports Shock.

## Interface Consistency Contract (Domain 06)

1. Shell slots locked; no parallel layout under `(sectors)/`.
2. Type: Caslon question; Geist UI; mono labels; condensed figures.
3. Controls only in `ControlRow`; selection = solid ink.
4. One Notes foot; no Coverage strip; no body method essays.
5. Charts: shared instruments; plate imagery never inside plots.
6. Exact values: closed disclosures only.
7. Sources: publisher · series in Notes; catalogue via `dataHref`.

## Minimal fix plan (executed)

1. Capacity-led year default (R06-01).  
2. ExactRegister + drop receiptNote (R06-02/03).  
3. Journey note cleanup (R06-04).  
4. Buildout EventRail from industrial-policy events (R06-05).  
5. Re-check Field Guide figures at default year in browser.

## Gate checklist (Mode B)

- [x] Domain uses SectorPage / Explorer slots in locked order
- [x] View tabs + ControlRow + Stage foot match reference
- [x] One Notes foot; no Coverage; no body method essays (after fix)
- [x] stageTitle panels; shared instruments
- [x] Custom instruments (field card / specimens) one ink; do not fork chrome
- [x] URL state + Reset
- [x] EmptyStage for missing packs
- [x] Cross-check: no open P0/P1 vs locked docs after fixes
- [x] Deliberate exceptions listed above
- [ ] Narrow viewport live pass — residual P2

## Close

Domain 06 Gate 4 **passed with fixes applied 2026-11-08**. Residual: optional mobile screenshot pass; do not invent Buildout causal arrows.

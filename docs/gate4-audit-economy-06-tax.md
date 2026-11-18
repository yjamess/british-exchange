# Gate 4 audit — Economy Domain 06 · Taxation & Revenue (2026-11-15)

**Mode:** B — finishing domain  
**Scope:** `web/src/brand/economy/TaxCanvas.tsx` · citations · Follow edges in `connections/economy.ts`  
**References:** SpendingCanvas (peer fiscal) · Consumption frame · `docs/handover-economy-06-anatomy.md` · `docs/handover-economy-06-tax-machine.md`  
**Skill:** `.cursor/skills/structural-consistency-audit/SKILL.md`  
**Fixes in this pass:** EmptyStage + Notes honesty aligned with deepen handovers (authorised as EC-G4-06 polish).

## Refresh · 2026-11-18 (supersedes the view list below)

The 2026-11-15 text below is kept as the record of that pass. The domain has since moved on:

| Then (2026-11-15) | Now (2026-11-18) |
|---|---|
| Views: raises · anatomy · machine · data | Views: **raises · machine · burden · gap · data**. Anatomy folded into Raises; Time Machine folded into Tax Machine focus |
| Anatomy / Machine were honest EmptyStages | Machine, Burden and Gap are **live canvases**; no EmptyStage on a Ready view |
| Follow on Raises + Data only | Follow on **every** view: Machine → Wages value · Burden → Household ledger · Gap → Debt borrowing · Raises → Debt borrowing · Data → Debt dial |

- **Defect found and fixed 2026-11-18:** the Machine / Burden / Gap edges existed in `connections/economy.ts` from 2026-11-17, but `TaxCanvas` only rendered `follow` for `raises` and `data`, so they never showed. The `Stage` now always renders `EconomyStageFollow`. Verified live at 1400px and 390px.
- Follow honesty lines on Machine and Burden rewritten without survey codes (AWE, ETB).
- Sweep at 1400 / 390 px: no document overflow, no console errors, Notes on every view.
- Evidence: independent sector re-audit in [gate4-audit-economy-sector-2026-11-17.md](gate4-audit-economy-sector-2026-11-17.md) › Independent re-audit.

## Verdict

**Domain 06 flagship is structurally ready for Gate 4 close** on What Britain Raises + Data. Anatomy and Tax Machine remain honest EmptyStages with updated labelled-gap copy. No P0 vs Spending / Consumption frame.

Gate 2/3 (instrument live) ≠ Gate 4 (this shell bar). Tax Machine UI stays closed until `EC-VAL-06C` PASS + Review Gate; Anatomy until composition pin + Validation.

## Coverage

| View | Status |
|------|--------|
| What Britain Raises | Live · AHHY Ready · cloud |
| Anatomy of Revenue | EmptyStage · path-found-ons-nab · pin gated |
| The Tax Machine | EmptyStage · statute pin Validation-ready |
| Data | Observation table · final months |
| Phone 390px | **Not inspected** (no CDP this pass) |

## Sweep table (S1–S27)

| ID | Result | Notes |
|----|--------|-------|
| S1 Source | **Pass** | `economySource` / `formatSource`; no smashed publisher; Anatomy uses Appendix D citation; Machine uses GOV.UK rates |
| S2 Notes | **Pass** | One `FigureRecord` foot; no Coverage; no body ledes |
| S3 Controls | **Pass** | Outer `ControlRow` + Reset only (no in-stage measure tabs) |
| S4 Empty | **Pass** | `EmptyStage` for Anatomy / Machine / missing pack |
| S5 Charts | **Pass** | Sentence-case `stageTitle`; no `leaders={true}`; Data = titled table |
| S6–S7 Maps | **N/A** | |
| S8 Signal/ink | **Pass** | No sector palette fork |
| S9 URL/Reset | **Pass** | `domain` · `view`; Reset restores raises |
| S10 Docs lock | **Pass** | Identity + explorer-stage + domain-view |
| S11 Energy frame | **Pass** | Head → figures → ControlRow → Stage → foot |
| S12 Follow | **Pass** | Raises (primary → Debt borrowing) · Data → Debt dial; Spending secondary from raises |
| S13 Labelled gaps | **Pass** (fixed this pass) | Anatomy: Appendix D path + pin gate; Machine: pin present, Validation/Review Gate pending; no HMRC-under-AHHY |
| S14 Stocks≠flows | **Pass** | Monthly flow levels; 12-month sum labelled derived; no tax−spend residual |
| S15 Atlas | **N/A** | |
| S16 Domain sources | **N/A / known P2** | Economy still loads inline in `load.ts` (Wave A note) — not Tax-specific |
| S17 Cloud Ready | **Pass** | `tax-receipts` via API pack |
| S18–S22 Menus | **Pass** | View tabs only; no measure menu; defaults open on data when pack loaded |
| S23 Multi-select | **Pass** | None |
| S24–S26 | **Pass** | Pack matches raised/data views; EmptyStage when null |
| S27 Plain labels | **Pass** | No CDID in menus/figures; AHHY only in Notes method |

### Menu table

| Domain › view | Control | URL key | Default | Options | Drives |
|---------------|---------|---------|---------|---------|--------|
| tax › * | View tabs | `view` | `raises` | raises · anatomy · machine · data | Stage body |
| tax › raises | Reset | — | — | — | Restores `view=raises` |

## Intentional variations

- Dual line (month + derived 12-month sum) on one TimeChart — same grammar as Spending.
- Anatomy / Machine EmptyStage while deepen evidence exists but UI not authorised.
- Primary Follow to Debt (not Spending) — Spending remains secondary contextual.

## Minimal fix plan (done in polish)

1. ~~Align Anatomy EmptyStage/Notes with `path-found-ons-nab`~~ done  
2. ~~Align Tax Machine EmptyStage/Notes with statute pin + Validation gate~~ done  
3. Phone 390px measure — defer  
4. Composition pin / Tax Machine UI — separate work-plan tasks after Validation

## Gate ticks (Mode B)

- [x] Sweeps on Tax tree  
- [x] Explorer slots match Spending / Consumption  
- [x] EmptyStage honesty  
- [x] Follow where Ready  
- [x] No P0/P1 vs references (S16 Economy-wide P2 only)  
- [ ] Phone width measured at 390px — **deferred**

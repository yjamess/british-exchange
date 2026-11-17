# Gate 4 audit — Economy Domain 07 · Public Spending & Services (2026-11-15)

**Mode:** B — finishing domain  
**Scope:** `web/src/brand/economy/SpendingCanvas.tsx` · `spending-function-model.ts` · `citations.ts` · `load.ts` · Follow edges in `connections/economy.ts`  
**References:** TaxCanvas (peer fiscal) · Consumption frame · handovers `handover-economy-07-*.md` · OSCAR memo  
**Skill:** `.cursor/skills/structural-consistency-audit/SKILL.md`

## Verdict

**Domain 07 is structurally ready for Gate 4 close.** Flagship TME, TES/COFOG (recent + long-run Span), DEL/AME, real terms, services bridge, and ESA Table 11 each sit in the Explorer shell with honest Notes. OSCAR stays a labelled blocked gap (no EmptyStage pretending it is sourced). No P0 vs Tax / Consumption frame.

Gate 2/3 (instruments live) ≠ Gate 4 (this shell bar). Phone 390px not measured this pass.

## Coverage

| View | Status |
|------|--------|
| What the state spends | Live · EBFT Ready · cloud 55 |
| Where spending goes | Live · Table 5.4 + Span → Table 4.2 · cloud 267 / 271 |
| DEL and AME | Live · Table 1.1 · cloud 268 |
| Real terms | Live · Tables 1.2 / 4.3 · cloud 269 / 270 |
| Services and the total | Live · bridge from Table 5.4 |
| ESA functions | Live · Table 11 GG · cloud 272 · calendar year |
| Data | Observation tables · includes long-run + ESA |
| Phone 390px | **Not inspected** (no CDP this pass) |

## Sweep table (S1–S27)

| ID | Result | Notes |
|----|--------|-------|
| S1 Source | **Pass** | `economySource` / `ECONOMY_SOURCE.*`; Table 4.2 / ESA Table 11 / EBFT distinct |
| S2 Notes | **Pass** | One `FigureRecord` per view; no Coverage; no body ledes |
| S3 Controls | **Pass** | Outer `ControlRow` only (Span · Instrument · Measure · year · Reset) |
| S4 Empty | **Pass** | `EmptyStage` when pack missing; OSCAR not faked as a view |
| S5 Charts | **Pass** | Sentence-case `stageTitle`; no `leaders={true}`; Data = titled panels |
| S6–S7 Maps | **N/A** | |
| S8 Signal/ink | **Pass** | No sector palette fork |
| S9 URL/Reset | **Pass** | `domain` · `view` · `measure` · `fy` · `ri` · `span`; Reset restores measure/fy/ri/span |
| S10 Docs lock | **Pass** | Identity + explorer-stage + domain-view |
| S11 Energy frame | **Pass** | Head → figures → ControlRow → Stage → foot |
| S12 Follow | **Pass** (intentional) | Primary Follow on flagship spends ↔ Tax / Debt; deepen views inherit stage Follow without new edges (same pattern as Tax Anatomy/Machine) |
| S13 Labelled gaps | **Pass** | OSCAR `blocked-as-tme-composition` memo; Notes keep TES ≠ EBFT ≠ ESA; coversheet GG honesty in registry |
| S14 Stocks≠flows | **Pass** | All spending flows; monthly ≠ FY; calendar ESA labelled; no tax−spend residual |
| S15 Atlas | **N/A** | |
| S16 Domain sources | **N/A / known P2** | Economy loads inline in `load.ts` (Wave A note) |
| S17 Cloud Ready | **Pass** | Packs via `loadSeriesPack` API; releases 55 · 267–272 |
| S18–S22 Menus | **Pass** | Year lists from selected pack; Span clears `fy`; ESA uses calendar years; Measure hidden on services |
| S23 Multi-select | **Pass** | None |
| S24–S26 | **Pass** | Long-run + ESA in pack and Data; Span hidden if long pack empty |
| S27 Plain labels | **Pass** | Menus: Recent years / Long run / Pounds / Share / Calendar year; ESA/COFOG only in Notes |

### Menu table

| Domain › view | Control | URL key | Default | Options | Drives |
|---------------|---------|---------|---------|---------|--------|
| spending › * | View tabs | `view` | `spends` | spends · function · delame · real · services · esa · data | Stage body |
| spending › function | Span | `span` | `recent` | Recent years · Long run | Table 5.4 vs 4.2 pack |
| spending › function / delame / real / esa | Measure | `measure` | `absolute` | Pounds · Share | RankBars + stack |
| spending › real | Instrument | `ri` | `delame` | DEL and AME · Services by function | Real pack |
| spending › function / services / delame / real | Financial year | `fy` | latest final | Derived from active pack | RankBars + figures |
| spending › esa | Calendar year | `fy` | latest | ESA calendar years | RankBars + figures |
| spending › * (above) | Reset | — | — | — | measure absolute · fy null · ri delame · span recent |

## Intentional variations

- Dual monthly line on spends (month + 12-month sum) — same grammar as Tax / Debt.
- Function Span (recent £m vs long-run £bn) instead of a second tab — keeps one “where spending goes” story.
- ESA as its own view — never stacked on TES axis; calendar year control label.
- OSCAR blocked without a menu or EmptyStage that implies a pin exists.
- Follow concentrated on flagship spends (and Data → Debt dial); deepen views use `EconomyStageFollow` without new primary edges.

## Minimal fix plan (deferred)

1. Phone 390px measure via CDP — defer  
2. Economy `domain-sources` extraction (S16 P2) — Wave A backlog  
3. Optional Follow edges function↔esa (honesty: different sector / year) — only if owner wants cross-links  
4. EBFT re-pin after **20 Nov 2026** PSF — calendar

## Gate ticks (Mode B)

- [x] Sweeps on Spending tree  
- [x] Explorer slots match Tax / Consumption  
- [x] EmptyStage honesty + OSCAR labelled gap  
- [x] Follow where Ready (flagship)  
- [x] No P0/P1 vs references (S16 Economy-wide P2 only)  
- [ ] Phone width measured at 390px — **deferred**

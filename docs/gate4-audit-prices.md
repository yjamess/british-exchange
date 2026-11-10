# Gate 4 — Structural consistency audit · Domain 03 Energy Prices & Costs

**Mode:** B — Finishing domain  
**Dates:** 2026-11-09 (first close) · **2026-11-10 re-audit + UI empty-state fixes**  
**References:** `docs/visual-identity.md` · `.cursor/rules/explorer-stage.mdc` · `exchange-domain-view` · Consumption  
**Under audit:** `PricesCanvas.tsx` · `BillReceipt.tsx` · `/energy?domain=prices`

## Verdict

**Ready with fixes (UI applied 2026-11-10).** Shell matches Consumption. Missing earnings / MPP packs stay data backlog — empty paths no longer lie about available controls or leave hollow figure strips.

## Mode & coverage

| Item | Covered |
|------|---------|
| Views | Dissected Bill · Afford · Shock · Geography · Wholesale |
| Controls | Fuel · Year · Region · Payment · Tariff · Cap · Period · Use · Compare · Reset |
| Viewports | Desktop live 2026-11-10; narrow residual P2 |
| States | Empty Afford (no earnings); empty Wholesale (no MPP pack) |
| Cross-check | Consumption · identity · explorer-stage |
| Not inspected | Keyboard-only · full a11y · Ofgem Geography live this pass |

## What is consistent

- Locked Explorer order: crumb → question → tabs → figures → controls → stage → one `FigureRecord` Notes.
- Custom `BillReceipt` stays one ink; Ofgem cap is a labelled separate benchmark.
- No Coverage strip; no second Notes block.
- URL state + Reset (including `capPeriod`).
- Shock stage bar framing vs panel titles; Wholesale panel `stageTitle` when chart loads.

## Inconsistency matrix

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| PR-1–PR-12 | First Gate 4 pass (Notes, Geography, Reset, jargon, …) | P0–P2 | **Fixed** 2026-11-09 |
| PR-A1 | Afford fell back to bill years when earnings missing → hollow strip + empty chart | P1 | **Fixed** 2026-11-10 — `affordReady`; no bill-year fallback; stage EmptyStage; hide year/payment/tariff + figures until pay overlaps |
| PR-A2 | Wholesale EmptyStage “Choose another fuel” with Fuel control hidden | P1 | **Fixed** 2026-11-10 — pack-missing vs fuel-empty copy; hide figures until ready |
| PR-A3 | Shock stage title duplicated first panel title | P2 | **Fixed** 2026-11-10 |
| PR-A4 | Wholesale chart lacked panel `stageTitle` | P2 | **Fixed** 2026-11-10 |
| PR-A5 | Narrow Digits / wrap | P2 | Open — residual |

## Intentional variations to preserve

- Engraved `BillReceipt` flagship.
- Ofgem cap panel under DESNZ bill.
- Meter / Economy 7 as an electricity cut.
- No Data tab — exact values via TimeChart disclosures and catalogue links.
- Earnings / MPP series may still be absent in cloud — UI waits honestly.

## Gate checklist (Mode B)

- [x] Locked slots and order
- [x] One Notes foot; no Coverage; no body method essays
- [x] stageTitle panels; shared instruments
- [x] Custom instrument one ink
- [x] URL state + Reset
- [x] EmptyStage for missing packs (honest copy)
- [x] No open P0/P1 vs locked docs after 2026-11-10 UI fixes
- [ ] Narrow viewport live pass — residual P2

## Close

Domain 03 Gate 4 **UI empty-state / title fixes applied 2026-11-10**. Loading earnings and wholesale MPP into Supabase remains data work, not a structural blocker.

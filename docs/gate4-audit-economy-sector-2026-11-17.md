# Gate 4 — Economy & Public Finance · Sector structural audit

**Mode:** B — Finishing sector  
**Date:** 2026-11-17  
**Skill:** `.cursor/skills/structural-consistency-audit/SKILL.md`  
**Under audit:** `/economy` domains 01–10 · ten canvases under `web/src/brand/economy/` · `connections/economy.ts` · `domain-sources.ts` · `sector-pages.ts` · `ECONOMY_READY_DOMAINS`  
**References:** Housing Explorer + Energy Consumption/Generation shell · prior domain Gate 4 audits (Wave A through Domains 09–10)  
**Rule:** Read-only — no fixes in this pass

## Verdict

**Ready** (P1 Follow gaps closed 2026-11-17 after owner authorisation). All ten Economy domains are on the Ready rail with live canvases, cloud loaders, Explorer-frame grammar, EmptyStage honesty, and domain Gate 4 (or Gate 4 re-run) already filed. No P0 shell forks, no laptop `data/economy` fallback on Ready paths, no parallel palette.

Gate 2 (instruments live) ≠ Gate 4 (this sector bar).

## Coverage

| # | Domain | Route | Domain Gate 4 | Sector re-check |
|---|--------|-------|---------------|-----------------|
| 01 | Inflation | `?domain=inflation` | Wave A + deepen | Shell + Follow OK |
| 02 | Wages | `?domain=wages` | Wave A + deepen | Shell + Follow OK |
| 03 | Employment | `?domain=employment` | [gate4-audit-employment.md](gate4-audit-employment.md) | Shell + Follow OK |
| 04 | Household | `?domain=household` | [gate4-audit-household-deepen.md](gate4-audit-household-deepen.md) | Shell + Follow OK |
| 05 | Growth | `?domain=growth` | [gate4-audit-growth.md](gate4-audit-growth.md) | Shell + Follow OK |
| 06 | Tax | `?domain=tax` | [gate4-audit-economy-06-tax.md](gate4-audit-economy-06-tax.md) *(stale on EmptyStages)* | Live Machine/Burden/Gap; Follow edges added |
| 07 | Spending | `?domain=spending` | [gate4-audit-economy-07-spending.md](gate4-audit-economy-07-spending.md) | Deepen views now have primary Follow → Tax raises |
| 08 | Debt | `?domain=debt` | [gate4-audit-debt.md](gate4-audit-debt.md) | Shell + Follow OK |
| 09 | Trade & Investment | `?domain=investment` | [gate4-audit-economy-09-trade-2026-11-17.md](gate4-audit-economy-09-trade-2026-11-17.md) | Shell + Follow OK |
| 10 | Policy | `?domain=policy` | [gate4-audit-economy-10-policy.md](gate4-audit-economy-10-policy.md) | Institutions / Eras / Changes Follow edges added |

### Not inspected (sector pass)

- Full S18–S27 menu × served-data matrix for every control on every view (rely on domain Gate 4 + code review; no per-option API row counts this pass)
- Full keyboard / a11y tour
- Phone 390px on all ten domains — **sampled Tax › Machine only** (`scrollWidth` = 390, no document overflow). Domain audits already flagged several domains as phone Not inspected
- Publisher numeric re-QA (Validation owns)

## Mechanical sweeps (sector tree)

| ID | Result | Notes |
|----|--------|-------|
| S1 Source | **Pass** | `economySource` / compact feet; no smashed publisher pattern in canvases |
| S2 Notes | **Pass** | One `FigureRecord` / `SourceLine` on `Stage foot`; no `<Coverage>` strip; Wages “Exchange calculation” lives in Notes method (allowed) |
| S3 Controls | **Pass** | Outer `ControlRow` + Reset across canvases |
| S4 Empty | **Pass** | `EmptyStage` used; no Ready-catalogue Data dumps; no `data/….json` paths on screen |
| S5 Charts | **Pass** | No `leaders={true}` / `FIG. n` titles in economy tree |
| S6–S7 Maps | **Pass / N/A** | Investment / Employment / Wages geography use shared map chrome; non-map domains N/A |
| S8 Signal / ink | **Pass** | Signal only on live marks (wage ladder / basket focus); no `tokens.css` fork |
| S9 URL / Reset | **Pass** | `sync` pattern on all Ready canvases |
| S10 Docs lock | **Pass** | Identity + explorer-stage + domain-view + `formatSource` |
| S11 Energy frame | **Pass** | Head → figures → ControlRow → Stage → one Notes → Follow |
| S12 Follow | **Pass** (fixed) | Primary edges added for Tax machine/burden/gap · Spending deepen · Policy institutions/eras/changes |
| S13 Labelled gaps | **Pass** | Deferred instruments stay labelled (e.g. numeric PS Borrowing Machine; Policy unscored pledges; OSCAR blocked) |
| S14 Stocks ≠ flows | **Pass** | Debt / Investment / Household / Spending Notes keep unlike quantities apart |
| S15 Atlas chrome | **Pass** | Place views use RegionMap / WorldChoropleth / AreaMap peers |
| S16 Domain sources | **Pass** | `DOMAIN_PACKS` covers all ten Ready domains 1:1 with loaders |
| S17 Cloud Ready | **Pass** | `load.ts` forbids laptop fallback; packs via API/Storage |
| S18–S27 Menus | **Partial** | Domain Gate 4s cover; sector pass did not re-run full served-data matrix — **Not inspected** at sector depth |
| Phone 390px | **Partial** | Tax Machine measured Pass; other domains Not inspected this pass |

## Follow coverage (S12)

`primaryConnectionFor` matches **exact** `domain` + `view` — no domain-level fallback.

| Domain | Status after fix |
|--------|------------------|
| Tax | `machine` → Wages value · `burden` → Household ledger · `gap` → Debt borrowing |
| Spending | `function` · `delame` · `real` · `services` · `esa` → Tax raises |
| Policy | `institutions` · `changes` → Debt borrowing · `eras` → Growth produce |
| All others | already covered |

Fix landed in `web/src/brand/connections/economy.ts` (2026-11-17) after owner authorisation.

## What’s consistent

- Ten domains in `ECONOMY_READY_DOMAINS`; rail status from that set, not packs
- Shared Explorer shell vs Energy/Housing; BrandRoot + one ink
- Cloud-only Ready observations / Storage packs
- Domain Gate 4 trail exists for every domain (Wave A consolidated + 03–10)
- Trade rename + Policy deepen both handed back before this sector pass

## Inconsistency matrix

| ID | Where | Issue | Canonical | Pri | File |
|----|-------|-------|-----------|-----|------|
| SEC-01…03 | Tax / Spending / Policy Follow gaps | Closed 2026-11-17 | S12 | **done** | `connections/economy.ts` |
| SEC-04 | `docs/gate4-audit-economy-06-tax.md` | Still describes Anatomy / Machine as EmptyStage | Live canvas: raises · machine · burden · gap · data | **P2** | audit doc only |
| SEC-05…06 | `sector-pages` comment + OTS series id | Closed 2026-11-17 with Follow fix | Catalogue / rail docs | **done** | `sector-pages.ts` |
| SEC-07 | Phone 390px | Only Tax Machine measured this sector pass | Measure all domains (or accept domain-audit deferrals) | **P2** | browser |

## Intentional variations to keep

- Compact Economy source feet (publisher · series only)
- Tax Anatomy folded into Raises; Time Machine folded into Tax Machine focus
- Numeric public-sector Borrowing Machine deferred (Debt)
- Full Growth Revision Archive deferred
- Employment underemployment UI deferred
- Policy pledges unscored until symmetric-target rule
- OSCAR not ingested as TME composition
- Landscape / Births & deaths kept on Trade rail (owner)

## Fix plan status

1. **P1 Follow:** **done** 2026-11-17 — edges in `connections/economy.ts`
2. **P2 sector-pages comment + OTS series id:** **done** with the Follow fix
3. **P2 Domain 06 Gate 4 doc refresh:** still open (historical audit text)
4. **P2 phone:** CDP 390px sample on remaining domains when convenient

## Gate ticks (Mode B)

- [x] Sweeps on finishing tree (S1–S17; S18–S27 partial)
- [x] Explorer slots match Consumption / Housing
- [x] URL + Reset + EmptyStage
- [x] Follow where Ready — **closed after owner-authorised fix**
- [x] No P0 vs references
- [x] Exceptions listed
- [x] Findings documented; Follow + catalogue P2s fixed after audit

## Review

- **Shipped:** Sector Mode B audit + Follow/catalogue fixes
- **Blocked:** none
- **Next:** Mark Economy sector Gate 4 closed in Notion Control; optional Domain 06 audit doc refresh + phone sweep

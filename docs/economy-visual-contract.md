# Economy — visual contract (Review Gate · locked 2026-11-11)

**Status:** **Approved** for Wave A G3  
**Lab:** `/design-lab/economy-elevation` (studies only)  
**Draft superseded:** [economy-visual-contract-draft.md](economy-visual-contract-draft.md)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Identity:** [visual-identity.md](visual-identity.md)  
**Shell skill:** `.claude/skills/exchange-domain-view/SKILL.md`

Orchestrator owns this contract. Domain agents do not invent parallel layout or palette.

---

## Locked (do not change for Economy)

- Explorer shell: `SectorPage` + `Explorer` (crumb · question · tabs · figures · controls · stage · one Notes foot)
- Charts: `TimeChart` · `RankBars` · `ChangeRows` · `SeriesLegend`
- Selection: solid ink + paper type; Signal for focus/live only
- One ink; tints are dots; no parallel palette / sector pigments
- Copy Energy Consumption / Generation for frame order — never Housing drift (controls inside Stage)

---

## Review Gate decisions (locked)

| Lever | Decision |
|-------|----------|
| Sage / straw grounds | **Not used on Economy (owner decision 2026-11-11).** Paper only, like Housing and Energy. Sage/straw removed from Inflation and Wages Data tables. Supersedes the earlier "alternate by domain family" decision. |
| Hero plate | `containerPort` · **`print`** on the sector landing. **Night** on the band once a domain is open — now site-wide in `template/SectorPage.tsx` (owner decision 2026-11-11). Negative stays lab-only. |
| Rail icons | **Economy `REF_ICON` photo-ref set drawn (2026-11-11):** `i-ref-economy-<domain>.png`, ten plates from `data/icon-refs/economy/fetch_refs.py` (Commons, CC BY-SA; register in `SOURCES.json`). Rail accepts `REF_ICON_PLATES` only; penship `ICON_PLATES` never enter the rail. |
| Signature instruments (G3 order) | **01 first** (CPI/CPIH measure switch) → **08** debt dial (HF6X official %) → **05** GDP panels → **02** pay vs prices (GB chip required). At most one bespoke instrument per flagship; shared charts otherwise. |
| Domain rail (production) | **All ten domains (01–10) in `sector-pages.ts` (owner decision 2026-11-11).** Wave A four (Inflation · Wages · Growth · Debt) are Ready canvases; 03 · 04 · 06 · 07 · 09 · 10 sit in the rail as **In preparation** with the shared EmptyStage (`ECONOMY_READY_DOMAINS` in `economy/types.ts`). A Wave B/C domain flips to Ready only after its own G2+G3. |
| COICOP / everyday basket | Stay **planned-not-ready**. EmptyStage with honest copy — never mock data. |

---

## Wave A flagship forms

1. **01 Changing Price of Britain** — tabs: *Changing price* (`TimeChart` + Measure menu, CPI `cpi-inflation` / CPIH `cpih-inflation`, peak figure) · *What £1 buys* (Year + Measure menus; one custom instrument `economy/PoundBuys.tsx`, two area-true discs, Housing hatch; then a `TimeChart` of the cost of £1 of base-year spending; derived from `cpi-index` / `cpih-index` annual averages, labelled as calculated in Notes) · *What's driving it* and *Everyday basket* (`EmptyStage` until Ready) · *Data*. CPI and CPIH defined in every Notes foot.
2. **02 Pay cheque vs prices** — indexed dual lines or `ChangeRows`; geography-break chip when pairing GB AWE with UK prices. Wage ladder deferred (needs national ASHE).
3. **05 What Britain produces** — GDP · per head · labour productivity panels; Follow Energy manufacturing productivity (link only). NPEL Follow → Domain 09 later.
4. **08 Debt dial** — three separate measures (debt · borrowing · interest) plus official **HF6X** % of GDP — never derive from ABMI.

---

## Explicitly deferred

- Wave B/C **canvases** (03·04·06·07·09·10) — rail rows + REF_ICON plates exist; stages stay In preparation
- COICOP contributions and everyday basket plate
- Dual-axis charts; parallel Economy CSS tokens

**G3 exit for Wave A:** four domains live under this contract with Ready series from the API (cloud) — **met 2026-11-11**. REF_ICON outlines/plates — **owner-placed / ticked**. Next: G4 structural audit. Wave B evidence kickoffs unblocked; Wave B UI still per-domain G2+G3.

# Economy — overlap matrix (Gate 1)

**Date:** 2026-11-10  
**Owner:** Orchestrator  
**Notion:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Rule:** One source → one connector; sectors **link** canonical indicator IDs. Never fork under another `data/<sector>/` tree.

Provisional domain map (01–10) stays mutable until G1 lock. This matrix is the first deliverable that can force merges/splits.

---

## Existing Economy pins → provisional domain

| `indicator_id` | Series | Publisher | Provisional domain | Notes |
|----------------|--------|-----------|--------------------|-------|
| `cpi-inflation` | D7G7 | ONS | 01 Inflation & Prices | Headline CPI annual rate |
| `cpi-index` | D7BT | ONS | 01 | Index level; Housing real house prices · **Ready 2026-11-11** |
| `cpih-index` | L522 | ONS | 01 | Energy real-terms bills **link** |
| `cpih-inflation` | L55O | ONS | 01 | CPIH annual rate · **Ready 2026-11-11** |
| `nominal-earnings` | KAI7 | ONS | 02 Wages, Earnings & Income | AWE regular pay, cash |
| `real-earnings` | A2FC | ONS | 02 | AWE regular pay, real |
| `employment-rate` | LF24 | ONS | 03 Employment & Labour Market | UK 16–64 SA · re-pin 2026-11-14 |
| `employment-level` | LF2G | ONS | 03 | UK 16–64 SA thousands · flagship count |
| `unemployment-rate` | LF2Q | ONS | 03 | UK 16–64 SA % of economically active (not MGSX) |
| `unemployment-level` | LF2I | ONS | 03 | UK 16–64 SA thousands · flagship count |
| `economic-inactivity-rate` | LF2S | ONS | 03 | UK 16–64 SA · re-pin 2026-11-14 |
| `economic-inactivity-level` | LF2M | ONS | 03 | UK 16–64 SA thousands · flagship count |
| `mortgage-rate-2yr-fixed` | IUMBV34 | BoE | 04 Household Finances | Housing already links |
| `real-gdp` | ABMI | ONS | 05 Productivity & Economic Growth | |
| `real-gdp-per-head` | IHXW | ONS | 05 | |
| `labour-productivity` | LZVB | ONS | 05 | Whole-economy output per hour |
| `business-investment` | NPEL | ONS | **09** (primary) | **Locked 2026-11-11:** Domain 09 owns; Domain 05 Follows only |
| `tax-receipts` | AHHY | ONS | 06 Taxation & Revenue | PSF taxes+NICs ≠ HMRC cash |
| `total-managed-expenditure` | EBFT | ONS | 07 Public Spending | TME |
| `public-sector-net-debt` | HF6W | ONS | 08 Public Debt | **Ready 2026-11-11** |
| `public-sector-net-borrowing` | DZLS | ONS | 08 | **Ready 2026-11-11** |
| `public-sector-debt-interest` | NMFX | ONS | 08 | CG interest · **Ready 2026-11-11** |
| `public-sector-net-debt-percent-gdp` | HF6X | ONS | 08 | Official %GDP · **Ready 2026-11-11** (OBR forecast tail warn) |

All of the above live under `src/economy/connectors/` + `data/economy/<id>/`. Treat as **candidate inventory** until Validation + Review Gate — not “UI Ready” for a ten-domain explorer.

---

## Cross-sector reuse (must link, never fork)

| Concern | Canonical id | Owner path | Economy use |
|---------|--------------|------------|-------------|
| CPIH for energy bills | `cpih-index` | `data/economy/cpih-index/` | Domain 01 owns; Energy Prices consumes |
| Mortgage rate | `mortgage-rate-2yr-fixed` | `data/economy/mortgage-rate-2yr-fixed/` | Domain 04 owns; Housing Affordability/Ownership consume |
| Manufacturing employment | `manufacturing-employment` | `data/energy/…` | Domain 03 **links** only |
| Manufacturing output / productivity | `manufacturing-output-index`, `manufacturing-output-per-hour`, `manufacturing-output-per-job`, `manufacturing-productivity-hours` | Energy | Domain 05 **links** only |
| BRES manufacturing jobs | `bres-manufacturing-employee-jobs-by-region`, `bres-manufacturing-jobs-by-division-region` | Energy | Domain 03 **links** for industrial geography |
| Manufacturing ASHE | `ashe-manufacturing-earnings` | Energy | Domain 02 **links**; national ASHE would be a **new** Economy row if sourced |
| Housing affordability ratios | Housing-owned derived series | Housing | Domain 02/04 Follow; do not re-derive conflicting definitions |
| Housing / Energy policy events | policy packs | Housing / Energy | Domain 10 **links** Decision Ledger pattern; no duplicate event pipelines |

---

## Gaps (missing subjects)

| Gap | Likely domain | Severity | Note |
|-----|---------------|----------|------|
| COICOP / category inflation | 01 | High for flagship depth | Needed before contribution charts |
| ONS average prices / item basket | 01 | Concept only | “Price of everyday Britain” stays planned-not-ready |
| National ASHE distribution | 02 | Medium | Distinct from manufacturing ASHE |
| Inactivity-by-reason pack (INAC01) | 03 | Medium | **Ingested** 2026-11-14 (LF63/65/67/69/6B/6D); discouraged levels still Blocked (LF77 % only) |
| Vacancies (Vacancy Survey) | 03 | Medium | **Ingested** `uk-vacancies` AP2Y — Validation next |
| Hours / FT–PT | 03 | Medium | **Ingested** YBUV + YCBE/YCBH; underemployment still Blocked |
| Workforce jobs total | 03 | Medium | **Ingested** DYDC; industry sections (JOBS02) still Blocked |
| Household income (HBAI) / savings | 04 | High | May later move to People — document ownership |
| Trade goods/services | 09 | High | Almost empty beyond investment |
| OSCAR / COFOG spending splits | 07 | Medium | TME alone is thin for “services” |
| Economic policy event register | 10 | Medium | New pack; link other sectors’ ledgers |
| Regional GDP / GVA | 05 or Regions | Deferred | Prefer Regions sector later; don’t invent |

---

## Domain map recommendations (before G1 lock)

1. Keep **ten domains**; do not merge 06/07/08 — fiscal story reads clearer as revenue / spending / debt.
2. **`business-investment` primary home in 09** — **locked 2026-11-11**; Domain 05 Follows it.
3. Keep **03 national LFS** separate from Energy Jobs manufacturing — different questions, shared Follow.
4. Park **household income** under 04 until People & Society starts; note the likely future move on the Control Page.
5. Freeze production `sector-pages.ts` four-domain scaffold until Review Gate — do not expand `/economy` UI to ten domains in G1/G2.

---

## Wave assignment

| Wave | Domains | Rationale |
|------|---------|-----------|
| **A** | 01, 02, 05, 08 | Strongest existing pins |
| **B** | 03, 06, 07 | Pins exist; 03 needs Energy Jobs boundary write-up |
| **C** | 04, 09, 10 | Thin pins / new event work |

---

## Cross-sector backlog check

Reviewed [Cross-sector backlog](https://app.notion.com/p/41465471768581a5bef6d539d77dad53) before Economy G1: open items are Housing Price Paid, local plans, appeals, Energy Networks licence — **none block** Economy Wave A evidence. Economy agents must still not invent national search or fork licensed GIS.

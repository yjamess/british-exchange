# Kickoff — Economy Domain 07 · Table 4.2 long-run + ESA Table 11 + OSCAR decision

**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Matrix:** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §A (4.2) · §C (ESA) · §D (OSCAR)  
**Siblings:** `tes-by-function` · `tes-by-function-real`  
**Work plan:** `EC-G2-07D-PIN` (4.2 + ESA) · `EC-G2-07F-OSCAR` (decision only)  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`, `docs/` only  
**Opened:** 2026-11-15 · Orchestrator backlog closeout  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

## Priority order (this pass)

1. **Pin** `tes-by-function-long-run` — PSS/PESA **Table 4.2**  
2. **Pin** `esa-gg-expenditure-by-function` — ONS **ESA Table 11** general government  
3. **Decide OSCAR** — write decision memo; **do not ingest** unless you find a clean labelled transparency path that never claims to compose EBFT/TES  

No frontend. Registry → Validation (not Ready).

---

## A. `tes-by-function-long-run` — Table 4.2

| Field | Value |
|-------|--------|
| Source | PSS July 2026 Chapter 4 / PESA Chapter 4 · sheet for Table 4.2 |
| Unit | £ **billion**, 1 decimal place |
| Years | **2003-04 → 2025-26** outturn |
| Framework | TES / COFOG level 1 (already summed current+capital) |

**Rows:** ten COFOG functions, EU transactions (keep sign), published TES, accounting adjustments, table TME. Skip of-which.  
**Spots (2024-25):** Health **242.4** · Social protection **386.3** · TES **1,166.5** · adjustments **123.6** · TME **1,290**.  
**Rounding:** leaf/bridge gaps ~£0.1bn — store published cells; no residual function.  
**Do not** mix into the £ million `tes-by-function` series. Label as long-run companion.

Reuse `pss_july_2026` / `tes_by_function_real` patterns (Table 4.3 is the real twin of 4.2).

---

## B. `esa-gg-expenditure-by-function` — ESA Table 11

| Field | Value |
|-------|--------|
| Source | ONS [ESA Table 11 general government](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicspending/datasets/esatable11annualexpenditureofgeneralgovernment/current) |
| Unit | £ million |
| Years | Calendar **1995 → 2024** |
| Sector | **General government** (not public sector TES; no public corporations) |
| Total | column **`OTE`** |

**Spots (calendar 2024, OTE £m):** Total **1,330,532** · Health GF07 **253,191** · Education GF09 **141,118** · Social protection GF10 **458,500**.  

**Honesty (non-negotiable):**
- Not TES. Not EBFT. Not financial-year PESA.  
- Health ESA 2024 (253,191) ≠ TES Health FY 2024-25 (242,429) — different year, sector, concept.  
- Coversheet may wrongly say “local government only” — confirm against CG/LG sibling files; matrix says treat as general-government file. Document the check.  

Pin COFOG level-1 + total under `OTE`. Manifest must scream calendar year + general government.

---

## C. OSCAR — decision only (`EC-G2-07F-OSCAR`)

HMT Sep 2026 guidance: in-year OSCAR **cannot exactly tie** to National Accounts / PSF.  

**Deliverable:** `docs/economy-07-oscar-decision-memo.md` with verdict:
- `blocked-as-tme-composition` (expected), and either  
  - **no pin**, or  
  - a future **separately named** departmental Control Budget transparency instrument (Inbox draft id only — **no curated package this pass**).  

Do **not** create OSCAR curated observations in this pass.

---

## Handover

Write `docs/handover-economy-07-longrun-esa.md` covering both pins + OSCAR memo path + Validation asks:
- **`EC-VAL-07D`** — Table 4.2 long-run  
- **`EC-VAL-07E`** — ESA Table 11  

## Do not

- Frontend; Ready claims; deflate EBFT; mix £bn/£m; rescale ESA onto TES/EBFT; ingest OSCAR.

## Done means

Two Validation-ready packages + OSCAR decision memo + handover. Orchestrator schedules Validation → cloud → UI (long-run may deepen Function; ESA needs its own labelled view or EmptyStage with honesty) → Gate 4.

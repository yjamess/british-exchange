# Kickoff — Economy Domain 07 · Function + DEL·AME **pin**

**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Discovery (done):** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) · [handover-economy-07-function.md](handover-economy-07-function.md)  
**Prior discovery kickoff:** [agent-kickoff-economy-07-function.md](agent-kickoff-economy-07-function.md)  
**Work plan:** `EC-G2-07B-PIN`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Orchestrator opened pin after `path-found-tes-cofog` + `path-found-pss-table-1-1`  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we pin (1) TES/COFOG by function and (2) DEL vs AME control totals from official HMT tables — without claiming either is a split of monthly EBFT?

**Experiences (EmptyStage until Validation + Orchestrator UI):**

| View | Indicator id (locked) |
|------|------------------------|
| `/economy?domain=spending&view=function` | `tes-by-function` |
| `/economy?domain=spending&view=delame` | `tme-del-ame` |

## Locked sources (PSS July 2026 / PESA 2026 outturn)

Prefer **PSS July 2026** as the accredited outturn release (Chapter 5 Table 5.4 · Chapter 1 Table 1.1). PESA cells match for outturn; do not splice plan years into these packages.

### A. `tes-by-function` — Table 5.4

- **Unit:** £ million · **Grain:** financial year · **Coverage:** UK public sector  
- **Years:** outturn **2021-22 → 2025-26** only (2025-26 = first estimate; mark status accordingly)  
- **Rows:** ten UN COFOG level-1 functions, each with **current** + **capital** (or a clear dimension); **EU transactions** (keep published sign); published **TES total**; **accounting adjustments** (bridge, not a function); table **TME** as bridge only  
- **Do not** invent a residual function for the £0–2m level-1 leaf gap — store the published TES total  
- **Do not** chart of-which lines as extra slices in v1  
- Spot: Health 2024-25 current 228,613 + capital 13,816 = **242,429**; TES **1,166,452** + adjustments **123,560** = table TME **1,290,012**

### B. `tme-del-ame` — Table 1.1

- **Unit:** £ million · **Grain:** financial year · same outturn years  
- **Rows:** **Total DEL**, **Departmental AME**, **Other AME**, table **TME**  
- Identity must hold: `Total DEL + Departmental AME + Other AME = table TME` (2024-25: 595,892 + 605,568 + 88,552 = **1,290,012**)  
- **Keep Other AME** — do not drop it for a two-bar chart  
- Total DEL is **not** resource DEL + capital DEL — use the published Total DEL row  
- Label denominator as **this table’s TME**, never as monthly EBFT

## Non-negotiables

- **No frontend** (`web/` untouched).  
- **No rescale** onto Ready `total-managed-expenditure` (EBFT). Document FY vs monthly gap in Notes/README (2024-25 summed EBFT ≈ 1,294,828 vs HMT table TME 1,290,012).  
- **No OSCAR** rows in these packages.  
- **No** Tax−Spend=Borrow identity.  
- **Label** TES ≠ services people “feel”; TME ≠ TES (gap = accounting adjustments).  
- Reuse shared connector patterns under `src/economy/`; new packages under `data/economy/<id>/`.  
- Registry: create Inbox → **Validation** rows (not Ready).  

## Deliverable packages

For **each** indicator:

1. Raw workbook pin(s) + sha256 under `data/economy/<id>/raw/`  
2. Curated observations + `manifest.yaml` + README + self-QA `validation_report.md`  
3. Connector `src/economy/connectors/…` with clear `main()`  
4. Self-QA: identities V1–V4 from [handover-economy-07-function.md](handover-economy-07-function.md) Validation ask  

Optional same pass if cheap: do **not** pin Table 4.2 long-run or ESA Table 11.

## Handover

Write `docs/handover-economy-07-function-pin.md` with:

- Paths, checksums, row counts, spot years  
- Identity proof tables for both packages  
- Validation ask **`EC-VAL-07B`** (V1–V7 from discovery handover)  
- Registry URLs / status Validation  

## Do not

- Mark Ready without Validation  
- Mix £ billion Table 4.2 into `tes-by-function`  
- Include PESA plan years  
- Edit EBFT curated except to **read** for the documented FY gap note  

## Done means

Two reproducible packages + self-QA pass + Validation-ready handover. Orchestrator schedules `EC-VAL-07B`, then cloud + G3 EmptyStage replacement.

# Kickoff — Economy Domain 07 · Real terms **pin**

**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Discovery (already done):** [economy-07-spending-source-matrix.md](economy-07-spending-source-matrix.md) §E · [handover-economy-07-function.md](handover-economy-07-function.md)  
**Prior pins:** [handover-economy-07-function-pin.md](handover-economy-07-function-pin.md) (`tes-by-function`, `tme-del-ame`)  
**Work plan:** `EC-G2-07C-PIN`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Orchestrator opened pin (path already found — no second discovery)  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we pin official HMT real-terms spending tables (2025-26 prices) without inventing a monthly real EBFT series?

**Experience (planned):** **Real terms** — not yet a live tab; UI is Orchestrator after Validation. Data must stand alone as labelled HMT real series.

## Locked sources (path-found in matrix)

Prefer **PSS July 2026** outturn workbooks (same vintage as nominal pins). PESA cells may match; do not splice plan years into v1.

| Indicator id (locked) | Table | Unit | Pairs with |
|-----------------------|-------|------|------------|
| `tme-del-ame-real` | PSS/PESA **Table 1.2** | £ million, **2025-26 prices** | Nominal `tme-del-ame` (Table 1.1) |
| `tes-by-function-real` | PSS/PESA **Table 4.3** | £ **billion**, **2025-26 prices** | Nominal long-run Table 4.2 / function story |

Matrix draft id `pesa-tme-real-terms` → lock as **`tme-del-ame-real`** so it mirrors the Ready nominal control-total pin.

### A. `tme-del-ame-real` — Table 1.2

- Same control-total shape as Table 1.1 where published: **Total DEL**, **Departmental AME**, **Other AME**, table **TME** (and resource/capital “of which” only if needed for QA — prefer the four headline rows for curated).
- Outturn years aligned with nominal pin where the table prints them; **2025-26** may equal nominal for a 2025-26 price base — document that.
- Deflator note in manifest: ONS GDP deflators (workbook cites **30 Jun 2026**); OBR forecasts for plan years — **no plan years in v1**.
- Spot from matrix: total resource DEL 2025-26 real = nominal **496,670** (price-base check).

### B. `tes-by-function-real` — Table 4.3

- COFOG level-1 functions in real terms, £ billion, 2025-26 prices (same classification family as Table 4.2).
- Spot: Health 2024-25 = **250.8** £ billion (2025-26 prices) vs nominal Table 4.2 Health **242.4**.
- Store published function totals; do not invent residuals. Document £ billion rounding like Table 4.2.
- EU / TES / adjustments / table TME: include if the sheet prints them as clear rows; label bridges, not functions.

## Non-negotiables

- **No frontend.**  
- **Do not** deflate monthly `total-managed-expenditure` (EBFT) with CPIH or GDP deflator.  
- **Do not** claim real HMT table TME = real monthly EBFT.  
- Keep Other AME if present on Table 1.2.  
- Outturn only; no PESA plan years.  
- Registry → **Validation** (not Ready).  
- Reuse `pss_july_2026` helpers / connector patterns where possible.

## Deliverables

1. Packages `data/economy/tme-del-ame-real/` and `data/economy/tes-by-function-real/` (raw + curated + manifest + README + self-QA).  
2. Connectors with `main()`.  
3. Self-QA: spot cells vs workbook; identity checks where the table states them; price-base year documented.  
4. Registry Inbox → Validation rows.  
5. Handover `docs/handover-economy-07-real-pin.md` + Validation ask **`EC-VAL-07C`**.

## Do not

- Mark Ready; edit web/; mix £m and £bn in one series; rescale onto EBFT.

## Done means

Two reproducible real-terms packages + Validation-ready handover. Orchestrator schedules Validation → cloud → Real terms UI (and may open a Services narrative stage from existing nominal bridge rows in parallel).

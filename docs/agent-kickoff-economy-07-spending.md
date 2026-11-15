# Kickoff — Economy Domain 07 Public Spending & Services

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [07 · Public Spending & Services](https://app.notion.com/p/41465471768581df9c9ad184839231b7)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-14 (thin Notion stub + kickoff refresh; deepen plan in G2)

**Question (provisional):** What does the state spend, and where does managed expenditure go?

**Flagship (planned):** **What the state spends** — Total Managed Expenditure (EBFT) history. Function / service breakdowns stay planned-not-ready until OSCAR / COFOG (or equivalent) is sourced and registered.

## Non-negotiables

Follow the shared template. Extra for 07:

- **EBFT** Total Managed Expenditure (TME) is the headline pin — declare NSA / coverage vs departmental DEL/AME.
- OSCAR / COFOG / function breakdowns stay **planned-not-ready** until sourced and registered (do not mock shares).
- Link Domain 06 tax receipts and Domain 08 borrowing; do not invent a residual identity (receipts − spending ≠ borrowing) in charts.
- Do **not** equate TME with “services people receive” without a labelled gap.
- Real-terms TME only with a documented deflator (prefer CPIH link, Exchange-labelled) — or leave planned-not-ready.
- **No frontend** until Wave B G3 for this domain. REF_ICON `economySpending` already placed.

## Candidate inventory (existing pin)

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `total-managed-expenditure` | EBFT / PUSF | `data/economy/total-managed-expenditure/` | Pin exists — **re-pin** vs latest PSF |

Connector: `economy.connectors.total_managed_expenditure` (via `fiscal_series`).

## Experiences (starter — mature on Notion in G2)

| Experience | Role | G2 expectation |
|------------|------|----------------|
| **What the state spends** | Flagship TME history | Re-pin + validate EBFT |
| **Where spending goes** | Function / COFOG / OSCAR | Inventory only — planned-not-ready |
| **DEL vs AME** | Control totals | Inventory — planned-not-ready unless official series found |
| **Real terms** | Deflated TME | Only if deflator method documented; else gap |

## Phase 0 — G2 evidence gate (this kickoff)

1. Re-pin EBFT vs latest ONS PSF; checksums; `observation_status` = latest month provisional only.
2. Document units, NSA, geography, revision behaviour, what TME includes/excludes (vs DEL/AME if known).
3. Inventory OSCAR / COFOG / function-of-government sources with URLs — **do not ingest** without registry rows and a clear method.
4. Gap list: function breakdown, DEL/AME, real-terms, “services” narrative.
5. Mature Notion plan (research areas + experience states); four artefacts → `docs/handover-economy-07-spending.md`.

## Do not

- Ship function breakdowns without official series.
- Build `/economy?domain=spending` canvas in G2.
- Invent residual identities with Tax or Debt.
- Equate TME with services delivered without a labelled gap.

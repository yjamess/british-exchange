# Kickoff — Economy Domain 06 Taxation & Revenue

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-14 (deep brief approved 2026-11-12; thin kickoff 2026-11-11 superseded)

**Question (provisional):** How does Britain raise public money, who contributes, and how has the tax system changed?

**Flagship (Notion-locked):** **What Britain Raises** — public-sector tax + NIC receipts history (AHHY), with PSF vs HMRC distinction in Notes.  
**Signature (concept only):** **The Tax Machine** — statutory rules instrument; **no G2 React**; needs pinned rate/threshold evidence before any model.

## Non-negotiables

Follow the shared template. Extra for 06:

- **AHHY** is ONS public-sector taxes + NICs (PSF) — **not** HMRC cash receipts. Never label as HMRC cash without a separate series and registry row.
- Do **not** derive tax/GDP by dividing AHHY by chain-volume GDP. Official ratio series only (same honesty rule as HF6X).
- Do **not** add HMRC cash components to ONS accruals and claim reconciliation.
- Pair with Domain 07 TME and Domain 08 borrowing as related flows — not a closed accounting identity.
- **No frontend** until Wave B G3 for this domain. REF_ICON `economyTax` already placed.

## Candidate inventory (existing pin)

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `tax-receipts` | AHHY / PUSF | `data/economy/tax-receipts/` | Pin exists — **re-pin** vs latest PSF |

Connector: `economy.connectors.tax_receipts` (via fiscal series specs — confirm on disk).

## Six experiences (Notion — evidence readiness)

| Experience | Role | G2 expectation |
|------------|------|----------------|
| **What Britain Raises** | Flagship receipts history | Re-pin + validate AHHY; document units, accrual/cash, geography |
| **The Tax Machine** | Signature statutory rules | Source discovery for rates/thresholds only — **planned-not-ready** for build |
| **Anatomy of Revenue** | Composition by tax type | Scope HMRC/ONS breakdown; ingest only if reconciles to a stated aggregate |
| **Who Bears the Tax Burden?** | Distributional | Inventory ONS Effects of Taxes and Benefits — planned-not-ready |
| **The Tax Time Machine** | Historical rules / fiscal drag | Inventory legislation/HMRC histories — planned-not-ready |
| **The Tax Gap** | HMRC Measuring Tax Gaps | Inventory methodology — planned-not-ready |

## Phase 0 — G2 evidence gate (this kickoff)

1. Re-pin AHHY vs latest ONS PSF; checksums; `observation_status` = latest month provisional only (PSF pattern).
2. Document accounting basis (accruals vs cash), units, frequency, sector boundary, revision behaviour.
3. Inventory tax-type receipt breakdowns (HMRC cash tables / ONS components): CDID/table IDs, whether they can reconcile to AHHY — **do not ingest** without a clear reconcile path.
4. Inventory (no ingest required in Phase 0): statutory rates/thresholds sources; Effects of Taxes and Benefits; HMRC Measuring Tax Gaps; OBR revenue tables.
5. Gap list for experiences 2–6 labelled planned-not-ready vs scoped.
6. Mature Notion plan checkboxes; four artefacts → `docs/handover-economy-06-tax.md` (G3 views as **requirements only**).

## Do not

- Present AHHY as HMRC cash.
- Derive tax/GDP without an official ratio series.
- Build `/economy?domain=tax` canvas in G2.
- Ship Tax Machine calculations or invented rate histories.
- Silently merge Scotland / rUK income-tax rules.

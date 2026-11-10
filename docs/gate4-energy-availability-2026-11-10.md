# Energy Gate 4 — availability and local closure work

Date: 2026-11-10. Owner: Orchestrator. Parent: [finalise audit](gate4-audit-energy-finalise-2026-11-10.md).  
**Working order for the owner:** [domain checklist 01→10](gate4-energy-domain-checklist-2026-11-10.md) (this file is the Codex/evidence handoff, not the day-to-day board).

## Constraint

User is auditing Supabase because usage exceeds their limit. This pass makes **no cloud requests, uploads, database writes, archive deletions or local pin deletions**. Current endpoint availability and Notion status are unverified. The parent audit's 404 findings remain historical evidence, not newly reproduced results.

## Availability matrix

All six observation datasets have manifests and local curated CSVs. `loadSeriesPack` already uses `/indicators` and observations through the API with no disk fallback; earnings and MPP do not currently require a loader rewrite. Local existence does not prove cloud availability.

| Dataset | Owner / connector under `src/` | Local rows | Existing QA report under `data/qa/` | Live delivery / next check |
|---|---|---:|---|---|
| uk-oil-gas-reserves | Energy / `energy/connectors/uk_oil_gas_reserves.py` | 387 | `qa_report_uk_oil_gas_reserves_2026-11-07.md` | Postgres API; recheck metadata and bounded sample |
| fossil-fuel-dependency | Energy / `energy/connectors/fossil_fuel_dependency.py` | 142 | `qa_report_fossil_fuel_dependency_2026-11-08.md` | Postgres API; recheck metadata and bounded sample |
| low-carbon-energy-share | Energy / `energy/connectors/low_carbon_energy_share.py` | 142 | `qa_report_low_carbon_energy_share_2026-11-08.md` | Postgres API; recheck metadata and bounded sample |
| natural-gas-storage | Energy / `energy/connectors/natural_gas_storage.py` | 54 | `qa_report_natural_gas_storage_2026-11-08.md` | Postgres API; recheck metadata and bounded sample |
| nominal-earnings | Economy / `economy/connectors/nominal_earnings.py` | 320 | No dedicated report found by filename sweep | Postgres API; QA and availability outstanding |
| major-power-producer-fuel-prices | Energy / `energy/connectors/major_power_producer_fuel_prices.py` | 405 | No dedicated report found by filename sweep | Postgres API; QA and availability outstanding |
| manufacturing-iop-weights | Energy / `energy/connectors/manufacturing_iop_by_division.py --weights-only` | JSON pack | Dedicated weights QA outstanding | `energy.manufacturing-iop-weights` registered in `packs.py`; loader consumes Storage pack. Cloud presence not rechecked. Registry coverage and catalogue representation outstanding. |

Weights already have a local pack producer with additive checks. Storage delivery is permitted by the cloud contract; do not create duplicate observation storage solely to eliminate a pack-only indicator 404. Decide catalogue/API representation after the storage audit. No new ingest is necessary until the existing delivery and ID mapping are checked.

Local curated SHA-256 (CSV paths are `data/<owner>/<id>/curated/observations.csv`):

| Dataset | SHA-256 |
|---|---|
| uk-oil-gas-reserves | `050c553955034b3cfb8ae323d32c2f814ed0ca9742900feff953064862afd183` |
| fossil-fuel-dependency | `9fe5d3891e6716b2a02c1ee7066bc590a08658fa5c7a529ecb13f67625bf0b40` |
| low-carbon-energy-share | `c39b4a2fcb2732ea777a4ec937910dd434340440fff0775900476d5cad9ba891` |
| natural-gas-storage | `267581319fc454379e073bb95f8d9ff866eaf36e10cba5a9f6502d96b8a0b7d2` |
| nominal-earnings | `21a95fe54a52e84f09b215b2d77356b4ddb61a75123a8df6343445835062f348` |
| major-power-producer-fuel-prices | `adeba1f5f84ecaa39f9057dc8ee8bc73a9ac2ec0da6f917a70cc1f2eeb058566` |
| weights (`data/energy/manufacturing-iop-by-division/curated/weights.json`) | `aec8c61453d33a14bf9590b1bc86e7c132d43fd5557a316c05ac7b1a8fcdb2c6` |

These are curated checksums, not a fresh publisher validation. Raw retrieval timestamps, source URLs and raw evidence checksums remain in each existing manifest. No connector was rerun.

## Local implementation

- E-FIN-01/02: Reserves years no longer fall back to crude; Resilience requires years common to all three ratio series. Empty and single-year menus are hidden. Other Imports views use their own year pools.
- E-FIN-05: Jobs Landscape uses complete jobs/output year intersection; Productivity uses the selected productivity measure's complete quarterly years. No invented menu year when inputs are empty.
- E-FIN-06: Reset patches contain only active-view controls for Prices, Consumption and Imports; other tabs' state is preserved. Latest reset year comes from the active available menu where applicable.
- E-FIN-07: all ten canvas FigureRecord source rows use `energySource`, which appends coverage and period from view evidence through `formatSource`. Existing conditional publisher/series labels remain; full definition/method deduplication is not claimed.
- E-FIN-09/10: preparation-stage body catalogue list removed; Policy can reset an open event.
- E-FIN-11: sampled energy-unit menu labels simplified; liquefied natural gas expanded in terminal option. Units remain in chart context.
- E-FIN-12: demand model preserves missing cells as non-finite gaps; Then/Now excludes missing pairs and omits missing total comparisons. Published zero remains zero. Bill comparisons require both published components instead of filling absent components with zero.

## Verification

Passed: `cd web && npx tsc --noEmit`.

Passed: 36 tests across `energy-reset.test.mjs`, `energy-missing-values.test.mjs`, `energy-evidence.test.mjs`, `explorer-url.test.mjs`, `connections.test.mjs`. New behavioral checks cover inactive-tab Reset isolation and missing-versus-zero demand values. Existing checks cover declared URL/evidence/connection contracts; they do not prove deployed data availability or browser behavior.

Passed: `git diff --check`.

## Still open before closure

1. After the Supabase audit, inspect bounded cloud metadata/samples for the seven datasets; repair only confirmed gaps under the revised storage approach. Keep local pins until cloud-only verification succeeds.
2. Dedicated QA/registry coverage for weights, earnings and MPP; reconcile catalogue-listed indicators versus packs. Do not mark Ready from local file presence.
3. Follow primaries for Policy, Jobs Pay and low-carbon Capacity; Networks Queue/Grid remain subject to the existing Networks hold. Do not add Ready edges without destination availability evidence.
4. Fossils map missing-value/suppression triage remains open; ranking fallback and displayed values need separate treatment. Full S25 stale-list sweep remains open.
5. Desktop, deep-link/history, unavailable-response and 390px verification for all views; imagery remains separate. No browser or deployment verification performed in this pass.
6. Reconcile Notion and local gate status only after evidence is complete. Policy content Gate 3–4 and the listed owner deferrals remain open. Energy is **not Gate-4-final**.


## Resumed after storage cutover

User confirmed the storage issue resolved. Supabase production check found all six observation indicators absent; loaded 1,450 rows through the new note-dictionary schema in a single transaction, without migrations or rewriting existing releases. Releases 174–179. Metadata and observations now return HTTP 200 with `store=postgres` and notes preserved for all six. Weights Storage-only fetch verified (1,110 observations, exact SHA-256 match); no redundant Postgres copy added.

Source and cloud evidence: `data/qa/qa_energy_finalise_sources_2026-11-10.md`, `data/qa/energy_finalise_cloud_2026-11-10.json`. Offline reproduction: `src/validation/qa_energy_finalise_2026_11_10.py`. New registry rows for fossil dependency, low-carbon share, gas storage, earnings, MPP and weights; existing Reserves row refreshed. Weights registry: https://app.notion.com/p/41465471768581ca87b8eadee2c8bfc0. Earlier cloud-hold notes above describe the initial pass and are superseded by this section.

Follow gaps closed for Policy Ledger, Jobs Pay and Low-carbon Capacity (view-specific primary prevents technology suggestions from sending Capacity to itself). Destinations verified against cloud-backed FastAPI. Networks Queue/Grid unchanged under the operator hold. Fossils missing oil rows now display a dash rather than zero; broader suppressed-data/glyph triage remains open.

Browser access host unavailable when opening Reserves preview: desktop/390px visual checks remain unverified. Sector Gate 4 remains open.

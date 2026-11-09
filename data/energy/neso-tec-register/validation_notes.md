# Validation notes — `transmission-entry-capacity-register`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B3)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_transmission_entry_capacity_register_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.neso_tec_register
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/tec-register-05-november-2026.csv` |
| sha256 | `35ec21f98e34e89c1e8e861fe1922c9fc852d69e9154f253539d5bce3bd9a097` |
| Download URL (pinned) | `https://api.neso.energy/dataset/cbd45e54-e6e2-4a38-99f1-8de6fd96d7c1/resource/17becbab-e3e8-473f-b303-3806f43a6a10/download/tec-register-05-november-2026.csv` |
| Curated rows | 2211 |
| Gates in curated | 1 · 2 · unassigned |
| Connector | `energy.connectors.neso_tec_register` |

## Sample checks (Energy self-check vs pinned CSV)

| Check | Result |
|-------|--------|
| Columns include `Gate`, `MW Increase / Decrease`, `MW Effective From`, `Plant Type` | pass |
| First dated row Project Number PRO-003804 | value **92.4** MW; period **2034-10-31**; `date_basis=mw_effective_from_contractual`; `gate=unassigned` |
| Gate=1 / Gate=2 present when countersigned | yes (counts in curated notes) |
| Speculative ETA invented? | **no** — only publisher Effective From or Built pin snapshot |

## Date bases

1. `mw_effective_from_contractual` — period = `MW Effective From`; value = `MW Increase / Decrease`.
2. `built_connected_pin_snapshot` — Built rows with blank Effective From; value = `MW Connected`; period = register pin date (2026-11-05 from filename). **364** rows.

**9** register rows skipped (no usable MW/date combination).

## Method notes

- NESO warns stage/technology aggregates may duplicate under Connections Reform — do not sum `cumulative_mw` across stage rows without dedupe.
- Geography GB only; do not blend with UK totals without a labelled break.
- National DNO topology remains **Blocked** (`data/energy/power-networks/DNO_TOPOLOGY_BLOCKED.md`).

## Out of scope

- Marking Ready
- DNO LTDS / national topology
- Thermal constraint costs (separate candidate)
- Speculative connection ETAs

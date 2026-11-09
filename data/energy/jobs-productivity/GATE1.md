# Gate 1 — Jobs & Productivity (Domain 09) · Wave B3

**Completed:** 2026-11-07 · Energy Industry lane

## Deliverables

| Artefact | Path |
|----------|------|
| Reuse map | `data/energy/jobs-productivity/reuse_map.md` |
| Gap register | `data/energy/jobs-productivity/source_register.csv` |
| Manufacturing twin | `data/energy/manufacturing/` |

## Reuse (do not re-ingest)

- `manufacturing-employment` (JWR7) — Ready + QA
- `manufacturing-output-index` (K22A) — Ready + QA (Jobs vs Output pairing)
- Economy `labour-productivity` (LZVB) — whole-economy context only
- History long-run manufacturing employment — **link only; never fork**

## New complementary series

| indicator_id | Series | Status |
|--------------|--------|--------|
| `manufacturing-output-per-hour` | ONS DJK6 / PRDY | **Ready** + QA (`qa_report_manufacturing_output_per_hour_2026-11-07.md`) |

Reproduce: `uv run python -m energy.connectors.manufacturing_output_per_hour`

## Remaining gaps (candidate / blocked)

See `source_register.csv`: regional BRES, ASHE earnings, output-per-job twin, demographics (blocked until credible).

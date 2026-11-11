# Validation notes — public-sector-net-debt-percent-gdp (HF6X) — 2026-11-11

**Status: NOT Ready.** These are Economy self-checks to help the Validation agent. They are not an independent QA report. Validation files its own report under `data/qa/`.

## Economy self-checks (2026-11-11)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| S1 | Raw checksum = manifest | pass | `9e364412…ada23f4e5` |
| S2 | Live checksum = handover pre-check | pass | Matches the 2026-11-11 value recorded in `docs/handover-economy-08-debt.md` |
| S3 | CDID/unit/title from ONS description | pass | cdid HF6X; unit `%`; title "PS: Net Debt (excluding public sector banks) as a % of GDP: NSA" |
| S4 | Curated vs raw `months` recompute | pass | 403 rows, 0 mismatches, 0 duplicates, 0 missing |
| S5 | Latest value | pass | 2026-09 = 94.0 (release 2026-10-20) |
| S6 | Spot points | pass | 1993-03 26.7; 2000-12 29.7; 2020-03 84.1; 2025-03 92.9; 2026-03 93.2; 2026-09 94.0 |

## For independent Validation

1. Re-fetch after the **2026-11-20** release; confirm checksum or record the revision size for the last ~6 months (expected to be non-trivial).
2. Spot-check 2026-09 = 94.0% against the PSF bulletin / reference tables (not just the JSON the connector used). Confirm pre-2000 and 2020 peak (97.8) points too.
3. Reconcile: HF6X × centred nominal GDP ≈ HF6W (£bn). Not exact; the denominator needs BKTL-family nominal GDP, which is not ingested. Set tolerance.
4. Confirm the series concept "excluding public sector banks" vs older "ex BoE" labelling in the bulletin.
5. Confirm manifest unit and `provisional` status; confirm UI copy requirement: revision flag on the latest ~6 months.
6. Confirm Postgres load before any UI claim (Orchestrator, AGENTS.md cloud rule).

## Known limits

- Official ratio only; no self-derived fallback was built (Orchestrator decision 2026-11-11).
- Not checked: Postgres/Supabase load.
